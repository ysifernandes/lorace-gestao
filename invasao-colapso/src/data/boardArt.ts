import { MAP_HEIGHT, MAP_WIDTH, REGION_SEEDS, SPECIAL_LINKS, TERRITORY_SEEDS } from './territories.seed';
import type { SpecialLinkKind } from './territories.seed';
import type { TerritoryId } from '../game/types/ids';

/**
 * GEOMETRIA DO TABULEIRO — MVP.
 *
 * Os 30 territórios são desenhados como blocos irregulares gerados de forma
 * determinística a partir do id, e a adjacência é desenhada explicitamente
 * como linhas de fronteira. Assim o mapa nunca "mente": quem manda é a malha
 * do motor, e a linha mostra exatamente o que o motor considera vizinho.
 *
 * A direção de arte definitiva entra em etapa própria; aqui a prioridade é
 * legibilidade e verdade da informação.
 */

export const BOARD_WIDTH = MAP_WIDTH;
export const BOARD_HEIGHT = MAP_HEIGHT;

/** Hash determinístico: o mesmo território sempre gera a mesma forma. */
function hash(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface TerritoryShape {
  id: TerritoryId;
  name: string;
  region: string;
  center: { x: number; y: number };
  /** Polígono irregular em coordenadas do tabuleiro. */
  path: string;
  labelOffset: number;
}

const RADIUS = 46;

function buildShape(id: TerritoryId, name: string, region: string, cx: number, cy: number): TerritoryShape {
  const rand = hash(id as string);
  const vertices = 9;
  const points: string[] = [];
  for (let i = 0; i < vertices; i += 1) {
    const angle = (i / vertices) * Math.PI * 2 + rand() * 0.18;
    const radius = RADIUS * (0.76 + rand() * 0.42);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius * 0.86;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return {
    id,
    name,
    region,
    center: { x: cx, y: cy },
    path: `M ${points.join(' L ')} Z`,
    labelOffset: RADIUS * 0.72,
  };
}

export const TERRITORY_SHAPES: TerritoryShape[] = TERRITORY_SEEDS.map((seed) =>
  buildShape(seed.id, seed.name, seed.region, seed.position.x, seed.position.y),
);

export const SHAPE_BY_ID = new Map(TERRITORY_SHAPES.map((shape) => [shape.id as string, shape]));

export interface BoardLink {
  a: TerritoryId;
  b: TerritoryId;
  kind: SpecialLinkKind | 'NORMAL';
  name?: string;
}

const SPECIAL_KEY = new Map(
  SPECIAL_LINKS.map((link) => [[link.a as string, link.b as string].sort().join('::'), link]),
);

/** Todas as fronteiras, sem repetir (A-B e B-A contam uma vez). */
export const BOARD_LINKS: BoardLink[] = (() => {
  const seen = new Set<string>();
  const links: BoardLink[] = [];
  for (const seed of TERRITORY_SEEDS) {
    for (const neighbor of seed.neighbors) {
      const key = [seed.id as string, neighbor as string].sort().join('::');
      if (seen.has(key)) continue;
      seen.add(key);
      const special = SPECIAL_KEY.get(key);
      links.push({
        a: seed.id,
        b: neighbor,
        kind: special?.kind ?? 'NORMAL',
        name: special?.name,
      });
    }
  }
  return links;
})();

export interface RegionShape {
  id: string;
  name: string;
  color: string;
  bonus: number;
  /** Posição do rótulo, acima da massa de terra. */
  label: { x: number; y: number };
  /**
   * Massa de terra da região como união de círculos — um por território.
   * União (e não casco convexo) porque o casco de uma região invadiria as
   * vizinhas: os agrupamentos do mapa de referência se entrelaçam.
   */
  blobs: { x: number; y: number; r: number }[];
}

/** Margem de "costa" em volta de cada território da região. */
const LANDMASS_MARGIN = 24;

/**
 * O rótulo da região precisa cair em espaço vazio: as regiões do mapa de
 * referência se entrelaçam, então o centroide costuma cair em cima de um
 * território de OUTRA região. Testamos posições candidatas em volta do
 * agrupamento e ficamos com a mais livre — evitando também os rótulos das
 * regiões já posicionadas.
 */
function freeLabelSpot(
  centers: { x: number; y: number }[],
  everyCenter: { x: number; y: number }[],
  placed: { x: number; y: number }[],
): { x: number; y: number } {
  const cx = centers.reduce((sum, c) => sum + c.x, 0) / centers.length;
  const cy = centers.reduce((sum, c) => sum + c.y, 0) / centers.length;
  const gap = RADIUS + LANDMASS_MARGIN;
  const candidates: { x: number; y: number }[] = [];
  for (const ring of [1.15, 1.6, 2.1]) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      // Elipse: o mapa é mais largo que alto, o rótulo também.
      const spanX = Math.max(...centers.map((c) => Math.abs(c.x - cx))) + gap;
      const spanY = Math.max(...centers.map((c) => Math.abs(c.y - cy))) + gap;
      candidates.push({
        x: cx + Math.cos(angle) * spanX * ring,
        y: cy + Math.sin(angle) * spanY * ring,
      });
    }
  }
  const bounded = candidates.filter(
    (p) => p.x > 130 && p.x < MAP_WIDTH - 130 && p.y > 36 && p.y < MAP_HEIGHT - 40,
  );
  // Distância mínima entre rótulos: dois nomes de região nunca se encavalam.
  const spaced = bounded.filter((p) =>
    placed.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > 230),
  );
  const inside = spaced.length > 0 ? spaced : bounded;
  let best = inside[0] ?? { x: cx, y: cy - gap };
  let bestScore = -Infinity;
  for (const candidate of inside) {
    const nearTerritory = Math.min(
      ...everyCenter.map((c) => Math.hypot(c.x - candidate.x, c.y - candidate.y)),
    );
    const nearLabel = placed.length
      ? Math.min(...placed.map((c) => Math.hypot(c.x - candidate.x, c.y - candidate.y)))
      : 999;
    // Longe de território, MUITO longe de outro rótulo, perto do próprio grupo.
    const score =
      Math.min(nearTerritory, 190) +
      Math.min(nearLabel, 260) * 1.4 -
      Math.hypot(candidate.x - cx, candidate.y - cy) * 0.35;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

const ALL_CENTERS = TERRITORY_SHAPES.map((s) => s.center);

export const REGION_SHAPES: RegionShape[] = (() => {
  const placed: { x: number; y: number }[] = [];
  return REGION_SEEDS.map((region) => {
    const shapes = region.territoryIds
      .map((id) => SHAPE_BY_ID.get(id as string))
      .filter((s): s is TerritoryShape => Boolean(s));
    const centers = shapes.map((s) => s.center);
    const label = freeLabelSpot(centers, ALL_CENTERS, placed);
    placed.push(label);
    return {
      id: region.id,
      name: region.name,
      color: region.color,
      bonus: region.bonus,
      label,
      blobs: centers.map((c) => ({ x: c.x, y: c.y, r: RADIUS + LANDMASS_MARGIN })),
    };
  });
})();
