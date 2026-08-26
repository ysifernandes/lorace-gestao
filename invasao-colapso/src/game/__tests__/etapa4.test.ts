import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  PLAYER_IDS,
  TERRITORY_IDS,
  aliveCount,
  firstCardOf,
  garrison,
  goToPhase,
  must,
  mustFail,
  newGame,
  run,
} from './helpers';
import { assertValid, validateState } from '../engine/invariants';
import { scriptedRng } from '../rng/rng';
import { BALANCE } from '../config/balance';
import { HUMANOS, HUMANOS_ID } from '../factions/humanos';
import {
  getFaction,
  listFactions,
  playableFactions,
  registerFaction,
  upcomingFactions,
} from '../factions/faction.registry';
import { abilitiesOfFaction, registerAbility, getAbility } from '../abilities/ability.registry';
import {
  abilitiesOfPlayer,
  checkAvailability,
  getAbilityState,
  seedAbilityStates,
} from '../abilities/abilityEngine';
import { SOBREVIVENCIA_ID } from '../abilities/humanos/sobrevivencia';
import { OPERACAO_AEREA_ID } from '../abilities/humanos/operacaoAerea';
import { emitGameEvent } from '../events/gameEvents';
import { enqueueEffect, resolveEffectQueue, clearEffectQueue } from '../effects/effectQueue';
import { EFFECT_PRIORITY } from '../effects/effect.types';
import { abilityViews, signatureCards, troopsOf } from '../engine/selectors';
import { SEQUESTRO_CARD_ID } from '../cards/sequestro.card';
import { factionId } from '../types/ids';
import type { GameState } from '../types/game.types';
import type { TerritoryId } from '../types/ids';
import type { AbilityDefinition } from '../abilities/ability.types';
import type { FactionDefinition } from '../types/faction.types';

const SOBREVIVENCIA = BALANCE.abilities.sobrevivencia;
const AEREA = BALANCE.abilities.operacaoAerea;

/** Reduz o jogador 1 a `keep` territórios, entregando o resto ao jogador 2. */
function shrinkHumans(state: GameState, keep: number): GameState {
  let current = state;
  const owned = current.players[PLAYER_IDS.p1 as string].territoryIds.slice();
  for (const territoryId of owned.slice(keep)) {
    current = must(current, {
      type: 'SET_CONTROLLER',
      territoryId,
      playerId: PLAYER_IDS.p2,
    });
  }
  expect(current.players[PLAYER_IDS.p1 as string].territoryIds).toHaveLength(keep);
  return current;
}

/** Fecha o turno de p1 e de p2, devolvendo o estado no início do turno de p1. */
function cycleToHumanTurnStart(state: GameState): GameState {
  let current = must(state, { type: 'END_TURN' });
  current = must(current, { type: 'END_TURN' });
  expect(current.turn.currentPlayerId).toBe(PLAYER_IDS.p1);
  expect(current.turn.phase).toBe('INICIO');
  return current;
}

