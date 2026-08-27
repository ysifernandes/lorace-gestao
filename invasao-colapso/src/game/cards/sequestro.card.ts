import { cardDefinitionId } from '../types/ids';
import type { CardDefinition } from '../types/card.types';
import { HUMANOS_ID } from '../factions/humanos';
import { SEQUESTRO_ANIMATION } from './animations/sequestro.animation';
import { VACINA_ANIMATION } from './animations/vacina.animation';
import { BALANCE } from '../config/balance';

export const SEQUESTRO_CARD_ID = cardDefinitionId('card.sequestro');

/** Máximo de soldados extraídos por um Sequestro. Valor em `BALANCE`. */
export const SEQUESTRO_MAX_TARGETS = BALANCE.cards.sequestro.maxTargets;
/** Faces do dado da Vacina / Contra-Ataque. Valor em `BALANCE`. */
export const VACINA_DICE_SIDES = BALANCE.cards.vacina.diceSides;

export const SEQUESTRO_CARD: CardDefinition = {
  id: SEQUESTRO_CARD_ID,
  name: 'Sequestro',
  factionId: HUMANOS_ID,
  category: 'OPERACAO',
  playType: 'OFENSIVA',
  description:
    'Operação de extração aérea humana. Pode ser usada para capturar tropas inimigas ' +
    'ou, defensivamente, como contramedida biológica. Um uso consome a carta.',
  maxUses: BALANCE.cards.sequestro.maxUses,
  // Sem condição de "jogador do turno" no nível da carta: o uso defensivo
  // acontece justamente no turno do adversário. Cada efeito declara as suas.
  conditions: [],
  primaryEffect: {
    id: 'effect.sequestro',
    name: 'Sequestro',
    description:
      'Escolha até 7 soldados de um time adversário. Eles deixam o território inimigo, ' +
      'passam a integrar o exército Humano e podem ser redistribuídos livremente ' +
      'entre os seus territórios.',
    conditions: [
      { type: 'IS_CURRENT_PLAYER' },
      { type: 'PHASE_IS', phases: ['CARTAS'] },
      { type: 'ENEMY_SOLDIERS_AVAILABLE', min: 1 },
    ],
    limits: { maxTargets: SEQUESTRO_MAX_TARGETS },
    action: { type: 'SEQUESTRO' },
    animation: SEQUESTRO_ANIMATION,
  },
  alternateEffect: {
    id: 'effect.vacina',
    name: 'Vacina / Contra-Ataque',
    description:
      'Ao ser atacado, ative a contramedida: role 1 dado de 6 faces. O resultado ' +
      'define quantos soldados atacantes são destruídos (limitado ao total de atacantes).',
    conditions: [{ type: 'HAS_PENDING_ATTACK_AGAINST_OWNER' }],
    limits: { diceSides: VACINA_DICE_SIDES },
    action: { type: 'VACINA' },
    animation: VACINA_ANIMATION,
  },
  art: {
    key: 'sequestro',
    emoji: '🚁',
    palette: ['#1b2a4a', '#2f6fed'],
  },
};
