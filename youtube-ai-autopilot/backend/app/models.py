from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ChannelConfig(Base):
    """Preferências editoriais editáveis pelo painel (linha única, id=1)."""

    __tablename__ = "channel_config"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    channel_name: Mapped[str] = mapped_column(String(120), default="Meu Canal")
    niche: Mapped[str] = mapped_column(String(200), default="ciência e curiosidades")
    niche_keywords: Mapped[list] = mapped_column(JSON, default=lambda: ["ciência", "curiosidades", "espaço"])
    language: Mapped[str] = mapped_column(String(10), default="pt-BR")
    region: Mapped[str] = mapped_column(String(5), default="BR")
    daily_videos: Mapped[int] = mapped_column(Integer, default=1)
    short_duration_sec: Mapped[int] = mapped_column(Integer, default=45)
    long_duration_sec: Mapped[int] = mapped_column(Integer, default=360)
    video_format: Mapped[str] = mapped_column(String(10), default="short")  # short | long | both
    narration_style: Mapped[str] = mapped_column(String(200), default="didático, curioso e calmo")
    budget_per_video_usd: Mapped[float] = mapped_column(Float, default=2.0)
    timezone: Mapped[str] = mapped_column(String(64), default="America/Sao_Paulo")
    pipeline_run_time: Mapped[str] = mapped_column(String(5), default="06:00")  # HH:MM
    post_time: Mapped[str] = mapped_column(String(5), default="18:00")  # HH:MM
    scheduler_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mode: Mapped[str] = mapped_column(String(10), default="review")  # review | auto
    default_privacy: Mapped[str] = mapped_column(String(10), default="private")
    auto_publish_authorized: Mapped[bool] = mapped_column(Boolean, default=False)
    auto_publish_authorized_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    auto_publish_authorized_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    declare_synthetic_media: Mapped[bool] = mapped_column(Boolean, default=True)
    made_for_kids: Mapped[bool] = mapped_column(Boolean, default=False)
    min_days_between_similar: Mapped[int] = mapped_column(Integer, default=30)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class Trend(Base):
    __tablename__ = "trends"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic: Mapped[str] = mapped_column(String(300))
    source: Mapped[str] = mapped_column(String(60))
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    popularity: Mapped[float] = mapped_column(Float, default=0)  # 0..100
    competition: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0..100 (maior = mais concorrido)
    competition_method: Mapped[str] = mapped_column(String(40), default="unknown")
    relevance: Mapped[float] = mapped_column(Float, default=0)  # 0..100
    source_count: Mapped[int] = mapped_column(Integer, default=1)
    is_news: Mapped[bool] = mapped_column(Boolean, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    references: Mapped[list] = mapped_column(JSON, default=list)  # [{title,url,excerpt}]
    collected_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    run_date: Mapped[str] = mapped_column(String(10), index=True)


class Idea(Base):
    __tablename__ = "ideas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trend_id: Mapped[int | None] = mapped_column(ForeignKey("trends.id"), nullable=True)
    topic: Mapped[str] = mapped_column(String(300))
    title: Mapped[str] = mapped_column(String(300))
    angle: Mapped[str] = mapped_column(Text, default="")
    fingerprint: Mapped[str] = mapped_column(String(300), index=True)
    score: Mapped[float] = mapped_column(Float, default=0)
    score_breakdown: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="proposed")  # proposed|selected|rejected|used
    sensitive: Mapped[bool] = mapped_column(Boolean, default=False)
    sensitive_reasons: Mapped[list] = mapped_column(JSON, default=list)
    references: Mapped[list] = mapped_column(JSON, default=list)
    scheduled_for: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Video(Base):
    __tablename__ = "videos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    idea_id: Mapped[int | None] = mapped_column(ForeignKey("ideas.id"), nullable=True)
    format: Mapped[str] = mapped_column(String(10))  # short | long
    status: Mapped[str] = mapped_column(String(30), default="queued", index=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    title: Mapped[str] = mapped_column(String(300), default="")
    script: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    seo: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    assets: Mapped[list] = mapped_column(JSON, default=list)  # visuais + licenças
    quality_report: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    requires_human_review: Mapped[bool] = mapped_column(Boolean, default=False)
    review_reasons: Mapped[list] = mapped_column(JSON, default=list)
    audio_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    subtitles_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    cost_usd: Mapped[float] = mapped_column(Float, default=0)
    providers: Mapped[dict] = mapped_column(JSON, default=dict)  # qual adaptador gerou cada etapa
    privacy: Mapped[str] = mapped_column(String(10), default="private")
    publish_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)  # UTC
    youtube_video_id: Mapped[str | None] = mapped_column(String(40), nullable=True, unique=True)
    publish_result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(120), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class Job(Base):
    __tablename__ = "jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[str] = mapped_column(String(40), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)  # pending|running|done|failed|cancelled
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=3)
    run_after: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    dedupe_key: Mapped[str | None] = mapped_column(String(200), unique=True, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class LogEntry(Base):
    __tablename__ = "logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    level: Mapped[str] = mapped_column(String(10), default="INFO")
    module: Mapped[str] = mapped_column(String(40))
    message: Mapped[str] = mapped_column(Text)
    video_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    job_id: Mapped[int | None] = mapped_column(Integer, nullable=True)


class CostEntry(Base):
    __tablename__ = "costs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    video_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider: Mapped[str] = mapped_column(String(40))
    amount_usd: Mapped[float] = mapped_column(Float)
    description: Mapped[str] = mapped_column(Text, default="")


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    level: Mapped[str] = mapped_column(String(10), default="warning")
    message: Mapped[str] = mapped_column(Text)
    acknowledged: Mapped[bool] = mapped_column(Boolean, default=False)


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    video_id: Mapped[int] = mapped_column(ForeignKey("videos.id"))
    ts: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    views: Mapped[int | None] = mapped_column(Integer, nullable=True)
    likes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comments: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ctr: Mapped[float | None] = mapped_column(Float, nullable=True)  # nulo quando a API não fornece
    avg_view_percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    avg_view_duration_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(40), default="youtube")


class ReadinessCheck(Base):
    """Resultado persistido de verificações (health-checks, testes, auditorias)."""

    __tablename__ = "readiness_checks"
    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    detail: Mapped[str] = mapped_column(Text, default="")
    checked_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
