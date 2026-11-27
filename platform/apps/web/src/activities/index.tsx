import { useMemo, useState } from 'react';
import type { Item } from '@edu/content-math';
import type { Response, Grade } from '@edu/learning';
import { Btn, Badge, Mascot } from '../ui';

export function FractionBar({ num, den, onToggle, shaded }: { num?: number; den: number; onToggle?: (i: number) => void; shaded?: Set<number> }) {
  return <div className="row" style={{ gap: 0 }} role="img" aria-label={num !== undefined ? `Barra com ${num} de ${den} partes pintadas` : `Barra com ${den} partes`}>
    {Array.from({ length: den }, (_, i) => { const on = shaded ? shaded.has(i) : i < (num ?? 0); return <button key={i} type="button" disabled={!onToggle} aria-pressed={on} aria-label={`Parte ${i + 1}`} className={`frac-seg ${on ? 'on' : ''}`} onClick={() => onToggle?.(i)} style={{ cursor: onToggle ? 'pointer' : 'default' }} />; })}</div>;
}

type P<T extends Item['kind']> = { item: Extract<Item, { kind: T }>; disabled: boolean; onChange: (r: Response | null) => void };

function MC({ item, disabled, onChange, revealed }: { item: Extract<Item, { options: unknown }>; disabled: boolean; onChange: (r: Response | null) => void; revealed?: string }) {
  const [sel, setSel] = useState<string>();
  return <div className="col" role="radiogroup" aria-label="Alternativas">{item.options.map((o, i) => <button key={o.id} role="radio" aria-checked={sel === o.id} disabled={disabled} className={`opt ${sel === o.id ? 'sel' : ''} ${revealed && o.id === item.correct ? 'right' : ''} ${revealed && sel === o.id && o.id !== item.correct ? 'wrong' : ''}`} onClick={() => { setSel(o.id); onChange({ choice: o.id }); }}><b>{String.fromCharCode(65 + i)}</b> {o.text}</button>)}</div>;
}
function Fill({ item, disabled, onChange }: P<'fill_in'>) { return <div><label htmlFor="fi">Sua resposta {item.inputHint ? `(${item.inputHint})` : ''}</label><input id="fi" inputMode="decimal" autoComplete="off" disabled={disabled} onChange={(e) => onChange(e.target.value.trim() ? { text: e.target.value } : null)} /></div>; }
function Ordering({ item, disabled, onChange }: P<'ordering'>) {
  const [order, setOrder] = useState(() => { const ids = item.entries.map((e) => e.id); return [...ids.slice(1), ids[0]!].reverse(); });
  const label = (id: string) => item.entries.find((e) => e.id === id)!.label;
  const move = (i: number, d: number) => { const o = [...order]; [o[i], o[i + d]] = [o[i + d]!, o[i]!]; setOrder(o); onChange({ order: o }); };
  useMemo(() => onChange({ order }), []); // resposta inicial = arranjo exibido
  return <ol className="col" style={{ listStyle: 'none', padding: 0 }}>{order.map((id, i) => <li key={id} className="row"><span className="chip" style={{ cursor: 'default' }}>{i + 1}. {label(id)}</span><Btn type="button" variant="ghost sm" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Mover ${label(id)} para cima`}>↑</Btn><Btn type="button" variant="ghost sm" disabled={disabled || i === order.length - 1} onClick={() => move(i, 1)} aria-label={`Mover ${label(id)} para baixo`}>↓</Btn></li>)}</ol>;
}
function Matching({ item, disabled, onChange }: P<'matching'>) {
  const [pairs, setPairs] = useState<[string, string][]>([]); const [l, setL] = useState<string>();
  const set = (p: [string, string][]) => { setPairs(p); onChange(p.length ? { pairs: p } : null); };
  const pick = (r: string) => { if (!l) return; set([...pairs.filter((x) => x[0] !== l && x[1] !== r), [l, r]]); setL(undefined); };
  const col = (id: string) => { const i = pairs.findIndex((p) => p[0] === id || p[1] === id); return i < 0 ? undefined : ['#6d3df2', '#2f7bff', '#ffb020', '#16a679'][i % 4]; };
  return <div className="grid g2"><div className="col"><b className="muted sm">1. Escolha à esquerda</b>{item.left.map((x) => <button key={x.id} type="button" disabled={disabled} className={`opt ${l === x.id ? 'sel' : ''}`} style={{ borderColor: col(x.id) }} onClick={() => setL(x.id)}>{x.label}</button>)}</div>
    <div className="col"><b className="muted sm">2. Ligue à direita</b>{item.right.map((x) => <button key={x.id} type="button" disabled={disabled || !l} className="opt" style={{ borderColor: col(x.id) }} onClick={() => pick(x.id)}>{x.label}</button>)}</div>
    {pairs.length > 0 && !disabled && <Btn type="button" variant="ghost sm" onClick={() => set([])}>Desfazer ligações</Btn>}</div>;
}
function DragDrop({ item, disabled, onChange }: P<'drag_drop'>) {
  const [pl, setPl] = useState<Record<string, string>>({}); const [sel, setSel] = useState<string>(); const [over, setOver] = useState<string>();
  const put = (t: string, z: string) => { const n = { ...pl, [t]: z }; setPl(n); setSel(undefined); onChange(Object.keys(n).length === item.tokens.length ? { placement: n } : null); };
  const chip = (id: string) => <span key={id} draggable={!disabled} onDragStart={(e) => e.dataTransfer.setData('text/plain', id)} role="button" tabIndex={0} className={`chip ${sel === id ? 'sel' : ''}`} onClick={() => setSel(id)} onKeyDown={(e) => e.key === 'Enter' && setSel(id)}>{item.tokens.find((t) => t.id === id)!.label}</span>;
  return <div className="col"><p className="muted sm">Arraste (ou toque num item e depois no grupo).</p><div className="row">{item.tokens.filter((t) => !pl[t.id]).map((t) => chip(t.id))}</div>
    <div className="grid g3">{item.zones.map((z) => <div key={z.id} className={`zone ${over === z.id ? 'over' : ''}`} onDragOver={(e) => { e.preventDefault(); setOver(z.id); }} onDragLeave={() => setOver(undefined)} onDrop={(e) => { e.preventDefault(); setOver(undefined); if (!disabled) put(e.dataTransfer.getData('text/plain'), z.id); }} onClick={() => sel && !disabled && put(sel, z.id)}><b className="sm">{z.label}</b>{item.tokens.filter((t) => pl[t.id] === z.id).map((t) => chip(t.id))}</div>)}</div></div>;
}
function FracVisual({ item, disabled, onChange }: P<'fraction_visual'>) {
  const [s, setS] = useState<Set<number>>(new Set());
  const tg = (i: number) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); setS(n); onChange({ shaded: n.size }); };
  return <div className="col"><FractionBar den={item.den} shaded={s} onToggle={disabled ? undefined : tg} /><p className="muted sm">Partes pintadas: {s.size} de {item.den}</p></div>;
}
function Sim({ item, disabled, onChange }: P<'simulation'>) {
  const [view, setView] = useState(item.den); const [n, setN] = useState('');
  return <div className="col"><div className="sim"><b>Simulador (atividade interativa)</b><p className="sm">Veja 1/2 em partes diferentes e perceba que o tamanho pintado é o mesmo.</p>
    <div className="row">{[2, 4, 6].map((d) => <Btn key={d} type="button" variant={view === d ? '' : 'ghost sm'} onClick={() => setView(d)}>{d} partes</Btn>)}</div>
    <FractionBar den={view} num={view / 2} /><p className="sm">{view / 2}/{view} = 1/2</p></div>
    <label htmlFor="sm">1/2 = ?/{item.targetDen}</label><input id="sm" inputMode="numeric" disabled={disabled} value={n} onChange={(e) => { setN(e.target.value); onChange(e.target.value ? { num: Number(e.target.value) } : null); }} /></div>;
}

export interface Feedback { grade: Grade; xp: number; minutes: number }
/** Reprodutor genérico de atividades. Registra dicas usadas; o motor decide a evidência. */
export function ActivityPlayer({ item, onSubmit, hints = true, showResult = true, kid = false, draftNotice = true, onNext, nextLabel = 'Próxima' }: { onNext?: () => void; nextLabel?: string; item: Item; onSubmit: (r: Response, hintsUsed: number) => Feedback; hints?: boolean; showResult?: boolean; kid?: boolean; draftNotice?: boolean }) {
  const [resp, setResp] = useState<Response | null>(null); const [h, setH] = useState(0); const [fb, setFb] = useState<Feedback>();
  const dis = !!fb; const common = { disabled: dis, onChange: setResp };
  const submit = () => { if (resp) setFb(onSubmit(resp, h)); };
  return <div className="col">
    {item.context && <div className="card flat" style={{ background: 'var(--line)' }}>📖 {item.context}</div>}
    <h2>{item.statement}</h2>
    {item.figure?.type === 'fraction-bar' && <FractionBar num={item.figure.num} den={item.figure.den} />}
    {(item.kind === 'multiple_choice' || item.kind === 'word_problem' || item.kind === 'reasoning') && <MC item={item} disabled={dis} onChange={setResp} revealed={fb && showResult ? item.correct : undefined} />}
    {item.kind === 'fill_in' && <Fill item={item} {...common} />}{item.kind === 'ordering' && <Ordering item={item} {...common} />}{item.kind === 'matching' && <Matching item={item} {...common} />}
    {item.kind === 'drag_drop' && <DragDrop item={item} {...common} />}{item.kind === 'fraction_visual' && <FracVisual item={item} {...common} />}{item.kind === 'simulation' && <Sim item={item} {...common} />}
    {hints && !dis && <div className="col">{item.hints.slice(0, h).map((t, i) => <div key={i} className="notice info" role="note">💡 Dica {i + 1}: {t}</div>)}{h < item.hints.length && <Btn variant="ghost sm" type="button" onClick={() => setH(h + 1)}>Preciso de uma dica {h > 0 ? `(${h}/${item.hints.length})` : ''}</Btn>}</div>}
    {!fb && <Btn onClick={submit} disabled={!resp}>{kid ? 'Pronto!' : 'Responder'}</Btn>}
    {fb && <div className="card flat" role="status" style={{ borderColor: fb.grade.correct ? 'var(--ok)' : 'var(--warn)' }}><div className="row"><Mascot size={56} mood={fb.grade.correct ? 'cheer' : 'think'} />
      <div className="grow">{showResult ? <><b>{fb.grade.correct ? 'Muito bem! 🎉' : fb.grade.score > 0 ? 'Quase lá! Você acertou uma parte.' : 'Ainda não foi dessa vez — errar faz parte de aprender.'}</b>{!fb.grade.correct && <p className="sm">{item.justification}</p>}</> : <b>Resposta registrada. Continue!</b>}
        <p className="sm muted">{fb.xp > 0 && <span className="xp-pop">+{fb.xp} XP </span>}{fb.minutes > 0 && <span>· +{fb.minutes} min de lazer</span>}{h > 0 && <span> · {h} dica(s) usada(s)</span>}</p></div></div></div>}
    {fb && onNext && <Btn onClick={onNext}>{nextLabel}</Btn>}
    {draftNotice && item.review.status !== 'approved' && <Badge tone="draft">Conteúdo em revisão (protótipo — ainda sem revisão profissional)</Badge>}
  </div>;
}
export const hasFeedback = (fb?: Feedback) => !!fb;
