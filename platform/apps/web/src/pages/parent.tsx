import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { examPrepSchedule } from '@edu/pedagogy';
import { Ledger } from '@edu/gamification';
import { MATH_SKILLS } from '@edu/content-math';
import { useDB, currentUser, addStudent, ageOf, ageBandOf, setProfile, INTERESTS, type Maturity, bandOf, balances, levelInfo, reportFor, setConsent, addExam, setRewards, startPairing, completePairing, issueCommand, simulatorSync, setSim, appState, decideTime, sweep, skillName, visibleStudents, canSee, type Student, type Device } from '../store/db';
import { Card, Btn, Badge, Notice, Tabs, Modal, StateBadge, ConfBadge, LineChart, Progress, Avatar, toast } from '../ui';

const BAND = { exploradores: '5–7 anos · Exploradores', aventureiros: '8–10 anos · Aventureiros', desafiadores: '11–13 anos · Desafiadores', estrategistas: '14–17 anos · Estrategistas' } as const;

export function ParentHome() {
  const d = useDB(); const u = currentUser(d)!; const kids = visibleStudents(d, u).visible; const [open, setOpen] = useState(false);
  const reqs = d.timeRequests.filter((r) => kids.some((k) => k.id === r.studentId) && r.status === 'pending');
  return <div className="col"><div className="row"><h1 className="grow">Painel da família</h1><Btn onClick={() => setOpen(true)}>+ Cadastrar filho(a)</Btn></div>
    {reqs.length > 0 && <Card><h3>Pedidos de tempo extra ({reqs.length})</h3>{reqs.map((r) => { const k = kids.find((x) => x.id === r.studentId)!; return <div key={r.id} className="row"><span className="grow"><b>{k.name}</b> pede {r.minutes} min em {d.devices.find((x) => x.id === r.deviceId)?.apps.find((a) => a.id === r.appId)?.label}</span><Btn variant="ok sm" onClick={() => { decideTime(r.id, true); toast('Tempo liberado'); }}>Aprovar</Btn><Btn variant="ghost sm" onClick={() => decideTime(r.id, false)}>Agora não</Btn></div>; })}</Card>}
    {kids.length === 0 ? <Card><p>Cadastre o primeiro filho para começar o diagnóstico.</p></Card> : <div className="grid g2">{kids.map((k) => <KidCard key={k.id} s={k} />)}</div>}
    {open && <AddKid onClose={() => setOpen(false)} familyId={u.familyId!} />}</div>;
}
function KidCard({ s }: { s: Student }) {
  const rep = reportFor(s); const b = balances(s); const lv = levelInfo(b.xp); const need = rep.filter((r) => r.state === 'needs_support'); const strong = rep.filter((r) => r.state === 'consolidated' || (r.state === 'developing' && r.probability >= 0.7));
  return <Card><div className="row"><Avatar name={s.name} color={s.avatar.color} face={s.avatar.face} /><div className="grow"><h3 style={{ margin: 0 }}>{s.name}</h3><span className="muted sm">{BAND[bandOf(s)]} · nível {lv.level}</span></div><Link to={`/p/child/${s.id}`}><Btn variant="sm">Abrir</Btn></Link></div>
    {!s.diagDone ? <p className="muted">Diagnóstico ainda não realizado — sem resultados para mostrar.</p> : <><p className="sm"><b>Pontos fortes:</b> {strong.map((r) => r.name).join(', ') || '—'}</p><p className="sm"><b>Precisa de apoio:</b> {need.map((r) => r.name).join(', ') || 'nenhuma identificada até agora'}</p></>}
    <p className="sm muted">{s.learner.responses.length} atividades · {b.minutes} min de lazer</p></Card>;
}
function AddKid({ onClose, familyId }: { onClose: () => void; familyId: string }) {
  const [name, setName] = useState(''); const [year, setYear] = useState(new Date().getFullYear() - 9); const [int, setInt] = useState(''); const age = new Date().getFullYear() - year;
  return <Modal title="Cadastrar filho(a)" onClose={onClose}><p className="sm muted">Coletamos o mínimo necessário: nome de exibição, ano de nascimento (para adequar linguagem e segurança) e interesses (opcional). O nível pedagógico vem do diagnóstico, não da idade.</p>
    <label htmlFor="n">Nome de exibição</label><input id="n" value={name} onChange={(e) => setName(e.target.value)} /><label htmlFor="y">Ano de nascimento</label><input id="y" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
    {(age < 5 || age > 17) && <Notice tone="bad">A plataforma atende de 5 a 17 anos (idade calculada: {age}).</Notice>}<label htmlFor="i">Interesses (separados por vírgula)</label><input id="i" value={int} onChange={(e) => setInt(e.target.value)} />
    <div className="row" style={{ marginTop: 12 }}><Btn disabled={!name.trim() || age < 5 || age > 17} onClick={() => { addStudent(familyId, { name, birthYear: year, interests: int.split(',').map((x) => x.trim()).filter(Boolean) }); toast('Cadastrado! Crie o acesso do aluno quando quiser.'); onClose(); }}>Salvar</Btn></div></Modal>;
}

