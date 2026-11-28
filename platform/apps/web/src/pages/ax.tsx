import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { brand } from '@edu/brand';
import { useDB, logout, balances, setAvatar, requestTime, type Student, type DB } from '../store/db';
import { buildDashboard, fmtMinutes, toneOf, type DashVM, type MapNode } from '../store/dashboard';
import { Axolotl, type MascotState } from '../ui/axolotl';
import { Modal, Btn } from '../ui';
import { GamesHub } from '../games/Games';
import { AvatarFace, ArtBook, ArtCalc, ArtFlask, ArtMuseum, ArtGlobe, ArtLang, IGame, ILogout, ArtCompass, ArtGame, ArtTarget, ArtVideo, ArtPeople, IBell, IChevron, ICheck, IEvolution, IFamily, IGear, IHome, ILibrary, ILock, IMission, IPlay, IArrow, ISpeaker, IStar, IStudy, ITrophy, ITutor, Medal, SHIRTS, SKINS, HAIRS, Wordmark, IPhone, type AvatarSpec } from '../ui/art';
import { useStudent } from './student';

const NAV = [['/s', 'Início', IHome], ['/s/estudar', 'Estudar', IStudy], ['/s/jogos', 'Jogos', IGame], ['/s/missoes', 'Minhas Missões', IMission], ['/s/progress', 'Minha Evolução', IEvolution], ['/s/conquistas', 'Conquistas', ITrophy]] as const;
const NAV2 = [['/s/biblioteca', 'Biblioteca', ILibrary], ['/s/tutor', 'Tutor IA', ITutor]] as const;
const MOBILE = [['/s', 'Início', IHome], ['/s/estudar', 'Estudar', IStudy], ['/s/missoes', 'Missões', IMission], ['/s/progress', 'Evolução', IEvolution], ['/s/familia', 'Família', IFamily]] as const;

/** Casca do aluno: menu lateral (desktop) + navegação inferior fixa (celular/tablet). */
export function AxShell() {
  const { d, s } = useStudent(); const [dark, setDark] = useState(false); if (!s.onboarded) return <Navigate to="/s/comecar" replace />; const band = (d.students.find((x) => x.id === s.id) && buildBand(s)); const here = useLocation().pathname;
  return <div className="ax-app" data-theme={band} data-band={band} data-mode={band === 'estrategistas' && dark ? 'dark' : undefined}>
    <aside className="ax-side" aria-label="Menu principal"><Wordmark size={46} />
      <nav className="ax-nav" aria-label="Navegação">{NAV.map(([to, l, I]) => <NavLink key={to} end to={to} className={({ isActive }) => `ax-link ${isActive ? 'on' : ''}`}><I size={28} />{l}</NavLink>)}<hr />{NAV2.map(([to, l, I]) => <NavLink key={to} to={to} className={({ isActive }) => `ax-link ${isActive ? 'on' : ''}`}><I size={28} />{l}</NavLink>)}<button className="ax-link out" onClick={logout}><ILogout size={28} />Sair</button></nav>
      <svg className="ax-wave" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden><path d="M0 60C50 20 100 20 150 55S250 90 300 40V120H0z" fill="#fff" opacity=".07" /><path d="M0 85C60 55 110 60 160 80S250 105 300 70V120H0z" fill="#fff" opacity=".07" /></svg>
      <Link to="/s/familia" className="ax-family"><ArtPeople size={52} /><span><b>Área da Família</b><small>Acompanhe o progresso e gerencie o tempo de uso</small></span><IChevron dir="right" size={22} /></Link></aside>
    <main className="ax-main" id="conteudo">{here !== '/s' && <div className="ax-usermenu"><UserMenu cls="ax-mmenu" /></div>}<Outlet context={{ dark, setDark }} /></main>
    <nav className="ax-bottom" aria-label="Navegação inferior">{MOBILE.map(([to, l, I]) => <NavLink key={to} end={to === '/s'} to={to} className={({ isActive }) => `ax-bt ${isActive ? 'on' : ''}`}><I size={26} /><span>{l}</span></NavLink>)}</nav></div>;
}
import { bandOf } from '../store/db';
const buildBand = (s: Student) => bandOf(s);

