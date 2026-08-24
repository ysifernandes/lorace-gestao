import { factionId } from '../types/ids';
import type { FactionDefinition } from '../types/faction.types';

/**
 * Facção adversária mínima, existente apenas para validar o sistema na Etapa 1.
 * Conteúdo próprio (cartas, habilidades reais) será definido em etapa futura.
 */
export const INSURGENTES_ID = factionId('insurgentes');

export const INSURGENTES: FactionDefinition = {
  id: INSURGENTES_ID,
  name: 'Insurgentes',
  description:
    'Milícias formadas nas primeiras semanas do Colapso. Ocupam o que encontram e ' +
    'não negociam território. (Facção-alvo de teste — identidade completa na Etapa 2.)',
  color: '#d1443f',
  contrastColor: '#fff6f5',
  startingSoldiersPerTerritory: 3,
  abilities: [],
  signatureCardIds: [],
  status: 'ACTIVE',
};
