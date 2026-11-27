// Lógica PURA dos minigames: gera rodadas determinísticas (por semente) e o item pedagógico de cada rodada.
// Cada rodada vira um Item sintético corrigido pelo MESMO motor (gradeItem/recordResponse) → evidências, equívocos e diagnóstico.
// Conteúdo autoral em rascunho (revisão profissional pendente), como o restante do banco.
import { mulberry32, ri, shuffle, type Item } from '@edu/content-math';

export type GameId = 'pizzaria' | 'mercado' | 'laboratorio' | 'frases' | 'detetive';
export interface Round<V> { item: Item; view: V }
const SRC = { kind: 'authored' as const, reference: 'Rodada de minigame gerada deterministicamente pelo projeto; gabarito calculado por código', license: 'Autoral do projeto (licença final a definir)' };
const base = (id: string, skillId: string, difficulty: number, statement: string, hints: string[], justification: string) => ({ id, skillId, difficulty, statement, hints, justification, source: { ...SRC }, review: { status: 'draft' as const, needsProfessionalReview: true, version: 1 } });
const fill = (id: string, skillId: string, d: number, statement: string, answer: number, wrong: [number, string][], hints: string[], why: string): Item => ({ ...base(id, skillId, d, statement, hints, why), kind: 'fill_in', accepted: [String(answer)], wrongPatterns: wrong.filter(([a]) => a !== answer && a >= 0).map(([a, m]) => ({ answer: String(a), misconception: m })), inputHint: 'número' });
const mc = (id: string, skillId: string, d: number, statement: string, correct: string, distractors: [string, string?][], hints: string[], why: string, r: () => number): Item => {
  const opts = shuffle(r, [{ text: correct, ok: true, tag: undefined as string | undefined }, ...distractors.map(([text, tag]) => ({ text, ok: false, tag }))]); const ids = ['a', 'b', 'c', 'd'];
  return { ...base(id, skillId, d, statement, hints, why), kind: 'multiple_choice', options: opts.map((o, i) => ({ id: ids[i]!, text: o.text, ...(o.tag ? { misconception: o.tag } : {}) })), correct: ids[opts.findIndex((o) => o.ok)]! };
};

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

export const roundsFor = (g: GameId, seed: number): Round<unknown>[] => ({ pizzaria: pizzaRounds, mercado: marketRounds, laboratorio: labRounds, frases: sentenceRounds, detetive: detectiveRounds })[g](seed);
export const starsFor = (firstTryCorrect: number, total: number, hints: number) => 1 + (firstTryCorrect >= Math.ceil(total * 0.6) ? 1 : 0) + (firstTryCorrect >= total - 1 && hints === 0 ? 1 : 0);
