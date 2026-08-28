import { factionId } from '../types/ids';
import type { FactionDefinition } from '../types/faction.types';

/**
 * ROSTER OFICIAL DAS FACÇÕES — além dos HUMANOS.
 *
 * Ordem oficial definida pelo criador:
 *   1 HUMANOS · 2 ALIENÍGENAS · 3 ZUMBIS · 4 VAMPIROS · 5 MAGOS · 6 GOBLINS
 *
 * Passivas, habilidades, cartas assinatura e cores vêm das REFERÊNCIAS
 * VISUAIS OFICIAIS ("ESCOLHA SEU EXÉRCITO" e "CARTAS ESPECIAIS DAS FACÇÕES").
 *
 * ⚠️ CONFLITO REGISTRADO: as referências visuais mostram TECNÓLOGOS no 4º
 * assento, enquanto o texto oficial pede VAMPIROS. Os dois estão registrados —
 * VAMPIROS entra no roster oficial (o texto manda na regra) e TECNÓLOGOS fica
 * disponível com a identidade exata da referência. Ver `tecnologos.ts`.
 *
 * REGRA DE COR: a cor da EQUIPE não é a cor da CRIATURA. Os Goblins usam
 * AMARELO como identificação de facção — nunca verde, que é dos Zumbis.
 */

export const ALIENIGENAS_ID = factionId('alienigenas');
export const ZUMBIS_ID = factionId('zumbis');
export const VAMPIROS_ID = factionId('vampiros');
export const MAGOS_ID = factionId('magos');
export const GOBLINS_ID = factionId('goblins');

export const ALIENIGENAS: FactionDefinition = {
  id: ALIENIGENAS_ID,
  name: 'Alienígenas',
  subtitle: 'Evolução · Supremacia · Tecnologia Avançada',
  description:
    'Não vieram atrás de território: vieram atrás de material genético. Cada ' +
    'conquista alimenta a próxima mutação.',
  lore: [
    'As naves não desceram no dia do Colapso. Desceram três semanas depois, ' +
      'quando a atmosfera parou de interferir — como se estivessem esperando.',
    'A tecnologia deles não se parece com nada construído: parece cultivada. ' +
      'Naves com casco orgânico, armas que respiram.',
    'Onde passam, o terreno fica limpo. Limpo demais.',
  ],
  color: '#A855F7',
  secondaryColor: '#D8B4FE',
  contrastColor: '#1a0a2e',
  symbol: '👽',
  emblem: { key: 'alienigenas.emblem', placeholder: '👽' },
  strategy: {
    pillars: ['Evolução', 'Supremacia', 'Tecnologia Avançada'],
    strengths: [
      'Evolução Biológica: cada conquista concede uma mutação temporária',
      'Telepatia Coletiva revela exércitos antes do ataque',
      'Invasão Orbital dizima um território inteiro de uma vez',
    ],
    weaknesses: [
      'Frágeis fora da própria rede: perder território custa também uma carta',
      'Defesa apenas mediana',
    ],
    difficulty: 4,
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: 'alienigenas.drone', name: 'Drone', description: 'Unidade básica de reconhecimento.' },
    { id: 'alienigenas.guerreiro', name: 'Guerreiro', description: 'Infantaria de assalto.' },
    { id: 'alienigenas.cacador', name: 'Caçador', description: 'Unidade rápida de perseguição.' },
    { id: 'alienigenas.devorador', name: 'Devorador', description: 'Unidade pesada de absorção.' },
    { id: 'alienigenas.nave', name: 'Nave', description: 'Unidade aérea.' },
    { id: 'alienigenas.colosso', name: 'Colosso', description: 'Unidade de elite.' },
  ],
  passiveAbilityIds: ['ability.alienigenas.evolucao-biologica'],
  activeAbilityIds: ['ability.alienigenas.telepatia-coletiva'],
  signatureCardIds: ['card.invasao-orbital'],
  commanders: [],
  visualEffects: ['orbital-beam', 'mutation-glow'],
  animationIds: ['anim.invasao-orbital'],
  modifiers: {},
  rules: {
    conquestMutation: 1,
    discardOnTerritoryLost: true,
    balance: { ataque: 4, defesa: 3, mobilidade: 4, cartas: 4, recuperacao: 3 },
  },
  status: 'ACTIVE',
  provisional: true,
};

