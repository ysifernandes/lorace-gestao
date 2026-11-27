export * from './types';
export * from './skills';
export * from './misconceptions';
export * from './generators';
export { gcd, lcm, mulberry32, ri, shuffle } from './rng';
import { ALL_SKILLS } from './skills';
import { buildItemBank } from './generators';
import { MISCONCEPTIONS, EXPLANATIONS } from './misconceptions';

/** Valida integridade do conteúdo: referências, grafo, rastreabilidade e gabaritos. Retorna lista de problemas (vazia = ok). */
export function validateContent(skills = ALL_SKILLS, items = buildItemBank()): string[] {
  const errs: string[] = []; const ids = new Set(skills.map((s) => s.id));
  for (const s of skills) { for (const p of s.prerequisites) if (!ids.has(p)) errs.push(`skill ${s.id}: pré-requisito desconhecido ${p}`); if (s.bnccCode !== null && !/^EF\d{2}[A-Z]{2}\d{2}$/.test(s.bnccCode)) errs.push(`skill ${s.id}: bnccCode inválido`); }
  const seen = new Set<string>();
  for (const it of items) {
    if (seen.has(it.id)) errs.push(`item duplicado ${it.id}`); seen.add(it.id);
    if (!ids.has(it.skillId)) errs.push(`item ${it.id}: skill desconhecida`);
    if (!it.source.license || !it.source.reference) errs.push(`item ${it.id}: sem fonte/licença`);
    if (!it.justification) errs.push(`item ${it.id}: sem justificativa`);
    if (!it.hints.length) errs.push(`item ${it.id}: sem dicas`);
    if ('options' in it) {
      if (new Set(it.options.map((o) => o.text)).size !== it.options.length) errs.push(`item ${it.id}: opções repetidas`);
      if (it.options.filter((o) => o.id === it.correct).length !== 1) errs.push(`item ${it.id}: gabarito inválido`);
      for (const o of it.options) if (o.misconception && !MISCONCEPTIONS[o.misconception]) errs.push(`item ${it.id}: equívoco desconhecido ${o.misconception}`);
      if (it.options.find((o) => o.id === it.correct)?.misconception) errs.push(`item ${it.id}: gabarito marcado com equívoco`);
    }
  }
  for (const id of Object.keys(EXPLANATIONS)) if (!MISCONCEPTIONS[id]) errs.push(`explicação sem equívoco: ${id}`);
  for (const m of Object.values(MISCONCEPTIONS)) { if (!ids.has(m.skillId)) errs.push(`equívoco ${m.id}: skill desconhecida`); if (!EXPLANATIONS[m.id]) errs.push(`equívoco ${m.id}: sem explicação`); }
  return errs;
}

/** Mundos temáticos da jornada de matemática (conteúdo editorial: nomes e ordem das fases). Cada fase = uma habilidade do grafo. */
export interface World { id: string; name: string; theme: string; skillIds: string[] }
export const MATH_WORLDS: World[] = [
  { id: 'ilha-numeros', name: 'Ilha dos Números', theme: 'Adição e subtração', skillIds: ['add.facts', 'add.carry', 'sub.facts', 'sub.borrow'] },
  { id: 'laboratorio', name: 'Laboratório da Multiplicação', theme: 'Multiplicação e divisão', skillIds: ['mul.facts', 'mul.multi', 'div.facts', 'div.algorithm', 'factors'] },
  { id: 'pizzaria', name: 'Pizzaria das Frações', theme: 'Frações', skillIds: ['frac.id', 'frac.visual', 'frac.compare', 'frac.equiv', 'frac.simplify', 'frac.add.same', 'frac.add.diff'] },
  { id: 'vila-problemas', name: 'Vila dos Problemas', theme: 'Resolução de problemas', skillIds: ['prob.interpret', 'prob.multi', 'prob.frac'] },
];
/** Agrupamento usado no card "Meu Desempenho". */
export const PERFORMANCE_GROUPS: { id: string; name: string; match: (skillId: string) => boolean }[] = [
  { id: 'addsub', name: 'Adição e subtração', match: (s) => s.startsWith('add.') || s.startsWith('sub.') },
  { id: 'muldiv', name: 'Multiplicação e divisão', match: (s) => s.startsWith('mul.') || s.startsWith('div.') || s === 'factors' },
  { id: 'frac', name: 'Frações', match: (s) => s.startsWith('frac.') },
  { id: 'prob', name: 'Problemas matemáticos', match: (s) => s.startsWith('prob.') },
  { id: 'texto', name: 'Interpretação de texto', match: (s) => s.startsWith('pt.read.') },
];
