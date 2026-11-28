# Motor de IA e tutor (design — NÃO implementado)

- **Camada de provedor**: `LLMProvider` (chat, embeddings, moderação) com adaptadores; sem acoplamento a fornecedor. Chaves só no backend.
- **Ancoragem**: respostas de conteúdo usam apenas trechos de itens `approved` (RAG sobre o banco), com citação interna da fonte. Sem trecho → o tutor diz que não sabe e sugere perguntar ao professor/responsável.
- **Pedagogia do tutor**: dicas progressivas (3 níveis), não entrega resposta pronta, estimula raciocínio, adapta linguagem à faixa etária, usa interesses do aluno, registra uso de dicas como evidência (`hintsUsed`).
- **Segurança infantil**: moderação de entrada e saída; limites de tempo/turnos; recusa de temas fora do escopo escolar; sinais de risco (autoagressão, abuso, contato com estranhos) → resposta segura padronizada + notificação ao responsável; sem manipulação emocional ou incentivo a dependência; sem coleta de PII desnecessária.
- **Privacidade**: contexto enviado ao provedor é minimizado (sem nome/escola); **dados de crianças não são usados para treino** (contrato/configuração do provedor a verificar).
- **Custos**: orçamento por aluno/dia, cache de explicações aprovadas, monitoramento no painel do superadmin.
- **OCR/fotos**: pipeline assíncrono → extração de assuntos → mapeamento para habilidades → revisão pelo responsável/professor.
Pendências: escolha do provedor, avaliação de qualidade/segurança (red-teaming com especialistas), testes de moderação.

## Atualização — Tutor (Fase 3, arquitetura)
Implementado e **testado** em `packages/tutor` (sem provedor de IA): `moderateInput` (dados pessoais, risco de autoagressão, contato com estranhos, xingamentos, pedido de resposta pronta → dica; notifica responsável quando cabível), `nextHint` (escada de dicas que **nunca revela o gabarito**; ao esgotar, pede o raciocínio do aluno), `leaksAnswer` (guarda que bloqueia vazamento do gabarito mesmo se um provedor errar), `alternateExplanation` (muda de abordagem a cada rodada), `buildContext` (contexto mínimo: faixa etária, interesses, habilidade; sem nome/escola/e-mail), `toneFor` (linguagem por idade), `LLMProvider` + `UnavailableProvider` e `tutorReply` (moderação → regras → provedor, nessa ordem; o provedor nunca é chamado em risco).
**Indisponível (declarado na UI, nada simulado)**: conversa livre por texto/voz, criação de atividades novas validadas, ajuda com tarefas em linguagem natural, consulta a materiais autorizados via recuperação. **Depende de**: provedor de IA e contrato sem treino com dados de crianças, avaliação de segurança infantil (red-team), aprovação parental e parecer jurídico. A UI do tutor (`/s/tutor`) lista o que funciona (dicas, explicações alternativas, plano) e o que não.
