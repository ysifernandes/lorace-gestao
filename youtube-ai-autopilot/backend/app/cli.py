"""CLI utilitária.

  python -m app.cli demo --format short     # gera vídeo de demonstração completo
  python -m app.cli run-daily                # executa o pipeline diário agora (sincrono)
  python -m app.cli check                    # health-check de todas as integrações
"""
from __future__ import annotations

import argparse
from datetime import date

from .db import init_engine


def main() -> None:
    p = argparse.ArgumentParser(prog="autopilot")
    sub = p.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("demo")
    d.add_argument("--format", choices=["short", "long"], default="short")
    sub.add_parser("run-daily")
    sub.add_parser("check")
    a = p.parse_args()
    init_engine()
    from . import pipeline, worker

    pipeline.get_config()
    if a.cmd == "demo":
        vid = pipeline.run_demo_inline(a.format)
        v = pipeline._video(vid)
        print(f"Vídeo demo #{vid}: {v.status}\n  vídeo: {v.video_path}\n  thumbnail: {v.thumbnail_path}")
    elif a.cmd == "run-daily":
        worker.enqueue("daily_run", {"date": date.today().isoformat()}, f"daily_run:cli:{date.today()}")
        print(f"{worker.drain()} jobs processados")
    elif a.cmd == "check":
        from .adapters.registry import get_adapters
        from .services.readiness import record_check

        for name, ad in get_adapters().all().items():
            st = ad.status()
            ok, detail = ad.health_check()
            record_check(f"integration:{name}", ok and st.state == "configured", f"[{ad.name}] {detail}")
            print(f"{name:10} {ad.name:12} {st.state:16} {'OK' if ok else 'FALHA'}  {detail}")


if __name__ == "__main__":
    main()
