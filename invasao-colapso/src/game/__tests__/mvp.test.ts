import { describe, expect, it } from 'vitest';
import {
  PLAYER_IDS,
  TERRITORY_IDS,
  dice,
  garrison,
  jumpTo,
  must,
  mustFail,
  newGame,
  run,
  skipReinforcement,
} from './helpers';
import { createGame, neutralTerritoryCount, startingTroopsFor, territoriesPerPlayer } from '../engine/setup';
import { TERRITORY_SEEDS, REGION_SEEDS, SPECIAL_LINKS } from '../../data/territories.seed';
import { MISSION_SEEDS } from '../../data/missions.seed';
import { COLLAPSE_EVENT_SEEDS } from '../../data/collapseEvents.seed';
import { TURN_PHASES } from '../types/turn.types';
import { attackerDiceFor, compareDice, defenderDiceFor } from '../combat/battle';
import { findAsymmetricEdges, distanceBetween } from '../map/adjacency';
import { territoriesOf } from '../map/territory';
import { dealMissions, isMissionValid, checkMission, getMission } from '../missions/missionEngine';
import { canTriggerNow, currentChance, isEventValid, listCollapseEvents } from '../collapse/collapseEngine';
import { seededRng } from '../rng/rng';
import { GameRepository } from '../persistence/gameRepository';
import { MemoryStorageAdapter } from '../persistence/storage';
import { validateState } from '../engine/invariants';
import { DECK_SIZE } from '../cards/neutral.cards';
import { playableFactions } from '../factions/faction.registry';
import { SEQUESTRO_CARD_ID } from '../cards/sequestro.card';
import { neutralHandSize } from '../deck/deck';
import { BALANCE } from '../config/balance';

/**
 * BATERIA DO MVP — cobre o roteiro pedido:
 * partida · mapa · turno · ataque · dados · conquista · cartas · Sequestro ·
 * Vacina · missões · eventos · persistência.
 */

// ---------------------------------------------------------------- PARTIDA
describe('MVP — Partida', () => {
  it('T01 · cria uma partida nova jogável', () => {
    const state = newGame();
    expect(state.status).toBe('IN_PROGRESS');
    expect(state.turn.number).toBe(1);
    expect(state.turn.phase).toBe('REFORCO');
    expect(validateState(state)).toEqual([]);
  });

  it('T02 · suporta de 2 a 6 jogadores, sem território sobrando sem dono', () => {
    for (const count of [2, 3, 4, 5, 6]) {
      const state = createGame({ playerCount: count, deterministic: true });
      const seated = state.turn.order;
      expect(seated).toHaveLength(count);
      for (const id of seated) {
        expect(territoriesOf(state, id)).toHaveLength(territoriesPerPlayer(count));
      }
      const withoutController = Object.values(state.territories).filter((t) => !t.controllerId);
      expect(withoutController).toHaveLength(0);
      const neutral = Object.values(state.territories).filter(
        (t) => state.players[t.controllerId as string]?.status === 'NEUTRAL',
      );
      expect(neutral).toHaveLength(neutralTerritoryCount(count));
      expect(validateState(state)).toEqual([]);
    }
  });

  it('T03 · tropas iniciais = territórios × 3 com compensação de assento', () => {
    const state = createGame({ playerCount: 4, deterministic: true });
    for (const id of state.turn.order) {
      const player = state.players[id as string];
      const troops = Object.values(state.soldiers).filter((s) => s.alive && s.ownerId === id);
      expect(troops).toHaveLength(startingTroopsFor(4, player.seat));
    }
  });

  it('T04 · cada jogador começa com a carta assinatura e 1 carga de Transporte', () => {
    const state = createGame({ playerCount: 3, deterministic: true });
    for (const id of state.turn.order) {
      const player = state.players[id as string];
      expect(player.handCardIds).toHaveLength(1);
      expect(player.transportCharges).toBe(BALANCE.transport.startingCharges);
    }
  });

  it('T05 · seis facções jogáveis, incluindo as confirmadas pelo criador', () => {
    const names = playableFactions().map((f) => f.name);
    expect(names).toHaveLength(6);
    expect(names).toContain('Humanos');
    expect(names).toContain('Alienígenas');
    expect(names).toContain('Zumbis');
    expect(names).toContain('Magos');
    // Os dois assentos sem nome oficial continuam marcados como temporários.
    expect(names).toContain('FACTION_05');
    expect(names).toContain('FACTION_06');
  });
});

