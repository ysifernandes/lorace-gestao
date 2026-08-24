/**
 * Validação da INTERFACE em navegador real (Chromium), desktop e celular.
 * Percorre o jogo como um jogador faria: toque/clique, seleção, Sequestro,
 * ataque, conquista, ocupação, movimentação e Vacina defensiva.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:4173/';
const EXEC = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const SHOTS = process.env.SHOT_DIR ?? '/tmp/shots';

const results = [];
function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS  ' : 'FALHOU'} ${name}${detail ? ` :: ${detail}` : ''}`);
}

const browser = await chromium.launch({ executablePath: EXEC });
const errors = [];

/** Avança fases até `phase`, garantindo que ainda é o turno de `player`. */
async function advanceTo(p, phase, player) {
  for (let i = 0; i < 8; i += 1) {
    const active = await p.locator('.phases__item.is-active').innerText();
    if (active === phase) break;
    await p.getByRole('button', { name: 'Avançar fase' }).click();
    await p.waitForTimeout(70);
  }
  const who = await p.locator('.stat--player .stat__value').innerText();
  if (player && who !== player) throw new Error(`Esperado turno de ${player}, mas é de ${who}.`);
}

/** Passa pela tela "Escolha seu exército" e entra na partida. */
async function enterGame(p, tap = false) {
  const button = p.locator('.select-screen .btn--primary');
  if (await button.count()) {
    if (tap) await button.tap();
    else await button.click();
    await p.waitForTimeout(250);
  }
}

async function troops(p, name) {
  const label = await p.locator(`.territory-node[aria-label^="${name}"]`).getAttribute('aria-label');
  return { label: label ?? '', count: Number((label ?? '').match(/(\d+) soldados/)?.[1] ?? -1) };
}

// ============================================================== DESKTOP ====
const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await desktop.newPage();
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('requestfailed', (r) => errors.push(`requestfailed ${r.url()}`));
page.on('response', (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });

// --- Etapa 4: tela de seleção de exército ---
check('UI-40 tela "Escolha seu exército" abre antes da partida',
  (await page.locator('.select-screen').count()) === 1);
const selectText = await page.locator('.select-screen').innerText();
check('UI-41 mostra Humanos, estilo, habilidades e carta especial',
  /humanos/i.test(selectText) &&
    /adaptação/i.test(selectText) &&
    /sobrevivência/i.test(selectText) &&
    /operação aérea/i.test(selectText) &&
    /sequestro/i.test(selectText));
check('UI-42 outras facções aparecem como "em desenvolvimento"',
  (await page.locator('.roster__item.is-locked').count()) === 4,
  `${await page.locator('.roster__item.is-locked').count()} slots`);
await page.screenshot({ path: `${SHOTS}/00-selecao-faccao.png` });
await enterGame(page);
check('UI-43 selecionar Humanos inicia a partida',
  (await page.locator('.turnbar').count()) === 1);

// --- mapa e leitura ---
const nodes = await page.locator('.territory-node').count();
check('UI-01 mapa carrega com os 12 territórios', nodes === 12, `encontrados: ${nodes}`);

const header = await page.locator('.turnbar__status').innerText();
check(
  'UI-02 turno, jogador e fase visíveis',
  /Turno/.test(header) && /Comando Humano/.test(header) && /Início do Turno/.test(header),
  header.replace(/\n+/g, ' | '),
);

await page.locator('.territory-node[aria-label^="Distrito Central"]').click();
const panelText = await page.locator('.panel--territory').innerText();
check(
  'UI-03 seleção abre o painel do território',
  (await page.locator('.panel--territory .panel__title').innerText()) === 'Distrito Central',
);
check(
  'UI-04 painel mostra controlador, tropas e fronteiras',
  /comando humano/i.test(panelText) &&
    /fronteiras/i.test(panelText) &&
    /tropas/i.test(panelText) &&
    /zona norte/i.test(panelText),
  panelText.replace(/\n+/g, ' | ').slice(0, 120),
);
check(
  'UI-05 Mover/Atacar desabilitados fora da fase correta',
  (await page.locator('.panel--territory .btn--primary').isDisabled()) &&
    (await page.locator('.panel--territory .btn--danger').isDisabled()),
);
await page.screenshot({ path: `${SHOTS}/01-desktop-inicial.png` });

