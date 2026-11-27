import type { Evidence } from '@estuda/types';
import type { KnowledgeGraph } from './graph';
import { estimateMastery, type MasteryEstimate } from './mastery';

export interface Item {
  id: string;
  skillId: string;
  /** 0 (muito fácil) .. 1 (muito difícil) */
  difficulty: number;
}

export interface NextItem {
  item: Item;
  reason: 'target_needs_evidence' | 'probe_prerequisite';
  /** habilidade-alvo cuja dificuldade suspeita motivou a investigação (quando probe) */
  investigating?: string;
}

const SUSPECT_MIN_EVIDENCE = 2;

/** Suspeita de lacuna: já há ao menos 2 evidências e probabilidade < 0.5. Não é diagnóstico definitivo. */
export function isSuspectedGap(e: MasteryEstimate): boolean {
  return e.evidenceCount >= SUSPECT_MIN_EVIDENCE && e.probability < 0.5;
}

/**
 * Seleciona o próximo item da avaliação adaptativa.
 * 1) Se uma habilidade-alvo é suspeita de lacuna, investiga seus pré-requisitos (do mais próximo ao mais distante).
 * 2) Senão, coleta evidência nos alvos com menos evidência.
 * 3) A dificuldade do item acompanha a estimativa atual (sobe se acerta, desce se erra).
 * Retorna null quando todas as habilidades relevantes têm evidência mínima ou não há itens.
 */
export function nextItem(
  graph: KnowledgeGraph,
  bank: Item[],
  targets: string[],
  evidence: Evidence[],
  asked: Set<string>,
  now: number,
  minEvidence = 3,
): NextItem | null {
  const est = (id: string) => estimateMastery(id, evidence, now);
  const pick = (skillId: string): Item | null => {
    const e = est(skillId);
    const want = Math.min(0.9, Math.max(0.1, 0.2 + 0.6 * e.probability));
    const cands = bank.filter((i) => i.skillId === skillId && !asked.has(i.id));
    if (!cands.length) return null;
    return cands.reduce((best, c) => (Math.abs(c.difficulty - want) < Math.abs(best.difficulty - want) ? c : best));
  };

  // 1) investigação regressiva
  for (const t of targets) {
    if (!isSuspectedGap(est(t))) continue;
    for (const p of graph.prerequisitesOf(t)) {
      if (est(p).evidenceCount >= minEvidence) continue;
      const item = pick(p);
      if (item) return { item, reason: 'probe_prerequisite', investigating: t };
    }
  }
  // 2) cobertura dos alvos (menos evidência primeiro, ordem topológica como desempate)
  const order = new Map(graph.topologicalOrder().map((id, i) => [id, i]));
  const pending = targets
    .filter((t) => est(t).evidenceCount < minEvidence)
    .sort((a, b) => est(a).evidenceCount - est(b).evidenceCount || order.get(a)! - order.get(b)!);
  for (const t of pending) {
    const item = pick(t);
    if (item) return { item, reason: 'target_needs_evidence' };
  }
  return null;
}
