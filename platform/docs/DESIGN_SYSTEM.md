# Design system — identidade Aprendix (nome provisório)

**Referências oficiais aprovadas** (salvas em `docs/design/references/`): `referencia-desktop.png` e `referencia-mobile.png`. São a base da identidade; **não** são usadas como imagem de fundo: cada componente é reconstruído em SVG/HTML funcional.
O nome "Aprendix" depende de pesquisa de disponibilidade comercial e registro de marca (`brand.trademarkNote`). A referência mobile mostra "Estuda+"; foi unificada em Aprendix conforme decisão do projeto.

## Onde está cada coisa
| Item | Arquivo |
|---|---|
| Nome, tagline, logotipo (símbolo), paleta, cores das disciplinas, paleta do mascote, contatos | `packages/brand/src/index.ts` (único lugar; o título HTML vem de `%BRAND_NAME%` via plugin do Vite) |
| Mascote axolote (9 estados) | `apps/web/src/ui/axolotl.tsx` + `theme/mascot.css` |
| Ícones, medalhas hexagonais, avatar ilustrado personalizável, pizza de fração, logotipo/wordmark | `apps/web/src/ui/art.tsx` |
| Casca do aluno (menu lateral + navegação inferior) e painel | `pages/ax.tsx`, `store/dashboard.ts` (modelo de visão) |
| Estilos Aprendix | `theme/aprendix.css` (+ `theme.css` base, compartilhado com os painéis adultos) |
| Tipografia | Nunito Variable (empacotada via `@fontsource-variable/nunito`; funciona offline) |

## Mascote (axolote roxo)
Corpo roxo, guelras externas rosas (animadas), olhos expressivos com piscar, livro de estudos, chapéu de formatura opcional. **Estados**: feliz, pensativo, explicando, estudando, comemorando, incentivando, dando dicas, aguardando resposta, apresentando missão (galeria em `#/marca`). Papel pedagógico (não decorativo): `mascotForEvent` liga eventos da atividade aos estados — acerto → comemorando; **erro/parcial → incentivando** (nunca decepção, deboche ou tristeza; coberto por teste); dica → dando dicas; aguardando resposta → aguardando (sem pressão de tempo); explicação → explicando; início de missão → apresentando.
Animação: SVG + CSS (guelras, flutuar, piscar, brilhos), respeitando `prefers-reduced-motion`. Cada parte é um grupo com id estável (`ax-gills-l/r`, `ax-eye-l/r`, `ax-arm-l/r`, `ax-mouth`, `ax-head`, `ax-body`, `ax-tail`) para virar rig **Rive/Lottie** no futuro; decisão: SVG agora porque não exige ferramenta de autoria nem runtime extra e mantém o personagem tematizável pela marca; migrar quando houver animador. **Limitação**: arte vetorial própria, mais simples que a ilustração da referência (sem sombreado detalhado); recomenda-se ilustrador profissional para a versão final.

## Painel do aluno (reconstrução fiel)
Menu lateral roxo com gradiente, pílula branca no item ativo, onda decorativa e cartão "Área da Família"; cabeçalho com avatar, saudação, pílulas de pontos (amarela) e tempo (turquesa), sino com indicador e menu; banner "Nova Missão!" com mascote, botão amarelo e pizza; cartões de disciplinas coloridos com progresso; Meu Desempenho; Meu Plano de Estudos; **Minha Evolução como ilha interativa**; Tempo de uso do celular; Minhas Conquistas (medalhas hexagonais). Todos os números vêm dos módulos reais; sem evidência aparece "—", "Faça o diagnóstico" ou "Em breve" (testado). Percentuais são rotulados como **estimativa**.
**Mobile** (<1024px) é uma experiência própria: cabeçalho roxo compacto com pílulas, banner, 4 disciplinas (2×2 abaixo de 375px), cards empilhados (2 colunas a partir de 760px), **navegação inferior fixa** (Início, Estudar, Missões, Evolução, Família) com áreas de toque ≥ 56px, `env(safe-area-inset-*)` para notch/barras do sistema, tablet com grade de 2 colunas.
**Faixas etárias** (mesmo componente, tokens diferentes): 5–7 fonte e alvos maiores, estrelas no lugar de porcentagens, botão **Ouvir** (síntese de voz do navegador, real); 8–10 referência plena; 11–13 tema escuro "jogo"; 14–17 banner sóbrio, mascote reduzido, claro/escuro. Pais, professores, gestores e admin mantêm interfaces profissionais (`theme.css`, sidebar escura sóbria).

## Acessibilidade e qualidade (automatizadas em `pnpm e2e:visual`)
axe-core WCAG 2 A/AA + boas práticas em 1440 e 390 px (sem violações críticas/sérias; inclui contraste), foco visível, `aria-*`, alvos de toque, `prefers-reduced-motion`, nós do mapa operáveis por teclado, sem rolagem horizontal em 7 resoluções. **Pendente**: teste com leitor de tela real e com usuários; auditoria WCAG formal; narração de áudio gravada para 5–7 (hoje: voz sintética do navegador).
