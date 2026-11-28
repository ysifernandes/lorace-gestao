import { describe, expect, it } from 'vitest';
import { gradeItem, newLearner, recordResponse, buildReport } from '@edu/learning';
import { ALL_SKILLS, MISCONCEPTIONS, type Item } from '@edu/content-math';
import { pizzaRounds, marketRounds, labRounds, sentenceRounds, detectiveRounds, financasRounds, escapeRounds, placarRounds, ctxOf, CTX, roundsFor, starsFor, type GameId } from '../src/games/logic';
import { GAMES, gameForSkill, gamesForBand, labelFor } from '../src/games/registry';

const IDS: GameId[] = ['pizzaria', 'mercado', 'laboratorio', 'frases', 'detetive', 'financas', 'escape', 'placar'];
const skillIds = new Set(ALL_SKILLS.map((s) => s.id));
/** Resposta CORRETA do item (independente da UI) */
function solve(it: Item) { switch (it.kind) { case 'fill_in': return { text: it.accepted[0]! }; case 'fraction_visual': return { shaded: it.targetNum }; case 'ordering': return { order: it.correctOrder }; case 'multiple_choice': return { choice: it.correct }; default: throw new Error(it.kind); } }

describe('minigames: rodadas e itens', () => {
  it('cada jogo gera 5 rodadas determinísticas, com habilidade existente, dicas, fonte e rascunho', () => {
    for (const g of IDS) for (const seed of [1, 2, 3, 9, 42]) {
      const a = roundsFor(g, seed), b = roundsFor(g, seed); expect(a).toHaveLength(g === 'escape' ? 4 : 5); expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      for (const r of a) { expect(skillIds.has(r.item.skillId), `${g}:${r.item.skillId}`).toBe(true); expect(r.item.hints.length).toBeGreaterThan(0); expect(r.item.source.license).toBeTruthy(); expect(r.item.review.status).toBe('draft'); expect(r.item.review.needsProfessionalReview).toBe(true); }
      expect(new Set(a.map((r) => r.item.id)).size).toBe(a.length);
    }
  });
  it('a solução do jogo é corrigida como certa pelo mesmo motor', () => { for (const g of IDS) for (const seed of [1, 5, 8]) for (const r of roundsFor(g, seed)) expect(gradeItem(r.item, solve(r.item) as never).correct, `${g} ${r.item.id}`).toBe(true); });
  it('equívocos etiquetados nos erros viram hipóteses no motor (origem do erro)', () => {
    for (const r of pizzaRounds(3)) if (r.item.kind === 'fraction_visual' && r.item.wrongPatterns?.length) { const g = gradeItem(r.item, { shaded: r.item.wrongPatterns[0]!.shaded }); expect(g.correct).toBe(false); expect(g.misconceptions).toEqual(['count_unshaded']); }
    for (const r of marketRounds(3)) if (r.item.kind === 'fill_in' && r.item.wrongPatterns?.length) { const w = r.item.wrongPatterns[0]!; expect(gradeItem(r.item, { text: w.answer }).misconceptions).toEqual([w.misconception]); }
    for (const g of IDS) for (const r of roundsFor(g, 2)) { const tags = r.item.kind === 'multiple_choice' ? r.item.options.flatMap((o) => (o.misconception ? [o.misconception] : [])) : r.item.kind === 'fill_in' ? (r.item.wrongPatterns ?? []).map((w) => w.misconception) : r.item.kind === 'fraction_visual' ? (r.item.wrongPatterns ?? []).map((w) => w.misconception) : []; for (const t of tags) expect(MISCONCEPTIONS[t], `${g}: ${t}`).toBeTruthy(); }
  });
  it('contas dos jogos conferem de forma independente', () => {
    for (const r of marketRounds(4)) if (r.view.type === 'total') expect(r.view.total).toBe(r.view.items.reduce((s, i) => s + i.prod.p * i.qty, 0)); else { expect(r.view.change).toBe(r.view.paid - r.view.total); expect(r.view.total).toBe(r.view.items.reduce((s, i) => s + i.prod.p * i.qty, 0)); }
    for (const r of labRounds(4)) { if (r.view.type === 'array') expect(r.item.kind === 'fill_in' && r.item.accepted[0]).toBe(String(r.view.rows * r.view.per)); if (r.view.type === 'remainder') expect(r.item.kind === 'fill_in' && r.item.accepted[0]).toBe(String(r.view.total % r.view.boxes)); if (r.view.type === 'share') expect(r.view.total % r.view.boxes).toBe(0); }
    for (const r of pizzaRounds(4)) if (r.view.type === 'build') { expect(r.view.target).toBeGreaterThanOrEqual(1); expect(r.view.target).toBeLessThanOrEqual(r.view.den); }
  });
  it('frases e detetive: tiles e palavra suspeita coerentes', () => {
    for (const r of sentenceRounds(6)) { expect(r.view.tiles.map((t) => t.label).sort()).toEqual((r.item.kind === 'ordering' ? r.item.entries.map((e) => e.label) : []).sort()); expect(r.view.tiles.map((t) => t.id)).not.toEqual(r.item.kind === 'ordering' ? r.item.correctOrder : []); }
    for (const r of detectiveRounds(6)) { expect(r.view.bad).toBeLessThan(r.view.words.length); expect(r.item.kind).toBe('multiple_choice'); }
  });
  it('alimenta o diagnóstico: rodadas de jogo entram como evidência do tipo "game" e erro repetido confirma o equívoco', () => {
    let st = newLearner('x'); let t = 1_700_000_000_000;
    for (const seed of [1, 2, 3]) { const r = pizzaRounds(seed)[0]!; if (r.item.kind !== 'fraction_visual') continue; st = recordResponse(st, r.item, { shaded: r.item.den - r.item.targetNum }, { hintsUsed: 0, at: (t += 1000), phase: 'game' }).state; }
    expect(st.evidence.every((e) => e.kind === 'game')).toBe(true); expect(st.hypotheses['count_unshaded']!.status).toBe('confirmed');
    const rep = buildReport(st, { skills: ALL_SKILLS, items: [] }, ['frac.visual'], t)[0]!; expect(rep.causes.some((c) => c.misconceptionId === 'count_unshaded')).toBe(true);
  });
  it('estrelas nunca punem: concluir dá ao menos 1; autonomia e acertos dão mais', () => { expect(starsFor(0, 5, 3)).toBe(1); expect(starsFor(3, 5, 2)).toBe(2); expect(starsFor(5, 5, 0)).toBe(3); expect(starsFor(4, 5, 0)).toBe(3); expect(starsFor(5, 5, 2)).toBe(2); });
  it('registro de jogos cobre matemática e português e aponta jogo por habilidade', () => { expect(GAMES.map((g) => g.id).sort()).toEqual([...IDS].sort()); expect(gameForSkill('frac.compare')!.id).toBe('pizzaria'); expect(gameForSkill('perc.change', 'estrategistas')!.id).toBe('financas'); expect(gameForSkill('frac.compare', 'estrategistas')!.id).toBe('pizzaria'); expect(gameForSkill('pt.spell.rules')!.id).toBe('detetive'); expect(gameForSkill('div.facts')!.id).toBe('laboratorio'); for (const g of GAMES) for (const s of g.skills) expect(skillIds.has(s)).toBe(true); });
});

