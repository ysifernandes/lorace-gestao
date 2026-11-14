from __future__ import annotations

import hmac
import re
import threading
from datetime import date, timedelta
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import desc, func, select

from .. import pipeline
from ..adapters import youtube as yt
from ..adapters.base import AdapterError
from ..adapters.registry import get_adapters
from ..config import get_settings
from ..db import session_scope
from ..logbus import log
from ..models import Alert, ChannelConfig, CostEntry, Idea, Job, LogEntry, Trend, Video, utcnow
from ..services import analytics, budget, planner, readiness
from ..worker import enqueue, worker

AUTOPUBLISH_PHRASE = "AUTORIZO PUBLICACAO AUTOMATICA"


def require_admin(request: Request, token: str | None = Query(default=None)) -> str:
    s = get_settings()
    if not s.admin_token:
        host = request.client.host if request.client else ""
        if host in ("127.0.0.1", "::1", "localhost", "testclient"):
            return "admin-local"
        raise HTTPException(401, "Defina ADMIN_TOKEN no .env para acesso remoto")
    supplied = token or request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(supplied.encode(), s.admin_token.encode()):
        raise HTTPException(401, "token inválido")
    return "admin"


router = APIRouter(prefix="/api", dependencies=[Depends(require_admin)])
public = APIRouter(prefix="/api")


def _row(o) -> dict:
    return {c.name: getattr(o, c.name) for c in o.__table__.columns}


# ------------------------------------------------------------------- saúde / dashboard
@public.get("/health")
def health():
    return {"ok": True, "time": utcnow().isoformat()}


@router.get("/dashboard")
def dashboard():
    with session_scope() as s:
        counts = dict(s.execute(select(Video.status, func.count()).group_by(Video.status)).all())
        jobs = dict(s.execute(select(Job.status, func.count()).group_by(Job.status)).all())
        recent = [_row(v) for v in s.scalars(select(Video).order_by(desc(Video.id)).limit(8))]
        alerts = [_row(a) for a in s.scalars(select(Alert).where(Alert.acknowledged.is_(False))
                                             .order_by(desc(Alert.id)).limit(10))]
        running = [_row(j) for j in s.scalars(select(Job).where(Job.status.in_(["running", "pending"]))
                                              .order_by(Job.run_after).limit(10))]
    cfg = pipeline.get_config()
    ad = get_adapters()
    ok, reasons = readiness.can_publish(real_upload=True)
    return {
        "video_counts": counts, "job_counts": jobs, "recent_videos": recent, "alerts": alerts, "queue": running,
        "month_spend_usd": round(budget.month_spend(), 4), "monthly_budget_usd": get_settings().monthly_budget_usd,
        "next_run": worker.next_run(), "mode": cfg.mode, "scheduler_enabled": cfg.scheduler_enabled,
        "auto_publish_authorized": cfg.auto_publish_authorized,
        "adapters": {k: a.status().as_dict() for k, a in ad.all().items()},
        "publish_ready": ok, "publish_blockers": len(reasons),
    }


# ------------------------------------------------------------------- configurações
class ConfigIn(BaseModel):
    channel_name: str = Field(min_length=1, max_length=120)
    niche: str = Field(min_length=2, max_length=200)
    niche_keywords: list[str] = Field(min_length=1, max_length=20)
    language: str = Field(pattern=r"^[a-z]{2}(-[A-Z]{2})?$")
    region: str = Field(pattern=r"^[A-Z]{2}$")
    daily_videos: int = Field(ge=0, le=10)
    short_duration_sec: int = Field(ge=15, le=180)
    long_duration_sec: int = Field(ge=60, le=3600)
    video_format: Literal["short", "long", "both"]
    narration_style: str = Field(max_length=200)
    budget_per_video_usd: float = Field(ge=0, le=100)
    timezone: str
    pipeline_run_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    post_time: str = Field(pattern=r"^\d{2}:\d{2}$")
    scheduler_enabled: bool
    mode: Literal["review", "auto"]
    default_privacy: Literal["private", "unlisted", "public"]
    declare_synthetic_media: bool
    made_for_kids: bool
    min_days_between_similar: int = Field(ge=0, le=365)

    @field_validator("timezone")
    @classmethod
    def _tz(cls, v):
        from zoneinfo import ZoneInfo

        ZoneInfo(v)
        return v


