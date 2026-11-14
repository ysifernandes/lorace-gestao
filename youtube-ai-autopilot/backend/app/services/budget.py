"""Controle de gastos: limite por vídeo e limite mensal global."""
from __future__ import annotations

from ..models import utcnow

from datetime import datetime

from sqlalchemy import func, select

from ..config import get_settings
from ..db import session_scope
from ..models import ChannelConfig, CostEntry


class BudgetExceeded(RuntimeError):
    pass


def month_spend() -> float:
    start = utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    with session_scope() as s:
        return float(s.scalar(select(func.coalesce(func.sum(CostEntry.amount_usd), 0)).where(CostEntry.ts >= start)))


def video_spend(video_id: int) -> float:
    with session_scope() as s:
        return float(s.scalar(select(func.coalesce(func.sum(CostEntry.amount_usd), 0))
                              .where(CostEntry.video_id == video_id)))


def check(video_id: int | None, estimated_usd: float = 0.0) -> None:
    """Lança BudgetExceeded se a próxima etapa estourar algum limite."""
    s = get_settings()
    ms = month_spend()
    if ms + estimated_usd > s.monthly_budget_usd:
        raise BudgetExceeded(f"Limite mensal atingido: US$ {ms:.2f} de US$ {s.monthly_budget_usd:.2f}")
    if video_id is not None:
        with session_scope() as db:
            cfg = db.get(ChannelConfig, 1)
            limit = cfg.budget_per_video_usd if cfg else 2.0
        vs = video_spend(video_id)
        if vs + estimated_usd > limit:
            raise BudgetExceeded(f"Orçamento do vídeo {video_id} excedido: US$ {vs:.2f} + {estimated_usd:.2f} > {limit:.2f}")


def record(video_id: int | None, provider: str, amount: float, description: str) -> None:
    if amount <= 0:
        return
    from ..models import Video

    with session_scope() as s:
        s.add(CostEntry(video_id=video_id, provider=provider, amount_usd=amount, description=description))
        if video_id:
            v = s.get(Video, video_id)
            if v:
                v.cost_usd = round((v.cost_usd or 0) + amount, 5)
