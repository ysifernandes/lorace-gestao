import { factionId } from '../types/ids';
import type { FactionDefinition } from '../types/faction.types';

/**
 * SLOTS DE FACÇÃO — AGUARDANDO DEFINIÇÃO DO CRIADOR
 *
 * Nomes, lore, habilidades e cartas destas facções NÃO foram definidos.
 * Elas existem para provar que o sistema aceita facções novas sem tocar
 * no núcleo, e para ocupar a tela de seleção como "em desenvolvimento".
 */
function placeholder(slot: number): FactionDefinition {
  return {
    id: factionId(`faction_0${slot}`),
    name: `FACTION_0${slot}`,
    subtitle: 'Aguardando definição do criador',
    description: 'Identidade, lore e poderes ainda não definidos.',
    lore: [],
    color: '#4d5769',
    secondaryColor: '#6d7888',
    contrastColor: '#eef2f8',
    symbol: '❓',
    strategy: {
      pillars: ['???'],
      strengths: [],
      weaknesses: [],
      difficulty: 3,
    },
    startingSoldiersPerTerritory: 3,
    units: [],
    passiveAbilityIds: [],
    activeAbilityIds: [],
    signatureCardIds: [],
    commanders: [],
    visualEffects: [],
    animationIds: [],
    modifiers: {},
    status: 'PLACEHOLDER',
    provisional: true,
  };
}

export const FACTION_SLOTS: FactionDefinition[] = [2, 3, 4, 5].map(placeholder);