function useOutside(close: () => void) { const r = useRef<HTMLDivElement>(null); useEffect(() => { const h = (e: MouseEvent) => { if (r.current && !r.current.contains(e.target as Node)) close(); }; const k = (e: KeyboardEvent) => e.key === 'Escape' && close(); document.addEventListener('mousedown', h); document.addEventListener('keydown', k); return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); }; }, [close]); return r; }

function UserMenu({ onEdit, cls = '' }: { onEdit?: () => void; cls?: string }) {
  const nav = useNavigate(); const [menu, setMenu] = useState(false); const rm = useOutside(() => setMenu(false));
  return <div className={`ax-pop-wrap ${cls}`} ref={rm}><button className="ax-round sm" aria-label="Menu do aluno" aria-expanded={menu} onClick={() => setMenu(!menu)}><IChevron size={22} /></button>{menu && <div className="ax-pop menu" role="menu">{onEdit && <button role="menuitem" onClick={() => { setMenu(false); onEdit(); }}>🎨 Personalizar avatar</button>}<button role="menuitem" onClick={() => nav('/s/familia')}>👨‍👩‍👧 Área da Família</button><button role="menuitem" onClick={() => nav('/s/tutor')}>🤖 Tutor IA</button><button role="menuitem" onClick={logout}>↩ Sair</button></div>}</div>;
}
function Header({ vm, s }: { vm: DashVM; s: Student }) {
  const [bell, setBell] = useState(false); const [edit, setEdit] = useState(false);
  const rb = useOutside(() => setBell(false));
  return <header className="ax-head">
    <div className="ax-mtop"><Wordmark size={34} /><span className="grow" /><div className="ax-pop-wrap" ref={rb}><button className="ax-round" aria-label={`Notificações${vm.notifications.length ? `: ${vm.notifications.length}` : ''}`} aria-expanded={bell} onClick={() => setBell(!bell)}><IBell size={26} />{vm.notifications.length > 0 && <i className="ax-dot-red" />}</button>{bell && <Notifs vm={vm} />}</div><UserMenu onEdit={() => setEdit(true)} cls="ax-mmenu" /></div>
    <div className="ax-who"><button className="ax-avatar" aria-label="Personalizar avatar" onClick={() => setEdit(true)}><AvatarFace a={vm.avatar} size={120} name={vm.name} /></button>
      <div className="ax-hello"><h1>Olá, {vm.name}! <span aria-hidden>👋</span></h1><p>{vm.band === 'estrategistas' ? 'Seu foco de hoje está pronto.' : vm.band === 'desafiadores' ? 'Seus desafios de hoje estão prontos.' : vm.band === 'exploradores' ? 'Vamos brincar de aprender?' : 'Pronto para mais uma missão de aprendizado?'}</p></div></div>
    <div className="ax-pills"><div className="ax-pill pts"><IStar size={38} /><span><b>{vm.xp.toLocaleString('pt-BR')}</b> pontos</span></div>
      <div className="ax-pill time"><IPhone size={34} /><span><b>{fmtMinutes(vm.minutes)}</b><small>de uso liberado</small></span></div></div>
    <div className="ax-tools"><div className="ax-pop-wrap ax-desk" ref={rb}><button className="ax-round" aria-label={`Notificações${vm.notifications.length ? `: ${vm.notifications.length}` : ''}`} aria-expanded={bell} onClick={() => setBell(!bell)}><IBell size={26} />{vm.notifications.length > 0 && <i className="ax-dot-red" />}</button>{bell && <Notifs vm={vm} />}</div>
      <UserMenu onEdit={() => setEdit(true)} /></div>
    {edit && <AvatarEditor s={s} onClose={() => setEdit(false)} />}</header>;
}
function Notifs({ vm }: { vm: DashVM }) { const nav = useNavigate(); return <div className="ax-pop" role="dialog" aria-label="Notificações"><b>Notificações</b>{vm.notifications.length ? vm.notifications.map((n) => <button key={n.id} onClick={() => nav(n.route)}>{n.text}</button>) : <p className="ax-muted">Tudo em dia por aqui.</p>}</div>; }

