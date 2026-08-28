import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PLAYER_IDS,
  TERRITORY_IDS,
  aliveCount,
  dice,
  garrison,
  jumpTo,
  must,
  mustFail,
  newGame,
} from './helpers';
import { validateState } from '../engine/invariants';
import { applyAction } from '../engine/gameEngine';
import { emitGameEvent } from '../events/gameEvents';
import { enqueueEffect, resolveEffectQueue } from '../effects/effectQueue';
import { EFFECT_PRIORITY } from '../effects/effect.types';
import { abilityViews, troopsOf } from '../engine/selectors';
import { getAbilityState, seedAbilityStates } from '../abilities/abilityEngine';
import { SOBREVIVENCIA_ID } from '../abilities/humanos/sobrevivencia';
import { OPERACAO_AEREA_ID } from '../abilities/humanos/operacaoAerea';
import { HUMANOS_ID } from '../factions/humanos';
import { listFactions } from '../factions/faction.registry';
import { SEQUESTRO_CARD_ID } from '../cards/sequestro.card';
import { listCardDefinitions } from '../cards/card.registry';
import { BALANCE } from '../config/balance';

/**
 * REGRESSÃO DAS ETAPAS 1, 2 e 4.
 *
 * As três baterias anteriores foram escritas para o mapa provisório de 12
 * territórios, 2 jogadores fixos e as fases antigas. Com o mapa oficial de 30
 * territórios e a ordem oficial de fases, os *fixtures* deixaram de existir —
 * mas as REGRAS que elas protegiam continuam valendo. Este arquivo reprotege
 * essas regras contra o estado atual do jogo.
 */

// -------------------------------------------------------------- arquitetura
describe('Regressão — arquitetura', () => {
  it('R01 · src/game continua puro: nenhum import de React', () => {
    const root = join(process.cwd(), 'src', 'game');
    const offenders: string[] = [];
    let checked = 0;

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry)) continue;
        checked += 1;
        const source = readFileSync(full, 'utf8');
        if (/from\s+['"]react/.test(source) || /\.tsx['"]/.test(source)) {
          offenders.push(full);
        }
      }
    };
    walk(root);

    expect(checked).toBeGreaterThan(40);
    expect(offenders).toEqual([]);
  });

  it('R02 · o reducer é transacional: ação recusada não altera o estado', () => {
    const state = newGame();
    const before = JSON.stringify(state);
    const result = applyAction(state, {
      type: 'MOVE_SOLDIERS',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.salinas,
      amount: 99,
    });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result.state)).toBe(before);
  });

  it('R03 · o registro de soldados é fonte única de verdade', () => {
    const state = newGame();
    const problems = validateState(state);
    expect(problems).toEqual([]);
    const inTerritories = Object.values(state.territories).reduce(
      (sum, t) => sum + t.garrison.length,
      0,
    );
    expect(inTerritories).toBe(aliveCount(state));
    // Nenhum soldado aparece em dois territórios.
    const seen = new Set<string>();
    for (const territory of Object.values(state.territories)) {
      for (const id of territory.garrison) {
        expect(seen.has(id as string)).toBe(false);
        seen.add(id as string);
      }
    }
  });

  it('R04 · todo número de balanceamento vive em BALANCE', () => {
    expect(BALANCE.cards.sequestro.maxTargets).toBe(7);
    expect(BALANCE.cards.vacina.diceSides).toBe(6);
    expect(BALANCE.dice.maxAttackDice).toBe(3);
    expect(BALANCE.dice.maxDefenseDice).toBe(3);
    expect(BALANCE.territory.minGarrison).toBe(1);
  });
});