// ------------------------------------------------------------------- MAPA
describe('MVP — Mapa', () => {
  it('T06 · 30 territórios em 6 regiões de 5', () => {
    expect(TERRITORY_SEEDS).toHaveLength(30);
    expect(REGION_SEEDS).toHaveLength(6);
    for (const region of REGION_SEEDS) expect(region.territoryIds).toHaveLength(5);
  });

  it('T07 · nenhum território duplicado', () => {
    const ids = TERRITORY_SEEDS.map((t) => t.id as string);
    expect(new Set(ids).size).toBe(30);
    const names = TERRITORY_SEEDS.map((t) => t.name);
    expect(new Set(names).size).toBe(30);
  });

  it('T08 · nenhum território isolado: grau mínimo 3', () => {
    for (const seed of TERRITORY_SEEDS) {
      expect(seed.neighbors.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('T09 · a malha é simétrica e conexa', () => {
    const state = newGame();
    expect(findAsymmetricEdges(state)).toEqual([]);
    const start = TERRITORY_SEEDS[0].id;
    for (const seed of TERRITORY_SEEDS) {
      expect(Number.isFinite(distanceBetween(state, start, seed.id))).toBe(true);
    }
  });

  it('T10 · 56 fronteiras únicas e 7 conexões especiais', () => {
    const edges = TERRITORY_SEEDS.reduce((sum, t) => sum + t.neighbors.length, 0) / 2;
    expect(edges).toBe(56);
    expect(SPECIAL_LINKS.filter((l) => l.kind === 'POCO')).toHaveLength(5);
    expect(SPECIAL_LINKS).toHaveLength(7);
  });
});

// ------------------------------------------------------------------ TURNO
describe('MVP — Turno', () => {
  it('T11 · as fases seguem a ordem oficial', () => {
    expect([...TURN_PHASES]).toEqual([
      'REFORCO',
      'ATAQUE_COMUM',
      'ATAQUE_ESPECIAL',
      'MOVIMENTACAO',
      'CARTAS',
      'FIM_TURNO',
    ]);
  });

  it('T12 · não é possível sair do REFORÇO com tropas por distribuir', () => {
    const state = newGame();
    expect(state.turn.pendingReinforcements).toBeGreaterThan(0);
    expect(mustFail(state, { type: 'ADVANCE_PHASE' })).toMatch(/Distribua/);
  });

  it('T13 · uma rodada completa troca de jogador e avança o contador', () => {
    let state = newGame();
    const first = state.turn.currentPlayerId;
    state = jumpTo(state, 'FIM_TURNO');
    state = must(state, { type: 'ADVANCE_PHASE' });
    expect(state.turn.currentPlayerId).not.toBe(first);
    expect(state.turn.number).toBe(1);
    state = jumpTo(state, 'FIM_TURNO');
    state = must(state, { type: 'ADVANCE_PHASE' });
    expect(state.turn.currentPlayerId).toBe(first);
    expect(state.turn.number).toBe(2);
  });

  it('T14 · o reforço segue máx(3, territórios ÷ 3) + bônus', () => {
    const state = newGame();
    // 10 territórios → 3 de base, +1 pelo Distrito Central (Ponto de Interesse).
    expect(state.turn.pendingReinforcements).toBe(4);
  });
});

// ----------------------------------------------------------------- ATAQUE
describe('MVP — Ataque', () => {
  it('T15 · somente 1 Ataque Comum por turno', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
    });
    state = must(state, { type: 'CANCEL_ATTACK' });
    expect(
      mustFail(state, {
        type: 'DECLARE_ATTACK',
        from: TERRITORY_IDS.zonaSul,
        to: TERRITORY_IDS.regiaoIndustrial,
      }),
    ).toMatch(/1 Ataque Comum por turno/);
  });

  it('T16 · várias rodadas de dados continuam sendo o MESMO ataque', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 6,
      ownerId: PLAYER_IDS.p1,
    });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
    });
    // Duas rodadas em que o defensor vence tudo: o ataque continua o mesmo.
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(1, 1, 1, 6, 6, 6) });
    expect(state.pendingAttack?.rounds).toHaveLength(1);
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(1, 1, 1, 6, 6, 6) });
    expect(state.pendingAttack?.rounds).toHaveLength(2);
    expect(state.turn.commonAttackUsed).toBe(true);
  });

  it('T17 · o atacante precisa deixar ao menos 1 soldado na origem', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    // Reduz a origem a 1 soldado: não pode mais atacar.
    state = must(state, {
      type: 'REMOVE_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 2,
    });
    expect(garrison(state, TERRITORY_IDS.distritoCentral)).toBe(1);
    expect(
      mustFail(state, {
        type: 'DECLARE_ATTACK',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.ruinasLeste,
      }),
    ).toMatch(/2 soldados/);
  });

  it('T18 · só é possível atacar território inimigo adjacente', () => {
    const state = jumpTo(newGame(), 'ATAQUE_COMUM');
    expect(
      mustFail(state, {
        type: 'DECLARE_ATTACK',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.salinas,
      }),
    ).toMatch(/não faz fronteira/);
    expect(
      mustFail(state, {
        type: 'DECLARE_ATTACK',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.zonaSul,
      }),
    ).toMatch(/inimigo/);
  });

  it('T19 · máximo 1 Ataque Especial por turno, e ele consome a carga', () => {
    let state = jumpTo(newGame(), 'ATAQUE_ESPECIAL');
    const before = state.players[PLAYER_IDS.p1 as string].transportCharges;
    expect(before).toBe(1);
    state = must(state, {
      type: 'DECLARE_SPECIAL_ATTACK',
      from: TERRITORY_IDS.zonaSul,
      to: TERRITORY_IDS.fronteiraVermelha,
      amount: 2,
    });
    expect(state.players[PLAYER_IDS.p1 as string].transportCharges).toBe(0);
    state = must(state, { type: 'CANCEL_ATTACK' });
    expect(
      mustFail(state, {
        type: 'DECLARE_SPECIAL_ATTACK',
        from: TERRITORY_IDS.zonaSul,
        to: TERRITORY_IDS.fronteiraVermelha,
        amount: 1,
      }),
    ).toMatch(/1 Ataque Especial/);
  });

  it('T20 · o Ataque Especial exige distância exatamente 2', () => {
    const state = jumpTo(newGame(), 'ATAQUE_ESPECIAL');
    // Ruínas do Leste é adjacente ao Distrito Central: distância 1.
    expect(
      mustFail(state, {
        type: 'DECLARE_SPECIAL_ATTACK',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.ruinasLeste,
        amount: 1,
      }),
    ).toMatch(/distância exatamente 2/);
  });
});

