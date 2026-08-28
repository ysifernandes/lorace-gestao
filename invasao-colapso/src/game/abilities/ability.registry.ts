import type { AbilityDefinition } from './ability.types';
import type { FactionId } from '../types/ids';
import { SOBREVIVENCIA } from './humanos/sobrevivencia';
import { OPERACAO_AEREA } from './humanos/operacaoAerea';
import { ROSTER_ABILITIES } from './roster.abilities';

/**
 * Registry de habilidades. Adicionar habilidade nova = registrar aqui.
 * O motor nunca conhece habilidades pelo nome.
 *
 * ⚠️ CONFLITO REGISTRADO: SOBREVIVÊNCIA e OPERAÇÃO AÉREA foram aprovadas na
 * Etapa 4 para os Humanos; a referência visual oficial dá aos Humanos
 * ENGENHARIA TÁTICA e LOGÍSTICA ADAPTATIVA. Nada foi apagado: as quatro
 * continuam registradas e funcionais. A ficha atual dos Humanos aponta para as
 * duas da referência; as duas da Etapa 4 seguem disponíveis para o criador
 * decidir. Ver relatório.
 */
const REGISTRY = new Map<string, AbilityDefinition>(
  [SOBREVIVENCIA, OPERACAO_AEREA, ...ROSTER_ABILITIES].map((ability) => [ability.id, ability]),
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
