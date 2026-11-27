import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { evolution, type Response } from '@edu/learning';
import { MISCONCEPTIONS } from '@edu/content-math';
import { useDB, currentUser, bandOf, balances, reportFor, startSession, currentItem, answer, finishSession, abandonSession, nextExplanation, skillName, scope, type Student, type DB } from '../store/db';
import { Card, Btn, Badge, Progress, StateBadge, Ring, LineChart, Notice } from '../ui';
import { Axolotl } from '../ui/axolotl';
import { ActivityPlayer, FractionBar, type Feedback } from '../activities';
import type { Item } from '@edu/content-math';

export function useStudent(): { d: DB; s: Student } {
  const d = useDB(); const u = currentUser(d)!; const s = d.students.find((x) => x.id === u.studentId)!; return { d, s };
}
const KID = (b: string) => b === 'exploradores' || b === 'aventureiros';

export function StudentSession() {
  const { s } = useStudent(); const [q] = useSearchParams(); const kind = (q.get('kind') ?? 'practice') as 'diagnostic' | 'practice' | 'reassessment'; const band = bandOf(s); const nav = useNavigate();
  const started = useRef(false); const [shown, setShown] = useState<Item | null>(null); const [done, setDone] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { if (started.current) return; started.current = true; try { if (!s.session || s.session.kind !== kind) startSession(s.id, kind); const it = currentItem(s.id); if (it) setShown(it); else setDone(true); } catch (e) { setErr((e as Error).message); } }, []);
  if (err) return <div className="ax-page"><Notice tone="bad">{err}</Notice></div>;
  const total = kind === 'diagnostic' ? 24 : s.session?.itemIds.length ?? 0; const idx = s.session?.idx ?? 0;
  if (done || !s.session) return <Summary kind={kind} s={s} />;
  if (!shown) return <div className="ax-page"><Card><p>Preparando atividades…</p></Card></div>;
  const advance = () => { const it = currentItem(s.id); if (!it || (kind !== 'diagnostic' && (s.session?.idx ?? 0) >= (s.session?.itemIds.length ?? 0))) { setDone(true); } else setShown(it); };
  const sc = scope(); void sc;
  return <div className="ax-page"><div className="row"><b>{kind === 'diagnostic' ? 'Diagnóstico' : kind === 'practice' ? 'Prática' : 'Reavaliação'}</b><span className="muted sm">{kind === 'diagnostic' ? `atividade ${idx + 1} (o diagnóstico se adapta às suas respostas)` : `${Math.min(idx + 1, total)} de ${total}`}</span><Btn variant="ghost sm" className="right" onClick={() => { abandonSession(s.id); nav('/s'); }}>Pausar e sair</Btn></div>
    {kind !== 'diagnostic' && <Progress value={idx / Math.max(1, total)} label="Progresso da sessão" />}
    {kind === 'diagnostic' && <Notice tone="info">Sem dicas e sem pressa. Se não souber, tudo bem: isso ajuda a montar o seu plano.</Notice>}
    <Card key={shown.id}><ActivityPlayer item={shown} kid={KID(band)} hints={kind !== 'diagnostic'} showResult={kind !== 'diagnostic'} onNext={() => { const last = kind !== 'diagnostic' && (s.session?.idx ?? 0) >= (s.session?.itemIds.length ?? 0); if (last) setDone(true); else advance(); }} nextLabel="Próxima"
      onSubmit={(r: Response, h: number): Feedback => answer(s.id, shown, r, h)} /></Card></div>;
}

function Summary({ kind, s }: { kind: 'diagnostic' | 'practice' | 'reassessment'; s: Student }) {
  const nav = useNavigate(); const ses = useRef(s.session).current; const ok = ses?.results.filter(Boolean).length ?? 0; const n = ses?.results.length ?? 0; const fin = useRef(false);
  useEffect(() => { if (!fin.current && s.session) { fin.current = true; finishSession(s.id); } }, []);
  const rep = reportFor(s); const unseen = Object.values(s.learner.hypotheses).filter((h) => h.status === 'confirmed' && !s.shownExplanations.includes(h.id));
  const improved = rep.filter((r) => { const e = evolution(s.learner, r.skillId); return (e.delta ?? 0) > 0.1; });
  return <div className="ax-page"><Card className="hero"><div className="row"><Axolotl state="comemorando" size={120} cap /><div><h1>{kind === 'diagnostic' ? 'Diagnóstico concluído!' : kind === 'practice' ? 'Treino concluído!' : 'Reavaliação concluída!'}</h1><p>{kind === 'diagnostic' ? `Você respondeu ${n} atividades. Agora sabemos por onde começar.` : `Você acertou ${ok} de ${n}. O que importa é o que você aprendeu no caminho.`}</p></div></div></Card>
    {kind === 'diagnostic' && <Card><h3>O que descobrimos</h3>{rep.filter((r) => r.evidenceCount > 0).map((r) => <p key={r.skillId} className="row"><StateBadge s={r.state} kid={KID(bandOf(s))} /> {r.name}</p>)}<p className="sm muted">Habilidades não testadas foram inferidas pelas mais avançadas que você acertou e podem ser confirmadas na prática.</p></Card>}
    {kind === 'reassessment' && <Card><h3>Sua evolução</h3>{improved.length ? improved.map((r) => { const e = evolution(s.learner, r.skillId); return <p key={r.skillId}>📈 <b>{r.name}</b>: de {Math.round((e.before?.p ?? 0) * 100)}% para {Math.round((e.after?.p ?? 0) * 100)}% (estimativa, confiança {r.confidenceLabel})</p>; }) : <p className="muted">Ainda não há mudança clara nas estimativas — continue praticando.</p>}</Card>}
    <div className="row">{unseen.length > 0 && <Btn onClick={() => nav('/s/explain')}>💡 Ver explicação</Btn>}<Btn variant="ghost" onClick={() => nav('/s/progress')}>Ver minha evolução</Btn><Btn variant="ghost" onClick={() => nav('/s')}>Início</Btn></div></div>;
}