export function ParentChild() {
  const { id } = useParams(); const d = useDB(); const u = currentUser(d)!; const nav = useNavigate(); const [tab, setTab] = useState<'resumo' | 'rotina' | 'recompensas' | 'aparelhos'>('resumo');
  const s = d.students.find((x) => x.id === id); if (!s || !canSee(d, u, s.id)) return <Notice tone="bad">Acesso negado ou aluno inexistente.</Notice>;
  return <div className="col"><div className="row"><Btn variant="ghost sm" onClick={() => nav('/p')}>← Voltar</Btn><h1 className="grow">{s.name}</h1><Badge>{BAND[bandOf(s)]}</Badge></div>
    <Tabs tabs={[['resumo', 'Aprendizagem'], ['rotina', 'Rotina e provas'], ['recompensas', 'Recompensas'], ['aparelhos', 'Aparelhos e apps']]} value={tab} onChange={setTab} />
    {tab === 'resumo' && <Summary s={s} />}{tab === 'rotina' && <Routine s={s} />}{tab === 'recompensas' && <Rewards s={s} />}{tab === 'aparelhos' && <DevicesPanel s={s} />}</div>;
}

export function ReportView({ s, audience }: { s: Student; audience: 'family' | 'teacher' }) {
  const rep = reportFor(s).filter((r) => r.evidenceCount > 0 || r.state !== 'insufficient_evidence'); const colors = ['#6d3df2', '#2f7bff', '#ffb020', '#16a679', '#e5484d'];
  if (!s.diagDone && !rep.length) return <Card><p className="muted">Ainda não há resultados: o diagnóstico não foi realizado. Nenhum dado é exibido antes de existir evidência.</p></Card>;
  const groups = [['consolidated', 'Conhecimentos consolidados'], ['developing', 'Habilidades em desenvolvimento'], ['needs_support', 'Dificuldades específicas']] as const;
  const withEvo = rep.filter((r) => s.learner.snapshots.filter((x) => x.skills[r.skillId]?.n).length >= 2);
  return <div className="col"><Card><h3>Evolução após novas atividades</h3><LineChart series={withEvo.slice(0, 5).map((r, i) => ({ name: r.name, color: colors[i]!, points: s.learner.snapshots.filter((x) => x.skills[r.skillId]!.n > 0).map((x) => ({ x: x.label, y: x.skills[r.skillId]!.p })) }))} /><div className="row">{withEvo.slice(0, 5).map((r, i) => <span key={r.skillId} className="sm"><span style={{ color: colors[i] }}>●</span> {r.name}</span>)}</div></Card>
    {groups.map(([st, title]) => { const list = rep.filter((r) => r.state === st); return <Card key={st}><h3>{title} ({list.length})</h3>{!list.length && <p className="muted sm">Nenhuma até o momento.</p>}
      {list.map((r) => <details key={r.skillId} style={{ borderTop: '1px solid var(--line)', padding: '8px 0' }} open={st === 'needs_support'}><summary className="row" style={{ cursor: 'pointer' }}><b className="grow">{r.name}</b><StateBadge s={r.state} /><ConfBadge c={r.confidenceLabel} /><span className="muted sm">{r.evidenceCount} evid.</span></summary>
        <Progress value={r.probability} label={r.name} /><p className="sm"><b>Recomendação:</b> {r.recommendation}</p>
        {r.causes.length > 0 && <><b className="sm">Possíveis causas</b>{r.causes.map((c, i) => <div key={i} className="sm" style={{ margin: '6px 0' }}><Badge tone={c.status === 'confirmada' ? 'ok' : 'warn'}>{c.status}</Badge> <ConfBadge c={c.confidence} /> {c.label}{c.evidence.length > 0 && <ul style={{ margin: '4px 0' }}>{c.evidence.slice(0, 3).map((e, j) => <li key={j} className="muted">{e}</li>)}</ul>}</div>)}</>}
        {audience === 'teacher' && <p className="sm muted">Estimativa de domínio: {Math.round(r.probability * 100)}% (com {r.evidenceCount} evidências; confiança {r.confidenceLabel}). Não é nota.</p>}</details>)}</Card>; })}
    <Notice tone="info">Os resultados são estimativas pedagógicas, não diagnósticos médicos ou psicológicos. Uma única resposta nunca define uma dificuldade.</Notice></div>;
}
const BAND_NAME = { exploradores: 'Exploradores (5–7)', aventureiros: 'Aventureiros (8–10)', desafiadores: 'Desafiadores (11–13)', estrategistas: 'Estrategistas (14–17)' } as const;
function ProfileCard({ s }: { s: Student }) {
  const age = ageOf(s); const nominal = ageBandOf(s); const eff = bandOf(s);
  return <Card><h3>Perfil de aprendizagem</h3><p className="sm">Idade: <b>{age} anos</b> (calculada pelo ano de nascimento que você informou) · Estilo atual: <b>{BAND_NAME[eff]}</b>{eff !== nominal ? <> (ajustado a partir de {BAND_NAME[nominal]})</> : null}</p>
    <label htmlFor={`mat${s.id}`}>Estilo dos desafios</label><select id={`mat${s.id}`} value={s.maturity ?? 'padrao'} onChange={(e) => setProfile(s.id, { maturity: e.target.value as Maturity })}><option value="tranquilo">Mais tranquilo</option><option value="padrao">Recomendado para a idade</option><option value="desafiador">Mais desafiador</option></select>
    <p className="sm muted">Interesses: {s.interests.length ? s.interests.map((i) => INTERESTS.find((x) => x[0] === i)?.[1] ?? i).join(', ') : s.onboarded ? 'nenhum informado' : 'a criança escolhe no primeiro acesso'}.</p><p className="sm muted">O conteúdo (o que estudar) é definido pelo diagnóstico, não pela idade. A faixa 14–17 só é liberada a partir de 13 anos.</p></Card>;
}
function Summary({ s }: { s: Student }) {
  const d = useDB(); const u = currentUser(d)!; const consent = d.consents.some((c) => c.studentId === s.id && !c.revokedAt); const week = s.learner.responses.filter((r) => Date.now() - r.at < 7 * 86_400_000);
  return <div className="col"><div className="grid g3"><Card><h3>Últimos 7 dias</h3><p><b>{week.length}</b> atividades · <b>{week.filter((r) => r.correct).length}</b> acertos · <b>{week.filter((r) => r.hintsUsed).length}</b> com dicas</p></Card>
    <Card><h3>Escola</h3><p className="sm">Código de vínculo: <b>{s.schoolCode}</b></p><label className="row"><input type="checkbox" style={{ width: 22, minHeight: 22 }} checked={consent} onChange={(e) => setConsent(s.id, u.id, e.target.checked)} /> Compartilhar progresso com a escola</label><p className="sm muted">Revogável a qualquer momento.</p></Card>
    <Card><h3>Tutor com IA</h3><p className="muted sm">Indisponível (pendente). Nenhum dado é enviado a provedores de IA.</p></Card></div><ProfileCard s={s} /><ReportView s={s} audience="family" /></div>;
}
function Routine({ s }: { s: Student }) {
  const d = useDB(); const [title, setTitle] = useState(''); const [date, setDate] = useState(''); const [sk, setSk] = useState<string[]>([]);
  const exams = d.exams.filter((e) => e.studentId === s.id).sort((a, b) => a.date.localeCompare(b.date));
  return <div className="col"><Card><h3>Cadastrar prova ou conteúdo escolar</h3><label htmlFor="et">Descrição (ex.: “Prova de frações”)</label><input id="et" value={title} onChange={(e) => setTitle(e.target.value)} /><label htmlFor="ed">Data</label><input id="ed" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
    <label>Habilidades envolvidas</label><div className="row">{MATH_SKILLS.filter((x) => x.id.startsWith('frac') || x.id.startsWith('prob') || x.id.startsWith('mul') || x.id.startsWith('div') || x.id.startsWith('add') || x.id.startsWith('sub')).map((x) => <label key={x.id} className="chip" style={{ cursor: 'pointer', fontWeight: 600 }}><input type="checkbox" style={{ width: 16, minHeight: 16, marginRight: 6 }} checked={sk.includes(x.id)} onChange={(e) => setSk(e.target.checked ? [...sk, x.id] : sk.filter((i) => i !== x.id))} />{x.name}</label>)}</div>
    <div className="row" style={{ marginTop: 10 }}><Btn disabled={!title.trim() || !date} onClick={() => { addExam(s.id, title, date, sk); setTitle(''); setSk([]); toast('Prova cadastrada'); }}>Adicionar</Btn></div>
    <p className="sm muted">Fotos do caderno e PDFs: <Badge tone="warn">pendente</Badge> (exigem armazenamento seguro e OCR). Por ora: texto e seleção de habilidades. Mapeamento automático por IA também pendente.</p></Card>
    {exams.map((e) => { const days = Math.ceil((new Date(e.date + 'T12:00').getTime() - Date.now()) / 86_400_000); const sched = examPrepSchedule(days, e.skillIds); return <Card key={e.id}><h3>{e.title} — {new Date(e.date + 'T12:00').toLocaleDateString('pt-BR')}</h3>{days < 1 ? <p className="muted">Data já passou ou é hoje.</p> : sched.length ? <ol>{sched.map((x) => <li key={x.day}>Dia {x.day}: {x.simulado ? <b>simulado com todas as habilidades</b> : x.skillIds.map(skillName).join(', ')}</li>)}</ol> : <p className="muted">Selecione habilidades para gerar o plano de preparação.</p>}</Card>; })}</div>;
}
function Rewards({ s }: { s: Student }) {
  const [x, setX] = useState(s.rewards.xpPerMinute); const [cap, setCap] = useState(s.rewards.dailyCapMinutes); const b = balances(s); const tx = Ledger.import(s.ledger).export().slice(-10).reverse();
  return <div className="grid g2"><Card><h3>Conversão de pontos em minutos</h3><label htmlFor="x">XP necessários para 1 minuto</label><input id="x" type="number" min={1} max={20} value={x} onChange={(e) => setX(Number(e.target.value))} /><label htmlFor="c">Limite diário de minutos</label><input id="c" type="number" min={0} max={480} value={cap} onChange={(e) => setCap(Number(e.target.value))} />
    <Btn style={{ marginTop: 10 }} disabled={!(x >= 1) || cap < 0} onClick={() => { setRewards(s.id, x, cap); toast('Regras salvas'); }}>Salvar</Btn><p className="sm muted">Telefone e emergência nunca dependem de pontos. Expiração, acúmulo e janelas por app: pendentes.</p></Card>
    <Card><h3>Carteira (auditável)</h3><p><b>{b.xp}</b> XP · <b>{b.minutes}</b> min · integridade: {b.verified ? <Badge tone="ok">íntegra</Badge> : <Badge tone="bad">inconsistente</Badge>}</p><table><thead><tr><th>#</th><th>Moeda</th><th>Δ</th><th>Motivo</th></tr></thead><tbody>{tx.map((t) => <tr key={t.seq}><td>{t.seq}</td><td>{t.currency}</td><td>{t.delta > 0 ? '+' : ''}{t.delta}</td><td>{t.reason}</td></tr>)}</tbody></table>{!tx.length && <p className="muted sm">Sem movimentações.</p>}</Card></div>;
}

