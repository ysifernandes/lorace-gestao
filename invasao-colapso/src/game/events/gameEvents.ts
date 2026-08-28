import type { GameState } from '../types/game.types';
import type { PlayerId } from '../types/ids';
import type { GameEvent, GameEventKind, GameEventPayload } from './gameEvents.types';
import type { AbilityDefinition } from '../abilities/ability.types';
import {
  abilitiesListeningTo,
  buildContext,
  checkUsage,
  consumeUsage,
  getAbilityState,
} from '../abilities/abilityEngine';
import { evaluateConditions } from '../abilities/conditions';
import { enqueueEffect, resolveEffectQueue } from '../effects/effectQueue';
import { EFFECT_PRIORITY } from '../effects/effect.types';
import { pushLog } from '../engine/log';

const MAX_EVENT_KEYS = 64;

/**
 * DESPACHANTE DE EVENTOS
 *
 * O reducer anuncia o que aconteceu; quem reage são as habilidades inscritas.
 * Nenhuma habilidade é chamada pelo nome de dentro das regras.
 */

export interface AbilityTriggerRecord {
  abilityId: string;
  playerId: PlayerId;
  title: string;
  detail: string;
  turn: number;
}

function alreadyEmitted(state: GameState, dedupeKey: string): boolean {
  return state.emittedEventKeys.includes(dedupeKey);
}

function rememberKey(draft: GameState, dedupeKey: string): void {
  draft.emittedEventKeys.unshift(dedupeKey);
  if (draft.emittedEventKeys.length > MAX_EVENT_KEYS) {
    draft.emittedEventKeys.length = MAX_EVENT_KEYS;
  }
}

/** Quem pode reagir a este evento: por padrão, todos os jogadores ativos. */
function audienceFor(state: GameState, payload: GameEventPayload): PlayerId[] {
  if (payload.playerId) return [payload.playerId];
  return state.turn.order.filter((id) => state.players[id as string]?.status === 'ACTIVE');
}

function fireAbility(
  draft: GameState,
  ability: AbilityDefinition,
  playerId: PlayerId,
  event: GameEvent,
): AbilityTriggerRecord | null {
  const runtime = getAbilityState(draft, playerId, ability.id);
  if (!runtime) return null;

  const usage = checkUsage(draft, runtime, ability);
  if (!usage.available) return null;

  const conditions = evaluateConditions(draft, playerId, ability.conditions, event.payload);
  if (!conditions.ok) return null;

  const context = buildContext(draft, playerId, event.kind, event.payload);
  const effects = ability.produceEffects(context);
  if (effects.length === 0) return null;

  consumeUsage(draft, playerId, ability);
  for (const effect of effects) {
    enqueueEffect(draft, {
      effect,
      source: { kind: 'ABILITY', id: ability.id, playerId, label: ability.name },
      priority: ability.kind === 'REACTIVE' ? EFFECT_PRIORITY.DEFENSE_REACTION : EFFECT_PRIORITY.ABILITY,
    });
  }

  const detail = ability.feedback.detail?.(context) ?? '';
  return {
    abilityId: ability.id,
    playerId,
    title: ability.feedback.title,
    detail,
    turn: draft.turn.number,
  };
}

export interface EmitResult {
  fired: AbilityTriggerRecord[];
  skipped: boolean;
}

/**
 * Anuncia um evento. Habilidades inscritas são avaliadas, seus efeitos entram
 * na fila e a fila é resolvida em ordem de prioridade.
 *
 * `dedupeKey` garante que o mesmo momento (ex.: início do turno 4 do jogador 1)
 * dispare uma única vez, mesmo que o reducer passe por ali duas vezes.
 */
export function emitGameEvent(
  draft: GameState,
  params: { kind: GameEventKind; payload?: GameEventPayload; dedupeKey?: string },
): EmitResult {
  const payload = params.payload ?? {};
  if (params.dedupeKey && alreadyEmitted(draft, params.dedupeKey)) {
    return { fired: [], skipped: true };
  }
  if (params.dedupeKey) rememberKey(draft, params.dedupeKey);

  draft.counters.event += 1;
  const event: GameEvent = {
    id: `evt-${draft.counters.event}`,
    kind: params.kind,
    payload,
    turn: draft.turn.number,
    dedupeKey: params.dedupeKey,
  };

  const fired: AbilityTriggerRecord[] = [];
  for (const playerId of audienceFor(draft, payload)) {
    for (const ability of abilitiesListeningTo(draft, playerId, event.kind)) {
      const record = fireAbility(draft, ability, playerId, event);
      if (record) fired.push(record);
    }
  }

  const resolution = resolveEffectQueue(draft);

  for (const record of fired) {
    const applied = resolution.resolved.some((entry) => entry.source.id === record.abilityId);
    if (!applied) continue;
    pushLog(
      draft,
      'ABILITY',
      `${record.title}${record.detail ? ` — ${record.detail}` : ''}`,
    );
    draft.abilityFeed.unshift(record);
    if (draft.abilityFeed.length > 10) draft.abilityFeed.length = 10;
  }

  return { fired, skipped: false };
}