describe('ETAPA 4 — Facções', () => {
  it('T01 — Humanos carregam com identidade, estilo, habilidades e carta', () => {
    const faction = getFaction(HUMANOS_ID);
    expect(faction.name).toBe('Humanos');
    expect(faction.status).toBe('ACTIVE');
    expect(faction.subtitle.length).toBeGreaterThan(0);
    expect(faction.lore.length).toBeGreaterThan(0);
    expect(faction.strategy.pillars).toEqual(['Adaptação', 'Tecnologia', 'Controle Tático']);
    expect(faction.strategy.strengths.length).toBeGreaterThan(0);
    expect(faction.strategy.weaknesses.length).toBeGreaterThan(0);
    expect(faction.passiveAbilityIds).toContain(SOBREVIVENCIA_ID);
    expect(faction.activeAbilityIds).toContain(OPERACAO_AEREA_ID);
    expect(faction.signatureCardIds).toContain('card.sequestro');
    // Comandantes: estrutura pronta, conteúdo aguardando definição do criador.
    expect(faction.commanders).toEqual([]);
  });

  it('T02 — o jogador recebe a facção e as habilidades dela', () => {
    const state = newGame();
    const player = state.players[PLAYER_IDS.p1 as string];
    expect(player.factionId).toBe(HUMANOS_ID);

    const abilities = abilitiesOfPlayer(state, PLAYER_IDS.p1).map((a) => a.definition.id);
    expect(abilities).toContain(SOBREVIVENCIA_ID);
    expect(abilities).toContain(OPERACAO_AEREA_ID);

    // O adversário de teste não tem habilidades humanas.
    expect(abilitiesOfPlayer(state, PLAYER_IDS.p2).map((a) => a.definition.id)).toEqual([]);
  });

  it('T03 — dados de facção e habilidade não dependem da interface', () => {
    // Nenhum arquivo de regra pode importar React: a lógica precisa rodar
    // fora do navegador (servidor, testes, futuro app nativo).
    const gameDir = join(process.cwd(), 'src', 'game');
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry)) continue;
        const source = readFileSync(full, 'utf8');
        if (/from ['"]react/.test(source) || /\.tsx$/.test(entry)) offenders.push(full);
      }
    };
    walk(gameDir);
    expect(offenders).toEqual([]);

    // E a definição da facção é dado puro, serializável.
    expect(() => JSON.parse(JSON.stringify(HUMANOS))).not.toThrow();
  });

  it('T04 — nova facção entra pelo registry, sem alterar o motor', () => {
    const NOVA_ID = factionId('faction_teste_runtime');
    const NOVA_ABILITY_ID = 'ability.teste.reforco-extra';

    const habilidade: AbilityDefinition = {
      id: NOVA_ABILITY_ID,
      factionId: NOVA_ID,
      name: 'Reforço de Teste',
      description: 'FACÇÃO DE TESTE — NÃO DEFINITIVA.',
      kind: 'PASSIVE',
      triggers: ['TURN_STARTED'],
      conditions: [{ type: 'IS_CURRENT_PLAYER' }],
      usage: { scope: 'PER_TURN', perTurn: 1 },
      produceEffects: (context) => [
        { kind: 'GRANT_REINFORCEMENTS', playerId: context.playerId, amount: 2 },
      ],
      feedback: { title: 'REFORÇO DE TESTE' },
      provisional: true,
    };

    const faccao: FactionDefinition = {
      ...HUMANOS,
      id: NOVA_ID,
      name: 'FACÇÃO DE TESTE — NÃO DEFINITIVA',
      passiveAbilityIds: [NOVA_ABILITY_ID],
      activeAbilityIds: [],
      signatureCardIds: [],
      status: 'TEST_ONLY',
    };

    registerAbility(habilidade);
    registerFaction(faccao);

    expect(listFactions().map((f) => f.id)).toContain(NOVA_ID);
    expect(abilitiesOfFaction(NOVA_ID).map((a) => a.id)).toContain(NOVA_ABILITY_ID);
    expect(getAbility(NOVA_ABILITY_ID).name).toBe('Reforço de Teste');

    // E funciona de verdade na partida, sem nenhuma alteração no reducer.
    const state = newGame();
    const draft = structuredClone(state);
    draft.players[PLAYER_IDS.p2 as string].factionId = NOVA_ID;
    seedAbilityStates(draft, PLAYER_IDS.p2);
    draft.turn.currentPlayerId = PLAYER_IDS.p2;
    draft.turn.currentIndex = 1;
    const before = draft.turn.pendingReinforcements;
    emitGameEvent(draft, {
      kind: 'TURN_STARTED',
      payload: { playerId: PLAYER_IDS.p2 },
      dedupeKey: 'teste-runtime',
    });
    expect(draft.turn.pendingReinforcements).toBe(before + 2);
    expect(validateState(draft)).toEqual([]);
  });

  it('slots de facção existem como reservados, sem lore inventada', () => {
    const slots = upcomingFactions();
    expect(slots.length).toBe(4);
    for (const slot of slots) {
      expect(slot.name).toMatch(/^FACTION_0\d$/);
      expect(slot.status).toBe('PLACEHOLDER');
      expect(slot.lore).toEqual([]);
      expect(slot.provisional).toBe(true);
    }
    // Humanos é a única facção oficial; a outra jogável é de teste.
    const oficiais = playableFactions().filter((f) => f.status === 'ACTIVE');
    expect(oficiais.map((f) => f.id)).toEqual([HUMANOS_ID]);
  });
});

