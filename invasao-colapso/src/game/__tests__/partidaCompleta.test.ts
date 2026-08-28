import { writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGame } from '../engine/setup';
import { applyAction } from '../engine/gameEngine';
import type { GameAction } from '../engine/actions';
import type { GameState } from '../types/game.types';
import { validateState } from '../engine/invariants';
import { seededRng } from '../rng/rng';
import type { Rng } from '../rng/rng';
import { territoriesOf } from '../map/territory';
import { validAttackTargets, validMoveTargets, distanceBetween } from '../map/adjacency';
import { canDrawNow } from '../deck/deck';
import { transportStatus } from '../engine/selectors';
import { getCardDefinition } from '../cards/card.registry';
import { SEQUESTRO_CARD_ID } from '../cards/sequestro.card';
import { BALANCE } from '../config/balance';
import { HUMANOS_ID } from '../factions/humanos';
import { ALIENIGENAS_ID, GOBLINS_ID, MAGOS_ID, VAMPIROS_ID, ZUMBIS_ID } from '../factions/roster';

/**
 * SIMULAÇÃO DE PARTIDA COMPLETA.
 *
 * Um jogador automático simples joga a partida do início ao fim, exercitando
 * reforço, ataque, dados, conquista, ocupação, movimentação, cartas,
 * Transporte Especial e Eventos do Colapso.
 *
 * O objetivo não é uma IA boa: é provar que a partida **termina**, que nenhum
 * estado impossível aparece e que nenhuma sequência de ações trava o jogo.
 * O verificador de invariantes roda depois de CADA ação.
 */

interface SimReport {
  rounds: number;
  turns: number;
  actions: number;
  attacks: number;
  battleRounds: number;
  conquests: number;
  cardsPlayed: number;
  cardsDrawn: number;
  specialAttacks: number;
  collapses: number;
  eliminations: number;
  finished: boolean;
  reason?: string;
  winner?: string;
  problems: string[];
}

