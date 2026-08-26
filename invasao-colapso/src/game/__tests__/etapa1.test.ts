import { describe, expect, it } from 'vitest';
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
import { scriptedRng, seededRng } from '../rng/rng';
import { rollDie } from '../combat/dice';
import { SEQUESTRO_CARD_ID } from '../cards/sequestro.card';
import { canUseCard } from '../cards/cardRules';
import { GameRepository } from '../persistence/gameRepository';
import { MemoryStorageAdapter } from '../persistence/storage';
import { handOf, reserveSoldiers } from '../engine/selectors';
import type { SoldierId, TerritoryId } from '../types/ids';
import type { GameState } from '../types/game.types';
import { HUMANOS_ID } from '../factions/humanos';

/** Coloca o jogador 1 sob ataque do jogador 2, para testar a Vacina. */
function setupAttackAgainstHumans(attackers: number): GameState {
  let state = newGame();
  // Passa a vez para o insurgente e vai até a fase de combate.
  state = must(state, { type: 'END_TURN' });
  expect(state.turn.currentPlayerId).toBe(PLAYER_IDS.p2);
  state = must(state, {
    type: 'ADD_SOLDIERS',
    territoryId: TERRITORY_IDS.ruinasLeste,
    amount: 10,
  });
  state = goToPhase(state, 'COMBATE');
  state = must(state, {
    type: 'DECLARE_ATTACK',
    from: TERRITORY_IDS.ruinasLeste,
    to: TERRITORY_IDS.distritoCentral,
    amount: attackers,
  });
  return state;
}

/** Leva o jogador Humano até a fase de AÇÃO, onde o Sequestro é jogável. */
function humansInActionPhase(): GameState {
  return goToPhase(newGame(), 'ACAO');
}

