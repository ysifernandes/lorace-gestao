import { TURN_PHASES } from '../types/turn.types';
import type { TurnPhase } from '../types/turn.types';

export const PHASE_LABELS: Record<TurnPhase, string> = {
  INICIO: 'Início do Turno',
  REFORCO: 'Reforço',
  ACAO: 'Ação',
  COMBATE: 'Combate',
  MOVIMENTACAO: 'Movimentação',
  FIM: 'Finalizar Turno',
};

export const PHASE_DESCRIPTIONS: Record<TurnPhase, string> = {
  INICIO: 'Coleta de informações e efeitos de início de turno.',
  REFORCO: 'Distribuição de novas tropas nos territórios controlados.',
  ACAO: 'Uso de cartas e habilidades de facção.',
  COMBATE: 'Declaração e resolução de ataques.',
  MOVIMENTACAO: 'Reposicionamento de tropas entre territórios vizinhos.',
  FIM: 'Encerramento do turno e passagem para o próximo jogador.',
};

export const PHASE_ORDER: readonly TurnPhase[] = TURN_PHASES;

export function isLastPhase(phase: TurnPhase): boolean {
  return phase === PHASE_ORDER[PHASE_ORDER.length - 1];
}

/** Próxima fase do ciclo; em FIM volta para INICIO (com troca de jogador). */
export function nextPhase(phase: TurnPhase): TurnPhase {
  const index = PHASE_ORDER.indexOf(phase);
  if (index < 0) throw new Error(`Fase desconhecida: ${phase}`);
  return PHASE_ORDER[(index + 1) % PHASE_ORDER.length];
}
