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

## 0.3.0 — Fase 3 (parcial): identidade Aprendix, mascote, painel desktop/mobile
- Referências aprovadas em `docs/design/references/`; marca **Aprendix** (provisória) em `packages/brand` com paleta, cores de disciplinas e paleta do mascote; título HTML vem da marca.
- **Mascote axolote** (9 estados, camadas prontas para Rive/Lottie); substitui o mascote anterior; reage a acerto/erro/dica/espera sem nunca demonstrar decepção.
- **Painel do aluno reconstruído** (menu lateral, banner, disciplinas, desempenho, plano, ilha de evolução interativa, tempo, medalhas, notificações, avatar personalizável) e **experiência mobile própria** (navegação inferior fixa, áreas seguras); 4 faixas etárias.
- Novas páginas: Estudar, Missões, Conquistas, Biblioteca, Tutor IA, Área da Família.
- `packages/tutor`: moderação infantil, escada de dicas sem vazar gabarito, provedor indisponível explícito.
- Testes: +16 (tutor, painel, mascote); suíte visual `pnpm e2e:visual` (7 resoluções, axe-core, desempenho, comparação lado a lado); E2E de jornada atualizado.
- Achados corrigidos: pensativo com boca de "tristeza" (violava a regra do mascote); mascote sobrepondo o título do banner; ícones do desktop sobrescrevendo o mobile; guarda de vazamento do tutor falhava por normalização; `aria-label` sem papel no mapa.

## 0.3.1 — correção: "Sair" inacessível em tela estreita
- **Defeito** (reportado ao testar o preview): no celular o botão Sair ficava escondido — no shell adulto o rodapé do menu lateral é ocultado abaixo de 820 px e, no aluno, o menu do avatar fica na área que some abaixo de 1024 px. O usuário não conseguia trocar de perfil.
- **Correção**: barra superior com nome e **Sair** nos perfis adultos; menu do aluno também no topo mobile; a tela de login agora avisa "Você está conectado como…" com Continuar/Sair.
- **Teste de regressão** em `pnpm e2e:visual` (seção 4b): Sair visível e funcional em 390/768/1440 px para professor, responsável, gestor, administrador e aluno.

## 0.4.0 — Axolote refeito, tela inicial lúdica e primeiros minigames
Feedback do usuário: axolote "estranho/feio" e diferente da referência; tela inicial pouco lúdica; disciplinas diferentes da referência (querem rolagem lateral); aprendizagem não pode ser só perguntas e respostas.
- **Axolote redesenhado** a partir da referência: cabeça mais alta e arredondada, guelras plumosas em leque subindo (haste + folíolos + botão), olhos grandes índigo com brilhos, bochechas, sorriso aberto com língua, mochila com alças laranja, cauda rosa com nadadeiras, capelo inclinado com borla. Mantém os 9 estados e a regra de nunca demonstrar decepção. Bug corrigido na animação das guelras (CSS sobrescrevia o espelhamento).
- **Faixa de disciplinas como na referência**: cartões fixos (ícone redondo, nome, barra + %), rolagem lateral por arrastar (mouse), deslizar (toque), setas e fade na borda; 6 disciplinas (Geografia e Inglês "em breve"). Em tela pequena não empilha mais: desliza.
- **Tela inicial lúdica**: mascote que reage ao toque (pula, muda de expressão e fala uma dica), decoração animada (nuvens, estrelas, bolhas), prateleira de minigames coloridos com estrelas e selo "Para você" (jogo sugerido pela dificuldade identificada), plano de estudos com o minigame da vez, confete nas conquistas.
- **5 minigames jogáveis** (`apps/web/src/games`): Pizzaria das Frações, Mercado Virtual (total, troco com notas e moedas), Laboratório de Cupcakes (fileiras, repartir em caixas, embalar, resto), Montagem de Frases, Detetive de Palavras. Cada rodada é um item pedagógico corrigido pelo MESMO motor (evidência tipo "game", equívocos, XP, minutos). Dicas progressivas pelo mascote, **tentativas ilimitadas, sem vidas e sem tempo**; a 1ª tentativa gera evidência, as seguintes só praticam; estrelas premiam esforço (concluir = ≥1).
- Motor: equívoco agora aparece no relatório de qualquer habilidade com evidência dele (ex.: "contou as fatias que sobram" na Pizzaria).
- Testes: +8 (lógica dos jogos: gabaritos, equívocos, integração com diagnóstico, estrelas) e `pnpm e2e:games` (robô joga os 5 jogos até o fim, erro proposital, axe).
- Bugs corrigidos pelos testes: Mercado exibia total diferente dos itens da cesta; pedido de "metade" na Pizzaria impedia detectar o erro de contar fatias que sobram; estado do jogo anterior ficava preso ao trocar de jogo por link.
