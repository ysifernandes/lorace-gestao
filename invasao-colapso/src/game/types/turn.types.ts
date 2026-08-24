import type { PlayerId } from './ids';

export const TURN_PHASES = [
  'INICIO',
  'REFORCO',
  'ACAO',
  'COMBATE',
  'MOVIMENTACAO',
  'FIM',
] as const;

export type TurnPhase = (typeof TURN_PHASES)[number];

export interface TurnState {
  /** Número do turno (rodada global), começa em 1. */
  number: number;
  phase: TurnPhase;
  currentPlayerId: PlayerId;
  /** Índice na ordem de jogo; permite ordem customizada no futuro. */
  order: PlayerId[];
  currentIndex: number;
  /** Reforços ainda não posicionados nesta fase de REFORCO. */
  pendingReinforcements: number;
}
