-- 0006: conteúdo estruturado (tipos de atividade, equívocos), trilha editorial, solicitações de tempo,
-- credenciais/pareamento de dispositivos, limites comerciais configuráveis e correções da revisão de segurança.

-- ===== conteúdo =====
alter table app.skills
  add column slug text unique,
  add column bncc_lookup text,                              -- o que conferir na BNCC (NÃO é código)
  add column bncc_verified boolean not null default false,
  add constraint skills_bncc_requires_verification check (bncc_code is null or bncc_verified);   -- nunca "código" sem conferência
alter table app.questions
  add column slug text unique,
  add column kind text not null default 'multiple_choice' check (kind in ('multiple_choice','word_problem','reasoning','fill_in','ordering','matching','drag_drop','fraction_visual','simulation')),
  add column payload jsonb not null default '{}',
  add column hints jsonb not null default '[]',
  add column misconception_tags text[] not null default '{}',
  add column needs_professional_review boolean not null default true,
  add column last_editor uuid references app.profiles(id);
-- aprovado sem revisor ainda proibido (0003); aprovado "sem revisão profissional" continua sinalizado.

create table app.misconceptions (
  id text primary key, skill_id uuid not null references app.skills(id) on delete cascade,
  label text not null, category text not null check (category in ('conceptual','procedural','text_interpretation','practical_application','occasional')),
  description text not null
);
create table app.misconception_explanations (
  misconception_id text not null references app.misconceptions(id) on delete cascade, variant int not null,
  method text not null, title text not null, body jsonb not null,
  review_status app.review_status_t not null default 'draft', needs_professional_review boolean not null default true,
  primary key (misconception_id, variant)
);
create table app.content_audit (
  id bigint generated always as identity primary key, at timestamptz not null default now(),
  actor uuid references app.profiles(id), action text not null, entity text not null, entity_id text not null,
  from_status app.review_status_t, to_status app.review_status_t, version int, note text
);
create trigger content_audit_append_only before update or delete on app.content_audit for each row execute function app.deny_mutation();

-- Quatro olhos: quem editou por último não aprova. Registra auditoria de toda mudança de status.
create function app.questions_workflow() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.review_status is distinct from old.review_status then
    if new.review_status = 'approved' and (new.reviewed_by is null or new.reviewed_by is not distinct from old.last_editor) then
      raise exception 'approval requires a reviewer different from the last editor';
    end if;
    insert into app.content_audit(actor, action, entity, entity_id, from_status, to_status, version, note)
      values (new.reviewed_by, 'status', 'question', new.id::text, old.review_status, new.review_status, new.version, null);
  end if;
  return new;
end $$;
create trigger questions_workflow_trg before update on app.questions for each row execute function app.questions_workflow();

-- ===== solicitações de tempo extra =====
create table app.time_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references app.students(id) on delete cascade,
  device_id uuid references app.devices(id) on delete set null,
  minutes int not null check (minutes between 1 and 120), reason text check (char_length(reason) <= 300),
  status text not null default 'pending' check (status in ('pending','approved','denied','expired')),
  created_at timestamptz not null default now(), decided_by uuid references app.profiles(id), decided_at timestamptz,
  check ((status = 'pending') = (decided_by is null))
);
create index on app.time_requests(student_id, status);

-- ===== dispositivos: credenciais e pareamento =====
alter table app.devices add column token_hash bytea, add column key_version int not null default 1;   -- token nunca em claro
alter table app.device_pairings add column failed_attempts int not null default 0;
create function app.pairing_once() returns trigger language plpgsql as $$
begin
  if old.used_at is not null then raise exception 'pairing code already used'; end if;
  if new.used_at is not null and old.expires_at < now() then raise exception 'pairing code expired'; end if;
  return new;
end $$;
create trigger device_pairings_once before update on app.device_pairings for each row execute function app.pairing_once();
alter table app.remote_commands add constraint command_ttl_max check (expires_at <= issued_at + interval '7 days');   -- comandos têm validade curta

-- ===== comercial configurável =====
alter table app.plans add column limits jsonb not null default '{}',            -- ex.: {"children":2,"devices":3}
  add column billing_criteria jsonb not null default '{}';                       -- ex.: {"model":"per_active_student","active_definition":"..."}
comment on column app.plans.price_cents is 'NULL = preço não definido; somente superadmin altera (RLS).';

-- ===== correções da revisão de segurança =====
revoke execute on function app.create_family(text) from public;       -- anon/PUBLIC não executam
grant execute on function app.create_family(text) to authenticated;

-- ===== RLS para tabelas novas =====
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'app' loop execute format('alter table app.%I enable row level security', t.tablename); end loop;
end $$;
grant select on app.misconceptions, app.misconception_explanations, app.content_audit, app.time_requests to authenticated;
grant insert on app.time_requests to authenticated;
grant update (status, decided_by, decided_at) on app.time_requests to authenticated;
create policy misc_select on app.misconceptions for select using (auth.uid() is not null);
create policy misc_super on app.misconceptions for all using (app.is_super()) with check (app.is_super());
create policy misc_expl_select on app.misconception_explanations for select using (review_status = 'approved' or app.is_super());
create policy misc_expl_super on app.misconception_explanations for all using (app.is_super()) with check (app.is_super());
create policy content_audit_select on app.content_audit for select using (app.is_super());
-- aluno cria pedido apenas para si; responsável decide (e não pode decidir em nome de outro responsável)
create policy tr_select on app.time_requests for select using (app.is_self_student(student_id) or app.is_guardian_of(student_id));
create policy tr_insert on app.time_requests for insert with check (app.is_self_student(student_id) and status = 'pending' and decided_by is null);
create policy tr_decide on app.time_requests for update using (app.is_guardian_of(student_id) and status = 'pending')
  with check (app.is_guardian_of(student_id) and decided_by = auth.uid() and status in ('approved','denied'));
