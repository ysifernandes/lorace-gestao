// Conteúdo AUTORAL em rascunho (sem revisão profissional): primeira infância (5–7), medidas, decimais,
// geometria, negativos e Língua Portuguesa básica. Gabaritos calculados por código; nenhum código BNCC (bnccCode = null).
import type { Figure, Item } from './types';
import { ri, shuffle } from './rng';

type D = { text: string; tag?: string };
export type McFn = (skillId: string, n: number, statement: string, correct: string, distractors: D[], hints: string[], justification: string, rng: () => number,
  extra?: { kind?: 'multiple_choice' | 'word_problem' | 'reasoning'; context?: string; figure?: Figure; spoken?: string }) => Item;
type Gen = (n: number, r: () => number) => Item;
const pick = <T,>(r: () => number, xs: T[]): T => xs[ri(r, 0, xs.length - 1)]!;
const fmt = (x: number, d = 2) => x.toFixed(d).replace('.', ',');
const MINUS = '−';
const neg = (x: number) => (x < 0 ? `${MINUS}${-x}` : String(x));

/* ------------ nomes de fichas (padrões) ------------ */
const SHAPE_NAME: Record<string, [string, 'm' | 'f']> = { circulo: ['círculo', 'm'], quadrado: ['quadrado', 'm'], triangulo: ['triângulo', 'm'], estrela: ['estrela', 'f'] };
const COLOR_NAME: Record<string, [string, string]> = { vermelho: ['vermelho', 'vermelha'], azul: ['azul', 'azul'], verde: ['verde', 'verde'], amarelo: ['amarelo', 'amarela'] };
export const tokenName = (tok: string) => { const [s, c] = tok.split(':') as [string, string]; const [sn, g] = SHAPE_NAME[s]!; return `${sn} ${COLOR_NAME[c]![g === 'm' ? 0 : 1]}`; };
const TOKENS = ['circulo:vermelho', 'quadrado:azul', 'triangulo:verde', 'estrela:amarelo', 'circulo:azul', 'quadrado:amarelo', 'triangulo:vermelho', 'estrela:verde'];

const ICONS: { icon: 'maca' | 'estrela' | 'bola' | 'peixe'; pl: string }[] = [{ icon: 'maca', pl: 'maçãs' }, { icon: 'estrela', pl: 'estrelas' }, { icon: 'bola', pl: 'bolas' }, { icon: 'peixe', pl: 'peixes' }];

/* ------------ Português: tabelas ------------ */
const LETTERS: [string, string, string][] = [['BOLA', 'B', 'D'], ['DADO', 'D', 'B'], ['FACA', 'F', 'V'], ['VASO', 'V', 'F'], ['PATO', 'P', 'B'], ['GATO', 'G', 'C'], ['MALA', 'M', 'N'], ['NATA', 'N', 'M'], ['SAPO', 'S', 'C'], ['LUA', 'L', 'R'], ['RATO', 'R', 'L'], ['TATU', 'T', 'D']];
const SOUND_WORDS: [string, string, string][] = [['BOLA', 'BOTA', 'DEDO'], ['FACA', 'FOCA', 'VACA'], ['PATO', 'PIPA', 'BOLO'], ['MALA', 'MESA', 'NATA'], ['SAPO', 'SOPA', 'CASA'], ['LUA', 'LEÃO', 'RUA']];
const SYL: [string, number][] = [['pé', 1], ['sol', 1], ['pão', 1], ['gato', 2], ['bola', 2], ['casa', 2], ['sapato', 3], ['macaco', 3], ['janela', 3], ['pipoca', 3], ['borboleta', 4], ['elefante', 4], ['abacaxi', 4], ['televisão', 4], ['hipopótamo', 5], ['paralelepípedo', 6]];
const RHYME: [string, string, string, string][] = [['gato', 'pato', 'galo', 'miau'], ['bola', 'cola', 'boné', 'chute'], ['casa', 'asa', 'cadeira', 'janela'], ['dedo', 'medo', 'dente', 'mão'], ['coração', 'botão', 'corpo', 'amor'], ['feliz', 'giz', 'folha', 'sorriso']];
const SYN: [string, string, string, string, string][] = [['grande', 'enorme', 'pequeno', 'verde', 'quente'], ['feliz', 'alegre', 'triste', 'rápido', 'alto'], ['rápido', 'veloz', 'lento', 'doce', 'novo'], ['bonito', 'belo', 'feio', 'cheio', 'curto'], ['forte', 'robusto', 'fraco', 'claro', 'seco'], ['começar', 'iniciar', 'terminar', 'correr', 'cantar'], ['calmo', 'tranquilo', 'agitado', 'pesado', 'azul'], ['claro', 'luminoso', 'escuro', 'quieto', 'leve']];
const TENSE: [string, string, string, string][] = [['brincar', 'brinquei', 'brinco', 'brincarei'], ['comer', 'comi', 'como', 'comerei'], ['estudar', 'estudei', 'estudo', 'estudarei'], ['correr', 'corri', 'corro', 'correrei'], ['pintar', 'pintei', 'pinto', 'pintarei'], ['cantar', 'cantei', 'canto', 'cantarei']];
const PUNCT: { q: string[]; s: string[]; e: string[] } = { q: ['Qual é o seu nome', 'Onde fica a escola', 'Quem quer brincar', 'Como você está'], s: ['O gato dorme no sofá', 'Eu gosto de chocolate', 'A lua brilha no céu', 'Hoje é sábado'], e: ['Que susto', 'Como está lindo este dia', 'Parabéns', 'Que festa incrível'] };

