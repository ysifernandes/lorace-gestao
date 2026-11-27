import type { Skill } from './types';
const S = (id: string, subject: Skill['subject'], unit: string, name: string, description: string, prerequisites: string[], ageMin: number, ageMax: number, bnccLookup: string): Skill =>
  ({ id, subject, unit, name, description, prerequisites, ageMin, ageMax, bnccCode: null, bnccLookup });

// bnccCode = null em TODOS: nenhum código foi conferido no documento oficial ainda (ver docs/KNOWLEDGE_BASE.md §Verificação BNCC).
export const MATH_SKILLS: Skill[] = [
  S('add.facts', 'matematica', 'Adição e subtração', 'Adição: fatos básicos', 'Somar quantidades pequenas (até ~20) com fluência.', [], 5, 8, 'Números — adição e subtração, anos iniciais'),
  S('add.carry', 'matematica', 'Adição e subtração', 'Adição com reagrupamento', 'Somar números de 2 e 3 algarismos "levando" para a ordem seguinte.', ['add.facts'], 7, 10, 'Números — algoritmos da adição'),
  S('sub.facts', 'matematica', 'Adição e subtração', 'Subtração: fatos básicos', 'Tirar/comparar quantidades pequenas; relação inversa com a adição.', ['add.facts'], 5, 8, 'Números — adição e subtração, anos iniciais'),
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
  S('prob.multi', 'matematica', 'Resolução de problemas', 'Problemas de duas etapas', 'Resolver problemas que exigem duas operações em sequência.', ['prob.interpret', 'mul.facts', 'div.facts'], 8, 12, 'Números — resolução de problemas'),
  S('prob.frac', 'matematica', 'Resolução de problemas', 'Frações em situações reais', 'Usar frações em situações do cotidiano (parte de todo, fração de quantidade).', ['prob.interpret', 'frac.id'], 9, 12, 'Números — frações em problemas'),
];

export const PT_SKILLS: Skill[] = [
  S('pt.read.literal', 'portugues', 'Leitura', 'Localizar informação explícita', 'Encontrar no texto informações escritas.', [], 6, 10, 'Leitura — localizar informações explícitas'),
  S('pt.read.infer', 'portugues', 'Leitura', 'Inferir informação implícita', 'Concluir algo a partir de pistas do texto.', ['pt.read.literal'], 8, 12, 'Leitura — inferências'),
  S('pt.vocab.context', 'portugues', 'Léxico', 'Sentido da palavra no contexto', 'Deduzir o significado de palavras pelo contexto.', ['pt.read.literal'], 8, 12, 'Leitura — vocabulário e sentido das palavras'),
  S('pt.gram.agree', 'portugues', 'Gramática', 'Concordância nominal', 'Concordar artigo, substantivo e adjetivo em gênero e número.', [], 7, 11, 'Análise linguística — concordância'),
  S('pt.write.sentence', 'portugues', 'Escrita', 'Construir frases', 'Organizar palavras em frases com sentido.', ['pt.gram.agree'], 6, 10, 'Produção de texto — frases'),
  S('pt.spell.rules', 'portugues', 'Ortografia', 'Regularidades ortográficas', 'Aplicar regras como uso de "ss", "ç", "r/rr".', [], 7, 11, 'Análise linguística — ortografia'),
];
export const ALL_SKILLS: Skill[] = [...MATH_SKILLS, ...PT_SKILLS];
