"""Módulo 2 — Planejador editorial: pontua, evita repetição e mantém calendário."""
from __future__ import annotations

from ..models import utcnow

from datetime import date, datetime, timedelta

from sqlalchemy import select

from ..adapters.registry import Adapters
from ..db import session_scope
from ..logbus import log
from ..models import AnalyticsSnapshot, ChannelConfig, Idea, Trend, Video
from . import budget, prompts
from .safety import detect_sensitive, fingerprint, jaccard, unconfirmed_news

SIMILARITY_BLOCK = 0.6


def performance_boost(topic_fp: str) -> float:
    """Até +10 pontos para temas parecidos com vídeos que performaram bem."""
    with session_scope() as s:
        rows = s.execute(
            select(Idea.fingerprint, AnalyticsSnapshot.views)
            .join(Video, Video.idea_id == Idea.id).join(AnalyticsSnapshot, AnalyticsSnapshot.video_id == Video.id)
        ).all()
    if not rows:
        return 0.0
    max_views = max((v or 0) for _, v in rows) or 1
    best = 0.0
    for fp, views in rows:
        sim = jaccard(fp, topic_fp)
        if sim >= 0.3:
            best = max(best, sim * (views or 0) / max_views)
    return round(best * 10, 2)


def recent_fingerprints(days: int) -> list[str]:
    since = utcnow() - timedelta(days=days)
    with session_scope() as s:
        return list(s.scalars(select(Idea.fingerprint).where(
            Idea.status.in_(["selected", "used"]), Idea.created_at >= since)))


def plan(run_date: str, adapters: Adapters, cfg: ChannelConfig, trend_ids: list[int], count: int) -> list[int]:
    with session_scope() as s:
        trends = list(s.scalars(select(Trend).where(Trend.id.in_(trend_ids))))
        history = list(s.scalars(select(Idea.title).where(Idea.status.in_(["selected", "used"]))))

    blocked = recent_fingerprints(cfg.min_days_between_similar)
    fresh = []
    for t in trends:
        fp = fingerprint(t.topic)
        if any(jaccard(fp, b) >= SIMILARITY_BLOCK for b in blocked):
            log("planner", f"descartado por repetição: {t.topic}")
            continue
        if not t.references:
            log("planner", f"descartado por falta de fontes: {t.topic}")
            continue
        fresh.append(t)
    if not fresh:
        log("planner", "nenhuma pauta nova disponível hoje", "WARNING")
        return []
    fresh = sorted(fresh, key=lambda t: t.popularity + t.relevance, reverse=True)[:15]

    payload = [{"id": t.id, "topic": t.topic, "snippet": (t.snippet or "")[:300], "popularity": t.popularity,
                "is_news": t.is_news} for t in fresh]
    system, prompt = prompts.score_prompt(cfg.niche, cfg.language, payload, history)
    budget.check(None, 0.05)
    res = adapters.llm.generate_json("score_ideas", system, prompt, prompts.SCORE_SCHEMA, {"trends": payload})
    budget.record(None, res.provider, res.cost_usd, "pontuação de pautas")

    by_id = {t.id: t for t in fresh}
    created = []
    with session_scope() as s:
        for it in res.data.get("ideas", []):
            t = by_id.get(it.get("trend_id"))
            if not t:
                continue
            fp = fingerprint(t.topic)
            if s.scalar(select(Idea.id).where(Idea.fingerprint == fp, Idea.status.in_(["selected", "used"]))):
                continue
            comp = t.competition if t.competition is not None else 50.0
            clamp = lambda v: max(0, min(10, int(v)))  # noqa: E731
            breakdown = {
                "popularity": round(t.popularity * 0.25, 2),
                "low_competition": round((100 - comp) * 0.15, 2),
                "relevance": round(t.relevance * 0.20, 2),
                "originality": clamp(it["originality"]) * 1.5,
                "evergreen": clamp(it["evergreen"]) * 1.0,
                "audience_interest": clamp(it["audience_interest"]) * 1.0,
                "past_performance": performance_boost(fp),
            }
            reasons = detect_sensitive(t.topic, t.snippet or "", it.get("title", "")) + unconfirmed_news(
                t.is_news, t.published_at, t.source_count)
            if it.get("risk_notes"):
                breakdown["llm_risk_notes"] = it["risk_notes"]
            score = sum(v for k, v in breakdown.items() if isinstance(v, (int, float)))
            if reasons:
                score -= 5
            idea = Idea(trend_id=t.id, topic=t.topic, title=it.get("title") or t.topic, angle=it.get("angle", ""),
                        fingerprint=fp, score=round(score, 2), score_breakdown=breakdown, sensitive=bool(reasons),
                        sensitive_reasons=reasons, references=t.references)
            s.add(idea)
            created.append(idea)
        s.flush()
        chosen = sorted(created, key=lambda i: i.score, reverse=True)[:count]
        for i in chosen:
            i.status = "selected"
            i.scheduled_for = run_date
        ids = [i.id for i in chosen]
    log("planner", f"{len(created)} ideias pontuadas; selecionadas: {ids}")
    return ids


def calendar(days: int = 14) -> list[dict]:
    start = date.today() - timedelta(days=3)
    with session_scope() as s:
        ideas = list(s.scalars(select(Idea).where(Idea.scheduled_for >= start.isoformat())))
        vids = {v.idea_id: v for v in s.scalars(select(Video).where(Video.idea_id.in_([i.id for i in ideas])))}
        return [{"date": i.scheduled_for, "idea_id": i.id, "title": i.title, "score": i.score,
                 "sensitive": i.sensitive, "video_status": vids[i.id].status if i.id in vids else None,
                 "video_id": vids[i.id].id if i.id in vids else None} for i in ideas]
