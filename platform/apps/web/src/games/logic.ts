// Lógica PURA dos minigames: gera rodadas determinísticas (por semente) e o item pedagógico de cada rodada.
// Cada rodada vira um Item sintético corrigido pelo MESMO motor (gradeItem/recordResponse) → evidências, equívocos e diagnóstico.
// Conteúdo autoral em rascunho (revisão profissional pendente), como o restante do banco.
import { makeItem, mulberry32, ri, shuffle, type Item } from '@edu/content-math';

export type GameId = 'contagem' | 'sons' | 'formas' | 'pizzaria' | 'mercado' | 'laboratorio' | 'frases' | 'detetive' | 'financas' | 'escape' | 'placar';
export interface Round<V> { item: Item; view: V }
const SRC = { kind: 'authored' as const, reference: 'Rodada de minigame gerada deterministicamente pelo projeto; gabarito calculado por código', license: 'Autoral do projeto (licença final a definir)' };
const base = (id: string, skillId: string, difficulty: number, statement: string, hints: string[], justification: string) => ({ id, skillId, difficulty, statement, hints, justification, source: { ...SRC }, review: { status: 'draft' as const, needsProfessionalReview: true, version: 1 } });
const fill = (id: string, skillId: string, d: number, statement: string, answer: number, wrong: [number, string][], hints: string[], why: string): Item => ({ ...base(id, skillId, d, statement, hints, why), kind: 'fill_in', accepted: [String(answer)], wrongPatterns: wrong.filter(([a]) => a !== answer && a >= 0).map(([a, m]) => ({ answer: String(a), misconception: m })), inputHint: 'número' });
const mc = (id: string, skillId: string, d: number, statement: string, correct: string, distractors: [string, string?][], hints: string[], why: string, r: () => number): Item => {
  const opts = shuffle(r, [{ text: correct, ok: true, tag: undefined as string | undefined }, ...distractors.map(([text, tag]) => ({ text, ok: false, tag }))]); const ids = ['a', 'b', 'c', 'd'];
  return { ...base(id, skillId, d, statement, hints, why), kind: 'multiple_choice', options: opts.map((o, i) => ({ id: ids[i]!, text: o.text, ...(o.tag ? { misconception: o.tag } : {}) })), correct: ids[opts.findIndex((o) => o.ok)]! };
};

const pick = <T,>(r: () => number, xs: T[]): T => xs[ri(r, 0, xs.length - 1)]!;
// ---------------- Pizzaria das Frações ----------------
export type PizzaView = { type: 'build'; den: number; target: number; order: string } | { type: 'identify'; den: number; eaten: number } | { type: 'compare'; a: number; b: number };
export function pizzaRounds(seed = 1): Round<PizzaView>[] {
  const r = mulberry32(seed * 7919 + 11); const id = (n: number) => `game.pizza.${seed}.${n}`; const out: Round<PizzaView>[] = [];
  const d1 = [4, 6][ri(r, 0, 1)]!; let n1 = ri(r, 1, d1 - 1); while (n1 * 2 === d1) n1 = ri(r, 1, d1 - 1); // evita metade: contar as fatias que sobram daria o mesmo número
  out.push({ view: { type: 'build', den: d1, target: n1, order: `${n1}/${d1} de pizza` }, item: { ...base(id(1), 'frac.visual', 0.3, `Pedido: ${n1}/${d1} de pizza`, [`A pizza tem ${d1} fatias iguais.`, `Entregue ${n1} fatia(s).`], `${n1}/${d1} = ${n1} fatia(s) de ${d1}`), kind: 'fraction_visual', den: d1, targetNum: n1, wrongPatterns: [{ shaded: d1 - n1, misconception: 'count_unshaded' }] } });
  const d2 = [6, 8][ri(r, 0, 1)]!;
  out.push({ view: { type: 'build', den: d2, target: d2 / 2, order: 'metade da pizza' }, item: { ...base(id(2), 'frac.equiv', 0.45, 'Pedido: metade da pizza', [`Metade é 1/2. A pizza tem ${d2} fatias.`, `Quantas fatias formam 1/2 de ${d2}?`], `1/2 = ${d2 / 2}/${d2}`), kind: 'fraction_visual', den: d2, targetNum: d2 / 2 } });
  const a = ri(r, 1, 3), b = ri(r, 1, 3), d3 = 8;
  out.push({ view: { type: 'build', den: d3, target: a + b, order: `${a}/${d3} + ${b}/${d3}` }, item: { ...base(id(3), 'frac.add.same', 0.5, `Dois clientes pediram ${a}/${d3} e ${b}/${d3}. Quantas fatias no total?`, ['As fatias têm o mesmo tamanho: some as fatias.', `${a} + ${b} fatias de ${d3}.`], `${a}/${d3} + ${b}/${d3} = ${a + b}/${d3}`), kind: 'fraction_visual', den: d3, targetNum: a + b } });
  const d4 = [8, 10][ri(r, 0, 1)]!, e = ri(r, 2, d4 - 3), left = d4 - e;
  out.push({ view: { type: 'identify', den: d4, eaten: e }, item: mc(id(4), 'frac.id', 0.5, 'Que fração da pizza sobrou?', `${left}/${d4}`, [[`${e}/${d4}`, 'count_unshaded'], [`${d4}/${left}`, 'swap_num_den'], [`${left}/${e}`, 'part_to_part']], ['Conte as fatias que ainda estão na pizza.', 'O total de fatias é o denominador.'], `${left} fatias sobraram de ${d4}: ${left}/${d4}`, r) });
  const x = ri(r, 2, 4), y = x + ri(r, 1, 3);
  out.push({ view: { type: 'compare', a: x, b: y }, item: mc(id(5), 'frac.compare', 0.6, 'Qual cliente comeu mais pizza?', `1/${x} da pizza`, [[`1/${y} da pizza`, 'bigger_denominator_bigger'], ['Os dois comeram igual'], ['Não dá para saber']], ['Imagine duas pizzas iguais, uma cortada em mais fatias.', 'Quanto mais fatias, menores elas são.'], `1/${x} > 1/${y}`, r) });
  return out;
}