describe('ETAPA 4 — Sobrevivência (passiva)', () => {
  it('T05 — 3 territórios ativam a habilidade', () => {
    let state = shrinkHumans(newGame(), 3);
    state = cycleToHumanTurnStart(state);
    const base = Math.max(BALANCE.reinforcements.minimum, Math.floor(3 / 2));
    expect(state.turn.pendingReinforcements).toBe(base + SOBREVIVENCIA.bonusTroops);
    expect(state.abilityFeed[0]?.abilityId).toBe(SOBREVIVENCIA_ID);
  });

  it('T06 — 2 territórios ativam a habilidade', () => {
    let state = shrinkHumans(newGame(), 2);
    state = cycleToHumanTurnStart(state);
    const base = Math.max(BALANCE.reinforcements.minimum, Math.floor(2 / 2));
    expect(state.turn.pendingReinforcements).toBe(base + SOBREVIVENCIA.bonusTroops);
  });

  it('T07 — 1 território ativa a habilidade', () => {
    let state = shrinkHumans(newGame(), 1);
    state = cycleToHumanTurnStart(state);
    const base = Math.max(BALANCE.reinforcements.minimum, Math.floor(1 / 2));
    expect(state.turn.pendingReinforcements).toBe(base + SOBREVIVENCIA.bonusTroops);
    expect(validateState(state)).toEqual([]);
  });

  it('T08 — 4 territórios NÃO ativam a habilidade', () => {
    let state = shrinkHumans(newGame(), 4);
    state = cycleToHumanTurnStart(state);
    const base = Math.max(BALANCE.reinforcements.minimum, Math.floor(4 / 2));
    expect(state.turn.pendingReinforcements).toBe(base);
    expect(state.abilityFeed.some((f) => f.abilityId === SOBREVIVENCIA_ID && f.turn === state.turn.number))
      .toBe(false);
  });

  it('T09 — o bônus concedido é exatamente o configurado', () => {
    const semAjuda = cycleToHumanTurnStart(shrinkHumans(newGame(), 4));
    const comAjuda = cycleToHumanTurnStart(shrinkHumans(newGame(), 3));
    expect(comAjuda.turn.pendingReinforcements - semAjuda.turn.pendingReinforcements)
      .toBe(SOBREVIVENCIA.bonusTroops);
    // O valor vem da configuração central, não de número solto no código.
    expect(SOBREVIVENCIA.bonusTroops).toBe(1);
    expect(SOBREVIVENCIA.maxTerritories).toBe(3);
  });

  it('T10 — o bônus não duplica no mesmo início de turno', () => {
    const state = cycleToHumanTurnStart(shrinkHumans(newGame(), 3));
    const depoisDoPrimeiro = state.turn.pendingReinforcements;

    // Mesmo momento anunciado de novo: precisa ser ignorado.
    const draft = structuredClone(state);
    emitGameEvent(draft, {
      kind: 'TURN_STARTED',
      payload: { playerId: PLAYER_IDS.p1 },
      dedupeKey: `TURN_STARTED:${draft.turn.number}:${PLAYER_IDS.p1}`,
    });
    expect(draft.turn.pendingReinforcements).toBe(depoisDoPrimeiro);

    // E mesmo sem a chave de idempotência, o limite por turno segura.
    const semChave = structuredClone(state);
    emitGameEvent(semChave, { kind: 'TURN_STARTED', payload: { playerId: PLAYER_IDS.p1 } });
    expect(semChave.turn.pendingReinforcements).toBe(depoisDoPrimeiro);
    const runtime = getAbilityState(semChave, PLAYER_IDS.p1, SOBREVIVENCIA_ID);
    expect(runtime?.usesThisTurn).toBe(1);
  });
});

