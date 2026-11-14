"""Módulo 9 — Fila persistente (SQLite), worker com retries e scheduler diário.

Execução standalone:  python -m app.worker
Ou embutido na API (EMBEDDED_WORKER=true).
"""
from __future__ import annotations

import threading
import time
import traceback
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from . import pipeline
from .adapters.base import AdapterError
from .config import get_settings
from .db import session_scope
from .logbus import alert, log
from .models import Job, Video, utcnow
from .services import analytics
from .services.budget import BudgetExceeded


def enqueue(job_type: str, payload: dict, dedupe_key: str | None = None, delay_sec: int = 0) -> int | None:
    """Enfileira um job. Se `dedupe_key` já existir, não duplica (retorna None)."""
    try:
        with session_scope() as s:
            j = Job(type=job_type, payload=payload, dedupe_key=dedupe_key,
                    max_attempts=get_settings().max_job_attempts,
                    run_after=utcnow() + timedelta(seconds=delay_sec))
            s.add(j)
            s.flush()
            return j.id
    except IntegrityError:
        log("queue", f"job duplicado ignorado: {dedupe_key}")
        return None


HANDLERS = {
    "daily_run": lambda p: pipeline.daily_run(p["date"], enqueue),
    "script": lambda p: pipeline.stage_script(p["video_id"], enqueue),
    "produce": lambda p: pipeline.stage_produce(p["video_id"], enqueue),
    "publish": lambda p: pipeline.stage_publish(p["video_id"], enqueue),
    "analytics_sync": lambda p: analytics.sync(),
}


def claim_next() -> Job | None:
    with session_scope() as s:
        j = s.scalar(select(Job).where(Job.status == "pending", Job.run_after <= utcnow())
                     .order_by(Job.run_after, Job.id).limit(1))
        if not j:
            return None
        # claim atômico: só um worker vence
        res = s.execute(update(Job).where(Job.id == j.id, Job.status == "pending")
                        .values(status="running", started_at=utcnow(), attempts=Job.attempts + 1))
        if res.rowcount != 1:
            return None
        s.flush()
        s.refresh(j)
        s.expunge(j)
        return j


def _mark_video_failed(payload: dict, msg: str) -> None:
    vid = payload.get("video_id")
    if vid:
        with session_scope() as s:
            v = s.get(Video, vid)
            if v and v.status not in ("published", "scheduled", "exported", "rejected"):
                v.status, v.error = "failed", msg[:2000]


def run_job(j: Job) -> None:
    log("queue", f"executando job {j.id} ({j.type}) tentativa {j.attempts}/{j.max_attempts}", job_id=j.id,
        video_id=j.payload.get("video_id"))
    try:
        result = HANDLERS[j.type](j.payload)
        with session_scope() as s:
            row = s.get(Job, j.id)
            row.status, row.finished_at, row.last_error = "done", utcnow(), None
        log("queue", f"job {j.id} concluído: {pipeline.dumps(result)[:300]}", job_id=j.id)
    except BudgetExceeded as e:
        _finish_failed(j, str(e), retry=False)
        alert(f"Limite de gastos: {e}", "critical")
    except AdapterError as e:
        _finish_failed(j, str(e), retry=e.retryable)
    except Exception as e:  # erro inesperado: tenta de novo com backoff
        _finish_failed(j, f"{type(e).__name__}: {e}\n{traceback.format_exc()[-1500:]}", retry=True)


def _finish_failed(j: Job, msg: str, retry: bool) -> None:
    final = not retry or j.attempts >= j.max_attempts
    with session_scope() as s:
        row = s.get(Job, j.id)
        row.last_error = msg[:4000]
        if final:
            row.status, row.finished_at = "failed", utcnow()
        else:
            row.status = "pending"
            row.run_after = utcnow() + timedelta(seconds=60 * 2 ** (j.attempts - 1))
    log("queue", f"job {j.id} falhou ({'definitivo' if final else 'nova tentativa agendada'}): {msg[:500]}",
        level="ERROR", job_id=j.id, video_id=j.payload.get("video_id"))
    if final:
        _mark_video_failed(j.payload, msg)
        alert(f"Job {j.id} ({j.type}) falhou definitivamente: {msg[:300]}")


def recover_stale(max_age_min: int = 60) -> None:
    """Jobs presos em 'running' (ex.: processo morreu) voltam para a fila."""
    cutoff = utcnow() - timedelta(minutes=max_age_min)
    with session_scope() as s:
        s.execute(update(Job).where(Job.status == "running", Job.started_at < cutoff)
                  .values(status="pending", last_error="recuperado após travamento"))


class Worker:
    def __init__(self, poll_sec: float = 2.0):
        self.poll_sec = poll_sec
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self.scheduler = BackgroundScheduler()

    # ---- scheduler -------------------------------------------------------
    def reschedule(self) -> None:
        cfg = pipeline.get_config()
        for job in self.scheduler.get_jobs():
            job.remove()
        tz = ZoneInfo(cfg.timezone)
        if cfg.scheduler_enabled:
            hh, mm = map(int, cfg.pipeline_run_time.split(":"))
            self.scheduler.add_job(self._daily, CronTrigger(hour=hh, minute=mm, timezone=tz), id="daily")
            log("scheduler", f"execução diária agendada para {cfg.pipeline_run_time} ({cfg.timezone})")
        else:
            log("scheduler", "scheduler desativado nas configurações")
        self.scheduler.add_job(lambda: enqueue("analytics_sync", {}, f"analytics:{date.today()}"),
                               CronTrigger(hour=3, minute=17, timezone=tz), id="analytics")

    def next_run(self) -> str | None:
        j = self.scheduler.get_job("daily") if self.scheduler.running else None
        return j.next_run_time.isoformat() if j and j.next_run_time else None

    def _daily(self) -> None:
        cfg = pipeline.get_config()
        today = datetime.now(ZoneInfo(cfg.timezone)).date().isoformat()
        enqueue("daily_run", {"date": today}, dedupe_key=f"daily_run:{today}")

    # ---- loop --------------------------------------------------------------
    def loop(self) -> None:
        recover_stale()
        seen = pipeline.get_config().updated_at
        last_cfg_check = time.monotonic()
        while not self._stop.is_set():
            if time.monotonic() - last_cfg_check > 30:  # reflete mudanças de horário feitas no painel
                last_cfg_check = time.monotonic()
                cur = pipeline.get_config().updated_at
                if cur != seen:
                    seen = cur
                    self.reschedule()
            j = claim_next()
            if j:
                run_job(j)
            else:
                self._stop.wait(self.poll_sec)

    def start(self) -> None:
        if not self.scheduler.running:
            self.scheduler.start()
        self.reschedule()
        self._thread = threading.Thread(target=self.loop, daemon=True, name="autopilot-worker")
        self._thread.start()
        log("worker", "worker iniciado")

    def stop(self) -> None:
        self._stop.set()
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)


worker = Worker()


def drain(max_jobs: int = 50) -> int:
    """Processa jobs pendentes de forma síncrona (testes/CLI)."""
    n = 0
    while n < max_jobs:
        j = claim_next()
        if not j:
            break
        run_job(j)
        n += 1
    return n


if __name__ == "__main__":  # pragma: no cover
    from .db import init_engine

    init_engine()
    worker.start()
    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        worker.stop()
