-- 0005: Row Level Security. Princípio: negar por padrão; escrita sensível (evidências, diagnósticos,
-- carteira, dispositivos, status de comandos) apenas via service_role (backend). Escola só enxerga alunos
-- matriculados E com consentimento ativo "share_progress_with_school".

-- ===== helpers (security definer, search_path fixo) =====
create function app.is_super() returns boolean language sql stable security definer set search_path = app, pg_temp as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'super_admin') $$;
create function app.is_guardian_of(sid uuid) returns boolean language sql stable security definer set search_path = app, pg_temp as $$
  select exists(select 1 from students s join family_members fm on fm.family_id = s.family_id
                where s.id = sid and fm.profile_id = auth.uid()) $$;
create function app.is_family_member(fid uuid) returns boolean language sql stable security definer set search_path = app, pg_temp as $$
  select exists(select 1 from family_members where family_id = fid and profile_id = auth.uid()) $$;
create function app.is_self_student(sid uuid) returns boolean language sql stable security definer set search_path = app, pg_temp as $$
  select exists(select 1 from students where id = sid and profile_id = auth.uid()) $$;
create function app.is_institution_member(iid uuid) returns boolean language sql stable security definer set search_path = app, pg_temp as $$
  select exists(select 1 from institution_members where institution_id = iid and profile_id = auth.uid()) $$;
create function app.is_institution_manager(iid uuid) returns boolean language sql stable security definer set search_path = app, pg_temp as $$
  select exists(select 1 from institution_members where institution_id = iid and profile_id = auth.uid() and role = 'school_manager') $$;
-- Escola (gestor: toda a instituição; professor: suas turmas) com consentimento ativo
create function app.school_can_see(sid uuid) returns boolean language sql stable security definer set search_path = app, pg_temp as $$
  select exists(
    select 1 from enrollments e
    join institution_members im on im.institution_id = e.institution_id and im.profile_id = auth.uid()
    where e.student_id = sid and e.active
      and exists(select 1 from consents c where c.student_id = sid and c.purpose = 'share_progress_with_school' and c.revoked_at is null)
      and (im.role = 'school_manager'
           or exists(select 1 from class_teachers ct where ct.class_id = e.class_id and ct.profile_id = auth.uid()))
  ) $$;
create function app.can_read_student(sid uuid) returns boolean language sql stable security definer set search_path = app, pg_temp as $$
  select app.is_guardian_of(sid) or app.is_self_student(sid) or app.school_can_see(sid) $$;   -- superadmin NÃO lê dados de crianças (acesso de suporte futuro: função auditada)

-- Criação de família atômica (sem política de INSERT direta em families/family_members)
create function app.create_family(p_name text) returns uuid language plpgsql security definer set search_path = app, pg_temp as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists(select 1 from profiles where id = auth.uid() and role = 'guardian') then raise exception 'only guardians create families'; end if;
  insert into families(name) values (p_name) returning id into fid;
  insert into family_members(family_id, profile_id) values (fid, auth.uid());
  insert into audit_logs(actor, action, entity, entity_id) values (auth.uid(), 'create', 'family', fid::text);
  return fid;
end $$;

-- ===== habilitar RLS em tudo =====
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'app' loop
    execute format('alter table app.%I enable row level security', t.tablename);
  end loop;
end $$;

-- ===== privilégios =====
grant usage on schema app to authenticated;
grant select, insert, update, delete on all tables in schema app to authenticated;
grant select on all tables in schema app to authenticated;
grant execute on function app.create_family(text) to authenticated;
-- sem escalada de papel: REVOKE por coluna não remove UPDATE de tabela; por isso revoga-se tudo e concede-se só full_name
revoke update on app.profiles from authenticated;
grant update (full_name) on app.profiles to authenticated;
revoke all on app.audit_logs from authenticated; grant select on app.audit_logs to authenticated;
revoke insert, update, delete on app.wallet_transactions, app.wallets, app.learning_evidence, app.diagnostics,
  app.error_patterns, app.devices, app.device_pairings, app.sync_history, app.usage_sessions, app.command_events,
  app.student_achievements, app.reviews from authenticated;
