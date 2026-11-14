from sqlalchemy import select

from app import pipeline, worker
from app.db import session_scope
from app.models import ChannelConfig, Job, Video
from app.services import editor
from app.services.readiness import can_publish


def test_demo_flow_renders_and_never_marks_published():
    vid = pipeline.run_demo_inline("short", render_scale=0.25)
    with session_scope() as s:
        v = s.get(Video, vid)
        assert v.status == "awaiting_approval"
        assert v.is_demo
        assert v.thumbnail_path and v.subtitles_path
        assert v.script["sources"], "roteiro deve citar fontes"
        assert v.quality_report["script"]["fact_check"]["verdict"] == "pass"
        assert not v.quality_report["final"]["passed"]  # demo nunca é publicável
        path = v.video_path
    info = editor.probe(__import__("pathlib").Path(path))
    assert (info["width"], info["height"]) == (270, 480)
    assert info["duration"] > 5

    # aprovação humana + publicação em dry-run => exportado, nunca "published"
    pipeline.approve_video(vid, "tester", worker.enqueue)
    worker.drain()
    with session_scope() as s:
        v = s.get(Video, vid)
        assert v.status == "exported"
        assert v.youtube_video_id is None


def test_daily_run_does_not_duplicate(monkeypatch):
    with session_scope() as s:
        s.get(ChannelConfig, 1).daily_videos = 2
    r1 = pipeline.daily_run("2026-01-01", worker.enqueue)
    r2 = pipeline.daily_run("2026-01-01", worker.enqueue)
    assert len(r1["videos"]) == 2
    assert r2["videos"] == []  # mesmos temas bloqueados por anti-repetição
    with session_scope() as s:
        assert len(list(s.scalars(select(Video)))) == 2


def test_review_mode_stops_at_script_review():
    with session_scope() as s:
        s.get(ChannelConfig, 1).daily_videos = 1
    worker.enqueue("daily_run", {"date": "2026-02-01"}, dedupe_key="daily_run:2026-02-01")
    worker.drain()
    with session_scope() as s:
        v = s.scalar(select(Video))
        assert v.status == "script_review"


def test_real_publishing_blocked_until_ready():
    ok, reasons = can_publish(real_upload=True)
    assert not ok
    assert any("OAuth" in r for r in reasons)
    assert any("Testes" in r for r in reasons)
    assert can_publish(real_upload=False) == (True, [])


def test_job_dedupe_and_retry(monkeypatch):
    calls = {"n": 0}

    def boom(p):
        calls["n"] += 1
        raise RuntimeError("falha temporária")

    monkeypatch.setitem(worker.HANDLERS, "analytics_sync", boom)
    j1 = worker.enqueue("analytics_sync", {}, dedupe_key="x")
    assert worker.enqueue("analytics_sync", {}, dedupe_key="x") is None
    worker.drain()
    with session_scope() as s:
        j = s.get(Job, j1)
        assert j.status == "pending" and j.attempts == 1  # reagendado com backoff
        assert j.run_after > j.created_at


def test_publish_slot_respects_post_time():
    from datetime import datetime, timezone

    cfg = pipeline.get_config()
    now = datetime(2026, 3, 10, 12, 0, tzinfo=timezone.utc)  # 09:00 em São Paulo
    slot = pipeline.next_publish_slot(cfg, now)
    assert slot == datetime(2026, 3, 10, 21, 0)  # 18:00 BRT = 21:00 UTC


def test_long_format_renders_horizontal():
    vid = pipeline.run_demo_inline("long", render_scale=0.2)
    with session_scope() as s:
        v = s.get(Video, vid)
        info = editor.probe(__import__("pathlib").Path(v.video_path))
    assert (info["width"], info["height"]) == (384, 216)


def test_relative_paths_resolve_from_project_root(monkeypatch):
    from app.config import PROJECT_ROOT, Settings

    monkeypatch.setenv("YOUTUBE_TOKEN_FILE", "./secrets/tok.json")
    assert Settings().youtube_token_file == (PROJECT_ROOT / "secrets" / "tok.json").resolve()
