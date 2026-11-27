// Mascote oficial (axolote roxo). SVG paramétrico: cada parte é um grupo com id/classe estável (ax-gills-l/r, ax-eye-l/r, ax-arm-l/r, ax-mouth…),
// pronto para virar rig no Rive/Lottie. Animação atual: CSS (respeita prefers-reduced-motion).
// Regra pedagógica: o mascote NUNCA demonstra decepção, deboche ou tristeza diante de um erro.
import { useId } from 'react';
import { brand } from '@edu/brand';

export type MascotState = 'feliz' | 'pensativo' | 'explicando' | 'estudando' | 'comemorando' | 'incentivando' | 'dando_dicas' | 'aguardando' | 'apresentando';
export const MASCOT_STATES: { id: MascotState; nome: string; uso: string }[] = [
  { id: 'feliz', nome: 'Feliz', uso: 'Boas-vindas e estado padrão.' },
  { id: 'pensativo', nome: 'Pensativo', uso: 'Ao investigar uma dúvida junto com o aluno.' },
  { id: 'explicando', nome: 'Explicando', uso: 'Durante explicações e exemplos.' },
  { id: 'estudando', nome: 'Estudando', uso: 'Leitura, estudo guiado e biblioteca.' },
  { id: 'comemorando', nome: 'Comemorando', uso: 'Acertos, fases concluídas e medalhas.' },
  { id: 'incentivando', nome: 'Incentivando', uso: 'Após um erro: reconhece o esforço e convida a tentar de novo.' },
  { id: 'dando_dicas', nome: 'Dando dicas', uso: 'Quando o aluno pede uma dica progressiva.' },
  { id: 'aguardando', nome: 'Aguardando resposta', uso: 'Enquanto o aluno pensa; sem pressão de tempo.' },
  { id: 'apresentando', nome: 'Apresentando missão', uso: 'Banner de nova missão e início de fases.' },
];
export const mascotForEvent = (e: 'welcome' | 'intro' | 'correct' | 'partial' | 'incorrect' | 'hint' | 'explain' | 'reading' | 'waiting' | 'mission' | 'level_up'): MascotState =>
  ({ welcome: 'feliz', intro: 'apresentando', correct: 'comemorando', partial: 'incentivando', incorrect: 'incentivando', hint: 'dando_dicas', explain: 'explicando', reading: 'estudando', waiting: 'aguardando', mission: 'apresentando', level_up: 'comemorando' } as const)[e];

const EY = 82; const EX = { l: 76, r: 124 };
const PUPIL: Record<MascotState, [number, number]> = { feliz: [0, 1], pensativo: [-5, -6], explicando: [3, 0], estudando: [0, 8], comemorando: [0, 0], incentivando: [2, 0], dando_dicas: [7, -7], aguardando: [0, 1], apresentando: [0, 0] };
const rad = (d: number) => (d * Math.PI) / 180;

/** Guelra externa plumosa: haste curva com folíolos e botão na ponta (como na ilustração de referência). */
function Feather({ ax, ay, a, len, id, U }: { ax: number; ay: number; a: number; len: number; id: string; U: string }) {
  const m = brand.mascot; const bend = a < -130 ? -14 : 14;
  const pt = (t: number): [number, number] => { const r = len * t, ang = a + bend * t * t; return [ax + Math.cos(rad(ang)) * r, ay + Math.sin(rad(ang)) * r]; };
  const [ex, ey] = pt(1);
  return <g id={id}><path d={`M${ax} ${ay}Q${pt(0.55)[0].toFixed(1)} ${pt(0.55)[1].toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`} stroke={`url(#${U}Gill)`} strokeWidth="10.5" strokeLinecap="round" fill="none" />
    {[0.3, 0.48, 0.66, 0.82].flatMap((t, i) => { const [x, y] = pt(t); const L = 17 - i * 2.4; return [-1, 1].map((sd) => { const ang = a + bend * t * t + sd * 52; return <path key={`${i}${sd}`} d={`M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(rad(ang)) * L).toFixed(1)} ${(Math.sin(rad(ang)) * L).toFixed(1)}`} stroke={`url(#${U}Gill)`} strokeWidth={8 - i * 0.7} strokeLinecap="round" />; }); })}
    <circle cx={ex} cy={ey} r="6.2" fill={m.gillsLight} /><circle cx={ex - 1.6} cy={ey - 1.8} r="2" fill="#fff" opacity=".75" /></g>;
}

