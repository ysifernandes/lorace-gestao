import type { GameState } from '../types/game.types';
import type { Soldier, SoldierType } from '../types/soldier.types';
import type { FactionId, PlayerId, SoldierId, TerritoryId } from '../types/ids';
import { soldierId as toSoldierId } from '../types/ids';

/**
 * Operações sobre soldados. TODAS as mudanças de posição passam por aqui,
 * garantindo que o soldado exista em um único lugar (sem duplicação).
 */

export function nextSoldierId(draft: GameState): SoldierId {
  draft.counters.soldier += 1;
  return toSoldierId(`sol-${draft.counters.soldier}`);
}

export function createSoldier(
  draft: GameState,
  params: { factionId: FactionId; ownerId: PlayerId; territoryId: TerritoryId; type?: SoldierType },
): Soldier {
  const id = nextSoldierId(draft);
  const soldier: Soldier = {
    id,
    type: params.type ?? 'INFANTRY',
    factionId: params.factionId,
    ownerId: params.ownerId,
    location: { kind: 'TERRITORY', territoryId: params.territoryId },
    status: 'READY',
    alive: true,
    origin: { factionId: params.factionId, ownerId: params.ownerId },
  };
  draft.soldiers[id as string] = soldier;
  const territory = draft.territories[params.territoryId as string];
  if (!territory) throw new Error(`Território inexistente: ${params.territoryId}`);
  territory.garrison.push(id);
  return soldier;
}

export function getSoldier(state: GameState, id: SoldierId): Soldier {
  const soldier = state.soldiers[id as string];
  if (!soldier) throw new Error(`Soldado inexistente: ${id}`);
  return soldier;
}

/** Remove o soldado de onde quer que ele esteja, sem destruí-lo. */
function detach(draft: GameState, soldier: Soldier): void {
  if (soldier.location.kind === 'TERRITORY') {
    const territory = draft.territories[soldier.location.territoryId as string];
    if (territory) {
      territory.garrison = territory.garrison.filter((sid) => sid !== soldier.id);
    }
  }
}

/** Move um soldado para um território. Operação atômica: sai de um, entra no outro. */
export function placeInTerritory(draft: GameState, id: SoldierId, target: TerritoryId): void {
  const soldier = getSoldier(draft, id);
  if (!soldier.alive) throw new Error(`Soldado eliminado não pode ser posicionado: ${id}`);
  const territory = draft.territories[target as string];
  if (!territory) throw new Error(`Território inexistente: ${target}`);
  detach(draft, soldier);
  soldier.location = { kind: 'TERRITORY', territoryId: target };
  if (!territory.garrison.includes(id)) territory.garrison.push(id);
}

/** Envia o soldado para a reserva de um jogador (aguardando redistribuição). */
export function moveToReserve(draft: GameState, id: SoldierId, owner: PlayerId): void {
  const soldier = getSoldier(draft, id);
  detach(draft, soldier);
  soldier.location = { kind: 'RESERVE', playerId: owner };
}

export function eliminateSoldier(draft: GameState, id: SoldierId): void {
  const soldier = getSoldier(draft, id);
  if (!soldier.alive) return;
  detach(draft, soldier);
  soldier.alive = false;
  soldier.status = 'ELIMINATED';
  soldier.location = { kind: 'ELIMINATED' };
  soldier.lostAtRound = draft.turn.number;
}

/** Transfere um soldado para outra facção/jogador (usado pelo Sequestro). */
export function captureSoldier(
  draft: GameState,
  id: SoldierId,
  captor: { factionId: FactionId; playerId: PlayerId },
): void {
  const soldier = getSoldier(draft, id);
  moveToReserve(draft, id, captor.playerId);
  soldier.factionId = captor.factionId;
  soldier.ownerId = captor.playerId;
  soldier.status = 'CAPTURED';
}

export function soldiersInTerritory(state: GameState, id: TerritoryId): Soldier[] {
  const territory = state.territories[id as string];
  if (!territory) return [];
  return territory.garrison.map((sid) => getSoldier(state, sid)).filter((s) => s.alive);
}

export function reserveOf(state: GameState, owner: PlayerId): Soldier[] {
  return Object.values(state.soldiers).filter(
    (s) => s.alive && s.location.kind === 'RESERVE' && s.location.playerId === owner,
  );
}

export function soldiersOfPlayer(state: GameState, owner: PlayerId): Soldier[] {
  return Object.values(state.soldiers).filter((s) => s.alive && s.ownerId === owner);
}
