import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { brand } from '@edu/brand';
import { evolution, type Response } from '@edu/learning';
import { MISCONCEPTIONS } from '@edu/content-math';
import { useDB, currentUser, bandOf, balances, levelInfo, reportFor, startSession, currentItem, answer, finishSession, abandonSession, nextExplanation, pendingExplanationCount, skillName, MATH_IDS, requestTime, logout, scope, type Student, type DB } from '../store/db';
import { Card, Btn, Badge, Progress, Mascot, Avatar, StateBadge, Ring, LineChart, Notice, Logo, STATE_LABEL } from '../ui';
import { ActivityPlayer, FractionBar, type Feedback } from '../activities';
import type { Item } from '@edu/content-math';

export function useStudent(): { d: DB; s: Student } {
  const d = useDB(); const u = currentUser(d)!; const s = d.students.find((x) => x.id === u.studentId)!; return { d, s };
}
const KID = (b: string) => b === 'exploradores' || b === 'aventureiros';

export function StudentShell() {
  const { s } = useStudent(); const band = bandOf(s); const [dark, setDark] = useState(false);
  return <div className="stu" data-theme={band} data-mode={band === 'estrategistas' && dark ? 'dark' : undefined}>
    <header className="row" style={{ padding: '10px 16px', background: 'var(--surface)', borderBottom: '2px solid var(--line)' }}><Logo size={32} /><b>{brand.name}</b>{brand.provisional && <Badge tone="warn">nome provisório</Badge>}
      <span className="right row">{band === 'estrategistas' && <Btn variant="ghost sm" onClick={() => setDark(!dark)} aria-pressed={dark}>{dark ? '☀ Claro' : '🌙 Escuro'}</Btn>}<Avatar name={s.name} color={s.avatar.color} face={KID(band) ? s.avatar.face : undefined} size={36} /><Btn variant="ghost sm" onClick={logout}>Sair</Btn></span></header>
    <div className="content"><Outlet /></div>
    <nav className="nav" aria-label="Navegação do aluno"><NavLink end to="/s" className={({ isActive }) => (isActive ? 'on' : '')}><span>{KID(band) ? '🏠' : '▦'}</span>Início</NavLink><NavLink to="/s/session?kind=practice" className={({ isActive }) => (isActive ? 'on' : '')}><span>{KID(band) ? '🎯' : '✎'}</span>Praticar</NavLink><NavLink to="/s/progress" className={({ isActive }) => (isActive ? 'on' : '')}><span>{KID(band) ? '⭐' : '↗'}</span>Evolução</NavLink></nav></div>;
}

const COPY = {
  exploradores: { hi: (n: string) => `Oi, ${n}! 🌈`, diag: 'Vamos descobrir o que você já sabe!', learn: 'Hora de aprender um truque!', practice: 'Vamos treinar!', re: 'Mostre o quanto aprendeu!' },
  aventureiros: { hi: (n: string) => `Olá, ${n}! Pronto para a missão?`, diag: 'Missão 1: mapear seus superpoderes', learn: 'Nova descoberta desbloqueada', practice: 'Missão de treino', re: 'Desafio de reavaliação' },
  desafiadores: { hi: (n: string) => `E aí, ${n}.`, diag: 'Diagnóstico de habilidades', learn: 'Entender o erro (rápido)', practice: 'Treino focado', re: 'Reavaliação: subir de nível' },
  estrategistas: { hi: (n: string) => `Bom dia, ${n}.`, diag: 'Diagnóstico inicial por habilidade', learn: 'Revisar conceito identificado', practice: 'Plano de estudo de hoje', re: 'Reavaliação das metas' },
} as const;

