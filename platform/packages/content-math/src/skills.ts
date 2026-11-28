import type { Skill } from './types';
const S = (id: string, subject: Skill['subject'], unit: string, name: string, description: string, prerequisites: string[], ageMin: number, ageMax: number, bnccLookup: string): Skill =>
  ({ id, subject, unit, name, description, prerequisites, ageMin, ageMax, bnccCode: null, bnccLookup });

// bnccCode = null em TODOS: nenhum código foi conferido no documento oficial ainda (ver docs/KNOWLEDGE_BASE.md §Verificação BNCC).
export const MATH_SKILLS: Skill[] = [
  S('add.facts', 'matematica', 'Adição e subtração', 'Adição: fatos básicos', 'Somar quantidades pequenas (até ~20) com fluência.', ['num.count', 'num.order'], 5, 8, 'Números — adição e subtração, anos iniciais'),
  S('add.carry', 'matematica', 'Adição e subtração', 'Adição com reagrupamento', 'Somar números de 2 e 3 algarismos "levando" para a ordem seguinte.', ['add.facts'], 7, 10, 'Números — algoritmos da adição'),
  S('sub.facts', 'matematica', 'Adição e subtração', 'Subtração: fatos básicos', 'Tirar/comparar quantidades pequenas; relação inversa com a adição.', ['add.facts', 'num.compare'], 5, 8, 'Números — adição e subtração, anos iniciais'),
  S('sub.borrow', 'matematica', 'Adição e subtração', 'Subtração com reagrupamento', 'Subtrair números de 2 e 3 algarismos reagrupando (emprestar).', ['sub.facts', 'add.carry'], 7, 10, 'Números — algoritmos da subtração'),
  S('mul.facts', 'matematica', 'Multiplicação e divisão', 'Multiplicação: tabuada', 'Multiplicar como soma de parcelas iguais e memorizar fatos.', ['add.facts'], 7, 10, 'Números — multiplicação, significados e fatos básicos'),
  S('mul.multi', 'matematica', 'Multiplicação e divisão', 'Multiplicação com vários algarismos', 'Multiplicar números de 2–3 algarismos por 1 ou 2 algarismos.', ['mul.facts', 'add.carry'], 8, 11, 'Números — algoritmo da multiplicação'),
  S('div.facts', 'matematica', 'Multiplicação e divisão', 'Divisão exata', 'Dividir como repartição/medida e como inverso da multiplicação.', ['mul.facts', 'sub.facts'], 8, 10, 'Números — divisão, significados'),
  S('div.algorithm', 'matematica', 'Multiplicação e divisão', 'Divisão com resto', 'Efetuar divisões com resto e interpretar o resto.', ['div.facts', 'sub.borrow'], 9, 12, 'Números — algoritmo da divisão'),
  S('factors', 'matematica', 'Números e operações', 'Divisores e múltiplos', 'Distinguir divisores de múltiplos; achar divisores comuns.', ['div.facts', 'mul.facts'], 9, 12, 'Números — múltiplos e divisores'),
  S('frac.id', 'matematica', 'Frações', 'Identificar fração', 'Reconhecer numerador, denominador e fração como parte de um todo.', ['div.facts'], 7, 10, 'Números — frações, significado parte-todo'),
  S('frac.visual', 'matematica', 'Frações', 'Representar fração visualmente', 'Representar frações em barras, figuras e reta.', ['frac.id'], 7, 10, 'Números — frações, representações'),
  S('frac.compare', 'matematica', 'Frações', 'Comparar frações', 'Comparar e ordenar frações.', ['frac.visual'], 9, 12, 'Números — comparação de frações'),
  S('frac.equiv', 'matematica', 'Frações', 'Frações equivalentes', 'Reconhecer e gerar frações equivalentes.', ['frac.visual', 'mul.facts'], 9, 12, 'Números — frações equivalentes'),
  S('frac.simplify', 'matematica', 'Frações', 'Simplificar frações', 'Reduzir uma fração dividindo os termos por um divisor comum.', ['frac.equiv', 'factors'], 10, 13, 'Números — simplificação de frações'),
  S('frac.add.same', 'matematica', 'Frações', 'Adição de frações (mesmo denominador)', 'Somar frações com denominadores iguais.', ['frac.id', 'add.facts'], 9, 12, 'Números — operações com frações'),
  S('frac.add.diff', 'matematica', 'Frações', 'Adição de frações (denominadores diferentes)', 'Somar frações usando denominador comum.', ['frac.add.same', 'frac.equiv'], 10, 13, 'Números — operações com frações'),
  S('prob.interpret', 'matematica', 'Resolução de problemas', 'Interpretar problemas', 'Relacionar a situação descrita à operação adequada.', ['add.facts', 'sub.facts'], 6, 10, 'Números — resolução de problemas'),
  S('prob.multi', 'matematica', 'Resolução de problemas', 'Problemas de duas etapas', 'Resolver problemas que exigem duas operações em sequência.', ['prob.interpret', 'mul.facts', 'div.facts', 'meas.time', 'meas.money'], 8, 12, 'Números — resolução de problemas'),
  S('prob.frac', 'matematica', 'Resolução de problemas', 'Frações em situações reais', 'Usar frações em situações do cotidiano (parte de todo, fração de quantidade).', ['prob.interpret', 'frac.id'], 9, 12, 'Números — frações em problemas'),
  S('perc.of', 'matematica', 'Porcentagem e proporção', 'Porcentagem de um valor', 'Calcular quanto é uma porcentagem de uma quantidade (10%, 25%, 50%…).', ['frac.id', 'mul.facts', 'div.facts', 'dec.compare'], 10, 15, 'Números — porcentagem'),
  S('perc.change', 'matematica', 'Porcentagem e proporção', 'Desconto e acréscimo', 'Calcular preço final com desconto ou acréscimo percentual.', ['perc.of', 'sub.borrow', 'meas.money'], 11, 16, 'Números — porcentagem em situações de compra'),
  S('ratio.prop', 'matematica', 'Porcentagem e proporção', 'Razão e proporção', 'Resolver situações proporcionais (regra de três simples e divisão em partes).', ['frac.equiv', 'mul.facts', 'div.facts'], 11, 16, 'Números — grandezas proporcionais'),
  S('alg.eq1', 'matematica', 'Álgebra', 'Equação do 1º grau', 'Resolver equações do tipo ax ± b = c.', ['sub.borrow', 'div.facts', 'pat.seq', 'int.neg'], 12, 17, 'Álgebra — equações do 1º grau'),
  S('data.mean', 'matematica', 'Estatística', 'Média aritmética', 'Calcular e interpretar a média de um conjunto de dados.', ['add.carry', 'div.facts', 'dec.add'], 11, 16, 'Probabilidade e estatística — medidas de tendência central'),
  S('fin.interest', 'matematica', 'Educação financeira', 'Juros simples', 'Calcular juros simples e distinguir juros de montante.', ['perc.of', 'mul.multi', 'dec.add'], 13, 17, 'Números — educação financeira'),
  // ---- primeira infância (5–7) ----
  S('num.count', 'matematica', 'Números e contagem', 'Contar objetos', 'Contar quantidades até 12 tocando cada objeto uma vez e dizer quantos há.', [], 4, 7, 'Números — contagem de objetos, anos iniciais'),
  S('num.compare', 'matematica', 'Números e contagem', 'Comparar quantidades (maior/menor)', 'Dizer qual de dois números é maior ou menor.', ['num.count'], 5, 8, 'Números — comparação de números naturais'),
  S('num.order', 'matematica', 'Números e contagem', 'Antes, depois e entre', 'Dizer o número que vem antes, depois ou entre outros.', ['num.count'], 5, 8, 'Números — sequência numérica'),
  S('geo.shapes', 'matematica', 'Geometria', 'Formas geométricas planas', 'Reconhecer círculo, quadrado, triângulo e retângulo e contar seus lados.', [], 4, 8, 'Geometria — figuras planas'),
  S('pat.seq', 'matematica', 'Padrões', 'Padrões e sequências', 'Completar padrões de formas, cores e números.', ['num.count'], 5, 9, 'Álgebra — padrões e sequências'),
  // ---- medidas, decimais, negativos, geometria ----
  S('meas.time', 'matematica', 'Medidas', 'Tempo: horas e minutos', 'Relacionar horas e minutos e calcular duração e horário final.', ['add.facts'], 7, 11, 'Grandezas e medidas — tempo'),
  S('meas.money', 'matematica', 'Medidas', 'Dinheiro e troco', 'Somar preços, multiplicar quantidades e calcular troco.', ['add.facts', 'sub.facts'], 6, 10, 'Grandezas e medidas — sistema monetário'),
  S('dec.compare', 'matematica', 'Números decimais', 'Comparar decimais', 'Comparar números com vírgula (décimos e centésimos).', ['frac.id'], 9, 12, 'Números — números decimais'),
  S('dec.add', 'matematica', 'Números decimais', 'Adicionar decimais', 'Somar números decimais alinhando a vírgula.', ['dec.compare', 'add.carry'], 10, 13, 'Números — operações com decimais'),
  S('int.neg', 'matematica', 'Números inteiros', 'Números negativos', 'Comparar e operar com números negativos (reta numérica, temperatura).', ['sub.borrow'], 11, 15, 'Números — números inteiros'),
  S('geo.perim', 'matematica', 'Geometria', 'Perímetro', 'Calcular o contorno de retângulos e quadrados.', ['add.carry', 'geo.shapes'], 8, 12, 'Grandezas e medidas — perímetro'),
  S('geo.area', 'matematica', 'Geometria', 'Área', 'Calcular a área de retângulos, figuras compostas e triângulos.', ['mul.facts', 'geo.perim'], 9, 13, 'Grandezas e medidas — área'),
];

