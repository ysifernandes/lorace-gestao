import { GameArt } from '../ui/gameart';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Item } from '@edu/content-math';
import type { Response } from '@edu/learning';
import { answerGame, finishGame, bandOf } from '../store/db';
import { Axolotl, type MascotState } from '../ui/axolotl';
import { Btn } from '../ui';
import { useStudent } from '../pages/student';
import { BILLS, CTX, ctxOf, roundsFor, starsFor, type DetectiveView, type EscapeView, type FinView, type LabView, type MarketView, type PizzaView, type PlacarView, type Round, type SentenceView } from './logic';
import { ItemFigure, ShapeSvg, SpeakBtn, parseTokenName, speak, stopSpeaking } from '../ui/figures';
import { ISpeaker } from '../ui/art';
import { gameById, gameForSkill, gamesForBand, labelFor } from './registry';

/* ---------- confete (comemoração; respeita prefers-reduced-motion via CSS) ---------- */
export function Confetti({ n = 36 }: { n?: number }) {
  const [on, setOn] = useState(true); useEffect(() => { const t = setTimeout(() => setOn(false), 3200); return () => clearTimeout(t); }, []);
  if (!on) return null; const cols = ['#ffc93c', '#ff6fb6', '#4d82f0', '#34d27e', '#9b6dff', '#ff8a3d'];
  return <div className="confetti" aria-hidden>{Array.from({ length: n }, (_, i) => <i key={i} style={{ left: `${(i * 97) % 100}%`, background: cols[i % cols.length], animationDelay: `${(i % 9) * 0.07}s`, animationDuration: `${1.6 + (i % 5) * 0.25}s`, transform: `rotate(${i * 37}deg)` }} />)}</div>;
}

/* ---------- componentes de jogo compartilhados ---------- */
function Keypad({ value, onChange, disabled, max = 3 }: { value: string; onChange: (v: string) => void; disabled?: boolean; max?: number }) {
  const add = (d: string) => value.length < max && onChange(value + d);
  return <div className="gm-keypad" role="group" aria-label="Teclado numérico"><output className="gm-display" aria-live="polite">{value || '?'}</output>
    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => <button key={d} type="button" disabled={disabled} onClick={() => add(d)}>{d}</button>)}
    <button type="button" disabled={disabled} className="alt" onClick={() => onChange('')} aria-label="Limpar">C</button><button type="button" disabled={disabled} onClick={() => add('0')}>0</button><button type="button" disabled={disabled} className="alt" onClick={() => onChange(value.slice(0, -1))} aria-label="Apagar">⌫</button></div>;
}
const GoBtn = ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button className="gm-go" {...p}>{children}</button>;
type BoardProps<V> = { round: Round<V>; locked: boolean; submit: (r: Response) => void };

