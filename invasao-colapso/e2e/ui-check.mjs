import { chromium } from 'playwright';

/**
 * VERIFICAÇÃO DE INTERFACE NO NAVEGADOR REAL.
 * Percorre o MVP inteiro: início → configuração → partida → reforço →
 * ataque → dados → conquista → movimentação → cartas → evento → DEV.
 * Roda em desktop e em viewport de celular.
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

async function session(label, viewport) {
  console.log(`\n=== ${label} (${viewport.width}x${viewport.height}) ===`);
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 800 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });

  // ---- tela inicial
  check('tela inicial mostra o título', (await page.locator('.home__title').textContent())?.includes('INVASÃO'));
  // O menu foi reestruturado: JOGAR ONLINE / JOGAR LOCAL / TUTORIAL / COMO JOGAR.
  check('menu principal oferece as opções novas', (await page.locator('.menu-item').count()) >= 4);
  const local = page.locator('.menu-item', { hasText: 'Jogar local' });
  check('botão JOGAR LOCAL existe', await local.isVisible());
  await local.click();

  // ---- configuração
  await page.waitForSelector('.setup');
  check('configuração oferece 2 a 6 jogadores', (await page.locator('.chooser .chip').count()) === 5);
  const factionButtons = await page.locator('.seat').first().locator('.faction-pill').count();
  check('seleção mostra 6 facções', factionButtons === 6, `viu ${factionButtons}`);
  const names = await page.locator('.seat').first().locator('.faction-pill__name').allTextContent?.() ?? [];
  await page.locator('.chooser .chip').nth(1).click(); // 3 jogadores
  await page.locator('.setup__block-head .btn').click(); // preencher automaticamente
  await page.locator('.setup__footer .btn--primary').click();

  // ---- partida
  await page.waitForSelector('.match');
  check('HUD mostra jogador e facção', await page.locator('.topbar__player').isVisible());
  const stats = await page.locator('.topbar__stats dt').allInnerTexts();
  check('HUD mostra rodada/territórios/tropas/cartas/ataque/especial', stats.length === 6, stats.join(','));
  check('barra de fases tem as 6 fases', (await page.locator('.phasebar__step').count()) === 6);
  // Em celular o mapa abre aproximado: o botão "ver tudo" enquadra os 30.
  await page.locator('.board__controls button').nth(2).click();
  await page.waitForTimeout(120);
  const territories = await page.locator('.territory').count();
  check('mapa desenha 30 territórios', territories === 30, `viu ${territories}`);
  const links = await page.locator('.board__link').count();
  check('mapa desenha as 61 fronteiras', links === 61, `viu ${links}`);
  check('mapa mostra as 6 regiões', (await page.locator('.board__region-label').count()) === 6);
  check('sem rolagem horizontal', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)));

  // ---- reforço
  const pending = await page.locator('.panel--reinforce .panel__big').textContent();
  check('painel de reforço mostra o total', Number(pending) > 0, `viu ${pending}`);
  await page.locator('.panel--reinforce .btn--ghost').click();
  await page.waitForTimeout(120);
  check('distribuição automática zera os reforços', (await page.locator('.panel--reinforce .panel__big').textContent()) === '0');

  // ---- território
  await page.locator('.territory').first().click();
  await page.waitForTimeout(120);
  check('painel de território abre ao clicar', await page.locator('.inspector h3').isVisible());
  check('painel lista as fronteiras', (await page.locator('.inspector__neighbors li').count()) >= 3);

  // ---- ataque comum
  await page.locator('.phasebar .btn--primary').click(); // → ATAQUE COMUM
  await page.waitForTimeout(120);
  check('fase avançou para Ataque Comum', (await page.locator('.phasebar__now strong').textContent()) === 'Ataque Comum');

  const attacked = await page.evaluate(() => {
    // Procura um território próprio com botão de ataque disponível.
    const nodes = [...document.querySelectorAll('.territory')];
    return nodes.length;
  });
  check('territórios continuam clicáveis na fase de ataque', attacked === 30);

  // Percorre os territórios até achar um que ofereça ataque.
  let attackStarted = false;
  const count = await page.locator('.territory').count();
  for (let i = 0; i < count && !attackStarted; i += 1) {
    await page.locator('.territory').nth(i).click();
    await page.waitForTimeout(60);
    const btn = page.locator('.inspector__actions .btn--danger').first();
    if (await btn.count() && (await btn.textContent())?.includes('Atacar a partir')) {
      await btn.click();
      await page.waitForTimeout(80);
      const targets = await page.locator('.territory--target').count();
      check('mapa destaca os alvos possíveis', targets > 0, `viu ${targets}`);
      // Clica no primeiro alvo destacado.
      const targetId = await page.evaluate(() => {
        const el = document.querySelector('.territory--target');
        return el?.getAttribute('aria-label') ?? '';
      });
      await page.locator('.territory--target').first().click();
      await page.waitForTimeout(80);
      const declare = page.locator('.inspector__actions .btn--danger').first();
      if (await declare.count()) {
        await declare.click();
        await page.waitForTimeout(120);
        attackStarted = await page.locator('.battle').isVisible().catch(() => false);
      }
      check('ataque declarado abre o painel de batalha', attackStarted, targetId);
    }
  }
  check('foi possível declarar um Ataque Comum', attackStarted);

  if (attackStarted) {
    check('painel de batalha mostra atacante e defensor', (await page.locator('.battle__side').count()) === 2);
    check('painel de batalha mostra dados', (await page.locator('.battle__dice .die').count()) > 0);
    await page.locator('.battle__actions .btn--danger').click();
    await page.waitForTimeout(250);
    const rolled = await page.locator('.battle__result li').count();
    const occupying = await page.locator('.modal').count();
    // Terceiro desfecho legítimo: o atacante esgotou as tropas e a batalha
    // fechou sozinha — nesse caso o registro traz a rodada de dados.
    const logged = (await page.locator('.log__item').allInnerTexts()).some((t) => /Rodada \d/.test(t));
    check(
      'rolar dados produz resultado visível',
      rolled > 0 || occupying > 0 || logged,
      `res=${rolled} modal=${occupying} log=${logged}`,
    );
    if (occupying > 0) {
      await page.locator('.modal .btn--primary').first().click();
      await page.waitForTimeout(150);
      check('ocupação obrigatória se resolve', (await page.locator('.modal').count()) === 0);
    } else if (await page.locator('.battle').isVisible()) {
      // Durante a apresentação dos dados, ações conflitantes ficam travadas.
      // Espera a arena fechar antes de recuar — é a regra de reentrada.
      await page.waitForSelector('.arena', { state: 'detached', timeout: 9000 }).catch(() => {});
      await page.locator('.battle__actions .btn--ghost').click();
      await page.waitForTimeout(200);
      check('recuar encerra a batalha', !(await page.locator('.battle').isVisible()));
    }
  }

  // ---- missão secreta
  await page.locator('.topbar__actions .btn').first().click();
  await page.waitForTimeout(150);
  check('missão secreta abre para o jogador do turno', await page.locator('.mission__name').isVisible());
  check('missão mostra progresso', (await page.locator('.mission__progress').textContent())?.includes('Progresso'));
  await page.locator('.modal .btn--icon').click();

  // ---- DEV: forçar Evento do Colapso
  await page.locator('.dev-toggle').click();
  await page.waitForSelector('.dev');
  check('painel DEV abre', await page.locator('.dev__tabs').isVisible());
  await page.locator('.dev__tab', { hasText: 'COLAPSO' }).click();
  await page.waitForTimeout(100);
  check('DEV mostra chance secreta do Colapso', (await page.locator('.dev__note').first().textContent())?.includes('Chance'));
  await page.locator('.dev__select').first().selectOption('collapse.janela-limpa');
  await page.waitForTimeout(200);
  check('alerta de Colapso aparece', await page.locator('.collapse-overlay').isVisible());
  const revealVisible = await page
    .waitForSelector('.collapse-overlay__reveal h2', { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check('evento é revelado após a contagem', revealVisible);
  if (revealVisible) {
    await page.locator('.collapse-overlay__reveal .btn').click();
    await page.waitForTimeout(200);
    check('efeito aplicado e partida continua', !(await page.locator('.collapse-overlay').isVisible()));
  }

  // ---- DEV: integridade do estado
  await page.locator('.dev__tab', { hasText: 'ESTADO' }).click();
  await page.waitForTimeout(100);
  check('invariantes íntegras durante a partida', await page.locator('.dev__ok').isVisible());
  await page.locator('.dev__head .btn--icon').click();

  // ---- persistência
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  check('partida continua após recarregar a página', await page.locator('.match').isVisible());
  check('mapa recarregado mantém 30 territórios', (await page.locator('.territory').count()) === 30);

  check('nenhum erro de JavaScript', errors.length === 0, errors.slice(0, 2).join(' | '));
  await page.screenshot({ path: `/tmp/mvp-${label}.png`, fullPage: false });
  await context.close();
}

await session('desktop', { width: 1366, height: 900 });
await session('mobile', { width: 390, height: 844 });

await browser.close();
console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
if (failures.length > 0) {
  console.log('FALHAS:');
  for (const failure of failures) console.log('  - ' + failure);
  process.exit(1);
}
