import { factionId } from '../types/ids';
import type { FactionDefinition } from '../types/faction.types';

/**
 * ROSTER DAS FACÇÕES — além dos HUMANOS.
 *
 * Confirmadas pelo criador: ALIENÍGENAS, ZUMBIS, MAGOS.
 * Não confirmadas: os dois últimos assentos usam os identificadores
 * temporários FACTION_05 e FACTION_06 — nomes definitivos não foram
 * inventados. As regras deles existem para o jogo ficar jogável com 6
 * participantes e estão marcadas como provisórias.
 *
 * A matriz de balanceamento soma exatamente 18 pontos de poder em todas as
 * seis facções (ataque + defesa + mobilidade + cartas + recuperação).
 * Nenhuma facção domina todas as categorias.
 */

export const ALIENIGENAS_ID = factionId('alienigenas');
export const ZUMBIS_ID = factionId('zumbis');
export const MAGOS_ID = factionId('magos');
export const FACTION_05_ID = factionId('faction_05');
export const FACTION_06_ID = factionId('faction_06');

export const ALIENIGENAS: FactionDefinition = {
  id: ALIENIGENAS_ID,
  name: 'Alienígenas',
  subtitle: 'O que já estava aqui antes da Malha cair',
  description:
    'Não invadiram: foram descobertos. O Colapso derrubou a camada que os ' +
    'mantinha fora de sincronia com o resto do continente.',
  lore: [
    'A Malha nunca administrou só infraestrutura. Uma parte dela existia para ' +
      'manter uma fronteira que ninguém sabia que existia — e quando caiu, essa ' +
      'fronteira caiu junto.',
    'Eles não falam da própria origem. Trabalham em silêncio, ancorando ' +
      'estruturas no terreno e recolhendo o que consideram excedente.',
    'Chegam onde não há estrada porque não usam estrada. A ancoragem os move ' +
      'por qualquer trecho que já lhes pertença.',
  ],
  color: '#25b39a',
  secondaryColor: '#7ff0da',
  contrastColor: '#04211d',
  symbol: '👁️',
  emblem: { key: 'alienigenas.emblem', placeholder: '👁️' },
  strategy: {
    pillars: ['Precisão', 'Alcance', 'Colheita'],
    strengths: [
      'Reposicionam por cadeia contínua: nenhum território seu fica longe',
      'Retiram tropas inimigas sem entrar em batalha',
    ],
    weaknesses: [
      'Frágeis fora da própria rede: perder território custa também uma carta',
      'Defesa apenas mediana',
    ],
    difficulty: 4,
  },
  startingSoldiersPerTerritory: 3,
  units: [{ id: 'alienigenas.infantry', name: 'Ancorados', description: 'Unidade padrão.' }],
  passiveAbilityIds: ['ability.alienigenas.ancoragem'],
  activeAbilityIds: ['ability.alienigenas.colheita'],
  signatureCardIds: ['card.feixe-de-corte'],
  commanders: [],
  visualEffects: ['anchor-pulse', 'harvest-beam'],
  animationIds: ['anim.colheita'],
  modifiers: {},
  rules: {
    chainMovement: true,
    discardOnTerritoryLost: true,
    balance: { ataque: 4, defesa: 3, mobilidade: 5, cartas: 3, recuperacao: 3 },
  },
  status: 'ACTIVE',
  provisional: true,
};

export const ZUMBIS: FactionDefinition = {
  id: ZUMBIS_ID,
  name: 'Zumbis',
  subtitle: 'A massa que não recebeu ordem de parar',
  description:
    'Contaminação que se espalha pelo contato. Cada território tomado ' +
    'aumenta a força do próximo avanço — até o peso da própria massa cobrar.',
  lore: [
    'Os primeiros surgiram nos setores onde os sistemas de contenção sanitária ' +
      'continuaram operando sem supervisão médica. O protocolo mandava manter ' +
      'os corpos funcionando. Ele continua sendo executado.',
    'Não há comando, não há estratégia declarada, não há recuo. Há pressão.',
    'A fraqueza é a própria natureza: massa demais num lugar só apodrece.',
  ],
  color: '#7fae2e',
  secondaryColor: '#c6e86a',
  contrastColor: '#11190a',
  symbol: '☣️',
  emblem: { key: 'zumbis.emblem', placeholder: '☣️' },
  strategy: {
    pillars: ['Infestação', 'Quantidade', 'Contaminação'],
    strengths: [
      'Converte defensores eliminados em tropa própria ao conquistar',
      'Pressiona várias fronteiras ao mesmo tempo com o Surto',
    ],
    weaknesses: [
      'Massa instável: pilhas grandes apodrecem sozinhas',
      'Mobilidade baixa — não reposiciona a tempo',
    ],
    difficulty: 3,
  },
  startingSoldiersPerTerritory: 3,
  units: [{ id: 'zumbis.infantry', name: 'Infestados', description: 'Unidade padrão.' }],
  passiveAbilityIds: ['ability.zumbis.contagio'],
  activeAbilityIds: ['ability.zumbis.surto'],
  signatureCardIds: ['card.cepa-resistente'],
  commanders: [],
  visualEffects: ['spore-cloud', 'infection-spread'],
  animationIds: ['anim.surto'],
  modifiers: {},
  rules: {
    conquestConversion: 1,
    overcrowdThreshold: 8,
    balance: { ataque: 5, defesa: 4, mobilidade: 2, cartas: 3, recuperacao: 4 },
  },
  status: 'ACTIVE',
  provisional: true,
};

