// Teste dinâmico de XSS: enche TODOS os textos do estado do app com cargas maliciosas,
// percorre todas as páginas e abre janelas, e procura elementos/atributos injetados.
// Uso: node security-tests/xss_dom.js   (precisa de playwright; roda em file://, sem rede e sem login)
const { chromium, devices } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.resolve(__dirname, '..', 'planner.html');
const PAY = `"><img src=x data-xss onerror="window.__xss=(window.__xss||0)+1">' data-xss2 autofocus onfocus="window.__xss=(window.__xss||0)+1" x='`;
const SKIP_SRC = '(^id$|Id$|^ids$|date|time|^due$|^end$|^start$|^format$|^status$|^platform$|^type$|^kind$|^approval$|^repeat|^priority$|^color$|^tz$|^v$|^t$|^key$|Tab$|View$|^tipo$|^cur$|^tab|^mode|^palette|^created|^updated|^z$|^x$|^y$|^w$|^h$)';

(async () => {
  const b = await chromium.launch(); const errs = [];
  let bad = 0, visited = 0, clicks = 0;
  for (const [name, opts] of [['desk', { viewport: { width: 1400, height: 950 } }], ['mob', devices['iPhone 13']]]) {
    const ctx = await b.newContext(opts); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    p.on('dialog', (d) => d.dismiss().catch(() => {}));
    await p.goto(FILE); await p.waitForTimeout(500); await p.goto('about:blank'); await p.goto(FILE); await p.waitForTimeout(400);
    // o app regrava o estado ao sair da página, então a carga é aplicada por um script de início, antes do app abrir
    await ctx.addInitScript(({ PAY, SKIP_SRC }) => {
      try {
        if (!localStorage.lorace_planner_v1 || sessionStorage.__mut) return; sessionStorage.__mut = '1';
        const S = JSON.parse(localStorage.lorace_planner_v1); const SKIP = new RegExp(SKIP_SRC, 'i');
        // plano do assistente (texto vindo da IA) e plano do mês, para também testar o que a IA devolve
        const X = 'x'.repeat(3);
        S.biz.assist = { formats: [{ id: 'f1', name: X, desc: X }], brands: [{ id: 'b1', name: X, desc: X }], sel: { format: '', brand: '', tipo: 'reels' }, cur: 'r1', plans: [{ id: 'r1', at: Date.now(), relato: X, plan: { titulo: X, formato_video: 'reels', gancho: X, ideia_central: X, sobre_o_formato: X, cenas: [{ o_que_gravar: X, enquadramento: X, fala: X, texto_na_tela: X, duracao_seg: 4, dica: X }], takes_de_apoio: [X], preparar: [X], legenda: X, licao: X, perguntas: [X] } }] };
        S.ui.contTab = 'assist';
        if (S.biz.posts[0]) S.biz.posts[0].plan = { receita: X, por_que: X, inspirado_em: X };
        const walk = (o) => { for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'string') { if (!SKIP.test(k) && v.length > 1) o[k] = PAY; } else if (v && typeof v === 'object') walk(v); } };
        walk(S); localStorage.lorace_planner_v1 = JSON.stringify(S);
      } catch (e) {}
    }, { PAY, SKIP_SRC });
    await p.goto(FILE); await p.waitForTimeout(800);
    console.log(name,'estado:', await p.evaluate(() => { const S = JSON.parse(localStorage.lorace_planner_v1); return S.ui.contTab + ' | cur=' + (S.biz.assist && S.biz.assist.cur) + ' | plans=' + (S.biz.assist && S.biz.assist.plans.length); }));
    const planted = await p.evaluate(() => document.body.innerText.includes('<img src=x data-xss'));
    console.log(name, 'carga chegou na tela como texto (controle):', planted);
    const pages = await p.$$eval('[data-page]', (e) => [...new Set(e.map((x) => x.dataset.page))]);
    const found = async (where) => {
      const n = await p.evaluate(() => document.querySelectorAll('[data-xss],[data-xss2]').length + (window.__xss || 0));
      if (n) { bad++; console.log(`  FALHA ${name} injecao em ${where}: ${n}`); }
      return n;
    };
    await p.evaluate(() => { location.hash = '#conteudo'; }); await p.waitForTimeout(700); await found('conteudo (aba assistente)');
    console.log(name, 'controle: cenas do assistente na tela =', await p.$$eval('.as-scene', (e) => e.length));
    for (const pg of pages) {
      await p.evaluate((x) => { location.hash = '#' + x; }, pg); await p.waitForTimeout(350); visited++;
      await found('pagina ' + pg);
      const sel = `#pg-${pg} button, #pg-${pg} [data-post], #pg-${pg} [data-open], #pg-${pg} .card[tabindex]`;
      const total = await p.$$eval(sel, (e) => e.length).catch(() => 0);
      for (let i = 0; i < Math.min(total, 45); i++) {
        try {
          const h = (await p.$$(sel))[i];
          if (!h || !(await h.isVisible())) continue;
          await h.click({ timeout: 800, force: true }); clicks++; await p.waitForTimeout(120);
          await found(`${pg} (clique ${i})`);
          await p.keyboard.press('Escape');
          await p.evaluate(() => { document.querySelectorAll('dialog[open]').forEach((d) => d.close()); });
          if (!(await p.evaluate((x) => location.hash === '#' + x, pg))) await p.evaluate((x) => { location.hash = '#' + x; }, pg);
        } catch (e) { /* elemento sumiu: segue */ }
      }
    }
    await ctx.close();
  }
  console.log(`paginas visitadas: ${visited} | cliques: ${clicks} | injecoes encontradas: ${bad}`);
  console.log('ERROS DE PAGINA:', errs.length ? errs.slice(0, 5) : 'nenhum');
  await b.close(); process.exit(bad ? 1 : 0);
})();