export function AvatarEditor({ s, onClose }: { s: Student; onClose: () => void }) {
  const [a, setA] = useState<AvatarSpec>(s.avatar.spec ?? { skin: SKINS[0]!, hair: HAIRS[1]!, style: 'curto', shirt: SHIRTS[0]!, bg: '#dff0ff' });
  const sw = (list: readonly string[], key: 'skin' | 'hair' | 'shirt') => <div className="ax-sw" role="radiogroup" aria-label={key}>{list.map((c) => <button key={c} role="radio" aria-checked={a[key] === c} aria-label={`${key} ${c}`} className={a[key] === c ? 'on' : ''} style={{ background: c }} onClick={() => setA({ ...a, [key]: c })} />)}</div>;
  return <Modal title="Personalizar avatar" onClose={onClose}><div className="ax-avedit"><AvatarFace a={a} size={140} name={s.name} /><div className="col"><b>Pele</b>{sw(SKINS, 'skin')}<b>Cabelo</b>{sw(HAIRS, 'hair')}<div className="ax-sw" role="radiogroup" aria-label="estilo">{(['curto', 'cacheado', 'longo', 'topete'] as const).map((st) => <button key={st} role="radio" aria-checked={a.style === st} className={`txt ${a.style === st ? 'on' : ''}`} onClick={() => setA({ ...a, style: st })}>{st}</button>)}</div><b>Camiseta</b>{sw(SHIRTS, 'shirt')}</div></div>
    <div className="row" style={{ marginTop: 14 }}><Btn onClick={() => { setAvatar(s.id, a); onClose(); }}>Salvar</Btn><Btn variant="ghost" onClick={onClose}>Cancelar</Btn></div></Modal>;
}

const TIPS = ['Errar ajuda a aprender. Vamos tentar de novo?', 'Que tal um minigame hoje? Aprender brincando é mais divertido!', 'Você chega lá, um passo de cada vez!', 'Pedir uma dica é coisa de quem é esperto!', 'Respire fundo, pense no seu ritmo. Sem pressa!', 'Vamos descobrir algo novo hoje?'];
const MOODS: MascotState[] = ['comemorando', 'incentivando', 'dando_dicas', 'feliz', 'explicando', 'apresentando'];
function Banner({ vm }: { vm: DashVM }) {
  const nav = useNavigate(); const can = typeof window !== 'undefined' && 'speechSynthesis' in window; const [tap, setTap] = useState(-1); const [bounce, setBounce] = useState(false);
  const say = () => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(`${vm.mission.title} ${vm.mission.text}`); u.lang = 'pt-BR'; u.rate = 0.9; speechSynthesis.speak(u); } catch { /* sem voz disponível */ } };
  const poke = () => { setTap((tap + 1) % TIPS.length); setBounce(true); setTimeout(() => setBounce(false), 650); };
  return <section className="ax-banner" aria-label="Missão"><Decor /><div className={`ax-banner-mascot ${bounce ? 'hop' : ''}`}><button className="ax-pet" onClick={poke} aria-label="Fazer carinho no mascote: ele conta uma dica"><Axolotl state={tap >= 0 ? MOODS[tap % MOODS.length]! : vm.mission.mascot} size={vm.band === 'estrategistas' ? 84 : vm.band === 'desafiadores' ? 150 : 230} cap={vm.band === 'exploradores' || vm.band === 'aventureiros'} /></button>{tap >= 0 && <div className="ax-say" role="status">{TIPS[tap]}</div>}</div>
    <div className="ax-banner-text"><h2>{vm.band === 'exploradores' || vm.band === 'aventureiros' ? <><em>Nova</em> Missão!</> : vm.mission.title}</h2><p>{vm.mission.text}</p>
      <div className="row"><button className="ax-cta" onClick={() => nav(vm.mission.route)}>{vm.mission.cta} <IPlay size={20} /></button>{can && <button className="ax-ghost" onClick={say} aria-label="Ouvir a missão em voz alta"><ISpeaker size={22} /><span className="ax-lbl"> Ouvir</span></button>}</div></div>
    <div className="ax-banner-pie" aria-hidden>{vm.mission.pie ? <PieArt /> : <ArtCompass size={96} />}</div><i className="ax-spark s1" /><i className="ax-spark s2" /></section>;
}
const PieArt = () => <svg width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#dfe9ff" /><path d="M50 50V6a44 44 0 0 1 44 44z" fill="#8db4ff" /><path d="M50 50h44a44 44 0 0 1-44 44z" fill="#c4d6fa" /><path d="M50 4v92M4 50h92" stroke="#fff" strokeWidth="3" /><text x="50" y="47" textAnchor="middle" fontSize="22" fontWeight="900" fill="#271a5c">1</text><path d="M39 52h22" stroke="#271a5c" strokeWidth="2.6" strokeLinecap="round" /><text x="50" y="74" textAnchor="middle" fontSize="22" fontWeight="900" fill="#271a5c">4</text></svg>;

