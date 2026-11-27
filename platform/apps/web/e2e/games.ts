// E2E dos minigames: um robô joga os 5 jogos até o fim pela interface (rodadas geradas por semente = 1ª partida) e confere estrelas, evidências e acessibilidade.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { BILLS, roundsFor, type GameId, type LabView, type MarketView, type PizzaView, type DetectiveView, type SentenceView, type Round } from '../src/games/logic';
const req = createRequire(import.meta.url); const { chromium } = req('playwright'); const axeSrc = readFileSync(req.resolve('axe-core'), 'utf8');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/'; const OUT = process.env.SHOTS ?? '/tmp/shots-games'; mkdirSync(OUT, { recursive: true }); let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '  ✔' : '  ✘'} ${m}`); if (!c) fails++; };
const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); page.setDefaultTimeout(6000);
const errors: string[] = []; page.on('pageerror', (e: Error) => errors.push(e.message)); page.on('console', (m: any) => m.type() === 'error' && errors.push(m.text()));
const typeNum = async (n: number) => { for (const d of String(n)) await page.locator('.gm-keypad').getByRole('button', { name: d, exact: true }).click(); };
const submitBtn = (re: RegExp) => page.getByRole('button', { name: re });
function change(n: number) { const out: number[] = []; for (const b of [...BILLS].reverse()) while (n >= b) { out.push(b); n -= b; } return out; }

async function playRound(g: GameId, r: Round<unknown>) {
  const it = r.item;
  if (g === 'pizzaria') { const v = r.view as PizzaView; if (v.type === 'build') { for (let k = 1; k <= v.target; k++) await page.getByRole('button', { name: new RegExp(`^Fatia ${k}(,|$)`) }).click(); await submitBtn(/Servir/).click(); } else { const c = it.kind === 'multiple_choice' ? it.options.find((o) => o.id === it.correct)!.text : ''; await page.locator('.gm-opts button', { hasText: c }).first().click(); await submitBtn(/Conferir/).click(); } }
  if (g === 'mercado') { const v = r.view as MarketView; if (v.type === 'total') { await typeNum(v.total); await submitBtn(/Receber/).click(); } else { for (const b of change(v.change)) await page.getByRole("button", { name: `Adicionar R$ ${b}`, exact: true }).click(); await submitBtn(/Entregar troco/).click(); } }
  if (g === 'laboratorio') { const v = r.view as LabView; const ans = it.kind === 'fill_in' ? Number(it.accepted[0]) : 0;
    if (v.type === 'array') for (let k = 0; k < v.rows; k++) await submitBtn(/Colocar uma fileira/).click();
    if (v.type === 'share') for (let k = 0; k < v.total; k++) await page.locator('.gm-box').nth(k % v.boxes).click();
    if (v.type === 'pack') for (let k = 0; k < v.total / v.size; k++) await submitBtn(/Embalar pacote/).click();
    if (v.type === 'machine') for (let k = 0; k < v.minutes; k++) await submitBtn(/Ligar por mais/).click();
    if (v.type === 'remainder') for (let k = 0; k < Math.floor(v.total / v.boxes); k++) await page.getByRole('button', { name: 'Dar 1 a cada caixa' }).click();
    await typeNum(ans); await submitBtn(/Responder/).click(); }
  if (g === 'frases') { const v = r.view as SentenceView; const order = it.kind === 'ordering' ? it.correctOrder : []; for (const id of order) { const label = v.tiles.find((t) => t.id === id)!.label; await page.locator('.gm-words button', { hasText: new RegExp(`^${label}$`) }).first().click(); } await submitBtn(/Ler a frase/).click(); }
  if (g === 'detetive') { const v = r.view as DetectiveView; await page.locator('.gm-words.sentence button').nth(v.bad).click(); const c = it.kind === 'multiple_choice' ? it.options.find((o) => o.id === it.correct)!.text : ''; await page.locator('.gm-opts button', { hasText: new RegExp(`^${c}$`) }).first().click(); await submitBtn(/Resolver o caso/).click(); }
  await page.waitForTimeout(80);
}

console.log('Login: aluno novo (Caio) e central de jogos'); await page.goto(URL + '#/login'); await page.getByRole('button', { name: 'Aluno Caio (6)' }).click(); await page.waitForTimeout(800);
await page.goto(URL + '#/s'); await page.waitForTimeout(500); ok(await page.locator('.ax-shelf .gm-card').count() === 5, 'tela inicial mostra a prateleira com os 5 minigames'); await page.screenshot({ path: `${OUT}/home-jogos.png` });
await page.locator('.ax-side').getByRole('link', { name: 'Jogos' }).click(); await page.waitForTimeout(400); ok(await page.locator('.gm-hub .gm-card').count() === 5, 'menu Jogos abre a central'); await page.screenshot({ path: `${OUT}/central-jogos.png` });
for (const [w, h] of [[1440, 900], [390, 844]] as const) { await page.setViewportSize({ width: w, height: h }); await page.goto(URL + '#/s/jogos'); await page.waitForTimeout(500); await page.addScriptTag({ content: axeSrc }); const res = await page.evaluate(async () => (await (window as any).axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v: any) => ({ id: v.id, impact: v.impact, n: v.nodes.length, html: v.nodes[0]?.html?.slice(0, 80) }))); for (const v of res) console.log(`   · axe ${v.impact} ${v.id} ×${v.n} ${v.html}`); ok(res.filter((v: any) => v.impact === 'critical' || v.impact === 'serious').length === 0, `${w}px central de jogos sem violações críticas/sérias`); }
await page.setViewportSize({ width: 1280, height: 900 });

