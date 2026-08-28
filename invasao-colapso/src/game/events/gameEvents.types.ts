import type { PlayerId, SoldierId, TerritoryId } from '../types/ids';

/**
 * Eventos do jogo. Habilidades se inscrevem neles em vez de serem
 * chamadas manualmente de dentro do reducer.
 */
export type GameEventKind =
  | 'TURN_STARTED'
  | 'TURN_ENDED'
  | 'PHASE_CHANGED'
  | 'BATTLE_STARTED'
  | 'BEFORE_ATTACK'
  | 'AFTER_ATTACK'
  | 'BEFORE_DEFENSE'
  | 'AFTER_DEFENSE'
  | 'TERRITORY_CONQUERED'
  | 'TERRITORY_LOST'
  | 'TROOPS_MOVED'
  | 'CARD_ACTIVATED'
  | 'DICE_ROLLED'
  | 'ABILITY_ACTIVATED';

export interface GameEventPayload {
  playerId?: PlayerId;
  opponentId?: PlayerId;
  territoryId?: TerritoryId;
  fromTerritoryId?: TerritoryId;
  toTerritoryId?: TerritoryId;
  soldierIds?: SoldierId[];
  amount?: number;
  diceValue?: number;
  cardInstanceId?: string;
  abilityId?: string;
  [key: string]: unknown;
}

export interface GameEvent {
  id: string;
  kind: GameEventKind;
  payload: GameEventPayload;
  turn: number;
  /** Chave de idempotência: impede o mesmo evento de disparar duas vezes. */
  dedupeKey?: string;
}
