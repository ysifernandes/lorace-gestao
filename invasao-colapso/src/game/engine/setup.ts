import { GAME_STATE_VERSION } from '../types/game.types';
import type { GameState } from '../types/game.types';
import type { CardInstance } from '../types/card.types';
import { playerId as makePlayerId } from '../types/ids';
import type { CardDefinitionId, FactionId, PlayerId } from '../types/ids';
import type { Territory } from '../types/territory.types';
import type { Player, PlayerKind } from '../types/player.types';
import { TERRITORY_SEEDS } from '../../data/territories.seed';
import { getFaction } from '../factions/faction.registry';
import { HUMANOS_ID } from '../factions/humanos';
import {
  ALIENIGENAS_ID,
  GOBLINS_ID,
  MAGOS_ID,
  REMANESCENTES_ID,
  VAMPIROS_ID,
  ZUMBIS_ID,
} from '../factions/roster';
import { SIGNATURE_BY_FACTION } from '../cards/signature.cards';
import { SEQUESTRO_CARD_ID } from '../cards/sequestro.card';
import { createSoldier } from '../soldiers/soldier';
import { syncPlayerTerritories } from '../map/territory';
import { reinforcementsFor } from '../turns/turnMachine';
import { pushLog } from './log';
import { seedAbilityStates } from '../abilities/abilityEngine';
import { emitGameEvent } from '../events/gameEvents';
import { turnStartedKey } from '../turns/turnMachine';
import { BALANCE } from '../config/balance';
import { defaultRng, seededRng, shuffle } from '../rng/rng';
import type { Rng } from '../rng/rng';
import { buildDeck, createCardInstance } from '../deck/deck';
import { dealMissions } from '../missions/missionEngine';
import { createCollapseState } from '../collapse/collapseEngine';
import { cardDefinitionId } from '../types/ids';

/**
 * PREPARAÇÃO DA PARTIDA.
 *
 * Nova partida → jogadores → facções → ordem → territórios → tropas →
 * objetivos secretos → cartas → Transporte Especial → turno 1.
 */

/** Ordem oficial das facções, definida pelo criador. */
export const FACTION_PRIORITY: FactionId[] = [
  HUMANOS_ID,
  ALIENIGENAS_ID,
  ZUMBIS_ID,
  VAMPIROS_ID,
  MAGOS_ID,
  GOBLINS_ID,
];

export const MAX_PLAYERS = 6;
export const MIN_PLAYERS = 2;

export interface PlayerSetup {
  name?: string;
  factionId?: FactionId;
  kind?: PlayerKind;
}

export interface NewGameOptions {
  /** 2 a 6. Padrão: 4. */
  playerCount?: number;
  players?: PlayerSetup[];
  gameId?: string;
  createdAt?: number;
  rng?: Rng;
  /**
   * Preparação determinística: ordem por assento e distribuição sem sorteio.
   * Usado pelos testes e pelo painel DEV.
   */
  deterministic?: boolean;
}

/** Ids estáveis de jogador — assento 1 a 6. */
export const PLAYER_IDS = {
  p1: makePlayerId('player-1'),
  p2: makePlayerId('player-2'),
  p3: makePlayerId('player-3'),
  p4: makePlayerId('player-4'),
  p5: makePlayerId('player-5'),
  p6: makePlayerId('player-6'),
} as const;

/** Dono dos territórios Remanescentes. Nunca entra na ordem de turno. */
export const NEUTRAL_PLAYER_ID = makePlayerId('remanescentes');

const SEAT_IDS: PlayerId[] = [
  PLAYER_IDS.p1,
  PLAYER_IDS.p2,
  PLAYER_IDS.p3,
  PLAYER_IDS.p4,
  PLAYER_IDS.p5,
  PLAYER_IDS.p6,
];

export function territoriesPerPlayer(playerCount: number): number {
  return BALANCE.setup.territoriesPerPlayer[playerCount] ?? 5;
}

