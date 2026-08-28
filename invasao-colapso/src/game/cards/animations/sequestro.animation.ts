import type { AnimationSpec } from '../../types/animation.types';

/** Roteiro do Sequestro. Etapa 1: só a declaração dos beats. */
export const SEQUESTRO_ANIMATION: AnimationSpec = {
  id: 'anim.sequestro',
  name: 'Extração Aérea',
  beats: [
    { kind: 'HELICOPTER_ENTER', durationMs: 1200, sound: 'heli_approach' },
    { kind: 'ROTOR_SPIN', durationMs: 0, sound: 'rotor_loop' },
    { kind: 'SEARCHLIGHT', durationMs: 800 },
    { kind: 'APPROACH_TERRITORY', durationMs: 900, sound: 'heli_hover' },
    { kind: 'DUST', durationMs: 600 },
    { kind: 'SELECT_SOLDIERS', durationMs: 700 },
    { kind: 'HOIST_SOLDIERS', durationMs: 1400, sound: 'winch' },
    { kind: 'PARTICLES', durationMs: 500 },
    { kind: 'HELICOPTER_EXIT', durationMs: 1200, sound: 'heli_departure' },
  ],
};