describe('ETAPA 1 — Fundação', () => {
  it('TESTE 01 — cria partida com jogadores, territórios, soldados e cartas', () => {
    const state = newGame();
    assertValid(state, 'partida nova');
    expect(Object.keys(state.players)).toHaveLength(2);
    expect(Object.keys(state.territories)).toHaveLength(12);
    expect(state.turn.number).toBe(1);
    expect(state.turn.phase).toBe('INICIO');
    expect(state.turn.currentPlayerId).toBe(PLAYER_IDS.p1);
    // 6 territórios por jogador x 3 soldados iniciais
    expect(aliveCount(state)).toBe(36);
    // A mão inicial traz o Sequestro (oficial) + cartas de teste do protótipo.
    const hand = handOf(state, PLAYER_IDS.p1);
    expect(hand.some((card) => card.definitionId === SEQUESTRO_CARD_ID)).toBe(true);
  });

  it('TESTE 02 — alterna jogador e mantém a ordem de turno', () => {
    let state = newGame();
    state = must(state, { type: 'END_TURN' });
    expect(state.turn.currentPlayerId).toBe(PLAYER_IDS.p2);
    expect(state.turn.phase).toBe('INICIO');
    state = must(state, { type: 'END_TURN' });
    expect(state.turn.currentPlayerId).toBe(PLAYER_IDS.p1);
    expect(state.turn.number).toBe(2);
  });

  it('TESTE 03 — percorre todas as fases e troca de jogador ao final', () => {
    let state = newGame();
    const seen: string[] = [state.turn.phase];
    for (let i = 0; i < 5; i += 1) {
      state = must(state, { type: 'ADVANCE_PHASE' });
      seen.push(state.turn.phase);
    }
    expect(seen).toEqual(['INICIO', 'REFORCO', 'ACAO', 'COMBATE', 'MOVIMENTACAO', 'FIM']);
    expect(state.turn.currentPlayerId).toBe(PLAYER_IDS.p1);
    state = must(state, { type: 'ADVANCE_PHASE' });
    expect(state.turn.phase).toBe('INICIO');
    expect(state.turn.currentPlayerId).toBe(PLAYER_IDS.p2);
  });

  it('TESTE 04 — adiciona soldados a um território', () => {
    let state = newGame();
    const before = garrison(state, TERRITORY_IDS.distritoCentral);
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 4,
    });
    expect(garrison(state, TERRITORY_IDS.distritoCentral)).toBe(before + 4);
    expect(aliveCount(state)).toBe(40);
    expect(mustFail(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 0,
    })).toMatch(/inválida/i);
  });

  it('TESTE 05 — transfere soldados entre estruturas sem duplicar', () => {
    let state = goToPhase(newGame(), 'MOVIMENTACAO');
    const total = aliveCount(state);
    const fromBefore = garrison(state, TERRITORY_IDS.distritoCentral);
    const toBefore = garrison(state, TERRITORY_IDS.zonaNorte);
    state = must(state, {
      type: 'MOVE_SOLDIERS',
      from: TERRITORY_IDS.distritoCentral,
      to: TERRITORY_IDS.zonaNorte,
      amount: 2,
    });
    expect(garrison(state, TERRITORY_IDS.distritoCentral)).toBe(fromBefore - 2);
    expect(garrison(state, TERRITORY_IDS.zonaNorte)).toBe(toBefore + 2);
    expect(aliveCount(state)).toBe(total);
    // A checagem de integridade prova que nenhum soldado existe em dois lugares.
    expect(validateState(state)).toEqual([]);
  });

  it('TESTE 06 — Sequestro com 1 soldado', () => {
    let state = humansInActionPhase();
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const target = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison[0];
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: [target],
    });
    expect(reserveSoldiers(state, PLAYER_IDS.p1)).toHaveLength(1);
    expect(state.soldiers[target as string].ownerId).toBe(PLAYER_IDS.p1);
  });

  it('TESTE 07 — Sequestro com 7 soldados', () => {
    let state = humansInActionPhase();
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.ruinasLeste,
      amount: 5,
      ownerId: PLAYER_IDS.p2,
    });
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 7);
    expect(targets).toHaveLength(7);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    expect(reserveSoldiers(state, PLAYER_IDS.p1)).toHaveLength(7);
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(1);
  });

  it('TESTE 08 — impede selecionar 8 soldados', () => {
    let state = humansInActionPhase();
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.ruinasLeste,
      amount: 6,
      ownerId: PLAYER_IDS.p2,
    });
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 8);
    expect(targets).toHaveLength(8);
    const error = mustFail(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    expect(error).toMatch(/máximo 7|no máximo 7/i);
    // Nada foi alterado: a carta continua na mão e as tropas no lugar.
    expect(state.players[PLAYER_IDS.p1 as string].handCardIds).toContain(card);
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(9);
  });

  it('TESTE 09 — soldados sequestrados deixam o território inimigo', () => {
    let state = humansInActionPhase();
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const before = garrison(state, TERRITORY_IDS.ruinasLeste);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 2);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    expect(garrison(state, TERRITORY_IDS.ruinasLeste)).toBe(before - 2);
    for (const id of targets) {
      expect(state.territories[TERRITORY_IDS.ruinasLeste as string].garrison).not.toContain(id);
      expect(state.soldiers[id as string].location.kind).toBe('RESERVE');
    }
  });

  it('TESTE 10 — soldados sequestrados passam para a facção Humanos', () => {
    let state = humansInActionPhase();
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 3);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    for (const id of targets) {
      const soldier = state.soldiers[id as string];
      expect(soldier.factionId).toBe(HUMANOS_ID);
      expect(soldier.ownerId).toBe(PLAYER_IDS.p1);
      // A origem é preservada para lore/efeitos futuros.
      expect(soldier.origin.ownerId).toBe(PLAYER_IDS.p2);
    }
    // E podem ser redistribuídos em territórios Humanos.
    state = must(state, {
      type: 'DISTRIBUTE_RESERVES',
      assignments: [
        { territoryId: TERRITORY_IDS.baseOcidental, amount: 2 },
        { territoryId: TERRITORY_IDS.zonaNorte, amount: 1 },
      ],
    });
    expect(reserveSoldiers(state, PLAYER_IDS.p1)).toHaveLength(0);
    expect(garrison(state, TERRITORY_IDS.baseOcidental)).toBe(5);
  });

  it('TESTE 11 — usa Vacina / Contra-Ataque durante um ataque', () => {
    let state = setupAttackAgainstHumans(6);
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
  });

  it('TESTE 12 — o dado sempre cai entre 1 e 6', () => {
    const rng = seededRng(12345);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i += 1) {
      const value = rollDie(6, rng).value;
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    // Extremos do RNG não escapam do intervalo.
    expect(rollDie(6, scriptedRng([0])).value).toBe(1);
    expect(rollDie(6, scriptedRng([0.9999999999])).value).toBe(6);
  });

  it('TESTE 13 — elimina atacantes conforme o resultado do dado', () => {
    const state = setupAttackAgainstHumans(6);
    const before = aliveCount(state);
    const result = run(
      state,
      { type: 'PLAY_CARD', cardInstanceId: firstCardOf(state, PLAYER_IDS.p1), mode: 'ALTERNATE' },
      { rng: scriptedRng([5 / 6]) },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as { diceValue: number; eliminatedCount: number };
    expect(data.diceValue).toBe(6);
    expect(data.eliminatedCount).toBe(6);
    expect(aliveCount(result.state)).toBe(before - 6);
    expect(validateState(result.state)).toEqual([]);
  });

  it('TESTE 14 — atacante com menos tropas que o dado: nunca fica negativo', () => {
    const state = setupAttackAgainstHumans(2);
    const result = run(
      state,
      { type: 'PLAY_CARD', cardInstanceId: firstCardOf(state, PLAYER_IDS.p1), mode: 'ALTERNATE' },
      { rng: scriptedRng([5 / 6]) },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const data = result.data as {
      diceValue: number;
      eliminatedCount: number;
      attackersRemaining: number;
    };
    expect(data.diceValue).toBe(6);
    expect(data.eliminatedCount).toBe(2);
    expect(data.attackersRemaining).toBe(0);
    expect(data.attackersRemaining).toBeGreaterThanOrEqual(0);
    expect(aliveCount(result.state)).toBeGreaterThan(0);
    expect(validateState(result.state)).toEqual([]);
  });

  it('TESTE 15 — Sequestro consome a carta', () => {
    let state = humansInActionPhase();
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 1);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    const instance = state.cards[card as string];
    expect(instance.state).toBe('CONSUMED');
    expect(instance.usesRemaining).toBe(0);
    expect(instance.usedMode).toBe('PRIMARY');
    expect(state.players[PLAYER_IDS.p1 as string].handCardIds).not.toContain(card);
  });

  it('TESTE 16 — Vacina consome a carta', () => {
    const state = setupAttackAgainstHumans(3);
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const result = run(
      state,
      { type: 'PLAY_CARD', cardInstanceId: card, mode: 'ALTERNATE' },
      { rng: scriptedRng([0]) },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const instance = result.state.cards[card as string];
    expect(instance.state).toBe('CONSUMED');
    expect(instance.usedMode).toBe('ALTERNATE');
    expect(result.state.players[PLAYER_IDS.p1 as string].handCardIds).not.toContain(card);
  });

  it('TESTE 17 — os dois efeitos nunca podem ser usados com a mesma carta', () => {
    // A → tenta B
    let state = humansInActionPhase();
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 1);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    expect(canUseCard(state, card, 'ALTERNATE').allowed).toBe(false);
    expect(mustFail(state, { type: 'PLAY_CARD', cardInstanceId: card, mode: 'ALTERNATE' }))
      .toMatch(/consumida/i);

    // B → tenta A
    const defensive = setupAttackAgainstHumans(3);
    const card2 = firstCardOf(defensive, PLAYER_IDS.p1);
    const used = run(
      defensive,
      { type: 'PLAY_CARD', cardInstanceId: card2, mode: 'ALTERNATE' },
      { rng: scriptedRng([0]) },
    );
    expect(used.ok).toBe(true);
    if (!used.ok) return;
    expect(canUseCard(used.state, card2, 'PRIMARY').allowed).toBe(false);
    const enemy = used.state.territories[TERRITORY_IDS.ruinasLeste as string]
      .garrison.slice(0, 1) as SoldierId[];
    expect(
      mustFail(used.state, {
        type: 'PLAY_CARD',
        cardInstanceId: card2,
        mode: 'PRIMARY',
        targetSoldierIds: enemy,
      }),
    ).toMatch(/consumida/i);
  });

  it('TESTE 18 — reseta a partida e limpa o save', () => {
    let state = humansInActionPhase();
    state = must(state, {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.distritoCentral,
      amount: 5,
    });
    const repository = new GameRepository(new MemoryStorageAdapter());
    repository.save(state);
    expect(repository.load()?.counters.soldier).toBe(state.counters.soldier);

    const fresh = must(state, { type: 'NEW_GAME' });
    expect(fresh.turn.number).toBe(1);
    expect(fresh.turn.phase).toBe('INICIO');
    expect(aliveCount(fresh)).toBe(36);
    expect(handOf(fresh, PLAYER_IDS.p1).some((c) => c.definitionId === SEQUESTRO_CARD_ID))
      .toBe(true);

    repository.clear();
    expect(repository.load()).toBeNull();
  });
});

