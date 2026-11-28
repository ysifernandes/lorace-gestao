// E2E da personalização por idade: cadastro inicial (interesses + estilo), painel e catálogo de adolescentes, jogos 11–17 com tema por interesse,
// ajuste de maturidade pelo responsável e acessibilidade. Exige `vite preview` em :4173.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { roundsFor, type GameId } from '../src/games/logic';
import { runSession } from './helpers';
const req = createRequire(import.meta.url); const { chromium } = req('playwright'); const axeSrc = readFileSync(req.resolve('axe-core'), 'utf8');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/'; const OUT = process.env.SHOTS ?? '/tmp/shots-teens'; mkdirSync(OUT, { recursive: true }); let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '  ✔' : '  ✘'} ${m}`); if (!c) fails++; };
const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); page.setDefaultTimeout(7000);
const errors: string[] = []; page.on('pageerror', (e: Error) => errors.push(e.message)); page.on('console', (m: any) => m.type() === 'error' && errors.push(m.text()));
const login = async (l: string) => { await page.goto(URL + '#/login'); await page.getByRole('button', { name: l }).click(); await page.waitForTimeout(900); };
const logout = async () => { const side = page.locator('.ax-side').getByRole('button', { name: 'Sair' }); if (await side.isVisible().catch(() => false)) await side.click(); else { await page.getByRole('button', { name: 'Menu do aluno' }).filter({ visible: true }).first().click(); await page.getByRole('menuitem', { name: /Sair/ }).click(); } await page.waitForTimeout(200); };
const typeNum = async (n: number) => { for (const d of String(n)) await page.locator('.gm-keypad').getByRole('button', { name: d, exact: true }).click(); };
const axe = async (label: string) => { await page.addScriptTag({ content: axeSrc }); const r = await page.evaluate(async () => (await (window as any).axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v: any) => ({ id: v.id, impact: v.impact, n: v.nodes.length, html: v.nodes[0]?.html?.slice(0, 90) }))); for (const v of r) console.log(`   · axe ${v.impact} ${v.id} ×${v.n} ${v.html}`); ok(r.filter((v: any) => v.impact === 'critical' || v.impact === 'serious').length === 0, `${label}: sem violações críticas/sérias de acessibilidade`); };
const band = () => page.locator('.ax-app').getAttribute('data-band');

console.log('1) Teo (14 anos): primeiro acesso → cadastro inicial'); await login('Aluno Teo (14, 1º acesso)');
ok(page.url().includes('/s/comecar'), 'aluno novo é levado ao cadastro inicial'); await page.screenshot({ path: `${OUT}/onboarding-teo.png` }); ok(await page.locator('.ax-onb-head svg.ax-svg').count() === 0, 'adolescente não vê mascote infantil no cadastro');
await axe('cadastro (14 anos)');
await page.getByRole('button', { name: /Futebol/ }).click(); await page.getByRole('button', { name: /Videogames/ }).click(); ok(await page.getByRole('button', { name: 'Continuar' }).isEnabled(), 'escolher interesses habilita continuar');
await page.getByRole('button', { name: 'Continuar' }).click(); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/onboarding-teo-estilo.png` }); await page.getByRole('button', { name: 'Começar!' }).click(); await page.waitForTimeout(900);
ok(page.url().endsWith('#/s') || page.url().endsWith('/s'), 'após o cadastro vai ao painel'); ok((await band()) === 'estrategistas', 'faixa 14–17 aplicada (Estrategistas)');
const txt = await page.locator('.ax-dash').innerText(); ok(/Diagnóstico inicial/.test(txt) && !/Nova\s*Missão/.test(txt), 'banner usa tom de adolescente (sem "Nova Missão!")'); ok(/Jogos/.test(txt) && !/Minigames/.test(txt), 'prateleira chama "Jogos" (não "Minigames")');
const mascotW = await page.locator('.ax-banner-mascot svg').evaluate((e: SVGElement) => e.getBoundingClientRect().width); ok(mascotW < 120, `mascote discreto no banner (${Math.round(mascotW)}px)`); await page.screenshot({ path: `${OUT}/painel-teo.png` }); await axe('painel (14 anos)');

console.log('2) Catálogo de jogos de 14–17'); await page.locator('.ax-side').getByRole('link', { name: 'Jogos' }).click(); await page.waitForTimeout(500);
const names = await page.locator('.gm-hub').first().locator('.gm-info b').allInnerTexts(); ok(names.length === 3 && names.some((n: string) => /Finanças/.test(n)) && names.some((n: string) => /Escape/.test(n)) && names.some((n: string) => /Placar/.test(n)), `jogos principais: ${names.join(' | ')}`);
const body = await page.locator('main').innerText(); ok(/Treino de base/.test(body) && /Frações na prática/.test(body) && !/Pizzaria das Frações/.test(body) && !/Laboratório de Cupcakes/.test(body), 'base revista com nomes adultos (sem Pizzaria/Cupcakes)'); await page.screenshot({ path: `${OUT}/jogos-teo.png` });

console.log('3) Jogando 11–17 (tema: futebol)'); const GAMES: GameId[] = ['financas', 'escape', 'placar'];
for (const g of GAMES) { await page.goto(URL + `#/s/jogos/${g}`); await page.waitForTimeout(500); const rounds = roundsFor(g, 1, 'futebol'); ok(await page.locator('.gm-coach.assistant').count() === 1, `${g}: assistente discreto (sem mascote grande)`);
  for (let i = 0; i < rounds.length; i++) { const it = rounds[i]!.item; if (i === 0) { await page.screenshot({ path: `${OUT}/${g}-rodada1.png` }); if (g === 'placar') ok(/gols/.test(await page.locator('.gm-scenario').innerText()), 'placar usa o tema escolhido (futebol: gols)'); if (g === 'financas') ok(/chuteira/.test(await page.locator('.gm-scenario').innerText()), 'finanças usa o tema escolhido (chuteira)'); await axe(`${g} (rodada 1)`); }
    await typeNum(Number(it.kind === 'fill_in' ? it.accepted[0] : 0)); await page.getByRole('button', { name: /Confirmar|Inserir senha/ }).click(); await page.waitForTimeout(80); ok(await page.getByRole('button', { name: /Próxima rodada|Ver resultado/ }).count() === 1, `${g}: rodada ${i + 1} resolvida`); await page.getByRole('button', { name: /Próxima rodada|Ver resultado/ }).click(); await page.waitForTimeout(80); }
  ok((await page.locator('h1').first().innerText()).includes('partida concluída'), `${g}: final em tom de adolescente ("partida concluída")`); await page.screenshot({ path: `${OUT}/${g}-final.png` }); }

