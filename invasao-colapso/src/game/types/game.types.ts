import type { CardInstance, CardMode } from './card.types';
import type { CardInstanceId, PlayerId, SoldierId, TerritoryId } from './ids';
import type { Player } from './player.types';
import type { Soldier } from './soldier.types';
import type { Territory } from './territory.types';
import type { TurnState } from './turn.types';
import type { AnimationEvent } from './animation.types';
import type { AbilityRuntimeState } from '../abilities/ability.types';
import type { QueuedEffect } from '../effects/effect.types';
import type { AbilityTriggerRecord } from '../events/gameEvents';

/** Ataque declarado e ainda não resolvido — janela para cartas defensivas. */
export interface PendingAttack {
  id: string;
  attackerPlayerId: PlayerId;
  defenderPlayerId: PlayerId;
  fromTerritoryId: TerritoryId;
  toTerritoryId: TerritoryId;
  attackingSoldierIds: SoldierId[];
  status: 'DECLARED' | 'RESOLVED' | 'CANCELLED';
}

/**
 * Ocupação obrigatória após uma conquista: o território conquistado
 * NUNCA pode ficar com 0 tropas, então o jogo bloqueia até a transferência.
 */
export interface PendingOccupation {
  attackerPlayerId: PlayerId;
  fromTerritoryId: TerritoryId;
  toTerritoryId: TerritoryId;
  /** Mínimo obrigatório a transferir. */
  min: number;
  /** Máximo permitido (deixa ao menos 1 soldado na origem). */
  max: number;
  /** Soldados que participaram do ataque e estão elegíveis a ocupar. */
  eligibleSoldierIds: SoldierId[];
}

/** Redistribuição pendente das tropas capturadas pelo Sequestro. */
export interface PendingDistribution {
  playerId: PlayerId;
  soldierIds: SoldierId[];
  sourceCardId: CardInstanceId;
}

export interface GameLogEntry {
  id: string;
  turn: number;
  message: string;
  level: 'INFO' | 'ACTION' | 'COMBAT' | 'CARD' | 'ABILITY' | 'ERROR';
}

export const GAME_STATE_VERSION = 2;

export interface GameState {
  version: number;
  id: string;
  createdAt: number;
  status: 'IN_PROGRESS' | 'FINISHED';
  turn: TurnState;
  players: Record<string, Player>;
  territories: Record<string, Territory>;
  /** Registro único de soldados — nenhuma outra estrutura copia soldados. */
  soldiers: Record<string, Soldier>;
  cards: Record<string, CardInstance>;
  pendingAttack: PendingAttack | null;
  pendingOccupation: PendingOccupation | null;
  pendingDistribution: PendingDistribution | null;
  animationQueue: AnimationEvent[];
  /** Estado das habilidades por jogador (chave `playerId::abilityId`). */
  abilityStates: Record<string, AbilityRuntimeState>;
  /** Efeitos aguardando resolução, em ordem de prioridade. */
  effectQueue: QueuedEffect[];
  /** Efeitos já processados — só para depuração no painel DEV. */
  effectHistory: QueuedEffect[];
  /** Últimas habilidades acionadas, para o retorno visual ao jogador. */
  abilityFeed: AbilityTriggerRecord[];
  /** Chaves de eventos já emitidos: impede disparo duplicado. */
  emittedEventKeys: string[];
  log: GameLogEntry[];
  /** Contadores para geração de ids determinística. */
  counters: { soldier: number; card: number; event: number; log: number; effect: number };
}

export type CardUseIntent = { cardInstanceId: CardInstanceId; mode: CardMode };
