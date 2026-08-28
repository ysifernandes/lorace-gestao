import type { GameState } from '../types/game.types';
import type { EffectDescriptor, EffectKind } from './effect.types';
import { BALANCE } from '../config/balance';
import { getTerritory, syncPlayerTerritories } from '../map/territory';
import { isAdjacent } from '../map/adjacency';
import {
  captureSoldier,
  createSoldier,
  eliminateSoldier,
  placeInTerritory,
  soldiersInTerritory,
} from '../soldiers/soldier';

export type ResolverOutcome =
  | { ok: true; message: string }
  | { ok: false; reason: string };

export type EffectResolver = (draft: GameState, effect: EffectDescriptor) => ResolverOutcome;

/** Recusa padrão: o efeito existe no catálogo mas ainda não tem regra. */
function notImplemented(kind: EffectKind): ResolverOutcome {
  return { ok: false, reason: `Efeito ${kind} ainda não implementado (etapa futura).` };
}

const RESOLVERS: { [K in EffectKind]?: EffectResolver } = {
  GRANT_REINFORCEMENTS(draft, effect) {
    if (effect.kind !== 'GRANT_REINFORCEMENTS') return notImplemented('GRANT_REINFORCEMENTS');
    if (!Number.isInteger(effect.amount) || effect.amount <= 0) {
      return { ok: false, reason: 'Quantidade de reforço inválida.' };
    }
    if (!draft.players[effect.playerId as string]) {
      return { ok: false, reason: 'Jogador inexistente.' };
    }
    // Reforço só faz sentido para quem está no turno.
    if (draft.turn.currentPlayerId !== effect.playerId) {
      return { ok: false, reason: 'Reforço só se aplica ao jogador do turno.' };
    }
    draft.turn.pendingReinforcements += effect.amount;
    return { ok: true, message: `+${effect.amount} reforço(s).` };
  },

  ADD_TROOPS(draft, effect) {
    if (effect.kind !== 'ADD_TROOPS') return notImplemented('ADD_TROOPS');
    if (!Number.isInteger(effect.amount) || effect.amount <= 0) {
      return { ok: false, reason: 'Quantidade inválida.' };
    }
    const territory = draft.territories[effect.territoryId as string];
    if (!territory) return { ok: false, reason: 'Território inexistente.' };
    const ownerId = effect.ownerId ?? territory.controllerId;
    if (!ownerId) return { ok: false, reason: 'Território sem controlador.' };
    const owner = draft.players[ownerId as string];
    if (!owner) return { ok: false, reason: 'Jogador inexistente.' };
    for (let i = 0; i < effect.amount; i += 1) {
      createSoldier(draft, {
        factionId: owner.factionId,
        ownerId: owner.id,
        territoryId: territory.id,
      });
    }
    return { ok: true, message: `+${effect.amount} soldado(s) em ${territory.name}.` };
  },

  REMOVE_TROOPS(draft, effect) {
    if (effect.kind !== 'REMOVE_TROOPS') return notImplemented('REMOVE_TROOPS');
    if (!Number.isInteger(effect.amount) || effect.amount <= 0) {
      return { ok: false, reason: 'Quantidade inválida.' };
    }
    const territory = draft.territories[effect.territoryId as string];
    if (!territory) return { ok: false, reason: 'Território inexistente.' };
    const present = soldiersInTerritory(draft, territory.id);
    // Nunca negativo: remove no máximo o que existe.
    const removable = Math.min(effect.amount, present.length);
    if (removable === 0) return { ok: false, reason: `${territory.name} não possui tropas.` };
    for (const soldier of present.slice(0, removable)) eliminateSoldier(draft, soldier.id);
    return { ok: true, message: `-${removable} soldado(s) em ${territory.name}.` };
  },

  MOVE_TROOPS(draft, effect) {
    if (effect.kind !== 'MOVE_TROOPS') return notImplemented('MOVE_TROOPS');
    if (!Number.isInteger(effect.amount) || effect.amount <= 0) {
      return { ok: false, reason: 'Quantidade inválida.' };
    }
    const from = draft.territories[effect.from as string];
    const to = draft.territories[effect.to as string];
    if (!from || !to) return { ok: false, reason: 'Território inexistente.' };
    if (from.id === to.id) return { ok: false, reason: 'Origem e destino são o mesmo território.' };
    if (!from.controllerId || from.controllerId !== to.controllerId) {
      return { ok: false, reason: 'Origem e destino precisam ser do mesmo jogador.' };
    }
    if (!effect.ignoreAdjacency && !isAdjacent(draft, from.id, to.id)) {
      return { ok: false, reason: `${from.name} e ${to.name} não são vizinhos.` };
    }
    const minLeft = effect.minLeftBehind ?? BALANCE.territory.minGarrison;
    const available = soldiersInTerritory(draft, from.id);
    if (available.length - effect.amount < minLeft) {
      return {
        ok: false,
        reason: `É obrigatório deixar ao menos ${minLeft} soldado(s) em ${from.name}.`,
      };
    }
    for (const soldier of available.slice(0, effect.amount)) {
      placeInTerritory(draft, soldier.id, to.id);
      draft.soldiers[soldier.id as string].status = 'MOVED';
    }
    return { ok: true, message: `${effect.amount} soldado(s): ${from.name} → ${to.name}.` };
  },

  CONVERT_TROOPS(draft, effect) {
    if (effect.kind !== 'CONVERT_TROOPS') return notImplemented('CONVERT_TROOPS');
    const captor = draft.players[effect.toPlayerId as string];
    if (!captor) return { ok: false, reason: 'Jogador inexistente.' };
    let converted = 0;
    for (const id of effect.soldierIds) {
      const soldier = draft.soldiers[id as string];
      if (!soldier || !soldier.alive) continue;
      captureSoldier(draft, id, { factionId: captor.factionId, playerId: captor.id });
      converted += 1;
    }
    if (converted === 0) return { ok: false, reason: 'Nenhum soldado válido para converter.' };
    syncPlayerTerritories(draft);
    return { ok: true, message: `${converted} soldado(s) convertido(s) para ${captor.name}.` };
  },
};

/** Aplica um efeito. Nunca lança: recusa devolve motivo e a partida segue. */
export function resolveEffect(draft: GameState, effect: EffectDescriptor): ResolverOutcome {
  const resolver = RESOLVERS[effect.kind];
  if (!resolver) return notImplemented(effect.kind);
  try {
    return resolver(draft, effect);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'Falha ao aplicar efeito.' };
  }
}

export function hasResolver(kind: EffectKind): boolean {
  return Boolean(RESOLVERS[kind]);
}

export { getTerritory };
