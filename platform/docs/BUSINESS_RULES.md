# Regras de negócio

- Planos (`plans`): gratuito limitado, individual, familiar, familiar ampliado; escolas por aluno ativo. **Preços = dados** (`price_cents` NULL até definidos pelo superadmin); nunca no código.
- Licença escolar: `licenses.seats` por período; contagem de "aluno ativo" (definição a fixar: ≥1 sessão no mês) — **pendente de decisão de produto**.
- Aluno em família e escola: histórico preservado; escola vê só com consentimento ativo; revogação é imediata.
- Controle parental opcional; emergência/comunicação essencial nunca condicionados a estudo.
- Minutos: taxa XP/min, teto diário, apps participantes, janelas e pausas definidos pelo responsável; saldo nunca negativo; operações idempotentes.
- Professor aprova/edita atividades sugeridas por IA para suas turmas.
- Exclusão de conta do aluno remove seus dados (cascata); trilha de auditoria permanece sem dados do aluno (a verificar com jurídico).
