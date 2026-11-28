-- Imita o mínimo do Supabase para testes locais: schema auth, auth.uid() e papéis.
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
do $$ begin if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if; end $$;
-- helpers de teste (login/logout simulando JWT)
create schema t; grant usage on schema t to public;
create function t.login(u uuid) returns void language plpgsql as $$ begin perform set_config('request.jwt.claim.sub', u::text, true); execute 'set local role authenticated'; end $$;
create function t.logout() returns void language plpgsql as $$ begin execute 'reset role'; end $$;
