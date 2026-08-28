import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';

/**
 * Empacota o servidor autoritativo em um único .mjs.
 *
 * O motor de regras (src/game) entra no pacote — é literalmente o MESMO
 * código que roda no navegador no modo local. Não existe segunda
 * implementação das regras.
 */
mkdirSync('dist-server', { recursive: true });

await build({
  entryPoints: ['src/net/serverEntry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist-server/server.mjs',
  external: ['ws'],
  logLevel: 'info',
});

console.log('Servidor empacotado: dist-server/server.mjs');
