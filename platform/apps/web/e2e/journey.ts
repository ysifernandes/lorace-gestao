// E2E em navegador real (Playwright/Chromium) sobre o build web. Aluno SIMULADO responde pela interface; asserções verificam a jornada ponta a ponta.
// Uso: pnpm web:build && (cd apps/web && npx vite preview --port 4173 &) && pnpm e2e   — salva capturas em $SHOTS (padrão /tmp/shots)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { buildItemBank, type Item } from '@edu/content-math';
const { chromium } = createRequire(import.meta.url)('playwright');
const URL = process.env.URL ?? 'http://127.0.0.1:4173/'; const SHOTS = process.env.SHOTS ?? '/tmp/shots'; mkdirSync(SHOTS, { recursive: true });
const bank = buildItemBank(); let failures = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? '  ✔' : '  ✘'} ${m}`); if (!c) failures++; };
process.on('unhandledRejection', (e) => { console.log('UNHANDLED', e); process.exit(2); });
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 }); const page = await ctx.newPage(); page.setDefaultTimeout(5000);
page.on('pageerror', (e: Error) => { console.log('PAGEERROR', e.message); failures++; });
const shot = (n: string) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const txt = async () => (await page.locator('body').innerText());
async function loginAs(label: string) { await page.goto(URL + '#/login'); await page.getByRole('button', { name: label }).click(); await page.waitForTimeout(700); }
async function logout() { await page.getByRole('button', { name: 'Sair' }).first().click(); await page.waitForTimeout(200); }

type Slips = Record<string, string>;
async function findItem(): Promise<Item> {
  const statement = (await page.locator('h2').first().innerText()).trim(); const cf = page.locator('div.card.flat'); const ctxT = (await cf.count()) ? await cf.first().innerText() : ''; const ctxClean = ctxT.startsWith('📖') ? ctxT.replace('📖', '').trim() : '';
  const opts = (await page.locator('[role=radio]').allInnerTexts()).map((t) => t.replace(/^[A-D]\s*/, '').trim());
  const c = bank.filter((i) => i.statement === statement && (i.context ?? '') === ctxClean && (!('options' in i) || (opts.length === i.options.length && i.options.every((o) => opts.includes(o.text)))));
  if (c.length !== 1) throw new Error(`item ambíguo/não encontrado: "${statement}" (${c.length})`); return c[0]!;
}
async function answerCurrent(slips: Slips) {
  const it = await findItem(); const tag = slips[it.skillId]; if (process.env.DEBUG_E2E) console.log('     kind', it.kind, it.id);
  switch (it.kind) {
    case 'multiple_choice': case 'word_problem': case 'reasoning': { const o = (tag && it.options.find((x) => x.misconception === tag)) || it.options.find((x) => x.id === it.correct)!; await page.locator('[role=radio]', { hasText: o.text }).first().click(); break; }
    case 'fill_in': await page.locator('#fi').fill(tag ? (it.wrongPatterns?.find((w) => w.misconception === tag)?.answer ?? '0') : it.accepted[0]!); break;
    case 'fraction_visual': for (let i = 0; i < (tag ? (it.wrongPatterns?.[0]?.shaded ?? 1) : it.targetNum); i++) await page.getByLabel(`Parte ${i + 1}`).click(); break;
    case 'simulation': await page.locator('#sm').fill(String(tag ? 0 : it.targetNum)); break;
    case 'matching': { for (const [l, r] of it.pairs) { await page.locator('.opt', { hasText: it.left.find((x) => x.id === l)!.label }).first().click(); await page.locator('.opt', { hasText: it.right.find((x) => x.id === r)!.label }).first().click(); } break; }
    case 'drag_drop': { for (const [t, z] of Object.entries(it.solution)) { await page.locator('.chip', { hasText: new RegExp(`^${it.tokens.find((x) => x.id === t)!.label}$`) }).first().click(); await page.locator('.zone', { hasText: it.zones.find((x) => x.id === z)!.label }).first().click(); } break; }
    case 'ordering': { const want = it.correctOrder.map((id) => it.entries.find((e) => e.id === id)!.label); for (let pass = 0; pass < 12; pass++) { const cur = (await page.locator('ol .chip').allInnerTexts()).map((t) => t.replace(/^\d+\.\s*/, '')); const i = want.findIndex((w, k) => cur[k] !== w); if (i < 0) break; const from = cur.indexOf(want[i]!); await page.getByLabel(`Mover ${want[i]} para cima`).click(); void from; } break; }
  }
  await page.getByRole('button', { name: /^(Responder|Pronto!)$/ }).click(); await page.getByRole('button', { name: 'Próxima' }).click(); await page.waitForTimeout(60);
}
async function runSessionSafe(slips: Slips, max = 40) { const wd = setTimeout(() => { console.log('WATCHDOG: sessão travada; abortando'); process.exit(3); }, 240_000); try { return await runSession0(slips, max); } finally { clearTimeout(wd); } }
async function runSessionSafeOld(slips: Slips, max = 40) { try { return await runSession0(slips, max); } catch (e) { console.log('FALHA NA SESSÃO:', String(e).split('\n')[0]); console.log('opts:', (await page.locator('.opt,.chip,.zone').allInnerTexts()).join(' | ')); await shot('erro'); throw e; } }
async function runSession0(slips: Slips, max = 40) { for (let i = 0; i < max; i++) { if (process.env.DEBUG_E2E) console.log('   step', i, page.url().split('#')[1], ''); if (await page.locator('h1', { hasText: /concluíd/ }).count()) return i; await answerCurrent(slips); } throw new Error('sessão não terminou'); }

console.log('1) Login e demonstração'); await page.goto(URL); await shot('01-login'); ok((await txt()).includes('nome provisório'), 'marca provisória configurável exibida');
console.log('2) Luna (8–10): diagnóstico adaptativo'); await loginAs('Aluna Luna (9 anos)'); await shot('02-aluno-home-novo');
ok((await txt()).includes('Tutor virtual') && (await txt()).includes('Nada aqui é simulado'), 'tutor de IA declarado indisponível (não simulado)');
await page.getByRole('button', { name: 'Vamos!' }).click(); await page.waitForTimeout(300); await shot('03-atividade');
const slipLuna: Slips = { 'frac.add.diff': 'add_num_and_den' }; const n = await runSessionSafe(slipLuna); ok(n >= 8 && n <= 24, `diagnóstico adaptativo com ${n} atividades (<= 24)`); await shot('04-diagnostico-concluido');
console.log('3) Explicação personalizada'); await page.getByRole('button', { name: /Ver explicação/ }).click(); await page.waitForTimeout(300); const ex = await txt(); ok(/denominadores/i.test(ex) && /rascunho/.test(ex), 'explicação do equívoco, sinalizada como rascunho'); await shot('05-explicacao');
console.log('4) Prática focada, reavaliação e evolução'); await page.getByRole('button', { name: /vamos praticar/ }).click(); await page.waitForTimeout(300); await runSessionSafe({}); await shot('06-pratica-concluida');
await page.getByRole('button', { name: 'Início' }).click(); await page.waitForTimeout(300); await page.getByRole('button', { name: 'Vamos!' }).click(); await page.waitForTimeout(300); await runSessionSafe({}); await shot('07-reavaliacao');
await page.goto(URL + '#/s/progress'); await page.waitForTimeout(400); ok(await page.locator('svg[aria-label^="Gráfico de evolução"]').count() > 0, 'gráfico de evolução exibido'); await shot('08-evolucao');
await page.goto(URL + '#/s'); await page.waitForTimeout(300); await shot('09-aluno-home-depois'); await logout();
console.log('5) Outras faixas etárias'); const slipDavi: Slips = { 'frac.compare': 'bigger_denominator_bigger' };
for (const [label, slips, key] of [['Aluno Davi (13)', slipDavi, '10-desafiadores'], ['Aluno Caio (6)', {}, '11-exploradores'], ['Aluna Bia (16)', { 'sub.borrow': 'smaller_from_larger' }, '12-estrategistas']] as const) {
  await loginAs(label); await page.getByRole('button', { name: /Vamos!|Começar/ }).click(); await page.waitForTimeout(250); await runSessionSafe(slips); await page.goto(URL + '#/s'); await page.waitForTimeout(300); await shot(key); await logout(); }
console.log('6) Responsável'); await loginAs('Responsável'); await page.waitForTimeout(300); await shot('13-responsavel');
for (const name of ['Davi', 'Bia', 'Caio']) { await page.locator('.card', { hasText: name }).getByRole('button', { name: 'Abrir' }).first().click(); await page.waitForTimeout(300); await page.getByLabel('Compartilhar progresso com a escola').check().catch(async () => { await page.locator('input[type=checkbox]').first().check(); }); await page.goto(URL + '#/p'); await page.waitForTimeout(200); }
await page.locator('.card', { hasText: 'Davi' }).getByRole('button', { name: 'Abrir' }).first().click(); await page.waitForTimeout(400); const pr = await txt();
ok(/denominador maior = fração maior/.test(pr), 'responsável vê a causa específica (Davi)'); ok(/Errou:/.test(pr) && /confiança/.test(pr), 'responsável vê evidências e grau de confiança'); await shot('14-responsavel-resumo'); await page.goto(URL + '#/p'); await page.locator('.card', { hasText: 'Luna' }).getByRole('button', { name: 'Abrir' }).first().click(); await page.waitForTimeout(400); ok(await page.locator('svg[aria-label^="Gráfico de evolução"]').count() > 0 && /Evolução após novas atividades/.test(await txt()), 'responsável vê a evolução da Luna após prática e reavaliação'); await shot('14b-responsavel-luna-evolucao');
await page.getByRole('tab', { name: 'Aparelhos e apps' }).click(); await page.getByRole('button', { name: 'Gerar código (10 min)' }).click(); const code = (await page.locator('b[style*="letter-spacing"]').innerText()).trim();
await page.getByLabel('Código').fill(code); await page.getByRole('button', { name: 'Vincular' }).click(); await page.waitForTimeout(300);
await page.getByRole('row', { name: /YouTube/ }).getByRole('button', { name: 'Bloquear', exact: true }).click(); await page.waitForTimeout(200); ok((await txt()).includes('Comando pendente') || (await txt()).includes('Dispositivo offline'), 'comando criado com estado real (ainda não aplicado)'); await shot('15-aparelhos-pendente');
await page.getByRole('button', { name: /Sincronizar agora/ }).click(); await page.waitForTimeout(200); ok((await txt()).includes('Bloqueio aplicado'), 'após o aparelho simulado confirmar: Bloqueio aplicado'); ok(await page.getByRole('row', { name: /Telefone/ }).getByText('Não pode ser bloqueado').count() === 1, 'app essencial não pode ser bloqueado');
await page.getByLabel('permissão de acessibilidade').uncheck(); await page.getByRole('row', { name: /Navegador/ }).getByRole('button', { name: 'Bloquear', exact: true }).click(); await page.getByRole('button', { name: /Sincronizar agora/ }).click(); await page.waitForTimeout(200); ok((await txt()).includes('Permissão indisponível'), 'perda de permissão vira estado Permissão indisponível'); await shot('16-aparelhos-estados');
const lunaCode = await (async () => { await page.goto(URL + '#/p'); await page.locator('.card', { hasText: 'Luna' }).getByRole('button', { name: 'Abrir' }).first().click(); await page.waitForTimeout(300); return null; })(); void lunaCode;
const codes: Record<string, string> = {}; for (const name of ['Bia', 'Caio']) { await page.goto(URL + '#/p'); await page.locator('.card', { hasText: name }).getByRole('button', { name: 'Abrir' }).first().click(); await page.waitForTimeout(300); codes[name] = (await page.locator('b', { hasText: /^[A-Z0-9]{6}$/ }).first().innerText()).trim(); } await logout();
console.log('7) Gestora, professora'); await loginAs('Gestora'); for (const name of ['Bia', 'Caio']) { await page.getByLabel('Turma', { exact: true }).selectOption({ index: 1 }); await page.getByLabel('Código de vínculo').fill(codes[name]!); await page.getByRole('button', { name: 'Matricular' }).click(); await page.waitForTimeout(150); }
await page.waitForTimeout(400); await shot('17-gestora'); ok((await txt()).includes('Indicadores pedagógicos'), 'gestora vê indicadores agregados'); await logout();
await loginAs('Professora'); await page.waitForTimeout(400); const tt = await txt(); ok(['Luna', 'Davi', 'Bia', 'Caio'].every((n) => tt.includes(n)), 'professora vê somente alunos matriculados com consentimento'); await shot('18-professora-mapa');
await page.getByRole('link', { name: 'Davi' }).first().click(); await page.waitForTimeout(400); ok(/Plano de reforço/.test(await txt()) && /denominador maior = fração maior/.test(await txt()), 'professora vê diagnóstico individual com causas'); await page.getByRole('button', { name: 'Aprovar plano' }).click(); await shot('19-professora-aluno'); await logout();
console.log('8) Revogação de consentimento'); await loginAs('Responsável'); await page.locator('.card', { hasText: 'Luna' }).getByRole('button', { name: 'Abrir' }).first().click(); await page.waitForTimeout(300); await page.locator('input[type=checkbox]').first().uncheck(); await logout();
await loginAs('Professora'); await page.waitForTimeout(300); ok(!(await page.locator('table').first().innerText()).includes('Luna'), 'após revogar, a professora deixa de ver a Luna'); await logout();
console.log('9) Administração e revisão (quatro olhos)'); await loginAs('Administrador'); await page.waitForTimeout(300); await shot('20-admin-conteudo');
await page.getByRole('button', { name: 'Abrir' }).first().click(); await page.getByRole('button', { name: 'Salvar edição' }).click(); await page.getByRole('button', { name: 'Enviar para revisão' }).click(); await page.getByLabel('Nota da revisão').fill('ok'); await page.getByRole('button', { name: 'Aprovar' }).click(); await page.waitForTimeout(200);
ok((await txt()).includes('o autor da última edição não pode aprovar'), 'autor não aprova a própria edição'); await page.keyboard.press('Escape'); await logout();
await loginAs('Revisor'); await page.waitForTimeout(300); await page.getByRole('button', { name: 'Abrir' }).first().click(); await page.getByLabel('Nota da revisão').fill('conferido'); await page.getByRole('button', { name: 'Aprovar' }).click(); await page.waitForTimeout(300); ok(/aprovado/i.test(await txt()), 'revisor aprova'); await page.keyboard.press('Escape');
await page.getByRole('link', { name: 'Planos e cobrança' }).click(); await page.waitForTimeout(300); ok((await txt()).includes('preço não definido'), 'preços não definidos no código'); await shot('21-admin-planos'); await page.getByRole('link', { name: 'Sistema' }).click(); await page.waitForTimeout(300); await shot('22-admin-sistema');
console.log('10) Permissões de rota'); await page.goto(URL + '#/p'); await page.waitForTimeout(300); ok(page.url().includes('#/a'), 'admin é redirecionado para fora da área da família'); await logout();
console.log('11) Mobile (aluno)'); const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const mp = await m.newPage(); await mp.goto(URL + '#/login'); await mp.screenshot({ path: `${SHOTS}/23-mobile-login.png` });
await browser.close(); console.log(failures ? `\nFALHAS: ${failures}` : '\nE2E OK'); process.exit(failures ? 1 : 0);
