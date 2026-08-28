import type { GameState } from '../types/game.types';
import type { CardInstance } from '../types/card.types';
import type { Soldier } from '../types/soldier.types';
import type { Territory } from '../types/territory.types';
import type { Player } from '../types/player.types';
import type { PlayerId, TerritoryId } from '../types/ids';
import { getFaction } from '../factions/faction.registry';
import type { AbilityDefinition, AbilityRuntimeState } from '../abilities/ability.types';
import { abilitiesOfPlayer, checkAvailability } from '../abilities/abilityEngine';
import { getCardDefinition } from '../cards/card.registry';
import { distanceBetween, validAttackTargets, validMoveTargets } from '../map/adjacency';
import { regionOfTerritory } from '../map/regions';
import { BALANCE } from '../config/balance';
import {
  crossesQuarantine,
  fogOfWarActive,
  getCollapseEvent,
  maxChargesFor,
  specialAttackBlocked,
} from '../collapse/collapseEngine';
import { checkMission, effectiveMissionOf } from '../missions/missionEngine';
import { reinforcementBreakdown } from '../turns/turnMachine';

/** Leituras derivadas do estado. A UI consome só daqui. */

export function currentPlayer(state: GameState): Player {
  return state.players[state.turn.currentPlayerId as string];
}

export function playerById(state: GameState, id: PlayerId): Player | undefined {
  return state.players[id as string];
}

export function allPlayers(state: GameState): Player[] {
  return state.turn.order.map((id) => state.players[id as string]).filter(Boolean);
}

export function allTerritories(state: GameState): Territory[] {
  return Object.values(state.territories);
}

export function controllerName(state: GameState, territory: Territory): string {
  if (!territory.controllerId) return 'Neutro';
  return state.players[territory.controllerId as string]?.name ?? 'Desconhecido';
}

export function territoryColor(state: GameState, territory: Territory): string {
  if (!territory.controllerId) return '#5b6472';
  const player = state.players[territory.controllerId as string];
  if (!player) return '#5b6472';
  return getFaction(player.factionId).color;
}

export function handOf(state: GameState, playerId: PlayerId): CardInstance[] {
  const player = state.players[playerId as string];
  if (!player) return [];
  return player.handCardIds.map((id) => state.cards[id as string]).filter(Boolean);
}

export function reserveSoldiers(state: GameState, playerId: PlayerId): Soldier[] {
  return Object.values(state.soldiers).filter(
    (s) => s.alive && s.location.kind === 'RESERVE' && s.location.playerId === playerId,
  );
}

export function troopsOf(state: GameState, playerId: PlayerId): number {
  return Object.values(state.soldiers).filter((s) => s.alive && s.ownerId === playerId).length;
}

export function garrisonCount(state: GameState, territoryId: TerritoryId): number {
  return state.territories[territoryId as string]?.garrison.length ?? 0;
}

/** Soldados inimigos disponíveis para o Sequestro, agrupados por território. */
export function capturableSoldiers(
  state: GameState,
  captorId: PlayerId,
): { territory: Territory; soldiers: Soldier[] }[] {
  return allTerritories(state)
    .filter((t) => t.controllerId && t.controllerId !== captorId)
    .map((territory) => ({
      territory,
      soldiers: territory.garrison
        .map((id) => state.soldiers[id as string])
        .filter((s): s is Soldier => !!s && s.alive && s.ownerId !== captorId),
    }))
    .filter((group) => group.soldiers.length > 0);
}

export function totalAliveSoldiers(state: GameState): number {
  return Object.values(state.soldiers).filter((s) => s.alive).length;
}

export interface AbilityView {
  definition: AbilityDefinition;
  runtime: AbilityRuntimeState;
  /** Rótulo de estado para a interface. */
  status: 'DISPONIVEL' | 'INDISPONIVEL' | 'ESGOTADA' | 'DESATIVADA';
  reason?: string;
  /** -1 = ilimitada. */
  chargesRemaining: number;
}

/** Habilidades do jogador já com status pronto para exibição. */
export function abilityViews(state: GameState, playerId: PlayerId): AbilityView[] {
  return abilitiesOfPlayer(state, playerId).map(({ definition, runtime }) => {
    const availability = checkAvailability(state, playerId, definition.id);
    let status: AbilityView['status'] = 'DISPONIVEL';
    if (!runtime.enabled) status = 'DESATIVADA';
    else if (runtime.chargesRemaining === 0) status = 'ESGOTADA';
    else if (!availability.available) status = 'INDISPONIVEL';
    return {
      definition,
      runtime,
      status,
      reason: availability.available ? undefined : availability.reason,
      chargesRemaining: runtime.chargesRemaining,
    };
  });
}