/* ---------- Pizzaria ---------- */
function Pizza({ den, sel, gone, onToggle }: { den: number; sel?: Set<number>; gone?: number; onToggle?: (i: number) => void }) {
  const R = 86, C = 100; const pt = (i: number): [number, number] => [C + R * Math.sin((2 * Math.PI * i) / den), C - R * Math.cos((2 * Math.PI * i) / den)];
  return <svg viewBox="0 0 200 200" className="gm-pizza" role="group" aria-label={`Pizza com ${den} fatias`}><circle cx="100" cy="100" r="96" fill="#d9a05b" /><circle cx="100" cy="100" r="92" fill="#f3c778" />
    {Array.from({ length: den }, (_, i) => { const [x1, y1] = pt(i), [x2, y2] = pt(i + 1); const mid = (2 * Math.PI * (i + 0.5)) / den; const isGone = gone !== undefined && i < gone; const on = sel?.has(i);
      return <g key={i} role={onToggle ? 'button' : undefined} tabIndex={onToggle ? 0 : undefined} aria-label={`Fatia ${i + 1}${on ? ', escolhida' : ''}`} aria-pressed={onToggle ? !!on : undefined} className={onToggle ? 'gm-slice' : undefined} onClick={() => onToggle?.(i)} onKeyDown={(e) => onToggle && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle(i))}>
        <path d={`M${C} ${C}L${x1} ${y1}A${R} ${R} 0 0 1 ${x2} ${y2}z`} fill={isGone ? '#fff6e5' : on ? '#ffb347' : '#ffd98c'} stroke={isGone ? '#e6d3b0' : '#e09a3c'} strokeWidth="2.5" strokeDasharray={isGone ? '4 4' : undefined} />
        {!isGone && <><path d={`M${C} ${C}L${x1} ${y1}`} stroke="#fff3c9" strokeWidth="1.6" opacity=".7" />{(on || sel === undefined) && <><circle cx={C + Math.sin(mid) * 52} cy={C - Math.cos(mid) * 52} r="9" fill="#d94a3d" /><circle cx={C + Math.sin(mid) * 70} cy={C - Math.cos(mid) * 70} r="5" fill="#3f9b4a" /></>}</>}</g>; })}</svg>;
}
function PizzaBoard({ round, locked, submit }: BoardProps<PizzaView>) {
  const v = round.view; const [sel, setSel] = useState<Set<number>>(new Set()); const [pick, setPick] = useState<string>();
  if (v.type === 'build') return <div className="gm-board"><div className="gm-order"><span>🧾 Pedido</span><b>{v.order}</b></div><Pizza den={v.den} sel={sel} onToggle={locked ? undefined : (i) => { const n = new Set(sel); n.has(i) ? n.delete(i) : n.add(i); setSel(n); }} /><p className="gm-tip">Fatias escolhidas: <b>{sel.size}</b> de {v.den}</p><GoBtn disabled={locked || sel.size === 0} onClick={() => submit({ shaded: sel.size })}>Servir 🍕</GoBtn></div>;
  const it = round.item as Extract<Item, { options: unknown }>;
  return <div className="gm-board">{v.type === 'identify' ? <Pizza den={v.den} gone={v.eaten} /> : <div className="gm-two"><div><Pizza den={v.a} sel={new Set([0])} /><p className="gm-tip">Cliente A: 1 fatia de {v.a}</p></div><div><Pizza den={v.b} sel={new Set([0])} /><p className="gm-tip">Cliente B: 1 fatia de {v.b}</p></div></div>}
    <h3>{it.statement}</h3><div className="gm-opts">{it.options.map((o) => <button key={o.id} disabled={locked} className={pick === o.id ? 'on' : ''} onClick={() => setPick(o.id)}>{o.text}</button>)}</div><GoBtn disabled={locked || !pick} onClick={() => submit({ choice: pick! })}>Conferir ✔</GoBtn></div>;
}

/* ---------- Mercado ---------- */
function MarketBoard({ round, locked, submit }: BoardProps<MarketView>) {
  const v = round.view; const [txt, setTxt] = useState(''); const [coins, setCoins] = useState<number[]>([]); const sum = coins.reduce((a, b) => a + b, 0);
  return <div className="gm-board"><div className="gm-basket" aria-label="Cesta de compras">{v.items.map(({ prod, qty }) => <div key={prod.n} className="gm-prod"><span className="e">{prod.e}</span><b>{prod.n}</b><span>R$ {prod.p}{qty > 1 ? ` × ${qty}` : ''}</span></div>)}</div>
    {v.type === 'total' ? <><p className="gm-tip">Quanto é o <b>total</b> da compra?</p><Keypad value={txt} onChange={setTxt} disabled={locked} /><GoBtn disabled={locked || !txt} onClick={() => submit({ text: txt })}>Receber 💰</GoBtn></> :
      <><p className="gm-tip">Total R$ <b>{v.total}</b> · A cliente pagou com <b className="bill">R$ {v.paid}</b>. Monte o <b>troco</b> com notas e moedas:</p>
        <div className="gm-bills">{BILLS.map((b) => <button key={b} disabled={locked} className={b >= 5 ? 'note' : 'coin'} onClick={() => setCoins([...coins, b])} aria-label={`Adicionar R$ ${b}`}>R$ {b}</button>)}</div>
        <div className="gm-change" aria-live="polite">Troco montado: <b>R$ {sum}</b> {coins.length > 0 && <button className="gm-link" onClick={() => setCoins([])}>limpar</button>}</div><GoBtn disabled={locked || sum === 0} onClick={() => submit({ text: String(sum) })}>Entregar troco 🤝</GoBtn></>}</div>;
}

