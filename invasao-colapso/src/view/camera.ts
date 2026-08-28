/**
 * NÍVEIS DE CÂMERA — camada VISUAL, nunca de regra.
 *
 * O jogo tem quatro leituras conceituais do mesmo tabuleiro, definidas na
 * direção de arte oficial:
 *
 *   MUNDO      · o continente inteiro; exércitos como massa
 *   REGIÃO     · uma região e suas fronteiras; pelotões
 *   TERRITÓRIO · um território; soldados individuais
 *   COMBATE    · o confronto; soldados individuais + placa de batalha
 *
 * Nada aqui altera regra: o nível só decide QUANTO detalhe é desenhado.
 * Por isso este arquivo vive fora de `src/game` — a lógica não o conhece.
 */

export type CameraLevel = 'MUNDO' | 'REGIAO' | 'TERRITORIO' | 'COMBATE';

export const CAMERA_LEVELS: CameraLevel[] = ['MUNDO', 'REGIAO', 'TERRITORIO', 'COMBATE'];

/** Escala mínima de cada nível. Abaixo do primeiro limiar, é MUNDO. */
export const CAMERA_THRESHOLDS: { level: CameraLevel; from: number }[] = [
  { level: 'MUNDO', from: 0 },
  { level: 'REGIAO', from: 1.25 },
  { level: 'TERRITORIO', from: 2.0 },
];

/** Escala sugerida ao pedir um nível pelos controles. */
export const CAMERA_SCALE: Record<CameraLevel, number> = {
  MUNDO: 1,
  REGIAO: 1.5,
  TERRITORIO: 2.4,
  COMBATE: 2.8,
};

export const CAMERA_LABEL: Record<CameraLevel, string> = {
  MUNDO: 'Mundo',
  REGIAO: 'Região',
  TERRITORIO: 'Território',
  COMBATE: 'Combate',
};

/**
 * Nível a partir da escala atual. `battle` força COMBATE: quando há batalha
 * declarada, a câmera assume a leitura de combate independentemente do zoom.
 */
export function cameraLevelFor(scale: number, battle = false): CameraLevel {
  if (battle) return 'COMBATE';
  let level: CameraLevel = 'MUNDO';
  for (const threshold of CAMERA_THRESHOLDS) {
    if (scale >= threshold.from) level = threshold.level;
  }
  return level;
}

export interface LevelDetail {
  /** Desenha o nome do território. */
  territoryName: boolean;
  /** Desenha o nome da região como marca d'água. */
  regionName: boolean;
  /** Desenha figuras de soldado sobre o território. */
  figures: boolean;
  /** Máximo de figuras desenhadas antes de virar "+N". */
  maxFigures: number;
  /** Desenha o selo numérico da guarnição. */
  badge: boolean;
  /** Desenha o nome das rotas marítimas. */
  linkNames: boolean;
}

/** Quanto detalhe cada nível desenha. É a tabela de LOD do tabuleiro. */
export const LEVEL_DETAIL: Record<CameraLevel, LevelDetail> = {
  MUNDO: {
    territoryName: false,
    regionName: true,
    figures: false,
    maxFigures: 0,
    badge: true,
    linkNames: false,
  },
  REGIAO: {
    territoryName: true,
    regionName: true,
    figures: true,
    maxFigures: 5,
    badge: true,
    linkNames: false,
  },
  TERRITORIO: {
    territoryName: true,
    regionName: false,
    figures: true,
    maxFigures: 12,
    badge: true,
    linkNames: true,
  },
  COMBATE: {
    territoryName: true,
    regionName: false,
    figures: true,
    maxFigures: 12,
    badge: true,
    linkNames: true,
  },
};
