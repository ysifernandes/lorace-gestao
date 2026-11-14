"""Orquestração das etapas do vídeo (módulos 3 a 7).

Fluxo de status de um vídeo:

  queued → scripting → [script_review] → producing → [awaiting_approval] → approved
         → publishing → scheduled | published | exported(dry-run)
  (qualquer etapa) → failed | rejected

Portões humanos:
- modo "review": sempre para em script_review e em awaiting_approval;
- modo "auto": só para quando há tema sensível, notícia não confirmada,
  falha de checagem de fatos ou de qualidade.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from sqlalchemy import select

from .adapters.base import AdapterError
from .adapters.registry import Adapters, get_adapters
from .config import get_settings
from .db import session_scope
from .logbus import alert, log
from .models import ChannelConfig, Idea, Video
from .services import budget, editor, planner, prompts, readiness, research
from .services.safety import clickbait_issues, detect_sensitive, script_quality
from .services.thumbnail import make_thumbnail

AI_DISCLOSURE = ("\n\nTransparência: roteiro, narração e/ou imagens deste vídeo foram produzidos com auxílio de "
                 "ferramentas de inteligência artificial e revisados conforme nossa política editorial.")


class NeedsHuman(Exception):
    """Etapa interrompida aguardando decisão humana (não é erro)."""


def get_config() -> ChannelConfig:
    with session_scope() as s:
        cfg = s.get(ChannelConfig, 1)
        if cfg is None:
            cfg = ChannelConfig(id=1)
            s.add(cfg)
            s.flush()
        s.expunge(cfg)
        return cfg


def _set(video_id: int, **fields) -> None:
    with session_scope() as s:
        v = s.get(Video, video_id)
        for k, val in fields.items():
            setattr(v, k, val)


def _video(video_id: int) -> Video:
    with session_scope() as s:
        v = s.get(Video, video_id)
        if v is None:
            raise AdapterError(f"vídeo {video_id} não existe", retryable=False)
        s.expunge(v)
        return v


def video_dir(video_id: int) -> Path:
    d = get_settings().media_dir / f"video_{video_id}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def adapters_for(v: Video) -> Adapters:
    return get_adapters(demo=v.is_demo)


# ---------------------------------------------------------------- execução diária
def daily_run(run_date: str, enqueue) -> dict:
    cfg = get_config()
    ad = get_adapters()
    with session_scope() as s:  # idempotente por data: não produz além da cota diária
        already = len(list(s.scalars(select(Idea.id).where(Idea.scheduled_for == run_date,
                                                           Idea.status.in_(["selected", "used"]),
                                                           ~Idea.fingerprint.startswith("demo ")))))
    needed = max(0, cfg.daily_videos - already)
    if needed == 0:
        log("pipeline", f"cota diária de {run_date} já atendida ({already} pautas); nada a fazer")
        return {"trends": 0, "ideas": [], "videos": []}
    log("pipeline", f"execução diária {run_date} (llm={ad.llm.name}, trends={ad.trends.name})")
    trend_ids = research.collect(run_date, ad, cfg)
    idea_ids = planner.plan(run_date, ad, cfg, trend_ids, needed)
    formats = ["short", "long"] if cfg.video_format == "both" else [cfg.video_format]
    created = []
    for iid in idea_ids:
        for fmt in formats:
            vid = create_video(iid, fmt, is_demo=False)
            if vid:
                created.append(vid)
                enqueue("script", {"video_id": vid}, dedupe_key=f"script:{vid}")
    return {"trends": len(trend_ids), "ideas": idea_ids, "videos": created}


def create_video(idea_id: int, fmt: str, is_demo: bool) -> int | None:
    with session_scope() as s:
        if s.scalar(select(Video.id).where(Video.idea_id == idea_id, Video.format == fmt)):
            return None  # prevenção de duplicação
        idea = s.get(Idea, idea_id)
        idea.status = "used"
        cfg = s.get(ChannelConfig, 1)
        v = Video(idea_id=idea_id, format=fmt, is_demo=is_demo, title=idea.title,
                  privacy=cfg.default_privacy if cfg else "private",
                  requires_human_review=idea.sensitive, review_reasons=list(idea.sensitive_reasons or []))
        s.add(v)
        s.flush()
        return v.id


# ---------------------------------------------------------------- módulo 3: roteiro
def stage_script(video_id: int, enqueue) -> str:
    v = _video(video_id)
    cfg = get_config()
    ad = adapters_for(v)
    with session_scope() as s:
        idea = s.get(Idea, v.idea_id)
        s.expunge(idea)
        prev = [x.script for x in s.scalars(select(Video).where(Video.id != video_id, Video.script.is_not(None),
                                                               Video.is_demo == v.is_demo))]
    _set(video_id, status="scripting", error=None)
    refs = [{"id": i + 1, "title": r.get("title", ""), "url": r.get("url", ""), "excerpt": r.get("excerpt", "")[:3000]}
            for i, r in enumerate(idea.references or [])]
    target = cfg.short_duration_sec if v.format == "short" else cfg.long_duration_sec
    ctx = {"topic": idea.topic, "angle": idea.angle, "references": refs, "format": v.format,
           "target_seconds": target, "language": cfg.language, "style": cfg.narration_style}

    budget.check(video_id, 0.3)
    system, prompt = prompts.script_prompt(ctx)
    res = ad.llm.generate_json("write_script", system, prompt, prompts.SCRIPT_SCHEMA, ctx)
    budget.record(video_id, res.provider, res.cost_usd, "roteiro")
    script = res.data

    budget.check(video_id, 0.1)
    system, prompt = prompts.fact_prompt(script, refs)
    fc = ad.llm.generate_json("fact_check", system, prompt, prompts.FACT_SCHEMA, {"script": script, "references": refs})
    budget.record(video_id, fc.provider, fc.cost_usd, "checagem de fatos")

    prev_texts = [" ".join([p.get("hook", "")] + [sc.get("narration", "") for sc in p.get("scenes", [])])
                  for p in prev if p]
    quality = script_quality(script, target, refs, prev_texts)
    quality["fact_check"] = fc.data
    reasons = list(v.review_reasons or [])
    narr = " ".join(sc.get("narration", "") for sc in script.get("scenes", []))
    for r in detect_sensitive(script.get("title", ""), narr):
        if r not in reasons:
            reasons.append(r)
    if fc.data.get("verdict") != "pass":
        reasons.append("checagem de fatos reprovou: " + "; ".join(fc.data.get("unsupported_claims", [])[:3]))
    if not quality["passed"]:
        reasons.append("qualidade do roteiro: " + "; ".join(quality["issues"]))

    needs_review = bool(reasons) or cfg.mode == "review"
    _set(video_id, script=script, title=script.get("title") or v.title, quality_report={"script": quality},
         requires_human_review=bool(reasons), review_reasons=reasons,
         providers={**(v.providers or {}), "llm": res.provider},
         status="script_review" if needs_review else "script_ready")
    log("scriptwriter", f"roteiro gerado ({quality['word_count']} palavras, fatos={fc.data.get('verdict')})",
        video_id=video_id)
    if needs_review:
        log("scriptwriter", "aguardando revisão humana do roteiro", video_id=video_id)
        return "script_review"
    enqueue("produce", {"video_id": video_id}, dedupe_key=f"produce:{video_id}")
    return "script_ready"


def approve_script(video_id: int, reviewer: str, enqueue) -> None:
    v = _video(video_id)
    if v.status != "script_review":
        raise AdapterError(f"vídeo está em '{v.status}', não em revisão de roteiro", retryable=False)
    # approved_by só é preenchido na aprovação final (usado para distinguir publicação humana x automática)
    _set(video_id, status="script_ready")
    log("review", f"roteiro aprovado por {reviewer}", video_id=video_id)
    enqueue("produce", {"video_id": video_id}, dedupe_key=f"produce:{video_id}")


# ---------------------------------------------------------------- módulos 4, 5, 6: produção
def _segments(script: dict) -> list[dict]:
    segs = [{"text": script["hook"], "query": script["scenes"][0]["visual_query"] if script["scenes"] else "abstract",
             "caption": ""}]
    for sc in script["scenes"]:
        segs.append({"text": sc["narration"], "query": sc["visual_query"], "caption": sc.get("on_screen_text", "")})
    if script.get("cta"):
        segs.append({"text": script["cta"], "query": script["scenes"][-1]["visual_query"] if script["scenes"]
                     else "abstract", "caption": ""})
    return segs


def stage_produce(video_id: int, enqueue, render_scale: float = 1.0) -> str:
    v = _video(video_id)
    if v.status not in ("script_ready", "producing"):
        raise AdapterError(f"vídeo em '{v.status}' não pode ser produzido", retryable=False)
    cfg = get_config()
    ad = adapters_for(v)
    d = video_dir(video_id)
    _set(video_id, status="producing")
    script = v.script
    segs = _segments(script)
    full_text = " ".join(s["text"] for s in segs)

    # narração
    est_tts = len(full_text) / 1000 * get_settings().elevenlabs_price_per_1k_chars if ad.tts.name != "demo" else 0
    budget.check(video_id, est_tts)
    tts = ad.tts.synthesize(full_text, cfg.narration_style, cfg.language, d / "narration.mp3")
    budget.record(video_id, tts.provider, tts.cost_usd, f"narração ({len(full_text)} caracteres)")
    log("production", f"narração pronta via {tts.provider} ({tts.duration_sec:.1f}s, voz={tts.has_voice})",
        video_id=video_id)

    # mapeia palavras -> segmentos para sincronizar cenas com a fala
    words = tts.words
    idx, bounds = 0, []
    for sg in segs:
        n = len(sg["text"].split())
        bounds.append(words[idx]["start"] if idx < len(words) else tts.duration_sec)
        idx += n
    orientation = "portrait" if v.format == "short" else "landscape"
    scenes, assets = [], []
    for i, sg in enumerate(segs):
        start = 0.0 if i == 0 else bounds[i]
        end = bounds[i + 1] if i + 1 < len(bounds) else tts.duration_sec
        asset = ad.visuals.get_visual(sg["query"], sg["caption"], orientation, d / f"scene_{i:02d}.jpg")
        budget.record(video_id, asset.provider, asset.cost_usd, "visual")
        assets.append({"scene": i, "path": str(asset.path), "provider": asset.provider, "license": asset.license,
                       "attribution": asset.attribution, "source_url": asset.source_url, "query": asset.query})
        scenes.append({"image": asset.path, "start": start, "end": end})

    # legendas + render
    ass, srt = d / "captions.ass", d / "captions.srt"
    editor.write_subtitles(words, v.format, ass, srt)
    out = d / f"final_{v.format}.mp4"
    editor.render(v.format, scenes, tts.audio_path, ass, out, tts.duration_sec, scale=render_scale)
    info = editor.probe(out)
    log("editor", f"render concluído {info['width']}x{info['height']} {info['duration']:.1f}s", video_id=video_id)

    # SEO
    budget.check(video_id, 0.05)
    system, prompt = prompts.seo_prompt(script, v.title, v.format, cfg.language)
    seo = ad.llm.generate_json("seo", system, prompt, prompts.SEO_SCHEMA,
                               {"script": script, "topic": v.title, "niche_keywords": cfg.niche_keywords})
    budget.record(video_id, seo.provider, seo.cost_usd, "SEO")
    seo_data = seo.data
    titles = [t for t in seo_data.get("titles", []) if t and not clickbait_issues(t) and len(t) <= 100]
    title = titles[0] if titles else v.title
    attributions = sorted({a["attribution"] + (f" — {a['source_url']}" if a.get("source_url") else "")
                           for a in assets if a["provider"] != "demo"})
    description = seo_data.get("description", "")
    if attributions:
        description += "\n\nCréditos das imagens:\n" + "\n".join(f"- {a}" for a in attributions)
    description += AI_DISCLOSURE
    if v.format == "short" and "#shorts" not in description.lower():
        description += "\n#Shorts"
    seo_data.update({"chosen_title": title, "final_description": description})

    # thumbnail (sempre horizontal 1280x720)
    thumb_bg = ad.visuals.get_visual(segs[0]["query"], "", "landscape", d / "thumb_bg.jpg")
    assets.append({"scene": "thumbnail", "path": str(thumb_bg.path), "provider": thumb_bg.provider,
                   "license": thumb_bg.license, "attribution": thumb_bg.attribution,
                   "source_url": thumb_bg.source_url, "query": thumb_bg.query})
    thumb = make_thumbnail(thumb_bg.path, seo_data.get("thumbnail_text") or title, d / "thumbnail.jpg")

    # auditoria final de qualidade
    final_issues, final_warn = [], []
    exp_w, exp_h = editor.RES[v.format]
    if render_scale == 1.0 and (info["width"], info["height"]) != (exp_w, exp_h):
        final_issues.append(f"resolução {info['width']}x{info['height']} diferente de {exp_w}x{exp_h}")
    if v.format == "short" and info["duration"] > 180:
        final_issues.append("Short acima de 3 minutos")
    elif v.format == "short" and info["duration"] > 60:
        final_warn.append("Short acima de 60s")
    if not tts.has_voice:
        final_issues.append("áudio sem narração (TTS demo) — não publicável")
    if v.is_demo:
        final_issues.append("vídeo de demonstração — não publicável")
    if clickbait_issues(title):
        final_issues.append("título sensacionalista")
    if any(a["provider"] not in ("demo", "pexels") for a in assets):
        final_issues.append("visual com licença não reconhecida")
    report = dict(v.quality_report or {})
    report["final"] = {"passed": not final_issues, "issues": final_issues, "warnings": final_warn, "render": info}
    script_ok = report.get("script", {}).get("passed", False)
    publishable = script_ok and not final_issues and not v.requires_human_review

    providers = {**(v.providers or {}), "tts": tts.provider, "visuals": ad.visuals.name, "seo": seo.provider}
    needs_human = cfg.mode == "review" or not publishable or not cfg.auto_publish_authorized
    status = "awaiting_approval" if needs_human else "approved"
    _set(video_id, audio_path=str(tts.audio_path), subtitles_path=str(srt), video_path=str(out),
         thumbnail_path=str(thumb), duration_sec=info["duration"], assets=assets, seo=seo_data, title=title,
         quality_report=report, providers=providers, status=status)
    log("production", f"produção concluída → {status}", video_id=video_id)
    if status == "approved":
        enqueue("publish", {"video_id": video_id}, dedupe_key=f"publish:{video_id}")
    return status


def approve_video(video_id: int, reviewer: str, enqueue) -> None:
    v = _video(video_id)
    if v.status != "awaiting_approval":
        raise AdapterError(f"vídeo está em '{v.status}', não aguardando aprovação", retryable=False)
    _set(video_id, status="approved", approved_by=reviewer)
    log("review", f"vídeo aprovado para publicação por {reviewer}", video_id=video_id)
    enqueue("publish", {"video_id": video_id}, dedupe_key=f"publish:{video_id}")


def reject(video_id: int, reviewer: str, reason: str) -> None:
    _set(video_id, status="rejected", error=f"rejeitado por {reviewer}: {reason}")
    log("review", f"vídeo rejeitado por {reviewer}: {reason}", video_id=video_id)


# ---------------------------------------------------------------- módulo 7: publicação
def next_publish_slot(cfg: ChannelConfig, now: datetime | None = None) -> datetime:
    """Próximo horário de postagem (UTC naive), pelo menos 1h no futuro, sem colidir com outro agendado."""
    tz = ZoneInfo(cfg.timezone)
    now_local = (now or datetime.now(timezone.utc)).astimezone(tz)
    hh, mm = map(int, cfg.post_time.split(":"))
    with session_scope() as s:
        taken = {p.replace(second=0, microsecond=0) for p in s.scalars(
            select(Video.publish_at).where(Video.publish_at.is_not(None), Video.status == "scheduled"))}
    day = now_local.date()
    for offset in range(0, 60):
        d = day + timedelta(days=offset)
        for extra in range(0, 3):  # até 3 vídeos/dia, espaçados em 3h
            local = datetime(d.year, d.month, d.day, hh, mm, tzinfo=tz) + timedelta(hours=3 * extra)
            utc = local.astimezone(timezone.utc).replace(tzinfo=None)
            if local - now_local < timedelta(hours=1) or utc in taken:
                continue
            return utc
    raise AdapterError("sem horário disponível nos próximos 60 dias", retryable=False)


def stage_publish(video_id: int, enqueue) -> str:
    v = _video(video_id)
    if v.youtube_video_id:
        log("publisher", f"já publicado ({v.youtube_video_id}); ignorando duplicata", video_id=video_id)
        return v.status
    if v.status not in ("approved", "publishing"):
        raise AdapterError(f"vídeo em '{v.status}' não está aprovado", retryable=False)
    cfg = get_config()
    ad = adapters_for(v)
    real = ad.publisher.name == "youtube"
    if real:
        ok, reasons = readiness.can_publish(real_upload=True, auto=not v.approved_by)
        final = (v.quality_report or {}).get("final", {})
        if not final.get("passed"):
            reasons.append("auditoria final do vídeo reprovada: " + "; ".join(final.get("issues", [])))
        if v.is_demo:
            reasons.append("vídeos de demonstração nunca são publicados")
        if reasons:
            _set(video_id, status="awaiting_approval", error="Publicação bloqueada: " + " | ".join(reasons))
            alert(f"Publicação do vídeo {video_id} bloqueada: {'; '.join(reasons)}")
            return "blocked"
    _set(video_id, status="publishing")
    publish_at = next_publish_slot(cfg) if cfg.default_privacy == "public" else None
    meta = {"internal_id": video_id, "title": v.title, "description": (v.seo or {}).get("final_description", ""),
            "tags": (v.seo or {}).get("tags", []), "language": cfg.language, "made_for_kids": cfg.made_for_kids,
            "contains_synthetic_media": cfg.declare_synthetic_media}
    res = ad.publisher.publish(Path(v.video_path), Path(v.thumbnail_path) if v.thumbnail_path else None, meta,
                               cfg.default_privacy, publish_at,
                               Path(v.subtitles_path) if v.subtitles_path else None)
    if res.published:
        status = "scheduled" if publish_at else "published"
        _set(video_id, status=status, youtube_video_id=res.video_id, publish_at=publish_at, privacy=res.privacy,
             publish_result={"url": res.url, **res.detail})
        log("publisher", f"enviado ao YouTube: {res.url} ({status})", video_id=video_id)
    else:
        status = "exported"
        _set(video_id, status=status, publish_at=publish_at, publish_result=res.detail)
        log("publisher", f"dry-run: pacote exportado em {res.detail.get('outbox')} (nada foi publicado)",
            video_id=video_id)
    return status


# ---------------------------------------------------------------- vídeo de demonstração
def create_demo_video(fmt: str = "short") -> int:
    """Cria uma ideia a partir do conjunto demo e um vídeo marcado como demonstração."""
    from .adapters.trends import DemoTrends
    from .services.safety import fingerprint

    items = DemoTrends().fetch([], "pt-BR", "BR")
    with session_scope() as s:
        used = set(s.scalars(select(Idea.topic).join(Video, Video.idea_id == Idea.id).where(Video.is_demo.is_(True))))
        item = next((i for i in items if i.topic not in used), items[date.today().toordinal() % len(items)])
        idea = Idea(topic=item.topic, title=item.topic, angle="Explicação curta com fontes (demonstração)",
                    fingerprint="demo " + fingerprint(item.topic), score=0, status="selected",
                    references=[r.__dict__ for r in item.references], scheduled_for=date.today().isoformat())
        s.add(idea)
        s.flush()
        iid = idea.id
    vid = create_video(iid, fmt, is_demo=True)
    log("pipeline", f"vídeo de demonstração criado ({fmt})", video_id=vid)
    return vid


def run_demo_inline(fmt: str = "short", render_scale: float = 1.0) -> int:
    """Executa o fluxo demo completo de forma síncrona (usado por testes/CLI)."""
    vid = create_demo_video(fmt)
    noop = lambda *a, **k: None  # noqa: E731
    stage_script(vid, noop)
    v = _video(vid)
    if v.status == "script_review":
        approve_script(vid, "demo-cli", noop)
    stage_produce(vid, noop, render_scale=render_scale)
    return vid


def dumps(o) -> str:
    return json.dumps(o, ensure_ascii=False, default=str)