/* ---------- Laboratório ---------- */
const Cup = ({ n, size = 26 }: { n: number; size?: number }) => <span className="gm-cups">{Array.from({ length: n }, (_, i) => <i key={i} style={{ fontSize: size }}>🧁</i>)}</span>;
function LabBoard({ round, locked, submit }: BoardProps<LabView>) {
  const v = round.view; const [txt, setTxt] = useState(''); const [rows, setRows] = useState(0); const [tray, setTray] = useState(v.type === 'share' || v.type === 'pack' || v.type === 'remainder' ? v.total : 0); const [boxes, setBoxes] = useState<number[]>(() => Array(v.type === 'share' || v.type === 'remainder' ? v.boxes : 0).fill(0)); const [packs, setPacks] = useState(0); const [mins, setMins] = useState(0);
  const ask = (q: string, ready: boolean, hint?: string) => ready ? <><p className="gm-tip">{q}</p><Keypad value={txt} onChange={setTxt} disabled={locked} /><GoBtn disabled={locked || !txt} onClick={() => submit({ text: txt })}>Responder ✔</GoBtn></> : <p className="gm-tip">{hint}</p>;
  if (v.type === 'array') return <div className="gm-board"><div className="gm-tray">{Array.from({ length: rows }, (_, r) => <div key={r}><Cup n={v.per} /></div>)}{rows === 0 && <p className="gm-tip">A bandeja está vazia</p>}</div>{rows < v.rows && <GoBtn disabled={locked} onClick={() => setRows(rows + 1)}>+ Colocar uma fileira de {v.per}</GoBtn>}{ask('Quantos cupcakes na bandeja?', rows >= v.rows, `Faltam ${v.rows - rows} fileira(s).`)}</div>;
  if (v.type === 'share' || v.type === 'remainder') {
    const eq = tray === 0 && boxes.every((b) => b === boxes[0]); const give = (i: number) => { if (tray > 0 && !locked) { const b = [...boxes]; b[i]!++; setBoxes(b); setTray(tray - 1); } };
    return <div className="gm-board"><div className="gm-tray"><b>Bandeja:</b> <Cup n={tray} size={22} /></div><div className="gm-boxes">{boxes.map((n, i) => <button key={i} className="gm-box" disabled={locked || tray === 0} onClick={() => give(i)} aria-label={`Caixa ${i + 1} com ${n}. Toque para colocar um cupcake`}><span>📦</span><b>{n}</b></button>)}</div>
      <div className="row"><button className="gm-link" onClick={() => { setBoxes(boxes.map(() => 0)); setTray(v.total); setTxt(''); }}>↺ Recomeçar</button>{v.type === 'remainder' && tray > 0 && <button className="gm-link" disabled={tray < boxes.length} onClick={() => { if (tray >= boxes.length) { setBoxes(boxes.map((b) => b + 1)); setTray(tray - boxes.length); } }}>Dar 1 a cada caixa</button>}</div>
      {v.type === 'share' ? (tray > 0 ? <p className="gm-tip">Toque numa caixa para dar 1 cupcake. Sobram {tray}.</p> : eq ? ask('Quantos cupcakes ficaram em cada caixa?', true) : <p className="gm-tip">Hmm, uma caixa ficou com mais. Toque em ↺ Recomeçar e reparta igualzinho.</p>) : ask('Quantos cupcakes sobraram (que não dá para repartir igual)?', tray < boxes.length, 'Continue repartindo: dê 1 a cada caixa até não dar mais.')}</div>;
  }
  if (v.type === 'pack') return <div className="gm-board"><div className="gm-tray"><b>Bandeja:</b> <Cup n={tray} size={18} /></div><div className="gm-packs">{Array.from({ length: packs }, (_, i) => <span key={i} className="gm-pack">🎁</span>)}</div>{tray > 0 ? <GoBtn disabled={locked} onClick={() => { setTray(tray - v.size); setPacks(packs + 1); }}>Embalar pacote de {v.size} 🎁</GoBtn> : null}{ask('Quantos pacotes você fez?', tray === 0, 'Embale tudo para contar os pacotes.')}</div>;
  return <div className="gm-board"><div className="gm-machine"><span className="m">🏭</span><b>{mins} min</b></div><div className="gm-tray"><Cup n={Math.min(mins * v.rate, 24)} size={18} />{mins * v.rate > 24 && <b> +{mins * v.rate - 24}</b>}</div>{mins < v.minutes ? <GoBtn disabled={locked} onClick={() => setMins(mins + 1)}>⏱ Ligar por mais 1 minuto (saem {v.rate})</GoBtn> : null}{ask(`A máquina fez ${v.rate} por minuto. Quantos cupcakes em ${v.minutes} minutos?`, mins >= v.minutes, `Ligue por ${v.minutes} minutos.`)}</div>;
}

