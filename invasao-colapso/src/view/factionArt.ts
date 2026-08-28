import { HUMANOS_ID } from '../game/factions/humanos';
import {
  ALIENIGENAS_ID,
  GOBLINS_ID,
  MAGOS_ID,
  REMANESCENTES_ID,
  VAMPIROS_ID,
  ZUMBIS_ID,
} from '../game/factions/roster';
import { TECNOLOGOS_ID } from '../game/factions/tecnologos';
import type { FactionId } from '../game/types/ids';

/**
 * SILHUETAS DE UNIDADE — PLACEHOLDER DECLARADO.
 *
 * A referência oficial pede miniaturas 3D por facção. Enquanto os assets
 * não existem (ver `ASSETS_NEEDED`), cada facção recebe uma silhueta
 * vetorial própria: corpo comum + traço característico da facção, pintados
 * com a COR DE EQUIPE (nunca a cor da criatura).
 *
 * Isto NÃO é arte final e está registrado como tal.
 */

/** Corpo comum: pés em y = 0, cabeça por volta de y = −20. */
export const UNIT_BODY =
  'M -4.6 0 L -4.6 -8.5 L -6.6 -10.5 L -6.6 -13.5 L -3 -15.5 L 3 -15.5 ' +
  'L 6.6 -13.5 L 6.6 -10.5 L 4.6 -8.5 L 4.6 0 Z';

export interface UnitSilhouette {
  /** Caminho do corpo. */
  body: string;
  /** Traço característico da facção, desenhado na cor secundária. */
  crest: string;
  /** Raio da cabeça (0 quando o traço já a substitui). */
  headRadius: number;
  headY: number;
  /** Sempre true enquanto não houver asset final. */
  placeholder: true;
}

const CRESTS: Record<string, { crest: string; headRadius: number; headY: number }> = {
  // Capacete tático.
  [HUMANOS_ID as string]: {
    crest: 'M -4.2 -18.6 A 4.2 4.2 0 0 1 4.2 -18.6 L 4.2 -17.4 L -4.2 -17.4 Z',
    headRadius: 3.2,
    headY: -18.6,
  },
  // Crânio alongado.
  [ALIENIGENAS_ID as string]: {
    crest: 'M 0 -25.5 C 4.2 -22.4 4.2 -17 0 -15.8 C -4.2 -17 -4.2 -22.4 0 -25.5 Z',
    headRadius: 0,
    headY: -20,
  },
  // Braços estendidos para a frente.
  [ZUMBIS_ID as string]: {
    crest: 'M -5 -12.4 L -13 -13.6 L -13 -10.6 L -5 -9.4 Z M 5 -12.4 L 13 -13.6 L 13 -10.6 L 5 -9.4 Z',
    headRadius: 3.2,
    headY: -18.6,
  },
  // Capa aberta.
  [VAMPIROS_ID as string]: {
    crest: 'M -5 -14 L -11.5 -1.5 L -5.5 -3.5 Z M 5 -14 L 11.5 -1.5 L 5.5 -3.5 Z',
    headRadius: 3.2,
    headY: -18.6,
  },
  // Chapéu pontudo.
  [MAGOS_ID as string]: {
    crest: 'M -5.4 -19.4 L 0 -30 L 5.4 -19.4 Z',
    headRadius: 3.2,
    headY: -18.2,
  },
  // Orelhas pontudas.
  [GOBLINS_ID as string]: {
    crest: 'M -3 -20 L -8.6 -24.4 L -4 -17.6 Z M 3 -20 L 8.6 -24.4 L 4 -17.6 Z',
    headRadius: 3.2,
    headY: -18.6,
  },
  // Cabeça-módulo com antena.
  [TECNOLOGOS_ID as string]: {
    crest: 'M -4.4 -22.4 L 4.4 -22.4 L 4.4 -16.4 L -4.4 -16.4 Z M 0 -22.4 L 0 -27.4',
    headRadius: 0,
    headY: -19.4,
  },
  // Sobreviventes sem facção.
  [REMANESCENTES_ID as string]: {
    crest: 'M -3.4 -21.6 L 3.4 -21.6 L 3.4 -20.2 L -3.4 -20.2 Z',
    headRadius: 3.2,
    headY: -18.6,
  },
};

const FALLBACK = CRESTS[REMANESCENTES_ID as string];

export function unitSilhouette(factionId: FactionId): UnitSilhouette {
  const crest = CRESTS[factionId as string] ?? FALLBACK;
  return { body: UNIT_BODY, ...crest, placeholder: true };
}