const SUBJ_ART = { portugues: ArtBook, matematica: ArtCalc, ciencias: ArtFlask, historia: ArtMuseum, geografia: ArtGlobe, ingles: ArtLang } as const;
/** Faixa de disciplinas (como na referência): cartões fixos, rolagem horizontal por arrastar/deslizar e seta. */
function Subjects({ vm }: { vm: DashVM }) {
  const nav = useNavigate(); const ref = useRef<HTMLDivElement>(null); const drag = useRef({ down: false, x: 0, left: 0, moved: false }); const [edge, setEdge] = useState({ l: false, r: true });
  const upd = () => { const e = ref.current; if (e) setEdge({ l: e.scrollLeft > 4, r: e.scrollLeft + e.clientWidth < e.scrollWidth - 4 }); };
  useEffect(upd, []);
  return <section className="ax-subjects" aria-label="Disciplinas">{edge.l && <button className="ax-next left" aria-label="Disciplinas anteriores" onClick={() => ref.current?.scrollBy({ left: -240, behavior: 'smooth' })}><IChevron dir="left" size={24} /></button>}
    <div className="ax-subj-row" ref={ref} onScroll={upd} tabIndex={0} role="list" aria-label="Deslize para ver mais disciplinas"
      onPointerDown={(e) => { if (e.pointerType === 'mouse') { drag.current = { down: true, x: e.clientX, left: ref.current!.scrollLeft, moved: false }; } }}
      onPointerMove={(e) => { const d = drag.current; if (d.down) { const dx = e.clientX - d.x; if (Math.abs(dx) > 5) d.moved = true; ref.current!.scrollLeft = d.left - dx; } }}
      onPointerUp={() => { drag.current.down = false; }} onPointerLeave={() => { drag.current.down = false; }} onClickCapture={(e) => { if (drag.current.moved) { e.stopPropagation(); e.preventDefault(); drag.current.moved = false; } }}>
      {vm.subjects.map((x) => { const A = SUBJ_ART[x.id]; return <button role="listitem" key={x.id} className={`ax-subj ${x.id} ${x.active ? '' : 'soon'}`} disabled={!x.active} onClick={() => nav('/s/estudar')} aria-label={`${x.name}: ${x.pct === null ? x.note : `${x.pct}% (estimativa)`}`}>
        <span className="ico"><A size={64} /></span><b>{x.name}</b><span className="pr"><span className="ax-bar"><i className={x.pct === null ? 'none' : ''} style={{ width: `${x.pct ?? 0}%` }} /></span><strong>{x.pct === null ? <small>{x.active ? '—' : 'Em breve'}</small> : `${x.pct}%`}</strong></span></button>; })}</div>
    {edge.r && <button className="ax-next" aria-label="Mais disciplinas" onClick={() => ref.current?.scrollBy({ left: 240, behavior: 'smooth' })}><IChevron dir="right" size={24} /></button>}</section>;
}