@router.get("/config")
def get_config():
    return _row(pipeline.get_config())


@router.put("/config")
def put_config(body: ConfigIn, who: str = Depends(require_admin)):
    with session_scope() as s:
        cfg = s.get(ChannelConfig, 1)
        if body.mode == "auto" and not cfg.auto_publish_authorized:
            raise HTTPException(400, "Modo automático exige autorização explícita de publicação automática")
        for k, v in body.model_dump().items():
            setattr(cfg, k, v)
    worker.reschedule() if worker.scheduler.running else None
    log("config", f"configurações atualizadas por {who}")
    return _row(pipeline.get_config())


class AuthorizeIn(BaseModel):
    confirm_text: str
    authorized_by: str = Field(min_length=2, max_length=120)


@router.post("/config/authorize-autopublish")
def authorize_autopublish(body: AuthorizeIn):
    if body.confirm_text.strip().upper() != AUTOPUBLISH_PHRASE:
        raise HTTPException(400, f"Digite exatamente: {AUTOPUBLISH_PHRASE}")
    ok, reasons = readiness.can_publish(real_upload=True)
    if not ok:
        raise HTTPException(400, {"message": "Prontidão incompleta", "blockers": reasons})
    with session_scope() as s:
        cfg = s.get(ChannelConfig, 1)
        cfg.auto_publish_authorized = True
        cfg.auto_publish_authorized_at = utcnow()
        cfg.auto_publish_authorized_by = body.authorized_by
    log("config", f"publicação automática AUTORIZADA por {body.authorized_by}", "WARNING")
    return {"ok": True}


@router.post("/config/revoke-autopublish")
def revoke_autopublish():
    with session_scope() as s:
        cfg = s.get(ChannelConfig, 1)
        cfg.auto_publish_authorized = False
        cfg.mode = "review"
    log("config", "publicação automática revogada; modo revisão ativado", "WARNING")
    return {"ok": True}


# ------------------------------------------------------------------- integrações / prontidão
@router.get("/integrations")
def integrations():
    ad = get_adapters()
    with session_scope() as s:
        from ..models import ReadinessCheck

        checks = {r.key: _row(r) for r in s.scalars(select(ReadinessCheck))}
    out = []
    for k, a in ad.all().items():
        st = a.status().as_dict()
        st["last_check"] = checks.get(f"integration:{k}")
        out.append(st)
    return out


@router.post("/integrations/{name}/check")
def check_integration(name: str):
    ad = get_adapters().all()
    if name not in ad:
        raise HTTPException(404)
    a = ad[name]
    st = a.status()
    ok, detail = a.health_check()
    # somente integrações reais contam para a prontidão de publicação
    readiness.record_check(f"integration:{name}", ok and st.state == "configured", f"[{a.name}] {detail}")
    log("integrations", f"health-check {name}/{a.name}: {'OK' if ok else 'FALHA'} — {detail}")
    return {"ok": ok, "detail": detail, "state": st.state}


@router.get("/readiness")
def get_readiness():
    items = readiness.checklist()
    ok, reasons = readiness.can_publish(real_upload=True)
    return {"items": items, "ready": ok, "blockers": reasons, "audit_items": readiness.AUDIT_ITEMS}


_tests_running = threading.Lock()


@router.post("/readiness/run-tests")
def run_tests():
    if not _tests_running.acquire(blocking=False):
        raise HTTPException(409, "testes já em execução")

    def _bg():
        try:
            ok, tail = readiness.run_tests()
            log("readiness", f"testes {'aprovados' if ok else 'REPROVADOS'}")
        finally:
            _tests_running.release()

    threading.Thread(target=_bg, daemon=True).start()
    return {"started": True}


class AuditIn(BaseModel):
    signed_by: str = Field(min_length=2, max_length=120)
    confirmations: list[bool]


@router.post("/readiness/audit")
def sign_audit(body: AuditIn):
    if len(body.confirmations) != len(readiness.AUDIT_ITEMS) or not all(body.confirmations):
        raise HTTPException(400, "Todos os itens da auditoria precisam ser confirmados")
    readiness.record_check("audit", True, f"assinada por {body.signed_by} em {utcnow():%Y-%m-%d %H:%M} UTC")
    log("readiness", f"auditoria assinada por {body.signed_by}")
    return {"ok": True}


