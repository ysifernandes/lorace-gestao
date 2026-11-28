import type { Item } from '@edu/content-math';

export type Response =
  | { choice: string } | { text: string } | { order: string[] } | { pairs: [string, string][] }
  | { placement: Record<string, string> } | { shaded: number } | { num: number };
export interface Grade { correct: boolean; score: number; misconceptions: string[]; /** tags possíveis neste item (para sondagem) */ probed: string[] }

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.');

export function possibleTags(item: Item): string[] {
  if ('options' in item) return [...new Set(item.options.flatMap((o) => (o.misconception ? [o.misconception] : [])))];
  if (item.kind === 'fill_in') return [...new Set((item.wrongPatterns ?? []).map((w) => w.misconception))];
  if (item.kind === 'fraction_visual') return [...new Set((item.wrongPatterns ?? []).map((w) => w.misconception))];
  if (item.kind === 'ordering' && item.misconceptionIfReversed) return [item.misconceptionIfReversed];
  return [];
}

export function gradeItem(item: Item, r: Response): Grade {
  const probed = possibleTags(item);
  const out = (score: number, mis: string[] = []): Grade => ({ correct: score === 1, score, misconceptions: mis, probed });
  switch (item.kind) {
    case 'multiple_choice': case 'word_problem': case 'reasoning': {
      if (!('choice' in r)) throw new Error('resposta inválida');
      const o = item.options.find((x) => x.id === r.choice); if (!o) throw new Error('opção inexistente');
      return out(o.id === item.correct ? 1 : 0, o.misconception ? [o.misconception] : []);
    }
    case 'fill_in': {
      if (!('text' in r)) throw new Error('resposta inválida'); const t = norm(r.text);
      if (item.accepted.some((a) => norm(a) === t)) return out(1);
      const w = item.wrongPatterns?.find((x) => norm(x.answer) === t); return out(0, w ? [w.misconception] : []);
    }
    case 'ordering': {
      if (!('order' in r)) throw new Error('resposta inválida');
      const ok = r.order.length === item.correctOrder.length && r.order.every((id, i) => id === item.correctOrder[i]);
      const hits = r.order.filter((id, i) => id === item.correctOrder[i]).length;
      const reversed = !ok && r.order.length > 1 && r.order.every((id, i) => id === item.correctOrder[item.correctOrder.length - 1 - i]);
      return out(ok ? 1 : hits / item.correctOrder.length * 0.99, reversed && item.misconceptionIfReversed ? [item.misconceptionIfReversed] : []);
    }
    case 'matching': {
      if (!('pairs' in r)) throw new Error('resposta inválida');
      const key = (p: [string, string]) => p.join('>'); const sol = new Set(item.pairs.map(key));
      const hits = r.pairs.filter((p) => sol.has(key(p))).length;
      return out(hits === item.pairs.length && r.pairs.length === item.pairs.length ? 1 : (hits / item.pairs.length) * 0.99);
    }
    case 'drag_drop': {
      if (!('placement' in r)) throw new Error('resposta inválida');
      const ids = Object.keys(item.solution); const hits = ids.filter((t) => r.placement[t] === item.solution[t]).length;
      return out(hits === ids.length ? 1 : (hits / ids.length) * 0.99);
    }
    case 'fraction_visual': {
      if (!('shaded' in r)) throw new Error('resposta inválida');
      if (r.shaded === item.targetNum) return out(1);
      const w = item.wrongPatterns?.find((x) => x.shaded === r.shaded); return out(0, w ? [w.misconception] : []);
    }
    case 'simulation': {
      if (!('num' in r)) throw new Error('resposta inválida'); return out(r.num === item.targetNum ? 1 : 0);
    }
  }
}