/** Territórios que sobram e viram Remanescentes neutros. */
export function neutralTerritoryCount(playerCount: number): number {
  return TERRITORY_SEEDS.length - territoriesPerPlayer(playerCount) * playerCount;
}

/** Tropas iniciais: territórios × 3, mais a compensação de assento. */
export function startingTroopsFor(playerCount: number, seat: number): number {
  const base = territoriesPerPlayer(playerCount) * BALANCE.setup.troopsPerTerritory;
  return base + BALANCE.setup.seatCompensation * (seat - 1);
}

export function signatureCardOf(factionId: FactionId): CardDefinitionId {
  if (factionId === HUMANOS_ID) return SEQUESTRO_CARD_ID;
  const id = SIGNATURE_BY_FACTION[factionId as string];
  return cardDefinitionId(id ?? (SEQUESTRO_CARD_ID as string));
}

export function createGame(options: NewGameOptions = {}): GameState {
  const requested = options.players?.length ?? options.playerCount ?? 4;
  const playerCount = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, requested));
  const rng = options.rng ?? (options.deterministic ? seededRng(20260827) : defaultRng);

  // --- Territórios ---------------------------------------------------------
  const territories: Record<string, Territory> = {};
  for (const seed of TERRITORY_SEEDS) {
    territories[seed.id as string] = {
      id: seed.id,
      name: seed.name,
      controllerId: null,
      garrison: [],
      neighbors: [...seed.neighbors],
      status: 'STABLE',
      region: seed.region,
      position: seed.position,
    };
  }

  // --- Ordem dos jogadores -------------------------------------------------
  // Sorteio (1d6 por jogador) representado por um embaralhamento dos assentos.
  const seats = SEAT_IDS.slice(0, playerCount);
  const order = options.deterministic ? seats : shuffle(seats, rng);

  // --- Escolha de facção ---------------------------------------------------
  // Regra do game design: escolha na ORDEM INVERSA da ordem de turno.
  const availableFactions = FACTION_PRIORITY.filter(
    (id) => !(options.players ?? []).some((p) => p.factionId === id),
  );
  const reversed = [...order].reverse();
  const factionByPlayer = new Map<string, FactionId>();
  let nextFaction = 0;
  for (const id of reversed) {
    const seatIndex = seats.indexOf(id);
    const explicit = options.players?.[seatIndex]?.factionId;
    factionByPlayer.set(id as string, explicit ?? availableFactions[nextFaction++]);
  }

  // --- Jogadores -----------------------------------------------------------
  const players: Record<string, Player> = {};
  order.forEach((id, index) => {
    const seatIndex = seats.indexOf(id);
    const setup = options.players?.[seatIndex];
    const factionId = factionByPlayer.get(id as string)!;
    const faction = getFaction(factionId);
    players[id as string] = {
      id,
      name: setup?.name ?? `Jogador ${index + 1}`,
      factionId,
      kind: setup?.kind ?? 'HUMAN',
      territoryIds: [],
      handCardIds: [],
      status: 'ACTIVE',
      seat: index + 1,
      transportCharges: BALANCE.transport.startingCharges,
      turnsWithoutCard: 0,
      color: faction.color,
    };
  });

  // --- Distribuição dos territórios ---------------------------------------
  const perPlayer = territoriesPerPlayer(playerCount);
  const pool = options.deterministic
    ? TERRITORY_SEEDS.map((t) => t.id)
    : shuffle(TERRITORY_SEEDS.map((t) => t.id), rng);
  let cursor = 0;
  for (let round = 0; round < perPlayer; round += 1) {
    for (const id of order) {
      territories[pool[cursor++] as string].controllerId = id;
    }
  }
  const neutralIds = pool.slice(cursor);

  const state: GameState = {
    version: GAME_STATE_VERSION,
    id: options.gameId ?? `game-${options.createdAt ?? Date.now()}`,
    createdAt: options.createdAt ?? Date.now(),
    status: 'IN_PROGRESS',
    turn: {
      number: 1,
      turnsPlayed: 0,
      phase: 'REFORCO',
      currentPlayerId: order[0],
      order,
      currentIndex: 0,
      pendingReinforcements: 0,
      commonAttackUsed: false,
      specialAttackUsed: false,
      movesUsed: 0,
      movesAllowed: BALANCE.movement.perTurn,
      drewCard: false,
      cardsDrawn: 0,
      conversionsThisTurn: 0,
      conquestsThisTurn: 0,
    },
    players,
    territories,
    soldiers: {},
    cards: {},
    deck: buildDeck(rng),
    discard: [],
    pendingAttack: null,
    pendingOccupation: null,
    pendingDistribution: null,
    animationQueue: [],
    abilityStates: {},
    effectQueue: [],
    effectHistory: [],
    abilityFeed: [],
    emittedEventKeys: [],
    missions: {},
    collapse: createCollapseState(rng),
    disabledLinks: [],
    territoryModifiers: [],
    result: null,
    log: [],
    counters: { soldier: 0, card: 0, event: 0, log: 0, effect: 0 },
  };

  // --- Tropas iniciais -----------------------------------------------------
  // Cada território recebe 1 soldado; o restante é distribuído em rodízio.
  for (const id of order) {
    const player = players[id as string];
    const owned = Object.values(territories).filter((t) => t.controllerId === id);
    const total = startingTroopsFor(playerCount, player.seat);
    for (const territory of owned) {
      createSoldier(state, {
        factionId: player.factionId,
        ownerId: id,
        territoryId: territory.id,
      });
    }
    for (let i = 0; i < total - owned.length; i += 1) {
      createSoldier(state, {
        factionId: player.factionId,
        ownerId: id,
        territoryId: owned[i % owned.length].id,
      });
    }
  }

  // --- Remanescentes (territórios neutros) --------------------------------
  // Um "jogador" neutro segura as sobras: defende normalmente, nunca joga.
  if (neutralIds.length > 0) {
    state.players[NEUTRAL_PLAYER_ID as string] = {
      id: NEUTRAL_PLAYER_ID,
      name: 'Remanescentes',
      factionId: REMANESCENTES_ID,
      kind: 'AI',
      territoryIds: [],
      handCardIds: [],
      status: 'NEUTRAL',
      seat: 0,
      transportCharges: 0,
      turnsWithoutCard: 0,
      color: getFaction(REMANESCENTES_ID).color,
    };
    for (const id of neutralIds) {
      state.territories[id as string].controllerId = NEUTRAL_PLAYER_ID;
      for (let i = 0; i < BALANCE.setup.neutralGarrison; i += 1) {
        createSoldier(state, {
          factionId: REMANESCENTES_ID,
          ownerId: NEUTRAL_PLAYER_ID,
          territoryId: id,
        });
      }
    }
  }

  // --- Cartas assinatura ---------------------------------------------------
  for (const id of order) {
    createCardInstance(state, id, signatureCardOf(players[id as string].factionId));
  }

  // --- Objetivos secretos --------------------------------------------------
  const deal = dealMissions(
    order.map((id) => ({ id, factionId: players[id as string].factionId as string })),
    rng,
  );
  state.missions = deal.assignments;

  syncPlayerTerritories(state);
  for (const id of order) seedAbilityStates(state, id);
  state.turn.pendingReinforcements = reinforcementsFor(state, state.turn.currentPlayerId);

  pushLog(
    state,
    'INFO',
    `Partida iniciada com ${playerCount} jogadores. ${neutralIds.length} território(s) Remanescente(s).`,
  );
  emitGameEvent(state, {
    kind: 'TURN_STARTED',
    payload: { playerId: state.turn.currentPlayerId },
    dedupeKey: turnStartedKey(state.turn.number, state.turn.currentPlayerId),
  });
  return state;
}

/** Cria uma cópia de carta na mão de um jogador (compatibilidade). */
export function grantCard(
  draft: GameState,
  owner: PlayerId,
  definitionId: CardDefinitionId,
): CardInstance {
  return createCardInstance(draft, owner, definitionId);
}
