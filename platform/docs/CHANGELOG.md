# Changelog

## 0.1.0 — Fase 1 + PoC (em andamento)
- Monorepo, tsconfig estrito, vitest.
- Pacotes: types, security, pedagogy, gamification, parental-control (44 testes).
- services/backend: PoC de protocolo de comandos (8 testes E2E HTTP com agente simulado).
- database: migrations 0001–0005 (RLS, triggers, carteira, KB) — 45 verificações.
- native/: módulos Kotlin/Swift **não compilados**.
- docs/: 20 documentos de memória do projeto.
- Corrigido durante testes: (1) escalada de papel por UPDATE de tabela inteira em `profiles`; (2) append-only da carteira bloqueava exclusão LGPD em cascata; (3) hipótese de erro descartada cedo demais no teste (regra de apoio inicial documentada).

## 0.2.0 — Fase 2 do desenvolvimento
- **Reorganização**: tudo em `platform/` (independente da Loracê); escopo `@edu/*`; marca em `packages/brand`.
- **Conteúdo e motor**: `content-math` (25 habilidades, 129 itens, 35 equívocos, explicações), `learning` (correção por tipo, hipóteses, diagnóstico regressivo, relatório, plano, reavaliação, catálogo editorial com quatro olhos).
- **Banco**: migration 0006 (tipos de atividade, equívocos, auditoria editorial, pedidos de tempo, TTL de comando, credenciais/pareamento, limites comerciais), seed gerado do pacote.
- **Backend PoC**: lockout de pareamento, hash de tokens, revogação, diário de comandos, tempo extra; vetores de assinatura compartilhados.
- **Web**: design system, 5 áreas, 9 tipos de atividade, simulador de dispositivo rotulado, E2E Playwright (20 verificações).
- **Achados corrigidos pelos testes/revisão**: (1) `create_family` executável por PUBLIC; (2) superadmin podia ler dados de crianças via RLS; (3) tema escuro com texto ilegível (E2E visual); (4) plano de estudo incluía "em desenvolvimento" promissor no foco; (5) validação de conteúdo exigiu explicação para o equívoco `off_by_one`.