// --- fase de AÇÃO: carta Sequestro ---
// Reforça o território inimigo pelo DEV para poder testar o limite de 7.
await page.locator('.dev-toggle').click();
await page.locator('#dev-territory').selectOption('ruinas-do-leste');
await page.locator('#dev-amount').fill('6');
await page.locator('.dev-panel__grid button', { hasText: '+ tropas' }).click();
await page.waitForTimeout(120);
await page.locator('.dev-panel__header .btn--icon').click();
const reinforcedEnemy = await troops(page, 'Ruínas do Leste');
check('UI-DEV painel DEV adiciona tropas ao território escolhido',
  reinforcedEnemy.count === 9, reinforcedEnemy.label);

await advanceTo(page, 'Ação', 'Comando Humano');
await page.locator('.card').first().click();
const options = await page.locator('.card-options').innerText();
check(
  'UI-06 carta abre "Utilizar como" com os dois usos',
  /SEQUESTRO/i.test(options) && /VACINA/i.test(options),
);
check(
  'UI-07 uso defensivo bloqueado quando não há ataque',
  await page.locator('.card-option').nth(1).isDisabled(),
);
await page.locator('.card-option').first().click();
await page.waitForTimeout(150);
await page.locator('.chooser .chip', { hasText: 'Ruínas do Leste' }).click();
await page.waitForTimeout(80);

// capture targets destacados no mapa
check(
  'UI-08 territórios capturáveis destacados no mapa',
  (await page.locator('.territory-node.is-capture-target').count()) > 0,
);

const soldiers = page.locator('.soldier-grid .soldier');
const availableSoldiers = await soldiers.count();
check('UI-09a território inimigo oferece mais de 7 alvos', availableSoldiers > 7,
  `disponíveis: ${availableSoldiers}`);
for (let i = 0; i < 7; i += 1) await soldiers.nth(i).click();
check(
  'UI-09 seleção do Sequestro trava em 7',
  /7 \/ 7/.test(await page.locator('.modal__counter').innerText()),
  await page.locator('.modal__counter').innerText(),
);
// O 8º alvo fica indisponível: a UI impede passar do limite...
check('UI-09b oitavo soldado fica desabilitado', await soldiers.nth(7).isDisabled());
// ...e um clique forçado não altera a seleção.
await soldiers.nth(7).dispatchEvent('click');
await page.waitForTimeout(80);
check('UI-09c clique forçado no oitavo não altera a seleção',
  /7 \/ 7/.test(await page.locator('.modal__counter').innerText()));
await page.screenshot({ path: `${SHOTS}/02-sequestro.png` });
await page.locator('.modal__footer .btn--primary').click();
await page.waitForTimeout(300);

check('UI-10 palco de animação recebe o evento da carta',
  (await page.locator('.animation-stage').count()) === 1);
if (await page.locator('.animation-stage').count()) {
  await page.locator('.animation-stage .btn').click();
  await page.waitForTimeout(150);
}

check('UI-11 abre a redistribuição das tropas capturadas',
  /redistribuir/i.test(await page.locator('.modal').innerText()));
check('UI-12 confirmação travada até posicionar tudo',
  await page.locator('.modal__footer .btn--primary').isDisabled());
const toPlace = Number((await page.locator('.modal__counter').innerText()).match(/\d+/)?.[0] ?? 0);
check('UI-12b reserva corresponde aos 7 soldados sequestrados', toPlace === 7, `${toPlace}`);
for (let i = 0; i < toPlace; i += 1) {
  await page.locator('.distribution li').first().locator('button').last().click();
}
await page.locator('.modal__footer .btn--primary').click();
await page.waitForTimeout(250);
check('UI-13 redistribuição concluída', (await page.locator('.modal').count()) === 0);
check('UI-14 carta consumida sai da mão', (await page.locator('.card').count()) === 0);
const reinforced = await troops(page, 'Setor Militar');
check('UI-15 tropas capturadas aparecem no território escolhido',
  reinforced.count === 3 + toPlace, reinforced.label);
const drained = await troops(page, 'Ruínas do Leste');
check('UI-15b território inimigo perdeu exatamente os sequestrados',
  drained.count === 9 - toPlace, drained.label);
await page.screenshot({ path: `${SHOTS}/03-redistribuicao.png` });

// --- fase de COMBATE: ataque, conquista, ocupação ---
await advanceTo(page, 'Combate', 'Comando Humano');
await page.locator('.territory-node[aria-label^="Distrito Central"]').click();
await page.locator('.panel--territory .btn--danger').click();
check('UI-16 alvos de ataque destacados no mapa',
  (await page.locator('.territory-node.is-attack-target').count()) > 0);

