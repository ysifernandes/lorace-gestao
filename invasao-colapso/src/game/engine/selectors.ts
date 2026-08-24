import type { GameState } from '../types/game.types';
import type { CardInstance } from '../types/card.types';
import type { Soldier } from '../types/soldier.types';
import type { Territory } from '../types/territory.types';
import type { Player } from '../types/player.types';
import type { PlayerId, TerritoryId } from '../types/ids';
import { getFaction } from '../factions/faction.registry';

/** Leituras derivadas do estado. A UI consome só daqui. */

export function currentPlayer(state: GameState): Player {
  return state.players[state.turn.currentPlayerId as string];
}

export function playerById(state: GameState, id: PlayerId): Player | undefined {
  return state.players[id as string];
}

export function allPlayers(state: GameState): Player[] {
  return state.turn.order.map((id) => state.players[id as string]).filter(Boolean);
}

export function allTerritories(state: GameState): Territory[] {
  return Object.values(state.territories);
}

export function controllerName(state: GameState, territory: Territory): string {
  if (!territory.controllerId) return 'Neutro';
  return state.players[territory.controllerId as string]?.name ?? 'Desconhecido';
}

export function territoryColor(state: GameState, territory: Territory): string {
  if (!territory.controllerId) return '#5b6472';
  const player = state.players[territory.controllerId as string];
  if (!player) return '#5b6472';
  return getFaction(player.factionId).color;
}

export function handOf(state: GameState, playerId: PlayerId): CardInstance[] {
  const player = state.players[playerId as string];
  if (!player) return [];
  return player.handCardIds.map((id) => state.cards[id as string]).filter(Boolean);
}

export function reserveSoldiers(state: GameState, playerId: PlayerId): Soldier[] {
  return Object.values(state.soldiers).filter(
    (s) => s.alive && s.location.kind === 'RESERVE' && s.location.playerId === playerId,
  );
}

export function troopsOf(state: GameState, playerId: PlayerId): number {
  return Object.values(state.soldiers).filter((s) => s.alive && s.ownerId === playerId).length;
}

export function garrisonCount(state: GameState, territoryId: TerritoryId): number {
  return state.territories[territoryId as string]?.garrison.length ?? 0;
}

/** Soldados inimigos disponíveis para o Sequestro, agrupados por território. */
export function capturableSoldiers(
  state: GameState,
  captorId: PlayerId,
): { territory: Territory; soldiers: Soldier[] }[] {
  return allTerritories(state)
    .filter((t) => t.controllerId && t.controllerId !== captorId)
    .map((territory) => ({
      territory,
      soldiers: territory.garrison
        .map((id) => state.soldiers[id as string])
        .filter((s): s is Soldier => !!s && s.alive && s.ownerId !== captorId),
    }))
    .filter((group) => group.soldiers.length > 0);
}

export function totalAliveSoldiers(state: GameState): number {
  return Object.values(state.soldiers).filter((s) => s.alive).length;
}
