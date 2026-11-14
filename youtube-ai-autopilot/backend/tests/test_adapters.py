from types import SimpleNamespace

import pytest

from app.adapters.base import AdapterError
from app.adapters.tts import chars_to_words
from app.services import budget
from app.services.editor import caption_chunks


def test_chars_to_words():
    al = {"characters": list("Oi mundo"), "character_start_times_seconds": [0, .1, .2, .3, .4, .5, .6, .7],
          "character_end_times_seconds": [.1, .2, .3, .4, .5, .6, .7, .8]}
    w = chars_to_words(al)
    assert [x["word"] for x in w] == ["Oi", "mundo"]
    assert w[1]["start"] == .3 and w[1]["end"] == .8


def test_caption_chunks_break_on_punctuation():
    words = [{"word": w, "start": i, "end": i + .5} for i, w in enumerate("Olá mundo. Tudo bem com você hoje".split())]
    chunks = caption_chunks(words, 4)
    assert chunks[0]["text"] == "Olá mundo."
    assert chunks[1]["text"] == "Tudo bem com você"


class _FakeMessages:
    def __init__(self, resp):
        self.resp, self.kwargs = resp, None

    def create(self, **kw):
        self.kwargs = kw
        return self.resp


def _claude_with(resp, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    from app.config import get_settings

    get_settings.cache_clear()
    from app.adapters.llm_claude import ClaudeLLM

    c = ClaudeLLM()
    fake = _FakeMessages(resp)
    c._client = SimpleNamespace(beta=SimpleNamespace(messages=fake), messages=fake)
    return c, fake


def test_claude_adapter_structured_output(monkeypatch):
    resp = SimpleNamespace(stop_reason="end_turn", stop_details=None, model="claude-opus-5-5",
                           content=[SimpleNamespace(type="thinking"), SimpleNamespace(type="text", text='{"ok": true}')],
                           usage=SimpleNamespace(input_tokens=1000, output_tokens=100))
    c, fake = _claude_with(resp, monkeypatch)
    r = c.generate_json("health", "sys", "p", {"type": "object"}, {})
    assert r.data == {"ok": True}
    assert fake.kwargs["model"] == "claude-opus-5-5"
    assert fake.kwargs["output_config"]["format"]["type"] == "json_schema"
    assert fake.kwargs["fallbacks"] == "default"
    assert r.cost_usd == pytest.approx((1000 * 4 + 100 * 20) / 1e6)


def test_claude_refusal_is_not_retried(monkeypatch):
    resp = SimpleNamespace(stop_reason="refusal", stop_details=SimpleNamespace(category="bio"), model="m",
                           content=[], usage=SimpleNamespace(input_tokens=1, output_tokens=1))
    c, _ = _claude_with(resp, monkeypatch)
    with pytest.raises(AdapterError) as e:
        c.generate_json("write_script", "s", "p", {}, {})
    assert not e.value.retryable


def test_budget_blocks_overspend():
    from app.db import session_scope
    from app.models import ChannelConfig

    with session_scope() as s:
        s.get(ChannelConfig, 1).budget_per_video_usd = 1.0
    budget.record(None, "x", 0.0, "nada")
    budget.check(7, 0.5)
    from app.models import Video

    with session_scope() as s:
        s.add(Video(id=7, format="short"))
    budget.record(7, "claude", 0.9, "roteiro")
    with pytest.raises(budget.BudgetExceeded):
        budget.check(7, 0.2)
