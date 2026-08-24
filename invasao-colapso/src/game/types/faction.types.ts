import type { FactionId } from './ids';

/** Habilidade passiva/ativa de uma facção. Etapa 1 guarda apenas a declaração. */
export interface FactionAbility {
  id: string;
  name: string;
  description: string;
  /** 'passive' aplica sempre; 'active' exigirá ativação em etapas futuras. */
  kind: 'passive' | 'active';
}

export type FactionStatus = 'ACTIVE' | 'DEFEATED' | 'LOCKED';

/**
 * Definição estática de uma facção (dado de conteúdo, não estado de partida).
 * Novas facções entram só adicionando um objeto ao registry.
 */
export interface FactionDefinition {
  id: FactionId;
  name: string;
  description: string;
  /** Cor de identificação usada pela UI (a UI lê daqui, nunca hardcoda). */
  color: string;
  /** Cor de contraste para texto sobre `color`. */
  contrastColor: string;
  /** Soldados iniciais por território controlado no setup padrão. */
  startingSoldiersPerTerritory: number;
  abilities: FactionAbility[];
  /** Cartas exclusivas desta facção (ids de definição). */
  signatureCardIds: string[];
  status: FactionStatus;
  /** Espaço para dados futuros (lore, unidades próprias, bônus). */
  meta?: Record<string, unknown>;
}
