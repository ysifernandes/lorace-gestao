\set ON_ERROR_STOP 1
do $$
declare n int; m int;
begin
  select count(*) into n from app.skills; assert n = 31, 'habilidades carregadas';
  select count(*) into n from app.skills where bncc_code is not null or bncc_verified; assert n = 0, 'nenhum código BNCC afirmado sem verificação';
  select count(*) into n from app.skill_prerequisites; assert n > 25, 'pré-requisitos carregados (trigger anti-ciclo ativo)';
  select count(*) into n from app.questions; assert n = 165, 'itens carregados';
  select count(*) into n from app.questions where review_status <> 'draft' or not needs_professional_review; assert n = 0, 'todo item começa em rascunho e exige revisão profissional';
  select count(*) into n from app.questions where source_id is null or hints = '[]'::jsonb; assert n = 0, 'fonte e dicas em todos os itens';
  select count(distinct kind) into n from app.questions; assert n = 9, 'todos os tipos de atividade presentes';
  select count(*) into n from app.misconceptions; assert n = 49, 'equívocos carregados';
  select count(*) into n from app.misconceptions m where not exists (select 1 from app.misconception_explanations e where e.misconception_id = m.id); assert n = 0, 'todo equívoco tem explicação';
  select count(*) into n from app.questions q join app.skills s on s.id = q.skill_id where s.slug = 'frac.add.diff' and 'add_num_and_den' = any(q.misconception_tags); assert n >= 3, 'itens sondam o equívoco 1/2+1/3=2/5';
  raise notice 'SEED: ok';
end $$;
