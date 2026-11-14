"""Módulo 1 — Pesquisador de tendências."""
from __future__ import annotations

import math

from sqlalchemy import delete

from ..adapters.registry import Adapters
from ..adapters.youtube import YouTubePublisher
from ..db import session_scope
from ..logbus import log
from ..models import ChannelConfig, Trend
from .safety import fingerprint, jaccard, normalize


def relevance(text: str, keywords: list[str], niche: str) -> float:
    blob = set(normalize(text).split())
    terms = set()
    for k in keywords + [niche]:
        terms |= set(normalize(k).split())
    terms = {t for t in terms if len(t) > 2}
    if not terms:
        return 50.0
    hits = len(blob & terms)
    return min(100.0, 35.0 + hits * 20.0) if hits else 15.0


def collect(run_date: str, adapters: Adapters, cfg: ChannelConfig) -> list[int]:
    keywords = list(cfg.niche_keywords or []) or [cfg.niche]
    items = adapters.trends.fetch(keywords, cfg.language, cfg.region)
    log("research", f"{len(items)} itens coletados via {adapters.trends.name}")

    # agrupa notícias parecidas para contar fontes independentes (validação cruzada)
    fps = [fingerprint(i.topic) for i in items]
    competitor = adapters.publisher if isinstance(adapters.publisher, YouTubePublisher) else None
    ids = []
    with session_scope() as s:
        s.execute(delete(Trend).where(Trend.run_date == run_date))
        rows = []
        for idx, it in enumerate(items):
            similar = [j for j, fp in enumerate(fps) if j != idx and jaccard(fp, fps[idx]) >= 0.5]
            publishers = {r.publisher or r.url for r in it.references}
            for j in similar:
                publishers |= {r.publisher or r.url for r in items[j].references}
            refs = [r.__dict__ for r in it.references]
            rows.append(Trend(
                topic=it.topic[:300], source=it.source, source_url=it.url, snippet=it.snippet,
                popularity=it.popularity, relevance=relevance(f"{it.topic} {it.snippet}", keywords, cfg.niche),
                source_count=max(1, len(publishers)), is_news=it.is_news, published_at=it.published_at,
                references=refs, run_date=run_date,
            ))
        # concorrência: mede apenas os 5 mais promissores (cada busca custa cota da API)
        top = sorted(rows, key=lambda r: r.popularity + r.relevance, reverse=True)[:5]
        for r in rows:
            if competitor and r in top:
                n = competitor.search_competition(r.topic, cfg.region, cfg.language)
                if n is not None:
                    r.competition = min(100.0, math.log10(n + 1) * 20)
                    r.competition_method = "youtube_search_30d"
                    continue
            r.competition = None
            r.competition_method = "not_measured"
        s.add_all(rows)
        s.flush()
        ids = [r.id for r in rows]
    return ids
