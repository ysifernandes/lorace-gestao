import { useEffect, useState, type ReactNode, Component } from 'react';
import { brand, logoSvg } from '@edu/brand';
import type { MasteryState } from '@edu/types';

export const Card = ({ children, className = '', ...r }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => <div className={`card ${className}`} {...r}>{children}</div>;
export const Badge = ({ tone = '', children }: { tone?: 'ok' | 'warn' | 'bad' | 'info' | 'draft' | ''; children: ReactNode }) => <span className={`badge ${tone ? 'b-' + tone : ''}`}>{children}</span>;
export function Btn({ variant = '', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) { return <button {...p} className={`btn ${variant} ${p.className ?? ''}`} />; }
export const Progress = ({ value, label }: { value: number; label?: string }) => <div role="progressbar" aria-valuenow={Math.round(value * 100)} aria-label={label} className="bar"><i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>;
export const Logo = ({ size = 36 }: { size?: number }) => <span aria-hidden dangerouslySetInnerHTML={{ __html: logoSvg(size) }} />;
export const BrandName = () => <>{brand.name}</>;
export const Notice = ({ tone = '', children }: { tone?: 'info' | 'bad' | ''; children: ReactNode }) => <div className={`notice ${tone}`} role="note">{children}</div>;
export const Skeleton = ({ n = 3 }: { n?: number }) => <div className="col" aria-busy="true">{Array.from({ length: n }, (_, i) => <div key={i} className="skeleton" style={{ width: `${90 - i * 15}%` }} />)}</div>;

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (t: T) => void }) {
  return <div className="tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={k === value} className={k === value ? 'on' : ''} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  return <div className="modal-bg" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}><div className="row"><h2 className="grow">{title}</h2><Btn variant="ghost sm" onClick={onClose} aria-label="Fechar">✕</Btn></div>{children}</div></div>;
}
let toastSet: ((m: string) => void) | null = null;
export const toast = (m: string) => toastSet?.(m);
export function Toaster() { const [m, setM] = useState(''); useEffect(() => { toastSet = (x) => { setM(x); setTimeout(() => setM(''), 2600); }; return () => { toastSet = null; }; }, []); return m ? <div className="toast" role="status">{m}</div> : null; }
export class ErrorBoundary extends Component<{ children: ReactNode }, { err?: Error }> {
  override state: { err?: Error } = {};
  static getDerivedStateFromError(err: Error) { return { err }; }
  override render() { return this.state.err ? <Card><h2>Algo deu errado</h2><p className="muted">{this.state.err.message}</p><Btn onClick={() => location.reload()}>Recarregar</Btn></Card> : this.props.children; }
}

// ---- domínio → apresentação (linguagem positiva, sem rótulos depreciativos) ----
export const STATE_LABEL: Record<MasteryState, { adult: string; kid: string; cls: string; icon: string }> = {
  consolidated: { adult: 'Consolidado', kid: 'Já domino!', cls: 's-cons', icon: '★' },
  developing: { adult: 'Em desenvolvimento', kid: 'Estou aprendendo', cls: 's-dev', icon: '◐' },
  needs_support: { adult: 'Precisa de apoio', kid: 'Vamos treinar juntos', cls: 's-need', icon: '●' },
  insufficient_evidence: { adult: 'Evidências insuficientes', kid: 'Ainda vou descobrir', cls: 's-none', icon: '?' },
};
export const StateBadge = ({ s, kid }: { s: MasteryState; kid?: boolean }) => { const l = STATE_LABEL[s]; return <span className={`badge ${l.cls}`}>{l.icon} {kid ? l.kid : l.adult}</span>; };
export const ConfBadge = ({ c }: { c: 'baixa' | 'média' | 'alta' }) => <Badge tone={c === 'alta' ? 'ok' : c === 'média' ? 'info' : 'warn'}>confiança {c}</Badge>;

// ---- mascote (SVG) ----
export function Mascot({ mood = 'happy', size = 96, color = 'var(--primary)' }: { mood?: 'happy' | 'think' | 'cheer'; size?: number; color?: string }) {
  return <svg className="mascot" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Mascote">
    <ellipse cx="50" cy="92" rx="26" ry="5" fill="#0002" /><path d="M20 62c0-24 13-42 30-42s30 18 30 42c0 14-13 24-30 24S20 76 20 62z" fill={color} />
    <path d="M32 24 24 8l16 8M68 24l8-16-16 8" fill={color} />
    <circle cx="39" cy="54" r="9" fill="#fff" /><circle cx="61" cy="54" r="9" fill="#fff" /><circle cx={mood === 'think' ? 42 : 40} cy="55" r="4.5" fill="#1d1640" /><circle cx={mood === 'think' ? 64 : 62} cy="55" r="4.5" fill="#1d1640" />
    <path d={mood === 'cheer' ? 'M38 70q12 14 24 0z' : mood === 'think' ? 'M42 72h16' : 'M38 68q12 10 24 0'} fill={mood === 'cheer' ? '#fff' : 'none'} stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>;
}
export const Avatar = ({ name, color, face, size = 48 }: { name: string; color: string; face?: string; size?: number }) => <span aria-label={`Avatar de ${name}`} style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-grid', placeItems: 'center', fontSize: size * 0.5, color: '#fff', fontWeight: 800 }}>{face ?? name[0]}</span>;

// ---- gráficos ----
export function Ring({ value, size = 84, label }: { value: number; size?: number; label?: string }) {
  const r = size / 2 - 8, c = 2 * Math.PI * r; return <svg width={size} height={size} role="img" aria-label={label ?? `${Math.round(value * 100)}%`}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="9" /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--primary)" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .8s' }} /><text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" fontWeight="800" fill="currentColor">{label ?? `${Math.round(value * 100)}%`}</text></svg>;
}
export function LineChart({ series, w = 420, h = 150 }: { series: { name: string; color: string; points: { x: string; y: number }[] }[]; w?: number; h?: number }) {
  const xs = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))]; if (xs.length < 2) return <p className="muted sm">São necessárias ao menos duas medições (ex.: diagnóstico e reavaliação) para mostrar evolução.</p>;
  const X = (x: string) => 30 + (xs.indexOf(x) / (xs.length - 1)) * (w - 50), Y = (y: number) => h - 24 - y * (h - 40);
  return <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Gráfico de evolução do domínio estimado">{[0, 0.5, 1].map((g) => <g key={g}><line x1="30" x2={w - 20} y1={Y(g)} y2={Y(g)} stroke="var(--line)" /><text x="2" y={Y(g) + 4} fontSize="10" fill="var(--muted)">{Math.round(g * 100)}%</text></g>)}
    {xs.map((x) => <text key={x} x={X(x)} y={h - 6} fontSize="9" textAnchor="middle" fill="var(--muted)">{x}</text>)}
    {series.map((s) => <g key={s.name}><polyline fill="none" stroke={s.color} strokeWidth="3" strokeLinejoin="round" points={s.points.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} />{s.points.map((p) => <circle key={p.x} cx={X(p.x)} cy={Y(p.y)} r="4.5" fill={s.color}><title>{s.name}: {Math.round(p.y * 100)}% em {p.x}</title></circle>)}</g>)}</svg>;
}
export const useNow = (ms = 1000) => { const [n, setN] = useState(Date.now()); useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]); return n; };
