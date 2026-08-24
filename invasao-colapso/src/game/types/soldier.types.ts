import type { FactionId, PlayerId, SoldierId, TerritoryId } from './ids';

/** Tipos de unidade. Etapa 1 usa só INFANTRY; o campo já existe para expandir. */
export type SoldierType = 'INFANTRY';

export type SoldierStatus = 'READY' | 'MOVED' | 'ATTACKING' | 'DEFENDING' | 'CAPTURED' | 'ELIMINATED';

/**
 * Onde o soldado está. Fonte única de verdade da posição:
 * o território guarda apenas ids, nunca cópias do soldado.
 */
export type SoldierLocation =
  | { kind: 'TERRITORY'; territoryId: TerritoryId }
  /** Reserva do jogador: tropas conquistadas aguardando redistribuição. */
  | { kind: 'RESERVE'; playerId: PlayerId }
  | { kind: 'ELIMINATED' };

export interface Soldier {
  id: SoldierId;
  type: SoldierType;
  factionId: FactionId;
  ownerId: PlayerId;
  location: SoldierLocation;
  status: SoldierStatus;
  alive: boolean;
  /** Facção/dono original — permite lore e efeitos de "libertar prisioneiros". */
  origin: { factionId: FactionId; ownerId: PlayerId };
}
