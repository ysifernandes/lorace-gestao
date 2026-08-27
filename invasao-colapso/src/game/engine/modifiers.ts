import type { GameState, TerritoryModifier } from '../types/game.types';
import type { PlayerId, TerritoryId } from '../types/ids';

/**
 * Modificadores temporários de território.
 * Um lugar só decide se um escudo está valendo — combate, movimentação e
 * reforço apenas consultam.
 */

export function activeModifiersFor(state: GameState, territoryId: TerritoryId): TerritoryModifier[] {
  return state.territoryModifiers.filter(
    (m) => m.territoryId === territoryId && m.untilRound >= state.turn.number,
  );
}

export function addTerritoryModifier(
  draft: GameState,
  modifier: Omit<TerritoryModifier, 'id'>,
): TerritoryModifier {
  draft.counters.effect += 1;
  const created: TerritoryModifier = { id: `mod-${draft.counters.effect}`, ...modifier };
  draft.territoryModifiers.push(created);
  return created;
}

/** Remove modificadores expirados. Chamado no início de cada rodada. */
export function expireTerritoryModifiers(draft: GameState): number {
  const before = draft.territoryModifiers.length;
  draft.territoryModifiers = draft.territoryModifiers.filter(
    (m) => m.untilRound >= draft.turn.number,
  );
  return before - draft.territoryModifiers.length;
}

export function blocksSpecialAttack(state: GameState, territoryId: TerritoryId): boolean {
  return activeModifiersFor(state, territoryId).some((m) => m.blockSpecialAttack);
}

export function blocksReinforce(state: GameState, territoryId: TerritoryId): boolean {
  return activeModifiersFor(state, territoryId).some((m) => m.blockReinforce);
}

/** Remove todos os modificadores pertencentes a um jogador (eliminação). */
export function dropModifiersOf(draft: GameState, playerId: PlayerId): void {
  draft.territoryModifiers = draft.territoryModifiers.filter((m) => m.ownerId !== playerId);
}
