/**
 * CATÁLOGO DE ÁUDIO.
 *
 * Cada som declara o arquivo definitivo que ainda não existe (`asset`) e um
 * PLACEHOLDER sintetizado, para o jogo não ficar mudo enquanto a trilha não
 * chega. Todo `asset` daqui entra no registro ASSET_NEEDED.
 *
 * Nada aqui toca sozinho: quem dispara é a camada visual.
 */

export type SfxCategory =
  | 'UI'
  | 'AMBIENTE'
  | 'COMBATE'
  | 'DADOS'
  | 'CARTAS'
  | 'FACCOES'
  | 'COLAPSO'
  | 'VITORIA';

/** Placeholder sintetizado: um envelope simples, sem sample. */
export interface SynthSpec {
  /** Forma de onda base. */
  wave: OscillatorType;
  /** Frequência inicial (Hz). */
  from: number;
  /** Frequência final (Hz) — varredura. */
  to: number;
  /** Duração em segundos. */
  duration: number;
  /** Volume relativo (0–1). */
  gain: number;
  /** Ruído somado, para impactos. */
  noise?: number;
}

export interface SfxDefinition {
  id: string;
  category: SfxCategory;
  description: string;
  /** Arquivo definitivo — ainda NÃO existe. */
  asset: string;
  /** Som provisório, gerado por síntese. */
  synth: SynthSpec;
  /** Variação aleatória de altura, para não repetir idêntico. */
  pitchJitter?: number;
}

export const SFX: Record<string, SfxDefinition> = {
  'ui.click': {
    id: 'ui.click',
    category: 'UI',
    description: 'Toque em botão',
    asset: 'audio/ui/click.ogg',
    synth: { wave: 'triangle', from: 620, to: 460, duration: 0.06, gain: 0.16 },
  },
  'ui.select': {
    id: 'ui.select',
    category: 'UI',
    description: 'Seleção de território',
    asset: 'audio/ui/select.ogg',
    synth: { wave: 'sine', from: 380, to: 520, duration: 0.09, gain: 0.14 },
  },
  'ui.denied': {
    id: 'ui.denied',
    category: 'UI',
    description: 'Ação inválida',
    asset: 'audio/ui/denied.ogg',
    synth: { wave: 'square', from: 200, to: 120, duration: 0.14, gain: 0.12 },
  },
  'dice.enter': {
    id: 'dice.enter',
    category: 'DADOS',
    description: 'Dado entrando na arena',
    asset: 'audio/dice/enter.ogg',
    synth: { wave: 'sine', from: 240, to: 180, duration: 0.1, gain: 0.1, noise: 0.3 },
    pitchJitter: 0.18,
  },
  'dice.impact': {
    id: 'dice.impact',
    category: 'DADOS',
    description: 'Dado batendo na mesa',
    asset: 'audio/dice/impact_01.ogg',
    synth: { wave: 'triangle', from: 160, to: 70, duration: 0.11, gain: 0.2, noise: 0.55 },
    pitchJitter: 0.22,
  },
  'dice.bounce': {
    id: 'dice.bounce',
    category: 'DADOS',
    description: 'Quique do dado',
    asset: 'audio/dice/bounce_01.ogg',
    synth: { wave: 'triangle', from: 220, to: 110, duration: 0.07, gain: 0.12, noise: 0.4 },
    pitchJitter: 0.3,
  },
  'dice.settle': {
    id: 'dice.settle',
    category: 'DADOS',
    description: 'Dado parando',
    asset: 'audio/dice/settle.ogg',
    synth: { wave: 'sine', from: 300, to: 240, duration: 0.12, gain: 0.1 },
    pitchJitter: 0.15,
  },
  'combat.hit': {
    id: 'combat.hit',
    category: 'COMBATE',
    description: 'Comparação vencida',
    asset: 'audio/combat/hit.ogg',
    synth: { wave: 'sawtooth', from: 300, to: 140, duration: 0.13, gain: 0.15, noise: 0.25 },
  },
  'combat.conquest': {
    id: 'combat.conquest',
    category: 'COMBATE',
    description: 'Território conquistado',
    asset: 'audio/combat/conquest.ogg',
    synth: { wave: 'triangle', from: 320, to: 640, duration: 0.34, gain: 0.18 },
  },
  'card.open': {
    id: 'card.open',
    category: 'CARTAS',
    description: 'Carta ampliada',
    asset: 'audio/cards/open.ogg',
    synth: { wave: 'sine', from: 500, to: 760, duration: 0.14, gain: 0.12 },
  },
  'card.play': {
    id: 'card.play',
    category: 'CARTAS',
    description: 'Carta jogada',
    asset: 'audio/cards/play.ogg',
    synth: { wave: 'triangle', from: 420, to: 900, duration: 0.22, gain: 0.16 },
  },
  'collapse.siren': {
    id: 'collapse.siren',
    category: 'COLAPSO',
    description: 'Sirene de alerta do Colapso',
    asset: 'audio/collapse/siren.ogg',
    synth: { wave: 'sawtooth', from: 440, to: 220, duration: 1.1, gain: 0.16 },
  },
  'collapse.impact': {
    id: 'collapse.impact',
    category: 'COLAPSO',
    description: 'Revelação do evento',
    asset: 'audio/collapse/impact.ogg',
    synth: { wave: 'sine', from: 120, to: 42, duration: 0.6, gain: 0.24, noise: 0.5 },
  },
  'turn.start': {
    id: 'turn.start',
    category: 'AMBIENTE',
    description: 'Começo do seu turno',
    asset: 'audio/ambient/turn_start.ogg',
    synth: { wave: 'sine', from: 300, to: 450, duration: 0.28, gain: 0.13 },
  },
  'victory': {
    id: 'victory',
    category: 'VITORIA',
    description: 'Fim de partida',
    asset: 'audio/victory/fanfare.ogg',
    synth: { wave: 'triangle', from: 380, to: 820, duration: 0.7, gain: 0.2 },
  },
};

export type SfxId = keyof typeof SFX;

/** Linhas ASSET_NEEDED do áudio, para o relatório e o painel DEV. */
export function audioAssetsNeeded(): { file: string; purpose: string }[] {
  return Object.values(SFX).map((sfx) => ({
    file: sfx.asset,
    purpose: `${sfx.category} · ${sfx.description}`,
  }));
}
