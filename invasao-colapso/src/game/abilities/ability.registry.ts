import type { AbilityDefinition } from './ability.types';
import type { FactionId } from '../types/ids';
import { SOBREVIVENCIA } from './humanos/sobrevivencia';
import { OPERACAO_AEREA } from './humanos/operacaoAerea';

/**
 * Registry de habilidades. Adicionar habilidade nova = registrar aqui.
 * O motor nunca conhece habilidades pelo nome.
 */
const REGISTRY = new Map<string, AbilityDefinition>(
  [SOBREVIVENCIA, OPERACAO_AEREA].map((ability) => [ability.id, ability]),
);

export function registerAbility(ability: AbilityDefinition): void {
  REGISTRY.set(ability.id, ability);
}

export function getAbility(id: string): AbilityDefinition {
  const ability = REGISTRY.get(id);
  if (!ability) throw new Error(`Habilidade desconhecida: ${id}`);
  return ability;
}

export function tryGetAbility(id: string): AbilityDefinition | undefined {
  return REGISTRY.get(id);
}

export function listAbilities(): AbilityDefinition[] {
  return [...REGISTRY.values()];
}

/** Habilidades de uma facção (mais as neutras). */
export function abilitiesOfFaction(factionId: FactionId): AbilityDefinition[] {
  return listAbilities().filter((a) => a.factionId === null || a.factionId === factionId);
}
