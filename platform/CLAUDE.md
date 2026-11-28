# CLAUDE.md — memória permanente da Plataforma Educacional (nome provisório)

Plataforma de apoio escolar adaptativo + gamificação + controle parental. Produto real e comercializável (B2C famílias, B2B escolas).
**Este diretório (`platform/`) é independente** do projeto Loracê (`../index.html`), que deve ser preservado integralmente.
**Nome/logotipo/cores/mascote(paleta)/contatos: SOMENTE em `packages/brand/src/index.ts`**. Nome atual **Aprendix** (provisório: falta pesquisa de disponibilidade e registro). Referências visuais aprovadas: `docs/design/references/`. Mascote: axolote (`apps/web/src/ui/axolotl.tsx`); nunca demonstra decepção ao erro.

## Comandos
- `pnpm install` · `pnpm test` (vitest: 107 testes — pedagogia, conteúdo, motor da jornada, tutor, gamificação, parental/PoC, store e painel web) · `pnpm typecheck`
- `pnpm test:db` — migrations + seed + RLS/segurança em Postgres 16 descartável (precisa de Postgres local; 45+35+seed).
- `pnpm web:dev` (app web) · `pnpm web:build` · `pnpm web:preview-build` (HTML único/fragmento p/ Artifact) · `pnpm e2e` (jornada completa) · `pnpm e2e:visual` (7 resoluções, axe-core, comparação com as referências; ambos exigem `vite preview` em :4173) · `pnpm seed:gen`.

## Estrutura
`apps/web` (React+Vite: aluno, responsável, professor, gestor, admin — armazenamento LOCAL de desenvolvimento), `packages/*` (lógica pura testada: types, brand, security, pedagogy, content-math, learning, tutor, gamification, parental-control), `services/backend` (PoC de protocolo, em memória), `database/{migrations,seed}`, `native/` (Kotlin/Swift **não compilados**), `docs/` (fonte de verdade), `tests/{db,poc,vectors}`.

## Regras inegociáveis
1. Não simular integração nativa/externa como pronta. Status sempre: implementado / testado / pendente / bloqueado (`docs/ROADMAP.md`). Simulações são rotuladas na UI ("simulado").
2. Sem dados fictícios como resultados reais: contas demo não trazem desempenho; tudo vem do uso. Conteúdo pedagógico só com fonte + licença + revisão humana; **nunca inventar código BNCC** (`bnccCode: null` até conferência).
3. Sem segredos no código (`.env.example`). `service_role` nunca em apps.
4. Segurança infantil: minimização, RLS por padrão, consentimento por finalidade, superadmin NÃO lê dados de crianças, sem publicidade, sem treino de modelos com dados de crianças.
5. Nunca condicionar emergência/comunicação essencial ao desempenho escolar (`essentialApps` sempre liberados). Controle parental opcional e transparente.
6. Gamificação: sem ranking público, sem recompensa aleatória, sem punição por dificuldade; XP ≠ só acerto.
7. IA sugere; professor decide. Hoje NÃO há IA generativa (tutor pendente); sugestões vêm de regras do motor.
8. Uma resposta nunca define dificuldade; mostrar evidências e confiança; sem rótulos depreciativos nem diagnósticos clínicos.
9. Rodar testes a cada etapa; atualizar docs/CHANGELOG com o código; não modificar módulos consolidados sem checar dependentes.
10. Operações destrutivas só com autorização.

## Decisões vigentes
`docs/ARCHITECTURE.md §Decisões`. Parâmetros pedagógicos (60/25/15, limiares, pesos) são **hipóteses não calibradas**.