describe('ETAPA 4 — Operação Aérea (ativa)', () => {
  /** Estado na fase de movimentação, com tropas suficientes na origem. */
  function readyForAirlift(): GameState {
    let state = goToPhase(newGame(), 'MOVIMENTACAO');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.setorMilitar,
      amount: 5,
    });
    return state;
  }

  it('T11/T12 — move entre territórios Humanos NÃO adjacentes', () => {
    const state = readyForAirlift();
    // Pré-condição do teste: os dois territórios realmente não fazem fronteira.
    expect(state.territories[TERRITORY_IDS.setorMilitar as string].neighbors)
      .not.toContain(TERRITORY_IDS.zonaSul);

    const antesOrigem = garrison(state, TERRITORY_IDS.setorMilitar);
    const antesDestino = garrison(state, TERRITORY_IDS.zonaSul);
    const total = aliveCount(state);

    const depois = must(state, {
      type: 'ACTIVATE_ABILITY',
      abilityId: OPERACAO_AEREA_ID,
      params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.zonaSul, amount: 4 },
    });

    expect(garrison(depois, TERRITORY_IDS.setorMilitar)).toBe(antesOrigem - 4);
    expect(garrison(depois, TERRITORY_IDS.zonaSul)).toBe(antesDestino + 4);
    // Nenhum soldado criado nem perdido no transporte.
    expect(aliveCount(depois)).toBe(total);
    expect(validateState(depois)).toEqual([]);
  });

  it('T13 — origem inimiga é bloqueada', () => {
    const state = readyForAirlift();
    expect(
      mustFail(state, {
        type: 'ACTIVATE_ABILITY',
        abilityId: OPERACAO_AEREA_ID,
        params: { from: TERRITORY_IDS.ruinasLeste, to: TERRITORY_IDS.zonaSul, amount: 1 },
      }),
    ).toMatch(/origem precisa ser um território seu/i);
  });

  it('T14 — destino inimigo é bloqueado', () => {
    const state = readyForAirlift();
    expect(
      mustFail(state, {
        type: 'ACTIVATE_ABILITY',
        abilityId: OPERACAO_AEREA_ID,
        params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.ruinasLeste, amount: 1 },
      }),
    ).toMatch(/destino precisa ser um território seu/i);
  });

  it('T15 — quantidade inválida é bloqueada', () => {
    const state = readyForAirlift();
    const invalidas = [0, -3, 1.5];
    for (const amount of invalidas) {
      expect(
        mustFail(state, {
          type: 'ACTIVATE_ABILITY',
          abilityId: OPERACAO_AEREA_ID,
          params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.zonaSul, amount },
        }),
      ).toMatch(/quantidade inválida/i);
    }
    // Parâmetros ausentes também não passam.
    expect(
      mustFail(state, { type: 'ACTIVATE_ABILITY', abilityId: OPERACAO_AEREA_ID }),
    ).toMatch(/informe origem, destino e quantidade/i);
  });

  it('T16 — a origem nunca fica vazia', () => {
    const state = readyForAirlift();
    const disponivel = garrison(state, TERRITORY_IDS.setorMilitar);
    expect(
      mustFail(state, {
        type: 'ACTIVATE_ABILITY',
        abilityId: OPERACAO_AEREA_ID,
        params: {
          from: TERRITORY_IDS.setorMilitar,
          to: TERRITORY_IDS.zonaSul,
          amount: disponivel,
        },
      }),
    ).toMatch(new RegExp(`ao menos ${AEREA.minLeftBehind} soldado`, 'i'));

    // O limite é exatamente "tudo menos o mínimo".
    const noLimite = must(state, {
      type: 'ACTIVATE_ABILITY',
      abilityId: OPERACAO_AEREA_ID,
      params: {
        from: TERRITORY_IDS.setorMilitar,
        to: TERRITORY_IDS.zonaSul,
        amount: disponivel - AEREA.minLeftBehind,
      },
    });
    expect(garrison(noLimite, TERRITORY_IDS.setorMilitar)).toBe(AEREA.minLeftBehind);
  });

  it('T17 — a utilização fica registrada', () => {
    const state = must(readyForAirlift(), {
      type: 'ACTIVATE_ABILITY',
      abilityId: OPERACAO_AEREA_ID,
      params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.zonaSul, amount: 3 },
    });

    const runtime = getAbilityState(state, PLAYER_IDS.p1, OPERACAO_AEREA_ID);
    expect(runtime?.timesUsed).toBe(1);
    expect(runtime?.lastUsedTurn).toBe(state.turn.number);
    expect(runtime?.chargesRemaining).toBe(AEREA.usesPerGame - 1);

    // Registro legível para depuração e para partidas futuras.
    const entrada = state.log.find((e) => e.level === 'ABILITY');
    expect(entrada?.message).toMatch(/OPERAÇÃO AÉREA/);
    expect(entrada?.message).toMatch(/Setor Militar → Zona Sul · 3 soldado/);
    expect(state.abilityFeed[0]?.abilityId).toBe(OPERACAO_AEREA_ID);
    // E o evento de animação ficou pronto para a cena futura.
    expect(state.animationQueue.some((e) => e.specId === 'anim.operacao-aerea')).toBe(true);
  });

  it('T18 — os limites de utilização são respeitados', () => {
    let state = must(readyForAirlift(), {
      type: 'ACTIVATE_ABILITY',
      abilityId: OPERACAO_AEREA_ID,
      params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.zonaSul, amount: 2 },
    });

    // Limite por turno.
    expect(
      mustFail(state, {
        type: 'ACTIVATE_ABILITY',
        abilityId: OPERACAO_AEREA_ID,
        params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.zonaSul, amount: 1 },
      }),
    ).toMatch(/limite de usos neste turno/i);

    // Turno novo: volta a ficar disponível.
    state = cycleToHumanTurnStart(state);
    state = goToPhase(state, 'MOVIMENTACAO');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.setorMilitar,
      amount: 4,
    });
    state = must(state, {
      type: 'ACTIVATE_ABILITY',
      abilityId: OPERACAO_AEREA_ID,
      params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.zonaSul, amount: 1 },
    });
    expect(getAbilityState(state, PLAYER_IDS.p1, OPERACAO_AEREA_ID)?.chargesRemaining).toBe(0);

    // Cargas esgotadas na partida.
    state = cycleToHumanTurnStart(state);
    state = goToPhase(state, 'MOVIMENTACAO');
    expect(
      mustFail(state, {
        type: 'ACTIVATE_ABILITY',
        abilityId: OPERACAO_AEREA_ID,
        params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.zonaSul, amount: 1 },
      }),
    ).toMatch(/sem cargas restantes/i);
  });

  it('a habilidade respeita a fase configurada', () => {
    const state = goToPhase(newGame(), 'COMBATE');
    expect(
      mustFail(state, {
        type: 'ACTIVATE_ABILITY',
        abilityId: OPERACAO_AEREA_ID,
        params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.zonaSul, amount: 1 },
      }),
    ).toMatch(/fase/i);
  });

  it('uma passiva não pode ser acionada como se fosse ativa', () => {
    const state = goToPhase(newGame(), 'MOVIMENTACAO');
    expect(mustFail(state, { type: 'ACTIVATE_ABILITY', abilityId: SOBREVIVENCIA_ID }))
      .toMatch(/não é acionada manualmente/i);
  });

  it('quem não tem a habilidade não pode acioná-la', () => {
    let state = must(newGame(), { type: 'END_TURN' });
    state = goToPhase(state, 'MOVIMENTACAO');
    expect(
      mustFail(state, {
        type: 'ACTIVATE_ABILITY',
        abilityId: OPERACAO_AEREA_ID,
        params: { from: TERRITORY_IDS.ruinasLeste, to: TERRITORY_IDS.fronteiraVermelha, amount: 1 },
      }),
    ).toMatch(/não possui esta habilidade/i);
  });
});

