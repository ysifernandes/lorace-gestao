"""Adaptadores de visuais — sempre com licença registrada por ativo."""
from __future__ import annotations

import hashlib
import random
from pathlib import Path

import httpx
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from ..config import get_settings
from .base import AdapterError, AdapterStatus, NotConfiguredError, NotImplementedIntegration, VisualAsset

PALETTE = [(226, 232, 240), (186, 230, 253), (147, 197, 253), (96, 165, 250), (165, 243, 252), (241, 245, 249)]


def _font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(get_settings().font_path, size)
    except OSError:
        return ImageFont.load_default()


class DemoVisuals:
    """Gera imagens abstratas originais localmente (sem direitos de terceiros)."""

    name = "demo"

    def status(self) -> AdapterStatus:
        return AdapterStatus("visuals", self.name, "demo", "Arte abstrata gerada localmente (licença própria)")

    def health_check(self) -> tuple[bool, str]:
        return True, "demo local"

    def get_visual(self, query: str, caption: str, orientation: str, out_path: Path) -> VisualAsset:
        out_path = out_path.with_suffix(".png")
        w, h = (1080, 1920) if orientation == "portrait" else (1920, 1080)
        rnd = random.Random(int(hashlib.md5(query.encode()).hexdigest()[:8], 16))
        img = Image.new("RGB", (w, h), (245, 247, 250))
        d = ImageDraw.Draw(img)
        for _ in range(9):
            r = rnd.randint(min(w, h) // 6, min(w, h) // 2)
            x, y = rnd.randint(-r, w), rnd.randint(-r, h)
            c = rnd.choice(PALETTE)
            d.ellipse([x, y, x + 2 * r, y + 2 * r], fill=c)
        img = img.filter(ImageFilter.GaussianBlur(60))
        d = ImageDraw.Draw(img)
        step = 60
        for gx in range(0, w, step):
            d.line([(gx, 0), (gx, h)], fill=(255, 255, 255), width=1)
        for gy in range(0, h, step):
            d.line([(0, gy), (w, gy)], fill=(255, 255, 255), width=1)
        if caption:
            f = _font(int(w * 0.07))
            tw = d.textlength(caption, font=f)
            d.text(((w - tw) / 2, h * 0.30), caption, font=f, fill=(30, 64, 175))
        img.save(out_path, "PNG")
        return VisualAsset(out_path, "demo", "Original — gerado pelo próprio sistema", "Arte gerada localmente",
                           None, query)


class PexelsVisuals:
    """Fotos da Pexels (Pexels License: uso gratuito, atribuição recomendada)."""

    name = "pexels"

    def __init__(self):
        self.s = get_settings()

    def status(self) -> AdapterStatus:
        if not self.s.pexels_api_key:
            return AdapterStatus("visuals", self.name, "not_configured", "Defina PEXELS_API_KEY")
        return AdapterStatus("visuals", self.name, "configured", "Pexels API")

    def _headers(self):
        if not self.s.pexels_api_key:
            raise NotConfiguredError("PEXELS_API_KEY não definida")
        return {"Authorization": self.s.pexels_api_key}

    def health_check(self) -> tuple[bool, str]:
        try:
            r = httpx.get("https://api.pexels.com/v1/search", params={"query": "sky", "per_page": 1},
                          headers=self._headers(), timeout=20)
            return r.status_code == 200, f"HTTP {r.status_code}"
        except AdapterError as e:
            return False, str(e)
        except Exception as e:
            return False, f"falha: {e}"

    def get_visual(self, query: str, caption: str, orientation: str, out_path: Path) -> VisualAsset:
        r = httpx.get("https://api.pexels.com/v1/search", headers=self._headers(), timeout=30,
                      params={"query": query, "per_page": 5, "orientation": orientation})
        if r.status_code != 200:
            raise AdapterError(f"Pexels HTTP {r.status_code}", retryable=r.status_code >= 429)
        photos = r.json().get("photos", [])
        if not photos:
            raise AdapterError(f"Pexels: nenhuma imagem para '{query}'", retryable=False)
        p = photos[0]
        img = httpx.get(p["src"]["large2x"], timeout=60, follow_redirects=True)
        img.raise_for_status()
        out_path.write_bytes(img.content)
        return VisualAsset(out_path, "pexels", "Pexels License (https://www.pexels.com/license/)",
                           f"Foto de {p.get('photographer')} na Pexels", p.get("url"), query)


class FallbackVisuals:
    """Tenta o provedor principal e, se não houver resultado, usa arte original."""

    def __init__(self, primary, fallback):
        self.primary, self.fallback = primary, fallback
        self.name = primary.name

    def status(self):
        return self.primary.status()

    def health_check(self):
        return self.primary.health_check()

    def get_visual(self, query, caption, orientation, out_path):
        try:
            return self.primary.get_visual(query, caption, orientation, out_path)
        except AdapterError as e:
            if not e.retryable:
                return self.fallback.get_visual(query, caption, orientation, out_path.with_suffix(".png"))
            raise


class VideoGenerationAdapter:
    """Ponto de extensão para APIs de geração de vídeo por IA.

    Ainda NÃO implementado: nenhuma API específica foi integrada. Implemente
    `generate_clip(prompt, seconds, orientation, out_path)` para o provedor
    escolhido e registre a licença de uso dos clipes gerados.
    """

    name = "none"

    def status(self) -> AdapterStatus:
        return AdapterStatus("video_gen", self.name, "not_implemented",
                             "Geração de vídeo por IA não integrada; o sistema usa imagens + movimento (Ken Burns)")

    def health_check(self) -> tuple[bool, str]:
        return False, "não implementado"

    def generate_clip(self, prompt: str, seconds: float, orientation: str, out_path: Path):
        raise NotImplementedIntegration("Geração de vídeo por IA não implementada")
