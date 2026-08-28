import { territoryId } from '../game/types/ids';
import type { TerritoryId } from '../game/types/ids';

/**
 * MAPA OFICIAL — 30 TERRITÓRIOS EM 6 REGIÕES.
 *
 * Nomes, regiões e disposição vêm da REFERÊNCIA VISUAL OFICIAL do criador
 * ("MAPA - 30 TERRITÓRIOS"). As fronteiras foram derivadas da geometria da
 * referência e verificadas em docs/game-design/verificacao/mapa_v2.py:
 * 61 fronteiras únicas, simetria total, grau mínimo 3, grafo conexo.
 *
 * A adjacência mora AQUI e no motor — a interface nunca decide vizinhança.
 */
export interface TerritorySeed {
  id: TerritoryId;
  name: string;
  region: string;
  neighbors: TerritoryId[];
  position: { x: number; y: number };
  characteristic: string;
  /** Ponto de Interesse: efeito mecânico próprio. */
  poi?: { kind: PoiKind; description: string };
}

export type PoiKind = 'REINFORCEMENT' | 'GARRISON' | 'FORESIGHT' | 'TRANSPORT' | 'CARD_SWAP';

/** Conexões marítimas: desembarque limita o atacante a 2 dados. */
export type SpecialLinkKind = 'MARITIMA';

export interface SpecialLink {
  kind: SpecialLinkKind;
  name: string;
  a: TerritoryId;
  b: TerritoryId;
}

export interface RegionSeed {
  id: string;
  name: string;
  /** Bônus de reforço por controlar a região completa. */
  bonus: number;
  color: string;
  description: string;
  territoryIds: TerritoryId[];
}

/** Espaço lógico do mapa; a interface escala isto para caber na tela. */
export const MAP_WIDTH = 1400;
export const MAP_HEIGHT = 920;

const id = {
  fortalezaBoreal: territoryId('fortaleza-boreal'),
  planiciesGelidas: territoryId('planicies-gelidas'),
  complexoArtico: territoryId('complexo-artico'),
  portoFerro: territoryId('porto-de-ferro'),
  cidadeFantasma: territoryId('cidade-fantasma'),
  colinasTitanio: territoryId('colinas-de-titanio'),
  valeIndustrial: territoryId('vale-industrial'),
  capitalContinental: territoryId('capital-continental'),
  represaEstilhacada: territoryId('represa-estilhacada'),
  redutoComando: territoryId('reduto-do-comando'),
  desertoCinzas: territoryId('deserto-de-cinzas'),
  canionEcos: territoryId('canion-dos-ecos'),
  minaAbandonada: territoryId('mina-abandonada'),
  cidadeSubmersa: territoryId('cidade-submersa'),
  usinaNuclear: territoryId('usina-nuclear'),
  portoMercenario: territoryId('porto-mercenario'),
  arquipelagoNegro: territoryId('arquipelago-negro'),
  docaEnferrujada: territoryId('doca-enferrujada'),
  laboratorioMarinho: territoryId('laboratorio-marinho'),
  farolAbismo: territoryId('farol-do-abismo'),
  selvaDensa: territoryId('selva-densa'),
  temploAntigo: territoryId('templo-antigo'),
  pantanoToxico: territoryId('pantano-toxico'),
  vilaDesolada: territoryId('vila-desolada'),
  troncoGigante: territoryId('tronco-gigante'),
  crateraCentral: territoryId('cratera-central'),
  torreAnomalia: territoryId('torre-da-anomalia'),
  campoRuinas: territoryId('campo-de-ruinas'),
  santuarioProibido: territoryId('santuario-proibido'),
  nucleoColapso: territoryId('nucleo-do-colapso'),
} as const;

export const TERRITORY_IDS = id;

