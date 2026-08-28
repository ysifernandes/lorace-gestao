/**
 * 30 EVENTOS DO COLAPSO — dados estruturados, não código.
 *
 * O motor (`src/game/collapse/collapseEngine.ts`) decide secretamente quando
 * um evento acontece, filtra os inválidos, sorteia o alvo e aplica o efeito.
 * Nenhum componente de interface conhece um evento pelo nome.
 */

export type CollapseCategory =
  | 'AMEACA'
  | 'OPORTUNIDADE'
  | 'GLOBAL'
  | 'REGIONAL'
  | 'TERRITORIAL'
  | 'ANOMALIA';

/** Que tipo de alvo o evento precisa sortear antes de ser aplicado. */
export type CollapseTargetKind = 'NONE' | 'REGION' | 'TERRITORY' | 'PLAYER' | 'MARITIMA';

/** Efeito declarativo. Cada `type` tem um resolvedor único no motor. */
export type CollapseEffectSpec =
  | { type: 'ATTACK_DICE_DELTA'; delta: number }
  | { type: 'DEFENSE_DICE_CAP'; value: number }
  | { type: 'BLOCK_SPECIAL_ATTACK' }
  | { type: 'EXTRA_MOVE'; amount: number }
  | { type: 'REINFORCE_ALL'; amount: number }
  | { type: 'REINFORCE_WEAKEST'; amount: number }
  | { type: 'DRAW_ALL'; amount: number }
  | { type: 'DISCARD_LEADER' }
  | { type: 'HAND_ROTATE' }
  | { type: 'FOG_OF_WAR' }
  | { type: 'TRANSPORT_RECHARGE'; amount: number }
  | { type: 'TRANSPORT_DRAIN' }
  | { type: 'REGION_LOSE_TROOPS'; amount: number }
  | { type: 'REGION_QUARANTINE' }
  | { type: 'REGION_REWARD'; amount: number }
  | { type: 'REGION_BONUS_BLACKOUT' }
  | { type: 'REGION_MIGRATION' }
  | { type: 'REGION_REINFORCE_BLOCK' }
  | { type: 'TERRITORY_REWARD'; troops: number; cards: number }
  | { type: 'TERRITORY_MUTINY'; troops: number }
  | { type: 'TERRITORY_SHIELD'; attackerDiceReduction: number }
  | { type: 'LARGEST_TERRITORY_HALVED' }
  | { type: 'BORDER_ATTRITION'; amount: number }
  | { type: 'DISABLE_MARITIME' }
  | { type: 'DISABLE_LAND_BORDER' }
  | { type: 'DISABLE_ALL_MARITIME' }
  | { type: 'FORCE_NEXT_EVENT' }
  | { type: 'SILENCE'; rounds: number }
  | { type: 'PLAYER_LOSE_TROOPS'; amount: number }
  | { type: 'PLAYER_GAIN_TROOPS'; amount: number };

export interface CollapseEventDefinition {
  id: string;
  name: string;
  /** Categoria principal + secundária (ameaça/oportunidade/misto). */
  categories: CollapseCategory[];
  description: string;
  /** Frase curta mostrada no alerta, antes do efeito. */
  flavor: string;
  target: CollapseTargetKind;
  effect: CollapseEffectSpec;
  /** Rodadas que o efeito permanece ativo. 0 = instantâneo. */
  duration: number;
  /** Menor resolve primeiro quando dois efeitos coexistem. */
  priority: number;
  /** 1 = leve, 5 = pesado. Usado no relatório de balanceamento. */
  intensity: 1 | 2 | 3 | 4 | 5;
  /** Rodada mínima da partida para o evento ser elegível. */
  minRound?: number;
  /** Exige que exista pelo menos um território com N ou mais soldados. */
  requiresTerritoryWithTroops?: number;
  /** Exige que haja pelo menos N jogadores ativos. */
  requiresPlayers?: number;
}

