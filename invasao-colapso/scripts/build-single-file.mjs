/**
 * Gera uma versão de ARQUIVO ÚNICO do jogo.
 *
 * Junta o HTML, o CSS e o JS do `dist/` em um só arquivo, que roda offline
 * ao ser aberto com duplo clique (protocolo file://) — sem servidor, sem
 * instalação. Requisito: o bundle não pode ter imports dinâmicos, porque
 * file:// bloquearia o carregamento de chunks separados.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const OUT_DIR = 'dist-single';
const OUT_FILE = join(OUT_DIR, 'Invasao-Colapso.html');

const assets = readdirSync(join(DIST, 'assets'));
const jsName = assets.find((f) => f.endsWith('.js'));
const cssName = assets.find((f) => f.endsWith('.css'));
if (!jsName || !cssName) throw new Error('Build não encontrado. Rode `npm run build` antes.');

const js = readFileSync(join(DIST, 'assets', jsName), 'utf8');
const css = readFileSync(join(DIST, 'assets', cssName), 'utf8');

if (js.includes('import(')) {
  throw new Error('O bundle tem import dinâmico: não funcionaria em file://.');
}

let html = readFileSync(join(DIST, 'index.html'), 'utf8');

// Remove as referências externas e injeta o conteúdo no lugar.
html = html
  .replace(new RegExp(`\\s*<script[^>]*src="[^"]*${jsName}"[^>]*></script>`), '')
  .replace(new RegExp(`\\s*<link[^>]*href="[^"]*${cssName}"[^>]*>`), '');

// `</script>` dentro do código encerraria a tag cedo demais.
const safeJs = js.replace(/<\/script>/gi, '<\\/script>');

// ATENÇÃO: a substituição precisa ser por FUNÇÃO. Com string, sequências
// como `$&` ou `$\`` presentes no bundle minificado seriam interpretadas
// pelo String.replace e corromperiam o código.
html = html
  .replace('</head>', () => `  <style>\n${css}\n  </style>\n</head>`)
  .replace('</body>', () => `  <script type="module">\n${safeJs}\n  </script>\n</body>`);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, html, 'utf8');

const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`Arquivo único gerado: ${OUT_FILE} (${kb} kB)`);
