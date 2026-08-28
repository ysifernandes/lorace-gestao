import type { ActiveCollapseEffect, CollapseState, GameState } from '../types/game.types';
import type { PlayerId, TerritoryId } from '../types/ids';
import type { Rng } from '../rng/rng';
import { defaultRng, pick, shuffle } from '../rng/rng';
import { BALANCE } from '../config/balance';
import { COLLAPSE_EVENT_SEEDS } from '../../data/collapseEvents.seed';
import type { CollapseEventDefinition } from '../../data/collapseEvents.seed';
import {
  listRegions,
  listSpecialLinks,
  disableLink,
  expireDisabledLinks,
  specialLinkBetween,
} from '../map/regions';
import { listTerritories, syncPlayerTerritories, territoriesOf } from '../map/territory';
import { staticNeighborsOf } from '../map/adjacency';
import { createSoldier, eliminateSoldier, soldiersInTerritory } from '../soldiers/soldier';
import { addTerritoryModifier, expireTerritoryModifiers } from '../engine/modifiers';
import { getFaction } from '../factions/faction.registry';
import { pushLog } from '../engine/log';
import { drawCardFor, discardFromHand } from '../deck/deck';

/**
 * MOTOR DE EVENTOS DO COLAPSO.
 *
 * O jogador NUNCA vê chance, pressão acumulada, cooldown ou o próximo evento.
 * Todo esse estado vive em `state.collapse` e só é lido por este arquivo e
 * pelo painel DEV.
 *
 * Ciclo: decidir → filtrar → sortear alvo → alertar → aplicar → registrar →
 * restaurar quando a duração terminar.
 */

const BY_ID = new Map(COLLAPSE_EVENT_SEEDS.map((e) => [e.id, e]));

export function getCollapseEvent(id: string): CollapseEventDefinition {
  const event = BY_ID.get(id);
  if (!event) throw new Error(`Evento do Colapso desconhecido: ${id}`);
  return event;
}

export function listCollapseEvents(): CollapseEventDefinition[] {
  return COLLAPSE_EVENT_SEEDS;
}

export function createCollapseState(rng: Rng = defaultRng): CollapseState {
  return {
    bag: shuffle(COLLAPSE_EVENT_SEEDS.map((e) => e.id), rng),
    used: [],
    pressure: 0,
    cooldown: 0,
    triggered: 0,
    pending: null,
    active: [],
    history: [],
    forceNext: false,
  };
}

// ---------------------------------------------------------------------------
// 1. Decidir secretamente
// ---------------------------------------------------------------------------

/** Chance atual. SEGREDO — nunca exposta na interface do jogo. */
export function currentChance(state: GameState): number {
  const { baseChance, pressureStep, maxChance } = BALANCE.collapse;
  return Math.min(maxChance, baseChance + pressureStep * state.collapse.pressure);
}

export function canTriggerNow(state: GameState): boolean {
  const c = state.collapse;
  if (state.status !== 'IN_PROGRESS') return false;
  if (c.triggered >= BALANCE.collapse.maxPerGame) return false;
  if (state.turn.number < BALANCE.collapse.firstRound) return false;
  if (c.cooldown > 0) return false;
  return true;
}

/**
 * Decide, ao final de uma rodada completa, se haverá evento.
 * Devolve o id do evento escolhido ou null.
 */
export function rollForCollapse(draft: GameState, rng: Rng = defaultRng): string | null {
  const c = draft.collapse;
  if (!canTriggerNow(draft)) {
    if (c.cooldown > 0) c.cooldown -= 1;
    return null;
  }
  const forced = c.forceNext;
  const happens = forced || rng.next() < currentChance(draft);
  c.forceNext = false;
  if (!happens) {
    c.pressure += 1;
    return null;
  }
  const eventId = drawValidEvent(draft, rng);
  if (!eventId) {
    c.pressure += 1;
    return null;
  }
  c.pressure = 0;
  c.cooldown = BALANCE.collapse.cooldownRounds;
  return eventId;
}

// ---------------------------------------------------------------------------
// 2. Filtrar eventos inválidos
// ---------------------------------------------------------------------------

