\set ON_ERROR_STOP 1
do $$
declare
  g1 uuid := '10000000-0000-4000-8000-000000000001'; g2 uuid := '10000000-0000-4000-8000-000000000002';
  kid uuid := '10000000-0000-4000-8000-000000000041'; t1 uuid := '10000000-0000-4000-8000-000000000011';
  su uuid := '10000000-0000-4000-8000-000000000031'; rv uuid := '10000000-0000-4000-8000-000000000032';
  famA uuid; famB uuid; inst uuid; c1 uuid; s1 uuid; s2 uuid; devA uuid; w2 uuid; src uuid; sk uuid; q uuid; tr uuid; n int; ok boolean; p int := 0;
begin
  insert into auth.users select unnest(array[g1,g2,kid,t1,su,rv]);
  insert into app.profiles(id,role,full_name) values (g1,'guardian','G1'),(g2,'guardian','G2'),(kid,'student','Kid'),(t1,'teacher','T1'),(su,'super_admin','SU'),(rv,'super_admin','RV');
  insert into app.families(name) values ('A') returning id into famA; insert into app.families(name) values ('B') returning id into famB;
  insert into app.family_members values (famA,g1,'guardian'),(famB,g2,'guardian');
  insert into app.institutions(name) values ('X') returning id into inst; insert into app.institution_members values (inst,t1,'teacher');
  insert into app.classes(institution_id,name,school_year) values (inst,'5A',2026) returning id into c1; insert into app.class_teachers values (c1,t1);
  insert into app.students(family_id,profile_id,display_name) values (famA,kid,'A') returning id into s1;
  insert into app.students(family_id,display_name) values (famB,'B') returning id into s2;
  insert into app.enrollments(student_id,class_id,institution_id) values (s1,c1,inst);
  insert into app.devices(family_id,student_id,platform) values (famA,s1,'android') returning id into devA;
  insert into app.wallets(student_id) values (s2) returning id into w2;
  insert into app.reports(student_id,period,content) values (s1,'[2026-01-01,2026-02-01)','{}');
  insert into app.plans(id,name,audience,price_cents,active) values ('fam','Família','family',null,true);

  -- 1. nenhuma tabela do schema app sem RLS
  select count(*) into n from pg_class c join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname='app' and c.relkind='r' and not c.relrowsecurity;
  assert n = 0, 'toda tabela deve ter RLS'; p := p + 1;
  -- 2. anon sem acesso
  execute 'set local role anon';
  begin perform count(*) from app.students; ok := false; exception when insufficient_privilege then ok := true; end; assert ok, 'anon não lê alunos'; p := p + 1;
  begin perform app.create_family('x'); ok := false; exception when insufficient_privilege then ok := true; end; assert ok, 'anon não cria família'; p := p + 1;
  execute 'reset role';
  -- 3. solicitações de tempo
  perform t.login(kid);
  insert into app.time_requests(student_id,minutes,reason) values (s1,15,'terminar o jogo') returning id into tr;
  begin insert into app.time_requests(student_id,minutes) values (s2,15); ok := false; exception when others then ok := true; end; assert ok, 'aluno não pede em nome de outro'; p := p + 1;
  begin insert into app.time_requests(student_id,minutes) values (s1,9999); ok := false; exception when check_violation then ok := true; end; assert ok, 'limite de minutos'; p := p + 1;
  update app.time_requests set status='approved', decided_by=kid where id=tr; get diagnostics n = row_count; assert n = 0, 'aluno não aprova o próprio pedido'; p := p + 1;
  perform t.logout();
  perform t.login(g2); select count(*) into n from app.time_requests; assert n = 0, 'outra família não vê pedidos'; p := p + 1;
  update app.time_requests set status='approved', decided_by=g2 where id=tr; get diagnostics n = row_count; assert n = 0, 'outra família não decide'; p := p + 1; perform t.logout();
  perform t.login(g1);
  begin update app.time_requests set status='approved', decided_by=g2 where id=tr; ok := false; exception when others then ok := true; end; assert ok, 'não decide em nome de outro responsável'; p := p + 1;
  update app.time_requests set status='approved', decided_by=g1, decided_at=now() where id=tr; get diagnostics n = row_count; assert n = 1, 'responsável decide'; p := p + 1;
  -- 4. responsável não move aluno para outra família, nem altera preços
  begin update app.students set family_id = famB where id = s1; ok := false; exception when others then ok := true; end; assert ok, 'sem mover aluno para outra família'; p := p + 1;
  update app.plans set price_cents = 1; get diagnostics n = row_count; assert n = 0, 'responsável não altera preços'; p := p + 1;
  select count(*) into n from app.wallets; assert n = 0, 'não vê carteira alheia'; p := p + 1;
  perform t.logout();
  -- 5. relatórios: escola só com consentimento
  perform t.login(t1); select count(*) into n from app.reports; assert n = 0, 'professor sem consentimento não vê relatório'; p := p + 1; perform t.logout();
  insert into app.consents(student_id,purpose,granted_by) values (s1,'share_progress_with_school',g1);
  perform t.login(t1); select count(*) into n from app.reports; assert n = 1, 'com consentimento vê'; p := p + 1;
  begin delete from app.students where id = s1; get diagnostics n = row_count; ok := n = 0; exception when others then ok := true; end; assert ok, 'professor não apaga aluno'; p := p + 1;
  update app.consents set revoked_at = now(); get diagnostics n = row_count; assert n = 0, 'professor não altera consentimento'; p := p + 1; perform t.logout();
  -- 6. dispositivo revogado não recebe comando
  update app.devices set revoked_at = now() where id = devA;
  perform t.login(g1);
  begin insert into app.remote_commands(id,device_id,issued_by,type,payload,nonce,signature,expires_at) values (gen_random_uuid(),devA,g1,'block_app','{}','nx','s',now()+interval '1 hour'); ok := false; exception when others then ok := true; end; assert ok, 'dispositivo revogado'; p := p + 1;
  perform t.logout(); update app.devices set revoked_at = null where id = devA; perform t.login(g1);
  insert into app.remote_commands(id,device_id,issued_by,type,payload,nonce,signature,expires_at) values (gen_random_uuid(),devA,g1,'block_app','{}','n1','s',now()+interval '1 hour');
  begin insert into app.remote_commands(id,device_id,issued_by,type,payload,nonce,signature,expires_at) values (gen_random_uuid(),devA,g1,'block_app','{}','n1','s',now()+interval '1 hour'); ok := false; exception when unique_violation then ok := true; end; assert ok, 'nonce repetido (replay)'; p := p + 1;
  begin insert into app.remote_commands(id,device_id,issued_by,type,payload,nonce,signature,expires_at) values (gen_random_uuid(),devA,g1,'block_app','{}','n2','s',now()+interval '30 days'); ok := false; exception when check_violation then ok := true; end; assert ok, 'TTL máximo do comando'; p := p + 1;
  perform t.logout();
  -- 7. pareamento de uso único e com validade
  insert into app.device_pairings(code_hash,family_id,student_id,expires_at) values (decode('aa','hex'),famA,s1,now()+interval '10 minutes'), (decode('bb','hex'),famA,s1,now()-interval '1 minute');
  update app.device_pairings set used_at = now() where code_hash = decode('aa','hex');
  begin update app.device_pairings set used_at = now() where code_hash = decode('aa','hex'); ok := false; exception when others then ok := sqlerrm like '%already used%'; end; assert ok, 'código usado não reutiliza'; p := p + 1;
  begin update app.device_pairings set used_at = now() where code_hash = decode('bb','hex'); ok := false; exception when others then ok := sqlerrm like '%expired%'; end; assert ok, 'código expirado'; p := p + 1;
  perform t.login(g1); select count(*) into n from app.device_pairings; assert n = 0, 'responsável não lê códigos/hashes'; p := p + 1; perform t.logout();
  -- 8. conteúdo: BNCC só verificado; quatro olhos na aprovação
  insert into app.knowledge_sources(name,kind,license) values ('s','authored','l') returning id into src;
  insert into app.units(subject_id,name) select 'x','y' where false; insert into app.subjects values ('m','M'); insert into app.units(subject_id,name) values ('m','U');
  insert into app.contents(unit_id,name) select id,'C' from app.units;
  begin insert into app.skills(content_id,name,bncc_code,bncc_verified) select id,'k','EF05MA03',false from app.contents; ok := false; exception when check_violation then ok := true; end; assert ok, 'código BNCC exige verificação'; p := p + 1;
  insert into app.skills(content_id,name) select id,'k' from app.contents returning id into sk;
  insert into app.questions(skill_id,source_id,difficulty,statement,answer,justification,last_editor) values (sk,src,0.5,'?','1','j',su) returning id into q;
  update app.questions set review_status='in_review' where id=q;
  begin update app.questions set review_status='approved', reviewed_by=su, reviewed_at=now() where id=q; ok := false; exception when others then ok := sqlerrm like '%different from the last editor%'; end; assert ok, 'autor não aprova'; p := p + 1;
  update app.questions set review_status='approved', reviewed_by=rv, reviewed_at=now() where id=q;
  select count(*) into n from app.content_audit where entity_id=q::text; assert n = 2, 'auditoria editorial'; p := p + 1;
  begin delete from app.content_audit; ok := false; exception when others then ok := true; end; assert ok, 'auditoria editorial append-only'; p := p + 1;
  -- 8b. superadmin não lê dados de crianças (minimização)
  perform t.login(su);
  select count(*) into n from app.students; assert n = 0, 'superadmin não lê alunos'; p := p + 1;
  select count(*) into n from app.wallets; assert n = 0, 'superadmin não lê carteiras'; p := p + 1;
  select count(*) into n from app.devices; assert n = 0, 'superadmin não lê dispositivos'; p := p + 1;
  select count(*) into n from app.consents; assert n = 0, 'superadmin não lê consentimentos'; p := p + 1;
  select count(*) into n from app.skills; assert n >= 1, 'superadmin gerencia conteúdo'; p := p + 1;
  perform t.logout();
  -- 9. exclusão em cascata
  perform t.login(g1); delete from app.students where id = s1; perform t.logout();
  select count(*) into n from app.reports where student_id = s1; assert n = 0, 'exclusão remove relatórios'; p := p + 1;
  select count(*) into n from app.time_requests where student_id = s1; assert n = 0, 'exclusão remove pedidos'; p := p + 1;
  select count(*) into n from app.devices where student_id = s1; assert n = 0, 'exclusão remove dispositivos'; p := p + 1;
  raise notice 'SECURITY: % verificações passaram', p;
end $$;
