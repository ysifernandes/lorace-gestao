import type { GameState } from '../types/game.types';
import type { SoldierId } from '../types/ids';
import type { Rng } from '../rng/rng';
import { defaultRng } from '../rng/rng';
import type { ActionResult, GameAction } from './actions';
import { createGame, grantCard } from './setup';
import { pushLog } from './log';
import { advancePhase, endTurn } from '../turns/turnMachine';
import { PHASE_LABELS } from '../turns/phases';
import { getTerritory, syncPlayerTerritories } from '../map/territory';
import {
  createSoldier,
  eliminateSoldier,
  placeInTerritory,
  soldiersInTerritory,
} from '../soldiers/soldier';
import { isAdjacent, maxMovableFrom } from '../map/adjacency';
import { conquerTerritory } from '../combat/conquest';
import { devResolveAttackAsVictory } from '../combat/temporaryCombat';
import { getFaction } from '../factions/faction.registry';
import { canUseCard, consumeCard, effectFor, getCardInstance } from '../cards/cardRules';
import { getCardDefinition } from '../cards/card.registry';
import { applySequestro, validateSequestroSelection } from '../cards/effects/sequestro.effect';
import { applyVacina } from '../cards/effects/vacina.effect';
import { markAnimationPlayed } from '../events/animationEvents';
import { reserveSoldiers } from './selectors';

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
      return { ok: true, state: createGame(), info: 'Nova partida criada.' };

    case 'ADVANCE_PHASE': {
      const draft = draftOf(state);
      if (draft.pendingAttack?.status === 'DECLARED') {
        return fail(state, 'Resolva ou cancele o ataque declarado antes de avançar a fase.');
      }
      if (draft.pendingOccupation) {
        return fail(state, 'Ocupe o território conquistado antes de avançar a fase.');
      }
      if (draft.pendingDistribution) {
        return fail(state, 'Distribua as tropas capturadas antes de avançar a fase.');
      }
      const before = PHASE_LABELS[draft.turn.phase];
      const { changedPlayer } = advancePhase(draft);
      const player = draft.players[draft.turn.currentPlayerId as string];
      pushLog(
        draft,
        'ACTION',
        changedPlayer
          ? `Turno ${draft.turn.number}: vez de ${player?.name ?? '???'}.`
          : `${before} → ${PHASE_LABELS[draft.turn.phase]}.`,
      );
      return { ok: true, state: draft };
    }

    case 'END_TURN': {
      const draft = draftOf(state);
      if (draft.pendingAttack?.status === 'DECLARED') {
        return fail(state, 'Resolva ou cancele o ataque declarado antes de encerrar o turno.');
      }
      if (draft.pendingOccupation) {
        return fail(state, 'Ocupe o território conquistado antes de encerrar o turno.');
      }
      if (draft.pendingDistribution) {
        return fail(state, 'Distribua as tropas capturadas antes de encerrar o turno.');
      }
      const { next } = endTurn(draft);
      const player = draft.players[next as string];
      pushLog(draft, 'ACTION', `Turno ${draft.turn.number}: vez de ${player?.name ?? '???'}.`);
      return { ok: true, state: draft };
    }

    case 'ADD_SOLDIERS': {
      if (!Number.isInteger(action.amount) || action.amount <= 0) {
        return fail(state, 'Quantidade de soldados inválida.');
      }
      const draft = draftOf(state);
      const territory = draft.territories[action.territoryId as string];
      if (!territory) return fail(state, 'Território inexistente.');
      const ownerId = action.ownerId ?? territory.controllerId;
      if (!ownerId) return fail(state, 'Território neutro: informe o dono das tropas.');
      const owner = draft.players[ownerId as string];
      if (!owner) return fail(state, 'Jogador inexistente.');
      if (territory.controllerId && territory.controllerId !== ownerId) {
        return fail(state, 'Não é possível reforçar um território controlado por outro jogador.');
      }
      if (!territory.controllerId) {
        territory.controllerId = ownerId;
        syncPlayerTerritories(draft);
      }
      for (let i = 0; i < action.amount; i += 1) {
        createSoldier(draft, {
          factionId: owner.factionId,
          ownerId,
          territoryId: territory.id,
        });
      }
      if (ownerId === draft.turn.currentPlayerId && draft.turn.phase === 'REFORCO') {
        draft.turn.pendingReinforcements = Math.max(
          0,
          draft.turn.pendingReinforcements - action.amount,
        );
      }
      pushLog(draft, 'ACTION', `+${action.amount} soldado(s) em ${territory.name}.`);
      return { ok: true, state: draft };
    }

    case 'MOVE_SOLDIERS': {
      if (!Number.isInteger(action.amount) || action.amount <= 0) {
        return fail(state, 'Quantidade inválida.');
      }
      const draft = draftOf(state);
      const from = draft.territories[action.from as string];
      const to = draft.territories[action.to as string];
      if (!from || !to) return fail(state, 'Território inexistente.');
      if (from.id === to.id) return fail(state, 'Origem e destino são o mesmo território.');
      if (from.controllerId !== draft.turn.currentPlayerId) {
        return fail(state, 'Só é possível mover as suas próprias tropas, no seu turno.');
      }
      if (!from.controllerId || from.controllerId !== to.controllerId) {
        return fail(state, 'Só é possível mover tropas entre territórios do mesmo jogador.');
      }
      if (!isAdjacent(draft, from.id, to.id)) {
        return fail(state, `${from.name} e ${to.name} não são vizinhos.`);
      }
      const movable = maxMovableFrom(draft, from.id);
      const available = soldiersInTerritory(draft, from.id);
      if (action.amount > movable) {
        return fail(
          state,
          movable === 0
            ? `${from.name} não tem tropas suficientes: é obrigatório deixar ao menos 1 soldado.`
            : `Máximo movível a partir de ${from.name}: ${movable} soldado(s).`,
        );
      }
      const moving = available.slice(0, action.amount);
      for (const soldier of moving) {
        placeInTerritory(draft, soldier.id, to.id);
        draft.soldiers[soldier.id as string].status = 'MOVED';
      }
      pushLog(draft, 'ACTION', `${action.amount} soldado(s): ${from.name} → ${to.name}.`);
      return { ok: true, state: draft };
    }

    case 'DECLARE_ATTACK': {
      if (!Number.isInteger(action.amount) || action.amount <= 0) {
        return fail(state, 'Quantidade de atacantes inválida.');
      }
      const draft = draftOf(state);
      if (draft.pendingAttack?.status === 'DECLARED') {
        return fail(state, 'Já existe um ataque declarado.');
      }
      const from = draft.territories[action.from as string];
      const to = draft.territories[action.to as string];
      if (!from || !to) return fail(state, 'Território inexistente.');
      if (!from.controllerId) return fail(state, 'Território de origem não tem controlador.');
      if (from.controllerId !== draft.turn.currentPlayerId) {
        return fail(state, 'Só o jogador do turno pode atacar, a partir de um território seu.');
      }
      if (!to.controllerId || to.controllerId === from.controllerId) {
        return fail(state, 'O alvo precisa ser um território inimigo.');
      }
      if (!isAdjacent(draft, from.id, to.id)) {
        return fail(state, `${from.name} não faz fronteira com ${to.name}.`);
      }
      const available = soldiersInTerritory(draft, from.id);
      if (available.length - action.amount < 1) {
        return fail(state, 'É obrigatório deixar ao menos 1 soldado defendendo a origem.');
      }
      const attackers = available.slice(0, action.amount);
      for (const soldier of attackers) draft.soldiers[soldier.id as string].status = 'ATTACKING';
      for (const defender of soldiersInTerritory(draft, to.id)) {
        draft.soldiers[defender.id as string].status = 'DEFENDING';
      }
      draft.pendingAttack = {
        id: `atk-${draft.turn.number}-${from.id}-${to.id}`,
        attackerPlayerId: from.controllerId,
        defenderPlayerId: to.controllerId,
        fromTerritoryId: from.id,
        toTerritoryId: to.id,
        attackingSoldierIds: attackers.map((s) => s.id),
        status: 'DECLARED',
      };
      to.status = 'CONTESTED';
      pushLog(
        draft,
        'COMBAT',
        `Ataque declarado: ${from.name} → ${to.name} com ${action.amount} soldado(s).`,
      );
      return { ok: true, state: draft };
    }

    case 'RESOLVE_ATTACK':
    case 'CANCEL_ATTACK': {
      const draft = draftOf(state);
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== 'DECLARED') return fail(state, 'Não há ataque declarado.');
      if (draft.pendingOccupation) {
        return fail(state, 'Ocupe o território conquistado antes de encerrar o ataque.');
      }
      attack.status = action.type === 'RESOLVE_ATTACK' ? 'RESOLVED' : 'CANCELLED';
      for (const soldier of Object.values(draft.soldiers)) {
        if (soldier.status === 'ATTACKING' || soldier.status === 'DEFENDING') {
          if (soldier.alive) soldier.status = 'READY';
        }
      }
      const target = draft.territories[attack.toTerritoryId as string];
      if (target) target.status = 'STABLE';
      draft.pendingAttack = null;
      pushLog(
        draft,
        'COMBAT',
        action.type === 'RESOLVE_ATTACK' ? 'Ataque encerrado.' : 'Ataque cancelado.',
      );
      return { ok: true, state: draft };
    }

    case 'DEV_WIN_ATTACK': {
      const draft = draftOf(state);
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== 'DECLARED') return fail(state, 'Não há ataque declarado.');
      if (draft.pendingOccupation) return fail(state, 'Já existe uma ocupação pendente.');
      const survivors = attack.attackingSoldierIds.filter(
        (id) => draft.soldiers[id as string]?.alive,
      );
      if (survivors.length === 0) {
        return fail(state, 'Todos os atacantes foram eliminados: o ataque falhou.');
      }
      const outcome = devResolveAttackAsVictory(draft);
      const target = draft.territories[attack.toTerritoryId as string];
      const origin = draft.territories[attack.fromTerritoryId as string];
      const occupation = conquerTerritory(draft, {
        from: attack.fromTerritoryId,
        to: attack.toTerritoryId,
      });
      attack.status = 'RESOLVED';
      pushLog(
        draft,
        'COMBAT',
        `${origin?.name ?? '???'} conquistou ${target?.name ?? '???'} ` +
          `(${outcome.eliminatedDefenders} defensor(es) eliminado(s)). ` +
          `Ocupação obrigatória: ${occupation.min}-${occupation.max} soldado(s).`,
      );
      return { ok: true, state: draft, data: outcome };
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
      if (origin.garrison.length - action.amount < 1) {
        return fail(state, 'É obrigatório deixar ao menos 1 soldado no território de origem.');
      }

      const pool = occupation.eligibleSoldierIds.filter(
        (id) => draft.soldiers[id as string]?.alive &&
          draft.soldiers[id as string].location.kind === 'TERRITORY' &&
          (draft.soldiers[id as string].location as { territoryId: string }).territoryId === (origin.id as string),
      );
      const fallback = soldiersInTerritory(draft, origin.id).map((s) => s.id);
      const source = pool.length >= action.amount ? pool : fallback;
      for (let i = 0; i < action.amount; i += 1) {
        const soldierId = source[i];
        placeInTerritory(draft, soldierId, target.id);
        draft.soldiers[soldierId as string].status = 'READY';
      }
      for (const soldier of Object.values(draft.soldiers)) {
        if (soldier.alive && (soldier.status === 'ATTACKING' || soldier.status === 'DEFENDING')) {
          soldier.status = 'READY';
        }
      }
      draft.pendingOccupation = null;
      if (draft.pendingAttack) draft.pendingAttack = null;
      pushLog(
        draft,
        'COMBAT',
        `${action.amount} soldado(s) ocuparam ${target.name}.`,
      );
      return { ok: true, state: draft };
    }

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
      // As tropas presentes passam a servir ao novo controlador.
      for (const soldier of soldiersInTerritory(draft, territory.id)) {
        if (!action.playerId) continue;
        const owner = draft.players[action.playerId as string];
        draft.soldiers[soldier.id as string].ownerId = owner.id;
        draft.soldiers[soldier.id as string].factionId = owner.factionId;
      }
      syncPlayerTerritories(draft);
      pushLog(
        draft,
        'ACTION',
        `Controle de ${territory.name}: ${
          action.playerId ? draft.players[action.playerId as string].name : 'Neutro'
        }.`,
      );
      return { ok: true, state: draft };
    }

    case 'SET_CURRENT_PLAYER': {
      const draft = draftOf(state);
      const index = draft.turn.order.indexOf(action.playerId);
      if (index < 0) return fail(state, 'Jogador fora da ordem de turno.');
      if (draft.pendingAttack?.status === 'DECLARED' || draft.pendingOccupation) {
        return fail(state, 'Finalize o combate em andamento antes de trocar de jogador.');
      }
      draft.turn.currentPlayerId = action.playerId;
      draft.turn.currentIndex = index;
      pushLog(
        draft,
        'ACTION',
        `Jogador atual: ${draft.players[action.playerId as string].name}.`,
      );
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
        // Sem atacantes vivos, o ataque deixa de existir e o mapa volta ao normal.
        if (draft.pendingAttack && draft.pendingAttack.status === 'CANCELLED') {
          const target = draft.territories[draft.pendingAttack.toTerritoryId as string];
          if (target) target.status = 'STABLE';
          for (const soldier of Object.values(draft.soldiers)) {
            if (soldier.alive && (soldier.status === 'ATTACKING' || soldier.status === 'DEFENDING')) {
              soldier.status = 'READY';
            }
          }
          draft.pendingAttack = null;
          pushLog(draft, 'COMBAT', 'Ataque neutralizado: nenhum atacante sobreviveu.');
        }
        return { ok: true, state: draft, data: result };
      }

      return fail(state, `Efeito não implementado: ${effect.id}`);
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
        return fail(
          state,
          `Distribua exatamente ${reserve.length} soldado(s). Informado: ${total}.`,
        );
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
      return { ok: true, state: draft };
    }

    case 'GRANT_CARD': {
      const draft = draftOf(state);
      if (!draft.players[action.playerId as string]) return fail(state, 'Jogador inexistente.');
      const instance = grantCard(draft, action.playerId, action.definitionId);
      const definition = getCardDefinition(instance.definitionId);
      pushLog(draft, 'CARD', `Carta recebida: ${definition.name}.`);
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

export { createGame, getTerritory, getCardInstance };
