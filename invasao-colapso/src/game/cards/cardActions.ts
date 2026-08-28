import type { GameState } from '../types/game.types';
import type { PlayerId, SoldierId, TerritoryId } from '../types/ids';
import type { CardActionSpec } from '../types/card.types';
import type { Rng } from '../rng/rng';
import { defaultRng, rollInt } from '../rng/rng';
import { createSoldier, eliminateSoldier, placeInTerritory, soldiersInTerritory } from '../soldiers/soldier';
import { getTerritory, syncPlayerTerritories, territoriesOf } from '../map/territory';
import { isAdjacent } from '../map/adjacency';
import { addTerritoryModifier } from '../engine/modifiers';
import { BALANCE } from '../config/balance';
import { armCollapse, applyPendingCollapse, getCollapseEvent } from '../collapse/collapseEngine';

/**
 * RESOLVEDOR ÚNICO DAS AÇÕES DE CARTA.
 *
 * Cada `CardActionSpec` tem exatamente um caso aqui. Nenhum componente de
 * interface conhece o efeito de uma carta — ele só manda os parâmetros.
 * Sequestro e Vacina continuam nos seus próprios efeitos (regra oficial).
 */

export interface CardActionParams {
  targetTerritoryId?: TerritoryId;
  fromTerritoryId?: TerritoryId;
  targetPlayerId?: PlayerId;
  amount?: number;
  assignments?: { territoryId: TerritoryId; amount: number }[];
}

export type CardActionResult =
  | { ok: true; message: string; data?: unknown }
  | { ok: false; error: string };

type TerritoryPick =
  | { territory: import('../types/territory.types').Territory; error?: undefined }
  | { territory?: undefined; error: string };

function ownTerritory(
  draft: GameState,
  playerId: PlayerId,
  id: TerritoryId | undefined,
  label: string,
): TerritoryPick {
  if (!id) return { error: `Escolha ${label}.` };
  const territory = draft.territories[id as string];
  if (!territory) return { error: 'Território inexistente.' };
  if (territory.controllerId !== playerId) return { error: `${territory.name} não é seu.` };
  return { territory };
}

function enemyTerritory(
  draft: GameState,
  playerId: PlayerId,
  id: TerritoryId | undefined,
): TerritoryPick {
  if (!id) return { error: 'Escolha um território inimigo.' };
  const territory = draft.territories[id as string];
  if (!territory) return { error: 'Território inexistente.' };
  if (!territory.controllerId || territory.controllerId === playerId) {
    return { error: 'O alvo precisa ser um território inimigo.' };
  }
  return { territory };
}

