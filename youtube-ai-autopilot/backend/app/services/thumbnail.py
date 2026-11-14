"""Módulo 6a — Thumbnail 1280x720 (JPEG < 2 MB, exigência do YouTube)."""
from __future__ import annotations

import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

from ..config import get_settings


def make_thumbnail(background: Path, text: str, out_path: Path) -> Path:
    W, H = 1280, 720
    img = Image.open(background).convert("RGB")
    img = ImageOps.fit(img, (W, H))
    img = ImageEnhance.Brightness(img).enhance(0.85)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for x in range(W):  # degradê lateral para legibilidade
        a = int(190 * max(0.0, 1 - x / (W * 0.75)))
        d.line([(x, 0), (x, H)], fill=(10, 20, 45, a))
    img = Image.alpha_composite(img.convert("RGBA"), overlay)
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype(get_settings().font_path, 104)
    except OSError:
        font = ImageFont.load_default()
    lines = textwrap.wrap(text.upper()[:60], width=14)[:3]
    y = H / 2 - len(lines) * 60
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for ln in lines:
        gd.text((70, y), ln, font=font, fill=(56, 189, 248, 255))
        y += 120
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img, glow)
    d = ImageDraw.Draw(img)
    y = H / 2 - len(lines) * 60
    for ln in lines:
        d.text((70, y), ln, font=font, fill=(255, 255, 255, 255), stroke_width=4, stroke_fill=(15, 23, 42, 255))
        y += 120
    d.rectangle([70, H - 70, 330, H - 62], fill=(56, 189, 248, 255))
    img.convert("RGB").save(out_path, "JPEG", quality=88)
    return out_path
