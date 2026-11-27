// Ilustrações e ícones da identidade visual (SVG próprio, sem dependências). Ícones de navegação: contorno (currentColor); ícones "ilustrados": preenchidos com gradiente.
import type { ReactNode } from 'react';
import { brand, logoSvg } from '@edu/brand';

type IP = { size?: number; className?: string };
const S = ({ size = 24, className = '', children, vb = 24, label }: IP & { children: ReactNode; vb?: number; label?: string }) =>
  <svg className={className} width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>{children}</svg>;

export const Wordmark = ({ size = 40, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) =>
  <span className={`ax-wordmark ${tone}`} style={{ ['--wm' as string]: `${size}px` }}><span aria-hidden dangerouslySetInnerHTML={{ __html: logoSvg(size * 1.15) }} /><span className="wm-text">{brand.name}<svg className="wm-swoosh" viewBox="0 0 120 12" aria-hidden><path d="M2 8C30 2 70 1 118 6" stroke={brand.colors.accent} strokeWidth="4" strokeLinecap="round" fill="none" /></svg></span></span>;

// ---- navegação (contorno) ----
export const IHome = (p: IP) => <S {...p}><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="currentColor" fillOpacity=".15" /></S>;
export const IStudy = (p: IP) => <S {...p}><path d="M12 6c-2-1.6-5-2-9-1.5V18c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V4.5C17 4 14 4.4 12 6zM12 6v13.5" /></S>;
export const IMission = (p: IP) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><path d="M12 12 19.5 4.5M16 4h4v4" /></S>;
export const IEvolution = (p: IP) => <S {...p}><rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></S>;
export const ITrophy = (p: IP) => <S {...p}><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a4 4 0 0 0 4 4M17 6h3v1a4 4 0 0 1-4 4M12 14v4M8 21h8M9 18h6" /></S>;
export const ILibrary = (p: IP) => <S {...p}><rect x="3" y="4" width="4" height="16" rx="1" /><rect x="9" y="4" width="4" height="16" rx="1" /><path d="m15.5 5.5 3.7-1 3 14.5-3.7 1z" /></S>;
export const ITutor = (p: IP) => <S {...p}><rect x="4" y="8" width="16" height="12" rx="4" /><path d="M12 8V4M9.5 4h5" /><circle cx="9" cy="14" r="1.5" fill="currentColor" /><circle cx="15" cy="14" r="1.5" fill="currentColor" /><path d="M2 13v3M22 13v3" /></S>;
export const IFamily = (p: IP) => <S {...p}><circle cx="9" cy="8" r="3.2" /><circle cx="17" cy="9.5" r="2.4" /><path d="M3 20c0-3.6 2.7-6 6-6s6 2.4 6 6M15 14.5c3 0 6 1.7 6 5" /></S>;
export const IBell = (p: IP) => <S {...p}><path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0" /></S>;
export const IGear = (p: IP) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></S>;
export const ICheck = (p: IP) => <S {...p}><path d="m5 12.5 4.5 4.5L19 7" strokeWidth="3" /></S>;
export const ILock = (p: IP) => <S {...p}><rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor" fillOpacity=".2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></S>;
export const IChevron = ({ dir = 'down', ...p }: IP & { dir?: 'down' | 'right' | 'left' }) => <S {...p}><path d={dir === 'down' ? 'm6 9 6 6 6-6' : dir === 'right' ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} strokeWidth="2.6" /></S>;
export const IArrow = (p: IP) => <S {...p}><path d="M5 12h14M13 6l6 6-6 6" strokeWidth="2.6" /></S>;
export const IPlay = (p: IP) => <S {...p}><path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" /></S>;
export const ISpeaker = (p: IP) => <S {...p}><path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></S>;
export const IStar = ({ size = 24, className = '' }: IP) => <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden><defs><linearGradient id="gStar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe27a" /><stop offset="1" stopColor="#ffb21e" /></linearGradient></defs><path d="m16 2.5 4.1 8.6 9.4 1.2-6.9 6.5 1.8 9.3L16 23.4 7.6 28.1l1.8-9.3L2.5 12.3l9.4-1.2z" fill="url(#gStar)" stroke="#e59a00" strokeWidth="1.6" strokeLinejoin="round" /></svg>;
export const IPhone = ({ size = 28 }: IP) => <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden><rect x="7" y="2" width="14" height="24" rx="3.5" fill="#1e7f86" /><rect x="9" y="5" width="10" height="16" rx="1.6" fill="#bff1ea" /><circle cx="14" cy="23.4" r="1.1" fill="#bff1ea" /></svg>;

// ---- ilustrados ----
const Grad = ({ id, a, b }: { id: string; a: string; b: string }) => <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>;
export const ArtBook = ({ size = 52 }: IP) => <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden><Grad id="gbk" a="#ff7a86" b="#e23f56" /><circle cx="28" cy="28" r="26" fill="url(#gbk)" /><path d="M10 19c7-2 13-1 18 3 5-4 11-5 18-3v20c-7-2-13-1-18 3-5-4-11-5-18-3z" fill="#fff" /><path d="M28 22v20" stroke="#e23f56" strokeWidth="2.4" /><path d="M14 25c5-1 9 0 12 2M14 31c5-1 9 0 12 2M42 25c-5-1-9 0-12 2M42 31c-5-1-9 0-12 2" stroke="#f3a0aa" strokeWidth="2" strokeLinecap="round" /></svg>;
export const ArtCalc = ({ size = 52 }: IP) => <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden><Grad id="gcl" a="#5aa2ff" b="#2f68e0" /><circle cx="28" cy="28" r="26" fill="url(#gcl)" /><rect x="15" y="10" width="26" height="36" rx="5" fill="#fff" /><rect x="19" y="14" width="18" height="8" rx="2.5" fill="#b9d6ff" />{[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={21 + c * 7} cy={28 + r * 6.5} r="2.2" fill={r === 2 && c === 2 ? '#ffb21e' : '#3b7bf0'} />))}</svg>;
export const ArtFlask = ({ size = 52 }: IP) => <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden><Grad id="gfl" a="#58d27a" b="#26a04a" /><circle cx="28" cy="28" r="26" fill="url(#gfl)" /><path d="M22 10h12M24 10v12L14 40a4 4 0 0 0 3.5 6h21a4 4 0 0 0 3.5-6L32 22V10" fill="#fff" stroke="#fff" strokeWidth="2" strokeLinejoin="round" /><path d="M18 38h20l3.5 6.5a2 2 0 0 1-1.7 3H16.2a2 2 0 0 1-1.7-3z" fill="#7be08f" /><circle cx="26" cy="32" r="2" fill="#26a04a" /><circle cx="32" cy="36" r="2.6" fill="#26a04a" /></svg>;
export const ArtMuseum = ({ size = 52 }: IP) => <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden><Grad id="gmu" a="#ffb64d" b="#ef8a14" /><circle cx="28" cy="28" r="26" fill="url(#gmu)" /><path d="M10 22 28 11l18 11z" fill="#fff" /><rect x="11" y="23" width="34" height="3.5" fill="#fff" />{[15, 22.5, 30, 37.5].map((x) => <rect key={x} x={x} y="28" width="4.5" height="13" rx="1" fill="#fff" />)}<rect x="9" y="42" width="38" height="4.5" rx="1.5" fill="#fff" /></svg>;
export const ArtVideo = ({ size = 30 }: IP) => <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden><rect x="2" y="5" width="28" height="22" rx="6" fill="#3b82f6" /><path d="M13 11v10l9-5z" fill="#fff" /></svg>;
export const ArtGame = ({ size = 30 }: IP) => <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden><rect x="2" y="7" width="28" height="19" rx="9.5" fill="#6a3fd8" /><path d="M9 13v6M6 16h6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /><circle cx="21" cy="14.5" r="1.8" fill="#ffc93c" /><circle cx="24.5" cy="18" r="1.8" fill="#4ee1c2" /></svg>;
export const ArtTarget = ({ size = 30 }: IP) => <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden><circle cx="16" cy="16" r="13" fill="#e8475f" /><circle cx="16" cy="16" r="9" fill="#fff" /><circle cx="16" cy="16" r="5.4" fill="#e8475f" /><circle cx="16" cy="16" r="2" fill="#fff" /><path d="m16 16 11-11M23 4.5l.6 4.4 4.4.6" stroke="#ffc93c" strokeWidth="2.4" strokeLinecap="round" fill="none" /></svg>;
export const ArtCompass = ({ size = 30 }: IP) => <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden><circle cx="16" cy="16" r="13" fill="#4d82f0" /><circle cx="16" cy="16" r="9.5" fill="#fff" /><path d="m21 11-3 7-7 3 3-7z" fill="#ffc93c" /><circle cx="16" cy="16" r="1.5" fill="#271a5c" /></svg>;
export const ArtPeople = ({ size = 44 }: IP) => <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden><circle cx="17" cy="16" r="7" fill="#ffd3b0" /><path d="M8 17c0-7 5-10 10-10 4 0 8 2 9 7-4-1-9-1-12-3-2 3-4 4-7 6z" fill="#7a4a2a" /><circle cx="33" cy="20" r="6" fill="#ffc9a3" /><path d="M27 20c0-5 3-8 7-8s6 3 6 8c-3-1-6-2-9-4-1 2-2 3-4 4z" fill="#3a2a22" /><path d="M5 42c0-8 5-12 12-12s12 4 12 12z" fill="#4d82f0" /><path d="M26 44c0-6 3-9 8-9s9 3 9 9z" fill="#ff7aa8" /></svg>;
export const ArtRobot = ({ size = 30 }: IP) => <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden><rect x="5" y="10" width="22" height="16" rx="6" fill="#9b6dff" /><path d="M16 10V5" stroke="#9b6dff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="16" cy="4.5" r="2.4" fill="#ffc93c" /><circle cx="11.5" cy="17.5" r="3" fill="#fff" /><circle cx="20.5" cy="17.5" r="3" fill="#fff" /><circle cx="11.5" cy="17.8" r="1.4" fill="#271a5c" /><circle cx="20.5" cy="17.8" r="1.4" fill="#271a5c" /><path d="M12 22.5q4 2.5 8 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" /></svg>;

