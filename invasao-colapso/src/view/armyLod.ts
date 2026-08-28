import type { CameraLevel } from './camera';
import { LEVEL_DETAIL } from './camera';

/**
 * LOD DE EXÉRCITO — camada VISUAL.
 *
 * Uma guarnição de 12 soldados não vira o número "12" e nada mais: vira
 * figuras no mapa. Quantas figuras aparecem depende do nível de câmera, e
 * o excedente é resumido em "+N". A contagem real continua vindo do motor.
 */

export interface FigureSlot {
  /** Deslocamento em relação ao centro do território, em unidades do mapa. */
  dx: number;
  dy: number;
  /** Ordem de desenho: quem está mais abaixo aparece à frente. */
  depth: number;
  /** Escala da figura — quem está atrás é ligeiramente menor. */
  scale: number;
}

export interface ArmyLod {
  /** Figuras efetivamente desenhadas. */
  slots: FigureSlot[];
  /** Soldados que não couberam nas figuras (mostrados como "+N"). */
  overflow: number;
  /** true quando o nível não desenha figuras (só o selo numérico). */
  massOnly: boolean;
}

/** Formação em fileiras: 4 por fileira, centralizada, com profundidade. */
const COLUMN_SPACING = 13;
const ROW_SPACING = 11;
const PER_ROW = 4;

export function armyLod(troops: number, level: CameraLevel): ArmyLod {
  const detail = LEVEL_DETAIL[level];
  if (!detail.figures || troops <= 0) {
    return { slots: [], overflow: 0, massOnly: !detail.figures && troops > 0 };
  }
  const drawn = Math.min(troops, detail.maxFigures);
  const slots: FigureSlot[] = [];
  for (let i = 0; i < drawn; i += 1) {
    const row = Math.floor(i / PER_ROW);
    const inRow = i % PER_ROW;
    const rowSize = Math.min(PER_ROW, drawn - row * PER_ROW);
    const dx = (inRow - (rowSize - 1) / 2) * COLUMN_SPACING;
    const dy = row * ROW_SPACING - 4;
    slots.push({ dx, dy, depth: row, scale: 1 - row * 0.06 });
  }
  return { slots, overflow: troops - drawn, massOnly: false };
}
