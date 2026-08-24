import type { CardMode } from '../types/card.types';
import type { CardDefinitionId, CardInstanceId, PlayerId, SoldierId, TerritoryId } from '../types/ids';

/**
 * Todas as mutações da partida passam por uma ação.
 * Nenhum componente de UI altera o estado diretamente.
 */
export type GameAction =
  | { type: 'NEW_GAME' }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'END_TURN' }
  | { type: 'ADD_SOLDIERS'; territoryId: TerritoryId; amount: number; ownerId?: PlayerId }
  | { type: 'MOVE_SOLDIERS'; from: TerritoryId; to: TerritoryId; amount: number }
  | {
      type: 'DECLARE_ATTACK';
      from: TerritoryId;
      to: TerritoryId;
      amount: number;
    }
  | { type: 'RESOLVE_ATTACK' }
  | { type: 'CANCEL_ATTACK' }
  /** DEV/temporário: vence o ataque atual eliminando os defensores (Etapa 3 substitui). */
  | { type: 'DEV_WIN_ATTACK' }
  | { type: 'OCCUPY_TERRITORY'; amount: number }
  | { type: 'REMOVE_SOLDIERS'; territoryId: TerritoryId; amount: number }
  | { type: 'SET_CONTROLLER'; territoryId: TerritoryId; playerId: PlayerId | null }
  | { type: 'SET_CURRENT_PLAYER'; playerId: PlayerId }
  | { type: 'PLAY_CARD'; cardInstanceId: CardInstanceId; mode: CardMode; targetSoldierIds?: SoldierId[] }
  | { type: 'DISTRIBUTE_RESERVES'; assignments: { territoryId: TerritoryId; amount: number }[] }
  | { type: 'GRANT_CARD'; playerId: PlayerId; definitionId: CardDefinitionId }
  | { type: 'ACK_ANIMATION'; eventId: string }
  /** Aciona uma habilidade ATIVA da facção (ex.: Operação Aérea). */
  | { type: 'ACTIVATE_ABILITY'; abilityId: string; params?: Record<string, unknown> }
  // --- DEV: depuração de habilidades e efeitos ---
  | { type: 'DEV_SET_ABILITY_ENABLED'; abilityId: string; playerId: PlayerId; enabled: boolean }
  | { type: 'DEV_RESET_ABILITY'; abilityId: string; playerId: PlayerId }
  | { type: 'DEV_CLEAR_EFFECTS' };

export type ActionResult =
  | { ok: true; state: import('../types/game.types').GameState; info?: string; data?: unknown }
  | { ok: false; state: import('../types/game.types').GameState; error: string };

export const cardModes: CardMode[] = ['PRIMARY', 'ALTERNATE'];