export const MAGOS: FactionDefinition = {
  id: MAGOS_ID,
  name: 'Magos',
  subtitle: 'Quem aprendeu a ler os espasmos da Malha',
  description:
    'Não é feitiçaria: é sintonia. Estavam perto demais das anomalias quando ' +
    'tudo caiu, e desde então sentem o Colapso antes de ele acontecer.',
  lore: [
    'Chamaram de magia porque não havia outra palavra. A Malha, ao ruir, deixou ' +
      'campos residuais que reorganizam matéria — e algumas pessoas passaram a ' +
      'ressoar com eles.',
    'Não conjuram nada que o Colapso já não esteja fazendo. Apenas escolhem ' +
      'onde a próxima convulsão vai cair.',
    'O preço é o corpo. Cada ameaça que atravessa o continente atravessa eles ' +
      'primeiro.',
  ],
  color: '#8b62d9',
  secondaryColor: '#c6a8ff',
  contrastColor: '#150a26',
  symbol: '🜁',
  emblem: { key: 'magos.emblem', placeholder: '🜁' },
  strategy: {
    pillars: ['Anomalia', 'Presságio', 'Risco'],
    strengths: [
      'Sabem se haverá Evento do Colapso na rodada',
      'Redirecionam eventos regionais e territoriais',
    ],
    weaknesses: [
      'Instáveis: cada evento de AMEAÇA custa um soldado a mais',
      'Nenhuma vantagem direta de combate',
    ],
    difficulty: 5,
  },
  startingSoldiersPerTerritory: 3,
  units: [{ id: 'magos.infantry', name: 'Sintonizados', description: 'Unidade padrão.' }],
  passiveAbilityIds: ['ability.magos.pressagio'],
  activeAbilityIds: ['ability.magos.distorcao'],
  signatureCardIds: ['card.eco'],
  commanders: [],
  visualEffects: ['resonance-ring', 'glass-fracture'],
  animationIds: ['anim.distorcao'],
  modifiers: {},
  rules: {
    collapseForesight: true,
    collapseFragility: true,
    balance: { ataque: 3, defesa: 3, mobilidade: 3, cartas: 5, recuperacao: 4 },
  },
  status: 'ACTIVE',
  provisional: true,
};

/**
 * ⚠️ FACTION_05 — NOME NÃO CONFIRMADO PELO CRIADOR.
 * Identificador temporário. As regras abaixo existem apenas para permitir
 * partidas de 5 e 6 jogadores e serão renomeadas/ajustadas quando o nome
 * oficial for definido.
 */
export const FACTION_05: FactionDefinition = {
  id: FACTION_05_ID,
  name: 'FACTION_05',
  subtitle: 'Nome oficial ainda não definido pelo criador',
  description:
    'Perfil provisório de atrito: segura terreno, repõe perdas e avança devagar. ' +
    'Identidade narrativa aguardando definição.',
  lore: ['Aguardando definição do criador.'],
  color: '#d0703a',
  secondaryColor: '#ffb182',
  contrastColor: '#221006',
  symbol: '⚙️',
  strategy: {
    pillars: ['Atrito', 'Produção', 'Posição'],
    strengths: ['Melhor defesa do jogo', 'Repõe tropas em turnos sem conquista'],
    weaknesses: ['Mobilidade péssima: nunca move mais de 3 soldados'],
    difficulty: 2,
  },
  startingSoldiersPerTerritory: 3,
  units: [{ id: 'faction05.infantry', name: 'Unidade padrão', description: 'Provisória.' }],
  passiveAbilityIds: ['ability.faction05.reposicao'],
  activeAbilityIds: ['ability.faction05.barreira'],
  signatureCardIds: ['card.reconstituicao'],
  commanders: [],
  visualEffects: [],
  animationIds: [],
  modifiers: {},
  rules: {
    maxSoldiersPerMove: 3,
    borderReinforceOnQuietTurn: 1,
    balance: { ataque: 3, defesa: 5, mobilidade: 1, cartas: 4, recuperacao: 5 },
  },
  status: 'ACTIVE',
  provisional: true,
};

/**
 * ⚠️ FACTION_06 — NOME NÃO CONFIRMADO PELO CRIADOR.
 * Identificador temporário, mesma observação da FACTION_05.
 */
export const FACTION_06: FactionDefinition = {
  id: FACTION_06_ID,
  name: 'FACTION_06',
  subtitle: 'Nome oficial ainda não definido pelo criador',
  description:
    'Perfil provisório de mobilidade: chega longe, bate e sai. Não consolida ' +
    'território. Identidade narrativa aguardando definição.',
  lore: ['Aguardando definição do criador.'],
  color: '#d8b23c',
  secondaryColor: '#ffe08a',
  contrastColor: '#1f1802',
  symbol: '🜂',
  strategy: {
    pillars: ['Mobilidade', 'Alcance', 'Nenhuma raiz'],
    strengths: ['Duas movimentações por turno', 'Ataque Especial sem gastar carga'],
    weaknesses: ['Recebe apenas metade do bônus de região completa', 'Defesa fraca'],
    difficulty: 3,
  },
  startingSoldiersPerTerritory: 3,
  units: [{ id: 'faction06.infantry', name: 'Unidade padrão', description: 'Provisória.' }],
  passiveAbilityIds: ['ability.faction06.marcha'],
  activeAbilityIds: [],
  signatureCardIds: ['card.desmanche'],
  commanders: [],
  visualEffects: [],
  animationIds: [],
  modifiers: {},
  rules: {
    movesPerTurn: 2,
    regionBonusMultiplier: 0.5,
    freeSpecialAttack: true,
    balance: { ataque: 4, defesa: 2, mobilidade: 5, cartas: 4, recuperacao: 3 },
  },
  status: 'ACTIVE',
  provisional: true,
};

export const ROSTER: FactionDefinition[] = [
  ALIENIGENAS,
  ZUMBIS,
  MAGOS,
  FACTION_05,
  FACTION_06,
];

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
