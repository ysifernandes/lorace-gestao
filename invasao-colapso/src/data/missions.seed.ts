import type { FactionId } from '../game/types/ids';
import { ALIENIGENAS_ID, FACTION_05_ID, FACTION_06_ID, MAGOS_ID, ZUMBIS_ID } from '../game/factions/roster';
import { HUMANOS_ID } from '../game/factions/humanos';

/**
 * 30 OBJETIVOS SECRETOS — dados, não código.
 *
 * Cada missão é um objeto com condição declarativa. Quem sabe verificar é o
 * verificador genérico em `src/game/missions/missionEngine.ts` — não existe
 * `if` por missão espalhado pela interface.
 */

export type MissionCategory =
  | 'EXPANSAO'
  | 'CONSOLIDACAO'
  | 'POSICAO'
  | 'MILITAR'
  | 'RITMO'
  | 'TEMPO'
  | 'DOUTRINA';

export type MissionCondition =
  /** Controlar N territórios, opcionalmente com piso/teto de tropas em cada. */
  | { type: 'TERRITORY_COUNT'; value: number; minTroopsEach?: number; maxTroopsEach?: number }
  /** Controlar N regiões completas quaisquer. */
  | { type: 'REGIONS_COMPLETE'; count: number }
  /** Controlar regiões específicas, todas completas. */
  | { type: 'REGIONS_SPECIFIC'; regionIds: string[] }
  /** Uma região completa mais N territórios fora dela. */
  | { type: 'REGION_PLUS_TERRITORIES'; regionId: string; extra: number; outsideRegionId?: string }
  /** N regiões completas que não façam fronteira entre si. */
  | { type: 'REGIONS_NON_ADJACENT'; count: number }
  /** Controlar N Pontos de Interesse ao mesmo tempo. */
  | { type: 'POI_CONTROL'; count: number }
  /** Controlar os dois lados de N Poços. */
  | { type: 'POCO_BOTH_SIDES'; count: number }
  /** Eliminar uma facção específica. */
  | { type: 'ELIMINATE_FACTION'; factionId: FactionId }
  /** Eliminar N facções quaisquer. */
  | { type: 'ELIMINATE_ANY'; count: number }
  /** Eliminar o jogador do assento seguinte ao seu. */
  | { type: 'ELIMINATE_NEIGHBOR_SEAT' }
  /** Ter mais territórios que todos ao final da rodada N. */
  | { type: 'MOST_TERRITORIES_AT_ROUND'; round: number }
  /** Ter N soldados em campo e M territórios. */
  | { type: 'TROOPS_AND_TERRITORIES'; troops: number; territories: number }
  /** Conquistar ao menos 1 território em N rodadas consecutivas. */
  | { type: 'CONQUEST_STREAK'; rounds: number }
  /** Ao longo da partida, conquistar um território de cada uma das 6 regiões. */
  | { type: 'CONQUER_EACH_REGION' }
  /** Manter uma região completa por N rodadas seguidas. */
  | { type: 'HOLD_REGION_ROUNDS'; regionId: string; rounds: number }
  /** Sobreviver a N Eventos do Colapso e controlar M territórios. */
  | { type: 'SURVIVE_COLLAPSE_AND_TERRITORIES'; events: number; territories: number }
  /** Controlar N territórios de uma região específica (não precisa completar). */
  | { type: 'TERRITORIES_IN_REGION'; regionId: string; count: number };

export interface MissionDefinition {
  id: string;
  name: string;
  description: string;
  category: MissionCategory;
  condition: MissionCondition;
  /** Dificuldade estimada 1–5, usada só para relatório e balanceamento. */
  weight: 1 | 2 | 3 | 4 | 5;
  /**
   * Missão usada no lugar desta quando ela se torna impossível
   * (facção alvo ausente da partida ou eliminada por terceiro).
   */
  fallbackId?: string;
}

const FALLBACK = 'mission.fallback-16';

