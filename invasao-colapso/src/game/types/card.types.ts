import type { CardDefinitionId, CardInstanceId, FactionId, PlayerId } from './ids';
import type { AnimationSpec } from './animation.types';

export type CardCategory = 'OPERACAO' | 'DEFESA' | 'EVENTO' | 'SUPORTE';

/** Os dois usos possíveis de uma carta de duplo efeito. */
export type CardMode = 'PRIMARY' | 'ALTERNATE';

export type CardState = 'IN_DECK' | 'IN_HAND' | 'CONSUMED' | 'DISCARDED';

/** Condição declarativa avaliada pelo motor antes de permitir a ativação. */
export type ActivationCondition =
  | { type: 'PHASE_IS'; phases: string[] }
  | { type: 'IS_CURRENT_PLAYER' }
  | { type: 'HAS_PENDING_ATTACK_AGAINST_OWNER' }
  | { type: 'ENEMY_SOLDIERS_AVAILABLE'; min: number };

export interface CardEffectDefinition {
  id: string;
  name: string;
  description: string;
  /** Condições específicas deste efeito, somadas às da carta. */
  conditions: ActivationCondition[];
  /** Limites do efeito (ex.: máximo de alvos do Sequestro). */
  limits?: { maxTargets?: number; diceSides?: number };
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
