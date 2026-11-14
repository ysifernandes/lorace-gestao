"""Módulo 8 — Analytics: coleta métricas e resume desempenho."""
from __future__ import annotations

from sqlalchemy import select

from ..adapters.registry import get_adapters
from ..db import session_scope
from ..logbus import log
from ..models import AnalyticsSnapshot, Video


def sync() -> int:
    ad = get_adapters()
    with session_scope() as s:
        vids = {v.youtube_video_id: v.id for v in s.scalars(select(Video).where(Video.youtube_video_id.is_not(None)))}
    if not vids:
        log("analytics", "nenhum vídeo publicado para sincronizar")
        return 0
    stats = ad.publisher.fetch_stats(list(vids))
    with session_scope() as s:
        for yt_id, st in stats.items():
            s.add(AnalyticsSnapshot(video_id=vids[yt_id], source=ad.publisher.name, **st))
    log("analytics", f"métricas atualizadas para {len(stats)} vídeos")
    return len(stats)


def summary() -> dict:
    with session_scope() as s:
        rows = s.execute(select(Video, AnalyticsSnapshot).join(AnalyticsSnapshot,
                                                               AnalyticsSnapshot.video_id == Video.id)
                         .order_by(AnalyticsSnapshot.ts)).all()
        latest: dict[int, tuple] = {}
        series: dict[int, list] = {}
        for v, a in rows:
            latest[v.id] = (v, a)
            series.setdefault(v.id, []).append({"ts": a.ts.isoformat(), "views": a.views})
        videos = [{"video_id": v.id, "title": v.title, "format": v.format, "youtube_video_id": v.youtube_video_id,
                   "views": a.views, "likes": a.likes, "comments": a.comments, "ctr": a.ctr,
                   "avg_view_percentage": a.avg_view_percentage, "series": series[v.id]}
                  for v, a in latest.values()]
    total = sum(x["views"] or 0 for x in videos)
    ret = [x["avg_view_percentage"] for x in videos if x["avg_view_percentage"] is not None]
    by_fmt: dict[str, list[int]] = {}
    for x in videos:
        by_fmt.setdefault(x["format"], []).append(x["views"] or 0)
    insights = []
    if len(by_fmt) > 1:
        avg = {k: sum(v) / len(v) for k, v in by_fmt.items()}
        best = max(avg, key=avg.get)
        insights.append(f"Formato com mais views médias: {best} ({avg[best]:.0f})")
    if ret:
        insights.append(f"Retenção média: {sum(ret) / len(ret):.1f}% da duração")
    return {"total_views": total, "videos": sorted(videos, key=lambda x: -(x["views"] or 0)),
            "avg_retention": (sum(ret) / len(ret)) if ret else None,
            "ctr_available": any(x["ctr"] is not None for x in videos), "insights": insights}
