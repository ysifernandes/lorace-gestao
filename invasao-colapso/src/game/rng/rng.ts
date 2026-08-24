/**
 * RNG injetável. A regra nunca chama Math.random diretamente —
 * assim os testes rodam determinísticos e o replay/multiplayer futuro
 * pode usar semente compartilhada.
 */
export interface Rng {
  /** Float em [0, 1). */
  next(): number;
}

export const defaultRng: Rng = {
  next: () => Math.random(),
};

/** Gerador determinístico (mulberry32) para testes e replays. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    next() {
      a += 0x6d2b79f5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** RNG que devolve uma sequência fixa — usado para fixar faces do dado. */
export function scriptedRng(values: number[]): Rng {
  let i = 0;
  return {
    next() {
      const v = values[i % values.length];
      i += 1;
      return v;
    },
  };
}
