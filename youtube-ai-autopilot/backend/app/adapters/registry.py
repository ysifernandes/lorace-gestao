"""Escolhe a implementação de cada adaptador conforme o .env."""
from __future__ import annotations

from ..config import get_settings
from .llm_claude import ClaudeLLM
from .llm_demo import DemoLLM
from .trends import DemoTrends, GoogleTrends
from .tts import DemoTTS, ElevenLabsTTS
from .visuals import DemoVisuals, FallbackVisuals, PexelsVisuals, VideoGenerationAdapter
from .youtube import DryRunPublisher, YouTubePublisher


class Adapters:
    def __init__(self, demo: bool = False):
        s = get_settings()
        self.demo = demo
        if demo:
            self.llm, self.trends, self.tts = DemoLLM(), DemoTrends(), DemoTTS()
            self.visuals, self.publisher = DemoVisuals(), DryRunPublisher()
        else:
            self.llm = ClaudeLLM() if s.llm_provider == "claude" else DemoLLM()
            self.trends = GoogleTrends() if s.trends_provider == "google" else DemoTrends()
            self.tts = ElevenLabsTTS() if s.tts_provider == "elevenlabs" else DemoTTS()
            self.visuals = (FallbackVisuals(PexelsVisuals(), DemoVisuals())
                            if s.visuals_provider == "pexels" else DemoVisuals())
            self.publisher = YouTubePublisher() if s.publisher == "youtube" else DryRunPublisher()
        self.video_gen = VideoGenerationAdapter()

    def all(self) -> dict:
        return {"llm": self.llm, "trends": self.trends, "tts": self.tts, "visuals": self.visuals,
                "publisher": self.publisher, "video_gen": self.video_gen}

    @property
    def is_fully_real(self) -> bool:
        return all(a.status().state in ("configured",) for k, a in self.all().items() if k != "video_gen")


def get_adapters(demo: bool = False) -> Adapters:
    return Adapters(demo=demo)
