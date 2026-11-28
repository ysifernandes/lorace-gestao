import { gcd, lcm, mulberry32, ri, shuffle } from './rng';
import type { Item, MCOption, Figure, Review, SourceRef } from './types';
import { makeEarlyGens, type McFn } from './early';

const SRC: SourceRef = { kind: 'authored', reference: 'Item gerado deterministicamente pelo projeto; gabarito calculado por código', license: 'Autoral do projeto (licença final a definir)' };
const REVIEW: Review = { status: 'draft', needsProfessionalReview: true, version: 1 };
const LEVELS = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
export const ITEMS_PER_SKILL = LEVELS.length;
const fr = (n: number, d: number) => `${n}/${d}`;
type D = { text: string; tag?: string };

function mc(skillId: string, n: number, statement: string, correct: string, distractors: D[], hints: string[], justification: string, rng: () => number,
  extra: { kind?: 'multiple_choice' | 'word_problem' | 'reasoning'; context?: string; figure?: Figure; spoken?: string } = {}): Item {
  const seen = new Set<string>([correct]); const ds: D[] = [];
  for (const d of distractors) if (!seen.has(d.text)) { seen.add(d.text); ds.push(d); }
  // preenchimento de distratores respeitando o formato da resposta (fração, "q resto r" ou número)
  const frac = correct.match(/^(\d+)\/(\d+)$/), rem = correct.match(/^(\d+) resto (\d+)$/); let pad = 1;
  while (ds.length < 3 && pad < 30) { const t = frac ? (pad % 2 ? `${Number(frac[1]) + Math.ceil(pad / 2)}/${frac[2]}` : `${frac[1]}/${Number(frac[2]) + pad / 2}`) : rem ? `${Number(rem[1]) + pad} resto ${rem[2]}` : String(Number(correct) + pad * 2 + 1); pad++; if (!seen.has(t)) { seen.add(t); ds.push({ text: t }); } }
  const opts = shuffle(rng, [{ text: correct, ok: true }, ...ds.slice(0, 3).map((d) => ({ ...d, ok: false }))]);
  const ids = ['a', 'b', 'c', 'd'];
  const options: MCOption[] = opts.map((o, i) => ({ id: ids[i]!, text: o.text, ...('tag' in o && o.tag ? { misconception: o.tag } : {}) }));
  return { id: `${skillId}.${n}`, skillId, difficulty: LEVELS[n]!, kind: extra.kind ?? 'multiple_choice', statement, context: extra.context, figure: extra.figure, ...(extra.spoken ? { spoken: extra.spoken } : {}),
    options, correct: ids[opts.findIndex((o) => o.ok)]!, hints, justification, source: SRC, review: { ...REVIEW } };
}
const base = (skillId: string, n: number) => ({ id: `${skillId}.${n}`, skillId, difficulty: LEVELS[n]!, source: SRC, review: { ...REVIEW } });

type Gen = (n: number, r: () => number) => Item;
const digitsNoCarry = (a: number, b: number) => Number(String(a).split('').map((d, i) => String((Number(d) + Number(String(b).padStart(String(a).length, '0')[i])) % 10)).join(''));