const VISUAL: Record<string, JSX.Element> = {
  add_num_and_den: <div className="col"><div className="row"><b>1/2</b><FractionBar den={2} num={1} /></div><div className="row"><b>1/3</b><FractionBar den={3} num={1} /></div><div className="row"><b>5/6</b><FractionBar den={6} num={5} /></div><p className="sm muted">Trocando por sextos: 3/6 + 2/6 = 5/6.</p></div>,
  swap_num_den: <div className="row"><b>3/8</b><FractionBar den={8} num={3} /></div>,
  bigger_denominator_bigger: <div className="col"><div className="row"><b>1/3</b><FractionBar den={3} num={1} /></div><div className="row"><b>1/5</b><FractionBar den={5} num={1} /></div></div>,
  add_same_to_both: <div className="col">{[[1, 2], [2, 4], [3, 6]].map(([a, b]) => <div key={b} className="row"><b>{a}/{b}</b><FractionBar den={b!} num={a} /></div>)}</div>,
  add_denominators: <div className="col"><div className="row"><b>1/5 + 2/5</b></div><FractionBar den={5} num={3} /><p className="sm muted">= 3/5</p></div>,
};

export function StudentExplain() {
  const { s } = useStudent(); const nav = useNavigate(); const [e, setE] = useState<ReturnType<typeof nextExplanation>>(null); const ran = useRef(false);
  useEffect(() => { if (ran.current) return; ran.current = true; setE(nextExplanation(s.id)); }, []);
  if (!e) return <div className="ax-page"><Card><h2>Nada novo para explicar agora</h2><p className="muted">Quando o motor confirmar uma dificuldade específica, a explicação aparece aqui.</p><Btn onClick={() => nav('/s')}>Voltar</Btn></Card></div>;
  const m = MISCONCEPTIONS[e.misconceptionId]!;
  return <div className="ax-page"><Card className="hero"><div className="row"><Axolotl state="explicando" size={120} /><div><h1>{e.variant.title}</h1><p>Sobre: {skillName(m.skillId)}</p></div></div></Card>
    <Card><Badge tone="info">{({ passo_a_passo: 'passo a passo', visual: 'visual', historia: 'história', contraexemplo: 'teste com exemplo' })[e.variant.method]}</Badge> {e.round > 1 && <Badge tone="warn">outra forma de explicar</Badge>}
      {e.variant.body.map((t, i) => <p key={i}>{t}</p>)}{VISUAL[e.misconceptionId]}</Card>
    <Notice tone="info">Conteúdo autoral em rascunho — ainda pendente de revisão pedagógica profissional.</Notice>
    <Btn onClick={() => nav('/s/session?kind=practice')}>Entendi — vamos praticar!</Btn></div>;
}

export function StudentProgress() {
  const { s } = useStudent(); const rep = reportFor(s); const b = balances(s);
  const withEvo = rep.filter((r) => s.learner.snapshots.filter((x) => x.skills[r.skillId] && x.skills[r.skillId]!.n > 0).length >= 2);
  const colors = ['#6d3df2', '#2f7bff', '#ffb020', '#16a679', '#e5484d', '#ff5fa2'];
  return <div className="ax-page"><h1>Minha evolução</h1>
    <Card><h3>Evolução das habilidades (estimativa)</h3>{s.learner.snapshots.length < 2 ? <p className="muted">Faça o diagnóstico, pratique e reavalie: o gráfico aparece quando houver pelo menos duas medições.</p> :
      <LineChart series={withEvo.slice(0, 6).map((r, i) => ({ name: r.name, color: colors[i % 6]!, points: s.learner.snapshots.filter((x) => x.skills[r.skillId]!.n > 0).map((x) => ({ x: x.label, y: x.skills[r.skillId]!.p })) }))} />}
      <div className="row">{withEvo.slice(0, 6).map((r, i) => <span key={r.skillId} className="sm"><span style={{ color: colors[i % 6] }}>●</span> {r.name}</span>)}</div><p className="sm muted">As linhas são estimativas do motor pedagógico com poucas evidências; mudam conforme você pratica.</p></Card>
    <div className="grid g2">{rep.filter((r) => r.evidenceCount > 0).map((r) => <Card key={r.skillId}><div className="row"><b className="grow">{r.name}</b><StateBadge s={r.state} kid={KID(bandOf(s))} /></div><Progress value={r.probability} label={r.name} /><p className="sm muted">{r.evidenceCount} atividade(s) · confiança {r.confidenceLabel}</p></Card>)}</div>
    <Card><h3>Pontos e tempo de lazer</h3><div className="row"><Ring value={Math.min(1, b.minutes / Math.max(1, s.rewards.dailyCapMinutes))} label={`${b.minutes}min`} /><div><p><b>{b.xp} XP</b> acumulados (nunca diminuem).</p><p>{b.minutes} min de lazer disponíveis (limite diário definido pelo responsável: {s.rewards.dailyCapMinutes} min).</p><p className="sm muted">Registro auditável com verificação de integridade: {b.verified ? '✔ íntegro' : '✖ inconsistente'}.</p></div></div></Card></div>;
}