// ---------------- Mercado Virtual ----------------
export const PRODUCTS = [{ e: '🍎', n: 'Maçã', p: 3 }, { e: '🥛', n: 'Leite', p: 5 }, { e: '🍞', n: 'Pão', p: 4 }, { e: '🧀', n: 'Queijo', p: 8 }, { e: '🍌', n: 'Banana', p: 2 }, { e: '🍪', n: 'Biscoito', p: 6 }, { e: '🍫', n: 'Chocolate', p: 7 }, { e: '🧃', n: 'Suco', p: 9 }] as const;
export type Prod = (typeof PRODUCTS)[number];
export type MarketView = { type: 'total'; items: { prod: Prod; qty: number }[]; total: number } | { type: 'change'; items: { prod: Prod; qty: number }[]; total: number; paid: number; change: number };
export const BILLS = [1, 2, 5, 10, 20] as const;
export function marketRounds(seed = 1): Round<MarketView>[] {
  const r = mulberry32(seed * 104729 + 3); const id = (n: number) => `game.market.${seed}.${n}`; const pick = () => PRODUCTS[ri(r, 0, PRODUCTS.length - 1)]!; const out: Round<MarketView>[] = [];
  const p1 = pick(); let p2 = pick(); while (p2 === p1) p2 = pick(); const t1 = p1.p + p2.p;
  out.push({ view: { type: 'total', items: [{ prod: p1, qty: 1 }, { prod: p2, qty: 1 }], total: t1 }, item: fill(id(1), 'add.facts', 0.3, `Compra: ${p1.n} R$ ${p1.p} + ${p2.n} R$ ${p2.p}. Quanto é o total?`, t1, [[t1 + 1, 'off_by_one'], [t1 - 1, 'off_by_one']], ['Some os dois preços.', `${p1.p} + ${p2.p}`], `${p1.p} + ${p2.p} = ${t1}`) });
  const ids3: Prod[] = [PRODUCTS[3], PRODUCTS[5], PRODUCTS[7]]; const t2 = ids3.reduce((s, p) => s + p.p, 0);
  out.push({ view: { type: 'total', items: ids3.map((prod) => ({ prod, qty: 1 })), total: t2 }, item: fill(id(2), 'add.carry', 0.5, `Compra: ${ids3.map((p) => `${p.n} R$ ${p.p}`).join(' + ')}. Quanto é o total?`, t2, [[t2 - 10, 'forgot_carry'], [t2 + 10, 'forgot_carry']], ['Some dois preços de cada vez.', 'Se passar de 9 nas unidades, leve 1 para as dezenas.'], `${ids3.map((p) => p.p).join(' + ')} = ${t2}`) });
  const pm = pick(), q = ri(r, 3, 5), t3 = pm.p * q;
  out.push({ view: { type: 'total', items: [{ prod: pm, qty: q }], total: t3 }, item: fill(id(3), 'mul.facts', 0.45, `${q} ${pm.n} a R$ ${pm.p} cada. Quanto é o total?`, t3, [[pm.p + q, 'add_instead_of_multiply']], [`São ${q} grupos de R$ ${pm.p}.`, `${pm.p} + ${pm.p} + … (${q} vezes)`], `${q} × ${pm.p} = ${t3}`) });
  let c1 = pick(), c2 = pick(); while (c1 === c2 || c1.p + c2.p < 7 || c1.p + c2.p > 17) { c1 = pick(); c2 = pick(); }
  const tc = c1.p + c2.p, paid = 20, ch = paid - tc;
  out.push({ view: { type: 'change', items: [{ prod: c1, qty: 1 }, { prod: c2, qty: 1 }], total: tc, paid, change: ch }, item: fill(id(4), 'sub.borrow', 0.55, `${c1.n} R$ ${c1.p} + ${c2.n} R$ ${c2.p} = R$ ${tc}. A cliente pagou com R$ ${paid}. Qual é o troco?`, ch, [[paid + tc, 'wrong_operation'], [ch + 10, 'borrow_slip'], [ch - 10, 'borrow_slip']], ['Troco = o que pagou menos o total.', `${paid} − ${tc}`], `${paid} − ${tc} = ${ch}`) });
  const pp = pick(), qq = ri(r, 2, 4), tt = pp.p * qq, paid2 = 50, ch2 = paid2 - tt;
  out.push({ view: { type: 'change', items: [{ prod: pp, qty: qq }], total: tt, paid: paid2, change: ch2 }, item: fill(id(5), 'prob.multi', 0.7, `${qq} ${pp.n} a R$ ${pp.p} cada, pagos com R$ ${paid2}. Qual é o troco?`, ch2, [[paid2 - pp.p, 'one_step_only'], [tt, 'one_step_only']], ['Primeiro ache o total da compra.', `Depois tire o total de R$ ${paid2}.`], `${qq} × ${pp.p} = ${tt}; ${paid2} − ${tt} = ${ch2}`) });
  return out;
}

