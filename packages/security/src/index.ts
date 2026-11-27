// @estuda/security — assinatura de comandos, anti-replay, validação e rate limiting.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** JSON canônico (chaves ordenadas) para assinatura determinística. */
export function canonicalize(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalize).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalize(o[k])}`)
    .join(',')}}`;
}

export interface SignedEnvelope<T> {
  body: T & { id: string; deviceId: string; nonce: string; issuedAt: number; expiresAt: number };
  signature: string;
}

export function sign(secret: string, body: unknown): string {
  if (secret.length < 32) throw new Error('signing secret must be >= 32 chars');
  return createHmac('sha256', secret).update(canonicalize(body)).digest('hex');
}

export type VerifyResult = { ok: true } | { ok: false; reason: 'bad_signature' | 'expired' | 'replay' | 'wrong_device' | 'not_yet_valid' };

/** Guarda de nonces vistos (por dispositivo). Em produção: persistido pelo agente nativo. */
export class NonceGuard {
  private seen = new Set<string>();
  check(nonce: string): boolean {
    if (this.seen.has(nonce)) return false;
    this.seen.add(nonce);
    return true;
  }
}

export function verify<T>(
  secretOrKey: string,
  env: SignedEnvelope<T>,
  ctx: { deviceId: string; now: number; nonces: NonceGuard; skewMs?: number },
): VerifyResult {
  const expected = Buffer.from(sign(secretOrKey, env.body), 'hex');
  const given = Buffer.from(env.signature, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: 'bad_signature' };
  if (env.body.deviceId !== ctx.deviceId) return { ok: false, reason: 'wrong_device' };
  if (env.body.issuedAt - (ctx.skewMs ?? 60_000) > ctx.now) return { ok: false, reason: 'not_yet_valid' };
  if (ctx.now > env.body.expiresAt) return { ok: false, reason: 'expired' };
  if (!ctx.nonces.check(env.body.nonce)) return { ok: false, reason: 'replay' };
  return { ok: true };
}

export const newNonce = (): string => randomBytes(16).toString('hex');
export const newPairingCode = (): string => {
  // alfabeto sem caracteres ambíguos; 8 chars ≈ 40 bits
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = randomBytes(8);
  return Array.from(b, (x) => A[x % A.length]).join('');
};

// ---- validação de entrada ----
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);
/** Identificador de app: pacote Android (com.x.y) ou token opaco iOS (base64url). */
export const isAppId = (s: unknown): s is string =>
  typeof s === 'string' && s.length > 0 && s.length <= 256 && /^[A-Za-z0-9._\-=+/]+$/.test(s);
export const boundedInt = (v: unknown, min: number, max: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;

// ---- rate limit (token bucket) ----
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();
  constructor(private capacity: number, private refillPerSec: number) {}
  allow(key: string, now: number): boolean {
    const b = this.buckets.get(key) ?? { tokens: this.capacity, at: now };
    b.tokens = Math.min(this.capacity, b.tokens + ((now - b.at) / 1000) * this.refillPerSec);
    b.at = now;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(key, b);
    return ok;
  }
}
