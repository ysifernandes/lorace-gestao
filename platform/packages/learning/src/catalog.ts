import type { Item, ReviewStatus } from '@edu/content-math';

export interface Actor { id: string; role: 'super_admin' | 'reviewer' | 'teacher' }
export interface AuditEntry { at: number; actor: string; action: string; itemId: string; from: ReviewStatus | null; to: ReviewStatus; version: number; note?: string }
export type Editable = Partial<Pick<Item, 'statement' | 'context' | 'hints' | 'justification'>>;

const FLOW: Record<ReviewStatus, ReviewStatus[]> = {
  draft: ['in_review', 'deprecated'], in_review: ['approved', 'rejected', 'draft'], approved: ['deprecated'], rejected: ['draft', 'deprecated'], deprecated: [],
};

/** Catálogo editorial: cadastro, edição versionada, revisão com "quatro olhos" e trilha de auditoria. */
export class ContentCatalog {
  private items = new Map<string, Item>();
  private history = new Map<string, Item[]>();
  private lastEditor = new Map<string, string>();
  audit: AuditEntry[] = [];
  constructor(items: Item[], private now: () => number = Date.now, public policy: { allowDraft: boolean } = { allowDraft: false }) { for (const i of items) this.items.set(i.id, structuredClone(i)); }

  all(): Item[] { return [...this.items.values()]; }
  get(id: string): Item { const i = this.items.get(id); if (!i) throw new Error(`item inexistente ${id}`); return i; }
  versions(id: string): Item[] { return [...(this.history.get(id) ?? []), this.get(id)]; }
  /** Itens que podem ser apresentados a alunos conforme a política (rascunho só em modo de desenvolvimento, sinalizado na UI). */
  servable(): Item[] { return this.all().filter((i) => i.review.status === 'approved' || (this.policy.allowDraft && (i.review.status === 'draft' || i.review.status === 'in_review'))); }
  needsReview(): Item[] { return this.all().filter((i) => i.review.needsProfessionalReview || i.review.status !== 'approved'); }

  private log(actor: string, action: string, i: Item, from: ReviewStatus | null, note?: string) { this.audit.push({ at: this.now(), actor, action, itemId: i.id, from, to: i.review.status, version: i.review.version, note }); }

  create(item: Item, actor: Actor): Item {
    if (this.items.has(item.id)) throw new Error('id já existe');
    const i = structuredClone(item); i.review = { status: 'draft', needsProfessionalReview: true, version: 1 };
    if (!i.source?.license || !i.source?.reference) throw new Error('fonte e licença são obrigatórias');
    this.items.set(i.id, i); this.lastEditor.set(i.id, actor.id); this.log(actor.id, 'create', i, null); return i;
  }
  edit(id: string, patch: Editable, actor: Actor): Item {
    const cur = this.get(id); if (cur.review.status === 'deprecated') throw new Error('item descontinuado');
    this.history.set(id, [...(this.history.get(id) ?? []), structuredClone(cur)]);
    const next = { ...structuredClone(cur), ...patch } as Item;
    next.review = { status: 'draft', needsProfessionalReview: true, version: cur.review.version + 1 };
    this.items.set(id, next); this.lastEditor.set(id, actor.id); this.log(actor.id, 'edit', next, cur.review.status); return next;
  }
  private move(id: string, to: ReviewStatus, actor: Actor, note?: string, extra?: Partial<Item['review']>): Item {
    const cur = this.get(id); if (!FLOW[cur.review.status].includes(to)) throw new Error(`transição inválida ${cur.review.status} → ${to}`);
    const from = cur.review.status; cur.review = { ...cur.review, status: to, ...extra }; this.log(actor.id, to, cur, from, note); return cur;
  }
  submit(id: string, actor: Actor) { return this.move(id, 'in_review', actor); }
  approve(id: string, reviewer: Actor, note: string, professional: boolean) {
    if (reviewer.role === 'teacher') throw new Error('professor revisa conteúdo da própria turma, não aprova o banco central');
    if (this.lastEditor.get(id) === reviewer.id) throw new Error('o autor da última edição não pode aprovar (revisão por segundo avaliador)');
    if (!note.trim()) throw new Error('nota de revisão obrigatória');
    return this.move(id, 'approved', reviewer, note, { reviewedBy: reviewer.id, reviewedAt: this.now(), note, needsProfessionalReview: !professional });
  }
  reject(id: string, reviewer: Actor, note: string) { if (!note.trim()) throw new Error('motivo obrigatório'); return this.move(id, 'rejected', reviewer, note, { reviewedBy: reviewer.id, reviewedAt: this.now(), note }); }
  deprecate(id: string, actor: Actor, note?: string) { return this.move(id, 'deprecated', actor, note); }

  toJSON() { return { items: this.all(), history: [...this.history.entries()], lastEditor: [...this.lastEditor.entries()], audit: this.audit }; }
  static fromJSON(j: ReturnType<ContentCatalog['toJSON']>, now?: () => number, policy?: { allowDraft: boolean }) {
    const c = new ContentCatalog(j.items, now, policy); c.history = new Map(j.history); c.lastEditor = new Map(j.lastEditor); c.audit = j.audit; return c;
  }
}