// ---------------- Laboratório de Cupcakes (multiplicação e divisão) ----------------
export type LabView = { type: 'array'; rows: number; per: number } | { type: 'share'; total: number; boxes: number } | { type: 'pack'; total: number; size: number } | { type: 'machine'; rate: number; minutes: number } | { type: 'remainder'; total: number; boxes: number };
export function labRounds(seed = 1): Round<LabView>[] {
  const r = mulberry32(seed * 15485863 + 5); const id = (n: number) => `game.lab.${seed}.${n}`; const out: Round<LabView>[] = [];
  const a = ri(r, 2, 4), b = ri(r, 3, 6);
  out.push({ view: { type: 'array', rows: a, per: b }, item: fill(id(1), 'mul.facts', 0.3, `Encha ${a} fileiras com ${b} cupcakes cada. Quantos cupcakes?`, a * b, [[a + b, 'add_instead_of_multiply']], [`Cada fileira tem ${b}.`, `${a} fileiras de ${b}`], `${a} × ${b} = ${a * b}`) });
  const k = ri(r, 2, 4), qd = ri(r, 2, 5), tot = k * qd;
  out.push({ view: { type: 'share', total: tot, boxes: k }, item: fill(id(2), 'div.facts', 0.4, `Reparta ${tot} cupcakes igualmente em ${k} caixas. Quantos em cada caixa?`, qd, [[tot - k, 'divide_wrong_operation'], [tot * k, 'divide_wrong_operation']], ['Vá colocando um cupcake em cada caixa, uma rodada de cada vez.', `Que número vezes ${k} dá ${tot}?`], `${tot} ÷ ${k} = ${qd}`) });
  const g = ri(r, 2, 5), np = ri(r, 3, 6);
  out.push({ view: { type: 'pack', total: g * np, size: g }, item: fill(id(3), 'div.facts', 0.45, `Embale ${g * np} cupcakes em pacotes de ${g}. Quantos pacotes?`, np, [[g * np - g, 'divide_wrong_operation']], [`Cada pacote leva ${g} cupcakes.`, `Quantas vezes ${g} cabe em ${g * np}?`], `${g * np} ÷ ${g} = ${np}`) });
  const rate = ri(r, 3, 6), mins = ri(r, 3, 5);
  out.push({ view: { type: 'machine', rate, minutes: mins }, item: fill(id(4), 'mul.facts', 0.5, `A máquina faz ${rate} cupcakes por minuto. Em ${mins} minutos, quantos?`, rate * mins, [[rate + mins, 'add_instead_of_multiply']], [`Em cada minuto saem ${rate}.`, `${mins} minutos de ${rate}`], `${mins} × ${rate} = ${rate * mins}`) });
  const bx = ri(r, 3, 5), tt = bx * ri(r, 2, 4) + ri(r, 1, bx - 1);
  out.push({ view: { type: 'remainder', total: tt, boxes: bx }, item: fill(id(5), 'div.algorithm', 0.65, `Reparta ${tt} cupcakes em ${bx} caixas, sem quebrar nenhum. Quantos sobram?`, tt % bx, [[Math.floor(tt / bx), 'ignore_remainder']], ['Reparta o máximo possível, igual em cada caixa.', 'O que não der para repartir é o resto.'], `${tt} = ${bx} × ${Math.floor(tt / bx)} + ${tt % bx}`) });
  return out;
}

