import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalize, sign } from '@edu/security';
import { deriveDeviceKey } from '@edu/backend';

// Vetores compartilhados: Kotlin e Swift DEVEM reproduzir canonical e signature exatamente (ver native/*/tests).
const KEY = deriveDeviceKey('m'.repeat(40), '11111111-1111-4111-8111-111111111111');
const BODY = { id: 'c1', deviceId: '11111111-1111-4111-8111-111111111111', nonce: 'abc', issuedAt: 1700000000000, expiresAt: 1700086400000, type: 'grant_time', payload: { minutes: 10, appId: 'com.example.app', note: 'ação ✓' } };
const path = new URL('../vectors/command-signing.json', import.meta.url);
describe('vetores de assinatura multiplataforma', () => {
  it('arquivo de vetores confere com a implementação TypeScript', () => {
    const v = { deviceKey: KEY, body: BODY, canonical: canonicalize(BODY), signature: sign(KEY, BODY) };
    if (!existsSync(path)) writeFileSync(path, JSON.stringify(v, null, 2) + '\n');
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(v);
  });
});
