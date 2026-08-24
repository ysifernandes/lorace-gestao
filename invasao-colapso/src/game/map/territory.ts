import type { GameState } from '../types/game.types';
import type { PlayerId, TerritoryId } from '../types/ids';
import type { Territory } from '../types/territory.types';

export function getTerritory(state: GameState, id: TerritoryId): Territory {
  const territory = state.territories[id as string];
  if (!territory) throw new Error(`Território inexistente: ${id}`);
  return territory;
}

export function listTerritories(state: GameState): Territory[] {
  return Object.values(state.territories);
}

export function territoriesOf(state: GameState, owner: PlayerId): Territory[] {
  return listTerritories(state).filter((t) => t.controllerId === owner);
}

export function troopCount(state: GameState, id: TerritoryId): number {
  return getTerritory(state, id).garrison.length;
}

export function areNeighbors(state: GameState, a: TerritoryId, b: TerritoryId): boolean {
  return getTerritory(state, a).neighbors.includes(b);
}

/** Recalcula `player.territoryIds` a partir dos territórios (fonte de verdade). */
export function syncPlayerTerritories(draft: GameState): void {
  for (const player of Object.values(draft.players)) player.territoryIds = [];
  for (const territory of Object.values(draft.territories)) {
    if (!territory.controllerId) continue;
    const player = draft.players[territory.controllerId as string];
    if (player) player.territoryIds.push(territory.id);
  }
}
