import type { GameState, PlayerMission } from '../types/game.types';
import type { PlayerId } from '../types/ids';
import type { Rng } from '../rng/rng';
import { defaultRng, shuffle } from '../rng/rng';
import { MISSION_SEEDS, FALLBACK_MISSION_ID } from '../../data/missions.seed';
import type { MissionCondition, MissionDefinition } from '../../data/missions.seed';
import { TERRITORY_SEEDS } from '../../data/territories.seed';
import { completedRegions, getRegion, listRegions, listSpecialLinks, regionOfTerritory } from '../map/regions';
import { territoriesOf } from '../map/territory';

/**
 * MOTOR DE MISSÕES SECRETAS.
 *
 * Um único verificador genérico. Adicionar missão nova = adicionar um objeto
 * em `missions.seed.ts`; nenhum `if` por missão vive fora deste arquivo.
 */

const BY_ID = new Map(MISSION_SEEDS.map((m) => [m.id, m]));

export function getMission(id: string): MissionDefinition {
  const mission = BY_ID.get(id);
  if (!mission) throw new Error(`Missão desconhecida: ${id}`);
  return mission;
}

export function listMissions(): MissionDefinition[] {
  return MISSION_SEEDS;
}

/** Missão efetivamente valendo para o jogador (considera a substituição). */
export function effectiveMissionOf(state: GameState, playerId: PlayerId): MissionDefinition | null {
  const entry = state.missions[playerId as string];
  if (!entry) return null;
  return getMission(entry.replacedBy ?? entry.missionId);
}

// ---------------------------------------------------------------------------
// Validade: uma missão impossível NUNCA pode ser sorteada.
// ---------------------------------------------------------------------------

export interface MissionValidityContext {
  /** Facções presentes na partida. */
  factionIds: string[];
  /** Facção do jogador que receberia a missão. */
  ownFactionId: string;
  playerCount: number;
}

/**
 * Uma missão é válida para este jogador nesta partida?
 * Regra genérica — não há checagem específica por missão.
 */
export function isMissionValid(
  mission: MissionDefinition,
  context: MissionValidityContext,
): boolean {
  const c = mission.condition;
  switch (c.type) {
    case 'ELIMINATE_FACTION':
      // A facção alvo precisa estar jogando, e não pode ser a sua.
      if (c.factionId === context.ownFactionId) return false;
      return context.factionIds.includes(c.factionId as string);
    case 'ELIMINATE_ANY':
      // Precisa existir gente suficiente para eliminar.
      return context.playerCount - 1 >= c.count;
    case 'ELIMINATE_NEIGHBOR_SEAT':
      return context.playerCount >= 2;
    case 'MOST_TERRITORIES_AT_ROUND':
      return context.playerCount >= 2;
    default:
      return true;
  }
}

export interface MissionDealResult {
  assignments: Record<string, PlayerMission>;
  /** Missões descartadas por serem impossíveis nesta partida. */
  discarded: string[];
}

/**
 * Carrega, filtra, embaralha e entrega 1 missão por jogador.
 * Nenhuma missão é gerada na hora: todas são objetos definidos no jogo.
 */
export function dealMissions(
  players: { id: PlayerId; factionId: string }[],
  rng: Rng = defaultRng,
): MissionDealResult {
  const factionIds = players.map((p) => p.factionId);
  const assignments: Record<string, PlayerMission> = {};
  const discarded = new Set<string>();
  const pool = shuffle(MISSION_SEEDS.map((m) => m.id), rng);
  const taken = new Set<string>();

  for (const player of players) {
    const context: MissionValidityContext = {
      factionIds,
      ownFactionId: player.factionId,
      playerCount: players.length,
    };
    let chosen: string | null = null;
    for (const candidate of pool) {
      if (taken.has(candidate)) continue;
      const mission = getMission(candidate);
      if (!isMissionValid(mission, context)) {
        discarded.add(candidate);
        continue;
      }
      chosen = candidate;
      break;
    }
    // Se o filtro esgotar o baralho, a missão de reserva sempre é possível.
    const missionId = chosen ?? FALLBACK_MISSION_ID;
    taken.add(missionId);
    assignments[player.id as string] = {
      missionId,
      playerId: player.id,
      completed: false,
      revealed: false,
      tracking: { conquestRounds: [], regionsTouched: [], holdRounds: 0, collapseSurvived: 0 },
    };
  }

  return { assignments, discarded: [...discarded] };
}

// ---------------------------------------------------------------------------
// Verificação
// ---------------------------------------------------------------------------

const POI_IDS = TERRITORY_SEEDS.filter((t) => t.poi).map((t) => t.id);
const POCO_LINKS = listSpecialLinks().filter((l) => l.kind === 'MARITIMA');

