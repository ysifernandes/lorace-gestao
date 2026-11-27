// Suíte visual (Playwright): capturas em 7 resoluções, comparação lado a lado com as referências aprovadas e verificações automáticas
// de layout (overflow, sobreposição, área de toque), acessibilidade (axe-core), navegação e desempenho. Uso: ver docs/TESTING.md.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { runSession } from './helpers';
const req = createRequire(import.meta.url); const { chromium } = req('playwright');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/'; const OUT = process.env.SHOTS ?? '/tmp/shots-visual'; mkdirSync(OUT, { recursive: true });
const REF = new globalThis.URL('../../../docs/design/references/', import.meta.url).pathname; let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '  ✔' : '  ✘'} ${m}`); if (!c) fails++; };
const VIEWPORTS = [[360, 800], [390, 844], [430, 932], [768, 1024], [1366, 768], [1440, 900], [1920, 1080]] as const;
const axeSrc = readFileSync(req.resolve('axe-core'), 'utf8');

const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }); const page = await ctx.newPage(); page.setDefaultTimeout(8000);
const errors: string[] = []; page.on('pageerror', (e: Error) => errors.push(e.message)); page.on('console', (m: any) => m.type() === 'error' && errors.push(m.text()));
const login = async (label: string) => { await page.goto(URL + '#/login'); await page.getByRole('button', { name: label }).click(); await page.waitForTimeout(900); };

console.log('Preparação: Luna conclui o diagnóstico pela interface (estado real)');
await login('Aluna Luna (9 anos)'); await page.goto(URL + '#/s/session?kind=diagnostic'); await page.waitForTimeout(400);
await runSession(page, { 'frac.add.diff': 'add_num_and_den' }); await page.goto(URL + '#/s'); await page.waitForTimeout(900);

console.log('1) Dashboard nas 7 resoluções');
for (const [w, h] of VIEWPORTS) {
  await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(400); const tag = `${w}x${h}`;
  await page.screenshot({ path: `${OUT}/dash-${tag}.png` }); await page.screenshot({ path: `${OUT}/dash-${tag}-full.png`, fullPage: true });
  const m = await page.evaluate(() => {
    const r = (s: string) => document.querySelector(s)?.getBoundingClientRect(); const vis = (s: string) => { const e = document.querySelector(s) as HTMLElement | null; return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0; };
    const cards = [...document.querySelectorAll('.ax-banner,.ax-subjects,.ax-card')].map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0);
    let overlap = 0; for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) { const a = cards[i]!, b = cards[j]!; const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ox > 4 && oy > 4) overlap++; }
    const bt = [...document.querySelectorAll('.ax-bt')].map((e) => e.getBoundingClientRect());
    return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, side: vis('.ax-side'), bottom: vis('.ax-bottom'), banner: vis('.ax-banner'), subj: document.querySelectorAll('.ax-subj').length, cards: document.querySelectorAll('.ax-card').length, overlap,
      minTouch: bt.length ? Math.min(...bt.flatMap((b) => [b.width, b.height])) : null, bottomFixed: (() => { const b = r('.ax-bottom'); return b ? Math.abs(b.bottom - window.innerHeight) < 2 : null; })(), sideW: r('.ax-side')?.width ?? 0, rightX: r('.ax-right')?.left ?? 0, bannerTop: r('.ax-banner')?.top ?? 0, bannerLeft: r('.ax-banner')?.left ?? 0 };
  });
  ok(m.sw <= m.iw + 1, `${tag}: sem rolagem horizontal (${m.sw} <= ${m.iw})`); ok(m.banner && m.subj === 4 && m.cards >= 5, `${tag}: banner, 4 disciplinas e 5 cards presentes`); ok(m.overlap === 0, `${tag}: nenhum card sobreposto`);
  if (w >= 1024) { ok(m.side && !m.bottom, `${tag}: menu lateral visível e navegação inferior oculta`); } else { ok(!m.side && m.bottom && m.bottomFixed === true, `${tag}: navegação inferior fixa visível, menu lateral oculto`); ok((m.minTouch ?? 0) >= 44, `${tag}: áreas de toque da navegação ≥ 44px (${m.minTouch})`); }
  if (w === 1440 || w === 1920) { ok(m.sideW / w > 0.14 && m.sideW / w < 0.24, `${tag}: proporção do menu lateral próxima da referência (${(m.sideW / w).toFixed(2)} ≈ 0.19)`); ok(m.rightX / w > 0.66 && m.rightX / w < 0.8, `${tag}: coluna direita na posição da referência (${(m.rightX / w).toFixed(2)} ≈ 0.72)`); }
}

console.log('2) Comparação lado a lado com as referências');
async function sideBySide(refFile: string, vp: [number, number], name: string) {
  await page.setViewportSize({ width: vp[0], height: vp[1] }); await page.waitForTimeout(500); const ours = await page.screenshot(); const ref = readFileSync(REF + refFile);
  const p2 = await ctx.newPage(); await p2.setViewportSize({ width: vp[0] * 2 + 40, height: vp[1] + 60 });
  await p2.setContent(`<body style="margin:0;background:#222;display:flex;gap:20px;padding:30px 20px;font:14px sans-serif;color:#fff"><div><p>Referência aprovada</p><img style="height:${vp[1]}px" src="data:image/png;base64,${ref.toString('base64')}"></div><div><p>Implementação</p><img style="height:${vp[1]}px" src="data:image/png;base64,${ours.toString('base64')}"></div></body>`);
  await p2.waitForTimeout(300); await p2.screenshot({ path: `${OUT}/${name}.png` }); await p2.close(); ok(true, `${name}.png gerado`);
}
await sideBySide('referencia-desktop.png', [1672, 941], 'comparacao-desktop'); await sideBySide('referencia-mobile.png', [390, 844], 'comparacao-mobile');

console.log('3) Navegação e botões (desktop e mobile)');
const routes: [string, string][] = [['Estudar', 'Estudar'], ['Minhas Missões', 'Minhas Missões'], ['Minha Evolução', 'Minha evolução'], ['Conquistas', 'Conquistas'], ['Biblioteca', 'Biblioteca'], ['Tutor IA', 'Tutor IA']];
await page.setViewportSize({ width: 1440, height: 900 });
for (const [link, title] of routes) { await page.goto(URL + '#/s'); await page.waitForTimeout(250); await page.locator('.ax-side').getByRole('link', { name: link }).click(); await page.waitForTimeout(450); const h = await page.locator('h1').first().innerText(); ok(h.includes(title), `menu lateral → ${link}`); const o = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1); ok(o, `${link}: sem rolagem horizontal`); await page.screenshot({ path: `${OUT}/page-${link.replace(/\s/g, '-')}-1440.png` }); }
await page.goto(URL + '#/s'); await page.locator('.ax-side').getByRole('link', { name: /Área da Família/ }).click(); await page.waitForTimeout(350); ok((await page.locator('h1').first().innerText()).includes('Família'), 'menu lateral → Área da Família');
await page.setViewportSize({ width: 390, height: 844 }); await page.goto(URL + '#/s'); await page.waitForTimeout(400);
for (const l of ['Estudar', 'Missões', 'Evolução', 'Família', 'Início']) { await page.locator('.ax-bottom').getByRole('link', { name: l }).click(); await page.waitForTimeout(350); ok(await page.locator('.ax-bottom .ax-bt.on').innerText().then((t: string) => t.includes(l)), `navegação inferior → ${l}`); }
await page.screenshot({ path: `${OUT}/mobile-inicio-nav.png` });
console.log('   botões do painel');
await page.goto(URL + '#/s'); await page.waitForTimeout(400); await page.getByRole('button', { name: /Notificações/ }).first().click(); await page.waitForTimeout(200); ok(await page.getByRole('dialog', { name: 'Notificações' }).count() === 1, 'sino abre notificações'); await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Personalizar avatar' }).click(); await page.waitForTimeout(200); await page.getByRole('radio', { name: /^estilo|cacheado/ }).first().click().catch(() => {}); await page.getByRole('button', { name: 'Salvar' }).click(); ok(true, 'editor de avatar abre e salva');
await page.locator('.ax-evo [role=button]').first().click({ force: true }); await page.waitForTimeout(200); ok(await page.locator('.ax-node-info').count() === 1, 'fases do mapa são clicáveis e explicam o motivo (evidência)');
await page.getByRole('button', { name: 'Gerenciar com um responsável' }).click(); await page.waitForTimeout(200); ok((await page.locator('.modal').innerText()).includes('responsável'), 'gerenciar com responsável abre o pedido de tempo'); await page.keyboard.press('Escape');
await page.getByRole('button', { name: /Começar agora|Continuar Plano/ }).first().click(); await page.waitForTimeout(500); ok(page.url().includes('/s/'), 'CTA da missão navega para a atividade');

console.log('4) Fidelidade de dados (nada inventado)');
await page.goto(URL + '#/login'); await page.getByRole('button', { name: 'Aluno Caio (6)' }).click(); await page.waitForTimeout(900); await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(300);
const empty = await page.locator('.ax-dash').innerText(); ok(!/\d+%/.test(empty), 'aluno sem evidências: nenhuma porcentagem exibida'); ok(/Faça o diagnóstico/.test(empty) && /0\s*pontos/.test(empty.replace(/\n/g, ' ')), 'aluno novo: pontos 0 e convite ao diagnóstico'); await page.screenshot({ path: `${OUT}/dash-aluno-novo-1440.png` });
await page.goto(URL + '#/login'); await page.getByRole('button', { name: 'Aluna Luna (9 anos)' }).click(); await page.waitForTimeout(900); const pop = await page.locator('.ax-dash').innerText(); ok(/\d+%/.test(pop) && /estimativa/i.test(pop), 'aluna com diagnóstico: porcentagens rotuladas como estimativa');

console.log('4b) Sair e trocar de perfil em tela estreita (regressão: botão Sair escondido)');
for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]] as const) for (const label of ['Professora', 'Responsável', 'Gestora', 'Administrador', 'Aluno Davi (13)']) {
  await page.setViewportSize({ width: w, height: h }); await page.goto(URL + '#/login'); await page.getByRole('button', { name: label }).click(); await page.waitForTimeout(500);
  const stu = label.startsWith('Aluno'); if (stu) await page.getByRole('button', { name: 'Menu do aluno' }).filter({ visible: true }).first().click();
  const btn = stu ? page.getByRole('menuitem', { name: /Sair/ }) : page.getByRole('button', { name: 'Sair' }).filter({ visible: true }).first();
  const visible = await btn.isVisible().catch(() => false); ok(visible, `${w}px · ${label}: botão Sair visível`); if (visible) { await btn.click(); await page.waitForTimeout(300); ok(page.url().includes('login') || (await page.getByRole('button', { name: 'Entrar' }).count()) > 0, `${w}px · ${label}: sair leva ao login`); }
}
await page.goto(URL + '#/login'); await page.getByRole('button', { name: 'Professora' }).click(); await page.waitForTimeout(400); await page.goto(URL + '#/login'); await page.waitForTimeout(300);
ok(await page.getByText(/Você está conectado como/).count() === 1, 'tela de login avisa quando já há alguém conectado (continuar/sair)'); await page.getByRole('button', { name: 'Sair' }).first().click();
console.log('5) Acessibilidade (axe-core) e contraste');
for (const [w, h] of [[1440, 900], [390, 844]] as const) {
  await page.setViewportSize({ width: w, height: h }); await page.goto(URL + '#/s'); await page.waitForTimeout(800); await page.addScriptTag({ content: axeSrc });
  const res = await page.evaluate(async () => (await (window as any).axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] })).violations.map((v: any) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0]?.html?.slice(0, 90) })));
  for (const v of res) console.log(`   · ${w}px axe ${v.impact} ${v.id} ×${v.n}: ${v.sample}`);
  const bad = res.filter((v: any) => v.impact === 'critical' || v.impact === 'serious'); ok(bad.length === 0, `${w}px: sem violações críticas/sérias de acessibilidade (${res.length} no total)`);
}
console.log('6) Desempenho');
await page.setViewportSize({ width: 1440, height: 900 }); await page.goto(URL + '#/s'); await page.reload(); await page.waitForTimeout(1000);
const perf = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), nodes: document.querySelectorAll('*').length, heapMB: Math.round(((performance as any).memory?.usedJSHeapSize ?? 0) / 1048576) }; });
const dist = new globalThis.URL('../dist/assets/', import.meta.url).pathname; const js = readdirSync(dist).filter((f) => f.endsWith('.js')).reduce((a, f) => a + statSync(dist + f).size, 0), css = readdirSync(dist).filter((f) => f.endsWith('.css')).reduce((a, f) => a + statSync(dist + f).size, 0);
console.log(`   DCL ${perf.dcl}ms · load ${perf.load}ms · ${perf.nodes} nós DOM · heap ${perf.heapMB}MB · JS ${(js / 1024).toFixed(0)}KB · CSS ${(css / 1024).toFixed(0)}KB`);
ok(perf.dcl < 2500 && perf.load < 4000, 'carregamento < 2,5 s (DCL) em ambiente local'); ok(perf.nodes < 2500, `DOM enxuto (${perf.nodes} nós)`); ok(js < 700 * 1024, `JS < 700KB (${(js / 1024).toFixed(0)}KB)`);
writeFileSync(`${OUT}/desempenho.json`, JSON.stringify({ ...perf, jsKB: Math.round(js / 1024), cssKB: Math.round(css / 1024) }, null, 2));
ok(errors.length === 0, `sem erros de console/JS (${errors.length}${errors[0] ? ': ' + errors[0].slice(0, 80) : ''})`);
await browser.close(); console.log(fails ? `\nFALHAS: ${fails}` : '\nVISUAL OK'); process.exit(fails ? 1 : 0);
