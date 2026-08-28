import { factionId } from '../types/ids';
import type { FactionDefinition } from '../types/faction.types';

export const HUMANOS_ID = factionId('humanos');

/**
 * HUMANOS — primeira facção oficial.
 *
 * Sobreviveram ao Colapso com tecnologia militar, organização e medicina.
 * Identidade estratégica: ADAPTAÇÃO + TECNOLOGIA + CONTROLE TÁTICO —
 * traduzida em mobilidade e resposta, não em números brutos.
 */
export const HUMANOS: FactionDefinition = {
  id: HUMANOS_ID,
  name: 'Humanos',
  subtitle: 'Adaptação · Tecnologia · Controle Tático',
  description:
    'Remanescentes das antigas estruturas civis e militares. Compensam a falta ' +
    'de números com logística, resgate e medicina de guerra.',
  lore: [
    'Quando as redes caíram, o que restou das forças armadas não tentou retomar ' +
      'o mundo: tentou manter um perímetro. Bases, hospitais de campanha e ' +
      'comboios viraram o novo mapa.',
    'A doutrina humana nasceu dessa escassez. Não se ganha território gastando ' +
      'gente — ganha-se chegando onde o inimigo não esperava, e trazendo de volta ' +
      'quem outros dariam por perdido.',
    'Helicópteros são o símbolo dessa escolha. Enquanto houver rota aérea, ' +
      'nenhum território humano está realmente isolado.',
  ],
  color: '#2f6fed',
  secondaryColor: '#8fb4ff',
  contrastColor: '#f5f9ff',
  symbol: '🛡️',
  emblem: { key: 'humanos.emblem', placeholder: '🛡️' },
  image: { key: 'humanos.portrait', placeholder: '🚁' },
  music: { key: 'humanos.theme', placeholder: 'tema-humanos' },
  sounds: {
    select: { key: 'humanos.select', placeholder: 'radio-check' },
    ability: { key: 'humanos.ability', placeholder: 'rotor' },
  },
  strategy: {
    pillars: ['Adaptação', 'Tecnologia', 'Controle Tático'],
    strengths: [
      'Mobilidade: alcançam territórios sem fronteira comum',
      'Recuperação: convertem tropas inimigas em suas',
      'Resposta defensiva com contramedidas médicas',
    ],
    weaknesses: [
      'Poucos recursos ativos por partida — dependem de escolher a hora certa',
      'Sem vantagem bruta de ataque ou defesa',
    ],
    difficulty: 2,
  },
  startingSoldiersPerTerritory: 3,
  units: [
    {
      id: 'humanos.infantry',
      name: 'Infantaria',
      description: 'Unidade padrão. Unidades especiais chegam em etapa futura.',
    },
  ],
  passiveAbilityIds: ['ability.humanos.engenharia-tatica'],
  activeAbilityIds: ['ability.humanos.logistica-adaptativa'],
  signatureCardIds: ['card.sequestro'],
  commanders: [], // Aguardando definição do criador.
  visualEffects: ['searchlight', 'rotor-dust', 'medical-glow'],
  animationIds: ['anim.sequestro', 'anim.vacina', 'anim.sobrevivencia', 'anim.operacao-aerea'],
  modifiers: {},
  rules: {
    // ENGENHARIA TÁTICA: tradução mecânica de "defesas mais resistentes".
    fortifiedFrom: 4,
    balance: { ataque: 3, defesa: 3, mobilidade: 4, cartas: 4, recuperacao: 4 },
  },
  status: 'ACTIVE',
};
