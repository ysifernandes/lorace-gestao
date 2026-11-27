import type { ReactNode } from 'react';

/** Ilustrações vetoriais próprias de cada minigame (substituem emojis do sistema).
 *  Todas usam viewBox 160×100, formas arredondadas, brilho suave e sombra de chão. */
const Sh = ({ cx = 80, cy = 90, rx = 38 }: { cx?: number; cy?: number; rx?: number }) => <ellipse cx={cx} cy={cy} rx={rx} ry="5" fill="#000" opacity=".16" />;
const Bg = () => <g fill="#fff"><circle cx="18" cy="22" r="22" opacity=".1" /><circle cx="146" cy="84" r="30" opacity=".1" /><circle cx="132" cy="14" r="3" opacity=".5" /><circle cx="26" cy="74" r="2.5" opacity=".45" /><path d="m146 34 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" opacity=".7" /></g>;
const Gl = ({ d }: { d: string }) => <path d={d} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" />;

const ART: Record<string, () => ReactNode> = {
  pizzaria: () => <>
    <Sh cy={92} rx={44} />
    <path d="M70 56 105.9 52.9A36 36 0 1 1 93.1 28.4Z" fill="#e8963a" />
    <path d="M70 56 105.9 52.9A36 36 0 1 1 93.1 28.4Z" fill="#ffd45e" transform="translate(70 56) scale(.86) translate(-70 -56)" />
    <g fill="#e23c55"><circle cx="52" cy="40" r="5.5" /><circle cx="74" cy="76" r="5.5" /><circle cx="48" cy="66" r="5" /><circle cx="76" cy="38" r="4.5" /><circle cx="90" cy="64" r="5" /></g>
    <g fill="#2f9a57"><circle cx="60" cy="54" r="2.4" /><circle cx="84" cy="52" r="2.4" /><circle cx="64" cy="70" r="2.2" /></g>
    <g transform="translate(15 -12)"><path d="M70 56 105.9 52.9A36 36 0 0 0 93.1 28.4Z" fill="#e8963a" /><path d="M70 56 105.9 52.9A36 36 0 0 0 93.1 28.4Z" fill="#ffd45e" transform="translate(70 56) scale(.84) translate(-70 -56)" /><circle cx="96" cy="44" r="4.5" fill="#e23c55" /><path d="M86 62q2 10 0 16" stroke="#ffd45e" strokeWidth="4" strokeLinecap="round" fill="none" /></g>
    <Gl d="M40 34a34 34 0 0 1 16-14" />
  </>,
  mercado: () => <>
    <Sh cy={92} rx={42} />
    <rect x="86" y="20" width="16" height="38" rx="5" fill="#4aa3f5" /><rect x="86" y="14" width="16" height="9" rx="3" fill="#fff" /><rect x="89" y="32" width="10" height="12" rx="3" fill="#fff" opacity=".85" />
    <path d="M110 58c-2-14 6-22 14-24-1 12-4 20-14 24z" fill="#ff9a2e" /><path d="M121 33c0-5 2-8 5-9" stroke="#2f9a57" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <circle cx="62" cy="44" r="15" fill="#ef4757" /><path d="M62 30c0-6 3-9 8-10" stroke="#7a4a1d" strokeWidth="3" strokeLinecap="round" fill="none" /><path d="M64 31c4-6 10-5 11-4-1 5-6 7-11 4z" fill="#34b25a" /><path d="M52 40a11 11 0 0 1 6-7" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".55" fill="none" />
    <path d="M30 52h100l-10 36a6 6 0 0 1-6 4H46a6 6 0 0 1-6-4z" fill="#f3b24c" /><path d="M30 52h100l-2 7H32z" fill="#e08f27" />
    <g stroke="#c97a1c" strokeWidth="2.5" strokeLinecap="round" opacity=".7"><path d="M52 64l3 22M72 64v24M92 64v24M112 64l-3 22" /></g>
  </>,
  laboratorio: () => <>
    <Sh cy={92} rx={44} />
    <g transform="translate(-34 12) scale(.62)"><path d="M62 70h56l-8 42H70z" fill="#ff6fb6" /><path d="M72 70l4 42M90 70v42M108 70l-4 42" stroke="#fff" strokeWidth="3" opacity=".6" /><ellipse cx="90" cy="68" rx="34" ry="14" fill="#ffe3f0" /><path d="M64 66c0-12 12-18 26-18s26 6 26 18z" fill="#fff0f6" /></g>
    <g transform="translate(66 16) scale(.62)"><path d="M62 70h56l-8 42H70z" fill="#7b4de0" /><path d="M72 70l4 42M90 70v42M108 70l-4 42" stroke="#fff" strokeWidth="3" opacity=".6" /><ellipse cx="90" cy="68" rx="34" ry="14" fill="#c9b4ff" /><path d="M64 66c0-12 12-18 26-18s26 6 26 18z" fill="#e6dbff" /></g>
    <path d="M52 56h56l-8 34a5 5 0 0 1-5 4H65a5 5 0 0 1-5-4z" fill="#ff5fa8" /><path d="M62 56l3 38M80 56v38M98 56l-3 38" stroke="#fff" strokeWidth="3" opacity=".55" />
    <path d="M46 58c-2-9 6-14 14-15 0-9 8-14 20-14s20 5 20 14c8 1 16 6 14 15z" fill="#fff6c8" /><path d="M54 46c4-5 10-6 14-5" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".9" fill="none" />
    <path d="M66 40c2-8 10-12 14-12s12 4 14 12" fill="#ffe99a" /><circle cx="80" cy="22" r="6.5" fill="#e8283f" /><path d="M80 16c1-5 4-7 8-8" stroke="#2f9a57" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    <g fill="#ff7ac0"><circle cx="64" cy="48" r="1.8" /><circle cx="96" cy="46" r="1.8" /><circle cx="80" cy="44" r="1.8" /></g>
  </>,
  frases: () => <>
    <Sh cy={90} rx={46} />
    <g transform="rotate(5 112 58)"><rect x="84" y="30" width="48" height="52" rx="10" fill="#ffd34d" /><circle cx="108" cy="30" r="8" fill="#ffd34d" /><rect x="94" y="48" width="28" height="5" rx="2.5" fill="#d9951a" /><rect x="94" y="60" width="18" height="5" rx="2.5" fill="#d9951a" /></g>
    <g transform="rotate(-5 56 56)"><rect x="26" y="28" width="58" height="52" rx="10" fill="#fff" /><circle cx="84" cy="54" r="8" fill="#fff" /><rect x="36" y="40" width="34" height="6" rx="3" fill="#6a3fd8" /><rect x="36" y="53" width="24" height="6" rx="3" fill="#a98aff" /><rect x="36" y="66" width="30" height="6" rx="3" fill="#a98aff" /></g>
    <path d="m128 20 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#fff" opacity=".9" />
  </>,
  detetive: () => <>
    <Sh cy={92} rx={42} />
    <rect x="22" y="26" width="86" height="52" rx="10" fill="#fff" transform="rotate(-6 65 52)" />
    <g transform="rotate(-6 65 52)"><rect x="32" y="38" width="46" height="5" rx="2.5" fill="#cfc6ee" /><rect x="32" y="66" width="34" height="5" rx="2.5" fill="#cfc6ee" /></g>
    <path d="M114 70l22 20" stroke="#7a3f12" strokeWidth="11" strokeLinecap="round" /><path d="M114 70l10 9" stroke="#b86a28" strokeWidth="4" strokeLinecap="round" />
    <circle cx="90" cy="46" r="27" fill="#fff" opacity=".28" /><circle cx="90" cy="46" r="27" fill="none" stroke="#fff4c4" strokeWidth="8" /><circle cx="90" cy="46" r="27" fill="none" stroke="#c98a14" strokeWidth="2" opacity=".6" />
    <text x="90" y="55" textAnchor="middle" fontSize="26" fontWeight="900" fill="#fff" fontFamily="Nunito, system-ui, sans-serif">caza</text>
    <path d="M70 60q5-5 10 0t10 0 10 0 10 0" stroke="#e8283f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M78 30a22 22 0 0 1 12-5" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity=".8" />
  </>,
  financas: () => <>
    <Sh cy={92} rx={46} />
    <g transform="rotate(-9 70 54)"><rect x="22" y="24" width="90" height="58" rx="11" fill="#0d3b66" /><rect x="22" y="38" width="90" height="11" fill="#06233f" /><rect x="32" y="58" width="20" height="14" rx="3.5" fill="#ffd34d" /><path d="M32 65h20M42 58v14" stroke="#d9951a" strokeWidth="1.6" /><rect x="62" y="62" width="38" height="5" rx="2.5" fill="#fff" opacity=".7" /><rect x="62" y="71" width="22" height="4" rx="2" fill="#fff" opacity=".4" /></g>
    <circle cx="112" cy="62" r="23" fill="#ffc933" /><circle cx="112" cy="62" r="23" fill="none" stroke="#d9951a" strokeWidth="3" /><circle cx="112" cy="62" r="17" fill="none" stroke="#fff3b0" strokeWidth="2" strokeDasharray="3 4" />
    <text x="112" y="71" textAnchor="middle" fontSize="26" fontWeight="900" fill="#a76500" fontFamily="Nunito, system-ui, sans-serif">%</text>
    <path d="M97 48a18 18 0 0 1 12-7" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".7" />
  </>,
  escape: () => <>
    <Sh cy={93} rx={36} />
    <path d="M58 52V38a22 22 0 0 1 44 0v14" fill="none" stroke="#b9bfd9" strokeWidth="11" strokeLinecap="round" /><path d="M58 52V38a22 22 0 0 1 44 0" fill="none" stroke="#e8ecff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
    <rect x="44" y="50" width="72" height="42" rx="11" fill="#ffc933" /><rect x="44" y="50" width="72" height="13" rx="8" fill="#ffe27a" opacity=".6" /><rect x="44" y="82" width="72" height="10" rx="6" fill="#e0a010" opacity=".55" />
    <circle cx="80" cy="68" r="7" fill="#3b2a78" /><path d="M77 70h6l2 12h-10z" fill="#3b2a78" />
    <g fill="#fff"><path d="m132 30 2.2 5.6 5.6 2.2-5.6 2.2-2.2 5.6-2.2-5.6-5.6-2.2 5.6-2.2z" opacity=".9" /><path d="m28 54 1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" opacity=".7" /></g>
  </>,
  placar: () => <>
    <Sh cy={92} rx={46} />
    <rect x="24" y="14" width="112" height="76" rx="14" fill="#fff" opacity=".95" />
    <g stroke="#e6e0f7" strokeWidth="1.8"><path d="M36 38h88M36 56h88M36 74h88" /></g>
    <rect x="40" y="60" width="18" height="22" rx="4" fill="#a98aff" /><rect x="68" y="46" width="18" height="36" rx="4" fill="#ffb02e" /><rect x="96" y="30" width="18" height="52" rx="4" fill="#ec4f5b" />
    <path d="M44 52 76 38 106 22" stroke="#271a5c" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray="1 7" />
    <circle cx="106" cy="22" r="8" fill="#ffd34d" stroke="#e59a00" strokeWidth="2" /><path d="m106 17 1.6 3.4 3.7.5-2.7 2.5.7 3.7-3.3-1.8-3.3 1.8.7-3.7-2.7-2.5 3.7-.5z" fill="#fff" />
  </>,
};

export function GameArt({ id, size, className }: { id: string; size?: number; className?: string }) {
  const body = ART[id] ?? ART.pizzaria!;
  return <svg className={className} viewBox="0 0 160 100" width={size ? size * 1.6 : '100%'} height={size ?? '100%'} role="img" aria-hidden preserveAspectRatio="xMidYMid meet"><Bg />{body()}</svg>;
}
