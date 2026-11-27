// Mascote oficial (axolote roxo). SVG paramétrico: cada parte é um grupo com id/classe estável (ax-gill-l, ax-eye-l, ax-arm-r…),
// pronto para virar rig no Rive/Lottie no futuro. Animação atual: CSS (respeita prefers-reduced-motion).
// Regra pedagógica: o mascote NUNCA demonstra decepção, deboche ou tristeza diante de um erro.
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
/** Eventos pedagógicos → estado do mascote. Erro nunca vira expressão negativa. */
export const mascotForEvent = (e: 'welcome' | 'intro' | 'correct' | 'partial' | 'incorrect' | 'hint' | 'explain' | 'reading' | 'waiting' | 'mission' | 'level_up'): MascotState =>
  ({ welcome: 'feliz', intro: 'apresentando', correct: 'comemorando', partial: 'incentivando', incorrect: 'incentivando', hint: 'dando_dicas', explain: 'explicando', reading: 'estudando', waiting: 'aguardando', mission: 'apresentando', level_up: 'comemorando' } as const)[e];

const EYE = { l: 76, r: 124, y: 80 };
const PUPIL: Record<MascotState, [number, number]> = { feliz: [0, 1], pensativo: [-5, -6], explicando: [3, 0], estudando: [0, 8], comemorando: [0, 0], incentivando: [2, 0], dando_dicas: [7, -7], aguardando: [0, 1], apresentando: [0, 0] };

