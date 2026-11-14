"""Contratos dos adaptadores de serviços externos.

Cada integração real implementa a mesma interface do seu adaptador de
demonstração. O adaptador informa honestamente seu `status()`:

- ``demo``           — implementação local, sem serviço externo (não publica nada real)
- ``not_configured`` — integração real escolhida, mas falta segredo/arquivo
- ``configured``     — segredos presentes, ainda não verificada ao vivo
- ``not_implemented``— ponto de extensão sem implementação (ex.: geração de vídeo por IA)

O resultado de verificações ao vivo (health-check) é persistido em
``ReadinessCheck`` e é isso que libera a publicação real.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol


class AdapterError(RuntimeError):
    """Erro de integração. `retryable` indica se o worker deve tentar de novo."""

    def __init__(self, message: str, retryable: bool = True):
        super().__init__(message)
        self.retryable = retryable


class NotConfiguredError(AdapterError):
    def __init__(self, message: str):
        super().__init__(message, retryable=False)


class NotImplementedIntegration(AdapterError):
    def __init__(self, message: str):
        super().__init__(message, retryable=False)


@dataclass
class AdapterStatus:
    name: str
    provider: str
    state: str  # demo | not_configured | configured | not_implemented
    detail: str = ""

    def as_dict(self) -> dict:
        return self.__dict__.copy()


@dataclass
class Reference:
    title: str
    url: str
    excerpt: str = ""
    publisher: str = ""


@dataclass
class TrendItem:
    topic: str
    source: str
    popularity: float  # 0..100
    url: str | None = None
    snippet: str = ""
    published_at: datetime | None = None
    is_news: bool = False
    references: list[Reference] = field(default_factory=list)


@dataclass
class LLMResult:
    data: dict
    cost_usd: float
    provider: str
    meta: dict = field(default_factory=dict)


@dataclass
class TTSResult:
    audio_path: Path
    duration_sec: float
    words: list[dict]  # [{"word": str, "start": float, "end": float}]
    cost_usd: float
    provider: str
    has_voice: bool  # False no modo demo (áudio placeholder, sem fala)


@dataclass
class VisualAsset:
    path: Path
    provider: str
    license: str
    attribution: str
    source_url: str | None = None
    query: str = ""
    cost_usd: float = 0.0


@dataclass
class PublishResult:
    provider: str
    published: bool  # True SOMENTE se o vídeo foi realmente enviado ao YouTube
    video_id: str | None
    url: str | None
    privacy: str
    publish_at: datetime | None
    detail: dict[str, Any] = field(default_factory=dict)


class LLMAdapter(Protocol):
    name: str

    def status(self) -> AdapterStatus: ...
    def generate_json(self, task: str, system: str, prompt: str, schema: dict, context: dict) -> LLMResult: ...
    def health_check(self) -> tuple[bool, str]: ...


class TrendsAdapter(Protocol):
    name: str

    def status(self) -> AdapterStatus: ...
    def fetch(self, keywords: list[str], language: str, region: str) -> list[TrendItem]: ...
    def health_check(self) -> tuple[bool, str]: ...


class TTSAdapter(Protocol):
    name: str

    def status(self) -> AdapterStatus: ...
    def synthesize(self, text: str, style: str, language: str, out_path: Path) -> TTSResult: ...
    def health_check(self) -> tuple[bool, str]: ...


class VisualsAdapter(Protocol):
    name: str

    def status(self) -> AdapterStatus: ...
    def get_visual(self, query: str, caption: str, orientation: str, out_path: Path) -> VisualAsset: ...
    def health_check(self) -> tuple[bool, str]: ...


class PublisherAdapter(Protocol):
    name: str

    def status(self) -> AdapterStatus: ...
    def publish(self, video_path: Path, thumbnail_path: Path | None, metadata: dict, privacy: str,
                publish_at: datetime | None, captions_path: Path | None) -> PublishResult: ...
    def fetch_stats(self, video_ids: list[str]) -> dict[str, dict]: ...
    def health_check(self) -> tuple[bool, str]: ...
