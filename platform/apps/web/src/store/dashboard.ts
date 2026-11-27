// Modelo de visão do painel do aluno. TUDO é derivado dos módulos reais (motor, carteira, catálogo). Sem evidência → null (nunca número inventado).
import { evolution } from '@edu/learning';
import { levelTitle } from '@edu/gamification';
import { MATH_WORLDS, PERFORMANCE_GROUPS, ALL_SKILLS, MISCONCEPTIONS } from '@edu/content-math';
import type { MasteryState } from '@edu/types';
import type { AgeBand } from '@edu/types';
import { balances, bandOf, levelInfo, reportFor, skillName, type DB, type Student } from './db';
import { DEFAULT_AVATAR, type AvatarSpec, type MedalKind } from '../ui/art';
import type { MascotState } from '../ui/axolotl';

export type Tone = 'ok' | 'warn' | 'bad' | 'none';
export const toneOf = (p: number | null): Tone => (p === null ? 'none' : p >= 0.8 ? 'ok' : p >= 0.5 ? 'warn' : 'bad');
export interface Medal { kind: MedalKind; title: string; sub: string; earned: boolean; how: string }
export interface MapNode { id: string; label: string; skillId: string; status: 'mastered' | 'current' | 'open' | 'locked'; state: MasteryState; why: string }
export interface PlanItem { id: string; art: 'video' | 'game' | 'target' | 'compass'; title: string; min: number; done: boolean }
export interface Mission { title: string; text: string; cta: string; route: string; mascot: MascotState; pie: boolean }
export interface DashVM {
  name: string; band: AgeBand; avatar: AvatarSpec; xp: number; level: { n: number; into: number; span: number; title: string }; minutes: number; hasDiag: boolean;
  mission: Mission; subjects: { id: 'portugues' | 'matematica' | 'ciencias' | 'historia'; name: string; pct: number | null; note: string; active: boolean }[];
  groups: { id: string; name: string; pct: number | null; n: number; conf: string }[];
  plan: { subtitle: string; items: PlanItem[]; cta: { label: string; route: string } };
  world: { id: string; name: string; theme: string; nodes: MapNode[] }; medals: Medal[]; notifications: { id: string; text: string; route: string }[]; focusName?: string;
}
export const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}min` : ''}` : `${m}min`);