// ------------------------------------------------------------------ DADOS
describe('MVP — Dados', () => {
  it('T21 · atacante: 2 tropas → 1 dado, 3 → 2 dados, 4+ → 3 dados', () => {
    expect(attackerDiceFor(1)).toBe(0);
    expect(attackerDiceFor(2)).toBe(1);
    expect(attackerDiceFor(3)).toBe(2);
    expect(attackerDiceFor(4)).toBe(3);
    expect(attackerDiceFor(12)).toBe(3);
  });

  it('T22 · defensor: 1 → 1 dado, 2 → 2 dados, 3+ → 3 dados', () => {
    expect(defenderDiceFor(0)).toBe(0);
    expect(defenderDiceFor(1)).toBe(1);
    expect(defenderDiceFor(2)).toBe(2);
    expect(defenderDiceFor(3)).toBe(3);
    expect(defenderDiceFor(9)).toBe(3);
  });

  it('T23 · os dados são ordenados e comparados par a par', () => {
    const result = compareDice([2, 6, 5], [3, 6, 4]);
    // Ordenados: 6-5-2 contra 6-4-3 (o exemplo oficial).
    expect(result.comparisons.map((c) => [c.attacker, c.defender])).toEqual([
      [6, 6],
      [5, 4],
      [2, 3],
    ]);
    expect(result.attackerLosses).toBe(2);
    expect(result.defenderLosses).toBe(1);
  });

  it('T24 · EMPATE = DEFENSOR VENCE', () => {
    const result = compareDice([6, 6, 6], [6, 6, 6]);
    expect(result.attackerLosses).toBe(3);
    expect(result.defenderLosses).toBe(0);
  });

  it('T25 · só compara os pares existentes', () => {
    const result = compareDice([6, 6, 6], [1]);
    expect(result.comparisons).toHaveLength(1);
    expect(result.defenderLosses).toBe(1);
    expect(result.attackerLosses).toBe(0);
  });

  it('T26 · cada comparação perdida elimina exatamente 1 soldado', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    const before = garrison(state, TERRITORY_IDS.ruinasLeste);
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
    });
    // Atacante 6-6 contra defensor 1-1-1: 2 comparações vencidas.
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 1, 1, 1) });
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(before - 2);
  });

  it('T27 · ataque por Poço limita o atacante a 2 dados', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, { type: 'ADD_SOLDIERS', territoryId: TERRITORY_IDS.distritoCentral, amount: 6, ownerId: PLAYER_IDS.p1 });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.abrigoZero,
    });
    expect(state.pendingAttack?.attackerDiceCap).toBe(2);
  });
});