export function isEventValid(state: GameState, event: CollapseEventDefinition): boolean {
  if (event.minRound && state.turn.number < event.minRound) return false;
  if (event.requiresPlayers) {
    const active = Object.values(state.players).filter((p) => p.status === 'ACTIVE').length;
    if (active < event.requiresPlayers) return false;
  }
  if (event.requiresTerritoryWithTroops) {
    const has = listTerritories(state).some(
      (t) => t.controllerId && t.garrison.length >= event.requiresTerritoryWithTroops!,
    );
    if (!has) return false;
  }
  // Um evento sem alvo válido nunca é sorteado.
  return resolveTarget(state, event, defaultRng) !== 'INVALID';
}

/** Tira do saco o primeiro evento válido. Sem reposição: não repete. */
function drawValidEvent(draft: GameState, rng: Rng): string | null {
  const c = draft.collapse;
  if (c.bag.length === 0) c.bag = shuffle(COLLAPSE_EVENT_SEEDS.map((e) => e.id), rng);
  for (let i = 0; i < c.bag.length; i += 1) {
    const candidate = c.bag[i];
    if (isEventValid(draft, getCollapseEvent(candidate))) {
      c.bag.splice(i, 1);
      return candidate;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. Escolher alvo
// ---------------------------------------------------------------------------

export interface CollapseTarget {
  regionId?: string;
  territoryId?: TerritoryId;
  playerId?: PlayerId;
}

function resolveTarget(
  state: GameState,
  event: CollapseEventDefinition,
  rng: Rng,
): CollapseTarget | 'INVALID' {
  switch (event.target) {
    case 'NONE':
      return {};
    case 'REGION': {
      const candidates = listRegions().filter((r) =>
        r.territoryIds.some((id) => state.territories[id as string]?.controllerId),
      );
      if (candidates.length === 0) return 'INVALID';
      return { regionId: pick(candidates, rng).id };
    }
    case 'TERRITORY': {
      const min = event.requiresTerritoryWithTroops ?? 1;
      const candidates = listTerritories(state).filter(
        (t) => t.controllerId && t.garrison.length >= min,
      );
      if (candidates.length === 0) return 'INVALID';
      return { territoryId: pick(candidates, rng).id };
    }
    case 'MARITIMA': {
      const routes = listSpecialLinks().filter((l) => l.kind === 'MARITIMA');
      if (routes.length === 0) return 'INVALID';
      const chosen = pick(routes, rng);
      return { territoryId: chosen.a };
    }
    case 'PLAYER': {
      const active = Object.values(state.players).filter((p) => p.status === 'ACTIVE');
      if (active.length === 0) return 'INVALID';
      return { playerId: pick(active, rng).id };
    }
    default:
      return {};
  }
}

/** Prepara o evento e o coloca em espera para a animação de alerta. */
export function armCollapse(draft: GameState, eventId: string, rng: Rng = defaultRng): void {
  const event = getCollapseEvent(eventId);
  const target = resolveTarget(draft, event, rng);
  if (target === 'INVALID') return;
  draft.collapse.pending = {
    eventId,
    targetRegionId: target.regionId,
    targetTerritoryId: target.territoryId,
    targetPlayerId: target.playerId,
  };
}

// ---------------------------------------------------------------------------
// 4. Aplicar efeito
// ---------------------------------------------------------------------------

function loseTroops(draft: GameState, territoryId: TerritoryId, amount: number, floor = 1): number {
  const soldiers = soldiersInTerritory(draft, territoryId);
  const removable = Math.max(0, Math.min(amount, soldiers.length - floor));
  for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, soldiers[i].id);
  return removable;
}

function addTroops(draft: GameState, territoryId: TerritoryId, amount: number): void {
  const territory = draft.territories[territoryId as string];
  if (!territory?.controllerId) return;
  const owner = draft.players[territory.controllerId as string];
  if (!owner) return;
  for (let i = 0; i < amount; i += 1) {
    createSoldier(draft, { factionId: owner.factionId, ownerId: owner.id, territoryId });
  }
}

export interface CollapseApplication {
  event: CollapseEventDefinition;
  summary: string;
}

/** Aplica o evento pendente. Devolve o resumo que a interface mostra. */
export function applyPendingCollapse(
  draft: GameState,
  rng: Rng = defaultRng,
): CollapseApplication | null {
  const pending = draft.collapse.pending;
  if (!pending) return null;
  const event = getCollapseEvent(pending.eventId);
  const summary = applyEffect(draft, event, pending, rng);

  if (event.duration > 0) {
    draft.counters.event += 1;
    const active: ActiveCollapseEffect = {
      id: `collapse-${draft.counters.event}`,
      eventId: event.id,
      untilRound: draft.turn.number + event.duration - 1,
      targetRegionId: pending.targetRegionId,
      targetTerritoryId: pending.targetTerritoryId,
      targetPlayerId: pending.targetPlayerId,
    };
    draft.collapse.active.push(active);
  }

  draft.collapse.used.push(event.id);
  draft.collapse.triggered += 1;
  draft.collapse.history.unshift({ eventId: event.id, round: draft.turn.number, summary });
  draft.collapse.history = draft.collapse.history.slice(0, 12);
  draft.collapse.pending = null;
  pushLog(draft, 'COLLAPSE', `EVENTO DO COLAPSO — ${event.name}: ${summary}`);

  // Fraqueza dos Magos: cada AMEAÇA custa 1 soldado a mais.
  if (event.categories.includes('AMEACA')) {
    for (const player of Object.values(draft.players)) {
      if (player.status !== 'ACTIVE') continue;
      if (!getFaction(player.factionId).rules.collapseFragility) continue;
      const owned = territoriesOf(draft, player.id).sort(
        (a, b) => b.garrison.length - a.garrison.length,
      );
      if (owned.length > 0 && loseTroops(draft, owned[0].id, 1) > 0) {
        pushLog(draft, 'COLLAPSE', `${player.name} perde 1 soldado adicional pela instabilidade.`);
      }
    }
  }

  syncPlayerTerritories(draft);
  return { event, summary };
}

function applyEffect(
  draft: GameState,
  event: CollapseEventDefinition,
  target: NonNullable<CollapseState['pending']>,
  rng: Rng,
): string {
  const spec = event.effect;
  const activePlayers = Object.values(draft.players).filter((p) => p.status === 'ACTIVE');

  switch (spec.type) {
    // Efeitos que só existem enquanto o evento está ativo: o combate e as
    // fases consultam `collapse.active`, então aqui não há mutação.
    case 'ATTACK_DICE_DELTA':
      return `atacantes rolam ${spec.delta} dado nesta rodada.`;
    case 'DEFENSE_DICE_CAP':
      return `defensores limitados a ${spec.value} dados nesta rodada.`;
    case 'BLOCK_SPECIAL_ATTACK':
      return 'nenhum Ataque Especial nesta rodada.';
    case 'EXTRA_MOVE':
      return `+${spec.amount} movimentação para todos nesta rodada.`;
    case 'FOG_OF_WAR':
      return 'contagem de tropas inimigas oculta nesta rodada.';
    case 'REGION_QUARANTINE':
      return `${regionName(target.targetRegionId)} isolada nesta rodada.`;
    case 'REGION_BONUS_BLACKOUT':
      return `bônus de ${regionName(target.targetRegionId)} suspenso.`;
    case 'REGION_REINFORCE_BLOCK':
      return `${regionName(target.targetRegionId)} sem reforço nem movimentação.`;

    case 'REINFORCE_ALL': {
      // Aplicado no reforço de cada jogador via `collapse.active`.
      return `+${spec.amount} soldados no próximo reforço de todos.`;
    }
    case 'REINFORCE_WEAKEST': {
      const weakest = [...activePlayers].sort(
        (a, b) => territoriesOf(draft, a.id).length - territoriesOf(draft, b.id).length,
      )[0];
      if (!weakest) return 'sem alvo.';
      draft.collapse.pending = { ...target, targetPlayerId: weakest.id };
      return `${weakest.name} recebe +${spec.amount} no próximo reforço.`;
    }

    case 'DRAW_ALL': {
      let drawn = 0;
      for (const player of activePlayers) {
        for (let i = 0; i < spec.amount; i += 1) if (drawCardFor(draft, player.id)) drawn += 1;
      }
      return `${drawn} carta(s) compradas no total.`;
    }

    case 'DISCARD_LEADER': {
      const max = Math.max(0, ...activePlayers.map((p) => p.handCardIds.length));
      if (max === 0) return 'ninguém tinha cartas.';
      const leaders = activePlayers.filter((p) => p.handCardIds.length === max);
      for (const leader of leaders) discardFromHand(draft, leader.id, 1);
      return `${leaders.map((p) => p.name).join(', ')} descarta(m) 1 carta.`;
    }

    case 'HAND_ROTATE': {
      if (activePlayers.length < 2) return 'sem jogadores suficientes.';
      const ordered = draft.turn.order
        .map((id) => draft.players[id as string])
        .filter((p) => p && p.status === 'ACTIVE');
      const hands = ordered.map((p) => [...p.handCardIds]);
      ordered.forEach((player, index) => {
        const incoming = hands[(index + hands.length - 1) % hands.length];
        player.handCardIds = incoming;
        for (const cardId of incoming) {
          const card = draft.cards[cardId as string];
          if (card) card.ownerId = player.id;
        }
      });
      return 'as mãos giraram um assento.';
    }

    case 'TRANSPORT_RECHARGE': {
      for (const player of activePlayers) {
        player.transportCharges = Math.min(
          maxChargesFor(draft, player.id),
          player.transportCharges + spec.amount,
        );
      }
      return `+${spec.amount} carga de Transporte para todos.`;
    }
    case 'TRANSPORT_DRAIN': {
      for (const player of activePlayers) player.transportCharges = 0;
      return 'todas as cargas de Transporte foram perdidas.';
    }

    case 'REGION_LOSE_TROOPS': {
      const region = target.targetRegionId;
      if (!region) return 'sem região.';
      let total = 0;
      for (const id of regionTerritories(region)) total += loseTroops(draft, id, spec.amount);
      return `${regionName(region)} perde ${total} soldado(s).`;
    }

    case 'REGION_REWARD': {
      const region = target.targetRegionId;
      if (!region) return 'sem região.';
      const counts = new Map<string, number>();
      for (const id of regionTerritories(region)) {
        const controller = draft.territories[id as string]?.controllerId;
        if (!controller) continue;
        counts.set(controller as string, (counts.get(controller as string) ?? 0) + 1);
      }
      if (counts.size === 0) return `ninguém controla ${regionName(region)}.`;
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const owned = regionTerritories(region).filter(
        (id) => draft.territories[id as string]?.controllerId === (best as PlayerId),
      );
      for (let i = 0; i < spec.amount; i += 1) addTroops(draft, owned[i % owned.length], 1);
      return `${draft.players[best]?.name ?? '???'} recebe +${spec.amount} em ${regionName(region)}.`;
    }

    case 'REGION_MIGRATION': {
      const region = target.targetRegionId;
      if (!region) return 'sem região.';
      let moved = 0;
      for (const id of regionTerritories(region)) {
        const territory = draft.territories[id as string];
        if (!territory?.controllerId || territory.garrison.length < 2) continue;
        const friendly = staticNeighborsOf(draft, territory.id).filter(
          (n) => n.controllerId === territory.controllerId,
        );
        if (friendly.length === 0) continue;
        const soldierId = territory.garrison[territory.garrison.length - 1];
        territory.garrison = territory.garrison.filter((s) => s !== soldierId);
        const destination = friendly[0];
        destination.garrison.push(soldierId);
        const soldier = draft.soldiers[soldierId as string];
        if (soldier) soldier.location = { kind: 'TERRITORY', territoryId: destination.id };
        moved += 1;
      }
      return `${moved} soldado(s) migraram em ${regionName(region)}.`;
    }

    case 'TERRITORY_REWARD': {
      const id = target.targetTerritoryId;
      if (!id) return 'sem território.';
      const territory = draft.territories[id as string];
      addTroops(draft, id, spec.troops);
      if (territory?.controllerId) {
        for (let i = 0; i < spec.cards; i += 1) drawCardFor(draft, territory.controllerId);
      }
      return `${territory?.name}: +${spec.troops} soldados e ${spec.cards} carta.`;
    }

    case 'TERRITORY_MUTINY': {
      const id = target.targetTerritoryId;
      if (!id) return 'sem território.';
      const territory = draft.territories[id as string];
      const lost = loseTroops(draft, id, spec.troops);
      if (territory?.controllerId) discardFromHand(draft, territory.controllerId, 1);
      return `${territory?.name} perde ${lost} soldado(s) e 1 carta.`;
    }

    case 'TERRITORY_SHIELD': {
      const id = target.targetTerritoryId;
      const territory = id ? draft.territories[id as string] : undefined;
      if (!territory?.controllerId) return 'sem território.';
      addTerritoryModifier(draft, {
        territoryId: territory.id,
        ownerId: territory.controllerId,
        untilRound: draft.turn.number + event.duration,
        attackerDiceReduction: spec.attackerDiceReduction,
        source: event.id,
      });
      return `${territory.name} recebe blindagem.`;
    }

    case 'LARGEST_TERRITORY_HALVED': {
      const largest = listTerritories(draft)
        .filter((t) => t.controllerId)
        .sort((a, b) => b.garrison.length - a.garrison.length)[0];
      if (!largest) return 'sem alvo.';
      const lost = loseTroops(draft, largest.id, Math.floor(largest.garrison.length / 2));
      return `${largest.name} perde ${lost} soldado(s).`;
    }

    case 'BORDER_ATTRITION': {
      let total = 0;
      for (const territory of listTerritories(draft)) {
        if (!territory.controllerId) continue;
        const hasEnemy = staticNeighborsOf(draft, territory.id).some(
          (n) => n.controllerId && n.controllerId !== territory.controllerId,
        );
        if (hasEnemy) total += loseTroops(draft, territory.id, spec.amount);
      }
      return `${total} soldado(s) perdidos nas fronteiras.`;
    }

    case 'DISABLE_MARITIME': {
      const routes = listSpecialLinks().filter((l) => l.kind === 'MARITIMA');
      if (routes.length === 0) return 'sem rota marítima.';
      const chosen = target.targetTerritoryId
        ? routes.find((l) => l.a === target.targetTerritoryId) ?? pick(routes, rng)
        : pick(routes, rng);
      disableLink(draft, chosen.a, chosen.b, draft.turn.number + event.duration);
      return `${chosen.name} interditada.`;
    }
    case 'DISABLE_LAND_BORDER': {
      // Fronteira terrestre entre dois territórios ocupados, sorteada.
      const candidates = listTerritories(draft).flatMap((t) =>
        staticNeighborsOf(draft, t.id)
          .filter(
            (n) =>
              (t.id as string) < (n.id as string) &&
              t.controllerId &&
              n.controllerId &&
              !specialLinkBetween(t.id, n.id),
          )
          .map((n) => ({ a: t.id, b: n.id, name: `${t.name} ↔ ${n.name}` })),
      );
      if (candidates.length === 0) return 'sem fronteira elegível.';
      const chosen = pick(candidates, rng);
      disableLink(draft, chosen.a, chosen.b, draft.turn.number + event.duration);
      return `${chosen.name} rompida.`;
    }
    case 'DISABLE_ALL_MARITIME': {
      const routes = listSpecialLinks().filter((l) => l.kind === 'MARITIMA');
      for (const route of routes) {
        disableLink(draft, route.a, route.b, draft.turn.number + event.duration);
      }
      return `${routes.length} rota(s) marítima(s) intransitável(is).`;
    }

    case 'FORCE_NEXT_EVENT': {
      draft.collapse.forceNext = true;
      draft.collapse.cooldown = 0;
      return 'o próximo evento virá na rodada seguinte.';
    }
    case 'SILENCE': {
      draft.collapse.cooldown = spec.rounds;
      draft.collapse.pressure = 0;
      for (const player of activePlayers) {
        player.transportCharges = Math.min(
          maxChargesFor(draft, player.id),
          player.transportCharges + 1,
        );
      }
      return `${spec.rounds} rodadas de silêncio e +1 carga para todos.`;
    }

    case 'PLAYER_LOSE_TROOPS': {
      const leader = [...activePlayers].sort(
        (a, b) => territoriesOf(draft, b.id).length - territoriesOf(draft, a.id).length,
      )[0];
      if (!leader) return 'sem alvo.';
      const owned = territoriesOf(draft, leader.id).sort(
        (a, b) => b.garrison.length - a.garrison.length,
      );
      let lost = 0;
      for (const territory of owned) {
        if (lost >= spec.amount) break;
        lost += loseTroops(draft, territory.id, spec.amount - lost);
      }
      return `${leader.name} perde ${lost} soldado(s).`;
    }
    case 'PLAYER_GAIN_TROOPS': {
      const id = target.targetPlayerId;
      const player = id ? draft.players[id as string] : undefined;
      if (!player) return 'sem alvo.';
      const owned = territoriesOf(draft, player.id);
      for (let i = 0; i < spec.amount && owned.length > 0; i += 1) {
        addTroops(draft, owned[i % owned.length].id, 1);
      }
      return `${player.name} recebe +${spec.amount} soldado(s).`;
    }

    default: {
      const exhaustive: never = spec;
      void exhaustive;
      return 'efeito sem resolvedor.';
    }
  }
}

function regionTerritories(regionId: string): TerritoryId[] {
  return listRegions().find((r) => r.id === regionId)?.territoryIds ?? [];
}

function regionName(regionId?: string): string {
  return listRegions().find((r) => r.id === regionId)?.name ?? 'região';
}

export function maxChargesFor(state: GameState, playerId: PlayerId): number {
  const hasDepot = listTerritories(state).some(
    (t) => t.controllerId === playerId && t.id === ('usina-nuclear' as TerritoryId),
  );
  return hasDepot ? BALANCE.transport.maxChargesWithDepot : BALANCE.transport.maxCharges;
}

// ---------------------------------------------------------------------------
// 5. Consultas usadas pelo resto do motor
// ---------------------------------------------------------------------------

export function activeEffectsOfType(
  state: GameState,
  type: string,
): { active: ActiveCollapseEffect; event: CollapseEventDefinition }[] {
  return state.collapse.active
    .map((active) => ({ active, event: getCollapseEvent(active.eventId) }))
    .filter(({ event }) => event.effect.type === type);
}

export function attackDiceDelta(state: GameState): number {
  return activeEffectsOfType(state, 'ATTACK_DICE_DELTA').reduce(
    (sum, { event }) =>
      sum + (event.effect.type === 'ATTACK_DICE_DELTA' ? event.effect.delta : 0),
    0,
  );
}

export function defenseDiceCap(state: GameState): number {
  const caps = activeEffectsOfType(state, 'DEFENSE_DICE_CAP').map(({ event }) =>
    event.effect.type === 'DEFENSE_DICE_CAP' ? event.effect.value : BALANCE.dice.maxDefenseDice,
  );
  return caps.length > 0 ? Math.min(...caps) : BALANCE.dice.maxDefenseDice;
}

export function specialAttackBlocked(state: GameState): boolean {
  return activeEffectsOfType(state, 'BLOCK_SPECIAL_ATTACK').length > 0;
}

export function fogOfWarActive(state: GameState): boolean {
  return activeEffectsOfType(state, 'FOG_OF_WAR').length > 0;
}

export function extraMoves(state: GameState): number {
  return activeEffectsOfType(state, 'EXTRA_MOVE').reduce(
    (sum, { event }) => sum + (event.effect.type === 'EXTRA_MOVE' ? event.effect.amount : 0),
    0,
  );
}

export function quarantinedRegions(state: GameState): string[] {
  return activeEffectsOfType(state, 'REGION_QUARANTINE')
    .map(({ active }) => active.targetRegionId)
    .filter((id): id is string => Boolean(id));
}

export function blackedOutRegions(state: GameState): string[] {
  return activeEffectsOfType(state, 'REGION_BONUS_BLACKOUT')
    .map(({ active }) => active.targetRegionId)
    .filter((id): id is string => Boolean(id));
}

export function reinforceBlockedRegions(state: GameState): string[] {
  return activeEffectsOfType(state, 'REGION_REINFORCE_BLOCK')
    .map(({ active }) => active.targetRegionId)
    .filter((id): id is string => Boolean(id));
}

/** Bônus de reforço concedido por eventos ativos a este jogador. */
export function collapseReinforcementBonus(state: GameState, playerId: PlayerId): number {
  let bonus = 0;
  for (const { active, event } of activeEffectsOfType(state, 'REINFORCE_ALL')) {
    void active;
    if (event.effect.type === 'REINFORCE_ALL') bonus += event.effect.amount;
  }
  for (const { active, event } of activeEffectsOfType(state, 'REINFORCE_WEAKEST')) {
    if (active.targetPlayerId === playerId && event.effect.type === 'REINFORCE_WEAKEST') {
      bonus += event.effect.amount;
    }
  }
  return bonus;
}

/** Um ataque atravessa a fronteira de uma região em quarentena? */
export function crossesQuarantine(
  state: GameState,
  from: TerritoryId,
  to: TerritoryId,
): boolean {
  const quarantined = quarantinedRegions(state);
  if (quarantined.length === 0) return false;
  for (const regionId of quarantined) {
    const ids = regionTerritories(regionId);
    const fromInside = ids.includes(from);
    const toInside = ids.includes(to);
    if (fromInside !== toInside) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// 6. Restaurar estado quando a duração termina
// ---------------------------------------------------------------------------

export function expireCollapseEffects(draft: GameState): string[] {
  const expired: string[] = [];
  draft.collapse.active = draft.collapse.active.filter((active) => {
    if (active.untilRound >= draft.turn.number) return true;
    expired.push(getCollapseEvent(active.eventId).name);
    return false;
  });
  for (const link of expireDisabledLinks(draft)) expired.push(link.name);
  expireTerritoryModifiers(draft);
  return expired;
}
