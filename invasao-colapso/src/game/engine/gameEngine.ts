import type { GameState, PendingAttack } from '../types/game.types';
import type { PlayerId, SoldierId, TerritoryId } from '../types/ids';
import type { TurnPhase } from '../types/turn.types';
import type { Rng } from '../rng/rng';
import { defaultRng, scriptedRng } from '../rng/rng';
import type { ActionResult, GameAction } from './actions';
import { createGame, grantCard, NEUTRAL_PLAYER_ID } from './setup';
import { pushLog } from './log';
import {
  advancePhase,
  endTurn,
  movesAllowedFor,
  reinforcementsFor,
  turnStartedKey,
} from '../turns/turnMachine';
import { PHASE_LABELS, TURN_PHASES } from '../turns/phaseExports';
import { getTerritory, syncPlayerTerritories, territoriesOf } from '../map/territory';
import {
  createSoldier,
  eliminateSoldier,
  placeInTerritory,
  soldiersInTerritory,
} from '../soldiers/soldier';
import { distanceBetween, isAdjacent } from '../map/adjacency';
import { isLinkKind, regionOfTerritory } from '../map/regions';
import { conquerTerritory } from '../combat/conquest';
import {
  attackerCapFor,
  attackerDiceFor,
  canContinueBattle,
  livingAttackers,
  planBattle,
  rollBattleRound,
} from '../combat/battle';
import { getFaction } from '../factions/faction.registry';
import { canUseCard, consumeCard, effectFor, getCardInstance } from '../cards/cardRules';
import { getCardDefinition } from '../cards/card.registry';
import { applySequestro, validateSequestroSelection } from '../cards/effects/sequestro.effect';
import { applyVacina } from '../cards/effects/vacina.effect';
import { applyCardAction } from '../cards/cardActions';
import { emitAnimation, markAnimationPlayed } from '../events/animationEvents';
import { reserveSoldiers } from './selectors';
import { emitGameEvent } from '../events/gameEvents';
import {
  abilityKey,
  buildContext,
  checkAvailability,
  consumeUsage,
  getAbilityState,
  initialAbilityState,
} from '../abilities/abilityEngine';
import { getAbility, tryGetAbility } from '../abilities/ability.registry';
import { enqueueEffect, clearEffectQueue, resolveEffectQueue } from '../effects/effectQueue';
import { EFFECT_PRIORITY } from '../effects/effect.types';
import { BALANCE } from '../config/balance';
import {
  applyPendingCollapse,
  armCollapse,
  crossesQuarantine,
  defenseDiceCap,
  expireCollapseEffects,
  maxChargesFor,
  rollForCollapse,
  specialAttackBlocked,
} from '../collapse/collapseEngine';
import { canDrawNow, discardCard, drawCardFor, enforceHandLimit } from '../deck/deck';
import { activeModifiersFor, blocksReinforce, blocksSpecialAttack } from './modifiers';
import { processEliminations, settleVictory } from './victory';
import {
  checkMission,
  effectiveMissionOf,
  getMission,
  trackConquest,
  trackCollapseSurvived,
  trackRegionHold,
} from '../missions/missionEngine';

export interface EngineOptions {
  rng?: Rng;
}

/** Clona o estado para tratar cada handler como uma transação isolada. */
function draftOf(state: GameState): GameState {
  return structuredClone(state);
}

function fail(state: GameState, error: string): ActionResult {
  return { ok: false, state, error };
}

/** Bloqueios que impedem sair do estado atual. */
function pendingBlocker(state: GameState): string | null {
  if (state.status === 'FINISHED') return 'A partida terminou.';
  if (state.collapse.pending) return 'Resolva o Evento do Colapso em andamento.';
  if (state.pendingAttack?.status === 'DECLARED') return 'Encerre a batalha em andamento.';
  if (state.pendingOccupation) return 'Ocupe o território conquistado.';
  if (state.pendingDistribution) return 'Distribua as tropas capturadas.';
  return null;
}

/** Efeitos de início de turno que dependem da facção. */
function applyStartOfTurnRules(draft: GameState, playerId: PlayerId): void {
  const player = draft.players[playerId as string];
  if (!player) return;
  const rules = getFaction(player.factionId).rules;
  // Fraqueza dos Zumbis: pilhas grandes apodrecem.
  if (rules.overcrowdThreshold) {
    for (const territory of territoriesOf(draft, playerId)) {
      if (territory.garrison.length >= rules.overcrowdThreshold) {
        eliminateSoldier(draft, territory.garrison[territory.garrison.length - 1]);
        pushLog(draft, 'ACTION', `${territory.name}: 1 soldado perdido por superlotação.`);
      }
    }
  }
  draft.turn.pendingReinforcements = reinforcementsFor(draft, playerId);
  draft.turn.movesAllowed = movesAllowedFor(draft, playerId);
}

/** Efeitos de fim de turno: passivas, missões, limite de mão. */
function applyEndOfTurnRules(draft: GameState, playerId: PlayerId): void {
  const player = draft.players[playerId as string];
  if (!player) return;
  const rules = getFaction(player.factionId).rules;

  // Passiva de reposição em turno sem conquista.
  if (rules.borderReinforceOnQuietTurn && draft.turn.conquestsThisTurn === 0) {
    const border = territoriesOf(draft, playerId).find((t) =>
      t.neighbors.some((n) => {
        const neighbor = draft.territories[n as string];
        return neighbor?.controllerId && neighbor.controllerId !== playerId;
      }),
    );
    if (border) {
      for (let i = 0; i < rules.borderReinforceOnQuietTurn; i += 1) {
        createSoldier(draft, {
          factionId: player.factionId,
          ownerId: playerId,
          territoryId: border.id,
        });
      }
      pushLog(draft, 'ABILITY', `Reposição contínua: +1 soldado em ${border.name}.`);
    }
  }

  // Ponto de Interesse: Setor Militar rende 1 soldado por turno.
  for (const territory of territoriesOf(draft, playerId)) {
    if ((territory.id as string) === 'reduto-do-comando') {
      createSoldier(draft, {
        factionId: player.factionId,
        ownerId: playerId,
        territoryId: territory.id,
      });
      pushLog(draft, 'ACTION', `Setor Militar: +1 soldado.`);
    }
  }

  // Passiva REGENERAÇÃO (Vampiros): territórios feridos recuperam 1 soldado.
  if (rules.regenerateWoundedTerritories) {
    const wounded = territoriesOf(draft, playerId)
      .filter((t) => t.garrison.length < BALANCE.territory.woundedBelow)
      .sort((a, b) => a.garrison.length - b.garrison.length)
      .slice(0, rules.regenerateWoundedTerritories);
    for (const territory of wounded) {
      createSoldier(draft, {
        factionId: player.factionId,
        ownerId: playerId,
        territoryId: territory.id,
      });
    }
    if (wounded.length > 0) {
      pushLog(
        draft,
        'ABILITY',
        `Regeneração: +1 soldado em ${wounded.map((t) => t.name).join(', ')}.`,
      );
    }
  }

  if (draft.turn.conquestsThisTurn === 0 && !draft.turn.drewCard) {
    player.turnsWithoutCard += 1;
  }
  enforceHandLimit(draft, playerId);
}