export function Axolotl({ state = 'feliz', size = 140, cap = false, animate = true, title, className = '' }: { state?: MascotState; size?: number; cap?: boolean; animate?: boolean; title?: string; className?: string }) {
  const U = 'ax' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const m = brand.mascot; const [dx, dy] = PUPIL[state]; const label = title ?? `Mascote ${brand.name}: ${MASCOT_STATES.find((s) => s.id === state)!.nome}`;
  const happyEyes = state === 'comemorando'; const wink = state === 'incentivando';
  const arc = (cx: number) => <path d={`M${cx - 13} ${EY + 4} Q${cx} ${EY - 15} ${cx + 13} ${EY + 4}`} stroke={m.ink} strokeWidth="5.5" fill="none" strokeLinecap="round" />;
  const eye = (cx: number, id: string, side: -1 | 1) => <g id={id}>
    <ellipse cx={cx} cy={EY} rx="15.5" ry="18.5" fill="#fff" /><ellipse cx={cx + dx} cy={EY + 1.5 + dy} rx="14" ry="17" fill={`url(#${U}Iris)`} /><ellipse cx={cx + dx} cy={EY + 4 + dy} rx="8" ry="9.6" fill="#0e0a2e" />
    <ellipse cx={cx + dx + 5} cy={EY - 5 + dy} rx="5.6" ry="6.2" fill="#fff" /><circle cx={cx + dx - 5} cy={EY + 8 + dy} r="3" fill="#fff" opacity=".92" /><circle cx={cx + dx + 7} cy={EY + 6 + dy} r="1.5" fill="#ffd6f0" />
    {animate && <ellipse className="ax-blink" cx={cx} cy={EY} rx="17.5" ry="19.5" fill="#a47cf6" />}</g>;
  const gills = (side: 'l' | 'r') => <g id={`ax-gills-${side}`} transform={side === 'r' ? 'translate(200 0) scale(-1 1)' : undefined}><g className={`ax-gill-${side}`}>
    <Feather U={U} ax={52} ay={58} a={-112} len={50} id={`ax-gill-${side}-1`} /><Feather U={U} ax={44} ay={72} a={-146} len={50} id={`ax-gill-${side}-2`} /><Feather U={U} ax={40} ay={90} a={-176} len={44} id={`ax-gill-${side}-3`} /></g></g>;
  const mouth = () => {
    if (state === 'explicando' || state === 'comemorando' || state === 'apresentando' || state === 'feliz')
      return <g id="ax-mouth"><path d="M70 102 Q100 144 130 102 Q100 111 70 102z" fill="#7a2a6e" stroke={m.ink} strokeWidth="3.4" strokeLinejoin="round" /><clipPath id={`${U}Mouth`}><path d="M70 102 Q100 144 130 102 Q100 111 70 102z" /></clipPath><ellipse cx="100" cy="126" rx="15" ry="9" fill={m.cheek} clipPath={`url(#${U}Mouth)`} /><path d="M86 106q14 6 28 0" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9" /></g>;
    if (state === 'pensativo') return <path id="ax-mouth" d="M88 108 Q100 116 112 108" stroke={m.ink} strokeWidth="4.8" fill="none" strokeLinecap="round" />;
    if (state === 'aguardando') return <path id="ax-mouth" d="M84 106 Q100 118 116 106" stroke={m.ink} strokeWidth="4.8" fill="none" strokeLinecap="round" />;
    return <path id="ax-mouth" d="M80 104 Q100 124 120 104" stroke={m.ink} strokeWidth="5" fill="none" strokeLinecap="round" />;
  };
  const arm = (d: string, hand?: [number, number], id = 'ax-arm') => <g id={id}><path d={d} stroke="#9568f0" strokeWidth="17" strokeLinecap="round" fill="none" />{hand && <circle cx={hand[0]} cy={hand[1]} r="10.5" fill={m.bodyLight} />}</g>;
  const closedBook = (x: number, y: number, rot = -8) => <g id="ax-book" transform={`translate(${x} ${y}) rotate(${rot})`}><rect x="0" y="0" width="52" height="62" rx="8" fill={m.book} /><rect x="0" y="0" width="10" height="62" rx="5" fill="#3a2296" /><rect x="45" y="5" width="5" height="52" rx="2.5" fill="#f3eeff" /><rect x="25" y="16" width="8" height="28" rx="2.4" fill={m.gold} /><rect x="15" y="26" width="28" height="8" rx="2.4" fill={m.gold} /><path d="M6 4h40" stroke="#fff" strokeOpacity=".25" strokeWidth="3" strokeLinecap="round" /></g>;
  const openBook = <g id="ax-book"><path d="M46 150 Q74 138 100 150 Q126 138 154 150 L154 192 Q126 180 100 192 Q74 180 46 192 Z" fill={m.book} /><path d="M52 148 Q76 140 98 150 L98 186 Q76 177 52 186 Z" fill="#fff" /><path d="M148 148 Q124 140 102 150 L102 186 Q124 177 148 186 Z" fill="#f4efff" /><path d="M60 158 Q76 153 90 160M60 168 Q76 163 90 170M60 178 Q76 173 90 180M110 160 Q124 153 140 158M110 170 Q124 163 140 168" stroke={m.bodyLight} strokeWidth="2.6" fill="none" strokeLinecap="round" /></g>;
  const spark = (x: number, y: number, s = 1, c = m.gold) => <path key={`${x}${y}`} className="ax-spark" d={`M${x} ${y - 9 * s}l${2.6 * s} ${6.4 * s} ${6.4 * s} ${2.6 * s}-${6.4 * s} ${2.6 * s}-${2.6 * s} ${6.4 * s}-${2.6 * s}-${6.4 * s}-${6.4 * s}-${2.6 * s} ${6.4 * s}-${2.6 * s}z`} fill={c} />;
  const props = () => {
    switch (state) {
      case 'pensativo': return <g id="ax-prop"><circle cx="156" cy="50" r="3.5" fill="#fff" /><circle cx="164" cy="38" r="5.5" fill="#fff" /><ellipse cx="180" cy="18" rx="20" ry="13" fill="#fff" /><circle className="ax-dot" cx="172" cy="18" r="2.6" fill={m.body} /><circle className="ax-dot d2" cx="180" cy="18" r="2.6" fill={m.body} /><circle className="ax-dot d3" cx="188" cy="18" r="2.6" fill={m.body} /></g>;
      case 'explicando': return <g id="ax-prop"><path d="M150 8h34a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10h-18l-10 10v-10h-6a10 10 0 0 1-10-10V18a10 10 0 0 1 10-10z" fill="#fff" /><path d="M156 20h28M156 28h20M156 36h24" stroke={m.body} strokeWidth="3.4" strokeLinecap="round" /></g>;
      case 'comemorando': return <g id="ax-prop">{spark(26, 30, 1.2)}{spark(176, 26, 1.4, '#ff6fb6')}{spark(14, 124, 0.9, '#6ee7b7')}{spark(186, 112, 1, '#7dd3fc')}<circle cx="48" cy="12" r="4" fill="#ff6fb6" className="ax-spark" /><circle cx="150" cy="10" r="4" fill="#7dd3fc" className="ax-spark" /><rect x="190" y="58" width="7" height="12" rx="2" fill={m.gold} transform="rotate(25 192 64)" className="ax-spark" /><rect x="6" y="60" width="7" height="12" rx="2" fill="#6ee7b7" transform="rotate(-20 8 66)" className="ax-spark" /></g>;
      case 'incentivando': return <g id="ax-prop">{spark(178, 50, 1.1)}{spark(152, 22, 0.8, '#fff')}<path d="M30 36c-6-8 4-16 9-8 5-8 15 0 9 8l-9 9z" fill={m.gills} /></g>;
      case 'dando_dicas': return <g id="ax-prop"><circle className="ax-glow" cx="162" cy="28" r="24" fill={m.gold} opacity=".28" /><path d="M162 12a14 14 0 0 1 8 25.6V44h-16v-6.4A14 14 0 0 1 162 12z" fill={m.gold} /><rect x="154" y="44" width="16" height="6" rx="3" fill="#c98f00" /><path d="M136 12l-6-4M188 12l6-4M132 32h-7M192 32h7" stroke={m.gold} strokeWidth="3" strokeLinecap="round" /></g>;
      case 'aguardando': return <g id="ax-prop"><ellipse cx="166" cy="26" rx="22" ry="13" fill="#fff" /><circle className="ax-dot" cx="156" cy="26" r="3" fill={m.body} /><circle className="ax-dot d2" cx="166" cy="26" r="3" fill={m.body} /><circle className="ax-dot d3" cx="176" cy="26" r="3" fill={m.body} /></g>;
      case 'apresentando': return <g id="ax-prop">{spark(24, 40, 1.1)}{spark(186, 18, 1)}<g transform="translate(150 40) rotate(8)"><rect x="0" y="0" width="38" height="44" rx="5" fill="#fff" /><rect x="-4" y="-3" width="46" height="9" rx="4.5" fill={m.gold} /><rect x="-4" y="38" width="46" height="9" rx="4.5" fill={m.gold} />{spark(19, 24, 1.1, m.book)}</g></g>;
      default: return <g id="ax-prop">{spark(178, 40, 0.9)}{spark(22, 28, 0.7, '#fff')}</g>;
    }
  };
  const arms = () => {
    switch (state) {
      case 'pensativo': return <>{arm('M66 142 Q56 160 62 172', undefined, 'ax-arm-l')}{arm('M134 140 Q154 126 124 110', [122, 108], 'ax-arm-r')}</>;
      case 'explicando': return <>{arm('M66 142 Q54 162 66 174', undefined, 'ax-arm-l')}{arm('M136 136 Q168 120 172 86', [172, 82], 'ax-arm-r')}</>;
      case 'estudando': return <>{arm('M64 142 Q66 162 84 168', undefined, 'ax-arm-l')}{arm('M136 142 Q134 162 116 168', undefined, 'ax-arm-r')}</>;
      case 'comemorando': return <>{arm('M64 134 Q36 114 42 82', [42, 78], 'ax-arm-l')}{arm('M136 134 Q164 114 158 82', [158, 78], 'ax-arm-r')}</>;
      case 'incentivando': return <>{arm('M66 142 Q50 152 60 166', undefined, 'ax-arm-l')}{arm('M136 134 Q166 124 160 96', undefined, 'ax-arm-r')}<circle cx="160" cy="90" r="11.5" fill={m.bodyLight} /><path d="M153 86h14M153 92h14" stroke="#9568f0" strokeWidth="2" strokeLinecap="round" /></>;
      case 'dando_dicas': return <>{arm('M66 142 Q54 162 66 174', undefined, 'ax-arm-l')}{arm('M136 134 Q160 110 156 64', [156, 60], 'ax-arm-r')}</>;
      case 'aguardando': return <>{arm('M66 142 Q72 162 94 166', undefined, 'ax-arm-l')}{arm('M134 142 Q128 162 106 166', undefined, 'ax-arm-r')}</>;
      case 'apresentando': return <>{arm('M64 140 Q44 126 40 100', [40, 96], 'ax-arm-l')}{arm('M136 136 Q166 126 164 98', [164, 94], 'ax-arm-r')}</>;
      default: return <>{arm('M64 140 Q44 134 42 108', [42, 104], 'ax-arm-l')}{arm('M136 144 Q130 162 114 168', undefined, 'ax-arm-r')}</>;
    }
  };
  const tilt = state === 'aguardando' ? -7 : state === 'pensativo' ? 5 : 0;
  return <svg className={`ax-svg ${animate ? 'ax-anim' : ''} ${className}`} width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={label} data-state={state}>
    <title>{label}</title>
    <defs>
      <radialGradient id={`${U}Head`} cx="40%" cy="22%" r="85%"><stop offset="0" stopColor="#c9adff" /><stop offset=".55" stopColor={m.bodyLight} /><stop offset="1" stopColor="#8f63ee" /></radialGradient>
      <linearGradient id={`${U}Body`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a47bf6" /><stop offset="1" stopColor="#7f52e4" /></linearGradient>
      <linearGradient id={`${U}Gill`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff4fa6" /><stop offset="1" stopColor="#ff86c6" /></linearGradient>
      <radialGradient id={`${U}Iris`} cx="50%" cy="30%" r="80%"><stop offset="0" stopColor="#3b2f94" /><stop offset=".6" stopColor="#241a63" /><stop offset="1" stopColor="#4b3fb0" /></radialGradient>
      <radialGradient id={`${U}Cheek`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ff7fbd" stopOpacity=".85" /><stop offset="1" stopColor="#ff7fbd" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="100" cy="193" rx="54" ry="7" fill="#1d104f" opacity=".16" />
    <g className="ax-float">
      <g id="ax-tail"><path d="M64 168C22 178 4 150 14 120C22 146 40 156 66 150z" fill="#8f63ee" /><path d="M14 120C4 150 22 178 64 168" stroke="#ff7cc0" strokeWidth="5.5" fill="none" strokeLinecap="round" /><path d="M14 120l-6-8M10 138l-8-2M16 156l-7 4M32 170l-3 8" stroke="#ff7cc0" strokeWidth="5" strokeLinecap="round" /><path d="M50 160C32 160 22 148 20 134" stroke="#c9adff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" /></g>
      <ellipse cx="72" cy="186" rx="18" ry="9" fill="#7f52e4" /><ellipse cx="128" cy="186" rx="18" ry="9" fill="#7f52e4" />
      <g id="ax-pack"><rect x="52" y="116" width="34" height="48" rx="12" fill="#3b3a52" /><rect x="56" y="124" width="26" height="12" rx="5" fill="#ff8a3d" /></g><ellipse id="ax-body" cx="100" cy="150" rx="42" ry="40" fill={`url(#${U}Body)`} /><ellipse cx="100" cy="160" rx="26" ry="26" fill={m.belly} /><path d="M72 128c-4 14 0 26 8 34M128 128c4 14 0 26-8 34" stroke="#ff8a3d" strokeWidth="6" fill="none" strokeLinecap="round" />
      {state === 'estudando' ? null : arms()}
      {(state === 'feliz' || state === 'explicando') && closedBook(98, 128)}
      {state === 'estudando' && <>{openBook}{arms()}</>}
      <g id="ax-head" transform={`rotate(${tilt} 100 112)`}>
        {gills('l')}{gills('r')}
        <path d="M40 88C40 52 66 30 100 30s60 22 60 58c0 32-24 50-60 50S40 120 40 88z" fill={`url(#${U}Head)`} /><g fill="#6d42c7" opacity=".16"><circle cx="70" cy="46" r="2.4" /><circle cx="86" cy="40" r="2" /><circle cx="116" cy="41" r="2.2" /><circle cx="132" cy="48" r="2.4" /><circle cx="100" cy="46" r="1.8" /><circle cx="62" cy="64" r="1.8" /><circle cx="140" cy="64" r="1.8" /></g>
        <ellipse cx="84" cy="48" rx="28" ry="8" fill="#fff" opacity=".2" />
        <ellipse cx="56" cy="106" rx="14" ry="9" fill={`url(#${U}Cheek)`} /><ellipse cx="144" cy="106" rx="14" ry="9" fill={`url(#${U}Cheek)`} />
        {happyEyes ? <g id="ax-eyes">{arc(EX.l)}{arc(EX.r)}</g> : wink ? <g id="ax-eyes">{eye(EX.l, 'ax-eye-l', -1)}<g id="ax-eye-r">{arc(EX.r)}</g></g> : <g id="ax-eyes">{eye(EX.l, 'ax-eye-l', -1)}{eye(EX.r, 'ax-eye-r', 1)}</g>}
        <circle cx="95" cy="100" r="1.7" fill={m.ink} opacity=".4" /><circle cx="105" cy="100" r="1.7" fill={m.ink} opacity=".4" />
        {mouth()}
        {cap && <g id="ax-cap" transform="translate(0 -13) rotate(-8 100 50)"><path d="M46 50 100 26l54 24-54 24z" fill="#30307f" /><path d="M46 50 100 26l54 24" fill="none" stroke="#5a5ac4" strokeWidth="2.2" /><path d="M100 26l54 24-54 24" fill="none" stroke="#1f1f5e" strokeWidth="2" opacity=".5" /><path d="M70 60v11q30 12 60 0V60" fill="#26266a" /><circle cx="100" cy="50" r="3.8" fill={m.gold} /><path d="M100 50 52 54 50 84" stroke={m.gold} strokeWidth="3" strokeLinecap="round" fill="none" /><circle cx="50" cy="87" r="5.2" fill={m.gold} /><path d="M46 91l-3 10M50 92v11M54 91l3 10" stroke={m.gold} strokeWidth="2.6" strokeLinecap="round" /></g>}
      </g>
      {props()}
    </g>
  </svg>;
}
