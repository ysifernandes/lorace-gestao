/**
 * ANIMAÇÃO DOS DADOS — camada VISUAL.
 *
 * REGRA INEGOCIÁVEL: a animação NUNCA sorteia. O resultado oficial vem do
 * motor (ou do servidor, no online) e a animação apenas termina mostrando
 * exatamente aqueles valores. Por isso `planDiceRoll` recebe os valores
 * finais como entrada — não existe caminho de código aqui que gere um dado.
 *
 * Duas telas diferentes rodando o mesmo plano com a mesma semente veem a
 * mesma coreografia e o mesmo resultado.
 */

export type DiceSide = 'ATTACKER' | 'DEFENDER';

export interface DieAnimation {
  /** Valor oficial, decidido pelo motor. A animação termina aqui. */
  value: number;
  side: DiceSide;
  /** Ordem do dado dentro do seu lado. */
  index: number;
  /** Atraso até este dado entrar na arena (ms). */
  enterDelayMs: number;
  /** Duração do giro antes de assentar (ms). */
  spinMs: number;
  /** Quantas vezes o dado quica antes de parar. */
  bounces: number;
  /** Rotação decorativa acumulada, em graus. */
  spinDegrees: number;
  /** Deslocamento horizontal de entrada, em px. */
  driftX: number;
  /** Instante em que o valor final fica legível (ms desde o início). */
  settleAtMs: number;
}

export interface DiceComparison {
  index: number;
  attacker: number;
  defender: number;
  /** Empate favorece o defensor — REGRA OFICIAL. */
  winner: DiceSide;
  tie: boolean;
  /** Instante em que esta comparação é destacada (ms). */
  atMs: number;
}

export interface DiceRollPlan {
  attacker: DieAnimation[];
  defender: DieAnimation[];
  comparisons: DiceComparison[];
  /** Instante em que todos os dados pararam. */
  allSettledAtMs: number;
  /** Instante em que as baixas podem ser mostradas. */
  casualtiesAtMs: number;
  /** Duração total da apresentação. */
  totalMs: number;
}

export interface DiceRollTiming {
  enterStaggerMs: number;
  spinMs: number;
  settleMs: number;
  comparisonStepMs: number;
  casualtyDelayMs: number;
}

export const DEFAULT_DICE_TIMING: DiceRollTiming = {
  enterStaggerMs: 110,
  spinMs: 620,
  settleMs: 240,
  comparisonStepMs: 460,
  casualtyDelayMs: 380,
};

/** Ruído determinístico a partir de uma semente — só decora, nunca decide. */
function jitter(seed: number, salt: number): number {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function buildSide(
  values: number[],
  side: DiceSide,
  seed: number,
  timing: DiceRollTiming,
): DieAnimation[] {
  return values.map((value, index) => {
    const noise = jitter(seed, index + (side === 'ATTACKER' ? 0 : 100));
    const enterDelayMs = index * timing.enterStaggerMs;
    const spinMs = timing.spinMs + Math.round(noise * 180);
    return {
      value,
      side,
      index,
      enterDelayMs,
      spinMs,
      bounces: 2 + Math.round(noise),
      spinDegrees: 540 + Math.round(noise * 360),
      driftX: Math.round((noise - 0.5) * 26),
      settleAtMs: enterDelayMs + spinMs + timing.settleMs,
    };
  });
}

/**
 * Monta a coreografia a partir dos valores JÁ decididos.
 *
 * `attackerValues` e `defenderValues` devem chegar exatamente como o motor
 * os produziu. A ordenação decrescente para comparação é feita aqui apenas
 * para APRESENTAR — a regra de comparação já foi resolvida no motor.
 */
export function planDiceRoll(
  attackerValues: number[],
  defenderValues: number[],
  options: { seed?: number; timing?: DiceRollTiming } = {},
): DiceRollPlan {
  const timing = options.timing ?? DEFAULT_DICE_TIMING;
  const seed = options.seed ?? 1;

  const attacker = buildSide([...attackerValues], 'ATTACKER', seed, timing);
  const defender = buildSide([...defenderValues], 'DEFENDER', seed + 7, timing);

  const allSettledAtMs = Math.max(
    0,
    ...attacker.map((d) => d.settleAtMs),
    ...defender.map((d) => d.settleAtMs),
  );

  // Apresentação: maior para o menor, par a par, só os pares existentes.
  const sortedAttacker = [...attackerValues].sort((a, b) => b - a);
  const sortedDefender = [...defenderValues].sort((a, b) => b - a);
  const pairs = Math.min(sortedAttacker.length, sortedDefender.length);

  const comparisons: DiceComparison[] = [];
  for (let index = 0; index < pairs; index += 1) {
    const a = sortedAttacker[index];
    const d = sortedDefender[index];
    comparisons.push({
      index,
      attacker: a,
      defender: d,
      // EMPATE = DEFENSOR VENCE.
      winner: a > d ? 'ATTACKER' : 'DEFENDER',
      tie: a === d,
      atMs: allSettledAtMs + 260 + index * timing.comparisonStepMs,
    });
  }

  const lastComparisonAt = comparisons.length
    ? comparisons[comparisons.length - 1].atMs
    : allSettledAtMs;
  const casualtiesAtMs = lastComparisonAt + timing.casualtyDelayMs;

  return {
    attacker,
    defender,
    comparisons,
    allSettledAtMs,
    casualtiesAtMs,
    totalMs: casualtiesAtMs + 520,
  };
}

/** Perdas que a apresentação vai mostrar — derivadas do MESMO plano. */
export function plannedLosses(plan: DiceRollPlan): { attacker: number; defender: number } {
  let attacker = 0;
  let defender = 0;
  for (const comparison of plan.comparisons) {
    if (comparison.winner === 'ATTACKER') defender += 1;
    else attacker += 1;
  }
  return { attacker, defender };
}
