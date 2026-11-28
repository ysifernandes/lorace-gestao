# Motor de aprendizagem personalizada

**Implementação**: `packages/pedagogy/src/plan.ts`.
- `buildDailyPlan(graph, estimates, n)`: foco (needs_support/developing, menor p primeiro) 60% · pré-requisitos não consolidados dos focos 25% · revisão (consolidadas) 15%. Distribuição por maior resto (soma exata). Sem categoria disponível, o peso é redistribuído; **sem lacunas** não força repetição: 70% avanço (pré-requisitos consolidados) / 30% revisão leve.
- `examPrepSchedule(dias, habilidades)`: distribui até a véspera; último dia = simulado.
- `nextReviewIntervalDays`: dobra no acerto (máx. 180), volta a 1 dia no erro.
Entradas ainda não usadas: interesses, tempo disponível, autonomia, conteúdos escolares correntes (campos existem em `students`/`study_plans`). Ajuste automático das proporções por resultados: **pendente**. Troca de metodologia de explicação ao persistir erro: **pendente** (depende de biblioteca de conteúdos).
