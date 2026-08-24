import type { CardInstanceId, FactionId, PlayerId, TerritoryId } from './ids';

export type PlayerStatus = 'ACTIVE' | 'ELIMINATED' | 'SURRENDERED';
export type PlayerKind = 'HUMAN' | 'AI';

export interface Player {
  id: PlayerId;
  name: string;
  factionId: FactionId;
  kind: PlayerKind;
  /** Territórios controlados (derivável, mantido em sincronia pelo motor). */
  territoryIds: TerritoryId[];
  /** Mão do jogador. */
  handCardIds: CardInstanceId[];
  status: PlayerStatus;
}