describe('ETAPA 1 — regras de suporte', () => {
  it('persistência: salva e recarrega mantendo integridade', () => {
    const repository = new GameRepository(new MemoryStorageAdapter());
    const state = must(newGame(), {
      type: 'ADD_SOLDIERS',
      territoryId: TERRITORY_IDS.zonaSul,
      amount: 3,
    });
    repository.save(state);
    const loaded = repository.load();
    expect(loaded).not.toBeNull();
    expect(validateState(loaded as GameState)).toEqual([]);
    expect(loaded?.territories[TERRITORY_IDS.zonaSul as string].garrison).toHaveLength(6);
  });

  it('persistência: save corrompido não derruba o jogo', () => {
    const adapter = new MemoryStorageAdapter();
    adapter.write('invasao-colapso:save:v1', '{ isso não é json válido');
    expect(new GameRepository(adapter).load()).toBeNull();
  });

  it('Sequestro fora da fase de AÇÃO é bloqueado', () => {
    const state = newGame(); // fase INICIO
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string]
      .garrison.slice(0, 1) as SoldierId[];
    expect(
      mustFail(state, {
        type: 'PLAY_CARD',
        cardInstanceId: card,
        mode: 'PRIMARY',
        targetSoldierIds: targets,
      }),
    ).toMatch(/fase/i);
  });

  it('Vacina sem ataque declarado é bloqueada', () => {
    const state = humansInActionPhase();
    const card = firstCardOf(state, PLAYER_IDS.p1);
    expect(mustFail(state, { type: 'PLAY_CARD', cardInstanceId: card, mode: 'ALTERNATE' }))
      .toMatch(/ataque/i);
  });

  it('Sequestro não pode capturar soldados do próprio jogador', () => {
    const state = humansInActionPhase();
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const own = state.territories[TERRITORY_IDS.baseOcidental as string]
      .garrison.slice(0, 1) as SoldierId[];
    expect(
      mustFail(state, {
        type: 'PLAY_CARD',
        cardInstanceId: card,
        mode: 'PRIMARY',
        targetSoldierIds: own,
      }),
    ).toMatch(/adversári/i);
  });

  it('a fila de animações recebe eventos das duas cartas', () => {
    let state = humansInActionPhase();
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 2);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    expect(state.animationQueue).toHaveLength(1);
    expect(state.animationQueue[0].specId).toBe('anim.sequestro');
    expect(state.animationQueue[0].payload.capturedSoldierIds).toHaveLength(2);
    state = must(state, { type: 'ACK_ANIMATION', eventId: state.animationQueue[0].id });
    expect(state.animationQueue[0].status).toBe('PLAYED');
  });

  it('carta concedida pelo painel DEV entra na mão utilizável', () => {
    let state = humansInActionPhase();
    const before = state.players[PLAYER_IDS.p1 as string].handCardIds.length;
    state = must(state, {
      type: 'GRANT_CARD',
      playerId: PLAYER_IDS.p1,
      definitionId: SEQUESTRO_CARD_ID,
    });
    expect(state.players[PLAYER_IDS.p1 as string].handCardIds).toHaveLength(before + 1);
    const novo = state.players[PLAYER_IDS.p1 as string].handCardIds[before];
    expect(canUseCard(state, novo, 'PRIMARY').allowed).toBe(true);
  });

  it('reforço: distribuição exige exatamente o total em reserva', () => {
    let state = humansInActionPhase();
    const card = firstCardOf(state, PLAYER_IDS.p1);
    const targets = state.territories[TERRITORY_IDS.ruinasLeste as string].garrison.slice(0, 3);
    state = must(state, {
      type: 'PLAY_CARD',
      cardInstanceId: card,
      mode: 'PRIMARY',
      targetSoldierIds: targets,
    });
    expect(
      mustFail(state, {
        type: 'DISTRIBUTE_RESERVES',
        assignments: [{ territoryId: TERRITORY_IDS.baseOcidental, amount: 2 }],
      }),
    ).toMatch(/exatamente 3/i);
    expect(
      mustFail(state, {
        type: 'DISTRIBUTE_RESERVES',
        assignments: [{ territoryId: TERRITORY_IDS.ruinasLeste as TerritoryId, amount: 3 }],
      }),
    ).toMatch(/não é controlado/i);
  });
});
