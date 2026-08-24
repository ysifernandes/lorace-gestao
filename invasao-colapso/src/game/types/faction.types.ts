import type { FactionId } from './ids';

/** Referência a um recurso ainda não produzido (arte, som, música). */
export interface AssetRef {
  /** Chave lógica; a UI resolve para arquivo quando o material existir. */
  key: string;
  /** Substituto textual enquanto não há arte final. */
  placeholder?: string;
  src?: string;
}

/** Estilo estratégico: como a facção quer que você jogue. */
export interface StrategicProfile {
  /** Rótulos curtos. Ex.: ['Adaptação', 'Tecnologia', 'Controle Tático']. */
  pillars: string[];
  strengths: string[];
  weaknesses: string[];
  /** 1 = simples de jogar, 5 = exige domínio. */
  difficulty: 1 | 2 | 3 | 4 | 5;
}

/** Tipo de unidade da facção. Etapa 1 usa apenas infantaria genérica. */
export interface FactionUnit {
  id: string;
  name: string;
  description: string;
  /** Modificadores próprios — vazios enquanto não houver unidades especiais. */
  modifiers?: Record<string, number>;
}

/**
 * Comandante/personagem. ESTRUTURA APENAS —
 * nenhum comandante foi definido: aguardando definição do criador.
 */
export interface FactionCommander {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  portrait?: AssetRef;
  voice?: AssetRef;
  abilityIds: string[];
  passiveAbilityIds: string[];
}

export type FactionStatus =
  /** Jogável e definitiva. */
  | 'ACTIVE'
  /** Existe só para testar o sistema; identidade não é definitiva. */
  | 'TEST_ONLY'
  /** Slot reservado, aguardando definição do criador. */
  | 'PLACEHOLDER'
  | 'DEFEATED'
  | 'LOCKED';

/**
 * Definição estática de uma facção (conteúdo, não estado de partida).
 * Nenhum campo aqui depende da interface — a UI só lê.
 */
export interface FactionDefinition {
  id: FactionId;
  name: string;
  /** Frase curta de identidade. Ex.: "Os que se recusaram a desaparecer". */
  subtitle: string;
  description: string;
  /** Texto longo de universo; pode crescer sem afetar regra. */
  lore: string[];
  color: string;
  secondaryColor: string;
  contrastColor: string;
  /** Símbolo textual/emoji enquanto não há arte. */
  symbol: string;
  emblem?: AssetRef;
  image?: AssetRef;
  music?: AssetRef;
  sounds?: Record<string, AssetRef>;
  strategy: StrategicProfile;
  /** Soldados iniciais por território controlado no setup padrão. */
  startingSoldiersPerTerritory: number;
  units: FactionUnit[];
  /** Ids no registry de habilidades. */
  passiveAbilityIds: string[];
  activeAbilityIds: string[];
  /** Cartas exclusivas (ids de definição). */
  signatureCardIds: string[];
  commanders: FactionCommander[];
  /** Efeitos visuais/animações próprias, declarados para etapas futuras. */
  visualEffects: string[];
  animationIds: string[];
  /** Modificadores numéricos globais da facção. */
  modifiers: Record<string, number>;
  status: FactionStatus;
  /** true quando a identidade ainda não foi aprovada pelo criador. */
  provisional?: boolean;
  meta?: Record<string, unknown>;
}
