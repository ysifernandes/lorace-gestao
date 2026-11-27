import type { CommandStatus, CommandType } from '@edu/types';

// ---------- Máquina de estados de comandos remotos (estados reais, spec §14) ----------
const TRANSITIONS: Record<CommandStatus, CommandStatus[]> = {
  pending: ['received', 'device_offline', 'expired', 'sync_failed'],
  device_offline: ['received', 'expired', 'pending'],
  received: ['block_applied', 'unblock_applied', 'permission_unavailable', 'sync_failed'],
  sync_failed: ['pending', 'expired'],
  block_applied: [],
  unblock_applied: [],
  permission_unavailable: [],
  expired: [],
};
export const isTerminal = (s: CommandStatus) => TRANSITIONS[s].length === 0;
export const canTransition = (from: CommandStatus, to: CommandStatus) => TRANSITIONS[from].includes(to);
export function transition(from: CommandStatus, to: CommandStatus): CommandStatus {
  if (!canTransition(from, to)) throw new Error(`invalid command transition ${from} -> ${to}`);
  return to;
}
/** Status de sucesso esperado para cada tipo de comando. */
export function successStatusFor(type: CommandType): CommandStatus {
  return type === 'block_app' || type === 'revoke_time' || type === 'set_rules' ? 'block_applied' : 'unblock_applied';
}

// ---------- Avaliador de política (espelhado nativamente em Kotlin/Swift) ----------
export interface Window { /** 0=dom..6=sáb */ days: number[]; start: string; end: string; kind: 'study' | 'rest' | 'school' }
export interface Grant { appId: string | '*'; untilMs: number }
export interface Rules {
  blockedApps: string[];
  /** apps de estudo/essenciais; NUNCA bloqueados. Deve incluir telefone/emergência/SMS no dispositivo. */
  essentialApps: string[];
  /** em janelas study/rest/school, apps "de entretenimento" listados aqui ficam bloqueados */
  restrictedInWindows: string[];
  windows: Window[];
  grants: Grant[];
}
export type Decision = { allowed: boolean; reason: 'essential' | 'grant' | 'blocked_app' | 'window' | 'default_allow' };

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};
export function inWindow(w: Window, day: number, minutes: number): boolean {
  const s = toMin(w.start), e = toMin(w.end);
  if (s === e) return false;
  if (s < e) return w.days.includes(day) && minutes >= s && minutes < e;
  // janela noturna (ex.: 21:00–07:00): parte final pertence ao dia anterior
  return (w.days.includes(day) && minutes >= s) || (w.days.includes((day + 6) % 7) && minutes < e);
}

export function evaluate(rules: Rules, appId: string, at: { day: number; minutes: number; nowMs: number }): Decision {
  if (rules.essentialApps.includes(appId)) return { allowed: true, reason: 'essential' };
  if (rules.grants.some((g) => (g.appId === appId || g.appId === '*') && g.untilMs > at.nowMs)) return { allowed: true, reason: 'grant' };
  if (rules.blockedApps.includes(appId)) return { allowed: false, reason: 'blocked_app' };
  if (rules.restrictedInWindows.includes(appId) && rules.windows.some((w) => inWindow(w, at.day, at.minutes))) return { allowed: false, reason: 'window' };
  return { allowed: true, reason: 'default_allow' };
}

export function localTime(nowMs: number, tzOffsetMin: number) {
  const d = new Date(nowMs + tzOffsetMin * 60_000);
  return { day: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes(), nowMs };
}

// ---------- Capacidades por plataforma (documentadas; ver PARENTAL_CONTROL.md) ----------
export interface DeviceCapabilities {
  /** Android: acesso a uso concedido pelo usuário. iOS: autorização FamilyControls concedida. */
  usageAccess: boolean;
  /** Mecanismo de bloqueio efetivo disponível (Android: Accessibility+overlay concedidos; iOS: ManagedSettings autorizado). */
  enforcement: boolean;
}
export function canEnforce(c: DeviceCapabilities): boolean { return c.enforcement; }
