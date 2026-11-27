// ÚNICO lugar com nome, logotipo, cores e dados institucionais. Nome PROVISÓRIO (o nome "Estuda+" foi descartado por conflito de marca).
// Para trocar de marca: editar este arquivo (ou sobrepor via variáveis VITE_BRAND_* no build web).
export interface Brand {
  name: string; shortName: string; tagline: string; provisional: boolean;
  supportEmail: string; legalName: string; domain: string;
  /** Tokens de cor base (roxo/azul/branco). Temas por faixa etária derivam destes. */
  colors: { primary: string; primaryDark: string; secondary: string; accent: string; success: string; warning: string; danger: string; ink: string; surface: string; bg: string };
  /** identificadores técnicos (bundle ids) — alterar antes de publicar nas lojas */
  appIds: { android: string; ios: string };
}

export const brand: Brand = {
  name: 'Plataforma Educacional',
  shortName: 'PE',
  tagline: 'Aprender no seu ritmo',
  provisional: true,
  supportEmail: 'contato@exemplo.invalid',
  legalName: 'A definir',
  domain: 'exemplo.invalid',
  colors: {
    primary: '#6d3df2', primaryDark: '#4b25b8', secondary: '#2f7bff', accent: '#ffb020',
    success: '#16a679', warning: '#f59e0b', danger: '#e5484d', ink: '#1d1640', surface: '#ffffff', bg: '#f6f4ff',
  },
  appIds: { android: 'br.edu.platform', ios: 'br.edu.platform' },
};

/** Logotipo vetorial gerado a partir das cores da marca (troque aqui para mudar o símbolo). */
export function logoSvg(size = 40, b: Brand = brand): string {
  const { primary, secondary, surface } = b.colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48" role="img" aria-label="${b.name}">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${secondary}"/></linearGradient></defs>
<rect width="48" height="48" rx="14" fill="url(#g)"/>
<path d="M14 31 L24 13 L34 31" fill="none" stroke="${surface}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="24" cy="34" r="3" fill="${surface}"/></svg>`;
}

/** CSS custom properties da marca (aplicadas na raiz do app web). */
export function brandCssVars(b: Brand = brand): Record<string, string> {
  return Object.fromEntries(Object.entries(b.colors).map(([k, v]) => [`--brand-${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}`, v]));
}