// ---------------- Montagem de Frases ----------------
const SENT: { w: string[]; skill: string; hint: string }[] = [
  { w: ['O', 'gato', 'bebe', 'leite'], skill: 'pt.write.sentence', hint: 'Quem faz a ação começa a frase.' },
  { w: ['As', 'crianças', 'brincam', 'no', 'parque'], skill: 'pt.gram.agree', hint: '"As" combina com "crianças" (plural).' },
  { w: ['Minha', 'irmã', 'pequena', 'dorme', 'cedo'], skill: 'pt.gram.agree', hint: 'Minha, irmã e pequena concordam (feminino).' },
  { w: ['Os', 'meninos', 'alegres', 'cantam', 'juntos'], skill: 'pt.gram.agree', hint: 'Os, meninos e alegres: masculino plural.' },
  { w: ['Ontem', 'choveu', 'muito', 'à', 'noite'], skill: 'pt.write.sentence', hint: 'Frases começam dizendo quando ou quem.' },
  { w: ['A', 'professora', 'leu', 'uma', 'história'], skill: 'pt.write.sentence', hint: 'Sujeito, ação e o que foi lido.' },
];
export type SentenceView = { tiles: { id: string; label: string }[] };
export function sentenceRounds(seed = 1): Round<SentenceView>[] {
  const r = mulberry32(seed * 3571 + 17); const order = shuffle(r, SENT.map((_, i) => i)).slice(0, 5);
  return order.map((si, n) => { const s = SENT[si]!; const entries = s.w.map((label, i) => ({ id: `w${i + 1}`, label })); let tiles = shuffle(r, entries); if (tiles.every((t, i) => t.id === entries[i]!.id)) tiles = [...tiles].reverse();
    return { view: { tiles }, item: { ...base(`game.frases.${seed}.${n + 1}`, s.skill, 0.3 + n * 0.1, 'Monte a frase com as palavras na ordem certa.', [s.hint, 'Leia a frase em voz alta para testar.'], `"${s.w.join(' ')}."`), kind: 'ordering', entries, correctOrder: entries.map((e) => e.id) } as Item }; });
}

// ---------------- Detetive de Palavras ----------------
const CASES: { words: string[]; bad: number; fix: string; wrong: [string, string?][]; skill: string; hint: string }[] = [
  { words: ['O', 'pasarinho', 'canta', 'na', 'árvore.'], bad: 1, fix: 'passarinho', wrong: [['paçarinho'], ['pasarrinho']], skill: 'pt.spell.rules', hint: 'Entre vogais, o som de "s" forte pede "ss".' },
  { words: ['As', 'casa', 'são', 'bonitas.'], bad: 1, fix: 'casas', wrong: [['casa', 'pt_agree_noun'], ['cazas']], skill: 'pt.gram.agree', hint: '"As" e "bonitas" estão no plural.' },
  { words: ['Os', 'menino', 'brincam', 'no', 'parque.'], bad: 1, fix: 'meninos', wrong: [['menino', 'pt_agree_noun'], ['menina']], skill: 'pt.gram.agree', hint: 'Quem brinca? Mais de um menino.' },
  { words: ['A', 'abelha', 'fas', 'mel', 'na', 'colmeia.'], bad: 2, fix: 'faz', wrong: [['fás'], ['faç']], skill: 'pt.spell.rules', hint: 'O verbo "fazer" termina com "z" aqui.' },
  { words: ['Ela', 'comprou', 'duas', 'boneca', 'novas.'], bad: 3, fix: 'bonecas', wrong: [['boneca', 'pt_agree_noun'], ['boneco']], skill: 'pt.gram.agree', hint: '"duas" e "novas" pedem plural.' },
  { words: ['O', 'caçador', 'seguiu', 'a', 'pista', 'até', 'a', 'cassa.'], bad: 7, fix: 'caça', wrong: [['casa'], ['cassa']], skill: 'pt.spell.rules', hint: 'A palavra é a presa do caçador: usa "ç".' },
];
export type DetectiveView = { words: string[]; bad: number };
export function detectiveRounds(seed = 1): Round<DetectiveView>[] {
  const r = mulberry32(seed * 2711 + 29); const order = shuffle(r, CASES.map((_, i) => i)).slice(0, 5);
  return order.map((ci, n) => { const c = CASES[ci]!; const wrongWord = c.words[c.bad]!.replace(/[.,]/g, '');
    return { view: { words: c.words, bad: c.bad }, item: mc(`game.detetive.${seed}.${n + 1}`, c.skill, 0.35 + n * 0.08, `Como se escreve corretamente a palavra "${wrongWord}"?`, c.fix, c.wrong, [c.hint, 'Leia a frase inteira para achar a palavra certa.'], `Correto: "${c.fix}".`, r) }; });
}

