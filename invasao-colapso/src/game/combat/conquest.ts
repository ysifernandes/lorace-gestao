import type { GameState, PendingOccupation } from '../types/game.types';
import type { TerritoryId } from '../types/ids';
import { getTerritory, syncPlayerTerritories } from '../map/territory';
import { soldiersInTerritory } from '../soldiers/soldier';

/**
 * Regras de conquista e ocupação.
 * Separadas da resolução do combate: qualquer sistema de combate futuro
 * (dados, modificadores, cartas) reaproveita estas funções sem alterá-las.
 */

export function defendersAlive(state: GameState, territory: TerritoryId): number {
  return soldiersInTerritory(state, territory).length;
}

/**
 * Transfere o controle do território para o atacante e cria a ocupação
 * obrigatória. Só deve ser chamada quando não restam defensores.
 */
export function conquerTerritory(
  draft: GameState,
  params: { from: TerritoryId; to: TerritoryId },
): PendingOccupation {
  const origin = getTerritory(draft, params.from);
  const target = getTerritory(draft, params.to);
  if (!origin.controllerId) throw new Error('Território atacante sem controlador.');
  if (defendersAlive(draft, target.id) > 0) {
    throw new Error('Ainda existem defensores: o território não pode ser conquistado.');
  }

  target.controllerId = origin.controllerId;
  target.status = 'STABLE';
  syncPlayerTerritories(draft);

  const attackers = soldiersInTerritory(draft, origin.id);
  const eligible = attackers.filter((s) => s.status === 'ATTACKING');
  const max = Math.max(1, Math.min(eligible.length || attackers.length - 1, attackers.length - 1));

  const occupation: PendingOccupation = {
    attackerPlayerId: origin.controllerId,
    fromTerritoryId: origin.id,
    toTerritoryId: target.id,
    min: 1,
    max,
    eligibleSoldierIds: (eligible.length > 0 ? eligible : attackers).map((s) => s.id),
  };
  draft.pendingOccupation = occupation;
  return occupation;
}
