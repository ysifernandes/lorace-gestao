// Teste do banco num Postgres LOCAL (PGlite), sem tocar na produção.
// Recria os papéis do Supabase (anon, authenticated, service_role) com as permissões padrão deles, carrega supabase/schema.sql
// e mede o que cada papel consegue fazer ANTES e DEPOIS de supabase/security_hardening.sql.
// Uso: NODE_PATH=<pasta com @electric-sql/pglite> node security-tests/db_local.cjs
const fs = require('fs'), path = require('path');
const { PGlite } = require('@electric-sql/pglite');
const R = (f) => fs.readFileSync(path.resolve(__dirname, '..', 'supabase', f), 'utf8');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
let fail = 0; const t = (n, ok, extra = '') => { console.log((ok ? 'OK    ' : 'FALHA ') + n + (extra ? '  [' + extra + ']' : '')); if (!ok) fail++; };
async function as(db, role, uid, sql, params) {
  await db.exec(`reset role; select set_config('request.jwt.claims', '${uid ? JSON.stringify({ sub: uid, role }) : ''}', false); set role ${role};`);
  try { const r = await db.query(sql, params); return { ok: true, rows: r.rows, n: r.affectedRows }; } catch (e) { return { ok: false, err: e.message }; } finally { await db.exec('reset role'); }
}
(async () => {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    insert into auth.users values ('${A}'), ('${B}');`);
  await db.exec(R('schema.sql'));
  await db.exec(`set role service_role; insert into planner_docs(user_id,name,json) values ('${A}','core','{"a":1}'),('${B}','core','{"b":2}');
    insert into social_tokens(user_id,platform,access_token) values ('${A}','instagram','segredo-A');
    insert into push_subscriptions(endpoint,user_id,p256dh,auth) values ('https://web.push.apple.com/abc','${A}','p','a'); reset role;`);

  console.log('=== ANTES do reforço (como está hoje em produção)');
  let r = await as(db, 'anon', null, 'select count(*) from planner_docs');            t('anon lê planner_docs: permitido pelo privilégio, mas RLS devolve 0 linhas', r.ok && Number(r.rows[0].count) === 0);
  r = await as(db, 'anon', null, 'select has_table_privilege(\'anon\', \'public.social_tokens\', \'insert\') as p'); t('(diagnóstico) anon TEM privilégio de INSERT em social_tokens', r.rows[0].p === true);
  r = await as(db, 'authenticated', A, 'select has_table_privilege(\'authenticated\', \'public.social_tokens\', \'delete\') as p'); t('(diagnóstico) authenticated TEM privilégio de DELETE em social_tokens (só a RLS barra)', r.rows[0].p === true);
  r = await as(db, 'authenticated', A, "insert into push_subscriptions(endpoint,user_id,p256dh,auth) values ('http://169.254.169.254/x', $1, 'p', 'a')", [A]); t('(vulnerabilidade) endpoint de push interno é ACEITO antes do reforço', r.ok);
  await db.exec(`set role service_role; delete from push_subscriptions where endpoint like 'http://169%'; reset role;`);

  console.log('=== aplicando supabase/security_hardening.sql (duas vezes: precisa ser repetível)');
  await db.exec(R('security_hardening.sql')); await db.exec(R('security_hardening.sql'));

  console.log('=== DEPOIS do reforço');
  for (const tb of ['planner_docs', 'social_accounts', 'social_tokens', 'social_choices', 'social_posts', 'social_daily', 'push_subscriptions', 'push_sent', 'ai_usage', 'ai_jobs', 'oauth_states', 'deletion_requests']) {
    r = await as(db, 'anon', null, `select count(*) from ${tb}`); t(`anon NÃO acessa ${tb}`, !r.ok && /permission denied/.test(r.err), r.err);
  }
  for (const tb of ['social_tokens', 'social_choices', 'oauth_states', 'push_sent', 'ai_usage', 'deletion_requests']) {
    r = await as(db, 'authenticated', A, `select count(*) from ${tb}`); t(`authenticated NÃO lê a tabela só-servidor ${tb}`, !r.ok && /permission denied/.test(r.err));
  }
  for (const tb of ['social_accounts', 'social_posts', 'social_daily', 'ai_jobs']) {
    r = await as(db, 'authenticated', A, `delete from ${tb}`); t(`authenticated NÃO apaga em ${tb} (leitura apenas)`, !r.ok && /permission denied/.test(r.err));
    r = await as(db, 'authenticated', A, `select count(*) from ${tb}`); t(`authenticated ainda LÊ ${tb} (o app precisa)`, r.ok);
  }
  r = await as(db, 'authenticated', A, 'truncate planner_docs'); t('authenticated NÃO consegue TRUNCATE', !r.ok);
  console.log('--- o app continua funcionando para a dona dos dados');
  r = await as(db, 'authenticated', A, 'select user_id from planner_docs'); t('A lê só os próprios documentos', r.ok && r.rows.length === 1 && r.rows[0].user_id === A);
  r = await as(db, 'authenticated', A, "insert into planner_docs(user_id,name,json,t) values ($1,'biz','{\"x\":1}',5) on conflict (user_id,name) do update set json=excluded.json", [A]); t('A grava (upsert) o próprio documento', r.ok, r.err);
  r = await as(db, 'authenticated', A, "insert into push_subscriptions(endpoint,user_id,p256dh,auth) values ('https://fcm.googleapis.com/fcm/send/abc', $1,'p','a')", [A]); t('A registra push do Chrome', r.ok, r.err);
  r = await as(db, 'authenticated', A, "insert into push_subscriptions(endpoint,user_id,p256dh,auth) values ('https://updates.push.services.mozilla.com/wpush/v2/x', $1,'p','a')", [A]); t('A registra push do Firefox', r.ok, r.err);
  r = await as(db, 'authenticated', A, "insert into push_subscriptions(endpoint,user_id,p256dh,auth) values ('https://web.push.apple.com/Qx', $1,'p','a') on conflict (endpoint) do update set p256dh=excluded.p256dh", [A]); t('A registra/atualiza push do Safari', r.ok, r.err);
  r = await as(db, 'authenticated', A, 'delete from push_subscriptions where endpoint = $1', ['https://fcm.googleapis.com/fcm/send/abc']); t('A remove o próprio push', r.ok && r.n === 1);
  console.log('--- isolamento entre usuárias e entradas maliciosas');
  r = await as(db, 'authenticated', B, 'select count(*) from planner_docs where user_id = $1', [A]); t('B não vê documentos de A', Number(r.rows[0].count) === 0);
  r = await as(db, 'authenticated', B, "update planner_docs set json='{\"hack\":1}' where user_id = $1", [A]); t('B não altera documentos de A (0 linhas)', r.ok && r.n === 0);
  r = await as(db, 'authenticated', B, 'delete from planner_docs where user_id = $1', [A]); t('B não apaga documentos de A (0 linhas)', r.ok && r.n === 0);
  r = await as(db, 'authenticated', B, "insert into planner_docs(user_id,name,json) values ($1,'core','{}')", [A]); t('B não grava em nome de A', !r.ok && /row-level security/.test(r.err), r.err);
  r = await as(db, 'authenticated', B, "update push_subscriptions set user_id = $1 where endpoint = 'https://web.push.apple.com/abc'", [B]); t('B não rouba a inscrição de push de A', r.ok && r.n === 0);
  for (const ep of ['http://169.254.169.254/latest', 'https://169.254.169.254/x', 'https://localhost/x', 'https://fcm.googleapis.com.evil.com/x', 'https://evil.com/fcm.googleapis.com/x', 'file:///etc/passwd', 'https://storage.googleapis.com/x']) {
    r = await as(db, 'authenticated', B, "insert into push_subscriptions(endpoint,user_id,p256dh,auth) values ($1,$2,'p','a')", [ep, B]); t('endpoint de push recusado: ' + ep, !r.ok && /check constraint/.test(r.err));
  }
  r = await as(db, 'authenticated', B, "insert into planner_docs(user_id,name,json) values ($1,'qualquer-nome','{}')", [B]); t('nome de documento fora da lista é recusado', !r.ok && /check constraint/.test(r.err));
  r = await as(db, 'authenticated', B, "insert into planner_docs(user_id,name,json) values ($1,'maps',repeat('x', 8000001))", [B]); t('documento acima de 8 MB é recusado', !r.ok && /check constraint/.test(r.err));
  r = await as(db, 'authenticated', B, "insert into planner_docs(user_id,name,json) values ($1,'vision',repeat('x', 2000000))", [B]); t('documento de 2 MB é aceito', r.ok, r.err);
  r = await as(db, 'service_role', null, 'select access_token from social_tokens'); t('o servidor (service_role) continua lendo os tokens', r.ok && r.rows.length === 1);
  r = await as(db, 'service_role', null, "insert into ai_usage(user_id) values ('" + A + "')"); t('o servidor continua gravando ai_usage', r.ok, r.err);
  console.log(fail ? `\n${fail} FALHA(S)` : '\ntodos passaram'); process.exit(fail ? 1 : 0);
})();
