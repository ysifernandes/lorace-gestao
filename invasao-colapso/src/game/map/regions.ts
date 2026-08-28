import type { GameState } from '../types/game.types';
import type { PlayerId, TerritoryId } from '../types/ids';
import { REGION_SEEDS, SPECIAL_LINKS } from '../../data/territories.seed';
import type { RegionSeed, SpecialLink, SpecialLinkKind } from '../../data/territories.seed';

/**
 * Regiões e conexões especiais. Vive no motor: nenhum componente de UI
 * decide bônus de região nem se uma fronteira é um Poço.
 */

export function listRegions(): RegionSeed[] {
  return REGION_SEEDS;
}

export function getRegion(id: string): RegionSeed {
  const region = REGION_SEEDS.find((r) => r.id === id);
  if (!region) throw new Error(`Região desconhecida: ${id}`);
  return region;
}

export function regionOfTerritory(id: TerritoryId): RegionSeed | undefined {
  return REGION_SEEDS.find((r) => r.territoryIds.includes(id));
}

/** Regiões inteiramente controladas pelo jogador. */
export function completedRegions(state: GameState, player: PlayerId): RegionSeed[] {
  return REGION_SEEDS.filter((region) =>
    region.territoryIds.every((id) => state.territories[id as string]?.controllerId === player),
  );
}

/** Soma dos bônus de região completa, já aplicando o modificador da facção. */
export function regionBonusFor(state: GameState, player: PlayerId, multiplier = 1): number {
  const raw = completedRegions(state, player).reduce((sum, r) => sum + r.bonus, 0);
  return multiplier === 1 ? raw : Math.floor(raw * multiplier);
}

// --- Conexões especiais -----------------------------------------------------

function linkKey(a: TerritoryId, b: TerritoryId): string {
  return [a as string, b as string].sort().join('::');
}

const SPECIAL_BY_KEY = new Map<string, SpecialLink>(
  SPECIAL_LINKS.map((link) => [linkKey(link.a, link.b), link]),
);

export function listSpecialLinks(): SpecialLink[] {
  return SPECIAL_LINKS;
}

export function specialLinkBetween(a: TerritoryId, b: TerritoryId): SpecialLink | undefined {
  return SPECIAL_BY_KEY.get(linkKey(a, b));
}

export function isLinkKind(a: TerritoryId, b: TerritoryId, kind: SpecialLinkKind): boolean {
  return specialLinkBetween(a, b)?.kind === kind;
}

/**
 * Conexões desativadas temporariamente (Evento do Colapso, Reroteamento).
 * Guardadas no estado como chaves normalizadas.
 */
export function isLinkDisabled(state: GameState, a: TerritoryId, b: TerritoryId): boolean {
  return state.disabledLinks.some((entry) => entry.key === linkKey(a, b));
}

export function disableLink(
  draft: GameState,
  a: TerritoryId,
  b: TerritoryId,
  untilRound: number,
): void {
  const key = linkKey(a, b);
  const existing = draft.disabledLinks.find((entry) => entry.key === key);
  if (existing) {
    existing.untilRound = Math.max(existing.untilRound, untilRound);
    return;
  }
  draft.disabledLinks.push({ key, a, b, untilRound });
}

/** Remove as desativações cuja duração terminou. Chamado no início de cada rodada. */
export function expireDisabledLinks(draft: GameState): SpecialLink[] {
  const restored: SpecialLink[] = [];
  draft.disabledLinks = draft.disabledLinks.filter((entry) => {
    if (entry.untilRound > draft.turn.number) return true;
    const link = SPECIAL_BY_KEY.get(entry.key);
    if (link) restored.push(link);
    return false;
  });
  return restored;
}

/** Territórios que fazem parte de uma região, no estado atual. */
export function territoriesOfRegion(state: GameState, regionId: string): TerritoryId[] {
  return getRegion(regionId).territoryIds.filter((id) => Boolean(state.territories[id as string]));
}
