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
