import type { CardMode } from '../types/card.types';
import type { CardDefinitionId, CardInstanceId, PlayerId, SoldierId, TerritoryId } from '../types/ids';
import type { CardActionParams } from '../cards/cardActions';
import type { NewGameOptions } from './setup';

/**
 * Todas as mutações da partida passam por uma ação.
 * Nenhum componente de UI altera o estado diretamente.
 */
export type GameAction =
  | { type: 'NEW_GAME'; options?: NewGameOptions }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'END_TURN' }
  // --- Reforço -------------------------------------------------------------
  | { type: 'ADD_SOLDIERS'; territoryId: TerritoryId; amount: number; ownerId?: PlayerId }
  | { type: 'AUTO_REINFORCE' }
  // --- Movimentação --------------------------------------------------------
  | { type: 'MOVE_SOLDIERS'; from: TerritoryId; to: TerritoryId; amount: number }
  // --- Combate -------------------------------------------------------------
  | { type: 'DECLARE_ATTACK'; from: TerritoryId; to: TerritoryId; amount?: number }
  /** Ataque Especial via Transporte Especial (distância exatamente 2). */
  | { type: 'DECLARE_SPECIAL_ATTACK'; from: TerritoryId; to: TerritoryId; amount: number }
  /** Uma rodada de dados dentro da MESMA batalha. */
  | { type: 'ROLL_BATTLE_ROUND' }
  | { type: 'RESOLVE_ATTACK' }
  | { type: 'CANCEL_ATTACK' }
  | { type: 'OCCUPY_TERRITORY'; amount: number }
  // --- Cartas --------------------------------------------------------------
  | { type: 'DRAW_CARD' }
  | { type: 'DISCARD_CARD'; cardInstanceId: CardInstanceId }
  | {
      type: 'PLAY_CARD';
      cardInstanceId: CardInstanceId;
      mode: CardMode;
      targetSoldierIds?: SoldierId[];
      params?: CardActionParams;
    }
  | { type: 'DISTRIBUTE_RESERVES'; assignments: { territoryId: TerritoryId; amount: number }[] }
  // --- Habilidades ---------------------------------------------------------
  | { type: 'ACTIVATE_ABILITY'; abilityId: string; params?: Record<string, unknown> }
  // --- Eventos do Colapso --------------------------------------------------
  /** Aplica o evento que estava em alerta, após a animação. */
  | { type: 'RESOLVE_COLLAPSE' }
  | { type: 'ACK_ANIMATION'; eventId: string }
  // --- DEV -----------------------------------------------------------------
  | { type: 'REMOVE_SOLDIERS'; territoryId: TerritoryId; amount: number }
  | { type: 'SET_CONTROLLER'; territoryId: TerritoryId; playerId: PlayerId | null }
  | { type: 'SET_CURRENT_PLAYER'; playerId: PlayerId }
  | { type: 'GRANT_CARD'; playerId: PlayerId; definitionId: CardDefinitionId }
  | { type: 'DEV_SET_ABILITY_ENABLED'; abilityId: string; playerId: PlayerId; enabled: boolean }
  | { type: 'DEV_RESET_ABILITY'; abilityId: string; playerId: PlayerId }
  | { type: 'DEV_CLEAR_EFFECTS' }
  | { type: 'DEV_SET_PHASE'; phase: string }
  | { type: 'DEV_FORCE_COLLAPSE'; eventId?: string }
  | { type: 'DEV_SET_MISSION'; playerId: PlayerId; missionId: string }
  | { type: 'DEV_COMPLETE_MISSION'; playerId: PlayerId }
  | { type: 'DEV_ELIMINATE_PLAYER'; playerId: PlayerId }
  | { type: 'DEV_SET_TRANSPORT'; playerId: PlayerId; charges: number }
  | { type: 'DEV_SET_DICE'; values: number[] | null }
  | { type: 'DEV_WIN_ATTACK' };

export type ActionResult =
  | { ok: true; state: import('../types/game.types').GameState; info?: string; data?: unknown }
  | { ok: false; state: import('../types/game.types').GameState; error: string };

export const cardModes: CardMode[] = ['PRIMARY', 'ALTERNATE'];
