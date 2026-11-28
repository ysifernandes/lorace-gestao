export interface Skill {
  id: string;
  name: string;
  subject: string;
  /** Código BNCC quando aplicável (ex.: EF05MA03). */
  bnccCode?: string;
  prerequisites: string[];
}

/** Grafo de conhecimento: arestas apontam de habilidade → pré-requisitos. */
export class KnowledgeGraph {
  private skills = new Map<string, Skill>();

  constructor(skills: Skill[]) {
    for (const s of skills) {
      if (this.skills.has(s.id)) throw new Error(`duplicate skill ${s.id}`);
      this.skills.set(s.id, s);
    }
    for (const s of skills) {
      for (const p of s.prerequisites) {
        if (p === s.id) throw new Error(`skill ${s.id} requires itself`);
        if (!this.skills.has(p)) throw new Error(`skill ${s.id} has unknown prerequisite ${p}`);
      }
    }
    this.assertAcyclic();
  }

  get(id: string): Skill {
    const s = this.skills.get(id);
    if (!s) throw new Error(`unknown skill ${id}`);
    return s;
  }
  has(id: string): boolean { return this.skills.has(id); }
  all(): Skill[] { return [...this.skills.values()]; }

  /** Pré-requisitos diretos ou transitivos, ordenados do mais próximo ao mais distante (BFS). */
  prerequisitesOf(id: string, transitive = true): string[] {
    const out: string[] = [];
    const seen = new Set<string>([id]);
    let frontier = [...this.get(id).prerequisites];
    while (frontier.length) {
      const next: string[] = [];
      for (const p of frontier) {
        if (seen.has(p)) continue;
        seen.add(p);
        out.push(p);
        if (transitive) next.push(...this.get(p).prerequisites);
      }
      frontier = next;
    }
    return out;
  }

  /** Habilidades que dependem diretamente de `id`. */
  dependentsOf(id: string): string[] {
    return this.all().filter((s) => s.prerequisites.includes(id)).map((s) => s.id);
  }

  /** Ordem topológica (pré-requisitos primeiro). */
  topologicalOrder(): string[] {
    const order: string[] = [];
    const mark = new Map<string, 1 | 2>();
    const visit = (id: string) => {
      if (mark.get(id) === 2) return;
      mark.set(id, 1);
      for (const p of this.get(id).prerequisites) visit(p);
      mark.set(id, 2);
      order.push(id);
    };
    for (const s of this.skills.values()) visit(s.id);
    return order;
  }

  private assertAcyclic(): void {
    const state = new Map<string, 1 | 2>();
    const visit = (id: string, path: string[]) => {
      if (state.get(id) === 2) return;
      if (state.get(id) === 1) throw new Error(`cycle in knowledge graph: ${[...path, id].join(' -> ')}`);
      state.set(id, 1);
      for (const p of this.skills.get(id)!.prerequisites) visit(p, [...path, id]);
      state.set(id, 2);
    };
    for (const id of this.skills.keys()) visit(id, []);
  }
}
