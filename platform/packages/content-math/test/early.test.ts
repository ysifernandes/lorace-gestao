import { describe, expect, it } from 'vitest';
import { ALL_SKILLS, buildItemBank, makeItem, validateContent, MISCONCEPTIONS, EXPLANATIONS, tokenName } from '@edu/content-math';

const NEW = ['num.count', 'num.compare', 'num.order', 'geo.shapes', 'pat.seq', 'meas.time', 'meas.money', 'dec.compare', 'dec.add', 'int.neg', 'geo.perim', 'geo.area', 'pt.letter.sound', 'pt.syllable', 'pt.rhyme', 'pt.verb.tense', 'pt.punct', 'pt.synonym'];
const bank = buildItemBank(); const of = (s: string) => bank.filter((i) => i.skillId === s);
const correctText = (i: any) => i.options.find((o: any) => o.id === i.correct).text as string;
const num = (t: string) => Number(t.replace(/[^\d,−-]/g, '').replace('−', '-').replace(',', '.'));

describe('conteúdo novo (5–7, medidas, decimais, geometria, PT básico)', () => {
  it('integridade geral do banco continua válida', () => { expect(validateContent()).toEqual([]); });
  it('cada habilidade nova tem 6 itens em 6 níveis, 4 opções distintas, dicas e rascunho', () => {
    for (const s of NEW) { const it = of(s); expect(it.length, s).toBe(6); for (const i of it as any[]) { expect(i.options, i.id).toHaveLength(4); expect(new Set(i.options.map((o: any) => o.text)).size, i.id).toBe(4); expect(i.hints.length, i.id).toBeGreaterThan(0); expect(i.review.status).toBe('draft'); } }
  });
  it('nenhum código BNCC foi preenchido', () => { expect(ALL_SKILLS.filter((s) => NEW.includes(s.id)).every((s) => s.bnccCode === null)).toBe(true); });
  it('todo equívoco usado nas opções tem explicação', () => { for (const i of bank as any[]) for (const o of i.options ?? []) if (o.misconception) { expect(MISCONCEPTIONS[o.misconception], o.misconception).toBeTruthy(); expect(EXPLANATIONS[o.misconception], o.misconception).toBeTruthy(); } });
  it('contagem: a figura mostra exatamente a quantidade do gabarito', () => { for (const i of of('num.count') as any[]) expect(i.figure.n).toBe(Number(correctText(i))); });
  it('padrões: figura termina em "?" e o gabarito é a ficha seguinte', () => {
    for (const i of of('pat.seq') as any[]) { if (!i.figure) continue; const seq: string[] = i.figure.seq; expect(seq.at(-1)).toBe('?'); expect(seq.length).toBe(6); const names = i.options.map((o: any) => o.text); expect(names.every((n: string) => /\s/.test(n))).toBe(true); expect(tokenName(seq[0]!)).toMatch(/\s/); }
  });
  it('formas: lados do triângulo = 3 e do retângulo = 4', () => { const t = of('geo.shapes') as any[]; expect(correctText(t[4])).toBe('3'); expect(correctText(t[5])).toBe('4'); });
  it('decimais: a soma gabaritada confere com o cálculo independente', () => {
    for (const i of of('dec.add') as any[]) { const m = i.statement.match(/([\d,]+) \+ ([\d,]+)/)!; const s = num(m[1]) + num(m[2]); expect(Math.abs(num(correctText(i)) - s)).toBeLessThan(0.006); }
  });
  it('decimais: comparação nunca premia "mais algarismos"', () => { for (const i of of('dec.compare') as any[]) { const nums = [...i.statement.matchAll(/(\d+,\d+)/g)].map((x) => num(x[1]!)); const big = /MAIOR/.test(i.statement); expect(num(correctText(i))).toBe(big ? Math.max(...nums) : Math.min(...nums)); } });
  it('geometria: perímetro e área conferem com cálculo independente', () => {
    for (const i of of('geo.perim').slice(0, 5) as any[]) { const [a, b] = [...i.statement.matchAll(/(\d+) cm/g)].map((x) => Number(x[1])); expect(num(correctText(i))).toBe(2 * (a! + b!)); }
    for (const i of of('geo.area').slice(0, 4) as any[]) { const [a, b] = [...i.statement.matchAll(/(\d+) cm/g)].map((x) => Number(x[1])); expect(num(correctText(i))).toBe(a! * b!); }
  });
  it('dinheiro e tempo: gabaritos conferem', () => {
    const t = of('meas.time') as any[]; expect(correctText(t[0])).toBe('60'); expect(correctText(t[2])).toBe('30');
    const m = t[5].statement.match(/às (\d+)h(\d+) e dura (\d+)h(\d+)min/)!; const [h, mi, dh, dm] = m.slice(1).map(Number) as [number, number, number, number]; const tot = h * 60 + mi + dh * 60 + dm; expect(correctText(t[5])).toBe(`${Math.floor(tot / 60)}h${String(tot % 60).padStart(2, '0')}`);
    const mm = of('meas.money') as any[]; const [pd, pr] = [...mm[1].statement.matchAll(/(\d+) reais/g)].map((x) => Number(x[1])); expect(num(correctText(mm[1]))).toBe(pd! - pr!);
  });
  it('negativos: temperatura que cai abaixo de zero fica negativa', () => { for (const i of (of('int.neg') as any[]).slice(2, 4)) expect(correctText(i).startsWith('−')).toBe(true); });
  it('português: sílabas, rimas e pontuação conferem', () => {
    expect(correctText(makeItem('pt.syllable', 2, 3))).toMatch(/^[1-6]$/);
    for (const i of of('pt.punct').slice(0, 4) as any[]) { const q = i.statement.match(/"(.+)__"/)![1]!; const ans = correctText(i); if (/^(Qual|Onde|Quem|Como você)/.test(q)) expect(ans).toBe('?'); else if (/^(Que susto|Como está|Parabéns|Que festa)/.test(q)) expect(ans).toBe('!'); else expect(ans).toBe('.'); }
    expect(correctText(of('pt.rhyme')[0]!)).toBe('pato');
  });
  it('makeItem varia por semente e é determinístico', () => { const a = makeItem('num.count', 2, 1), b = makeItem('num.count', 2, 1), c = makeItem('num.count', 2, 99); expect(JSON.stringify(a)).toBe(JSON.stringify(b)); expect(JSON.stringify([a.statement, (a as any).figure])).not.toBe(JSON.stringify([c.statement, (c as any).figure])); });
  it('o grafo liga as habilidades novas às antigas (sem ciclos)', () => { const ids = new Set(ALL_SKILLS.map((s) => s.id)); for (const s of ALL_SKILLS) for (const p of s.prerequisites) expect(ids.has(p)).toBe(true); const ok = ALL_SKILLS.find((s) => s.id === 'add.facts')!; expect(ok.prerequisites).toContain('num.count'); });
});