const syllableDs = (k: number, letters: number): D[] => { const out: D[] = []; const seen = new Set([k]); if (!seen.has(letters)) { out.push({ text: String(letters), tag: 'pt_syl_count_letters' }); seen.add(letters); } for (const c of [k + 1, k - 1, k + 2, k + 3, k + 4]) { if (out.length >= 3) break; if (c > 0 && !seen.has(c)) { out.push({ text: String(c) }); seen.add(c); } } return out; };
export function makeEarlyGens(mc: McFn): Record<string, Gen> {
  const G: Record<string, Gen> = {};

  /* ===== 5–7 anos: matemática ===== */
  G['num.count'] = (n, r) => { const k = [3, 4, 5, 7, 9, 12][n]! + (n > 1 ? ri(r, 0, 1) : 0); const ic = pick(r, ICONS);
    return mc('num.count', n, `Quantas ${ic.pl} você vê?`, String(k), [{ text: String(k + 1), tag: 'count_off_by_one' }, { text: String(k - 1), tag: 'count_off_by_one' }, { text: String(k + 2) }], ['Toque em cada uma só uma vez, devagar.', 'Conte em voz alta e não pule nenhuma.'], `Há ${k} ${ic.pl}.`, r,
      { figure: { type: 'count', n: k, icon: ic.icon }, spoken: `Quantas ${ic.pl} você vê?` }); };
  G['num.compare'] = (n, r) => { const hi = n < 2 ? 9 : n < 4 ? 15 : 30; let a = ri(r, 2, hi), b = ri(r, 2, hi); while (a === b || (n >= 4 && Math.abs(a - b) < 3)) { a = ri(r, 2, hi); b = ri(r, 2, hi); }
    const big = n % 2 === 0; const ans = big ? Math.max(a, b) : Math.min(a, b), other = big ? Math.min(a, b) : Math.max(a, b); const q = `Qual número é ${big ? 'MAIOR' : 'MENOR'}: ${a} ou ${b}?`;
    return mc('num.compare', n, q, String(ans), [{ text: String(other), tag: 'compare_wrong_direction' }, { text: 'Os dois são iguais' }, { text: 'Não dá para saber' }], ['Imagine duas pilhas: qual tem mais?', big ? 'Maior é o que tem mais.' : 'Menor é o que tem menos.'], `${ans} é ${big ? 'maior' : 'menor'} que ${other}.`, r, { spoken: q.replace('MAIOR', 'maior').replace('MENOR', 'menor') }); };
  G['num.order'] = (n, r) => { const x = ri(r, 2, 8 + n * 2); let q = '', ans = 0, wrong = 0;
    if (n < 2) { q = `Que número vem DEPOIS do ${x}?`; ans = x + 1; wrong = x - 1; }
    else if (n < 4) { q = `Que número vem ANTES do ${x + 1}?`; ans = x; wrong = x + 2; }
    else if (n === 4) { q = `Que número fica entre ${x} e ${x + 2}?`; ans = x + 1; wrong = x + 3; }
    else { q = `Complete a sequência: ${x}, ${x + 1}, __, ${x + 3}`; ans = x + 2; wrong = x + 4; }
    return mc('num.order', n, q, String(ans), [{ text: String(wrong), tag: 'order_neighbor_confusion' }, { text: String(n < 2 ? ans + 2 : n < 4 ? ans - 1 : ans - 2) }, { text: String(x + (n === 5 ? -1 : 5)) }], ['Conte a partir do começo: um, dois, três…', 'Depois é para frente; antes é para trás.'], `A resposta é ${ans}.`, r); };
  G['geo.shapes'] = (n, r) => { const SH = ['circulo', 'quadrado', 'triangulo', 'retangulo'] as const; const NM: Record<string, string> = { circulo: 'círculo', quadrado: 'quadrado', triangulo: 'triângulo', retangulo: 'retângulo' };
    if (n < 4) { const sh = SH[[0, 1, 2, 3][n]!]!; const confuse = sh === 'retangulo' ? 'quadrado' : sh === 'quadrado' ? 'retângulo' : null; const names = SH.map((s) => NM[s]!);
      const ds: D[] = names.filter((m) => m !== NM[sh]).map((m) => ({ text: m, tag: confuse && m === NM[confuse] ? 'shape_square_rect' : undefined }));
      return mc('geo.shapes', n, 'Qual é o nome desta forma?', NM[sh]!, ds, ['Olhe os lados e os cantos.', sh === 'circulo' ? 'Esta forma é redonda, sem cantos.' : sh === 'triangulo' ? 'Esta forma tem três cantos.' : 'Conte quantos lados tem.'], `É um ${NM[sh]}.`, r, { figure: { type: 'shape', shape: sh } }); }
    const sh = n === 4 ? 'triangulo' : 'retangulo'; const k = n === 4 ? 3 : 4;
    return mc('geo.shapes', n, `Quantos lados tem este ${NM[sh]}?`, String(k), [{ text: String(k + 1), tag: 'shape_sides_count' }, { text: String(k - 1), tag: 'shape_sides_count' }, { text: String(k + 2) }], ['Passe o dedo em cada lado, sem repetir.', 'Lado é cada linha reta da forma.'], `O ${NM[sh]} tem ${k} lados.`, r, { figure: { type: 'shape', shape: sh } }); };
  G['pat.seq'] = (n, r) => { if (n === 5) { const st = pick(r, [2, 3, 5]); const a = st, seq = [a, a + st, a + 2 * st, a + 3 * st]; const ans = a + 4 * st;
      return mc('pat.seq', n, `Que número continua: ${seq.join(', ')}, ?`, String(ans), [{ text: String(seq[3]! + 1), tag: 'pattern_wrong_step' }, { text: String(seq[3]! + st + 1), tag: 'pattern_wrong_step' }, { text: String(seq[3]! + 2 * st) }], [`Veja quanto aumenta de um número para o outro.`, `Aumenta de ${st} em ${st}.`], `A sequência cresce de ${st} em ${st}: ${ans}.`, r); }
    const units = [[0, 1], [0, 1], [0, 0, 1], [0, 1, 2], [0, 1, 1]]; const unit = units[Math.min(n, 4)]!;
    const toks = shuffle(r, [...TOKENS]).slice(0, 3); const L = unit.length; const shown = Array.from({ length: 5 }, (_, i) => toks[unit[i % L]!]!); const ans = toks[unit[5 % L]!]!;
    const cand = shuffle(r, TOKENS.filter((t) => tokenName(t) !== tokenName(ans) && t !== shown[4])); const last = shown[4]!;
    const ds: D[] = []; if (last !== ans) ds.push({ text: tokenName(last), tag: 'pattern_repeat_last' }); for (const t of cand) { if (ds.length >= 3) break; ds.push({ text: tokenName(t) }); }
    return mc('pat.seq', n, 'Qual ficha continua o padrão?', tokenName(ans), ds, ['Descubra o que se repete.', 'Fale baixinho a sequência e veja onde ela recomeça.'], `O padrão se repete: a próxima é ${tokenName(ans)}.`, r, { figure: { type: 'pattern', seq: [...shown, '?'] } }); };

  /* ===== medidas ===== */
  G['meas.time'] = (n, r) => { const h = ri(r, 8, 15);
    if (n === 0) return mc('meas.time', n, 'Quantos minutos tem 1 hora?', '60', [{ text: '100', tag: 'time_base_ten' }, { text: '30' }, { text: '12' }], ['Uma volta inteira do ponteiro grande.'], '1 hora = 60 minutos.', r);
    if (n === 1) { const d = ri(r, 2, 4); return mc('meas.time', n, `Uma aula começa às ${h}h e dura ${d} horas. A que horas termina?`, `${h + d}h`, [{ text: `${h - d}h` }, { text: `${h + d + 1}h` }, { text: `${h + d - 1}h` }], ['Some as horas de duração à hora de início.'], `${h} + ${d} = ${h + d}.`, r); }
    if (n === 2) return mc('meas.time', n, 'Meia hora tem quantos minutos?', '30', [{ text: '50', tag: 'time_base_ten' }, { text: '15' }, { text: '20' }], ['Meia hora é metade de uma hora.', '60 ÷ 2.'], 'Meia hora = 30 minutos.', r);
    if (n === 3) { const hh = ri(r, 2, 4); return mc('meas.time', n, `${hh} horas e meia são quantos minutos?`, String(hh * 60 + 30), [{ text: String(hh * 100 + 50), tag: 'time_base_ten' }, { text: String(hh * 60 + 50), tag: 'time_base_ten' }, { text: String(hh * 60) }], ['Cada hora tem 60 minutos.', 'Depois some os 30 minutos da meia hora.'], `${hh} × 60 + 30 = ${hh * 60 + 30}.`, r); }
    const m1 = ri(r, 35, 55), m2 = ri(r, 61 - m1, 59 - 0), dh = ri(r, 1, 2); const tot = m1 + m2 - 60; const pad = (x: number) => String(x).padStart(2, '0'); const fm = (hh: number, mm: number) => `${hh}h${pad(mm)}`;
    return mc('meas.time', n, `Um filme começa às ${fm(h, m1)} e dura ${dh}h${pad(m2)}min. A que horas termina?`, fm(h + dh + 1, tot), [{ text: `${h + dh}h${m1 + m2}`, tag: 'time_base_ten' }, { text: fm(h + dh, tot), tag: 'time_hour_carry' }, { text: fm(h + dh + 1, tot + 10 > 59 ? tot - 10 : tot + 10) }], ['Some primeiro os minutos.', 'Quando passa de 60 minutos, vira 1 hora a mais.'], `${m1} + ${m2} = ${m1 + m2} min = 1h${pad(tot)}; horas: ${h} + ${dh} + 1 = ${h + dh + 1}.`, r, { kind: 'word_problem' }); };
  G['meas.money'] = (n, r) => { const paid = pick(r, [10, 20, 50]); const price = ri(r, 3, paid - 2); const rs = (x: number) => `${x} reais`;
    if (n < 3) { const pd = [10, 10, 20][n]!; const pr = ri(r, 2, pd - 2); return mc('meas.money', n, `Você tem ${rs(pd)} e compra um brinquedo de ${rs(pr)}. Quanto sobra de troco?`, rs(pd - pr), [{ text: rs(pd + pr), tag: 'money_add_instead' }, { text: rs(pd - pr + 1) }, { text: rs(Math.max(1, pd - pr - 1)) }], ['Troco é o que sobra do dinheiro.', 'Tire o preço do que você pagou.'], `${pd} − ${pr} = ${pd - pr}.`, r, { kind: 'word_problem' }); }
    const a = ri(r, 2, 9), b = ri(r, 3, 12);
    if (n === 3) return mc('meas.money', n, `Um caderno custa ${rs(a)} e um lápis custa ${rs(b)}. Quanto custa tudo junto?`, rs(a + b), [{ text: rs(Math.abs(b - a)), tag: 'money_subtract_instead' }, { text: rs(a + b + 2) }, { text: rs(a * b) }], ['Juntar preços é somar.'], `${a} + ${b} = ${a + b}.`, r, { kind: 'word_problem' });
    const q = ri(r, 2, 4), unit = ri(r, 2, 6), total = q * unit, pd = pick(r, [20, 50].filter((x) => x > total));
    if (n === 4) return mc('meas.money', n, `Você compra ${q} balas de ${rs(unit)} cada. Quanto paga no total?`, rs(total), [{ text: rs(q + unit), tag: 'money_add_instead' }, { text: rs(total + unit) }, { text: rs(total - unit) }], ['Quantidades iguais: pense em multiplicar.'], `${q} × ${unit} = ${total}.`, r, { kind: 'word_problem' });
    return mc('meas.money', n, `Você compra ${q} picolés de ${rs(unit)} cada e paga com ${rs(pd)}. Qual é o troco?`, rs(pd - total), [{ text: rs(total), tag: 'money_forgot_step' }, { text: rs(pd + total), tag: 'money_add_instead' }, { text: rs(pd - total + 2) }], ['Primeiro ache o total gasto.', 'Depois tire o total do que você pagou.'], `${q} × ${unit} = ${total}; ${pd} − ${total} = ${pd - total}.`, r, { kind: 'word_problem' }); };

  /* ===== decimais e negativos ===== */
  G['dec.compare'] = (n, r) => { const w = ri(r, 0, 2), d1 = ri(r, 3, 8), x = ri(r, 5, 9); const A = `${w},${d1}`, B = `${w},${d1 - 1}${x}`; const big = n % 2 === 0; const q = `Qual número é ${big ? 'MAIOR' : 'MENOR'}: ${A} ou ${B}?`;
    const ans = big ? A : B, other = big ? B : A; const wnum = n >= 3 ? `${w + 1},${d1 - 1}` : null;
    return mc('dec.compare', n, n === 5 && wnum ? `Qual número é MAIOR: ${wnum} ou ${w},${d1}${x}?` : q, n === 5 && wnum ? wnum : ans, [{ text: n === 5 && wnum ? `${w},${d1}${x}` : other, tag: 'dec_longer_bigger' }, { text: 'São iguais' }, { text: 'Não dá para comparar' }], ['Compare primeiro a parte inteira.', 'Depois compare os décimos: o primeiro algarismo depois da vírgula.'], `${ans} ${big ? '>' : '<'} ${other}: compare os décimos antes dos centésimos.`, r); };
  G['dec.add'] = (n, r) => { if (n < 2) { let a = 0, b = 0; do { a = ri(r, 11, 29) / 10; b = ri(r, 11, 29) / 10; } while (Math.round(a * 10) % 10 + Math.round(b * 10) % 10 < 10); const s = a + b;
      const wrong = Math.floor(a) + Math.floor(b) + (Math.round(a * 10) % 10 + Math.round(b * 10) % 10) / 100; return mc('dec.add', n, `Calcule ${fmt(a, 1)} + ${fmt(b, 1)}.`, fmt(s, 1), [{ text: fmt(wrong, 2), tag: 'dec_separate_parts' }, { text: fmt(s + 1, 1) }, { text: fmt(s - 0.1, 1) }], ['Alinhe a vírgula embaixo da vírgula.', 'Some os décimos e leve 1 para os inteiros se passar de 9.'], `${fmt(a, 1)} + ${fmt(b, 1)} = ${fmt(s, 1)}.`, r); }
    const ai = ri(r, 11, 49), bi = ri(r, 105, 395); const a = ai / 10, b = bi / 100; const s = a + b; const wrongAlign = (ai + bi) / 100; const dec = (b - Math.floor(b)) * 100, wrongSep = Math.floor(a) + Math.floor(b) + (Math.round(a * 10) % 10 + Math.round(dec)) / 100;
    return mc('dec.add', n, `Calcule ${fmt(a, 1)} + ${fmt(b, 2)}.`, fmt(s, 2), [{ text: fmt(wrongAlign, 2), tag: 'dec_align_digits' }, { text: fmt(wrongSep, 2), tag: 'dec_separate_parts' }, { text: fmt(s + 0.1, 2) }], ['Escreva 2,5 como 2,50 para alinhar as casas.', 'Vírgula embaixo de vírgula.'], `${fmt(a, 2)} + ${fmt(b, 2)} = ${fmt(s, 2)}.`, r); };
  G['int.neg'] = (n, r) => { if (n < 2) { const a = ri(r, 1, 5), b = a + ri(r, 2, 6); const big = n === 0; const q = `Qual é ${big ? 'MAIOR' : 'MENOR'}: ${neg(-a)} ou ${neg(-b)}?`; const ans = big ? -a : -b, oth = big ? -b : -a;
      return mc('int.neg', n, q, neg(ans), [{ text: neg(oth), tag: 'neg_bigger_digit' }, { text: '0' }, { text: 'São iguais' }], ['Pense numa reta: à direita fica o maior.', 'Quanto mais longe do zero para a esquerda, menor.'], `${neg(ans)} é ${big ? 'maior' : 'menor'} que ${neg(oth)}.`, r); }
    if (n < 4) { const t = ri(r, 2, 6), d = t + ri(r, 2, 6); const ans = t - d; return mc('int.neg', n, `A temperatura era ${t} °C e caiu ${d} graus. Qual é a nova temperatura?`, `${neg(ans)} °C`, [{ text: `${-ans} °C`, tag: 'neg_sign_drop' }, { text: `${t + d} °C`, tag: 'neg_add_instead' }, { text: `${neg(ans - 2)} °C` }], ['Desça no termômetro, passando pelo zero.', 'Quanto falta para chegar a zero? Depois continue descendo.'], `${t} − ${d} = ${neg(ans)}.`, r, { kind: 'word_problem' }); }
    const a = ri(r, 3, 8), b = a + ri(r, 2, 6); const ans = b - a;
    return mc('int.neg', n, `Calcule ${neg(-a)} + ${b}.`, String(ans), [{ text: neg(-(a + b)), tag: 'neg_add_instead' }, { text: neg(-ans), tag: 'neg_sign_drop' }, { text: String(a + b) }], ['Comece em −' + a + ' na reta e ande ' + b + ' para a direita.'], `−${a} + ${b} = ${ans}.`, r); };

  /* ===== geometria ===== */
  G['geo.perim'] = (n, r) => { const a = ri(r, 3, 6 + n), b = ri(r, 2, a - 1 > 2 ? a - 1 : 3); const P = 2 * (a + b);
    if (n < 5) return mc('geo.perim', n, `Um retângulo tem lados de ${a} cm e ${b} cm. Qual é o perímetro?`, `${P} cm`, [{ text: `${a * b} cm`, tag: 'perim_area_confusion' }, { text: `${a + b} cm`, tag: 'perim_two_sides_only' }, { text: `${P + 2} cm` }], ['Perímetro é a volta toda: some todos os lados.', 'O retângulo tem dois lados de cada medida.'], `${a}+${b}+${a}+${b} = ${P}.`, r);
    return mc('geo.perim', n, `Quantos metros de grade são necessários para cercar um terreno quadrado de ${a} m de lado?`, `${4 * a} m`, [{ text: `${a * a} m`, tag: 'perim_area_confusion' }, { text: `${2 * a} m`, tag: 'perim_two_sides_only' }, { text: `${4 * a + 4} m` }], ['Cercar é dar a volta: perímetro.', 'O quadrado tem 4 lados iguais.'], `4 × ${a} = ${4 * a}.`, r, { kind: 'word_problem' }); };
  G['geo.area'] = (n, r) => { const a = ri(r, 3, 6 + n), b = ri(r, 2, a - 1 > 2 ? a - 1 : 3);
    if (n < 4) return mc('geo.area', n, `Um retângulo mede ${a} cm por ${b} cm. Qual é a área?`, `${a * b} cm²`, [{ text: `${2 * (a + b)} cm²`, tag: 'area_perim_confusion' }, { text: `${a + b} cm²`, tag: 'area_add_sides' }, { text: `${a * b + a} cm²` }], ['Área é quanto cabe dentro: quadradinhos.', 'Multiplique comprimento por largura.'], `${a} × ${b} = ${a * b}.`, r);
    if (n === 4) { const c = ri(r, 2, 5); return mc('geo.area', n, `Um piso é formado por dois retângulos: um de ${a} m por ${b} m e outro de ${c} m por ${b} m. Qual é a área total?`, `${a * b + c * b} m²`, [{ text: `${(a + c) * 2 * b} m²`, tag: 'area_perim_confusion' }, { text: `${a * b} m²` }, { text: `${a + c + b} m²`, tag: 'area_add_sides' }], ['Calcule a área de cada retângulo.', 'Depois some as duas áreas.'], `${a}×${b} + ${c}×${b} = ${a * b + c * b}.`, r, { kind: 'word_problem' }); }
    const base2 = 2 * ri(r, 2, 5), h = ri(r, 3, 7); return mc('geo.area', n, `Qual é a área de um triângulo de base ${base2} cm e altura ${h} cm?`, `${(base2 * h) / 2} cm²`, [{ text: `${base2 * h} cm²`, tag: 'tri_area_forgot_half' }, { text: `${base2 + h} cm²`, tag: 'area_add_sides' }, { text: `${(base2 * h) / 2 + 2} cm²` }], ['O triângulo é metade de um retângulo.', 'Base × altura ÷ 2.'], `${base2} × ${h} ÷ 2 = ${(base2 * h) / 2}.`, r); };

  /* ===== Língua Portuguesa básica ===== */
  G['pt.letter.sound'] = (n, r) => { const abc = 'ABCDEFGHIJLMNOPRSTUV'.split('');
    if (n < 3) { const [w, ok, cf] = LETTERS[(n * 4 + ri(r, 0, 3)) % LETTERS.length]!; const others = abc.filter((l) => l !== ok && l !== cf); const o1 = pick(r, others), o2 = pick(r, others.filter((l) => l !== o1));
      return mc('pt.letter.sound', n, `Com que letra começa a palavra ${w}?`, ok, [{ text: cf, tag: 'pt_letter_sound_confuse' }, { text: o1 }, { text: o2 }], ['Fale a palavra devagar e escute o primeiro som.', 'Qual letra faz esse som?'], `${w} começa com ${ok}.`, r, { spoken: `Com que letra começa a palavra ${w.toLowerCase()}?` }); }
    const [w, ok, cf] = SOUND_WORDS[(n - 3) * 2 + ri(r, 0, 1)] ?? SOUND_WORDS[0]!;
    return mc('pt.letter.sound', n, `Qual palavra começa com o mesmo som de ${w}?`, ok, [{ text: cf, tag: 'pt_letter_sound_confuse' }, { text: 'GELO' }, { text: 'UVA' }], ['Compare o primeiro som das palavras.', 'Os sons iniciais iguais combinam.'], `${w} e ${ok} começam com o mesmo som.`, r, { spoken: `Qual palavra começa com o mesmo som de ${w.toLowerCase()}?` }); };
  G['pt.syllable'] = (n, r) => { const pool = SYL.filter(([, k]) => (n < 2 ? k <= 2 : n < 4 ? k === 3 : k >= 3)); const [w, k] = pool[ri(r, 0, pool.length - 1)]!; const letters = w.replace(/[^a-zçãõáéíóúâêô]/gi, '').length;
    return mc('pt.syllable', n, `Quantas sílabas (batidas de palmas) tem a palavra ${w.toUpperCase()}?`, String(k), syllableDs(k, letters), ['Bata palmas para cada pedacinho da palavra.', 'Cada sílaba tem uma vogal que se escuta forte.'], `${w}: ${k} sílaba(s).`, r, { spoken: `Quantas sílabas tem a palavra ${w}? Bata palmas para cada pedacinho.` }); };
  G['pt.rhyme'] = (n, r) => { const [w, ok, st, rel] = RHYME[(n + ri(r, 0, 0)) % RHYME.length]!;
    return mc('pt.rhyme', n, `Qual palavra rima com ${w.toUpperCase()}?`, ok, [{ text: st, tag: 'pt_rhyme_first_letter' }, { text: rel, tag: 'pt_rhyme_meaning' }, { text: 'sol' }], ['Rimas terminam com o mesmo som.', 'Escute o final: ' + w + '…'], `${w} rima com ${ok}: o final tem o mesmo som.`, r, { spoken: `Qual palavra rima com ${w}?` }); };
  G['pt.verb.tense'] = (n, r) => { const [v, past, pres, fut] = pick(r, TENSE); const ver = (t: string, extra: string) => `${t === past ? 'Ontem eu' : t === fut ? 'Amanhã eu' : 'Agora eu'} ${t} ${extra}`; const withClue = n < 3; const sent = (t: string) => (withClue ? ver(t, 'com meus amigos.') : `Eu ${t} com meus amigos.`);
    const target = n % 3 === 0 ? 'past' : n % 3 === 1 ? 'fut' : 'pres'; const form = { past, fut, pres }[target]!; const label = { past: 'já aconteceu', fut: 'vai acontecer', pres: 'está acontecendo agora' }[target]!;
    const wrongs = [past, fut, pres].filter((f) => f !== form); const tag = 'pt_tense_confuse';
    return mc('pt.verb.tense', n, `Em qual frase a ação ${label}?`, sent(form), [{ text: sent(wrongs[0]!), tag }, { text: sent(wrongs[1]!), tag }, { text: `Eu ${v} nunca.` }], ['Veja a terminação do verbo.', 'Passado já foi, presente é agora, futuro ainda vai ser.'], `A frase correta usa ${form}.`, r); };
  G['pt.punct'] = (n, r) => { if (n >= 4) { const fr = ['maçã', 'pera', 'uva', 'banana']; const base = `Comprei ${fr[0]}, ${fr[1]}, ${fr[2]} e ${fr[3]}.`; return mc('pt.punct', n, 'Qual frase usa a vírgula corretamente na lista de frutas?', base, [{ text: `Comprei ${fr[0]}, ${fr[1]}, ${fr[2]}, e ${fr[3]}.`, tag: 'pt_comma_before_e' }, { text: `Comprei ${fr[0]} ${fr[1]} ${fr[2]} e ${fr[3]}.`, tag: 'pt_comma_none' }, { text: `Comprei, ${fr[0]} ${fr[1]}, ${fr[2]} e, ${fr[3]}.` }], ['Na lista, separe os itens com vírgula.', 'Antes do "e" que fecha a lista, não se usa vírgula.'], 'Vírgula separa itens; antes do "e" final não vai vírgula.', r); }
    const typ = (['q', 's', 'e'] as const)[n % 3]!; const text = pick(r, PUNCT[typ]); const ans = { q: '?', s: '.', e: '!' }[typ]; const wrongs = ['.', '?', '!', '…'].filter((x) => x !== ans);
    return mc('pt.punct', n, `Que sinal completa a frase? "${text}__"`, ans, wrongs.map((w) => ({ text: w, tag: w === '.' ? 'pt_punct_period_always' : undefined })), ['Leia a frase com a voz certa: pergunta, afirmação ou surpresa.', typ === 'q' ? 'Perguntamos algo.' : typ === 'e' ? 'Mostra surpresa ou emoção.' : 'Conta uma informação.'], `A frase pede "${ans}".`, r); };
  G['pt.synonym'] = (n, r) => { const [w, syn, ant, o1, o2] = SYN[(n * 2 + ri(r, 0, 1)) % SYN.length]!; const wantAnt = n >= 3;
    return mc('pt.synonym', n, wantAnt ? `Qual palavra tem significado OPOSTO a "${w}"?` : `Qual palavra tem significado PARECIDO com "${w}"?`, wantAnt ? ant : syn, [{ text: wantAnt ? syn : ant, tag: 'pt_synonym_antonym' }, { text: o1 }, { text: o2 }], ['Pense numa frase com a palavra.', wantAnt ? 'Oposto é o contrário.' : 'Parecido quer dizer que dá para trocar na frase.'], `${w} ${wantAnt ? 'é o oposto de' : 'é parecida com'} ${wantAnt ? ant : syn}.`, r); };
  return G;
}

