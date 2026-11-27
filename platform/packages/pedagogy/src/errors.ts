import type { ErrorCategory, Evidence } from '@edu/types';

export type Frac = readonly [num: number, den: number];

export type HypothesisStatus = 'suspected' | 'confirmed' | 'discarded';

export interface Hypothesis {
  id: string;
  skillId: string;
  category: ErrorCategory;
  description: string;
  status: HypothesisStatus;
  support: number;
  contradict: number;
}

const eq = (x: Frac, y: Frac) => x[0] * y[1] === y[0] * x[1];

/** 1/2 + 1/3 = 2/5 → hipótese "somou numeradores e denominadores". Apenas SUSPEITA até sondagem. */
export function detectFractionAdditionMisconception(a: Frac, b: Frac, answer: Frac): Hypothesis | null {
  const correct: Frac = [a[0] * b[1] + b[0] * a[1], a[1] * b[1]];
  if (eq(answer, correct)) return null;
  if (answer[0] === a[0] + b[0] && answer[1] === a[1] + b[1]) {
    return {
      id: 'frac_add_num_den',
      skillId: 'frac.add',
      category: 'conceptual',
      description: 'Somou numeradores e denominadores diretamente',
      status: 'suspected',
      support: 1,
      contradict: 0,
    };
  }
  return null;
}

/** Resultado de uma atividade investigativa dirigida à hipótese. */
export function updateHypothesis(h: Hypothesis, probe: 'consistent' | 'inconsistent'): Hypothesis {
  const n = { ...h };
  if (probe === 'consistent') n.support++;
  else n.contradict++;
  if (n.contradict > n.support) n.status = 'discarded';
  else if (n.support >= 2 && n.contradict === 0) n.status = 'confirmed';
  else n.status = 'suspected';
  return n;
}

/**
 * Classificação de padrões a partir de evidências de UMA habilidade (ordem cronológica não exigida).
 * Heurísticas documentadas em DIAGNOSTIC_ENGINE.md; nunca produzem rótulo clínico.
 */
export function classifyPatterns(evidence: Evidence[]): ErrorCategory[] {
  const ev = [...evidence].sort((a, b) => a.at - b.at);
  const out = new Set<ErrorCategory>();
  const wrong = ev.filter((e) => !e.correct);
  const right = ev.filter((e) => e.correct);

  if (ev.length >= 4 && wrong.length === 1 && right.length >= 3) out.add('occasional');

  if (right.length >= 3 && right.filter((e) => e.hintsUsed >= 2).length / right.length >= 0.5) out.add('hint_dependence');

  const practiceOk = ev.some((e) => (e.kind === 'practice' || e.kind === 'diagnostic') && e.correct);
  const transferWrong = ev.filter((e) => e.kind === 'transfer' && !e.correct);
  const transferRight = ev.filter((e) => e.kind === 'transfer' && e.correct);
  if (practiceOk && transferWrong.length >= 2 && transferWrong.length > transferRight.length) out.add('transfer');

  const firstRight = right.find((e) => e.kind !== 'delayed_review');
  const delayedWrong = ev.filter((e) => e.kind === 'delayed_review' && !e.correct);
  if (firstRight && delayedWrong.some((e) => e.at > firstRight.at)) out.add('retention');

  return [...out];
}