// território aliado não é alvo válido: clicar nele apenas troca a seleção
await page.locator('.territory-node[aria-label^="Zona Norte"]').click();
check('UI-17 território aliado não abre ataque',
  (await page.locator('.modal').count()) === 0 &&
    (await page.locator('.panel--territory .panel__title').innerText()) === 'Zona Norte');

await page.locator('.territory-node[aria-label^="Distrito Central"]').click();
await page.locator('.panel--territory .btn--danger').click();
await page.locator('.territory-node[aria-label^="Ruínas do Leste"]').click();
await page.locator('.stepper__controls .btn--round').last().click(); // 1 -> 2
await page.locator('.modal__footer .btn--danger').click();
await page.waitForTimeout(200);
check('UI-18 ataque declarado abre o painel de combate',
  /ataque em andamento/i.test(await page.locator('.panel--defense').innerText()));
check('UI-19 território alvo marcado como sob ataque',
  (await page.locator('.territory-node.is-under-attack').count()) === 1);
await page.screenshot({ path: `${SHOTS}/04-ataque.png` });

await page.locator('.panel--defense .btn--danger').click();
await page.waitForTimeout(250);
check('UI-20 conquista abre a ocupação obrigatória',
  /território conquistado/i.test(await page.locator('.modal').innerText()));
check('UI-21 ocupação não pode ser fechada sem ocupar',
  (await page.locator('.modal .btn--icon').count()) === 0);
await page.locator('.modal__footer .btn--primary').click();
await page.waitForTimeout(250);
const conquered = await troops(page, 'Ruínas do Leste');
check('UI-22 conquista muda o controlador e o território recebe tropas',
  /Comando Humano/.test(conquered.label) && conquered.count >= 1, conquered.label);
await page.screenshot({ path: `${SHOTS}/05-conquista.png` });

// --- fase de MOVIMENTAÇÃO ---
await advanceTo(page, 'Movimentação', 'Comando Humano');
const beforeMove = await troops(page, 'Zona Sul');
await page.locator('.territory-node[aria-label^="Distrito Central"]').click();
await page.locator('.panel--territory .btn--primary').click();
check('UI-23 alvos de movimento destacados no mapa',
  (await page.locator('.territory-node.is-move-target').count()) > 0);
await page.locator('.territory-node[aria-label^="Zona Sul"]').click();
const hint = await page.locator('.stepper__hint').innerText();
await page.locator('.modal__footer .btn--primary').click();
await page.waitForTimeout(200);
const afterMove = await troops(page, 'Zona Sul');
check('UI-24 movimento aplicado imediatamente no mapa',
  afterMove.count === beforeMove.count + 1, `${beforeMove.count} → ${afterMove.count} (${hint})`);

// --- Etapa 4: painel da facção e Operação Aérea ---
const factionText = await page.locator('.panel--faction').innerText();
check('UI-47 painel da facção mostra identidade, estilo e habilidades',
  /humanos/i.test(factionText) &&
    /adaptação/i.test(factionText) &&
    /sobrevivência/i.test(factionText) &&
    /operação aérea/i.test(factionText) &&
    /sequestro/i.test(factionText));
check('UI-48 habilidades mostram status e usos restantes',
  /dispon[íi]vel/i.test(factionText) && /uso/i.test(factionText),
  factionText.replace(/\n+/g, ' | ').slice(0, 130));

// Reforça a origem para haver tropa sobrando no transporte.
await page.locator('.dev-toggle').click();
await page.locator('#dev-territory').selectOption('setor-militar');
await page.locator('#dev-amount').fill('4');
await page.locator('.dev-panel__grid button', { hasText: '+ tropas' }).first().click();
await page.waitForTimeout(120);
await page.locator('.dev-panel__header .btn--icon').click();

const airliftOrigin = await troops(page, 'Setor Militar');
const airliftTarget = await troops(page, 'Zona Sul');
await page.locator('.ability .btn--primary', { hasText: 'Operação Aérea' }).click();
await page.waitForTimeout(200);
check('UI-49 Operação Aérea abre a seleção de origem e destino',
  (await page.locator('.modal').innerText()).toLowerCase().includes('opera'));
