# Motor de diagnóstico

**Implementação**: `packages/pedagogy/src/{mastery,diagnostic,errors}.ts` · testes em `packages/pedagogy/test`.

## Estimador de domínio (por habilidade)
Beta-Bernoulli ponderado, prior uniforme (a=b=1). Cada evidência soma peso `w = peso_do_tipo × 0,5^(idade_dias/90)`:
tipos: diagnostic/practice 1,0 · game 0,8 · transfer 1,5 · delayed_review 1,5. Acerto com dicas: `w × max(0,3; 1−0,25·dicas)`. Erro: `w`.
`probabilidade = a/(a+b)`; `confiança = n/(n+4)` (n = peso efetivo). Estados:
- `insufficient_evidence`: < 3 evidências ou confiança < 0,4 → **nunca** é dificuldade definitiva.
- `consolidated`: p ≥ 0,8 e confiança ≥ 0,5 · `needs_support`: p < 0,5 · senão `developing`.
**Validação pendente**: limiares e pesos são hipóteses; calibrar com dados reais, comparar com avaliação docente; documentar intervalos de confiança antes de exibir percentuais. Não exibir "x%" como diagnóstico sem confiança e evidência.

## Avaliação adaptativa (`nextItem`)
1. Habilidade-alvo suspeita (≥2 evidências e p<0,5) → investiga pré-requisitos, do mais próximo ao mais distante.
2. Senão coleta evidência nos alvos com menos dados. Dificuldade do item ≈ `0,2+0,6·p` (sobe com acertos, desce com erros). Itens não se repetem; termina com ≥3 evidências por habilidade ou sem itens.

## Análise de erros
Categorias: conceitual, procedimental, interpretação de texto, pré-requisito ausente, aplicação prática, retenção, ocasional, dependência de dicas, transferência.
Hipóteses: nascem `suspected` (a resposta original = 1 apoio). Sondagens: `consistent` +1 apoio / `inconsistent` +1 contra. `confirmed` se apoio ≥ 2 e 0 contra; `discarded` se contra > apoio. Exemplo implementado: 1/2+1/3=2/5 ⇒ "somou numeradores e denominadores".
Padrões por evidência: ocasional (1 erro entre ≥4), dependência de dicas (≥50% dos acertos com ≥2 dicas), transferência (acerta prática, erra ≥2 transferências), retenção (erra revisão tardia após acerto).
Limites: nenhum rótulo clínico; detectores de equívocos são escritos por habilidade e **precisam de curadoria pedagógica** (só 1 existe).
