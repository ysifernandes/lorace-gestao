import type { Evidence, EvidenceKind, MasteryState } from '@edu/types';

/**
 * Estimador de domínio por habilidade (Beta-Bernoulli ponderado).
 * É um modelo SIMPLES e transparente, parametrizado — NÃO validado empiricamente ainda
 * (ver DIAGNOSTIC_ENGINE.md → "Validação pendente"). Calibrar com dados reais e revisão docente.
 */
export interface MasteryParams {
  minEvidence: number; // evidências mínimas para sair de "insufficient_evidence"
  minConfidence: number;
  consolidatedP: number;
  supportP: number;
  consolidatedMinConfidence: number;
  halfLifeDays: number;
  kindWeight: Record<EvidenceKind, number>;
}

export const DEFAULT_PARAMS: MasteryParams = {
  minEvidence: 3,
  minConfidence: 0.4,
  consolidatedP: 0.8,
  supportP: 0.5,
  consolidatedMinConfidence: 0.5,
  halfLifeDays: 90,
  kindWeight: { diagnostic: 1, practice: 1, game: 0.8, transfer: 1.5, delayed_review: 1.5 },
};

export interface MasteryEstimate {
  skillId: string;
  probability: number; // média posterior
  confidence: number; // 0..1, cresce com evidência efetiva
  evidenceCount: number;
  state: MasteryState;
}

const DAY = 86_400_000;

export function estimateMastery(
  skillId: string,
  evidence: Evidence[],
  now: number,
  params: MasteryParams = DEFAULT_PARAMS,
): MasteryEstimate {
  let a = 1;
  let b = 1; // prior uniforme
  let n = 0;
  let count = 0;
  for (const e of evidence) {
    if (e.skillId !== skillId) continue;
    count++;
    const ageDays = Math.max(0, (now - e.at) / DAY);
    const decay = Math.pow(0.5, ageDays / params.halfLifeDays);
    const w = params.kindWeight[e.kind] * decay;
    if (e.correct) {
      // acerto com dicas vale menos (autonomia); nunca menos de 30%
      const hintFactor = Math.max(0.3, 1 - 0.25 * e.hintsUsed);
      a += w * hintFactor;
      n += w * hintFactor;
    } else {
      b += w;
      n += w;
    }
  }
  const probability = a / (a + b);
  const confidence = n / (n + 4);
  let state: MasteryState;
  if (count < params.minEvidence || confidence < params.minConfidence) state = 'insufficient_evidence';
  else if (probability >= params.consolidatedP && confidence >= params.consolidatedMinConfidence) state = 'consolidated';
  else if (probability < params.supportP) state = 'needs_support';
  else state = 'developing';
  return { skillId, probability, confidence, evidenceCount: count, state };
}

export function estimateAll(skillIds: string[], evidence: Evidence[], now: number, params?: MasteryParams) {
  return new Map(skillIds.map((id) => [id, estimateMastery(id, evidence, now, params)]));
}
