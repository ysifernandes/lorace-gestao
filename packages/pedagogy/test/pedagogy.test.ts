import { describe, expect, it } from 'vitest';
import type { Evidence } from '@estuda/types';
import {
  KnowledgeGraph, estimateMastery, estimateAll, nextItem, buildDailyPlan, allocate, examPrepSchedule,
  nextReviewIntervalDays, detectFractionAdditionMisconception, updateHypothesis, classifyPatterns, type Item,
} from '@estuda/pedagogy';

const NOW = 1_700_000_000_000;
const ev = (skillId: string, correct: boolean, o: Partial<Evidence> = {}): Evidence => ({ skillId, correct, hintsUsed: 0, kind: 'practice', at: NOW, ...o });
const many = (skillId: string, c: boolean, n: number, o: Partial<Evidence> = {}) => Array.from({ length: n }, () => ev(skillId, c, o));

// grafo ilustrativo (NÃO é conteúdo BNCC validado)
const graph = new KnowledgeGraph([
  { id: 'div', name: 'Divisão', subject: 'mat', prerequisites: [] },
  { id: 'factors', name: 'Fatores comuns', subject: 'mat', prerequisites: ['div'] },
  { id: 'frac.id', name: 'Identificar fração', subject: 'mat', prerequisites: [] },
  { id: 'frac.simplify', name: 'Simplificar', subject: 'mat', prerequisites: ['factors', 'frac.id'] },
]);

describe('KnowledgeGraph', () => {
  it('lista pré-requisitos transitivos do mais próximo ao mais distante', () => {
    expect(graph.prerequisitesOf('frac.simplify')).toEqual(['factors', 'frac.id', 'div']);
    expect(graph.prerequisitesOf('frac.simplify', false)).toEqual(['factors', 'frac.id']);
  });
  it('ordem topológica coloca pré-requisitos antes', () => {
    const o = graph.topologicalOrder();
    expect(o.indexOf('div')).toBeLessThan(o.indexOf('factors'));
    expect(o.indexOf('factors')).toBeLessThan(o.indexOf('frac.simplify'));
  });
  it('rejeita ciclos, referências desconhecidas e autodependência', () => {
    expect(() => new KnowledgeGraph([{ id: 'a', name: '', subject: '', prerequisites: ['b'] }, { id: 'b', name: '', subject: '', prerequisites: ['a'] }])).toThrow(/cycle/);
    expect(() => new KnowledgeGraph([{ id: 'a', name: '', subject: '', prerequisites: ['z'] }])).toThrow(/unknown/);
    expect(() => new KnowledgeGraph([{ id: 'a', name: '', subject: '', prerequisites: ['a'] }])).toThrow(/itself/);
  });
});

describe('estimateMastery', () => {
  it('uma única resposta nunca define dificuldade', () => {
    expect(estimateMastery('div', [ev('div', false)], NOW).state).toBe('insufficient_evidence');
  });
  it('erros repetidos → needs_support; acertos suficientes → consolidated', () => {
    expect(estimateMastery('div', many('div', false, 4), NOW).state).toBe('needs_support');
    expect(estimateMastery('div', many('div', true, 5), NOW).state).toBe('consolidated');
  });
  it('acertos com muitas dicas valem menos que acertos autônomos', () => {
    const a = estimateMastery('div', many('div', true, 4), NOW).probability;
    const b = estimateMastery('div', many('div', true, 4, { hintsUsed: 3 }), NOW).probability;
    expect(b).toBeLessThan(a);
  });
  it('evidência antiga pesa menos', () => {
    const old = estimateMastery('div', many('div', false, 4, { at: NOW - 400 * 86_400_000 }), NOW);
    const fresh = estimateMastery('div', many('div', false, 4), NOW);
    expect(old.probability).toBeGreaterThan(fresh.probability);
    expect(old.confidence).toBeLessThan(fresh.confidence);
  });
});

describe('diagnóstico adaptativo', () => {
  const bank: Item[] = ['frac.simplify', 'factors', 'div'].flatMap((s) =>
    [0.2, 0.4, 0.6, 0.8].flatMap((d, i) => [{ id: `${s}-${i}a`, skillId: s, difficulty: d }, { id: `${s}-${i}b`, skillId: s, difficulty: d }]));
  it('começa pelo alvo e sobe a dificuldade após acertos', () => {
    const first = nextItem(graph, bank, ['frac.simplify'], [], new Set(), NOW)!;
    expect(first.reason).toBe('target_needs_evidence');
    const after = nextItem(graph, bank, ['frac.simplify'], many('frac.simplify', true, 2), new Set(), NOW)!;
    expect(after.item.difficulty).toBeGreaterThan(first.item.difficulty);
  });
  it('após erros no alvo, investiga pré-requisitos (fatores → divisão)', () => {
    const e = many('frac.simplify', false, 2);
    const n = nextItem(graph, bank, ['frac.simplify'], e, new Set(), NOW)!;
    expect(n.reason).toBe('probe_prerequisite');
    expect(n.investigating).toBe('frac.simplify');
    expect(['factors', 'frac.id']).toContain(n.item.skillId);
  });
  it('não repete itens e termina quando há evidência mínima', () => {
    const e = many('frac.simplify', true, 3);
    expect(nextItem(graph, bank, ['frac.simplify'], e, new Set(), NOW)).toBeNull();
  });
});

