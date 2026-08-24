import { territoryId } from '../game/types/ids';
import type { TerritoryId } from '../game/types/ids';

/**
 * Mapa de teste da Etapa 2: 12 territórios fictícios.
 * Continuam sendo placeholders — o mapa oficial substitui este arquivo
 * sem que nenhuma regra do jogo precise mudar.
 */
export interface TerritorySeed {
  id: TerritoryId;
  name: string;
  region: string;
  neighbors: TerritoryId[];
  /** Coordenadas no espaço lógico do mapa (MAP_WIDTH x MAP_HEIGHT). */
  position: { x: number; y: number };
}

/** Espaço lógico do mapa; a UI escala isso para caber na tela. */
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 700;

const id = {
  setorMilitar: territoryId('setor-militar'),
  zonaNorte: territoryId('zona-norte'),
  valeCinzento: territoryId('vale-cinzento'),
  complexoCientifico: territoryId('complexo-cientifico'),
  baseOcidental: territoryId('base-ocidental'),
  distritoCentral: territoryId('distrito-central'),
  ruinasLeste: territoryId('ruinas-do-leste'),
  zonaContaminada: territoryId('zona-contaminada'),
  portoAbandonado: territoryId('porto-abandonado'),
  zonaSul: territoryId('zona-sul'),
  regiaoIndustrial: territoryId('regiao-industrial'),
  fronteiraVermelha: territoryId('fronteira-vermelha'),
};

export const TERRITORY_IDS = id;

export const TERRITORY_SEEDS: TerritorySeed[] = [
  {
    id: id.setorMilitar,
    name: 'Setor Militar',
    region: 'Zona Militar',
    neighbors: [id.zonaNorte, id.baseOcidental],
    position: { x: 150, y: 120 },
  },
  {
    id: id.zonaNorte,
    name: 'Zona Norte',
    region: 'Perímetro Urbano',
    neighbors: [id.setorMilitar, id.distritoCentral, id.valeCinzento],
    position: { x: 340, y: 130 },
  },
  {
    id: id.valeCinzento,
    name: 'Vale Cinzento',
    region: 'Terras Altas',
    neighbors: [id.zonaNorte, id.ruinasLeste, id.complexoCientifico],
    position: { x: 570, y: 95 },
  },
  {
    id: id.complexoCientifico,
    name: 'Complexo Científico',
    region: 'Terras Altas',
    neighbors: [id.valeCinzento, id.zonaContaminada],
    position: { x: 840, y: 140 },
  },
  {
    id: id.baseOcidental,
    name: 'Base Ocidental',
    region: 'Zona Militar',
    neighbors: [id.setorMilitar, id.distritoCentral, id.portoAbandonado],
    position: { x: 130, y: 320 },
  },
  {
    id: id.distritoCentral,
    name: 'Distrito Central',
    region: 'Perímetro Urbano',
    neighbors: [
      id.baseOcidental,
      id.zonaNorte,
      id.zonaSul,
      id.regiaoIndustrial,
      id.ruinasLeste,
    ],
    position: { x: 410, y: 330 },
  },
  {
    id: id.ruinasLeste,
    name: 'Ruínas do Leste',
    region: 'Zona Morta',
    neighbors: [id.distritoCentral, id.valeCinzento, id.regiaoIndustrial, id.zonaContaminada],
    position: { x: 660, y: 265 },
  },
  {
    id: id.zonaContaminada,
    name: 'Zona Contaminada',
    region: 'Zona Morta',
    neighbors: [id.ruinasLeste, id.complexoCientifico, id.fronteiraVermelha],
    position: { x: 860, y: 390 },
  },
  {
    id: id.portoAbandonado,
    name: 'Porto Abandonado',
    region: 'Cinturão Produtivo',
    neighbors: [id.baseOcidental, id.zonaSul],
    position: { x: 175, y: 565 },
  },
  {
    id: id.zonaSul,
    name: 'Zona Sul',
    region: 'Perímetro Urbano',
    neighbors: [id.distritoCentral, id.portoAbandonado, id.regiaoIndustrial],
    position: { x: 390, y: 550 },
  },
  {
    id: id.regiaoIndustrial,
    name: 'Região Industrial',
    region: 'Cinturão Produtivo',
    neighbors: [id.distritoCentral, id.zonaSul, id.ruinasLeste, id.fronteiraVermelha],
    position: { x: 625, y: 510 },
  },
  {
    id: id.fronteiraVermelha,
    name: 'Fronteira Vermelha',
    region: 'Zona Morta',
    neighbors: [id.regiaoIndustrial, id.zonaContaminada],
    position: { x: 880, y: 605 },
  },
];
