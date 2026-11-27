# CLAUDE.md — memória permanente do projeto Estuda+

Plataforma de apoio escolar adaptativo + gamificação + controle parental. Produto real e comercializável (B2C famílias, B2B escolas).
Nota: o `index.html` na raiz ("Loracê — Painel de Gestão") é de OUTRO projeto; não alterar.

## Comandos
- `pnpm install` · `pnpm test` (vitest: pedagogia, gamificação, parental, PoC protocolo) · `pnpm typecheck`
- `pnpm test:db` — aplica `database/migrations/*.sql` em Postgres 16 descartável e roda `tests/db/rls.sql` (precisa de Postgres local).

## Estrutura
`apps/*` (mobile/web — **ainda não iniciados**), `packages/*` (lógica pura, testada), `services/backend` (PoC em memória),
`database/migrations` (SQL versionado + RLS), `native/` (Kotlin/Swift **não compilados**), `docs/` (fonte de verdade).

## Regras inegociáveis
1. Não simular integração nativa como pronta. Todo status deve ser: implementado / testado / pendente / bloqueado (ver `docs/ROADMAP.md`).
2. Sem dados fictícios apresentados como reais. Fixtures de teste são rotuladas como tal; conteúdo pedagógico só com fonte + licença + revisão humana.
3. Sem segredos no código (`.env.example` apenas). `service_role` nunca em apps.
4. Segurança infantil: minimização, RLS por padrão, consentimento por finalidade, sem publicidade, sem treino de modelos com dados de crianças.
5. Nunca condicionar emergência/comunicação essencial ao desempenho escolar. Controle parental é opcional e transparente (nada de monitoramento secreto).
6. Gamificação: sem ranking público, sem recompensa aleatória, sem punição por dificuldade; XP ≠ só acerto.
7. IA sugere; professor/humano decide. IA não inventa conteúdo pedagógico sem validação.
8. Rodar testes a cada etapa; atualizar docs e CHANGELOG junto com o código.
9. Não modificar módulos consolidados sem checar dependentes (`grep` + testes).
10. Operações destrutivas só com autorização.

## Decisões vigentes
Ver `docs/ARCHITECTURE.md §Decisões` (ADR-001…). Parâmetros pedagógicos (60/25/15, limiares de domínio) são **hipóteses iniciais não calibradas**.
