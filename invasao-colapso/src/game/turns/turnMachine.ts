import type { GameState } from '../types/game.types';
import type { PlayerId } from '../types/ids';
import { isLastPhase, nextPhase } from './phases';

/**
 * Máquina de estados do turno. Pura: recebe o rascunho do estado e o avança.
 * Não conhece React nem UI.
 */

export function activePlayerOrder(state: GameState): PlayerId[] {
  return state.turn.order.filter((id) => state.players[id as string]?.status === 'ACTIVE');
}

export function peekNextPlayerId(state: GameState): PlayerId {
  const order = state.turn.order;
  const active = activePlayerOrder(state);
  if (active.length === 0) return state.turn.currentPlayerId;
  for (let step = 1; step <= order.length; step += 1) {
    const candidate = order[(state.turn.currentIndex + step) % order.length];
    if (state.players[candidate as string]?.status === 'ACTIVE') return candidate;
  }
  return state.turn.currentPlayerId;
}

/** Reforços concedidos no início do turno (regra provisória da Etapa 1). */
export function reinforcementsFor(state: GameState, player: PlayerId): number {
  const owned = Object.values(state.territories).filter((t) => t.controllerId === player).length;
  return Math.max(3, Math.floor(owned / 2));
}

function startTurnFor(draft: GameState, player: PlayerId): void {
  draft.turn.currentPlayerId = player;
  draft.turn.currentIndex = draft.turn.order.indexOf(player);
  draft.turn.phase = 'INICIO';
  draft.turn.pendingReinforcements = reinforcementsFor(draft, player);
  for (const soldier of Object.values(draft.soldiers)) {
    if (soldier.alive && soldier.ownerId === player && soldier.status === 'MOVED') {
      soldier.status = 'READY';
    }
  }
}

/** Passa a vez para o próximo jogador ativo, incrementando o número do turno. */
export function endTurn(draft: GameState): { previous: PlayerId; next: PlayerId } {
  const previous = draft.turn.currentPlayerId;
  const next = peekNextPlayerId(draft);
  const wrapped = draft.turn.order.indexOf(next) <= draft.turn.currentIndex;
  startTurnFor(draft, next);
  if (wrapped || previous === next) draft.turn.number += 1;
  return { previous, next };
}

/**
 * Avança uma fase. Ao sair de FIM, troca de jogador.
 * Retorna se houve troca de jogador.
 */
export function advancePhase(draft: GameState): { changedPlayer: boolean } {
  if (isLastPhase(draft.turn.phase)) {
    endTurn(draft);
    return { changedPlayer: true };
  }
  draft.turn.phase = nextPhase(draft.turn.phase);
  return { changedPlayer: false };
}