const GENS: Record<string, Gen> = {
  'add.facts': (n, r) => { const a = ri(r, 2 + n, 6 + n * 2), b = ri(r, 3, 9 + n); const s = a + b;
    return mc('add.facts', n, `Quanto é ${a} + ${b}?`, String(s), [{ text: String(s + 1), tag: 'off_by_one' }, { text: String(s - 1), tag: 'off_by_one' }, { text: String(Math.abs(a - b)) }], [`Comece do maior número (${Math.max(a, b)}) e conte para frente.`, `${a} + ${b} = ${Math.max(a, b)} + ${Math.min(a, b)}.`], `${a} + ${b} = ${s}`, r); },
  'add.carry': (n, r) => { const dig = n < 3 ? 2 : 3; let a = 0, b = 0; do { a = ri(r, 10 ** (dig - 1) + 6, 10 ** dig - 1); b = ri(r, 10 ** (dig - 1) + 5, 10 ** dig - 1); } while (a % 10 + b % 10 < 10);
    const s = a + b; return mc('add.carry', n, `Calcule ${a} + ${b}.`, String(s), [{ text: String(digitsNoCarry(a, b)), tag: 'forgot_carry' }, { text: String(s + 10), tag: 'forgot_carry' }, { text: String(s - 10) }], ['Some primeiro as unidades.', 'Se passar de 9, escreva o último dígito e leve 1 para a coluna seguinte.'], `${a} + ${b} = ${s}`, r); },
  'sub.facts': (n, r) => { const b = ri(r, 2, 6 + n), a = b + ri(r, 2, 8 + n); const d = a - b;
    return mc('sub.facts', n, `Quanto é ${a} − ${b}?`, String(d), [{ text: String(d + 1), tag: 'off_by_one' }, { text: String(a + b) }, { text: String(d - 1), tag: 'off_by_one' }], [`Conte para trás ${b} a partir de ${a}.`, `Pense: quanto falta de ${b} para chegar a ${a}?`], `${a} − ${b} = ${d}; confira: ${d} + ${b} = ${a}`, r); },
  'sub.borrow': (n, r) => { const dig = n < 3 ? 2 : 3; let a = 0, b = 0; do { a = ri(r, 10 ** (dig - 1) + 20, 10 ** dig - 1); b = ri(r, 10 ** (dig - 1) + 5, a - 3); } while (a % 10 >= b % 10 || b >= a);
    const d = a - b; const sl = Number(String(a).padStart(dig, '0').split('').map((x, i) => Math.abs(Number(x) - Number(String(b).padStart(dig, '0')[i]))).join(''));
    return mc('sub.borrow', n, `Calcule ${a} − ${b}.`, String(d), [{ text: String(sl), tag: 'smaller_from_larger' }, { text: String(d + 10), tag: 'borrow_slip' }, { text: String(d - 10), tag: 'borrow_slip' }], ['Na coluna das unidades, o número de cima é menor. O que você pode fazer?', 'Peça 1 dezena emprestada: ela vira 10 unidades.'], `${a} − ${b} = ${d}; confira: ${d} + ${b} = ${a}`, r); },
  'mul.facts': (n, r) => { const a = ri(r, 2, 4 + n), b = ri(r, 3, 6 + Math.floor(n / 2) * 2 + 2); const p = a * b;
    return mc('mul.facts', n, `Quanto é ${a} × ${b}?`, String(p), [{ text: String(a + b), tag: 'add_instead_of_multiply' }, { text: String(a * (b + 1)), tag: 'table_slip' }, { text: String(a * (b - 1)), tag: 'table_slip' }], [`${a} × ${b} é ${b} somado ${a} vezes.`, `Use ${a} × ${b - 1} = ${a * (b - 1)} e some ${a}.`], `${a} × ${b} = ${p}`, r); },
  'mul.multi': (n, r) => { const two = n >= 4; const a = ri(r, 12, 49), b = two ? ri(r, 12, 29) : ri(r, 3, 9); const p = a * b;
    const wrong = two ? a * (b % 10) + a * Math.floor(b / 10) : Number(String(a).split('').map((d) => (Number(d) * b) % 10).join(''));
    return mc('mul.multi', n, `Calcule ${a} × ${b}.`, String(p), [{ text: String(wrong), tag: two ? 'forgot_shift_zero' : 'forgot_carry_mul' }, { text: String(p + 10) }, { text: String(p - 10) }], two ? ['Multiplique por cada algarismo de ' + b + ' em linhas separadas.', 'A linha das dezenas começa com um zero.'] : ['Multiplique o algarismo das unidades e leve o excedente.'], `${a} × ${b} = ${p}`, r); },
  'div.facts': (n, r) => { const b = ri(r, 2, 4 + n), q = ri(r, 3, 6 + n); const a = b * q;
    return mc('div.facts', n, `Quanto é ${a} ÷ ${b}?`, String(q), [{ text: String(a - b), tag: 'divide_wrong_operation' }, { text: String(a * b), tag: 'divide_wrong_operation' }, { text: String(q + 1) }], [`Que número vezes ${b} dá ${a}?`, `Procure na tabuada do ${b}.`], `${a} ÷ ${b} = ${q}, pois ${q} × ${b} = ${a}`, r); },
  'div.algorithm': (n, r) => { const b = ri(r, 3, 5 + n), q = ri(r, 4, 9 + n), rem = ri(r, 1, b - 1); const a = b * q + rem;
    return mc('div.algorithm', n, `Qual é o resultado de ${a} ÷ ${b}?`, `${q} resto ${rem}`, [{ text: String(q), tag: 'ignore_remainder' }, { text: `${q - 1} resto ${rem + b}`, tag: 'remainder_too_big' }, { text: `${rem} resto ${q}` }], [`Quantas vezes ${b} cabe em ${a}?`, `Confira: quociente × ${b} + resto deve dar ${a}.`], `${q} × ${b} + ${rem} = ${a}`, r); },
  'factors': (n, r) => { const P = [[12, 18], [8, 12], [20, 30], [15, 25], [24, 36], [16, 24]] as const; const [x, y] = P[n]!; const g = gcd(x, y), l = lcm(x, y); const small = [2, 3, 5].find((k) => x % k === 0 && y % k === 0 && k < g) ?? 1;
    return mc('factors', n, `Qual é o MAIOR número que divide ${x} e ${y} ao mesmo tempo?`, String(g), [{ text: String(l), tag: 'multiple_divisor_confusion' }, { text: String(small === 1 ? g / 2 : small), tag: 'not_greatest' }, { text: String(x + y) }], ['Liste os divisores de cada número.', 'Marque os que aparecem nas duas listas.'], `O maior divisor comum de ${x} e ${y} é ${g}; ${l} é múltiplo comum.`, r); },
  'frac.id': (n, r) => { const d = ri(r, 3 + (n > 2 ? 2 : 0), 6 + n), nu = ri(r, 1, d - 1);
    return mc('frac.id', n, 'Que fração da figura está pintada?', fr(nu, d), [{ text: fr(d, nu), tag: 'swap_num_den' }, { text: fr(d - nu, d), tag: 'count_unshaded' }, { text: fr(nu, d - nu), tag: 'part_to_part' }], ['Quantas partes iguais tem o todo? Esse é o denominador.', 'Quantas estão pintadas? Esse é o numerador.'], `${nu} partes pintadas de ${d} partes iguais = ${fr(nu, d)}`, r, { figure: { type: 'fraction-bar', num: nu, den: d } }); },
  'frac.visual': (n, r) => { const d = [2, 4, 3, 5, 6, 8][n]!, nu = ri(r, 1, d - 1);
    return { ...base('frac.visual', n), kind: 'fraction_visual', statement: `Pinte ${fr(nu, d)} da barra.`, den: d, targetNum: nu, wrongPatterns: [{ shaded: d - nu, misconception: 'count_unshaded' }], hints: [`A barra tem ${d} partes iguais.`, `Pinte ${nu} partes.`], justification: `${fr(nu, d)} = ${nu} partes de ${d}` }; },
  'frac.compare': (n, r) => { const P: [number, number, number, number][] = [[1, 2, 1, 4], [1, 3, 1, 5], [2, 5, 2, 3], [3, 4, 3, 8], [2, 3, 3, 5], [5, 6, 7, 9]]; const [a, b, c, d] = P[n]!;
    const bigger = a / b > c / d ? [a, b] : [c, d], smaller = a / b > c / d ? [c, d] : [a, b];
    const tag = bigger[0] === smaller[0] ? 'bigger_denominator_bigger' : smaller[1]! > bigger[1]! ? 'bigger_denominator_bigger' : 'compare_numerators_only';
    return mc('frac.compare', n, `Qual fração é maior: ${fr(a, b)} ou ${fr(c, d)}?`, fr(bigger[0]!, bigger[1]!), [{ text: fr(smaller[0]!, smaller[1]!), tag }, { text: 'São iguais' }, { text: 'Não dá para comparar' }], ['Imagine duas barras iguais divididas em partes.', 'Quanto mais partes, menores elas são.'], `${fr(bigger[0]!, bigger[1]!)} > ${fr(smaller[0]!, smaller[1]!)}`, r); },
  'frac.equiv': (n, r) => { const [a, b] = ([[1, 2], [1, 3], [2, 3], [3, 4], [2, 5], [3, 5]] as const)[n]!; const k = ri(r, 2, 4);
    return mc('frac.equiv', n, `Qual fração é equivalente a ${fr(a, b)}?`, fr(a * k, b * k), [{ text: fr(a + k, b + k), tag: 'add_same_to_both' }, { text: fr(a * k, b), tag: 'multiply_num_only' }, { text: fr(a, b * k) }], ['Multiplique numerador e denominador pelo mesmo número.', `Tente ${k}.`], `${fr(a, b)} = ${fr(a * k, b * k)} (×${k} nos dois termos)`, r); },
  'frac.simplify': (n, r) => { const P: [number, number][] = [[2, 4], [6, 8], [4, 10], [9, 12], [12, 18], [18, 24]]; const [a, b] = P[n]!; const g = gcd(a, b); const part = [2, 3].find((p) => g % p === 0 && g / p > 1);
    return mc('frac.simplify', n, `Simplifique ${fr(a, b)} até a forma mais simples.`, fr(a / g, b / g), [{ text: fr(a / g, b), tag: 'divide_only_numerator' }, { text: fr(a - 2, b - 2), tag: 'subtract_to_simplify' }, part ? { text: fr(a / part, b / part), tag: 'partial_simplify' } : { text: fr(a, b) }], ['Que número divide o numerador e o denominador?', 'Depois de dividir, ainda dá para simplificar?'], `mdc(${a},${b}) = ${g}; ${fr(a, b)} = ${fr(a / g, b / g)}`, r); },
  'frac.add.same': (n, r) => { const d = ri(r, 4, 6 + n), a = ri(r, 1, Math.floor(d / 2)), b = ri(r, 1, d - a - (d - a > 1 ? 1 : 0) || 1);
    return mc('frac.add.same', n, `Quanto é ${fr(a, d)} + ${fr(b, d)}?`, fr(a + b, d), [{ text: fr(a + b, d * 2), tag: 'add_denominators' }, { text: fr(a * b, d) }, { text: fr(a + b, d + 1) }], ['As partes têm o mesmo tamanho?', 'Some só quantas partes você tem.'], `${a}/${d} + ${b}/${d} = ${a + b}/${d}`, r); },
  'frac.add.diff': (n, r) => { const P: [number, number, number, number][] = [[1, 2, 1, 4], [1, 2, 1, 3], [1, 3, 1, 4], [2, 3, 1, 6], [1, 4, 1, 3], [3, 4, 1, 6]]; const [a, b, c, d] = P[n]!;
    const L = lcm(b, d), num = a * (L / b) + c * (L / d), g = gcd(num, L);
    return mc('frac.add.diff', n, `Quanto é ${fr(a, b)} + ${fr(c, d)}?`, fr(num / g, L / g), [{ text: fr(a + c, b + d), tag: 'add_num_and_den' }, { text: fr(a + c, L), tag: 'common_den_not_converted' }, { text: fr(num + 1, L) }], [`Ache um denominador comum (${L} serve).`, 'Converta as duas frações antes de somar.'], `${fr(a, b)} + ${fr(c, d)} = ${fr(num, L)}${g > 1 ? ` = ${fr(num / g, L / g)}` : ''}`, r); },
  'prob.interpret': (n, r) => { const a = ri(r, 12, 40), b = ri(r, 3, 9), c = ri(r, 2, 5);
    const T = [
      () => mc('prob.interpret', n, 'Qual conta resolve o problema?', `${a} + ${b}`, [{ text: `${a} − ${b}`, tag: 'wrong_operation' }, { text: `${a} × ${b}`, tag: 'wrong_operation' }, { text: `${a} ÷ ${b}`, tag: 'wrong_operation' }], ['Conte a história: a quantidade aumentou ou diminuiu?'], 'Juntar quantidades → adição', r, { kind: 'word_problem', context: `Ana tinha ${a} figurinhas e ganhou mais ${b}. Quantas figurinhas ela tem agora?` }),
      () => mc('prob.interpret', n, 'Quantas figurinhas Ana tem agora?', String(a - b), [{ text: String(a + b), tag: 'wrong_operation' }, { text: String(a * b), tag: 'wrong_operation' }, { text: String(a - b + 1) }], ['Ela deu figurinhas: ficou com mais ou com menos?'], `${a} − ${b} = ${a - b}`, r, { kind: 'word_problem', context: `Ana tinha ${a} figurinhas e deu ${b} para o irmão.` }),
      () => mc('prob.interpret', n, 'Quantos lápis há ao todo?', String(c * b), [{ text: String(c + b), tag: 'wrong_operation' }, { text: String(b - c > 0 ? b - c : b + c + 1) }, { text: String(c * b + c) }], ['São grupos iguais?'], `${c} caixas × ${b} lápis = ${c * b}`, r, { kind: 'word_problem', context: `Cada caixa tem ${b} lápis e há ${c} caixas.` }),
      () => mc('prob.interpret', n, 'Quantas balas cada amigo recebe?', String(b), [{ text: String(b * c + c), tag: 'wrong_operation' }, { text: String(b * c - c), tag: 'wrong_operation' }, { text: String(b + c) }], ['Repartir igualmente é qual operação?'], `${b * c} ÷ ${c} = ${b}`, r, { kind: 'word_problem', context: `${b * c} balas serão divididas igualmente entre ${c} amigos.` }),
      () => mc('prob.interpret', n, 'Quantas balas João tem?', String(a - b), [{ text: String(a + b), tag: 'keyword_trap' }, { text: String(a * 2 - b) }, { text: String(b) }], ['Quem tem mais? Então quem tem menos tem a quantidade dele menos a diferença.'], `Maria tem ${b} a mais que João → João = ${a} − ${b} = ${a - b}`, r, { kind: 'word_problem', context: `Maria tem ${a} balas, que são ${b} a mais do que as de João.` }),
      () => mc('prob.interpret', n, 'Quantos reais restam?', String(a - b * c), [{ text: String(a - b), tag: 'one_step_only' }, { text: String(b * c), tag: 'one_step_only' }, { text: String(a + b * c) }], ['Quanto ele gastou ao todo?'], `${c} × ${b} = ${b * c}; ${a} − ${b * c} = ${a - b * c}`, r, { kind: 'word_problem', context: `Pedro tinha ${a + b * c} reais e comprou ${c} cadernos de ${b} reais cada.` }),
    ]; return T[n]!(); },
  'prob.multi': (n, r) => { const p = ri(r, 4, 8), k = ri(r, 3, 5), e = ri(r, 2, p);
    return mc('prob.multi', n, 'Quantos biscoitos sobraram?', String(p * k - e), [{ text: String(p * k), tag: 'one_step_only' }, { text: String(k * (p - e)), tag: 'wrong_order' }, { text: String(p + k - e) }], ['O que precisa ser calculado primeiro?', 'Faça uma conta de cada vez, na ordem da história.'], `${k} × ${p} = ${p * k}; ${p * k} − ${e} = ${p * k - e}`, r, { kind: 'word_problem', context: `Cada pacote tem ${p} biscoitos. Lia comprou ${k} pacotes e comeu ${e} biscoitos.` }); },
  'prob.frac': (n, r) => { const d = [8, 6, 10, 4, 5, 8][n]!, nu = ri(r, 1, d - 1); const q = [20, 12, 40][n % 3]!;
    if (n % 2 === 0) return mc('prob.frac', n, 'Que fração da pizza ele comeu?', fr(nu, d), [{ text: fr(d, nu), tag: 'swap_num_den' }, { text: fr(d - nu, d), tag: 'count_unshaded' }, { text: fr(nu, d - nu), tag: 'part_to_part' }], ['Quantas fatias a pizza tem ao todo?'], `${nu} de ${d} fatias = ${fr(nu, d)}`, r, { kind: 'word_problem', context: `Uma pizza foi cortada em ${d} fatias iguais e Davi comeu ${nu}.` });
    const den = q % 4 === 0 ? 4 : 5; return mc('prob.frac', n, `Quanto é ${fr(1, den)} de ${q}?`, String(q / den), [{ text: String(q - den), tag: 'fraction_of_quantity_error' }, { text: String(q * den), tag: 'fraction_of_quantity_error' }, { text: String(q / den + 1) }], [`Divida ${q} em ${den} partes iguais.`], `${q} ÷ ${den} = ${q / den}`, r, { kind: 'word_problem', context: `Uma coleção tem ${q} cartas.` }); },
};

