import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const p = (s: string) => fileURLToPath(new URL(s, import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      '@edu/types': p('./packages/types/src/index.ts'),
      '@edu/pedagogy': p('./packages/pedagogy/src/index.ts'),
      '@edu/gamification': p('./packages/gamification/src/index.ts'),
      '@edu/parental-control': p('./packages/parental-control/src/index.ts'),
      '@edu/security/portable': p('./packages/security/src/portable.ts'),
      '@edu/security': p('./packages/security/src/index.ts'),
      '@edu/brand': p('./packages/brand/src/index.ts'),
      '@edu/content-math': p('./packages/content-math/src/index.ts'),
      '@edu/learning': p('./packages/learning/src/index.ts'),
      '@edu/backend': p('./services/backend/src/index.ts'),
    },
  },
  test: { include: ['apps/web/test/**/*.test.ts', 'packages/*/test/**/*.test.ts', 'services/*/test/**/*.test.ts', 'tests/poc/**/*.test.ts'] },
});
