import type { Rng } from '../rng/rng';
import { defaultRng } from '../rng/rng';

export interface DiceRoll {
  sides: number;
  value: number;
}

/** Rola um dado de `sides` faces. Resultado sempre inteiro em [1, sides]. */
export function rollDie(sides = 6, rng: Rng = defaultRng): DiceRoll {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new Error(`Número de faces inválido: ${sides}`);
  }
  const raw = rng.next();
  const normalized = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999999) : 0;
  return { sides, value: Math.floor(normalized * sides) + 1 };
}
