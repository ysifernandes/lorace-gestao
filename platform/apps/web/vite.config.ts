import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { fileURLToPath } from 'node:url';
const p = (s: string) => fileURLToPath(new URL(s, import.meta.url));
// Marca: sobreponível por VITE_BRAND_NAME etc. (ver packages/brand). PREVIEW_SINGLE=1 gera um único HTML autocontido para visualização.
export default defineConfig({
  base: './',
  plugins: [react(), ...(process.env.PREVIEW_SINGLE ? [viteSingleFile()] : [])],
  resolve: { alias: {
    '@edu/types': p('../../packages/types/src/index.ts'), '@edu/pedagogy': p('../../packages/pedagogy/src/index.ts'),
    '@edu/gamification': p('../../packages/gamification/src/index.ts'), '@edu/parental-control': p('../../packages/parental-control/src/index.ts'),
    '@edu/security/portable': p('../../packages/security/src/portable.ts'), '@edu/brand': p('../../packages/brand/src/index.ts'),
    '@edu/content-math': p('../../packages/content-math/src/index.ts'), '@edu/learning': p('../../packages/learning/src/index.ts'),
  } },
  build: { target: 'es2022', chunkSizeWarningLimit: 1500 },
});
