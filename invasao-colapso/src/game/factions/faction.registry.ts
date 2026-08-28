import type { FactionDefinition } from '../types/faction.types';
import type { FactionId } from '../types/ids';
import { HUMANOS } from './humanos';
import { REMANESCENTES, ROSTER } from './roster';
import { TECNOLOGOS } from './tecnologos';

/**
 * Registry de facções. Adicionar uma nova facção = adicionar aqui.
 * Nada na UI conhece facções por nome; tudo passa por este registry.
 */
const REGISTRY = new Map<string, FactionDefinition>(
  [HUMANOS, ...ROSTER, TECNOLOGOS, REMANESCENTES].map((f) => [f.id as string, f]),
);

export function registerFaction(faction: FactionDefinition): void {
  REGISTRY.set(faction.id as string, faction);
}

export function getFaction(id: FactionId): FactionDefinition {
  const faction = REGISTRY.get(id as string);
  if (!faction) throw new Error(`Facção desconhecida: ${id}`);
  return faction;
}

export function tryGetFaction(id: FactionId): FactionDefinition | undefined {
  return REGISTRY.get(id as string);
}

export function listFactions(): FactionDefinition[] {
  return [...REGISTRY.values()];
}

/** Facções que podem ser escolhidas na preparação. */
export function playableFactions(): FactionDefinition[] {
  return listFactions().filter((f) => f.status === 'ACTIVE' || f.status === 'TEST_ONLY');
}

/** Slots reservados que aparecem como "em desenvolvimento". */
export function upcomingFactions(): FactionDefinition[] {
  return listFactions().filter((f) => f.status === 'PLACEHOLDER');
}
