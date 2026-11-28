import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MATH_SKILLS } from '@edu/content-math';
import { useDB, currentUser, visibleStudents, canSee, reportFor, createReinforcement, addClass, enrollByCode, adultsOf, skillName, type Student } from '../store/db';
import { Card, Btn, Badge, Notice, STATE_LABEL, StateBadge, Progress, toast } from '../ui';
import { ReportView } from './parent';

const SHORT = (n: string) => n.replace(/^(Adição|Subtração|Multiplicação|Divisão|Frações?|Problemas?)\s*/i, (m) => m.trim()[0] + '·').slice(0, 14);

function Heatmap({ students }: { students: Student[] }) {
  const nav = useNavigate(); const base = useLocation().pathname.startsWith('/m') ? '/m' : '/t'; const reps = new Map(students.map((s) => [s.id, new Map(reportFor(s).map((r) => [r.skillId, r]))]));
  return <div style={{ overflowX: 'auto' }}><table role="grid" aria-label="Mapa de aprendizagem: alunos por habilidade"><thead><tr><th>Aluno</th>{MATH_SKILLS.map((k) => <th key={k.id} title={k.name} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 130, padding: 2, fontSize: '.78em' }}>{k.name}</th>)}</tr></thead>
    <tbody>{students.map((s) => <tr key={s.id}><td><Link to={`${base}/student/${s.id}`}>{s.name}</Link></td>{MATH_SKILLS.map((k) => { const r = reps.get(s.id)!.get(k.id)!; const l = STATE_LABEL[r.state]; return <td key={k.id} style={{ padding: 2 }}><button className={`cell ${l.cls}`} style={{ cursor: 'pointer' }} title={`${s.name} · ${k.name}: ${l.adult} (${r.evidenceCount} evid., confiança ${r.confidenceLabel})`} aria-label={`${s.name}, ${k.name}: ${l.adult}`} onClick={() => nav(`${base}/student/${s.id}`)}>{l.icon}</button></td>; })}</tr>)}</tbody></table>
    <div className="row sm" style={{ marginTop: 8 }}>{(['consolidated', 'developing', 'needs_support', 'insufficient_evidence'] as const).map((k) => <StateBadge key={k} s={k} />)}</div></div>;
}
export function Collective({ students }: { students: Student[] }) {
  const reps = students.map((s) => reportFor(s)); const min = 3;
  const rows = MATH_SKILLS.map((k) => { const rs = reps.map((r) => r.find((x) => x.skillId === k.id)!); const ev = rs.filter((r) => r.evidenceCount > 0); return { k, n: ev.length, need: ev.filter((r) => r.state === 'needs_support').length }; }).filter((r) => r.need > 0).sort((a, b) => b.need - a.need);
  if (students.length < min) return <p className="muted sm">Amostra insuficiente (menos de {min} alunos com consentimento): indicadores coletivos ocultos para proteger a privacidade.</p>;
  return rows.length ? <table><thead><tr><th>Habilidade</th><th>Alunos com dificuldade</th><th></th></tr></thead><tbody>{rows.slice(0, 6).map((r) => <tr key={r.k.id}><td>{r.k.name}</td><td>{r.need} de {r.n} avaliados</td><td style={{ width: 160 }}><Progress value={r.need / Math.max(1, r.n)} label={r.k.name} /></td></tr>)}</tbody></table> : <p className="muted sm">Nenhuma dificuldade coletiva identificada com as evidências atuais.</p>;
}

export function TeacherHome() {
  const d = useDB(); const u = currentUser(d)!; const { visible, hiddenNoConsent } = visibleStudents(d, u); const classes = d.classes.filter((c) => c.schoolId === u.schoolId && c.teacherIds.includes(u.id));
  return <div className="col"><h1>Minhas turmas</h1>{classes.map((c) => <Badge key={c.id} tone="info">{c.name}</Badge>)}
    {hiddenNoConsent > 0 && <Notice tone="info">{hiddenNoConsent} aluno(s) da sua turma não aparecem porque a família ainda não autorizou o compartilhamento de progresso.</Notice>}
    {visible.length === 0 ? <Card><p className="muted">Nenhum aluno visível. Peça às famílias para autorizar o compartilhamento.</p></Card> : <>
      <Card><h2>Mapa de aprendizagem</h2><Heatmap students={visible} /></Card><Card><h2>Dificuldades coletivas</h2><Collective students={visible} /></Card></>}</div>;
}

