export type ReviewStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'deprecated';

export interface SourceRef {
  kind: 'authored' | 'bncc' | 'rea' | 'licensed' | 'research';
  reference: string;
  license: string;
}
export interface Review {
  status: ReviewStatus;
  /** Todo material gerado/autoral começa exigindo revisão profissional (pedagogo/docente). */
  needsProfessionalReview: boolean;
  version: number;
  reviewedBy?: string; reviewedAt?: number; note?: string;
}

export interface Skill {
  id: string; subject: 'matematica' | 'portugues'; unit: string; name: string; description: string;
  prerequisites: string[]; ageMin: number; ageMax: number;
  /** Código oficial da BNCC SOMENTE depois de conferido no documento oficial. Nulo = não verificado (nunca preencher "de memória"). */
  bnccCode: string | null;
  /** Descrição textual da área/objeto da BNCC a conferir (não é código). */
  bnccLookup: string;
}

export type Figure =
  | { type: 'fraction-bar'; num: number; den: number }
  /** Objetos para contar (faixa 5–7). icon: maca | estrela | bola | peixe */
  | { type: 'count'; n: number; icon: 'maca' | 'estrela' | 'bola' | 'peixe' }
  /** Forma geométrica plana. */
  | { type: 'shape'; shape: 'circulo' | 'quadrado' | 'triangulo' | 'retangulo' }
  /** Sequência de fichas "forma:cor"; '?' marca a ficha que falta. */
  | { type: 'pattern'; seq: string[] }
  | { type: 'none' };

export interface MCOption { id: string; text: string; misconception?: string }

interface Base {
  id: string; skillId: string; difficulty: number; statement: string;
  context?: string; figure?: Figure;
  /** Texto lido em voz alta (áudio-primeiro, faixa 5–7); se ausente, lê-se o enunciado. */
  spoken?: string;
  hints: string[]; justification: string; source: SourceRef; review: Review;
}
export type Item = Base & (
  | { kind: 'multiple_choice' | 'word_problem' | 'reasoning'; options: MCOption[]; correct: string }
  | { kind: 'fill_in'; accepted: string[]; wrongPatterns?: { answer: string; misconception: string }[]; inputHint?: string }
  | { kind: 'ordering'; entries: { id: string; label: string }[]; correctOrder: string[]; misconceptionIfReversed?: string }
  | { kind: 'matching'; left: { id: string; label: string }[]; right: { id: string; label: string }[]; pairs: [string, string][] }
  | { kind: 'drag_drop'; tokens: { id: string; label: string }[]; zones: { id: string; label: string }[]; solution: Record<string, string> }
  | { kind: 'fraction_visual'; den: number; targetNum: number; wrongPatterns?: { shaded: number; misconception: string }[] }
  | { kind: 'simulation'; den: number; targetDen: number; targetNum: number }
);
export type ItemKind = Item['kind'];

export interface Misconception {
  id: string; skillId: string; label: string; description: string;
  category: 'conceptual' | 'procedural' | 'text_interpretation' | 'practical_application' | 'occasional';
}
export interface ExplanationVariant { method: 'passo_a_passo' | 'visual' | 'historia' | 'contraexemplo'; title: string; body: string[]; }