/* ---------- Montagem de Frases ---------- */
function SentenceBoard({ round, locked, submit }: BoardProps<SentenceView>) {
  const tiles = round.view.tiles; const [placed, setPlaced] = useState<string[]>([]); const label = (id: string) => tiles.find((t) => t.id === id)!.label;
  return <div className="gm-board"><div className="gm-slots" aria-label="Frase em construção">{tiles.map((_, i) => <button key={i} className={`gm-slot ${placed[i] ? 'full' : ''}`} disabled={locked || !placed[i]} onClick={() => setPlaced(placed.filter((_, k) => k !== i))} aria-label={placed[i] ? `Posição ${i + 1}: ${label(placed[i]!)}. Toque para remover` : `Posição ${i + 1} vazia`}>{placed[i] ? label(placed[i]!) : i + 1}</button>)}</div>
    <div className="gm-words">{tiles.filter((t) => !placed.includes(t.id)).map((t) => <button key={t.id} disabled={locked} onClick={() => setPlaced([...placed, t.id])}>{t.label}</button>)}</div>
    <p className="gm-tip">{placed.length < tiles.length ? 'Toque nas palavras na ordem da frase.' : `"${placed.map(label).join(' ')}"`}</p><GoBtn disabled={locked || placed.length < tiles.length} onClick={() => submit({ order: placed })}>Ler a frase 📖</GoBtn></div>;
}

/* ---------- Detetive de Palavras ---------- */
function DetectiveBoard({ round, locked, submit }: BoardProps<DetectiveView>) {
  const v = round.view; const it = round.item as Extract<Item, { options: unknown }>; const [found, setFound] = useState(false); const [miss, setMiss] = useState<number | null>(null); const [pick, setPick] = useState<string>();
  return <div className="gm-board"><p className="gm-tip">🔍 Uma palavra da frase está escrita errada. Toque na suspeita!</p><div className="gm-words sentence">{v.words.map((w, i) => <button key={i} disabled={locked || found} className={`${found && i === v.bad ? 'bad' : ''} ${miss === i ? 'miss' : ''}`} onClick={() => { if (i === v.bad) { setFound(true); setMiss(null); } else setMiss(i); }}>{w}</button>)}</div>
    {miss !== null && !found && <p className="gm-tip">Essa está certa! Leia de novo com calma. 🕵️</p>}
    {found && <><h3>{it.statement}</h3><div className="gm-opts">{it.options.map((o) => <button key={o.id} disabled={locked} className={pick === o.id ? 'on' : ''} onClick={() => setPick(o.id)}>{o.text}</button>)}</div><GoBtn disabled={locked || !pick} onClick={() => submit({ choice: pick! })}>Resolver o caso ✔</GoBtn></>}</div>;
}

