# Changelog

## 0.1.0 — Fase 1 + PoC (em andamento)
- Monorepo, tsconfig estrito, vitest.
- Pacotes: types, security, pedagogy, gamification, parental-control (44 testes).
- services/backend: PoC de protocolo de comandos (8 testes E2E HTTP com agente simulado).
- database: migrations 0001–0005 (RLS, triggers, carteira, KB) — 45 verificações.
- native/: módulos Kotlin/Swift **não compilados**.
- docs/: 20 documentos de memória do projeto.
- Corrigido durante testes: (1) escalada de papel por UPDATE de tabela inteira em `profiles`; (2) append-only da carteira bloqueava exclusão LGPD em cascata; (3) hipótese de erro descartada cedo demais no teste (regra de apoio inicial documentada).
