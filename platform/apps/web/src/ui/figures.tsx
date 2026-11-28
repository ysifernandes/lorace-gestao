import { useState } from 'react';
import type { Figure } from '@edu/content-math';
import { tokenName } from '@edu/content-math';
import { ISpeaker } from './art';

/* ---------- voz do aparelho (Web Speech API). Não é áudio gravado: depende das vozes instaladas. ---------- */
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;
export function speak(text: string, rate = 0.85) { try { if (!canSpeak()) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'pt-BR'; u.rate = rate; speechSynthesis.speak(u); } catch { /* sem voz */ } }
export const stopSpeaking = () => { try { if (canSpeak()) speechSynthesis.cancel(); } catch { /* nada */ } };

export function SpeakBtn({ text, label = 'Ouvir', big = false, small = false }: { text: string; label?: string; big?: boolean; small?: boolean }) {
  if (!canSpeak()) return null;
  return <button type="button" className={`ax-speak ${big ? 'big' : ''} ${small ? 'sm' : ''}`} onClick={(e) => { e.stopPropagation(); speak(text); }} aria-label={`${label}: ${text}`}><ISpeaker size={small ? 20 : big ? 30 : 22} />{!small && <span> {label}</span>}</button>;
}

/* ---------- objetos para contar ---------- */
export function ObjIcon({ icon, size = 44 }: { icon: 'maca' | 'estrela' | 'bola' | 'peixe'; size?: number }) {
  const P = { width: size, height: size, viewBox: '0 0 48 48', 'aria-hidden': true } as const;
  if (icon === 'maca') return <svg {...P}><path d="M24 14c-5-4-15-2-15 11 0 9 6 18 12 18 2 0 2-1 3-1s1 1 3 1c6 0 12-9 12-18 0-13-10-15-15-11z" fill="#ef4757" /><path d="M24 14c0-5 2-8 5-10" stroke="#7a4a1d" strokeWidth="3" strokeLinecap="round" fill="none" /><path d="M26 11c3-5 9-4 10-3-1 5-6 7-10 3z" fill="#34b25a" /><path d="M14 22c0-4 2-6 5-7" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".55" /></svg>;
  if (icon === 'estrela') return <svg {...P}><path d="m24 4 5.6 12.2 13.4 1.6-9.9 9.2 2.7 13.2L24 33.5 12.2 40.2l2.7-13.2L5 17.8l13.4-1.6z" fill="#ffc933" stroke="#e59a00" strokeWidth="2.5" strokeLinejoin="round" /><path d="M16 17l4-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" /></svg>;
  if (icon === 'bola') return <svg {...P}><circle cx="24" cy="24" r="19" fill="#3b82f6" /><path d="M7 20c8 3 26 3 34 0M7 30c8-3 26-3 34 0" stroke="#fff" strokeWidth="3" fill="none" opacity=".85" /><circle cx="24" cy="24" r="19" fill="none" stroke="#1d4ed8" strokeWidth="2" /><path d="M14 12a14 14 0 0 1 8-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" /></svg>;
  return <svg {...P}><path d="M6 24c6-10 20-13 30-4l6-6v20l-6-6c-10 9-24 6-30-4z" fill="#ff8a3d" /><path d="M36 20l6-6v20l-6-6" fill="#f06a1a" /><circle cx="15" cy="21" r="2.8" fill="#271a5c" /><circle cx="14.2" cy="20.2" r="1" fill="#fff" /><path d="M22 14c3 4 3 16 0 20" stroke="#fff" strokeWidth="2.5" fill="none" opacity=".6" strokeLinecap="round" /></svg>;
}
export function CountFigure({ n, icon, interactive = true }: { n: number; icon: 'maca' | 'estrela' | 'bola' | 'peixe'; interactive?: boolean }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (i: number) => { const d = new Set(done); d.has(i) ? d.delete(i) : d.add(i); setDone(d); };
  return <div className="fg-count" data-n={n} role="group" aria-label="Objetos para contar (toque em cada um enquanto conta)">{Array.from({ length: n }, (_, i) =>
    <button key={i} type="button" className={`fg-obj ${done.has(i) ? 'done' : ''}`} onClick={() => interactive && toggle(i)} aria-pressed={done.has(i)} aria-label={`Objeto ${i + 1}`} style={{ animationDelay: `${(i % 7) * 0.08}s` }}><ObjIcon icon={icon} />{done.has(i) && <span className="fg-tick" aria-hidden>✓</span>}</button>)}
    {interactive && <span className="fg-hint" aria-live="polite">{done.size > 0 ? `Você tocou ${done.size}` : 'Toque em cada um para contar'}</span>}</div>;
}

