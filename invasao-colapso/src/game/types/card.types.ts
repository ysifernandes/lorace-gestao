import type { CardDefinitionId, CardInstanceId, FactionId, PlayerId } from './ids';
import type { AnimationSpec } from './animation.types';

export type CardCategory = 'OPERACAO' | 'DEFESA' | 'EVENTO' | 'SUPORTE';

/** Tipo de uso, conforme o game design: ofensiva, defensiva, reativa ou tática. */
export type CardPlayType = 'OFENSIVA' | 'DEFENSIVA' | 'REATIVA' | 'TATICA';

/** Os dois usos possíveis de uma carta de duplo efeito. */
export type CardMode = 'PRIMARY' | 'ALTERNATE';

export type CardState = 'IN_DECK' | 'IN_HAND' | 'CONSUMED' | 'DISCARDED';

/** Condição declarativa avaliada pelo motor antes de permitir a ativação. */
export type ActivationCondition =
  | { type: 'PHASE_IS'; phases: string[] }
  | { type: 'IS_CURRENT_PLAYER' }
  | { type: 'HAS_PENDING_ATTACK_AGAINST_OWNER' }
  | { type: 'ENEMY_SOLDIERS_AVAILABLE'; min: number };

/**
 * AÇÃO DECLARATIVA DA CARTA.
 *
 * O que a carta faz é dado, não código: um resolvedor único
 * (`src/game/cards/cardActions.ts`) sabe aplicar cada `type`.
 * Nenhuma lógica de carta vive em componente visual.
 */
export type CardActionSpec =
  /** Sequestro e Vacina têm resolvedores próprios, herdados da Etapa 1. */
  | { type: 'SEQUESTRO' }
  | { type: 'VACINA' }
  /** Recebe N soldados para distribuir livremente entre territórios seus. */
  | { type: 'GAIN_TROOPS'; amount: number }
  /** Remove N soldados de um território inimigo (nunca abaixo de 1). */
  | { type: 'SABOTAGE'; amount: number }
  /** Concede movimentações adicionais neste turno. */
  | { type: 'EXTRA_MOVE'; amount: number }
  /** Move até N soldados para um território seu não adjacente. */
  | { type: 'EVACUATE'; amount: number }
  /** Protege um território seu por N rodadas. */
  | {
      type: 'SHIELD';
      rounds: number;
      attackerDiceReduction?: number;
      blockSpecialAttack?: boolean;
      ignoreFirstLossPerRound?: boolean;
    }
  /** O território inimigo escolhido não recebe reforço nem movimentação. */
  | { type: 'BLOCK_TERRITORY'; rounds: number }
  /** Limita os dados do próximo ataque contra você nesta rodada. */
  | { type: 'DICE_CAP_INCOMING'; value: number }
  /** Ao ser atacado: o atacante perde N soldados antes da primeira rodada. */
  | { type: 'AMBUSH'; amount: number }
  /** Relança o dado mais baixo uma vez, na batalha em andamento. */
  | { type: 'REROLL_LOWEST'; side: 'ATTACKER' | 'DEFENDER' }
  /** Devolve ao tabuleiro até N soldados seus perdidos nesta rodada. */
  | { type: 'RESTORE_TROOPS'; amount: number }
  /** 1 soldado inimigo passa para um território seu adjacente. */
  | { type: 'DEFECTION'; minEnemyTroops: number }
  /** Revela a mão de um adversário. */
  | { type: 'REVEAL_HAND' }
  /** Revela qual será o próximo Evento do Colapso. */
  | { type: 'PEEK_COLLAPSE' }
  /** Repete o último Evento do Colapso já revelado. */
  | { type: 'REPEAT_LAST_COLLAPSE' };

export interface CardEffectDefinition {
  id: string;
  name: string;
  description: string;
  /** Condições específicas deste efeito, somadas às da carta. */
  conditions: ActivationCondition[];
  /** Limites do efeito (ex.: máximo de alvos do Sequestro). */
  limits?: { maxTargets?: number; diceSides?: number };
  /** O que o efeito faz, de forma declarativa. */
  action?: CardActionSpec;
  animation: AnimationSpec;
}

export interface CardArt {
  /** Chave de arte; a UI resolve para imagem/gradiente. */
  key: string;
  /** Placeholder textual enquanto não há arte final. */
  emoji: string;
  palette: [string, string];
}

/** Definição estática (conteúdo). Uma por carta do jogo. */
export interface CardDefinition {
  id: CardDefinitionId;
  name: string;
  /** null = carta neutra, disponível a qualquer facção. */
  factionId: FactionId | null;
  category: CardCategory;
  /** Momento de uso. REATIVA só pode ser jogada fora do próprio turno. */
  playType: CardPlayType;
  description: string;
  primaryEffect: CardEffectDefinition;
  alternateEffect: CardEffectDefinition | null;
  /** Quantidade máxima de usos de uma cópia da carta. */
  maxUses: number;
  conditions: ActivationCondition[];
  art: CardArt;
}

/** Cópia da carta na partida (estado). */
export interface CardInstance {
  instanceId: CardInstanceId;
  definitionId: CardDefinitionId;
  ownerId: PlayerId;
  state: CardState;
  usesRemaining: number;
  /** Modo já utilizado. Preenchido no primeiro uso e trava o outro efeito. */
  usedMode: CardMode | null;
  history: { mode: CardMode; turn: number }[];
}
