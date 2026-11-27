const { chromium, devices } = require('playwright');
const SP = require('os').tmpdir() + '/';
const FILE = 'file://' + require('path').resolve(__dirname, '..', 'planner.html');
let fail = 0; const t = (n, ok, x = '') => { console.log((ok ? 'OK    ' : 'FALHA ') + n + (x ? '  [' + x + ']' : '')); if (!ok) fail++; };
// reconhecimento de voz e voz de resposta FALSOS: o teste controla o que "foi falado" e registra o que o app "leu em voz alta"
const STUBS = () => {
  window.__rec = { starts: 0, stops: 0, aborts: 0, last: null }; window.__said = []; window.__cancels = 0;
  window.SpeechRecognition = window.webkitSpeechRecognition = class {
    constructor() { this.onresult = this.onend = this.onerror = null; window.__rec.last = this; }
    start() { window.__rec.starts++; this.active = true; }
    stop() { window.__rec.stops++; this.active = false; setTimeout(() => this.onend && this.onend(), 20); }
    abort() { window.__rec.aborts++; this.active = false; }
    // simula a pessoa falando: resultados parciais, depois final; o app é quem encerra (silêncio)
    say(words, final = true) { const mk = (txt, fin) => ({ length: 1, 0: { transcript: txt }, isFinal: fin }); this.onresult && this.onresult({ results: [mk(words, final)] }); }
    err(code) { this.onerror && this.onerror({ error: code }); this.onend && this.onend(); }
  };
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { speak(u) { window.__said.push(u.text); window.__last = u; if (u.text.trim()) setTimeout(() => u.onend && u.onend(), 30); }, cancel() { window.__cancels++; }, getVoices() { return [{ lang: 'pt-BR', name: 'Luciana' }]; } } });
};
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [name, opts] of [['mob', devices['iPhone 13']], ['desk', { viewport: { width: 1280, height: 900 } }]]) {
    console.log('=== ' + name);
    const ctx = await b.newContext(opts);
    let p = await ctx.newPage(); await p.clock.install({ time: new Date(2026, 10, 27, 10, 0, 0) });
    await p.goto(FILE); await p.waitForTimeout(400); await p.goto('about:blank');
    await ctx.addInitScript(STUBS);
    await ctx.addInitScript(() => {
      try {
        if (sessionStorage.__seed) return; sessionStorage.__seed = '1';
        const S = JSON.parse(localStorage.lorace_planner_v1); const L = S.tasks.lists[0].id, F = S.biz.folders[0].id;
        const mk = (o) => Object.assign({ listId: L, done: false, doneDates: {}, prio: 'normal', end: '', repeat: 'none', remindMin: '', notes: '' }, o);
        S.tasks.items = [mk({ id: 'a1', text: 'Ligar para a gráfica', due: '2026-11-28', time: '10:00' }), mk({ id: 'a2', text: 'Pagar boleto', due: '2026-11-28' }), mk({ id: 'a3', text: '<img src=x data-xss>Feita', due: '2026-11-27', done: true }), mk({ id: 'v1', text: 'Tomar vitamina', due: '2026-11-20', repeat: 'daily', time: '08:00' })];
        const P = (o) => Object.assign({ folderId: F, platform: 'instagram', status: 'ideia', time: '', hook: '', script: '', caption: '', hashtags: '', scene: '', look: '', duration: '', link: '', notes: '', checklist: [], thumb: '' }, o);
        S.biz.posts = [P({ id: 'p1', title: 'Reels bastidores', format: 'reels', date: '2026-11-28', status: 'gravar', hook: 'Você não vai acreditar' }), P({ id: 'p2', title: 'Ideia solta de carrossel', format: 'carrossel', date: '' }),
          P({ id: 'p6', title: 'Publicado bom', format: 'reels', date: '2026-11-25', status: 'publicado', metrics: { views: 5000, reach: 4000, likes: 300, comments: 20, saves: 80, shares: 40 } })];
        S.notes = [{ id: 'n1', text: 'nota antiga', at: 1 }, { id: 'n2', text: 'nota nova', at: 99 }];
        localStorage.lorace_planner_v1 = JSON.stringify(S);
      } catch (e) {}
    });
    p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.install({ time: new Date(2026, 10, 27, 10, 0, 0) });
    await p.goto(FILE); await p.waitForTimeout(700);
    await p.evaluate(() => { window.__calls = []; window.__reply = null; window.__bloom.Social.call = async (path, body) => { window.__calls.push({ path, body }); if (window.__fail) throw Object.assign(new Error(window.__fail), { code: window.__fail }); return { ok: true, data: window.__reply }; }; });
    const setReply = (r) => p.evaluate((r) => { window.__reply = r; window.__fail = null; }, r);
    const spoke = (words, final = true) => p.evaluate(([w, f]) => window.__rec.last.say(w, f), [words, final]);
    const said = () => p.evaluate(() => window.__said.filter((x) => x.trim()));
    const nCalls = () => p.evaluate(() => window.__calls.length);

    // 1) tocar no botão já começa a ouvir (sem outro botão)
    await p.click('#cmd-fab'); await p.waitForTimeout(200);
    t('tocar no botão flutuante já começa a ouvir', await p.evaluate(() => window.__rec.starts === 1 && document.querySelector('#cmd-mic').classList.contains('on')));
    t('"destravou" a voz de resposta no toque (iPhone)', (await p.evaluate(() => window.__said.length)) >= 1);
    t('status mostra "Ouvindo"', /Ouvindo/.test(await p.textContent('#cmd-st')));
    // 2) fala -> executa sozinho, sem apertar nada
    await spoke('quais os compromissos', false); await p.waitForTimeout(100);
    t('enquanto fala, o texto aparece ao vivo', /quais os compromissos/.test(await p.textContent('#cmd-live')) && (await p.$$eval('.cmd-items li', (e) => e.length)) === 0);
    await spoke('quais os compromissos de amanhã', true);
    await p.waitForTimeout(1900); // 1,5 s de silêncio e o app encerra a escuta sozinho
    t('quando a pessoa para de falar, o app encerra a escuta sozinho', await p.evaluate(() => window.__rec.stops >= 1));
    await p.waitForTimeout(400);
    const items = await p.$$eval('.cmd-items li', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    t('respondeu SEM apertar "Enviar" e SEM chamar a IA (motor do Bloom)', items.length === 3 && (await nCalls()) === 0, JSON.stringify(items));
    t('resposta em lista prática, com horário', items.some((x) => /10:00 · Ligar para a gráfica/.test(x)));
    t('título da resposta aparece', /3 compromissos/.test(await p.textContent('.cmd-ans h3')));
    t('a resposta foi lida em voz alta automaticamente', (await said()).some((x) => /Amanhã você tem 3 compromissos/.test(x)));
    if (name === 'mob') await p.screenshot({ path: SP + 'voice-ans-mob.png' }); else await p.screenshot({ path: SP + 'voice-ans-desk.png' });
    // 3) botão ouvir / parar
    await p.evaluate(() => { window.__said = []; });
    await p.click('[data-say]'); await p.waitForTimeout(80);
    t('botão "ouvir" lê de novo', (await said()).length === 1);
    // 4) desligar a voz
    await p.click('#cmd-speak'); await p.evaluate(() => { window.__said = []; });
    t('desligar "responder em voz alta" guarda a escolha', await p.evaluate(() => localStorage.getItem('bloom_cmd_speak') === '0'));
    await p.click('#cmd-mic'); await p.waitForTimeout(100);
    await spoke('quais conteúdos tenho para gravar amanhã'); await p.waitForTimeout(2300);
    t('2º pedido por voz também responde sozinho', (await nCalls()) === 0 && (await p.$$eval('.cmd-items li', (e) => e.length)) === 1 && /Reels bastidores/.test(await p.textContent('.cmd-items')));
    t('com a voz desligada, não lê em voz alta', (await said()).length === 0);
    // 6) mudança por voz: prévia, fala, ouve "sim" e aplica
    await p.click('#cmd-speak'); // liga de novo
    await p.evaluate(() => { window.__said = []; window.__rec.starts = 0; });
    await p.click('#cmd-mic'); await p.waitForTimeout(100); await spoke('mover os compromissos de amanhã para domingo'); await p.waitForTimeout(2400);
    t('mudança: mostra a prévia (3 itens) e NÃO muda nada sozinha', (await p.$$eval('.cmd-it', (e) => e.length)) === 3 && await p.evaluate(() => window.__bloom.S().tasks.items.find((x) => x.id === 'a1').due === '2026-11-28'));
    t('mudança: lê "Posso confirmar?"', (await said()).some((x) => /Posso confirmar\?/.test(x)), JSON.stringify(await said()));
    await p.waitForTimeout(300);
    t('mudança: depois de falar, escuta a confirmação sozinha', await p.evaluate(() => window.__rec.starts >= 2 && document.querySelector('#cmd-mic').classList.contains('on')));
    await spoke('sim, pode'); await p.waitForTimeout(1900); await p.waitForTimeout(300);
    t('dizer "sim" confirma e aplica', await p.evaluate(() => { const S = window.__bloom.S(); return S.tasks.items.find((x) => x.id === 'a1').due === '2026-11-29' && S.tasks.items.find((x) => x.id === 'a2').due === '2026-11-29'; }));
    t('a janela fechou e a barra de desfazer apareceu', await p.evaluate(() => !document.querySelector('#modal').open && !!document.querySelector('#cmd-undo')));
    await p.click('#cmd-undo button'); await p.waitForTimeout(150);
    t('desfazer devolve', await p.evaluate(() => window.__bloom.S().tasks.items.find((x) => x.id === 'a1').due === '2026-11-28'));
    // 7) dizer "não" cancela
    await p.click('#cmd-fab'); await p.waitForTimeout(150); await spoke('mover compromissos de amanhã para domingo'); await p.waitForTimeout(2400); await p.waitForTimeout(300);
    await spoke('não, deixa'); await p.waitForTimeout(2000);
    t('dizer "não" cancela e nada muda', /não mudei nada/.test(await p.textContent('#cmd-out')) && await p.evaluate(() => window.__bloom.S().tasks.items.find((x) => x.id === 'a1').due === '2026-11-28'));
    // 8) resposta incompreensível na confirmação mantém os botões
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    t('fechar a janela para a escuta e a voz', await p.evaluate(() => window.__cancels > 0));
    // 9) o iPhone corta a escuta cedo / não ouviu / sem permissão
    await p.click('#cmd-fab'); await p.waitForTimeout(150);
    const nrec = () => p.evaluate(() => window.__rec.starts);
    const s0 = await nrec();
    await p.evaluate(() => window.__rec.last.err('no-speech')); await p.waitForTimeout(80);
    t('aparelho cortou a escuta sem ouvir nada: religa sozinho (não desiste)', (await nrec()) === s0 + 1 && /Ouvindo/.test(await p.textContent('#cmd-st')) && !(await p.evaluate(() => document.querySelector('#modal').querySelector('#cmd-out').textContent.includes('Não consegui'))));
    await p.evaluate(() => window.__rec.last.err('no-speech')); await p.waitForTimeout(80);
    await p.evaluate(() => window.__rec.last.err('no-speech')); await p.waitForTimeout(80);
    t('depois de 3 tentativas sem ouvir nada: mensagem simples, sem pedido enviado', /Não consegui ouvir/.test(await p.textContent('#cmd-st')));
    // religou no meio da fala: o texto fica e continua juntando
    await p.click('#cmd-mic'); await p.waitForTimeout(100);
    await spoke('mover compromissos', true);
    await p.evaluate(() => { const r = window.__rec.last; r.stop = () => {}; }); // o aparelho encerra por conta própria depois
    await p.evaluate(() => window.__rec.last.onend && window.__rec.last.onend()); await p.waitForTimeout(100);
    t('terminou sozinho depois de ouvir algo: envia o que ouviu', (await p.inputValue('#cmd-text')).includes('mover compromissos'));
    await p.waitForTimeout(300);
    // só texto provisório (sem frase "fechada") também vale
    await setReply({ intencao: 'consulta', resumo: 'Ok', fala: 'ok', itens: [], perguntas: [], acoes: [] });
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    await p.click('#cmd-fab'); await p.waitForTimeout(150);
    const before = await nCalls();
    await spoke('o que tenho hoje', false); // só provisório
    await p.evaluate(() => { const r = window.__rec.last; r.stop = () => { r.active = false; setTimeout(() => r.onend && r.onend(), 10); }; });
    await p.waitForTimeout(2000); await p.waitForTimeout(300);
    t('o iPhone termina sem "fechar" a frase: o texto provisório é aproveitado e respondido', /Hoje/.test(await p.textContent('.cmd-ans h3')) && (await p.inputValue('#cmd-text')) === 'o que tenho hoje' && (await nCalls()) === before);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    await p.click('#cmd-fab'); await p.waitForTimeout(150);
    await p.evaluate(() => { const r = window.__rec.last; r.onerror && r.onerror({ error: 'not-allowed' }); r.onend && r.onend(); }); await p.waitForTimeout(100);
    t('microfone negado: orienta a liberar ou escrever', /não foi liberado/.test(await p.textContent('#cmd-st')));
    // teclado não pode abrir e atrapalhar o microfone
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    await p.click('#cmd-fab'); await p.waitForTimeout(400);
    t('ao abrir pelo botão, o campo de texto NÃO ganha foco (o teclado do iPhone não abre)', await p.evaluate(() => document.activeElement && document.activeElement.id !== 'cmd-text'));
    t('a transcrição ao vivo aparece em destaque enquanto fala', await (async () => { await spoke('mostrar', false); const r1 = await p.textContent('#cmd-live'); await spoke('mostrar meus conteúdos de amanhã', false); const r2 = await p.textContent('#cmd-live'); return /mostrar/.test(r1) && /conteúdos de amanhã/.test(r2) && await p.$eval('#cmd-live', (e) => !e.hidden); })());
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    // 10) digitar também funciona (Enter envia)
    await p.click('#cmd-fab'); await p.waitForTimeout(150);
    await p.fill('#cmd-text', 'como foram meus resultados no instagram'); await p.press('#cmd-text', 'Enter'); await p.waitForTimeout(300);
    t('digitar e apertar Enter responde (resultados pelo motor, sem IA)', /resultados/i.test(await p.textContent('.cmd-ans h3')) && (await nCalls()) === 0);
    // 11) segurança: texto da IA com HTML não vira elemento
    await setReply({ intencao: 'consulta', resumo: '<img src=x data-xss>', fala: 'ok', itens: [{ texto: '<img src=x data-xss>', detalhe: '<script>window.__x=1</script>' }], perguntas: ['<img src=x data-xss>?'], acoes: [] });
    await p.evaluate(() => { window.__bloom.Engine.off = true; }); await p.fill('#cmd-text', 'teste de segurança'); await p.click('#cmd-go'); await p.waitForSelector('#cmd-ai'); await p.click('#cmd-ai'); await p.waitForTimeout(300);
    t('HTML na resposta da IA aparece como texto', (await p.$$eval('[data-xss]', (e) => e.length)) === 0 && !(await p.evaluate(() => window.__x)));
    t('janela cabe na tela (sem rolagem lateral)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#modal').scrollWidth <= document.querySelector('#modal').clientWidth + 1));
    await p.keyboard.press('Escape');
    await ctx.close();
  }
  // aparelho sem reconhecimento de voz
  const c2 = await b.newContext(devices['iPhone 13']); await c2.addInitScript(() => { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; delete window.speechSynthesis; });
  const q = await c2.newPage(); q.on('pageerror', (e) => errs.push(e.message)); await q.goto(FILE); await q.waitForTimeout(600);
  await q.click('#cmd-fab'); await q.waitForTimeout(200);
  t('sem microfone no aparelho: avisa e deixa digitar', /não liberou o microfone/.test(await q.textContent('#cmd-st')) && await q.$('#cmd-text') !== null);
  await c2.close();
  console.log(fail ? `\n${fail} FALHA(S)` : '\ntodos passaram', '| erros de página:', errs.length ? errs : 'nenhum');
  await b.close(); process.exit(fail ? 1 : 0);
})();
