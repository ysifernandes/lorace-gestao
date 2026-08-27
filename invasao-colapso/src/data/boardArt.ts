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
  /** Caixa envolvente para o rótulo da região. */
  label: { x: number; y: number };
}

export const REGION_SHAPES: RegionShape[] = REGION_SEEDS.map((region) => {
  const centers = region.territoryIds
    .map((id) => SHAPE_BY_ID.get(id as string))
    .filter((s): s is TerritoryShape => Boolean(s))
    .map((s) => s.center);
  // Centro do agrupamento: o nome da região funciona como marca d'água.
  const x = centers.reduce((sum, c) => sum + c.x, 0) / centers.length;
  const y = centers.reduce((sum, c) => sum + c.y, 0) / centers.length;
  return {
    id: region.id,
    name: region.name,
    color: region.color,
    bonus: region.bonus,
    label: { x, y },
  };
});