// ---------------- Contextos por interesse (11–17 anos): o MESMO problema ganha o tema que o aluno gosta ----------------
export type Ctx = 'futebol' | 'jogos' | 'musica' | 'espaco' | 'culinaria' | 'tecnologia' | 'animais' | 'desenho' | 'esportes' | 'dinossauros';
export const CTX: Record<Ctx, { metric: string; per: string; plural: string; team: string; buy: string }> = {
  futebol: { metric: 'gols', per: 'jogo', plural: 'jogos', team: 'o seu time', buy: 'uma chuteira' }, jogos: { metric: 'pontos', per: 'partida', plural: 'partidas', team: 'você', buy: 'um jogo' },
  musica: { metric: 'mil reproduções', per: 'semana', plural: 'semanas', team: 'a sua banda favorita', buy: 'um fone de ouvido' }, espaco: { metric: 'horas de observação', per: 'noite', plural: 'noites', team: 'o seu telescópio', buy: 'um telescópio' },
  culinaria: { metric: 'pratos vendidos', per: 'dia', plural: 'dias', team: 'o seu food truck', buy: 'uma batedeira' }, tecnologia: { metric: 'mil downloads', per: 'dia', plural: 'dias', team: 'o seu app', buy: 'um teclado' },
  animais: { metric: 'animais atendidos', per: 'dia', plural: 'dias', team: 'o seu abrigo', buy: 'uma ração premium' }, desenho: { metric: 'desenhos publicados', per: 'semana', plural: 'semanas', team: 'o seu perfil de arte', buy: 'uma mesa digitalizadora' },
  esportes: { metric: 'pontos', per: 'jogo', plural: 'jogos', team: 'o seu time', buy: 'um tênis' }, dinossauros: { metric: 'fósseis catalogados', per: 'dia', plural: 'dias', team: 'a sua expedição', buy: 'um kit de escavação' },
};
export const ctxOf = (interests: string[]): Ctx => (interests.find((i) => i in CTX) as Ctx | undefined) ?? 'esportes';

