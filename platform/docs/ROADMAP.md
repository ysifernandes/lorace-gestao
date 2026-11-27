# Roadmap e status

Legenda: ✅ implementado+testado · 🟡 parcial · 📝 escrito, não validado · ⏳ pendente · ⛔ bloqueado (depende de terceiros)

## Fase 1 — Fundação
✅ ambiente inspecionado · ✅ docs · ✅ monorepo/tsconfig/vitest · ✅ migrations 0001–0005 · ✅ RLS/perfis/auditoria · ⛔ Supabase Auth real (credenciais) · ⏳ CI · ⏳ MFA
## Fase 2 — PoC controle parental
✅ protocolo/estados/offline/expiração/autorização (simulado) · 📝 Android Kotlin · 📝 iOS Swift · ⛔ validação em dispositivos reais · ⛔ entitlement Apple · ⛔ FCM/APNs · ⏳ perda de permissão nativa (lógica de relatório pronta no backend)
## Fase 3 — Interface: ✅ design system, 5 áreas navegáveis, 4 temas etários + adulto, responsivo · 🟡 acessibilidade (sem auditoria formal) · ⛔ referência visual ainda não recebida · ⏳ apps mobile nativos/React Native
## Fase 4 — Base pedagógica: ✅ esquema+grafo+fluxo editorial (UI admin)+seed · 🟡 25 habilidades/129 itens/35 equívocos (rascunho autoral) · ⏳ conferência BNCC e revisão profissional (humanas)
## Fase 5 — Diagnóstico: ✅ adaptativo regressivo, evidências, hipóteses por distratores, relatório com causas/confiança (testado em unidade e E2E) · ⏳ calibração com dados reais · ⏳ persistência via API/Supabase
## Fase 6 — Aprendizagem: ✅ jornada de matemática completa (diagnóstico → explicação → prática → reavaliação → evolução) · ✅ 9 tipos de atividade · ⏳ tutor IA · ⏳ revisão espaçada agendada na UI · ⏳ Português completo
## Fase 7 — Gamificação: 🟡 XP/níveis/carteira; ⏳ missões, conquistas, jogos
## Fase 8 — Integração parental: ✅ carteira→minutos com teto, ✅ solicitações de tempo (backend PoC + UI), ✅ UI de apps (simulada) · ⏳ expiração/acúmulo/janelas na UI
## Fase 9 — Escolas: ✅ mapa de aprendizagem, diagnóstico individual, plano de reforço aprovado pelo professor, gestão de turmas/matrícula, indicadores agregados com amostra mínima · ⏳ relatórios exportáveis · ⏳ licenças por aluno ativo (critério a definir)
## Fase 10 — Validação: 🟡 testes unitários/DB; ⏳ dispositivos, segurança externa, acessibilidade, testes com usuários

## Decisões/insumos necessários do responsável pelo projeto
1. Imagem de referência visual. 2. Contas/credenciais: Supabase, Firebase, Apple Developer, Google Play, provedor de IA. 3. Aparelhos físicos (≥1 Android, ≥1 iPhone de criança em Família + 1 de responsável). 4. Definição de "aluno ativo" e política de preços. 5. Parecer jurídico (LGPD/ECA Digital). 6. Docentes/pedagogos para curadoria BNCC (português e matemática, 7–12 anos). 7. Nome definitivo.
## Riscos: ver ARCHITECTURE.md §Riscos.

## Fase 2 do desenvolvimento (esta entrega) — resumo de status
✅ plataforma isolada em `platform/` (Loracê intocada) · ✅ marca central · ✅ web navegável + preview publicado · ✅ migration 0006 + seed + testes de segurança · ✅ backend endurecido (bloqueio de força bruta de pareamento, tokens em hash, revogação, registro, tempo extra) · 📝 nativo: persistência (EncryptedSharedPreferences), `SyncWorker`, FCM, canonicalização, testes de vetores (Kotlin) e `CommandSync` (Swift) — **escritos, não compilados** · ⛔ aparelhos, credenciais, parecer jurídico, curadoria BNCC.
