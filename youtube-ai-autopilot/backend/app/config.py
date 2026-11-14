"""Configuração de infraestrutura e segredos.

Tudo aqui vem de variáveis de ambiente (ou do arquivo .env na raiz do projeto).
Nenhum destes valores é enviado ao frontend: a API expõe apenas se cada
integração está "configurada" ou não, nunca o valor do segredo.

As preferências editoriais (nicho, idioma, horários...) ficam no banco e são
editáveis pelo painel — ver `models.ChannelConfig`.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / ".env"), env_file_encoding="utf-8", extra="ignore"
    )

    # --- Infra -----------------------------------------------------------
    data_dir: Path = PROJECT_ROOT / "data"
    database_url: str = ""  # vazio => sqlite em data_dir/autopilot.db
    admin_token: str = Field(default="", description="Token exigido pelo painel/API")
    cors_origins: str = "http://localhost:5173"
    embedded_worker: bool = True  # roda scheduler+worker dentro do processo da API
    public_base_url: str = "http://localhost:8000"  # usado no redirect do OAuth

    # --- Seleção de adaptadores -----------------------------------------
    llm_provider: Literal["demo", "claude"] = "demo"
    trends_provider: Literal["demo", "google"] = "demo"
    tts_provider: Literal["demo", "elevenlabs"] = "demo"
    visuals_provider: Literal["demo", "pexels"] = "demo"
    video_gen_provider: Literal["none"] = "none"
    publisher: Literal["dry_run", "youtube"] = "dry_run"

    # --- Claude ------------------------------------------------------------
    anthropic_api_key: str = ""
    claude_model: str = "claude-opus-5-5"
    claude_effort: Literal["low", "medium", "high", "xhigh", "max"] = "high"
    claude_enable_fallbacks: bool = True
    # Preço por milhão de tokens (US$), usado para contabilizar gastos.
    claude_input_price_per_mtok: float = 4.0
    claude_output_price_per_mtok: float = 20.0

    # --- ElevenLabs ------------------------------------------------------
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""
    elevenlabs_model_id: str = "eleven_multilingual_v2"
    elevenlabs_price_per_1k_chars: float = 0.30

    # --- Pexels (imagens licenciadas) -------------------------------------
    pexels_api_key: str = ""

    # --- YouTube -----------------------------------------------------------
    youtube_client_secrets_file: Path = PROJECT_ROOT / "secrets" / "client_secret.json"
    youtube_token_file: Path = PROJECT_ROOT / "secrets" / "youtube_token.json"

    # --- Limites globais -------------------------------------------------
    monthly_budget_usd: float = 50.0
    max_job_attempts: int = 3

    # --- Alertas ----------------------------------------------------------
    alert_webhook_url: str = ""  # opcional: Slack/Discord/qualquer webhook JSON

    # --- Render -----------------------------------------------------------
    ffmpeg_bin: str = "ffmpeg"
    ffprobe_bin: str = "ffprobe"
    render_preset: str = "veryfast"
    font_path: str = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

    @model_validator(mode="after")
    def _resolve_paths(self):
        # caminhos relativos no .env são relativos à raiz do projeto, não ao diretório atual
        for name in ("data_dir", "youtube_client_secrets_file", "youtube_token_file"):
            p = getattr(self, name)
            if not p.is_absolute():
                setattr(self, name, (PROJECT_ROOT / p).resolve())
        return self

    @property
    def db_url(self) -> str:
        if self.database_url:
            return self.database_url
        return f"sqlite:///{self.data_dir / 'autopilot.db'}"

    @property
    def media_dir(self) -> Path:
        return self.data_dir / "media"

    @property
    def outbox_dir(self) -> Path:
        return self.data_dir / "outbox"

    def ensure_dirs(self) -> None:
        for d in (self.data_dir, self.media_dir, self.outbox_dir):
            d.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    s.ensure_dirs()
    return s
