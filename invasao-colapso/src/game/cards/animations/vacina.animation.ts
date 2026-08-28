import type { AnimationSpec } from '../../types/animation.types';

/** Roteiro da Vacina / Contra-Ataque. Etapa 1: só a declaração dos beats. */
export const VACINA_ANIMATION: AnimationSpec = {
  id: 'anim.vacina',
  name: 'Contramedida Biológica',
  beats: [
    { kind: 'SHIELD_RAISE', durationMs: 700, sound: 'shield_up' },
    { kind: 'ENERGY_BURST', durationMs: 600, sound: 'energy' },
    { kind: 'VACCINE_INJECT', durationMs: 900, sound: 'inject' },
    { kind: 'DICE_APPEAR', durationMs: 400 },
    { kind: 'DICE_ROLL', durationMs: 1200, sound: 'dice_roll' },
    { kind: 'DICE_RESULT', durationMs: 600 },
    { kind: 'TROOPS_ELIMINATED', durationMs: 900, sound: 'impact' },
  ],
};
