// AGENTE DE DISPOSITIVO SIMULADO — usado só para validar o PROTOCOLO servidor↔dispositivo em CI.
// NÃO é bloqueio nativo. Bloqueio real: native/android (Kotlin) e native/ios (Swift) — ainda NÃO testados em dispositivo.
import { NonceGuard, verify, type SignedEnvelope } from '@estuda/security';
import { evaluate, localTime, type Rules } from '@estuda/parental-control';

export interface Enforcer {
  available(): boolean;
  block(appId: string): void;
  unblock(appId: string): void;
}

export class FakeEnforcer implements Enforcer {
  blocked = new Set<string>();
  enabled = true;
  available() { return this.enabled; }
  block(a: string) { this.blocked.add(a); }
  unblock(a: string) { this.blocked.delete(a); }
}

export class SimulatedDevice {
  nonces = new NonceGuard();
  rules: Rules = { blockedApps: [], essentialApps: ['com.android.dialer'], restrictedInWindows: [], windows: [], grants: [] };
  constructor(
    public url: string, public deviceId: string, public token: string, public key: string,
    public enforcer: FakeEnforcer, public now: () => number,
  ) {}

  private async call(method: string, path: string, body?: unknown) {
    const r = await fetch(this.url + path, { method, headers: { authorization: `Bearer ${this.token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: (await r.json()) as any };
  }
  heartbeat() { return this.call('POST', `/devices/${this.deviceId}/heartbeat`, { capabilities: { usageAccess: this.enforcer.available(), enforcement: this.enforcer.available() } }); }
  ack(id: string, status: string, detail?: string) { return this.call('POST', `/devices/${this.deviceId}/commands/${id}/ack`, { status, detail }); }

  /** Decisão local de um app agora (continua valendo offline; é o que reaplica o bloqueio ao fim do tempo). */
  allowed(appId: string) { return evaluate(this.rules, appId, localTime(this.now(), -180)).allowed; }

  async syncOnce() {
    const { json: cmds } = await this.call('GET', `/devices/${this.deviceId}/commands`);
    for (const c of cmds as { id: string; envelope: SignedEnvelope<any> }[]) {
      const v = verify(this.key, c.envelope, { deviceId: this.deviceId, now: this.now(), nonces: this.nonces });
      if (!v.ok) { await this.ack(c.id, 'received').catch(() => {}); await this.ack(c.id, 'sync_failed', v.reason); continue; }
      await this.ack(c.id, 'received');
      const { type, payload } = c.envelope.body;
      if (!this.enforcer.available()) { await this.ack(c.id, 'permission_unavailable'); continue; }
      if (type === 'block_app') {
        this.rules.blockedApps.push(payload.appId); this.rules.grants = this.rules.grants.filter((g) => g.appId !== payload.appId);
        this.enforcer.block(payload.appId); await this.ack(c.id, 'block_applied');
      } else if (type === 'unblock_app') {
        this.rules.blockedApps = this.rules.blockedApps.filter((a) => a !== payload.appId);
        this.enforcer.unblock(payload.appId); await this.ack(c.id, 'unblock_applied');
      } else if (type === 'grant_time') {
        this.rules.grants.push({ appId: payload.appId, untilMs: this.now() + payload.minutes * 60_000 });
        this.enforcer.unblock(payload.appId); await this.ack(c.id, 'unblock_applied');
      }
    }
  }

  /** Chamado por timer local: reaplica bloqueio quando a concessão termina. */
  reconcile() {
    for (const a of this.rules.blockedApps) if (!this.allowed(a)) this.enforcer.block(a);
  }
}
