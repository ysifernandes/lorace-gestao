"""YOUTUBE AI AUTOPILOT — API FastAPI.

Execução: uvicorn app.main:app --reload  (a partir de backend/)
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import public, router
from .config import PROJECT_ROOT, get_settings
from .db import init_engine
from .pipeline import get_config

FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_engine()
    get_config()  # garante a linha de configuração padrão
    s = get_settings()
    if s.embedded_worker:
        from .worker import worker

        worker.start()
    yield
    if s.embedded_worker:
        from .worker import worker

        worker.stop()


app = FastAPI(title="YouTube AI Autopilot", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in get_settings().cors_origins.split(",")],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(public)
app.include_router(router)

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            from fastapi import HTTPException

            raise HTTPException(404)
        return FileResponse(FRONTEND_DIST / "index.html")
