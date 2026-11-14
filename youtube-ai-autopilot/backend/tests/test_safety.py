from app.services.safety import (
    clickbait_issues,
    detect_sensitive,
    fingerprint,
    jaccard,
    script_quality,
    text_similarity,
    unconfirmed_news,
)


def test_sensitive_topics_detected():
    assert detect_sensitive("Nova vacina contra gripe")
    assert any("política" in r for r in detect_sensitive("Candidato lidera eleição"))
    assert detect_sensitive("Por que o céu é azul") == []


def test_unconfirmed_news_requires_two_sources():
    assert unconfirmed_news(True, None, 1)
    assert unconfirmed_news(True, None, 3) == []
    assert unconfirmed_news(False, None, 1) == []


def test_clickbait():
    assert clickbait_issues("Você não vai acreditar nisso!!")
    assert clickbait_issues("Por que o céu é azul") == []


def test_fingerprint_dedupe():
    a, b = fingerprint("Por que o céu é azul?"), fingerprint("O céu: por que é azul")
    assert jaccard(a, b) == 1.0


def test_script_quality_requires_sources_and_hook():
    refs = [{"id": 1}]
    bad = {"title": "x", "hook": "", "cta": "", "scenes": [{"narration": "a b c", "source_ids": []}]}
    rep = script_quality(bad, 45, refs, [])
    assert not rep["passed"]
    assert any("gancho" in i for i in rep["issues"])
    assert any("sem fonte" in i for i in rep["issues"])


def test_script_quality_detects_repetition():
    text = " ".join(f"palavra{i}" for i in range(60))
    s = {"title": "t", "hook": "h", "cta": "c", "scenes": [{"narration": text, "source_ids": [1]},
                                                           {"narration": text, "source_ids": [1]}]}
    rep = script_quality(s, 45, [{"id": 1}], ["h " + text])
    assert any("parecido" in i for i in rep["issues"])
    assert text_similarity(text, text) == 1.0