// ---------------- Finanças do Dia a Dia ----------------
export type FinView = { type: 'price' | 'budget' | 'interest' | 'deal'; text: string; aid?: { total: number; part: number } };
export function financasRounds(seed = 1, ctx: Ctx = 'esportes'): Round<FinView>[] {
  const r = mulberry32(seed * 6151 + 41); const id = (n: number) => `game.financas.${seed}.${n}`; const out: Round<FinView>[] = []; const thing = CTX[ctx].buy;
  const v1 = pick(r, [120, 200, 300, 400]), p1 = pick(r, [10, 20, 25, 30]), a1 = (v1 * p1) / 100;
  out.push({ view: { type: 'price', text: `Você quer comprar ${thing} de R$ ${v1}, com ${p1}% de desconto. Quanto vai pagar?`, aid: { total: v1, part: a1 } }, item: fill(id(1), 'perc.change', 0.45, `${thing[0]!.toUpperCase()}${thing.slice(1)} custa R$ ${v1} e está com ${p1}% de desconto. Quanto você paga?`, v1 - a1, [[a1, 'adjust_value_as_price'], [v1 - p1, 'percent_applied_as_number'], [v1 + a1, 'adjust_wrong_direction']], [`Ache ${p1}% de ${v1} primeiro.`, 'Depois tire esse valor do preço.'], `${p1}% de ${v1} = ${a1}; ${v1} − ${a1} = ${v1 - a1}`) });
  const B = pick(r, [400, 600, 800, 1000]), pb = pick(r, [10, 15, 20, 25]), cut = (B * pb) / 100;
  out.push({ view: { type: 'budget', text: `Seu orçamento do mês é R$ ${B}. Você decidiu guardar ${pb}% para o lazer. Quanto é?`, aid: { total: B, part: cut } }, item: fill(id(2), 'perc.of', 0.4, `Orçamento de R$ ${B}: ${pb}% para o lazer. Quanto é?`, cut, [[pb, 'perc_number_confusion'], [B * pb, 'perc_wrong_operation']], ['Porcentagem é "por cem".', `1% de ${B} é ${B / 100}.`], `${pb}% de ${B} = ${cut}`) });
  const v3 = pick(r, [40, 60, 80, 120, 200]), p3 = pick(r, [10, 20, 25, 50]), a3 = (v3 * p3) / 100;
  out.push({ view: { type: 'price', text: `A assinatura do seu streaming custa R$ ${v3} e vai subir ${p3}%. Qual será o novo valor?`, aid: { total: v3, part: a3 } }, item: fill(id(3), 'perc.change', 0.55, `Assinatura de R$ ${v3} sobe ${p3}%. Qual o novo valor?`, v3 + a3, [[a3, 'adjust_value_as_price'], [v3 - a3, 'adjust_wrong_direction'], [v3 + p3, 'percent_applied_as_number']], [`Ache ${p3}% de ${v3}.`, 'Aumento: some ao valor original.'], `${p3}% de ${v3} = ${a3}; ${v3} + ${a3} = ${v3 + a3}`) });
  const P = pick(r, [200, 500, 1000]), rt = pick(r, [2, 3, 5]), t = pick(r, [2, 3, 4]), J = (P * rt * t) / 100;
  out.push({ view: { type: 'interest', text: `Você guarda R$ ${P} num investimento que rende ${rt}% ao mês (juros simples). Quanto rende de juros em ${t} meses?` }, item: fill(id(4), 'fin.interest', 0.65, `R$ ${P} a ${rt}% ao mês, juros simples, ${t} meses. Quanto rende de juros?`, J, [[(P * rt) / 100, 'interest_ignores_time'], [P + J, 'interest_vs_total']], [`Juros de 1 mês: ${rt}% de ${P}.`, `Multiplique por ${t} meses.`], `${P} × ${rt}% × ${t} = ${J}`) });
  const k = pick(r, [3, 4, 5]), q = pick(r, [45, 55, 60]), V = k * q - pick(r, [15, 20, 30]);
  out.push({ view: { type: 'deal', text: `${thing[0]!.toUpperCase()}${thing.slice(1)} sai em ${k}x de R$ ${q} ou R$ ${V} à vista. Quanto você economiza pagando à vista?` }, item: fill(id(5), 'prob.multi', 0.7, `${k}x de R$ ${q} ou R$ ${V} à vista. Quanto economiza à vista?`, k * q - V, [[k * q, 'one_step_only'], [V, 'one_step_only']], ['Primeiro ache o total parcelado.', 'Depois compare com o preço à vista.'], `${k} × ${q} = ${k * q}; ${k * q} − ${V} = ${k * q - V}`) });
  return out;
}

