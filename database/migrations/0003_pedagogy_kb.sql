-- 0003: base de conhecimento pedagógico (fontes, matérias, habilidades, grafo, questões) com revisão e versões.
create type app.review_status_t as enum ('draft','in_review','approved','rejected','deprecated');

create table app.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null, url text, kind text not null check (kind in ('bncc','mec','inep','saeb','ibge','rea','licensed','research','authored')),
  license text not null,                         -- obrigatório: sem licença, sem uso
  retrieved_at date
);
create table app.subjects (id text primary key, name text not null);
create table app.units (id uuid primary key default gen_random_uuid(), subject_id text not null references app.subjects(id), name text not null);
create table app.contents (id uuid primary key default gen_random_uuid(), unit_id uuid not null references app.units(id), name text not null);

create table app.skills (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references app.contents(id),
  parent_skill_id uuid references app.skills(id),       -- micro-habilidade → habilidade
  name text not null,
  bncc_code text check (bncc_code ~ '^EF[0-9]{2}[A-Z]{2}[0-9]{2}$'),
  source_id uuid references app.knowledge_sources(id),
  age_min smallint, age_max smallint check (age_max is null or age_max >= age_min),
  review_status app.review_status_t not null default 'draft'
);
create table app.skill_prerequisites (
  skill_id uuid not null references app.skills(id) on delete cascade,
  prerequisite_id uuid not null references app.skills(id) on delete cascade,
  primary key (skill_id, prerequisite_id),
  check (skill_id <> prerequisite_id)
);
-- Impede ciclos no grafo
create function app.prevent_prereq_cycle() returns trigger language plpgsql as $$
begin
  if exists (
    with recursive up(id) as (select new.prerequisite_id union select p.prerequisite_id from app.skill_prerequisites p join up on p.skill_id = up.id)
    select 1 from up where id = new.skill_id
  ) then raise exception 'prerequisite cycle'; end if;
  return new;
end $$;
create trigger skill_prereq_no_cycle before insert or update on app.skill_prerequisites
  for each row execute function app.prevent_prereq_cycle();

create table app.questions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references app.skills(id),
  source_id uuid not null references app.knowledge_sources(id),  -- rastreabilidade obrigatória
  version int not null default 1,
  difficulty real not null check (difficulty between 0 and 1),
  statement text not null, answer jsonb not null, justification text not null,
  explanation text,
  review_status app.review_status_t not null default 'draft',
  reviewed_by uuid references app.profiles(id), reviewed_at timestamptz,
  check (review_status <> 'approved' or (reviewed_by is not null and reviewed_at is not null))
);
create index on app.questions(skill_id) where review_status = 'approved';
create table app.question_versions (
  question_id uuid not null references app.questions(id) on delete cascade,
  version int not null, snapshot jsonb not null, at timestamptz not null default now(),
  primary key (question_id, version)
);
create function app.snapshot_question() returns trigger language plpgsql as $$
begin
  insert into app.question_versions(question_id, version, snapshot) values (old.id, old.version, to_jsonb(old));
  new.version := old.version + 1;
  if new.review_status = 'approved' and old.review_status <> 'approved' then null; end if;
  return new;
end $$;
create trigger question_versioning before update on app.questions
  for each row when (old.statement is distinct from new.statement or old.answer is distinct from new.answer)
  execute function app.snapshot_question();
