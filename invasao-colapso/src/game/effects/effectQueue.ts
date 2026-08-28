import type { GameState } from '../types/game.types';
import type { EffectDescriptor, EffectSource, QueuedEffect } from './effect.types';
import { EFFECT_PRIORITY } from './effect.types';
import { BALANCE } from '../config/balance';
import { resolveEffect } from './effectResolvers';
import { pushLog } from '../engine/log';

/**
 * FILA DE EFEITOS
 *
 * Quando várias coisas querem acontecer ao mesmo tempo — habilidade do
 * atacante, reação do defensor, carta defensiva, combate — cada uma entra
 * na fila com uma prioridade. A resolução é ordenada e previsível, então
 * uma carta nova não quebra o fluxo do combate.
 */

export function enqueueEffect(
  draft: GameState,
  params: {
    effect: EffectDescriptor;
    source: EffectSource;
    priority?: number;
  },
): QueuedEffect {
  draft.counters.effect += 1;
  const queued: QueuedEffect = {
    id: `eff-${draft.counters.effect}`,
    effect: params.effect,
    source: params.source,
    priority: params.priority ?? EFFECT_PRIORITY.SYSTEM,
    status: 'PENDING',
    createdAtTurn: draft.turn.number,
  };
  draft.effectQueue.push(queued);
  return queued;
}

function archive(draft: GameState, entry: QueuedEffect): void {
  draft.effectHistory.unshift(entry);
  if (draft.effectHistory.length > BALANCE.effects.historySize) {
    draft.effectHistory.length = BALANCE.effects.historySize;
  }
}

export interface QueueResolution {
  resolved: QueuedEffect[];
  failed: QueuedEffect[];
}

/**
 * Resolve a fila inteira, em ordem de prioridade e, dentro da mesma
 * prioridade, na ordem de entrada. Efeitos resolvidos saem da fila.
 * Um efeito inválido é marcado como FAILED e NÃO interrompe os demais.
 */
export function resolveEffectQueue(draft: GameState): QueueResolution {
  const resolved: QueuedEffect[] = [];
  const failed: QueuedEffect[] = [];
  let guard = 0;

  for (;;) {
    const pending = draft.effectQueue.filter((e) => e.status === 'PENDING');
    if (pending.length === 0) break;
    guard += 1;
    if (guard > BALANCE.effects.maxResolutionsPerCycle) {
      // Trava de segurança: efeito que gera efeito indefinidamente.
      for (const entry of pending) {
        entry.status = 'SKIPPED';
        entry.result = 'Limite de resolução do ciclo atingido.';
      }
      pushLog(draft, 'ERROR', 'Fila de efeitos interrompida: limite de resolução atingido.');
      break;
    }

    // Estável: prioridade e, em empate, ordem de chegada (índice).
    const indexed = pending.map((entry) => ({
      entry,
      index: draft.effectQueue.indexOf(entry),
    }));
    indexed.sort((a, b) => a.entry.priority - b.entry.priority || a.index - b.index);
    const next = indexed[0].entry;

    const outcome = resolveEffect(draft, next.effect);
    if (outcome.ok) {
      next.status = 'RESOLVED';
      next.result = outcome.message;
      resolved.push(next);
    } else {
      next.status = 'FAILED';
      next.result = outcome.reason;
      failed.push(next);
      pushLog(draft, 'ERROR', `Efeito recusado (${next.effect.kind}): ${outcome.reason}`);
    }
  }

  // Tudo que foi processado sai da fila e vai para o histórico de depuração.
  const processed = draft.effectQueue.filter((e) => e.status !== 'PENDING');
  for (const entry of processed) archive(draft, entry);
  draft.effectQueue = draft.effectQueue.filter((e) => e.status === 'PENDING');

  return { resolved, failed };
}

/** Atalho: enfileira um único efeito e resolve na hora. */
export function applyEffectNow(
  draft: GameState,
  params: { effect: EffectDescriptor; source: EffectSource; priority?: number },
): QueueResolution {
  enqueueEffect(draft, params);
  return resolveEffectQueue(draft);
}

export function clearEffectQueue(draft: GameState): number {
  const removed = draft.effectQueue.length;
  for (const entry of draft.effectQueue) {
    entry.status = 'SKIPPED';
    entry.result = 'Removido manualmente (DEV).';
    archive(draft, entry);
  }
  draft.effectQueue = [];
  return removed;
}