export const COLLAPSE_EVENT_SEEDS: CollapseEventDefinition[] = [
  // ---------- GLOBAIS ----------
  {
    id: 'collapse.queda-de-tensao',
    name: 'Queda de Tensão',
    categories: ['GLOBAL', 'AMEACA'],
    description: 'Nesta rodada ninguém pode usar Ataque Especial. Cargas não são perdidas.',
    flavor: 'A rede cai por inteiro. Nada decola, nada parte.',
    target: 'NONE',
    effect: { type: 'BLOCK_SPECIAL_ATTACK' },
    duration: 1,
    priority: 10,
    intensity: 3,
  },
  {
    id: 'collapse.tempestade-de-po',
    name: 'Tempestade de Pó',
    categories: ['GLOBAL', 'AMEACA'],
    description: 'Nesta rodada todo atacante rola 1 dado a menos (mínimo 1).',
    flavor: 'A visibilidade cai a três metros em toda a bacia.',
    target: 'NONE',
    effect: { type: 'ATTACK_DICE_DELTA', delta: -1 },
    duration: 1,
    priority: 20,
    intensity: 4,
  },
  {
    id: 'collapse.janela-limpa',
    name: 'Janela Limpa',
    categories: ['GLOBAL', 'OPORTUNIDADE'],
    description: 'Nesta rodada cada jogador realiza 1 movimentação adicional.',
    flavor: 'O céu abre. As rotas voltam a existir por algumas horas.',
    target: 'NONE',
    effect: { type: 'EXTRA_MOVE', amount: 1 },
    duration: 1,
    priority: 30,
    intensity: 2,
  },
  {
    id: 'collapse.ressuprimento',
    name: 'Ressuprimento Automático',
    categories: ['GLOBAL', 'OPORTUNIDADE'],
    description: 'Cada jogador recebe +2 soldados no próximo reforço.',
    flavor: 'Um depósito automático acorda e começa a distribuir.',
    target: 'NONE',
    effect: { type: 'REINFORCE_ALL', amount: 2 },
    duration: 1,
    priority: 30,
    intensity: 2,
  },
  {
    id: 'collapse.censo-da-malha',
    name: 'Censo da Malha',
    categories: ['GLOBAL'],
    description: 'Quem tiver mais cartas na mão descarta 1.',
    flavor: 'Um inventário antigo roda sozinho e confisca o excedente.',
    target: 'NONE',
    effect: { type: 'DISCARD_LEADER' },
    duration: 0,
    priority: 40,
    intensity: 2,
  },
  {
    id: 'collapse.arquivo-aberto',
    name: 'Arquivo Aberto',
    categories: ['GLOBAL', 'OPORTUNIDADE'],
    description: 'Cada jogador compra 1 carta do Baralho do Colapso.',
    flavor: 'Um servidor esquecido despeja doze anos de registros.',
    target: 'NONE',
    effect: { type: 'DRAW_ALL', amount: 1 },
    duration: 0,
    priority: 40,
    intensity: 2,
  },
  {
    id: 'collapse.sobrecarga-defensiva',
    name: 'Sobrecarga Defensiva',
    categories: ['GLOBAL', 'AMEACA'],
    description: 'Nesta rodada todo defensor rola no máximo 2 dados.',
    flavor: 'Os sistemas de alerta ficam surdos ao mesmo tempo.',
    target: 'NONE',
    effect: { type: 'DEFENSE_DICE_CAP', value: 2 },
    duration: 1,
    priority: 20,
    intensity: 4,
  },
  {
    id: 'collapse.corrida-logistica',
    name: 'Corrida Logística',
    categories: ['GLOBAL', 'OPORTUNIDADE'],
    description: 'Todos recuperam 1 carga de Transporte Especial.',
    flavor: 'Combustível de reserva aparece em todos os pátios ao mesmo tempo.',
    target: 'NONE',
    effect: { type: 'TRANSPORT_RECHARGE', amount: 1 },
    duration: 0,
    priority: 40,
    intensity: 2,
  },
  {
    id: 'collapse.greve-de-motores',
    name: 'Greve de Motores',
    categories: ['GLOBAL', 'AMEACA'],
    description: 'Todos perdem as cargas de Transporte Especial acumuladas.',
    flavor: 'Nenhum motor pega. Ninguém sabe explicar.',
    target: 'NONE',
    effect: { type: 'TRANSPORT_DRAIN' },
    duration: 0,
    priority: 40,
    intensity: 3,
    minRound: 5,
  },
  {
    id: 'collapse.atrito-de-fronteira',
    name: 'Atrito de Fronteira',
    categories: ['GLOBAL', 'AMEACA'],
    description: 'Todo território que faz fronteira com um inimigo perde 1 soldado (nunca abaixo de 1).',
    flavor: 'A linha de contato inteira sangra ao mesmo tempo.',
    target: 'NONE',
    effect: { type: 'BORDER_ATTRITION', amount: 1 },
    duration: 0,
    priority: 20,
    intensity: 4,
    minRound: 4,
  },

  // ---------- REGIONAIS ----------
  {
    id: 'collapse.colapso-estrutural',
    name: 'Colapso Estrutural',
    categories: ['REGIONAL', 'AMEACA'],
    description: 'Cada território da região sorteada perde 1 soldado (nunca abaixo de 1).',
    flavor: 'O chão cede em vários pontos ao mesmo tempo.',
    target: 'REGION',
    effect: { type: 'REGION_LOSE_TROOPS', amount: 1 },
    duration: 0,
    priority: 20,
    intensity: 3,
  },
  {
    id: 'collapse.quarentena',
    name: 'Quarentena',
    categories: ['REGIONAL', 'AMEACA'],
    description:
      'Nesta rodada nenhum território da região sorteada pode atacar para fora nem ser atacado de fora.',
    flavor: 'Barreiras automáticas descem em todos os acessos da região.',
    target: 'REGION',
    effect: { type: 'REGION_QUARANTINE' },
    duration: 1,
    priority: 10,
    intensity: 3,
  },
  {
    id: 'collapse.reativacao-industrial',
    name: 'Reativação Industrial',
    categories: ['REGIONAL', 'OPORTUNIDADE'],
    description:
      'Quem controlar mais territórios na região sorteada recebe +3 soldados distribuídos nela.',
    flavor: 'As esteiras voltam a girar e alguém está lá para recolher.',
    target: 'REGION',
    effect: { type: 'REGION_REWARD', amount: 3 },
    duration: 0,
    priority: 30,
    intensity: 3,
  },
  {
    id: 'collapse.blecaute-regional',
    name: 'Blecaute Regional',
    categories: ['REGIONAL', 'AMEACA'],
    description: 'O bônus de região completa da região sorteada não é pago no próximo reforço.',
    flavor: 'A região inteira sai do mapa energético.',
    target: 'REGION',
    effect: { type: 'REGION_BONUS_BLACKOUT' },
    duration: 1,
    priority: 30,
    intensity: 2,
  },
  {
    id: 'collapse.migracao',
    name: 'Migração',
    categories: ['REGIONAL'],
    description:
      'Cada jogador com território na região sorteada move 1 soldado de cada um deles para um vizinho seu.',
    flavor: 'Colunas inteiras se levantam e caminham sem ordem.',
    target: 'REGION',
    effect: { type: 'REGION_MIGRATION' },
    duration: 0,
    priority: 30,
    intensity: 2,
  },
  {
    id: 'collapse.lockdown',
    name: 'Interdição',
    categories: ['REGIONAL', 'AMEACA'],
    description: 'Territórios da região sorteada não recebem reforço nem movimentação nesta rodada.',
    flavor: 'Um protocolo de contenção antigo tranca a região.',
    target: 'REGION',
    effect: { type: 'REGION_REINFORCE_BLOCK' },
    duration: 1,
    priority: 20,
    intensity: 3,
  },
  {
    id: 'collapse.chuva-acida',
    name: 'Chuva Ácida',
    categories: ['REGIONAL', 'AMEACA'],
    description: 'Cada território da região sorteada perde 2 soldados (nunca abaixo de 1).',
    flavor: 'A precipitação corrói tudo que está exposto.',
    target: 'REGION',
    effect: { type: 'REGION_LOSE_TROOPS', amount: 2 },
    duration: 0,
    priority: 20,
    intensity: 5,
    minRound: 6,
  },

  // ---------- TERRITORIAIS ----------
  {
    id: 'collapse.incendio',
    name: 'Incêndio',
    categories: ['TERRITORIAL', 'AMEACA'],
    description: 'O território com mais soldados do mapa perde metade deles, arredondando para baixo.',
    flavor: 'Onde há mais gente, há mais o que queimar.',
    target: 'NONE',
    effect: { type: 'LARGEST_TERRITORY_HALVED' },
    duration: 0,
    priority: 20,
    intensity: 5,
    requiresTerritoryWithTroops: 4,
  },
  {
    id: 'collapse.deposito-esquecido',
    name: 'Depósito Esquecido',
    categories: ['TERRITORIAL', 'OPORTUNIDADE'],
    description: 'O controlador do território sorteado recebe +3 soldados nele e compra 1 carta.',
    flavor: 'Uma porta blindada cede e revela doze anos de suprimento.',
    target: 'TERRITORY',
    effect: { type: 'TERRITORY_REWARD', troops: 3, cards: 1 },
    duration: 0,
    priority: 30,
    intensity: 3,
  },
  {
    // Reancorado ao mapa de referência: não existem Poços, existem rotas marítimas.
    id: 'collapse.desabamento-de-poco',
    name: 'Fenda Submersa',
    categories: ['TERRITORIAL', 'AMEACA'],
    description: 'Uma das cinco rotas marítimas deixa de existir por 2 rodadas.',
    flavor: 'O leito cede e a passagem se fecha sobre si mesma.',
    target: 'MARITIMA',
    effect: { type: 'DISABLE_MARITIME' },
    duration: 2,
    priority: 10,
    intensity: 3,
  },
  {
    id: 'collapse.ponte-rompida',
    name: 'Ponte Rompida',
    categories: ['TERRITORIAL', 'AMEACA'],
    description: 'Uma fronteira terrestre entre dois territórios ocupados é cortada por 3 rodadas.',
    flavor: 'A estrutura que ligava os dois lados finalmente desiste.',
    target: 'NONE',
    effect: { type: 'DISABLE_LAND_BORDER' },
    duration: 3,
    priority: 10,
    intensity: 3,
  },
  {
    id: 'collapse.mar-agitado',
    name: 'Mar Agitado',
    categories: ['TERRITORIAL', 'AMEACA'],
    description: 'Todas as rotas marítimas ficam intransitáveis por 2 rodadas.',
    flavor: 'O que sobrou do mar decide se mexer, e ninguém atravessa.',
    target: 'NONE',
    effect: { type: 'DISABLE_ALL_MARITIME' },
    duration: 2,
    priority: 10,
    intensity: 2,
  },
  {
    id: 'collapse.motim',
    name: 'Motim',
    categories: ['TERRITORIAL', 'AMEACA'],
    description: 'Um território com 6 ou mais soldados perde 2 e seu controlador descarta 1 carta.',
    flavor: 'A guarnição inteira decide que já bastou.',
    target: 'TERRITORY',
    effect: { type: 'TERRITORY_MUTINY', troops: 2 },
    duration: 0,
    priority: 20,
    intensity: 3,
    requiresTerritoryWithTroops: 6,
  },
  {
    id: 'collapse.blindagem-improvisada',
    name: 'Blindagem Improvisada',
    categories: ['TERRITORIAL', 'OPORTUNIDADE'],
    description:
      'O território sorteado ganha uma blindagem: quem o atacar rola 1 dado a menos por 2 rodadas.',
    flavor: 'Chapas soltas viram muro em uma noite.',
    target: 'TERRITORY',
    effect: { type: 'TERRITORY_SHIELD', attackerDiceReduction: 1 },
    duration: 2,
    priority: 30,
    intensity: 3,
  },

  // ---------- ANOMALIAS ----------
  {
    id: 'collapse.eco-da-malha',
    name: 'Eco da Malha',
    categories: ['ANOMALIA'],
    description: 'Todos passam a mão de cartas neutras para o jogador à esquerda.',
    flavor: 'A rede repete uma transação de doze anos atrás.',
    target: 'NONE',
    effect: { type: 'HAND_ROTATE' },
    duration: 0,
    priority: 40,
    intensity: 3,
    requiresPlayers: 3,
  },
  {
    id: 'collapse.nevoeiro-de-vidro',
    name: 'Nevoeiro de Vidro',
    categories: ['ANOMALIA', 'AMEACA'],
    description:
      'Nesta rodada ninguém vê a contagem exata das tropas inimigas — apenas faixas.',
    flavor: 'Partículas de vidro suspenso engolem a telemetria.',
    target: 'NONE',
    effect: { type: 'FOG_OF_WAR' },
    duration: 1,
    priority: 40,
    intensity: 3,
  },
  {
    id: 'collapse.recursao',
    name: 'Recursão',
    categories: ['ANOMALIA'],
    description: 'O próximo Evento do Colapso ocorrerá na rodada seguinte, ignorando o cooldown.',
    flavor: 'O sistema tenta se corrigir e chama a si mesmo.',
    target: 'NONE',
    effect: { type: 'FORCE_NEXT_EVENT' },
    duration: 0,
    priority: 50,
    intensity: 4,
  },
  {
    id: 'collapse.silencio',
    name: 'Silêncio',
    categories: ['ANOMALIA', 'OPORTUNIDADE'],
    description:
      'Nenhum evento ocorrerá pelas próximas 3 rodadas. Todos recuperam 1 carga de Transporte.',
    flavor: 'Pela primeira vez em doze anos, a bacia inteira fica quieta.',
    target: 'NONE',
    effect: { type: 'SILENCE', rounds: 3 },
    duration: 0,
    priority: 50,
    intensity: 2,
  },
  {
    id: 'collapse.dreno',
    name: 'Dreno',
    categories: ['ANOMALIA', 'AMEACA'],
    description: 'O jogador com mais territórios perde 2 soldados.',
    flavor: 'A anomalia procura sempre a maior concentração.',
    target: 'NONE',
    effect: { type: 'PLAYER_LOSE_TROOPS', amount: 2 },
    duration: 0,
    priority: 30,
    intensity: 3,
    minRound: 5,
  },
  {
    id: 'collapse.sobra-de-energia',
    name: 'Sobra de Energia',
    categories: ['ANOMALIA', 'OPORTUNIDADE'],
    description: 'O jogador com menos territórios recebe +3 soldados no próximo reforço.',
    flavor: 'A rede desvia potência para o ponto mais fraco do circuito.',
    target: 'NONE',
    effect: { type: 'REINFORCE_WEAKEST', amount: 3 },
    duration: 1,
    priority: 30,
    intensity: 2,
  },
];

export const COLLAPSE_EVENT_COUNT = COLLAPSE_EVENT_SEEDS.length;
