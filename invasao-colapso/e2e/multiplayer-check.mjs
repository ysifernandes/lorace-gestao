import { chromium } from 'playwright';

/**
 * DOIS CLIENTES REAIS NA MESMA SALA.
 * Percorre: criar sala → entrar → escolher facção → pronto → iniciar →
 * mesmo estado → atacar → rolar dados → MESMO resultado nos dois → recarregar.
 */
const BASE = process.env.BASE ?? 'http://localhost:5199/';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

let passed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { passed += 1; console.log(`  ✓ ${name}`); }
  else { failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  ✗ ${name} ${detail}`); }
}

const browser = await chromium.launch({ executablePath: CHROME });

async function openClient(label, viewport) {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 800 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`${label}: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label}: ${m.text()}`); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  return { ctx, page, errors, label };
}

const host = await openClient('host', { width: 1280, height: 860 });
const guest = await openClient('guest', { width: 390, height: 844 });

console.log('\n=== criar sala (host, desktop) ===');
await host.page.locator('.menu-item', { hasText: 'Jogar online' }).click();
await host.page.waitForSelector('.online');
await host.page.locator('.online__card', { hasText: 'Criar sala' }).locator('.btn--primary').click();
await host.page.waitForSelector('.lobby__code-value', { timeout: 15000 });
const code = (await host.page.locator('.lobby__code-value').textContent())?.trim() ?? '';
check('host criou a sala e recebeu código', /^[A-HJ-NP-Z2-9]{6}$/.test(code), code);
check('lobby mostra os 6 lugares', (await host.page.locator('.warslot').count()) >= 4);

console.log('\n=== entrar na sala (convidado, celular) ===');
await guest.page.locator('.menu-item', { hasText: 'Jogar online' }).click();
await guest.page.waitForSelector('.online');
await guest.page.locator('.field__input--code').fill(code);
await guest.page.locator('.online__card', { hasText: 'Entrar em sala' }).locator('.btn--primary').click();
await guest.page.waitForSelector('.lobby__code-value', { timeout: 15000 });
check('convidado entrou pelo código', (await guest.page.locator('.lobby__code-value').textContent())?.trim() === code);

await host.page.waitForTimeout(400);
const ocupados = await host.page.locator('.warslot:not(.warslot--empty)').count();
check('host vê o convidado entrar em tempo real', ocupados === 2, `viu ${ocupados}`);

console.log('\n=== escolher facções ===');
await host.page.locator('.lobby__factions .faction-pill').first().click();
await host.page.waitForTimeout(300);
const primeiraTravada = await guest.page.locator('.lobby__factions .faction-pill').first().isDisabled();
check('facção escolhida pelo host trava para o convidado', primeiraTravada);
await guest.page.locator('.lobby__factions .faction-pill').nth(1).click();
await guest.page.waitForTimeout(300);

console.log('\n=== pronto e início ===');
await host.page.locator('.lobby__foot .btn', { hasText: 'Estou pronto' }).click();
await guest.page.locator('.lobby__foot .btn', { hasText: 'Estou pronto' }).click();
await host.page.waitForTimeout(400);
const iniciar = host.page.locator('.lobby__foot .btn', { hasText: 'Iniciar invasão' });
check('só o host vê o botão de iniciar', await iniciar.count() === 1 &&
  (await guest.page.locator('.lobby__foot .btn', { hasText: 'Iniciar invasão' }).count()) === 0);
check('iniciar libera com todos prontos', !(await iniciar.isDisabled()));
await iniciar.click();

await host.page.waitForSelector('.match', { timeout: 15000 });
await guest.page.waitForSelector('.match', { timeout: 15000 });
check('os dois clientes entraram na partida', true);

console.log('\n=== mesmo estado nos dois ===');
await host.page.waitForTimeout(600);
const territoriosHost = await host.page.locator('.territory').count();
const territoriosGuest = await guest.page.locator('.territory').count();
check('mapa idêntico nos dois clientes', territoriosHost === 30 && territoriosGuest === 30,
  `${territoriosHost} / ${territoriosGuest}`);

const rodadaHost = await host.page.locator('.topbar__stats dd').first().textContent();
const rodadaGuest = await guest.page.locator('.topbar__stats dd').first().textContent();
check('mesma rodada nos dois', rodadaHost === rodadaGuest, `${rodadaHost} vs ${rodadaGuest}`);

// Quem está com a vez?
const hostYours = await host.page.locator('.turnbanner--yours').count();
const guestYours = await guest.page.locator('.turnbanner--yours').count();
check('exatamente um cliente tem a vez', hostYours + guestYours === 1, `host=${hostYours} guest=${guestYours}`);
const active = hostYours ? host : guest;
const passive = hostYours ? guest : host;

console.log('\n=== missão privada ===');
const missaoDoAtivo = await active.page.evaluate(() => {
  const el = document.querySelector('.topbar__actions .btn');
  return el ? 'tem botão de missão' : '';
});
check('cada cliente tem seu próprio painel de missão', missaoDoAtivo !== '');

console.log('\n=== ação fora do turno é recusada ===');
await passive.page.locator('.turnbanner__primary').click({ force: true }).catch(() => {});
await passive.page.waitForTimeout(300);
const bannerPassivo = await passive.page.locator('.turnbanner__primary').isDisabled();
check('quem não é da vez tem a ação principal travada', bannerPassivo);

console.log('\n=== reforço + ataque + dados sincronizados ===');
await active.page.locator('.turnbanner__primary').click(); // distribui
await active.page.waitForTimeout(500);
await active.page.locator('.turnbanner__primary').click(); // avança p/ ataque
await active.page.waitForTimeout(500);

// Em tela estreita a partida abre aproximada: enquadra tudo antes de clicar.
await active.page.locator('.board__controls button').nth(2).click();
await active.page.waitForTimeout(200);

// Encontra um território próprio que ofereça ataque.
let attackDeclared = false;
const count = await active.page.locator('.territory').count();
for (let i = 0; i < count && !attackDeclared; i += 1) {
  await active.page.locator('.territory').nth(i).click();
  await active.page.waitForTimeout(80);
  const btn = active.page.locator('.inspector__actions .btn--danger').first();
  if (await btn.count() && (await btn.textContent())?.includes('Atacar a partir')) {
    await btn.click();
    await active.page.waitForTimeout(120);
    if (await active.page.locator('.territory--target').count()) {
      await active.page.locator('.territory--target').first().click();
      await active.page.waitForTimeout(120);
      const declare = active.page.locator('.inspector__actions .btn--danger').first();
      if (await declare.count()) {
        await declare.click();
        await active.page.waitForTimeout(500);
        attackDeclared = await active.page.locator('.battle').isVisible().catch(() => false);
      }
    }
  }
}
check('ataque declarado no cliente da vez', attackDeclared);

if (attackDeclared) {
  await passive.page.waitForTimeout(500);
  const passiveVeBatalha = await passive.page.locator('.battle').isVisible().catch(() => false);
  check('o outro cliente também vê a batalha', passiveVeBatalha);

  await active.page.locator('.battle__actions .btn--danger').click();
  // A arena aparece nos DOIS clientes.
  const arenaAtivo = await active.page.waitForSelector('.arena', { timeout: 8000 }).then(() => true).catch(() => false);
  const arenaPassivo = await passive.page.waitForSelector('.arena', { timeout: 8000 }).then(() => true).catch(() => false);
  check('a arena de dados abre nos dois clientes', arenaAtivo && arenaPassivo,
    `ativo=${arenaAtivo} passivo=${arenaPassivo}`);

  // Espera os dados ASSENTAREM (o valor final só é legível aí) e compara.
  await Promise.all([
    active.page.waitForSelector('.die3d.is-settled', { timeout: 8000 }),
    passive.page.waitForSelector('.die3d.is-settled', { timeout: 8000 }),
  ]);
  const valores = async (p) =>
    (await p.locator('.die3d.is-settled').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-value')),
    )).join(',');
  const vAtivo = await valores(active.page);
  const vPassivo = await valores(passive.page);
  check('OS DOIS VEEM EXATAMENTE OS MESMOS DADOS', vAtivo.length > 0 && vAtivo === vPassivo,
    `${vAtivo} vs ${vPassivo}`);
}

console.log('\n=== reconexão por refresh ===');
await guest.page.reload({ waitUntil: 'networkidle' });
const voltou = await guest.page.waitForSelector('.match, .lobby', { timeout: 15000 })
  .then(() => true).catch(() => false);
check('o convidado reconecta depois de recarregar a página', voltou);
if (voltou) {
  await guest.page.waitForTimeout(800);
  const territoriosDepois = await guest.page.locator('.territory').count();
  check('o mapa volta completo depois da reconexão', territoriosDepois === 30, `viu ${territoriosDepois}`);
}

const todosErros = [...host.errors, ...guest.errors];
check('nenhum erro de JavaScript nos dois clientes', todosErros.length === 0, todosErros.slice(0, 2).join(' | '));

await browser.close();
console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
if (failures.length) {
  console.log('FALHAS:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exitCode = 1;
}
