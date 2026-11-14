"""Logs estruturados persistidos no banco + alertas (painel e webhook opcional)."""
from __future__ import annotations

import logging

import httpx

from .config import get_settings
from .db import session_scope
from .models import Alert, LogEntry

_py = logging.getLogger("autopilot")
if not _py.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


def log(module: str, message: str, level: str = "INFO", video_id: int | None = None, job_id: int | None = None) -> None:
    _py.log(getattr(logging, level, logging.INFO), "[%s] %s", module, message)
    try:
        with session_scope() as s:
            s.add(LogEntry(module=module, message=message[:4000], level=level, video_id=video_id, job_id=job_id))
    except Exception:  # pragma: no cover - log nunca deve derrubar o pipeline
        _py.exception("falha ao gravar log")


def alert(message: str, level: str = "warning") -> None:
    log("alerts", message, level="ERROR" if level == "critical" else "WARNING")
    with session_scope() as s:
        s.add(Alert(message=message, level=level))
    url = get_settings().alert_webhook_url
    if url:
        try:
            httpx.post(url, json={"text": f"[YouTube AI Autopilot] {level.upper()}: {message}"}, timeout=10)
        except Exception as e:  # pragma: no cover
            _py.warning("webhook de alerta falhou: %s", e)
