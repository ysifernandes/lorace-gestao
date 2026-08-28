import { factionId } from '../types/ids';
import type { FactionDefinition } from '../types/faction.types';

/**
 * ⚠️ TECNÓLOGOS — CONFLITO DE REFERÊNCIA REGISTRADO.
 *
 * As referências visuais oficiais ("ESCOLHA SEU EXÉRCITO" e "CARTAS ESPECIAIS
 * DAS FACÇÕES") mostram TECNÓLOGOS no 5º assento, com passiva, habilidade,
 * carta assinatura e unidades próprias. O texto oficial do criador, porém,
 * lista VAMPIROS no roster de seis.
 *
 * Não escolhi arbitrariamente: os dois estão implementados. VAMPIROS entra no
 * roster oficial (o texto manda na regra); TECNÓLOGOS fica registrado com a
 * identidade exata da referência e disponível na seleção, para o criador
 * decidir qual dos dois ocupa o assento.
 *
 * Identidade, passiva, habilidade e carta abaixo são transcrição direta da
 * referência — nada foi inventado.
 */
export const TECNOLOGOS_ID = factionId('tecnologos');

export const TECNOLOGOS: FactionDefinition = {
  id: TECNOLOGOS_ID,
  name: 'Tecnólogos',
  subtitle: 'Engenharia · Automação · Supremacia Industrial',
  description:
    'Não lutam: produzem. Cada turno sai da linha de montagem mais material ' +
    'do que o inimigo consegue destruir.',
  lore: [
    'Herdaram as fábricas automáticas que continuaram rodando depois do ' +
      'Colapso e passaram a alimentá-las de propósito.',
    'Mechs, torres e drones saem do pátio prontos. O operário é o recurso mais ' +
      'escasso, não a máquina.',
  ],
  color: '#E03B3B',
  secondaryColor: '#FF8A8A',
  contrastColor: '#1c0606',
  symbol: '⚙️',
  emblem: { key: 'tecnologos.emblem', placeholder: '⚙️' },
  strategy: {
    pillars: ['Engenharia', 'Automação', 'Supremacia Industrial'],
    strengths: [
      'Produção em Série: 1 tropa extra por turno',
      'Protocolo de Guerra dobra o ataque de uma unidade por rodada',
      'Arsenal Avançado despeja 3 unidades de apoio no campo',
    ],
    weaknesses: [
      'Arsenal Avançado obriga a descartar 1 carta ao final do turno',
      'Mobilidade limitada: máquinas pesadas não reposicionam',
    ],
    difficulty: 2,
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: 'tecnologos.operario', name: 'Operário', description: 'Unidade básica.' },
    { id: 'tecnologos.sentinela', name: 'Sentinela', description: 'Unidade defensiva.' },
    { id: 'tecnologos.mech', name: 'Mech', description: 'Unidade pesada.' },
    { id: 'tecnologos.tanque', name: 'Tanque', description: 'Veículo blindado.' },
    { id: 'tecnologos.torre', name: 'Torre', description: 'Estrutura de suporte.' },
    { id: 'tecnologos.aviao', name: 'Avião de Ataque', description: 'Unidade aérea.' },
  ],
  passiveAbilityIds: ['ability.tecnologos.producao-em-serie'],
  activeAbilityIds: [],
  signatureCardIds: ['card.arsenal-avancado'],
  commanders: [],
  visualEffects: ['assembly-sparks', 'servo-glow'],
  animationIds: ['anim.arsenal-avancado'],
  modifiers: {},
  rules: {
    borderReinforceOnQuietTurn: 1,
    maxSoldiersPerMove: 3,
    balance: { ataque: 4, defesa: 5, mobilidade: 1, cartas: 4, recuperacao: 4 },
  },
  status: 'TEST_ONLY',
  provisional: true,
};
