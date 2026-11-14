import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture(autouse=True)
def isolated_env(tmp_path, monkeypatch):
    """Cada teste roda com banco/mídia temporários e adaptadores demo."""
    monkeypatch.setenv("DATA_DIR", str(tmp_path / "data"))
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'test.db'}")
    for k in ("LLM_PROVIDER", "TRENDS_PROVIDER", "TTS_PROVIDER", "VISUALS_PROVIDER", "PUBLISHER"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("ADMIN_TOKEN", "")
    monkeypatch.setenv("EMBEDDED_WORKER", "false")
    monkeypatch.setenv("YOUTUBE_TOKEN_FILE", str(tmp_path / "no_token.json"))
    monkeypatch.setenv("YOUTUBE_CLIENT_SECRETS_FILE", str(tmp_path / "no_secret.json"))
    for k in [k for k in os.environ if k.endswith("_API_KEY")]:
        monkeypatch.delenv(k, raising=False)
    from app.config import get_settings

    get_settings.cache_clear()
    from app import db

    db.init_engine()
    from app.pipeline import get_config

    get_config()
    yield
    get_settings.cache_clear()