export function Axolotl({ state = 'feliz', size = 140, cap = false, animate = true, title, className = '' }: { state?: MascotState; size?: number; cap?: boolean; animate?: boolean; title?: string; className?: string }) {
  const m = brand.mascot; const [dx, dy] = PUPIL[state]; const label = title ?? `Mascote ${brand.name}: ${MASCOT_STATES.find((s) => s.id === state)!.nome}`;
  const happyEyes = state === 'comemorando'; const wink = state === 'incentivando';
  const arc = (cx: number) => <path d={`M${cx - 12} ${EYE.y + 3} Q${cx} ${EYE.y - 14} ${cx + 12} ${EYE.y + 3}`} stroke={m.ink} strokeWidth="5" fill="none" strokeLinecap="round" />;
  const eye = (cx: number, id: string) => <g id={id}><ellipse cx={cx} cy={EYE.y} rx="13.5" ry="15.5" fill="#fff" /><circle cx={cx + dx} cy={EYE.y + 2 + dy} r="8.6" fill={m.ink} /><circle cx={cx + dx + 3.2} cy={EYE.y - 1 + dy} r="3.1" fill="#fff" /><circle cx={cx + dx - 3} cy={EYE.y + 5 + dy} r="1.5" fill="#fff" opacity=".8" />
    {animate && <ellipse className="ax-blink" cx={cx} cy={EYE.y} rx="14.5" ry="16.5" fill="url(#axHead)" />}</g>;
  const gill = (side: 'l' | 'r') => <g id={`ax-gills-${side}`} transform={side === 'r' ? 'translate(200 0) scale(-1 1)' : undefined}><g className={`ax-gill-${side}`}>
    {([[50, 66, 24, 44, 10, 46], [46, 84, 16, 76, 3, 80], [50, 102, 22, 112, 9, 120]] as const).map(([x1, y1, cx, cy, x2, y2], i) => <g key={i}>
      <path d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} stroke={m.gills} strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d={`M${(x1 + cx) / 2} ${(y1 + cy) / 2} q-4 -9 ${x2 < 12 ? 2 : -3} -14M${(x1 + cx) / 2} ${(y1 + cy) / 2} q-9 5 -11 13`} stroke={m.gills} strokeWidth="6" strokeLinecap="round" fill="none" />
      <circle cx={x2} cy={y2} r="7.5" fill={m.gillsLight} /><circle cx={(x1 + cx) / 2 + 1} cy={(y1 + cy) / 2 + 2} r="3.4" fill={m.gillsLight} opacity=".9" /></g>)}</g></g>;
  const mouth = () => {
    if (state === 'explicando' || state === 'comemorando' || state === 'apresentando') return <g id="ax-mouth"><path d="M80 101 Q100 130 120 101 Z" fill="#5b2477" stroke={m.ink} strokeWidth="3" strokeLinejoin="round" /><ellipse cx="100" cy="116" rx="9" ry="5" fill={m.cheek} /></g>;
    if (state === 'pensativo') return <path id="ax-mouth" d="M90 106 Q100 114 110 106" stroke={m.ink} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
    if (state === 'aguardando') return <path id="ax-mouth" d="M86 106 Q100 115 114 106" stroke={m.ink} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
    return <path id="ax-mouth" d="M82 103 Q100 121 118 103" stroke={m.ink} strokeWidth="4.8" fill="none" strokeLinecap="round" />;
  };
  const arm = (d: string, hand?: [number, number], id = 'ax-arm') => <g id={id}><path d={d} stroke={m.body} strokeWidth="15" strokeLinecap="round" fill="none" />{hand && <circle cx={hand[0]} cy={hand[1]} r="9.5" fill={m.bodyLight} />}</g>;
  const closedBook = (x: number, y: number, rot = -8) => <g id="ax-book" transform={`translate(${x} ${y}) rotate(${rot})`}><rect x="0" y="0" width="46" height="54" rx="7" fill={m.book} /><rect x="0" y="0" width="8" height="54" rx="4" fill="#3b2398" /><rect x="40" y="4" width="4" height="46" rx="2" fill="#fff" opacity=".85" /><rect x="22" y="14" width="7" height="24" rx="2" fill={m.gold} /><rect x="14" y="22" width="23" height="7" rx="2" fill={m.gold} /></g>;
  const openBook = <g id="ax-book"><path d="M52 150 Q76 140 100 150 Q124 140 148 150 L148 188 Q124 178 100 188 Q76 178 52 188 Z" fill={m.book} /><path d="M56 148 Q78 140 98 150 L98 184 Q78 176 56 184 Z" fill="#fff" /><path d="M144 148 Q122 140 102 150 L102 184 Q122 176 144 184 Z" fill="#f4efff" /><path d="M64 156 Q78 152 90 158M64 165 Q78 161 90 167M64 174 Q78 170 90 176M110 158 Q122 152 136 156M110 167 Q122 161 136 165" stroke={m.bodyLight} strokeWidth="2.4" fill="none" strokeLinecap="round" /></g>;
  const spark = (x: number, y: number, s = 1, c = m.gold) => <path key={`${x}${y}`} className="ax-spark" d={`M${x} ${y - 9 * s}l${2.6 * s} ${6.4 * s} ${6.4 * s} ${2.6 * s}-${6.4 * s} ${2.6 * s}-${2.6 * s} ${6.4 * s}-${2.6 * s}-${6.4 * s}-${6.4 * s}-${2.6 * s} ${6.4 * s}-${2.6 * s}z`} fill={c} />;
  const props = () => {
    switch (state) {
      case 'pensativo': return <g id="ax-prop"><circle cx="152" cy="52" r="3.5" fill="#fff" /><circle cx="160" cy="40" r="5.5" fill="#fff" /><ellipse cx="176" cy="20" rx="20" ry="13" fill="#fff" /><circle className="ax-dot" cx="168" cy="20" r="2.6" fill={m.body} /><circle className="ax-dot d2" cx="176" cy="20" r="2.6" fill={m.body} /><circle className="ax-dot d3" cx="184" cy="20" r="2.6" fill={m.body} /></g>;
      case 'explicando': return <g id="ax-prop"><path d="M150 14h34a10 10 0 0 1 10 10v16a10 10 0 0 1-10 10h-18l-10 10v-10h-6a10 10 0 0 1-10-10V24a10 10 0 0 1 10-10z" fill="#fff" /><path d="M156 26h28M156 34h20M156 42h24" stroke={m.body} strokeWidth="3.4" strokeLinecap="round" /></g>;
      case 'comemorando': return <g id="ax-prop">{spark(30, 30, 1.2)}{spark(172, 28, 1.4, '#ff6fb6')}{spark(18, 120, 0.9, '#6ee7b7')}{spark(184, 112, 1, '#7dd3fc')}<circle cx="46" cy="14" r="4" fill="#ff6fb6" className="ax-spark" /><circle cx="150" cy="12" r="4" fill="#7dd3fc" className="ax-spark" /><rect x="188" y="60" width="7" height="12" rx="2" fill={m.gold} transform="rotate(25 190 66)" className="ax-spark" /><rect x="8" y="64" width="7" height="12" rx="2" fill="#6ee7b7" transform="rotate(-20 10 70)" className="ax-spark" /></g>;
      case 'incentivando': return <g id="ax-prop">{spark(176, 52, 1.1)}{spark(150, 24, 0.8, '#fff')}<path d="M34 40c-6-8 4-16 9-8 5-8 15 0 9 8l-9 9z" fill={m.gills} /></g>;
      case 'dando_dicas': return <g id="ax-prop"><circle className="ax-glow" cx="160" cy="30" r="24" fill={m.gold} opacity=".28" /><path d="M160 14a14 14 0 0 1 8 25.6V46h-16v-6.4A14 14 0 0 1 160 14z" fill={m.gold} /><rect x="152" y="46" width="16" height="6" rx="3" fill="#c98f00" /><path d="M160 2v-0M134 14l-6-4M186 14l6-4M130 34h-7M190 34h7" stroke={m.gold} strokeWidth="3" strokeLinecap="round" /></g>;
      case 'aguardando': return <g id="ax-prop"><ellipse cx="164" cy="30" rx="22" ry="13" fill="#fff" /><circle className="ax-dot" cx="154" cy="30" r="3" fill={m.body} /><circle className="ax-dot d2" cx="164" cy="30" r="3" fill={m.body} /><circle className="ax-dot d3" cx="174" cy="30" r="3" fill={m.body} /></g>;
      case 'apresentando': return <g id="ax-prop">{spark(30, 40, 1.1)}{spark(184, 20, 1)}<g transform="translate(150 40) rotate(8)"><rect x="0" y="0" width="38" height="44" rx="5" fill="#fff" /><rect x="-4" y="-3" width="46" height="9" rx="4.5" fill={m.gold} /><rect x="-4" y="38" width="46" height="9" rx="4.5" fill={m.gold} />{spark(19, 24, 1.1, m.book)}</g></g>;
      default: return <g id="ax-prop">{spark(176, 38, 0.9)}</g>;
    }
  };
  const arms = () => {
    switch (state) {
      case 'pensativo': return <>{arm('M64 140 Q56 158 62 170', undefined, 'ax-arm-l')}{arm('M136 138 Q154 124 124 106', [122, 104], 'ax-arm-r')}</>;
      case 'explicando': return <>{arm('M64 140 Q52 160 64 172', undefined, 'ax-arm-l')}{arm('M138 134 Q168 118 172 84', [172, 80], 'ax-arm-r')}</>;
      case 'estudando': return <>{arm('M62 140 Q66 160 84 166', undefined, 'ax-arm-l')}{arm('M138 140 Q134 160 116 166', undefined, 'ax-arm-r')}</>;
      case 'comemorando': return <>{arm('M62 130 Q36 112 42 80', [42, 76], 'ax-arm-l')}{arm('M138 130 Q164 112 158 80', [158, 76], 'ax-arm-r')}</>;
      case 'incentivando': return <>{arm('M64 140 Q50 150 60 164', undefined, 'ax-arm-l')}{arm('M138 132 Q166 122 160 94', undefined, 'ax-arm-r')}<circle cx="160" cy="88" r="10.5" fill={m.bodyLight} /><path d="M154 84h12M154 90h12" stroke={m.body} strokeWidth="2" strokeLinecap="round" /></>;
      case 'dando_dicas': return <>{arm('M64 140 Q54 160 66 172', undefined, 'ax-arm-l')}{arm('M138 132 Q160 108 156 62', [156, 58], 'ax-arm-r')}</>;
      case 'aguardando': return <>{arm('M64 140 Q70 160 92 164', undefined, 'ax-arm-l')}{arm('M136 140 Q130 160 108 164', undefined, 'ax-arm-r')}</>;
      case 'apresentando': return <>{arm('M62 138 Q44 124 40 98', [40, 94], 'ax-arm-l')}{arm('M138 134 Q166 124 164 96', [164, 92], 'ax-arm-r')}</>;
      default: return <>{arm('M62 136 Q42 130 40 106', [40, 102], 'ax-arm-l')}{arm('M138 142 Q132 160 118 166', undefined, 'ax-arm-r')}</>;
    }
  };
  const tilt = state === 'aguardando' ? -7 : state === 'pensativo' ? 5 : 0;
  return <svg className={`ax-svg ${animate ? 'ax-anim' : ''} ${className}`} width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={label} data-state={state}>
    <title>{label}</title>
    <defs><radialGradient id="axHead" cx="45%" cy="30%" r="80%"><stop offset="0" stopColor={m.bodyLight} /><stop offset="1" stopColor={m.body} /></radialGradient><linearGradient id="axBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={m.body} /><stop offset="1" stopColor="#8456ee" /></linearGradient></defs>
    <ellipse cx="100" cy="190" rx="52" ry="7" fill="#1d104f" opacity=".16" />
    <g className="ax-float">
      <g id="ax-tail"><path d="M136 160C176 164 196 142 184 112C178 130 164 138 138 134z" fill="#8456ee" /><path d="M150 146C168 146 178 138 180 124" stroke={m.bodyLight} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".7" /></g>
      <ellipse cx="72" cy="176" rx="17" ry="9" fill="#8456ee" /><ellipse cx="128" cy="176" rx="17" ry="9" fill="#8456ee" />
      <ellipse id="ax-body" cx="100" cy="140" rx="45" ry="40" fill="url(#axBody)" /><ellipse cx="100" cy="150" rx="27" ry="26" fill={m.belly} />
      {state === 'estudando' ? null : arms()}
      {state === 'estudando' ? null : (state === 'feliz' || state === 'explicando' || state === 'apresentando' ? null : null)}
      {(state === 'feliz' || state === 'explicando') && closedBook(104, 126)}
      {state === 'estudando' && <>{openBook}{arms()}</>}
      <g id="ax-head" transform={`rotate(${tilt} 100 110)`}>
        {gill('l')}{gill('r')}
        <ellipse cx="100" cy="86" rx="61" ry="49" fill="url(#axHead)" />
        <ellipse cx="57" cy="100" rx="9.5" ry="6.5" fill={m.cheek} opacity=".6" /><ellipse cx="143" cy="100" rx="9.5" ry="6.5" fill={m.cheek} opacity=".6" />
        {happyEyes ? <g id="ax-eyes">{arc(EYE.l)}{arc(EYE.r)}</g> : wink ? <g id="ax-eyes">{eye(EYE.l, 'ax-eye-l')}<g id="ax-eye-r">{arc(EYE.r)}</g></g> : <g id="ax-eyes">{eye(EYE.l, 'ax-eye-l')}{eye(EYE.r, 'ax-eye-r')}</g>}
        <circle cx="95" cy="95" r="1.6" fill={m.ink} opacity=".45" /><circle cx="105" cy="95" r="1.6" fill={m.ink} opacity=".45" />
        {mouth()}
        {cap && <g id="ax-cap"><path d="M54 56 100 38l46 18-46 18z" fill="#2e2262" /><path d="M72 64v13q28 12 56 0V64" fill="#3d2f80" /><path d="M100 38l46 18-46 18-46-18z" fill="none" stroke="#4a3b94" strokeWidth="1.5" /><path d="M140 59 147 84" stroke={m.gold} strokeWidth="3" strokeLinecap="round" /><circle cx="147" cy="86" r="4.5" fill={m.gold} /><path d="M143 90l-3 8M147 91v9M151 90l3 8" stroke={m.gold} strokeWidth="2.4" strokeLinecap="round" /></g>}
      </g>
      {props()}
    </g>
  </svg>;
}