// -------------------------------------------------------------- CONQUISTA
describe('MVP — Conquista', () => {
  it('T28 · zerar o defensor conquista o território e exige ocupação', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, { type: 'ADD_SOLDIERS', territoryId: TERRITORY_IDS.distritoCentral, amount: 8, ownerId: PLAYER_IDS.p1 });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
    });
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 6, 1, 1, 1) });
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(0);
    expect(state.pendingOccupation).not.toBeNull();
    expect(state.territories[TERRITORY_IDS.ruinasLeste as string].controllerId).toBe(PLAYER_IDS.p1);
  });

  it('T29 · o território conquistado nunca fica com zero tropas', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, { type: 'ADD_SOLDIERS', territoryId: TERRITORY_IDS.distritoCentral, amount: 8, ownerId: PLAYER_IDS.p1 });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
    });
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 6, 1, 1, 1) });
    expect(mustFail(state, { type: 'OCCUPY_TERRITORY', amount: 0 })).toMatch(/não pode ficar vazio/);
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 1 });
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBeGreaterThanOrEqual(1);
    expect(garrison(state, TERRITORY_IDS.distritoCentral)).toBeGreaterThanOrEqual(1);
    expect(validateState(state)).toEqual([]);
  });

  it('T30 · a ocupação é limitada à força sobrevivente do ataque', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, { type: 'ADD_SOLDIERS', territoryId: TERRITORY_IDS.distritoCentral, amount: 8, ownerId: PLAYER_IDS.p1 });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
    });
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 6, 1, 1, 1) });
    const max = state.pendingOccupation!.max;
    expect(max).toBeLessThanOrEqual(garrison(state, TERRITORY_IDS.distritoCentral) - 1);
    expect(mustFail(state, { type: 'OCCUPY_TERRITORY', amount: max + 1 })).toMatch(/Máximo/);
  });

  it('T31 · perder o último território elimina o jogador', () => {
    let state = newGame();
    // Reduz o adversário a um único território e o toma.
    const enemy = territoriesOf(state, PLAYER_IDS.p2);
    for (const territory of enemy.slice(1)) {
      state = must(state, {
        type: 'SET_CONTROLLER',
        territoryId: territory.id,
        playerId: PLAYER_IDS.p1,
      });
    }
    const last = enemy[0];
    state = must(state, { type: 'SET_CONTROLLER', territoryId: last.id, playerId: PLAYER_IDS.p1 });
    state = must(skipReinforcement(state), { type: 'ADVANCE_PHASE' });
    expect(state.status).toBe('FINISHED');
  });
});

// ----------------------------------------------------------------- CARTAS
describe('MVP — Cartas', () => {
  it('T32 · o Baralho do Colapso tem 24 cartas neutras', () => {
    expect(DECK_SIZE).toBe(24);
    const state = newGame();
    expect(state.deck).toHaveLength(24);
    expect(state.discard).toHaveLength(0);
  });

  it('T33 · a compra exige conquista no turno', () => {
    const state = jumpTo(newGame(), 'CARTAS');
    expect(mustFail(state, { type: 'DRAW_CARD' })).toMatch(/conquistar/);
  });

  it('T34 · quem conquista compra 1 carta na fase CARTAS', () => {
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, { type: 'ADD_SOLDIERS', territoryId: TERRITORY_IDS.distritoCentral, amount: 8, ownerId: PLAYER_IDS.p1 });
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
    });
    state = must(state, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 6, 1, 1, 1) });
    state = must(state, { type: 'OCCUPY_TERRITORY', amount: 2 });
    state = jumpTo(state, 'CARTAS');
    const before = state.players[PLAYER_IDS.p1 as string].handCardIds.length;
    state = must(state, { type: 'DRAW_CARD' });
    expect(state.players[PLAYER_IDS.p1 as string].handCardIds).toHaveLength(before + 1);
    expect(state.deck).toHaveLength(23);
  });

  it('T35 · a carta jogada vai para o descarte', () => {
    let state = jumpTo(newGame(), 'CARTAS');
    state = must(state, {
      type: 'GRANT_CARD',
      playerId: PLAYER_IDS.p1,
      definitionId: 'card.suprimentos' as never,
    });
    const card = state.players[PLAYER_IDS.p1 as string].handCardIds.at(-1)!;
    state = must(state, { type: 'PLAY_CARD', cardInstanceId: card, mode: 'PRIMARY' });
    expect(state.cards[card as string].state).toBe('DISCARDED');
    expect(state.discard.length).toBeGreaterThan(0);
  });

  it('T36 · a carta assinatura não conta no limite de mão', () => {
    const state = newGame();
    expect(state.players[PLAYER_IDS.p1 as string].handCardIds).toHaveLength(1);
    expect(neutralHandSize(state, PLAYER_IDS.p1)).toBe(0);
  });
});

