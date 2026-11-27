# Gamificação

**Implementação** (`packages/gamification`, migration 0004): `computeXp` (esforço, participação, progresso, compreensão — iguais; piso de 30% se esforço e participação ≥ 0,5, para não punir quem tem dificuldade) · `levelFor` (nível n começa em 50·n·(n−1) XP) · `minutesForXp` (XP/min configurável) · `Ledger` (idempotente, saldo ≥ 0, hash encadeado, teto diário).
Princípios: sem ranking público; sem recompensa aleatória; sem mecânicas compulsivas (streak punitivo, loot box); XP é permanente (não se gasta) — **minutos** são o que se consome.
Regras de minutos (config. do responsável): taxa, teto diário, apps participantes, janelas, expiração, acúmulo, exceções, pausas. **Hoje**: taxa e teto implementados no `Ledger`; expiração/acúmulo/janelas/pausas **pendentes** (esquema `parental_rules.kind='reward'` pronto).
Pendente: missões diárias/semanais, conquistas, avatares, mapas, jogos educativos (exigem conteúdo e UI), antifraude comportamental.

## Atualização — Fase 3 (parcial)
- **Mapa de evolução interativo** (`store/dashboard.ts`, `ax.tsx`): "mundos" temáticos (`MATH_WORLDS`: Ilha dos Números, Laboratório da Multiplicação, Pizzaria das Frações, Vila dos Problemas) e fases = habilidades. **Estado da fase vem de evidências**: concluída = habilidade consolidada; **bloqueada = algum pré-requisito "precisa de apoio"** (a ilha explica o motivo ao clicar); atual = primeira fase aberta não concluída. Pontos não destravam fases (testado).
- Níveis com títulos editoriais (`levelTitle`), medalhas hexagonais **derivadas de aprendizagem real** (primeiro passo, estudioso, foco total, superação = estimativa que subiu após reavaliação, curioso = usou dicas, reavaliador), avatar ilustrado personalizável. **Sem sequências diárias punitivas**, sem ranking, sem recompensas aleatórias.
- **Pendente**: animações de conquista, desafios pedagógicos extras, mais mundos, loja de acessórios do avatar/mascote, regras de expiração/acúmulo de minutos na UI.
