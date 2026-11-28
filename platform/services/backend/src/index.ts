// Backend da prova de conceito de controle parental (Fase 2).
// ATENÇÃO: armazenamento EM MEMÓRIA e tokens simples — somente PoC. Produção: Postgres/Supabase (database/migrations)
// + JWT do Supabase Auth. Este módulo valida o PROTOCOLO (assinatura, estados, offline, autorização), não o bloqueio nativo.
import { createServer as httpServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createHmac, createHash, randomUUID, randomBytes } from 'node:crypto';
const sha = (x: string) => createHash('sha256').update(x).digest('hex');
import { sign, newNonce, newPairingCode, isAppId, boundedInt, RateLimiter, type SignedEnvelope } from '@edu/security';
import { transition, isTerminal, successStatusFor } from '@edu/parental-control';
import type { CommandStatus, CommandType, Platform } from '@edu/types';

export interface Command {
  id: string; deviceId: string; type: CommandType; payload: Record<string, unknown>;
  status: CommandStatus; envelope: SignedEnvelope<{ type: CommandType; payload: Record<string, unknown> }>;
  history: { status: CommandStatus; at: number; detail?: string }[];
}
interface Device { id: string; familyId: string; platform: Platform; tokenHash: string; revokedAt: number | null; lastHeartbeat: number | null; capabilities: { usageAccess: boolean; enforcement: boolean } | null }

export interface Options { masterSecret: string; now?: () => number; commandTtlMs?: number; offlineAfterMs?: number }

export function deriveDeviceKey(master: string, deviceId: string): string {
  return createHmac('sha256', master).update(`device-key:${deviceId}`).digest('hex'); // 64 chars
}

export class Backend {
  devices = new Map<string, Device>();
  commands = new Map<string, Command>();
  private parents = new Map<string, string>(); // token -> familyId
  private pairing = new Map<string, { familyId: string; expires: number }>();
  private limiter = new RateLimiter(30, 5);
  now: () => number;
  constructor(private o: Options) { this.now = o.now ?? Date.now; }

  registerParent(familyId: string): string { const t = randomBytes(24).toString('hex'); this.parents.set(t, familyId); return t; }
  parentFamily(token: string | undefined) { return token ? this.parents.get(token) : undefined; }
  /** tokens de dispositivo só existem em claro no dispositivo; aqui guarda-se o hash. Dispositivo revogado deixa de autenticar. */
  deviceByToken(token: string | undefined) { if (!token) return undefined; const h = sha(token); return [...this.devices.values()].find((d) => d.tokenHash === h && d.revokedAt === null); }

  startPairing(familyId: string) {
    const code = newPairingCode();
    this.pairing.set(code, { familyId, expires: this.now() + 10 * 60_000 });
    return code;
  }
  private failures = new Map<string, { n: number; until: number }>();
  /** Anti força-bruta: 5 códigos errados da mesma origem → bloqueio de 10 min. */
  completePairing(code: string, platform: Platform, source = 'local') {
    const f = this.failures.get(source);
    if (f && f.until > this.now()) throw new HttpError(429, 'pairing_locked');
    const p = this.pairing.get(code);
    if (!p || p.expires < this.now()) {
      const n = (f && f.until > 0 && f.until <= this.now() ? 0 : f?.n ?? 0) + 1;
      this.failures.set(source, { n, until: n >= 5 ? this.now() + 10 * 60_000 : 0 });
      throw new HttpError(400, 'invalid_or_expired_code');
    }
    this.failures.delete(source);
    this.pairing.delete(code); // uso único
    const token = randomBytes(24).toString('hex');
    const d: Device = { id: randomUUID(), familyId: p.familyId, platform, tokenHash: sha(token), revokedAt: null, lastHeartbeat: null, capabilities: null };
    this.devices.set(d.id, d);
    return { deviceId: d.id, deviceToken: token, deviceKey: deriveDeviceKey(this.o.masterSecret, d.id) };
  }
  revoke(familyId: string, deviceId: string) {
    const d = this.devices.get(deviceId); if (!d || d.familyId !== familyId) throw new HttpError(403, 'forbidden');
    d.revokedAt = this.now();
    for (const c of this.commands.values()) if (c.deviceId === deviceId && !isTerminal(c.status)) { c.status = 'expired'; c.history.push({ status: 'expired', at: this.now(), detail: 'device_revoked' }); }
  }
  /** Registro de comandos do dispositivo (auditável pelo responsável). */
  journal(familyId: string, deviceId: string) {
    const d = this.devices.get(deviceId); if (!d || d.familyId !== familyId) throw new HttpError(403, 'forbidden'); this.sweep();
    return [...this.commands.values()].filter((c) => c.deviceId === deviceId).map((c) => ({ id: c.id, type: c.type, payload: c.payload, status: c.status, history: c.history }));
  }
  // ---- solicitações de tempo extra ----
  timeRequests = new Map<string, { id: string; deviceId: string; appId: string; minutes: number; reason: string; status: 'pending' | 'approved' | 'denied'; commandId?: string }>();
  requestTime(deviceId: string, appId: string, minutes: number, reason: string) {
    if (!isAppId(appId) || boundedInt(minutes, 1, 120) === null) throw new HttpError(400, 'invalid_payload');
    const r = { id: randomUUID(), deviceId, appId, minutes, reason: reason.slice(0, 300), status: 'pending' as const }; this.timeRequests.set(r.id, r); return r;
  }
  decideTime(familyId: string, id: string, approve: boolean) {
    const r = this.timeRequests.get(id); const d = r && this.devices.get(r.deviceId);
    if (!r || !d || d.familyId !== familyId) throw new HttpError(404, 'not_found');
    if (r.status !== 'pending') throw new HttpError(409, 'already_decided');
    r.status = approve ? 'approved' : 'denied';
    if (approve) r.commandId = this.issue(familyId, r.deviceId, 'grant_time', { appId: r.appId, minutes: r.minutes }).id;
    return r;
  }