describe('ETAPA 4 — Cartas continuam intactas', () => {
  it('T19/T20/T21 — Sequestro: funciona, trava em 7 e converte', () => {
    let state = goToPhase(newGame(), 'ACAO');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.ruinasLeste,
      amount: 6,
      ownerId: PLAYER_IDS.p2,
    });
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const guarnicao = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison;

    expect(
      mustFail(state, {
        type: 'PLAY_CARD',
        cardInstanceId: card,
        mode: 'PRIMARY',
        targetSoldierIds: guarnicao.slice(0, 8),
      }),
    ).toMatch(/no máximo 7/i);

    const alvos = guarnicao.slice(0, 7);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: alvos,
    });
    for (const id of alvos) {
      expect(state.soldiers[id as string].factionId).toBe(HUMANOS_ID);
      expect(state.soldiers[id as string].ownerId).toBe(PLAYER_IDS.p1);
    }
    expect(BALANCE.cards.sequestro.maxTargets).toBe(7);
  });

  it('T22 — redistribuição continua funcionando', () => {
    let state = goToPhase(newGame(), 'ACAO');
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const alvos = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 3);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: alvos,
    });
    state = must(state, {
      type: 'DISTRIBUTE_RESERVES',
      assignments: [{ territoryId: TERRITORY_IDS.baseOcidental, amount: 3 }],
    });
    expect(garrison(state, TERRITORY_IDS.baseOcidental)).toBe(6);
    expect(validateState(state)).toEqual([]);
  });

  it('T23/T24 — Vacina funciona e consome a carta', () => {
    let state = must(newGame(), { type: 'END_TURN' });
    state = goToPhase(state, 'COMBATE');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.regiaoIndustrial,
      amount: 6,
    });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.regiaoIndustrial,
      to: TERRITORY_IDS.zonaSul,
      amount: 5,
    });
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const result = run(
      state,
      { type: 'PLAY_CARD', cardInstanceId: card, mode: 'ALTERNATE' },
      { rng: scriptedRng([3 / 6]) },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { diceValue: number; eliminatedCount: number };
    expect(data.diceValue).toBe(4);
    expect(data.eliminatedCount).toBe(4);
    expect(result.state.cards[card as string].state).toBe('CONSUMED');
    expect(BALANCE.cards.vacina.diceSides).toBe(6);
  });

  it('T25 — a mesma carta nunca executa os dois efeitos', () => {
    let state = goToPhase(newGame(), 'ACAO');
    const card = firstCardOf(state, PLAYER_IDS.p1);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 1),
    });
    expect(mustFail(state, { type: 'PLAY_CARD', cardInstanceId: card, mode: 'ALTERNATE' }))
      .toMatch(/consumida/i);
  });

  it('carta e habilidade permanecem conceitos separados', () => {
    const state = newGame();
    // A carta está na mão e é consumível; a habilidade não fica na mão.
    const cartas = signatureCards(state, PLAYER_IDS.p1);
    expect(cartas[0].definition.id).toBe(SEQUESTRO_CARD_ID);
    expect(cartas[0].inHand).toBe(1);

    const habilidades = abilityViews(state, PLAYER_IDS.p1).map((v) => v.definition.id);
    expect(habilidades).not.toContain(SEQUESTRO_CARD_ID);
    // A carta vive na mão; a habilidade nunca aparece lá.
    expect(state.players[PLAYER_IDS.p1 as string].handCardIds.length).toBeGreaterThan(0);
    // Habilidade tem cargas/recarga; carta tem usos e estado.
    const aerea = abilityViews(state, PLAYER_IDS.p1).find((v) => v.definition.id === OPERACAO_AEREA_ID);
    expect(aerea?.chargesRemaining).toBe(AEREA.usesPerGame);
  });
});