/** Fim de rodada: expira efeitos, atualiza missões e rola o Evento do Colapso. */
function endOfRound(draft: GameState, rng: Rng): void {
  for (const id of draft.turn.order) {
    if (draft.players[id as string]?.status === 'ACTIVE') trackRegionHold(draft, id);
  }

  // Recarga do Transporte Especial.
  for (const player of Object.values(draft.players)) {
    if (player.status !== 'ACTIVE') continue;
    const hasDepot = territoriesOf(draft, player.id).some(
      (t) => (t.id as string) === 'usina-nuclear',
    );
    const every = hasDepot
      ? BALANCE.transport.rechargeWithDepotRounds
      : BALANCE.transport.rechargeEveryRounds;
    if (draft.turn.number % every === 0) {
      const max = maxChargesFor(draft, player.id);
      if (player.transportCharges < max) {
        player.transportCharges += 1;
        pushLog(draft, 'ACTION', `${player.name}: +1 carga de Transporte Especial.`);
      }
    }
  }

  const eventId = rollForCollapse(draft, rng);
  draft.turn.number += 1;
  const restored = expireCollapseEffects(draft);
  if (restored.length > 0) {
    pushLog(draft, 'COLLAPSE', `Efeitos encerrados: ${restored.join(', ')}.`);
  }
  if (eventId) {
    armCollapse(draft, eventId, rng);
    if (draft.collapse.pending) {
      pushLog(draft, 'COLLAPSE', '⚠ ALERTA DE COLAPSO');
      emitAnimation(
        draft,
        {
          id: 'anim.collapse.alert',
          name: 'Alerta de Colapso',
          beats: [
            { kind: 'ALERT_SIREN', durationMs: 900 },
            { kind: 'COUNTDOWN', durationMs: 1800 },
            { kind: 'REVEAL', durationMs: 900 },
          ],
        },
        { eventId },
      );
    }
  }
}

/** Passa a vez, tratando fim de rodada e vitória. */
function passTurn(draft: GameState, rng: Rng): void {
  const previous = draft.turn.currentPlayerId;
  applyEndOfTurnRules(draft, previous);
  emitGameEvent(draft, { kind: 'TURN_ENDED', payload: { playerId: previous } });

  const nextIndexWraps =
    draft.turn.order.findIndex(
      (id, index) => index > draft.turn.currentIndex && draft.players[id as string]?.status === 'ACTIVE',
    ) === -1;
  if (nextIndexWraps) endOfRound(draft, rng);

  endTurn(draft);
  applyStartOfTurnRules(draft, draft.turn.currentPlayerId);
  emitGameEvent(draft, {
    kind: 'TURN_STARTED',
    payload: { playerId: draft.turn.currentPlayerId },
    dedupeKey: turnStartedKey(draft.turn.number, draft.turn.currentPlayerId),
  });
  settleVictory(draft);
}

/** Encerra a batalha em andamento e devolve os soldados ao estado normal. */
function closeBattle(draft: GameState, status: 'RESOLVED' | 'CANCELLED'): void {
  const attack = draft.pendingAttack;
  if (!attack) return;
  attack.status = status;
  for (const soldier of Object.values(draft.soldiers)) {
    if (soldier.alive && (soldier.status === 'ATTACKING' || soldier.status === 'DEFENDING')) {
      soldier.status = 'READY';
    }
  }
  const target = draft.territories[attack.toTerritoryId as string];
  if (target) target.status = 'STABLE';
  draft.pendingAttack = null;
}

/** Conquista o território alvo da batalha atual. */
function resolveConquest(draft: GameState, attack: PendingAttack, rng: Rng = defaultRng): void {
  const origin = draft.territories[attack.fromTerritoryId as string];
  const target = draft.territories[attack.toTerritoryId as string];
  const defenderId = attack.defenderPlayerId;

  const occupation = conquerTerritory(draft, {
    from: attack.fromTerritoryId,
    to: attack.toTerritoryId,
  });
  draft.turn.conquestsThisTurn += 1;
  trackConquest(draft, attack.attackerPlayerId, target.id as string);

  // Passiva de conversão (Zumbis): defensores eliminados viram tropa sua,
  // até o teto por turno declarado em `rules.conquestConversionPerTurn`.
  const attackerFaction = getFaction(draft.players[attack.attackerPlayerId as string].factionId);
  const conversionRule = attackerFaction.rules.conquestConversion ?? 0;
  if (conversionRule > 0) {
    const cap = attackerFaction.rules.conquestConversionPerTurn ?? Number.POSITIVE_INFINITY;
    const room = Math.max(0, cap - draft.turn.conversionsThisTurn);
    const converted = Math.min(conversionRule, room);
    for (let i = 0; i < converted; i += 1) {
      createSoldier(draft, {
        factionId: attackerFaction.id,
        ownerId: attack.attackerPlayerId,
        territoryId: target.id,
      });
    }
    if (converted > 0) {
      draft.turn.conversionsThisTurn += converted;
      occupation.min = Math.max(0, occupation.min - converted);
      pushLog(
        draft,
        'ABILITY',
        `Infestação: ${converted} defensor(es) eliminado(s) passaram para o seu exército.`,
      );
    }
  }

  // Passiva de mutação (Alienígenas): a conquista gera soldados extras.
  const mutation = attackerFaction.rules.conquestMutation ?? 0;
  if (mutation > 0) {
    for (let i = 0; i < mutation; i += 1) {
      createSoldier(draft, {
        factionId: attackerFaction.id,
        ownerId: attack.attackerPlayerId,
        territoryId: target.id,
      });
    }
    pushLog(draft, 'ABILITY', `Evolução Biológica: +${mutation} soldado(s) em ${target.name}.`);
  }

  // Passiva de saque (Goblins): conquistar compra carta na hora.
  const loot = attackerFaction.rules.drawOnConquest ?? 0;
  for (let i = 0; i < loot; i += 1) {
    const card = drawCardFor(draft, attack.attackerPlayerId, rng);
    if (!card) break;
    pushLog(draft, 'CARD', `Saque Rápido: 1 carta tomada na conquista.`);
  }


  // Fraqueza de perder território: descarta 1 carta.
  const defenderFaction = getFaction(draft.players[defenderId as string]?.factionId);
  if (defenderFaction?.rules.discardOnTerritoryLost) {
    const defender = draft.players[defenderId as string];
    const first = defender?.handCardIds[0];
    if (first) {
      discardCard(draft, first as string);
      pushLog(draft, 'CARD', `${defender.name} descarta 1 carta ao perder território.`);
    }
  }

  emitGameEvent(draft, {
    kind: 'TERRITORY_CONQUERED',
    payload: { playerId: attack.attackerPlayerId, territoryId: target.id },
  });
  emitGameEvent(draft, {
    kind: 'TERRITORY_LOST',
    payload: { playerId: defenderId, territoryId: target.id },
  });
  pushLog(
    draft,
    'COMBAT',
    `${origin?.name} conquistou ${target?.name}. Ocupação obrigatória: ` +
      `${occupation.min}-${occupation.max} soldado(s).`,
  );
}