# ------------------------------------------------------------------- OAuth YouTube
@router.get("/oauth/youtube/start")
def oauth_start():
    try:
        return {"auth_url": yt.oauth_start()}
    except AdapterError as e:
        raise HTTPException(400, str(e)) from e


@public.get("/oauth/youtube/callback", response_class=HTMLResponse)
def oauth_callback(request: Request, state: str = "", error: str = ""):
    if error:
        return HTMLResponse(f"<h2>Autorização negada: {error}</h2>", 400)
    try:
        yt.oauth_callback(state, str(request.url))
    except Exception as e:
        return HTMLResponse(f"<h2>Falha no OAuth</h2><pre>{type(e).__name__}: {e}</pre>", 400)
    log("oauth", "YouTube autorizado com sucesso")
    return HTMLResponse("<h2>YouTube autorizado ✔</h2><p>Você pode fechar esta aba e voltar ao painel.</p>")


# ------------------------------------------------------------------- pipeline
@router.post("/pipeline/run-now")
def run_now():
    cfg = pipeline.get_config()
    key = f"daily_run:manual:{utcnow():%Y%m%d%H%M}"
    jid = enqueue("daily_run", {"date": date.today().isoformat()}, dedupe_key=key)
    return {"job_id": jid, "note": f"llm={get_adapters().llm.name}; mode={cfg.mode}"}


class DemoIn(BaseModel):
    format: Literal["short", "long"] = "short"


@router.post("/pipeline/demo")
def run_demo(body: DemoIn):
    vid = pipeline.create_demo_video(body.format)
    enqueue("script", {"video_id": vid}, dedupe_key=f"script:{vid}")
    return {"video_id": vid}


# ------------------------------------------------------------------- tendências / ideias / calendário
@router.get("/trends")
def trends(limit: int = 100):
    with session_scope() as s:
        return [_row(t) for t in s.scalars(select(Trend).order_by(desc(Trend.collected_at)).limit(limit))]


@router.get("/ideas")
def ideas(limit: int = 100):
    with session_scope() as s:
        return [_row(i) for i in s.scalars(select(Idea).order_by(desc(Idea.created_at)).limit(limit))]


@router.post("/ideas/{idea_id}/produce")
def produce_idea(idea_id: int, body: DemoIn):
    with session_scope() as s:
        idea = s.get(Idea, idea_id)
        if not idea:
            raise HTTPException(404)
        idea.status = "selected"
        idea.scheduled_for = idea.scheduled_for or date.today().isoformat()
    vid = pipeline.create_video(idea_id, body.format, is_demo=False)
    if not vid:
        raise HTTPException(409, "já existe vídeo deste formato para a ideia")
    enqueue("script", {"video_id": vid}, dedupe_key=f"script:{vid}")
    return {"video_id": vid}


@router.post("/ideas/{idea_id}/reject")
def reject_idea(idea_id: int):
    with session_scope() as s:
        idea = s.get(Idea, idea_id)
        if not idea:
            raise HTTPException(404)
        idea.status = "rejected"
    return {"ok": True}


@router.get("/calendar")
def calendar():
    return planner.calendar()


# ------------------------------------------------------------------- vídeos
@router.get("/videos")
def videos(status: str | None = None, limit: int = 100):
    with session_scope() as s:
        q = select(Video).order_by(desc(Video.id)).limit(limit)
        if status:
            q = q.where(Video.status == status)
        return [_row(v) for v in s.scalars(q)]


@router.get("/videos/{video_id}")
def video(video_id: int):
    with session_scope() as s:
        v = s.get(Video, video_id)
        if not v:
            raise HTTPException(404)
        data = _row(v)
        data["logs"] = [_row(l) for l in s.scalars(select(LogEntry).where(LogEntry.video_id == video_id)
                                                   .order_by(LogEntry.id))]
        data["costs"] = [_row(c) for c in s.scalars(select(CostEntry).where(CostEntry.video_id == video_id))]
        return data


class ReviewIn(BaseModel):
    reviewer: str = Field(min_length=2, max_length=120)
    reason: str = ""


def _wrap(fn):
    try:
        fn()
    except AdapterError as e:
        raise HTTPException(400, str(e)) from e
    return {"ok": True}


@router.post("/videos/{video_id}/approve-script")
def approve_script(video_id: int, body: ReviewIn):
    return _wrap(lambda: pipeline.approve_script(video_id, body.reviewer, enqueue))