export const TERRITORY_SEEDS: TerritorySeed[] = [
  {
    // 1
    id: id.fortalezaBoreal,
    name: 'Fortaleza Boreal',
    region: 'fronteira-norte',
    neighbors: [id.planiciesGelidas, id.cidadeFantasma, id.colinasTitanio],
    position: { x: 470, y: 115 },
    characteristic: 'Muralha de gelo e concreto que nunca foi tomada.',
  },
  {
    // 2
    id: id.planiciesGelidas,
    name: 'Planícies Gélidas',
    region: 'fronteira-norte',
    neighbors: [id.fortalezaBoreal, id.complexoArtico, id.cidadeFantasma, id.capitalContinental],
    position: { x: 665, y: 100 },
    characteristic: 'Campo aberto sob nevasca permanente.',
  },
  {
    // 3
    id: id.complexoArtico,
    name: 'Complexo Ártico',
    region: 'fronteira-norte',
    neighbors: [id.planiciesGelidas, id.portoFerro, id.cidadeFantasma, id.represaEstilhacada],
    position: { x: 845, y: 110 },
    characteristic: 'Estação de pesquisa polar ainda alimentada por reatores.',
  },
  {
    // 4
    id: id.portoFerro,
    name: 'Porto de Ferro',
    region: 'fronteira-norte',
    neighbors: [id.complexoArtico, id.redutoComando, id.desertoCinzas],
    position: { x: 1000, y: 135 },
    characteristic: 'Cais congelado com cargueiros presos no gelo.',
  },
  {
    // 5
    id: id.cidadeFantasma,
    name: 'Cidade Fantasma',
    region: 'fronteira-norte',
    neighbors: [id.fortalezaBoreal, id.planiciesGelidas, id.complexoArtico, id.valeIndustrial],
    position: { x: 760, y: 195 },
    characteristic: 'Metrópole evacuada em uma noite. Luzes ainda acesas.',
  },
  {
    // 6
    id: id.colinasTitanio,
    name: 'Colinas de Titânio',
    region: 'terras-centrais',
    neighbors: [id.fortalezaBoreal, id.valeIndustrial, id.capitalContinental, id.docaEnferrujada],
    position: { x: 470, y: 265 },
    characteristic: 'Encostas de minério exposto e guindastes parados.',
  },
  {
    // 7
    id: id.valeIndustrial,
    name: 'Vale Industrial',
    region: 'terras-centrais',
    neighbors: [id.cidadeFantasma, id.colinasTitanio, id.capitalContinental, id.portoMercenario, id.selvaDensa],
    position: { x: 585, y: 305 },
    characteristic: 'Chaminés que não param de fumegar desde o Colapso.',
  },
  {
    // 8
    id: id.capitalContinental,
    name: 'Capital Continental',
    region: 'terras-centrais',
    neighbors: [id.planiciesGelidas, id.valeIndustrial, id.represaEstilhacada, id.redutoComando, id.colinasTitanio, id.selvaDensa],
    position: { x: 725, y: 285 },
    characteristic: 'O centro administrativo do velho mundo.',
    poi: { kind: 'REINFORCEMENT', description: '+1 reforço por turno enquanto controlada' },
  },
  {
    // 9
    id: id.represaEstilhacada,
    name: 'Represa Estilhaçada',
    region: 'terras-centrais',
    neighbors: [id.complexoArtico, id.capitalContinental, id.redutoComando, id.desertoCinzas],
    position: { x: 830, y: 250 },
    characteristic: 'A barragem cedeu e o vale nunca mais secou.',
  },
  {
    // 10
    id: id.redutoComando,
    name: 'Reduto do Comando',
    region: 'terras-centrais',
    neighbors: [id.portoFerro, id.capitalContinental, id.represaEstilhacada, id.desertoCinzas, id.crateraCentral],
    position: { x: 910, y: 315 },
    characteristic: 'Bunker de comando com o mapa antigo ainda na mesa.',
    poi: { kind: 'GARRISON', description: '+1 soldado aqui ao final do seu turno' },
  },
  {
    // 11
    id: id.desertoCinzas,
    name: 'Deserto de Cinzas',
    region: 'zona-devastada',
    neighbors: [id.portoFerro, id.redutoComando, id.represaEstilhacada, id.canionEcos, id.minaAbandonada],
    position: { x: 1065, y: 275 },
    characteristic: 'Cinza fina até o horizonte. Nada cresce, nada esconde.',
  },
  {
    // 12
    id: id.canionEcos,
    name: 'Cânion dos Ecos',
    region: 'zona-devastada',
    neighbors: [id.desertoCinzas, id.cidadeSubmersa, id.usinaNuclear],
    position: { x: 1230, y: 245 },
    characteristic: 'Fenda profunda onde qualquer som volta três vezes.',
  },
  {
    // 13
    id: id.minaAbandonada,
    name: 'Mina Abandonada',
    region: 'zona-devastada',
    neighbors: [id.desertoCinzas, id.cidadeSubmersa, id.usinaNuclear, id.crateraCentral],
    position: { x: 1085, y: 415 },
    characteristic: 'Galerias que descem mais fundo do que os registros admitem.',
  },
  {
    // 14
    id: id.cidadeSubmersa,
    name: 'Cidade Submersa',
    region: 'zona-devastada',
    neighbors: [id.canionEcos, id.minaAbandonada, id.usinaNuclear],
    position: { x: 1245, y: 370 },
    characteristic: 'Torres saindo da água. As luzes do subsolo ainda funcionam.',
  },
  {
    // 15
    id: id.usinaNuclear,
    name: 'Usina Nuclear',
    region: 'zona-devastada',
    neighbors: [id.minaAbandonada, id.cidadeSubmersa, id.canionEcos, id.torreAnomalia, id.santuarioProibido],
    position: { x: 1195, y: 485 },
    characteristic: 'Reator em operação sem operadores há doze anos.',
    poi: { kind: 'TRANSPORT', description: 'Transporte Especial recarrega mais rápido' },
  },
  {
    // 16
    id: id.portoMercenario,
    name: 'Porto Mercenário',
    region: 'costa-sombria',
    neighbors: [id.valeIndustrial, id.arquipelagoNegro, id.docaEnferrujada, id.laboratorioMarinho],
    position: { x: 310, y: 440 },
    characteristic: 'Ancoradouro sem bandeira. Tudo se compra.',
  },
  {
    // 17
    id: id.arquipelagoNegro,
    name: 'Arquipélago Negro',
    region: 'costa-sombria',
    neighbors: [id.portoMercenario, id.laboratorioMarinho, id.farolAbismo],
    position: { x: 205, y: 545 },
    characteristic: 'Ilhas de rocha vulcânica ligadas por passagens submersas.',
  },
  {
    // 18
    id: id.docaEnferrujada,
    name: 'Doca Enferrujada',
    region: 'costa-sombria',
    neighbors: [id.colinasTitanio, id.portoMercenario, id.laboratorioMarinho],
    position: { x: 400, y: 430 },
    characteristic: 'Estaleiro de navios de guerra desmontados.',
  },
  {
    // 19
    id: id.laboratorioMarinho,
    name: 'Laboratório Marinho',
    region: 'costa-sombria',
    neighbors: [id.portoMercenario, id.arquipelagoNegro, id.docaEnferrujada, id.farolAbismo],
    position: { x: 330, y: 560 },
    characteristic: 'Complexo submerso com energia própria.',
    poi: { kind: 'CARD_SWAP', description: 'Troca 1 carta por turno na fase CARTAS' },
  },
  {
    // 20
    id: id.farolAbismo,
    name: 'Farol do Abismo',
    region: 'costa-sombria',
    neighbors: [id.laboratorioMarinho, id.arquipelagoNegro, id.vilaDesolada, id.pantanoToxico],
    position: { x: 385, y: 710 },
    characteristic: 'O feixe ainda gira. Ninguém sabe quem o mantém.',
  },
  {
    // 21
    id: id.selvaDensa,
    name: 'Selva Densa',
    region: 'floresta-corrompida',
    neighbors: [id.valeIndustrial, id.capitalContinental, id.temploAntigo, id.vilaDesolada, id.crateraCentral],
    position: { x: 665, y: 500 },
    characteristic: 'Vegetação que engoliu uma província inteira.',
  },
  {
    // 22
    id: id.temploAntigo,
    name: 'Templo Antigo',
    region: 'floresta-corrompida',
    neighbors: [id.selvaDensa, id.pantanoToxico, id.vilaDesolada, id.crateraCentral],
    position: { x: 695, y: 650 },
    characteristic: 'Estrutura anterior ao Colapso, e talvez à humanidade.',
  },
  {
    // 23
    id: id.pantanoToxico,
    name: 'Pântano Tóxico',
    region: 'floresta-corrompida',
    neighbors: [id.farolAbismo, id.temploAntigo, id.vilaDesolada, id.troncoGigante],
    position: { x: 545, y: 720 },
    characteristic: 'Água parada que dissolve metal.',
  },
  {
    // 24
    id: id.vilaDesolada,
    name: 'Vila Desolada',
    region: 'floresta-corrompida',
    neighbors: [id.farolAbismo, id.temploAntigo, id.pantanoToxico, id.troncoGigante, id.selvaDensa],
    position: { x: 600, y: 790 },
    characteristic: 'Casas intactas, mesas postas, ninguém.',
  },
  {
    // 25
    id: id.troncoGigante,
    name: 'Tronco Gigante',
    region: 'floresta-corrompida',
    neighbors: [id.pantanoToxico, id.vilaDesolada, id.nucleoColapso, id.campoRuinas],
    position: { x: 745, y: 830 },
    characteristic: 'Uma única árvore com altura de arranha-céu.',
  },
  {
    // 26
    id: id.crateraCentral,
    name: 'Cratera Central',
    region: 'zona-impacto',
    neighbors: [id.redutoComando, id.minaAbandonada, id.selvaDensa, id.temploAntigo, id.torreAnomalia, id.campoRuinas],
    position: { x: 930, y: 580 },
    characteristic: 'O ponto exato onde o continente rachou.',
  },
  {
    // 27
    id: id.torreAnomalia,
    name: 'Torre da Anomalia',
    region: 'zona-impacto',
    neighbors: [id.usinaNuclear, id.crateraCentral, id.santuarioProibido, id.nucleoColapso],
    position: { x: 1120, y: 620 },
    characteristic: 'Estrutura que não estava lá antes do Colapso.',
    poi: { kind: 'FORESIGHT', description: 'Pré-alerta de Evento do Colapso' },
  },
  {
    // 28
    id: id.campoRuinas,
    name: 'Campo de Ruínas',
    region: 'zona-impacto',
    neighbors: [id.troncoGigante, id.crateraCentral, id.nucleoColapso],
    position: { x: 920, y: 725 },
    characteristic: 'Escombros de uma cidade que ninguém consegue nomear.',
  },
  {
    // 29
    id: id.santuarioProibido,
    name: 'Santuário Proibido',
    region: 'zona-impacto',
    neighbors: [id.usinaNuclear, id.torreAnomalia, id.nucleoColapso],
    position: { x: 1210, y: 720 },
    characteristic: 'Área interditada por um protocolo que ninguém pode cancelar.',
  },
  {
    // 30
    id: id.nucleoColapso,
    name: 'Núcleo do Colapso',
    region: 'zona-impacto',
    neighbors: [id.troncoGigante, id.campoRuinas, id.santuarioProibido, id.torreAnomalia],
    position: { x: 1055, y: 805 },
    characteristic: 'A fonte. Ainda pulsa.',
    poi: { kind: 'REINFORCEMENT', description: '+1 reforço por turno enquanto controlado' },
  },
];

