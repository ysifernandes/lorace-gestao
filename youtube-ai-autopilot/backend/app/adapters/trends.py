"""Adaptadores de tendências.

- DemoTrends: tópicos atemporais embutidos (com referências reais da Wikipédia).
- GoogleTrends: Google Trends (biblioteca não oficial `pytrends`) + Google News RSS
  para obter fontes/validação, + Wikipédia REST para material de referência.

Atenção: o Google não oferece API pública oficial do Trends; o `pytrends`
faz scraping e pode receber HTTP 429. Nesse caso o adaptador cai para as
notícias do Google News RSS e registra a limitação no detalhe do item.
"""
from __future__ import annotations

import json
import re
import urllib.parse
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

import feedparser
import httpx

from .base import AdapterError, AdapterStatus, Reference, TrendItem

DEMO_FILE = Path(__file__).resolve().parents[1] / "demo_data" / "topics.json"
UA = {"User-Agent": "youtube-ai-autopilot/1.0 (research bot)"}


class DemoTrends:
    name = "demo"

    def status(self) -> AdapterStatus:
        return AdapterStatus("trends", self.name, "demo", "Conjunto local de temas atemporais")

    def health_check(self) -> tuple[bool, str]:
        return DEMO_FILE.exists(), "demo local"

    def fetch(self, keywords: list[str], language: str, region: str) -> list[TrendItem]:
        data = json.loads(DEMO_FILE.read_text(encoding="utf-8"))
        items = []
        for d in data:
            items.append(TrendItem(
                topic=d["topic"], source="demo-dataset", popularity=d["popularity"],
                url=d["references"][0]["url"], snippet=d["references"][0]["excerpt"][:200],
                references=[Reference(**r) for r in d["references"]],
            ))
        return items


def wikipedia_reference(topic: str, language: str) -> Reference | None:
    """Busca o resumo de um artigo da Wikipédia (licença CC BY-SA) como material de referência."""
    lang = language.split("-")[0]
    try:
        r = httpx.get(f"https://{lang}.wikipedia.org/w/api.php", headers=UA, timeout=15, params={
            "action": "query", "list": "search", "srsearch": topic, "format": "json", "srlimit": 1})
        hits = r.json().get("query", {}).get("search", [])
        if not hits:
            return None
        title = hits[0]["title"]
        s = httpx.get(f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(title)}",
                      headers=UA, timeout=15).json()
        if not s.get("extract"):
            return None
        return Reference(title=f"{title} — Wikipédia", url=s.get("content_urls", {}).get("desktop", {}).get("page", ""),
                         excerpt=s["extract"], publisher="Wikipédia")
    except Exception:
        return None


class GoogleTrends:
    name = "google"

    def status(self) -> AdapterStatus:
        return AdapterStatus("trends", self.name, "configured",
                             "pytrends (não oficial) + Google News RSS + Wikipédia; sem chave necessária")

    def health_check(self) -> tuple[bool, str]:
        try:
            items = self._news("ciência", "pt-BR", "BR", limit=3)
            return bool(items), f"Google News RSS OK ({len(items)} itens)"
        except Exception as e:
            return False, f"falha: {e}"

    def _news(self, query: str, language: str, region: str, limit: int = 10) -> list[TrendItem]:
        lang = language.split("-")[0]
        url = ("https://news.google.com/rss/search?" + urllib.parse.urlencode(
            {"q": query, "hl": language, "gl": region, "ceid": f"{region}:{lang}"}))
        resp = httpx.get(url, headers=UA, timeout=20, follow_redirects=True)
        if resp.status_code != 200:
            raise AdapterError(f"Google News RSS HTTP {resp.status_code}")
        feed = feedparser.parse(resp.text)
        out = []
        for e in feed.entries[:limit]:
            published = None
            if getattr(e, "published", None):
                try:
                    published = parsedate_to_datetime(e.published).astimezone(timezone.utc).replace(tzinfo=None)
                except Exception:
                    published = None
            publisher = getattr(getattr(e, "source", None), "title", "") if hasattr(e, "source") else ""
            title = re.sub(r"\s+-\s+[^-]+$", "", e.title)  # remove " - Veículo"
            out.append(TrendItem(
                topic=title, source="google-news", popularity=40.0, url=e.link,
                snippet=re.sub("<[^>]+>", "", getattr(e, "summary", ""))[:300],
                published_at=published, is_news=True,
                references=[Reference(title=e.title, url=e.link, publisher=publisher,
                                      excerpt=re.sub("<[^>]+>", "", getattr(e, "summary", ""))[:500])],
            ))
        return out

    def _pytrends(self, keywords: list[str], language: str, region: str) -> list[TrendItem]:
        from pytrends.request import TrendReq  # import tardio: biblioteca pesada

        py = TrendReq(hl=language, tz=180, timeout=(10, 25), retries=1, backoff_factor=0.5)
        items: list[TrendItem] = []
        kw = keywords[:5]
        py.build_payload(kw, timeframe="now 7-d", geo=region)
        related = py.related_queries()
        for k in kw:
            rising = (related.get(k) or {}).get("rising")
            if rising is None:
                continue
            for _, row in rising.head(5).iterrows():
                val = float(row["value"])
                items.append(TrendItem(topic=str(row["query"]), source="google-trends",
                                       popularity=min(100.0, 30 + val / 50),
                                       snippet=f"Busca em alta relacionada a '{k}' (+{int(val)}%)"))
        return items

    def fetch(self, keywords: list[str], language: str, region: str) -> list[TrendItem]:
        items: list[TrendItem] = []
        notes = []
        try:
            items += self._pytrends(keywords, language, region)
        except Exception as e:
            notes.append(f"pytrends indisponível ({type(e).__name__})")
        for k in keywords[:3]:
            try:
                items += self._news(k, language, region, limit=8)
            except Exception as e:
                notes.append(f"news '{k}' falhou ({e})")
        if not items:
            raise AdapterError("Nenhuma tendência coletada: " + "; ".join(notes))
        # anexa material de referência enciclopédico para temas sem fontes
        for it in items:
            if not it.references or it.source == "google-trends":
                ref = wikipedia_reference(it.topic, language)
                if ref:
                    it.references.append(ref)
            if notes:
                it.snippet = (it.snippet + " | " + "; ".join(notes))[:500]
        return items


def utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)
