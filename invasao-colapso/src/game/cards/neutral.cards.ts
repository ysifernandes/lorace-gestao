import { cardDefinitionId } from '../types/ids';
import type { CardActionSpec, CardDefinition, CardPlayType } from '../types/card.types';
import type { AnimationSpec } from '../types/animation.types';

/** Roteiro mínimo: as cartas neutras ainda não têm animação própria. */
const SIMPLE_ANIMATION: AnimationSpec = {
  id: 'anim.card.simple',
  name: 'Uso de carta',
  beats: [{ kind: 'HIGHLIGHT', durationMs: 240 }],
};

/**
 * BARALHO DO COLAPSO — 12 tipos, 24 cartas.
 *
 * Compartilhado por todas as facções. Cada carta declara o que faz
 * (`action`); quem aplica é `cardActions.ts`. Nenhuma regra de carta vive
 * em componente visual.
 */

interface NeutralSpec {
  slug: string;
  name: string;
  playType: CardPlayType;
  category: CardDefinition['category'];
  description: string;
  copies: number;
  action: CardActionSpec;
  emoji: string;
  palette: [string, string];
}

const SPECS: NeutralSpec[] = [
  {
    slug: 'reconhecimento',
    name: 'Reconhecimento',
    playType: 'TATICA',
    category: 'SUPORTE',
    description: 'Veja a mão de um adversário à sua escolha.',
    copies: 3,
    action: { type: 'REVEAL_HAND' },
    emoji: '🔭',
    palette: ['#2b3d52', '#63859f'],
  },
  {
    slug: 'suprimentos',
    name: 'Suprimentos',
    playType: 'TATICA',
    category: 'SUPORTE',
    description: 'Receba 3 soldados e distribua livremente entre territórios seus.',
    copies: 3,
    action: { type: 'GAIN_TROOPS', amount: 3 },
    emoji: '📦',
    palette: ['#3d4a2b', '#8aa456'],
  },
  {
    slug: 'emboscada',
    name: 'Emboscada',
    playType: 'REATIVA',
    category: 'DEFESA',
    description: 'Ao ser atacado: o atacante perde 1 soldado antes da primeira rodada de dados.',
    copies: 2,
    action: { type: 'AMBUSH', amount: 1 },
    emoji: '🪤',
    palette: ['#472b2b', '#a5604f'],
  },
  {
    slug: 'barricada',
    name: 'Barricada',
    playType: 'DEFENSIVA',
    category: 'DEFESA',
    description: 'Até seu próximo turno, um território seu não pode ser alvo de Ataque Especial.',
    copies: 2,
    action: { type: 'SHIELD', rounds: 1, blockSpecialAttack: true },
    emoji: '🧱',
    palette: ['#4a4136', '#a08a6c'],
  },
  {
    slug: 'sabotagem',
    name: 'Sabotagem',
    playType: 'OFENSIVA',
    category: 'OPERACAO',
    description: 'Um território inimigo perde 1 soldado (nunca abaixo de 1).',
    copies: 2,
    action: { type: 'SABOTAGE', amount: 1 },
    emoji: '💥',
    palette: ['#52252b', '#b0505c'],
  },
  {
    slug: 'rota-alternativa',
    name: 'Rota Alternativa',
    playType: 'TATICA',
    category: 'SUPORTE',
    description: 'Realize uma movimentação adicional neste turno.',
    copies: 2,
    action: { type: 'EXTRA_MOVE', amount: 1 },
    emoji: '🧭',
    palette: ['#2c4448', '#5f9aa0'],
  },
  {
    slug: 'interferencia',
    name: 'Interferência',
    playType: 'REATIVA',
    category: 'DEFESA',
    description: 'O próximo Ataque Comum contra você nesta rodada usa no máximo 2 dados.',
    copies: 2,
    action: { type: 'DICE_CAP_INCOMING', value: 2 },
    emoji: '📡',
    palette: ['#2f3350', '#6f76b5'],
  },
  {
    slug: 'moral-elevado',
    name: 'Moral Elevado',
    playType: 'OFENSIVA',
    category: 'OPERACAO',
    description: 'Na batalha em que você ataca: uma vez, relance o seu dado mais baixo.',
    copies: 2,
    action: { type: 'REROLL_LOWEST', side: 'ATTACKER' },
    emoji: '🎖️',
    palette: ['#4d3a1f', '#c19341'],
  },
  {
    slug: 'terreno-conhecido',
    name: 'Terreno Conhecido',
    playType: 'REATIVA',
    category: 'DEFESA',
    description: 'Na batalha em que você defende: uma vez, relance o seu dado mais baixo.',
    copies: 2,
    action: { type: 'REROLL_LOWEST', side: 'DEFENDER' },
    emoji: '🗺️',
    palette: ['#2e4034', '#6f9a72'],
  },
  {
    slug: 'evacuacao',
    name: 'Evacuação',
    playType: 'TATICA',
    category: 'SUPORTE',
    description: 'Mova até 3 soldados de um território seu para outro território seu não adjacente.',
    copies: 2,
    action: { type: 'EVACUATE', amount: 3 },
    emoji: '🚨',
    palette: ['#3a2c47', '#8a6bad'],
  },
  {
    slug: 'radio-pirata',
    name: 'Rádio Pirata',
    playType: 'TATICA',
    category: 'EVENTO',
    description: 'Veja qual será o próximo Evento do Colapso a ser revelado.',
    copies: 1,
    action: { type: 'PEEK_COLLAPSE' },
    emoji: '📻',
    palette: ['#4a3520', '#c08a3e'],
  },
  {
    slug: 'desercao',
    name: 'Deserção',
    playType: 'OFENSIVA',
    category: 'OPERACAO',
    description:
      'Escolha um território inimigo com 4 ou mais soldados: 1 soldado passa para um território seu adjacente.',
    copies: 1,
    action: { type: 'DEFECTION', minEnemyTroops: 4 },
    emoji: '🏳️',
    palette: ['#3f3f3f', '#8f8f8f'],
  },
];

function build(spec: NeutralSpec): CardDefinition {
  return {
    id: cardDefinitionId(`card.${spec.slug}`),
    name: spec.name,
    factionId: null,
    category: spec.category,
    playType: spec.playType,
    description: spec.description,
    maxUses: 1,
    conditions:
      spec.playType === 'REATIVA'
        ? [{ type: 'HAS_PENDING_ATTACK_AGAINST_OWNER' }]
        : [{ type: 'IS_CURRENT_PLAYER' }, { type: 'PHASE_IS', phases: ['CARTAS'] }],
    primaryEffect: {
      id: `effect.${spec.slug}`,
      name: spec.name,
      description: spec.description,
      conditions: [],
      action: spec.action,
      animation: SIMPLE_ANIMATION,
    },
    alternateEffect: null,
    art: { key: `card.${spec.slug}`, emoji: spec.emoji, palette: spec.palette },
  };
}

export const NEUTRAL_CARDS: CardDefinition[] = SPECS.map(build);

/** Composição do baralho: 24 cartas a partir de 12 tipos. */
export const DECK_COMPOSITION: { definitionId: CardDefinition['id']; copies: number }[] = SPECS.map(
  (spec) => ({ definitionId: cardDefinitionId(`card.${spec.slug}`), copies: spec.copies }),
);

export const DECK_SIZE = SPECS.reduce((sum, spec) => sum + spec.copies, 0);