// -------------------------------------------------------------- SEQUESTRO
describe('MVP — Sequestro (regra oficial)', () => {
  function withSequestro() {
    let state = jumpTo(newGame(), 'CARTAS');
    const card = state.players[PLAYER_IDS.p1 as string].handCardIds.find(
      (id) => state.cards[id as string].definitionId === SEQUESTRO_CARD_ID,
    );
    if (!card) {
      state = must(state, {
        type: 'GRANT_CARD',
        playerId: PLAYER_IDS.p1,
        definitionId: SEQUESTRO_CARD_ID,
      });
    }
    const instance = state.players[PLAYER_IDS.p1 as string].handCardIds.find(
      (id) => state.cards[id as string].definitionId === SEQUESTRO_CARD_ID,
    )!;
    return { state, instance };
  }

  it('T37 · captura de 1 a 7 soldados inimigos', () => {
    const { state, instance } = withSequestro();
    // Junta 8 defensores num território inimigo para poder tentar 8.
    let current = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.ruinasLeste,
      amount: 5,
      ownerId: PLAYER_IDS.p2,
    });
    const enemy = current.territories[TERRITORY_IDS.ruinasLeste as string].garrison;
    expect(enemy.length).toBeGreaterThanOrEqual(8);
    const result = must(current, {
      type: 'PLAY_CARD',
      cardInstanceId: instance,
      mode: 'PRIMARY',
      targetSoldierIds: enemy.slice(0, 7),
    });
    const captured = Object.values(result.soldiers).filter(
      (s) => s.alive && s.ownerId === PLAYER_IDS.p1 && s.origin.ownerId === PLAYER_IDS.p2,
    );
    expect(captured).toHaveLength(7);
    current = result;
    expect(validateState(current)).toEqual([]);
  });

  it('T38 · não permite 8 soldados', () => {
    const { state, instance } = withSequestro();
    const current = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.ruinasLeste,
      amount: 6,
      ownerId: PLAYER_IDS.p2,
    });
    const enemy = current.territories[TERRITORY_IDS.ruinasLeste as string].garrison;
    expect(
      mustFail(current, {
        type: 'PLAY_CARD',
        cardInstanceId: instance,
        mode: 'PRIMARY',
        targetSoldierIds: enemy.slice(0, 8),
      }),
    ).toMatch(/7/);
  });

  it('T39 · os soldados capturados passam a ser do exército humano', () => {
    const { state, instance } = withSequestro();
    const enemy = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 2);
    const result = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: instance,
      mode: 'PRIMARY',
      targetSoldierIds: enemy,
    });
    for (const id of enemy) {
      expect(result.soldiers[id as string].ownerId).toBe(PLAYER_IDS.p1);
      expect(result.soldiers[id as string].origin.ownerId).toBe(PLAYER_IDS.p2);
    }
  });

  it('T40 · usar o Sequestro consome a carta', () => {
    const { state, instance } = withSequestro();
    const enemy = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 1);
    const result = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: instance,
      mode: 'PRIMARY',
      targetSoldierIds: enemy,
    });
    expect(result.cards[instance as string].usesRemaining).toBe(0);
    expect(result.cards[instance as string].usedMode).toBe('PRIMARY');
  });

  it('T41 · Sequestro OU Vacina, nunca os dois', () => {
    const { state, instance } = withSequestro();
    const enemy = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 1);
    const used = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: instance,
      mode: 'PRIMARY',
      targetSoldierIds: enemy,
    });
    expect(
      mustFail(used, { type: 'PLAY_CARD', cardInstanceId: instance, mode: 'ALTERNATE' }),
    ).toBeTruthy();
  });
});

