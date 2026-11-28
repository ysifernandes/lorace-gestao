// E2E dos jogos áudio-primeiro (5–7): Caio (6) joga os 3 jogos pela interface; a voz do aparelho é substituída por um espião
// (o teste não ouve áudio: confere QUE o app pede a fala certa) e confere figuras, bater palmas, retentativa, estrelas, evidências e axe.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { roundsFor, type GameId } from '../src/games/logic';
const req = createRequire(import.meta.url); const { chromium } = req('playwright'); const axeSrc = readFileSync(req.resolve('axe-core'), 'utf8');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/'; const OUT = process.env.SHOTS ?? '/tmp/shots-audio'; mkdirSync(OUT, { recursive: true }); let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '  ✔' : '  ✘'} ${m}`); if (!c) fails++; };
const browser = await chromium.launch(); const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); page.setDefaultTimeout(6000);
const errors: string[] = []; page.on('pageerror', (e: Error) => errors.push(e.message)); page.on('console', (m: any) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => { (window as any).__said = []; const synth = { speak: (u: any) => (window as any).__said.push(u.text), cancel: () => {}, getVoices: () => [] }; Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true }); (window as any).SpeechSynthesisUtterance = function (this: any, t: string) { this.text = t; }; });
const said = () => page.evaluate(() => (window as any).__said as string[]);
await page.goto(URL + '#/login'); await page.getByRole('button', { name: 'Aluno Caio (6)' }).click(); await page.waitForTimeout(700);

console.log('1) Central de jogos de 5–7'); await page.goto(URL + '#/s/jogos'); await page.waitForTimeout(600);
const names = await page.locator('.gm-hub .gm-info b').allInnerTexts(); ok(names.length === 4 && ['Fazenda dos Números', 'Rua dos Sons', 'Formas e Padrões', 'Mercado Virtual'].every((n) => names.includes(n)), `jogos: ${names.join(' | ')}`);
ok((await page.locator('.gm-art svg').count()) === 4 && !/[\u{1F300}-\u{1FAFF}]/u.test(await page.locator('.gm-hub').innerText()), 'cards com ilustração vetorial e sem emoji'); await page.screenshot({ path: `${OUT}/hub-caio.png` });

for (const [g, label] of [['contagem', 'Fazenda dos Números'], ['sons', 'Rua dos Sons'], ['formas', 'Formas e Padrões']] as [GameId, string][]) {
  console.log(`2) ${label}`); await page.goto(URL + `#/s/jogos/${g}`); await page.waitForTimeout(900); const rounds = roundsFor(g, 1);
  const first = (await said()).length; ok(first >= 1 && (await said()).at(-1)!.length > 8, 'a pergunta é falada automaticamente ao abrir a rodada'); ok((await page.getByRole('button', { name: /^Ouvir de novo/ }).count()) === 1, 'botão "Ouvir de novo" presente');
  await page.getByRole('button', { name: /^Ouvir de novo/ }).click(); ok((await said()).length === first + 1, 'tocar em "Ouvir de novo" repete a fala');
  for (let i = 0; i < rounds.length; i++) {
    const it: any = rounds[i]!.item; const right = it.options.find((o: any) => o.id === it.correct).text; const wrong = it.options.find((o: any) => o.id !== it.correct).text;
    const radios = page.locator('[role=radio]'); const texts = (await radios.allInnerTexts()).map((t: string) => t.replace(/opção \d+/g, '').trim().split('\n')[0]!.trim());
    const idx = (t: string) => texts.findIndex((x: string) => x === t || x.startsWith(t));
    if (g === 'contagem' && i === 0) { ok((await page.locator('.fg-obj').count()) === it.figure.n, `${it.figure.n} objetos desenhados para contar`); await page.locator('.fg-obj').first().click(); ok(/Você tocou 1/.test(await page.locator('.fg-hint').innerText()), 'tocar num objeto marca como contado'); await page.screenshot({ path: `${OUT}/contagem-1.png` }); }
    if (g === 'sons' && it.skillId === 'pt.syllable') { await page.locator('.gm-drum').click(); await page.locator('.gm-drum').click(); ok((await page.locator('.gm-drum output').innerText()) === '2', 'bater palmas conta as batidas'); }
    if (g === 'formas' && it.figure?.type === 'pattern') { ok((await page.locator('.fg-chip').count()) === 5 && (await page.locator('.fg-slot').count()) === 1, 'padrão com 5 fichas e 1 lacuna'); ok((await page.locator('.gm-opt > svg').count()) === 4, 'alternativas do padrão são desenhadas'); await page.screenshot({ path: `${OUT}/formas-padrao.png` }); }
    if (i === 0) { const before = (await said()).length; await radios.nth(idx(wrong)).click(); ok((await said()).length === before + 1, 'tocar numa alternativa a lê em voz alta'); await page.getByRole('button', { name: 'Pronto!' }).click(); await page.waitForTimeout(250);
      ok(/Tentar de novo/.test(await page.locator('.gm-actions').innerText()), 'erro: mascote incentiva e oferece tentar de novo (sem punição)'); await page.getByRole('button', { name: 'Tentar de novo' }).click(); await page.waitForTimeout(200); }
    await page.locator('[role=radio]').nth(idx(right)).click(); await page.getByRole('button', { name: 'Pronto!' }).click(); await page.waitForTimeout(250);
    await page.getByRole('button', { name: /Próxima rodada|Ver resultado/ }).click(); await page.waitForTimeout(350);
  }
  const body = await page.locator('main').innerText(); ok(/missão cumprida/i.test(body), 'partida concluída'); ok((await page.locator('.gm-stars [class*=on], .gm-stars span.on').count()) >= 1 || /estrela/.test(await page.locator('.gm-stars').first().getAttribute('aria-label')), 'estrelas concedidas'); await page.screenshot({ path: `${OUT}/${g}-fim.png` });
}

console.log('3) Evidências e acessibilidade'); await page.goto(URL + '#/s/progress'); await page.waitForTimeout(500); ok(/atividade/.test(await page.locator('body').innerText()), 'jogos geraram evidências no progresso');
for (const [w, h] of [[1280, 900], [390, 844]] as const) { await page.setViewportSize({ width: w, height: h }); await page.goto(URL + '#/s/jogos/formas'); await page.waitForTimeout(700); await page.addScriptTag({ content: axeSrc }); const res = await page.evaluate(async () => (await (window as any).axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((v: any) => `${v.id}:${v.impact}`)); ok(res.length === 0, `${w}px: axe WCAG A/AA sem violações${res.length ? ' → ' + res.join(',') : ''}`);
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1); ok(!over, `${w}px: sem rolagem horizontal`); }
await page.setViewportSize({ width: 1280, height: 900 });

console.log('4) Diagnóstico de 5–7 com figuras e voz'); await page.goto(URL + '#/s/session?kind=diagnostic'); await page.waitForTimeout(700); const q = await page.locator('h2').first().innerText(); ok(q.length > 5, `primeira pergunta: "${q}"`); ok((await page.getByRole('button', { name: /^Ouvir/ }).count()) >= 1, 'botão Ouvir também no diagnóstico');
ok(errors.length === 0, `sem erros de console/JS (${errors.length}${errors[0] ? ': ' + errors[0].slice(0, 90) : ''})`);
await browser.close(); console.log(fails ? `\nFALHAS: ${fails}` : '\nAUDIO OK'); process.exit(fails ? 1 : 0);