/* ---------- 11–17 anos: Finanças, Escape Room, Placar ---------- */
function PercentBar({ total, part }: { total: number; part: number }) {
  const w = (part / total) * 100;
  return <svg viewBox="0 0 320 64" className="gm-pbar" role="img" aria-label="Barra que representa o valor total; a parte destacada mostra a fração em questão"><rect x="10" y="14" width="300" height="26" rx="8" fill="#2a2d52" />{w > 0 && <rect x="10" y="14" width={(w / 100) * 300} height="26" rx="8" fill="#34d1c4" />}{Array.from({ length: 11 }, (_, i) => <g key={i}><path d={`M${10 + i * 30} 14v-4`} stroke="#8d93c9" strokeWidth="1.6" /><text x={10 + i * 30} y="58" textAnchor="middle" fontSize="10" fill="#aab0e0">{i * 10}%</text></g>)}</svg>;
}
function FinancasBoard({ round, locked, submit }: BoardProps<FinView>) {
  const v = round.view; const [txt, setTxt] = useState(''); const [aid, setAid] = useState(false);
  return <div className="gm-board gm-teen"><div className="gm-scenario"><span className="gm-chip">{({ price: 'Preço', budget: 'Orçamento', interest: 'Investimento', deal: 'Decisão' })[v.type]}</span><p>{v.text}</p></div>
    {v.aid && <button className="gm-link" onClick={() => setAid(!aid)} aria-pressed={aid}>{aid ? 'Esconder' : 'Mostrar'} a barra de 100%</button>}{aid && v.aid && <PercentBar total={v.aid.total} part={v.aid.part} />}
    <Keypad value={txt} onChange={setTxt} disabled={locked} max={4} /><GoBtn disabled={locked || !txt} onClick={() => submit({ text: txt })}>Confirmar</GoBtn></div>;
}
function EscapeBoard({ round, locked, submit }: BoardProps<EscapeView>) {
  const v = round.view; const [txt, setTxt] = useState('');
  return <div className="gm-board gm-teen"><div className="gm-rooms" aria-label={`Porta ${v.room} de ${v.rooms}`}>{Array.from({ length: v.rooms }, (_, k) => <span key={k} className={k + 1 < v.room ? 'open' : k + 1 === v.room ? 'now' : ''}>{k + 1 < v.room ? '🔓' : '🔒'}</span>)}</div>
    <div className="gm-scenario"><span className="gm-chip">Porta {v.room}</span><p>{v.story}</p><code className="gm-clue">{v.clue}</code></div>
    <Keypad value={txt} onChange={setTxt} disabled={locked} max={4} /><GoBtn disabled={locked || !txt} onClick={() => submit({ text: txt })}>Inserir senha 🔓</GoBtn></div>;
}
function Bars({ v }: { v: PlacarView }) {
  const max = Math.max(...v.data, 1), W = 360, H = 170, bw = Math.min(46, (W - 40) / v.data.length - 10); const c = CTX[v.ctx];
  return <svg viewBox={`0 0 ${W} ${H}`} className="gm-chart" role="img" aria-label={`Gráfico de barras de ${c.metric}: ${v.data.map((d, i) => `${v.labels[i] ?? i + 1}: ${d}`).join(', ')}`}>
    {[0, 0.5, 1].map((g) => <g key={g}><path d={`M30 ${H - 28 - g * (H - 56)}H${W - 6}`} stroke="#3a3f78" strokeWidth="1" strokeDasharray="3 4" /><text x="26" y={H - 24 - g * (H - 56)} textAnchor="end" fontSize="10" fill="#aab0e0">{Math.round(g * max)}</text></g>)}
    {v.data.map((d, i) => { const x = 40 + i * ((W - 50) / v.data.length) + 4, h = (d / max) * (H - 56); return <g key={i}><rect x={x} y={H - 28 - h} width={bw} height={h} rx="6" fill={['#34d1c4', '#ffb21e', '#ff6fb6', '#7aa7ff', '#9b6dff'][i % 5]} /><text x={x + bw / 2} y={H - 32 - h} textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{d}</text><text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="#aab0e0">{v.labels[i] ?? ''}</text></g>; })}</svg>;
}
function PlacarBoard({ round, locked, submit }: BoardProps<PlacarView>) {
  const v = round.view; const [txt, setTxt] = useState(''); const c = CTX[v.ctx];
  return <div className="gm-board gm-teen"><div className="gm-scenario"><span className="gm-chip">{c.metric} por {c.per}</span><p>{round.item.statement}</p></div><Bars v={v} /><Keypad value={txt} onChange={setTxt} disabled={locked} max={4} /><GoBtn disabled={locked || !txt} onClick={() => submit({ text: txt })}>Confirmar</GoBtn></div>;
}

