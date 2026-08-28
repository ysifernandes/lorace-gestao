import type { ActivationCondition, CardDefinition, CardInstance, CardMode } from '../types/card.types';
import type { GameState } from '../types/game.types';
import type { CardInstanceId } from '../types/ids';
import { getCardDefinition } from './card.registry';

export interface Availability {
  allowed: boolean;
  reason?: string;
}

export function getCardInstance(state: GameState, id: CardInstanceId): CardInstance {
  const card = state.cards[id as string];
  if (!card) throw new Error(`Carta inexistente na partida: ${id}`);
  return card;
}

export function effectFor(definition: CardDefinition, mode: CardMode) {
  const effect = mode === 'PRIMARY' ? definition.primaryEffect : definition.alternateEffect;
  if (!effect) throw new Error(`A carta ${definition.name} não possui efeito ${mode}.`);
  return effect;
}

function checkCondition(
  state: GameState,
  card: CardInstance,
  condition: ActivationCondition,
): Availability {
  switch (condition.type) {
    case 'PHASE_IS':
      return condition.phases.includes(state.turn.phase)
        ? { allowed: true }
        : { allowed: false, reason: `Só pode ser usada na fase ${condition.phases.join(' / ')}.` };
    case 'IS_CURRENT_PLAYER':
      return state.turn.currentPlayerId === card.ownerId
        ? { allowed: true }
        : { allowed: false, reason: 'Só o jogador do turno pode usar esta carta.' };
    case 'HAS_PENDING_ATTACK_AGAINST_OWNER': {
      const attack = state.pendingAttack;
      const ok = !!attack && attack.status === 'DECLARED' && attack.defenderPlayerId === card.ownerId;
      return ok
        ? { allowed: true }
        : { allowed: false, reason: 'Só pode ser usada ao sofrer um ataque declarado.' };
    }
    case 'ENEMY_SOLDIERS_AVAILABLE': {
      const enemies = Object.values(state.soldiers).filter(
        (s) => s.alive && s.location.kind === 'TERRITORY' && s.ownerId !== card.ownerId,
      );
      return enemies.length >= condition.min
        ? { allowed: true }
        : { allowed: false, reason: 'Não há soldados inimigos em território para capturar.' };
    }
    case 'NEVER':
      return { allowed: false, reason: 'Esta carta não é sua: você não pode vê-la nem usá-la.' };
    default:
      return { allowed: true };
  }
}

/**
 * Regra central de duplo uso: a carta tem DOIS efeitos possíveis,
 * mas usar um consome a carta e trava o outro definitivamente.
 */
export function canUseCard(state: GameState, cardId: CardInstanceId, mode: CardMode): Availability {
  const card = getCardInstance(state, cardId);
  const definition = getCardDefinition(card.definitionId);

  if (card.state === 'CONSUMED') {
    const used = card.usedMode === 'PRIMARY' ? definition.primaryEffect.name : definition.alternateEffect?.name;
    return { allowed: false, reason: `Carta já consumida (usada como ${used}).` };
  }
  if (card.state !== 'IN_HAND') {
    return { allowed: false, reason: 'A carta não está na mão do jogador.' };
  }
  if (card.usesRemaining <= 0) {
    return { allowed: false, reason: 'A carta não possui usos restantes.' };
  }
  if (card.usedMode !== null && card.usedMode !== mode) {
    return { allowed: false, reason: 'Esta carta já foi usada com o outro efeito.' };
  }
  if (mode === 'ALTERNATE' && !definition.alternateEffect) {
    return { allowed: false, reason: 'Esta carta não possui efeito alternativo.' };
  }

  const conditions = [...definition.conditions, ...effectFor(definition, mode).conditions];
  for (const condition of conditions) {
    const result = checkCondition(state, card, condition);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}

/** Consome a carta após um uso bem-sucedido, travando o modo escolhido. */
export function consumeCard(draft: GameState, cardId: CardInstanceId, mode: CardMode): void {
  const card = getCardInstance(draft, cardId);
  card.usesRemaining = Math.max(0, card.usesRemaining - 1);
  card.usedMode = mode;
  card.history.push({ mode, turn: draft.turn.number });
  if (card.usesRemaining === 0) {
    card.state = 'CONSUMED';
    const owner = draft.players[card.ownerId as string];
    if (owner) owner.handCardIds = owner.handCardIds.filter((id) => id !== card.instanceId);
  }
}
