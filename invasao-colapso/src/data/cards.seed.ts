import { SEQUESTRO_CARD_ID } from '../game/cards/sequestro.card';
import { PLAYER_IDS } from './players.seed';
import type { CardDefinitionId, PlayerId } from '../game/types/ids';

export interface StartingCardSeed {
  playerId: PlayerId;
  definitionId: CardDefinitionId;
  copies: number;
}

/** Mão inicial da Etapa 1: o jogador Humano começa com 1 Sequestro. */
export const STARTING_CARDS: StartingCardSeed[] = [
  { playerId: PLAYER_IDS.p1, definitionId: SEQUESTRO_CARD_ID, copies: 1 },
];
