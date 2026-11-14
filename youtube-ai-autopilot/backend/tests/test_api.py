from fastapi.testclient import TestClient

from app.main import app


def client():
    return TestClient(app)


def test_health_and_dashboard():
    with client() as c:
        assert c.get("/api/health").json()["ok"]
        d = c.get("/api/dashboard").json()
        assert d["mode"] == "review"
        assert d["publish_ready"] is False
        assert d["adapters"]["llm"]["state"] == "demo"


def test_secrets_never_exposed(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-super-secret")
    from app.config import get_settings

    get_settings.cache_clear()
    with client() as c:
        for path in ("/api/dashboard", "/api/integrations", "/api/config", "/api/readiness"):
            assert "sk-super-secret" not in c.get(path).text


def test_auto_mode_requires_authorization():
    with client() as c:
        cfg = c.get("/api/config").json()
        body = {k: cfg[k] for k in ("channel_name", "niche", "niche_keywords", "language", "region", "daily_videos",
                                    "short_duration_sec", "long_duration_sec", "video_format", "narration_style",
                                    "budget_per_video_usd", "timezone", "pipeline_run_time", "post_time",
                                    "scheduler_enabled", "default_privacy", "declare_synthetic_media",
                                    "made_for_kids", "min_days_between_similar")}
        body["mode"] = "auto"
        assert c.put("/api/config", json=body).status_code == 400
        body["mode"] = "review"
        body["niche"] = "astronomia"
        assert c.put("/api/config", json=body).json()["niche"] == "astronomia"
        r = c.post("/api/config/authorize-autopublish", json={"confirm_text": "sim", "authorized_by": "eu"})
        assert r.status_code == 400
        r = c.post("/api/config/authorize-autopublish",
                   json={"confirm_text": "AUTORIZO PUBLICACAO AUTOMATICA", "authorized_by": "eu"})
        assert r.status_code == 400  # prontidão incompleta


def test_admin_token_enforced(monkeypatch):
    monkeypatch.setenv("ADMIN_TOKEN", "abc")
    from app.config import get_settings

    get_settings.cache_clear()
    with client() as c:
        assert c.get("/api/dashboard").status_code == 401
        assert c.get("/api/dashboard", headers={"Authorization": "Bearer abc"}).status_code == 200
        assert c.get("/api/health").status_code == 200


def test_audit_requires_all_items():
    with client() as c:
        n = len(c.get("/api/readiness").json()["audit_items"])
        assert c.post("/api/readiness/audit", json={"signed_by": "eu", "confirmations": [True] * (n - 1)}).status_code == 400
        assert c.post("/api/readiness/audit", json={"signed_by": "eu", "confirmations": [True] * n}).status_code == 200
