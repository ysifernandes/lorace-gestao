"""Publicação no YouTube (Data API v3 + OAuth 2.0) e modo dry-run.

IMPORTANTE (política do YouTube): vídeos enviados por projetos de API **não
auditados** ficam restritos como privados. Para publicar publicamente é
preciso passar pela auditoria de conformidade da YouTube API Services.
"""
from __future__ import annotations

import json
import os
import shutil
import threading
import time
from datetime import date, datetime, timedelta
from pathlib import Path

from ..config import get_settings
from ..models import utcnow
from .base import AdapterError, AdapterStatus, NotConfiguredError, PublishResult

SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]

# state -> code_verifier (PKCE) do fluxo OAuth em andamento
_pending_flows: dict[str, tuple[str | None, float]] = {}
_lock = threading.Lock()


def _redirect_uri() -> str:
    return get_settings().public_base_url.rstrip("/") + "/api/oauth/youtube/callback"


def oauth_start() -> str:
    from google_auth_oauthlib.flow import Flow

    s = get_settings()
    if not s.youtube_client_secrets_file.exists():
        raise NotConfiguredError(f"Arquivo OAuth não encontrado: {s.youtube_client_secrets_file}")
    flow = Flow.from_client_secrets_file(str(s.youtube_client_secrets_file), scopes=SCOPES,
                                         redirect_uri=_redirect_uri())
    url, state = flow.authorization_url(access_type="offline", prompt="consent", include_granted_scopes="true")
    with _lock:
        _pending_flows[state] = (getattr(flow, "code_verifier", None), time.time())
    return url


def oauth_callback(state: str, full_url: str) -> str:
    from google_auth_oauthlib.flow import Flow

    s = get_settings()
    with _lock:
        entry = _pending_flows.pop(state, None)
    if entry is None or time.time() - entry[1] > 900:
        raise AdapterError("Estado OAuth inválido ou expirado; recomece a autorização.", retryable=False)
    flow = Flow.from_client_secrets_file(str(s.youtube_client_secrets_file), scopes=SCOPES,
                                         redirect_uri=_redirect_uri(), state=state)
    if entry[0]:
        flow.code_verifier = entry[0]
    if full_url.startswith("http://localhost") or full_url.startswith("http://127.0.0.1"):
        os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")  # só para localhost
    flow.fetch_token(authorization_response=full_url)
    s.youtube_token_file.parent.mkdir(parents=True, exist_ok=True)
    s.youtube_token_file.write_text(flow.credentials.to_json())
    os.chmod(s.youtube_token_file, 0o600)
    return "ok"


def load_credentials():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    s = get_settings()
    if not s.youtube_token_file.exists():
        raise NotConfiguredError("YouTube não autorizado: conclua o OAuth pelo painel (Integrações).")
    creds = Credentials.from_authorized_user_file(str(s.youtube_token_file), SCOPES)
    if not creds.valid:
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            s.youtube_token_file.write_text(creds.to_json())
        else:
            raise NotConfiguredError("Token do YouTube inválido; refaça o OAuth.")
    return creds


def _client(api: str = "youtube", version: str = "v3"):
    from googleapiclient.discovery import build

    return build(api, version, credentials=load_credentials(), cache_discovery=False)


