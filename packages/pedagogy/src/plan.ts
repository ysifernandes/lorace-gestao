import type { MasteryEstimate } from './mastery';
import type { KnowledgeGraph } from './graph';

export type ActivityKind = 'focus' | 'prerequisite' | 'review' | 'advance';
export interface PlannedActivity { skillId: string; kind: ActivityKind }

export interface Ratios { focus: number; prerequisite: number; review: number }
/** Referências iniciais (spec §7); devem ser ajustadas por resultados pedagógicos. */
export const DEFAULT_RATIOS: Ratios = { focus: 0.6, prerequisite: 0.25, review: 0.15 };

/** Maior resto: soma exatamente `total`. */
export function allocate(total: number, weights: Record<string, number>): Record<string, number> {
  const keys = Object.keys(weights);
  const sum = keys.reduce((s, k) => s + weights[k]!, 0);
  if (sum <= 0 || total <= 0) return Object.fromEntries(keys.map((k) => [k, 0]));
  const raw = keys.map((k) => ({ k, v: (weights[k]! / sum) * total }));
  const out: Record<string, number> = Object.fromEntries(raw.map((r) => [r.k, Math.floor(r.v)]));
  let left = total - Object.values(out).reduce((s, v) => s + v, 0);
  for (const r of [...raw].sort((a, b) => (b.v % 1) - (a.v % 1))) {
    if (left-- <= 0) break;
    out[r.k]!++;
  }
  return out;
}

const cycle = <T>(xs: T[], n: number): T[] => (xs.length ? Array.from({ length: n }, (_, i) => xs[i % xs.length]!) : []);

/**
 * Plano diário. Foco = habilidades com maior dificuldade; pré-requisitos = base necessária que ainda
 * não está consolidada; revisão = consolidadas. Sem lacunas, NÃO força repetição: divide entre revisão leve e avanço.
 */
export function buildDailyPlan(
  graph: KnowledgeGraph,
  estimates: Map<string, MasteryEstimate>,
  count: number,
  ratios: Ratios = DEFAULT_RATIOS,
): PlannedActivity[] {
  const list = [...estimates.values()];
  const focus = list
    .filter((e) => e.state === 'needs_support' || e.state === 'developing')
    .sort((a, b) => a.probability - b.probability)
    .map((e) => e.skillId);
  const prereq = [
    ...new Set(
      focus.flatMap((f) => graph.prerequisitesOf(f)).filter((p) => estimates.get(p)?.state !== 'consolidated'),
    ),
  ].filter((p) => !focus.includes(p));
  const review = list.filter((e) => e.state === 'consolidated').map((e) => e.skillId);
  const advance = list
    .filter((e) => e.state === 'insufficient_evidence' && graph.get(e.skillId).prerequisites.every((p) => estimates.get(p)?.state === 'consolidated'))
    .map((e) => e.skillId);

  if (!focus.length) {
    const a = allocate(count, { advance: advance.length ? 0.7 : 0, review: review.length ? 0.3 : 0 });
    return [
      ...cycle(advance, a.advance ?? 0).map((skillId) => ({ skillId, kind: 'advance' as const })),
      ...cycle(review, a.review ?? 0).map((skillId) => ({ skillId, kind: 'review' as const })),
    ];
  }
  const a = allocate(count, {
    focus: ratios.focus,
    prerequisite: prereq.length ? ratios.prerequisite : 0,
    review: review.length ? ratios.review : 0,
  });
  return [
    ...cycle(focus, a.focus ?? 0).map((skillId) => ({ skillId, kind: 'focus' as const })),
    ...cycle(prereq, a.prerequisite ?? 0).map((skillId) => ({ skillId, kind: 'prerequisite' as const })),
    ...cycle(review, a.review ?? 0).map((skillId) => ({ skillId, kind: 'review' as const })),
  ];
}

/** Preparação para prova: distribui habilidades pelos dias até a data; último dia = simulado. */
export function examPrepSchedule(daysUntilExam: number, skillIds: string[]): { day: number; skillIds: string[]; simulado: boolean }[] {
  if (daysUntilExam < 1 || !skillIds.length) return [];
  const study = Math.max(1, daysUntilExam - 1);
  const days = Array.from({ length: study }, (_, d) => ({ day: d + 1, skillIds: [] as string[], simulado: false }));
  skillIds.forEach((s, i) => days[i % study]!.skillIds.push(s));
  return daysUntilExam === 1
    ? [{ day: 1, skillIds, simulado: true }]
    : [...days, { day: daysUntilExam, skillIds, simulado: true }];
}

/** Revisão espaçada (intervalos em dias). Regra inicial simples, parametrizável. */
export function nextReviewIntervalDays(current: number, success: boolean): number {
  if (!success) return 1;
  return Math.min(180, Math.max(1, Math.round(current * 2)));
}