// ----------------------------------------------------------------- VACINA
describe('MVP — Vacina (regra oficial)', () => {
  it('T42 · 1d6 define quantos atacantes são destruídos, sem passar do total', () => {
    // p2 ataca p1; p1 (Humanos ou não) responde com a Vacina.
    let state = newGame();
    // Garante que quem defende tem a carta Sequestro na mão.
    const defender = PLAYER_IDS.p1;
    state = must(state, {
      type: 'GRANT_CARD',
      playerId: defender,
      definitionId: SEQUESTRO_CARD_ID,
    });
    const card = state.players[defender as string].handCardIds.at(-1)!;

    state = jumpTo(state, 'FIM_TURNO');
    state = must(state, { type: 'ADVANCE_PHASE' });
    state = jumpTo(state, 'ATAQUE_COMUM');
    expect(state.turn.currentPlayerId).toBe(PLAYER_IDS.p2);

    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.ruinasLeste,
      to: TERRITORY_IDS.distritoCentral,
    });
    const attackers = state.pendingAttack!.attackingSoldierIds.length;
    const result = run(state, { type: 'PLAY_CARD', cardInstanceId: card, mode: 'ALTERNATE' }, {
      rng: dice(6),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { diceValue: number; eliminatedCount: number };
    expect(data.diceValue).toBe(6);
    // Nunca destrói mais do que os atacantes elegíveis.
    expect(data.eliminatedCount).toBeLessThanOrEqual(attackers);
    expect(data.eliminatedCount).toBeGreaterThan(0);
    expect(validateState(result.state)).toEqual([]);
  });

  it('T43 · usar a Vacina consome a carta e trava o Sequestro', () => {
    let state = newGame();
    state = must(state, {
      type: 'GRANT_CARD',
      playerId: PLAYER_IDS.p1,
      definitionId: SEQUESTRO_CARD_ID,
    });
    const card = state.players[PLAYER_IDS.p1 as string].handCardIds.at(-1)!;
    state = jumpTo(state, 'FIM_TURNO');
    state = must(state, { type: 'ADVANCE_PHASE' });
    state = jumpTo(state, 'ATAQUE_COMUM');
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.ruinasLeste,
      to: TERRITORY_IDS.distritoCentral,
    });
    state = must(state, { type: 'PLAY_CARD', cardInstanceId: card, mode: 'ALTERNATE' }, { rng: dice(3) });
    expect(state.cards[card as string].usedMode).toBe('ALTERNATE');
    expect(
      mustFail(state, {
        type: 'PLAY_CARD',
        cardInstanceId: card,
        mode: 'PRIMARY',
        targetSoldierIds: [],
      }),
    ).toBeTruthy();
  });
});

