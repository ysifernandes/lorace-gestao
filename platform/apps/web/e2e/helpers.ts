// Auxiliares de E2E: um ALUNO SIMULADO responde pela interface (para gerar estado real no navegador).
import { buildItemBank, type Item } from '@edu/content-math';
export const bank = buildItemBank();
export type Slips = Record<string, string>;
type Page = any; // playwright Page (carregado via require em tempo de execução)

async function findItem(page: Page): Promise<Item> {
  const statement = (await page.locator('h2').first().innerText()).trim(); const cf = page.locator('div.card.flat'); const ctxT = (await cf.count()) ? await cf.first().innerText() : ''; const ctx = ctxT.startsWith('📖') ? ctxT.replace('📖', '').trim() : '';
  const opts = (await page.locator('[role=radio]').allInnerTexts()).map((t: string) => t.replace(/^[A-D]\s*/, '').trim());
  const c = bank.filter((i) => i.statement === statement && (i.context ?? '') === ctx && (!('options' in i) || (opts.length === i.options.length && i.options.every((o) => opts.includes(o.text)))));
  if (c.length !== 1) throw new Error(`item ambíguo/não encontrado: "${statement}" (${c.length})`); return c[0]!;
}
export async function answerCurrent(page: Page, slips: Slips) {
  const it = await findItem(page); const tag = slips[it.skillId];
  switch (it.kind) {
    case 'multiple_choice': case 'word_problem': case 'reasoning': { const o = (tag && it.options.find((x) => x.misconception === tag)) || it.options.find((x) => x.id === it.correct)!; const rs = page.locator('[role=radio]'); const ts = (await rs.allInnerTexts()).map((t) => t.replace(/^[A-D]\s*/, '').trim()); await rs.nth(ts.indexOf(o.text)).click(); break; }
    case 'fill_in': await page.locator('#fi').fill(tag ? (it.wrongPatterns?.find((w) => w.misconception === tag)?.answer ?? '0') : it.accepted[0]!); break;
    case 'fraction_visual': for (let i = 0; i < (tag ? (it.wrongPatterns?.[0]?.shaded ?? 1) : it.targetNum); i++) await page.getByLabel(`Parte ${i + 1}`).click(); break;
    case 'simulation': await page.locator('#sm').fill(String(tag ? 0 : it.targetNum)); break;
    case 'matching': for (const [l, r] of it.pairs) { await page.locator('.opt', { hasText: it.left.find((x) => x.id === l)!.label }).first().click(); await page.locator('.opt', { hasText: it.right.find((x) => x.id === r)!.label }).first().click(); } break;
    case 'drag_drop': for (const [t, z] of Object.entries(it.solution)) { await page.locator('.chip', { hasText: new RegExp(`^${it.tokens.find((x) => x.id === t)!.label}$`) }).first().click(); await page.locator('.zone', { hasText: it.zones.find((x) => x.id === z)!.label }).first().click(); } break;
    case 'ordering': { const want = it.correctOrder.map((id) => it.entries.find((e) => e.id === id)!.label); for (let pass = 0; pass < 12; pass++) { const cur = (await page.locator('ol .chip').allInnerTexts()).map((t: string) => t.replace(/^\d+\.\s*/, '')); const i = want.findIndex((w, k) => cur[k] !== w); if (i < 0) break; await page.getByLabel(`Mover ${want[i]} para cima`).click(); } break; }
  }
  await page.getByRole('button', { name: /^(Responder|Pronto!)$/ }).click(); await page.getByRole('button', { name: 'Próxima' }).click(); await page.waitForTimeout(40);
}
export async function runSession(page: Page, slips: Slips, max = 40) { for (let i = 0; i < max; i++) { if (await page.locator('h1', { hasText: /concluíd/ }).count()) return i; await answerCurrent(page, slips); } throw new Error('sessão não terminou'); }
