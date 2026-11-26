// Controle positivo: confirma que as cargas realmente chegam à tela (como texto) e que o detector acharia uma injeção real.
const { chromium } = require('playwright'); const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'planner.html');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1400, height: 950 } })).newPage();
  await p.goto(FILE); await p.waitForTimeout(500); await p.goto('about:blank'); await p.goto(FILE); await p.waitForTimeout(400);
  await p.context().addInitScript(() => { try { if (sessionStorage.__m) return; sessionStorage.__m = '1'; const S = JSON.parse(localStorage.lorace_planner_v1); S.tasks.items[0].text = '<img src=x data-xss>TAREFAXSS'; localStorage.lorace_planner_v1 = JSON.stringify(S); } catch (e) {} });
  await p.goto(FILE); await p.waitForTimeout(800);
  let txt = ''; for (const pg of ['hoje','tarefas','conteudo']) { await p.evaluate((x) => { location.hash = '#' + x; }, pg); await p.waitForTimeout(400); txt += await p.evaluate(() => document.body.innerText); }
  console.log('carga aparece como TEXTO na tela:', txt.includes('<img src=x data-xss>'), '| elementos injetados:', await p.$$eval('[data-xss]', (e) => e.length));
  await p.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<img src=x data-xss>'); });
  console.log('detector acha uma injeção proposital:', (await p.$$eval('[data-xss]', (e) => e.length)) === 1);
  await b.close();
})();
