import type { CardInstanceId, FactionId, PlayerId, TerritoryId } from './ids';

/** NEUTRAL = os Remanescentes: defendem, mas nunca jogam. */
export type PlayerStatus = 'ACTIVE' | 'ELIMINATED' | 'SURRENDERED' | 'NEUTRAL';
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
  /** Assento na ordem de jogo (1 = joga primeiro). */
  seat: number;
  /** Cargas de Transporte Especial disponíveis. */
  transportCharges: number;
  /** Turnos seguidos sem comprar carta — alimenta a compra de compensação. */
  turnsWithoutCard: number;
  /** Rodada em que o jogador foi eliminado, se foi. */
  eliminatedAtRound?: number;
  /** Cor de identificação, derivada da facção na preparação. */
  color: string;
}