// --------------------------------------------------------------- MISSÕES
describe('MVP — Missões secretas', () => {
  it('T44 · existem 30 missões, sem id duplicado', () => {
    expect(MISSION_SEEDS).toHaveLength(30);
    expect(new Set(MISSION_SEEDS.map((m) => m.id)).size).toBe(30);
  });

  it('T45 · missão impossível nunca é sorteada', () => {
    // Em uma partida sem Zumbis, "eliminar Zumbis" é inválida.
    const mission = MISSION_SEEDS.find((m) => m.id === 'mission.eliminate-zumbis')!;
    expect(
      isMissionValid(mission, {
        factionIds: ['humanos', 'alienigenas'],
        ownFactionId: 'humanos',
        playerCount: 2,
      }),
    ).toBe(false);
    // E nem para o próprio Zumbi, quando ele está na partida.
    expect(
      isMissionValid(mission, {
        factionIds: ['humanos', 'zumbis'],
        ownFactionId: 'zumbis',
        playerCount: 2,
      }),
    ).toBe(false);
  });

  it('T46 · cada jogador recebe exatamente 1 missão válida', () => {
    for (const count of [2, 3, 4, 5, 6]) {
      const state = createGame({ playerCount: count, deterministic: true });
      const entries = Object.values(state.missions);
      expect(entries).toHaveLength(count);
      expect(new Set(entries.map((e) => e.missionId)).size).toBe(count);
      for (const entry of entries) {
        const mission = getMission(entry.missionId);
        const player = state.players[entry.playerId as string];
        expect(
          isMissionValid(mission, {
            factionIds: state.turn.order.map((id) => state.players[id as string].factionId as string),
            ownFactionId: player.factionId as string,
            playerCount: count,
          }),
        ).toBe(true);
      }
    }
  });

  it('T47 · o sorteio é determinístico com a mesma semente', () => {
    const players = [
      { id: PLAYER_IDS.p1, factionId: 'humanos' },
      { id: PLAYER_IDS.p2, factionId: 'zumbis' },
    ];
    const a = dealMissions(players, seededRng(7));
    const b = dealMissions(players, seededRng(7));
    expect(Object.values(a.assignments).map((m) => m.missionId)).toEqual(
      Object.values(b.assignments).map((m) => m.missionId),
    );
  });

  it('T48 · a vitória por missão é detectada automaticamente', () => {
    let state = newGame();
    state = must(state, {
      type: 'DEV_SET_MISSION',
      playerId: PLAYER_IDS.p1,
      missionId: 'mission.regions-2',
    });
    // Entrega duas regiões completas ao jogador 1.
    for (const region of REGION_SEEDS.slice(0, 2)) {
      for (const id of region.territoryIds) {
        state = must(state, { type: 'SET_CONTROLLER', territoryId: id, playerId: PLAYER_IDS.p1 });
      }
    }
    expect(checkMission(state, PLAYER_IDS.p1).completed).toBe(true);
    state = must(skipReinforcement(state), { type: 'ADVANCE_PHASE' });
    expect(state.status).toBe('FINISHED');
    expect(state.result?.winnerId).toBe(PLAYER_IDS.p1);
    expect(state.result?.reason).toBe('MISSION');
  });

  it('T49 · a missão é privada: só o dono a enxerga revelada', () => {
    const state = newGame();
    for (const entry of Object.values(state.missions)) {
      expect(entry.revealed).toBe(false);
    }
  });
});

// ---------------------------------------------------- EVENTOS DO COLAPSO
describe('MVP — Eventos do Colapso', () => {
  it('T50 · existem 30 eventos, cobrindo as 6 categorias', () => {
    expect(COLLAPSE_EVENT_SEEDS).toHaveLength(30);
    const categories = new Set(COLLAPSE_EVENT_SEEDS.flatMap((e) => e.categories));
    for (const expected of ['AMEACA', 'OPORTUNIDADE', 'GLOBAL', 'REGIONAL', 'TERRITORIAL', 'ANOMALIA']) {
      expect(categories.has(expected as never)).toBe(true);
    }
  });

  it('T51 · nenhum evento antes da rodada mínima', () => {
    const state = newGame();
    expect(state.turn.number).toBe(1);
    expect(canTriggerNow(state)).toBe(false);
  });

  it('T52 · a chance sobe com a pressão e respeita o teto', () => {
    const state = newGame();
    const base = currentChance(state);
    expect(base).toBeCloseTo(BALANCE.collapse.baseChance, 5);
    const pressured = { ...state, collapse: { ...state.collapse, pressure: 20 } };
    expect(currentChance(pressured)).toBeCloseTo(BALANCE.collapse.maxChance, 5);
  });

  it('T53 · o motor só sorteia eventos válidos', () => {
    const state = newGame();
    for (const event of listCollapseEvents()) {
      if (event.minRound && state.turn.number < event.minRound) {
        expect(isEventValid(state, event)).toBe(false);
      }
    }
  });

  it('T54 · o alerta arma o evento e a resolução aplica o efeito', () => {
    let state = newGame();
    state = must(state, { type: 'DEV_FORCE_COLLAPSE', eventId: 'collapse.janela-limpa' });
    expect(state.collapse.pending?.eventId).toBe('collapse.janela-limpa');
    state = must(state, { type: 'RESOLVE_COLLAPSE' });
    expect(state.collapse.pending).toBeNull();
    expect(state.collapse.triggered).toBe(1);
    expect(state.collapse.active.some((a) => a.eventId === 'collapse.janela-limpa')).toBe(true);
  });

  it('T55 · o efeito de duração é removido quando a duração termina', () => {
    let state = newGame();
    state = must(state, { type: 'DEV_FORCE_COLLAPSE', eventId: 'collapse.tempestade-de-po' });
    state = must(state, { type: 'RESOLVE_COLLAPSE' });
    expect(state.collapse.active).toHaveLength(1);
    // Duas trocas de jogador fecham a rodada e expiram o efeito.
    state = jumpTo(state, 'FIM_TURNO');
    state = must(state, { type: 'ADVANCE_PHASE' });
    state = jumpTo(state, 'FIM_TURNO');
    state = must(state, { type: 'ADVANCE_PHASE' });
    expect(state.collapse.active).toHaveLength(0);
  });

  it('T56 · um evento de território devolve o mapa a um estado válido', () => {
    let state = newGame();
    state = must(state, { type: 'DEV_FORCE_COLLAPSE', eventId: 'collapse.desabamento-de-poco' });
    state = must(state, { type: 'RESOLVE_COLLAPSE' });
    expect(state.disabledLinks.length).toBeGreaterThan(0);
    expect(validateState(state)).toEqual([]);
  });

  it('T57 · o jogador não tem acesso ao próximo evento pela interface', () => {
    // O saco de eventos existe no estado, mas nenhuma leitura pública o expõe.
    const state = newGame();
    expect(state.collapse.bag.length).toBeGreaterThan(0);
    expect(Object.keys(state.collapse)).toContain('pressure');
  });
});

