import type { FactionId, PlayerId, TerritoryId } from '../types/ids';
import type { TurnPhase } from '../types/turn.types';
import type { EffectDescriptor } from '../effects/effect.types';
import type { AnimationSpec } from '../types/animation.types';
import type { GameEventKind, GameEventPayload } from '../events/gameEvents.types';
import type { GameState } from '../types/game.types';

/**
 * HABILIDADE ≠ CARTA
 *
 * Carta é um objeto que o jogador possui e normalmente consome.
 * Habilidade é característica da facção (futuramente também de unidade ou
 * comandante): tem cargas, recarga e limites próprios, e não sai da mão.
 */
export type AbilityKind =
  /** Sempre ativa quando as condições são atendidas. */
  | 'PASSIVE'
  /** O jogador precisa acionar. */
  | 'ACTIVE'
  /** Dispara em resposta a uma ação inimiga. */
  | 'REACTIVE'
  /** Afeta vários territórios ou a facção inteira. */
  | 'GLOBAL';

export type AbilityUsageScope = 'UNLIMITED' | 'PER_TURN' | 'PER_GAME' | 'COOLDOWN';

export interface AbilityUsage {
  scope: AbilityUsageScope;
  /** Cargas totais na partida (PER_GAME). */
  charges?: number;
  /** Limite de acionamentos por turno. */
  perTurn?: number;
  /** Turnos de recarga entre acionamentos. */
  cooldownTurns?: number;
}

/**
 * Condições declarativas. O avaliador vive em um lugar só —
 * nada de `if` por habilidade espalhado pela interface.
 */
export type AbilityCondition =
  | { type: 'IS_CURRENT_PLAYER' }
  | { type: 'PHASE_IS'; phases: TurnPhase[] }
  | { type: 'TERRITORY_COUNT_AT_MOST'; value: number }
  | { type: 'TERRITORY_COUNT_AT_LEAST'; value: number }
  | { type: 'TROOP_COUNT_AT_LEAST'; value: number }
  | { type: 'TROOP_COUNT_AT_MOST'; value: number }
  | { type: 'HAS_PENDING_ATTACK_AGAINST_OWNER' }
  | { type: 'CONTROLS_TERRITORY'; territoryId: TerritoryId }
  | { type: 'DICE_RESULT_AT_LEAST'; value: number }
  | { type: 'NO_PENDING_OCCUPATION' };

/** Contexto entregue à habilidade no momento em que ela dispara. */
export interface AbilityContext {
  state: GameState;
  playerId: PlayerId;
  event: { kind: GameEventKind; payload: GameEventPayload };
  /** Parâmetros informados pelo jogador (habilidades ATIVAS). */
  params?: Record<string, unknown>;
}

export interface AbilityFeedback {
  /** Título curto mostrado ao jogador. Ex.: "SOBREVIVÊNCIA ATIVADA". */
  title: string;
  /** Detalhe calculado a partir do que realmente aconteceu. */
  detail?: (context: AbilityContext) => string;
}

export interface AbilityDefinition {
  id: string;
  /** null = habilidade neutra, disponível a qualquer facção. */
  factionId: FactionId | null;
  name: string;
  description: string;
  kind: AbilityKind;
  /** Eventos que podem disparar a habilidade (PASSIVE/REACTIVE/GLOBAL). */
  triggers: GameEventKind[];
  conditions: AbilityCondition[];
  usage: AbilityUsage;
  /** Traduz o momento em efeitos concretos para a fila. */
  produceEffects: (context: AbilityContext) => EffectDescriptor[];
  /** Validação extra das habilidades ATIVAS antes de aceitar o acionamento. */
  validateParams?: (context: AbilityContext) => { ok: true } | { ok: false; error: string };
  feedback: AbilityFeedback;
  /** Roteiro de animação futuro — hoje só declarado. */
  animation?: AnimationSpec;
  /** Marca regras que ainda dependem de decisão do criador. */
  provisional?: boolean;
}

/** Estado da habilidade dentro da partida (serializável). */
export interface AbilityRuntimeState {
  abilityId: string;
  playerId: PlayerId;
  /** Desligada pelo painel DEV. */
  enabled: boolean;
  /** -1 = ilimitado. */
  chargesRemaining: number;
  usesThisTurn: number;
  /** Turno a partir do qual volta a ficar disponível. */
  availableFromTurn: number;
  lastUsedTurn: number | null;
  timesUsed: number;
}

export type AbilityAvailability =
  | { available: true }
  | { available: false; reason: string };
