import type { PlayerId, SoldierId, TerritoryId } from './ids';

export type TerritoryStatus = 'STABLE' | 'CONTESTED' | 'DEVASTATED';

export interface Territory {
  id: TerritoryId;
  name: string;
  /** Jogador que controla o território; null = território neutro. */
  controllerId: PlayerId | null;
  /** Ids das tropas presentes. A contagem é derivada, nunca duplicada. */
  garrison: SoldierId[];
  neighbors: TerritoryId[];
  status: TerritoryStatus;
  /** Região/continente para bônus futuros. */
  region?: string;
  /** Posição no mapa (Etapa 2). */
  position?: { x: number; y: number };
  meta?: Record<string, unknown>;
}
