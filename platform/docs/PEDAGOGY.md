# Pedagogia

Hierarquia: Matéria → Unidade → Conteúdo → Habilidade → Micro-habilidade → Pré-requisitos (tabelas `subjects/units/contents/skills/skill_prerequisites`; grafo acíclico garantido por trigger e por `KnowledgeGraph`).

Ciclo: avaliar → investigar → identificar → ensinar → demonstrar → praticar → aplicar em contextos novos → reavaliar → revisar (espaçada) → consolidar → avançar. Se o aluno persiste na dificuldade, **muda-se o método** (visual, história, jogo, passo a passo…).

Princípios: idade adapta linguagem/segurança/UX, **não** o nível pedagógico; nenhum rótulo depreciativo; sem diagnósticos médicos/psicológicos/de transtornos; uma resposta nunca define dificuldade; professor tem a decisão final.

Indicadores (cada um precisa de critério documentado, evidência mínima e confiança): domínio, retenção, autonomia, transferência, evolução, consistência, recuperação de lacunas, aplicação prática, dependência de dicas, compreensão conceitual. **Hoje só "domínio" (probabilidade+confiança) e sinais de hint_dependence/transfer/retention existem em código** (`mastery.ts`, `errors.ts`); os demais estão **pendentes**.

Conteúdo: NÃO existe ainda conteúdo pedagógico real no repositório. Os grafos nos testes são ilustrativos. Mapeamento BNCC exige curadoria com docentes (ver KNOWLEDGE_BASE.md).

## Aprendizagem por minigames (Fase 3)
Princípio: o aluno **faz** (corta pizza, monta troco, reparte cupcakes, monta frases, investiga palavras) em vez de só responder perguntas. Cada jogo tem objetivo pedagógico, habilidades do grafo e rodadas que alimentam o diagnóstico (evidência do tipo `game`, peso 0,8). Regras: sem vidas, sem relógio, sem punição; errar → mascote incentiva e mostra a justificativa; dica progressiva; a primeira tentativa vale como evidência e as seguintes são prática livre; estrelas premiam esforço e autonomia (nunca zero). Jogos: ver `apps/web/src/games/registry.ts` (objetivo e "como jogar" de cada um). Limites: conteúdo autoral em rascunho (revisão profissional pendente); dificuldade ainda não adapta por desempenho; falta o jogo de interpretação de texto.
