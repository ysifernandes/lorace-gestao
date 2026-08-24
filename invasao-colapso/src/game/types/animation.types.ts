/**
 * Etapa 1: apenas a ESTRUTURA. As regras emitem eventos de animação;
 * a UI (hoje) só mostra um resumo. As cenas cinematográficas entram
 * depois, consumindo estes mesmos eventos, sem tocar na regra da carta.
 */
export type AnimationBeatKind =
  | 'HELICOPTER_ENTER'
  | 'ROTOR_SPIN'
  | 'SEARCHLIGHT'
  | 'APPROACH_TERRITORY'
  | 'SELECT_SOLDIERS'
  | 'HOIST_SOLDIERS'
  | 'HELICOPTER_EXIT'
  | 'PARTICLES'
  | 'DUST'
  | 'SHIELD_RAISE'
  | 'ENERGY_BURST'
  | 'VACCINE_INJECT'
  | 'DICE_APPEAR'
  | 'DICE_ROLL'
  | 'DICE_RESULT'
  | 'TROOPS_ELIMINATED';

export interface AnimationBeat {
  kind: AnimationBeatKind;
  /** Duração sugerida em ms; a implementação final pode ignorar. */
  durationMs: number;
  /** Trilha sonora/efeito sonoro associado (a carregar em etapa futura). */
  sound?: string;
}

/** Roteiro declarativo de uma animação. */
export interface AnimationSpec {
  id: string;
  name: string;
  beats: AnimationBeat[];
}

/** Evento emitido em runtime, já com os dados reais da jogada. */
export interface AnimationEvent {
  id: string;
  specId: string;
  createdAtTurn: number;
  /** Dados concretos da jogada (soldados, territórios, dado...). */
  payload: Record<string, unknown>;
  status: 'PENDING' | 'PLAYED';
}