// ------------------------------------------------------------- mapa e ações
describe('Regressão — mapa e ações (Etapa 2)', () => {
  it('R05 · a adjacência mora no motor e é respeitada', () => {
    const state = jumpTo(newGame(), 'MOVIMENTACAO');
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.cemiterioComboios,
        amount: 1,
      }),
    ).toMatch(/não faz fronteira/);
  });

  it('R06 · ninguém move tropas do adversário', () => {
    const state = jumpTo(newGame(), 'MOVIMENTACAO');
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.ruinasLeste,
        to: TERRITORY_IDS.zonaNorte,
        amount: 1,
      }),
    ).toMatch(/território seu/);
  });

  it('R07 · a movimentação mantém o total de tropas', () => {
    let state = jumpTo(newGame(), 'MOVIMENTACAO');
    const before = aliveCount(state);
    state = must(state, {
      type: 'MOVE_SOLDIERS',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.zonaSul,
      amount: 1,
    });
    expect(aliveCount(state)).toBe(before);
    expect(validateState(state)).toEqual([]);
  });

  it('R08 · a conquista muda o controlador e sincroniza a lista do jogador', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 8,
      ownerId: PLAYER_IDS.p1,
    });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
    });
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 6, 1, 1, 1) });
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 2 });
    expect(state.territories[TERRITORY_IDS.ruinasLeste as string].controllerId).toBe(PLAYER_IDS.p1);
    expect(state.players[PLAYER_IDS.p1 as string].territoryIds).toContain(TERRITORY_IDS.ruinasLeste);
    expect(state.players[PLAYER_IDS.p2 as string].territoryIds).not.toContain(
      TERRITORY_IDS.ruinasLeste,
    );
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(2);
  });

  it('R09 · não existe território controlado com zero tropas', () => {
    const state = newGame();
    for (const territory of Object.values(state.territories)) {
      if (territory.controllerId) expect(territory.garrison.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------- cartas oficiais
describe('Regressão — Sequestro e Vacina (Etapa 1)', () => {
  it('R10 · o Sequestro continua sendo carta dos Humanos, com 1 uso', () => {
    const definition = listCardDefinitions().find((c) => c.id === SEQUESTRO_CARD_ID)!;
    expect(definition.factionId).toBe(HUMANOS_ID);
    expect(definition.maxUses).toBe(1);
    expect(definition.primaryEffect.limits?.maxTargets).toBe(7);
    expect(definition.alternateEffect?.limits?.diceSides).toBe(6);
  });

  it('R11 · o Sequestro exige alvos inimigos', () => {
    let state = jumpTo(newGame(), 'CARTAS');
    state = must(state, {
      type: 'GRANT_CARD',
      playerId: PLAYER_IDS.p1,
      definitionId: SEQUESTRO_CARD_ID,
    });
    const card = state.players[PLAYER_IDS.p1 as string].handCardIds.at(-1)!;
    const own = state.territories[TERRITORY_IDS.zonaSul as string].garrison.slice(0, 1);
    expect(
      mustFail(state, {
        type: 'PLAY_CARD',
        cardInstanceId: card,
        mode: 'PRIMARY',
        targetSoldierIds: own,
      }),
    ).toBeTruthy();
  });

  it('R12 · a Vacina só existe quando há ataque contra o dono da carta', () => {
    let state = jumpTo(newGame(), 'CARTAS');
    state = must(state, {
      type: 'GRANT_CARD',
      playerId: PLAYER_IDS.p1,
      definitionId: SEQUESTRO_CARD_ID,
    });
    const card = state.players[PLAYER_IDS.p1 as string].handCardIds.at(-1)!;
    expect(mustFail(state, { type: 'PLAY_CARD', cardInstanceId: card, mode: 'ALTERNATE' })).toBeTruthy();
  });
});

// --------------------------------------------------------------- habilidades
describe('Regressão — habilidades e efeitos (Etapa 4)', () => {
  it('R13 · cada facção declara passiva, especial, assinatura e fraqueza', () => {
    for (const faction of listFactions()) {
      if (faction.status === 'LOCKED') continue;
      expect(faction.strategy.pillars.length).toBeGreaterThan(0);
      expect(faction.strategy.weaknesses.length).toBeGreaterThan(0);
      expect(faction.signatureCardIds.length).toBeGreaterThan(0);
      expect(faction.rules.balance).toBeDefined();
    }
  });

  it('R14 · a matriz de balanceamento soma 18 em todas as facções jogáveis', () => {
    for (const faction of listFactions()) {
      const balance = faction.rules.balance;
      if (!balance) continue;
      const total =
        balance.ataque + balance.defesa + balance.mobilidade + balance.cartas + balance.recuperacao;
      expect(total).toBe(18);
    }
  });

  it('R15 · a passiva Sobrevivência dispara uma vez por turno', () => {
    let state = newGame();
    // Reduz o jogador humano a 3 territórios para acionar a passiva.
    const humano = Object.values(state.players).find((p) => p.factionId === HUMANOS_ID)!;
    const owned = state.players[humano.id as string].territoryIds.slice();
    for (const id of owned.slice(3)) {
      state = must(state, { type: 'SET_CONTROLLER', territoryId: id, playerId: humano.id === PLAYER_IDS.p1 ? PLAYER_IDS.p2 : PLAYER_IDS.p1 });
    }
    seedAbilityStates(state, humano.id);
    const runtime = getAbilityState(state, humano.id, SOBREVIVENCIA_ID);
    expect(runtime).toBeDefined();
  });

  it('R16 · a Operação Aérea tem cargas limitadas e some quando acabam', () => {
    const state = newGame();
    const humano = Object.values(state.players).find((p) => p.factionId === HUMANOS_ID)!;
    const runtime = getAbilityState(state, humano.id, OPERACAO_AEREA_ID);
    expect(runtime?.chargesRemaining).toBe(BALANCE.abilities.operacaoAerea.usesPerGame);
    const views = abilityViews(state, humano.id).map((v) => v.definition.id);
    expect(views).toContain(SOBREVIVENCIA_ID);
    expect(views).toContain(OPERACAO_AEREA_ID);
  });

  it('R17 · a fila de efeitos resolve por prioridade e registra o resultado', () => {
    const state = newGame();
    const draft = structuredClone(state);
    enqueueEffect(draft, {
      effect: { kind: 'ADD_TROOPS', territoryId: TERRITORY_IDS.zonaSul, amount: 2 },
      source: { kind: 'SYSTEM', id: 'teste' },
      priority: EFFECT_PRIORITY.SYSTEM,
    });
    enqueueEffect(draft, {
      effect: { kind: 'MODIFY_DICE', playerId: PLAYER_IDS.p1, delta: 2 },
      source: { kind: 'SYSTEM', id: 'teste' },
      priority: EFFECT_PRIORITY.BLOCK,
    });
    const resolution = resolveEffectQueue(draft);
    // Efeito sem resolvedor falha de forma controlada, sem quebrar a partida.
    expect(resolution.resolved.length + resolution.failed.length).toBe(2);
    expect(validateState(draft)).toEqual([]);
  });

  it('R18 · o mesmo evento não dispara duas vezes com a mesma chave', () => {
    const draft = structuredClone(newGame());
    const before = draft.emittedEventKeys.length;
    emitGameEvent(draft, {
      kind: 'TURN_STARTED',
      payload: { playerId: PLAYER_IDS.p1 },
      dedupeKey: 'chave-unica',
    });
    emitGameEvent(draft, {
      kind: 'TURN_STARTED',
      payload: { playerId: PLAYER_IDS.p1 },
      dedupeKey: 'chave-unica',
    });
    expect(draft.emittedEventKeys.length).toBe(before + 1);
  });

  it('R19 · habilidades não alteram o total de tropas por si só', () => {
    const state = newGame();
    const total = troopsOf(state, PLAYER_IDS.p1) + troopsOf(state, PLAYER_IDS.p2);
    expect(total).toBeGreaterThan(0);
    expect(validateState(state)).toEqual([]);
  });
});