export function applyCardAction(
  draft: GameState,
  spec: CardActionSpec,
  playerId: PlayerId,
  params: CardActionParams = {},
  rng: Rng = defaultRng,
): CardActionResult {
  const player = draft.players[playerId as string];
  if (!player) return { ok: false, error: 'Jogador inexistente.' };

  switch (spec.type) {
    case 'SEQUESTRO':
    case 'VACINA':
      // Resolvidos pelos efeitos oficiais no gameEngine.
      return { ok: false, error: 'Efeito oficial resolvido fora deste resolvedor.' };

    case 'GAIN_TROOPS': {
      const owned = territoriesOf(draft, playerId);
      if (owned.length === 0) return { ok: false, error: 'Sem territórios.' };
      const assignments =
        params.assignments && params.assignments.length > 0
          ? params.assignments
          : owned.slice(0, spec.amount).map((t, i) => ({
              territoryId: t.id,
              amount: i < spec.amount % owned.length ? 1 : 0,
            }));
      let placed = 0;
      if (params.assignments && params.assignments.length > 0) {
        const total = assignments.reduce((sum, a) => sum + a.amount, 0);
        if (total !== spec.amount) {
          return { ok: false, error: `Distribua exatamente ${spec.amount} soldado(s).` };
        }
        for (const entry of assignments) {
          const check = ownTerritory(draft, playerId, entry.territoryId, 'um território seu');
          if (!check.territory) return { ok: false, error: check.error };
          for (let i = 0; i < entry.amount; i += 1) {
            createSoldier(draft, {
              factionId: player.factionId,
              ownerId: playerId,
              territoryId: entry.territoryId,
            });
            placed += 1;
          }
        }
      } else {
        // Distribuição automática em rodízio quando o jogador não escolhe.
        for (let i = 0; i < spec.amount; i += 1) {
          createSoldier(draft, {
            factionId: player.factionId,
            ownerId: playerId,
            territoryId: owned[i % owned.length].id,
          });
          placed += 1;
        }
      }
      return { ok: true, message: `+${placed} soldado(s).` };
    }

    case 'SABOTAGE': {
      const target = enemyTerritory(draft, playerId, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      const soldiers = soldiersInTerritory(draft, target.territory.id);
      const removable = Math.min(spec.amount, soldiers.length - BALANCE.territory.minGarrison);
      if (removable <= 0) {
        return { ok: false, error: 'O alvo já está no mínimo de guarnição.' };
      }
      for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, soldiers[i].id);
      return { ok: true, message: `${target.territory.name} perde ${removable} soldado(s).` };
    }

    case 'ORBITAL_STRIKE': {
      // Referência: "todas as unidades naquele território perdem até 3 soldados".
      const target = enemyTerritory(draft, playerId, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      const soldiers = soldiersInTerritory(draft, target.territory.id);
      const removable = Math.min(spec.amount, soldiers.length - BALANCE.territory.minGarrison);
      if (removable <= 0) return { ok: false, error: 'O alvo já está no mínimo de guarnição.' };
      for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, soldiers[i].id);
      return {
        ok: true,
        message: `${target.territory.name} perde ${removable} soldado(s) sob o feixe orbital.`,
      };
    }

    case 'RITUAL': {
      // Referência: "todos os jogadores naquele território rolam 1D6 e perdem
      // essa quantidade de soldados". Um território tem um controlador só, então
      // o ritual atinge o exército presente ali.
      const id = params.targetTerritoryId;
      const territory = id ? draft.territories[id as string] : undefined;
      if (!territory?.controllerId) return { ok: false, error: 'Escolha um território ocupado.' };
      const roll = rollInt(spec.diceSides, rng);
      const soldiers = soldiersInTerritory(draft, territory.id);
      const floor = territory.controllerId === playerId ? BALANCE.territory.minGarrison : BALANCE.territory.minGarrison;
      const removable = Math.max(0, Math.min(roll, soldiers.length - floor));
      for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, soldiers[i].id);
      return {
        ok: true,
        message: `Ritual Maior em ${territory.name}: 1D6 = ${roll} → ${removable} soldado(s) perdido(s).`,
        data: { diceValue: roll, eliminated: removable },
      };
    }

    case 'BLOOD_PACT': {
      const target = enemyTerritory(draft, playerId, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      const source = territoriesOf(draft, playerId).find((own) =>
        isAdjacent(draft, own.id, target.territory!.id),
      );
      if (!source) return { ok: false, error: 'Você precisa de um território vizinho ao alvo.' };
      const roll = rollInt(spec.diceSides, rng);
      const soldiers = soldiersInTerritory(draft, target.territory.id);
      const drained = Math.max(0, Math.min(roll, soldiers.length - BALANCE.territory.minGarrison));
      for (let i = 0; i < drained; i += 1) eliminateSoldier(draft, soldiers[i].id);
      const gained = Math.floor(drained / 2);
      for (let i = 0; i < gained; i += 1) {
        createSoldier(draft, {
          factionId: player.factionId,
          ownerId: playerId,
          territoryId: source.id,
        });
      }
      return {
        ok: true,
        message: `Pacto de Sangue: 1D6 = ${roll} → ${drained} drenado(s), ${gained} ganho(s) em ${source.name}.`,
        data: { diceValue: roll, drained, gained },
      };
    }

    case 'TRAP': {
      const own = ownTerritory(draft, playerId, params.targetTerritoryId, 'um território seu');
      if (!own.territory) return { ok: false, error: own.error };
      addTerritoryModifier(draft, {
        territoryId: own.territory.id,
        ownerId: playerId,
        untilRound: draft.turn.number + spec.rounds,
        trapDamage: spec.damage,
        source: 'card.armadilha-explosiva',
      });
      return {
        ok: true,
        message: `${own.territory.name} minado: quem entrar perde ${spec.damage} soldado(s).`,
      };
    }

    case 'EXTRA_MOVE': {
      draft.turn.movesAllowed += spec.amount;
      return { ok: true, message: `+${spec.amount} movimentação neste turno.` };
    }

    case 'EVACUATE': {
      const origin = ownTerritory(draft, playerId, params.fromTerritoryId, 'a origem');
      if (!origin.territory) return { ok: false, error: origin.error };
      const destination = ownTerritory(draft, playerId, params.targetTerritoryId, 'o destino');
      if (!destination.territory) return { ok: false, error: destination.error };
      if (origin.territory.id === destination.territory.id) {
        return { ok: false, error: 'Origem e destino precisam ser diferentes.' };
      }
      if (isAdjacent(draft, origin.territory.id, destination.territory.id)) {
        return { ok: false, error: 'A Evacuação exige um destino NÃO adjacente.' };
      }
      const requested = Math.min(params.amount ?? spec.amount, spec.amount);
      const movable = origin.territory.garrison.length - BALANCE.territory.minGarrison;
      const amount = Math.min(requested, movable);
      if (amount <= 0) return { ok: false, error: 'Sem soldados suficientes na origem.' };
      for (const soldierId of origin.territory.garrison.slice(0, amount)) {
        placeInTerritory(draft, soldierId, destination.territory.id);
      }
      return {
        ok: true,
        message: `${amount} soldado(s) de ${origin.territory.name} para ${destination.territory.name}.`,
      };
    }

    case 'SHIELD': {
      const own = ownTerritory(draft, playerId, params.targetTerritoryId, 'um território seu');
      if (!own.territory) return { ok: false, error: own.error };
      addTerritoryModifier(draft, {
        territoryId: own.territory.id,
        ownerId: playerId,
        untilRound: draft.turn.number + spec.rounds,
        attackerDiceReduction: spec.attackerDiceReduction,
        blockSpecialAttack: spec.blockSpecialAttack,
        ignoreFirstLossPerRound: spec.ignoreFirstLossPerRound,
        source: 'card',
      });
      return { ok: true, message: `${own.territory.name} protegido.` };
    }

    case 'BLOCK_TERRITORY': {
      const target = enemyTerritory(draft, playerId, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      addTerritoryModifier(draft, {
        territoryId: target.territory.id,
        ownerId: playerId,
        untilRound: draft.turn.number + spec.rounds,
        blockReinforce: true,
        source: 'card',
      });
      return { ok: true, message: `${target.territory.name} sem reforço nem movimentação.` };
    }

    case 'DICE_CAP_INCOMING': {
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== 'DECLARED' || attack.defenderPlayerId !== playerId) {
        return { ok: false, error: 'Só vale quando você está sendo atacado.' };
      }
      attack.attackerDiceCap = Math.max(1, Math.min(attack.attackerDiceCap, spec.value));
      return { ok: true, message: `O atacante fica limitado a ${attack.attackerDiceCap} dado(s).` };
    }

    case 'AMBUSH': {
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== 'DECLARED' || attack.defenderPlayerId !== playerId) {
        return { ok: false, error: 'Só vale quando você está sendo atacado.' };
      }
      const living = attack.attackingSoldierIds.filter(
        (id) => draft.soldiers[id as string]?.alive,
      );
      const origin = getTerritory(draft, attack.fromTerritoryId);
      const removable = Math.min(
        spec.amount,
        living.length,
        origin.garrison.length - BALANCE.territory.minGarrison,
      );
      if (removable <= 0) return { ok: false, error: 'Não há atacante elegível.' };
      for (let i = 0; i < removable; i += 1) eliminateSoldier(draft, living[i] as SoldierId);
      return { ok: true, message: `O atacante perde ${removable} soldado(s) antes da batalha.` };
    }

    case 'REROLL_LOWEST': {
      const attack = draft.pendingAttack;
      if (!attack || attack.status !== 'DECLARED') {
        return { ok: false, error: 'Só vale durante uma batalha.' };
      }
      const isAttacker = attack.attackerPlayerId === playerId;
      if (spec.side === 'ATTACKER' && !isAttacker) {
        return { ok: false, error: 'Esta carta é para quem ataca.' };
      }
      if (spec.side === 'DEFENDER' && isAttacker) {
        return { ok: false, error: 'Esta carta é para quem defende.' };
      }
      attack.rerolls = attack.rerolls ?? [];
      attack.rerolls.push(spec.side);
      return { ok: true, message: 'Você relançará o dado mais baixo na próxima rodada.' };
    }

    case 'RESTORE_TROOPS': {
      const owned = territoriesOf(draft, playerId);
      if (owned.length === 0) return { ok: false, error: 'Sem territórios.' };
      const lost = Object.values(draft.soldiers).filter(
        (s) => !s.alive && s.ownerId === playerId && s.lostAtRound === draft.turn.number,
      );
      const amount = Math.min(spec.amount, lost.length);
      if (amount <= 0) return { ok: false, error: 'Você não perdeu soldados nesta rodada.' };
      for (let i = 0; i < amount; i += 1) {
        createSoldier(draft, {
          factionId: player.factionId,
          ownerId: playerId,
          territoryId: owned[i % owned.length].id,
        });
      }
      return { ok: true, message: `${amount} soldado(s) reconstituído(s).` };
    }

    case 'DEFECTION': {
      const target = enemyTerritory(draft, playerId, params.targetTerritoryId);
      if (!target.territory) return { ok: false, error: target.error };
      if (target.territory.garrison.length < spec.minEnemyTroops) {
        return {
          ok: false,
          error: `O alvo precisa ter ao menos ${spec.minEnemyTroops} soldados.`,
        };
      }
      const destination = territoriesOf(draft, playerId).find((t) =>
        isAdjacent(draft, t.id, target.territory.id),
      );
      if (!destination) {
        return { ok: false, error: 'Você não tem território vizinho ao alvo.' };
      }
      const soldierId = target.territory.garrison[0];
      const soldier = draft.soldiers[soldierId as string];
      if (!soldier) return { ok: false, error: 'Alvo sem soldados.' };
      soldier.ownerId = playerId;
      soldier.factionId = player.factionId;
      placeInTerritory(draft, soldierId, destination.id);
      syncPlayerTerritories(draft);
      return { ok: true, message: `1 soldado deserta para ${destination.name}.` };
    }

    case 'REVEAL_HAND': {
      const targetId = params.targetPlayerId;
      const target = targetId ? draft.players[targetId as string] : undefined;
      if (!target || target.id === playerId) {
        return { ok: false, error: 'Escolha um adversário.' };
      }
      return {
        ok: true,
        message: `Mão de ${target.name} revelada.`,
        data: { revealedHandOf: target.id, cardIds: [...target.handCardIds] },
      };
    }

    case 'PEEK_COLLAPSE': {
      const next = draft.collapse.pending?.eventId ?? draft.collapse.bag[0];
      if (!next) return { ok: false, error: 'Não há evento previsto.' };
      return {
        ok: true,
        message: `Próximo Evento do Colapso: ${getCollapseEvent(next).name}.`,
        data: { eventId: next },
      };
    }

    case 'REPEAT_LAST_COLLAPSE': {
      const last = draft.collapse.history[0];
      if (!last) return { ok: false, error: 'Nenhum Evento do Colapso foi revelado ainda.' };
      armCollapse(draft, last.eventId, rng);
      const applied = applyPendingCollapse(draft, rng);
      if (!applied) return { ok: false, error: 'O evento não pôde ser repetido agora.' };
      return { ok: true, message: `Eco de ${applied.event.name}: ${applied.summary}` };
    }

    default: {
      const exhaustive: never = spec;
      void exhaustive;
      return { ok: false, error: 'Ação de carta sem resolvedor.' };
    }
  }
}