// Os dois grupos de chips têm nomes repetidos: escopar por grupo.
await page.locator('.chooser').nth(0).locator('.chip', { hasText: 'Setor Militar' }).click();
await page.locator('.chooser').nth(1).locator('.chip', { hasText: 'Zona Sul' }).click();
await page.waitForTimeout(120);
check('UI-50 destino sem fronteira é oferecido e marcado como tal',
  (await page.locator('.chip__tag').count()) > 0);
await page.locator('.stepper__controls .btn--round').last().click(); // 1 -> 2
await page.locator('.modal__footer .btn--primary').click();
await page.waitForTimeout(350);
const airliftOriginAfter = await troops(page, 'Setor Militar');
const airliftTargetAfter = await troops(page, 'Zona Sul');
check('UI-51 Operação Aérea move tropas entre territórios sem fronteira',
  airliftOriginAfter.count === airliftOrigin.count - 2 &&
    airliftTargetAfter.count === airliftTarget.count + 2,
  `${airliftOrigin.count}→${airliftOriginAfter.count} / ${airliftTarget.count}→${airliftTargetAfter.count}`);
const feedText = await page.locator('.ability-feed').innerText().catch(() => '');
check('UI-52 habilidade dá retorno visual ao jogador',
  /opera[çc][ãa]o a[ée]rea/i.test(feedText), feedText.replace(/\n+/g, ' '));
const logText = await page.locator('.log').innerText();
check('UI-53 uso da habilidade fica registrado no log',
  /Setor Militar → Zona Sul/.test(logText));
await page.screenshot({ path: `${SHOTS}/10-operacao-aerea.png` });

// A carga consumida bloqueia um segundo uso no mesmo turno.
const secondUse = await page.locator('.ability .btn--primary', { hasText: 'Operação Aérea' }).isDisabled();
check('UI-54 segundo uso no mesmo turno fica bloqueado', secondUse);

// --- turno do adversário: Vacina defensiva ---
await page.locator('.dev-toggle').click();
await page.locator('.dev-panel__grid button', { hasText: '+ carta Sequestro' }).click();
await page.locator('.dev-panel__header .btn--icon').click();
check('UI-25 painel DEV concede carta ao jogador atual',
  (await page.locator('.card').count()) === 1);

await page.getByRole('button', { name: 'Finalizar turno' }).click();
await page.waitForTimeout(150);
await advanceTo(page, 'Combate', 'Célula Insurgente');
await page.locator('.territory-node[aria-label^="Vale Cinzento"]').click();
await page.locator('.panel--territory .btn--danger').click();
try {
  await page.locator('.territory-node[aria-label^="Zona Norte"]').click({ timeout: 4000 });
} catch (err) {
  const geo = await page.evaluate(() => {
    const g = [...document.querySelectorAll('.territory-node')].find((e) =>
      (e.getAttribute('aria-label') || '').startsWith('Zona Norte'));
    const r = g.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const at = document.elementFromPoint(cx, cy);
    return {
      scrollY: window.scrollY,
      docH: document.documentElement.scrollHeight,
      winH: window.innerHeight,
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      hit: at ? `${at.tagName}.${at.className.baseVal ?? at.className}` : null,
    };
  });
  console.log('DEBUG geometria:', JSON.stringify(geo));
  await page.screenshot({ path: `${SHOTS}/debug-falha.png`, fullPage: true });
  throw err;
}
await page.locator('.stepper__controls .btn--round').last().click();
await page.locator('.modal__footer .btn--danger').click();
await page.waitForTimeout(200);
check('UI-26 defensor recebe a opção de Vacina fora do seu turno',
  (await page.locator('.btn--defense').count()) === 1);

const attackerBefore = await troops(page, 'Vale Cinzento');
await page.locator('.btn--defense').click();
await page.waitForTimeout(350);
const stage = await page.locator('.animation-stage').innerText().catch(() => '');
check('UI-27 Vacina rola o dado e mostra o resultado', /🎲\s*[1-6]/.test(stage),
  stage.replace(/\n+/g, ' ').slice(0, 80));
if (await page.locator('.animation-stage').count()) await page.locator('.animation-stage .btn').click();
await page.waitForTimeout(250);
const attackerAfter = await troops(page, 'Vale Cinzento');
check('UI-28 mapa atualiza sozinho após a Vacina',
  attackerAfter.count < attackerBefore.count,
  `${attackerBefore.count} → ${attackerAfter.count}`);
check('UI-29 carta defensiva consumida', (await page.locator('.card').count()) === 0);
await page.screenshot({ path: `${SHOTS}/06-vacina.png` });