revoke update on app.remote_commands from authenticated;

-- ===== políticas =====
create policy profiles_select on app.profiles for select using (
  id = auth.uid() or app.is_super()
  or exists(select 1 from app.family_members a join app.family_members b on a.family_id = b.family_id where a.profile_id = auth.uid() and b.profile_id = profiles.id));
create policy profiles_update_self on app.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy families_select on app.families for select using (app.is_family_member(id) or app.is_super());
create policy families_update on app.families for update using (app.is_family_member(id)) with check (app.is_family_member(id));
create policy fm_select on app.family_members for select using (app.is_family_member(family_id) or app.is_super());

create policy inst_select on app.institutions for select using (app.is_institution_member(id) or app.is_super());
create policy inst_super_write on app.institutions for all using (app.is_super()) with check (app.is_super());
create policy im_select on app.institution_members for select using (app.is_institution_member(institution_id) or app.is_super());
create policy im_manage on app.institution_members for all using (app.is_institution_manager(institution_id) or app.is_super())
  with check (app.is_institution_manager(institution_id) or app.is_super());

create policy students_select on app.students for select using (app.can_read_student(id));
create policy students_insert on app.students for insert with check (family_id is not null and app.is_family_member(family_id));
create policy students_update on app.students for update using (app.is_guardian_of(id)) with check (family_id is not null and app.is_family_member(family_id));
create policy students_delete on app.students for delete using (app.is_guardian_of(id));   -- exclusão de dados (LGPD)

create policy classes_select on app.classes for select using (app.is_institution_member(institution_id) or app.is_super());
create policy classes_manage on app.classes for all using (app.is_institution_manager(institution_id) or app.is_super())
  with check (app.is_institution_manager(institution_id) or app.is_super());
create policy ct_select on app.class_teachers for select using (profile_id = auth.uid() or app.is_super()
  or exists(select 1 from app.classes c where c.id = class_id and app.is_institution_member(c.institution_id)));
create policy ct_manage on app.class_teachers for all using (exists(select 1 from app.classes c where c.id = class_id and app.is_institution_manager(c.institution_id)))
  with check (exists(select 1 from app.classes c where c.id = class_id and app.is_institution_manager(c.institution_id)));
-- matrícula: visível a gestor da instituição e a responsáveis do aluno; criada pelo gestor
create policy enr_select on app.enrollments for select using (app.is_institution_manager(institution_id) or app.is_guardian_of(student_id) or app.is_super());
create policy enr_manage on app.enrollments for all using (app.is_institution_manager(institution_id)) with check (app.is_institution_manager(institution_id));

create policy consents_select on app.consents for select using (app.is_guardian_of(student_id));
create policy consents_insert on app.consents for insert with check (app.is_guardian_of(student_id) and granted_by = auth.uid());
create policy consents_revoke on app.consents for update using (app.is_guardian_of(student_id)) with check (app.is_guardian_of(student_id));

create policy audit_select on app.audit_logs for select using (app.is_super());

-- controle parental: apenas responsáveis da família
create policy devices_select on app.devices for select using (app.is_family_member(family_id));
create policy pairings_none on app.device_pairings for select using (false);
create policy managed_apps_select on app.managed_apps for select using (exists(select 1 from app.devices d where d.id = device_id and app.is_family_member(d.family_id)));
create policy managed_apps_update on app.managed_apps for update using (exists(select 1 from app.devices d where d.id = device_id and app.is_family_member(d.family_id)))
  with check (exists(select 1 from app.devices d where d.id = device_id and app.is_family_member(d.family_id)));
create policy rules_all on app.parental_rules for all using (app.is_guardian_of(student_id)) with check (app.is_guardian_of(student_id) and created_by = auth.uid());
create policy cmd_select on app.remote_commands for select using (exists(select 1 from app.devices d where d.id = device_id and app.is_family_member(d.family_id)));
create policy cmd_insert on app.remote_commands for insert with check (
  issued_by = auth.uid() and status = 'pending'
  and exists(select 1 from app.devices d where d.id = device_id and d.revoked_at is null and app.is_family_member(d.family_id)));