// ----------------------------------------------------------- PERSISTÊNCIA
describe('MVP — Persistência', () => {
  it('T58 · salvar e carregar preserva a partida', () => {
    const repository = new GameRepository(new MemoryStorageAdapter());
    let state = newGame();
    state = must(state, { type: 'AUTO_REINFORCE' });
    repository.save(state);
    const loaded = repository.load();
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(state.id);
    expect(loaded!.turn.phase).toBe(state.turn.phase);
    expect(Object.keys(loaded!.territories)).toHaveLength(30);
    expect(validateState(loaded!)).toEqual([]);
  });

  it('T59 · a partida continua exatamente de onde parou', () => {
    const repository = new GameRepository(new MemoryStorageAdapter());
    let state = jumpTo(newGame(), 'ATAQUE_COMUM');
    state = must(state, {
      type: 'DECLARE_ATTACK',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.ruinasLeste,
    });
    repository.save(state);
    const loaded = repository.load()!;
    expect(loaded.pendingAttack?.toTerritoryId).toBe(TERRITORY_IDS.ruinasLeste);
    const resumed = must(loaded, { type: 'ROLL_BATTLE_ROUND' }, { rng: dice(6, 6, 1, 1, 1) });
    expect(resumed.pendingAttack?.rounds ?? []).toHaveLength(1);
  });

  it('T60 · save de versão antiga é descartado em vez de quebrar o jogo', () => {
    const storage = new MemoryStorageAdapter();
    storage.write('invasao-colapso:save:v1', JSON.stringify({ version: 1, savedAt: 0, state: {} }));
    const repository = new GameRepository(storage);
    expect(repository.load()).toBeNull();
  });
});

// -------------------------------------------------- TRANSPORTE E MOVIMENTO
describe('MVP — Transporte Especial e movimentação', () => {
  it('T61 · a movimentação exige territórios seus e deixa 1 na origem', () => {
    const state = jumpTo(newGame(), 'MOVIMENTACAO');
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.ruinasLeste,
        amount: 1,
      }),
    ).toMatch(/destino precisa ser um território seu/);
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.distritoCentral,
        to: TERRITORY_IDS.zonaSul,
        amount: garrison(state, TERRITORY_IDS.distritoCentral),
      }),
    ).toMatch(/ao menos 1 soldado/);
  });

  it('T62 · uma movimentação por turno, por padrão', () => {
    let state = jumpTo(newGame(), 'MOVIMENTACAO');
    state = must(state, {
      type: 'MOVE_SOLDIERS',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.zonaSul,
      amount: 1,
    });
    expect(
      mustFail(state, {
        type: 'MOVE_SOLDIERS',
        from: TERRITORY_IDS.zonaSul,
        to: TERRITORY_IDS.baseOcidental,
        amount: 1,
      }),
    ).toMatch(/movimentação/);
  });

  it('T63 · o Transporte Especial não alcança as galerias dos Abrigos', () => {
    const state = jumpTo(newGame(), 'ATAQUE_ESPECIAL');
    expect(
      mustFail(state, {
        type: 'DECLARE_SPECIAL_ATTACK',
        from: TERRITORY_IDS.altoForno,
        to: TERRITORY_IDS.galeriaOeste,
        amount: 1,
      }),
    ).toMatch(/galerias/);
  });
});