const pick = <T,>(r: () => number, xs: T[]): T => xs[ri(r, 0, xs.length - 1)]!;
Object.assign(GENS, {
  'perc.of': (n: number, r: () => number) => { const P: [number, number[]][] = [[50, [20, 40, 60, 80, 120]], [10, [50, 80, 120, 200]], [25, [40, 80, 120, 200]], [20, [50, 75, 100, 150]], [75, [40, 80, 120]], [5, [60, 100, 200]]]; const [p, vs] = P[n]!; const v = pick(r, vs); const c = (v * p) / 100;
    return mc('perc.of', n, `Quanto é ${p}% de ${v}?`, String(c), [{ text: String(p), tag: 'perc_number_confusion' }, { text: String(v * p), tag: 'perc_wrong_operation' }, { text: String(v - c) }], ['Porcentagem é "por cem": p% = p/100.', `Ache 1% (${v} ÷ 100) e multiplique por ${p}.`], `${p}% de ${v} = ${v} × ${p} ÷ 100 = ${c}`, r); },
  'perc.change': (n: number, r: () => number) => { const pcts = [10, 20, 25, 50, 20, 15]; const vs = [[50, 80, 200], [50, 100, 150], [40, 80, 120], [60, 100, 200], [40, 80], [200, 400]][n]!; const p = pcts[n]!, v = pick(r, vs), adj = (v * p) / 100; const up = n % 2 === 1; const c = up ? v + adj : v - adj;
    return mc('perc.change', n, up ? `Uma assinatura de R$ ${v} sofre aumento de ${p}%. Qual é o novo valor?` : `Um produto de R$ ${v} está com ${p}% de desconto. Quanto você paga?`, String(c), [{ text: String(adj), tag: 'adjust_value_as_price' }, { text: String(up ? v - adj : v + adj), tag: 'adjust_wrong_direction' }, { text: String(up ? v + p : v - p), tag: 'percent_applied_as_number' }], [`Primeiro ache ${p}% de ${v}.`, up ? 'Some ao valor original.' : 'Tire do valor original.'], `${p}% de ${v} = ${adj}; ${up ? v + ' + ' + adj : v + ' − ' + adj} = ${c}`, r, { kind: 'word_problem' }); },
  'ratio.prop': (n: number, r: () => number) => { if (n < 3) { const u = ri(r, 2, 9), a = ri(r, 2, 4), b = a + ri(r, 2, 4); return mc('ratio.prop', n, `${a} cadernos custam R$ ${u * a}. Quanto custam ${b} cadernos?`, String(u * b), [{ text: String(u * a + (b - a)), tag: 'additive_proportion' }, { text: String(u * a * b), tag: 'prop_multiply_all' }, { text: String(u * b + u) }], [`Descubra o preço de 1 caderno: ${u * a} ÷ ${a}.`, `Multiplique por ${b}.`], `${u * a} ÷ ${a} = ${u}; ${u} × ${b} = ${u * b}`, r, { kind: 'word_problem' }); }
    const [x, y] = [[2, 3], [1, 4], [3, 5]][n - 3]! as [number, number]; const T = (x + y) * ri(r, 3, 9);
    return mc('ratio.prop', n, `Dividir R$ ${T} na razão ${x}:${y}. Qual é a MAIOR parte?`, String((T * y) / (x + y)), [{ text: String(T / y), tag: 'ratio_part_of_part' }, { text: String(T / 2) }, { text: String((T * x) / (x + y)) }], [`Some as partes da razão: ${x} + ${y}.`, 'Divida o total pelo número de partes e depois multiplique.'], `${T} ÷ ${x + y} = ${T / (x + y)}; × ${y} = ${(T * y) / (x + y)}`, r, { kind: 'word_problem' }); },
  'alg.eq1': (n: number, r: () => number) => { const x = ri(r, 2, 9), a = ri(r, 2, 5), b = ri(r, 1, 9); const minus = n >= 3; const c = minus ? a * x - b : a * x + b; const sgn = minus ? c + b : c - b;
    const wrong: { text: string; tag?: string }[] = [{ text: String(sgn), tag: 'forgot_divide_coef' }, { text: String(x + 1) }, { text: String(Math.max(1, x - 1)) }]; const flip = minus ? (c - b) / a : (c + b) / a; if (Number.isInteger(flip) && flip !== x) wrong.unshift({ text: String(flip), tag: 'eq_sign_error' });
    return mc('alg.eq1', n, `Qual é o valor de x em ${a}x ${minus ? '−' : '+'} ${b} = ${c}?`, String(x), wrong, ['Passe o número solto para o outro lado, invertendo a operação.', `Depois divida os dois lados por ${a}.`], `${a}x = ${sgn}; x = ${sgn} ÷ ${a} = ${x}`, r); },
  'data.mean': (n: number, r: () => number) => { const len = 3 + (n > 2 ? 1 : 0) + (n > 4 ? 1 : 0); let xs: number[] = [], m = 0; for (let tries = 0; tries < 50; tries++) { m = ri(r, 4 + (n > 3 ? 2 : 0), 9 + n); xs = Array.from({ length: len - 1 }, () => ri(r, 2, 14)); const last = m * len - xs.reduce((s, v) => s + v, 0); if (last >= 1 && last <= 16) { xs.push(last); break; } }
    xs = shuffle(r, xs); const sum = xs.reduce((s, v) => s + v, 0); const mid = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
    return mc('data.mean', n, `Qual é a média de ${xs.join(', ')}?`, String(m), [{ text: String(sum), tag: 'mean_sum_only' }, ...(mid !== m ? [{ text: String(mid), tag: 'mean_as_middle' }] : []), { text: String(m + 1) }, { text: String(m - 1) }], ['Some todos os valores.', `Divida a soma pela quantidade de valores (${len}).`], `${xs.join(' + ')} = ${sum}; ${sum} ÷ ${len} = ${m}`, r); },
  'fin.interest': (n: number, r: () => number) => { const P = [100, 200, 500, 1000, 200, 500][n]!, rate = [2, 5, 2, 3, 10, 4][n]!, t = [2, 3, 3, 2, 4, 3][n]!; const J = (P * rate * t) / 100;
    return mc('fin.interest', n, `Você aplica R$ ${P} a juros simples de ${rate}% ao mês durante ${t} meses. Quanto rende de juros?`, String(J), [{ text: String((P * rate) / 100), tag: 'interest_ignores_time' }, { text: String(P + J), tag: 'interest_vs_total' }, { text: String(J + rate) }], [`Os juros de 1 mês são ${rate}% de ${P}.`, `Multiplique pelos ${t} meses.`], `${P} × ${rate}% × ${t} = ${J}`, r, { kind: 'word_problem' }); },
});

