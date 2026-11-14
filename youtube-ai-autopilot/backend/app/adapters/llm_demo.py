"""LLM de demonstração — determinístico, offline e SEM inventar fatos.

Monta roteiros apenas recortando frases literais das referências fornecidas
(cada cena cita a fonte de onde veio). Serve para validar o fluxo completo
sem custo. A qualidade editorial é propositalmente simples: vídeos demo
nunca devem ser publicados como conteúdo final.
"""
from __future__ import annotations

import re

from .base import AdapterStatus, LLMResult

WORDS_PER_SEC = 2.4
STOP = {"o", "a", "os", "as", "de", "do", "da", "e", "é", "em", "um", "uma", "que", "por", "para", "com", "no", "na", "se"}


def split_sentences(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"(?<=[.!?])\s+", text.strip()) if p.strip()]


def keywords(text: str, n: int = 3) -> str:
    words = [w for w in re.findall(r"[\wÀ-ú]+", text.lower()) if w not in STOP and len(w) > 3]
    return " ".join(words[:n]) or text[:30]


class DemoLLM:
    name = "demo"

    def status(self) -> AdapterStatus:
        return AdapterStatus("llm", self.name, "demo", "Gerador local determinístico (sem IA)")

    def health_check(self) -> tuple[bool, str]:
        return True, "demo local"

    def generate_json(self, task: str, system: str, prompt: str, schema: dict, context: dict) -> LLMResult:
        handler = getattr(self, f"_{task}")
        return LLMResult(data=handler(context), cost_usd=0.0, provider="demo")

    # --- tarefas ---------------------------------------------------------
    def _score_ideas(self, ctx: dict) -> dict:
        ideas = []
        for t in ctx["trends"]:
            ideas.append({
                "trend_id": t["id"],
                "title": t["topic"],
                "angle": f"Explicar de forma simples, com fontes: {t['topic'].lower()}.",
                "originality": 6,
                "audience_interest": round(t.get("popularity", 50) / 10),
                "evergreen": 8 if not t.get("is_news") else 3,
                "risk_notes": "",
            })
        return {"ideas": ideas}

    def _write_script(self, ctx: dict) -> dict:
        refs = ctx["references"]
        max_words = int(ctx["target_seconds"] * WORDS_PER_SEC)
        hook = f"Você sabe {ctx['topic'][0].lower() + ctx['topic'][1:]}? A explicação é mais interessante do que parece."
        cta = "Fontes na descrição. Se curtiu, se inscreva para mais curiosidades explicadas."
        used = len(hook.split()) + len(cta.split())
        scenes, claims = [], []
        for ref in refs:
            for sent in split_sentences(ref.get("excerpt", "")):
                n = len(sent.split())
                if used + n > max_words and scenes:
                    break
                used += n
                scenes.append({
                    "narration": sent,
                    "visual_query": keywords(sent),
                    "on_screen_text": keywords(sent, 2).upper(),
                    "source_ids": [ref["id"]],
                })
                claims.append({"text": sent, "source_ids": [ref["id"]]})
        return {
            "title": ctx["topic"],
            "hook": hook,
            "scenes": scenes,
            "cta": cta,
            "sources": [{"id": r["id"], "title": r["title"], "url": r["url"]} for r in refs],
            "claims": claims,
        }

    def _fact_check(self, ctx: dict) -> dict:
        corpus = " ".join(r.get("excerpt", "") for r in ctx["references"])
        unsupported = [c["text"] for c in ctx["script"].get("claims", []) if c["text"] not in corpus]
        return {
            "verdict": "pass" if not unsupported else "fail",
            "unsupported_claims": unsupported,
            "notes": "Verificação literal contra os trechos das fontes (modo demo).",
        }

    def _seo(self, ctx: dict) -> dict:
        script = ctx["script"]
        topic = ctx["topic"]
        srcs = "\n".join(f"- {s['title']}: {s['url']}" for s in script.get("sources", []))
        desc = (f"{script['hook']}\n\n"
                f"Neste vídeo: {topic.lower()}, explicado com base em fontes verificáveis.\n\n"
                f"Fontes:\n{srcs}")
        base_tags = [w for w in re.findall(r"[\wÀ-ú]+", topic.lower()) if w not in STOP and len(w) > 2]
        tags = list(dict.fromkeys(base_tags + ctx.get("niche_keywords", [])))[:12]
        return {
            "titles": [topic, f"{topic}: a explicação", f"Entenda: {topic.lower()}"],
            "description": desc,
            "tags": tags,
            "hashtags": ["#" + t.replace(" ", "") for t in tags[:3]],
            "thumbnail_text": " ".join(topic.split()[:6]).upper(),
        }
