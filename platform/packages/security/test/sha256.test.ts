import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { sha256Hex } from '@edu/security/portable';
describe('sha256 portátil', () => {
  it('igual ao node:crypto (incl. acentos e limites de bloco)', () => {
    for (const s of ['', 'abc', 'ação ✓', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'y'.repeat(1000)])
      expect(sha256Hex(s)).toBe(createHash('sha256').update(s).digest('hex'));
  });
});
