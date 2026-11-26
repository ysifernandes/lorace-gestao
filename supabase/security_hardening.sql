-- Bloom Planner: reforço de segurança do banco (auditoria de segurança).
-- NÃO foi aplicado em produção. Aplique só depois de revisar (Supabase → SQL Editor).
-- Foi testado num Postgres local com os mesmos papéis do Supabase: security-tests/db_local.cjs
-- Pode ser repetido sem problema (usa "if exists" / "drop ... if exists").
--
-- O que muda:
--  1. O papel "anon" (visitante sem login) perde TODO acesso às tabelas do app.
--  2. O papel "authenticated" (usuária logada) fica só com o que o app realmente usa. Antes ele tinha INSERT/UPDATE/DELETE/TRUNCATE
--     em todas as tabelas e dependia só das políticas (RLS) para ser barrado. Agora há duas camadas.
--  3. Tabelas novas não ganham acesso automático.
--  4. Endereços de push só de serviços conhecidos (impede apontar o servidor para endereços internos).
--  5. Tamanho e nome dos documentos do planner com limite (evita encher o banco).
--  6. As políticas de ai_jobs e social_daily passam a valer só para quem está logada.

-- 1 e 2: privilégios mínimos
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant select, insert, update, delete on public.planner_docs        to authenticated;  -- o app lê e grava os próprios documentos
grant select, insert, update, delete on public.push_subscriptions  to authenticated;  -- ativar e desativar notificações
grant select on public.social_accounts to authenticated;                              -- só leitura; quem escreve é o servidor
grant select on public.social_posts    to authenticated;
grant select on public.social_daily    to authenticated;
grant select on public.ai_jobs         to authenticated;
-- social_tokens, social_choices, oauth_states, push_sent, ai_usage, deletion_requests: só o servidor (service_role)

-- 3: tabelas futuras não nascem abertas
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- 6: políticas só para quem está logada
drop policy if exists "ai_jobs_select_own" on public.ai_jobs;
create policy "ai_jobs_select_own" on public.ai_jobs for select to authenticated using (auth.uid() = user_id);
drop policy if exists "social_daily_read_own" on public.social_daily;
create policy "social_daily_read_own" on public.social_daily for select to authenticated using (auth.uid() = user_id);

-- 4: push só para serviços conhecidos (Chrome/Edge/Android, Firefox, Safari/iOS, Windows)
alter table public.push_subscriptions drop constraint if exists push_endpoint_known_hosts;
alter table public.push_subscriptions add constraint push_endpoint_known_hosts check (
  endpoint ~* '^https://(fcm\.googleapis\.com|android\.googleapis\.com|[a-z0-9.-]+\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|[a-z0-9.-]*push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
  and length(endpoint) <= 1000
);

-- 5: documentos do planner
alter table public.planner_docs drop constraint if exists planner_docs_limits;
alter table public.planner_docs add constraint planner_docs_limits check (name in ('core', 'maps', 'vision', 'biz') and length(json) <= 8000000);
