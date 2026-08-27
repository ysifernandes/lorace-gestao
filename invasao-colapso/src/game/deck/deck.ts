import type { GameState } from '../types/game.types';
import type { CardDefinitionId, PlayerId } from '../types/ids';
import { cardInstanceId } from '../types/ids';
import type { CardInstance } from '../types/card.types';
import type { Rng } from '../rng/rng';
import { defaultRng, shuffle } from '../rng/rng';
import { DECK_COMPOSITION } from '../cards/neutral.cards';
import { getCardDefinition } from '../cards/card.registry';
import { BALANCE } from '../config/balance';

/**
 * BARALHO DO COLAPSO — compra, mão, descarte.
 *
 * O baralho guarda ids de definição; a instância só nasce quando a carta
 * chega à mão de alguém. Assim o save fica pequeno e não há carta órfã.
 */

export function buildDeck(rng: Rng = defaultRng): CardDefinitionId[] {
  const cards: CardDefinitionId[] = [];
  for (const entry of DECK_COMPOSITION) {
    for (let i = 0; i < entry.copies; i += 1) cards.push(entry.definitionId);
  }
  return shuffle(cards, rng);
}

/** Remonta o baralho a partir do descarte quando ele acaba. */
function refillDeck(draft: GameState, rng: Rng): void {
  if (draft.deck.length > 0 || draft.discard.length === 0) return;
  draft.deck = shuffle(draft.discard, rng);
  draft.discard = [];
}

export function createCardInstance(
  draft: GameState,
  owner: PlayerId,
  definitionId: CardDefinitionId,
): CardInstance {
  const definition = getCardDefinition(definitionId);
  draft.counters.card += 1;
  const instance: CardInstance = {
    instanceId: cardInstanceId(`card-${draft.counters.card}`),
    definitionId: definition.id,
    ownerId: owner,
    state: 'IN_HAND',
    usesRemaining: definition.maxUses,
    usedMode: null,
    history: [],
  };
  draft.cards[instance.instanceId as string] = instance;
  draft.players[owner as string]?.handCardIds.push(instance.instanceId);
  return instance;
}

/** Compra 1 carta para o jogador. Devolve a instância ou null se não houver. */
export function drawCardFor(
  draft: GameState,
  playerId: PlayerId,
  rng: Rng = defaultRng,
): CardInstance | null {
  const player = draft.players[playerId as string];
  if (!player || player.status !== 'ACTIVE') return null;
  refillDeck(draft, rng);
  const definitionId = draft.deck.shift();
  if (!definitionId) return null;
  player.turnsWithoutCard = 0;
  return createCardInstance(draft, playerId, definitionId);
}

/** Devolve uma instância ao descarte e a remove da mão. */
export function discardCard(draft: GameState, instanceId: string): boolean {
  const card = draft.cards[instanceId];
  if (!card) return false;
  const owner = draft.players[card.ownerId as string];
  if (owner) owner.handCardIds = owner.handCardIds.filter((id) => (id as string) !== instanceId);
  card.state = 'DISCARDED';
  // Cartas assinatura são únicas: saem da partida em vez de voltar ao baralho.
  const definition = getCardDefinition(card.definitionId);
  if (definition.factionId === null) draft.discard.push(card.definitionId);
  return true;
}

/** Descarta N cartas neutras da mão (as mais antigas primeiro). */
export function discardFromHand(draft: GameState, playerId: PlayerId, amount: number): number {
  const player = draft.players[playerId as string];
  if (!player) return 0;
  let discarded = 0;
  for (const instanceId of [...player.handCardIds]) {
    if (discarded >= amount) break;
    const card = draft.cards[instanceId as string];
    if (!card) continue;
    if (getCardDefinition(card.definitionId).factionId !== null) continue; // preserva a assinatura
    if (discardCard(draft, instanceId as string)) discarded += 1;
  }
  return discarded;
}

/** Cartas neutras na mão (a assinatura não conta no limite). */
export function neutralHandSize(state: GameState, playerId: PlayerId): number {
  const player = state.players[playerId as string];
  if (!player) return 0;
  return player.handCardIds.filter((id) => {
    const card = state.cards[id as string];
    return card && getCardDefinition(card.definitionId).factionId === null;
  }).length;
}

export function overHandLimit(state: GameState, playerId: PlayerId): number {
  return Math.max(0, neutralHandSize(state, playerId) - BALANCE.deck.handLimit);
}

/** Aplica o limite de mão no fim do turno. */
export function enforceHandLimit(draft: GameState, playerId: PlayerId): number {
  const excess = overHandLimit(draft, playerId);
  if (excess > 0) discardFromHand(draft, playerId, excess);
  return excess;
}

/**
 * Direito de compra na fase CARTAS:
 * conquistou ao menos 1 território neste turno, ou passou N turnos sem carta.
 */
export function canDrawNow(state: GameState, playerId: PlayerId): { ok: boolean; reason: string } {
  const player = state.players[playerId as string];
  if (!player) return { ok: false, reason: 'Jogador inexistente.' };
  if (state.turn.currentPlayerId !== playerId) return { ok: false, reason: 'Não é o seu turno.' };
  if (state.turn.phase !== 'CARTAS') return { ok: false, reason: 'Só na fase CARTAS.' };
  if (state.turn.drewCard) return { ok: false, reason: 'Você já comprou nesta fase.' };
  if (state.deck.length === 0 && state.discard.length === 0) {
    return { ok: false, reason: 'O Baralho do Colapso acabou.' };
  }
  if (state.turn.conquestsThisTurn > 0) return { ok: true, reason: 'Conquistou neste turno.' };
  if (player.turnsWithoutCard >= BALANCE.deck.compensationAfterTurns) {
    return { ok: true, reason: 'Compra de compensação.' };
  }
  return {
    ok: false,
    reason: 'É preciso conquistar um território para comprar (ou esperar a compensação).',
  };
}
