import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, MATH_SKILLS, buildItemBank, type Item } from '@edu/content-math';
import { ContentCatalog, buildReport, evolution, explanationFor, gradeItem, newLearner, nextDiagnosticItem, pendingExplanations, planPractice, reassessmentItems, recordResponse, takeSnapshot, type LearnerState, type Response, type Scope } from '@edu/learning';

// ALUNO SIMULADO (apenas teste): sabe tudo, exceto soma de frações com denominadores diferentes (soma numeradores e denominadores).
type Profile = { slips: Record<string, string> };
function answer(it: Item, p: Profile): Response {
  const tag = p.slips[it.skillId];
  switch (it.kind) {
    case 'multiple_choice': case 'word_problem': case 'reasoning': {
      const t = tag ? it.options.find((o) => o.misconception === tag) : undefined; return { choice: t ? t.id : it.correct };
    }
    case 'fill_in': return { text: tag ? (it.wrongPatterns?.find((w) => w.misconception === tag)?.answer ?? 'x') : it.accepted[0]! };
    case 'ordering': return { order: it.correctOrder };
    case 'matching': return { pairs: it.pairs };
    case 'drag_drop': return { placement: it.solution };
    case 'fraction_visual': return { shaded: tag ? (it.wrongPatterns?.[0]?.shaded ?? 0) : it.targetNum };
    case 'simulation': return { num: tag ? 0 : it.targetNum };
  }
}
const T0 = 1_700_000_000_000;
const mathIds = MATH_SKILLS.map((s) => s.id);

describe('jornada completa de matemática (motor, sem UI)', () => {
  const sc: Scope = { skills: MATH_SKILLS, items: buildItemBank().filter((i) => mathIds.includes(i.skillId)) };
  const slip: Profile = { slips: { 'frac.add.diff': 'add_num_and_den' } };
  let st: LearnerState = newLearner('s1'); let t = T0; const tick = () => (t += 60_000);

  it('1) diagnóstico adaptativo é curto, desce pelos pré-requisitos e não testa o que é inferível', () => {
    const asked: string[] = [];
    for (let i = 0; i < 40; i++) {
      const n = nextDiagnosticItem(st, sc, { targets: mathIds, maxItems: 30 }); if (!n) break;
      st = recordResponse(st, n.item, answer(n.item, slip), { hintsUsed: 0, at: tick(), phase: 'diagnostic' }).state; asked.push(n.skillId);
    }
    expect(asked.length).toBeLessThanOrEqual(24);
    expect(asked.length).toBeGreaterThan(8);
    expect(new Set(asked).size).toBeLessThan(mathIds.length); // nem todas as habilidades foram testadas diretamente
    expect(asked.filter((s) => s === 'frac.add.diff').length).toBe(2);
    expect(asked).toContain('frac.add.same'); // investigou pré-requisito de frac.add.diff
    expect(asked).not.toContain('frac.visual'); // inferido por frac.simplify/frac.compare dominados
    expect(asked).not.toContain('add.facts'); // inferido por habilidades avançadas dominadas
    st = takeSnapshot(st, mathIds, 'Diagnóstico', t);
  });

  it('2) identifica a dificuldade específica, a causa, as evidências e a confiança', () => {
    const rep = buildReport(st, sc, mathIds, t).find((r) => r.skillId === 'frac.add.diff')!;
    expect(rep.state).toBe('needs_support');
    const c = rep.causes.find((x) => x.misconceptionId === 'add_num_and_den')!;
    expect(c.status).toBe('confirmada'); expect(c.confidence).toBe('alta');
    expect(c.evidence.length).toBe(2); expect(c.evidence[0]).toMatch(/Errou/);
    expect(rep.recommendation).toMatch(/Somou numeradores e denominadores/);
    expect(rep.confidenceLabel).not.toBe('alta'); // só 2 evidências: confiança honesta
    const others = buildReport(st, sc, mathIds, t).filter((r) => r.skillId !== 'frac.add.diff' && r.evidenceCount > 0);
    expect(others.every((r) => r.state !== 'needs_support')).toBe(true);
  });

  it('3) explicação personalizada; se o erro persiste, muda a abordagem', () => {
    expect(pendingExplanations(st).map((h) => h.id)).toContain('add_num_and_den');
    const e1 = explanationFor(st, 'add_num_and_den')!; st = e1.state;
    const e2 = explanationFor(st, 'add_num_and_den')!; st = e2.state;
    expect(e1.variant.method).not.toBe(e2.variant.method);
    expect(pendingExplanations(st)).toHaveLength(0);
  });

  it('4) plano de prática prioriza a dificuldade (foco) e sonda/contrasta o equívoco', () => {
    const plan = planPractice(st, sc, mathIds, 8, t);
    expect(plan.filter((p) => p.kind === 'focus').length).toBeGreaterThanOrEqual(4);
    expect(plan.filter((p) => p.kind === 'focus').every((p) => p.item.skillId === 'frac.add.diff')).toBe(true);
    expect(new Set(plan.map((p) => p.item.id)).size).toBe(plan.length);
  });

  it('5) após aprender, reavaliação mostra evolução e dissolve a hipótese', () => {
    const learned: Profile = { slips: {} };
    for (const p of planPractice(st, sc, mathIds, 8, t)) st = recordResponse(st, p.item, answer(p.item, learned), { hintsUsed: 0, at: tick(), phase: 'practice' }).state;
    for (const it of reassessmentItems(st, sc, ['frac.add.diff'], 3)) st = recordResponse(st, it, answer(it, learned), { hintsUsed: 0, at: tick(), phase: 'reassessment' }).state;
    st = takeSnapshot(st, mathIds, 'Reavaliação', t);
    const ev = evolution(st, 'frac.add.diff');
    expect(ev.delta!).toBeGreaterThan(0.3);
    expect(st.hypotheses['add_num_and_den']!.status).not.toBe('confirmed');
    const rep = buildReport(st, sc, mathIds, t).find((r) => r.skillId === 'frac.add.diff')!;
    expect(['developing', 'consolidated']).toContain(rep.state);
    expect(st.xp).toBeGreaterThan(0);
  });

  it('uma única resposta errada nunca gera dificuldade definitiva', () => {
    let s = newLearner('x'); const it = sc.items.find((i) => i.skillId === 'frac.add.diff')!;
    s = recordResponse(s, it, answer(it, slip), { hintsUsed: 0, at: T0, phase: 'practice' }).state;
    const r = buildReport(s, sc, ['frac.add.diff'], T0)[0]!;
    expect(r.state).toBe('insufficient_evidence'); expect(r.causes.every((c) => c.status === 'suspeita')).toBe(true);
  });
});

