import { playerId } from '../game/types/ids';
import type { PlayerId, FactionId, TerritoryId } from '../game/types/ids';
import type { PlayerKind } from '../game/types/player.types';
import { HUMANOS_ID } from '../game/factions/humanos';
import { INSURGENTES_ID } from '../game/factions/insurgentes';
import { TERRITORY_IDS } from './territories.seed';

export interface PlayerSeed {
  id: PlayerId;
  name: string;
  factionId: FactionId;
  kind: PlayerKind;
  startingTerritoryIds: TerritoryId[];
}

export const PLAYER_IDS = {
  p1: playerId('p1'),
  p2: playerId('p2'),
};

/** Dois jogadores de teste. A estrutura já suporta N jogadores. */
export const PLAYER_SEEDS: PlayerSeed[] = [
  {
    id: PLAYER_IDS.p1,
    name: 'Comando Humano',
    factionId: HUMANOS_ID,
    kind: 'HUMAN',
    startingTerritoryIds: [
      TERRITORY_IDS.setorMilitar,
      TERRITORY_IDS.baseOcidental,
      TERRITORY_IDS.zonaNorte,
      TERRITORY_IDS.distritoCentral,
      TERRITORY_IDS.portoAbandonado,
      TERRITORY_IDS.zonaSul,
    ],
  },
  {
    id: PLAYER_IDS.p2,
    name: 'Célula Insurgente',
    factionId: INSURGENTES_ID,
    kind: 'HUMAN',
    startingTerritoryIds: [
      TERRITORY_IDS.valeCinzento,
      TERRITORY_IDS.ruinasLeste,
      TERRITORY_IDS.regiaoIndustrial,
      TERRITORY_IDS.complexoCientifico,
      TERRITORY_IDS.zonaContaminada,
      TERRITORY_IDS.fronteiraVermelha,
    ],
  },
];
