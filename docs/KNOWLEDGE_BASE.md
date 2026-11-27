# Base de conhecimento pedagógico

Esquema (migration 0003): `knowledge_sources(kind, license obrigatória)`, `subjects/units/contents`, `skills(bncc_code validado por regex EFxxAAxx, age_min/max, review_status)`, `skill_prerequisites`, `questions(source_id obrigatório, justification obrigatória, review_status, revisor obrigatório para 'approved')`, `question_versions` (histórico automático ao alterar enunciado/gabarito).

Fluxo de revisão: `draft → in_review → approved | rejected → deprecated`. Somente `approved` é servido; aprovação exige `reviewed_by`+`reviewed_at` (CHECK no banco).

Fontes-alvo: BNCC, MEC, INEP/SAEB, IBGE Educa, REA com licença aberta (CC), materiais licenciados, literatura científica. **Proibido** copiar material protegido sem autorização; toda entrada registra fonte e licença.

IA e KB: a IA só gera *rascunhos* (status `draft`) e explicações **ancoradas em itens aprovados** (recuperação); nada vai ao aluno sem revisão humana quando for conteúdo novo.

Status: esquema e regras **testados**; carga de dados BNCC **pendente** (precisa de fonte oficial baixada, curadoria e revisão docente).
