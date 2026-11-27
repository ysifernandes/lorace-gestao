# Controle parental

## Estado real
| Camada | Status |
|---|---|
| Protocolo (pareamento, comando assinado, estados, offline, expiração, autorização por família) | **Implementado + testado** (`tests/poc`, 8 testes; dispositivo = agente SIMULADO) |
| Política (essenciais, concessões, janelas noturnas) | **Implementado + testado** (`packages/parental-control`) |
| Banco (comandos, transições por trigger, eventos, RLS) | **Implementado + testado** (`tests/db`) |
| Android nativo (Kotlin) | **Escrito, NÃO compilado/testado** (`native/android`); persistência de regras, UI e FCM pendentes |
| iOS nativo (Swift) | **Escrito, NÃO compilado/testado** (`native/ios`); extensões de Shield pendentes |
| Push FCM/APNs | **Bloqueado** (credenciais) |

## Estados de comando
`pending → received → block_applied | unblock_applied | permission_unavailable | sync_failed`; `device_offline` quando não há heartbeat (>90 s); `expired` após TTL (24 h). Transições validadas no TS e por trigger no Postgres; estados terminais imutáveis. O dispositivo **nunca** confirma sucesso sem aplicar (sem permissão → `permission_unavailable`).

## Segurança do canal
Envelope `{id, deviceId, nonce, issuedAt, expiresAt, type, payload}` + HMAC-SHA256 com **chave por dispositivo** (derivada de segredo mestre; vazar um aparelho não permite forjar outro). Verificação em tempo constante, anti-replay (nonce), janela de validade, `deviceId` amarrado. Pareamento por código de uso único (10 min). Rate limit e limite de corpo no backend. Limitação do PoC: nonces do agente simulado ficam em memória; nativo deve persistir.

## Android — o que é possível
- `UsageStatsManager` + acesso especial "Acesso a uso" (concedido pelo usuário): ler tempo de uso (não bloqueia).
- **Bloqueio**: sem Device Owner, o app comum usa `AccessibilityService` (detecta app em primeiro plano) + tela de bloqueio. **Política Google Play**: uso de Accessibility exige declaração/formulário e divulgação proeminente; controle parental é caso defensável, mas sujeito à revisão. Declarar mínimo (`canRetrieveWindowContent=false`).
- `DevicePolicyManager.setPackagesSuspended` e bloqueio de desinstalação exigem Device/Profile Owner (não disponível a app comum). **Não presumir paridade com Family Link** (privilégio de sistema).
- Fabricantes (Xiaomi, Samsung, Huawei…) matam serviços em background → orientar o usuário (whitelist de bateria) e detectar via heartbeat.
- Listar apps: `<queries>` do launcher; `QUERY_ALL_PACKAGES` exige justificativa no Play.
- Criança pode desativar o serviço/desinstalar → app responsável é avisado (heartbeat ausente/`enforcement=false`); impedir desinstalação não é possível sem DO.
## iOS — o que é possível
- Frameworks FamilyControls/ManagedSettings/DeviceActivity (iOS 16+). `requestAuthorization(for: .child)` exige criança em Compartilhamento Familiar e aprovação do responsável.
- **Entitlement `com.apple.developer.family-controls`**: precisa ser solicitado à Apple para distribuição; sem aprovação, só dev. **Bloqueante potencial.**
- Apps são **tokens opacos** via `FamilyActivityPicker` (sem nome/bundle id para o app) → "listar apps" tem forma diferente do Android; seleção do responsável e sincronização de tokens entre dispositivos **a validar** (tokens podem ser específicos do dispositivo/ID de app).
- Reaplicar bloqueio ao fim de concessão: `DeviceActivityMonitor` (extensão); granularidade mínima do intervalo precisa ser validada.
- Kids Category/Guideline 1.3 e privacidade: sem analytics/anúncios de terceiros em áreas de criança; portão parental.

## Regras éticas
Opcional, transparente (a criança vê o que está ativo), sem leitura de mensagens/chamadas, **telefone/emergência/SMS sempre em `essentialApps`** e nunca condicionados ao desempenho escolar. Escolas **não** controlam dispositivos pessoais.

## Checklist de validação em dispositivo (pendente — exige aparelhos)
1 pareamento 2 dispositivos · 2 bloquear app → tela de bloqueio + ack · 3 conceder 5 min → reaplicar sozinho (app fechado) · 4 modo avião (offline) → reaplica localmente · 5 revogar permissão → `permission_unavailable` no painel · 6 reiniciar aparelho → regras persistem · 7 economia de bateria agressiva por fabricante · 8 emergência/discagem nunca bloqueadas · 9 iOS: autorização .child, picker, shield, monitor.

## Atualização — Fase 2
- Backend (PoC testado): pareamento com bloqueio por tentativas e código de uso único; token de dispositivo só em hash; **revogação** (expira pendentes, 401 no aparelho, comandos novos recusados); **diário de comandos** com histórico; **solicitações de tempo extra** (aluno pede → responsável decide uma vez → vira comando `grant_time` assinado).
- UI do responsável (`apps/web`, aba "Aparelhos e apps"): vincular, bloquear/desbloquear/+15 min por app, estados reais, diário. **O aparelho é SIMULADO** (faixa laranja na tela) e reutiliza `transition/evaluate` reais; o navegador não assina comandos (assinatura validada em `tests/poc`).
- Nativo (escrito, **não compilado**): Android `PolicyStore` (EncryptedSharedPreferences), `SyncWorker` (WorkManager + backoff; ack `received`/`sync_failed`/`permission_unavailable`/aplicado), `CommandMessagingService` (FCM só acorda), `CanonicalJson`, `VectorsTest` (valida contra `tests/vectors/command-signing.json`); iOS `CommandVerifier`/`CommandSync` (CryptoKit + BGAppRefresh). Passo a passo de compilação: `docs/BUILD_DEVICE_TESTING.md`.
- Pendentes: tela de bloqueio Android, extensões ShieldAction/Configuration (iOS), rota de push-token, janelas/modos na UI, validação em aparelhos.