export function StudentHome() {
  const { d, s } = useStudent(); const band = bandOf(s); const c = COPY[band]; const nav = useNavigate(); const b = balances(s); const lv = levelInfo(b.xp);
  const rep = reportFor(s); const pend = pendingExplanationCount(s) + (Object.values(s.learner.hypotheses).filter((h) => h.status === 'confirmed' && !s.shownExplanations.includes(h.id)).length ? 0 : 0);
  const unseenExpl = Object.values(s.learner.hypotheses).filter((h) => h.status === 'confirmed' && !s.shownExplanations.includes(h.id)).length;
  const next = !s.diagDone ? { t: c.diag, sub: 'Responda no seu ritmo — não é prova e não vale nota.', go: '/s/session?kind=diagnostic', ic: '🧭' }
    : unseenExpl ? { t: c.learn, sub: 'Encontramos um jeito de ajudar com algo específico.', go: '/s/explain', ic: '💡' }
    : s.practiceRounds > s.reassessRounds ? { t: c.re, sub: 'Veja como você evoluiu desde o início.', go: '/s/session?kind=reassessment', ic: '🏆' }
    : { t: c.practice, sub: 'Atividades escolhidas para o que você precisa agora.', go: '/s/session?kind=practice', ic: '🎯' };
  const groups = (['consolidated', 'developing', 'needs_support'] as const).map((st) => ({ st, list: rep.filter((r) => r.state === st) }));
  const myPlans = d.reinforcement.filter((r) => r.studentId === s.id); const exams = d.exams.filter((e) => e.studentId === s.id).sort((a, b) => a.date.localeCompare(b.date));
  const dev = d.devices.find((x) => x.studentId === s.id);
  const ach = [['Primeiro diagnóstico', s.diagDone], ['5 atividades concluídas', s.learner.responses.length >= 5], ['Usou dicas para aprender', s.learner.responses.some((r) => r.hintsUsed > 0)], ['Primeira reavaliação', s.reassessRounds > 0], ['Nível 2 alcançado', lv.level >= 2]] as const;
  return <div className="col">
    <Card className="hero"><div className="row">{KID(band) && <Mascot size={band === 'exploradores' ? 120 : 90} mood="cheer" color="#fff" />}<div className="grow"><h1>{c.hi(s.name)}</h1>
      <div className="row"><Badge>Nível {lv.level}</Badge><span>{b.xp} XP</span><Badge tone="ok">⏱ {b.minutes} min de lazer</Badge></div><div style={{ marginTop: 8 }}><Progress value={lv.into / lv.span} label="Progresso até o próximo nível" /></div><p className="sm muted">{lv.span - lv.into} XP para o nível {lv.level + 1}. Pontos recompensam esforço, participação e compreensão — não só acertos.</p></div></div></Card>
    {s.session && <Notice>Você tem uma atividade em andamento. <Link to={`/s/session?kind=${s.session.kind}`}>Continuar</Link></Notice>}
    <Card><div className="row"><span style={{ fontSize: '2.4em' }} aria-hidden>{next.ic}</span><div className="grow"><h2>{next.t}</h2><p className="muted">{next.sub}</p></div><Btn onClick={() => nav(next.go)}>{KID(band) ? 'Vamos!' : 'Começar'}</Btn></div></Card>
    {myPlans.length > 0 && <Card><h3>Plano de reforço do professor</h3>{myPlans.map((p) => <p key={p.id}>📌 {p.skillIds.map(skillName).join(', ')} — {p.count} atividades. <span className="muted sm">{p.note}</span></p>)}</Card>}
    <div className="grid g2"><Card><h3>Matérias</h3><div className="col"><div className="row"><span>➗</span><b className="grow">Matemática</b><Badge tone="ok">disponível</Badge></div><div className="row"><span>📚</span><b className="grow">Português</b><Badge tone="draft">em preparação</Badge></div><p className="sm muted">Português tem a estrutura de habilidades e poucos itens em rascunho; a jornada completa vem depois.</p></div></Card>
      <Card><h3>Meu plano de hoje</h3>{s.diagDone ? <p>{rep.filter((r) => r.state === 'needs_support').length ? `Foco em ${rep.filter((r) => r.state === 'needs_support').map((r) => r.name).slice(0, 2).join(' e ')}, com base nas habilidades anteriores e uma revisão do que você já domina.` : 'Sem dificuldades marcadas: avanço e revisão leve.'}</p> : <p className="muted">Faça o diagnóstico para montar o seu plano.</p>}</Card></div>
    <Card><h3>O que já sei e o que estou aprendendo</h3>{!s.diagDone ? <p className="muted">Ainda não temos evidências. Depois do diagnóstico, as suas habilidades aparecem aqui.</p> : groups.map((g) => <div key={g.st} style={{ marginBottom: 8 }}><StateBadge s={g.st} kid={KID(band)} /> {g.list.length ? g.list.map((r) => <Badge key={r.skillId}>{r.name}</Badge>) : <span className="muted sm">nenhuma por enquanto</span>}</div>)}</Card>
    <div className="grid g2"><Card><h3>Provas e conteúdos</h3>{exams.length ? exams.map((e) => <p key={e.id}>📅 <b>{new Date(e.date + 'T12:00').toLocaleDateString('pt-BR')}</b> — {e.title} <span className="muted sm">({e.skillIds.map(skillName).join(', ') || 'conteúdo livre'})</span></p>) : <p className="muted">Nenhuma prova cadastrada. Seu responsável pode adicionar.</p>}</Card>
      <Card><h3>Conquistas</h3><div className="row">{ach.map(([n, ok]) => <Badge key={n} tone={ok ? 'ok' : ''}>{ok ? '🏅' : '🔒'} {n}</Badge>)}</div></Card></div>
    <div className="grid g2"><Card><h3>Tutor virtual</h3><p className="muted">Ainda não disponível: depende de provedor de IA e de moderação infantil (pendente). Nada aqui é simulado.</p></Card><TimeRequest s={s} dev={dev} /></div>
  </div>;
}

