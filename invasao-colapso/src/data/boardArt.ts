import { TERRITORY_IDS } from './territories.seed';
import type { TerritoryId } from '../game/types/ids';

/**
 * ARTE DO TABULEIRO — geometria das regiões.
 *
 * Isto é dado de APRESENTAÇÃO, não regra: o motor nunca importa este arquivo.
 * As regiões são montadas a partir de ARESTAS COMPARTILHADAS — cada fronteira
 * é desenhada uma única vez e reaproveitada (à frente ou invertida) pelos dois
 * territórios que a dividem. Isso garante que o mapa feche sem frestas nem
 * sobreposição, mesmo com contornos irregulares.
 */

export const BOARD_WIDTH = 1400;
export const BOARD_HEIGHT = 820;

type Point = readonly [number, number];
/** Deslocamento perpendicular em uma fração do comprimento da aresta. */
type Kink = { t: number; o: number };

// --- Vértices do esqueleto ------------------------------------------------
// Colunas A..E (oeste → leste), linhas 1..4 (norte → sul), com irregularidade.
const PA1: Point = [58, 128];
const PB1: Point = [392, 58];
const PC1: Point = [690, 104];
const PD1: Point = [1010, 48];
const PE1: Point = [1342, 132];

const PA2: Point = [104, 360];
const PB2: Point = [298, 296];
const PC2: Point = [658, 348];
const PD2: Point = [1076, 282];
const PE2: Point = [1356, 384];

const PA3: Point = [56, 592];
const PB3: Point = [378, 556];
const PD3: Point = [1002, 570];
const PE3: Point = [1332, 612];

/**
 * O canto onde quatro regiões se encontrariam é "cortado" em dois vértices.
 * A aresta X→Y faz Distrito Central e Região Industrial dividirem fronteira,
 * enquanto Zona Sul e Ruínas do Leste deixam de se tocar — exatamente o que
 * o grafo de adjacência do motor exige.
 */
const X: Point = [712, 530];
const Y: Point = [590, 656];

const PA4: Point = [156, 764];
const PB4: Point = [438, 796];
const PC4: Point = [738, 752];
const PD4: Point = [1046, 794];
const PE4: Point = [1288, 738];

/** Gera a polilinha de uma aresta aplicando desvios perpendiculares. */
function edge(from: Point, to: Point, kinks: Kink[] = []): Point[] {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  // Normal unitária (perpendicular à aresta).
  const nx = -dy / length;
  const ny = dx / length;
  const points: Point[] = [from];
  for (const { t, o } of kinks) {
    points.push([x1 + dx * t + nx * o, y1 + dy * t + ny * o]);
  }
  points.push(to);
  return points;
}

// --- Arestas ---------------------------------------------------------------
// Litoral / borda externa: recorte forte, leitura de terreno devastado.
const E_N1 = edge(PA1, PB1, [{ t: 0.22, o: 34 }, { t: 0.48, o: -26 }, { t: 0.76, o: 30 }]);
const E_N2 = edge(PB1, PC1, [{ t: 0.28, o: -32 }, { t: 0.6, o: 26 }, { t: 0.84, o: -18 }]);
const E_N3 = edge(PC1, PD1, [{ t: 0.25, o: 30 }, { t: 0.55, o: -34 }, { t: 0.8, o: 22 }]);
const E_N4 = edge(PD1, PE1, [{ t: 0.3, o: -28 }, { t: 0.62, o: 32 }, { t: 0.86, o: -20 }]);

const E_E1 = edge(PE1, PE2, [{ t: 0.3, o: -30 }, { t: 0.66, o: 24 }]);
const E_E2 = edge(PE2, PE3, [{ t: 0.28, o: 26 }, { t: 0.62, o: -32 }, { t: 0.85, o: 18 }]);
const E_E3 = edge(PE3, PE4, [{ t: 0.35, o: -28 }, { t: 0.72, o: 22 }]);

