import type { PlayerId, SoldierId, TerritoryId } from '../types/ids';

/**
 * CATÁLOGO DE EFEITOS DO MOTOR
 *
 * Descreve o que o jogo é CAPAZ de fazer — não o que uma facção específica faz.
 * Uma habilidade ou carta apenas descreve efeitos; quem sabe aplicá-los é o
 * resolvedor. Assim, adicionar poder novo não espalha `if` pela interface.
 *
 * Efeitos ainda sem resolvedor são declarados mesmo assim: o motor os registra
 * como NÃO IMPLEMENTADO e segue a partida, em vez de quebrar.
 */
export type EffectKind =
  | 'GRANT_REINFORCEMENTS'
  | 'ADD_TROOPS'
  | 'REMOVE_TROOPS'
  | 'MOVE_TROOPS'
  | 'CONVERT_TROOPS'
  | 'MODIFY_ATTACK'
  | 'MODIFY_DEFENSE'
  | 'MODIFY_DICE'
  | 'REROLL_DICE'
  | 'BLOCK_ATTACK'
  | 'BLOCK_CARD'
  | 'PROTECT_TERRITORY'
  | 'REVEAL_INFO'
  | 'CAPTURE_UNITS'
  | 'HEAL_UNIT'
  | 'MODIFY_MOVEMENT';

export type EffectDescriptor =
  /** Aumenta os reforços pendentes do jogador no turno atual. */
  | { kind: 'GRANT_REINFORCEMENTS'; playerId: PlayerId; amount: number }
  | { kind: 'ADD_TROOPS'; territoryId: TerritoryId; amount: number; ownerId?: PlayerId }
  | { kind: 'REMOVE_TROOPS'; territoryId: TerritoryId; amount: number }
  /** `ignoreAdjacency` existe para poderes como a Operação Aérea. */
  | {
      kind: 'MOVE_TROOPS';
      from: TerritoryId;
      to: TerritoryId;
      amount: number;
      ignoreAdjacency?: boolean;
      minLeftBehind?: number;
    }
  | { kind: 'CONVERT_TROOPS'; soldierIds: SoldierId[]; toPlayerId: PlayerId }
  // --- Declarados para etapas futuras (sem resolvedor ainda) ---
  | { kind: 'MODIFY_ATTACK'; playerId: PlayerId; delta: number }
  | { kind: 'MODIFY_DEFENSE'; playerId: PlayerId; delta: number }
  | { kind: 'MODIFY_DICE'; playerId: PlayerId; delta: number }
  | { kind: 'REROLL_DICE'; playerId: PlayerId; times: number }
  | { kind: 'BLOCK_ATTACK'; territoryId: TerritoryId }
  | { kind: 'BLOCK_CARD'; playerId: PlayerId }
  | { kind: 'PROTECT_TERRITORY'; territoryId: TerritoryId; turns: number }
  | { kind: 'REVEAL_INFO'; playerId: PlayerId; scope: string }
  | { kind: 'CAPTURE_UNITS'; soldierIds: SoldierId[]; captorId: PlayerId }
  | { kind: 'HEAL_UNIT'; soldierIds: SoldierId[] }
  | { kind: 'MODIFY_MOVEMENT'; playerId: PlayerId; delta: number };

/** De onde o efeito veio — usado para prioridade, log e depuração. */
export interface EffectSource {
  kind: 'ABILITY' | 'CARD' | 'SYSTEM';
  id: string;
  playerId?: PlayerId;
  label?: string;
}

export type EffectStatus = 'PENDING' | 'RESOLVED' | 'FAILED' | 'SKIPPED';

export interface QueuedEffect {
  id: string;
  effect: EffectDescriptor;
  source: EffectSource;
  /** Menor número resolve primeiro. */
  priority: number;
  status: EffectStatus;
  createdAtTurn: number;
  /** Preenchido na resolução — explica sucesso ou recusa. */
  result?: string;
}

/**
 * Prioridades da fila. Existem para que, quando várias coisas quiserem
 * acontecer no mesmo instante (ataque + habilidade + carta defensiva),
 * a ordem seja previsível em vez de acidental.
 */
export const EFFECT_PRIORITY = {
  /** Bloqueios resolvem antes de tudo: podem cancelar o resto. */
  BLOCK: 0,
  /** Reação defensiva do alvo. */
  DEFENSE_REACTION: 10,
  /** Habilidade de facção. */
  ABILITY: 20,
  /** Efeito de carta. */
  CARD: 30,
  /** Resolução de combate. */
  COMBAT: 40,
  /** Manutenção do sistema (reforços, limpeza). */
  SYSTEM: 50,
} as const;
