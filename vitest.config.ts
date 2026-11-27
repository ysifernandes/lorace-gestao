import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const p = (s: string) => fileURLToPath(new URL(s, import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      '@estuda/types': p('./packages/types/src/index.ts'),
      '@estuda/pedagogy': p('./packages/pedagogy/src/index.ts'),
      '@estuda/gamification': p('./packages/gamification/src/index.ts'),
      '@estuda/parental-control': p('./packages/parental-control/src/index.ts'),
      '@estuda/security': p('./packages/security/src/index.ts'),
      '@estuda/backend': p('./services/backend/src/index.ts'),
    },
  },
  test: { include: ['packages/*/test/**/*.test.ts', 'services/*/test/**/*.test.ts', 'tests/poc/**/*.test.ts'] },
});
