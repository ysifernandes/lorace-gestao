import { cardDefinitionId } from '../types/ids';
import type { CardDefinition } from '../types/card.types';

/**
 * ⚠️ CARTAS DE TESTE — NÃO OFICIAIS ⚠️
 *
 * Existem para a mão do jogador ter volume visual no protótipo. Nome, arte e
 * efeito NÃO são definitivos e aguardam definição do criador. Elas não têm
 * efeito implementado: o motor recusa o uso com uma mensagem clara, em vez de
 * fingir uma regra que ainda não existe.
 */
function testCard(params: {
  slug: string;
  name: string;
  category: CardDefinition['category'];
  description: string;
  emoji: string;
  palette: [string, string];
}): CardDefinition {
  return {
    id: cardDefinitionId(`card.teste.${params.slug}`),
    name: params.name,
    factionId: null,
    category: params.category,
    description: params.description,
    maxUses: 1,
    conditions: [],
    primaryEffect: {
      id: `effect.teste.${params.slug}`,
      name: params.name,
      description: 'CARTA DE TESTE — efeito ainda não definido.',
      conditions: [],
      animation: { id: `anim.teste.${params.slug}`, name: params.name, beats: [] },
    },
    alternateEffect: null,
    art: { key: `teste.${params.slug}`, emoji: params.emoji, palette: params.palette },
  };
}

export const TESTE_CARDS: CardDefinition[] = [
  testCard({
    slug: 'interferencia',
    name: 'Interferência',
    category: 'EVENTO',
    description: 'CARTA DE TESTE — NÃO OFICIAL. Efeito e identidade a definir.',
    emoji: '📡',
    palette: ['#2b3550', '#5d7699'],
  }),
  testCard({
    slug: 'suprimentos',
    name: 'Suprimentos',
    category: 'SUPORTE',
    description: 'CARTA DE TESTE — NÃO OFICIAL. Efeito e identidade a definir.',
    emoji: '📦',
    palette: ['#3a3524', '#7d7145'],
  }),
  testCard({
    slug: 'barricada',
    name: 'Barricada',
    category: 'DEFESA',
    description: 'CARTA DE TESTE — NÃO OFICIAL. Efeito e identidade a definir.',
    emoji: '🧱',
    palette: ['#3d2a26', '#8a5a4c'],
  }),
];

export const TESTE_CARD_IDS = TESTE_CARDS.map((card) => card.id);
