# Testes

| Camada | Comando | Resultado atual |
|---|---|---|
| Unidade/integração (pedagogia, conteúdo, motor da jornada, catálogo, gamificação, parental, segurança, store web) | `pnpm test` | **107 testes OK** (11 arquivos; inclui tutor, painel, mascote, marca, lógica dos minigames, faixa efetiva/maturidade e jogos por faixa) |
| Protocolo PoC (HTTP real, agente simulado; inclui lockout, revogação, diário, tempo extra) + vetores de assinatura | idem (`tests/poc`) | 13 OK |
| Typecheck estrito | `pnpm typecheck` | OK |
| Banco: migrations + RLS + triggers (`rls.sql` 45) · revisão de segurança (`security.sql` 35) · seed (`seed.sql`) | `pnpm test:db` | OK (Postgres 16) |
| **E2E em navegador real** (Playwright/Chromium): diagnóstico adaptativo, explicação, prática, reavaliação, evolução, 4 faixas etárias, consentimento, mapa do professor, gestora, admin (quatro olhos), permissões de rota, estados do controle parental simulado | `pnpm web:build && (cd apps/web && npx vite preview --port 4173 &) && pnpm e2e` | OK (20 verificações) |
| Android/iOS nativo | — | **não executados** (sem SDK/Xcode/dispositivos) |
| E2E apps/web, acessibilidade, carga, pentest, usabilidade com famílias/professores | — | **pendentes** |
Princípio: testes de segurança (isolamento, forja, replay, escalada) fazem parte da suíte padrão. Falhas reais encontradas pelos testes ficam registradas no CHANGELOG.

## Suíte visual (Fase 3) — `pnpm e2e:visual`
Playwright/Chromium sobre o build: Luna conclui o diagnóstico pela interface; depois, **7 resoluções** (360×800, 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1920×1080) com capturas e verificações automáticas: sem rolagem horizontal, banner/4 disciplinas/cards presentes, **nenhum card sobreposto**, menu lateral (≥1024) vs navegação inferior fixa (<1024), áreas de toque ≥ 44 px, proporções do menu e da coluna direita próximas da referência; comparação lado a lado com as referências (`comparacao-desktop.png`, `comparacao-mobile.png`); navegação do menu lateral e inferior; botões (sino, avatar, mapa, responsável, CTA); **fidelidade de dados** (aluno novo sem porcentagens; aluno avaliado com "estimativa"); **axe-core** WCAG 2 A/AA em 1440 e 390 px (sem críticas/sérias, inclui contraste); desempenho (DCL, nós do DOM, tamanho de JS/CSS); ausência de erros de console. Resultado atual: **70 verificações OK**. Capturas ficam em `$SHOTS` (padrão `/tmp/shots-visual`).
Limites: a comparação com a referência é estrutural + inspeção visual (não há diff por pixel, pois a arte da referência é ilustração própria); desempenho medido em máquina local, não em aparelhos reais; sem teste com leitor de tela real.

## Minigames — `pnpm e2e:games`
Um robô (Playwright) joga os **5 jogos até o fim** pela interface com as rodadas geradas pela mesma lógica: dica progressiva, **erro proposital na rodada 2** (confere incentivo do mascote sem decepção e "tentar de novo"), tela final com estrelas, evidências/XP no progresso, estrelas na prateleira, axe-core na central de jogos (1440 e 390 px) e ausência de erros de console. Exige `vite preview` em :4173.

## Personalização por idade — `pnpm e2e:teens`
Teo (14, 1º acesso): cadastro inicial (sem mascote infantil), painel "Estrategistas" em tom de adolescente, catálogo com 3 jogos + treino de base com nomes adultos (sem "Pizzaria"), robô joga Finanças, Escape Room e Placar com o tema escolhido (futebol → "gols", chuteira), diagnóstico de conteúdo avançado, axe-core. Malu (12) escolhe "mais tranquilo" e cai na faixa 8–10; Caio (6) vê só jogos visuais; "Sair" acessível fora do painel em 1440 e 390 px; responsável ajusta a maturidade ("ajustado a partir de…").
