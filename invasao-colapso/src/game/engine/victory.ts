import type { GameResult, GameState } from '../types/game.types';
import type { PlayerId } from '../types/ids';
import { BALANCE } from '../config/balance';
import { checkMission, effectiveMissionOf, applyMissionFallbacks } from '../missions/missionEngine';
import { completedRegions } from '../map/regions';
import { listTerritories, territoriesOf, syncPlayerTerritories } from '../map/territory';
import { dropModifiersOf } from './modifiers';
import { discardCard } from '../deck/deck';
import { pushLog } from './log';
import { emitGameEvent } from '../events/gameEvents';
import { NEUTRAL_PLAYER_ID } from './setup';

/**
 * ELIMINAÇÃO E VITÓRIA.
 *
 * Um lugar só decide quem saiu e quem venceu — a interface apenas mostra.
 */

export function activePlayers(state: GameState) {
  return Object.values(state.players).filter((p) => p.status === 'ACTIVE');
}

/**
 * Elimina quem ficou sem território. As cartas do eliminado vão para o
 * DESCARTE, não para o conquistador: sem isso, eliminar o mais fraco viraria
 * a estratégia dominante.
 */
export function processEliminations(
  draft: GameState,
  conquerorId: PlayerId | null,
): PlayerId[] {
  syncPlayerTerritories(draft);
  const eliminated: PlayerId[] = [];

  for (const player of Object.values(draft.players)) {
    if (player.status !== 'ACTIVE') continue;
    if (territoriesOf(draft, player.id).length > 0) continue;

    player.status = 'ELIMINATED';
    player.eliminatedAtRound = draft.turn.number;
    eliminated.push(player.id);

    for (const cardId of [...player.handCardIds]) discardCard(draft, cardId as string);
    player.transportCharges = 0;
    dropModifiersOf(draft, player.id);

    const mission = draft.missions[player.id as string];
    if (mission) mission.revealed = true;

    pushLog(draft, 'ACTION', `${player.name} foi eliminado da partida.`);
    emitGameEvent(draft, {
      kind: 'TURN_ENDED',
      payload: { playerId: player.id, eliminated: true },
    });
  }

  if (eliminated.length > 0) applyMissionFallbacks(draft, conquerorId);
  return eliminated;
}

/**
 * Verifica todas as condições de vitória, em ordem de precedência:
 * 1. objetivo secreto · 2. dominação total · 3. último em pé · 4. rodada 25.
 */
export function checkVictory(draft: GameState): GameResult | null {
  if (draft.status === 'FINISHED') return draft.result;

  // 1 — Objetivo secreto. Verifica primeiro quem está jogando agora.
  const order = [
    draft.turn.currentPlayerId,
    ...draft.turn.order.filter((id) => id !== draft.turn.currentPlayerId),
  ];
  for (const id of order) {
    const player = draft.players[id as string];
    if (!player || player.status !== 'ACTIVE') continue;
    const entry = draft.missions[id as string];
    if (!entry) continue;
    const check = checkMission(draft, id);
    entry.progress = check.progress;
    if (!check.completed) continue;
    entry.completed = true;
    entry.revealed = true;
    const mission = effectiveMissionOf(draft, id);
    return {
      winnerId: id,
      reason: 'MISSION',
      detail: `${player.name} cumpriu o objetivo secreto: ${mission?.name ?? '—'}.`,
      finishedAtRound: draft.turn.number,
    };
  }

  // 2 — Dominação total: todos os 30 territórios, Remanescentes inclusive.
  const territories = listTerritories(draft);
  const controllers = new Set(
    territories.map((t) => t.controllerId).filter((id): id is PlayerId => Boolean(id)),
  );
  if (controllers.size === 1) {
    const [only] = [...controllers];
    if (only !== NEUTRAL_PLAYER_ID) {
      return {
        winnerId: only,
        reason: 'DOMINATION',
        detail: `${draft.players[only as string]?.name} controla os 30 territórios.`,
        finishedAtRound: draft.turn.number,
      };
    }
  }

  // 3 — Último em pé.
  const alive = activePlayers(draft);
  if (alive.length === 1) {
    return {
      winnerId: alive[0].id,
      reason: 'LAST_STANDING',
      detail: `${alive[0].name} é o único sobrevivente.`,
      finishedAtRound: draft.turn.number,
    };
  }
  if (alive.length === 0) {
    return {
      winnerId: null,
      reason: 'LAST_STANDING',
      detail: 'Ninguém sobreviveu ao Colapso.',
      finishedAtRound: draft.turn.number,
    };
  }

  // 4 — Limite de rodadas: desempate por regiões → territórios → tropas → assento.
  if (draft.turn.number > BALANCE.victory.roundLimit) {
    const ranked = [...alive].sort((a, b) => {
      const regionsA = completedRegions(draft, a.id).length;
      const regionsB = completedRegions(draft, b.id).length;
      if (regionsA !== regionsB) return regionsB - regionsA;
      const territoriesA = territoriesOf(draft, a.id);
      const territoriesB = territoriesOf(draft, b.id);
      if (territoriesA.length !== territoriesB.length) {
        return territoriesB.length - territoriesA.length;
      }
      const troopsA = territoriesA.reduce((sum, t) => sum + t.garrison.length, 0);
      const troopsB = territoriesB.reduce((sum, t) => sum + t.garrison.length, 0);
      if (troopsA !== troopsB) return troopsB - troopsA;
      return a.seat - b.seat;
    });
    return {
      winnerId: ranked[0].id,
      reason: 'ROUND_LIMIT',
      detail: `Limite de ${BALANCE.victory.roundLimit} rodadas: ${ranked[0].name} vence no critério de desempate.`,
      finishedAtRound: draft.turn.number,
    };
  }

  return null;
}

/** Encerra a partida, revelando todos os objetivos. */
export function finishGame(draft: GameState, result: GameResult): void {
  draft.status = 'FINISHED';
  draft.result = result;
  for (const entry of Object.values(draft.missions)) entry.revealed = true;
  draft.pendingAttack = null;
  draft.pendingOccupation = null;
  draft.pendingDistribution = null;
  pushLog(draft, 'INFO', `FIM DE PARTIDA — ${result.detail}`);
}

/** Verifica e, se houver vencedor, encerra. Devolve true quando a partida acabou. */
export function settleVictory(draft: GameState): boolean {
  const result = checkVictory(draft);
  if (!result) return false;
  finishGame(draft, result);
  return true;
}
