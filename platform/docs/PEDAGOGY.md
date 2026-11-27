# Pedagogia

Hierarquia: Matéria → Unidade → Conteúdo → Habilidade → Micro-habilidade → Pré-requisitos (tabelas `subjects/units/contents/skills/skill_prerequisites`; grafo acíclico garantido por trigger e por `KnowledgeGraph`).

Ciclo: avaliar → investigar → identificar → ensinar → demonstrar → praticar → aplicar em contextos novos → reavaliar → revisar (espaçada) → consolidar → avançar. Se o aluno persiste na dificuldade, **muda-se o método** (visual, história, jogo, passo a passo…).

Princípios: idade adapta linguagem/segurança/UX, **não** o nível pedagógico; nenhum rótulo depreciativo; sem diagnósticos médicos/psicológicos/de transtornos; uma resposta nunca define dificuldade; professor tem a decisão final.

Indicadores (cada um precisa de critério documentado, evidência mínima e confiança): domínio, retenção, autonomia, transferência, evolução, consistência, recuperação de lacunas, aplicação prática, dependência de dicas, compreensão conceitual. **Hoje só "domínio" (probabilidade+confiança) e sinais de hint_dependence/transfer/retention existem em código** (`mastery.ts`, `errors.ts`); os demais estão **pendentes**.

Conteúdo: NÃO existe ainda conteúdo pedagógico real no repositório. Os grafos nos testes são ilustrativos. Mapeamento BNCC exige curadoria com docentes (ver KNOWLEDGE_BASE.md).

## Aprendizagem por minigames (Fase 3)
Princípio: o aluno **faz** (corta pizza, monta troco, reparte cupcakes, monta frases, investiga palavras) em vez de só responder perguntas. Cada jogo tem objetivo pedagógico, habilidades do grafo e rodadas que alimentam o diagnóstico (evidência do tipo `game`, peso 0,8). Regras: sem vidas, sem relógio, sem punição; errar → mascote incentiva e mostra a justificativa; dica progressiva; a primeira tentativa vale como evidência e as seguintes são prática livre; estrelas premiam esforço e autonomia (nunca zero). Jogos: ver `apps/web/src/games/registry.ts` (objetivo e "como jogar" de cada um). Limites: conteúdo autoral em rascunho (revisão profissional pendente); dificuldade ainda não adapta por desempenho; falta o jogo de interpretação de texto.

## Personalização por faixa etária (Fase 3.2) — três camadas
1. **Motor pedagógico** (independe da idade): o nível vem do diagnóstico por habilidade. 2. **Mecânica** do jogo (cortar fatia, montar troco, digitar senha) reutilizável. 3. **Pele**: visual, tom, papel do mascote, tema dos problemas e catálogo de jogos por faixa.
- **Idade**: informada pelo **responsável** (ano de nascimento) e recalculada a cada ano; a criança não altera. **Maturidade** (mais tranquilo / recomendado / mais desafiador) move **uma** faixa (`bandOf`) com travas: 14–17 exige ≥ 13 anos; 5–7 só até 9 anos. O responsável vê e ajusta em "Perfil de aprendizagem".
- **Cadastro inicial do aluno** (`/s/comecar`): até 3 interesses (viram o tema dos problemas) e estilo; 5–7 anos: botões grandes e leitura em voz alta, sem a pergunta de estilo.
- **Diagnóstico por idade** (`targetIds`): só mira habilidades com `ageMin ≤ idade + 1`; o adaptativo desce aos pré-requisitos quando precisa.
- **Conteúdo 11–17** (novo): porcentagem, desconto/acréscimo, razão e proporção, equação do 1º grau, média e juros simples (6 habilidades, 36 itens com gabarito calculado, 14 equívocos com explicações). Rascunho autoral; BNCC não verificada.
- **Jogos por faixa** (`registry.ts`): 5–7 Pizzaria e Mercado (visuais); 8–10 os 5 jogos infantis; 11–13 Detetive, Frases + Finanças, Escape Room, Placar; 14–17 só Finanças, Escape Room, Placar, com **"treino de base"** (os jogos de base com nome e tom adultos, ex.: "Frações na prática"). Adolescentes veem assistente discreto, sem mascote grande, tom direto, gráficos em vez de desenhos e sem confete infantil.
- **Interesses**: `CTX` troca métrica, tema e objeto de compra (futebol → gols; música → mil reproduções; tecnologia → teclado…) sem mudar a matemática.
Pendente: jogos específicos de 5–7 com áudio gravado e sem leitura; mecânicas novas de estratégia (gestão de cidade) e de dados reais; planejador de estudos e simulados para 14–17; validação com crianças e adolescentes reais de cada faixa; revisão profissional do conteúdo.