describe('correção por tipo de atividade', () => {
  const items = buildItemBank(); const by = (id: string) => items.find((i) => i.id === id)!;
  it('arrastar/ordenar/associar/preencher/fração visual/simulação', () => {
    expect(gradeItem(by('mul.facts.drag1'), { placement: { t1: 'zb', t2: 'z3', t3: 'z4' } }).correct).toBe(true);
    expect(gradeItem(by('mul.facts.drag1'), { placement: { t1: 'z3', t2: 'z3', t3: 'z4' } }).score).toBeCloseTo(0.66, 1);
    expect(gradeItem(by('frac.compare.order1'), { order: ['y', 'z', 'x'] }).correct).toBe(true);
    expect(gradeItem(by('frac.compare.order1'), { order: ['x', 'z', 'y'] }).misconceptions).toEqual(['bigger_denominator_bigger']);
    expect(gradeItem(by('frac.equiv.match1'), { pairs: [['l1', 'r2'], ['l2', 'r1'], ['l3', 'r3']] }).correct).toBe(true);
    expect(gradeItem(by('frac.equiv.fill1'), { text: ' 3 ' }).correct).toBe(true);
    expect(gradeItem(by('frac.equiv.fill1'), { text: '5' }).misconceptions).toEqual(['add_same_to_both']);
    const fv = items.find((i) => i.kind === 'fraction_visual' && i.id === 'frac.visual.0')! as Extract<Item, { kind: 'fraction_visual' }>;
    expect(gradeItem(fv, { shaded: fv.targetNum }).correct).toBe(true);
    expect(gradeItem(by('frac.add.diff.sim1'), { num: 3 }).correct).toBe(true);
    expect(() => gradeItem(by('frac.equiv.fill1'), { choice: 'a' })).toThrow();
  });
});

describe('catálogo editorial (cadastro, edição, revisão, versões)', () => {
  const mk = () => { let t = 1; return new ContentCatalog(buildItemBank().slice(0, 5), () => t++); };
  const author = { id: 'u1', role: 'super_admin' as const }, rev = { id: 'u2', role: 'reviewer' as const };
  it('rascunhos não são servidos por padrão; em modo dev sim', () => {
    const c = mk(); expect(c.servable()).toHaveLength(0); c.policy.allowDraft = true; expect(c.servable()).toHaveLength(5);
  });
  it('fluxo draft → in_review → approved, com auditoria e quatro olhos', () => {
    const c = mk(); const id = c.all()[0]!.id;
    c.edit(id, { statement: 'Novo enunciado' }, author); expect(c.get(id).review.version).toBe(2); expect(c.versions(id)).toHaveLength(2);
    c.submit(id, author);
    expect(() => c.approve(id, author, 'ok', true)).toThrow(/autor/);
    expect(() => c.approve(id, rev, '  ', true)).toThrow(/nota/);
    expect(() => c.approve(id, { id: 't', role: 'teacher' }, 'ok', true)).toThrow();
    c.approve(id, rev, 'Conferido', true);
    expect(c.get(id).review).toMatchObject({ status: 'approved', reviewedBy: 'u2', needsProfessionalReview: false });
    expect(c.servable().map((i) => i.id)).toEqual([id]);
    expect(c.audit.map((a) => a.action)).toEqual(['edit', 'in_review', 'approved']);
  });
  it('editar item aprovado volta a rascunho (e sai de circulação); transições inválidas falham', () => {
    const c = mk(); const id = c.all()[1]!.id; c.submit(id, author); c.approve(id, rev, 'ok', false);
    expect(c.get(id).review.needsProfessionalReview).toBe(true); // aprovado sem revisão profissional continua sinalizado
    c.edit(id, { hints: ['nova dica'] }, rev); expect(c.get(id).review.status).toBe('draft'); expect(c.servable()).toHaveLength(0);
    expect(() => c.approve(id, { id: 'u3', role: 'reviewer' }, 'x', true)).toThrow(/transição/);
    c.submit(id, rev); expect(() => c.reject(id, author, '')).toThrow(); c.reject(id, author, 'texto confuso'); expect(c.get(id).review.status).toBe('rejected');
  });
  it('exige fonte e licença ao cadastrar e serializa/restaura', () => {
    const c = mk(); const bad = { ...c.all()[0]!, id: 'novo.1', source: { kind: 'authored', reference: '', license: '' } } as Item;
    expect(() => c.create(bad, author)).toThrow(/licença/);
    c.edit(c.all()[0]!.id, { statement: 'x' }, author);
    const r = ContentCatalog.fromJSON(JSON.parse(JSON.stringify(c.toJSON())));
    expect(r.versions(c.all()[0]!.id)).toHaveLength(2); expect(r.audit).toHaveLength(1);
  });
});
