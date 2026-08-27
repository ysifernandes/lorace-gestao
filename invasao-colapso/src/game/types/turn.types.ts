import type { PlayerId } from './ids';

/**
 * ORDEM OFICIAL DAS FASES — REGRA APROVADA PELO CRIADOR.
 *
 * 1 REFORÇO → 2 ATAQUE COMUM → 3 ATAQUE ESPECIAL → 4 MOVIMENTAÇÃO
 * → 5 CARTAS → 6 FINALIZAR TURNO
 *
 * A ordem não pode ser alterada. Fases podem ser puladas pelo jogador,
 * nunca reordenadas.
 */
export const TURN_PHASES = [
  'REFORCO',
  'ATAQUE_COMUM',
  'ATAQUE_ESPECIAL',
  'MOVIMENTACAO',
  'CARTAS',
  'FIM_TURNO',
] as const;

export type TurnPhase = (typeof TURN_PHASES)[number];

export interface TurnState {
  /** Rodada: um ciclo completo por todos os jogadores vivos. Começa em 1. */
  number: number;
  /** Quantos turnos individuais já foram jogados na partida. */
  turnsPlayed: number;
  phase: TurnPhase;
  currentPlayerId: PlayerId;
  /** Ordem de jogo sorteada na preparação. */
  order: PlayerId[];
  currentIndex: number;
  /** Reforços ainda não posicionados nesta fase de REFORÇO. */
  pendingReinforcements: number;
  /** REGRA OFICIAL: somente 1 Ataque Comum por turno. */
  commonAttackUsed: boolean;
  /** REGRA OFICIAL: no máximo 1 Ataque Especial por turno. */
  specialAttackUsed: boolean;
  /** Movimentações já feitas neste turno. */
  movesUsed: number;
  /** Movimentações permitidas neste turno (facções podem alterar). */
  movesAllowed: number;
  /** Se o jogador já comprou carta nesta fase de CARTAS. */
  drewCard: boolean;
  /** Territórios conquistados neste turno — dá direito à compra de carta. */
  conquestsThisTurn: number;
}