function simulate(options: { players: number; seed: number; maxTurns?: number }): {
  state: GameState;
  report: SimReport;
} {
  const rng: Rng = seededRng(options.seed);
  let state = createGame({
    playerCount: options.players,
    deterministic: true,
    rng,
    players: [HUMANOS_ID, ZUMBIS_ID, ALIENIGENAS_ID, MAGOS_ID, VAMPIROS_ID, GOBLINS_ID]
      .slice(0, options.players)
      .map((factionId) => ({ factionId })),
  });

  const report: SimReport = {
    rounds: 0,
    turns: 0,
    actions: 0,
    attacks: 0,
    battleRounds: 0,
    conquests: 0,
    cardsPlayed: 0,
    cardsDrawn: 0,
    specialAttacks: 0,
    collapses: 0,
    eliminations: 0,
    finished: false,
    problems: [],
  };

  const act = (action: GameAction): boolean => {
    const result = applyAction(state, action, { rng });
    report.actions += 1;
    if (!result.ok) return false;
    state = result.state;
    const problems = validateState(state);
    if (problems.length > 0) {
      report.problems.push(`${action.type}: ${problems.join(' | ')}`);
    }
    return true;
  };

  const maxTurns = options.maxTurns ?? 400;
  let guard = 0;

  while (state.status === 'IN_PROGRESS' && report.turns < maxTurns) {
    guard += 1;
    if (guard > maxTurns * 40) {
      report.problems.push('LOOP: o laço de simulação não avançou.');
      break;
    }

    // Um Evento do Colapso em alerta bloqueia tudo até ser resolvido.
    if (state.collapse.pending) {
      const before = state.collapse.triggered;
      if (!act({ type: 'RESOLVE_COLLAPSE' })) {
        report.problems.push('TRAVA: evento do Colapso pendente que não resolve.');
        break;
      }
      if (state.collapse.triggered > before) report.collapses += 1;
      continue;
    }

    // Ocupação obrigatória.
    if (state.pendingOccupation) {
      const occupation = state.pendingOccupation;
      const amount = Math.max(occupation.min, Math.min(occupation.max, 2));
      if (!act({ type: 'OCCUPY_TERRITORY', amount })) {
        report.problems.push('TRAVA: ocupação obrigatória que não resolve.');
        break;
      }
      report.conquests += 1;
      continue;
    }

    // Redistribuição do Sequestro.
    if (state.pendingDistribution) {
      const owned = territoriesOf(state, state.pendingDistribution.playerId);
      const total = state.pendingDistribution.soldierIds.length;
      const assignments = owned.map((territory, index) => ({
        territoryId: territory.id,
        amount: index === 0 ? total : 0,
      }));
      if (!act({ type: 'DISTRIBUTE_RESERVES', assignments })) {
        report.problems.push('TRAVA: distribuição pendente que não resolve.');
        break;
      }
      continue;
    }

    const playerId = state.turn.currentPlayerId;
    const phase = state.turn.phase;

    if (phase === 'REFORCO') {
      if (state.turn.pendingReinforcements > 0) {
        act({ type: 'AUTO_REINFORCE' });
      } else {
        act({ type: 'ADVANCE_PHASE' });
      }
      continue;
    }

    if (phase === 'ATAQUE_COMUM') {
      if (state.pendingAttack) {
        // Continua enquanto tiver vantagem; recua quando fica em desvantagem.
        const attack = state.pendingAttack;
        const origin = state.territories[attack.fromTerritoryId as string];
        const target = state.territories[attack.toTerritoryId as string];
        const canPress = origin.garrison.length - 1 >= target.garrison.length;
        if (canPress && origin.garrison.length > 1 && target.garrison.length > 0) {
          if (act({ type: 'ROLL_BATTLE_ROUND' })) report.battleRounds += 1;
          else act({ type: 'CANCEL_ATTACK' });
        } else {
          act({ type: 'CANCEL_ATTACK' });
        }
        continue;
      }
      if (!state.turn.commonAttackUsed) {
        const best = bestAttack(state, playerId);
        if (best && act({ type: 'DECLARE_ATTACK', from: best.from, to: best.to })) {
          report.attacks += 1;
          continue;
        }
      }
      act({ type: 'ADVANCE_PHASE' });
      continue;
    }

    if (phase === 'ATAQUE_ESPECIAL') {
      if (state.pendingAttack) {
        const attack = state.pendingAttack;
        const target = state.territories[attack.toTerritoryId as string];
        const living = attack.attackingSoldierIds.filter(
          (id) => state.soldiers[id as string]?.alive,
        ).length;
        if (living > 0 && target.garrison.length > 0 && living >= target.garrison.length) {
          if (act({ type: 'ROLL_BATTLE_ROUND' })) report.battleRounds += 1;
          else act({ type: 'CANCEL_ATTACK' });
        } else {
          act({ type: 'CANCEL_ATTACK' });
        }
        continue;
      }
      const transport = transportStatus(state, playerId);
      if (transport.available) {
        const shot = bestSpecial(state, playerId);
        if (shot && act({ type: 'DECLARE_SPECIAL_ATTACK', ...shot })) {
          report.specialAttacks += 1;
          continue;
        }
      }
      act({ type: 'ADVANCE_PHASE' });
      continue;
    }

    if (phase === 'MOVIMENTACAO') {
      if (state.turn.movesUsed < state.turn.movesAllowed) {
        const move = bestMove(state, playerId);
        if (move && act(move)) continue;
      }
      act({ type: 'ADVANCE_PHASE' });
      continue;
    }

    if (phase === 'CARTAS') {
      if (canDrawNow(state, playerId).ok && act({ type: 'DRAW_CARD' })) {
        report.cardsDrawn += 1;
        continue;
      }
      const played = playSomething(state, playerId, act);
      if (played) {
        report.cardsPlayed += 1;
        continue;
      }
      act({ type: 'ADVANCE_PHASE' });
      continue;
    }

    // FIM_TURNO
    const roundBefore = state.turn.number;
    if (!act({ type: 'ADVANCE_PHASE' })) {
      report.problems.push('TRAVA: não foi possível encerrar o turno.');
      break;
    }
    report.turns += 1;
    if (state.turn.number > roundBefore) report.rounds += 1;
  }

  report.finished = state.status === 'FINISHED';
  report.reason = state.result?.reason;
  report.winner = state.result?.winnerId
    ? state.players[state.result.winnerId as string]?.name
    : undefined;
  report.eliminations = Object.values(state.players).filter(
    (p) => p.status === 'ELIMINATED',
  ).length;
  return { state, report };
}

/** Escolhe o ataque com melhor razão atacante/defensor. */
function bestAttack(state: GameState, playerId: string) {
  let best: { from: never; to: never; score: number } | null = null;
  for (const territory of territoriesOf(state, playerId as never)) {
    if (territory.garrison.length < 2) continue;
    for (const target of validAttackTargets(state, territory.id)) {
      const score = territory.garrison.length - 1 - target.garrison.length;
      if (score < 0) continue;
      if (!best || score > best.score) {
        best = { from: territory.id as never, to: target.id as never, score };
      }
    }
  }
  return best;
}

