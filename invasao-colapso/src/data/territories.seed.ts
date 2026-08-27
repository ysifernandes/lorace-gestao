import { territoryId } from '../game/types/ids';
import type { TerritoryId } from '../game/types/ids';

/**
 * MAPA OFICIAL — 30 TERRITÓRIOS EM 6 REGIÕES.
 *
 * Gerado a partir da malha verificada em docs/game-design/verificacao/mapa.py:
 * 56 fronteiras únicas, simetria total, grau mínimo 3, grafo conexo.
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

export type SpecialLinkKind = 'POCO' | 'PONTE' | 'ROTA';

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
export const MAP_WIDTH = 1280;
export const MAP_HEIGHT = 980;

const id = {
  distritoCentral: territoryId('distrito-central'),
  zonaNorte: territoryId('zona-norte'),
  zonaSul: territoryId('zona-sul'),
  ruinasLeste: territoryId('ruinas-do-leste'),
  baseOcidental: territoryId('base-ocidental'),
  postoAvancadoNorte: territoryId('posto-avancado-norte'),
  setorMilitar: territoryId('setor-militar'),
  minaProfunda: territoryId('mina-profunda'),
  cristaQuebrada: territoryId('crista-quebrada'),
  represaSeca: territoryId('represa-seca'),
  rodoviaMorta: territoryId('rodovia-morta'),
  campoAntenas: territoryId('campo-de-antenas'),
  valeCinzento: territoryId('vale-cinzento'),
  salinas: territoryId('salinas'),
  cemiterioComboios: territoryId('cemiterio-de-comboios'),
  regiaoIndustrial: territoryId('regiao-industrial'),
  altoForno: territoryId('alto-forno'),
  portoAbandonado: territoryId('porto-abandonado'),
  patioCargas: territoryId('patio-de-cargas'),
  fronteiraVermelha: territoryId('fronteira-vermelha'),
  zonaContaminada: territoryId('zona-contaminada'),
  complexoCientifico: territoryId('complexo-cientifico'),
  crateraVidro: territoryId('cratera-de-vidro'),
  bosqueFossil: territoryId('bosque-fossil'),
  estacaoEscuta: territoryId('estacao-de-escuta'),
  abrigoZero: territoryId('abrigo-zero'),
  galeriaNorte: territoryId('galeria-norte'),
  galeriaOeste: territoryId('galeria-oeste'),
  galeriaSul: territoryId('galeria-sul'),
  camaraMaquinas: territoryId('camara-de-maquinas'),
} as const;

export const TERRITORY_IDS = id;

export const TERRITORY_SEEDS: TerritorySeed[] = [
  {
    id: id.distritoCentral,
    name: 'Distrito Central',
    region: 'metropole',
    neighbors: [id.zonaNorte, id.zonaSul, id.ruinasLeste, id.baseOcidental, id.abrigoZero],
    position: { x: 690, y: 395 },
    characteristic: 'Antiga sala de controle da Malha.',
    poi: { kind: 'REINFORCEMENT', description: '+1 reforço por turno' },
  },
  {
    id: id.zonaNorte,
    name: 'Zona Norte',
    region: 'metropole',
    neighbors: [id.distritoCentral, id.baseOcidental, id.ruinasLeste, id.postoAvancadoNorte],
    position: { x: 690, y: 285 },
    characteristic: 'Conjuntos habitacionais verticais.',
  },
  {
    id: id.zonaSul,
    name: 'Zona Sul',
    region: 'metropole',
    neighbors: [id.distritoCentral, id.baseOcidental, id.ruinasLeste, id.regiaoIndustrial],
    position: { x: 690, y: 505 },
    characteristic: 'Viadutos empilhados e canais secos.',
  },
  {
    id: id.ruinasLeste,
    name: 'Ruínas do Leste',
    region: 'metropole',
    neighbors: [id.distritoCentral, id.zonaNorte, id.zonaSul, id.zonaContaminada],
    position: { x: 805, y: 395 },
    characteristic: 'Quarteirões que queimaram durante os onze dias.',
  },
  {
    id: id.baseOcidental,
    name: 'Base Ocidental',
    region: 'metropole',
    neighbors: [id.distritoCentral, id.zonaNorte, id.zonaSul, id.rodoviaMorta],
    position: { x: 575, y: 395 },
    characteristic: 'Base logística militar saqueada.',
  },
  {
    id: id.postoAvancadoNorte,
    name: 'Posto Avançado Norte',
    region: 'montes-de-ferro',
    neighbors: [id.setorMilitar, id.cristaQuebrada, id.zonaNorte],
    position: { x: 610, y: 160 },
    characteristic: 'Torre de vigia sobre a cidade.',
  },
  {
    id: id.setorMilitar,
    name: 'Setor Militar',
    region: 'montes-de-ferro',
    neighbors: [id.postoAvancadoNorte, id.minaProfunda, id.represaSeca],
    position: { x: 470, y: 95 },
    characteristic: 'Depósito de armamento ainda lacrado.',
    poi: { kind: 'GARRISON', description: '+1 soldado aqui no fim do seu turno' },
  },
  {
    id: id.minaProfunda,
    name: 'Mina Profunda',
    region: 'montes-de-ferro',
    neighbors: [id.setorMilitar, id.cristaQuebrada, id.represaSeca, id.galeriaNorte],
    position: { x: 415, y: 225 },
    characteristic: 'Poço de extração que desce até as galerias.',
  },
  {
    id: id.cristaQuebrada,
    name: 'Crista Quebrada',
    region: 'montes-de-ferro',
    neighbors: [id.postoAvancadoNorte, id.minaProfunda, id.represaSeca, id.estacaoEscuta],
    position: { x: 745, y: 140 },
    characteristic: 'Cume partido por deslizamento.',
  },
  {
    id: id.represaSeca,
    name: 'Represa Seca',
    region: 'montes-de-ferro',
    neighbors: [id.setorMilitar, id.minaProfunda, id.cristaQuebrada, id.campoAntenas],
    position: { x: 335, y: 145 },
    characteristic: 'Comporta travada aberta há doze anos.',
  },
  {
    id: id.rodoviaMorta,
    name: 'Rodovia Morta',
    region: 'planicie-errante',
    neighbors: [id.campoAntenas, id.cemiterioComboios, id.valeCinzento, id.baseOcidental],
    position: { x: 330, y: 405 },
    characteristic: 'Autoestrada de doze pistas parada num congestionamento.',
  },
  {
    id: id.campoAntenas,
    name: 'Campo de Antenas',
    region: 'planicie-errante',
    neighbors: [id.rodoviaMorta, id.valeCinzento, id.represaSeca],
    position: { x: 270, y: 275 },
    characteristic: 'Antenas ainda escutando a Malha.',
    poi: { kind: 'FORESIGHT', description: 'Pré-alerta de Evento do Colapso' },
  },
  {
    id: id.valeCinzento,
    name: 'Vale Cinzento',
    region: 'planicie-errante',
    neighbors: [id.rodoviaMorta, id.campoAntenas, id.salinas],
    position: { x: 175, y: 395 },
    characteristic: 'Planície coberta de cinza fina.',
  },
  {
    id: id.salinas,
    name: 'Salinas',
    region: 'planicie-errante',
    neighbors: [id.valeCinzento, id.cemiterioComboios, id.galeriaOeste],
    position: { x: 150, y: 530 },
    characteristic: 'Crosta salgada sobre um mar interior evaporado.',
  },
  {
    id: id.cemiterioComboios,
    name: 'Cemitério de Comboios',
    region: 'planicie-errante',
    neighbors: [id.rodoviaMorta, id.salinas, id.portoAbandonado],
    position: { x: 300, y: 545 },
    characteristic: 'Centenas de comboios enfileirados e abandonados.',
  },
  {
    id: id.regiaoIndustrial,
    name: 'Região Industrial',
    region: 'cinturao-siderurgico',
    neighbors: [id.altoForno, id.patioCargas, id.fronteiraVermelha, id.zonaSul],
    position: { x: 760, y: 620 },
    characteristic: 'Galpões de montagem automática com a esteira ligada.',
  },
  {
    id: id.altoForno,
    name: 'Alto-Forno',
    region: 'cinturao-siderurgico',
    neighbors: [id.regiaoIndustrial, id.patioCargas, id.portoAbandonado, id.galeriaSul],
    position: { x: 700, y: 720 },
    characteristic: 'Forno aceso há doze anos sem comando de desligamento.',
  },
  {
    id: id.portoAbandonado,
    name: 'Porto Abandonado',
    region: 'cinturao-siderurgico',
    neighbors: [id.altoForno, id.patioCargas, id.cemiterioComboios],
    position: { x: 560, y: 690 },
    characteristic: 'Guindastes travados sobre navios afundados.',
  },
  {
    id: id.patioCargas,
    name: 'Pátio de Cargas',
    region: 'cinturao-siderurgico',
    neighbors: [id.regiaoIndustrial, id.altoForno, id.portoAbandonado, id.fronteiraVermelha],
    position: { x: 855, y: 700 },
    characteristic: 'Pátio de contêineres e guindastes funcionais.',
    poi: { kind: 'TRANSPORT', description: 'Transporte Especial recarrega mais rápido' },
  },
  {
    id: id.fronteiraVermelha,
    name: 'Fronteira Vermelha',
    region: 'cinturao-siderurgico',
    neighbors: [id.regiaoIndustrial, id.patioCargas, id.crateraVidro],
    position: { x: 900, y: 590 },
    characteristic: 'Linha de contenção pintada no asfalto.',
  },
  {
    id: id.zonaContaminada,
    name: 'Zona Contaminada',
    region: 'zona-vitrea',
    neighbors: [id.complexoCientifico, id.crateraVidro, id.estacaoEscuta, id.ruinasLeste],
    position: { x: 930, y: 340 },
    characteristic: 'Vazamento químico permanente.',
  },
  {
    id: id.complexoCientifico,
    name: 'Complexo Científico',
    region: 'zona-vitrea',
    neighbors: [id.zonaContaminada, id.bosqueFossil, id.estacaoEscuta, id.camaraMaquinas],
    position: { x: 1090, y: 270 },
    characteristic: 'Laboratórios com energia própria.',
    poi: { kind: 'CARD_SWAP', description: 'Troca 1 carta por turno na fase CARTAS' },
  },
  {
    id: id.crateraVidro,
    name: 'Cratera de Vidro',
    region: 'zona-vitrea',
    neighbors: [id.zonaContaminada, id.bosqueFossil, id.fronteiraVermelha],
    position: { x: 990, y: 470 },
    characteristic: 'Areia fundida em placa contínua.',
  },
  {
    id: id.bosqueFossil,
    name: 'Bosque Fóssil',
    region: 'zona-vitrea',
    neighbors: [id.complexoCientifico, id.crateraVidro, id.estacaoEscuta],
    position: { x: 1120, y: 400 },
    characteristic: 'Floresta mineralizada de pé.',
  },
  {
    id: id.estacaoEscuta,
    name: 'Estação de Escuta',
    region: 'zona-vitrea',
    neighbors: [id.zonaContaminada, id.complexoCientifico, id.bosqueFossil, id.cristaQuebrada],
    position: { x: 960, y: 205 },
    characteristic: 'Parabólica transmitindo relatórios para ninguém.',
  },
  {
    id: id.abrigoZero,
    name: 'Abrigo Zero',
    region: 'os-abrigos',
    neighbors: [id.galeriaNorte, id.galeriaOeste, id.galeriaSul, id.camaraMaquinas, id.distritoCentral],
    position: { x: 620, y: 830 },
    characteristic: 'Núcleo dos Abrigos. Porta do Poço Central.',
    poi: { kind: 'REINFORCEMENT', description: '+1 reforço por turno' },
  },
  {
    id: id.galeriaNorte,
    name: 'Galeria Norte',
    region: 'os-abrigos',
    neighbors: [id.abrigoZero, id.galeriaOeste, id.camaraMaquinas, id.minaProfunda],
    position: { x: 500, y: 795 },
    characteristic: 'Túnel de serviço sob os Montes de Ferro.',
  },
  {
    id: id.galeriaOeste,
    name: 'Galeria Oeste',
    region: 'os-abrigos',
    neighbors: [id.abrigoZero, id.galeriaNorte, id.galeriaSul, id.salinas],
    position: { x: 505, y: 890 },
    characteristic: 'Galeria de drenagem sob as Salinas.',
  },
  {
    id: id.galeriaSul,
    name: 'Galeria Sul',
    region: 'os-abrigos',
    neighbors: [id.abrigoZero, id.galeriaOeste, id.camaraMaquinas, id.altoForno],
    position: { x: 740, y: 880 },
    characteristic: 'Duto de refrigeração do Cinturão.',
  },
  {
    id: id.camaraMaquinas,
    name: 'Câmara de Máquinas',
    region: 'os-abrigos',
    neighbors: [id.abrigoZero, id.galeriaNorte, id.galeriaSul, id.complexoCientifico],
    position: { x: 760, y: 790 },
    characteristic: 'Sala de bombas e geradores ainda girando.',
  },
];

export const REGION_SEEDS: RegionSeed[] = [
  {
    id: 'metropole',
    name: 'A Metrópole',
    bonus: 4,
    color: '#7aa7d8',
    description: 'Centro da bacia. Cinco frentes abertas.',
    territoryIds: [id.distritoCentral, id.zonaNorte, id.zonaSul, id.ruinasLeste, id.baseOcidental],
  },
  {
    id: 'montes-de-ferro',
    name: 'Montes de Ferro',
    bonus: 3,
    color: '#b4a07a',
    description: 'Zona militar e de extração, ao norte.',
    territoryIds: [id.postoAvancadoNorte, id.setorMilitar, id.minaProfunda, id.cristaQuebrada, id.represaSeca],
  },
  {
    id: 'planicie-errante',
    name: 'Planície Errante',
    bonus: 3,
    color: '#c9b06a',
    description: 'Terra de passagem, a oeste.',
    territoryIds: [id.rodoviaMorta, id.campoAntenas, id.valeCinzento, id.salinas, id.cemiterioComboios],
  },
  {
    id: 'cinturao-siderurgico',
    name: 'Cinturão Siderúrgico',
    bonus: 3,
    color: '#d08a5a',
    description: 'Fábricas que nunca pararam, ao sul.',
    territoryIds: [id.regiaoIndustrial, id.altoForno, id.portoAbandonado, id.patioCargas, id.fronteiraVermelha],
  },
  {
    id: 'zona-vitrea',
    name: 'Zona Vítrea',
    bonus: 3,
    color: '#9d8ec9',
    description: 'Onde o chão virou vidro, a leste.',
    territoryIds: [id.zonaContaminada, id.complexoCientifico, id.crateraVidro, id.bosqueFossil, id.estacaoEscuta],
  },
  {
    id: 'os-abrigos',
    name: 'Os Abrigos',
    bonus: 4,
    color: '#7fb8ae',
    description: 'Subsolo. Alcançado apenas pelos cinco Poços.',
    territoryIds: [id.abrigoZero, id.galeriaNorte, id.galeriaOeste, id.galeriaSul, id.camaraMaquinas],
  },
];

/** Conexões especiais: Poços, Ponte e Rota Costeira (cap. 05 do livro de regras). */
export const SPECIAL_LINKS: SpecialLink[] = [
  { kind: 'POCO', name: 'Poço Central', a: id.distritoCentral, b: id.abrigoZero },
  { kind: 'POCO', name: 'Poço da Mina', a: id.minaProfunda, b: id.galeriaNorte },
  { kind: 'POCO', name: 'Poço das Salinas', a: id.salinas, b: id.galeriaOeste },
  { kind: 'POCO', name: 'Poço do Alto-Forno', a: id.altoForno, b: id.galeriaSul },
  { kind: 'POCO', name: 'Poço Científico', a: id.complexoCientifico, b: id.camaraMaquinas },
  { kind: 'PONTE', name: 'Ponte da Represa', a: id.represaSeca, b: id.campoAntenas },
  { kind: 'ROTA', name: 'Rota Costeira', a: id.cemiterioComboios, b: id.portoAbandonado },
];
