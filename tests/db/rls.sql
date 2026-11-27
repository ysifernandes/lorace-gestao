-- Testes de RLS, triggers e constraints. Cada falha levanta exceção (ON_ERROR_STOP).
\set ON_ERROR_STOP 1
do $$
declare
  g1 uuid := '00000000-0000-4000-8000-000000000001'; g2 uuid := '00000000-0000-4000-8000-000000000002';
  t1 uuid := '00000000-0000-4000-8000-000000000011'; t2 uuid := '00000000-0000-4000-8000-000000000012';
  m1 uuid := '00000000-0000-4000-8000-000000000021'; m2 uuid := '00000000-0000-4000-8000-000000000022';
  su uuid := '00000000-0000-4000-8000-000000000031'; kid uuid := '00000000-0000-4000-8000-000000000041';
  famA uuid; famB uuid; instX uuid; instY uuid; c1 uuid; c2 uuid; s1 uuid; s2 uuid; devA uuid; devB uuid;
  w1 uuid; src uuid; sk1 uuid; sk2 uuid; q1 uuid; n int; ok boolean; cmd uuid := gen_random_uuid();
  passed int := 0;
begin
  -- ===== fixtures (superusuário) =====
  insert into auth.users select unnest(array[g1,g2,t1,t2,m1,m2,su,kid]);
  insert into app.profiles(id, role, full_name) values
    (g1,'guardian','G1'),(g2,'guardian','G2'),(t1,'teacher','T1'),(t2,'teacher','T2'),
    (m1,'school_manager','M1'),(m2,'school_manager','M2'),(su,'super_admin','SU'),(kid,'student','Kid');
  insert into app.families(name) values ('A') returning id into famA;
  insert into app.families(name) values ('B') returning id into famB;
  insert into app.family_members values (famA,g1,'guardian'),(famB,g2,'guardian');
  insert into app.institutions(name) values ('X') returning id into instX;
  insert into app.institutions(name) values ('Y') returning id into instY;
  insert into app.institution_members values (instX,t1,'teacher'),(instX,t2,'teacher'),(instX,m1,'school_manager'),(instY,m2,'school_manager');
  insert into app.classes(institution_id,name,school_year) values (instX,'5A',2026) returning id into c1;
  insert into app.classes(institution_id,name,school_year) values (instX,'5B',2026) returning id into c2;
  insert into app.class_teachers values (c1,t1),(c2,t2);
  insert into app.students(family_id,profile_id,display_name) values (famA,kid,'Aluno A') returning id into s1;
  insert into app.students(family_id,display_name) values (famB,'Aluno B') returning id into s2;
  insert into app.enrollments(student_id,class_id,institution_id) values (s1,c1,instX);
  insert into app.devices(family_id,student_id,platform) values (famA,s1,'android') returning id into devA;
  insert into app.devices(family_id,student_id,platform) values (famB,s2,'ios') returning id into devB;
  insert into app.knowledge_sources(name,kind,license) values ('BNCC','bncc','domínio público/uso educacional') returning id into src;
  insert into app.subjects values ('mat','Matemática');
  insert into app.units(subject_id,name) values ('mat','Números');
  insert into app.contents(unit_id,name) select id,'Operações' from app.units;
  insert into app.skills(content_id,name,review_status) select id,'Divisão','approved' from app.contents returning id into sk1;
  insert into app.skills(content_id,name,review_status) select id,'Fatores comuns','approved' from app.contents returning id into sk2;
  insert into app.questions(skill_id,source_id,difficulty,statement,answer,justification,review_status,reviewed_by,reviewed_at)
    values (sk1,src,0.3,'12÷3?','4','12=3×4','approved',su,now()) returning id into q1;
  insert into app.learning_evidence(student_id,skill_id,kind,correct) values (s1,sk1,'practice',true),(s2,sk1,'practice',false);
  insert into app.wallets(student_id) values (s1) returning id into w1;

  -- ===== 1. isolamento entre famílias =====
  perform set_config('request.jwt.claim.sub', g1::text, true); execute 'set local role authenticated';
  select count(*) into n from app.students; assert n = 1, 'g1 deve ver só 1 aluno'; passed := passed + 1;
  select count(*) into n from app.learning_evidence; assert n = 1, 'g1 vê só evidência do próprio filho'; passed := passed + 1;
  select count(*) into n from app.devices; assert n = 1, 'g1 vê só seu dispositivo'; passed := passed + 1;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', g2::text, true); execute 'set local role authenticated';
  select count(*) into n from app.students where id = s1; assert n = 0, 'g2 não vê aluno da família A'; passed := passed + 1;
  execute 'reset role';

  -- ===== 2. escola: matrícula + consentimento =====
  perform set_config('request.jwt.claim.sub', t1::text, true); execute 'set local role authenticated';
  select count(*) into n from app.students; assert n = 0, 'professor sem consentimento não vê aluno'; passed := passed + 1;
  select count(*) into n from app.learning_evidence; assert n = 0, 'nem evidências'; passed := passed + 1;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', g1::text, true); execute 'set local role authenticated';
  insert into app.consents(student_id,purpose,granted_by) values (s1,'share_progress_with_school',g1);
  begin insert into app.consents(student_id,purpose,granted_by) values (s2,'share_progress_with_school',g1); ok := false;
  exception when others then ok := true; end; assert ok, 'g1 não concede consentimento de aluno alheio'; passed := passed + 1;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', t1::text, true); execute 'set local role authenticated';
  select count(*) into n from app.students; assert n = 1, 'professor da turma vê aluno com consentimento'; passed := passed + 1;
  select count(*) into n from app.learning_evidence; assert n = 1, 'e evidências'; passed := passed + 1;
  select count(*) into n from app.wallet_transactions; assert n = 0, 'escola não vê carteira'; passed := passed + 1;
  select count(*) into n from app.devices; assert n = 0, 'escola não vê dispositivos pessoais'; passed := passed + 1;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', t2::text, true); execute 'set local role authenticated';
  select count(*) into n from app.students; assert n = 0, 'professor de OUTRA turma não vê'; passed := passed + 1;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', m1::text, true); execute 'set local role authenticated';
  select count(*) into n from app.students; assert n = 1, 'gestor da instituição vê'; passed := passed + 1;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', m2::text, true); execute 'set local role authenticated';
  select count(*) into n from app.students; assert n = 0, 'gestor de OUTRA instituição não vê'; passed := passed + 1;
  execute 'reset role';
  -- revogação encerra o acesso
  perform set_config('request.jwt.claim.sub', g1::text, true); execute 'set local role authenticated';
  update app.consents set revoked_at = now() where student_id = s1;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', t1::text, true); execute 'set local role authenticated';
  select count(*) into n from app.students; assert n = 0, 'revogação remove acesso da escola'; passed := passed + 1;
  execute 'reset role';

  -- ===== 3. escritas sensíveis negadas a usuários =====
  perform set_config('request.jwt.claim.sub', g1::text, true); execute 'set local role authenticated';
  begin insert into app.learning_evidence(student_id,skill_id,kind,correct) values (s1,sk1,'practice',true); ok := false;
  exception when insufficient_privilege then ok := true; end; assert ok, 'usuário não forja evidência'; passed := passed + 1;
  begin insert into app.wallet_transactions(wallet_id,currency,delta,reason,idempotency_key,prev_hash,hash) values (w1,'minutes',500,'x','k','','' ); ok := false;
  exception when insufficient_privilege then ok := true; end; assert ok, 'usuário não credita minutos'; passed := passed + 1;
  begin update app.profiles set role = 'super_admin' where id = g1; ok := false;
  exception when insufficient_privilege then ok := true; end; assert ok, 'sem escalada de papel'; passed := passed + 1;
  begin insert into app.devices(family_id,student_id,platform) values (famA,s1,'ios'); ok := false;
  exception when insufficient_privilege then ok := true; end; assert ok, 'dispositivo só entra via backend (pareamento)'; passed := passed + 1;
  select count(*) into n from app.audit_logs; assert n = 0, 'não-super não lê auditoria'; passed := passed + 1;
  -- comandos: só para dispositivos da própria família
  insert into app.remote_commands(id,device_id,issued_by,type,payload,nonce,signature,expires_at)
    values (cmd,devA,g1,'block_app','{"appId":"com.google.android.youtube"}','n1','sig',now()+interval '1 day');
  begin insert into app.remote_commands(id,device_id,issued_by,type,payload,nonce,signature,expires_at)
    values (gen_random_uuid(),devB,g1,'block_app','{}','n2','sig',now()+interval '1 day'); ok := false;
  exception when others then ok := true; end; assert ok, 'não comanda dispositivo de outra família'; passed := passed + 1;
  begin update app.remote_commands set status = 'block_applied' where id = cmd; ok := false;
  exception when insufficient_privilege then ok := true; end; assert ok, 'responsável não finge confirmação do dispositivo'; passed := passed + 1;
  -- criação de família
  begin perform app.create_family('Nova'); ok := true; exception when others then ok := false; end; assert ok, 'guardian cria família'; passed := passed + 1;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', t1::text, true); execute 'set local role authenticated';
  begin perform app.create_family('X'); ok := false; exception when others then ok := true; end; assert ok, 'professor não cria família'; passed := passed + 1;
  execute 'reset role';
  -- aluno não lê gabarito
  perform set_config('request.jwt.claim.sub', kid::text, true); execute 'set local role authenticated';
  select count(*) into n from app.questions; assert n = 0, 'aluno não lê banco de questões/gabaritos'; passed := passed + 1;
  select count(*) into n from app.students; assert n = 1, 'aluno vê a si mesmo'; passed := passed + 1;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', g1::text, true); execute 'set local role authenticated';
  select count(*) into n from app.questions; assert n = 1, 'responsável lê questões aprovadas'; passed := passed + 1;
  execute 'reset role';

  -- ===== 4. triggers/constraints (superusuário = backend) =====
  update app.remote_commands set status = 'received' where id = cmd; passed := passed + 1;
  begin update app.remote_commands set status = 'pending' where id = cmd; ok := false; exception when others then ok := true; end;
  assert ok, 'received→pending inválido'; passed := passed + 1;
  update app.remote_commands set status = 'block_applied' where id = cmd;
  select count(*) into n from app.command_events where command_id = cmd; assert n = 2, 'histórico de estados registrado'; passed := passed + 1;
  begin update app.remote_commands set status = 'received' where id = cmd; ok := false; exception when others then ok := true; end;
  assert ok, 'estado terminal imutável'; passed := passed + 1;

  insert into app.wallet_transactions(wallet_id,currency,delta,reason,idempotency_key,prev_hash,hash) values (w1,'minutes',30,'earn','k1','','');
  begin insert into app.wallet_transactions(wallet_id,currency,delta,reason,idempotency_key,prev_hash,hash) values (w1,'minutes',-31,'spend','k2','',''); ok := false;
  exception when others then ok := sqlerrm like 'insufficient%'; end; assert ok, 'saldo negativo bloqueado'; passed := passed + 1;
  begin insert into app.wallet_transactions(wallet_id,currency,delta,reason,idempotency_key,prev_hash,hash) values (w1,'minutes',30,'earn','k1','',''); ok := false;
  exception when unique_violation then ok := true; end; assert ok, 'idempotência por chave'; passed := passed + 1;
  insert into app.wallet_transactions(wallet_id,currency,delta,reason,idempotency_key,prev_hash,hash) values (w1,'minutes',-10,'spend','k3','','');
  select count(*) into n from app.wallet_transactions where length(hash) = 64 and prev_hash <> ''; assert n = 2, 'hash encadeado preenchido pelo banco'; passed := passed + 1;
  select balance into n from app.wallet_balances where wallet_id = w1 and currency = 'minutes'; assert n = 20, 'saldo = 20'; passed := passed + 1;
  begin update app.wallet_transactions set delta = 9999; ok := false; exception when others then ok := true; end; assert ok, 'carteira append-only (update)'; passed := passed + 1;
  begin delete from app.wallet_transactions; ok := false; exception when others then ok := true; end; assert ok, 'carteira append-only (delete)'; passed := passed + 1;

  insert into app.skill_prerequisites values (sk1, sk2);
  begin insert into app.skill_prerequisites values (sk2, sk1); ok := false; exception when others then ok := sqlerrm = 'prerequisite cycle'; end;
  assert ok, 'ciclo no grafo bloqueado'; passed := passed + 1;
  begin insert into app.skill_prerequisites values (sk1, sk1); ok := false; exception when others then ok := true; end; assert ok, 'autodependência bloqueada'; passed := passed + 1;

  begin insert into app.questions(skill_id,source_id,difficulty,statement,answer,justification,review_status) values (sk1,src,0.5,'?','1','j','approved'); ok := false;
  exception when check_violation then ok := true; end; assert ok, 'questão aprovada exige revisor'; passed := passed + 1;
  update app.questions set statement = '12 dividido por 3?' where id = q1;
  select count(*) into n from app.question_versions where question_id = q1; assert n = 1, 'versão anterior preservada'; passed := passed + 1;

  insert into app.audit_logs(actor,action,entity) values (su,'test','x');
  begin delete from app.audit_logs; ok := false; exception when others then ok := true; end; assert ok, 'auditoria append-only'; passed := passed + 1;

  -- exclusão de dados: apagar aluno remove evidências, carteira, dispositivos
  perform set_config('request.jwt.claim.sub', g1::text, true); execute 'set local role authenticated';
  delete from app.students where id = s1;
  execute 'reset role';
  select count(*) into n from app.learning_evidence where student_id = s1; assert n = 0, 'cascata de exclusão LGPD (evidências)'; passed := passed + 1;
  select count(*) into n from app.devices where student_id = s1; assert n = 0, 'cascata (dispositivos)'; passed := passed + 1;
  select count(*) into n from app.wallets where student_id = s1; assert n = 0, 'cascata (carteira)'; passed := passed + 1;

  raise notice 'RLS/DB: % verificações passaram', passed;
end $$;
