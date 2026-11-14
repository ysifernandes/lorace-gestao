"""Módulo 5 — Edição com FFmpeg.

Monta cada cena a partir de uma imagem com movimento suave (Ken Burns),
concatena, adiciona a narração e queima legendas sincronizadas (ASS).
Saídas: Shorts 1080x1920 ou horizontal 1920x1080 (H.264 + AAC, yuv420p).
"""
from __future__ import annotations

import subprocess
from pathlib import Path

from ..adapters.base import AdapterError
from ..config import get_settings

RES = {"short": (1080, 1920), "long": (1920, 1080)}
FPS = 30


def _run(cmd: list[str]) -> None:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise AdapterError(f"FFmpeg falhou: {p.stderr[-800:]}", retryable=False)


def _ts(t: float) -> str:
    h, rem = divmod(max(0.0, t), 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def _srt_ts(t: float) -> str:
    ms = int(round(max(0.0, t) * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def caption_chunks(words: list[dict], max_words: int) -> list[dict]:
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) >= max_words or w["word"][-1:] in ".!?,;:":
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return [{"text": " ".join(x["word"] for x in c), "start": c[0]["start"], "end": c[-1]["end"]} for c in chunks]


def write_subtitles(words: list[dict], fmt: str, ass_path: Path, srt_path: Path) -> None:
    w, h = RES[fmt]
    max_words = 4 if fmt == "short" else 8
    chunks = caption_chunks(words, max_words)
    font_size = 78 if fmt == "short" else 58
    margin_v = int(h * (0.22 if fmt == "short" else 0.08))
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {w}
PlayResY: {h}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,{font_size},&H00FFFFFF,&H00FFFFFF,&H00A3400F,&H64000000,1,0,0,0,100,100,0,0,1,5,2,2,60,60,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    srt = []
    for i, c in enumerate(chunks, 1):
        end = max(c["end"], c["start"] + 0.3)
        text = c["text"].replace("{", "(").replace("}", ")")
        lines.append(f"Dialogue: 0,{_ts(c['start'])},{_ts(end)},Default,,0,0,0,,{text}")
        srt.append(f"{i}\n{_srt_ts(c['start'])} --> {_srt_ts(end)}\n{c['text']}\n")
    ass_path.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    srt_path.write_text("\n".join(srt), encoding="utf-8")


def render(fmt: str, scenes: list[dict], audio_path: Path, ass_path: Path, out_path: Path,
           total_duration: float, scale: float = 1.0) -> Path:
    """scenes: [{"image": Path, "start": float, "end": float}] cobrindo 0..total_duration."""
    s = get_settings()
    w, h = RES[fmt]
    w, h = int(w * scale) // 2 * 2, int(h * scale) // 2 * 2
    work = out_path.parent / "clips"
    work.mkdir(exist_ok=True)
    clip_paths = []
    for i, sc in enumerate(scenes):
        dur = max(0.5, sc["end"] - sc["start"])
        frames = int(dur * FPS)
        clip = work / f"clip_{i:03d}.mp4"
        zoom_in = i % 2 == 0
        z = "min(zoom+0.0007,1.12)" if zoom_in else "if(eq(on,0),1.12,max(zoom-0.0007,1.0))"
        vf = (f"scale={w * 2}:{h * 2}:force_original_aspect_ratio=increase,crop={w * 2}:{h * 2},"
              f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={FPS},"
              f"format=yuv420p")
        _run([s.ffmpeg_bin, "-y", "-loglevel", "error", "-loop", "1", "-i", str(sc["image"]), "-vf", vf,
              "-frames:v", str(frames), "-c:v", "libx264", "-preset", s.render_preset, "-crf", "21", str(clip)])
        clip_paths.append(clip)

    concat_list = work / "concat.txt"
    concat_list.write_text("".join(f"file '{p.name}'\n" for p in clip_paths))
    silent = work / "silent.mp4"
    _run([s.ffmpeg_bin, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat_list),
          "-c", "copy", str(silent)])

    ass_escaped = str(ass_path).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    _run([s.ffmpeg_bin, "-y", "-loglevel", "error", "-i", str(silent), "-i", str(audio_path),
          "-vf", f"ass='{ass_escaped}'", "-map", "0:v", "-map", "1:a", "-c:v", "libx264",
          "-preset", s.render_preset, "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
          "-t", f"{total_duration:.2f}", "-movflags", "+faststart", str(out_path)])
    return out_path


def probe(path: Path) -> dict:
    s = get_settings()
    out = subprocess.run([s.ffprobe_bin, "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height:format=duration", "-of", "default=nw=1", str(path)],
                         capture_output=True, text=True, check=True).stdout
    info = dict(line.split("=", 1) for line in out.strip().splitlines() if "=" in line)
    return {"width": int(info["width"]), "height": int(info["height"]), "duration": float(info["duration"])}
