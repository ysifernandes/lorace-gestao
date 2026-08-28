import type { GameState } from '../types/game.types';
import type { PlayerId } from '../types/ids';
import type {
  AbilityAvailability,
  AbilityContext,
  AbilityDefinition,
  AbilityRuntimeState,
} from './ability.types';
import type { GameEventKind, GameEventPayload } from '../events/gameEvents.types';
import { abilitiesOfFaction, getAbility, tryGetAbility } from './ability.registry';
import { evaluateConditions } from './conditions';

/** Chave estável do estado de uma habilidade por jogador. */
export function abilityKey(playerId: PlayerId, abilityId: string): string {
  return `${playerId}::${abilityId}`;
}

export function initialAbilityState(
  playerId: PlayerId,
  ability: AbilityDefinition,
): AbilityRuntimeState {
  const charges =
    ability.usage.scope === 'PER_GAME' ? (ability.usage.charges ?? 1) : -1;
  return {
    abilityId: ability.id,
    playerId,
    enabled: true,
    chargesRemaining: charges,
    usesThisTurn: 0,
    availableFromTurn: 1,
    lastUsedTurn: null,
    timesUsed: 0,
  };
}

/** Cria o estado das habilidades de um jogador conforme a facção dele. */
export function seedAbilityStates(draft: GameState, playerId: PlayerId): void {
  const player = draft.players[playerId as string];
  if (!player) return;
  for (const ability of abilitiesOfFaction(player.factionId)) {
    const key = abilityKey(playerId, ability.id);
    if (!draft.abilityStates[key]) {
      draft.abilityStates[key] = initialAbilityState(playerId, ability);
    }
  }
}

export function getAbilityState(
  state: GameState,
  playerId: PlayerId,
  abilityId: string,
): AbilityRuntimeState | undefined {
  return state.abilityStates[abilityKey(playerId, abilityId)];
}

/** Habilidades que o jogador possui, com definição e estado juntos. */
export function abilitiesOfPlayer(
  state: GameState,
  playerId: PlayerId,
): { definition: AbilityDefinition; runtime: AbilityRuntimeState }[] {
  const player = state.players[playerId as string];
  if (!player) return [];
  return abilitiesOfFaction(player.factionId)
    .map((definition) => ({
      definition,
      runtime: state.abilityStates[abilityKey(playerId, definition.id)],
    }))
    .filter((entry): entry is { definition: AbilityDefinition; runtime: AbilityRuntimeState } =>
      Boolean(entry.runtime),
    );
}

/** Checa apenas os limites de uso (cargas, por turno, recarga). */
export function checkUsage(
  state: GameState,
  runtime: AbilityRuntimeState,
  ability: AbilityDefinition,
): AbilityAvailability {
  if (!runtime.enabled) return { available: false, reason: 'Habilidade desativada (DEV).' };
  if (runtime.chargesRemaining === 0) {
    return { available: false, reason: 'Sem cargas restantes nesta partida.' };
  }
  const perTurn = ability.usage.perTurn;
  if (perTurn !== undefined && runtime.usesThisTurn >= perTurn) {
    return { available: false, reason: 'Limite de usos neste turno atingido.' };
  }
  if (state.turn.number < runtime.availableFromTurn) {
    return {
      available: false,
      reason: `Em recarga até o turno ${runtime.availableFromTurn}.`,
    };
  }
  return { available: true };
}

/** Checa uso + condições. É o que a interface consulta para habilitar botões. */
export function checkAvailability(
  state: GameState,
  playerId: PlayerId,
  abilityId: string,
  payload: GameEventPayload = {},
): AbilityAvailability {
  const ability = tryGetAbility(abilityId);
  if (!ability) return { available: false, reason: 'Habilidade desconhecida.' };
  const runtime = getAbilityState(state, playerId, abilityId);
  if (!runtime) return { available: false, reason: 'Sua facção não possui esta habilidade.' };

  const usage = checkUsage(state, runtime, ability);
  if (!usage.available) return usage;

  const conditions = evaluateConditions(state, playerId, ability.conditions, payload);
  if (!conditions.ok) return { available: false, reason: conditions.reason };

  return { available: true };
}

/** Registra um acionamento: consome carga, conta uso e aplica recarga. */
export function consumeUsage(
  draft: GameState,
  playerId: PlayerId,
  ability: AbilityDefinition,
): void {
  const runtime = draft.abilityStates[abilityKey(playerId, ability.id)];
  if (!runtime) return;
  if (runtime.chargesRemaining > 0) runtime.chargesRemaining -= 1;
  runtime.usesThisTurn += 1;
  runtime.timesUsed += 1;
  runtime.lastUsedTurn = draft.turn.number;
  const cooldown = ability.usage.cooldownTurns ?? 0;
  if (cooldown > 0) runtime.availableFromTurn = draft.turn.number + cooldown;
}

/** Zera os contadores por turno do jogador que está começando a vez. */
export function resetTurnCounters(draft: GameState, playerId: PlayerId): void {
  for (const runtime of Object.values(draft.abilityStates)) {
    if (runtime.playerId === playerId) runtime.usesThisTurn = 0;
  }
}

/** Habilidades inscritas em um evento, para o despachante de eventos. */
export function abilitiesListeningTo(
  state: GameState,
  playerId: PlayerId,
  kind: GameEventKind,
): AbilityDefinition[] {
  return abilitiesOfPlayer(state, playerId)
    .map((entry) => entry.definition)
    .filter((definition) => definition.triggers.includes(kind));
}

export function buildContext(
  state: GameState,
  playerId: PlayerId,
  kind: GameEventKind,
  payload: GameEventPayload,
  params?: Record<string, unknown>,
): AbilityContext {
  return { state, playerId, event: { kind, payload }, params };
}

export { getAbility };
