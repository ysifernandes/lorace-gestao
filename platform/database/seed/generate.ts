// Gera database/seed/0001_content.sql a partir de packages/content-math (fonte única). Execute: pnpm seed:gen
import { writeFileSync } from 'node:fs';
import { ALL_SKILLS, buildItemBank, MISCONCEPTIONS, EXPLANATIONS, type Item } from '@edu/content-math';

const q = (s: string | null | undefined) => (s == null ? 'null' : `'${s.replace(/'/g, "''")}'`);
const j = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const out: string[] = ['-- GERADO por database/seed/generate.ts — não editar à mão. Conteúdo AUTORAL em rascunho: exige revisão profissional.'];
out.push(`insert into app.knowledge_sources(name, kind, license, url) values ('Itens autorais gerados pelo projeto (gabarito calculado por código)', 'authored', 'Autoral do projeto (licença final a definir)', null);`);
out.push(`insert into app.subjects(id, name) values ('matematica','Matemática'), ('portugues','Língua Portuguesa');`);
const units = [...new Map(ALL_SKILLS.map((s) => [`${s.subject}|${s.unit}`, s])).values()];
for (const u of units) { out.push(`insert into app.units(subject_id, name) values (${q(u.subject)}, ${q(u.unit)});`); out.push(`insert into app.contents(unit_id, name) select id, name from app.units where name = ${q(u.unit)} and subject_id = ${q(u.subject)};`); }
for (const s of ALL_SKILLS)
  out.push(`insert into app.skills(slug, content_id, name, age_min, age_max, bncc_code, bncc_verified, bncc_lookup, review_status) select ${q(s.id)}, c.id, ${q(s.name)}, ${s.ageMin}, ${s.ageMax}, null, false, ${q(s.bnccLookup)}, 'draft' from app.contents c join app.units u on u.id = c.unit_id where u.name = ${q(s.unit)} and u.subject_id = ${q(s.subject)};`);
for (const s of ALL_SKILLS) for (const p of s.prerequisites)
  out.push(`insert into app.skill_prerequisites select (select id from app.skills where slug = ${q(s.id)}), (select id from app.skills where slug = ${q(p)});`);
const answerOf = (i: Item) => ('correct' in i ? { correct: i.correct } : 'accepted' in i ? { accepted: i.accepted } : 'correctOrder' in i ? { correctOrder: i.correctOrder } : 'pairs' in i ? { pairs: i.pairs } : 'solution' in i ? { solution: i.solution } : { targetNum: (i as { targetNum: number }).targetNum });
const payloadOf = (i: Item) => { const { id, skillId, difficulty, statement, hints, justification, source, review, kind, ...rest } = i as Item & Record<string, unknown>; void [id, skillId, difficulty, statement, hints, justification, source, review, kind]; return rest; };
for (const i of buildItemBank()) {
  const tags = 'options' in i ? [...new Set(i.options.flatMap((o) => (o.misconception ? [o.misconception] : [])))] : [];
  out.push(`insert into app.questions(slug, skill_id, source_id, difficulty, statement, answer, justification, kind, payload, hints, misconception_tags, review_status, needs_professional_review) select ${q(i.id)}, (select id from app.skills where slug = ${q(i.skillId)}), (select id from app.knowledge_sources limit 1), ${i.difficulty}, ${q(i.statement)}, ${j(answerOf(i))}, ${q(i.justification)}, ${q(i.kind)}, ${j(payloadOf(i))}, ${j(i.hints)}, ${q(`{${tags.join(',')}}`)}::text[], 'draft', true;`);
}
for (const m of Object.values(MISCONCEPTIONS)) out.push(`insert into app.misconceptions(id, skill_id, label, category, description) select ${q(m.id)}, id, ${q(m.label)}, ${q(m.category)}, ${q(m.description)} from app.skills where slug = ${q(m.skillId)};`);
for (const [id, vs] of Object.entries(EXPLANATIONS)) vs.forEach((v, n) => out.push(`insert into app.misconception_explanations(misconception_id, variant, method, title, body) values (${q(id)}, ${n + 1}, ${q(v.method)}, ${q(v.title)}, ${j(v.body)});`));
writeFileSync(new URL('./0001_content.sql', import.meta.url), out.join('\n') + '\n');
console.log(`seed: ${ALL_SKILLS.length} habilidades, ${buildItemBank().length} itens, ${Object.keys(MISCONCEPTIONS).length} equívocos`);