describe('jogos por faixa etária e por interesse', () => {
  it('catálogo muda com a faixa; adolescentes não veem jogos infantis como principais', () => {
    const ids = (b: Parameters<typeof gamesForBand>[0]) => gamesForBand(b).main.map((g) => g.id);
    expect(ids('exploradores')).toEqual(['pizzaria', 'mercado']); // 5–7: jogos visuais (sem leitura)
    expect(ids('aventureiros').sort()).toEqual(['detetive', 'frases', 'laboratorio', 'mercado', 'pizzaria']);
    expect(ids('desafiadores')).toEqual(expect.arrayContaining(['financas', 'escape', 'placar'])); expect(ids('desafiadores')).not.toContain('pizzaria');
    expect(ids('estrategistas').sort()).toEqual(['escape', 'financas', 'placar']);
    expect(gamesForBand('estrategistas').base.map((g) => g.id).sort()).toEqual(['detetive', 'frases', 'laboratorio', 'mercado', 'pizzaria']); expect(gamesForBand('aventureiros').base).toEqual([]);
    for (const g of GAMES.filter((x) => x.base)) expect(g.teen).toBeTruthy();
  });
  it('treino de base para adolescentes usa nome e tom adultos (sem "Pizzaria das Frações")', () => {
    const p = GAMES.find((g) => g.id === 'pizzaria')!; expect(labelFor(p, 'estrategistas').name).toBe('Frações na prática'); expect(labelFor(p, 'aventureiros').name).toBe('Pizzaria das Frações'); expect(labelFor(p, 'estrategistas').tagline).not.toMatch(/!/);
  });
  it('interesse vira o tema dos problemas (mesma conta, contexto diferente)', () => {
    expect(ctxOf(['animais', 'futebol'])).toBe('animais'); expect(ctxOf(['xyz'])).toBe('esportes'); expect(ctxOf([])).toBe('esportes');
    const f = placarRounds(1, 'futebol')[0]!, m = placarRounds(1, 'musica')[0]!; expect(f.item.statement).toContain(CTX.futebol.metric); expect(m.item.statement).toContain(CTX.musica.metric);
    expect(f.item.kind === 'fill_in' && f.item.accepted[0]).toBe(m.item.kind === 'fill_in' ? m.item.accepted[0] : ''); // mesma matemática
    expect(financasRounds(1, 'tecnologia')[0]!.item.statement).toContain('teclado'); expect(financasRounds(1, 'jogos')[0]!.item.statement).toContain('jogo');
  });
  it('matemática avançada dos jogos 11–17 confere de forma independente', () => {
    for (const seed of [1, 2, 3, 7]) {
      for (const r of financasRounds(seed)) { const a = r.item.kind === 'fill_in' ? Number(r.item.accepted[0]) : NaN; expect(Number.isInteger(a) && a > 0).toBe(true); }
      const fr = financasRounds(seed); const m1 = fr[0]!.item.statement.match(/R\$ (\d+) e está com (\d+)%/)!; expect(Number(fr[0]!.item.kind === 'fill_in' && fr[0]!.item.accepted[0])).toBe(Number(m1[1]) * (1 - Number(m1[2]) / 100));
      const m4 = fr[3]!.item.statement.match(/R\$ (\d+) a (\d+)% ao mês, juros simples, (\d+) meses/)!; expect(Number(fr[3]!.item.kind === 'fill_in' && fr[3]!.item.accepted[0])).toBe((Number(m4[1]) * Number(m4[2]) * Number(m4[3])) / 100);
      for (const r of escapeRounds(seed)) expect(r.view.rooms).toBe(4);
      const pl = placarRounds(seed); const mean = pl[0]!; if (mean.item.kind === 'fill_in') expect(Number(mean.item.accepted[0]) * mean.view.data.length).toBe(mean.view.data.reduce((s, v) => s + v, 0));
    }
  });
});