export function TeacherStudent() {
  const { id } = useParams(); const d = useDB(); const u = currentUser(d)!; const nav = useNavigate(); const s = d.students.find((x) => x.id === id);
  const [pick, setPick] = useState<string[] | null>(null); const [count, setCount] = useState(8); const [note, setNote] = useState('');
  if (!s || !canSee(d, u, s.id)) return <Notice tone="bad">Acesso negado: o aluno não está nas suas turmas ou a família não autorizou o compartilhamento.</Notice>;
  const rep = reportFor(s); const sug = rep.filter((r) => r.state === 'needs_support' || r.causes.some((c) => c.kind === 'misconception' && c.status === 'confirmada')).map((r) => r.skillId); const sel = pick ?? sug; const mine = d.reinforcement.filter((r) => r.studentId === s.id);
  return <div className="col"><div className="row"><Btn variant="ghost sm" onClick={() => nav(-1)}>← Voltar</Btn><h1 className="grow">{s.name}</h1></div>
    <Card><h2>Plano de reforço</h2><Notice tone="info">Sugestão do motor pedagógico (regras, <b>sem IA generativa</b>). Você revisa, edita e aprova; nada é enviado ao aluno sem a sua aprovação.</Notice>
      {sug.length === 0 && <p className="muted sm">Sem dificuldades identificadas com evidência suficiente. Você ainda pode montar um plano manual.</p>}
      <div className="row" style={{ marginTop: 8 }}>{MATH_SKILLS.map((k) => <label key={k.id} className="chip" style={{ cursor: 'pointer', fontWeight: sel.includes(k.id) ? 800 : 500 }}><input type="checkbox" style={{ width: 16, minHeight: 16, marginRight: 6 }} checked={sel.includes(k.id)} onChange={(e) => setPick(e.target.checked ? [...sel, k.id] : sel.filter((x) => x !== k.id))} />{k.name}{sug.includes(k.id) && ' ★'}</label>)}</div>
      <label htmlFor="cnt">Quantidade de atividades</label><input id="cnt" type="number" min={3} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ maxWidth: 140 }} /><label htmlFor="nt">Observação para o aluno</label><input id="nt" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="row" style={{ marginTop: 10 }}><Btn disabled={!sel.length} onClick={() => { createReinforcement(s.id, u.id, sel, count, note); toast('Plano aprovado e enviado ao aluno'); }}>Aprovar plano</Btn></div>
      {mine.map((r) => <p key={r.id} className="sm">📌 {new Date(r.at).toLocaleDateString('pt-BR')} — {r.skillIds.map(skillName).join(', ')} ({r.count})</p>)}</Card>
    <ReportView s={s} audience="teacher" /></div>;
}

export function ManagerHome() {
  const d = useDB(); const u = currentUser(d)!; const { visible, hiddenNoConsent } = visibleStudents(d, u); const teachers = adultsOf(d, u.schoolId); const classes = d.classes.filter((c) => c.schoolId === u.schoolId);
  const [cn, setCn] = useState(''); const [tid, setTid] = useState(''); const [code, setCode] = useState(''); const [cid, setCid] = useState('');
  const enrolled = new Set(d.enrollments.filter((e) => e.schoolId === u.schoolId).map((e) => e.studentId)).size; const school = d.schools.find((x) => x.id === u.schoolId);
  const plan = d.plans.find((p) => p.audience === 'school');
  return <div className="col"><h1>{school?.name}</h1>
    <div className="grid g3"><Card><h3>Alunos matriculados</h3><b style={{ fontSize: '2em' }}>{enrolled}</b></Card><Card><h3>Com compartilhamento autorizado</h3><b style={{ fontSize: '2em' }}>{visible.length}</b><p className="sm muted">{hiddenNoConsent} sem autorização (não exibidos)</p></Card><Card><h3>Licenças</h3><p className="sm">Plano: {plan?.name} — {plan?.priceCents == null ? <Badge tone="warn">preço não definido pelo administrador</Badge> : 'definido'}</p><p className="sm muted">Alunos ativos contratados e critérios são configurados pelo administrador.</p></Card></div>
    <Card><h2>Indicadores pedagógicos (agregados)</h2><Collective students={visible} /></Card>
    <Card><h2>Mapa por turma</h2>{visible.length ? <Heatmap students={visible} /> : <p className="muted">Sem alunos com autorização.</p>}</Card>
    <div className="grid g2"><Card><h3>Turmas e professores</h3><table><tbody>{classes.map((c) => <tr key={c.id}><td>{c.name}</td><td className="muted">{c.teacherIds.map((t) => d.users.find((x) => x.id === t)?.name).join(', ') || '—'}</td></tr>)}</tbody></table>
      <label htmlFor="cn">Nova turma</label><input id="cn" value={cn} onChange={(e) => setCn(e.target.value)} /><label htmlFor="ct">Professor(a)</label><select id="ct" value={tid} onChange={(e) => setTid(e.target.value)}><option value="">—</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
      <Btn style={{ marginTop: 8 }} disabled={!cn.trim()} onClick={() => { addClass(u.schoolId!, cn, tid ? [tid] : []); setCn(''); toast('Turma criada'); }}>Criar turma</Btn></Card>
      <Card><h3>Matricular aluno</h3><p className="sm muted">A família informa o código de vínculo. A matrícula não dá acesso aos dados: isso exige o consentimento da família.</p><label htmlFor="cc">Turma</label><select id="cc" value={cid} onChange={(e) => setCid(e.target.value)}><option value="">—</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><label htmlFor="cd">Código de vínculo</label><input id="cd" value={code} onChange={(e) => setCode(e.target.value)} />
        <Btn style={{ marginTop: 8 }} disabled={!cid || !code} onClick={() => { try { enrollByCode(u.schoolId!, cid, code); setCode(''); toast('Aluno matriculado'); } catch (e) { toast((e as Error).message); } }}>Matricular</Btn></Card></div></div>;
}