const E_S4 = edge(PE4, PD4, [{ t: 0.3, o: -24 }, { t: 0.68, o: 30 }]);
const E_S3 = edge(PD4, PC4, [{ t: 0.26, o: 28 }, { t: 0.58, o: -26 }, { t: 0.82, o: 20 }]);
const E_S2 = edge(PC4, PB4, [{ t: 0.32, o: -30 }, { t: 0.7, o: 26 }]);
const E_S1 = edge(PB4, PA4, [{ t: 0.35, o: 30 }, { t: 0.72, o: -22 }]);

const E_W3 = edge(PA4, PA3, [{ t: 0.3, o: 32 }, { t: 0.68, o: -26 }]);
const E_W2 = edge(PA3, PA2, [{ t: 0.4, o: -30 }, { t: 0.78, o: 20 }]);
const E_W1 = edge(PA2, PA1, [{ t: 0.32, o: 28 }, { t: 0.7, o: -24 }]);

// Fronteiras internas — linha 1|2. Quebras marcadas: são falhas do terreno.
const E_H1_1 = edge(PA2, PB2, [{ t: 0.3, o: -28 }, { t: 0.65, o: 24 }]);
const E_H1_2 = edge(PB2, PC2, [{ t: 0.26, o: 30 }, { t: 0.55, o: -24 }, { t: 0.82, o: 18 }]);
const E_H1_3 = edge(PC2, PD2, [{ t: 0.28, o: -32 }, { t: 0.6, o: 26 }, { t: 0.85, o: -16 }]);
const E_H1_4 = edge(PD2, PE2, [{ t: 0.38, o: 28 }, { t: 0.74, o: -20 }]);

// Fronteiras internas — linha 2|3.
const E_H2_1 = edge(PA3, PB3, [{ t: 0.3, o: 30 }, { t: 0.66, o: -26 }]);
const E_H2_2 = edge(PB3, Y, [{ t: 0.35, o: -26 }, { t: 0.72, o: 20 }]);
const E_H2_3 = edge(X, PD3, [{ t: 0.28, o: 30 }, { t: 0.62, o: -24 }, { t: 0.86, o: 16 }]);
const E_H2_4 = edge(PD3, PE3, [{ t: 0.4, o: -26 }, { t: 0.78, o: 18 }]);

// Fronteiras internas — coluna A|B.
const E_V1_1 = edge(PB1, PB2, [{ t: 0.35, o: 30 }, { t: 0.72, o: -22 }]);
const E_V1_2 = edge(PB2, PB3, [{ t: 0.3, o: -30 }, { t: 0.65, o: 26 }]);
const E_V1_3 = edge(PB3, PB4, [{ t: 0.38, o: 28 }, { t: 0.75, o: -20 }]);

// Fronteiras internas — coluna B|C.
const E_V2_1 = edge(PC1, PC2, [{ t: 0.32, o: -30 }, { t: 0.7, o: 24 }]);
const E_V2_2 = edge(PC2, X, [{ t: 0.36, o: 28 }, { t: 0.74, o: -22 }]);
const E_V2_3 = edge(Y, PC4, [{ t: 0.4, o: -26 }, { t: 0.78, o: 20 }]);

// Fronteiras internas — coluna C|D.
const E_V3_1 = edge(PD1, PD2, [{ t: 0.34, o: 30 }, { t: 0.72, o: -24 }]);
const E_V3_2 = edge(PD2, PD3, [{ t: 0.3, o: -32 }, { t: 0.66, o: 26 }]);
const E_V3_3 = edge(PD3, PD4, [{ t: 0.4, o: 26 }, { t: 0.76, o: -20 }]);

/** A aresta que faz Distrito Central e Região Industrial serem vizinhos. */
const E_DIAG = edge(X, Y, [{ t: 0.5, o: -14 }]);

// --- Montagem das regiões --------------------------------------------------
type EdgeRef = { points: Point[]; reversed?: boolean };
const fwd = (points: Point[]): EdgeRef => ({ points });
const rev = (points: Point[]): EdgeRef => ({ points, reversed: true });

