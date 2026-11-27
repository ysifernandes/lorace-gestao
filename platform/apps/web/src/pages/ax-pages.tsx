import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MISCONCEPTIONS, EXPLANATIONS, MATH_WORLDS } from '@edu/content-math';
import { useDB, balances, skillName, reportFor } from '../store/db';
import { buildDashboard, fmtMinutes, type MapNode } from '../store/dashboard';
import { Axolotl } from '../ui/axolotl';
import { Medal, ArtBook, ArtCalc, ArtFlask, ArtMuseum, ILock, ICheck } from '../ui/art';
import { Btn, StateBadge, Notice } from '../ui';
import { useStudent } from './student';
import { TimeModal } from './ax';

const Head = ({ title, mascot, children }: { title: string; mascot: Parameters<typeof Axolotl>[0]['state']; children?: React.ReactNode }) => <div className="row"><Axolotl state={mascot} size={96} cap /><div className="grow"><h1>{title}</h1>{children}</div></div>;

export function Estudar() {
  const { d, s } = useStudent(); const vm = buildDashboard(d, s); const nav = useNavigate(); const rep = new Map(reportFor(s).map((r) => [r.skillId, r]));
  return <div className="ax-page"><Head title="Estudar" mascot="estudando"><p className="ax-muted">Escolha o que fazer. Os mundos abrem conforme as suas evidências de aprendizagem.</p></Head>
    <div className="ax-list">{[['ArtCalc', 'Matemática', true], ['ArtBook', 'Português', false], ['ArtFlask', 'Ciências', false], ['ArtMuseum', 'História', false]].map(([k, n, on]) => <div key={n as string} className="ax-item">{k === 'ArtCalc' ? <ArtCalc size={48} /> : k === 'ArtBook' ? <ArtBook size={48} /> : k === 'ArtFlask' ? <ArtFlask size={48} /> : <ArtMuseum size={48} />}<div className="grow"><b>{n}</b><small>{on ? 'Jornada completa disponível' : 'Em breve'}</small></div>{on ? <span className="ax-badge ok">disponível</span> : <span className="ax-badge">em breve</span>}</div>)}</div>
    <div className="row"><Btn onClick={() => nav('/s/session?kind=diagnostic')} disabled={s.diagDone}>{s.diagDone ? 'Diagnóstico concluído' : 'Fazer diagnóstico'}</Btn><Btn onClick={() => nav('/s/session?kind=practice')} disabled={!s.diagDone}>Praticar</Btn><Btn variant="ghost" onClick={() => nav('/s/session?kind=reassessment')} disabled={s.practiceRounds <= s.reassessRounds}>Reavaliar</Btn></div>
    {MATH_WORLDS.map((w) => <div key={w.id} className="ax-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}><div className="row"><b className="grow">{w.name}</b><small>{w.theme}</small></div><div className="row">{w.skillIds.map((id) => { const r = rep.get(id)!; const locked = vm.world.id === w.id ? (vm.world.nodes.find((n: MapNode) => n.skillId === id)?.status === 'locked') : false; return <span key={id} title={r.recommendation}>{locked ? <span className="ax-badge warn"><ILock size={14} /> {r.name}</span> : <StateBadge s={r.state} kid />} <small>{r.name}</small></span>; })}</div></div>)}</div>;
}
export function Missoes() {
  const { d, s } = useStudent(); const nav = useNavigate(); const vm = buildDashboard(d, s); const plans = d.reinforcement.filter((r) => r.studentId === s.id); const exams = d.exams.filter((e) => e.studentId === s.id);
  const items: { t: string; sub: string; done: boolean; go?: string }[] = [
    { t: 'Diagnóstico inicial', sub: 'Descobrir o que você já sabe', done: s.diagDone, go: '/s/session?kind=diagnostic' },
    ...vm.plan.items.filter((p) => p.id !== 'diag').map((p) => ({ t: p.title, sub: `${p.min} min (estimativa)`, done: p.done, go: p.id === 'explain' ? '/s/explain' : p.id === 'practice' ? '/s/session?kind=practice' : '/s/session?kind=reassessment' })),
    ...plans.map((p) => ({ t: `Reforço da professora: ${p.skillIds.map(skillName).join(', ')}`, sub: p.note || `${p.count} atividades`, done: false, go: '/s/session?kind=practice' })),
    ...exams.map((e) => ({ t: `Preparar: ${e.title}`, sub: new Date(e.date + 'T12:00').toLocaleDateString('pt-BR'), done: false, go: '/s/session?kind=practice' })),
  ];
  return <div className="ax-page"><Head title="Minhas Missões" mascot="apresentando"><p className="ax-muted">Missões mudam conforme as suas evidências. Sem sequências a manter e sem punição por faltar.</p></Head>
    <ul className="ax-list">{items.map((i, k) => <li key={k} className="ax-item"><span className={`ck ${i.done ? 'on' : ''}`} style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #bdb2e6', display: 'grid', placeItems: 'center', background: i.done ? '#1fb765' : 'transparent', color: '#fff' }}>{i.done && <ICheck size={16} />}</span><div className="grow"><b>{i.t}</b><small>{i.sub}</small></div>{!i.done && i.go && <Btn variant="sm" onClick={() => nav(i.go!)}>Ir</Btn>}</li>)}</ul></div>;
}
export function Conquistas() {
  const { d, s } = useStudent(); const vm = buildDashboard(d, s); const b = balances(s);
  return <div className="ax-page"><Head title="Conquistas" mascot="comemorando"><p className="ax-muted">{b.xp.toLocaleString('pt-BR')} pontos · Nível {vm.level.n}: {vm.level.title}. Medalhas vêm de aprendizagem real, não de tempo de tela.</p></Head>
    <div className="ax-medal-grid">{vm.medals.map((m) => <div key={m.kind} className="ax-medal-card"><Medal kind={m.kind} locked={!m.earned} size={96} /><b>{m.title}</b><small className="ax-muted">{m.earned ? m.sub : m.how}</small><span className={`ax-badge ${m.earned ? 'ok' : ''}`}>{m.earned ? 'conquistada' : 'bloqueada'}</span></div>)}</div></div>;
}
export function Biblioteca() {
  const { d, s } = useStudent(); const exams = d.exams.filter((e) => e.studentId === s.id);
  return <div className="ax-page"><Head title="Biblioteca" mascot="estudando"><p className="ax-muted">Seus materiais e explicações.</p></Head>
    <h2>Explicações que você já viu</h2>{s.shownExplanations.length === 0 ? <p className="ax-muted">Ainda nenhuma. Elas aparecem depois que o diagnóstico encontra algo específico para te ajudar.</p> : <ul className="ax-list">{[...new Set(s.shownExplanations)].map((id) => <li key={id} className="ax-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}><b>{MISCONCEPTIONS[id]?.label}</b>{(EXPLANATIONS[id] ?? []).map((v, i) => <div key={i}><span className="ax-badge">{v.method.replace('_', ' ')}</span> <b>{v.title}</b>{v.body.map((t, j) => <p key={j}>{t}</p>)}</div>)}</li>)}</ul>}
    <h2>Provas e conteúdos da escola</h2>{exams.length === 0 ? <p className="ax-muted">Nada cadastrado. Seu responsável pode adicionar.</p> : <ul className="ax-list">{exams.map((e) => <li key={e.id} className="ax-item"><div className="grow"><b>{e.title}</b><small>{new Date(e.date + 'T12:00').toLocaleDateString('pt-BR')} · {e.skillIds.map(skillName).join(', ') || 'conteúdo livre'}</small></div></li>)}</ul>}
    <Notice>Envio de fotos do caderno e PDFs: <b>pendente</b> (exige armazenamento seguro e OCR).</Notice></div>;
}
export function Tutor() {
  const [q, setQ] = useState('');
  return <div className="ax-page"><Head title="Tutor IA" mascot="aguardando"><p className="ax-muted">O tutor com o axolote está sendo preparado.</p></Head>
    <div className="ax-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}><b>O que já funciona (sem IA generativa)</b><ul><li>Dicas progressivas em cada atividade, sem entregar a resposta.</li><li>Explicações em mais de um estilo quando o erro persiste.</li><li>Plano de estudo e preparação para provas.</li></ul></div>
    <div className="ax-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}><b>Ainda indisponível</b><ul><li>Conversa por texto e voz com um modelo de linguagem.</li><li>Criar atividades novas com validação de gabarito.</li><li>Ajuda com tarefas da escola em linguagem natural.</li></ul><p className="ax-muted">Depende de um provedor de IA, moderação infantil e aprovação das famílias. Nada aqui é simulado.</p></div>
    <label htmlFor="tq">Escreva uma dúvida (será guardada só para o seu responsável ver quando o tutor existir)</label><input id="tq" value={q} onChange={(e) => setQ(e.target.value)} disabled placeholder="Disponível quando o tutor estiver ativo" /></div>;
}
export function Familia() {
  const { d, s } = useStudent(); const [open, setOpen] = useState(false); const b = balances(s); const dev = d.devices.find((x) => x.studentId === s.id);
  return <div className="ax-page"><Head title="Área da Família" mascot="feliz"><p className="ax-muted">Quem decide o uso do celular é o seu responsável.</p></Head>
    <div className="ax-item"><div className="grow"><b>Tempo conquistado</b><small>{fmtMinutes(b.minutes)} · limite diário {s.rewards.dailyCapMinutes} min · {s.rewards.xpPerMinute} ponto(s) = 1 minuto</small></div><Btn onClick={() => setOpen(true)}>Pedir mais tempo</Btn></div>
    <div className="ax-item"><div className="grow"><b>Aparelho</b><small>{dev ? `${dev.name} (simulado neste protótipo) · ${dev.online ? 'conectado' : 'sem conexão'}` : 'Nenhum aparelho vinculado. O controle parental é opcional.'}</small></div></div>
    <Notice tone="info">Telefone e emergência nunca dependem de pontos nem de desempenho escolar.</Notice>{open && <TimeModal s={s} d={d} onClose={() => setOpen(false)} />}<Link to="/s" className="ax-all">← Voltar ao início</Link></div>;
}
void useDB;
