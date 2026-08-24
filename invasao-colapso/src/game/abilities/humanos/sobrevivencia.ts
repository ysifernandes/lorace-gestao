import type { AbilityDefinition } from '../ability.types';
import type { EffectDescriptor } from '../../effects/effect.types';
import { HUMANOS_ID } from '../../factions/humanos';
import { BALANCE } from '../../config/balance';
import { SOBREVIVENCIA_ANIMATION } from '../animations/ability.animations';

export const SOBREVIVENCIA_ID = 'ability.humanos.sobrevivencia';

/**
 * SOBREVIVÊNCIA — passiva dos Humanos.
 *
 * Encurralados, os Humanos improvisam logística: começando o turno com
 * poucos territórios, recebem um reforço extra.
 *
 * ⚠️ PROVISÓRIA: limiar e bônus vêm de `BALANCE.abilities.sobrevivencia`
 * e aguardam definição final do criador.
 */
export const SOBREVIVENCIA: AbilityDefinition = {
  id: SOBREVIVENCIA_ID,
  factionId: HUMANOS_ID,
  name: 'Sobrevivência',
  description:
    `Ao iniciar o turno controlando ${BALANCE.abilities.sobrevivencia.maxTerritories} ` +
    `território(s) ou menos, recebe +${BALANCE.abilities.sobrevivencia.bonusTroops} reforço.`,
  kind: 'PASSIVE',
  triggers: ['TURN_STARTED'],
  conditions: [
    { type: 'IS_CURRENT_PLAYER' },
    { type: 'TERRITORY_COUNT_AT_MOST', value: BALANCE.abilities.sobrevivencia.maxTerritories },
  ],
  // Passiva: sem cargas, mas o limite por turno impede bônus duplicado.
  usage: { scope: 'PER_TURN', perTurn: 1 },
  produceEffects: (context): EffectDescriptor[] => [
    {
      kind: 'GRANT_REINFORCEMENTS',
      playerId: context.playerId,
      amount: BALANCE.abilities.sobrevivencia.bonusTroops,
    },
  ],
  feedback: {
    title: 'SOBREVIVÊNCIA ATIVADA',
    detail: () => `+${BALANCE.abilities.sobrevivencia.bonusTroops} REFORÇO`,
  },
  animation: SOBREVIVENCIA_ANIMATION,
  provisional: true,
};
