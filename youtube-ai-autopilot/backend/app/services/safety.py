"""Regras de segurança editorial, qualidade e anti-repetição."""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timedelta

from ..models import utcnow

SENSITIVE_TERMS = {
    "saúde/medicina": ["doença", "câncer", "cancer", "vacina", "remédio", "medicamento", "tratamento", "cura",
                       "diagnóstico", "covid", "vírus", "dieta", "suplemento", "health", "vaccine", "cure"],
    "política/eleições": ["eleição", "eleições", "candidato", "partido", "presidente", "governo", "ministro",
                          "senado", "congresso", "stf", "election", "politic"],
    "tragédias/violência": ["morte", "morre", "morreu", "mortos", "assassin", "ataque", "guerra", "atentado",
                            "tiroteio", "acidente", "tragédia", "suicídio", "abuso", "violência", "terror", "killed"],
    "finanças": ["investimento", "ações", "bitcoin", "cripto", "lucro garantido", "renda extra", "ficar rico",
                 "invest", "stock"],
    "crime/justiça": ["preso", "prisão", "acusado", "polícia", "investigação", "denúncia", "processo judicial"],
    "religião/minorias": ["religião", "igreja", "islã", "judeu", "raça", "racismo", "lgbt"],
    "notícia não confirmada": ["rumor", "boato", "urgente", "vazou", "suposto", "supostamente", "teria",
                               "não confirmado", "breaking"],
}

CLICKBAIT_PATTERNS = [
    r"voc[eê] n[aã]o vai acreditar", r"chocante", r"ningu[eé]m te conta", r"100\s*%\s*garantid",
    r"segredo (que|proibido)", r"m[eé]dicos odeiam", r"inacredit[aá]vel", r"urgente", r"fim do mundo",
    r"ganhe dinheiro", r"fique rico", r"milagr", r"!!+", r"\bURGENTE\b",
]


def normalize(text: str) -> str:
    t = unicodedata.normalize("NFKD", text.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", " ", t).strip()


def fingerprint(text: str) -> str:
    stop = {"o", "a", "os", "as", "de", "do", "da", "dos", "das", "e", "em", "um", "uma", "que", "por",
            "para", "com", "no", "na", "se", "como", "qual", "porque", "the", "of", "and"}
    words = sorted({w for w in normalize(text).split() if w not in stop and len(w) > 2})
    return " ".join(words)[:300]


def jaccard(a: str, b: str) -> float:
    sa, sb = set(a.split()), set(b.split())
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def shingles(text: str, k: int = 4) -> set[str]:
    w = normalize(text).split()
    return {" ".join(w[i:i + k]) for i in range(max(0, len(w) - k + 1))}


def text_similarity(a: str, b: str) -> float:
    sa, sb = shingles(a), shingles(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / min(len(sa), len(sb))


def detect_sensitive(*texts: str) -> list[str]:
    blob = " " + normalize(" ".join(t for t in texts if t)) + " "
    reasons = []
    for cat, terms in SENSITIVE_TERMS.items():
        for term in terms:
            if " " + normalize(term) in blob:
                reasons.append(f"{cat}: '{term}'")
                break
    return reasons


def unconfirmed_news(is_news: bool, published_at: datetime | None, source_count: int) -> list[str]:
    reasons = []
    if is_news and source_count < 2:
        reasons.append("notícia com menos de 2 fontes independentes")
    if is_news and published_at and utcnow() - published_at < timedelta(hours=24):
        reasons.append("notícia publicada há menos de 24h (pode não estar confirmada)")
    return reasons


def clickbait_issues(text: str) -> list[str]:
    return [p for p in CLICKBAIT_PATTERNS if re.search(p, text, flags=re.IGNORECASE)]


def script_quality(script: dict, target_seconds: int, references: list[dict], previous_scripts: list[str],
                   words_per_sec: float = 2.4) -> dict:
    """Retorna relatório de qualidade. `passed=False` bloqueia aprovação automática."""
    issues, warnings = [], []
    scenes = script.get("scenes", [])
    full = " ".join([script.get("hook", "")] + [s.get("narration", "") for s in scenes] + [script.get("cta", "")])
    words = len(full.split())
    est = words / words_per_sec
    if not script.get("hook"):
        issues.append("roteiro sem gancho inicial")
    if not script.get("cta"):
        warnings.append("roteiro sem CTA")
    if len(scenes) < 2:
        issues.append("menos de 2 cenas")
    if est < target_seconds * 0.4:
        issues.append(f"roteiro curto demais (~{est:.0f}s para alvo de {target_seconds}s)")
    if est > target_seconds * 1.35:
        warnings.append(f"roteiro longo (~{est:.0f}s para alvo de {target_seconds}s)")
    ref_ids = {r["id"] for r in references}
    for i, s in enumerate(scenes):
        sids = set(s.get("source_ids", []))
        if not sids:
            issues.append(f"cena {i + 1} sem fonte associada")
        elif not sids <= ref_ids:
            issues.append(f"cena {i + 1} cita fonte inexistente {sorted(sids - ref_ids)}")
    if not references:
        issues.append("nenhuma fonte de referência")
    sim = max((text_similarity(full, p) for p in previous_scripts), default=0.0)
    if sim > 0.5:
        issues.append(f"roteiro muito parecido com vídeo anterior (similaridade {sim:.0%})")
    elif sim > 0.3:
        warnings.append(f"similaridade moderada com vídeo anterior ({sim:.0%})")
    cb = clickbait_issues(script.get("title", "") + " " + script.get("hook", ""))
    if cb:
        issues.append("linguagem sensacionalista: " + ", ".join(cb))
    return {"passed": not issues, "issues": issues, "warnings": warnings, "word_count": words,
            "estimated_seconds": round(est, 1), "max_similarity": round(sim, 3)}
