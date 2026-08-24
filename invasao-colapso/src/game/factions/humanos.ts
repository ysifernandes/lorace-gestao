import { factionId } from '../types/ids';
import type { FactionDefinition } from '../types/faction.types';

export const HUMANOS_ID = factionId('humanos');

export const HUMANOS: FactionDefinition = {
  id: HUMANOS_ID,
  name: 'Humanos',
  description:
    'Os remanescentes das antigas estruturas civis e militares. Depois do Colapso, ' +
    'sobreviveram organizando comboios, hospitais de campanha e operações aéreas. ' +
    'Compensam a falta de números com logística, resgate e medicina de guerra.',
  color: '#2f6fed',
  contrastColor: '#f5f9ff',
  startingSoldiersPerTerritory: 3,
  abilities: [
    {
      id: 'humanos.logistica',
      name: 'Logística de Resgate',
      description: 'Tropas capturadas podem ser redistribuídas livremente entre territórios controlados.',
      kind: 'passive',
    },
    {
      id: 'humanos.medicina',
      name: 'Medicina de Guerra',
      description: 'Acesso a contramedidas defensivas (linha Vacina) durante ataques inimigos.',
      kind: 'passive',
    },
  ],
  signatureCardIds: ['card.sequestro'],
  status: 'ACTIVE',
};