// ---------------- Escape Room: Laboratório Secreto ----------------
export type EscapeView = { room: number; rooms: number; story: string; clue: string };
export function escapeRounds(seed = 1, ctx: Ctx = 'esportes'): Round<EscapeView>[] {
  const r = mulberry32(seed * 8837 + 53); const id = (n: number) => `game.escape.${seed}.${n}`; const out: Round<EscapeView>[] = [];
  const k = pick(r, [3, 4, 5, 6]), a = pick(r, [2, 3, 4]), b = a + pick(r, [2, 3, 4]);
  out.push({ view: { room: 1, rooms: 4, story: 'Você acorda trancado no laboratório. A porta 1 tem uma planta com escala.', clue: `${a} cm no mapa = ${a * k} m reais.` }, item: fill(id(1), 'ratio.prop', 0.5, `Na planta, ${a} cm equivalem a ${a * k} m. O corredor tem ${b} cm na planta. Quantos metros ele mede? (senha da porta 1)`, k * b, [[a * k + (b - a), 'additive_proportion']], [`Quantos metros vale 1 cm? ${a * k} ÷ ${a}.`, `Multiplique por ${b}.`], `${a * k} ÷ ${a} = ${k}; ${k} × ${b} = ${k * b}`) });
  const x = ri(r, 3, 9), qa = ri(r, 2, 5), qb = ri(r, 2, 9), qc = qa * x - qb;
  out.push({ view: { room: 2, rooms: 4, story: 'Porta 2: um cofre exibe uma equação riscada na parede.', clue: `${qa}x − ${qb} = ${qc}` }, item: fill(id(2), 'alg.eq1', 0.6, `Resolva ${qa}x − ${qb} = ${qc}. A senha da porta 2 é o valor de x.`, x, [[qc + qb, 'forgot_divide_coef']], ['Passe o número que está subtraindo somando do outro lado.', `Depois divida por ${qa}.`], `${qa}x = ${qc + qb}; x = ${x}`) });
  const m = ri(r, 5, 9), len = 4; let xs = Array.from({ length: len - 1 }, () => ri(r, 3, 12)); let last = m * len - xs.reduce((s, v) => s + v, 0); while (last < 1 || last > 14) { xs = Array.from({ length: len - 1 }, () => ri(r, 3, 12)); last = m * len - xs.reduce((s, v) => s + v, 0); } xs = shuffle(r, [...xs, last]);
  out.push({ view: { room: 3, rooms: 4, story: 'Porta 3: um painel mostra os resultados dos últimos testes.', clue: `Testes: ${xs.join(' · ')}` }, item: fill(id(3), 'data.mean', 0.55, `O painel mostra ${xs.join(', ')}. A senha da porta 3 é a média desses valores.`, m, [[xs.reduce((s, v) => s + v, 0), 'mean_sum_only']], ['Some todos os valores.', `Divida por ${len}.`], `${xs.join(' + ')} = ${m * len}; ÷ ${len} = ${m}`) });
  const T = pick(r, [200, 400, 500]), pu = pick(r, [20, 25, 30, 40]), used = (T * pu) / 100;
  out.push({ view: { room: 4, rooms: 4, story: 'Última porta: o gerador de energia está falhando.', clue: `Tanque: ${T} L · já usou ${pu}%` }, item: fill(id(4), 'perc.change', 0.7, `O tanque tem ${T} litros e ${pu}% já foi usado. Quantos litros ainda restam? (senha final)`, T - used, [[used, 'adjust_value_as_price'], [T - pu, 'percent_applied_as_number']], [`Ache ${pu}% de ${T}.`, 'Tire do total do tanque.'], `${pu}% de ${T} = ${used}; ${T} − ${used} = ${T - used}`) });
  void ctx; return out;
}

