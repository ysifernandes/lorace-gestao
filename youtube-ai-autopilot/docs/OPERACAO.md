# Operação e go-live

## Roteiro recomendado
1. **Demo** — `make test`, `make api`, gere um vídeo demo e revise todo o fluxo no painel.
2. **Serviços reais em modo revisão** — conecte Claude, ElevenLabs, Pexels e tendências; mantenha
   `PUBLISHER=dry_run`. Rode “Executar pipeline agora”, revise roteiros e vídeos; os pacotes finais ficam em
   `data/outbox/` para conferência manual.
3. **YouTube privado** — configure o OAuth, `Privacidade = Privado`, aprove manualmente um vídeo e confira no
   YouTube Studio.
4. **Prontidão** — execute os testes pelo painel, assine a auditoria, verifique cada integração ao vivo.
5. **Scheduler** — ative “Scheduler diário” e defina horários. Continue em modo revisão por algumas semanas.
6. **Automático (opcional)** — só depois de revisar resultados reais: autorize explicitamente em Integrações
   e mude o modo. Temas sensíveis continuam exigindo aprovação. A autorização pode ser revogada a qualquer
   momento (volta ao modo revisão).

## Execução em servidor
- Defina `ADMIN_TOKEN`, `PUBLIC_BASE_URL` (HTTPS) e `CORS_ORIGINS`.
- Rode atrás de um proxy reverso com TLS (nginx/Caddy): `uvicorn app.main:app --host 127.0.0.1 --port 8000`.
- Para separar o worker: `EMBEDDED_WORKER=false` na API e `python -m app.worker` em outro serviço
  (systemd/supervisor). Rode **apenas um** worker com SQLite.
- Backup: copie `data/autopilot.db` e `secrets/` regularmente (os segredos fora do repositório).

## Limites de gasto
- `budget_per_video_usd` (painel) e `MONTHLY_BUDGET_USD` (.env). Verificados antes de cada chamada paga com
  estimativa; ao exceder, o job falha sem retry e um alerta crítico é emitido.
- Os custos são estimativas a partir de tokens (Claude) e caracteres (ElevenLabs) com os preços do `.env`;
  confira as faturas nos painéis dos provedores.

## Alertas
Falhas definitivas de job, publicação bloqueada e estouro de orçamento geram alertas no painel e, se
`ALERT_WEBHOOK_URL` estiver definido, um POST JSON `{"text": "..."}`.

## Testes
`make test` cobre: regras de segurança/qualidade, anti-repetição, fluxo demo com render real em FFmpeg,
dry-run nunca marcado como publicado, idempotência do daily run, portão humano no modo revisão, bloqueio de
publicação sem prontidão, dedupe/retry da fila, horário de publicação com fuso, adaptador Claude (parâmetros,
recusa), conversão de alinhamento da ElevenLabs, orçamento, autenticação da API e não exposição de segredos.
