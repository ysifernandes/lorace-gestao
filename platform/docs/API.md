# API

## PoC (`services/backend`, em memória — implementado e testado)
Auth: `Authorization: Bearer <token>` (responsável ou dispositivo). Produção: JWT do Supabase (responsável) + credencial de dispositivo emitida no pareamento.
| Método/rota | Quem | Descrição |
|---|---|---|
| POST /pairing/start | responsável | gera código de uso único (10 min) |
| POST /pairing/complete `{code, platform}` | dispositivo | retorna `deviceId, deviceToken, deviceKey` |
| POST /commands `{deviceId, type, payload}` | responsável | cria comando assinado (403 se dispositivo de outra família; 400 se payload inválido) |
| GET /commands/:id | responsável | status + histórico (404 se de outra família) |
| POST /devices/:id/heartbeat `{capabilities}` | dispositivo | `usageAccess`, `enforcement` |
| GET /devices/:id/commands | dispositivo | comandos não terminais (envelope assinado) |
| POST /devices/:id/commands/:cid/ack `{status, detail?}` | dispositivo | transição validada (409 se inválida) |
Erros: JSON `{error}`; 401/403/404/409/413/429; 500 genérico.
## Planejado
Diagnóstico (`/assessments/*`), plano (`/plans/*`), carteira (`/wallet/*` — somente leitura ao cliente), tutor (`/tutor/*`), conteúdo (`/content/*`), escola (`/school/*`), admin. Contrato OpenAPI: pendente.