  issue(familyId: string, deviceId: string, type: CommandType, payload: Record<string, unknown>): Command {
    const dev = this.devices.get(deviceId);
    if (!dev || dev.familyId !== familyId) throw new HttpError(403, 'forbidden');
    if (dev.revokedAt !== null) throw new HttpError(409, 'device_revoked');
    validatePayload(type, payload);
    const now = this.now();
    const id = randomUUID();
    const body = { id, deviceId, nonce: newNonce(), issuedAt: now, expiresAt: now + (this.o.commandTtlMs ?? 24 * 3600_000), type, payload };
    const cmd: Command = {
      id, deviceId, type, payload, status: 'pending',
      envelope: { body, signature: sign(deriveDeviceKey(this.o.masterSecret, deviceId), body) },
      history: [{ status: 'pending', at: now }],
    };
    this.commands.set(id, cmd);
    return cmd;
  }

  heartbeat(deviceId: string, caps: Device['capabilities']) {
    const d = this.devices.get(deviceId)!;
    d.lastHeartbeat = this.now();
    d.capabilities = caps;
  }

  /** Dispositivo busca comandos ainda não finalizados. */
  fetchFor(deviceId: string): Command[] {
    this.sweep();
    return [...this.commands.values()].filter((c) => c.deviceId === deviceId && !isTerminal(c.status));
  }

  ack(deviceId: string, commandId: string, status: CommandStatus, detail?: string): Command {
    const c = this.commands.get(commandId);
    if (!c || c.deviceId !== deviceId) throw new HttpError(404, 'not_found');
    if (status === 'block_applied' || status === 'unblock_applied') {
      if (status !== successStatusFor(c.type) && !(c.type === 'grant_time' && status === 'unblock_applied')) throw new HttpError(409, 'status_not_valid_for_command_type');
    }
    try { c.status = transition(c.status, status); } catch { throw new HttpError(409, 'invalid_transition'); }
    c.history.push({ status, at: this.now(), detail });
    return c;
  }

  /** Marca expirados e dispositivos sem heartbeat como offline. Chamado em fetch e periodicamente. */
  sweep() {
    const now = this.now();
    for (const c of this.commands.values()) {
      if (isTerminal(c.status)) continue;
      if (now > c.envelope.body.expiresAt) { c.status = transition(c.status, 'expired'); c.history.push({ status: 'expired', at: now }); continue; }
      const d = this.devices.get(c.deviceId)!;
      const offline = d.lastHeartbeat === null || now - d.lastHeartbeat > (this.o.offlineAfterMs ?? 90_000);
      if (c.status === 'pending' && offline) { c.status = transition(c.status, 'device_offline'); c.history.push({ status: 'device_offline', at: now }); }
    }
  }

  // ---- HTTP ----
  listen(port = 0): Promise<{ server: Server; url: string }> {
    const server = httpServer((req, res) => void this.handle(req, res));
    return new Promise((r) => server.listen(port, '127.0.0.1', () => {
      const a = server.address(); r({ server, url: `http://127.0.0.1:${typeof a === 'object' && a ? a.port : port}` });
    }));
  }

