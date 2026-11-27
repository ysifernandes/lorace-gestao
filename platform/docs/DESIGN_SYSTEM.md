# Design system

**Referência visual**: a imagem anexada **não chegou** em nenhuma das mensagens (verificado); o `index.html` na raiz é da Loracê e não foi usado. A direção segue a descrição textual: roxo + azul + branco com cores complementares (âmbar, verde, vermelho). Quando a imagem for enviada, ajustar apenas `packages/brand` e `apps/web/src/theme/theme.css`.

## Implementação (`apps/web/src/theme/theme.css`, `apps/web/src/ui`)
- **Tokens**: marca (`--brand-*`, vindos de `packages/brand`) → tokens semânticos (`--primary`, `--surface`, `--radius`, `--fs`, `--tap`…).
- **Temas por público** (atributo `data-theme`): `exploradores` (5–7: fonte grande, alvos de 72px, cantos 28px, cores quentes, mascote grande, pouca leitura), `aventureiros` (8–10: missões, mascote, cores vivas), `desafiadores` (11–13: tema escuro "gamer", sem mascote infantil), `estrategistas` (14–17: sóbrio, claro/escuro, sem elementos infantis), `adulto` (responsável, professor, gestor, admin: sidebar + tabelas + mapas).
- **Componentes**: Card, Btn, Badge, Progress, Ring, LineChart (SVG), Heatmap (matriz com ícone + cor + título, não só cor), Tabs, Modal, Toast, Skeleton, ErrorBoundary, Mascot (SVG), Avatar, ActivityPlayer.
- **Acessibilidade**: foco visível, `aria-*` em progresso/rádio/tabs/modal, alvos ≥ 44px (72px na faixa 5–7), `prefers-reduced-motion`, estados do mapa com ícones (daltonismo), navegação por teclado nas atividades (ordenar por botões; arrastar com alternativa por toque). **Auditoria formal WCAG pendente** (leitor de tela, contraste automatizado).
- **Linguagem**: positiva ("Já domino!", "Vamos treinar juntos"); adultos veem rótulos técnicos ("Precisa de apoio").
- Pendentes: ilustrações/personagens definitivos (hoje um mascote SVG simples), narração por voz, animações de conquista, i18n.