const GAMES: GameId[] = ['pizzaria', 'mercado', 'laboratorio', 'frases', 'detetive'];
for (const g of GAMES) {
  console.log(`Jogando: ${g}`); await page.goto(URL + `#/s/jogos/${g}`); await page.waitForTimeout(400); const rounds = roundsFor(g, 1);
  for (let i = 0; i < rounds.length; i++) {
    if (i === 0) { await page.screenshot({ path: `${OUT}/${g}-rodada1.png` }); await page.getByRole('button', { name: /Preciso de uma dica/ }).click(); ok((await page.locator('.gm-bubble').innerText()).length > 5, `${g}: dica progressiva aparece na fala do mascote`); }
    if (i === 1) { // erro de propósito na rodada 2 (primeira tentativa) → incentivo, sem punição, e nova tentativa
      const wrongOk = await (async () => { try { await playWrong(g, rounds[i]!); return true; } catch { return false; } })(); if (wrongOk) { const t = await page.locator('.gm-stage').first().isVisible(); void t; const txt = await page.locator('.gm-bubble').innerText(); ok(/Quase|tentar|Errar/i.test(txt) && !/errou|burro|vergonha/i.test(txt), `${g}: erro recebe incentivo do mascote (sem decepção)`); await page.getByRole('button', { name: 'Tentar de novo' }).click(); }
    }
    await playRound(g, rounds[i]!); ok(await page.getByRole('button', { name: /Próxima rodada|Ver resultado/ }).count() === 1, `${g}: rodada ${i + 1} resolvida`); await page.getByRole('button', { name: /Próxima rodada|Ver resultado/ }).click(); await page.waitForTimeout(80);
  }
  await page.waitForTimeout(300); ok((await page.locator('h1').first().innerText()).includes('missão cumprida'), `${g}: tela final de missão cumprida`); ok(await page.locator('.confetti').count() >= 0, `${g}: confete de comemoração`); await page.screenshot({ path: `${OUT}/${g}-final.png` });
  const stars = await page.locator('.gm-done .gm-stars span.on').count(); ok(stars >= 1, `${g}: concluir dá ao menos 1 estrela (${stars})`);
}
async function playWrong(g: GameId, r: Round<unknown>) {
  if (g === 'pizzaria') { const v = r.view as PizzaView; if (v.type === 'build') { const wrong = v.target === 1 ? 2 : 1; for (let k = 1; k <= wrong; k++) await page.getByRole('button', { name: new RegExp(`^Fatia ${k}(,|$)`) }).click(); await submitBtn(/Servir/).click(); return; } }
  if (g === 'mercado') { const v = r.view as MarketView; if (v.type === 'total') { await typeNum(v.total + 1); await submitBtn(/Receber/).click(); return; } }
  if (g === 'laboratorio') { const v = r.view as LabView; if (v.type === 'share') { for (let k = 0; k < v.total; k++) await page.locator('.gm-box').nth(0).click(); await page.getByRole('button', { name: /Recomeçar/ }).click(); for (let k = 0; k < v.total; k++) await page.locator('.gm-box').nth(k % v.boxes).click(); await typeNum(1); await submitBtn(/Responder/).click(); return; } }
  if (g === 'frases') { const v = r.view as SentenceView; const ids = v.tiles.map((t) => t.id); const order = r.item.kind === 'ordering' ? r.item.correctOrder : []; const wrong = ids.join() === [...order].reverse().join() ? ids : [...order].reverse(); for (const id of wrong) await page.locator('.gm-words button', { hasText: new RegExp(`^${v.tiles.find((t) => t.id === id)!.label}$`) }).first().click(); await submitBtn(/Ler a frase/).click(); return; }
  if (g === 'detetive') { const v = r.view as DetectiveView; await page.locator('.gm-words.sentence button').nth(v.bad).click(); const it = r.item; if (it.kind === 'multiple_choice') { const w = it.options.find((o) => o.id !== it.correct)!; await page.locator('.gm-opts button', { hasText: new RegExp(`^${w.text}$`) }).first().click(); await submitBtn(/Resolver o caso/).click(); return; } }
  throw new Error('sem erro intencional neste tipo');
}

console.log('Evidências e carteira'); await page.goto(URL + '#/s/progress'); await page.waitForTimeout(500); const prog = await page.locator('body').innerText(); ok(/atividade/.test(prog) && /XP/.test(prog), 'progresso mostra atividades e XP vindos dos jogos');
await page.goto(URL + '#/s'); await page.waitForTimeout(600); ok(!/^0\s*pontos/m.test((await page.locator('.ax-pill.pts').innerText()).replace(/\n/g, ' ')), 'pontos aumentaram com os jogos'); ok(await page.locator('.gm-card .gm-stars.sm span.on').count() >= 5, 'estrelas dos jogos aparecem na prateleira'); await page.screenshot({ path: `${OUT}/home-depois-jogos.png` });
ok(errors.length === 0, `sem erros de console/JS (${errors.length}${errors[0] ? ': ' + errors[0].slice(0, 90) : ''})`);
await browser.close(); console.log(fails ? `\nFALHAS: ${fails}` : '\nGAMES OK'); process.exit(fails ? 1 : 0);
