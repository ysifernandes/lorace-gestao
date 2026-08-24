import type { AnimationEvent, AnimationSpec } from '../types/animation.types';
import type { GameState } from '../types/game.types';

/**
 * Fila de animações. As regras EMITEM eventos; quem desenha consome.
 * Trocar o placeholder atual por cenas completas não exige tocar na regra.
 */
export function emitAnimation(
  draft: GameState,
  spec: AnimationSpec,
  payload: Record<string, unknown>,
): AnimationEvent {
  draft.counters.event += 1;
  const event: AnimationEvent = {
    id: `anim-${draft.counters.event}`,
    specId: spec.id,
    createdAtTurn: draft.turn.number,
    payload,
    status: 'PENDING',
  };
  draft.animationQueue.push(event);
  return event;
}

export function pendingAnimations(state: GameState): AnimationEvent[] {
  return state.animationQueue.filter((e) => e.status === 'PENDING');
}

export function markAnimationPlayed(draft: GameState, eventId: string): void {
  const event = draft.animationQueue.find((e) => e.id === eventId);
  if (event) event.status = 'PLAYED';
}