// ---------------- Placar & Estatística ----------------
export type PlacarView = { data: number[]; labels: string[]; ctx: Ctx; ask: string };
export function placarRounds(seed = 1, ctx: Ctx = 'esportes'): Round<PlacarView>[] {
  const r = mulberry32(seed * 4793 + 61); const c = CTX[ctx]; const id = (n: number) => `game.placar.${seed}.${n}`; const out: Round<PlacarView>[] = []; const lab = (n: number) => Array.from({ length: n }, (_, i) => `${i + 1}`);
  const mk = (len: number, lo: number, hi: number) => { for (;;) { const m = ri(r, lo, hi); const xs = Array.from({ length: len - 1 }, () => ri(r, 1, hi + 4)); const last = m * len - xs.reduce((s, v) => s + v, 0); if (last >= 0 && last <= hi + 6) return { xs: shuffle(r, [...xs, last]), m }; } };
  const a = mk(4, 2, 6), sA = a.xs.reduce((s, v) => s + v, 0);
  out.push({ view: { data: a.xs, labels: lab(4), ctx, ask: 'média' }, item: fill(id(1), 'data.mean', 0.4, `Em ${a.xs.length} ${c.plural}, ${c.team} teve ${a.xs.join(', ')} ${c.metric}. Qual foi a média por ${c.per}?`, a.m, [[sA, 'mean_sum_only']], ['Some os valores do gráfico.', `Divida por ${a.xs.length}.`], `${sA} ÷ ${a.xs.length} = ${a.m}`) });
  const b = mk(4, 3, 7), sB = b.xs.reduce((s, v) => s + v, 0), M = b.m + 1, need = M * 5 - sB;
  out.push({ view: { data: b.xs, labels: lab(4), ctx, ask: 'meta' }, item: fill(id(2), 'data.mean', 0.6, `Nos ${b.xs.length} primeiros ${c.plural}: ${b.xs.join(', ')} ${c.metric}. Para fechar ${5} ${c.plural} com média ${M}, quanto precisa fazer no último?`, need, [[M, 'mean_as_middle'], [sB, 'mean_sum_only']], [`A soma final precisa ser ${M} × 5.`, 'Tire o que já tem dessa soma.'], `${M} × 5 = ${M * 5}; ${M * 5} − ${sB} = ${need}`) });
  const tot = pick(r, [20, 25, 40, 50]), hit = (tot * pick(r, [60, 70, 75, 80])) / 100;
  out.push({ view: { data: [hit, tot - hit], labels: ['acertos', 'erros'], ctx, ask: '%' }, item: fill(id(3), 'perc.of', 0.55, `${c.team[0]!.toUpperCase()}${c.team.slice(1)} acertou ${hit} de ${tot} tentativas. Qual foi a porcentagem de acertos?`, (hit / tot) * 100, [[hit, 'perc_number_confusion']], ['Porcentagem = parte ÷ total × 100.', `${hit} ÷ ${tot} = ${hit / tot}.`], `${hit}/${tot} = ${(hit / tot) * 100}%`) });
  const gA = ri(r, 3, 6), jA = ri(r, 2, 4), mult = ri(r, 3, 5);
  out.push({ view: { data: [gA], labels: [`${jA} ${c.plural}`], ctx, ask: 'proporção' }, item: fill(id(4), 'ratio.prop', 0.6, `Em ${jA} ${c.plural} foram ${gA} ${c.metric}. Mantendo o ritmo, quantos ${c.metric} em ${jA * mult} ${c.plural}?`, gA * mult, [[gA + (jA * mult - jA), 'additive_proportion']], [`Quantas vezes ${jA} cabe em ${jA * mult}?`, `Multiplique ${gA} por esse número.`], `${jA * mult} ÷ ${jA} = ${mult}; ${gA} × ${mult} = ${gA * mult}`) });
  const d = mk(5, 3, 7), mx = Math.max(...d.xs), mn = Math.min(...d.xs);
  out.push({ view: { data: d.xs, labels: lab(5), ctx, ask: 'diferença' }, item: fill(id(5), 'data.mean', 0.5, `No gráfico, qual é a diferença entre o MAIOR e o MENOR valor de ${c.metric}?`, mx - mn, [[mx, 'mean_as_middle']], ['Ache o maior e o menor valor.', 'Subtraia um do outro.'], `${mx} − ${mn} = ${mx - mn}`) });
  return out;
}

// ---------------- Jogos áudio-primeiro (5–7): rodadas vêm dos geradores do banco, com semente própria ----------------
export type AudioView = { kind: 'audio' };
const audioRounds = (game: string, plan: [string, number][], seed: number): Round<AudioView>[] => {
  const lift = Math.min(2, Math.floor((seed - 1) / 2)); // sobe de nível aos poucos, conforme a criança joga de novo
  return plan.map(([skill, lv], k) => { const lvl = Math.min(5, lv + (lv < 5 ? lift : 0)); const it = makeItem(skill, lvl, seed * 131 + k * 17 + skill.length);
    return { view: { kind: 'audio' as const }, item: { ...it, id: `game.${game}.${seed}.${k + 1}` } as Item }; });
};
export const contagemRounds = (seed = 1) => audioRounds('contagem', [['num.count', 0], ['num.count', 1], ['num.compare', 0], ['num.order', 0], ['num.count', 2]], seed);
export const sonsRounds = (seed = 1) => audioRounds('sons', [['pt.letter.sound', 0], ['pt.syllable', 0], ['pt.rhyme', 0], ['pt.letter.sound', 1], ['pt.syllable', 1]], seed);
export const formasRounds = (seed = 1) => audioRounds('formas', [['geo.shapes', 0], ['pat.seq', 0], ['geo.shapes', 1], ['pat.seq', 1], ['geo.shapes', 3]], seed);

export const roundsFor = (g: GameId, seed: number, ctx: Ctx = 'esportes'): Round<unknown>[] => ({ contagem: () => contagemRounds(seed), sons: () => sonsRounds(seed), formas: () => formasRounds(seed), pizzaria: () => pizzaRounds(seed), mercado: () => marketRounds(seed), laboratorio: () => labRounds(seed), frases: () => sentenceRounds(seed), detetive: () => detectiveRounds(seed), financas: () => financasRounds(seed, ctx), escape: () => escapeRounds(seed, ctx), placar: () => placarRounds(seed, ctx) })[g]();
export const starsFor = (firstTryCorrect: number, total: number, hints: number) => 1 + (firstTryCorrect >= Math.ceil(total * 0.6) ? 1 : 0) + (firstTryCorrect >= total - 1 && hints === 0 ? 1 : 0);