export const ZUMBIS: FactionDefinition = {
  id: ZUMBIS_ID,
  name: 'Zumbis',
  subtitle: 'Infestação · Massa · Imparável',
  description:
    'Não há comando, não há recuo, não há estratégia declarada. Há pressão — ' +
    'e cada território tomado devolve mais corpos ao avanço.',
  lore: [
    'Os primeiros surgiram nos setores onde a contenção sanitária continuou ' +
      'operando sem supervisão médica. O protocolo mandava manter os corpos ' +
      'funcionando. Ele continua sendo executado.',
    'A infestação não conquista: ocupa. E o que ocupa, não devolve.',
    'A fraqueza é a própria natureza: massa demais num lugar só apodrece.',
  ],
  color: '#7FD32E',
  secondaryColor: '#C6E86A',
  contrastColor: '#0f1a06',
  symbol: '💀',
  emblem: { key: 'zumbis.emblem', placeholder: '💀' },
  strategy: {
    pillars: ['Infestação', 'Massa', 'Imparável'],
    strengths: [
      'Infestação: cada conquista rende +1 soldado adicional',
      'Contaminação corrói territórios inimigos sem gastar ataque',
      'Surto injeta 5 soldados de uma vez',
    ],
    weaknesses: [
      'Massa instável: pilhas grandes apodrecem sozinhas',
      'Mobilidade baixa — não reposiciona a tempo',
    ],
    difficulty: 3,
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: 'zumbis.zumbi', name: 'Zumbi', description: 'Unidade básica.' },
    { id: 'zumbis.rapido', name: 'Zumbi Rápido', description: 'Unidade de investida.' },
    { id: 'zumbis.bruto', name: 'Bruto', description: 'Unidade pesada.' },
    { id: 'zumbis.devorador', name: 'Devorador', description: 'Unidade de consumo.' },
    { id: 'zumbis.contaminador', name: 'Contaminador', description: 'Unidade de suporte.' },
    { id: 'zumbis.abominacao', name: 'Abominação', description: 'Unidade de elite.' },
  ],
  passiveAbilityIds: ['ability.zumbis.infestacao'],
  activeAbilityIds: ['ability.zumbis.contaminacao'],
  signatureCardIds: ['card.surto'],
  commanders: [],
  visualEffects: ['spore-cloud', 'infection-spread'],
  animationIds: ['anim.surto'],
  modifiers: {},
  rules: {
    conquestConversion: 1,
    conquestConversionPerTurn: 3,
    overcrowdThreshold: 9,
    balance: { ataque: 5, defesa: 4, mobilidade: 2, cartas: 3, recuperacao: 4 },
  },
  status: 'ACTIVE',
  provisional: true,
};

export const VAMPIROS: FactionDefinition = {
  id: VAMPIROS_ID,
  name: 'Vampiros',
  subtitle: 'Aristocracia · Sangue · Noite',
  description:
    'Estavam aqui antes, escondidos sob a estrutura do velho mundo. Quando a ' +
    'luz caiu, deixaram de precisar se esconder.',
  lore: [
    'As casas nobres não sobreviveram ao Colapso: elas o esperavam. Os ' +
      'arquivos antigos falam de contratos de terra assinados há séculos, ' +
      'com cláusulas que só valeriam "quando a rede silenciar".',
    'Não constroem. Ocupam o que já existe e o tornam mais escuro.',
    'O que tomam pelo sangue, devolvem em soldados.',
  ],
  color: '#D42A3A',
  secondaryColor: '#FF7B85',
  contrastColor: '#1c0507',
  symbol: '🩸',
  emblem: { key: 'vampiros.emblem', placeholder: '🩸' },
  strategy: {
    pillars: ['Aristocracia Sombria', 'Energia Sanguínea', 'Forças Noturnas'],
    strengths: [
      'Regeneração: territórios feridos se recompõem ao final do turno',
      'Enxame Noturno drena o inimigo e alimenta o próprio exército',
      'Pacto de Sangue converte perdas alheias em ganho próprio',
    ],
    weaknesses: [
      'Aversão à luz: não recebem bônus de Ponto de Interesse',
      'Dependem de fronteira ativa — recuados, não se alimentam',
    ],
    difficulty: 4,
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: 'vampiros.servo', name: 'Servo', description: 'Unidade básica.' },
    { id: 'vampiros.carniceiro', name: 'Carniceiro', description: 'Infantaria pesada.' },
    { id: 'vampiros.morcego', name: 'Enxame', description: 'Unidade rápida.' },
    { id: 'vampiros.nobre', name: 'Nobre', description: 'Unidade de comando.' },
    { id: 'vampiros.carruagem', name: 'Carruagem Negra', description: 'Unidade de transporte.' },
    { id: 'vampiros.senhor', name: 'Senhor da Noite', description: 'Unidade de elite.' },
  ],
  passiveAbilityIds: ['ability.vampiros.regeneracao'],
  activeAbilityIds: ['ability.vampiros.enxame-noturno'],
  signatureCardIds: ['card.pacto-de-sangue'],
  commanders: [],
  visualEffects: ['blood-mist', 'night-veil'],
  animationIds: ['anim.pacto-de-sangue'],
  modifiers: {},
  rules: {
    regenerateWoundedTerritories: 2,
    ignorePoiBonus: true,
    balance: { ataque: 4, defesa: 4, mobilidade: 3, cartas: 3, recuperacao: 4 },
  },
  status: 'ACTIVE',
  provisional: true,
};

