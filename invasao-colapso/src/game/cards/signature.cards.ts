import { cardDefinitionId } from '../types/ids';
import type { CardActionSpec, CardDefinition, CardPlayType } from '../types/card.types';
import type { FactionId } from '../types/ids';
import type { AnimationSpec } from '../types/animation.types';
import { ALIENIGENAS_ID, FACTION_05_ID, FACTION_06_ID, MAGOS_ID, ZUMBIS_ID } from '../factions/roster';

/**
 * CARTAS ASSINATURA — uma por facção.
 *
 * A dos Humanos é o SEQUESTRO (regra oficial, em `sequestro.card.ts`).
 * As cinco daqui são PROVISÓRIAS: acompanham as facções ainda não aprovadas
 * pelo criador e nenhuma copia o Sequestro — nenhuma outra converte tropas
 * inimigas nem tem duplo uso ofensivo/defensivo.
 */

const SIGNATURE_ANIMATION: AnimationSpec = {
  id: 'anim.signature',
  name: 'Carta assinatura',
  beats: [
    { kind: 'HIGHLIGHT', durationMs: 220 },
    { kind: 'ENERGY_BURST', durationMs: 380 },
  ],
};

interface SignatureSpec {
  slug: string;
  name: string;
  factionId: FactionId;
  playType: CardPlayType;
  category: CardDefinition['category'];
  description: string;
  action: CardActionSpec;
  emoji: string;
  palette: [string, string];
}

const SPECS: SignatureSpec[] = [
  {
    slug: 'feixe-de-corte',
    name: 'Feixe de Corte',
    factionId: ALIENIGENAS_ID,
    playType: 'REATIVA',
    category: 'DEFESA',
    description: 'O próximo Ataque Comum contra você nesta rodada usa no máximo 1 dado.',
    action: { type: 'DICE_CAP_INCOMING', value: 1 },
    emoji: '👁️',
    palette: ['#0b2b26', '#25b39a'],
  },
  {
    slug: 'cepa-resistente',
    name: 'Cepa Resistente',
    factionId: ZUMBIS_ID,
    playType: 'DEFENSIVA',
    category: 'DEFESA',
    description:
      'Escolha um território seu: nas próximas 2 rodadas, ao defender ele ignora a primeira comparação perdida de cada rodada.',
    action: { type: 'SHIELD', rounds: 2, ignoreFirstLossPerRound: true },
    emoji: '☣️',
    palette: ['#1a2409', '#7fae2e'],
  },
  {
    slug: 'eco',
    name: 'Eco',
    factionId: MAGOS_ID,
    playType: 'TATICA',
    category: 'EVENTO',
    description: 'Repita o último Evento do Colapso já revelado nesta partida.',
    action: { type: 'REPEAT_LAST_COLLAPSE' },
    emoji: '🜁',
    palette: ['#1c1030', '#8b62d9'],
  },
  {
    slug: 'reconstituicao',
    name: 'Reconstituição',
    factionId: FACTION_05_ID,
    playType: 'TATICA',
    category: 'SUPORTE',
    description:
      'Devolva ao tabuleiro até 4 soldados seus perdidos nesta rodada, distribuídos entre territórios seus.',
    action: { type: 'RESTORE_TROOPS', amount: 4 },
    emoji: '⚙️',
    palette: ['#2b1408', '#d0703a'],
  },
  {
    slug: 'desmanche',
    name: 'Desmanche',
    factionId: FACTION_06_ID,
    playType: 'OFENSIVA',
    category: 'OPERACAO',
    description:
      'Escolha um território inimigo: até o próximo turno do dono, ele não recebe reforço nem movimentação.',
    action: { type: 'BLOCK_TERRITORY', rounds: 1 },
    emoji: '🜂',
    palette: ['#2b2306', '#d8b23c'],
  },
];

function build(spec: SignatureSpec): CardDefinition {
  return {
    id: cardDefinitionId(`card.${spec.slug}`),
    name: spec.name,
    factionId: spec.factionId,
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
      animation: SIGNATURE_ANIMATION,
    },
    alternateEffect: null,
    art: { key: `card.${spec.slug}`, emoji: spec.emoji, palette: spec.palette },
  };
}

export const SIGNATURE_CARDS: CardDefinition[] = SPECS.map(build);

/** Assinatura de cada facção (a dos Humanos é o Sequestro). */
export const SIGNATURE_BY_FACTION: Record<string, string> = {
  [ALIENIGENAS_ID as string]: 'card.feixe-de-corte',
  [ZUMBIS_ID as string]: 'card.cepa-resistente',
  [MAGOS_ID as string]: 'card.eco',
  [FACTION_05_ID as string]: 'card.reconstituicao',
  [FACTION_06_ID as string]: 'card.desmanche',
};