class YouTubePublisher:
    name = "youtube"

    def status(self) -> AdapterStatus:
        s = get_settings()
        if not s.youtube_client_secrets_file.exists():
            return AdapterStatus("publisher", self.name, "not_configured",
                                 f"Coloque o client_secret OAuth em {s.youtube_client_secrets_file}")
        if not s.youtube_token_file.exists():
            return AdapterStatus("publisher", self.name, "not_configured", "OAuth pendente: autorize pelo painel")
        return AdapterStatus("publisher", self.name, "configured", "token OAuth presente")

    def health_check(self) -> tuple[bool, str]:
        try:
            resp = _client().channels().list(part="snippet,status", mine=True).execute()
            items = resp.get("items", [])
            if not items:
                return False, "Conta autorizada não possui canal"
            ch = items[0]
            return True, f"Canal: {ch['snippet']['title']} ({ch['id']})"
        except AdapterError as e:
            return False, str(e)
        except Exception as e:
            return False, f"falha: {e}"

    def publish(self, video_path: Path, thumbnail_path: Path | None, metadata: dict, privacy: str,
                publish_at: datetime | None, captions_path: Path | None) -> PublishResult:
        from googleapiclient.errors import HttpError
        from googleapiclient.http import MediaFileUpload

        yt = _client()
        status = {
            "privacyStatus": "private" if publish_at else privacy,
            "selfDeclaredMadeForKids": bool(metadata.get("made_for_kids", False)),
            "containsSyntheticMedia": bool(metadata.get("contains_synthetic_media", True)),
        }
        if publish_at:
            status["publishAt"] = publish_at.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        body = {
            "snippet": {
                "title": metadata["title"][:100],
                "description": metadata["description"][:5000],
                "tags": metadata.get("tags", [])[:30],
                "categoryId": metadata.get("category_id", "27"),  # 27 = Education
                "defaultLanguage": metadata.get("language", "pt-BR"),
                "defaultAudioLanguage": metadata.get("language", "pt-BR"),
            },
            "status": status,
        }
        media = MediaFileUpload(str(video_path), mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True)
        try:
            req = yt.videos().insert(part="snippet,status", body=body, media_body=media)
            response = None
            while response is None:
                _, response = req.next_chunk()
        except HttpError as e:
            code = e.resp.status if e.resp else 0
            raise AdapterError(f"YouTube upload falhou: HTTP {code} {e}", retryable=code >= 500) from e

        vid = response["id"]
        warnings = []
        if thumbnail_path and thumbnail_path.exists():
            try:
                yt.thumbnails().set(videoId=vid, media_body=MediaFileUpload(str(thumbnail_path))).execute()
            except HttpError as e:
                warnings.append(f"thumbnail não enviada (canal precisa ser verificado?): {e}")
        if captions_path and captions_path.exists():
            try:
                yt.captions().insert(part="snippet", body={"snippet": {
                    "videoId": vid, "language": metadata.get("language", "pt-BR"), "name": "Legendas",
                    "isDraft": False}}, media_body=MediaFileUpload(str(captions_path),
                                                                   mimetype="application/octet-stream")).execute()
            except HttpError as e:
                warnings.append(f"legendas não enviadas: {e}")
        final_status = response.get("status", {})
        return PublishResult("youtube", True, vid, f"https://www.youtube.com/watch?v={vid}",
                             final_status.get("privacyStatus", status["privacyStatus"]), publish_at,
                             {"warnings": warnings, "upload_status": final_status.get("uploadStatus")})

    def search_competition(self, query: str, region: str, language: str) -> int | None:
        """Quantidade de vídeos recentes (30 dias) sobre o tema. Custa 100 unidades de cota."""
        try:
            after = (utcnow() - timedelta(days=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
            r = _client().search().list(part="id", q=query, type="video", maxResults=1, regionCode=region,
                                        relevanceLanguage=language.split("-")[0], publishedAfter=after).execute()
            return int(r.get("pageInfo", {}).get("totalResults", 0))
        except Exception:
            return None

    def fetch_stats(self, video_ids: list[str]) -> dict[str, dict]:
        if not video_ids:
            return {}
        out: dict[str, dict] = {}
        yt = _client()
        for i in range(0, len(video_ids), 50):
            chunk = video_ids[i:i + 50]
            r = yt.videos().list(part="statistics", id=",".join(chunk)).execute()
            for it in r.get("items", []):
                st = it.get("statistics", {})
                out[it["id"]] = {"views": int(st.get("viewCount", 0)), "likes": int(st.get("likeCount", 0)),
                                 "comments": int(st.get("commentCount", 0)), "ctr": None,
                                 "avg_view_percentage": None, "avg_view_duration_sec": None}
        try:  # retenção via YouTube Analytics API (pode não estar disponível para vídeos novos)
            ya = _client("youtubeAnalytics", "v2")
            r = ya.reports().query(ids="channel==MINE", startDate="2020-01-01", endDate=date.today().isoformat(),
                                   metrics="averageViewDuration,averageViewPercentage", dimensions="video",
                                   filters="video==" + ",".join(video_ids[:200])).execute()
            for row in r.get("rows", []) or []:
                if row[0] in out:
                    out[row[0]]["avg_view_duration_sec"] = float(row[1])
                    out[row[0]]["avg_view_percentage"] = float(row[2])
        except Exception:
            pass
        # CTR de impressões não é exposto pela YouTube Analytics API pública: permanece None.
        return out


class DryRunPublisher:
    """Não envia nada ao YouTube. Exporta o pacote final para data/outbox/."""

    name = "dry_run"

    def status(self) -> AdapterStatus:
        return AdapterStatus("publisher", self.name, "demo", "Exporta para data/outbox (nada é publicado)")

    def health_check(self) -> tuple[bool, str]:
        return True, "dry-run local"

    def publish(self, video_path, thumbnail_path, metadata, privacy, publish_at, captions_path) -> PublishResult:
        out = get_settings().outbox_dir / f"video_{metadata.get('internal_id', 'x')}"
        out.mkdir(parents=True, exist_ok=True)
        shutil.copy(video_path, out / "video.mp4")
        if thumbnail_path and Path(thumbnail_path).exists():
            shutil.copy(thumbnail_path, out / "thumbnail.jpg")
        if captions_path and Path(captions_path).exists():
            shutil.copy(captions_path, out / "captions.srt")
        meta = dict(metadata, privacy=privacy, publish_at=publish_at.isoformat() if publish_at else None)
        (out / "metadata.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        return PublishResult("dry_run", False, None, None, privacy, publish_at, {"outbox": str(out)})

    def fetch_stats(self, video_ids):
        return {}
