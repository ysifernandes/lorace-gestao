import type { GameState } from '../types/game.types';
import type { PlayerId, TerritoryId } from '../types/ids';
import type { Territory } from '../types/territory.types';
import { getTerritory, listTerritories } from './territory';
import { isLinkDisabled } from './regions';

/**
 * Regras de adjacência. Vivem no motor, não na interface — a UI apenas
 * pergunta "para onde posso ir/atacar?".
 */

/** Vizinhos válidos AGORA: conexões desativadas por evento não contam. */
export function neighborsOf(state: GameState, id: TerritoryId): Territory[] {
  return getTerritory(state, id)
    .neighbors.filter((n) => !isLinkDisabled(state, id, n))
    .map((n) => getTerritory(state, n));
}

/** Vizinhos declarados no mapa, ignorando desativações temporárias. */
export function staticNeighborsOf(state: GameState, id: TerritoryId): Territory[] {
  return getTerritory(state, id).neighbors.map((n) => getTerritory(state, n));
}

export function isAdjacent(state: GameState, from: TerritoryId, to: TerritoryId): boolean {
  return getTerritory(state, from).neighbors.includes(to) && !isLinkDisabled(state, from, to);
}

/**
 * Distância mínima entre dois territórios pela malha ativa.
 * Usada pelo Transporte Especial, que só atinge distância exatamente 2.
 */
export function distanceBetween(state: GameState, from: TerritoryId, to: TerritoryId): number {
  if (from === to) return 0;
  const seen = new Set<string>([from as string]);
  let frontier: TerritoryId[] = [from];
  let distance = 0;
  while (frontier.length > 0 && distance < 8) {
    distance += 1;
    const next: TerritoryId[] = [];
    for (const current of frontier) {
      for (const neighbor of neighborsOf(state, current)) {
        if (neighbor.id === to) return distance;
        if (seen.has(neighbor.id as string)) continue;
        seen.add(neighbor.id as string);
        next.push(neighbor.id);
      }
    }
    frontier = next;
  }
  return Infinity;
}

/** Territórios aliados adjacentes para os quais é possível mover tropas. */
export function validMoveTargets(state: GameState, from: TerritoryId): Territory[] {
  const origin = getTerritory(state, from);
  if (!origin.controllerId) return [];
  return neighborsOf(state, from).filter((t) => t.controllerId === origin.controllerId);
}

/** Territórios inimigos adjacentes atacáveis a partir de `from`. */
export function validAttackTargets(state: GameState, from: TerritoryId): Territory[] {
  const origin = getTerritory(state, from);
  if (!origin.controllerId) return [];
  return neighborsOf(state, from).filter(
    (t) => t.controllerId !== null && t.controllerId !== origin.controllerId,
  );
}

/** Máximo de tropas movíveis: sempre fica ao menos 1 na origem. */
export function maxMovableFrom(state: GameState, from: TerritoryId): number {
  return Math.max(0, getTerritory(state, from).garrison.length - 1);
}

/** Verifica a simetria do grafo — um mapa mal declarado quebra o jogo. */
export function findAsymmetricEdges(state: GameState): string[] {
  const problems: string[] = [];
  for (const territory of listTerritories(state)) {
    for (const neighborId of territory.neighbors) {
      const neighbor = state.territories[neighborId as string];
      if (!neighbor) {
        problems.push(`${territory.id} aponta para território inexistente ${neighborId}.`);
        continue;
      }
      if (!neighbor.neighbors.includes(territory.id)) {
        problems.push(`Fronteira assimétrica: ${territory.id} → ${neighborId}.`);
      }
    }
  }
  return problems;
}

/** Territórios do jogador que ainda podem atacar (têm alvo e tropas). */
export function territoriesAbleToAttack(state: GameState, player: PlayerId): Territory[] {
  return listTerritories(state).filter(
    (t) =>
      t.controllerId === player &&
      t.garrison.length > 1 &&
      validAttackTargets(state, t.id).length > 0,
  );
}