/** Regiões que não fazem fronteira entre si (pré-computado do mapa). */
const NON_ADJACENT_REGION_PAIRS: [string, string][] = (() => {
  const regions = listRegions();
  const pairs: [string, string][] = [];
  for (let i = 0; i < regions.length; i += 1) {
    for (let j = i + 1; j < regions.length; j += 1) {
      const a = regions[i];
      const b = regions[j];
      const touches = a.territoryIds.some((tid) => {
        const seed = TERRITORY_SEEDS.find((t) => t.id === tid);
        return seed?.neighbors.some((n) => b.territoryIds.includes(n));
      });
      if (!touches) pairs.push([a.id, b.id]);
    }
  }
  return pairs;
})();

export interface MissionCheck {
  completed: boolean;
  progress: string;
}

function eliminatedFactionIds(state: GameState): string[] {
  return Object.values(state.players)
    .filter((p) => p.status === 'ELIMINATED')
    .map((p) => p.factionId as string);
}

/** Verificador genérico. Só ele conhece as condições. */
export function checkMission(state: GameState, playerId: PlayerId): MissionCheck {
  const entry = state.missions[playerId as string];
  const mission = effectiveMissionOf(state, playerId);
  if (!entry || !mission) return { completed: false, progress: '—' };

  const owned = territoriesOf(state, playerId);
  const c: MissionCondition = mission.condition;

  switch (c.type) {
    case 'TERRITORY_COUNT': {
      const qualifying = owned.filter((t) => {
        if (c.minTroopsEach !== undefined && t.garrison.length < c.minTroopsEach) return false;
        if (c.maxTroopsEach !== undefined && t.garrison.length > c.maxTroopsEach) return false;
        return true;
      });
      return {
        completed: qualifying.length >= c.value,
        progress: `${qualifying.length}/${c.value} territórios`,
      };
    }

    case 'REGIONS_COMPLETE': {
      const done = completedRegions(state, playerId);
      return { completed: done.length >= c.count, progress: `${done.length}/${c.count} regiões` };
    }

    case 'REGIONS_SPECIFIC': {
      const done = completedRegions(state, playerId).map((r) => r.id);
      const have = c.regionIds.filter((id) => done.includes(id));
      return {
        completed: have.length === c.regionIds.length,
        progress: `${have.length}/${c.regionIds.length} regiões-alvo`,
      };
    }

    case 'REGION_PLUS_TERRITORIES': {
      const region = getRegion(c.regionId);
      const hasRegion = region.territoryIds.every(
        (id) => state.territories[id as string]?.controllerId === playerId,
      );
      // "Estrada e Sinal" pede Pontos de Interesse; as demais pedem territórios fora da região.
      const isPoiVariant = c.regionId === 'floresta-corrompida';
      const extraCount = isPoiVariant
        ? POI_IDS.filter((id) => state.territories[id as string]?.controllerId === playerId).length
        : owned.filter((t) => !region.territoryIds.includes(t.id)).length;
      return {
        completed: hasRegion && extraCount >= c.extra,
        progress: `${region.name}: ${hasRegion ? 'ok' : 'incompleta'} · extra ${extraCount}/${c.extra}`,
      };
    }

    case 'REGIONS_NON_ADJACENT': {
      const done = completedRegions(state, playerId).map((r) => r.id);
      const valid = NON_ADJACENT_REGION_PAIRS.filter(
        ([a, b]) => done.includes(a) && done.includes(b),
      );
      return {
        completed: valid.length >= c.count - 1,
        progress: `${valid.length} par(es) sem fronteira comum`,
      };
    }

    case 'POI_CONTROL': {
      const have = POI_IDS.filter(
        (id) => state.territories[id as string]?.controllerId === playerId,
      ).length;
      return { completed: have >= c.count, progress: `${have}/${c.count} Pontos de Interesse` };
    }

    case 'POCO_BOTH_SIDES': {
      const have = POCO_LINKS.filter(
        (link) =>
          state.territories[link.a as string]?.controllerId === playerId &&
          state.territories[link.b as string]?.controllerId === playerId,
      ).length;
      return { completed: have >= c.count, progress: `${have}/${c.count} rotas completas` };
    }

    case 'ELIMINATE_FACTION': {
      const done = eliminatedFactionIds(state).includes(c.factionId as string);
      return { completed: done, progress: done ? 'eliminada' : 'ainda em jogo' };
    }

    case 'ELIMINATE_ANY': {
      const count = eliminatedFactionIds(state).length;
      return { completed: count >= c.count, progress: `${count}/${c.count} facções eliminadas` };
    }

    case 'ELIMINATE_NEIGHBOR_SEAT': {
      const order = state.turn.order;
      const index = order.indexOf(playerId);
      if (index < 0) return { completed: false, progress: '—' };
      const neighbor = order[(index + 1) % order.length];
      const target = state.players[neighbor as string];
      const done = Boolean(target && target.status === 'ELIMINATED');
      return {
        completed: done,
        progress: done ? 'assento vizinho eliminado' : `alvo: ${target?.name ?? '—'}`,
      };
    }

    case 'MOST_TERRITORIES_AT_ROUND': {
      if (state.turn.number < c.round) {
        return { completed: false, progress: `rodada ${state.turn.number}/${c.round}` };
      }
      const counts = Object.values(state.players)
        .filter((p) => p.status === 'ACTIVE')
        .map((p) => ({ id: p.id, n: territoriesOf(state, p.id).length }));
      const mine = counts.find((x) => x.id === playerId)?.n ?? 0;
      const best = Math.max(...counts.map((x) => x.n));
      const tied = counts.filter((x) => x.n === best).length > 1;
      return {
        completed: mine === best && !tied,
        progress: tied ? 'empate na liderança' : `${mine} contra ${best}`,
      };
    }

    case 'TROOPS_AND_TERRITORIES': {
      const troops = owned.reduce((sum, t) => sum + t.garrison.length, 0);
      return {
        completed: troops >= c.troops && owned.length >= c.territories,
        progress: `${troops}/${c.troops} soldados · ${owned.length}/${c.territories} territórios`,
      };
    }

    case 'CONQUEST_STREAK': {
      const rounds = [...entry.tracking.conquestRounds].sort((a, b) => a - b);
      let best = 0;
      let run = 0;
      let previous: number | null = null;
      for (const round of rounds) {
        run = previous !== null && round === previous + 1 ? run + 1 : 1;
        previous = round;
        best = Math.max(best, run);
      }
      return { completed: best >= c.rounds, progress: `${best}/${c.rounds} rodadas seguidas` };
    }

    case 'CONQUER_EACH_REGION': {
      const touched = new Set(entry.tracking.regionsTouched);
      return {
        completed: touched.size >= listRegions().length,
        progress: `${touched.size}/${listRegions().length} regiões`,
      };
    }

    case 'HOLD_REGION_ROUNDS': {
      return {
        completed: entry.tracking.holdRounds >= c.rounds,
        progress: `${entry.tracking.holdRounds}/${c.rounds} rodadas seguidas`,
      };
    }

    case 'SURVIVE_COLLAPSE_AND_TERRITORIES': {
      const survived = entry.tracking.collapseSurvived;
      return {
        completed: survived >= c.events && owned.length >= c.territories,
        progress: `${survived}/${c.events} eventos · ${owned.length}/${c.territories} territórios`,
      };
    }

    case 'TERRITORIES_IN_REGION': {
      const region = getRegion(c.regionId);
      const have = region.territoryIds.filter(
        (id) => state.territories[id as string]?.controllerId === playerId,
      ).length;
      return { completed: have >= c.count, progress: `${have}/${c.count} em ${region.name}` };
    }

    default: {
      // Condição declarada e ainda sem verificador: nunca completa em silêncio.
      const exhaustive: never = c;
      void exhaustive;
      return { completed: false, progress: 'condição sem verificador' };
    }
  }
}