// --- Etapa 4: Sobrevivência ponta a ponta ---
// A passiva é dos Humanos: garantir que a vez é deles antes de forçar.
for (let i = 0; i < 4; i += 1) {
  const who = await page.locator('.stat--player .stat__value').innerText();
  if (who === 'Comando Humano') break;
  await page.getByRole('button', { name: 'Finalizar turno' }).click();
  await page.waitForTimeout(150);
}
check('UI-58a a vez é do Comando Humano antes de testar a passiva',
  (await page.locator('.stat--player .stat__value').innerText()) === 'Comando Humano');
await page.locator('.dev-toggle').click();
await page.locator('.dev-panel__grid button', { hasText: 'Forçar Sobrevivência' }).click();
await page.waitForTimeout(500);
if (await page.locator('.dev-panel').count()) {
  await page.locator('.dev-panel__header .btn--icon').click();
}
const survivalFeed = await page.locator('.ability-feed').innerText().catch(() => '');
check('UI-58 Sobrevivência ativa sozinha no início do turno',
  /sobreviv[êe]ncia ativada/i.test(survivalFeed), survivalFeed.replace(/\n+/g, ' '));
check('UI-59 o retorno visual informa o reforço concedido',
  /\+1 REFOR/i.test(survivalFeed), survivalFeed.replace(/\n+/g, ' '));
const survivalLog = await page.locator('.log').innerText();
check('UI-60 a ativação aparece no registro da partida',
  /sobreviv[êe]ncia/i.test(survivalLog));
await page.screenshot({ path: `${SHOTS}/12-sobrevivencia.png` });

// --- zoom, pan e reset da visualização ---
const t0 = await page.locator('.map__canvas').evaluate((el) => el.style.transform);
await page.locator('.map__controls .btn').first().click();
await page.locator('.map__controls .btn').first().click();
const t1 = await page.locator('.map__canvas').evaluate((el) => el.style.transform);
await page.locator('.map__controls .btn').last().click();
const t2 = await page.locator('.map__canvas').evaluate((el) => el.style.transform);
check('UI-30 zoom altera a visualização e o reset a restaura',
  t1 !== t0 && t2 === t0, `${t0} / ${t1} / ${t2}`);

// --- persistência ---
const logBefore = await page.locator('.log__item').first().innerText();
await page.reload({ waitUntil: 'networkidle' });
await enterGame(page);
const logAfter = await page.locator('.log__item').first().innerText();
check('UI-31 partida persiste ao recarregar a página', logBefore === logAfter, logAfter);

// --- reset ---
page.once('dialog', (d) => d.accept());
await page.locator('.dev-toggle').click();
await page.locator('.dev-panel__reset').click();
await page.waitForTimeout(350);
check('UI-44 reset devolve o jogador à seleção de exército',
  (await page.locator('.select-screen').count()) === 1);
await enterGame(page);
const resetHeader = await page.locator('.turnbar__status').innerText();
const resetTroops = await troops(page, 'Distrito Central');
check('UI-32 reset devolve a partida ao estado inicial',
  /turno\s*1/i.test(resetHeader) && resetTroops.count === 3,
  `${resetTroops.label} | ${resetHeader.replace(/\n+/g, ' ')}`);

// =============================================================== MOBILE ====
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});
const mp = await mobile.newPage();
mp.on('pageerror', (e) => errors.push('mobile: ' + String(e)));
await mp.goto(BASE, { waitUntil: 'networkidle' });
await mp.evaluate(() => localStorage.clear());
await mp.reload({ waitUntil: 'networkidle' });

const selectOverflow = await mp.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
check('UI-45 tela de seleção cabe na largura do celular', selectOverflow <= 1,
  `overflow: ${selectOverflow}px`);
await mp.screenshot({ path: `${SHOTS}/09-mobile-selecao.png`, fullPage: true });
await enterGame(mp, true);
check('UI-46 seleção de facção funciona por toque',
  (await mp.locator('.turnbar').count()) === 1);

const overflow = await mp.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
check('UI-33 sem rolagem horizontal no celular', overflow <= 1, `overflow: ${overflow}px`);

await mp.locator('.territory-node[aria-label^="Distrito Central"]').tap();
check('UI-34 toque seleciona o território',
  (await mp.locator('.panel--territory').count()) === 1);

