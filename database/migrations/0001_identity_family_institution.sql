-- 0001: identidade, famílias, instituições, consentimentos. Requer schema auth (Supabase) com auth.uid().
create extension if not exists pgcrypto;
create schema if not exists app;

create type app.role_t as enum ('student','guardian','teacher','school_manager','super_admin');
create type app.consent_purpose_t as enum ('share_progress_with_school','ai_tutor','parental_control','data_processing_child');

create table app.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app.role_t not null,
  full_name text not null check (char_length(full_name) between 1 and 200),
  created_at timestamptz not null default now()
);

create table app.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  created_at timestamptz not null default now()
);
create table app.family_members (
  family_id uuid not null references app.families(id) on delete cascade,
  profile_id uuid not null references app.profiles(id) on delete cascade,
  relation text not null default 'guardian',
  primary key (family_id, profile_id)
);

create table app.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 300),
  created_at timestamptz not null default now()
);
create table app.institution_members (
  institution_id uuid not null references app.institutions(id) on delete cascade,
  profile_id uuid not null references app.profiles(id) on delete cascade,
  role app.role_t not null check (role in ('teacher','school_manager')),
  primary key (institution_id, profile_id)
);

-- Aluno: dados mínimos (minimização). Pode ter login próprio (profile_id) ou ser gerido pela família.
create table app.students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references app.families(id) on delete cascade,
  profile_id uuid unique references app.profiles(id) on delete set null,
  display_name text not null check (char_length(display_name) between 1 and 100),
  birth_year smallint check (birth_year between 2000 and 2100),
  grade_level text,
  interests text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index on app.students(family_id);

create table app.classes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references app.institutions(id) on delete cascade,
  name text not null, school_year smallint not null
);
create table app.class_teachers (
  class_id uuid not null references app.classes(id) on delete cascade,
  profile_id uuid not null references app.profiles(id) on delete cascade,
  primary key (class_id, profile_id)
);
create table app.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references app.students(id) on delete cascade,
  class_id uuid not null references app.classes(id) on delete cascade,
  institution_id uuid not null references app.institutions(id) on delete cascade,
  active boolean not null default true,
  unique (student_id, class_id)
);
create index on app.enrollments(institution_id) where active;

-- Consentimento por finalidade, revogável. Escola só vê dados com consentimento ativo.
create table app.consents (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references app.students(id) on delete cascade,
  purpose app.consent_purpose_t not null,
  granted_by uuid not null references app.profiles(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
create unique index consents_one_active on app.consents(student_id, purpose) where revoked_at is null;

-- Auditoria append-only
create table app.audit_logs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid, action text not null, entity text not null, entity_id text, detail jsonb not null default '{}'
);
create function app.deny_mutation() returns trigger language plpgsql as $$
begin raise exception '% is append-only', tg_table_name; end $$;
create trigger audit_append_only before update or delete on app.audit_logs
  for each row execute function app.deny_mutation();