function TimeRequest({ s, dev }: { s: Student; dev?: DB['devices'][number] }) {
  const d = useDB(); const [app, setApp] = useState(''); const [m, setM] = useState(15); const [sent, setSent] = useState(false);
  const mine = d.timeRequests.filter((r) => r.studentId === s.id).slice(-3);
  return <Card><h3>Pedir mais tempo</h3>{!dev ? <p className="muted">Nenhum aparelho vinculado. O controle parental é opcional.</p> : <><label htmlFor="ta">Aplicativo</label><select id="ta" value={app} onChange={(e) => setApp(e.target.value)}><option value="">Escolha…</option>{dev.apps.filter((a) => !a.essential).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
    <label htmlFor="tm">Minutos</label><input id="tm" type="number" min={1} max={120} value={m} onChange={(e) => setM(Number(e.target.value))} />
    <Btn style={{ marginTop: 8 }} disabled={!app || m < 1 || m > 120} onClick={() => { requestTime(s.id, dev.id, app, m, ''); setSent(true); }}>Enviar pedido ao responsável</Btn>{sent && <p className="sm">Pedido enviado!</p>}
    {mine.map((r) => <p key={r.id} className="sm">{r.minutes} min — <Badge tone={r.status === 'approved' ? 'ok' : r.status === 'denied' ? 'bad' : 'warn'}>{r.status === 'approved' ? 'aprovado' : r.status === 'denied' ? 'não desta vez' : 'aguardando'}</Badge></p>)}</>}</Card>;
}

export function StudentSession() {
  const { s } = useStudent(); const [q] = useSearchParams(); const kind = (q.get('kind') ?? 'practice') as 'diagnostic' | 'practice' | 'reassessment'; const band = bandOf(s); const nav = useNavigate();
  const started = useRef(false); const [shown, setShown] = useState<Item | null>(null); const [done, setDone] = useState(false); const [err, setErr] = useState('');
  useEffect(() => { if (started.current) return; started.current = true; try { if (!s.session || s.session.kind !== kind) startSession(s.id, kind); const it = currentItem(s.id); if (it) setShown(it); else setDone(true); } catch (e) { setErr((e as Error).message); } }, []);
  if (err) return <Notice tone="bad">{err}</Notice>;
  const total = kind === 'diagnostic' ? 24 : s.session?.itemIds.length ?? 0; const idx = s.session?.idx ?? 0;
  if (done || !s.session) return <Summary kind={kind} s={s} />;
  if (!shown) return <Card><p>Preparando atividades…</p></Card>;
  const advance = () => { const it = currentItem(s.id); if (!it || (kind !== 'diagnostic' && (s.session?.idx ?? 0) >= (s.session?.itemIds.length ?? 0))) { setDone(true); } else setShown(it); };
  const sc = scope(); void sc;
  return <div className="col"><div className="row"><b>{kind === 'diagnostic' ? 'Diagnóstico' : kind === 'practice' ? 'Prática' : 'Reavaliação'}</b><span className="muted sm">{kind === 'diagnostic' ? `atividade ${idx + 1} (o diagnóstico se adapta às suas respostas)` : `${Math.min(idx + 1, total)} de ${total}`}</span><Btn variant="ghost sm" className="right" onClick={() => { abandonSession(s.id); nav('/s'); }}>Pausar e sair</Btn></div>
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
  return <div className="col"><Card className="hero"><div className="row"><Mascot size={90} mood="cheer" color="#fff" /><div><h1>{kind === 'diagnostic' ? 'Diagnóstico concluído!' : kind === 'practice' ? 'Treino concluído!' : 'Reavaliação concluída!'}</h1><p>{kind === 'diagnostic' ? `Você respondeu ${n} atividades. Agora sabemos por onde começar.` : `Você acertou ${ok} de ${n}. O que importa é o que você aprendeu no caminho.`}</p></div></div></Card>
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
  if (!e) return <Card><h2>Nada novo para explicar agora</h2><p className="muted">Quando o motor confirmar uma dificuldade específica, a explicação aparece aqui.</p><Btn onClick={() => nav('/s')}>Voltar</Btn></Card>;
  const m = MISCONCEPTIONS[e.misconceptionId]!;
  return <div className="col"><Card className="hero"><div className="row"><Mascot size={80} mood="think" color="#fff" /><div><h1>{e.variant.title}</h1><p>Sobre: {skillName(m.skillId)}</p></div></div></Card>
    <Card><Badge tone="info">{({ passo_a_passo: 'passo a passo', visual: 'visual', historia: 'história', contraexemplo: 'teste com exemplo' })[e.variant.method]}</Badge> {e.round > 1 && <Badge tone="warn">outra forma de explicar</Badge>}
      {e.variant.body.map((t, i) => <p key={i}>{t}</p>)}{VISUAL[e.misconceptionId]}</Card>
    <Notice tone="info">Conteúdo autoral em rascunho — ainda pendente de revisão pedagógica profissional.</Notice>
    <Btn onClick={() => nav('/s/session?kind=practice')}>Entendi — vamos praticar!</Btn></div>;
}

export function StudentProgress() {
  const { s } = useStudent(); const rep = reportFor(s); const b = balances(s);
  const withEvo = rep.filter((r) => s.learner.snapshots.filter((x) => x.skills[r.skillId] && x.skills[r.skillId]!.n > 0).length >= 2);
  const colors = ['#6d3df2', '#2f7bff', '#ffb020', '#16a679', '#e5484d', '#ff5fa2'];
  return <div className="col"><h1>Minha evolução</h1>
    <Card><h3>Evolução das habilidades (estimativa)</h3>{s.learner.snapshots.length < 2 ? <p className="muted">Faça o diagnóstico, pratique e reavalie: o gráfico aparece quando houver pelo menos duas medições.</p> :
      <LineChart series={withEvo.slice(0, 6).map((r, i) => ({ name: r.name, color: colors[i % 6]!, points: s.learner.snapshots.filter((x) => x.skills[r.skillId]!.n > 0).map((x) => ({ x: x.label, y: x.skills[r.skillId]!.p })) }))} />}
      <div className="row">{withEvo.slice(0, 6).map((r, i) => <span key={r.skillId} className="sm"><span style={{ color: colors[i % 6] }}>●</span> {r.name}</span>)}</div><p className="sm muted">As linhas são estimativas do motor pedagógico com poucas evidências; mudam conforme você pratica.</p></Card>
    <div className="grid g2">{rep.filter((r) => r.evidenceCount > 0).map((r) => <Card key={r.skillId}><div className="row"><b className="grow">{r.name}</b><StateBadge s={r.state} kid={KID(bandOf(s))} /></div><Progress value={r.probability} label={r.name} /><p className="sm muted">{r.evidenceCount} atividade(s) · confiança {r.confidenceLabel}</p></Card>)}</div>
    <Card><h3>Pontos e tempo de lazer</h3><div className="row"><Ring value={Math.min(1, b.minutes / Math.max(1, s.rewards.dailyCapMinutes))} label={`${b.minutes}min`} /><div><p><b>{b.xp} XP</b> acumulados (nunca diminuem).</p><p>{b.minutes} min de lazer disponíveis (limite diário definido pelo responsável: {s.rewards.dailyCapMinutes} min).</p><p className="sm muted">Registro auditável com verificação de integridade: {b.verified ? '✔ íntegro' : '✖ inconsistente'}.</p></div></div></Card></div>;
}