export const MAGOS: FactionDefinition = {
  id: MAGOS_ID,
  name: 'Magos',
  subtitle: 'Arcano · Energia · Alteração',
  description:
    'Não é feitiçaria antiga: é o que sobrou quando as leis físicas soltaram. ' +
    'Eles aprenderam a ler a fratura e a apontá-la.',
  lore: [
    'Chamaram de magia porque não havia outra palavra. O Colapso deixou campos ' +
      'residuais que reorganizam matéria — e algumas pessoas passaram a ressoar ' +
      'com eles.',
    'Runas, portais e círculos não são tradição: são interface. A única que ' +
      'funciona com o que a rede virou.',
    'Sabem mais do que atacam. É por isso que duram.',
  ],
  color: '#E0952A',
  secondaryColor: '#FFD98A',
  contrastColor: '#1f1304',
  symbol: '🜂',
  emblem: { key: 'magos.emblem', placeholder: '🜂' },
  strategy: {
    pillars: ['Arcano', 'Energia', 'Alteração'],
    strengths: [
      'Conhecimento Arcano: 1 carta adicional por turno',
      'Teletransporte Arcano move tropas ignorando fronteiras',
      'Ritual Maior atinge todos os exércitos de um território',
    ],
    weaknesses: [
      'Instáveis: cada Evento do Colapso de AMEAÇA custa 1 soldado a mais',
      'Combate direto apenas mediano',
    ],
    difficulty: 5,
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: 'magos.acolito', name: 'Acólito', description: 'Unidade básica.' },
    { id: 'magos.feiticeiro', name: 'Feiticeiro', description: 'Unidade de ataque arcano.' },
    { id: 'magos.mago', name: 'Mago', description: 'Unidade de controle.' },
    { id: 'magos.elemental', name: 'Elemental', description: 'Unidade invocada.' },
    { id: 'magos.golem', name: 'Golem Arcano', description: 'Unidade pesada.' },
    { id: 'magos.dragao', name: 'Dragão Arcano', description: 'Unidade de elite.' },
  ],
  passiveAbilityIds: ['ability.magos.conhecimento-arcano'],
  activeAbilityIds: ['ability.magos.teletransporte-arcano'],
  signatureCardIds: ['card.ritual-maior'],
  commanders: [],
  visualEffects: ['rune-circle', 'arcane-portal'],
  animationIds: ['anim.ritual-maior'],
  modifiers: {},
  rules: {
    extraCardDrawPerTurn: 1,
    collapseFragility: true,
    balance: { ataque: 3, defesa: 3, mobilidade: 4, cartas: 5, recuperacao: 3 },
  },
  status: 'ACTIVE',
  provisional: true,
};