  private async handle(req: IncomingMessage, res: ServerResponse) {
    const send = (code: number, body: unknown) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    try {
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      if (!this.limiter.allow(token ?? req.socket.remoteAddress ?? 'anon', this.now())) return send(429, { error: 'rate_limited' });
      const url = new URL(req.url ?? '/', 'http://x');
      const body = req.method === 'POST' ? await readJson(req) : {};
      const family = this.parentFamily(token);
      const dev = this.deviceByToken(token);
      const m = (re: RegExp) => url.pathname.match(re);

      if (req.method === 'POST' && url.pathname === '/pairing/start') {
        if (!family) return send(401, { error: 'unauthorized' });
        return send(200, { code: this.startPairing(family) });
      }
      if (req.method === 'POST' && url.pathname === '/pairing/complete') {
        const platform = body.platform === 'android' || body.platform === 'ios' ? body.platform : null;
        if (typeof body.code !== 'string' || !platform) return send(400, { error: 'bad_request' });
        return send(200, this.completePairing(body.code, platform, req.socket.remoteAddress ?? 'anon'));
      }
      if (req.method === 'POST' && url.pathname === '/commands') {
        if (!family) return send(401, { error: 'unauthorized' });
        const c = this.issue(family, String(body.deviceId), body.type as CommandType, (body.payload ?? {}) as Record<string, unknown>);
        return send(201, { id: c.id, status: c.status });
      }
      let mm;
      if (req.method === 'GET' && (mm = m(/^\/commands\/([\w-]+)$/))) {
        const c = this.commands.get(mm[1]!);
        if (!family || !c || this.devices.get(c.deviceId)?.familyId !== family) return send(404, { error: 'not_found' });
        this.sweep();
        return send(200, { id: c.id, status: c.status, history: c.history });
      }
      if (req.method === 'POST' && (mm = m(/^\/devices\/([\w-]+)\/heartbeat$/))) {
        if (!dev || dev.id !== mm[1]) return send(401, { error: 'unauthorized' });
        this.heartbeat(dev.id, { usageAccess: !!(body.capabilities as any)?.usageAccess, enforcement: !!(body.capabilities as any)?.enforcement });
        return send(200, { ok: true });
      }
      if (req.method === 'GET' && (mm = m(/^\/devices\/([\w-]+)\/commands$/))) {
        if (!dev || dev.id !== mm[1]) return send(401, { error: 'unauthorized' });
        return send(200, this.fetchFor(dev.id).map((c) => ({ id: c.id, status: c.status, envelope: c.envelope })));
      }
      if (req.method === 'POST' && (mm = m(/^\/devices\/([\w-]+)\/commands\/([\w-]+)\/ack$/))) {
        if (!dev || dev.id !== mm[1]) return send(401, { error: 'unauthorized' });
        const c = this.ack(dev.id, mm[2]!, body.status as CommandStatus, typeof body.detail === 'string' ? body.detail.slice(0, 200) : undefined);
        return send(200, { id: c.id, status: c.status });
      }
      if (req.method === 'POST' && (mm = m(/^\/devices\/([\w-]+)\/revoke$/))) { if (!family) return send(401, { error: 'unauthorized' }); this.revoke(family, mm[1]!); return send(200, { ok: true }); }
      if (req.method === 'GET' && (mm = m(/^\/devices\/([\w-]+)\/journal$/))) { if (!family) return send(401, { error: 'unauthorized' }); return send(200, this.journal(family, mm[1]!)); }
      if (req.method === 'POST' && (mm = m(/^\/devices\/([\w-]+)\/time-requests$/))) {
        if (!dev || dev.id !== mm[1]) return send(401, { error: 'unauthorized' });
        return send(201, this.requestTime(dev.id, String(body.appId), Number(body.minutes), String(body.reason ?? '')));
      }
      if (req.method === 'POST' && (mm = m(/^\/time-requests\/([\w-]+)\/decision$/))) { if (!family) return send(401, { error: 'unauthorized' }); return send(200, this.decideTime(family, mm[1]!, body.approve === true)); }
      return send(404, { error: 'not_found' });
    } catch (e) {
      if (e instanceof HttpError) return send(e.code, { error: e.message });
      return send(500, { error: 'internal' }); // nunca vazar detalhes
    }
  }
}

export class HttpError extends Error { constructor(public code: number, m: string) { super(m); } }

function validatePayload(type: CommandType, p: Record<string, unknown>) {
  const bad = () => { throw new HttpError(400, 'invalid_payload'); };
  if (!['block_app', 'unblock_app', 'grant_time', 'revoke_time', 'set_rules'].includes(type)) bad();
  if (type !== 'set_rules' && !isAppId(p.appId)) bad();
  if (type === 'grant_time' && boundedInt(p.minutes, 1, 240) === null) bad();
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0; const chunks: Buffer[] = [];
  for await (const c of req) { size += (c as Buffer).length; if (size > 16_384) throw new HttpError(413, 'too_large'); chunks.push(c as Buffer); }
  try { const v = JSON.parse(Buffer.concat(chunks).toString() || '{}'); return typeof v === 'object' && v ? v : {}; } catch { throw new HttpError(400, 'bad_json'); }
}