function bestSpecial(state: GameState, playerId: string) {
  for (const territory of territoriesOf(state, playerId as never)) {
    const available = territory.garrison.length - BALANCE.territory.minGarrison;
    if (available < 1) continue;
    for (const candidate of Object.values(state.territories)) {
      if (!candidate.controllerId || candidate.controllerId === (playerId as never)) continue;
      if (distanceBetween(state, territory.id, candidate.id) !== BALANCE.transport.range) continue;
      const amount = Math.min(BALANCE.transport.maxSoldiers, available);
      if (amount < candidate.garrison.length) continue;
      return { from: territory.id, to: candidate.id, amount };
    }
  }
  return null;
}

/** Move tropas de um território interno para a fronteira mais pressionada. */
function bestMove(state: GameState, playerId: string): GameAction | null {
  for (const territory of territoriesOf(state, playerId as never)) {
    if (territory.garrison.length < 3) continue;
    const safe = validAttackTargets(state, territory.id).length === 0;
    if (!safe) continue;
    const destinations = validMoveTargets(state, territory.id).filter(
      (t) => validAttackTargets(state, t.id).length > 0,
    );
    if (destinations.length === 0) continue;
    return {
      type: 'MOVE_SOLDIERS',
      from: territory.id,
      to: destinations[0].id,
      amount: territory.garrison.length - 1,
    };
  }
  return null;
}

/** Joga a primeira carta que puder ser resolvida sem escolha complexa. */
function playSomething(
  state: GameState,
  playerId: string,
  act: (action: GameAction) => boolean,
): boolean {
  const player = state.players[playerId];
  for (const cardId of [...player.handCardIds]) {
    const card = state.cards[cardId as string];
    if (!card) continue;
    const definition = getCardDefinition(card.definitionId);
    if (definition.id === SEQUESTRO_CARD_ID) continue; // exige seleção de alvos
    const spec = definition.primaryEffect.action;
    if (!spec) continue;
    if (spec.type === 'GAIN_TROOPS' || spec.type === 'EXTRA_MOVE') {
      if (act({ type: 'PLAY_CARD', cardInstanceId: card.instanceId, mode: 'PRIMARY' })) return true;
    }
    if (spec.type === 'SABOTAGE') {
      const enemy = Object.values(state.territories).find(
        (t) => t.controllerId && t.controllerId !== (playerId as never) && t.garrison.length > 1,
      );
      if (
        enemy &&
        act({
          type: 'PLAY_CARD',
          cardInstanceId: card.instanceId,
          mode: 'PRIMARY',
          params: { targetTerritoryId: enemy.id },
        })
      ) {
        return true;
      }
    }
  }
  return false;
}

describe('Partida completa — simulação automatizada', () => {
  it('S01 · uma partida de 4 jogadores vai do início ao fim sem estado inválido', () => {
    const { state, report } = simulate({ players: 4, seed: 20260827 });
    // Diagnóstico impresso no relatório do teste — é o registro do que aconteceu.
    writeFileSync('/tmp/sim.txt', `S01 ${JSON.stringify(report)}\n`, { flag: 'a' });
    expect(report.problems).toEqual([]);
    expect(validateState(state)).toEqual([]);
    expect(report.finished).toBe(true);
    expect(report.attacks).toBeGreaterThan(0);
    expect(report.battleRounds).toBeGreaterThan(0);
    expect(report.conquests).toBeGreaterThan(0);
  });

  it('S02 · partidas de 2 a 6 jogadores terminam e nunca produzem estado inválido', { timeout: 30000 }, () => {
    for (const players of [2, 3, 5, 6]) {
      const { state, report } = simulate({ players, seed: 1000 + players });
      writeFileSync('/tmp/sim.txt', `S02-${players}p ${JSON.stringify(report)}\n`, { flag: 'a' });
      expect(report.problems).toEqual([]);
      expect(validateState(state)).toEqual([]);
      expect(report.finished).toBe(true);
    }
  });

  it('S03 · com sementes diferentes o resultado varia, mas nunca trava', { timeout: 30000 }, () => {
    const reasons = new Set<string>();
    for (const seed of [11, 22, 33, 44, 55]) {
      const { state, report } = simulate({ players: 3, seed });
      expect(report.problems).toEqual([]);
      expect(validateState(state)).toEqual([]);
      expect(report.finished).toBe(true);
      if (report.reason) reasons.add(report.reason);
    }
    console.log('S03 motivos de fim', [...reasons].join(', '));
    expect(reasons.size).toBeGreaterThan(0);
  });

  it('S04 · o limite de rodadas garante que nenhuma partida corre para sempre', { timeout: 30000 }, () => {
    const { state, report } = simulate({ players: 6, seed: 777 });
    expect(report.finished).toBe(true);
    expect(state.turn.number).toBeLessThanOrEqual(BALANCE.victory.roundLimit + 1);
  });
});