describe('ETAPA 4 — Combate continua intacto', () => {
  it('T26/T27/T28 — ataque, defesa e dado seguem funcionando', () => {
    let state = goToPhase(newGame(), 'COMBATE');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 5,
    });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
      amount: 4,
    });
    expect(state.pendingAttack?.attackingSoldierIds).toHaveLength(4);
    expect(state.territories[TERRITORY_IDS.ruinasLeste as string].status).toBe('CONTESTED');
    // O evento de batalha foi anunciado para quem quiser reagir.
    expect(state.emittedEventKeys).toBeDefined();
    expect(validateState(state)).toEqual([]);
  });

  it('T29/T30 — conquista e ocupação seguem funcionando', () => {
    let state = goToPhase(newGame(), 'COMBATE');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 5,
    });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
      amount: 4,
    });
    state = must(state, { type: 'DEV_WIN_ATTACK' });
    expect(state.territories[TERRITORY_IDS.ruinasLeste as string].controllerId).toBe(PLAYER_IDS.p1);
    expect(state.pendingOccupation).not.toBeNull();
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 3 });
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(3);
    expect(validateState(state)).toEqual([]);
  });
});

describe('ETAPA 4 — Motor de efeitos', () => {
  it('T31 — um evento com a mesma identidade dispara uma única vez', () => {
    const draft = structuredClone(shrinkHumans(newGame(), 3));
    draft.turn.pendingReinforcements = 0;
    const key = 'evento-unico';

    const primeiro = emitGameEvent(draft, {
      kind: 'TURN_STARTED',
      payload: { playerId: PLAYER_IDS.p1 },
      dedupeKey: key,
    });
    const segundo = emitGameEvent(draft, {
      kind: 'TURN_STARTED',
      payload: { playerId: PLAYER_IDS.p1 },
      dedupeKey: key,
    });

    expect(primeiro.skipped).toBe(false);
    expect(primeiro.fired).toHaveLength(1);
    expect(segundo.skipped).toBe(true);
    expect(segundo.fired).toHaveLength(0);
    expect(draft.turn.pendingReinforcements).toBe(SOBREVIVENCIA.bonusTroops);
  });

  it('T32 — a fila respeita a ordem de prioridade', () => {
    const draft = structuredClone(newGame());
    const alvo = TERRITORY_IDS.baseOcidental;

    // Entram fora de ordem de propósito.
    enqueueEffect(draft, {
      effect: { kind: 'ADD_TROOPS', territoryId: alvo, amount: 1 },
      source: { kind: 'SYSTEM', id: 'terceiro' },
      priority: EFFECT_PRIORITY.SYSTEM,
    });
    enqueueEffect(draft, {
      effect: { kind: 'ADD_TROOPS', territoryId: alvo, amount: 1 },
      source: { kind: 'ABILITY', id: 'primeiro' },
      priority: EFFECT_PRIORITY.BLOCK,
    });
    enqueueEffect(draft, {
      effect: { kind: 'ADD_TROOPS', territoryId: alvo, amount: 1 },
      source: { kind: 'CARD', id: 'segundo' },
      priority: EFFECT_PRIORITY.CARD,
    });

    const resolution = resolveEffectQueue(draft);
    expect(resolution.resolved.map((e) => e.source.id)).toEqual(['primeiro', 'segundo', 'terceiro']);
  });

  it('T33 — efeito resolvido sai da fila e vai para o histórico', () => {
    const draft = structuredClone(newGame());
    enqueueEffect(draft, {
      effect: { kind: 'ADD_TROOPS', territoryId: TERRITORY_IDS.zonaNorte, amount: 2 },
      source: { kind: 'SYSTEM', id: 'teste' },
    });
    expect(draft.effectQueue).toHaveLength(1);

    resolveEffectQueue(draft);
    expect(draft.effectQueue).toHaveLength(0);
    expect(draft.effectHistory[0].status).toBe('RESOLVED');
    expect(validateState(draft)).toEqual([]);
  });

  it('T34 — efeito inválido não quebra a partida', () => {
    const draft = structuredClone(newGame());
    const antes = aliveCount(draft);

    // Efeito declarado no catálogo, mas ainda sem regra.
    enqueueEffect(draft, {
      effect: { kind: 'MODIFY_DICE', playerId: PLAYER_IDS.p1, delta: 2 },
      source: { kind: 'SYSTEM', id: 'futuro' },
      priority: EFFECT_PRIORITY.BLOCK,
    });
    // Efeito com dados impossíveis.
    enqueueEffect(draft, {
      effect: {
        kind: 'MOVE_TROOPS',
        from: 'territorio-que-nao-existe' as TerritoryId,
        to: TERRITORY_IDS.zonaNorte,
        amount: 3,
      },
      source: { kind: 'SYSTEM', id: 'invalido' },
    });
    // Um efeito válido no meio da bagunça precisa ser aplicado mesmo assim.
    enqueueEffect(draft, {
      effect: { kind: 'ADD_TROOPS', territoryId: TERRITORY_IDS.zonaNorte, amount: 2 },
      source: { kind: 'SYSTEM', id: 'valido' },
    });

    const resolution = resolveEffectQueue(draft);
    expect(resolution.failed).toHaveLength(2);
    expect(resolution.resolved.map((e) => e.source.id)).toEqual(['valido']);
    expect(aliveCount(draft)).toBe(antes + 2);
    expect(draft.effectQueue).toHaveLength(0);
    expect(validateState(draft)).toEqual([]);
  });

  it('T35 — múltiplos efeitos não duplicam tropas', () => {
    const draft = structuredClone(newGame());
    const total = aliveCount(draft);
    const origem = TERRITORY_IDS.distritoCentral;
    const destino = TERRITORY_IDS.zonaNorte;

    // Três movimentos encadeados do mesmo grupo de soldados.
    for (let i = 0; i < 3; i += 1) {
      enqueueEffect(draft, {
        effect: { kind: 'MOVE_TROOPS', from: origem, to: destino, amount: 1 },
        source: { kind: 'SYSTEM', id: `mov-${i}` },
      });
    }
    const resolution = resolveEffectQueue(draft);

    // Origem tinha 3: dois movimentos passam, o terceiro é recusado
    // porque esvaziaria o território.
    expect(resolution.resolved).toHaveLength(2);
    expect(resolution.failed).toHaveLength(1);
    expect(aliveCount(draft)).toBe(total);
    expect(garrison(draft, origem)).toBe(1);
    expect(garrison(draft, destino)).toBe(5);
    expect(validateState(draft)).toEqual([]);
  });

  it('a fila tem trava contra efeito que nunca termina', () => {
    const draft = structuredClone(newGame());
    for (let i = 0; i < BALANCE.effects.maxResolutionsPerCycle + 5; i += 1) {
      enqueueEffect(draft, {
        effect: { kind: 'ADD_TROOPS', territoryId: TERRITORY_IDS.zonaNorte, amount: 1 },
        source: { kind: 'SYSTEM', id: `spam-${i}` },
      });
    }
    resolveEffectQueue(draft);
    expect(draft.effectQueue).toHaveLength(0);
    expect(validateState(draft)).toEqual([]);
  });
});