export function DevicesPanel({ s }: { s: Student }) {
  const d = useDB(); const devs = d.devices.filter((x) => x.studentId === s.id); const [code, setCode] = useState(''); const [entered, setEntered] = useState(''); const [name, setName] = useState('Celular do(a) ' + s.name);
  return <div className="col"><Notice>Esta tela usa um <b>dispositivo SIMULADO no navegador</b> para mostrar o fluxo (comando → aplicado → confirmado). O protocolo real (assinatura, expiração, repetição) é testado em <code>tests/poc</code>; o bloqueio nativo Android/iOS ainda <b>não foi validado em aparelhos</b> (ver docs/BUILD_DEVICE_TESTING.md).</Notice>
    <Card><h3>Vincular aparelho</h3><div className="row"><Btn onClick={() => setCode(startPairing(s.familyId, s.id))}>Gerar código (10 min)</Btn>{code && <b style={{ fontSize: '1.4em', letterSpacing: 3 }}>{code}</b>}</div>
      <div className="sim" style={{ marginTop: 10 }}><b>Simulador do aparelho da criança</b><div className="row"><input aria-label="Nome do aparelho" value={name} onChange={(e) => setName(e.target.value)} style={{ maxWidth: 260 }} /><input aria-label="Código" placeholder="código" value={entered} onChange={(e) => setEntered(e.target.value)} style={{ maxWidth: 160 }} /><Btn variant="sm" onClick={() => { try { completePairing(entered, 'android', name); setEntered(''); setCode(''); toast('Aparelho vinculado (simulado)'); } catch (e) { toast((e as Error).message); } }}>Vincular</Btn></div></div></Card>
    {devs.map((dev) => <DeviceCard key={dev.id} dev={dev} />)}</div>;
}
function DeviceCard({ dev }: { dev: Device }) {
  const d = useDB(); const cmds = d.commands.filter((c) => c.deviceId === dev.id).slice().reverse(); sweep;
  const tone = (st: string) => (st.endsWith('applied') ? 'ok' : st === 'pending' || st === 'received' ? 'info' : st === 'device_offline' ? 'warn' : 'bad') as 'ok';
  const L: Record<string, string> = { pending: 'Comando pendente', received: 'Comando recebido', block_applied: 'Bloqueio aplicado', unblock_applied: 'Desbloqueio aplicado', device_offline: 'Dispositivo offline', permission_unavailable: 'Permissão indisponível', sync_failed: 'Falha de sincronização', expired: 'Expirado' };
  const run = (f: () => void) => { try { f(); sweep(); } catch (e) { toast((e as Error).message); } };
  return <Card><div className="row"><h3 className="grow">{dev.name}</h3><Badge tone={dev.online ? 'ok' : 'warn'}>{dev.online ? 'online' : 'offline'}</Badge><Badge tone={dev.permissionOk ? 'ok' : 'bad'}>{dev.permissionOk ? 'permissão ativa' : 'permissão perdida'}</Badge><Badge tone="draft">simulado</Badge></div>
    <div className="sim"><b>Simulador:</b> <label className="row" style={{ display: 'inline-flex', margin: '0 10px' }}><input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={dev.online} onChange={(e) => setSim(dev.id, { online: e.target.checked })} /> online</label><label className="row" style={{ display: 'inline-flex', margin: '0 10px' }}><input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={dev.permissionOk} onChange={(e) => setSim(dev.id, { permissionOk: e.target.checked })} /> permissão de acessibilidade</label><Btn variant="sm" onClick={() => { simulatorSync(dev.id); sweep(); }}>Sincronizar agora (aparelho)</Btn></div>
    <table><thead><tr><th>Aplicativo</th><th>Situação no aparelho</th><th>Ações</th></tr></thead><tbody>{dev.apps.map((a) => { const st = appState(dev, a.id); return <tr key={a.id}><td>{a.label}{a.essential && <Badge tone="info"> sempre permitido</Badge>}</td><td>{st.allowed ? <Badge tone="ok">{st.reason === 'grant' ? 'liberado temporariamente' : 'liberado'}</Badge> : <Badge tone="bad">bloqueado</Badge>}</td>
      <td>{a.essential ? <span className="muted sm">Não pode ser bloqueado</span> : <div className="row"><Btn variant="sm" onClick={() => run(() => issueCommand(dev.id, 'block_app', a.id))}>Bloquear</Btn><Btn variant="ghost sm" onClick={() => run(() => issueCommand(dev.id, 'unblock_app', a.id))}>Desbloquear</Btn><Btn variant="ghost sm" onClick={() => run(() => issueCommand(dev.id, 'grant_time', a.id, 15))}>+15 min</Btn></div>}</td></tr>; })}</tbody></table>
    <h3 style={{ marginTop: 14 }}>Registro de comandos</h3>{!cmds.length ? <p className="muted sm">Nenhum comando.</p> : <table><thead><tr><th>Quando</th><th>Comando</th><th>Estado atual</th><th>Histórico</th></tr></thead><tbody>{cmds.slice(0, 8).map((c) => <tr key={c.id}><td>{new Date(c.createdAt).toLocaleTimeString('pt-BR')}</td><td>{c.type}{c.minutes ? ` ${c.minutes}min` : ''} · {dev.apps.find((a) => a.id === c.appId)?.label}</td><td><Badge tone={tone(c.status)}>{L[c.status]}</Badge></td><td className="sm muted">{c.history.map((h) => h.status).join(' → ')}</td></tr>)}</tbody></table>}</Card>;
}
