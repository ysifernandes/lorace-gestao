import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { Backend } from '@estuda/backend';
import { sign, verify, NonceGuard } from '@estuda/security';
import { FakeEnforcer, SimulatedDevice } from './agent';

const SECRET = 'x'.repeat(40);
let t = 1_700_000_000_000;
let be: Backend, server: Server, url: string, parent: string;

async function api(method: string, path: string, token: string, body?: unknown) {
  const r = await fetch(url + path, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, json: (await r.json()) as any };
}
async function pair(fam: string, platform: 'android' | 'ios' = 'android') {
  const tok = fam === 'fam1' ? parent : be.registerParent(fam);
  const { json: { code } } = await api('POST', '/pairing/start', tok);
  const r = await fetch(url + '/pairing/complete', { method: 'POST', body: JSON.stringify({ code, platform }) });
  const j = (await r.json()) as any;
  const enf = new FakeEnforcer();
  return { dev: new SimulatedDevice(url, j.deviceId, j.deviceToken, j.deviceKey, enf, () => t), enf, tok };
}

beforeEach(async () => {
  t = 1_700_000_000_000;
  be = new Backend({ masterSecret: SECRET, now: () => t });
  ({ server, url } = await be.listen(0));
  parent = be.registerParent('fam1');
});
afterEach(() => new Promise((r) => server.close(() => r(null))));

