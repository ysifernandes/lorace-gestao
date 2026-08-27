import { TURN_PHASES } from '../types/turn.types';
import type { TurnPhase } from '../types/turn.types';

export const PHASE_LABELS: Record<TurnPhase, string> = {
  REFORCO: 'Reforço',
  ATAQUE_COMUM: 'Ataque Comum',
  ATAQUE_ESPECIAL: 'Ataque Especial',
  MOVIMENTACAO: 'Movimentação',
  CARTAS: 'Cartas',
  FIM_TURNO: 'Finalizar Turno',
};

export const PHASE_SHORT: Record<TurnPhase, string> = {
  REFORCO: '1 · Reforço',
  ATAQUE_COMUM: '2 · Ataque',
  ATAQUE_ESPECIAL: '3 · Especial',
  MOVIMENTACAO: '4 · Mover',
  CARTAS: '5 · Cartas',
  FIM_TURNO: '6 · Fim',
};

export const PHASE_DESCRIPTIONS: Record<TurnPhase, string> = {
  REFORCO: 'Distribua todos os reforços entre os seus territórios.',
  ATAQUE_COMUM: 'Um único Ataque Comum contra um território inimigo vizinho.',
  ATAQUE_ESPECIAL: 'Um único Ataque Especial, se houver carga de Transporte Especial.',
  MOVIMENTACAO: 'Reposicione tropas entre territórios seus vizinhos.',
  CARTAS: 'Compre e jogue cartas da sua mão.',
  FIM_TURNO: 'Efeitos de fim de turno e passagem da vez.',
};

export const PHASE_ORDER: readonly TurnPhase[] = TURN_PHASES;

export function isLastPhase(phase: TurnPhase): boolean {
  return phase === PHASE_ORDER[PHASE_ORDER.length - 1];
}

/** Próxima fase do ciclo; em FIM_TURNO volta para REFORCO (com troca de jogador). */
export function nextPhase(phase: TurnPhase): TurnPhase {
  const index = PHASE_ORDER.indexOf(phase);
  if (index < 0) throw new Error(`Fase desconhecida: ${phase}`);
  return PHASE_ORDER[(index + 1) % PHASE_ORDER.length];
}

export function phaseIndex(phase: TurnPhase): number {
  return PHASE_ORDER.indexOf(phase);
}