/** Descrições curtas das habilidades novas são mantidas em skills.ts; aqui ficam os equívocos e explicações. */
export const EARLY_MISCONCEPTIONS: [string, string, 'conceptual' | 'procedural' | 'text_interpretation' | 'practical_application' | 'occasional', string, string][] = [
  ['count_off_by_one', 'num.count', 'occasional', 'Contagem com 1 a mais ou a menos', 'Pulou ou repetiu um objeto ao contar (comum no início).'],
  ['compare_wrong_direction', 'num.compare', 'conceptual', 'Trocou maior por menor', 'Escolheu o número oposto ao que a pergunta pedia.'],
  ['order_neighbor_confusion', 'num.order', 'conceptual', 'Confundiu antes e depois', 'Respondeu o vizinho do lado errado.'],
  ['shape_square_rect', 'geo.shapes', 'conceptual', 'Confundiu quadrado e retângulo', 'Não observou a medida dos lados.'],
  ['shape_sides_count', 'geo.shapes', 'occasional', 'Contou lados de forma errada', 'Pulou ou repetiu um lado ao contar.'],
  ['pattern_repeat_last', 'pat.seq', 'conceptual', 'Repetiu a última ficha', 'Não identificou a unidade que se repete.'],
  ['pattern_wrong_step', 'pat.seq', 'procedural', 'Passo errado na sequência', 'Somou um valor diferente do passo da sequência.'],
  ['time_base_ten', 'meas.time', 'conceptual', 'Tratou minutos como base 10', 'Usou 100 ou 10 em vez de 60 como base do tempo.'],
  ['time_hour_carry', 'meas.time', 'procedural', 'Esqueceu de passar 60 min para 1 hora', 'Os minutos passaram de 60 e a hora não foi acrescentada.'],
  ['money_add_instead', 'meas.money', 'conceptual', 'Somou em vez de calcular o troco', 'Operação inversa à da situação de dinheiro.'],
  ['money_subtract_instead', 'meas.money', 'conceptual', 'Subtraiu em vez de juntar preços', 'Juntar valores pede soma.'],
  ['money_forgot_step', 'meas.money', 'procedural', 'Parou no total gasto', 'Respondeu o total da compra, não o troco.'],
  ['dec_longer_bigger', 'dec.compare', 'conceptual', 'Achou que "mais algarismos" é maior', 'Comparou 0,5 e 0,47 como se fossem 5 e 47.'],
  ['dec_separate_parts', 'dec.add', 'procedural', 'Somou parte inteira e decimal separadas sem reagrupar', 'Tratou o que vem depois da vírgula como outro número inteiro.'],
  ['dec_align_digits', 'dec.add', 'procedural', 'Alinhou à direita, não pela vírgula', 'Ignorou as casas decimais ao armar a conta.'],
  ['neg_bigger_digit', 'int.neg', 'conceptual', 'Achou que −7 é maior que −3', 'Ignorou o sinal e comparou só o número.'],
  ['neg_sign_drop', 'int.neg', 'conceptual', 'Perdeu o sinal negativo', 'Respondeu o valor sem indicar que está abaixo de zero.'],
  ['neg_add_instead', 'int.neg', 'procedural', 'Somou em vez de descer na reta', 'Operação contrária à da situação.'],
  ['perim_area_confusion', 'geo.perim', 'conceptual', 'Confundiu perímetro com área', 'Multiplicou os lados em vez de contornar a figura.'],
  ['perim_two_sides_only', 'geo.perim', 'procedural', 'Somou só dois lados', 'Não contornou a figura inteira.'],
  ['area_perim_confusion', 'geo.area', 'conceptual', 'Confundiu área com perímetro', 'Somou o contorno em vez de medir a superfície.'],
  ['area_add_sides', 'geo.area', 'conceptual', 'Somou os lados para achar a área', 'Não percebeu que área é uma multiplicação.'],
  ['tri_area_forgot_half', 'geo.area', 'procedural', 'Esqueceu de dividir por 2 no triângulo', 'Usou base × altura sem a metade.'],
  ['pt_letter_sound_confuse', 'pt.letter.sound', 'conceptual', 'Confundiu sons parecidos', 'Trocou letras de sons próximos (b/d, f/v, c/s…).'],
  ['pt_syl_count_letters', 'pt.syllable', 'conceptual', 'Contou letras em vez de sílabas', 'Não separou a palavra em batidas.'],
  ['pt_rhyme_first_letter', 'pt.rhyme', 'conceptual', 'Rimou pelo começo da palavra', 'Escolheu palavra que começa igual, não que termina igual.'],
  ['pt_rhyme_meaning', 'pt.rhyme', 'conceptual', 'Rimou pelo significado', 'Escolheu palavra relacionada ao assunto, não ao som.'],
  ['pt_tense_confuse', 'pt.verb.tense', 'conceptual', 'Confundiu passado, presente e futuro', 'Não associou a terminação do verbo ao tempo.'],
  ['pt_punct_period_always', 'pt.punct', 'conceptual', 'Usou ponto final em tudo', 'Não distinguiu pergunta, afirmação e exclamação.'],
  ['pt_comma_before_e', 'pt.punct', 'procedural', 'Colocou vírgula antes do "e" final', 'Aplicou regra de outra língua ou do ritmo da fala.'],
  ['pt_comma_none', 'pt.punct', 'procedural', 'Omitiu as vírgulas da lista', 'Não separou os itens da enumeração.'],
  ['pt_synonym_antonym', 'pt.synonym', 'conceptual', 'Confundiu sinônimo com antônimo', 'Trocou "parecido" por "contrário".'],
];

