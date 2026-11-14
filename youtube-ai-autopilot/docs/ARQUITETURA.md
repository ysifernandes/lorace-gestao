# Arquitetura

## Componentes
```
         ┌──────────── Painel React (frontend/) ────────────┐
         │ Dashboard · Vídeos · Pautas · Calendário · ...   │
         └───────────────▲──────────────────────────────────┘
                         │ REST /api (Bearer ADMIN_TOKEN)
┌────────────────────────┴─────────────────────────────────────────────┐
│ FastAPI (app/main.py, app/api/routes.py)                              │
│   ├─ Worker (app/worker.py): fila SQLite, retries, backoff, alertas   │
│   └─ APScheduler: execução diária + sync de analytics                 │
│ Pipeline (app/pipeline.py) ── Serviços (app/services/*)               │
│                     └── Adaptadores (app/adapters/*)                  │
│                          demo  │ Claude · Google · ElevenLabs ·       │
│                                │ Pexels · YouTube                     │
│ SQLite (data/autopilot.db) · Mídia (data/media) · Dry-run (data/outbox)│
└───────────────────────────────────────────────────────────────────────┘
```

## Jobs
| Job | Dedupe | O que faz |
|---|---|---|
| `daily_run` | `daily_run:AAAA-MM-DD` | coleta tendências → pontua pautas → cria vídeos → enfileira `script` |
| `script` | `script:{id}` | roteiro + checagem de fatos + auditoria de qualidade/sensibilidade |
| `produce` | `produce:{id}` | narração → visuais → legendas → render → SEO → thumbnail → auditoria final |
| `publish` | `publish:{id}` | portão de prontidão → upload (ou dry-run) → agendamento |
| `analytics_sync` | `analytics:AAAA-MM-DD` | métricas dos vídeos publicados |

Falhas: `AdapterError(retryable=True)` e erros inesperados são reagendados com backoff exponencial
(1, 2, 4 min…) até `MAX_JOB_ATTEMPTS`; erros não recuperáveis (chave inválida, recusa, orçamento) falham
imediatamente. Falha definitiva gera alerta (painel + webhook opcional). Jobs travados em `running` por mais de
60 min voltam para a fila ao iniciar o worker.

## Estados do vídeo
```
queued → scripting → script_review* → script_ready → producing → awaiting_approval* → approved
       → publishing → scheduled | published | exported (dry-run)
qualquer etapa → failed (pode ser reprocessado) | rejected
* portões humanos: sempre no modo revisão; no modo automático apenas se houver motivo
  (tema sensível, notícia não confirmada, checagem de fatos/qualidade reprovada).
```

## Prevenção de duplicação
- `jobs.dedupe_key` único; `videos (idea_id, format)` verificado antes de criar; `videos.youtube_video_id` único
  e checado antes do upload (um retry após upload bem-sucedido não reenvia).
- `daily_run` é idempotente por data (respeita a cota diária já atendida).
- Planejador bloqueia temas com impressão digital parecida (Jaccard ≥ 0,6) nos últimos N dias.

## Pontuação de pautas
`score = 0,25·popularidade + 0,15·(100 − concorrência) + 0,20·relevância + 1,5·originalidade + evergreen
+ interesse + desempenho_passado (até +10) − 5 se sensível`. Concorrência sem medição usa 50 (neutro) e é
exibida como “não medida”.

## Como adicionar um provedor
Implemente a interface correspondente em `app/adapters/base.py` (`status`, `health_check` e o método
principal), registre em `app/adapters/registry.py` e adicione a opção no `.env`. O `status()` deve ser honesto:
`not_configured` sem segredos, `configured` com segredos, e o health-check precisa fazer uma chamada real.
