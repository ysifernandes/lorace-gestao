import type { AnimationSpec } from '../../types/animation.types';

/**
 * Roteiros declarados para animações futuras. Nesta etapa apenas existem:
 * a regra emite o evento, o palco decide o que desenhar.
 */
export const SOBREVIVENCIA_ANIMATION: AnimationSpec = {
  id: 'anim.sobrevivencia',
  name: 'Chamado de Reforço',
  beats: [
    { kind: 'ENERGY_BURST', durationMs: 400, sound: 'radio_static' },
    { kind: 'SEARCHLIGHT', durationMs: 500 },
    { kind: 'APPROACH_TERRITORY', durationMs: 900, sound: 'convoy' },
    { kind: 'DUST', durationMs: 500 },
    { kind: 'PARTICLES', durationMs: 400 },
  ],
};

export const OPERACAO_AEREA_ANIMATION: AnimationSpec = {
  id: 'anim.operacao-aerea',
  name: 'Ponte Aérea',
  beats: [
    { kind: 'SEARCHLIGHT', durationMs: 600, sound: 'radio' },
    { kind: 'HELICOPTER_ENTER', durationMs: 1100, sound: 'heli_approach' },
    { kind: 'ROTOR_SPIN', durationMs: 0, sound: 'rotor_loop' },
    { kind: 'HOIST_SOLDIERS', durationMs: 1000, sound: 'boarding' },
    { kind: 'APPROACH_TERRITORY', durationMs: 1400, sound: 'heli_cruise' },
    { kind: 'DUST', durationMs: 500 },
    { kind: 'HELICOPTER_EXIT', durationMs: 900, sound: 'heli_departure' },
  ],
};
