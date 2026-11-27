const { chromium, devices } = require('playwright');
const SP = require('os').tmpdir() + '/';
const FILE = 'file://' + require('path').resolve(__dirname, '..', 'planner.html');
let fail = 0; const t = (n, ok, x = '') => { console.log((ok ? 'OK    ' : 'FALHA ') + n + (x ? '  [' + x + ']' : '')); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [name, opts] of [['mob', devices['iPhone 13']], ['desk', { viewport: { width: 1280, height: 900 } }]]) {
    console.log('=== ' + name);
    const ctx = await b.newContext(opts);
    let p = await ctx.newPage(); await p.clock.install({ time: new Date(2026, 10, 27, 10, 0, 0) }); // sexta 27/11/2026
    await p.goto(FILE); await p.waitForTimeout(400); await p.goto('about:blank');
    await ctx.addInitScript(() => {
      try { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; } catch (e) {}
      try {
        if (sessionStorage.__seed) return; sessionStorage.__seed = '1';
        const S = JSON.parse(localStorage.lorace_planner_v1); const L = S.tasks.lists[0].id; const F = S.biz.folders[0].id;
        const mk = (o) => Object.assign({ listId: L, done: false, doneDates: {}, prio: 'normal', end: '', repeat: 'none', remindMin: '', notes: '' }, o);
        S.tasks.items = [
          mk({ id: 'a1', text: 'Ligar para a gráfica', due: '2026-11-27', time: '10:00' }),
          mk({ id: 'a2', text: '<img src=x data-xss>Pagar boleto', due: '2026-11-27' }),
          mk({ id: 'a3', text: 'Já feita', due: '2026-11-27', done: true }),
          mk({ id: 'v1', text: 'Tomar vitamina', due: '2026-11-20', repeat: 'daily', time: '08:00' }),
          mk({ id: 'r1', text: 'Reunião da equipe', due: '2026-11-20', repeat: 'weekly', time: '15:00' }),
          mk({ id: 'f1', text: 'Outra tarefa amanhã', due: '2026-11-28' }),
        ];
        const P = (o) => Object.assign({ folderId: F, platform: 'instagram', status: 'ideia', time: '', hook: '', script: '', caption: '', hashtags: '', scene: '', look: '', duration: '', link: '', notes: '', checklist: [], thumb: '' }, o);
        S.biz.posts = [P({ id: 'p1', title: 'Reels bastidores', format: 'reels', date: '2026-11-25' }), P({ id: 'p2', title: 'Vídeo curto da semana', format: 'curto', date: '2026-11-29', status: 'gravado' }),
          P({ id: 'p3', title: 'Carrossel', format: 'carrossel', date: '2026-11-26' }), P({ id: 'p4', title: 'Já publicado', format: 'reels', date: '2026-11-24', status: 'publicado' }), P({ id: 'p5', title: 'Exemplo', format: 'reels', date: '2026-11-26', example: true })];
        localStorage.lorace_planner_v1 = JSON.stringify(S);
      } catch (e) {}
    });
    p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
    await p.clock.install({ time: new Date(2026, 10, 27, 10, 0, 0) });
    await p.goto(FILE); await p.waitForTimeout(700);
    const calls = []; let reply = null;
    await p.evaluate(() => { window.__bloom.Engine.off = true; window.__calls = []; window.__reply = null; window.__bloom.Social.call = async (path, body) => { window.__calls.push({ path, body }); if (window.__fail) throw Object.assign(new Error(window.__fail), { code: window.__fail }); return { ok: true, data: window.__reply }; }; });
    const setReply = (r) => p.evaluate((r) => { window.__reply = r; window.__fail = null; }, Object.assign({ intencao: 'mudanca', fala: '', itens: [] }, r));
    const ask = async (text) => { await p.click('#cmd-fab'); await p.waitForSelector('#cmd-text'); await p.fill('#cmd-text', text); await p.click('#cmd-go'); await p.waitForSelector('#cmd-ai'); await p.click('#cmd-ai'); await p.waitForTimeout(250); };
    const st = () => p.evaluate(() => { const S = window.__bloom.S(); return { tasks: S.tasks.items.map((x) => ({ id: x.id, due: x.due, time: x.time, repeat: x.repeat, skip: x.skipDates && Object.keys(x.skipDates), from: x.movedFrom, text: x.text })), posts: S.biz.posts.map((x) => ({ id: x.id, date: x.date, time: x.time })) }; });
    const on = (id, d) => p.evaluate(([id, d]) => { const S = window.__bloom.S(); const it = S.tasks.items.find((x) => x.id === id); return window.__bloom.Cmd && (function () { const occ = (it, date) => window.__occ(it, date); return null; })(); }, [id, d]);

    // botão flutuante
    const fab = await p.$('#cmd-fab'); const bb = await fab.boundingBox(); const vw = await p.evaluate(() => innerWidth), vh = await p.evaluate(() => innerHeight);
    t('botão flutuante existe, na direita da tela', bb && bb.x + bb.width > vw * 0.7, `x=${Math.round(bb.x)} de ${vw}`);
    t('botão não fica atrás da barra de baixo (celular)', name === 'desk' || bb.y + bb.height < vh - 70, `y=${Math.round(bb.y)} de ${vh}`);

    // arrastar muda de lugar e guarda
    const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx - 150, cy - 220, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(150);
    const b2 = await (await p.$('#cmd-fab')).boundingBox();
    t('arrastar move o botão', Math.abs(b2.x - bb.x) > 100 && Math.abs(b2.y - bb.y) > 100, `${Math.round(bb.x)},${Math.round(bb.y)} → ${Math.round(b2.x)},${Math.round(b2.y)}`);
    t('arrastar NÃO abre a janela', await p.evaluate(() => !document.querySelector('#modal').open));
    await p.reload(); await p.waitForTimeout(600);
    const b3 = await (await p.$('#cmd-fab')).boundingBox();
    t('a posição fica guardada depois de recarregar', Math.abs(b3.x - b2.x) < 3 && Math.abs(b3.y - b2.y) < 3);
    await p.evaluate(() => { window.__bloom.Engine.off = true; window.__calls = []; window.__bloom.Social.call = async (path, body) => { window.__calls.push({ path, body }); if (window.__fail) throw Object.assign(new Error(window.__fail), { code: window.__fail }); return { ok: true, data: window.__reply }; }; });

    // 1) compromissos de hoje -> amanhã
    await setReply({ resumo: 'Vou mover 3 compromissos de hoje para amanhã.', perguntas: [], acoes: [
      { tipo: 'mover_item', alvo: 'tarefa', id: 'a1', data_origem: '', nova_data: '2026-11-28', novo_horario: '', novo_dia_semana: '' },
      { tipo: 'mover_item', alvo: 'tarefa', id: 'a2', data_origem: '', nova_data: '2026-11-28', novo_horario: '', novo_dia_semana: '' },
      { tipo: 'mover_ocorrencia', alvo: 'tarefa', id: 'v1', data_origem: '2026-11-27', nova_data: '2026-11-28', novo_horario: '', novo_dia_semana: '' },
      { tipo: 'mover_item', alvo: 'tarefa', id: 'NAOEXISTE', data_origem: '', nova_data: '2026-11-28', novo_horario: '', novo_dia_semana: '' },
      { tipo: 'mover_item', alvo: 'tarefa', id: 'a3', data_origem: '', nova_data: '2026-11-28', novo_horario: '', novo_dia_semana: '' },
      { tipo: 'mover_item', alvo: 'tarefa', id: 'f1', data_origem: '', nova_data: '28/11', novo_horario: '', novo_dia_semana: '' },
      { tipo: 'mover_item', alvo: 'conteudo', id: 'p4', data_origem: '', nova_data: '2026-12-01', novo_horario: '', novo_dia_semana: '' },
    ] });
    await ask('mover os compromissos de hoje para amanhã');
    const body = await p.evaluate(() => window.__calls[window.__calls.length - 1]);
    t('pedido vai para a rota "command"', body.path === 'command');
    t('o app envia hoje, dia da semana e calendário', body.body.hoje === '2026-11-27' && body.body.dia_semana === 'sex' && body.body.calendario.length === 21 && body.body.calendario[1].dia === 'sex');
    t('concluída vai marcada como feita; publicado e exemplo não vão nos conteúdos', (body.body.tarefas.find((x) => x.id === 'a3') || {}).feita === true && !body.body.conteudos.some((x) => ['p4', 'p5'].includes(x.id)) && !(body.body.publicados || []).some((x) => x.t === 'Exemplo'));
    t('tarefa que se repete vai com as datas em que ocorre', (body.body.tarefas.find((x) => x.id === 'v1').ocorre_em || []).length === 8 && body.body.tarefas.find((x) => x.id === 'r1').ocorre_em[0] === '2026-11-27');
    const rows = await p.$$eval('.cmd-it', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    t('prévia mostra só as 3 ações válidas (descarta id inexistente, concluída, data inválida, publicado)', rows.length === 3, JSON.stringify(rows));
    t('prévia diz "de → para" e "só este dia" na repetida', /27\/11 \(sex\) → 28\/11 \(sáb\)/.test(rows[0]) && /só este dia/.test(rows[2]), rows[2]);
    t('texto com HTML aparece como texto (sem injeção)', await p.$$eval('[data-xss]', (e) => e.length) === 0 && /<img src=x/.test(rows[1]));
    t('NADA mudou antes de confirmar', JSON.stringify((await st()).tasks.find((x) => x.id === 'a1')) === JSON.stringify({ id: 'a1', due: '2026-11-27', time: '10:00', repeat: 'none', text: 'Ligar para a gráfica' }));
    if (name === 'mob') await p.screenshot({ path: SP + 'cmd-prev-mob.png' }); else await p.screenshot({ path: SP + 'cmd-prev-desk.png' });
    // desmarca a2 e confirma
    await p.click('.cmd-it:nth-child(2)'); await p.click('#cmd-ok'); await p.waitForTimeout(250);
    let s1 = await st();
    t('a1 foi para amanhã (horário mantido)', s1.tasks.find((x) => x.id === 'a1').due === '2026-11-28' && s1.tasks.find((x) => x.id === 'a1').time === '10:00');
    t('a2 desmarcada ficou como estava', s1.tasks.find((x) => x.id === 'a2').due === '2026-11-27');
    const v1 = s1.tasks.find((x) => x.id === 'v1'); const clone = s1.tasks.find((x) => x.from === 'v1');
    t('vitamina: série continua, só o dia 27 saiu', v1.repeat === 'daily' && v1.due === '2026-11-20' && JSON.stringify(v1.skip) === '["2026-11-27"]');
    t('vitamina: nasceu uma tarefa única em 28/11 às 08:00', clone && clone.due === '2026-11-28' && clone.repeat === 'none' && clone.time === '08:00');
    const occ = await p.evaluate(() => { const S = window.__bloom.S(); const v = S.tasks.items.find((x) => x.id === 'v1'); const days = ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']; return days.map((d) => { try { return document.querySelector('x') || null; } catch (e) { return null; } }); });
    t('barra "desfazer" aparece', await p.$$eval('#cmd-undo', (e) => e.length) === 1);
    if (name === 'mob') await p.screenshot({ path: SP + 'cmd-undo-mob.png' });
    await p.click('#cmd-undo button'); await p.waitForTimeout(250);
    s1 = await st();
    t('desfazer devolve tudo', s1.tasks.find((x) => x.id === 'a1').due === '2026-11-27' && !s1.tasks.find((x) => x.from === 'v1') && !s1.tasks.find((x) => x.id === 'v1').skip && s1.tasks.length === 6);

    // 2) só a reunião de hoje: ocorrência, com horário novo
    await setReply({ resumo: 'Vou passar a reunião de hoje para amanhã às 16:00.', perguntas: [], acoes: [{ tipo: 'mover_ocorrencia', alvo: 'tarefa', id: 'r1', data_origem: '2026-11-27', nova_data: '2026-11-28', novo_horario: '16:00', novo_dia_semana: '' }] });
    await ask('passar só a reunião de hoje para as 16h de amanhã'); await p.click('#cmd-ok'); await p.waitForTimeout(250);
    s1 = await st(); const r1 = s1.tasks.find((x) => x.id === 'r1');
    t('reunião semanal: só a de hoje saiu; série intacta', r1.repeat === 'weekly' && r1.due === '2026-11-20' && r1.time === '15:00' && JSON.stringify(r1.skip) === '["2026-11-27"]');
    t('nova reunião única amanhã às 16:00', s1.tasks.some((x) => x.from === 'r1' && x.due === '2026-11-28' && x.time === '16:00' && x.repeat === 'none'));
    await p.click('#cmd-undo button'); await p.waitForTimeout(200);

    // 3) mudar a série: toda sexta -> toda segunda
    await setReply({ resumo: 'Vou mudar a reunião de toda sexta para toda segunda.', perguntas: [], acoes: [{ tipo: 'mudar_serie', alvo: 'tarefa', id: 'r1', data_origem: '', nova_data: '', novo_horario: '', novo_dia_semana: 'seg' }, { tipo: 'mudar_serie', alvo: 'tarefa', id: 'v1', data_origem: '', nova_data: '', novo_horario: '', novo_dia_semana: 'seg' }] });
    await ask('mudar a reunião de toda sexta para toda segunda');
    const rows3 = await p.$$eval('.cmd-it', (e) => e.map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
    t('prévia da série: "toda sexta-feira → toda segunda-feira", próxima 30/11', rows3.length === 1 && /toda sexta-feira → toda segunda-feira/.test(rows3[0]) && /30\/11/.test(rows3[0]), rows3[0]);
    t('avisa que tarefa diária não tem dia da semana para mudar', /não é uma tarefa semanal/.test(await p.textContent('#cmd-out')));
    await p.click('#cmd-ok'); await p.waitForTimeout(250);
    s1 = await st(); const r1b = s1.tasks.find((x) => x.id === 'r1');
    t('série agora começa na segunda 30/11, semanal, mesmo horário', r1b.repeat === 'weekly' && r1b.due === '2026-11-30' && r1b.time === '15:00', JSON.stringify(r1b));
    await p.click('#cmd-undo button'); await p.waitForTimeout(200);

    // 4) vídeos da semana -> semana que vem
    await setReply({ resumo: 'Vou reagendar 2 vídeos para a semana que vem.', perguntas: [], acoes: [
      { tipo: 'mover_item', alvo: 'conteudo', id: 'p1', data_origem: '', nova_data: '2026-12-02', novo_horario: '', novo_dia_semana: '' },
      { tipo: 'mover_item', alvo: 'conteudo', id: 'p2', data_origem: '', nova_data: '2026-12-06', novo_horario: '', novo_dia_semana: '' }] });
    await ask('reagendar os vídeos dessa semana para a semana que vem'); await p.click('#cmd-ok'); await p.waitForTimeout(250);
    s1 = await st();
    t('vídeos andaram 7 dias; carrossel não mexeu', s1.posts.find((x) => x.id === 'p1').date === '2026-12-02' && s1.posts.find((x) => x.id === 'p2').date === '2026-12-06' && s1.posts.find((x) => x.id === 'p3').date === '2026-11-26');
    await p.click('#cmd-undo button'); await p.waitForTimeout(200);
    t('desfazer devolve os vídeos', (await st()).posts.find((x) => x.id === 'p1').date === '2026-11-25');

    // 5) pergunta em vez de chute
    await setReply({ resumo: '', perguntas: ['Mover para qual dia?'], acoes: [] });
    await ask('mover tudo');
    t('pedido vago: mostra a pergunta e nenhum botão de confirmar', /Mover para qual dia\?/.test(await p.textContent('#cmd-out')) && (await p.$$eval('#cmd-ok', (e) => e.length)) === 0);
    // 6) erros do servidor
    for (const [code, re] of [['rate_limited', /usou todos os pedidos/], ['not_found', /ainda não está disponível/], ['boom', /Não consegui agora/]]) {
      await p.evaluate((c) => { window.__fail = c; }, code); await p.click('#cmd-go'); await p.waitForSelector('#cmd-ai'); await p.click('#cmd-ai'); await p.waitForTimeout(250);
      t('erro ' + code + ' vira mensagem amigável', re.test(await p.textContent('#cmd-out')));
    }
    t('janela cabe na tela (sem rolagem lateral)', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#modal').scrollWidth <= document.querySelector('#modal').clientWidth + 1));
    await p.keyboard.press('Escape');
    t('nada de injeção em toda a sessão', await p.$$eval('[data-xss]', (e) => e.length) === 0);
    await ctx.close();
  }
  console.log(fail ? `\n${fail} FALHA(S)` : '\ntodos passaram', '| erros de página:', errs.length ? errs : 'nenhum');
  await b.close(); process.exit(fail ? 1 : 0);
})();
