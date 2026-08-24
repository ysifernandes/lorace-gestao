import { GAME_STATE_VERSION } from '../types/game.types';
import type { GameState } from '../types/game.types';
import type { CardInstance } from '../types/card.types';
import { cardInstanceId } from '../types/ids';
import type { Territory } from '../types/territory.types';
import type { Player } from '../types/player.types';
import { TERRITORY_SEEDS } from '../../data/territories.seed';
import { PLAYER_SEEDS } from '../../data/players.seed';
import { STARTING_CARDS } from '../../data/cards.seed';
import { getFaction } from '../factions/faction.registry';
import { getCardDefinition } from '../cards/card.registry';
import { createSoldier } from '../soldiers/soldier';
import { syncPlayerTerritories } from '../map/territory';
import { reinforcementsFor } from '../turns/turnMachine';
import { pushLog } from './log';

export interface NewGameOptions {
  gameId?: string;
  createdAt?: number;
}

/** Cria uma partida nova a partir dos seeds de dados. */
export function createGame(options: NewGameOptions = {}): GameState {
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

  const players: Record<string, Player> = {};
  for (const seed of PLAYER_SEEDS) {
    players[seed.id as string] = {
      id: seed.id,
      name: seed.name,
      factionId: seed.factionId,
      kind: seed.kind,
      territoryIds: [],
      handCardIds: [],
      status: 'ACTIVE',
    };
    for (const territory of seed.startingTerritoryIds) {
      const target = territories[territory as string];
      if (!target) throw new Error(`Seed inválido: território ${territory} não existe.`);
      target.controllerId = seed.id;
    }
  }

  const order = PLAYER_SEEDS.map((p) => p.id);
  const state: GameState = {
    version: GAME_STATE_VERSION,
    id: options.gameId ?? `game-${options.createdAt ?? Date.now()}`,
    createdAt: options.createdAt ?? Date.now(),
    status: 'IN_PROGRESS',
    turn: {
      number: 1,
      phase: 'INICIO',
      currentPlayerId: order[0],
      order,
      currentIndex: 0,
      pendingReinforcements: 0,
    },
    players,
    territories,
    soldiers: {},
    cards: {},
    pendingAttack: null,
    pendingOccupation: null,
    pendingDistribution: null,
    animationQueue: [],
    log: [],
    counters: { soldier: 0, card: 0, event: 0, log: 0 },
  };

  // Guarnições iniciais, criadas pelo caminho oficial (registro único de soldados).
  for (const seed of PLAYER_SEEDS) {
    const faction = getFaction(seed.factionId);
    for (const territory of seed.startingTerritoryIds) {
      for (let i = 0; i < faction.startingSoldiersPerTerritory; i += 1) {
        createSoldier(state, {
          factionId: seed.factionId,
          ownerId: seed.id,
          territoryId: territory,
        });
      }
    }
  }

  for (const cardSeed of STARTING_CARDS) {
    for (let i = 0; i < cardSeed.copies; i += 1) {
      grantCard(state, cardSeed.playerId, cardSeed.definitionId);
    }
  }

  syncPlayerTerritories(state);
  state.turn.pendingReinforcements = reinforcementsFor(state, state.turn.currentPlayerId);
  pushLog(state, 'INFO', 'Partida criada. O Colapso continua.');
  return state;
}

/** Cria uma cópia de carta na mão de um jogador. */
export function grantCard(
  draft: GameState,
  owner: Player['id'],
  definitionId: CardInstance['definitionId'],
): CardInstance {
  const definition = getCardDefinition(definitionId);
  const player = draft.players[owner as string];
  if (!player) throw new Error(`Jogador inexistente: ${owner}`);
  draft.counters.card += 1;
  const instance: CardInstance = {
    instanceId: cardInstanceId(`card-${draft.counters.card}`),
    definitionId: definition.id,
    ownerId: owner,
    state: 'IN_HAND',
    usesRemaining: definition.maxUses,
    usedMode: null,
    history: [],
  };
  draft.cards[instance.instanceId as string] = instance;
  player.handCardIds.push(instance.instanceId);
  return instance;
}
