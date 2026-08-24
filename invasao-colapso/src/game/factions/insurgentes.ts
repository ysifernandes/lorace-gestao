import { factionId } from '../types/ids';
import type { FactionDefinition } from '../types/faction.types';

export const INSURGENTES_ID = factionId('insurgentes');

/**
 * FACÇÃO DE TESTE — NÃO DEFINITIVA
 *
 * Existe apenas para haver um adversário jogável enquanto as facções
 * oficiais não são definidas. Nome, lore e poderes serão substituídos.
 */
export const INSURGENTES: FactionDefinition = {
  id: INSURGENTES_ID,
  name: 'Insurgentes',
  subtitle: 'FACÇÃO DE TESTE — NÃO DEFINITIVA',
  description:
    'Milícias formadas nas primeiras semanas do Colapso. Ocupam o que encontram ' +
    'e não negociam território. Identidade completa aguarda definição do criador.',
  lore: [],
  color: '#d1443f',
  secondaryColor: '#ff8a84',
  contrastColor: '#fff6f5',
  symbol: '🔥',
  strategy: {
    pillars: ['Ocupação'],
    strengths: [],
    weaknesses: [],
    difficulty: 2,
  },
  startingSoldiersPerTerritory: 3,
  units: [
    {
      id: 'insurgentes.infantry',
      name: 'Infantaria',
      description: 'Unidade padrão de teste.',
    },
  ],
  passiveAbilityIds: [],
  activeAbilityIds: [],
  signatureCardIds: [],
  commanders: [],
  visualEffects: [],
  animationIds: [],
  modifiers: {},
  status: 'TEST_ONLY',
  provisional: true,
};
