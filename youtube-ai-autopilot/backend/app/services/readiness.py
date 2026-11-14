"""Portão de prontidão: nada é publicado de verdade até OAuth, APIs, auditorias e testes passarem."""
from __future__ import annotations

import subprocess
import sys
from datetime import timedelta

from sqlalchemy import select

from ..config import PROJECT_ROOT, get_settings
from ..db import session_scope
from ..models import ChannelConfig, ReadinessCheck, Video, utcnow

CHECK_TTL = {"integration": timedelta(hours=24), "tests": timedelta(days=7), "audit": timedelta(days=90)}

AUDIT_ITEMS = [
    "Revisei pelo menos um vídeo renderizado com serviços reais (voz, roteiro, visuais) e ele atende ao padrão de qualidade.",
    "Confirmo que o projeto Google Cloud passou (ou está ciente de que precisa passar) pela auditoria da YouTube API Services; sem ela os envios ficam privados.",
    "Revisei a política editorial: sem fatos inventados, sem plágio, apenas material licenciado, aprovação humana para temas sensíveis.",
    "Configurei limites de orçamento (por vídeo e mensal) adequados.",
    "Li e aceito os Termos de Serviço da YouTube API e as políticas de conteúdo sintético/IA do YouTube.",
]


def record_check(key: str, passed: bool, detail: str) -> None:
    with session_scope() as s:
        row = s.get(ReadinessCheck, key)
        if row is None:
            row = ReadinessCheck(key=key)
            s.add(row)
        row.passed, row.detail, row.checked_at = passed, detail[:4000], utcnow()


def _fresh(row: ReadinessCheck | None, kind: str) -> bool:
    return bool(row and row.passed and utcnow() - row.checked_at <= CHECK_TTL[kind])


def run_tests() -> tuple[bool, str]:
    p = subprocess.run([sys.executable, "-m", "pytest", "-q", "-x", "-p", "no:cacheprovider"],
                       cwd=str(PROJECT_ROOT / "backend"), capture_output=True, text=True, timeout=1800)
    tail = (p.stdout + p.stderr)[-1500:]
    record_check("tests", p.returncode == 0, tail)
    return p.returncode == 0, tail


def checklist() -> list[dict]:
    from ..adapters.registry import get_adapters

    s = get_settings()
    ad = get_adapters()
    with session_scope() as db:
        rows = {r.key: r for r in db.scalars(select(ReadinessCheck))}
        cfg = db.get(ChannelConfig, 1)
        real_videos = db.scalar(select(Video.id).where(Video.is_demo.is_(False),
                                                       Video.status.in_(["awaiting_approval", "approved",
                                                                         "exported", "published", "scheduled"])))
        demo_ok = db.scalar(select(Video.id).where(Video.is_demo.is_(True), Video.video_path.is_not(None)))

    items = []

    def add(key, label, ok, detail, blocking=True):
        items.append({"key": key, "label": label, "passed": bool(ok), "detail": detail, "blocking": blocking})

    add("demo_flow", "Fluxo de demonstração renderizou um vídeo", demo_ok, "Execute 'Gerar vídeo demo' no painel")
    for name, adapter in ad.all().items():
        if name == "video_gen":
            st = adapter.status()
            add("integration:video_gen", "Geração de vídeo por IA (opcional)", False, st.detail, blocking=False)
            continue
        st = adapter.status()
        row = rows.get(f"integration:{name}")
        real = st.state == "configured"
        label = f"Integração real: {name} ({adapter.name})"
        if not real:
            add(f"integration:{name}", label, False, f"{st.state}: {st.detail}")
        else:
            add(f"integration:{name}", label, _fresh(row, "integration"),
                (row.detail if row else "ainda não verificada") + " — verifique ao vivo nas Integrações")
    add("oauth", "OAuth do YouTube concluído", s.youtube_token_file.exists(), str(s.youtube_token_file.name))
    add("real_video_reviewed", "Pelo menos um vídeo real produzido e revisado", real_videos,
        "Produza um vídeo com serviços reais em modo revisão")
    add("tests", "Testes automatizados aprovados (últimos 7 dias)", _fresh(rows.get("tests"), "tests"),
        (rows["tests"].detail[-300:] if rows.get("tests") else "nunca executados"))
    add("audit", "Auditoria humana de conformidade assinada", _fresh(rows.get("audit"), "audit"),
        rows["audit"].detail if rows.get("audit") else "pendente")
    add("auto_publish", "Publicação automática autorizada explicitamente",
        bool(cfg and cfg.auto_publish_authorized),
        "Necessário apenas para o modo automático", blocking=False)
    return items


def can_publish(real_upload: bool, auto: bool = False) -> tuple[bool, list[str]]:
    if not real_upload:
        return True, []
    reasons = [f"{i['label']}: {i['detail']}" for i in checklist() if i["blocking"] and not i["passed"]]
    if auto:
        with session_scope() as s:
            cfg = s.get(ChannelConfig, 1)
            if not (cfg and cfg.auto_publish_authorized and cfg.mode == "auto"):
                reasons.append("publicação automática não autorizada")
    return not reasons, reasons
