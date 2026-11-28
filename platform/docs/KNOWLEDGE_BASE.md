# Base de conhecimento pedagógico

Esquema (migration 0003): `knowledge_sources(kind, license obrigatória)`, `subjects/units/contents`, `skills(bncc_code validado por regex EFxxAAxx, age_min/max, review_status)`, `skill_prerequisites`, `questions(source_id obrigatório, justification obrigatória, review_status, revisor obrigatório para 'approved')`, `question_versions` (histórico automático ao alterar enunciado/gabarito).

Fluxo de revisão: `draft → in_review → approved | rejected → deprecated`. Somente `approved` é servido; aprovação exige `reviewed_by`+`reviewed_at` (CHECK no banco).

Fontes-alvo: BNCC, MEC, INEP/SAEB, IBGE Educa, REA com licença aberta (CC), materiais licenciados, literatura científica. **Proibido** copiar material protegido sem autorização; toda entrada registra fonte e licença.

IA e KB: a IA só gera *rascunhos* (status `draft`) e explicações **ancoradas em itens aprovados** (recuperação); nada vai ao aluno sem revisão humana quando for conteúdo novo.

Status: esquema e regras **testados**; carga de dados BNCC **pendente** (precisa de fonte oficial baixada, curadoria e revisão docente).

## Atualização — Fase 2
- **Conteúdo atual** (`packages/content-math`): 25 habilidades (19 de matemática, 6 de português) com pré-requisitos; 129 itens (gerados deterministicamente com gabarito calculado, ou autorais); 35 equívocos catalogados, cada um com ≥1 explicação (algumas com 2–3 abordagens). **Tudo é rascunho autoral que exige revisão profissional.** Português tem poucos itens (estrutura inicial).
- **BNCC**: `bnccCode` é `null` em todas as habilidades; o campo `bnccLookup` descreve o que conferir. **Nenhum código foi inventado ou escrito de memória.** Procedimento: (1) baixar a BNCC oficial (MEC); (2) localizar a habilidade; (3) registrar código + trecho + página; (4) marcar `bncc_verified = true` (o banco impede código sem verificação — `skills_bncc_requires_verification`); (5) revisão por docente.
- **Fluxo editorial** (`ContentCatalog`, migration 0006): cadastrar → editar (nova versão, volta a rascunho) → enviar para revisão → aprovar/rejeitar por **segundo avaliador** com nota → descontinuar. Auditoria append-only. "Aprovado sem revisão profissional" continua sinalizado (`needsProfessionalReview`).
- **Servir ao aluno**: só `approved`; em modo desenvolvimento (`DEV_ALLOW_DRAFT`) rascunhos são exibidos com aviso visível.
- Seed no Postgres: `pnpm seed:gen` gera `database/seed/0001_content.sql` a partir do pacote (fonte única) e `tests/db/seed.sql` valida.