@router.post("/videos/{video_id}/approve")
def approve(video_id: int, body: ReviewIn):
    return _wrap(lambda: pipeline.approve_video(video_id, body.reviewer, enqueue))


@router.post("/videos/{video_id}/reject")
def reject(video_id: int, body: ReviewIn):
    return _wrap(lambda: pipeline.reject(video_id, body.reviewer, body.reason or "sem motivo"))


@router.post("/videos/{video_id}/retry")
def retry_video(video_id: int):
    with session_scope() as s:
        v = s.get(Video, video_id)
        if not v or v.status != "failed":
            raise HTTPException(400, "apenas vídeos com falha podem ser reprocessados")
        stage = "script" if not v.script else ("produce" if not v.video_path else "publish")
        v.status = {"script": "queued", "produce": "script_ready", "publish": "approved"}[stage]
        v.error = None
    jid = enqueue(stage, {"video_id": video_id}, dedupe_key=f"{stage}:{video_id}:retry:{utcnow():%H%M%S}")
    return {"job_id": jid, "stage": stage}


MEDIA_KINDS = {"video": ("video_path", "video/mp4"), "thumbnail": ("thumbnail_path", "image/jpeg"),
               "audio": ("audio_path", "audio/mpeg"), "subtitles": ("subtitles_path", "text/plain")}


@router.get("/videos/{video_id}/media/{kind}")
def media(video_id: int, kind: str):
    if kind not in MEDIA_KINDS:
        raise HTTPException(404)
    attr, mime = MEDIA_KINDS[kind]
    with session_scope() as s:
        v = s.get(Video, video_id)
        p = getattr(v, attr) if v else None
    if not p:
        raise HTTPException(404)
    path = Path(p).resolve()
    if get_settings().media_dir.resolve() not in path.parents or not path.exists():
        raise HTTPException(404)
    return FileResponse(path, media_type=mime)


# ------------------------------------------------------------------- jobs / logs / alertas / custos
@router.get("/jobs")
def jobs(limit: int = 100):
    with session_scope() as s:
        return [_row(j) for j in s.scalars(select(Job).order_by(desc(Job.id)).limit(limit))]


@router.post("/jobs/{job_id}/retry")
def retry_job(job_id: int):
    with session_scope() as s:
        j = s.get(Job, job_id)
        if not j or j.status != "failed":
            raise HTTPException(400, "apenas jobs com falha")
        j.status, j.attempts, j.run_after = "pending", 0, utcnow()
    return {"ok": True}


@router.get("/logs")
def logs(limit: int = 300, level: str | None = None, module: str | None = None):
    with session_scope() as s:
        q = select(LogEntry).order_by(desc(LogEntry.id)).limit(min(limit, 2000))
        if level:
            q = q.where(LogEntry.level == level)
        if module:
            q = q.where(LogEntry.module == module)
        return [_row(l) for l in s.scalars(q)]


@router.get("/alerts")
def alerts():
    with session_scope() as s:
        return [_row(a) for a in s.scalars(select(Alert).order_by(desc(Alert.id)).limit(100))]


@router.post("/alerts/{alert_id}/ack")
def ack(alert_id: int):
    with session_scope() as s:
        a = s.get(Alert, alert_id)
        if a:
            a.acknowledged = True
    return {"ok": True}


@router.get("/costs")
def costs():
    since = utcnow() - timedelta(days=30)
    with session_scope() as s:
        by_provider = dict(s.execute(select(CostEntry.provider, func.sum(CostEntry.amount_usd))
                                     .where(CostEntry.ts >= since).group_by(CostEntry.provider)).all())
        recent = [_row(c) for c in s.scalars(select(CostEntry).order_by(desc(CostEntry.id)).limit(100))]
    return {"month_spend_usd": budget.month_spend(), "monthly_budget_usd": get_settings().monthly_budget_usd,
            "by_provider_30d": by_provider, "recent": recent}


@router.get("/analytics")
def get_analytics():
    return analytics.summary()


@router.post("/analytics/sync")
def sync_analytics():
    jid = enqueue("analytics_sync", {}, dedupe_key=f"analytics:manual:{utcnow():%Y%m%d%H%M}")
    return {"job_id": jid}


def safe_name(s: str) -> str:
    return re.sub(r"[^\w.-]", "_", s)
