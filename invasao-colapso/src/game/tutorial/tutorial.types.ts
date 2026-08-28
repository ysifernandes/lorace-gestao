import type { GameState } from '../types/game.types';
import type { TerritoryId } from '../types/ids';
import type { TurnPhase } from '../types/turn.types';

/**
 * TUTORIAL INTERATIVO — DADOS, NÃO IA.
 *
 * Cada passo é um objeto declarado em `tutorial.steps.ts`. O tutorial NÃO
 * inventa regra nenhuma: ele conduz o jogador por ações reais do motor e
 * observa o estado para decidir quando avançar.
 *
 * Esta camada é PURA: não conhece React, DOM nem animação.
 */

/** O que o passo destaca no mapa enquanto está ativo. */
export type TutorialFocus =
  | { kind: 'NONE' }
  | { kind: 'REGION'; regionId: string }
  | { kind: 'TERRITORIES'; territoryIds: TerritoryId[] }
  /** Um elemento da interface, identificado por um marcador estável. */
  | { kind: 'UI'; anchor: TutorialAnchor };

/** Marcadores de interface que os passos podem apontar. */
export type TutorialAnchor =
  | 'PHASE_BAR'
  | 'PRIMARY_ACTION'
  | 'HAND'
  | 'MISSION_BUTTON'
  | 'BATTLE_PANEL'
  | 'ROLL_BUTTON'
  | 'MAP';

/** Como o passo termina. */
export type TutorialAdvance =
  /** O jogador lê e confirma. */
  | { kind: 'CONFIRM'; label: string }
  /** O jogador precisa executar algo; o motor confirma pelo estado. */
  | { kind: 'DO'; hint: string };

export interface TutorialStep {
  id: string;
  /** Título curto mostrado no cartão. */
  title: string;
  /** Uma ou duas frases. Nada de parede de texto. */
  body: string;
  /** Regra oficial que o passo ensina, quando houver. */
  rule?: string;
  focus: TutorialFocus;
  advance: TutorialAdvance;
  /**
   * Prepara o estado antes do passo (posicionar tropas, dar carta, forçar
   * evento). Recebe e devolve estado — sempre via ações do motor.
   */
  prepare?: (state: GameState) => GameState;
  /**
   * Satisfeito? Só é consultado quando `advance.kind === 'DO'`.
   * Recebe também o estado de quando o passo começou, para comparar.
   */
  done?: (state: GameState, atStart: GameState) => boolean;
  /** Fases em que o passo faz sentido — usado para diagnóstico. */
  phase?: TurnPhase;
}

export interface TutorialProgress {
  /** Índice do passo atual. */
  index: number;
  /** Total de passos. */
  total: number;
  /** true quando o último passo foi concluído. */
  finished: boolean;
}