/** Itens interativos feitos à mão (cada um alimenta evidências no motor). */
function handmade(): Item[] {
  const items: Item[] = [];
  items.push({ ...base('frac.compare', 6 - 1 + 0), id: 'frac.compare.order1', difficulty: 0.55, kind: 'ordering', statement: 'Arraste para ordenar da MENOR para a MAIOR fração.', entries: [{ id: 'x', label: '3/4' }, { id: 'y', label: '1/4' }, { id: 'z', label: '1/2' }], correctOrder: ['y', 'z', 'x'], misconceptionIfReversed: 'bigger_denominator_bigger', hints: ['Divida a barra em 4 partes iguais para todas.', '1/2 = 2/4'], justification: '1/4 < 1/2 (= 2/4) < 3/4' });
  items.push({ ...base('frac.equiv', 6 - 1 + 0), id: 'frac.equiv.match1', difficulty: 0.5, kind: 'matching', statement: 'Ligue cada fração à sua equivalente.', left: [{ id: 'l1', label: '1/2' }, { id: 'l2', label: '1/3' }, { id: 'l3', label: '3/4' }], right: [{ id: 'r1', label: '2/6' }, { id: 'r2', label: '2/4' }, { id: 'r3', label: '6/8' }], pairs: [['l1', 'r2'], ['l2', 'r1'], ['l3', 'r3']], hints: ['Multiplique numerador e denominador pelo mesmo número.'], justification: '1/2=2/4; 1/3=2/6; 3/4=6/8' });
  items.push({ ...base('frac.equiv', 6 - 1 + 0), id: 'frac.equiv.fill1', difficulty: 0.6, kind: 'fill_in', statement: 'Complete: 1/2 = ?/6', accepted: ['3'], wrongPatterns: [{ answer: '5', misconception: 'add_same_to_both' }, { answer: '1', misconception: 'multiply_num_only' }], inputHint: 'número', hints: ['O denominador foi de 2 para 6: multiplicou por quanto?', 'Faça o mesmo com o numerador.'], justification: '1/2 = 3/6' });
  items.push({ ...base('mul.facts', 6 - 1 + 0), id: 'mul.facts.drag1', difficulty: 0.4, kind: 'drag_drop', statement: 'Arraste cada produto para o grupo certo: está na tabuada do 3 ou do 4?', tokens: [{ id: 't1', label: '12' }, { id: 't2', label: '9' }, { id: 't3', label: '16' }], zones: [{ id: 'z3', label: 'Tabuada do 3 (só)' }, { id: 'z4', label: 'Tabuada do 4 (só)' }, { id: 'zb', label: 'Nas duas' }], solution: { t1: 'zb', t2: 'z3', t3: 'z4' }, hints: ['12 = 3×4 = 4×3'], justification: '12 está nas duas; 9 só no 3; 16 só no 4' });
  items.push({ ...base('frac.add.diff', 6 - 1 + 0), id: 'frac.add.diff.sim1', difficulty: 0.5, kind: 'simulation', statement: 'Simulação: converta 1/2 para sextos usando a barra e depois some 1/2 + 1/3 = ?/6.', den: 2, targetDen: 6, targetNum: 3, hints: ['Cada metade vale 3 sextos.'], justification: '1/2 = 3/6; 1/3 = 2/6; soma = 5/6' });
  items.push({ ...base('prob.multi', 6 - 1 + 0), id: 'prob.multi.reason1', difficulty: 0.55, kind: 'reasoning', statement: 'Ordene os passos para resolver: "Um pacote tem 6 balas. Compro 3 pacotes e dou 5 balas. Quantas ficam?"', options: [{ id: 'a', text: '6 × 3 = 18; depois 18 − 5 = 13' }, { id: 'b', text: '6 − 5 = 1; depois 1 × 3 = 3', misconception: 'wrong_order' }, { id: 'c', text: '6 × 3 = 18 (e pronto)', misconception: 'one_step_only' }, { id: 'd', text: '6 + 3 − 5 = 4' }], correct: 'a', hints: ['Quantas balas você tem depois de comprar tudo?'], justification: '18 balas; tirando 5, ficam 13' });
  return items;
}

