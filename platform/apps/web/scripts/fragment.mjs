// Converte o HTML único do Vite em fragmento (sem doctype/html/head/body) para publicação como Artifact.
import { readFileSync, writeFileSync } from 'node:fs';
const h = readFileSync(new URL('../dist-preview/index.html', import.meta.url), 'utf8');
const title = h.match(/<title>[^<]*<\/title>/)?.[0] ?? '<title>Plataforma Educacional</title>';
const styles = [...h.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n');
const scripts = [...h.matchAll(/<script type="module"[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]).join('\n');
writeFileSync(new URL('../dist-preview/artifact.html', import.meta.url), `${title}\n${styles}\n<div id="root"></div>\n${scripts}\n`);
console.log('fragmento: dist-preview/artifact.html');
