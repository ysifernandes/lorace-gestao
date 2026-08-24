import type { GameState } from '../../types/game.types';
import type { CardInstanceId, SoldierId } from '../../types/ids';
import type { Rng } from '../../rng/rng';
import { defaultRng } from '../../rng/rng';
import { rollDie } from '../../combat/dice';
import { eliminateSoldier } from '../../soldiers/soldier';
import { emitAnimation } from '../../events/animationEvents';
import { VACINA_ANIMATION } from '../animations/vacina.animation';
import { VACINA_DICE_SIDES } from '../sequestro.card';
import { getCardInstance } from '../cardRules';

export interface VacinaResult {
  diceValue: number;
  eliminatedIds: SoldierId[];
  eliminatedCount: number;
  attackersRemaining: number;
  animationEventId: string;
}

/**
 * Aplica a Vacina / Contra-Ataque: rola 1d6 e elimina esse número de atacantes.
 * Se o atacante tiver menos tropas que o dado, elimina apenas o disponível —
 * nunca resulta em quantidade negativa.
 */
export function applyVacina(
  draft: GameState,
  cardId: CardInstanceId,
  rng: Rng = defaultRng,
): VacinaResult {
  const card = getCardInstance(draft, cardId);
  const attack = draft.pendingAttack;
  if (!attack || attack.status !== 'DECLARED' || attack.defenderPlayerId !== card.ownerId) {
    throw new Error('Não há ataque declarado contra este jogador.');
  }

  const roll = rollDie(VACINA_DICE_SIDES, rng);

  const livingAttackers = attack.attackingSoldierIds.filter(
    (id) => draft.soldiers[id as string]?.alive,
  );
  const eliminatedCount = Math.max(0, Math.min(roll.value, livingAttackers.length));
  const eliminatedIds = livingAttackers.slice(0, eliminatedCount);
  for (const id of eliminatedIds) eliminateSoldier(draft, id);

  attack.attackingSoldierIds = attack.attackingSoldierIds.filter(
    (id) => !eliminatedIds.includes(id),
  );
  const attackersRemaining = attack.attackingSoldierIds.filter(
    (id) => draft.soldiers[id as string]?.alive,
  ).length;

  if (attackersRemaining === 0) attack.status = 'CANCELLED';

  const event = emitAnimation(draft, VACINA_ANIMATION, {
    diceValue: roll.value,
    diceSides: roll.sides,
    eliminatedSoldierIds: eliminatedIds.map(String),
    eliminatedCount,
    attackersRemaining,
    attackerPlayerId: attack.attackerPlayerId as string,
    defenderPlayerId: attack.defenderPlayerId as string,
  });

  return {
    diceValue: roll.value,
    eliminatedIds,
    eliminatedCount,
    attackersRemaining,
    animationEventId: event.id,
  };
}