console.log('4) Diagnóstico de adolescente cobre conteúdo avançado'); await page.goto(URL + '#/s/session?kind=diagnostic'); await page.waitForTimeout(500); const n = await runSession(page, {}, 30); ok(n >= 6 && n <= 24, `diagnóstico com ${n} atividades`); await page.goto(URL + '#/s'); await page.waitForTimeout(700);
const dash = await page.locator('.ax-dash').innerText(); ok(/Porcentagem, álgebra e dados/.test(dash), 'desempenho inclui o grupo avançado (porcentagem, álgebra e dados)'); await page.screenshot({ path: `${OUT}/painel-teo-depois.png` }); await logout();

console.log('5) Malu (12): escolhe "mais tranquilo" → visual de 8–10'); await login('Aluna Malu (12, 1º acesso)'); await page.getByRole('button', { name: /Música/ }).click(); await page.getByRole('button', { name: 'Continuar' }).click(); await page.getByRole('radio', { name: /Mais tranquilo/ }).click(); await page.screenshot({ path: `${OUT}/onboarding-malu-estilo.png` }); await page.getByRole('button', { name: 'Começar!' }).click(); await page.waitForTimeout(900);
ok((await band()) === 'aventureiros', 'maturidade "mais tranquilo" leva de 11–13 para a faixa 8–10'); await page.locator('.ax-side').getByRole('link', { name: 'Jogos' }).click(); await page.waitForTimeout(400); ok((await page.locator('.gm-hub .gm-info b').allInnerTexts()).some((t: string) => /Pizzaria/.test(t)), 'Malu (tranquilo) vê os jogos da faixa 8–10'); await logout();

console.log('6) Caio (6): só jogos visuais'); await login('Aluno Caio (6)'); await page.locator('.ax-side').getByRole('link', { name: 'Jogos' }).click(); await page.waitForTimeout(400); const kids = await page.locator('.gm-hub .gm-info b').allInnerTexts(); ok(kids.length === 4 && kids.every((t: string) => /Fazenda|Rua dos Sons|Formas|Mercado/.test(t)), `5–7 anos: ${kids.join(' | ')} (sem jogos que exigem leitura)`); await page.screenshot({ path: `${OUT}/jogos-caio.png` }); await logout();

console.log('6b) Sair fora do painel (regressão: aluno preso fora da tela inicial)');
for (const [w, h] of [[1440, 900], [390, 844]] as const) { await page.setViewportSize({ width: w, height: h }); await login('Aluno Caio (6)'); await page.goto(URL + '#/s/jogos'); await page.waitForTimeout(500);
  const vis = w >= 1024 ? await page.locator('.ax-side').getByRole('button', { name: 'Sair' }).isVisible() : (await page.getByRole('button', { name: 'Menu do aluno' }).filter({ visible: true }).count()) > 0; ok(vis, `${w}px: Sair acessível na página de jogos`); await logout(); ok((await page.getByRole('button', { name: 'Entrar' }).count()) > 0, `${w}px: sair leva ao login`); }
await page.setViewportSize({ width: 1440, height: 900 });
console.log('7) Responsável ajusta o estilo'); await login('Responsável'); await page.locator('.card', { hasText: 'Teo' }).getByRole('button', { name: 'Abrir' }).first().click(); await page.waitForTimeout(500);
ok(/Perfil de aprendizagem/.test(await page.locator('main').innerText()) && /14 anos/.test(await page.locator('main').innerText()), 'responsável vê idade e estilo atual'); await page.getByLabel('Estilo dos desafios').selectOption('tranquilo'); await page.waitForTimeout(200); ok(/ajustado a partir de Estrategistas/.test(await page.locator('main').innerText()), 'ajuste de maturidade aparece como "ajustado a partir de…"'); await page.getByLabel('Estilo dos desafios').selectOption('padrao');
ok(errors.length === 0, `sem erros de console/JS (${errors.length}${errors[0] ? ': ' + errors[0].slice(0, 90) : ''})`);
await browser.close(); console.log(fails ? `\nFALHAS: ${fails}` : '\nTEENS OK'); process.exit(fails ? 1 : 0);
