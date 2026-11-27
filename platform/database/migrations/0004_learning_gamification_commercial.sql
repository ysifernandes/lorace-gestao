-- 0004: avaliações, evidências, diagnósticos, planos, carteira auditável, comercial.
create type app.mastery_state_t as enum ('consolidated','developing','needs_support','insufficient_evidence');
create type app.evidence_kind_t as enum ('diagnostic','practice','transfer','delayed_review','game');
create type app.currency_t as enum ('xp','minutes');

create table app.assessments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references app.students(id) on delete cascade,
  kind text not null check (kind in ('diagnostic','simulado','practice')),
  started_at timestamptz not null default now(), finished_at timestamptz
);
create table app.learning_evidence (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references app.students(id) on delete cascade,
  assessment_id uuid references app.assessments(id) on delete set null,
  skill_id uuid not null references app.skills(id),
  question_id uuid references app.questions(id),
  kind app.evidence_kind_t not null,
  correct boolean not null, hints_used smallint not null default 0 check (hints_used >= 0),
  response jsonb, at timestamptz not null default now()
);
create index on app.learning_evidence(student_id, skill_id, at desc);

create table app.error_patterns (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references app.students(id) on delete cascade,
  skill_id uuid not null references app.skills(id),
  category text not null, hypothesis text not null,
  status text not null check (status in ('suspected','confirmed','discarded')),
  support int not null default 1, contradict int not null default 0, updated_at timestamptz not null default now()
);
create table app.diagnostics (
  student_id uuid not null references app.students(id) on delete cascade,
  skill_id uuid not null references app.skills(id),
  probability real not null check (probability between 0 and 1),
  confidence real not null check (confidence between 0 and 1),
  evidence_count int not null, state app.mastery_state_t not null,
  updated_at timestamptz not null default now(),
  primary key (student_id, skill_id)
);
create table app.study_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references app.students(id) on delete cascade,
  valid_from date not null, valid_to date, ratios jsonb not null default '{"focus":0.6,"prerequisite":0.25,"review":0.15}',
  exam_date date, approved_by uuid references app.profiles(id)
);
create table app.plan_activities (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references app.study_plans(id) on delete cascade,
  skill_id uuid not null references app.skills(id), kind text not null check (kind in ('focus','prerequisite','review','advance')),
  scheduled_for date not null, completed_at timestamptz
);
create table app.reviews (  -- revisão espaçada
  student_id uuid not null references app.students(id) on delete cascade,
  skill_id uuid not null references app.skills(id),
  interval_days int not null default 1, due_on date not null,
  primary key (student_id, skill_id)
);
create table app.missions (id uuid primary key default gen_random_uuid(), title text not null, skill_id uuid references app.skills(id), xp int not null check (xp between 0 and 1000), kind text not null check (kind in ('daily','weekly','challenge')));
create table app.achievements (id text primary key, title text not null, criteria jsonb not null);
create table app.student_achievements (student_id uuid references app.students(id) on delete cascade, achievement_id text references app.achievements(id), at timestamptz not null default now(), primary key (student_id, achievement_id));
create table app.games (id text primary key, name text not null, subject_id text references app.subjects(id));
create table app.reports (id uuid primary key default gen_random_uuid(), student_id uuid not null references app.students(id) on delete cascade, period daterange not null, content jsonb not null, created_at timestamptz not null default now());

-- ---- Carteira: append-only, idempotente, encadeada por hash, saldo nunca negativo ----
create table app.wallets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references app.students(id) on delete cascade
);
create table app.wallet_transactions (
  seq bigint generated always as identity primary key,
  wallet_id uuid not null references app.wallets(id) on delete cascade,
  currency app.currency_t not null,
  delta int not null check (delta <> 0),
  reason text not null, idempotency_key text not null,
  created_at timestamptz not null default now(),
  prev_hash text not null, hash text not null,
  unique (wallet_id, idempotency_key)
);
create index on app.wallet_transactions(wallet_id, currency);
create view app.wallet_balances with (security_invoker = true) as
  select wallet_id, currency, sum(delta)::int as balance from app.wallet_transactions group by 1,2;

create function app.wallet_tx_guard() returns trigger language plpgsql as $$
declare bal int; last_hash text;
begin
  perform pg_advisory_xact_lock(hashtext(new.wallet_id::text));
  select coalesce(sum(delta),0) into bal from app.wallet_transactions where wallet_id = new.wallet_id and currency = new.currency;
  if bal + new.delta < 0 then raise exception 'insufficient % balance', new.currency; end if;
  select hash into last_hash from app.wallet_transactions order by seq desc limit 1;
  new.prev_hash := coalesce(last_hash, repeat('0',64));
  new.hash := encode(digest(concat_ws('|', new.prev_hash, new.wallet_id, new.currency, new.delta, new.reason, new.idempotency_key, extract(epoch from new.created_at)), 'sha256'), 'hex');
  return new;
end $$;
create trigger wallet_tx_before_insert before insert on app.wallet_transactions for each row execute function app.wallet_tx_guard();
-- Append-only; única exceção: exclusão em cascata quando a carteira (conta do aluno) é apagada (LGPD).
create function app.wallet_tx_immutable() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and not exists(select 1 from app.wallets where id = old.wallet_id) then return old; end if;
  raise exception 'wallet_transactions is append-only';
end $$;
create trigger wallet_tx_append_only before update or delete on app.wallet_transactions for each row execute function app.wallet_tx_immutable();

-- ---- Comercial (preços configuráveis pelo superadmin; nada fixo em código) ----
create table app.plans (
  id text primary key, name text not null, audience text not null check (audience in ('family','school')),
  price_cents int check (price_cents >= 0),        -- NULL = ainda não definido
  currency char(3) not null default 'BRL', max_students int, features jsonb not null default '{}', active boolean not null default false
);
create table app.subscriptions (
  id uuid primary key default gen_random_uuid(), family_id uuid not null references app.families(id) on delete cascade,
  plan_id text not null references app.plans(id), status text not null check (status in ('trialing','active','past_due','canceled')),
  external_ref text, started_at timestamptz not null default now(), ends_at timestamptz
);
create table app.licenses (
  id uuid primary key default gen_random_uuid(), institution_id uuid not null references app.institutions(id) on delete cascade,
  plan_id text not null references app.plans(id), seats int not null check (seats > 0), valid_during daterange not null
);
