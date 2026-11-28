# Banco de dados

PostgreSQL (Supabase). Schema `app`. Migrations versionadas em `database/migrations` (aplicadas em ordem; **testadas** em Postgres 16 com `pnpm test:db`; em Supabase real, `auth.users`/`auth.uid()` existem nativamente — o teste usa um shim).
- 0001 identidade/família/instituição/turmas/matrículas/consentimentos/auditoria (append-only)
- 0002 dispositivos, pareamento (hash do código), apps gerenciados, regras, comandos (nonce único, trigger de transições, eventos), sync, sessões
- 0003 KB pedagógica (fontes+licença, habilidades BNCC, pré-requisitos sem ciclo, questões com revisão e versões)
- 0004 avaliações, evidências, padrões de erro, diagnósticos, planos, revisões, missões/conquistas/jogos, carteira (append-only, hash, saldo ≥ 0), planos comerciais (preço NULL até o superadmin definir), assinaturas, licenças
- 0005 RLS + funções auxiliares + privilégios

Cobertura das 40 entidades pedidas: presentes, exceto **Permissões granulares** (hoje: papéis + vínculo; tabela própria pendente), **Saldo de entretenimento** (derivado de `wallet_balances`), **Atividades** (`plan_activities`/`missions`; atividades autorais de professor pendentes) e **Jogos** (catálogo mínimo).
Índices: pelas consultas previstas (aluno/habilidade/tempo, dispositivo/status, família). Revisar com `EXPLAIN` sob carga real (pendente).
Retenção/exclusão: `delete from students` apaga em cascata evidências, carteira, dispositivos (testado). Política de retenção por prazo: pendente (job).