const small = await mp.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('button')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.height < 36 || r.width < 30) out.push(`${el.className}:${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return out;
});
check('UI-35 botões com alvo de toque adequado (>=36px)', small.length === 0, small.join(', '));

// Fase de AÇÃO vem antes de MOVIMENTAÇÃO: a carta é testada primeiro.
async function mobileAdvanceTo(phase) {
  for (let i = 0; i < 8; i += 1) {
    if ((await mp.locator('.phases__item.is-active').innerText()) === phase) return;
    await mp.getByRole('button', { name: 'Avançar fase' }).tap();
    await mp.waitForTimeout(70);
  }
  throw new Error(`não chegou à fase ${phase}`);
}

await mobileAdvanceTo('Ação');
await mp.locator('.card').first().tap();
check('UI-36 carta abre por toque no celular',
  (await mp.locator('.card-options').count()) === 1);
await mp.screenshot({ path: `${SHOTS}/08-mobile-carta.png` });
const modalFits = await mp.evaluate(() => {
  const m = document.querySelector('.modal');
  const r = m.getBoundingClientRect();
  return r.width <= window.innerWidth + 1 && r.height <= window.innerHeight + 1;
});
check('UI-37 modal cabe na tela do celular', modalFits);
await mp.locator('.modal .btn--icon').tap();
await mp.waitForTimeout(120);

await mobileAdvanceTo('Movimentação');
await mp.locator('.territory-node[aria-label^="Distrito Central"]').tap();
await mp.locator('.panel--territory .btn--primary').tap();
await mp.locator('.territory-node[aria-label^="Zona Norte"]').tap();
await mp.locator('.modal__footer .btn--primary').tap();
await mp.waitForTimeout(250);
const mobileMoved = await troops(mp, 'Zona Norte');
check('UI-38 movimentação completa apenas por toque', mobileMoved.count === 4, mobileMoved.label);
await mp.screenshot({ path: `${SHOTS}/07-mobile.png`, fullPage: true });

await mp.locator('.territory-node[aria-label^="Zona Sul"]').tap();
check('UI-38b seleção por toque continua funcionando após o pan',
  (await mp.locator('.panel--territory .panel__title').innerText()) === 'Zona Sul');

// --- Etapa 4 no celular ---
const mobileFaction = await mp.locator('.panel--faction').innerText();
check('UI-55 painel de habilidades funciona no celular',
  /sobreviv[êe]ncia/i.test(mobileFaction) && /opera[çc][ãa]o a[ée]rea/i.test(mobileFaction));
const mobileTouchTargets = await mp.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('.panel--faction button')) {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.height < 36) out.push(Math.round(r.height));
  }
  return out;
});
check('UI-56 botões de habilidade têm alvo de toque adequado',
  mobileTouchTargets.length === 0, mobileTouchTargets.join(','));

await mp.locator('.dev-toggle').tap();
await mp.locator('#dev-territory').selectOption('setor-militar');
await mp.locator('#dev-amount').fill('4');
await mp.locator('.dev-panel__grid button', { hasText: '+ tropas' }).first().tap();
await mp.waitForTimeout(120);
await mp.locator('.dev-panel__header .btn--icon').tap();

const mobileOrigin = await troops(mp, 'Setor Militar');
await mp.locator('.ability .btn--primary', { hasText: 'Operação Aérea' }).tap();
await mp.waitForTimeout(200);
await mp.locator('.chooser').nth(0).locator('.chip', { hasText: 'Setor Militar' }).tap();
await mp.locator('.chooser').nth(1).locator('.chip', { hasText: 'Zona Sul' }).tap();
await mp.waitForTimeout(120);
await mp.locator('.modal__footer .btn--primary').tap();
await mp.waitForTimeout(350);
const mobileOriginAfter = await troops(mp, 'Setor Militar');
check('UI-57 Operação Aérea funciona apenas por toque',
  mobileOriginAfter.count === mobileOrigin.count - 1,
  `${mobileOrigin.count} → ${mobileOriginAfter.count}`);
await mp.screenshot({ path: `${SHOTS}/11-mobile-habilidades.png`, fullPage: true });

check('UI-39 nenhum erro de JavaScript no percurso', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();

const failed = results.filter((r) => !r.passed);
console.log(`\n=== ${results.length - failed.length}/${results.length} verificações de UI passaram ===`);
if (failed.length) {
  console.log('FALHAS:');
  for (const f of failed) console.log(` - ${f.name} :: ${f.detail}`);
  process.exit(1);
}
