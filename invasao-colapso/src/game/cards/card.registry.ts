import type { CardCategory, CardDefinition } from '../types/card.types';
import type { CardDefinitionId } from '../types/ids';
import { SEQUESTRO_CARD } from './sequestro.card';
import { NEUTRAL_CARDS } from './neutral.cards';
import { SIGNATURE_CARDS } from './signature.cards';
import { FACEDOWN_CARD } from './facedown.card';

export const CARD_CATEGORY_LABELS: Record<CardCategory, string> = {
  OPERACAO: 'Operação',
  DEFESA: 'Defesa',
  EVENTO: 'Evento',
  SUPORTE: 'Suporte',
};

/** Registry de cartas: adicionar uma carta nova = registrar aqui. */
const REGISTRY = new Map<string, CardDefinition>(
  [SEQUESTRO_CARD, ...SIGNATURE_CARDS, ...NEUTRAL_CARDS, FACEDOWN_CARD].map((card) => [
    card.id as string,
    card,
  ]),
);

export function registerCard(card: CardDefinition): void {
  REGISTRY.set(card.id as string, card);
}

export function getCardDefinition(id: CardDefinitionId): CardDefinition {
  const card = REGISTRY.get(id as string);
  if (!card) throw new Error(`Carta desconhecida: ${id}`);
  return card;
}

export function listCardDefinitions(): CardDefinition[] {
  return [...REGISTRY.values()];
}

/** Cartas neutras do Baralho do Colapso. */
export function neutralCardDefinitions(): CardDefinition[] {
  return listCardDefinitions().filter((card) => card.factionId === null);
}

/** Cartas assinatura (uma por facção). */
export function signatureCardDefinitions(): CardDefinition[] {
  return listCardDefinitions().filter((card) => card.factionId !== null);
}