/** Cartas exclusivas da facção do jogador, com o que ele tem em mão. */
export function signatureCards(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId as string];
  if (!player) return [];
  const faction = getFaction(player.factionId);
  return faction.signatureCardIds.map((id) => {
    const definition = getCardDefinition(id as never);
    const owned = Object.values(state.cards).filter(
      (card) => card.ownerId === playerId && (card.definitionId as string) === id,
    );
    return {
      definition,
      inHand: owned.filter((card) => card.state === 'IN_HAND').length,
      consumed: owned.filter((card) => card.state === 'CONSUMED').length,
    };
  });
}

export function pendingEffects(state: GameState) {
  return state.effectQueue.filter((entry) => entry.status === 'PENDING');
}

// ---------------------------------------------------------------------------
// MVP: leituras usadas pela interface da partida
// ---------------------------------------------------------------------------

/** Jogadores que participam da partida (exclui os Remanescentes neutros). */
export function seatedPlayers(state: GameState): Player[] {
  return state.turn.order.map((id) => state.players[id as string]).filter(Boolean);
}

export function isNeutral(state: GameState, territory: Territory): boolean {
  if (!territory.controllerId) return true;
  return state.players[territory.controllerId as string]?.status === 'NEUTRAL';
}

/**
 * Contagem que o jogador PODE ver. Sob Nevoeiro de Vidro, territórios
 * inimigos mostram apenas uma faixa.
 */
export function visibleTroops(
  state: GameState,
  territory: Territory,
  viewerId: PlayerId,
): { exact: number | null; label: string } {
  const count = territory.garrison.length;
  const mine = territory.controllerId === viewerId;
  if (mine || !fogOfWarActive(state)) return { exact: count, label: String(count) };
  if (count <= 2) return { exact: null, label: 'poucos' };
  if (count <= 5) return { exact: null, label: 'médio' };
  return { exact: null, label: 'muitos' };
}

/** Territórios de onde o jogador do turno pode declarar o Ataque Comum. */
export function attackOrigins(state: GameState): Territory[] {
  const playerId = state.turn.currentPlayerId;
  return allTerritories(state).filter(
    (t) =>
      t.controllerId === playerId &&
      t.garrison.length > 1 &&
      validAttackTargets(state, t.id).length > 0,
  );
}

export function attackTargetsFrom(state: GameState, from: TerritoryId): Territory[] {
  return validAttackTargets(state, from).filter(
    (t) => !crossesQuarantine(state, from, t.id),
  );
}

export function moveTargetsFrom(state: GameState, from: TerritoryId): Territory[] {
  const origin = state.territories[from as string];
  if (!origin?.controllerId) return [];
  const faction = getFaction(state.players[origin.controllerId as string].factionId);
  if (!faction.rules.chainMovement) return validMoveTargets(state, from);
  return allTerritories(state).filter(
    (t) => t.controllerId === origin.controllerId && t.id !== origin.id,
  );
}

/** Alvos válidos para o Ataque Especial: distância exatamente 2. */
export function specialTargetsFrom(state: GameState, from: TerritoryId): Territory[] {
  const origin = state.territories[from as string];
  if (!origin?.controllerId) return [];
  return allTerritories(state).filter((t) => {
    if (!t.controllerId || t.controllerId === origin.controllerId) return false;
    if (regionOfTerritory(t.id)?.id === 'costa-sombria' && (t.id as string) !== 'nucleo-do-colapso') {
      return false;
    }
    return distanceBetween(state, origin.id, t.id) === BALANCE.transport.range;
  });
}

export interface MissionView {
  missionId: string;
  name: string;
  description: string;
  category: string;
  progress: string;
  completed: boolean;
  substituted: boolean;
}

/** Missão do jogador — só deve ser chamada para o próprio jogador. */
export function missionOf(state: GameState, playerId: PlayerId): MissionView | null {
  const entry = state.missions[playerId as string];
  if (!entry) return null;
  const mission = effectiveMissionOf(state, playerId);
  if (!mission) return null;
  return {
    missionId: mission.id,
    name: mission.name,
    description: mission.description,
    category: mission.category,
    progress: checkMission(state, playerId).progress,
    completed: entry.completed,
    substituted: Boolean(entry.replacedBy),
  };
}

export function reinforcementDetail(state: GameState, playerId: PlayerId) {
  return reinforcementBreakdown(state, playerId);
}

/** Resumo do Transporte Especial para o HUD. */
export function transportStatus(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId as string];
  const faction = player ? getFaction(player.factionId) : null;
  const free = Boolean(faction?.rules.freeSpecialAttack);
  const blocked = specialAttackBlocked(state);
  const used = state.turn.specialAttackUsed;
  return {
    charges: player?.transportCharges ?? 0,
    max: maxChargesFor(state, playerId),
    free,
    blocked,
    used,
    available: !used && !blocked && (free || (player?.transportCharges ?? 0) > 0),
  };
}

export function activeCollapseSummary(state: GameState) {
  return state.collapse.active.map((active) => {
    const event = getCollapseEvent(active.eventId);
    return {
      id: active.id,
      name: event.name,
      description: event.description,
      untilRound: active.untilRound,
      regionId: active.targetRegionId,
      territoryId: active.targetTerritoryId,
    };
  });
}
