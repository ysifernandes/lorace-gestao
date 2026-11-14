"""Adaptadores de narração (TTS)."""
from __future__ import annotations

import base64
import re
import subprocess
from pathlib import Path

import httpx

from ..config import get_settings
from .base import AdapterError, AdapterStatus, NotConfiguredError, TTSResult

WORDS_PER_SEC = 2.4


def probe_duration(path: Path) -> float:
    s = get_settings()
    out = subprocess.run([s.ffprobe_bin, "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", str(path)], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def estimate_word_timings(text: str, offset: float = 0.25) -> tuple[list[dict], float]:
    """Distribui as palavras proporcionalmente ao tamanho (usado só no modo demo)."""
    words = text.split()
    t = offset
    out = []
    for w in words:
        dur = max(0.18, len(re.sub(r"\W", "", w)) * 0.065) + (0.25 if w[-1:] in ".!?" else 0)
        out.append({"word": w, "start": round(t, 3), "end": round(t + dur * 0.9, 3)})
        t += dur
    return out, t + 0.6


class DemoTTS:
    """Gera uma trilha de áudio silenciosa com a duração estimada da narração.

    NÃO produz voz. Serve para testar edição, legendas e render sem custo.
    O vídeo resultante é marcado como `has_voice=False` e não pode ser publicado.
    """

    name = "demo"

    def status(self) -> AdapterStatus:
        return AdapterStatus("tts", self.name, "demo", "Áudio silencioso com tempos estimados (sem voz)")

    def health_check(self) -> tuple[bool, str]:
        return True, "demo local"

    def synthesize(self, text: str, style: str, language: str, out_path: Path) -> TTSResult:
        words, total = estimate_word_timings(text)
        s = get_settings()
        subprocess.run([s.ffmpeg_bin, "-y", "-loglevel", "error", "-f", "lavfi", "-i",
                        "anullsrc=r=44100:cl=stereo", "-t", f"{total:.2f}", "-c:a", "libmp3lame",
                        "-b:a", "128k", str(out_path)], check=True)
        return TTSResult(out_path, total, words, 0.0, "demo", has_voice=False)


class ElevenLabsTTS:
    name = "elevenlabs"
    BASE = "https://api.elevenlabs.io/v1"

    def __init__(self):
        self.s = get_settings()

    def status(self) -> AdapterStatus:
        missing = [n for n, v in (("ELEVENLABS_API_KEY", self.s.elevenlabs_api_key),
                                  ("ELEVENLABS_VOICE_ID", self.s.elevenlabs_voice_id)) if not v]
        if missing:
            return AdapterStatus("tts", self.name, "not_configured", "Defina " + ", ".join(missing))
        return AdapterStatus("tts", self.name, "configured", f"voz {self.s.elevenlabs_voice_id}")

    def _headers(self) -> dict:
        if not self.s.elevenlabs_api_key:
            raise NotConfiguredError("ELEVENLABS_API_KEY não definida")
        return {"xi-api-key": self.s.elevenlabs_api_key, "Content-Type": "application/json"}

    def health_check(self) -> tuple[bool, str]:
        try:
            r = httpx.get(f"{self.BASE}/voices/{self.s.elevenlabs_voice_id}", headers=self._headers(), timeout=20)
            if r.status_code == 200:
                return True, f"voz encontrada: {r.json().get('name')}"
            return False, f"HTTP {r.status_code}: {r.text[:200]}"
        except AdapterError as e:
            return False, str(e)
        except Exception as e:
            return False, f"falha de conexão: {e}"

    def synthesize(self, text: str, style: str, language: str, out_path: Path) -> TTSResult:
        if not self.s.elevenlabs_voice_id:
            raise NotConfiguredError("ELEVENLABS_VOICE_ID não definida")
        body = {
            "text": text,
            "model_id": self.s.elevenlabs_model_id,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.2},
        }
        try:
            r = httpx.post(f"{self.BASE}/text-to-speech/{self.s.elevenlabs_voice_id}/with-timestamps",
                           params={"output_format": "mp3_44100_128"}, headers=self._headers(),
                           json=body, timeout=180)
        except httpx.HTTPError as e:
            raise AdapterError(f"ElevenLabs: falha de conexão ({e})") from e
        if r.status_code in (401, 403):
            raise AdapterError(f"ElevenLabs: acesso negado ({r.text[:200]})", retryable=False)
        if r.status_code == 422 or r.status_code == 400:
            raise AdapterError(f"ElevenLabs: requisição inválida ({r.text[:200]})", retryable=False)
        if r.status_code != 200:
            raise AdapterError(f"ElevenLabs: HTTP {r.status_code}", retryable=r.status_code >= 429)
        data = r.json()
        out_path.write_bytes(base64.b64decode(data["audio_base64"]))
        words = chars_to_words(data.get("alignment") or data.get("normalized_alignment") or {})
        duration = probe_duration(out_path)
        cost = len(text) / 1000 * self.s.elevenlabs_price_per_1k_chars
        return TTSResult(out_path, duration, words, round(cost, 4), "elevenlabs", has_voice=True)


def chars_to_words(alignment: dict) -> list[dict]:
    chars = alignment.get("characters", [])
    starts = alignment.get("character_start_times_seconds", [])
    ends = alignment.get("character_end_times_seconds", [])
    words, cur, cs, ce = [], "", None, None
    for ch, st, en in zip(chars, starts, ends):
        if ch.isspace():
            if cur:
                words.append({"word": cur, "start": cs, "end": ce})
            cur, cs, ce = "", None, None
            continue
        if not cur:
            cs = st
        cur += ch
        ce = en
    if cur:
        words.append({"word": cur, "start": cs, "end": ce})
    return words