/* ---------- Jogos áudio-primeiro (5–7): pergunta falada, figura grande, alternativas que se ouvem ao tocar ---------- */
function AudioBoard({ round, locked, submit }: BoardProps<{ kind: 'audio' }>) {
  const it = round.item as Extract<Item, { options: unknown }>; const [sel, setSel] = useState<string>(); const [claps, setClaps] = useState(0); const syl = it.skillId === 'pt.syllable';
  useEffect(() => { const t = setTimeout(() => speak(`${it.spoken ?? it.statement}`), 350); return () => { clearTimeout(t); stopSpeaking(); }; }, [it.id]);
  const text = (o: { text: string }) => o.text;
  return <div className="gm-board gm-audio"><p className="gm-ask">{it.statement}</p><SpeakBtn big text={it.spoken ?? it.statement} label="Ouvir de novo" />
    <ItemFigure figure={it.figure} />
    {syl && <button type="button" className="gm-drum" onClick={() => { setClaps(claps + 1); speak('pá', 1.4); }} aria-label={`Bater palmas nas sílabas. Palmas: ${claps}`}><svg width="28" height="28" viewBox="0 0 32 32" aria-hidden><ellipse cx="16" cy="10" rx="12" ry="5" fill="#fff" /><path d="M4 10v11c0 3 5 5 12 5s12-2 12-5V10c0 3-5 5-12 5S4 13 4 10z" fill="#ffd9c2" /><path d="M9 15l3 9M16 16v10M23 15l-3 9" stroke="#ff5e7a" strokeWidth="2" /><path d="M22 2l-6 8M10 2l6 8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /></svg> Bata palmas <output>{claps}</output></button>}
    <div className="gm-big" role="radiogroup" aria-label="Alternativas">{it.options.map((o, i) => <button key={o.id} type="button" role="radio" aria-checked={sel === o.id} disabled={locked} className={`gm-opt ${sel === o.id ? 'sel' : ''}`} onClick={() => { setSel(o.id); speak(text(o)); }}>{it.figure?.type === 'pattern' && parseTokenName(o.text) ? <><ShapeSvg shape={parseTokenName(o.text)!.shape} color={parseTokenName(o.text)!.color} size={64} /><small>{text(o)}</small></> : <span>{text(o)}</span>}<span className="ax-speak sm" aria-hidden><ISpeaker size={18} /></span><small className="sr-only">opção {i + 1}</small></button>)}</div>
    <GoBtn disabled={locked || !sel} onClick={() => sel && submit({ choice: sel })}>Pronto!</GoBtn></div>;
}

const BOARD: Record<string, (p: BoardProps<never>) => ReactNode> = { contagem: AudioBoard as never, sons: AudioBoard as never, formas: AudioBoard as never, pizzaria: PizzaBoard as never, mercado: MarketBoard as never, laboratorio: LabBoard as never, frases: SentenceBoard as never, detetive: DetectiveBoard as never, financas: FinancasBoard as never, escape: EscapeBoard as never, placar: PlacarBoard as never };

/* ---------- Página do jogo ---------- */
/** Recria a partida sempre que o jogo muda (evita estado preso do jogo anterior). */
export function GameRoute() { const { id = '' } = useParams(); return <GamePage key={id} />; }
function GamePage() {
  const { id = '' } = useParams(); const game = gameById(id); const { s } = useStudent(); const nav = useNavigate();
  const band = bandOf(s); const teen = band === 'desafiadores' || band === 'estrategistas'; const ctx = ctxOf(s.interests); const [seed, setSeed] = useState(() => (s.games?.[id]?.plays ?? 0) + 1); const rounds = useMemo(() => (game ? roundsFor(game.id, seed, ctx) : []), [game, seed, ctx]);
  const [i, setI] = useState(0); const [attempt, setAttempt] = useState(0); const [state, setState] = useState<{ ok: boolean; xp: number } | null>(null); const [recorded, setRecorded] = useState(false);
  const [first, setFirst] = useState<boolean[]>([]); const [hints, setHints] = useState(0); const [totalHints, setTotalHints] = useState(0); const [xp, setXp] = useState(0); const [done, setDone] = useState(false); const [stars, setStars] = useState(0);
  if (!game) return <div className="ax-page"><p>Jogo não encontrado.</p><Link to="/s/jogos">Voltar</Link></div>;
  const round = rounds[i]!; const Board = BOARD[game.id]!;
  const mood: MascotState = done ? 'comemorando' : state ? (state.ok ? 'comemorando' : 'incentivando') : hints > 0 ? 'dando_dicas' : 'aguardando';
  const say = done ? 'Que jogo incrível! Você é demais!' : state ? (state.ok ? 'Isso! Mandou muito bem!' : 'Quase! Errar faz parte. Vamos de novo?') : hints > 0 ? round.item.hints[Math.min(hints, round.item.hints.length) - 1]! : 'Estou aqui. Pense no seu ritmo!';
  const submit = (resp: Response) => {
    let ok: boolean; let gain = 0;
    if (!recorded) { const r = answerGame(s.id, round.item, resp, hints); ok = r.grade.correct; gain = r.xp; setRecorded(true); setFirst([...first, ok]); setTotalHints(totalHints + hints); setXp(xp + r.xp); }
    else ok = gradeLocal(round.item, resp); // nova tentativa após o erro: só pratica, não gera evidência
    setState({ ok, xp: gain });
  };
  const next = () => { if (i + 1 >= rounds.length) { const st = starsFor(first.filter(Boolean).length, rounds.length, totalHints); setStars(st); finishGame(s.id, game.id, st); setDone(true); } else { setI(i + 1); setAttempt(0); setState(null); setRecorded(false); setHints(0); } };
  const lab = labelFor(game, band);
  if (done) return <div className="ax-page gm-done" data-teen={teen || undefined}><Confetti n={teen ? 18 : 36} /><Axolotl state="comemorando" size={teen ? 96 : 170} cap={!teen} /><h1>{lab.name}: {teen ? 'partida concluída' : 'missão cumprida!'}</h1><div className="gm-stars" role="img" aria-label={`${stars} de 3 estrelas`}>{[1, 2, 3].map((n) => <span key={n} className={n <= stars ? 'on' : ''}>★</span>)}</div>
    <p>Você acertou de primeira <b>{first.filter(Boolean).length}</b> de {rounds.length} e ganhou <b>{xp} XP</b>. {teen ? 'O resultado atualiza o seu mapa de habilidades.' : 'Cada tentativa ajuda o Aprendix a conhecer o que você já sabe.'}</p><p className="ax-muted">{teen ? 'As estrelas consideram acertos de primeira e autonomia (sem dicas).' : 'Estrelas premiam o esforço: terminar já vale uma!'}</p>
    <div className="row" style={{ justifyContent: 'center' }}><Btn onClick={() => { setSeed(seed + 1); setI(0); setAttempt(0); setState(null); setRecorded(false); setFirst([]); setHints(0); setTotalHints(0); setXp(0); setDone(false); }}>Jogar de novo</Btn><Btn variant="ghost" onClick={() => nav('/s/jogos')}>Outros jogos</Btn><Btn variant="ghost" onClick={() => nav('/s/progress')}>Minha evolução</Btn></div></div>;
  return <div className="ax-page gm" data-teen={teen || undefined} style={{ ['--g1' as string]: game.from, ['--g2' as string]: game.to }}>
    <header className="gm-head"><Link to="/s/jogos" className="gm-back" aria-label="Voltar aos jogos">←</Link><span className="gm-headart" style={{ background: `linear-gradient(135deg,${game.from},${game.to})` }} aria-hidden><GameArt id={game.id} size={44} /></span><div><h1>{lab.name}</h1><p>{game.goal}</p></div></header>
    <div className="gm-progress" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={rounds.length} aria-label="Rodadas">{rounds.map((_, k) => <span key={k} className={k < i ? 'done' : k === i ? 'now' : ''} />)}</div>
    <div className={`gm-coach ${teen ? 'assistant' : ''}`}><Axolotl state={mood} size={teen ? 56 : 104} cap={!teen} animate={!teen} /><div className="gm-bubble" aria-live="polite">{say}</div></div>
    <section className="gm-stage" key={`${round.item.id}-${attempt}`}><Board round={round as never} locked={!!state?.ok || false} submit={submit} /></section>
    <div className="gm-actions">{!state && hints < round.item.hints.length && <button className="gm-link" onClick={() => setHints(hints + 1)}>💡 Preciso de uma dica {hints > 0 ? `(${hints}/${round.item.hints.length})` : ''}</button>}
      {state && !state.ok && <><button className="gm-go alt" onClick={() => { setAttempt(attempt + 1); setState(null); }}>Tentar de novo</button><span className="gm-why">Dica: {round.item.justification}</span></>}
      {state?.ok && <><Confetti n={22} /><button className="gm-go" onClick={next}>{i + 1 >= rounds.length ? 'Ver resultado ⭐' : 'Próxima rodada →'}</button>{state.xp > 0 && <span className="xp-pop">+{state.xp} XP</span>}</>}</div></div>;
}
import { gradeItem } from '@edu/learning';
const gradeLocal = (item: Item, resp: Response) => gradeItem(item, resp).correct;

/* ---------- Central de jogos ---------- */
export function GamesHub({ compact = false }: { compact?: boolean }) {
  const { s } = useStudent(); const nav = useNavigate(); const band = bandOf(s); const teen = band === 'desafiadores' || band === 'estrategistas'; const { main, base } = gamesForBand(band);
  const weak = Object.values(s.learner.hypotheses).filter((h) => h.status !== 'discarded').map((h) => h.skillId); const rec = weak.map((w) => gameForSkill(w, band)?.id).find(Boolean);
  const card = (g: (typeof main)[number]) => { const st = s.games?.[g.id]; const L = labelFor(g, band); return <article key={g.id} className="gm-card" style={{ ['--g1' as string]: g.from, ['--g2' as string]: g.to }}>
    {rec === g.id && <span className="gm-ribbon">Para você</span>}<div className="gm-art" aria-hidden><GameArt id={g.id} /></div><div className="gm-info"><b>{L.name}</b><small>{L.tagline}</small><span className="gm-tag">{g.subject}</span>
      <div className="gm-foot"><span className="gm-stars sm" role="img" aria-label={`${st?.bestStars ?? 0} de 3 estrelas`}>{[1, 2, 3].map((n) => <span key={n} className={n <= (st?.bestStars ?? 0) ? 'on' : ''}>★</span>)}</span><button onClick={() => nav(`/s/jogos/${g.id}`)}>Jogar ▶</button></div></div></article>; };
  const cls = `gm-hub ${compact ? 'compact' : ''} ${teen ? 'teen' : ''}`;
  return <div className="gm-sections"><div className={cls}>{main.map(card)}</div>{!compact && base.length > 0 && <><h2 className="gm-sub">Treino de base</h2><p className="ax-muted gm-subp">Revise o que o diagnóstico mostrar que precisa de reforço, com situações rápidas e diretas.</p><div className={cls}>{base.map(card)}</div></>}</div>;
}
export function GamesPage() { const { s } = useStudent(); const band = bandOf(s); const teen = band === 'desafiadores' || band === 'estrategistas';
  return <div className="ax-page"><div className="row">{!teen && <Axolotl state="apresentando" size={110} cap />}<div className="grow"><h1>{teen ? 'Jogos' : 'Minigames'}</h1><p className="ax-muted">{teen ? 'Desafios de raciocínio com dados e situações reais, nos temas que você curte. Sem cronômetro e sem perder vidas: o resultado alimenta o seu mapa de habilidades.' : 'Aprender brincando: cada jogo treina uma habilidade e ajuda a descobrir o que você já sabe. Sem tempo contado e sem perder vidas.'}</p></div></div><GamesHub /></div>; }
