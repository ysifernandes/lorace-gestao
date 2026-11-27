import type { ErrorCategory, Evidence, EvidenceKind, MasteryState } from '@edu/types';
import { KnowledgeGraph, estimateMastery, DEFAULT_PARAMS, buildDailyPlan, classifyPatterns, updateHypothesis, type Hypothesis, type MasteryEstimate, type MasteryParams, type ActivityKind } from '@edu/pedagogy';
import { MISCONCEPTIONS, EXPLANATIONS, type ExplanationVariant, type Item, type Skill } from '@edu/content-math';
import { computeXp } from '@edu/gamification';
import { gradeItem, possibleTags, type Grade, type Response } from './grade';

/** Triagem diagnóstica usa limiares menores (2 evidências); a confiança permanece baixa e é exibida como tal. Parâmetros NÃO calibrados. */
export const JOURNEY_PARAMS: MasteryParams = { ...DEFAULT_PARAMS, minEvidence: 2, minConfidence: 0.3 };

export interface ResponseRecord { itemId: string; skillId: string; correct: boolean; score: number; hintsUsed: number; kind: EvidenceKind; at: number; misconceptions: string[]; response: Response; phase: 'diagnostic' | 'practice' | 'reassessment' }
export interface Snapshot { at: number; label: string; skills: Record<string, { p: number; confidence: number; state: MasteryState; n: number }> }
export interface LearnerState {
  studentId: string; evidence: Evidence[]; responses: ResponseRecord[]; hypotheses: Record<string, Hypothesis>;
  explanationsShown: Record<string, number>; snapshots: Snapshot[]; xp: number;
}
export const newLearner = (studentId: string): LearnerState => ({ studentId, evidence: [], responses: [], hypotheses: {}, explanationsShown: {}, snapshots: [], xp: 0 });

export interface Scope { skills: Skill[]; items: Item[] /* já filtrados por "servable" */ }
export const graphOf = (skills: Skill[]) => new KnowledgeGraph(skills.map((s) => ({ id: s.id, name: s.name, subject: s.subject, prerequisites: s.prerequisites.filter((p) => skills.some((x) => x.id === p)) })));

export const estimate = (st: LearnerState, skillId: string, now: number): MasteryEstimate => estimateMastery(skillId, st.evidence, now, JOURNEY_PARAMS);

// ---------- registrar resposta (alimenta evidências e hipóteses) ----------
export function recordResponse(st: LearnerState, item: Item, resp: Response, o: { hintsUsed: number; at: number; phase: ResponseRecord['phase'] }): { state: LearnerState; grade: Grade; xp: number } {
  const grade = gradeItem(item, resp);
  const prior = st.responses.filter((r) => r.skillId === item.skillId);
  // transferência: problema contextualizado após já ter praticado a habilidade em outro formato
  const kind: EvidenceKind = o.phase === 'diagnostic' ? 'diagnostic' : item.kind === 'word_problem' && prior.length > 0 ? 'transfer' : 'practice';
  const ev: Evidence = { skillId: item.skillId, correct: grade.correct, hintsUsed: o.hintsUsed, kind, at: o.at };
  const hyps = { ...st.hypotheses };
  for (const tag of grade.misconceptions) {
    const m = MISCONCEPTIONS[tag]; if (!m) continue;
    hyps[tag] = hyps[tag] ? updateHypothesis(hyps[tag]!, 'consistent') : { id: tag, skillId: m.skillId, category: m.category as ErrorCategory, description: m.label, status: 'suspected', support: 1, contradict: 0 };
  }
  if (grade.correct) for (const tag of grade.probed) if (hyps[tag]) hyps[tag] = updateHypothesis(hyps[tag]!, 'inconsistent'); // sondagem contradiz
  const xp = computeXp({ effort: 1, participation: 1, progress: grade.correct ? 1 : 0.5, understanding: grade.correct ? (o.hintsUsed ? 0.7 : 1) : 0.3 }, 10);
  const rec: ResponseRecord = { itemId: item.id, skillId: item.skillId, correct: grade.correct, score: grade.score, hintsUsed: o.hintsUsed, kind, at: o.at, misconceptions: grade.misconceptions, response: resp, phase: o.phase };
  return { state: { ...st, evidence: [...st.evidence, ev], responses: [...st.responses, rec], hypotheses: hyps, xp: st.xp + xp }, grade, xp };
}