/** mc estrito para o conteúdo novo: exige 3 distratores distintos (sem preenchimento numérico automático). */
const emc: McFn = (skillId, n, statement, correct, distractors, hints, justification, rng, extra) => {
  const distinct = new Set([correct, ...distractors.map((d) => d.text)]); if (distinct.size < 4) throw new Error(`${skillId}.${n}: distratores repetidos (${[...distinct].join(' | ')})`);
  return mc(skillId, n, statement, correct, distractors, hints, justification, rng, extra);
};
Object.assign(GENS, makeEarlyGens(emc));
/** Gera um item da habilidade (nível 0–5) com semente própria: usado pelos minigames para variar as rodadas. */
export function makeItem(skillId: string, level: number, seed: number): Item { const g = GENS[skillId]; if (!g) throw new Error(`sem gerador: ${skillId}`); return g(level, mulberry32(seed)); }

function portuguese(): Item[] {
  const T1 = 'A gata Luna dormia na janela, mas acordou com o barulho da chuva. Correu até a cozinha e ficou esperando o leite.';
  const T2 = 'Lia chegou em casa com os tênis encharcados e o cabelo pingando. Deixou o guarda-chuva quebrado perto da porta.';
  const mk = (id: string, skillId: string, d: number, statement: string, context: string | undefined, opts: [string, string | undefined][], ok: number, hint: string, why: string): Item => {
    const ids = ['a', 'b', 'c', 'd']; return { ...base(skillId, 0), id, difficulty: d, kind: 'multiple_choice', statement, context, options: opts.map(([text, misconception], i) => ({ id: ids[i]!, text, ...(misconception ? { misconception } : {}) })), correct: ids[ok]!, hints: [hint], justification: why };
  };
  return [
    mk('pt.read.literal.1', 'pt.read.literal', 0.2, 'O que a gata Luna fazia quando a chuva começou?', T1, [['Brincava no quintal', 'pt_literal_skim'], ['Dormia na janela', undefined], ['Comia peixe', 'pt_literal_skim'], ['Subia no telhado', 'pt_literal_skim']], 1, 'Procure no texto o que ela fazia antes de acordar.', 'O texto diz: "dormia na janela".'),
    mk('pt.read.literal.2', 'pt.read.literal', 0.4, 'Para onde Luna correu?', T1, [['Para o quarto', 'pt_literal_skim'], ['Para a cozinha', undefined], ['Para o jardim', 'pt_literal_skim'], ['Para a rua', 'pt_literal_skim']], 1, 'Releia o fim do texto.', '"Correu até a cozinha".'),
    mk('pt.read.infer.1', 'pt.read.infer', 0.4, 'Pelo texto, o que provavelmente aconteceu com Lia no caminho?', T2, [['Pegou chuva forte', undefined], ['Foi à praia', 'pt_over_infer'], ['Ganhou um presente', 'pt_over_infer'], ['Perdeu as chaves', 'pt_over_infer']], 0, 'Quais pistas mostram que ela se molhou?', 'Tênis encharcados, cabelo pingando e guarda-chuva quebrado sugerem chuva forte.'),
    mk('pt.read.infer.2', 'pt.read.infer', 0.6, 'Por que Lia deixou o guarda-chuva perto da porta?', T2, [['Porque ele quebrou e não serviria mais', undefined], ['Porque ela odeia guarda-chuvas', 'pt_over_infer'], ['Porque o guarda-chuva era de outra pessoa', 'pt_over_infer'], ['Porque estava sol', 'pt_over_infer']], 0, 'O que o texto diz sobre o estado do guarda-chuva?', 'O guarda-chuva estava quebrado.'),
    mk('pt.vocab.context.1', 'pt.vocab.context', 0.4, 'Na frase "os tênis estavam encharcados", a palavra "encharcados" significa:', undefined, [['muito molhados', undefined], ['muito sujos', undefined], ['muito velhos', undefined], ['muito pequenos', undefined]], 0, 'O que o texto diz sobre a chuva e o cabelo pingando?', '"Encharcado" = ensopado, muito molhado.'),
    mk('pt.gram.agree.1', 'pt.gram.agree', 0.3, 'Qual frase está correta?', undefined, [['As casas pequenas ficam na rua.', undefined], ['As casa pequenas ficam na rua.', 'pt_agree_noun'], ['As casas pequena ficam na rua.', 'pt_agree_noun'], ['Os casas pequenas ficam na rua.', 'pt_agree_noun']], 0, 'Se "casas" está no plural feminino, o que acompanha também deve estar.', 'Artigo, substantivo e adjetivo concordam: as casas pequenas.'),
    mk('pt.gram.agree.2', 'pt.gram.agree', 0.5, 'Complete: "___ menino__ alegre__ brincam."', undefined, [['Os meninos alegres', undefined], ['O meninos alegres', 'pt_agree_noun'], ['Os menino alegres', 'pt_agree_noun'], ['Os meninos alegre', 'pt_agree_noun']], 0, 'Quantos meninos? Todos os termos acompanham.', 'Masculino plural em todos os termos.'),
    { ...base('pt.write.sentence', 0), id: 'pt.write.sentence.1', difficulty: 0.3, kind: 'ordering', statement: 'Ordene as palavras para formar uma frase com sentido.', entries: [{ id: 'w1', label: 'O' }, { id: 'w2', label: 'gato' }, { id: 'w3', label: 'bebe' }, { id: 'w4', label: 'leite' }], correctOrder: ['w1', 'w2', 'w3', 'w4'], hints: ['Quem faz a ação vem primeiro.'], justification: '"O gato bebe leite."' },
    mk('pt.spell.rules.1', 'pt.spell.rules', 0.4, 'Qual palavra está escrita corretamente?', undefined, [['passarinho', undefined], ['pasarinho', undefined], ['paçarinho', undefined], ['pasarinio', undefined]], 0, 'Entre vogais, o som de "s" forte pede "ss".', '"passarinho" usa "ss" entre vogais.'),
  ];
}

export function buildItemBank(): Item[] {
  const items: Item[] = [];
  for (const [skill, gen] of Object.entries(GENS)) {
    const seed = [...skill].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
    for (let n = 0; n < ITEMS_PER_SKILL; n++) items.push(gen(n, mulberry32(seed + n * 977)));
  }
  return [...items, ...handmade(), ...portuguese()];
}
