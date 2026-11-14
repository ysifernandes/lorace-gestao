"""Adaptador real da Claude API (SDK oficial `anthropic`).

- Saída estruturada via `output_config.format` (JSON Schema) — o texto retornado
  é JSON válido para o schema informado.
- Pensamento adaptativo (padrão do modelo) com `effort` configurável.
- Fallback do lado do servidor em caso de recusa (`fallbacks: "default"`),
  desativável com CLAUDE_ENABLE_FALLBACKS=false.
"""
from __future__ import annotations

import json

import anthropic

from ..config import get_settings
from .base import AdapterError, AdapterStatus, LLMResult, NotConfiguredError

FALLBACK_BETA = "server-side-fallback-2026-07-01"


class ClaudeLLM:
    name = "claude"

    def __init__(self):
        self.s = get_settings()
        self._client: anthropic.Anthropic | None = None

    def status(self) -> AdapterStatus:
        if not self.s.anthropic_api_key:
            return AdapterStatus("llm", self.name, "not_configured", "Defina ANTHROPIC_API_KEY no .env")
        return AdapterStatus("llm", self.name, "configured", f"modelo {self.s.claude_model}")

    @property
    def client(self) -> anthropic.Anthropic:
        if not self.s.anthropic_api_key:
            raise NotConfiguredError("ANTHROPIC_API_KEY não definida")
        if self._client is None:
            self._client = anthropic.Anthropic(api_key=self.s.anthropic_api_key, max_retries=3, timeout=600)
        return self._client

    def _create(self, **kwargs):
        if self.s.claude_enable_fallbacks:
            return self.client.beta.messages.create(betas=[FALLBACK_BETA], fallbacks="default", **kwargs)
        return self.client.messages.create(**kwargs)

    def generate_json(self, task: str, system: str, prompt: str, schema: dict, context: dict) -> LLMResult:
        try:
            resp = self._create(
                model=self.s.claude_model,
                max_tokens=16000,
                system=system,
                output_config={
                    "effort": self.s.claude_effort,
                    "format": {"type": "json_schema", "schema": schema},
                },
                messages=[{"role": "user", "content": prompt}],
            )
        except anthropic.AuthenticationError as e:
            raise AdapterError(f"Claude: chave inválida ({e.message})", retryable=False) from e
        except anthropic.PermissionDeniedError as e:
            raise AdapterError(f"Claude: permissão negada ({e.message})", retryable=False) from e
        except anthropic.BadRequestError as e:
            raise AdapterError(f"Claude: requisição inválida ({e.message})", retryable=False) from e
        except anthropic.RateLimitError as e:
            raise AdapterError("Claude: limite de taxa atingido", retryable=True) from e
        except anthropic.APIStatusError as e:
            raise AdapterError(f"Claude: erro {e.status_code}", retryable=e.status_code >= 500) from e
        except anthropic.APIConnectionError as e:
            raise AdapterError("Claude: falha de conexão", retryable=True) from e

        if resp.stop_reason == "refusal":
            cat = getattr(resp.stop_details, "category", None) if resp.stop_details else None
            raise AdapterError(f"Claude recusou a tarefa '{task}' (categoria: {cat}). Requer revisão humana.",
                               retryable=False)
        if resp.stop_reason == "max_tokens":
            raise AdapterError(f"Claude: resposta truncada em '{task}'", retryable=True)

        text = next((b.text for b in resp.content if b.type == "text"), None)
        if text is None:
            raise AdapterError(f"Claude: resposta sem texto em '{task}'", retryable=True)
        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            raise AdapterError(f"Claude: JSON inválido em '{task}'", retryable=True) from e

        u = resp.usage
        cost = (u.input_tokens * self.s.claude_input_price_per_mtok
                + u.output_tokens * self.s.claude_output_price_per_mtok) / 1_000_000
        return LLMResult(data=data, cost_usd=round(cost, 5), provider=f"claude:{resp.model}",
                         meta={"request_id": getattr(resp, "_request_id", None),
                               "input_tokens": u.input_tokens, "output_tokens": u.output_tokens})

    def health_check(self) -> tuple[bool, str]:
        try:
            r = self.generate_json(
                "health", "Responda apenas no formato pedido.", "Retorne ok=true.",
                {"type": "object", "properties": {"ok": {"type": "boolean"}}, "required": ["ok"],
                 "additionalProperties": False}, {})
            return bool(r.data.get("ok")), f"OK ({r.provider}, US$ {r.cost_usd:.4f})"
        except AdapterError as e:
            return False, str(e)