/* ---------- formas e fichas ---------- */
const COLORS: Record<string, string> = { vermelho: '#e8475f', azul: '#3b82f6', verde: '#22a45d', amarelo: '#f5b50a' };
const DARK: Record<string, string> = { vermelho: '#b3283f', azul: '#1d4ed8', verde: '#146c3a', amarelo: '#b78100' };
export function ShapeSvg({ shape, color = 'azul', size = 96 }: { shape: string; color?: string; size?: number }) {
  const f = COLORS[color] ?? COLORS.azul!, k = DARK[color] ?? DARK.azul!;
  const P = { width: size, height: size, viewBox: '0 0 100 100', 'aria-hidden': true } as const; const common = { fill: f, stroke: k, strokeWidth: 5, strokeLinejoin: 'round' as const };
  if (shape === 'circulo') return <svg {...P}><circle cx="50" cy="50" r="38" {...common} /><path d="M26 38a28 28 0 0 1 16-14" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".55" /></svg>;
  if (shape === 'quadrado') return <svg {...P}><rect x="14" y="14" width="72" height="72" rx="8" {...common} /><path d="M24 30v-8h8" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".55" /></svg>;
  if (shape === 'retangulo') return <svg {...P}><rect x="6" y="26" width="88" height="48" rx="8" {...common} /><path d="M16 40v-6h8" stroke="#fff" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".55" /></svg>;
  if (shape === 'triangulo') return <svg {...P}><path d="M50 12 90 84H10z" {...common} /><path d="M40 40l-14 28" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".5" /></svg>;
  return <svg {...P}><path d="m50 8 11.8 25.6 28 3.4-20.7 19.3 5.6 27.7L50 70 25.3 84l5.6-27.7L10.2 37l28-3.4z" {...common} /></svg>;
}
export function ShapeFigure({ shape }: { shape: 'circulo' | 'quadrado' | 'triangulo' | 'retangulo' }) {
  return <div className="fg-shape" data-shape={shape} role="img" aria-label="Forma geométrica"><ShapeSvg shape={shape} color={shape === 'circulo' ? 'vermelho' : shape === 'quadrado' ? 'azul' : shape === 'triangulo' ? 'verde' : 'amarelo'} size={150} /></div>;
}
export function PatternFigure({ seq }: { seq: string[] }) {
  const alt = seq.map((t) => (t === '?' ? 'ficha que falta' : tokenName(t))).join(', ');
  return <div className="fg-pattern" data-seq={seq.join('|')} role="img" aria-label={`Sequência: ${alt}`}>{seq.map((t, i) => t === '?' ? <span key={i} className="fg-slot" aria-hidden>?</span> : <span key={i} className="fg-chip" aria-hidden><ShapeSvg shape={t.split(':')[0]!} color={t.split(':')[1]} size={58} /></span>)}</div>;
}
export function ItemFigure({ figure }: { figure?: Figure }) {
  if (!figure) return null;
  if (figure.type === 'count') return <CountFigure n={figure.n} icon={figure.icon} />;
  if (figure.type === 'shape') return <ShapeFigure shape={figure.shape} />;
  if (figure.type === 'pattern') return <PatternFigure seq={figure.seq} />;
  return null;
}
/** Texto lido em voz alta: enunciado (ou `spoken`) + alternativas. */
export const speechOf = (item: { statement: string; spoken?: string; context?: string; options?: { text: string }[] }) =>
  `${item.context ? item.context + '. ' : ''}${item.spoken ?? item.statement}${item.options ? '. ' + item.options.map((o, i) => `opção ${i + 1}: ${o.text}`).join('. ') : ''}`;

/** Faz o caminho inverso de tokenName ("estrela verde" → forma + cor) para desenhar as alternativas de padrões. */
export function parseTokenName(name: string): { shape: string; color: string } | null {
  const SH: Record<string, string> = { 'círculo': 'circulo', quadrado: 'quadrado', 'triângulo': 'triangulo', estrela: 'estrela' }; const CO: Record<string, string> = { vermelho: 'vermelho', vermelha: 'vermelho', azul: 'azul', verde: 'verde', amarelo: 'amarelo', amarela: 'amarelo' };
  const [a, b] = name.split(' '); return a && b && SH[a] && CO[b] ? { shape: SH[a]!, color: CO[b]! } : null;
}
