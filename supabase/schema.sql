-- Bloom Planner: banco de dados (Supabase)
-- Cada usuária só enxerga os próprios dados (Row Level Security).

-- Documentos do planner (mesmo formato do app: core, maps, vision, biz)
create table if not exists public.planner_docs (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  json text not null,
  t bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);
alter table public.planner_docs enable row level security;
drop policy if exists "planner_docs_own" on public.planner_docs;
create policy "planner_docs_own" on public.planner_docs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Contas conectadas (sem tokens: a usuária pode ler e desconectar)
create table if not exists public.social_accounts (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'tiktok')),
  ext_user_id text,
  username text,
  avatar_url text,
  followers integer,
  connected_at timestamptz not null default now(),
  last_sync timestamptz,
  last_error text,
  primary key (user_id, platform)
);
alter table public.social_accounts enable row level security;
drop policy if exists "social_accounts_read_own" on public.social_accounts;
create policy "social_accounts_read_own" on public.social_accounts
  for select to authenticated using (auth.uid() = user_id);

-- Tokens: RLS ligado e SEM políticas = só o servidor (service role) acessa
create table if not exists public.social_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  refresh_expires_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, platform)
);
alter table public.social_tokens enable row level security;

-- Estados temporários do login com Instagram/TikTok (só o servidor)
create table if not exists public.oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  return_to text,
  created_at timestamptz not null default now()
);
alter table public.oauth_states enable row level security;

-- Posts e números vindos das redes
create table if not exists public.social_posts (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  ext_id text not null,
  caption text,
  permalink text,
  media_type text,
  thumbnail_url text,
  posted_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  primary key (user_id, platform, ext_id)
);
alter table public.social_posts enable row level security;
drop policy if exists "social_posts_read_own" on public.social_posts;
create policy "social_posts_read_own" on public.social_posts
  for select to authenticated using (auth.uid() = user_id);

create index if not exists social_posts_user_posted on public.social_posts (user_id, posted_at desc);

-- Notificações no celular (Web Push)
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  tz text,
  ua text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Avisos já enviados (evita mandar o mesmo lembrete duas vezes). Só o servidor acessa.
create table if not exists public.push_sent (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.push_sent enable row level security;

-- Contas do Instagram que a usuária liberou no Login do Facebook (para escolher qual usar).
-- Só a função do servidor lê (guarda tokens de página); sem políticas = sem acesso pelo app.
create table if not exists public.social_choices (
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  ext_id text not null,
  username text,
  page_name text,
  avatar_url text,
  access_token text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, platform, ext_id)
);
alter table public.social_choices enable row level security;

-- Análises da Claude feitas por usuária (limite diário). Só o servidor lê e escreve.
create table if not exists public.ai_usage (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists ai_usage_user_at on public.ai_usage (user_id, at);
alter table public.ai_usage enable row level security;
