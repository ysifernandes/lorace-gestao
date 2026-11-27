import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, MATH_SKILLS, buildItemBank, validateContent, MISCONCEPTIONS } from '@edu/content-math';
import { KnowledgeGraph } from '@edu/pedagogy';

describe('conteúdo (rascunho autoral — pendente de revisão profissional)', () => {
  const items = buildItemBank();
  it('passa na validação estrutural', () => { expect(validateContent()).toEqual([]); });
  it('grafo de habilidades é acíclico e consistente', () => { expect(() => new KnowledgeGraph(ALL_SKILLS.map((s) => ({ id: s.id, name: s.name, subject: s.subject, prerequisites: s.prerequisites })))).not.toThrow(); });
  it('nenhum código BNCC é afirmado sem verificação', () => { expect(ALL_SKILLS.every((s) => s.bnccCode === null)).toBe(true); });
  it('todo item é rascunho que exige revisão profissional', () => { expect(items.every((i) => i.review.status === 'draft' && i.review.needsProfessionalReview)).toBe(true); });
  it('cada habilidade de matemática tem ≥3 itens e vários níveis de dificuldade', () => {
    for (const s of MATH_SKILLS) { const its = items.filter((i) => i.skillId === s.id); expect(its.length, s.id).toBeGreaterThanOrEqual(3); expect(new Set(its.map((i) => i.difficulty)).size, s.id).toBeGreaterThan(2); }
  });
  it('geração é determinística', () => { expect(JSON.stringify(buildItemBank())).toBe(JSON.stringify(items)); });
  it('gabaritos aritméticos conferem independentemente', () => {
    const add = items.filter((i) => i.skillId === 'add.carry' && i.kind === 'multiple_choice');
    for (const it of add) { const [a, b] = it.statement.match(/\d+/g)!.map(Number); const ok = 'options' in it && it.options.find((o) => o.id === it.correct)!.text; expect(Number(ok)).toBe(a! + b!); }
    const dv = items.filter((i) => i.skillId === 'div.facts');
    for (const it of dv) { const [a, b] = it.statement.match(/\d+/g)!.map(Number); const ok = 'options' in it && it.options.find((o) => o.id === it.correct)!.text; expect(Number(ok) * b!).toBe(a); }
  });
  it('distratores marcam equívocos cobrindo as frações', () => {
    const tags = new Set(items.flatMap((i) => ('options' in i ? i.options.flatMap((o) => (o.misconception ? [o.misconception] : [])) : [])));
    for (const t of ['add_num_and_den', 'swap_num_den', 'bigger_denominator_bigger', 'add_same_to_both', 'forgot_carry', 'smaller_from_larger']) expect(tags.has(t), t).toBe(true);
    expect(Object.keys(MISCONCEPTIONS).length).toBeGreaterThan(30);
  });
  it('inclui os tipos interativos', () => { expect(new Set(items.map((i) => i.kind))).toEqual(new Set(['multiple_choice', 'word_problem', 'reasoning', 'fill_in', 'ordering', 'matching', 'drag_drop', 'fraction_visual', 'simulation'])); });
});