export function buildDashboard(d: DB, s: Student): DashVM {
  const b = balances(s); const lv = levelInfo(b.xp); const rep = reportFor(s); const byId = new Map(rep.map((r) => [r.skillId, r]));
  const now = Date.now(); void now;
  const unseen = Object.values(s.learner.hypotheses).filter((h) => h.status === 'confirmed' && !s.shownExplanations.includes(h.id));
  const needs = rep.filter((r) => r.state === 'needs_support').sort((a, c) => a.probability - c.probability);
  const focus = needs[0]; const reassess = s.practiceRounds > s.reassessRounds;
  const mission: Mission = !s.diagDone ? { title: 'Nova Missão!', text: 'Vamos descobrir o que você já sabe em Matemática, no seu ritmo?', cta: 'Começar agora', route: '/s/session?kind=diagnostic', mascot: 'apresentando', pie: false }
    : unseen.length ? { title: 'Nova Missão!', text: `Descobri um jeito de te ajudar com ${skillName(MISCONCEPTIONS[unseen[0]!.id]?.skillId ?? '')}. Vamos ver?`, cta: 'Ver explicação', route: '/s/explain', mascot: 'explicando', pie: false }
    : reassess ? { title: 'Hora de mostrar!', text: 'Vamos ver o quanto você evoluiu desde o começo?', cta: 'Começar agora', route: '/s/session?kind=reassessment', mascot: 'comemorando', pie: false }
    : focus ? { title: 'Nova Missão!', text: `Vamos fortalecer seu conhecimento em ${focus.name} de um jeito divertido?`, cta: 'Começar agora', route: '/s/session?kind=practice', mascot: 'apresentando', pie: focus.skillId.startsWith('frac') }
    : { title: 'Nova Missão!', text: 'Vamos continuar avançando e revisando o que você já sabe?', cta: 'Começar agora', route: '/s/session?kind=practice', mascot: 'apresentando', pie: false };

  const assessed = rep.filter((r) => r.evidenceCount > 0);
  const mean = (xs: typeof rep) => (xs.length ? xs.reduce((a, r) => a + r.probability, 0) / xs.length : null);
  const subjects: DashVM['subjects'] = [
    { id: 'portugues', name: 'Português', pct: null, note: 'Em breve', active: false },
    { id: 'matematica', name: 'Matemática', pct: mean(assessed) === null ? null : Math.round(mean(assessed)! * 100), note: assessed.length ? `estimativa de ${assessed.length} habilidade(s)` : 'Faça o diagnóstico', active: true },
    { id: 'ciencias', name: 'Ciências', pct: null, note: 'Em breve', active: false },
    { id: 'historia', name: 'História', pct: null, note: 'Em breve', active: false },
  ];
  const groups = PERFORMANCE_GROUPS.map((g) => { const rs = assessed.filter((r) => g.match(r.skillId)); const m = mean(rs); const conf = rs.length ? (rs.reduce((a, r) => a + r.confidence, 0) / rs.length < 0.4 ? 'baixa' : 'média') : '—'; return { id: g.id, name: g.name, pct: m === null ? null : Math.round(m * 100), n: rs.length, conf }; });

  const planItems: PlanItem[] = [];
  if (!s.diagDone) planItems.push({ id: 'diag', art: 'compass', title: 'Diagnóstico inicial: descobrir o que você já sabe', min: 20, done: false });
  else {
    if (unseen.length || s.shownExplanations.length) planItems.push({ id: 'explain', art: 'video', title: `Entender: ${MISCONCEPTIONS[(unseen[0]?.id ?? s.shownExplanations.at(-1))!]?.label ?? 'explicação'}`, min: 15, done: unseen.length === 0 });
    planItems.push({ id: 'practice', art: 'game', title: focus ? `Praticando ${focus.name} (atividades)` : 'Praticando com revisão leve', min: 16, done: false });
    planItems.push({ id: 'reassess', art: 'target', title: 'Reavaliar e ver a evolução', min: 10, done: s.reassessRounds > 0 && !reassess });
  }
  const planCta = { label: 'Continuar Plano', route: mission.route };
  const planSub = !s.diagDone ? 'Primeiro passo: o diagnóstico' : needs.length ? `Focado em ${needs.slice(0, 2).map((r) => r.name).join(' e ')}` : 'Avanço e revisão do que você já domina';

  // mundo atual e fases desbloqueadas por EVIDÊNCIA (não por pontos)
  const worldOfFocus = focus ? MATH_WORLDS.find((w) => w.skillIds.includes(focus.skillId)) : undefined;
  const world = worldOfFocus ?? MATH_WORLDS.find((w) => w.skillIds.some((id) => byId.get(id)!.state !== 'consolidated')) ?? MATH_WORLDS[0]!;
  const prereq = new Map(ALL_SKILLS.map((k) => [k.id, k.prerequisites]));
  const nodes: MapNode[] = world.skillIds.map((id) => {
    const r = byId.get(id)!; const blocker = (prereq.get(id) ?? []).find((p) => byId.get(p)?.state === 'needs_support');
    const status = r.state === 'consolidated' ? 'mastered' : blocker ? 'locked' : 'open';
    return { id, label: r.name, skillId: id, status, state: r.state, why: status === 'mastered' ? 'Dominada com evidências suficientes.' : blocker ? `Libera quando "${skillName(blocker)}" estiver mais firme (evidência, não pontos).` : r.state === 'insufficient_evidence' ? 'Ainda sem evidências: pratique para descobrir.' : 'Em desenvolvimento: continue praticando.' };
  });
  const cur = nodes.findIndex((n) => n.status !== 'mastered' && n.status !== 'locked'); if (cur >= 0) nodes[cur]!.status = 'current';

  const grew = rep.find((r) => (evolution(s.learner, r.skillId).delta ?? 0) > 0.1);
  const n = s.learner.responses.length;
  const medals: Medal[] = [
    { kind: 'first', title: 'Primeiro Passo', sub: 'Concluiu o diagnóstico', earned: s.diagDone, how: 'Conclua o diagnóstico inicial.' },
    { kind: 'study', title: 'Estudioso', sub: n >= 5 ? `Fez ${n} atividades` : '5 atividades', earned: n >= 5, how: 'Complete 5 atividades.' },
    { kind: 'focus', title: 'Foco Total', sub: s.practiceRounds ? `Concluiu ${s.practiceRounds} plano(s)` : 'Conclua um plano', earned: s.practiceRounds > 0, how: 'Conclua um plano de prática.' },
    { kind: 'grow', title: 'Superação', sub: grew ? `Evoluiu em ${grew.name}` : 'Evolua em uma habilidade', earned: !!grew, how: 'A estimativa de uma habilidade sobe após a reavaliação.' },
    { kind: 'hint', title: 'Curioso', sub: 'Pediu ajuda e aprendeu', earned: s.learner.responses.some((r) => r.hintsUsed > 0), how: 'Use uma dica numa atividade (pedir ajuda é inteligente!).' },
    { kind: 'again', title: 'Reavaliador', sub: 'Mostrou o que aprendeu', earned: s.reassessRounds > 0, how: 'Conclua uma reavaliação.' },
  ];
  const notifications: DashVM['notifications'] = [];
  if (unseen.length) notifications.push({ id: 'expl', text: 'Tem uma explicação nova esperando por você.', route: '/s/explain' });
  for (const p of d.reinforcement.filter((r) => r.studentId === s.id).slice(-2)) notifications.push({ id: p.id, text: `Plano de reforço da professora: ${p.skillIds.map(skillName).join(', ')}.`, route: '/s/missoes' });
  for (const t of d.timeRequests.filter((x) => x.studentId === s.id && x.status !== 'pending').slice(-2)) notifications.push({ id: t.id, text: t.status === 'approved' ? `Seu pedido de ${t.minutes} min foi aprovado.` : 'Seu pedido de tempo não foi aprovado desta vez.', route: '/s/familia' });
  if (s.session) notifications.push({ id: 'ses', text: 'Você deixou uma atividade em andamento.', route: `/s/session?kind=${s.session.kind}` });

  return { name: s.name, band: bandOf(s), avatar: s.avatar.spec ?? DEFAULT_AVATAR, xp: b.xp, level: { n: lv.level, into: lv.into, span: lv.span, title: levelTitle(lv.level) }, minutes: b.minutes, hasDiag: s.diagDone,
    mission, subjects, groups, plan: { subtitle: planSub, items: planItems, cta: planCta }, world: { id: world.id, name: world.name, theme: world.theme, nodes }, medals, notifications, focusName: focus?.name };
}