// ---------- diagnóstico adaptativo: do mais avançado para os pré-requisitos ----------
export interface DiagSession { targets: string[]; maxItems: number }
const results = (st: LearnerState, skill: string) => st.responses.filter((r) => r.skillId === skill && r.phase === 'diagnostic');
const solid = (st: LearnerState, s: string) => { const r = results(st, s); return r.length >= 2 && r.every((x) => x.correct); };

export function diagnosticStatus(st: LearnerState, sc: Scope, ds: DiagSession) {
  const g = graphOf(sc.skills.filter((s) => ds.targets.includes(s.id)));
  const inferred = new Set<string>();
  for (const s of ds.targets) if (solid(st, s)) for (const p of g.prerequisitesOf(s)) inferred.add(p);
  return { g, inferred };
}

export function nextDiagnosticItem(st: LearnerState, sc: Scope, ds: DiagSession): { item: Item; skillId: string } | null {
  const asked = new Set(st.responses.map((r) => r.itemId));
  if (st.responses.filter((r) => r.phase === 'diagnostic').length >= ds.maxItems) return null;
  const { g, inferred } = diagnosticStatus(st, sc, ds);
  const order = [...g.topologicalOrder()].reverse();
  for (const s of order) {
    if (inferred.has(s)) continue;
    const deps = g.dependentsOf(s);
    // só é necessário testar se é "topo" ou se algum dependente não está sólido
    const needed = deps.length === 0 || deps.some((d) => !inferred.has(d) && !solid(st, d));
    if (!needed) continue;
    // dependentes ainda sem resolução bloqueiam (precisam ser testados antes)
    if (deps.some((d) => !inferred.has(d) && results(st, d).length < 2 && itemsFor(sc, d, asked).length > 0 && needsTest(st, g, inferred, d))) continue;
    const r = results(st, s); if (r.length >= 2) continue;
    const want = r.length === 0 ? 0.45 : r[0]!.correct ? 0.75 : 0.25;
    const cands = itemsFor(sc, s, asked); if (!cands.length) continue;
    const item = cands.reduce((b, c) => (Math.abs(c.difficulty - want) < Math.abs(b.difficulty - want) ? c : b));
    return { item, skillId: s };
  }
  return null;
}
const itemsFor = (sc: Scope, skillId: string, asked: Set<string>) => sc.items.filter((i) => i.skillId === skillId && !asked.has(i.id));
function needsTest(st: LearnerState, g: KnowledgeGraph, inferred: Set<string>, s: string): boolean {
  if (inferred.has(s)) return false; const deps = g.dependentsOf(s);
  return deps.length === 0 || deps.some((d) => !inferred.has(d) && !solid(st, d));
}

// ---------- relatório por habilidade ----------
export type Level = 'baixa' | 'média' | 'alta';
export const confidenceLabel = (c: number): Level => (c < 0.4 ? 'baixa' : c < 0.65 ? 'média' : 'alta');
export interface Cause { kind: 'misconception' | 'prerequisite' | 'hint_dependence' | 'transfer' | 'retention' | 'occasional'; label: string; status: 'suspeita' | 'confirmada'; confidence: Level; evidence: string[]; misconceptionId?: string; prerequisiteId?: string }
export interface SkillReport { skillId: string; name: string; subject: string; state: MasteryState; probability: number; confidence: number; confidenceLabel: Level; evidenceCount: number; evidenceUsed: ResponseRecord[]; causes: Cause[]; recommendation: string; inferred: boolean }