create policy cmdev_select on app.command_events for select using (exists(select 1 from app.remote_commands c join app.devices d on d.id = c.device_id where c.id = command_id and app.is_family_member(d.family_id)));
create policy sync_select on app.sync_history for select using (exists(select 1 from app.devices d where d.id = device_id and app.is_family_member(d.family_id)));
create policy usage_select on app.usage_sessions for select using (exists(select 1 from app.devices d where d.id = device_id and app.is_family_member(d.family_id)));

-- base pedagógica: leitura ampla das estruturas; questões aprovadas só para adultos (aluno não vê gabarito)
create policy sources_select on app.knowledge_sources for select using (auth.uid() is not null);
create policy subjects_select on app.subjects for select using (auth.uid() is not null);
create policy units_select on app.units for select using (auth.uid() is not null);
create policy contents_select on app.contents for select using (auth.uid() is not null);
create policy skills_select on app.skills for select using (review_status = 'approved' or app.is_super());
create policy prereq_select on app.skill_prerequisites for select using (auth.uid() is not null);
create policy kb_super_write_sources on app.knowledge_sources for all using (app.is_super()) with check (app.is_super());
create policy kb_super_write_skills on app.skills for all using (app.is_super()) with check (app.is_super());
create policy kb_super_write_prereq on app.skill_prerequisites for all using (app.is_super()) with check (app.is_super());
create policy kb_super_write_subjects on app.subjects for all using (app.is_super()) with check (app.is_super());
create policy kb_super_write_units on app.units for all using (app.is_super()) with check (app.is_super());
create policy kb_super_write_contents on app.contents for all using (app.is_super()) with check (app.is_super());
create policy questions_select on app.questions for select using (
  app.is_super() or (review_status = 'approved' and exists(select 1 from app.profiles p where p.id = auth.uid() and p.role in ('guardian','teacher','school_manager'))));
create policy questions_super_write on app.questions for all using (app.is_super()) with check (app.is_super());
create policy qv_select on app.question_versions for select using (app.is_super());

-- dados de aprendizagem: leitura por quem pode ler o aluno; escrita só backend
create policy assessments_select on app.assessments for select using (app.can_read_student(student_id));
create policy evidence_select on app.learning_evidence for select using (app.can_read_student(student_id));
create policy errpat_select on app.error_patterns for select using (app.can_read_student(student_id));
create policy diag_select on app.diagnostics for select using (app.can_read_student(student_id));
create policy plans_sel on app.study_plans for select using (app.can_read_student(student_id));
create policy plans_write on app.study_plans for all using (app.is_guardian_of(student_id)) with check (app.is_guardian_of(student_id));
create policy pa_select on app.plan_activities for select using (exists(select 1 from app.study_plans p where p.id = plan_id and app.can_read_student(p.student_id)));
create policy reviews_select on app.reviews for select using (app.can_read_student(student_id));
create policy reports_select on app.reports for select using (app.can_read_student(student_id));
create policy missions_select on app.missions for select using (auth.uid() is not null);
create policy achievements_select on app.achievements for select using (auth.uid() is not null);
create policy sa_select on app.student_achievements for select using (app.can_read_student(student_id));
create policy games_select on app.games for select using (auth.uid() is not null);

-- carteira: leitura por responsável/aluno (NÃO pela escola: minutos de lazer são assunto familiar)
create policy wallets_select on app.wallets for select using (app.is_guardian_of(student_id) or app.is_self_student(student_id));
create policy wtx_select on app.wallet_transactions for select using (exists(select 1 from app.wallets w where w.id = wallet_id and (app.is_guardian_of(w.student_id) or app.is_self_student(w.student_id))));

-- comercial
create policy plans_catalog on app.plans for select using (active or app.is_super());
create policy plans_super on app.plans for all using (app.is_super()) with check (app.is_super());
create policy subs_select on app.subscriptions for select using (app.is_family_member(family_id) or app.is_super());
create policy lic_select on app.licenses for select using (app.is_institution_manager(institution_id) or app.is_super());
