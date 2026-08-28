import { cardDefinitionId } from '../types/ids';
import type { CardActionSpec, CardDefinition, CardPlayType } from '../types/card.types';
import type { FactionId } from '../types/ids';
import type { AnimationSpec } from '../types/animation.types';
import { ALIENIGENAS_ID, GOBLINS_ID, MAGOS_ID, VAMPIROS_ID, ZUMBIS_ID } from '../factions/roster';
import { TECNOLOGOS_ID } from '../factions/tecnologos';

/**
 * CARTAS ASSINATURA — uma por facção.
 *
 * Os efeitos abaixo são transcrição direta da REFERÊNCIA VISUAL OFICIAL
 * "CARTAS ESPECIAIS DAS FACÇÕES". Nada foi alterado silenciosamente.
 *
 * A dos Humanos é o SEQUESTRO (regra oficial, em `sequestro.card.ts`) —
 * nenhuma outra carta copia o duplo uso ofensivo/defensivo dela.
 *
 * VAMPIROS não aparece na referência de cartas; a carta deles está marcada
 * como PROPOSTA e aguarda aprovação.
 */

const SIGNATURE_ANIMATION: AnimationSpec = {
  id: 'anim.signature',
  name: 'Carta assinatura',
  beats: [
    { kind: 'HIGHLIGHT', durationMs: 220 },
    { kind: 'ENERGY_BURST', durationMs: 420 },
    { kind: 'REVEAL', durationMs: 260 },
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
  /** true quando o efeito veio da referência visual oficial. */
  fromReference: boolean;
}

const SPECS: SignatureSpec[] = [
  {
    slug: 'invasao-orbital',
    name: 'Invasão Orbital',
    factionId: ALIENIGENAS_ID,
    playType: 'OFENSIVA',
    category: 'OPERACAO',
    description:
      'Escolha um território inimigo. Todas as unidades naquele território perdem até 3 soldados.',
    action: { type: 'ORBITAL_STRIKE', amount: 3 },
    emoji: '🛸',
    palette: ['#1a0a2e', '#A855F7'],
    fromReference: true,
  },
  {
    slug: 'surto',
    name: 'Surto',
    factionId: ZUMBIS_ID,
    playType: 'TATICA',
    category: 'SUPORTE',
    description:
      'Adicione instantaneamente 5 soldados, distribuídos como desejar em territórios que você controla.',
    action: { type: 'GAIN_TROOPS', amount: 5 },
    emoji: '☣️',
    palette: ['#0f1a06', '#7FD32E'],
    fromReference: true,
  },
  {
    slug: 'pacto-de-sangue',
    name: 'Pacto de Sangue',
    factionId: VAMPIROS_ID,
    playType: 'OFENSIVA',
    category: 'OPERACAO',
    description:
      'Escolha um território inimigo e role 1D6: ele perde essa quantidade de soldados e você ' +
      'ganha metade (arredondada para baixo) em um território seu vizinho.',
    action: { type: 'BLOOD_PACT', diceSides: 6 },
    emoji: '🩸',
    palette: ['#1c0507', '#D42A3A'],
    fromReference: false,
  },
  {
    slug: 'ritual-maior',
    name: 'Ritual Maior',
    factionId: MAGOS_ID,
    playType: 'OFENSIVA',
    category: 'EVENTO',
    description:
      'Escolha um território. Todos os jogadores naquele território rolam 1D6 e perdem essa ' +
      'quantidade de soldados.',
    action: { type: 'RITUAL', diceSides: 6 },
    emoji: '🜂',
    palette: ['#1f1304', '#E0952A'],
    fromReference: true,
  },
  {
    slug: 'armadilha-explosiva',
    name: 'Armadilha Explosiva',
    factionId: GOBLINS_ID,
    playType: 'DEFENSIVA',
    category: 'DEFESA',
    description:
      'Escolha um território. No início do turno do próximo jogador que entrar nele, ele sofre ' +
      '3 de dano (perde 3 soldados).',
    action: { type: 'TRAP', damage: 3, rounds: 3 },
    emoji: '💣',
    palette: ['#1f1a02', '#F7D02E'],
    fromReference: true,
  },
  {
    slug: 'arsenal-avancado',
    name: 'Arsenal Avançado',
    factionId: TECNOLOGOS_ID,
    playType: 'TATICA',
    category: 'SUPORTE',
    description:
      'Adicione 3 unidades de apoio ao campo de batalha. Descarte 1 carta no final do turno.',
    action: { type: 'GAIN_TROOPS', amount: 3, discardAtEndOfTurn: 1 },
    emoji: '⚙️',
    palette: ['#1c0606', '#E03B3B'],
    fromReference: true,
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
  [ALIENIGENAS_ID as string]: 'card.invasao-orbital',
  [ZUMBIS_ID as string]: 'card.surto',
  [VAMPIROS_ID as string]: 'card.pacto-de-sangue',
  [MAGOS_ID as string]: 'card.ritual-maior',
  [GOBLINS_ID as string]: 'card.armadilha-explosiva',
  [TECNOLOGOS_ID as string]: 'card.arsenal-avancado',
};

/** Cartas cujo efeito veio da referência visual (para relatório e DEV). */
export const SIGNATURE_FROM_REFERENCE = SPECS.filter((s) => s.fromReference).map((s) => s.slug);