function buildPath(refs: EdgeRef[]): string {
  const vertices: Point[] = [];
  for (const ref of refs) {
    const list = ref.reversed ? [...ref.points].reverse() : ref.points;
    // O primeiro ponto repete o último da aresta anterior: descarta.
    for (const point of vertices.length === 0 ? list : list.slice(1)) {
      vertices.push(point);
    }
  }
  const [start, ...rest] = vertices;
  const body = rest.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return `M ${start[0].toFixed(1)} ${start[1].toFixed(1)} ${body} Z`;
}

/** Centro visual da região (média dos vértices), usado pelo marcador de tropas. */
function anchorOf(path: string): { x: number; y: number } {
  const numbers = path.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  let sx = 0;
  let sy = 0;
  let count = 0;
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    sx += numbers[i];
    sy += numbers[i + 1];
    count += 1;
  }
  return { x: sx / count, y: sy / count };
}

export interface RegionArt {
  id: TerritoryId;
  path: string;
  anchor: { x: number; y: number };
  /** Rótulo curto do bioma, escrito no mapa em corpo pequeno. */
  terrain: string;
}

function region(
  id: TerritoryId,
  refs: EdgeRef[],
  terrain: string,
  anchorOverride?: { x: number; y: number },
): RegionArt {
  const path = buildPath(refs);
  return { id, path, anchor: anchorOverride ?? anchorOf(path), terrain };
}

export const BOARD_REGIONS: RegionArt[] = [
  region(TERRITORY_IDS.setorMilitar, [fwd(E_N1), fwd(E_V1_1), rev(E_H1_1), fwd(E_W1)], 'ZONA MILITAR'),
  region(TERRITORY_IDS.zonaNorte, [fwd(E_N2), fwd(E_V2_1), rev(E_H1_2), rev(E_V1_1)], 'PERÍMETRO'),
  region(TERRITORY_IDS.valeCinzento, [fwd(E_N3), fwd(E_V3_1), rev(E_H1_3), rev(E_V2_1)], 'TERRAS ALTAS'),
  region(TERRITORY_IDS.complexoCientifico, [fwd(E_N4), fwd(E_E1), rev(E_H1_4), rev(E_V3_1)], 'TERRAS ALTAS'),

  region(TERRITORY_IDS.baseOcidental, [fwd(E_H1_1), fwd(E_V1_2), rev(E_H2_1), fwd(E_W2)], 'ZONA MILITAR'),
  region(
    TERRITORY_IDS.distritoCentral,
    [fwd(E_H1_2), fwd(E_V2_2), fwd(E_DIAG), rev(E_H2_2), rev(E_V1_2)],
    'PERÍMETRO',
    { x: 470, y: 432 },
  ),
  region(TERRITORY_IDS.ruinasLeste, [fwd(E_H1_3), fwd(E_V3_2), rev(E_H2_3), rev(E_V2_2)], 'ZONA MORTA'),
  region(TERRITORY_IDS.zonaContaminada, [fwd(E_H1_4), fwd(E_E2), rev(E_H2_4), rev(E_V3_2)], 'ZONA MORTA'),

  region(TERRITORY_IDS.portoAbandonado, [fwd(E_H2_1), fwd(E_V1_3), fwd(E_S1), fwd(E_W3)], 'CINTURÃO'),
  region(TERRITORY_IDS.zonaSul, [fwd(E_H2_2), fwd(E_V2_3), fwd(E_S2), rev(E_V1_3)], 'PERÍMETRO'),
  region(
    TERRITORY_IDS.regiaoIndustrial,
    [rev(E_DIAG), fwd(E_H2_3), fwd(E_V3_3), fwd(E_S3), rev(E_V2_3)],
    'CINTURÃO',
    { x: 858, y: 668 },
  ),
  region(TERRITORY_IDS.fronteiraVermelha, [fwd(E_H2_4), fwd(E_E3), fwd(E_S4), rev(E_V3_3)], 'ZONA MORTA'),
];

export const REGION_BY_ID = new Map<string, RegionArt>(
  BOARD_REGIONS.map((r) => [r.id as string, r]),
);