describe('análise de erros', () => {
  it('1/2 + 1/3 = 2/5 gera hipótese apenas SUSPEITA', () => {
    const h = detectFractionAdditionMisconception([1, 2], [1, 3], [2, 5])!;
    expect(h.status).toBe('suspected');
    expect(h.category).toBe('conceptual');
  });
  it('resposta correta (inclusive equivalente) não gera hipótese', () => {
    expect(detectFractionAdditionMisconception([1, 2], [1, 3], [5, 6])).toBeNull();
    expect(detectFractionAdditionMisconception([1, 2], [1, 3], [10, 12])).toBeNull();
  });
  it('sondagens confirmam ou descartam; contradições repetidas descartam', () => {
    let h = detectFractionAdditionMisconception([1, 2], [1, 3], [2, 5])!;
    h = updateHypothesis(h, 'consistent');
    expect(h.status).toBe('confirmed');
    let d = detectFractionAdditionMisconception([1, 2], [1, 3], [2, 5])!;
    d = updateHypothesis(d, 'inconsistent');
    expect(d.status).toBe('suspected'); // 1 a favor (resposta original) × 1 contra: ainda inconclusivo
    d = updateHypothesis(d, 'inconsistent');
    expect(d.status).toBe('discarded');
  });
  it('classifica erro ocasional, dependência de dicas, transferência e retenção', () => {
    expect(classifyPatterns([...many('s', true, 4), ev('s', false)])).toContain('occasional');
    expect(classifyPatterns(many('s', true, 4, { hintsUsed: 3 }))).toContain('hint_dependence');
    expect(classifyPatterns([ev('s', true), ...many('s', false, 2, { kind: 'transfer' })])).toContain('transfer');
    expect(classifyPatterns([ev('s', true, { at: NOW - 10 }), ev('s', false, { kind: 'delayed_review', at: NOW })])).toContain('retention');
  });
});

describe('plano de estudos', () => {
  it('allocate soma exatamente o total', () => {
    for (let n = 0; n < 40; n++) expect(Object.values(allocate(n, { a: 0.6, b: 0.25, c: 0.15 })).reduce((s, v) => s + v, 0)).toBe(n);
    expect(allocate(20, { focus: 0.6, prerequisite: 0.25, review: 0.15 })).toEqual({ focus: 12, prerequisite: 5, review: 3 });
  });
  it('aplica 60/25/15 com foco na dificuldade e pré-requisitos não consolidados', () => {
    const evidence = [...many('frac.simplify', false, 4), ...many('div', true, 5), ...many('factors', false, 1), ...many('frac.id', true, 5)];
    const est = estimateAll(graph.all().map((s) => s.id), evidence, NOW);
    const plan = buildDailyPlan(graph, est, 20);
    expect(plan).toHaveLength(20);
    const c = (k: string) => plan.filter((p) => p.kind === k).length;
    expect(c('focus')).toBe(12);
    expect(c('prerequisite')).toBe(5);
    expect(c('review')).toBe(3);
    expect(plan.filter((p) => p.kind === 'focus').every((p) => p.skillId === 'frac.simplify')).toBe(true);
    expect(plan.filter((p) => p.kind === 'prerequisite').every((p) => p.skillId === 'factors')).toBe(true);
  });
  it('sem lacunas não força repetição: avança e faz revisão leve', () => {
    const est = estimateAll(['div', 'factors', 'frac.id', 'frac.simplify'], [...many('div', true, 6), ...many('frac.id', true, 6)], NOW);
    const plan = buildDailyPlan(graph, est, 10);
    expect(plan.some((p) => p.kind === 'advance' && p.skillId === 'factors')).toBe(true);
    expect(plan.filter((p) => p.kind === 'focus')).toHaveLength(0);
  });
  it('preparação para prova distribui e termina com simulado', () => {
    const s = examPrepSchedule(5, ['a', 'b', 'c']);
    expect(s).toHaveLength(5);
    expect(s.at(-1)!.simulado).toBe(true);
    expect(s.slice(0, 4).flatMap((d) => d.skillIds).sort()).toEqual(['a', 'b', 'c']);
    expect(examPrepSchedule(0, ['a'])).toEqual([]);
  });
  it('revisão espaçada', () => {
    expect(nextReviewIntervalDays(1, true)).toBe(2);
    expect(nextReviewIntervalDays(20, false)).toBe(1);
    expect(nextReviewIntervalDays(150, true)).toBe(180);
  });
});
