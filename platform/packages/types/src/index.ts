// @edu/types — vocabulário compartilhado. Sem dependências de runtime.

export const ROLES = ['student', 'guardian', 'teacher', 'school_manager', 'super_admin'] as const;
export type Role = (typeof ROLES)[number];

export type AgeBand = 'exploradores' | 'aventureiros' | 'desafiadores' | 'estrategistas';

/** Faixa visual/linguística. NÃO define nível pedagógico (ver PEDAGOGY.md). */
export function ageBandFor(age: number): AgeBand | null {
  if (!Number.isFinite(age) || age < 5 || age > 17) return null;
  if (age <= 7) return 'exploradores';
  if (age <= 10) return 'aventureiros';
  if (age <= 13) return 'desafiadores';
  return 'estrategistas';
}

export type MasteryState = 'consolidated' | 'developing' | 'needs_support' | 'insufficient_evidence';

export type EvidenceKind = 'diagnostic' | 'practice' | 'transfer' | 'delayed_review' | 'game';

export interface Evidence {
  skillId: string;
  correct: boolean;
  hintsUsed: number;
  kind: EvidenceKind;
  /** epoch ms */
  at: number;
}

export type ErrorCategory =
  | 'conceptual'
  | 'procedural'
  | 'text_interpretation'
  | 'missing_prerequisite'
  | 'practical_application'
  | 'retention'
  | 'occasional'
  | 'hint_dependence'
  | 'transfer';

export type CommandType = 'block_app' | 'unblock_app' | 'grant_time' | 'revoke_time' | 'set_rules';

export type CommandStatus =
  | 'pending'
  | 'received'
  | 'block_applied'
  | 'unblock_applied'
  | 'device_offline'
  | 'permission_unavailable'
  | 'sync_failed'
  | 'expired';

export type Platform = 'android' | 'ios';
