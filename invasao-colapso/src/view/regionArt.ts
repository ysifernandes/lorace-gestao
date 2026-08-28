import { REGION_SEEDS } from '../data/territories.seed';

/**
 * IDENTIDADE AMBIENTAL DAS REGIÕES — camada VISUAL.
 *
 * Cada uma das 6 regiões oficiais ganha terreno reconhecível SEM depender do
 * texto: silhueta de fundo, textura e partículas próprias. Nada aqui muda
 * regra; o mapa, os territórios e as fronteiras continuam os mesmos.
 *
 * Os motivos são desenhados por código (placeholder declarado). A arte
 * pintada de cada região está no registro ASSET_NEEDED.
 */

export type TerrainMotif =
  | 'MOUNTAIN'   // cordilheira
  | 'CITY'       // silhueta urbana
  | 'RUINS'      // estruturas quebradas
  | 'WATER'      // costa e mar
  | 'FOREST'     // copas de árvore
  | 'CRATER';    // impacto

export interface RegionArt {
  id: string;
  name: string;
  motif: TerrainMotif;
  /** Cor do terreno (mais dessaturada que a cor de destaque da região). */
  ground: string;
  /** Ambiente: névoa, poeira, brasa. */
  haze: string;
  /** Partículas por região: tipo e densidade. */
  particles: { kind: 'SNOW' | 'ASH' | 'SPORE' | 'EMBER' | 'MIST' | 'NONE'; density: number };
  /** Frase curta de ambientação, para o inspetor. */
  flavor: string;
}

const ART: Record<string, Omit<RegionArt, 'id' | 'name'>> = {
  'fronteira-norte': {
    motif: 'MOUNTAIN',
    ground: '#2a3a4d',
    haze: 'rgba(180, 214, 240, 0.16)',
    particles: { kind: 'SNOW', density: 0.7 },
    flavor: 'Gelo, concreto e vento que não para.',
  },
  'terras-centrais': {
    motif: 'CITY',
    ground: '#33384a',
    haze: 'rgba(226, 200, 150, 0.12)',
    particles: { kind: 'MIST', density: 0.35 },
    flavor: 'O que restou das capitais ainda acende luz à noite.',
  },
  'zona-devastada': {
    motif: 'RUINS',
    ground: '#463527',
    haze: 'rgba(226, 140, 90, 0.16)',
    particles: { kind: 'ASH', density: 0.85 },
    flavor: 'Poeira quente e ferro retorcido até o horizonte.',
  },
  'costa-sombria': {
    motif: 'WATER',
    ground: '#243c4c',
    haze: 'rgba(120, 200, 230, 0.16)',
    particles: { kind: 'MIST', density: 0.6 },
    flavor: 'Maré preta batendo em cascos encalhados.',
  },
  'floresta-corrompida': {
    motif: 'FOREST',
    ground: '#22402f',
    haze: 'rgba(140, 226, 160, 0.14)',
    particles: { kind: 'SPORE', density: 0.75 },
    flavor: 'A mata voltou — e voltou errada.',
  },
  'zona-impacto': {
    motif: 'CRATER',
    ground: '#4a2733',
    haze: 'rgba(255, 120, 120, 0.18)',
    particles: { kind: 'EMBER', density: 0.9 },
    flavor: 'O chão ainda não esfriou onde o céu caiu.',
  },
};

export const REGION_ART: RegionArt[] = REGION_SEEDS.map((region) => ({
  id: region.id,
  name: region.name,
  ...(ART[region.id] ?? {
    motif: 'RUINS',
    ground: '#333a48',
    haze: 'rgba(255,255,255,0.08)',
    particles: { kind: 'NONE', density: 0 },
    flavor: '',
  }),
}));

export const REGION_ART_BY_ID = new Map(REGION_ART.map((art) => [art.id, art]));

/**
 * Silhueta do terreno, em coordenadas locais 0–100 × 0–40.
 * Desenhada atrás dos territórios: dá relevo à região sem competir com eles.
 */
export function motifPath(motif: TerrainMotif): string {
  switch (motif) {
    case 'MOUNTAIN':
      return 'M0 40 L14 14 L24 26 L38 6 L52 28 L64 16 L78 34 L88 22 L100 40 Z';
    case 'CITY':
      return (
        'M0 40 L0 26 L8 26 L8 14 L16 14 L16 30 L26 30 L26 10 L34 10 L34 30 L44 30 ' +
        'L44 20 L54 20 L54 32 L66 32 L66 12 L74 12 L74 32 L86 32 L86 22 L100 22 L100 40 Z'
      );
    case 'RUINS':
      return (
        'M0 40 L0 30 L10 30 L12 18 L18 30 L28 30 L30 22 L36 34 L48 26 L52 34 ' +
        'L62 20 L68 34 L80 28 L84 36 L100 30 L100 40 Z'
      );
    case 'WATER':
      return 'M0 40 L0 30 Q12 24 25 30 T50 30 T75 30 T100 30 L100 40 Z';
    case 'FOREST':
      return (
        'M0 40 L6 24 L12 34 L18 18 L26 34 L32 22 L40 36 L48 20 L56 34 L64 24 ' +
        'L72 36 L80 22 L88 34 L94 26 L100 40 Z'
      );
    case 'CRATER':
      return 'M0 40 Q10 38 20 32 Q34 18 50 16 Q66 18 80 32 Q90 38 100 40 Z';
    default:
      return 'M0 40 L100 40 Z';
  }
}

/**
 * SÍMBOLO DE FACÇÃO NO TERRITÓRIO — acessibilidade.
 *
 * O mapa não pode depender SÓ da cor. Cada facção também tem um formato de
 * marcador diferente, legível em escala de cinza e por quem não distingue
 * as cores entre si.
 */
export type FactionMarker = 'SHIELD' | 'ORB' | 'BIOHAZARD' | 'FANG' | 'RUNE' | 'BLADE' | 'DOT';

export const FACTION_MARKER: Record<string, FactionMarker> = {
  humanos: 'SHIELD',
  alienigenas: 'ORB',
  zumbis: 'BIOHAZARD',
  vampiros: 'FANG',
  magos: 'RUNE',
  goblins: 'BLADE',
  tecnologos: 'DOT',
  remanescentes: 'DOT',
};

/** Caminho do marcador, centrado em (0,0), raio ~7. */
export function markerPath(marker: FactionMarker): string {
  switch (marker) {
    case 'SHIELD':
      return 'M0 -7 L6 -4 L6 2 Q6 6 0 8 Q-6 6 -6 2 L-6 -4 Z';
    case 'ORB':
      return 'M0 -7 A7 7 0 1 1 0 7 A7 7 0 1 1 0 -7 Z';
    case 'BIOHAZARD':
      return 'M0 -7 L4 0 L-4 0 Z M-6 4 L0 2 L-3 8 Z M6 4 L3 8 L0 2 Z';
    case 'FANG':
      return 'M-6 -6 L6 -6 L3 2 L0 7 L-3 2 Z';
    case 'RUNE':
      return 'M0 -8 L7 -2 L4 7 L-4 7 L-7 -2 Z';
    case 'BLADE':
      return 'M0 -8 L3 -1 L8 0 L3 3 L0 8 L-3 3 L-8 0 L-3 -1 Z';
    default:
      return 'M0 -5 A5 5 0 1 1 0 5 A5 5 0 1 1 0 -5 Z';
  }
}