/** Prateleira de minigames na tela inicial. */
function GamesShelf({ teen }: { teen: boolean }) { const nav = useNavigate(); const shelfTitle = teen ? 'Jogos' : 'Minigames'; return <section className="ax-shelf" aria-label="Minigames"><div className="row"><h3 className="grow"><IGame size={30} /> {shelfTitle}</h3><button className="ax-all link" onClick={() => nav('/s/jogos')}>Ver todos</button></div><GamesHub compact /></section>; }

/** Decoração animada e lúdica do fundo (nuvens, estrelas e bolhas). */
function Decor() { return <div className="ax-decor" aria-hidden><i className="c c1" /><i className="c c2" /><i className="c c3" /><i className="s s1" /><i className="s s2" /><i className="s s3" /><i className="b b1" /><i className="b b2" /></div>; }

function Performance({ vm }: { vm: DashVM }) {
  const nav = useNavigate(); const kid = vm.band === 'exploradores';
  return <section className="ax-card"><h3><IEvolution size={30} /> Meu Desempenho</h3>
    <div className="ax-rows">{vm.groups.map((g) => { const t = toneOf(g.pct === null ? null : g.pct / 100); return <div key={g.id} className="ax-row"><span className="lab">{g.name}</span>
      <span className="ax-bar" role="img" aria-label={g.pct === null ? `${g.name}: sem dados ainda` : `${g.name}: ${g.pct}% (estimativa, confiança ${g.conf})`}><i className={`t-${t}`} style={{ width: `${g.pct ?? 0}%` }} /></span>
      <b className="val">{g.pct === null ? '—' : kid ? '⭐'.repeat(g.pct >= 80 ? 3 : g.pct >= 50 ? 2 : 1) : `${g.pct}%`}</b></div>; })}</div>
    <p className="ax-note">{vm.hasDiag ? 'Estimativas do motor pedagógico; com poucas atividades a confiança é baixa.' : 'Faça o diagnóstico para ver o seu desempenho. Nada é mostrado antes de haver evidências.'}</p>
    <button className="ax-outline" onClick={() => nav('/s/progress')}>Ver diagnóstico completo <IArrow size={20} /></button></section>;
}
const PLAN_ART = { video: ArtVideo, game: ArtGame, target: ArtTarget, compass: ArtCompass } as const;
function Plan({ vm }: { vm: DashVM }) {
  const nav = useNavigate();
  return <section className="ax-card"><h3><span className="ico"><ArtVideo size={30} /></span> Meu Plano de Estudos</h3><p className="ax-sub">{vm.plan.subtitle}</p>
    <ul className="ax-plan">{vm.plan.items.map((it) => { const A = PLAN_ART[it.art]; return <li key={it.id} className={it.route ? 'go' : ''} onClick={() => it.route && nav(it.route)} onKeyDown={(e) => it.route && e.key === 'Enter' && nav(it.route)} tabIndex={it.route ? 0 : undefined} role={it.route ? 'link' : undefined}><A size={30} /><span className="t">{it.title}</span><span className="m">{it.min} min</span><span className={`ck ${it.done ? 'on' : ''}`} role="img" aria-label={it.done ? 'concluído' : 'a fazer'}>{it.done && <ICheck size={16} />}</span></li>; })}</ul>
    <p className="ax-note">Tempos são estimativas.</p><button className="ax-primary" onClick={() => nav(vm.plan.cta.route)}><IPlay size={20} /> {vm.plan.cta.label}</button></section>;
}