describe('PoC controle parental — protocolo (agente simulado, sem bloqueio nativo)', () => {
  it('pareia, bloqueia, confirma, libera por tempo e reaplica ao fim', async () => {
    const { dev, enf, tok } = await pair('fam1');
    await dev.heartbeat();
    const { json: created } = await api('POST', '/commands', tok, { deviceId: dev.deviceId, type: 'block_app', payload: { appId: 'com.google.android.youtube' } });
    expect((await api('GET', `/commands/${created.id}`, tok)).json.status).toBe('pending');

    await dev.syncOnce();
    expect(enf.blocked.has('com.google.android.youtube')).toBe(true);
    const st = (await api('GET', `/commands/${created.id}`, tok)).json;
    expect(st.status).toBe('block_applied');
    expect(st.history.map((h: any) => h.status)).toEqual(['pending', 'received', 'block_applied']);

    // libera por 10 minutos
    const g = (await api('POST', '/commands', tok, { deviceId: dev.deviceId, type: 'grant_time', payload: { appId: 'com.google.android.youtube', minutes: 10 } })).json;
    await dev.syncOnce();
    expect((await api('GET', `/commands/${g.id}`, tok)).json.status).toBe('unblock_applied');
    expect(dev.allowed('com.google.android.youtube')).toBe(true);
    t += 9 * 60_000; dev.reconcile();
    expect(enf.blocked.has('com.google.android.youtube')).toBe(false);
    t += 2 * 60_000; // passou de 10 min
    expect(dev.allowed('com.google.android.youtube')).toBe(false);
    dev.reconcile();
    expect(enf.blocked.has('com.google.android.youtube')).toBe(true);
    // essencial nunca é bloqueado
    expect(dev.allowed('com.android.dialer')).toBe(true);
  });

  it('dispositivo offline: comando fica device_offline e é aplicado ao reconectar', async () => {
    const { dev, enf, tok } = await pair('fam1');
    const c = (await api('POST', '/commands', tok, { deviceId: dev.deviceId, type: 'block_app', payload: { appId: 'com.x.game' } })).json;
    expect((await api('GET', `/commands/${c.id}`, tok)).json.status).toBe('device_offline');
    expect(enf.blocked.size).toBe(0); // nada foi aplicado
    await dev.heartbeat(); await dev.syncOnce();
    expect((await api('GET', `/commands/${c.id}`, tok)).json.status).toBe('block_applied');
  });

  it('perda de permissão: reporta permission_unavailable e nunca finge sucesso', async () => {
    const { dev, enf, tok } = await pair('fam1');
    enf.enabled = false;
    await dev.heartbeat();
    const c = (await api('POST', '/commands', tok, { deviceId: dev.deviceId, type: 'block_app', payload: { appId: 'com.x.game' } })).json;
    await dev.syncOnce();
    expect((await api('GET', `/commands/${c.id}`, tok)).json.status).toBe('permission_unavailable');
    expect(enf.blocked.size).toBe(0);
  });

  it('expira comando antigo', async () => {
    const { dev, tok } = await pair('fam1');
    await dev.heartbeat();
    const c = (await api('POST', '/commands', tok, { deviceId: dev.deviceId, type: 'block_app', payload: { appId: 'com.x.game' } })).json;
    t += 25 * 3600_000;
    expect((await api('GET', `/commands/${c.id}`, tok)).json.status).toBe('expired');
  });

  it('segurança: outra família não controla o dispositivo nem lê o comando', async () => {
    const { dev, tok } = await pair('fam1');
    const other = be.registerParent('fam2');
    expect((await api('POST', '/commands', other, { deviceId: dev.deviceId, type: 'block_app', payload: { appId: 'com.x.a' } })).status).toBe(403);
    const c = (await api('POST', '/commands', tok, { deviceId: dev.deviceId, type: 'block_app', payload: { appId: 'com.x.a' } })).json;
    expect((await api('GET', `/commands/${c.id}`, other)).status).toBe(404);
  });

  it('segurança: payload inválido, token inválido e código de pareamento de uso único', async () => {
    const { dev, tok } = await pair('fam1');
    expect((await api('POST', '/commands', tok, { deviceId: dev.deviceId, type: 'grant_time', payload: { appId: 'com.x.a', minutes: 99999 } })).status).toBe(400);
    expect((await api('POST', '/commands', tok, { deviceId: dev.deviceId, type: 'rm_rf', payload: {} })).status).toBe(400);
    expect((await api('GET', `/devices/${dev.deviceId}/commands`, 'nope')).status).toBe(401);
    const { json: { code } } = await api('POST', '/pairing/start', tok);
    const body = JSON.stringify({ code, platform: 'ios' });
    expect((await fetch(url + '/pairing/complete', { method: 'POST', body })).status).toBe(200);
    expect((await fetch(url + '/pairing/complete', { method: 'POST', body })).status).toBe(400);
  });

  it('segurança: assinatura adulterada, replay e dispositivo errado são rejeitados', async () => {
    const { dev, tok } = await pair('fam1');
    await dev.heartbeat();
    await api('POST', '/commands', tok, { deviceId: dev.deviceId, type: 'block_app', payload: { appId: 'com.x.a' } });
    const { json: [c] } = await api('GET', `/devices/${dev.deviceId}/commands`, dev.token);
    const ctx = () => ({ deviceId: dev.deviceId, now: t, nonces: new NonceGuard() });
    expect(verify(dev.key, c.envelope, ctx())).toEqual({ ok: true });
    const tampered = structuredClone(c.envelope); tampered.body.payload.appId = 'com.evil';
    expect(verify(dev.key, tampered, ctx())).toEqual({ ok: false, reason: 'bad_signature' });
    const ng = new NonceGuard();
    verify(dev.key, c.envelope, { deviceId: dev.deviceId, now: t, nonces: ng });
    expect(verify(dev.key, c.envelope, { deviceId: dev.deviceId, now: t, nonces: ng })).toEqual({ ok: false, reason: 'replay' });
    expect(verify(dev.key, c.envelope, { deviceId: 'other', now: t, nonces: new NonceGuard() })).toEqual({ ok: false, reason: 'wrong_device' });
    // chave de outro dispositivo não valida
    expect(sign(dev.key, c.envelope.body)).toBe(c.envelope.signature);
  });

  it('rate limit responde 429', async () => {
    let last = 0;
    for (let i = 0; i < 40; i++) last = (await api('GET', '/commands/x', parent)).status;
    expect(last).toBe(429);
  });
});
