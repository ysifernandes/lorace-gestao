import type { CardInstance, CardMode } from './card.types';
import type { CardDefinitionId, CardInstanceId, PlayerId, SoldierId, TerritoryId } from './ids';
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
  /** ATAQUE COMUM ou ATAQUE ESPECIAL (Transporte Especial / Razia). */
  kind: 'COMMON' | 'SPECIAL';
  /** Rodadas de dados já resolvidas dentro desta MESMA batalha. */
  rounds: BattleRound[];
  /** Limite de dados do atacante imposto por regra (ex.: Poço = 2). */
  attackerDiceCap: number;
  defenderDiceCap: number;
  /** Cartas reativas já jogadas nesta batalha, por jogador. */
  reactionsUsed: PlayerId[];
  /** Relançamentos pendentes de dado mais baixo (Moral Elevado / Terreno Conhecido). */
  rerolls?: ('ATTACKER' | 'DEFENDER')[];
  status: 'DECLARED' | 'RESOLVED' | 'CANCELLED';
}

/** Resultado de uma rodada de dados dentro de uma batalha. */
export interface BattleRound {
  index: number;
  attackerDice: number[];
  defenderDice: number[];
  comparisons: { attacker: number; defender: number; winner: 'ATTACKER' | 'DEFENDER' }[];
  attackerLosses: number;
  defenderLosses: number;
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
  level: 'INFO' | 'ACTION' | 'COMBAT' | 'CARD' | 'ABILITY' | 'ERROR' | 'COLLAPSE';
}

/** Objetivo secreto entregue a um jogador. Só o dono enxerga. */
export interface PlayerMission {
  missionId: string;
  playerId: PlayerId;
  /** Missão substituta quando a original virou impossível (facção eliminada por terceiro). */
  replacedBy?: string;
  completed: boolean;
  /** Revelada ao final da partida ou quando o dono é eliminado. */
  revealed: boolean;
  /** Progresso legível calculado pelo verificador. */
  progress?: string;
  /** Rastreamento contínuo exigido por missões de ritmo e tempo. */
  tracking: {
    /** Rodadas em que o jogador conquistou ao menos 1 território. */
    conquestRounds: number[];
    /** Regiões onde já conquistou ao menos 1 território. */
    regionsTouched: string[];
    /** Rodadas seguidas segurando a região exigida. */
    holdRounds: number;
    /** Eventos do Colapso sobrevividos. */
    collapseSurvived: number;
  };
}

/** Efeito temporário de Evento do Colapso ativo no tabuleiro. */
export interface ActiveCollapseEffect {
  id: string;
  eventId: string;
  /** Rodada (inclusive) em que o efeito deixa de valer. */
  untilRound: number;
  targetRegionId?: string;
  targetTerritoryId?: TerritoryId;
  targetPlayerId?: PlayerId;
  data?: Record<string, unknown>;
}

/** Estado do motor de Eventos do Colapso. Nunca exposto ao jogador. */
export interface CollapseState {
  /** Ordem embaralhada dos eventos ainda não usados (saco). */
  bag: string[];
  used: string[];
  /** Rodadas seguidas sem evento — aumenta a chance. SEGREDO. */
  pressure: number;
  /** Rodadas restantes de cooldown após um evento. SEGREDO. */
  cooldown: number;
  triggered: number;
  /** Evento revelado aguardando a animação de alerta terminar. */
  pending: {
    eventId: string;
    targetRegionId?: string;
    targetTerritoryId?: TerritoryId;
    targetPlayerId?: PlayerId;
  } | null;
  active: ActiveCollapseEffect[];
  history: { eventId: string; round: number; summary: string }[];
  /** Forçado pelo evento RECURSÃO: próximo ciclo dispara com certeza. */
  forceNext: boolean;
}

/**
 * Modificador temporário aplicado a um território.
 * Cobre Barreira, Barricada, Cepa Resistente e Desmanche sem que nenhum
 * desses efeitos precise de código próprio no combate.
 */
export interface TerritoryModifier {
  id: string;
  territoryId: TerritoryId;
  ownerId: PlayerId;
  /** Rodada (inclusive) até a qual o modificador vale. */
  untilRound: number;
  /** Reduz os dados de quem ataca este território. */
  attackerDiceReduction?: number;
  /** Impede que o território seja alvo de Ataque Especial. */
  blockSpecialAttack?: boolean;
  /** Ao defender, ignora a primeira comparação perdida de cada rodada. */
  ignoreFirstLossPerRound?: boolean;
  /** Não pode receber reforço nem ser destino de movimentação. */
  blockReinforce?: boolean;
  /** Armadilha: quem conquistar este território perde N soldados. */
  trapDamage?: number;
  source: string;
}

export interface GameResult {
  winnerId: PlayerId | null;
  reason: 'MISSION' | 'DOMINATION' | 'LAST_STANDING' | 'ROUND_LIMIT';
  detail: string;
  finishedAtRound: number;
}

export const GAME_STATE_VERSION = 3;

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
  /** Baralho do Colapso: ids de definição, do topo para o fundo. */
  deck: CardDefinitionId[];
  discard: CardDefinitionId[];
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
  /** Objetivos secretos por jogador. */
  missions: Record<string, PlayerMission>;
  collapse: CollapseState;
  /** Conexões desativadas temporariamente (Poço desabado, ponte rompida). */
  disabledLinks: { key: string; a: TerritoryId; b: TerritoryId; untilRound: number }[];
  /** Modificadores temporários de território (escudos, bloqueios). */
  territoryModifiers: TerritoryModifier[];
  result: GameResult | null;
  log: GameLogEntry[];
  /** Contadores para geração de ids determinística. */
  counters: { soldier: number; card: number; event: number; log: number; effect: number };
}

export type CardUseIntent = { cardInstanceId: CardInstanceId; mode: CardMode };
