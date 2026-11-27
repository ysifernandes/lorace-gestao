# Arquitetura

## Visão
Monorepo (pnpm workspaces). Lógica de domínio em pacotes puros (sem I/O) → testável e reutilizável por backend, apps e portais.
```
apps/student-mobile, parent-mobile (RN+TS)   apps/school-web, admin-web (Next.js)
        │  Supabase Auth (JWT) + PostgREST/RLS (leitura)         │
        └──────────────► services/backend (escritas sensíveis, service_role, filas, IA) ◄──► Postgres
                               │ FCM / APNs (services/notifications)           ▲
                               ▼                                               │
                      dispositivo da criança: módulo nativo (Kotlin / Swift) ── ack de estado
```
Regra: **evidências, diagnósticos, carteira, dispositivos e status de comandos só são escritos pelo backend** (RLS sem INSERT para `authenticated`).

## Pacotes
| Pacote | Conteúdo | Status |
|---|---|---|
| types | enums/tipos compartilhados | ok |
| pedagogy | grafo, domínio, diagnóstico, erros, plano, revisão | ok (unit) |
| gamification | XP, níveis, carteira idempotente com hash | ok (unit) |
| parental-control | máquina de estados, avaliador de política | ok (unit) |
| security | HMAC, anti-replay, validação, rate limit | ok (unit) |
| ai-engine, ui, design-system | — | pendentes |

## Decisões (ADR)
- **ADR-001 Supabase/Postgres**: adequado (Auth, RLS, Storage, Realtime). RLS é a barreira de isolamento multi-instituição. Risco: lock-in leve → SQL puro em `database/migrations`, lógica de domínio fora do banco. **Aceito.**
- **ADR-002 React Native + módulos nativos**: UI compartilhada em RN; bloqueio exige módulo nativo (Kotlin/Swift) → **não usar Expo Go**; usar dev client/bare. **Aceito, a validar** com o PoC em dispositivo.
- **ADR-003 Comandos**: push (FCM/APNs) só *acorda* o dispositivo; o dispositivo busca o comando assinado (HMAC-SHA256, chave **por dispositivo** derivada de segredo mestre, nonce, expiração). Realtime do Supabase serve a UI do responsável, não o canal de comando (WebSocket em background é pouco confiável). **Aceito.**
- **ADR-004 Enforcement local**: o dispositivo guarda regras assinadas e decide offline (inclusive reaplicar bloqueio ao fim do tempo concedido). **Aceito.**
- **ADR-005 Backend dedicado em Node/TypeScript** (framework a definir; PoC usa `node:http`). **Aberto**.
- **ADR-006 Filas**: iniciar com `pgmq`/tabela de jobs no Postgres (menos infra); migrar p/ Redis+BullMQ se necessário. **Aberto**.
- **ADR-007 IA modular**: interface `LLMProvider` + recuperação restrita ao banco aprovado + moderação entrada/saída. **Aceito (a implementar)**.
- **ADR-008 Carteira**: livro-razão append-only, idempotência por chave, saldo ≥ 0 e hash encadeado (aplicado no banco por trigger e espelhado em TS). XP não é "gasto": só minutos são consumidos. **Implementado.**

## Riscos técnicos (priorizados)
1. **iOS**: entitlement Family Controls precisa de aprovação da Apple para distribuição; apps são tokens opacos (sem lista por nome); remoção do app pela criança. *Bloqueante potencial.*
2. **Android**: sem Device Owner não há "suspender pacote"; depende de AccessibilityService (política Play restritiva), mortes por fabricante (battery optimization), usuário pode desativar → mitigação: heartbeat + status `permission_unavailable`.
3. Qualidade pedagógica: modelo de domínio não calibrado; precisa de banco de itens revisado.
4. Conformidade LGPD/ECA Digital: parecer jurídico antes de produção.
5. Custo de IA por aluno: orçamento por usuário e cache.

## Decisões adicionais (Fase 2)
- **ADR-009 App web único (React + Vite) em vez de portais Next.js separados — por enquanto.** Objetivo: ambiente navegável para avaliação rápida, com rotas por perfil. Next.js (SSR, rotas de servidor) continua previsto para `school-web`/`admin-web` quando houver backend real; a lógica vive em `packages/*` e é reaproveitável. **Aceito, revisável.**
- **ADR-010 Armazenamento local de desenvolvimento (`apps/web/src/store/db.ts`).** O app web persiste em `localStorage` (autenticação PBKDF2, permissões, simulador de dispositivo). Não é produção: sem servidor, sem Supabase, dados só no navegador. A troca por repositório Supabase/Postgres preserva as regras (as mesmas funções de `packages/*`; o escopo de dados reproduz as políticas RLS de `0005`). **Aceito como degrau.**
- **ADR-011 Marca centralizada** em `packages/brand` (nome, logotipo SVG, cores, bundle ids, contatos); CSS e título derivam dela.
- **ADR-012 Conteúdo gerado deterministicamente** (`generators.ts`): itens de matemática com gabarito calculado por código e distratores etiquetados com o equívoco que representam → origem do erro rastreável. Revisão profissional continua obrigatória.
- **ADR-013 Diagnóstico regressivo**: testa primeiro habilidades avançadas; se dominadas, infere pré-requisitos (não testados → "evidências insuficientes"); se falham, desce pelos pré-requisitos. Reduz fadiga (16 atividades no cenário de teste vs 19×N).
