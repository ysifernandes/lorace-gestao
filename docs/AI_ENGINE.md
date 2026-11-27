# Motor de IA e tutor (design — NÃO implementado)

- **Camada de provedor**: `LLMProvider` (chat, embeddings, moderação) com adaptadores; sem acoplamento a fornecedor. Chaves só no backend.
- **Ancoragem**: respostas de conteúdo usam apenas trechos de itens `approved` (RAG sobre o banco), com citação interna da fonte. Sem trecho → o tutor diz que não sabe e sugere perguntar ao professor/responsável.
- **Pedagogia do tutor**: dicas progressivas (3 níveis), não entrega resposta pronta, estimula raciocínio, adapta linguagem à faixa etária, usa interesses do aluno, registra uso de dicas como evidência (`hintsUsed`).
- **Segurança infantil**: moderação de entrada e saída; limites de tempo/turnos; recusa de temas fora do escopo escolar; sinais de risco (autoagressão, abuso, contato com estranhos) → resposta segura padronizada + notificação ao responsável; sem manipulação emocional ou incentivo a dependência; sem coleta de PII desnecessária.
- **Privacidade**: contexto enviado ao provedor é minimizado (sem nome/escola); **dados de crianças não são usados para treino** (contrato/configuração do provedor a verificar).
- **Custos**: orçamento por aluno/dia, cache de explicações aprovadas, monitoramento no painel do superadmin.
- **OCR/fotos**: pipeline assíncrono → extração de assuntos → mapeamento para habilidades → revisão pelo responsável/professor.
Pendências: escolha do provedor, avaliação de qualidade/segurança (red-teaming com especialistas), testes de moderação.