export function buildReport(st: LearnerState, sc: Scope, skillIds: string[], now: number, itemsAll: Item[] = sc.items): SkillReport[] {
  const byId = new Map(sc.skills.map((s) => [s.id, s])); const itemById = new Map(itemsAll.map((i) => [i.id, i]));
  const label = (r: ResponseRecord) => { const it = itemById.get(r.itemId); return `${r.correct ? 'Acertou' : 'Errou'}${r.hintsUsed ? ` (com ${r.hintsUsed} dica${r.hintsUsed > 1 ? 's' : ''})` : ''}: “${(it?.context ? it.context + ' ' : '') + (it?.statement ?? r.itemId)}”`; };
  return skillIds.map((id) => {
    const s = byId.get(id)!; const e = estimate(st, id, now); const rs = st.responses.filter((r) => r.skillId === id);
    const causes: Cause[] = [];
    for (const h of Object.values(st.hypotheses).filter((x) => x.skillId === id && x.status !== 'discarded')) {
      const ev = rs.filter((r) => r.misconceptions.includes(h.id)).map(label);
      causes.push({ kind: 'misconception', label: MISCONCEPTIONS[h.id]?.label ?? h.description, status: h.status === 'confirmed' ? 'confirmada' : 'suspeita', confidence: h.status === 'confirmed' ? 'alta' : h.support >= 2 ? 'média' : 'baixa', evidence: ev, misconceptionId: h.id });
    }
    const weakish = e.state === 'needs_support' || (e.evidenceCount >= 2 && e.probability < 0.6);
    if (weakish) for (const p of s.prerequisites) { const pe = estimate(st, p, now); if (pe.state === 'needs_support') causes.push({ kind: 'prerequisite', label: `Base ainda frágil: ${byId.get(p)?.name ?? p}`, status: 'suspeita', confidence: confidenceLabel(pe.confidence), evidence: st.responses.filter((r) => r.skillId === p && !r.correct).slice(-3).map(label), prerequisiteId: p }); }
    for (const c of classifyPatterns(st.evidence.filter((x) => x.skillId === id))) {
      if (c === 'hint_dependence') causes.push({ kind: 'hint_dependence', label: 'Acertos dependem de dicas', status: 'suspeita', confidence: 'média', evidence: rs.filter((r) => r.correct && r.hintsUsed >= 2).map(label) });
      if (c === 'transfer') causes.push({ kind: 'transfer', label: 'Acerta o treino, mas tem dificuldade em situações novas', status: 'suspeita', confidence: 'média', evidence: rs.filter((r) => r.kind === 'transfer').map(label) });
      if (c === 'retention') causes.push({ kind: 'retention', label: 'Acertou antes, mas esqueceu na revisão', status: 'suspeita', confidence: 'média', evidence: rs.filter((r) => r.kind === 'delayed_review').map(label) });
      if (c === 'occasional') causes.push({ kind: 'occasional', label: 'Erro ocasional (um deslize isolado)', status: 'suspeita', confidence: 'média', evidence: rs.filter((r) => !r.correct).map(label) });
    }
    return { skillId: id, name: s.name, subject: s.subject, state: e.state, probability: e.probability, confidence: e.confidence, confidenceLabel: confidenceLabel(e.confidence), evidenceCount: e.evidenceCount, evidenceUsed: rs.slice(-8), causes, recommendation: recommend(e.state, causes, byId), inferred: false };
  });
}
function recommend(state: MasteryState, causes: Cause[], byId: Map<string, Skill>): string {
  if (state === 'consolidated') return 'Conhecimento consolidado: manter com revisão espaçada.';
  if (state === 'insufficient_evidence') return 'Ainda não há evidências suficientes: aplicar algumas atividades antes de concluir qualquer dificuldade.';
  const top = causes.find((c) => c.kind === 'misconception' && c.status === 'confirmada') ?? causes.find((c) => c.kind === 'misconception') ?? causes[0];
  const pre = causes.find((c) => c.kind === 'prerequisite');
  const parts: string[] = [];
  if (top?.kind === 'misconception') parts.push(`${top.status === 'confirmada' ? 'Trabalhar' : 'Investigar com atividades de contraste'}: “${top.label}”.`);
  if (pre?.prerequisiteId) parts.push(`Reforçar antes: ${byId.get(pre.prerequisiteId)?.name}.`);
  if (top?.kind === 'hint_dependence') parts.push('Praticar com menos dicas, aumentando a autonomia aos poucos.');
  if (top?.kind === 'transfer') parts.push('Variar contextos e formatos de atividade.');
  if (!parts.length) parts.push('Continuar praticando com atividades de dificuldade crescente e reavaliar.');
  return parts.join(' ');
}