export const REGION_SEEDS: RegionSeed[] = [
  {
    id: 'fronteira-norte',
    name: 'Fronteira Norte',
    bonus: 4,
    color: '#6fb2e8',
    description: 'Gelo, aço e as últimas fortalezas que resistiram ao inverno.',
    territoryIds: [id.fortalezaBoreal, id.planiciesGelidas, id.complexoArtico, id.portoFerro, id.cidadeFantasma],
  },
  {
    id: 'terras-centrais',
    name: 'Terras Centrais',
    bonus: 4,
    color: '#5ec27a',
    description: 'O coração do continente. Tudo passa por aqui — e por isso tudo ataca aqui.',
    territoryIds: [id.colinasTitanio, id.valeIndustrial, id.capitalContinental, id.represaEstilhacada, id.redutoComando],
  },
  {
    id: 'zona-devastada',
    name: 'Zona Devastada',
    bonus: 2,
    color: '#e0913c',
    description: 'Deserto de cinzas e instalações que nunca deveriam ter sido religadas.',
    territoryIds: [id.desertoCinzas, id.canionEcos, id.minaAbandonada, id.cidadeSubmersa, id.usinaNuclear],
  },
  {
    id: 'costa-sombria',
    name: 'Costa Sombria',
    bonus: 2,
    color: '#9b7de0',
    description: 'Portos, arquipélagos e o que o mar trouxe de volta.',
    territoryIds: [id.portoMercenario, id.arquipelagoNegro, id.docaEnferrujada, id.laboratorioMarinho, id.farolAbismo],
  },
  {
    id: 'floresta-corrompida',
    name: 'Floresta Corrompida',
    bonus: 4,
    color: '#3fc9b0',
    description: 'Selva que cresceu sobre o Colapso e absorveu o que encontrou.',
    territoryIds: [id.selvaDensa, id.temploAntigo, id.pantanoToxico, id.vilaDesolada, id.troncoGigante],
  },
  {
    id: 'zona-impacto',
    name: 'Zona de Impacto',
    bonus: 4,
    color: '#e05252',
    description: 'O epicentro. A anomalia continua aberta e continua chamando.',
    territoryIds: [id.crateraCentral, id.torreAnomalia, id.campoRuinas, id.santuarioProibido, id.nucleoColapso],
  },
];

/** Conexões marítimas da referência: o desembarque limita o atacante a 2 dados. */
export const SPECIAL_LINKS: SpecialLink[] = [
  { kind: 'MARITIMA', name: 'Canal Mercenário', a: id.portoMercenario, b: id.arquipelagoNegro },
  { kind: 'MARITIMA', name: 'Passagem Submersa', a: id.arquipelagoNegro, b: id.laboratorioMarinho },
  { kind: 'MARITIMA', name: 'Rota do Abismo', a: id.arquipelagoNegro, b: id.farolAbismo },
  { kind: 'MARITIMA', name: 'Fenda Inundada', a: id.canionEcos, b: id.cidadeSubmersa },
  { kind: 'MARITIMA', name: 'Enseada Tóxica', a: id.farolAbismo, b: id.pantanoToxico },
];
