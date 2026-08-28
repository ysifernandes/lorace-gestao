import type { GameState } from '../types/game.types';
import type { PlayerId } from '../types/ids';
import { isLastPhase, nextPhase } from './phases';
import { BALANCE } from '../config/balance';
import { resetTurnCounters } from '../abilities/abilityEngine';
import { getFaction } from '../factions/faction.registry';
import { completedRegions, regionOfTerritory } from '../map/regions';
import { territoriesOf } from '../map/territory';
import { TERRITORY_SEEDS } from '../../data/territories.seed';
import {
  blackedOutRegions,
  collapseReinforcementBonus,
  extraMoves,
} from '../collapse/collapseEngine';

/**
 * Máquina de estados do turno. Pura: recebe o rascunho do estado e o avança.
 * Não conhece React nem UI.
 */

export function activePlayerOrder(state: GameState): PlayerId[] {
  return state.turn.order.filter((id) => state.players[id as string]?.status === 'ACTIVE');
}

export function peekNextPlayerId(state: GameState): PlayerId {
  const order = state.turn.order;
  const active = activePlayerOrder(state);
  if (active.length === 0) return state.turn.currentPlayerId;
  for (let step = 1; step <= order.length; step += 1) {
    const candidate = order[(state.turn.currentIndex + step) % order.length];
    if (state.players[candidate as string]?.status === 'ACTIVE') return candidate;
  }
  return state.turn.currentPlayerId;
}

/** Chave de idempotência do início de turno: um turno começa uma vez só. */
export function turnStartedKey(turnNumber: number, player: PlayerId): string {
  return `TURN_STARTED:${turnNumber}:${player}`;
}

const POI_REINFORCEMENT_IDS = TERRITORY_SEEDS.filter(
  (t) => t.poi?.kind === 'REINFORCEMENT',
).map((t) => t.id);

export interface ReinforcementBreakdown {
  base: number;
  regionBonus: number;
  poiBonus: number;
  collapseBonus: number;
  total: number;
  regions: string[];
}

/**
 * Reforço = máx(3, ⌊territórios ÷ 3⌋) + bônus de região + efeitos.
 * Os números vivem em `BALANCE.reinforcements`.
 */
export function reinforcementBreakdown(
  state: GameState,
  player: PlayerId,
): ReinforcementBreakdown {
  const owned = territoriesOf(state, player).length;
  const { minimum, territoriesPerExtraTroop } = BALANCE.reinforcements;
  const base = Math.max(minimum, Math.floor(owned / territoriesPerExtraTroop));

  const faction = getFaction(state.players[player as string].factionId);
  const multiplier = faction.rules.regionBonusMultiplier ?? 1;
  const blackedOut = blackedOutRegions(state);
  const regions = completedRegions(state, player).filter((r) => !blackedOut.includes(r.id));
  const rawBonus = regions.reduce((sum, r) => sum + r.bonus, 0);
  const regionBonus = multiplier === 1 ? rawBonus : Math.floor(rawBonus * multiplier);

  // Fraqueza dos Vampiros: não recebem bônus de Ponto de Interesse.
  const poiBonus = faction.rules.ignorePoiBonus
    ? 0
    : POI_REINFORCEMENT_IDS.filter(
        (id) => state.territories[id as string]?.controllerId === player,
      ).length;

  const collapseBonus = collapseReinforcementBonus(state, player);

  return {
    base,
    regionBonus,
    poiBonus,
    collapseBonus,
    total: base + regionBonus + poiBonus + collapseBonus,
    regions: regions.map((r) => r.name),
  };
}

/** Total de reforços do turno. */
export function reinforcementsFor(state: GameState, player: PlayerId): number {
  return reinforcementBreakdown(state, player).total;
}

/** Movimentações permitidas ao jogador neste turno. */
export function movesAllowedFor(state: GameState, player: PlayerId): number {
  const faction = getFaction(state.players[player as string].factionId);
  return (faction.rules.movesPerTurn ?? BALANCE.movement.perTurn) + extraMoves(state);
}

function startTurnFor(draft: GameState, player: PlayerId): void {
  draft.turn.currentPlayerId = player;
  draft.turn.currentIndex = draft.turn.order.indexOf(player);
  draft.turn.phase = 'REFORCO';
  draft.turn.commonAttackUsed = false;
  draft.turn.specialAttackUsed = false;
  draft.turn.movesUsed = 0;
  draft.turn.movesAllowed = movesAllowedFor(draft, player);
  draft.turn.drewCard = false;
  draft.turn.cardsDrawn = 0;
  draft.turn.conversionsThisTurn = 0;
  draft.turn.conquestsThisTurn = 0;
  draft.turn.turnsPlayed += 1;
  draft.turn.pendingReinforcements = reinforcementsFor(draft, player);
  // Limites "por turno" das habilidades valem para a vez que está começando.
  resetTurnCounters(draft, player);
  for (const soldier of Object.values(draft.soldiers)) {
    if (soldier.alive && soldier.ownerId === player && soldier.status === 'MOVED') {
      soldier.status = 'READY';
    }
  }
}

/** Passa a vez para o próximo jogador ativo. */
export function endTurn(draft: GameState): {
  previous: PlayerId;
  next: PlayerId;
  roundEnded: boolean;
} {
  const previous = draft.turn.currentPlayerId;
  const next = peekNextPlayerId(draft);
  const roundEnded = draft.turn.order.indexOf(next) <= draft.turn.currentIndex;
  startTurnFor(draft, next);
  return { previous, next, roundEnded };
}

/** Avança uma fase. Ao sair de FIM_TURNO, troca de jogador. */
export function advancePhase(draft: GameState): { changedPlayer: boolean; roundEnded: boolean } {
  if (isLastPhase(draft.turn.phase)) {
    const { roundEnded } = endTurn(draft);
    return { changedPlayer: true, roundEnded };
  }
  draft.turn.phase = nextPhase(draft.turn.phase);
  return { changedPlayer: false, roundEnded: false };
}

/** A qual região pertence um território — reexportado para conveniência. */
export { regionOfTerritory };
