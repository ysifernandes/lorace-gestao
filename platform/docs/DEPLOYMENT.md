# Implantação (plano)

Ambientes: dev (local + Postgres) · staging · prod. Supabase por ambiente; migrations via CLI na CI. Backend em container (região BR para residência de dados, a confirmar). Segredos em cofre; `.env.example` é o contrato. CI: install → typecheck → test → test:db (service Postgres) → build.
Pré-requisitos externos (nenhum atendido ainda): projeto Supabase · Firebase (FCM) · conta Apple Developer + solicitação do entitlement Family Controls (prazo imprevisível) · Play Console + formulário de AccessibilityService · provedor de IA · domínio/e-mail · Sentry/monitoramento.
Custos a orçar: Supabase (plano pago, backup/PITR), hospedagem, IA por token, OCR, armazenamento, push (gratuito), contas de loja, monitoramento, jurídico, revisão pedagógica.
Status: **nada implantado**.