export const GOBLINS: FactionDefinition = {
  id: GOBLINS_ID,
  name: 'Goblins',
  subtitle: 'Trapaça · Agilidade · Oportunismo',
  description:
    'Não têm exército: têm oficina. Tudo que explode, rola ou dispara foi ' +
    'montado com sucata de outra guerra.',
  lore: [
    'Ninguém sabe de onde saíram em tal quantidade. A teoria mais aceita é ' +
      'que sempre estiveram lá, esperando o mundo ficar bagunçado o bastante.',
    'Constroem catapultas com peças de avião e bombas com tanque de gás. ' +
      'Metade explode na hora errada. A outra metade ganha a batalha.',
    'Roubam antes de lutar. Muitas vezes, roubam em vez de lutar.',
  ],
  // COR DA EQUIPE ≠ COR DA CRIATURA: a identificação Goblin é AMARELA.
  color: '#F7D02E',
  secondaryColor: '#FFF0A0',
  contrastColor: '#1f1a02',
  symbol: '👺',
  emblem: { key: 'goblins.emblem', placeholder: '👺' },
  strategy: {
    pillars: ['Trapaça', 'Agilidade', 'Oportunismo'],
    strengths: [
      'Saque Rápido: cada conquista rende uma carta',
      'Emboscada posiciona goblins ocultos antes do combate',
      'Armadilha Explosiva pune quem entrar no território',
    ],
    weaknesses: [
      'Nunca recebem o bônus total de região completa (metade)',
      'Defesa frágil: quantidade não substitui posição',
    ],
    difficulty: 3,
  },
  startingSoldiersPerTerritory: 3,
  units: [
    { id: 'goblins.batedor', name: 'Goblin Batedor', description: 'Unidade de reconhecimento.' },
    { id: 'goblins.arqueiro', name: 'Goblin Arqueiro', description: 'Unidade de alcance.' },
    { id: 'goblins.sabotador', name: 'Goblin Sabotador', description: 'Unidade de sabotagem.' },
    { id: 'goblins.trapaceiro', name: 'Goblin Trapaceiro', description: 'Unidade de emboscada.' },
    { id: 'goblins.catapulta', name: 'Goblin Catapulta', description: 'Unidade de cerco.' },
    { id: 'goblins.balonista', name: 'Goblin Balonista', description: 'Unidade aérea.' },
  ],
  passiveAbilityIds: ['ability.goblins.saque-rapido'],
  activeAbilityIds: ['ability.goblins.emboscada'],
  signatureCardIds: ['card.armadilha-explosiva'],
  commanders: [],
  visualEffects: ['scrap-sparks', 'explosive-trap'],
  animationIds: ['anim.armadilha-explosiva'],
  modifiers: {},
  rules: {
    drawOnConquest: 1,
    regionBonusMultiplier: 0.5,
    freeSpecialAttack: true,
    balance: { ataque: 4, defesa: 2, mobilidade: 5, cartas: 4, recuperacao: 3 },
  },
  status: 'ACTIVE',
  provisional: true,
};

/**
 * REMANESCENTES — não é uma facção jogável.
 *
 * Ocupa os territórios que sobram quando 30 não divide pela quantidade de
 * jogadores. Defende com as regras normais, nunca ataca, nunca recebe
 * reforço e nunca aparece na seleção de facção.
 */
export const REMANESCENTES_ID = factionId('remanescentes');

export const REMANESCENTES: FactionDefinition = {
  id: REMANESCENTES_ID,
  name: 'Remanescentes',
  subtitle: 'Quem ficou quando todo mundo escolheu um lado',
  description: 'Territórios neutros. Defendem-se e nada mais.',
  lore: [],
  color: '#6b7280',
  secondaryColor: '#9ca3af',
  contrastColor: '#0f1115',
  symbol: '◇',
  strategy: { pillars: ['Neutro'], strengths: [], weaknesses: [], difficulty: 1 },
  startingSoldiersPerTerritory: 2,
  units: [],
  passiveAbilityIds: [],
  activeAbilityIds: [],
  signatureCardIds: [],
  commanders: [],
  visualEffects: [],
  animationIds: [],
  modifiers: {},
  rules: {},
  status: 'LOCKED',
};

/** Roster oficial, na ordem definida pelo criador (Humanos é o assento 1). */
export const ROSTER: FactionDefinition[] = [ALIENIGENAS, ZUMBIS, VAMPIROS, MAGOS, GOBLINS];
