import type { GameState } from '../../types/game.types';
import type { CardInstanceId, SoldierId } from '../../types/ids';
import { captureSoldier, getSoldier } from '../../soldiers/soldier';
import { emitAnimation } from '../../events/animationEvents';
import { SEQUESTRO_ANIMATION } from '../animations/sequestro.animation';
import { SEQUESTRO_MAX_TARGETS } from '../sequestro.card';
import { getCardInstance } from '../cardRules';

export interface SequestroResult {
  capturedIds: SoldierId[];
  fromTerritoryIds: string[];
  animationEventId: string;
}

/** Valida a seleção de alvos do Sequestro sem alterar o estado. */
export function validateSequestroSelection(
  state: GameState,
  cardId: CardInstanceId,
  selection: SoldierId[],
): { ok: true } | { ok: false; error: string } {
  const card = getCardInstance(state, cardId);
  const unique = new Set(selection.map(String));
  if (unique.size !== selection.length) {
    return { ok: false, error: 'Seleção contém soldados repetidos.' };
  }
  if (selection.length === 0) {
    return { ok: false, error: 'Selecione ao menos 1 soldado inimigo.' };
  }
  if (selection.length > SEQUESTRO_MAX_TARGETS) {
    return {
      ok: false,
      error: `O Sequestro permite no máximo ${SEQUESTRO_MAX_TARGETS} soldados (selecionados: ${selection.length}).`,
    };
  }
  for (const id of selection) {
    const soldier = state.soldiers[id as string];
    if (!soldier) return { ok: false, error: `Soldado inexistente: ${id}` };
    if (!soldier.alive) return { ok: false, error: 'Não é possível capturar um soldado eliminado.' };
    if (soldier.ownerId === card.ownerId) {
      return { ok: false, error: 'Só é possível capturar soldados de um time adversário.' };
    }
    if (soldier.location.kind !== 'TERRITORY') {
      return { ok: false, error: 'O soldado precisa estar em um território inimigo.' };
    }
  }
  return { ok: true };
}

/**
 * Aplica o Sequestro: retira os soldados do território inimigo, troca a facção
 * para a do jogador que usou a carta e coloca em reserva para redistribuição.
 * Não consome a carta — quem orquestra (engine) faz isso.
 */
export function applySequestro(
  draft: GameState,
  cardId: CardInstanceId,
  selection: SoldierId[],
): SequestroResult {
  const card = getCardInstance(draft, cardId);
  const captor = draft.players[card.ownerId as string];
  if (!captor) throw new Error('Dono da carta não encontrado.');

  const fromTerritoryIds: string[] = [];
  for (const id of selection) {
    const soldier = getSoldier(draft, id);
    if (soldier.location.kind === 'TERRITORY') {
      const territoryKey = soldier.location.territoryId as string;
      if (!fromTerritoryIds.includes(territoryKey)) fromTerritoryIds.push(territoryKey);
    }
    captureSoldier(draft, id, { factionId: captor.factionId, playerId: captor.id });
  }

  draft.pendingDistribution = {
    playerId: captor.id,
    soldierIds: [...selection],
    sourceCardId: cardId,
  };

  const event = emitAnimation(draft, SEQUESTRO_ANIMATION, {
    capturedSoldierIds: selection.map(String),
    fromTerritoryIds,
    captorPlayerId: captor.id as string,
  });

  return { capturedIds: [...selection], fromTerritoryIds, animationEventId: event.id };
}
