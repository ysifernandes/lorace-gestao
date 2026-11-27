# Testes

| Camada | Comando | Resultado atual |
|---|---|---|
| Unidade/integração (pedagogia, conteúdo, motor da jornada, catálogo, gamificação, parental, segurança, store web) | `pnpm test` | **75 testes OK** (9 arquivos) |
| Protocolo PoC (HTTP real, agente simulado; inclui lockout, revogação, diário, tempo extra) + vetores de assinatura | idem (`tests/poc`) | 13 OK |
| Typecheck estrito | `pnpm typecheck` | OK |
| Banco: migrations + RLS + triggers (`rls.sql` 45) · revisão de segurança (`security.sql` 35) · seed (`seed.sql`) | `pnpm test:db` | OK (Postgres 16) |
| **E2E em navegador real** (Playwright/Chromium): diagnóstico adaptativo, explicação, prática, reavaliação, evolução, 4 faixas etárias, consentimento, mapa do professor, gestora, admin (quatro olhos), permissões de rota, estados do controle parental simulado | `pnpm web:build && (cd apps/web && npx vite preview --port 4173 &) && pnpm e2e` | OK (20 verificações) |
| Android/iOS nativo | — | **não executados** (sem SDK/Xcode/dispositivos) |
| E2E apps/web, acessibilidade, carga, pentest, usabilidade com famílias/professores | — | **pendentes** |
Princípio: testes de segurança (isolamento, forja, replay, escalada) fazem parte da suíte padrão. Falhas reais encontradas pelos testes ficam registradas no CHANGELOG.
