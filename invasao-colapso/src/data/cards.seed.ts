import { SEQUESTRO_CARD_ID } from '../game/cards/sequestro.card';
import { TESTE_CARD_IDS } from '../game/cards/teste.cards';
import { PLAYER_IDS } from './players.seed';
import type { CardDefinitionId, PlayerId } from '../game/types/ids';

export interface StartingCardSeed {
  playerId: PlayerId;
  definitionId: CardDefinitionId;
  copies: number;
}

/**
 * Mão inicial. O Sequestro é oficial; as demais são CARTAS DE TESTE,
 * presentes apenas para a mão ter volume visual no protótipo (Etapa 6A).
 */
export const STARTING_CARDS: StartingCardSeed[] = [
  { playerId: PLAYER_IDS.p1, definitionId: SEQUESTRO_CARD_ID, copies: 1 },
  ...TESTE_CARD_IDS.map((definitionId) => ({
    playerId: PLAYER_IDS.p1,
    definitionId,
    copies: 1,
  })),
];