describe('ETAPA 4 — Ferramentas DEV', () => {
  it('desativa e reativa uma habilidade', () => {
    let state = shrinkHumans(newGame(), 3);
    state = must(state, {
      type: 'DEV_SET_ABILITY_ENABLED',
      playerId: PLAYER_IDS.p1,
      abilityId: SOBREVIVENCIA_ID,
      enabled: false,
    });
    state = cycleToHumanTurnStart(state);
    // Desativada: nenhum bônus.
    expect(state.turn.pendingReinforcements).toBe(BALANCE.reinforcements.minimum);
    expect(checkAvailability(state, PLAYER_IDS.p1, SOBREVIVENCIA_ID).available).toBe(false);

    state = must(state, {
      type: 'DEV_SET_ABILITY_ENABLED',
      playerId: PLAYER_IDS.p1,
      abilityId: SOBREVIVENCIA_ID,
      enabled: true,
    });
    state = cycleToHumanTurnStart(state);
    expect(state.turn.pendingReinforcements).toBe(
      BALANCE.reinforcements.minimum + SOBREVIVENCIA.bonusTroops,
    );
  });

  it('restaura cargas e recarga de uma habilidade', () => {
    let state = goToPhase(newGame(), 'MOVIMENTACAO');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.setorMilitar,
      amount: 3,
    });
    state = must(state, {
      type: 'ACTIVATE_ABILITY',
      abilityId: OPERACAO_AEREA_ID,
      params: { from: TERRITORY_IDS.setorMilitar, to: TERRITORY_IDS.zonaSul, amount: 2 },
    });
    expect(getAbilityState(state, PLAYER_IDS.p1, OPERACAO_AEREA_ID)?.chargesRemaining)
      .toBe(AEREA.usesPerGame - 1);

    state = must(state, {
      type: 'DEV_RESET_ABILITY',
      playerId: PLAYER_IDS.p1,
      abilityId: OPERACAO_AEREA_ID,
    });
    const runtime = getAbilityState(state, PLAYER_IDS.p1, OPERACAO_AEREA_ID);
    expect(runtime?.chargesRemaining).toBe(AEREA.usesPerGame);
    expect(runtime?.usesThisTurn).toBe(0);
    expect(runtime?.timesUsed).toBe(0);
  });

  it('limpa a fila de efeitos pendentes', () => {
    const draft = structuredClone(newGame());
    enqueueEffect(draft, {
      effect: { kind: 'ADD_TROOPS', territoryId: TERRITORY_IDS.zonaNorte, amount: 1 },
      source: { kind: 'SYSTEM', id: 'pendente' },
    });
    const antes = aliveCount(draft);
    const removidos = clearEffectQueue(draft);
    expect(removidos).toBe(1);
    expect(draft.effectQueue).toHaveLength(0);
    // Limpar não aplica: nada de tropa nova.
    expect(aliveCount(draft)).toBe(antes);
    expect(draft.effectHistory[0].status).toBe('SKIPPED');
  });

  it('a ação DEV recusa habilidade inexistente sem quebrar', () => {
    const state = newGame();
    expect(
      mustFail(state, {
        type: 'DEV_RESET_ABILITY',
        playerId: PLAYER_IDS.p1,
        abilityId: 'ability.inexistente',
      }),
    ).toMatch(/não encontrada/i);
    assertValid(state, 'após ação DEV inválida');
  });
});

describe('ETAPA 4 — Leituras para a interface', () => {
  it('o painel da facção recebe habilidades com status legível', () => {
    const state = goToPhase(newGame(), 'MOVIMENTACAO');
    const views = abilityViews(state, PLAYER_IDS.p1);
    expect(views).toHaveLength(2);

    const aerea = views.find((v) => v.definition.id === OPERACAO_AEREA_ID);
    expect(aerea?.status).toBe('DISPONIVEL');
    expect(aerea?.chargesRemaining).toBe(AEREA.usesPerGame);

    const sobrevivencia = views.find((v) => v.definition.id === SOBREVIVENCIA_ID);
    // Passiva com 6 territórios: indisponível, e a interface recebe o porquê.
    expect(sobrevivencia?.status).toBe('INDISPONIVEL');
    expect(sobrevivencia?.reason).toMatch(/território/i);
  });

  it('o total de tropas do jogador não muda por causa das habilidades', () => {
    const state = newGame();
    expect(troopsOf(state, PLAYER_IDS.p1)).toBe(18);
    expect(troopsOf(state, PLAYER_IDS.p2)).toBe(18);
  });
});
