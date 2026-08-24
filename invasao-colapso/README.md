# INVASÃO: COLAPSO

Jogo de estratégia territorial ambientado depois do **Colapso** — o evento em que
governos perderam o controle de regiões inteiras e as facções passaram a disputar
território, recursos e sobrevivência.

Aplicação **web responsiva** (computador, tablet e celular), com a lógica do jogo
totalmente separada da interface.

---

## Como executar

```bash
cd invasao-colapso
npm install
npm run dev
```

Abra o endereço mostrado no terminal (normalmente `http://localhost:5173`).
O servidor já escuta na rede local, então dá para abrir pelo celular usando o
IP do computador (ex.: `http://192.168.0.10:5173`).

Outros comandos:

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Verifica os tipos e gera a versão de produção em `dist/` |
| `npm run preview` | Serve o `dist/` gerado |
| `npm run test` | Testes das regras do jogo (Vitest) |
| `npm run test:ui` | Verificação da interface em navegador real (precisa do `preview` no ar) |

Para `test:ui`: rode `npm run preview` em outro terminal. O caminho do Chromium pode
ser informado por `CHROME_PATH`, e o endereço por `BASE_URL`.
| `npm run verify` | Tipos + testes + build |

---

## Arquitetura

A regra do jogo não conhece React. A interface só lê **seletores** e envia **ações**.

```
src/
  game/                 ← o jogo (TypeScript puro, sem React)
    types/              contratos: facção, soldado, território, jogador, carta, turno
    factions/           registry de facções (Humanos + adversário de teste)
    soldiers/           criação e movimentação de soldados (fonte única de verdade)
    map/                territórios e adjacência
    turns/              máquina de estados das fases
    combat/             dado, conquista, ocupação, combate temporário
    cards/              definição das cartas, regras de uso e efeitos
    events/             fila de animações emitida pelas regras
    engine/             reducer da partida, seletores e verificador de integridade
    persistence/        adaptadores de armazenamento (localStorage / memória)
    rng/                gerador aleatório injetável (testes determinísticos)
  data/                 conteúdo substituível: mapa, jogadores, cartas iniciais, lore
  app/, hooks/          ligação React ↔ motor
  components/           mapa, painéis, modais e primitivos de UI
  pages/                tela do jogo
  dev/                  painel DEV temporário (isolado; apagar a pasta não quebra o jogo)
  styles/               CSS global (mobile-first)
```

### Princípios que sustentam a expansão

- **Soldado existe em um lugar só.** `state.soldiers` é o registro; o território
  guarda apenas ids. `engine/invariants.ts` prova isso nos testes.
- **Toda mutação é uma ação.** `applyAction(state, action)` devolve novo estado ou
  erro, nunca um estado pela metade.
- **Conteúdo fica em `data/`.** Trocar o mapa de teste pelo mapa oficial não toca
  em nenhuma regra.
- **Aleatoriedade é injetável.** O dado recebe um `Rng`; nos testes ele é fixo.
- **Animações são eventos.** As regras emitem eventos; a cena que os desenha pode
  ser substituída sem reescrever a carta.
- **Persistência é um adaptador.** Hoje `localStorage`; trocar por backend é
  implementar `StorageAdapter`.

---

## Facções

Começamos com **Humanos** (logística de resgate e medicina de guerra). O adversário
`Insurgentes` existe apenas para validar o sistema — identidade própria vem depois.
Adicionar uma facção = adicionar um objeto em `game/factions/`.

## Cartas

**SEQUESTRO** (Humanos) tem dois usos, e usar um consome a carta:

- **A — Sequestro:** captura até 7 soldados de um time adversário. Eles deixam o
  território inimigo, passam a integrar o exército Humano e são redistribuídos
  livremente entre os territórios do jogador.
- **B — Vacina / Contra-Ataque:** ao sofrer um ataque, rola 1d6 e destrói esse
  número de soldados atacantes (nunca mais do que existem).

Os dois efeitos nunca podem ser usados com a mesma carta.
