import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import * as S from '../src/store/db';
import { buildDashboard, fmtMinutes, toneOf } from '../src/store/dashboard';
import { Axolotl, MASCOT_STATES, mascotForEvent } from '../src/ui/axolotl';
import { brand, brandCssVars } from '@edu/brand';

async function world() { S.resetAll(); await S.seedDemo(); const d = S.getDB(); return { d, luna: d.students.find((s) => s.name === 'Luna')! }; }

describe('painel do aluno: nada inventado', () => {
  it('aluno sem evidências: sem porcentagens, sem fase concluída, missão = diagnóstico', async () => {
    const { d, luna } = await world(); const vm = buildDashboard(d, luna);
    expect(vm.subjects.every((s) => s.pct === null)).toBe(true); expect(vm.groups.every((g) => g.pct === null)).toBe(true); expect(vm.xp).toBe(0); expect(vm.minutes).toBe(0);
    expect(vm.mission.route).toContain('diagnostic'); expect(vm.world.nodes.every((n) => n.status !== 'mastered')).toBe(true); expect(vm.medals.every((m) => !m.earned)).toBe(true);
    expect(vm.subjects.filter((s) => s.active).map((s) => s.id)).toEqual(['matematica']); // demais disciplinas "em breve"
  });
  it('após atividades: porcentagens vêm do motor; mapa bloqueia fase cujo pré-requisito precisa de apoio (evidência, não pontos)', async () => {
    const { d, luna } = await world(); S.startSession(luna.id, 'diagnostic');
    for (let i = 0; i < 30; i++) { const it = S.currentItem(luna.id); if (!it) break; const wrong = it.skillId.startsWith('frac') && ('options' in it); const resp = 'options' in it ? { choice: wrong ? it.options.find((o) => o.id !== it.correct)!.id : it.correct } : it.kind === 'fill_in' ? { text: '0' } : it.kind === 'ordering' ? { order: [] } : it.kind === 'matching' ? { pairs: [] } : it.kind === 'drag_drop' ? { placement: {} } : it.kind === 'fraction_visual' ? { shaded: 0 } : { num: 0 }; S.answer(luna.id, it, resp, 0); }
    S.finishSession(luna.id); const vm = buildDashboard(S.getDB(), luna);
    expect(vm.subjects.find((s) => s.id === 'matematica')!.pct).not.toBeNull(); expect(vm.hasDiag).toBe(true); expect(vm.xp).toBeGreaterThan(0);
    const frac = vm.world; expect(frac.nodes.some((n) => n.status === 'locked' || n.status === 'current')).toBe(true);
    for (const n of vm.world.nodes.filter((x) => x.status === 'locked')) expect(n.why).toMatch(/evidência/);
    expect(vm.world.nodes.filter((n) => n.status === 'current').length).toBeLessThanOrEqual(1);
  });
  it('tom e formatação', () => { expect([0.9, 0.6, 0.2, null].map(toneOf)).toEqual(['ok', 'warn', 'bad', 'none']); expect([0, 45, 60, 150].map(fmtMinutes)).toEqual(['0min', '45min', '1h', '2h 30min']); });
});

describe('mascote e marca', () => {
  it('9 estados, cada um renderiza SVG acessível; nenhum estado é negativo', () => {
    expect(MASCOT_STATES).toHaveLength(9);
    for (const s of MASCOT_STATES) { const html = renderToStaticMarkup(createElement(Axolotl, { state: s.id })); expect(html).toContain('role="img"'); expect(html).toContain(`data-state="${s.id}"`); expect(html).toContain('ax-gills-l'); }
    expect(MASCOT_STATES.map((s) => s.id)).toEqual(expect.arrayContaining(['feliz', 'pensativo', 'explicando', 'estudando', 'comemorando', 'incentivando', 'dando_dicas', 'aguardando', 'apresentando']));
  });
  it('erro nunca vira expressão de decepção: mapeia para incentivando', () => { expect(mascotForEvent('incorrect')).toBe('incentivando'); expect(mascotForEvent('partial')).toBe('incentivando'); expect(mascotForEvent('hint')).toBe('dando_dicas'); expect(mascotForEvent('waiting')).toBe('aguardando'); });
  it('marca centralizada: variáveis CSS derivam de packages/brand e o nome é provisório', () => {
    expect(brand.name).toBe('Aprendix'); expect(brand.provisional).toBe(true); const v = brandCssVars(); expect(v['--brand-primary']).toBe(brand.colors.primary); expect(v['--subj-matematica-bg']).toBe(brand.subjects.matematica.bg);
  });
});