/**
 * Reducer puro da partida. Recebe estado + ação e devolve novo estado
 * ou um erro — sem nunca aplicar mudanças parciais.
 */
export function applyAction(
  state: GameState,
  action: GameAction,
  options: EngineOptions = {},
): ActionResult {
  const rng = options.rng ?? defaultRng;

  switch (action.type) {
    case 'NEW_GAME':
      return { ok: true, state: createGame(action.options), info: 'Nova partida criada.' };

    // ---------------------------------------------------------------- turno
    case 'ADVANCE_PHASE': {
      const blocker = pendingBlocker(state);
      if (blocker) return fail(state, blocker);
      const draft = draftOf(state);
      if (draft.turn.phase === 'REFORCO' && draft.turn.pendingReinforcements > 0) {
        return fail(
          state,
          `Distribua os ${draft.turn.pendingReinforcements} reforço(s) antes de avançar.`,
        );
      }
      const before = PHASE_LABELS[draft.turn.phase];
      const wasLast = draft.turn.phase === 'FIM_TURNO';
      if (wasLast) {
        passTurn(draft, rng);
        const player = draft.players[draft.turn.currentPlayerId as string];
        pushLog(draft, 'ACTION', `Rodada ${draft.turn.number}: vez de ${player?.name ?? '???'}.`);
      } else {
        advancePhase(draft);
        pushLog(draft, 'ACTION', `${before} → ${PHASE_LABELS[draft.turn.phase]}.`);
        emitGameEvent(draft, {
          kind: 'PHASE_CHANGED',
          payload: { playerId: draft.turn.currentPlayerId, phase: draft.turn.phase },
        });
      }
      // O objetivo secreto é verificado ao final de cada fase, como manda o
      // game design: um efeito pode cumpri-lo fora do turno de quem o possui.
      processEliminations(draft, null);
      settleVictory(draft);
      return { ok: true, state: draft };
    }

    case 'END_TURN': {
      const blocker = pendingBlocker(state);
      if (blocker) return fail(state, blocker);
      const draft = draftOf(state);
      passTurn(draft, rng);
      const player = draft.players[draft.turn.currentPlayerId as string];
      pushLog(draft, 'ACTION', `Rodada ${draft.turn.number}: vez de ${player?.name ?? '???'}.`);
      return { ok: true, state: draft };
    }

    // -------------------------------------------------------------- reforço
    case 'ADD_SOLDIERS': {
      if (!Number.isInteger(action.amount) || action.amount <= 0) {
        return fail(state, 'Quantidade inválida.');
      }
      const draft = draftOf(state);
      const territory = draft.territories[action.territoryId as string];
      if (!territory) return fail(state, 'Território inexistente.');
      const ownerId = action.ownerId ?? territory.controllerId ?? draft.turn.currentPlayerId;
      const owner = draft.players[ownerId as string];
      if (!owner) return fail(state, 'Jogador inexistente.');

      // Reforço normal: consome os reforços pendentes do jogador do turno.
      const isReinforcement = !action.ownerId && draft.turn.phase === 'REFORCO';
      if (isReinforcement) {
        if (territory.controllerId !== draft.turn.currentPlayerId) {
          return fail(state, `${territory.name} não é seu.`);
        }
        if (blocksReinforce(draft, territory.id)) {
          return fail(state, `${territory.name} não pode receber reforços agora.`);
        }
        if (action.amount > draft.turn.pendingReinforcements) {
          return fail(
            state,
            `Você tem apenas ${draft.turn.pendingReinforcements} reforço(s) disponível(is).`,
          );
        }
        draft.turn.pendingReinforcements -= action.amount;
      }

      for (let i = 0; i < action.amount; i += 1) {
        createSoldier(draft, {
          factionId: owner.factionId,
          ownerId: owner.id,
          territoryId: territory.id,
        });
      }
      syncPlayerTerritories(draft);
      pushLog(draft, 'ACTION', `+${action.amount} soldado(s) em ${territory.name}.`);
      return { ok: true, state: draft };
    }

    case 'AUTO_REINFORCE': {
      const draft = draftOf(state);
      if (draft.turn.phase !== 'REFORCO') return fail(state, 'Só na fase de REFORÇO.');
      const pending = draft.turn.pendingReinforcements;
      if (pending <= 0) return fail(state, 'Não há reforços pendentes.');
      const owned = territoriesOf(draft, draft.turn.currentPlayerId).filter(
        (t) => !blocksReinforce(draft, t.id),
      );
      if (owned.length === 0) return fail(state, 'Nenhum território pode receber reforços.');
      const player = draft.players[draft.turn.currentPlayerId as string];
      // Prioriza fronteiras: reforço automático não deve desperdiçar tropa.
      const border = owned.filter((t) =>
        t.neighbors.some((n) => {
          const neighbor = draft.territories[n as string];
          return neighbor?.controllerId && neighbor.controllerId !== player.id;
        }),
      );
      const targets = border.length > 0 ? border : owned;
      for (let i = 0; i < pending; i += 1) {
        createSoldier(draft, {
          factionId: player.factionId,
          ownerId: player.id,
          territoryId: targets[i % targets.length].id,
        });
      }
      draft.turn.pendingReinforcements = 0;
      pushLog(draft, 'ACTION', `${pending} reforço(s) distribuído(s) automaticamente.`);
      return { ok: true, state: draft };
    }

    // --------------------------------------------------------- movimentação
    case 'MOVE_SOLDIERS': {
      if (!Number.isInteger(action.amount) || action.amount <= 0) {
        return fail(state, 'Quantidade inválida.');
      }
      const draft = draftOf(state);
      const from = draft.territories[action.from as string];
      const to = draft.territories[action.to as string];
      if (!from || !to) return fail(state, 'Território inexistente.');
      if (from.id === to.id) return fail(state, 'Origem e destino precisam ser diferentes.');
      if (from.controllerId !== draft.turn.currentPlayerId) {
        return fail(state, 'Só é possível mover tropas de um território seu.');
      }
      if (to.controllerId !== from.controllerId) {
        return fail(state, 'O destino precisa ser um território seu.');
      }
      if (draft.turn.phase !== 'MOVIMENTACAO') {
        return fail(state, 'A movimentação só acontece na fase MOVIMENTAÇÃO.');
      }
      if (draft.turn.movesUsed >= draft.turn.movesAllowed) {
        return fail(state, `Você já usou ${draft.turn.movesAllowed} movimentação(ões) neste turno.`);
      }
      if (blocksReinforce(draft, to.id)) {
        return fail(state, `${to.name} não pode receber tropas agora.`);
      }

      const faction = getFaction(draft.players[from.controllerId as string].factionId);
      const adjacent = isAdjacent(draft, from.id, to.id);
      if (!adjacent) {
        if (!faction.rules.chainMovement) {
          return fail(state, `${from.name} não faz fronteira com ${to.name}.`);
        }
        if (!connectedThroughOwnTerritories(draft, from.id, to.id)) {
          return fail(state, 'Não há cadeia contínua de territórios seus entre origem e destino.');
        }
      }

      const maxByFaction = faction.rules.maxSoldiersPerMove ?? Number.POSITIVE_INFINITY;
      const maxByRoute = isLinkKind(from.id, to.id, 'MARITIMA')
        ? BALANCE.movement.coastalRouteLimit
        : Number.POSITIVE_INFINITY;
      const limit = Math.min(maxByFaction, maxByRoute);
      if (action.amount > limit) {
        return fail(state, `Esta movimentação permite no máximo ${limit} soldado(s).`);
      }
      if (from.garrison.length - action.amount < BALANCE.territory.minGarrison) {
        return fail(state, 'É obrigatório deixar ao menos 1 soldado na origem.');
      }

      for (const soldierId of from.garrison.slice(0, action.amount)) {
        placeInTerritory(draft, soldierId, to.id);
        draft.soldiers[soldierId as string].status = 'MOVED';
      }
      draft.turn.movesUsed += 1;
      pushLog(draft, 'ACTION', `${action.amount} soldado(s): ${from.name} → ${to.name}.`);
      emitGameEvent(draft, {
        kind: 'TROOPS_MOVED',
        payload: {
          playerId: from.controllerId,
          fromTerritoryId: from.id,
          toTerritoryId: to.id,
          amount: action.amount,
        },
      });
      return { ok: true, state: draft };
    }

    // -------------------------------------------------------------- combate
    case 'DECLARE_ATTACK': {
      const draft = draftOf(state);
      if (draft.status === 'FINISHED') return fail(state, 'A partida terminou.');
      if (draft.pendingAttack?.status === 'DECLARED') {
        return fail(state, 'Já existe uma batalha em andamento.');
      }
      if (draft.turn.phase !== 'ATAQUE_COMUM') {
        return fail(state, 'O Ataque Comum só acontece na fase ATAQUE COMUM.');
      }
      if (draft.turn.commonAttackUsed) {
        return fail(state, 'REGRA OFICIAL: somente 1 Ataque Comum por turno.');
      }
      const from = draft.territories[action.from as string];
      const to = draft.territories[action.to as string];
      if (!from || !to) return fail(state, 'Território inexistente.');
      if (from.controllerId !== draft.turn.currentPlayerId) {
        return fail(state, 'Só o jogador do turno pode atacar, a partir de um território seu.');
      }
      if (!to.controllerId || to.controllerId === from.controllerId) {
        return fail(state, 'O alvo precisa ser um território inimigo.');
      }
      if (!isAdjacent(draft, from.id, to.id)) {
        return fail(state, `${from.name} não faz fronteira com ${to.name}.`);
      }
      if (crossesQuarantine(draft, from.id, to.id)) {
        return fail(state, 'Quarentena: esta fronteira está fechada nesta rodada.');
      }
      const cap = attackerCapFor(draft, from.id, to.id);
      if (attackerDiceFor(from.garrison.length, cap) <= 0) {
        return fail(state, 'É preciso ter ao menos 2 soldados para atacar.');
      }

      const attackers = from.garrison.slice(0, Math.max(1, from.garrison.length - 1));
      for (const soldierId of attackers) draft.soldiers[soldierId as string].status = 'ATTACKING';
      for (const defender of soldiersInTerritory(draft, to.id)) {
        draft.soldiers[defender.id as string].status = 'DEFENDING';
      }
      draft.turn.commonAttackUsed = true;
      draft.pendingAttack = {
        id: `atk-${draft.turn.turnsPlayed}-${from.id}-${to.id}`,
        attackerPlayerId: from.controllerId,
        defenderPlayerId: to.controllerId,
        fromTerritoryId: from.id,
        toTerritoryId: to.id,
        attackingSoldierIds: attackers,
        kind: 'COMMON',
        rounds: [],
        attackerDiceCap: cap,
        defenderDiceCap: defenseDiceCap(draft),
        reactionsUsed: [],
        rerolls: [],
        status: 'DECLARED',
      };
      to.status = 'CONTESTED';
      pushLog(draft, 'COMBAT', `Ataque Comum declarado: ${from.name} → ${to.name}.`);
      emitGameEvent(draft, {
        kind: 'BATTLE_STARTED',
        payload: {
          playerId: from.controllerId,
          opponentId: to.controllerId,
          fromTerritoryId: from.id,
          toTerritoryId: to.id,
        },
      });
      emitGameEvent(draft, {
        kind: 'BEFORE_DEFENSE',
        payload: { playerId: to.controllerId, opponentId: from.controllerId, territoryId: to.id },
      });
      return { ok: true, state: draft };
    }

    case 'DECLARE_SPECIAL_ATTACK': {
      const draft = draftOf(state);
      if (draft.status === 'FINISHED') return fail(state, 'A partida terminou.');
      if (draft.pendingAttack?.status === 'DECLARED') {
        return fail(state, 'Já existe uma batalha em andamento.');
      }
      if (draft.turn.phase !== 'ATAQUE_ESPECIAL') {
        return fail(state, 'O Ataque Especial só acontece na fase ATAQUE ESPECIAL.');
      }
      if (draft.turn.specialAttackUsed) {
        return fail(state, 'REGRA OFICIAL: no máximo 1 Ataque Especial por turno.');
      }
      if (specialAttackBlocked(draft)) {
        return fail(state, 'Queda de Tensão: nenhum Ataque Especial nesta rodada.');
      }
      const playerId = draft.turn.currentPlayerId;
      const player = draft.players[playerId as string];
      const faction = getFaction(player.factionId);
      const free = Boolean(faction.rules.freeSpecialAttack);
      if (!free && player.transportCharges <= 0) {
        return fail(state, 'Sem carga de Transporte Especial.');
      }

      const from = draft.territories[action.from as string];
      const to = draft.territories[action.to as string];
      if (!from || !to) return fail(state, 'Território inexistente.');
      if (from.controllerId !== playerId) return fail(state, 'A origem precisa ser sua.');
      if (!to.controllerId || to.controllerId === playerId) {
        return fail(state, 'O alvo precisa ser um território inimigo.');
      }
      if (blocksSpecialAttack(draft, to.id)) {
        return fail(state, `${to.name} está protegido contra Ataque Especial.`);
      }
      // REGRA APROVADA, REANCORADA AO MAPA DE REFERÊNCIA: o Transporte Especial
      // não atravessa a zona anômala. No mapa antigo eram as galerias dos
      // Abrigos; no mapa de referência é a ZONA DE IMPACTO, com a mesma exceção
      // do único ponto estável (o Núcleo do Colapso).
      const isAnomalous = (id: TerritoryId) => regionOfTerritory(id)?.id === 'zona-impacto';
      const stableInside = (id: TerritoryId) => (id as string) === 'nucleo-do-colapso';
      if (
        (isAnomalous(from.id) && !stableInside(from.id)) ||
        (isAnomalous(to.id) && !stableInside(to.id))
      ) {
        return fail(state, 'O Transporte Especial não atravessa a Zona de Impacto.');
      }
      const distance = distanceBetween(draft, from.id, to.id);
      if (distance !== BALANCE.transport.range) {
        return fail(
          state,
          `O Ataque Especial alcança apenas distância exatamente ${BALANCE.transport.range}. Distância até o alvo: ${
            Number.isFinite(distance) ? distance : '—'
          }.`,
        );
      }
      const maxSoldiers = Math.min(
        BALANCE.transport.maxSoldiers,
        from.garrison.length - BALANCE.territory.minGarrison,
      );
      if (!Number.isInteger(action.amount) || action.amount <= 0 || action.amount > maxSoldiers) {
        return fail(state, `Envie entre 1 e ${Math.max(0, maxSoldiers)} soldado(s).`);
      }

      if (!free) player.transportCharges -= 1;
      const attackers = from.garrison.slice(0, action.amount);
      for (const soldierId of attackers) draft.soldiers[soldierId as string].status = 'ATTACKING';
      for (const defender of soldiersInTerritory(draft, to.id)) {
        draft.soldiers[defender.id as string].status = 'DEFENDING';
      }
      draft.turn.specialAttackUsed = true;
      draft.pendingAttack = {
        id: `esp-${draft.turn.turnsPlayed}-${from.id}-${to.id}`,
        attackerPlayerId: playerId,
        defenderPlayerId: to.controllerId,
        fromTerritoryId: from.id,
        toTerritoryId: to.id,
        attackingSoldierIds: attackers,
        kind: 'SPECIAL',
        rounds: [],
        attackerDiceCap: BALANCE.dice.maxAttackDice,
        defenderDiceCap: defenseDiceCap(draft),
        reactionsUsed: [],
        rerolls: [],
        status: 'DECLARED',
      };
      to.status = 'CONTESTED';
      pushLog(
        draft,
        'COMBAT',
        `Ataque Especial: ${action.amount} soldado(s) de ${from.name} sobre ${to.name}` +
          `${free ? ' (sem gastar carga)' : ''}.`,
      );
      emitGameEvent(draft, {
        kind: 'BATTLE_STARTED',
        payload: { playerId, opponentId: to.controllerId, fromTerritoryId: from.id, toTerritoryId: to.id },
      });
      emitGameEvent(draft, {
        kind: 'BEFORE_DEFENSE',
        payload: { playerId: to.controllerId, opponentId: playerId, territoryId: to.id },
      });
      return { ok: true, state: draft };
    }

    case 'ROLL_BATTLE_ROUND': {
      const draft = draftOf(state);
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== 'DECLARED') return fail(state, 'Não há batalha em andamento.');
      if (draft.pendingOccupation) return fail(state, 'Ocupe o território conquistado primeiro.');
      const plan = planBattle(draft, attack);
      if (plan.attackerDice <= 0) return fail(state, 'O atacante não tem tropas para continuar.');
      if (plan.defenderDice <= 0) return fail(state, 'Não há defensores.');

      const outcome = rollBattleRound(draft, attack, rng);
      attack.rounds.push(outcome.round);

      // Baixas: atacantes saem dos que estão no ataque; defensores do alvo.
      const attackers =
        attack.kind === 'SPECIAL'
          ? livingAttackers(draft, attack)
          : soldiersInTerritory(draft, attack.fromTerritoryId).map((s) => s.id as string);
      for (let i = 0; i < outcome.round.attackerLosses && i < attackers.length; i += 1) {
        eliminateSoldier(draft, attackers[i] as SoldierId);
      }
      const defenders = soldiersInTerritory(draft, attack.toTerritoryId);
      for (let i = 0; i < outcome.round.defenderLosses && i < defenders.length; i += 1) {
        eliminateSoldier(draft, defenders[i].id);
      }

      emitGameEvent(draft, {
        kind: 'DICE_ROLLED',
        payload: {
          playerId: attack.attackerPlayerId,
          attackerDice: outcome.round.attackerDice,
          defenderDice: outcome.round.defenderDice,
        },
      });
      pushLog(
        draft,
        'COMBAT',
        `Rodada ${outcome.round.index}: ${outcome.round.attackerDice.join('-')} × ` +
          `${outcome.round.defenderDice.join('-')} → atacante −${outcome.round.attackerLosses}, ` +
          `defensor −${outcome.round.defenderLosses}.`,
      );

      const targetEmpty = soldiersInTerritory(draft, attack.toTerritoryId).length === 0;
      if (targetEmpty) {
        resolveConquest(draft, attack, rng);
        attack.status = 'RESOLVED';
        emitGameEvent(draft, { kind: 'AFTER_ATTACK', payload: { playerId: attack.attackerPlayerId } });
        return { ok: true, state: draft, data: { round: outcome.round, conquered: true } };
      }

      if (!canContinueBattle(draft, attack)) {
        closeBattle(draft, 'RESOLVED');
        pushLog(draft, 'COMBAT', 'Batalha encerrada: o atacante não pode continuar.');
        return { ok: true, state: draft, data: { round: outcome.round, exhausted: true } };
      }

      return { ok: true, state: draft, data: { round: outcome.round } };
    }

    case 'RESOLVE_ATTACK':
    case 'CANCEL_ATTACK': {
      const draft = draftOf(state);
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== 'DECLARED') return fail(state, 'Não há batalha em andamento.');
      if (draft.pendingOccupation) {
        return fail(state, 'Ocupe o território conquistado antes de encerrar o ataque.');
      }
      closeBattle(draft, action.type === 'RESOLVE_ATTACK' ? 'RESOLVED' : 'CANCELLED');
      pushLog(draft, 'COMBAT', 'O atacante recuou. A batalha terminou.');
      return { ok: true, state: draft };
    }

    case 'DEV_WIN_ATTACK': {
      const draft = draftOf(state);
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== 'DECLARED') return fail(state, 'Não há batalha em andamento.');
      if (draft.pendingOccupation) return fail(state, 'Já existe uma ocupação pendente.');
      const survivors = livingAttackers(draft, attack);
      if (survivors.length === 0) return fail(state, 'Todos os atacantes foram eliminados.');
      for (const defender of soldiersInTerritory(draft, attack.toTerritoryId)) {
        eliminateSoldier(draft, defender.id);
      }
      resolveConquest(draft, attack, rng);
      attack.status = 'RESOLVED';
      pushLog(draft, 'COMBAT', '[DEV] Batalha vencida.');
      return { ok: true, state: draft };
    }

    case 'OCCUPY_TERRITORY': {
      const draft = draftOf(state);
      const occupation = draft.pendingOccupation;
      if (!occupation) return fail(state, 'Não há território conquistado aguardando ocupação.');
      if (!Number.isInteger(action.amount)) return fail(state, 'Quantidade inválida.');
      if (action.amount < occupation.min) {
        return fail(
          state,
          `O território conquistado não pode ficar vazio: mova ao menos ${occupation.min} soldado(s).`,
        );
      }
      if (action.amount > occupation.max) {
        return fail(state, `Máximo permitido nesta ocupação: ${occupation.max} soldado(s).`);
      }
      const origin = draft.territories[occupation.fromTerritoryId as string];
      const target = draft.territories[occupation.toTerritoryId as string];
      if (!origin || !target) return fail(state, 'Território inexistente na ocupação.');
      if (origin.garrison.length - action.amount < BALANCE.territory.minGarrison) {
        return fail(state, 'É obrigatório deixar ao menos 1 soldado no território de origem.');
      }

      const pool = occupation.eligibleSoldierIds.filter((id) => {
        const soldier = draft.soldiers[id as string];
        return (
          soldier?.alive &&
          soldier.location.kind === 'TERRITORY' &&
          soldier.location.territoryId === origin.id
        );
      });
      const fallback = soldiersInTerritory(draft, origin.id).map((s) => s.id);
      const source = pool.length >= action.amount ? pool : fallback;
      for (let i = 0; i < action.amount; i += 1) {
        placeInTerritory(draft, source[i], target.id);
        draft.soldiers[source[i] as string].status = 'READY';
      }
      draft.pendingOccupation = null;
      closeBattle(draft, 'RESOLVED');
      syncPlayerTerritories(draft);
      pushLog(draft, 'COMBAT', `${action.amount} soldado(s) ocuparam ${target.name}.`);

      // Armadilha deixada por quem perdeu o território (carta dos Goblins):
      // fere a força que entrou, mas nunca esvazia o território.
      const trap = activeModifiersFor(draft, target.id).find((m) => m.trapDamage);
      if (trap?.trapDamage) {
        const victims = target.garrison.slice(
          0,
          Math.min(trap.trapDamage, Math.max(0, target.garrison.length - 1)),
        );
        for (const soldierId of victims) eliminateSoldier(draft, soldierId);
        draft.territoryModifiers = draft.territoryModifiers.filter((m) => m.id !== trap.id);
        pushLog(
          draft,
          'ACTION',
          `Armadilha Explosiva em ${target.name}: ${victims.length} soldado(s) perdidos.`,
        );
      }

      const eliminated = processEliminations(draft, target.controllerId);
      if (eliminated.length > 0) {
        pushLog(draft, 'ACTION', `${eliminated.length} jogador(es) eliminado(s).`);
      }
      settleVictory(draft);
      return { ok: true, state: draft };
    }

    // --------------------------------------------------------------- cartas
    case 'DRAW_CARD': {
      const draft = draftOf(state);
      const playerId = draft.turn.currentPlayerId;
      const allowed = canDrawNow(draft, playerId);
      if (!allowed.ok) return fail(state, allowed.reason);
      const card = drawCardFor(draft, playerId, rng);
      if (!card) return fail(state, 'O Baralho do Colapso está vazio.');
      draft.turn.drewCard = true;
      draft.turn.cardsDrawn += 1;
      const definition = getCardDefinition(card.definitionId);
      pushLog(draft, 'CARD', `Carta comprada: ${definition.name}.`);
      return { ok: true, state: draft, data: { cardInstanceId: card.instanceId } };
    }

    case 'DISCARD_CARD': {
      const draft = draftOf(state);
      const card = draft.cards[action.cardInstanceId as string];
      if (!card) return fail(state, 'Carta inexistente.');
      if (card.ownerId !== draft.turn.currentPlayerId) return fail(state, 'A carta não é sua.');
      const definition = getCardDefinition(card.definitionId);
      discardCard(draft, action.cardInstanceId as string);
      pushLog(draft, 'CARD', `Carta descartada: ${definition.name}.`);
      return { ok: true, state: draft };
    }

    case 'PLAY_CARD': {
      const draft = draftOf(state);
      const card = draft.cards[action.cardInstanceId as string];
      if (!card) return fail(state, 'Carta inexistente.');
      const availability = canUseCard(draft, card.instanceId, action.mode);
      if (!availability.allowed) return fail(state, availability.reason ?? 'Uso não permitido.');

      const definition = getCardDefinition(card.definitionId);
      const effect = effectFor(definition, action.mode);

      // Limite de 1 carta reativa por batalha e por jogador.
      if (definition.playType === 'REATIVA' || effect.id === 'effect.vacina') {
        const attack = draft.pendingAttack;
        if (attack?.reactionsUsed.includes(card.ownerId)) {
          return fail(state, 'Você já jogou uma carta reativa nesta batalha.');
        }
        if (attack) attack.reactionsUsed.push(card.ownerId);
      }

      if (effect.id === 'effect.sequestro') {
        const selection = (action.targetSoldierIds ?? []) as SoldierId[];
        const validation = validateSequestroSelection(draft, card.instanceId, selection);
        if (!validation.ok) return fail(state, validation.error);
        const result = applySequestro(draft, card.instanceId, selection);
        consumeCard(draft, card.instanceId, action.mode);
        syncPlayerTerritories(draft);
        const faction = getFaction(draft.players[card.ownerId as string].factionId);
        pushLog(
          draft,
          'CARD',
          `Sequestro: ${result.capturedIds.length} soldado(s) capturado(s) e incorporado(s) à facção ${faction.name}.`,
        );
        emitGameEvent(draft, {
          kind: 'CARD_ACTIVATED',
          payload: {
            playerId: card.ownerId,
            cardInstanceId: card.instanceId as string,
            mode: action.mode,
            amount: result.capturedIds.length,
          },
        });
        processEliminations(draft, card.ownerId);
        settleVictory(draft);
        return { ok: true, state: draft, data: result };
      }

      if (effect.id === 'effect.vacina') {
        const result = applyVacina(draft, card.instanceId, rng);
        consumeCard(draft, card.instanceId, action.mode);
        pushLog(
          draft,
          'CARD',
          `Vacina / Contra-Ataque: dado ${result.diceValue} → ${result.eliminatedCount} atacante(s) eliminado(s).`,
        );
        emitGameEvent(draft, {
          kind: 'CARD_ACTIVATED',
          payload: { playerId: card.ownerId, cardInstanceId: card.instanceId as string, mode: action.mode },
        });
        emitGameEvent(draft, {
          kind: 'DICE_ROLLED',
          payload: { playerId: card.ownerId, diceValue: result.diceValue },
        });
        emitGameEvent(draft, {
          kind: 'AFTER_DEFENSE',
          payload: { playerId: card.ownerId, amount: result.eliminatedCount },
        });
        if (draft.pendingAttack && draft.pendingAttack.status === 'CANCELLED') {
          closeBattle(draft, 'CANCELLED');
          pushLog(draft, 'COMBAT', 'Ataque neutralizado: nenhum atacante sobreviveu.');
        }
        return { ok: true, state: draft, data: result };
      }

      if (!effect.action) return fail(state, `Efeito sem regra implementada: ${effect.id}.`);
      const outcome = applyCardAction(draft, effect.action, card.ownerId, action.params ?? {}, rng);
      if (!outcome.ok) return fail(state, outcome.error);
      consumeCard(draft, card.instanceId, action.mode);
      discardCard(draft, card.instanceId as string);
      syncPlayerTerritories(draft);
      pushLog(draft, 'CARD', `${definition.name}: ${outcome.message}`);
      emitGameEvent(draft, {
        kind: 'CARD_ACTIVATED',
        payload: { playerId: card.ownerId, cardInstanceId: card.instanceId as string, mode: action.mode },
      });
      processEliminations(draft, card.ownerId);
      settleVictory(draft);
      return { ok: true, state: draft, data: outcome.data };
    }

    case 'DISTRIBUTE_RESERVES': {
      const draft = draftOf(state);
      const distribution = draft.pendingDistribution;
      const ownerId = distribution?.playerId ?? draft.turn.currentPlayerId;
      const reserve = reserveSoldiers(draft, ownerId);
      if (reserve.length === 0) return fail(state, 'Não há tropas em reserva para distribuir.');

      const total = action.assignments.reduce((sum, a) => sum + a.amount, 0);
      if (action.assignments.some((a) => !Number.isInteger(a.amount) || a.amount < 0)) {
        return fail(state, 'Quantidade inválida na distribuição.');
      }
      if (total !== reserve.length) {
        return fail(state, `Distribua exatamente ${reserve.length} soldado(s). Informado: ${total}.`);
      }
      for (const assignment of action.assignments) {
        const territory = draft.territories[assignment.territoryId as string];
        if (!territory) return fail(state, 'Território inexistente na distribuição.');
        if (territory.controllerId !== ownerId) {
          return fail(state, `${territory.name} não é controlado por você.`);
        }
      }

      let cursor = 0;
      for (const assignment of action.assignments) {
        for (let i = 0; i < assignment.amount; i += 1) {
          const soldier = reserve[cursor];
          cursor += 1;
          placeInTerritory(draft, soldier.id, assignment.territoryId);
          draft.soldiers[soldier.id as string].status = 'READY';
        }
      }
      draft.pendingDistribution = null;
      syncPlayerTerritories(draft);
      pushLog(draft, 'ACTION', `${total} soldado(s) redistribuído(s) a partir da reserva.`);
      settleVictory(draft);
      return { ok: true, state: draft };
    }

    // ---------------------------------------------------- Eventos do Colapso
    case 'RESOLVE_COLLAPSE': {
      const draft = draftOf(state);
      if (!draft.collapse.pending) return fail(state, 'Não há Evento do Colapso em alerta.');
      const applied = applyPendingCollapse(draft, rng);
      if (!applied) return fail(state, 'O evento não pôde ser aplicado.');
      trackCollapseSurvived(draft);
      syncPlayerTerritories(draft);
      processEliminations(draft, null);
      settleVictory(draft);
      return { ok: true, state: draft, data: applied };
    }

    // ---------------------------------------------------------- habilidades
    case 'ACTIVATE_ABILITY': {
      const draft = draftOf(state);
      const ability = tryGetAbility(action.abilityId);
      if (!ability) return fail(state, 'Habilidade desconhecida.');
      if (ability.kind !== 'ACTIVE') {
        return fail(state, 'Esta habilidade não é acionada manualmente.');
      }
      const playerId = draft.turn.currentPlayerId;
      if (!getAbilityState(draft, playerId, ability.id)) {
        return fail(state, 'Sua facção não possui esta habilidade.');
      }
      const availability = checkAvailability(draft, playerId, ability.id);
      if (!availability.available) return fail(state, availability.reason);

      const context = buildContext(draft, playerId, 'ABILITY_ACTIVATED', { playerId }, action.params);
      const validation = ability.validateParams?.(context) ?? { ok: true as const };
      if (!validation.ok) return fail(state, validation.error);

      const effects = ability.produceEffects(context);
      if (effects.length === 0) return fail(state, 'A habilidade não produziu nenhum efeito.');
      for (const effect of effects) {
        enqueueEffect(draft, {
          effect,
          source: { kind: 'ABILITY', id: ability.id, playerId, label: ability.name },
          priority: EFFECT_PRIORITY.ABILITY,
        });
      }
      const resolution = resolveEffectQueue(draft);
      if (resolution.resolved.length === 0) {
        const reason = resolution.failed[0]?.result ?? 'A habilidade não pôde ser aplicada.';
        return fail(state, reason);
      }

      consumeUsage(draft, playerId, ability);
      const detail = ability.feedback.detail?.(context) ?? '';
      pushLog(draft, 'ABILITY', `${ability.feedback.title}${detail ? ` — ${detail}` : ''}`);
      draft.abilityFeed.unshift({
        abilityId: ability.id,
        playerId,
        title: ability.feedback.title,
        detail,
        turn: draft.turn.number,
      });
      if (draft.abilityFeed.length > 10) draft.abilityFeed.length = 10;
      if (ability.animation) emitAnimation(draft, ability.animation, { abilityId: ability.id, detail });
      emitGameEvent(draft, { kind: 'ABILITY_ACTIVATED', payload: { playerId, abilityId: ability.id } });
      syncPlayerTerritories(draft);
      processEliminations(draft, playerId);
      settleVictory(draft);
      return { ok: true, state: draft, data: { resolved: resolution.resolved.length } };
    }

    // ------------------------------------------------------------------ DEV
    case 'REMOVE_SOLDIERS': {
      if (!Number.isInteger(action.amount) || action.amount <= 0) {
        return fail(state, 'Quantidade inválida.');
      }
      const draft = draftOf(state);
      const territory = draft.territories[action.territoryId as string];
      if (!territory) return fail(state, 'Território inexistente.');
      const present = soldiersInTerritory(draft, territory.id);
      const removable = Math.min(action.amount, present.length);
      if (removable === 0) return fail(state, `${territory.name} não possui tropas.`);
      for (const soldier of present.slice(0, removable)) eliminateSoldier(draft, soldier.id);
      pushLog(draft, 'ACTION', `-${removable} soldado(s) em ${territory.name}.`);
      return { ok: true, state: draft };
    }

    case 'SET_CONTROLLER': {
      const draft = draftOf(state);
      const territory = draft.territories[action.territoryId as string];
      if (!territory) return fail(state, 'Território inexistente.');
      if (action.playerId && !draft.players[action.playerId as string]) {
        return fail(state, 'Jogador inexistente.');
      }
      territory.controllerId = action.playerId;
      for (const soldierId of territory.garrison) {
        const soldier = draft.soldiers[soldierId as string];
        if (!soldier || !action.playerId) continue;
        soldier.ownerId = action.playerId;
        soldier.factionId = draft.players[action.playerId as string].factionId;
      }
      syncPlayerTerritories(draft);
      pushLog(draft, 'ACTION', `[DEV] ${territory.name} agora é de ${action.playerId ?? 'ninguém'}.`);
      return { ok: true, state: draft };
    }

    case 'SET_CURRENT_PLAYER': {
      const draft = draftOf(state);
      if (draft.pendingAttack?.status === 'DECLARED') {
        return fail(state, 'Encerre a batalha antes de trocar de jogador.');
      }
      const player = draft.players[action.playerId as string];
      if (!player || player.status !== 'ACTIVE') return fail(state, 'Jogador indisponível.');
      draft.turn.currentPlayerId = action.playerId;
      draft.turn.currentIndex = draft.turn.order.indexOf(action.playerId);
      draft.turn.pendingReinforcements = reinforcementsFor(draft, action.playerId);
      draft.turn.movesAllowed = movesAllowedFor(draft, action.playerId);
      pushLog(draft, 'ACTION', `[DEV] Vez de ${player.name}.`);
      return { ok: true, state: draft };
    }

    case 'GRANT_CARD': {
      const draft = draftOf(state);
      if (!draft.players[action.playerId as string]) return fail(state, 'Jogador inexistente.');
      const instance = grantCard(draft, action.playerId, action.definitionId);
      pushLog(draft, 'CARD', `Carta recebida: ${getCardDefinition(instance.definitionId).name}.`);
      return { ok: true, state: draft };
    }

    case 'DEV_SET_PHASE': {
      const draft = draftOf(state);
      if (!(TURN_PHASES as readonly string[]).includes(action.phase)) {
        return fail(state, 'Fase desconhecida.');
      }
      draft.turn.phase = action.phase as TurnPhase;
      pushLog(draft, 'ACTION', `[DEV] Fase: ${PHASE_LABELS[draft.turn.phase]}.`);
      return { ok: true, state: draft };
    }

    case 'DEV_FORCE_COLLAPSE': {
      const draft = draftOf(state);
      const eventId = action.eventId ?? draft.collapse.bag[0];
      if (!eventId) return fail(state, 'Não há evento disponível.');
      draft.collapse.bag = draft.collapse.bag.filter((id) => id !== eventId);
      armCollapse(draft, eventId, rng);
      if (!draft.collapse.pending) return fail(state, 'Este evento não tem alvo válido agora.');
      pushLog(draft, 'COLLAPSE', '[DEV] ⚠ ALERTA DE COLAPSO forçado.');
      return { ok: true, state: draft };
    }

    case 'DEV_SET_MISSION': {
      const draft = draftOf(state);
      const entry = draft.missions[action.playerId as string];
      if (!entry) return fail(state, 'Jogador sem missão.');
      try {
        getMission(action.missionId);
      } catch {
        return fail(state, 'Missão desconhecida.');
      }
      entry.missionId = action.missionId;
      entry.replacedBy = undefined;
      entry.completed = false;
      pushLog(draft, 'ACTION', '[DEV] Objetivo secreto trocado.');
      return { ok: true, state: draft };
    }

    case 'DEV_COMPLETE_MISSION': {
      const draft = draftOf(state);
      const entry = draft.missions[action.playerId as string];
      const player = draft.players[action.playerId as string];
      if (!entry || !player) return fail(state, 'Jogador sem missão.');
      entry.completed = true;
      entry.revealed = true;
      const mission = effectiveMissionOf(draft, action.playerId);
      draft.status = 'FINISHED';
      draft.result = {
        winnerId: action.playerId,
        reason: 'MISSION',
        detail: `[DEV] ${player.name} cumpriu: ${mission?.name ?? '—'}.`,
        finishedAtRound: draft.turn.number,
      };
      for (const other of Object.values(draft.missions)) other.revealed = true;
      pushLog(draft, 'INFO', draft.result.detail);
      return { ok: true, state: draft };
    }

    case 'DEV_ELIMINATE_PLAYER': {
      const draft = draftOf(state);
      const player = draft.players[action.playerId as string];
      if (!player || player.status !== 'ACTIVE') return fail(state, 'Jogador indisponível.');
      for (const territory of territoriesOf(draft, action.playerId)) {
        territory.controllerId = NEUTRAL_PLAYER_ID in draft.players ? NEUTRAL_PLAYER_ID : null;
        for (const soldierId of [...territory.garrison]) eliminateSoldier(draft, soldierId);
      }
      syncPlayerTerritories(draft);
      processEliminations(draft, null);
      settleVictory(draft);
      pushLog(draft, 'ACTION', `[DEV] ${player.name} eliminado.`);
      return { ok: true, state: draft };
    }

    case 'DEV_SET_TRANSPORT': {
      const draft = draftOf(state);
      const player = draft.players[action.playerId as string];
      if (!player) return fail(state, 'Jogador inexistente.');
      player.transportCharges = Math.max(0, Math.min(9, Math.floor(action.charges)));
      pushLog(draft, 'ACTION', `[DEV] Transporte de ${player.name}: ${player.transportCharges}.`);
      return { ok: true, state: draft };
    }

    case 'DEV_SET_DICE': {
      const draft = draftOf(state);
      draft.counters.event += 0;
      pushLog(
        draft,
        'ACTION',
        action.values
          ? `[DEV] Dados fixados: ${action.values.join(', ')}.`
          : '[DEV] Dados voltaram ao aleatório.',
      );
      return { ok: true, state: draft, data: { forcedDice: action.values } };
    }

    case 'DEV_SET_ABILITY_ENABLED': {
      const draft = draftOf(state);
      const runtime = draft.abilityStates[abilityKey(action.playerId, action.abilityId)];
      if (!runtime) return fail(state, 'Habilidade não encontrada para este jogador.');
      runtime.enabled = action.enabled;
      const ability = tryGetAbility(action.abilityId);
      pushLog(
        draft,
        'ABILITY',
        `[DEV] ${ability?.name ?? action.abilityId}: ${action.enabled ? 'ativada' : 'desativada'}.`,
      );
      return { ok: true, state: draft };
    }

    case 'DEV_RESET_ABILITY': {
      const draft = draftOf(state);
      const key = abilityKey(action.playerId, action.abilityId);
      if (!draft.abilityStates[key]) return fail(state, 'Habilidade não encontrada.');
      const ability = getAbility(action.abilityId);
      draft.abilityStates[key] = initialAbilityState(action.playerId, ability);
      pushLog(draft, 'ABILITY', `[DEV] ${ability.name}: cargas e recarga restauradas.`);
      return { ok: true, state: draft };
    }

    case 'DEV_CLEAR_EFFECTS': {
      const draft = draftOf(state);
      const removed = clearEffectQueue(draft);
      pushLog(draft, 'ACTION', `[DEV] Fila de efeitos limpa (${removed} pendente(s)).`);
      return { ok: true, state: draft };
    }

    case 'ACK_ANIMATION': {
      const draft = draftOf(state);
      markAnimationPlayed(draft, action.eventId);
      return { ok: true, state: draft };
    }

    default: {
      const exhaustive: never = action;
      return fail(state, `Ação desconhecida: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/** Existe cadeia contínua de territórios do jogador entre origem e destino? */
function connectedThroughOwnTerritories(
  state: GameState,
  from: TerritoryId,
  to: TerritoryId,
): boolean {
  const owner = state.territories[from as string]?.controllerId;
  if (!owner) return false;
  const seen = new Set<string>([from as string]);
  const queue: TerritoryId[] = [from];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighborId of getTerritory(state, current).neighbors) {
      if (seen.has(neighborId as string)) continue;
      const neighbor = state.territories[neighborId as string];
      if (!neighbor || neighbor.controllerId !== owner) continue;
      if (neighborId === to) return true;
      seen.add(neighborId as string);
      queue.push(neighborId);
    }
  }
  return false;
}

/** RNG com dados fixos, usado pelo painel DEV. */
export function forcedDiceRng(values: number[]): Rng {
  return scriptedRng(values.map((value) => (value - 0.5) / 6));
}

export { createGame, getTerritory, getCardInstance, checkMission };