// ---------- explicação personalizada (muda de abordagem se o erro persiste) ----------
export function explanationFor(st: LearnerState, misconceptionId: string): { state: LearnerState; variant: ExplanationVariant; round: number; total: number } | null {
  const list = EXPLANATIONS[misconceptionId]; if (!list?.length) return null;
  const n = st.explanationsShown[misconceptionId] ?? 0;
  return { state: { ...st, explanationsShown: { ...st.explanationsShown, [misconceptionId]: n + 1 } }, variant: list[n % list.length]!, round: n + 1, total: list.length };
}
export const pendingExplanations = (st: LearnerState) => Object.values(st.hypotheses).filter((h) => h.status === 'confirmed' && (st.explanationsShown[h.id] ?? 0) === 0 && EXPLANATIONS[h.id]);

// ---------- plano e prática ----------
export interface PlannedItem { item: Item; kind: ActivityKind }
export function planPractice(st: LearnerState, sc: Scope, targets: string[], count: number, now: number): PlannedItem[] {
  const g = graphOf(sc.skills.filter((s) => targets.includes(s.id)));
  const est = new Map(targets.map((t) => [t, estimate(st, t, now)]));
  const plan = buildDailyPlan(g, est, count);
  const used = new Set<string>(); const out: PlannedItem[] = [];
  const seen = new Set(st.responses.map((r) => r.itemId));
  for (const a of plan) {
    const e = est.get(a.skillId)!; const tags = new Set(Object.values(st.hypotheses).filter((h) => h.skillId === a.skillId && h.status !== 'discarded').map((h) => h.id));
    const target = a.kind === 'review' ? 0.4 : Math.min(0.9, Math.max(0.15, 0.2 + 0.6 * e.probability));
    const cands = sc.items.filter((i) => i.skillId === a.skillId && !used.has(i.id));
    if (!cands.length) continue;
    const score = (i: Item) => (seen.has(i.id) ? 0 : 10) + (a.kind === 'focus' && possibleTags(i).some((t) => tags.has(t)) ? 5 : 0) - Math.abs(i.difficulty - target) * 3;
    const best = cands.reduce((b, c) => (score(c) > score(b) ? c : b)); used.add(best.id); out.push({ item: best, kind: a.kind });
  }
  return out;
}
export function reassessmentItems(st: LearnerState, sc: Scope, skillIds: string[], perSkill = 2): Item[] {
  const seen = new Set(st.responses.map((r) => r.itemId)); const out: Item[] = [];
  for (const s of skillIds) { const c = sc.items.filter((i) => i.skillId === s).sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)) || a.difficulty - b.difficulty); out.push(...c.slice(0, perSkill)); }
  return out;
}

// ---------- evolução ----------
export function takeSnapshot(st: LearnerState, skillIds: string[], label: string, at: number): LearnerState {
  const skills = Object.fromEntries(skillIds.map((id) => { const e = estimate(st, id, at); return [id, { p: e.probability, confidence: e.confidence, state: e.state, n: e.evidenceCount }]; }));
  return { ...st, snapshots: [...st.snapshots, { at, label, skills }] };
}
export function evolution(st: LearnerState, skillId: string): { before?: Snapshot['skills'][string]; after?: Snapshot['skills'][string]; delta?: number } {
  const withSkill = st.snapshots.filter((s) => s.skills[skillId]); if (withSkill.length < 2) return { before: withSkill[0]?.skills[skillId] };
  const before = withSkill[0]!.skills[skillId]!, after = withSkill.at(-1)!.skills[skillId]!; return { before, after, delta: after.p - before.p };
}
