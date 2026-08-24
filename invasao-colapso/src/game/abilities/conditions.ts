import type { GameState } from '../types/game.types';
import type { PlayerId } from '../types/ids';
import type { AbilityCondition } from './ability.types';
import type { GameEventPayload } from '../events/gameEvents.types';
import { territoriesOf } from '../map/territory';
import { troopsOf } from '../engine/selectors';

/**
 * Avaliador único de condições. Toda habilidade passa por aqui —
 * adicionar uma condição nova é adicionar um `case`, não espalhar `if`.
 */
export function evaluateCondition(
  state: GameState,
  playerId: PlayerId,
  condition: AbilityCondition,
  payload: GameEventPayload = {},
): { ok: true } | { ok: false; reason: string } {
  switch (condition.type) {
    case 'IS_CURRENT_PLAYER':
      return state.turn.currentPlayerId === playerId
        ? { ok: true }
        : { ok: false, reason: 'Só no seu turno.' };

    case 'PHASE_IS':
      return condition.phases.includes(state.turn.phase)
        ? { ok: true }
        : { ok: false, reason: `Disponível na fase ${condition.phases.join(' / ')}.` };

    case 'TERRITORY_COUNT_AT_MOST': {
      const owned = territoriesOf(state, playerId).length;
      return owned <= condition.value
        ? { ok: true }
        : { ok: false, reason: `Exige ${condition.value} território(s) ou menos (você tem ${owned}).` };
    }

    case 'TERRITORY_COUNT_AT_LEAST': {
      const owned = territoriesOf(state, playerId).length;
      return owned >= condition.value
        ? { ok: true }
        : { ok: false, reason: `Exige ao menos ${condition.value} território(s).` };
    }

    case 'TROOP_COUNT_AT_LEAST': {
      const troops = troopsOf(state, playerId);
      return troops >= condition.value
        ? { ok: true }
        : { ok: false, reason: `Exige ao menos ${condition.value} tropa(s).` };
    }

    case 'TROOP_COUNT_AT_MOST': {
      const troops = troopsOf(state, playerId);
      return troops <= condition.value
        ? { ok: true }
        : { ok: false, reason: `Exige no máximo ${condition.value} tropa(s).` };
    }

    case 'HAS_PENDING_ATTACK_AGAINST_OWNER': {
      const attack = state.pendingAttack;
      return attack && attack.status === 'DECLARED' && attack.defenderPlayerId === playerId
        ? { ok: true }
        : { ok: false, reason: 'Exige um ataque declarado contra você.' };
    }

    case 'CONTROLS_TERRITORY': {
      const territory = state.territories[condition.territoryId as string];
      return territory?.controllerId === playerId
        ? { ok: true }
        : { ok: false, reason: 'Território não é seu.' };
    }

    case 'DICE_RESULT_AT_LEAST': {
      const value = typeof payload.diceValue === 'number' ? payload.diceValue : -1;
      return value >= condition.value
        ? { ok: true }
        : { ok: false, reason: `Exige resultado de dado ${condition.value} ou mais.` };
    }

    case 'NO_PENDING_OCCUPATION':
      return state.pendingOccupation
        ? { ok: false, reason: 'Ocupe o território conquistado antes.' }
        : { ok: true };

    default:
      return { ok: true };
  }
}

export function evaluateConditions(
  state: GameState,
  playerId: PlayerId,
  conditions: AbilityCondition[],
  payload: GameEventPayload = {},
): { ok: true } | { ok: false; reason: string } {
  for (const condition of conditions) {
    const result = evaluateCondition(state, playerId, condition, payload);
    if (!result.ok) return result;
  }
  return { ok: true };
}