// ---- medalhas hexagonais ----
export type MedalKind = 'first' | 'study' | 'focus' | 'grow' | 'hint' | 'again';
export function Medal({ kind, locked = false, size = 74 }: { kind: MedalKind; locked?: boolean; size?: number }) {
  const hex = 'M32 3 57 17.5v29L32 61 7 46.5v-29z';
  const inner: Record<MedalKind, ReactNode> = {
    first: <><path d="M16 22c5-1.5 9-1 12 2 3-3 7-3.5 12-2v16c-5-1.5-9-1-12 2-3-3-7-3.5-12-2z" fill="#fff" stroke="#3b6fe0" strokeWidth="2" /><path d="M28 24v16" stroke="#3b6fe0" strokeWidth="2" /></>,
    study: <><path d="M14 24c6-2 11-1 14 2 3-3 8-4 14-2v17c-6-2-11-1-14 2-3-3-8-4-14-2z" fill="#fff" stroke="#3b6fe0" strokeWidth="2" /><path d="M28 26v17" stroke="#3b6fe0" strokeWidth="2" /><path d="M23 8l1.6 3.4 3.7.5-2.7 2.6.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.6 3.7-.5z" fill="#ffc93c" transform="translate(9 -2)" /></>,
    focus: <><circle cx="32" cy="32" r="14" fill="#e8475f" /><circle cx="32" cy="32" r="9.5" fill="#fff" /><circle cx="32" cy="32" r="5.5" fill="#e8475f" /><path d="m32 32 12-12M41 18.5l.8 5 5 .8" stroke="#ffc93c" strokeWidth="3" strokeLinecap="round" fill="none" /></>,
    grow: <path d="m32 15 4.9 10.3 11.3 1.5-8.3 7.8 2.2 11.2L32 40l-10.1 5.8 2.2-11.2-8.3-7.8 11.3-1.5z" fill="#ffd34d" stroke="#e59a00" strokeWidth="2" strokeLinejoin="round" />,
    hint: <><circle cx="32" cy="28" r="10" fill="#ffd34d" stroke="#e59a00" strokeWidth="2" /><rect x="27" y="38" width="10" height="6" rx="2" fill="#c98f00" /><path d="M32 12v-3M18 20l-3-2M46 20l3-2" stroke="#e59a00" strokeWidth="2.5" strokeLinecap="round" /></>,
    again: <><path d="M20 30a12 12 0 0 1 21-8l3-3v10H34l3.5-3.5A7 7 0 0 0 25 30z" fill="#fff" /><path d="M44 34a12 12 0 0 1-21 8l-3 3V35h10l-3.5 3.5A7 7 0 0 0 39 34z" fill="#fff" /></>,
  };
  const id = `gm${kind}${locked ? 'L' : ''}`;
  return <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={locked ? 'medal locked' : 'medal'}><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={locked ? '#d9d6ea' : '#ffe08a'} /><stop offset="1" stopColor={locked ? '#b9b5d3' : '#f5a623'} /></linearGradient><linearGradient id={`${id}i`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={locked ? '#cfcbe4' : '#6aa8ff'} /><stop offset="1" stopColor={locked ? '#a9a5c8' : '#3b6fe0'} /></linearGradient></defs>
    <path d={hex} fill={`url(#${id})`} stroke={locked ? '#a29dc4' : '#d98a00'} strokeWidth="2" strokeLinejoin="round" /><path d="M32 9 52 20v24L32 55 12 44V20z" fill={`url(#${id}i)`} />{locked ? <g transform="translate(20 18)" opacity=".85"><rect x="3" y="12" width="18" height="14" rx="3" fill="#7d78a8" /><path d="M7 12V9a5 5 0 0 1 10 0v3" stroke="#7d78a8" strokeWidth="3" fill="none" /></g> : inner[kind]}</svg>;
}

// ---- avatar ilustrado e personalizável ----
export interface AvatarSpec { skin: string; hair: string; style: 'curto' | 'cacheado' | 'longo' | 'topete'; shirt: string; bg?: string }
export const SKINS = ['#ffd9bd', '#f2b98f', '#d99a6c', '#a86b45', '#7a4a2d']; export const HAIRS = ['#3a2417', '#7a4a2a', '#c78b3a', '#1c1c24', '#b03a2e', '#6b3fd8'];
export const SHIRTS = ['#ff7a3d', '#4d82f0', '#1fb765', '#ec4f9b', '#6a3fd8', '#f7b928'];
export const DEFAULT_AVATAR: AvatarSpec = { skin: SKINS[0]!, hair: HAIRS[1]!, style: 'curto', shirt: SHIRTS[0]!, bg: '#dff0ff' };
export function AvatarFace({ a = DEFAULT_AVATAR, size = 96, name }: { a?: AvatarSpec; size?: number; name?: string }) {
  const hair = {
    curto: <path d="M20 44c-2-18 10-28 28-28s30 9 28 28c-4-8-10-12-18-13-9 3-20 4-38 13z" fill={a.hair} />,
    cacheado: <g fill={a.hair}><circle cx="24" cy="38" r="12" /><circle cx="36" cy="26" r="13" /><circle cx="52" cy="22" r="13" /><circle cx="68" cy="30" r="12" /><circle cx="73" cy="44" r="9" /></g>,
    longo: <g fill={a.hair}><path d="M18 46c-4-22 8-34 30-34s34 12 30 34l2 34H16z" /></g>,
    topete: <path d="M20 44c-2-20 8-30 26-30 6-6 18-4 22 4 8 4 11 14 8 26-4-8-8-12-16-14-12 2-24 4-40 14z" fill={a.hair} />,
  }[a.style];
  return <svg width={size} height={size} viewBox="0 0 96 96" role="img" aria-label={`Avatar${name ? ' de ' + name : ''}`}><circle cx="48" cy="48" r="48" fill={a.bg ?? '#dff0ff'} />
    {a.style === 'longo' && hair}<path d="M14 96c2-18 16-26 34-26s32 8 34 26z" fill={a.shirt} /><path d="M40 66h16v10c-3 4-13 4-16 0z" fill={a.skin} />
    <ellipse cx="48" cy="46" rx="25" ry="27" fill={a.skin} /><ellipse cx="23" cy="48" rx="4.5" ry="6.5" fill={a.skin} /><ellipse cx="73" cy="48" rx="4.5" ry="6.5" fill={a.skin} />
    {a.style !== 'longo' && hair}{a.style === 'longo' && <path d="M24 44c4-14 14-18 24-18s20 4 24 18c-8-6-16-9-24-9s-16 3-24 9z" fill={a.hair} />}
    <ellipse cx="38" cy="50" rx="5" ry="6" fill="#fff" /><ellipse cx="58" cy="50" rx="5" ry="6" fill="#fff" /><circle cx="39" cy="51" r="3.3" fill="#3a2417" /><circle cx="59" cy="51" r="3.3" fill="#3a2417" /><circle cx="40" cy="49.5" r="1.2" fill="#fff" /><circle cx="60" cy="49.5" r="1.2" fill="#fff" />
    <path d="M33 43q5-4 10-1M53 42q5-3 10 1" stroke={a.hair} strokeWidth="2.2" fill="none" strokeLinecap="round" /><path d="M40 61q8 8 16 0" stroke="#7a2e2e" strokeWidth="2.6" fill="#fff" strokeLinecap="round" /><ellipse cx="31" cy="58" rx="4.5" ry="3" fill="#ff9bb0" opacity=".5" /><ellipse cx="65" cy="58" rx="4.5" ry="3" fill="#ff9bb0" opacity=".5" /></svg>;
}

export function FractionPie({ num, den, size = 92 }: { num: number; den: number; size?: number }) {
  const r = 40, c = 50; const pt = (i: number) => [c + r * Math.sin((2 * Math.PI * i) / den), c - r * Math.cos((2 * Math.PI * i) / den)] as const;
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Fração ${num} de ${den}`}><circle cx={c} cy={c} r={r + 4} fill="#fff" opacity=".35" /><circle cx={c} cy={c} r={r} fill="#dfe9ff" />
    {Array.from({ length: den }, (_, i) => { const [x1, y1] = pt(i), [x2, y2] = pt(i + 1); return <path key={i} d={`M${c} ${c}L${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}z`} fill={i < num ? '#4d82f0' : '#c4d6fa'} stroke="#fff" strokeWidth="2.2" />; })}
    <text x="50" y="47" textAnchor="middle" fontSize="22" fontWeight="900" fill="#271a5c">{num}</text><path d="M38 52h24" stroke="#271a5c" strokeWidth="2.6" strokeLinecap="round" /><text x="50" y="72" textAnchor="middle" fontSize="22" fontWeight="900" fill="#271a5c">{den}</text></svg>;
}
