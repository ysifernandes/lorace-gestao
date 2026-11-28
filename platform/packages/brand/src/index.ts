// ÚNICO lugar com nome, logotipo, mascote (paleta), cores e dados institucionais.
// "Aprendix" é nome PROVISÓRIO: depende de pesquisa de disponibilidade comercial e registro de marca. Para trocar de marca, edite este arquivo
// (ou sobreponha via VITE_BRAND_NAME no build web); nenhum outro arquivo deve conter o nome da marca.
export interface Brand {
  name: string; shortName: string; tagline: string; provisional: boolean; trademarkNote: string;
  supportEmail: string; legalName: string; domain: string;
  colors: Record<'primary' | 'primaryDark' | 'primaryDeep' | 'secondary' | 'accent' | 'accentInk' | 'success' | 'warning' | 'danger' | 'ink' | 'surface' | 'bg' | 'teal' | 'tealInk' | 'cream', string>;
  /** cores de disciplinas (cartões coloridos da referência) */
  subjects: Record<'portugues' | 'matematica' | 'ciencias' | 'historia' | 'geografia' | 'ingles', { bg: string; ink: string; accent: string }>;
  /** paleta do mascote (axolote) */
  mascot: { body: string; bodyLight: string; belly: string; gills: string; gillsLight: string; cheek: string; ink: string; gold: string; book: string };
  appIds: { android: string; ios: string };
}

export const brand: Brand = {
  name: 'Aprendix', shortName: 'Ax', tagline: 'Aprenda no seu ritmo', provisional: true,
  trademarkNote: 'Nome provisório: disponibilidade comercial e registro de marca ainda não pesquisados.',
  supportEmail: 'contato@exemplo.invalid', legalName: 'A definir', domain: 'exemplo.invalid',
  colors: {
    primary: '#6a3fd8', primaryDark: '#5632c2', primaryDeep: '#3f2399', secondary: '#4d82f0', accent: '#ffc93c', accentInk: '#4a2b00',
    success: '#1fb765', warning: '#f7b928', danger: '#ec4f5b', ink: '#271a5c', surface: '#ffffff', bg: '#ece8fb', teal: '#cdf3ee', tealInk: '#0b4a52', cream: '#fff0c4',
  },
  subjects: {
    portugues: { bg: '#ffd5dc', ink: '#5a1730', accent: '#e8475f' },
    matematica: { bg: '#cfe3ff', ink: '#12306b', accent: '#3b82f6' },
    ciencias: { bg: '#cdeec9', ink: '#12461f', accent: '#34b25a' },
    historia: { bg: '#ffdea8', ink: '#5c3500', accent: '#f09a1c' },
    geografia: { bg: '#c9f1ee', ink: '#0b4a52', accent: '#12968f' },
    ingles: { bg: '#e6d9ff', ink: '#3b1d8f', accent: '#7b4de0' },
  },
  mascot: { body: '#9b6dff', bodyLight: '#b894ff', belly: '#e1d2ff', gills: '#ff6fb6', gillsLight: '#ffa6d3', cheek: '#ff8fc4', ink: '#2a1a5e', gold: '#ffc93c', book: '#4b2fb8' },
  appIds: { android: 'br.edu.platform', ios: 'br.edu.platform' },
};

/** Símbolo do logotipo: livro aberto com brilhos (cores vêm da marca). */
export function logoSvg(size = 40, b: Brand = brand): string {
  const c = b.colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${b.name}">
<path d="M6 22c9-3 18-2 26 4 8-6 17-7 26-4v30c-9-3-18-2-26 4-8-6-17-7-26-4z" fill="#fff"/>
<path d="M32 26v34" stroke="${c.primaryDark}" stroke-width="2.5" stroke-linecap="round"/>
<path d="M10 28c7-2 13-1 19 3M10 36c7-2 13-1 19 3M54 28c-7-2-13-1-19 3M54 36c-7-2-13-1-19 3" stroke="${c.secondary}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".55"/>
<path d="M32 4l2.6 6.2L41 12l-6.4 1.8L32 20l-2.6-6.2L23 12l6.4-1.8z" fill="${c.accent}"/><path d="M50 8l1.4 3.2L55 12.4l-3.6 1L50 17l-1.4-3.6-3.6-1 3.6-1.2zM14 10l1.1 2.6 2.9.8-2.9.9L14 17l-1.1-2.7-2.9-.9 2.9-.8z" fill="${c.accent}"/></svg>`;
}
export function brandCssVars(b: Brand = brand): Record<string, string> {
  const kebab = (k: string) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
  const out: Record<string, string> = Object.fromEntries(Object.entries(b.colors).map(([k, v]) => [`--brand-${kebab(k)}`, v]));
  for (const [s, v] of Object.entries(b.subjects)) { out[`--subj-${s}-bg`] = v.bg; out[`--subj-${s}-ink`] = v.ink; out[`--subj-${s}-accent`] = v.accent; }
  return out;
}
