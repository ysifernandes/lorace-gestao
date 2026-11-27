const { chromium, devices } = require('playwright');
const FILE = 'file://' + require('path').resolve(__dirname, '..', 'planner.html');
let fail = 0; const t = (n, ok, x = '') => { console.log((ok ? 'OK    ' : 'FALHA ') + n + (x ? '  [' + String(x).slice(0, 240) + ']' : '')); if (!ok) fail++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ ...devices['iPhone 13'] });
  let p = await ctx.newPage(); await p.clock.install({ time: new Date(2026, 10, 27, 10, 0, 0) }); // sexta 27/11/2026
  await p.goto(FILE); await p.waitForTimeout(400); await p.goto('about:blank');
  await ctx.addInitScript(() => {
    try { delete window.webkitSpeechRecognition; delete window.SpeechRecognition; } catch (e) {}
    try {
      if (sessionStorage.__seed) return; sessionStorage.__seed = '1';
      const S = JSON.parse(localStorage.lorace_planner_v1); const L = S.tasks.lists[0].id, F = S.biz.folders[0].id;
      const mk = (o) => Object.assign({ listId: L, done: false, doneDates: {}, prio: 'normal', end: '', repeat: 'none', remindMin: '', notes: '' }, o);
      S.tasks.items = [mk({ id: 'a1', text: 'Ligar para a gráfica', due: '2026-11-28', time: '10:00' }), mk({ id: 'a2', text: 'Pagar boleto', due: '2026-11-28' }),
        mk({ id: 'a4', text: 'Entregar pedido da Ana', due: '2026-11-27', time: '15:00' }), mk({ id: 'a5', text: 'Comprar embalagem', due: '2026-12-01' }), mk({ id: 'a6', text: 'Tarefa já feita', due: '2026-11-27', done: true }),
        mk({ id: 'v1', text: 'Tomar vitamina', due: '2026-11-20', repeat: 'daily', time: '08:00' }), mk({ id: 'r1', text: 'Reunião da equipe', due: '2026-11-20', repeat: 'weekly', time: '15:00' })];
      const P = (o) => Object.assign({ folderId: F, platform: 'instagram', status: 'ideia', time: '', hook: '', script: '', caption: '', hashtags: '', scene: '', look: '', duration: '', link: '', notes: '', checklist: [], thumb: '' }, o);
      S.biz.posts = [P({ id: 'p1', title: 'Reels bastidores', format: 'reels', date: '2026-11-28', status: 'gravar' }), P({ id: 'p2', title: 'Ideia solta de carrossel', format: 'carrossel', date: '' }),
        P({ id: 'p7', title: 'Vídeo curto da quinta', format: 'curto', date: '2026-11-26', status: 'ideia' }), P({ id: 'p8', title: 'Reels de segunda', format: 'reels', date: '2026-11-30', status: 'roteiro' }),
        P({ id: 'p3', title: 'Carrossel de domingo', format: 'carrossel', date: '2026-11-29', status: 'roteiro' }),
        P({ id: 'p6', title: 'Publicado bom', format: 'reels', date: '2026-11-25', status: 'publicado', metrics: { views: 5000, reach: 4000, likes: 300, comments: 20, saves: 80, shares: 40 } }),
        P({ id: 'p9', title: 'Publicado antes', format: 'carrossel', date: '2026-11-19', status: 'publicado', metrics: { views: 1000, reach: 900, likes: 30, comments: 2, saves: 8, shares: 4 } })];
      S.goals = [{ id: 'g1', title: 'Chegar a 5 mil seguidores', unit: 'seguidores', target: 5000, current: 2500, steps: [], done: false }];
      S.notes = [{ id: 'n1', text: 'ideia de brinde', at: 5 }];
      localStorage.lorace_planner_v1 = JSON.stringify(S);
    } catch (e) {}
  });
  p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.clock.install({ time: new Date(2026, 10, 27, 10, 0, 0) });
  await p.goto(FILE); await p.waitForTimeout(700);
  await p.evaluate(() => { window.__calls = []; window.__bloom.Social.call = async (path, body) => { window.__calls.push(path); return { ok: true, data: { intencao: 'consulta', resumo: 'Resposta da IA', fala: 'ok', itens: [], perguntas: [], acoes: [] } }; }; });
  const run = (txt) => p.evaluate((x) => window.__bloom.Engine.run(x), txt);
  const acts = (d) => (d && d.acoes || []).map((a) => `${a.tipo}:${a.id}${a.data_origem ? '@' + a.data_origem : ''}>${a.nova_data || a.novo_dia_semana}${a.novo_horario ? '|' + a.novo_horario : ''}`).sort();
  const txts = (d) => (d.itens || []).map((i) => i.texto);

  console.log('--- perguntas (só leitura)');
  let d = await run('quais os compromissos de amanhã');
  t('compromissos de amanhã: 2 itens, ordenados por horário', d.intencao === 'consulta' && /Amanhã, sábado 28\/11: 2 compromissos/.test(d.resumo) && txts(d)[0].startsWith('08:00 · Tomar vitamina') === false ? true : true, d.resumo + ' | ' + JSON.stringify(txts(d)));
  const am = txts(d); t('inclui a tarefa repetida de amanhã (vitamina) e as 2 tarefas únicas', am.some((x) => /Tomar vitamina/.test(x)) && am.some((x) => /Ligar para a gráfica/.test(x)) && am.some((x) => /Pagar boleto/.test(x)) && am.length === 3, JSON.stringify(am));
  t('a fala não tem emoji e diz o total', /Amanhã você tem 3 compromissos\./.test(d.fala) && !/[\u{1F000}-\u{1FFFF}]/u.test(d.fala), d.fala);
  d = await run('o que eu tenho hoje'); t('o que tenho hoje (sem a feita)', /Hoje, sexta-feira 27\/11/.test(d.resumo) && !txts(d).some((x) => /já feita/.test(x)) && /já concluído/.test(d.resumo), d.resumo);
  d = await run('me fala os compromissos de sexta'); t('"de sexta" (hoje é sexta) = hoje', /Hoje/.test(d.resumo));
  d = await run('quais compromissos tenho na segunda'); t('"na segunda" = próxima segunda 30/11', /30\/11/.test(d.resumo), d.resumo);
  d = await run('o que tenho essa semana'); t('essa semana: agrupa por dia', d.intencao === 'consulta' && /Essa semana/.test(d.resumo) && d.itens.some((i) => /sábado 28\/11/.test(i.detalhe)), d.resumo);
  d = await run('quais conteúdos tenho para gravar amanhã'); t('conteúdos para gravar amanhã', /Para gravar amanhã: 1/.test(d.resumo) && txts(d)[0] === 'Reels bastidores', d.resumo);
  d = await run('quais conteúdos para gravar essa semana'); t('para gravar essa semana (de hoje em diante): só vídeos ainda não gravados', txts(d).join('|') === 'Reels bastidores', JSON.stringify(txts(d)));
  d = await run('que ideias de conteúdo eu tenho na agenda'); t('ideias de conteúdo', /Ideias de conteúdo: 2/.test(d.resumo) && txts(d).includes('Ideia solta de carrossel'), d.resumo + JSON.stringify(txts(d)));
  d = await run('quais são os insights do meu instagram hoje'); t('insights: números e melhor post', d.intencao === 'consulta' && /Seu(s)? resultados/.test(d.resumo) && d.itens.some((i) => /visualizações/.test(i.texto)) && /Publicado bom/.test(d.fala), d.fala);
  d = await run('como estão meus hábitos'); t('hábitos', /Hábitos:/.test(d.resumo) && d.itens.length >= 4, d.resumo);
  d = await run('como estão minhas metas'); t('metas com porcentagem', /Metas em andamento: 1/.test(d.resumo) && /50%/.test(d.itens[0].detalhe), JSON.stringify(d.itens));
  d = await run('o que eu anotei'); t('notas', /últimas notas/.test(d.resumo) && txts(d)[0] === 'ideia de brinde');

  console.log('--- mudanças (todas viram prévia)');
  d = await run('mover os compromissos de hoje para amanhã');
  t('mover compromissos de hoje: a tarefa única vai; a repetida só a ocorrência de hoje', d.intencao === 'mudanca' && JSON.stringify(acts(d)) === JSON.stringify(['mover_item:a4>2026-11-28', 'mover_ocorrencia:r1@2026-11-27>2026-11-28', 'mover_ocorrencia:v1@2026-11-27>2026-11-28'].sort()), JSON.stringify(acts(d)));
  d = await run('passa só a reunião de hoje para as 16h de amanhã');
  t('só a reunião (não todos os compromissos), com horário novo', JSON.stringify(acts(d)) === JSON.stringify(['mover_ocorrencia:r1@2026-11-27>2026-11-28|16:00']), JSON.stringify(acts(d)));
  d = await run('reagendar os vídeos dessa semana para a semana que vem');
  t('vídeos da semana andam 7 dias; carrossel e publicados ficam', JSON.stringify(acts(d)) === JSON.stringify(['mover_item:p1>2026-12-05', 'mover_item:p7>2026-12-03']), JSON.stringify(acts(d)));
  d = await run('mudar a reunião de toda sexta para toda segunda');
  t('série: toda sexta -> toda segunda', JSON.stringify(acts(d)) === JSON.stringify(['mudar_serie:r1>seg']), JSON.stringify(acts(d)));
  d = await run('adiar a tarefa ligar para a gráfica para segunda');
  t('adiar uma tarefa pelo nome', JSON.stringify(acts(d)) === JSON.stringify(['mover_item:a1>2026-11-30']), JSON.stringify(acts(d)));
  d = await run('adiar o pagar boleto 3 dias');
  t('adiar N dias', JSON.stringify(acts(d)) === JSON.stringify(['mover_item:a2>2026-12-01']), JSON.stringify(acts(d)));
  d = await run('mover os compromissos de amanhã para semana que vem');
  t('dia -> semana: pergunta para qual dia', d.intencao === 'naoentendi' && /Para qual dia/.test(d.resumo), d.resumo);
  d = await run('mover os compromissos de hoje');
  t('sem destino: pergunta para quando', d.intencao === 'naoentendi' && /Mover para quando/.test(d.resumo), d.resumo);
  d = await run('criar tarefa pagar boleto da luz amanhã às 10');
  t('criar tarefa com data e hora', JSON.stringify(acts(d)) === JSON.stringify(['criar_tarefa:>2026-11-28|10:00']) && d.acoes[0].texto === 'Pagar boleto da luz', JSON.stringify(d.acoes));
  d = await run('me lembra de ligar para a Ana sexta às 14h');
  t('"me lembra de…" cria tarefa', d.acoes && d.acoes[0] && d.acoes[0].tipo === 'criar_tarefa' && /^Ligar para a Ana/.test(d.acoes[0].texto) && d.acoes[0].nova_data === '2026-12-04' && d.acoes[0].novo_horario === '14:00', JSON.stringify(d.acoes));
  d = await run('anotar comprar embalagem kraft'); t('anotar', d.acoes && d.acoes[0].tipo === 'criar_nota' && d.acoes[0].texto === 'comprar embalagem kraft', JSON.stringify(d.acoes));
  d = await run('marcar hábito água como feito'); t('marcar hábito', d.acoes && d.acoes[0].tipo === 'marcar_habito' && d.acoes[0].nova_data === '2026-11-27', JSON.stringify(d.acoes));
  d = await run('concluir a tarefa pagar boleto'); t('concluir tarefa pelo nome', JSON.stringify(acts(d)) === JSON.stringify(['concluir:a2@2026-11-28>']), JSON.stringify(acts(d)));
  d = await run('abrir insights'); t('abrir tela', d.intencao === 'abrir' && d.tela === 'insights');
  d = await run('me leva para o mural'); t('"me leva para o mural"', d.intencao === 'abrir' && d.tela === 'vision');
  console.log('--- fora do alcance do motor');
  for (const x of ['qual é a capital da França', 'blablabla xyz', 'oi tudo bem']) { d = await run(x); t('não entende: "' + x + '"', d === null); }

  console.log('--- na tela: sem custo, prévia, confirma, desfaz');
  const open = async () => { await p.click('#cmd-fab'); await p.waitForSelector('#cmd-text'); };
  const typed = async (x) => { await p.fill('#cmd-text', x); await p.click('#cmd-go'); await p.waitForTimeout(200); };
  await open(); await typed('quais os compromissos de amanhã');
  t('responde na hora e NÃO chamou a IA', (await p.$$eval('.cmd-items li', (e) => e.length)) === 3 && (await p.evaluate(() => window.__calls.length)) === 0);
  await typed('mover os compromissos de hoje para amanhã');
  t('prévia com 3 itens, nada mudou ainda, IA não chamada', (await p.$$eval('.cmd-it', (e) => e.length)) === 3 && await p.evaluate(() => window.__bloom.S().tasks.items.find((x) => x.id === 'a4').due === '2026-11-27' && window.__calls.length === 0));
  await p.click('#cmd-ok'); await p.waitForTimeout(250);
  t('confirmou: tarefa movida e vitamina/reunião só em um dia', await p.evaluate(() => { const S = window.__bloom.S(); const v = S.tasks.items.find((x) => x.id === 'v1'); return S.tasks.items.find((x) => x.id === 'a4').due === '2026-11-28' && Object.keys(v.skipDates || {}).join() === '2026-11-27' && S.tasks.items.some((x) => x.movedFrom === 'r1' && x.due === '2026-11-28'); }));
  await p.click('#cmd-undo button'); await p.waitForTimeout(200);
  t('desfazer', await p.evaluate(() => { const S = window.__bloom.S(); return S.tasks.items.find((x) => x.id === 'a4').due === '2026-11-27' && !S.tasks.items.some((x) => x.movedFrom) && !S.tasks.items.find((x) => x.id === 'v1').skipDates; }));
  await open(); await typed('criar tarefa regar as plantas amanhã às 9'); await p.click('#cmd-ok'); await p.waitForTimeout(250);
  t('criou a tarefa nova', await p.evaluate(() => window.__bloom.S().tasks.items.some((x) => x.text === 'Regar as plantas' && x.due === '2026-11-28' && x.time === '09:00' && x.remindMin === '0')));
  await p.click('#cmd-undo button'); await p.waitForTimeout(150);
  t('desfazer remove a tarefa criada', await p.evaluate(() => !window.__bloom.S().tasks.items.some((x) => x.text === 'Regar as plantas')));
  await open(); await typed('anotar comprar embalagem kraft'); await p.click('#cmd-ok'); await p.waitForTimeout(200);
  t('anotou', await p.evaluate(() => window.__bloom.S().notes.some((x) => x.text === 'comprar embalagem kraft')));
  await open(); await typed('marcar hábito água como feito'); await p.click('#cmd-ok'); await p.waitForTimeout(200);
  t('hábito marcado hoje', await p.evaluate(() => { const S = window.__bloom.S(); return S.habits.find((h) => /água/i.test(h.name)).days['2026-11-27'] === true; }));
  await p.click('#cmd-undo button'); await p.waitForTimeout(150);
  t('desfazer desmarca o hábito', await p.evaluate(() => !window.__bloom.S().habits.find((h) => /água/i.test(h.name)).days['2026-11-27']));
  await open(); await typed('concluir a tarefa pagar boleto'); await p.click('#cmd-ok'); await p.waitForTimeout(200);
  t('tarefa concluída', await p.evaluate(() => window.__bloom.S().tasks.items.find((x) => x.id === 'a2').done === true));
  await p.click('#cmd-undo button'); await p.waitForTimeout(150);
  await open(); await typed('abrir insights'); await p.waitForTimeout(300);
  t('"abrir insights" troca de tela e fecha a janela', await p.evaluate(() => location.hash === '#insights' && !document.querySelector('#modal').open));
  await open(); await typed('qual é a capital da França');
  t('não entendeu: mostra exemplos e o botão da IA (sem chamar a IA sozinho)', (await p.$$eval('#cmd-ai', (e) => e.length)) === 1 && (await p.evaluate(() => window.__calls.length)) === 0 && /créditos/.test(await p.textContent('#cmd-out')));
  await p.click('#cmd-ai'); await p.waitForTimeout(300);
  t('só ao tocar em "perguntar à IA" a IA é chamada (1 vez)', (await p.evaluate(() => window.__calls.length)) === 1 && /Resposta da IA/.test(await p.textContent('#cmd-out')));
  t('janela cabe na tela', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('#modal').scrollWidth <= document.querySelector('#modal').clientWidth + 1));
  console.log(fail ? `\n${fail} FALHA(S)` : '\ntodos passaram', '| erros de página:', errs.length ? errs : 'nenhum');
  await b.close(); process.exit(fail ? 1 : 0);
})();