const POS = (i: number, n: number) => [42 + (i * 296) / (n - 1), 118 + Math.sin(i * 1.35) * 22 - i * 3] as const;
function Island({ vm }: { vm: DashVM }) {
  const nav = useNavigate(); const [pick, setPick] = useState<MapNode | null>(null); const nodes = vm.world.nodes; const n = nodes.length + 1;
  const pts = Array.from({ length: n }, (_, i) => POS(i, n)); const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const next = 50 * (vm.level.n + 1) * vm.level.n;
  return <section className="ax-card ax-evo"><h3><IEvolution size={30} /> Minha Evolução</h3>
    <svg viewBox="0 18 380 182" className="ax-island" role="group" aria-label={`Mapa do mundo ${vm.world.name}`}>
      <path d="M14 128C14 88 64 66 118 70c52-32 142-30 190 0 42 10 62 40 52 70-16 36-110 46-170 42C100 184 14 172 14 128z" fill="#5aa84d" /><path d="M16 126C16 90 66 70 118 72c52-30 140-28 188 2 40 10 58 36 48 62-16 32-108 42-168 38C102 178 16 168 16 126z" fill="#80d46c" />
      <path d="M30 150c40 24 150 30 232 14 36-8 70-26 84-44" stroke="#b07a45" strokeWidth="9" fill="none" strokeLinecap="round" opacity=".5" />
      {[[70, 98, 1], [112, 150, .8], [250, 150, .9], [310, 108, 1.1], [200, 70, .8]].map(([x, y, k], i) => <g key={i} transform={`translate(${x} ${y}) scale(${k})`}><rect x="-2.5" y="0" width="5" height="12" fill="#8a5a2b" /><circle cy="-4" r="11" fill="#2f9e4f" /><circle cx="-5" cy="-8" r="6" fill="#3fbf63" /></g>)}
      <path d={path} stroke="#f4dca8" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d={path} stroke="#e2c07c" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" fill="none" />
      {nodes.map((nd, i) => { const [x, y] = pts[i]!; return <g key={nd.id} transform={`translate(${x} ${y})`} role="button" tabIndex={0} aria-label={`${nd.label}: ${({ mastered: 'dominada', current: 'fase atual', open: 'disponível', locked: 'bloqueada' })[nd.status]}`} className={`ax-node ${nd.status}`} onClick={() => setPick(nd)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setPick(nd)}>
        <title>{nd.label}</title>{nd.status === 'mastered' && <><circle r="14" fill="#1fb765" stroke="#fff" strokeWidth="3" /><path d="m-6 0 4.5 4.5L7-4" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" /></>}
        {nd.status === 'open' && <><circle r="12" fill="#fff" stroke="#6a3fd8" strokeWidth="3.5" /><circle r="4" fill="#6a3fd8" /></>}
        {nd.status === 'locked' && <><ellipse cy="3" rx="16" ry="11" fill="#a9a6bf" /><ellipse cy="0" rx="16" ry="11" fill="#c9c6dc" /><rect x="-6" y="-4" width="12" height="9" rx="2" fill="#6f6a96" /><path d="M-3.5-4v-3a3.5 3.5 0 0 1 7 0v3" stroke="#6f6a96" strokeWidth="2.4" fill="none" /></>}
        {nd.status === 'current' && <><circle r="22" fill="#6a3fd8" opacity=".18" className="ax-pulse" /><g transform="translate(-19 -42)"><AvatarFace a={vm.avatar} size={38} /></g><circle r="9" fill="#ffc93c" stroke="#fff" strokeWidth="3" /></>}</g>; })}
      {(() => { const [x, y] = pts[n - 1]!; return <g transform={`translate(${x} ${y})`} role="img" aria-label="Meta do mundo"><ellipse cy="4" rx="17" ry="10" fill="#9c99b8" /><rect x="-1.5" y="-30" width="3" height="34" fill="#7a4a2a" /><path d="M1.5-30 24-22 1.5-14z" fill="#ffc93c" stroke="#e59a00" strokeWidth="1.5" strokeLinejoin="round" /></g>; })()}</svg>
    {pick && <div className="ax-node-info" role="status"><b>{pick.label}</b><p>{pick.why}</p>{pick.status !== 'locked' && pick.status !== 'mastered' && <Btn variant="sm" onClick={() => nav('/s/session?kind=practice')}>Praticar</Btn>}<button className="ax-x" aria-label="Fechar" onClick={() => setPick(null)}>✕</button></div>}
    <p className="ax-world">{vm.world.name} · <span>{vm.world.theme}</span></p>
    <b className="ax-lv">Nível {vm.level.n}</b><div className="ax-lvname">{vm.level.title}</div>
    <span className="ax-bar big"><i className="t-ok" style={{ width: `${(vm.level.into / vm.level.span) * 100}%` }} /></span><div className="ax-xpline">{vm.xp.toLocaleString('pt-BR')} / {next.toLocaleString('pt-BR')} pontos</div>
    <p className="ax-note">Fases liberam por evidências de aprendizagem, não só por pontos.</p></section>;
}

function Phone({ vm, s }: { vm: DashVM; s: Student }) {
  const [open, setOpen] = useState(false); const d = useDB();
  return <section className="ax-card"><h3><IPhone size={28} /> Tempo de uso do celular</h3><p className="ax-sub">Você já conquistou:</p>
    <div className="ax-time"><b>{fmtMinutes(vm.minutes)}</b>{vm.minutes > 0 && <span className="ax-okc"><ICheck size={20} /></span>}</div>
    <button className="ax-outline" onClick={() => setOpen(true)}><IGear size={22} /> Gerenciar com um responsável</button>{open && <TimeModal s={s} d={d} onClose={() => setOpen(false)} />}</section>;
}
export function TimeModal({ s, d, onClose }: { s: Student; d: DB; onClose: () => void }) {
  const dev = d.devices.find((x) => x.studentId === s.id); const [app, setApp] = useState(''); const [m, setM] = useState(15); const [sent, setSent] = useState(false);
  return <Modal title="Tempo com o responsável" onClose={onClose}><p>Quem decide o uso do celular é o seu responsável. Aqui você pode ver o que conquistou e <b>pedir mais tempo</b>.</p><p className="ax-note">Telefone e emergência nunca dependem de pontos.</p>
    {!dev ? <p className="muted">Nenhum aparelho vinculado ainda. O controle parental é opcional.</p> : <><label htmlFor="ta">Aplicativo</label><select id="ta" value={app} onChange={(e) => setApp(e.target.value)}><option value="">Escolha…</option>{dev.apps.filter((a) => !a.essential).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select><label htmlFor="tm">Minutos</label><input id="tm" type="number" min={1} max={120} value={m} onChange={(e) => setM(Number(e.target.value))} />
      <Btn style={{ marginTop: 10 }} disabled={!app || m < 1 || m > 120 || sent} onClick={() => { requestTime(s.id, dev.id, app, m, ''); setSent(true); }}>Enviar pedido ao responsável</Btn>{sent && <p>Pedido enviado! Seu responsável vai ver.</p>}</>}</Modal>;
}

function Medals({ vm }: { vm: DashVM }) {
  const nav = useNavigate(); const shown = [...vm.medals.filter((m) => m.earned), ...vm.medals.filter((m) => !m.earned)].slice(0, 3);
  return <section className="ax-card"><div className="row"><h3 className="grow"><ITrophy size={30} /> Minhas Conquistas</h3><Link to="/s/conquistas" className="ax-all">Ver todas</Link></div>
    <div className="ax-medals">{shown.map((m) => <button key={m.kind} className={m.earned ? '' : 'lock'} onClick={() => nav('/s/conquistas')} aria-label={`${m.title}: ${m.earned ? 'conquistada' : 'bloqueada'}. ${m.earned ? m.sub : m.how}`}><Medal kind={m.kind} locked={!m.earned} size={74} /><b>{m.title}</b><small>{m.earned ? m.sub : 'Bloqueada'}</small></button>)}</div></section>;
}

export function Dashboard() {
  const { d, s } = useStudent(); const vm = buildDashboard(d, s);
  return <div className="ax-dash"><Header vm={vm} s={s} /><div className="ax-cols"><div className="ax-left"><Banner vm={vm} /><Subjects vm={vm} /><GamesShelf teen={vm.band === 'desafiadores' || vm.band === 'estrategistas'} /><div className="ax-two"><Performance vm={vm} /><Plan vm={vm} /></div></div>
    <div className="ax-right"><Island vm={vm} /><Phone vm={vm} s={s} /><Medals vm={vm} /></div></div></div>;
}
export const _unused: ReactNode = null; void brand; void balances; void ArtGame; void ArtTarget; void ArtCompass;