/**
 * Atualiza o rastreamento contínuo das missões: streak de conquista, regiões
 * tocadas e rodadas segurando região. Chamado nos momentos certos pelo motor.
 */
export function trackConquest(
  draft: GameState,
  playerId: PlayerId,
  territoryId: string,
): void {
  const entry = draft.missions[playerId as string];
  if (!entry) return;
  if (!entry.tracking.conquestRounds.includes(draft.turn.number)) {
    entry.tracking.conquestRounds.push(draft.turn.number);
  }
  const region = regionOfTerritory(territoryId as never);
  if (region && !entry.tracking.regionsTouched.includes(region.id)) {
    entry.tracking.regionsTouched.push(region.id);
  }
}

/** Conta a rodada em que o jogador manteve a região exigida pela missão. */
export function trackRegionHold(draft: GameState, playerId: PlayerId): void {
  const entry = draft.missions[playerId as string];
  const mission = effectiveMissionOf(draft, playerId);
  if (!entry || !mission || mission.condition.type !== 'HOLD_REGION_ROUNDS') return;
  const region = getRegion(mission.condition.regionId);
  const holds = region.territoryIds.every(
    (id) => draft.territories[id as string]?.controllerId === playerId,
  );
  entry.tracking.holdRounds = holds ? entry.tracking.holdRounds + 1 : 0;
}

export function trackCollapseSurvived(draft: GameState): void {
  for (const entry of Object.values(draft.missions)) {
    const player = draft.players[entry.playerId as string];
    if (player?.status === 'ACTIVE') entry.tracking.collapseSurvived += 1;
  }
}

/**
 * Aplica a regra de substituição: se a facção alvo foi eliminada por outro
 * jogador, a missão vira a de reserva.
 */
export function applyMissionFallbacks(draft: GameState, eliminatedBy: PlayerId | null): void {
  for (const entry of Object.values(draft.missions)) {
    if (entry.replacedBy) continue;
    const mission = getMission(entry.missionId);
    if (mission.condition.type !== 'ELIMINATE_FACTION') continue;
    if (!mission.fallbackId) continue;
    const targetEliminated = eliminatedFactionIds(draft).includes(
      mission.condition.factionId as string,
    );
    if (!targetEliminated) continue;
    // Quem eliminou de fato cumpre a missão; os demais recebem a substituta.
    if (eliminatedBy === entry.playerId) continue;
    entry.replacedBy = mission.fallbackId;
  }
}