export const MISSION_SEEDS: MissionDefinition[] = [
  // --- Expansão ---
  {
    id: 'mission.territories-18',
    name: 'Ocupação Ampla',
    description: 'Controle 18 territórios ao mesmo tempo.',
    category: 'EXPANSAO',
    condition: { type: 'TERRITORY_COUNT', value: 18 },
    weight: 4,
  },
  {
    id: 'mission.territories-15-garrisoned',
    name: 'Linha Guarnecida',
    description: 'Controle 15 territórios com no mínimo 2 soldados em cada um.',
    category: 'EXPANSAO',
    condition: { type: 'TERRITORY_COUNT', value: 15, minTroopsEach: 2 },
    weight: 4,
  },
  {
    id: 'mission.fallback-16',
    name: 'Domínio Suficiente',
    description: 'Controle 16 territórios ao mesmo tempo.',
    category: 'EXPANSAO',
    condition: { type: 'TERRITORY_COUNT', value: 16 },
    weight: 4,
  },
  {
    id: 'mission.territories-12-dispersed',
    name: 'Doutrina de Dispersão',
    description: 'Controle 12 territórios sem que nenhum deles tenha mais de 5 soldados.',
    category: 'DOUTRINA',
    condition: { type: 'TERRITORY_COUNT', value: 12, maxTroopsEach: 5 },
    weight: 4,
  },

  // --- Consolidação ---
  {
    id: 'mission.regions-3',
    name: 'Tríplice Domínio',
    description: 'Controle 3 regiões completas quaisquer.',
    category: 'CONSOLIDACAO',
    condition: { type: 'REGIONS_COMPLETE', count: 3 },
    weight: 5,
  },
  {
    id: 'mission.regions-2',
    name: 'Dois Pilares',
    description: 'Controle 2 regiões completas quaisquer.',
    category: 'CONSOLIDACAO',
    condition: { type: 'REGIONS_COMPLETE', count: 2 },
    weight: 3,
  },
  {
    id: 'mission.metropole-ferro',
    name: 'Eixo Norte',
    description: 'Controle A Metrópole e os Montes de Ferro, ambas completas.',
    category: 'CONSOLIDACAO',
    condition: { type: 'REGIONS_SPECIFIC', regionIds: ['metropole', 'montes-de-ferro'] },
    weight: 5,
  },
  {
    id: 'mission.siderurgico-vitrea',
    name: 'Eixo Sul',
    description: 'Controle o Cinturão Siderúrgico e a Zona Vítrea, ambas completas.',
    category: 'CONSOLIDACAO',
    condition: { type: 'REGIONS_SPECIFIC', regionIds: ['cinturao-siderurgico', 'zona-vitrea'] },
    weight: 5,
  },
  {
    id: 'mission.abrigos-plus-6',
    name: 'Raiz Subterrânea',
    description: 'Controle Os Abrigos completa e mais 6 territórios de superfície.',
    category: 'CONSOLIDACAO',
    condition: { type: 'REGION_PLUS_TERRITORIES', regionId: 'os-abrigos', extra: 6 },
    weight: 4,
  },
  {
    id: 'mission.planicie-plus-poi',
    name: 'Estrada e Sinal',
    description: 'Controle a Planície Errante completa e 4 Pontos de Interesse.',
    category: 'CONSOLIDACAO',
    condition: { type: 'REGION_PLUS_TERRITORIES', regionId: 'planicie-errante', extra: 4 },
    weight: 5,
  },
  {
    id: 'mission.regions-non-adjacent',
    name: 'Domínio Partido',
    description: 'Controle 2 regiões completas que não façam fronteira entre si.',
    category: 'CONSOLIDACAO',
    condition: { type: 'REGIONS_NON_ADJACENT', count: 2 },
    weight: 5,
  },
  {
    id: 'mission.hold-metropole',
    name: 'Capital Firme',
    description: 'Controle A Metrópole completa e mantenha por 2 rodadas seguidas.',
    category: 'CONSOLIDACAO',
    condition: { type: 'HOLD_REGION_ROUNDS', regionId: 'metropole', rounds: 2 },
    weight: 5,
  },
  {
    id: 'mission.hold-abrigos',
    name: 'Portas Fechadas',
    description: 'Controle Os Abrigos completa e mantenha por 2 rodadas seguidas.',
    category: 'CONSOLIDACAO',
    condition: { type: 'HOLD_REGION_ROUNDS', regionId: 'os-abrigos', rounds: 2 },
    weight: 4,
  },
  {
    id: 'mission.metropole-4',
    name: 'Coração da Bacia',
    description: 'Controle 4 dos 5 territórios da Metrópole.',
    category: 'CONSOLIDACAO',
    condition: { type: 'TERRITORIES_IN_REGION', regionId: 'metropole', count: 4 },
    weight: 3,
  },

  // --- Posição ---
  {
    id: 'mission.poi-4',
    name: 'Rede de Controle',
    description: 'Controle 4 dos 6 Pontos de Interesse ao mesmo tempo.',
    category: 'POSICAO',
    condition: { type: 'POI_CONTROL', count: 4 },
    weight: 4,
  },
  {
    id: 'mission.pocos-3',
    name: 'Senhor dos Poços',
    description: 'Controle os dois lados de 3 Poços ao mesmo tempo.',
    category: 'POSICAO',
    condition: { type: 'POCO_BOTH_SIDES', count: 3 },
    weight: 4,
  },
  {
    id: 'mission.pocos-2',
    name: 'Descida Garantida',
    description: 'Controle os dois lados de 2 Poços ao mesmo tempo.',
    category: 'POSICAO',
    condition: { type: 'POCO_BOTH_SIDES', count: 2 },
    weight: 3,
  },

  // --- Militar (com regra de substituição) ---
  {
    id: 'mission.eliminate-humanos',
    name: 'Silenciar o Rádio',
    description: 'Elimine a facção Humanos da partida.',
    category: 'MILITAR',
    condition: { type: 'ELIMINATE_FACTION', factionId: HUMANOS_ID },
    weight: 4,
    fallbackId: FALLBACK,
  },
  {
    id: 'mission.eliminate-alienigenas',
    name: 'Cortar a Ancoragem',
    description: 'Elimine a facção Alienígenas da partida.',
    category: 'MILITAR',
    condition: { type: 'ELIMINATE_FACTION', factionId: ALIENIGENAS_ID },
    weight: 4,
    fallbackId: FALLBACK,
  },
  {
    id: 'mission.eliminate-zumbis',
    name: 'Conter a Infestação',
    description: 'Elimine a facção Zumbis da partida.',
    category: 'MILITAR',
    condition: { type: 'ELIMINATE_FACTION', factionId: ZUMBIS_ID },
    weight: 4,
    fallbackId: FALLBACK,
  },
  {
    id: 'mission.eliminate-magos',
    name: 'Quebrar a Sintonia',
    description: 'Elimine a facção Magos da partida.',
    category: 'MILITAR',
    condition: { type: 'ELIMINATE_FACTION', factionId: MAGOS_ID },
    weight: 4,
    fallbackId: FALLBACK,
  },
  {
    id: 'mission.eliminate-faction05',
    name: 'Apagar os Fornos',
    description: 'Elimine a facção FACTION_05 da partida.',
    category: 'MILITAR',
    condition: { type: 'ELIMINATE_FACTION', factionId: FACTION_05_ID },
    weight: 4,
    fallbackId: FALLBACK,
  },
  {
    id: 'mission.eliminate-faction06',
    name: 'Parar o Comboio',
    description: 'Elimine a facção FACTION_06 da partida.',
    category: 'MILITAR',
    condition: { type: 'ELIMINATE_FACTION', factionId: FACTION_06_ID },
    weight: 4,
    fallbackId: FALLBACK,
  },
  {
    id: 'mission.eliminate-any-2',
    name: 'Dois Menos',
    description: 'Elimine 2 facções quaisquer da partida.',
    category: 'MILITAR',
    condition: { type: 'ELIMINATE_ANY', count: 2 },
    weight: 5,
    fallbackId: FALLBACK,
  },
  {
    id: 'mission.eliminate-neighbor',
    name: 'Flanco Limpo',
    description: 'Elimine o jogador do assento imediatamente após o seu na ordem de turno.',
    category: 'MILITAR',
    condition: { type: 'ELIMINATE_NEIGHBOR_SEAT' },
    weight: 3,
    fallbackId: FALLBACK,
  },
  {
    id: 'mission.troops-25',
    name: 'Exército em Pé',
    description: 'Tenha 25 soldados em campo e controle 10 territórios.',
    category: 'MILITAR',
    condition: { type: 'TROOPS_AND_TERRITORIES', troops: 25, territories: 10 },
    weight: 3,
  },

  // --- Ritmo e tempo ---
  {
    id: 'mission.streak-5',
    name: 'Avanço Contínuo',
    description: 'Conquiste ao menos 1 território em 5 rodadas consecutivas.',
    category: 'RITMO',
    condition: { type: 'CONQUEST_STREAK', rounds: 5 },
    weight: 4,
  },
  {
    id: 'mission.each-region',
    name: 'Bandeira em Toda Parte',
    description:
      'Ao longo da partida, conquiste um território de cada uma das 6 regiões. Não precisa mantê-los.',
    category: 'RITMO',
    condition: { type: 'CONQUER_EACH_REGION' },
    weight: 4,
  },
  {
    id: 'mission.most-at-12',
    name: 'Primeiro na Contagem',
    description: 'Tenha mais territórios que qualquer outro jogador ao final da rodada 12.',
    category: 'TEMPO',
    condition: { type: 'MOST_TERRITORIES_AT_ROUND', round: 12 },
    weight: 3,
  },
  {
    id: 'mission.collapse-4',
    name: 'Resistir ao Colapso',
    description: 'Sobreviva a 4 Eventos do Colapso e controle 14 territórios.',
    category: 'TEMPO',
    condition: { type: 'SURVIVE_COLLAPSE_AND_TERRITORIES', events: 4, territories: 14 },
    weight: 4,
  },
];

export const FALLBACK_MISSION_ID = FALLBACK;