type V = (method: 'passo_a_passo' | 'visual' | 'historia' | 'contraexemplo', title: string, text: string) => { method: typeof method; title: string; body: string[] };
export const earlyExplanations = (V: V): Record<string, ReturnType<V>[]> => ({
  count_off_by_one: [V('passo_a_passo', 'Toque e conte', 'Encoste o dedo em cada objeto, uma vez só, e diga um número para cada toque. O último número que você falou é a quantidade.')],
  compare_wrong_direction: [V('historia', 'Duas pilhas de bolinhas', 'Maior é a pilha que tem mais bolinhas; menor é a que tem menos. Leia de novo a pergunta: ela pede o maior ou o menor?')],
  order_neighbor_confusion: [V('passo_a_passo', 'Caminhe na fila dos números', 'Depois é um passo para frente (7 → 8). Antes é um passo para trás (7 → 6).')],
  shape_square_rect: [V('visual', 'Quadrado tem lados iguais', 'O quadrado tem 4 lados do mesmo tamanho. O retângulo também tem 4 lados, mas dois são mais compridos que os outros dois.')],
  shape_sides_count: [V('passo_a_passo', 'Marque o começo', 'Comece num canto, passe o dedo lado por lado e pare quando voltar ao canto do começo.')],
  pattern_repeat_last: [V('passo_a_passo', 'Ache o pedacinho que se repete', 'Em azul, vermelho, azul, vermelho, a unidade é "azul, vermelho". Depois do vermelho vem o azul de novo, não outro vermelho.')],
  pattern_wrong_step: [V('passo_a_passo', 'Veja o tamanho do pulo', '2, 4, 6, 8: de um número para o outro sobe 2. Continue pulando 2: 10.')],
  time_base_ten: [V('contraexemplo', 'O relógio conta de 60 em 60', '1 hora tem 60 minutos, não 100. Por isso meia hora são 30 minutos e 2 horas e meia são 150 minutos.')],
  time_hour_carry: [V('passo_a_passo', 'Passou de 60? Vira hora', 'Some os minutos. Se der 60 ou mais, tire 60 e some 1 hora. 50 + 40 = 90 min = 1h30.')],
  money_add_instead: [V('historia', 'A história do dinheiro', 'Pagou e recebeu de volta? Então o troco é o que sobra: tire o preço do valor pago. Se está juntando preços, aí sim soma.')],
  money_subtract_instead: [V('passo_a_passo', 'Juntar é somar', 'Para saber quanto custa tudo junto, some os preços.')],
  money_forgot_step: [V('passo_a_passo', 'Duas etapas', '1) Ache o total gasto. 2) Tire o total do dinheiro que você deu: o que sobra é o troco.')],
  dec_longer_bigger: [V('contraexemplo', 'Mais algarismos não é maior', '0,5 é metade (5 décimos). 0,47 é menos que a metade. Escreva 0,5 como 0,50 e compare 50 com 47.')],
  dec_separate_parts: [V('passo_a_passo', 'Alinhe a vírgula', '2,7 + 1,5: some os décimos (7 + 5 = 12 → escreva 2 e leve 1 para a unidade) e depois os inteiros (2 + 1 + 1 = 4). Resultado 4,2.')],
  dec_align_digits: [V('passo_a_passo', 'Vírgula embaixo de vírgula', 'Complete com zeros: 2,50 + 1,75. Alinhe as vírgulas e some coluna por coluna.')],
  neg_bigger_digit: [V('visual', 'A reta dos números', 'Na reta, o que fica mais à direita é maior. −3 está à direita de −7, então −3 > −7.')],
  neg_sign_drop: [V('passo_a_passo', 'Passou do zero, é negativo', 'Se a temperatura cai mais do que o valor que tinha, o resultado fica abaixo de zero e leva o sinal de menos.')],
  neg_add_instead: [V('historia', 'O termômetro', 'Cair é descer no termômetro: é subtrair. Subir é somar. Imagine o termômetro antes de calcular.')],
  perim_area_confusion: [V('visual', 'Perímetro é a cerca', 'Perímetro é a volta da figura (como uma cerca): soma de todos os lados. Área é o que cabe dentro (quadradinhos).')],
  perim_two_sides_only: [V('passo_a_passo', 'Contorne tudo', 'Um retângulo tem 4 lados. Some os 4 (ou dobre a soma de dois lados vizinhos).')],
  area_perim_confusion: [V('visual', 'Área é o piso', 'Área é quantos quadradinhos cobrem a figura por dentro: comprimento × largura. A soma dos lados mede o contorno.')],
  area_add_sides: [V('contraexemplo', 'Some e multiplique não são iguais', 'Retângulo 4 por 3: tem 12 quadradinhos (4 × 3). A soma dos lados (4 + 3 = 7) não conta os quadradinhos.')],
  tri_area_forgot_half: [V('visual', 'Triângulo = metade do retângulo', 'Dois triângulos iguais formam um retângulo. Então a área do triângulo é base × altura ÷ 2.')],
  pt_letter_sound_confuse: [V('passo_a_passo', 'Escute e olhe a boca', 'Fale devagar: B e P usam os lábios; F e V usam dentes e lábio. Escute se o som vibra ou não.')],
  pt_syl_count_letters: [V('passo_a_passo', 'Bata palmas', 'Cada palma é uma sílaba: sa-pa-to tem 3 palmas, mesmo tendo 6 letras.')],
  pt_rhyme_first_letter: [V('passo_a_passo', 'Rima é o final', 'Palavras que rimam terminam igual: gato e pato (…ato). Começar igual não é rima.')],
  pt_rhyme_meaning: [V('passo_a_passo', 'Rima é som, não assunto', 'Bola e chute são do mesmo assunto, mas só bola e cola rimam: terminam com o mesmo som.')],
  pt_tense_confuse: [V('historia', 'A linha do tempo', 'Passado: já aconteceu (brinquei). Presente: está acontecendo (brinco). Futuro: ainda vai acontecer (brincarei). Veja o fim do verbo.')],
  pt_punct_period_always: [V('passo_a_passo', 'Cada frase tem seu sinal', 'Pergunta termina em ? , afirmação termina em . e surpresa ou emoção termina em !.')],
  pt_comma_before_e: [V('passo_a_passo', 'Antes do "e", sem vírgula', 'Na lista, a vírgula separa os itens e o "e" já faz a ligação final: "maçã, pera e uva".')],
  pt_comma_none: [V('passo_a_passo', 'Separe os itens', 'Quando há uma lista, use vírgula entre os itens para a leitura ficar clara.')],
  pt_synonym_antonym: [V('passo_a_passo', 'Parecido ou contrário?', 'Sinônimo é palavra de significado parecido (grande → enorme). Antônimo é o contrário (grande → pequeno). Releia o que a pergunta pede.')],
});