export const PT_SKILLS: Skill[] = [
  S('pt.read.literal', 'portugues', 'Leitura', 'Localizar informação explícita', 'Encontrar no texto informações escritas.', [], 6, 10, 'Leitura — localizar informações explícitas'),
  S('pt.read.infer', 'portugues', 'Leitura', 'Inferir informação implícita', 'Concluir algo a partir de pistas do texto.', ['pt.read.literal'], 8, 12, 'Leitura — inferências'),
  S('pt.vocab.context', 'portugues', 'Léxico', 'Sentido da palavra no contexto', 'Deduzir o significado de palavras pelo contexto.', ['pt.read.literal'], 8, 12, 'Leitura — vocabulário e sentido das palavras'),
  S('pt.gram.agree', 'portugues', 'Gramática', 'Concordância nominal', 'Concordar artigo, substantivo e adjetivo em gênero e número.', [], 7, 11, 'Análise linguística — concordância'),
  S('pt.write.sentence', 'portugues', 'Escrita', 'Construir frases', 'Organizar palavras em frases com sentido.', ['pt.gram.agree'], 6, 10, 'Produção de texto — frases'),
  S('pt.spell.rules', 'portugues', 'Ortografia', 'Regularidades ortográficas', 'Aplicar regras como uso de "ss", "ç", "r/rr".', [], 7, 11, 'Análise linguística — ortografia'),
  S('pt.letter.sound', 'portugues', 'Alfabetização', 'Letras e sons iniciais', 'Relacionar o primeiro som da palavra à letra.', [], 5, 8, 'Língua Portuguesa — alfabetização, consciência fonológica'),
  S('pt.syllable', 'portugues', 'Alfabetização', 'Sílabas', 'Separar palavras em sílabas e contá-las.', ['pt.letter.sound'], 6, 9, 'Língua Portuguesa — consciência silábica'),
  S('pt.rhyme', 'portugues', 'Alfabetização', 'Rimas', 'Reconhecer palavras que rimam.', ['pt.letter.sound'], 5, 9, 'Língua Portuguesa — consciência fonológica, rimas'),
  S('pt.verb.tense', 'portugues', 'Gramática', 'Passado, presente e futuro', 'Identificar o tempo do verbo na frase.', ['pt.write.sentence'], 8, 12, 'Análise linguística — tempos verbais'),
  S('pt.punct', 'portugues', 'Gramática', 'Pontuação', 'Escolher o sinal final e usar vírgula em listas.', ['pt.write.sentence'], 7, 12, 'Análise linguística — pontuação'),
  S('pt.synonym', 'portugues', 'Léxico', 'Sinônimos e antônimos', 'Reconhecer palavras de significado parecido ou oposto.', ['pt.vocab.context'], 8, 12, 'Análise linguística — relações de sentido entre palavras'),
];
export const ALL_SKILLS: Skill[] = [...MATH_SKILLS, ...PT_SKILLS];
