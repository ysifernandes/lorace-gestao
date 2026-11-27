// Armazenamento LOCAL DE DESENVOLVIMENTO (navegador). Não é banco de produção nem Supabase.
// Toda a lógica de domínio vem de packages/* (a mesma testada em CI). Este arquivo só persiste e aplica permissões.
// Produção: trocar por repositório sobre Supabase/Postgres (migrations em database/migrations) — ver docs/ARCHITECTURE.md.
import { useSyncExternalStore } from 'react';
import type { CommandStatus, Role } from '@edu/types';
import { ageBandFor, type AgeBand } from '@edu/types';
import { ALL_SKILLS, MATH_SKILLS, buildItemBank, type Item, type Skill } from '@edu/content-math';
import { ContentCatalog, newLearner, recordResponse, nextDiagnosticItem, planPractice, reassessmentItems, takeSnapshot, buildReport, explanationFor, pendingExplanations, estimate, type LearnerState, type Response, type Scope, type SkillReport } from '@edu/learning';
import { Ledger, type Tx } from '@edu/gamification';
import { evaluate, localTime, transition, isTerminal, successStatusFor, type Rules } from '@edu/parental-control';
import { sha256Hex } from '@edu/security/portable';

export const DEV_ALLOW_DRAFT = true; // modo desenvolvimento: itens em rascunho são exibidos com aviso "em revisão"
export const MATH_IDS = MATH_SKILLS.map((s) => s.id);
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
const DAY = 86_400_000;

export interface User { id: string; role: Role; name: string; email: string; salt: string; hash: string; studentId?: string; schoolId?: string; familyId?: string }
export interface Session { kind: 'diagnostic' | 'practice' | 'reassessment'; itemIds: string[]; idx: number; results: boolean[]; startedAt: number }
export interface Student {
  id: string; familyId: string; userId?: string; name: string; birthYear: number; bandOverride?: AgeBand; avatar: { color: string; face: string; spec?: import('../ui/art').AvatarSpec }; interests: string[];
  learner: LearnerState; diagDone: boolean; practiceRounds: number; reassessRounds: number; session?: Session; shownExplanations: string[];
  rewards: { xpPerMinute: number; dailyCapMinutes: number }; ledger: Tx[]; schoolCode: string; games?: Record<string, { plays: number; bestStars: number }>;
}
export interface Device { id: string; familyId: string; studentId: string; name: string; platform: 'android' | 'ios'; online: boolean; permissionOk: boolean; lastHeartbeat: number | null; apps: { id: string; label: string; essential?: boolean }[]; rules: Rules }
export interface Cmd { id: string; deviceId: string; type: 'block_app' | 'unblock_app' | 'grant_time'; appId: string; minutes?: number; status: CommandStatus; history: { status: CommandStatus; at: number; detail?: string }[]; createdAt: number; expiresAt: number }
export interface TimeReq { id: string; studentId: string; deviceId: string; appId: string; minutes: number; reason: string; status: 'pending' | 'approved' | 'denied'; at: number }
export interface Consent { id: string; studentId: string; purpose: 'share_progress_with_school'; grantedBy: string; at: number; revokedAt?: number }
export interface PlanCfg { id: string; name: string; audience: 'family' | 'school'; priceCents: number | null; currency: string; limits: Record<string, number | null>; billing: string; active: boolean }
export interface AuditRow { at: number; actor: string; action: string; detail: string }
export interface DB {
  v: 1; users: User[]; families: { id: string; name: string }[]; students: Student[]; schools: { id: string; name: string }[];
  classes: { id: string; schoolId: string; name: string; teacherIds: string[] }[]; enrollments: { id: string; studentId: string; classId: string; schoolId: string }[]; consents: Consent[];
  devices: Device[]; pairing: { code: string; familyId: string; studentId: string; expires: number }[]; commands: Cmd[]; timeRequests: TimeReq[];
  exams: { id: string; studentId: string; title: string; date: string; skillIds: string[] }[]; reinforcement: { id: string; studentId: string; teacherId: string; skillIds: string[]; count: number; note: string; at: number }[];
  catalog: ReturnType<ContentCatalog['toJSON']>; plans: PlanCfg[]; audit: AuditRow[]; sessionUserId?: string; demoSeeded: boolean;
}

// ---------- persistência com fallback em memória ----------
const KEY = 'edu-platform-dev-v1'; let mem: string | null = null;
const read = () => { try { return localStorage.getItem(KEY); } catch { return mem; } };
const write = (s: string) => { mem = s; try { localStorage.setItem(KEY, s); } catch { /* sem armazenamento: segue em memória */ } };
function fresh(): DB {
  return { v: 1, users: [], families: [], students: [], schools: [], classes: [], enrollments: [], consents: [], devices: [], pairing: [], commands: [], timeRequests: [], exams: [], reinforcement: [],
    catalog: new ContentCatalog(buildItemBank(), Date.now, { allowDraft: true }).toJSON(), audit: [], demoSeeded: false,
    plans: [
      { id: 'family_free', name: 'Família — gratuito', audience: 'family', priceCents: null, currency: 'BRL', limits: { children: null, devices: null, dailyActivities: null }, billing: 'a definir', active: false },
      { id: 'family_single', name: 'Individual', audience: 'family', priceCents: null, currency: 'BRL', limits: { children: null, devices: null }, billing: 'a definir', active: false },
      { id: 'family_plus', name: 'Familiar', audience: 'family', priceCents: null, currency: 'BRL', limits: { children: null, devices: null }, billing: 'a definir', active: false },
      { id: 'family_max', name: 'Familiar ampliado', audience: 'family', priceCents: null, currency: 'BRL', limits: { children: null, devices: null }, billing: 'a definir', active: false },
      { id: 'school_active_student', name: 'Escola — por aluno ativo', audience: 'school', priceCents: null, currency: 'BRL', limits: { seats: null }, billing: 'critério de "aluno ativo" a definir', active: false },
    ] };
}
let db: DB = (() => { try { const r = read(); if (r) { const d = JSON.parse(r) as DB; if (d.v === 1) return d; } } catch { /* corrompido: recomeça */ } return fresh(); })();
let version = 0; const subs = new Set<() => void>();
export function update(fn: (d: DB) => void) { fn(db); version++; write(JSON.stringify(db)); subs.forEach((s) => s()); }
export function useDB(): DB { useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, () => version); return db; }
export const getDB = () => db;
export function resetAll() { db = fresh(); version++; write(JSON.stringify(db)); subs.forEach((s) => s()); }
const log = (d: DB, actor: string, action: string, detail = '') => d.audit.push({ at: Date.now(), actor, action, detail });

// ---------- autenticação local (PBKDF2) ----------
async function pbkdf2(pw: string, salt: string) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) { let h = sha256Hex(`${salt}:${pw}`); for (let i = 0; i < 20_000; i++) h = sha256Hex(`${h}${salt}`); return h; } // contexto não seguro (ex.: http local): derivação mais fraca, SOMENTE desenvolvimento
  const key = await subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120_000 }, key, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}
export async function register(o: { role: Role; name: string; email: string; password: string; familyId?: string; schoolId?: string; studentId?: string }): Promise<User> {
  const email = o.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('E-mail inválido.');
  if (o.password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
  if (!o.name.trim()) throw new Error('Informe o nome.');
  if (db.users.some((u) => u.email === email)) throw new Error('Já existe uma conta com este e-mail.');
  const salt = uid(); const hash = await pbkdf2(o.password, salt);
  const u: User = { id: uid(), role: o.role, name: o.name.trim(), email, salt, hash, familyId: o.familyId, schoolId: o.schoolId, studentId: o.studentId };
  update((d) => { d.users.push(u); log(d, u.id, 'register', o.role); }); return u;
}
export async function login(email: string, password: string): Promise<User> {
  const u = db.users.find((x) => x.email === email.trim().toLowerCase());
  const ok = u && (await pbkdf2(password, u.salt)) === u.hash;
  if (!u || !ok) throw new Error('E-mail ou senha incorretos.');
  update((d) => { d.sessionUserId = u.id; log(d, u.id, 'login'); }); return u;
}
export const logout = () => update((d) => { d.sessionUserId = undefined; });
export const currentUser = (d: DB) => d.users.find((u) => u.id === d.sessionUserId);

// ---------- escopo de dados (permissões) ----------
export const bandOf = (s: Student): AgeBand => s.bandOverride ?? ageBandFor(new Date().getFullYear() - s.birthYear) ?? 'aventureiros';
export const hasConsent = (d: DB, studentId: string) => d.consents.some((c) => c.studentId === studentId && c.purpose === 'share_progress_with_school' && !c.revokedAt);
export function visibleStudents(d: DB, u: User): { visible: Student[]; hiddenNoConsent: number } {
  if (u.role === 'guardian') return { visible: d.students.filter((s) => s.familyId === u.familyId), hiddenNoConsent: 0 };
  if (u.role === 'student') return { visible: d.students.filter((s) => s.id === u.studentId), hiddenNoConsent: 0 };
  if (u.role === 'teacher' || u.role === 'school_manager') {
    const classIds = d.classes.filter((c) => c.schoolId === u.schoolId && (u.role === 'school_manager' || c.teacherIds.includes(u.id))).map((c) => c.id);
    const enrolled = [...new Set(d.enrollments.filter((e) => classIds.includes(e.classId)).map((e) => e.studentId))];
    const vis = enrolled.filter((id) => hasConsent(d, id)); return { visible: d.students.filter((s) => vis.includes(s.id)), hiddenNoConsent: enrolled.length - vis.length };
  }
  return { visible: [], hiddenNoConsent: 0 }; // super_admin: nenhum dado de criança (minimização)
}
export const canSee = (d: DB, u: User, studentId: string) => visibleStudents(d, u).visible.some((s) => s.id === studentId);

// ---------- catálogo / escopo pedagógico ----------
export function catalog() { return ContentCatalog.fromJSON(db.catalog, Date.now, { allowDraft: DEV_ALLOW_DRAFT }); }
export function commitCatalog(c: ContentCatalog) { update((d) => { d.catalog = c.toJSON(); }); }
export function scope(): Scope { return { skills: MATH_SKILLS, items: catalog().servable().filter((i) => MATH_IDS.includes(i.skillId)) }; }
export const itemById = (id: string) => catalog().get(id);
export const skillName = (id: string) => ALL_SKILLS.find((s) => s.id === id)?.name ?? id;

// ---------- aluno: carteira, jornada ----------
const ledgerOf = (s: Student) => Ledger.import(s.ledger, Date.now);
export const balances = (s: Student) => { const l = ledgerOf(s); return { xp: l.balance(s.id, 'xp'), minutes: l.balance(s.id, 'minutes'), verified: l.verify() }; };
export const levelInfo = (xp: number) => { let lv = 1; while (xp >= 50 * (lv + 1) * lv) lv++; const lo = 50 * lv * (lv - 1), hi = 50 * (lv + 1) * lv; return { level: lv, into: xp - lo, span: hi - lo }; };

export function addStudent(familyId: string, o: { name: string; birthYear: number; interests: string[] }): Student {
  const s: Student = { id: uid(), familyId, name: o.name.trim(), birthYear: o.birthYear, avatar: { color: '#6d3df2', face: '🙂' }, interests: o.interests, learner: newLearner(''), diagDone: false, practiceRounds: 0, reassessRounds: 0,
    shownExplanations: [], rewards: { xpPerMinute: 1, dailyCapMinutes: 60 }, ledger: [], schoolCode: Math.random().toString(36).slice(2, 8).toUpperCase() };
  s.learner.studentId = s.id; update((d) => { d.students.push(s); log(d, familyId, 'add_student', s.id); }); return s;
}
export function setConsent(studentId: string, actorId: string, grant: boolean) {
  update((d) => { if (grant) { if (!hasConsent(d, studentId)) d.consents.push({ id: uid(), studentId, purpose: 'share_progress_with_school', grantedBy: actorId, at: Date.now() }); } else d.consents.filter((c) => c.studentId === studentId && !c.revokedAt).forEach((c) => (c.revokedAt = Date.now())); log(d, actorId, grant ? 'consent_grant' : 'consent_revoke', studentId); });
}
const studentOf = (id: string) => db.students.find((s) => s.id === id)!;
export function startSession(studentId: string, kind: Session['kind']) {
  const s = studentOf(studentId); const sc = scope(); const now = Date.now();
  update(() => {
    if (kind === 'diagnostic') s.session = { kind, itemIds: [], idx: 0, results: [], startedAt: now };
    else if (kind === 'practice') s.session = { kind, itemIds: planPractice(s.learner, sc, MATH_IDS, 8, now).map((p) => p.item.id), idx: 0, results: [], startedAt: now };
    else { const rep = buildReport(s.learner, sc, MATH_IDS, now); const weak = rep.filter((r) => r.state === 'needs_support' || (r.evidenceCount >= 2 && r.probability < 0.6) || r.causes.some((c) => c.kind === 'misconception' && c.status === 'confirmada')).map((r) => r.skillId).slice(0, 4);
      s.session = { kind, itemIds: reassessmentItems(s.learner, sc, weak.length ? weak : MATH_IDS.slice(0, 2), 2).map((i) => i.id), idx: 0, results: [], startedAt: now }; }
  });
}
/** Próximo item da sessão (diagnóstica: adaptativo; demais: lista fixa). */
export function currentItem(studentId: string): Item | null {
  const s = studentOf(studentId); const ses = s.session; if (!ses) return null;
  if (ses.kind === 'diagnostic') { const n = nextDiagnosticItem(s.learner, scope(), { targets: MATH_IDS, maxItems: 24 }); return n?.item ?? null; }
  const id = ses.itemIds[ses.idx]; return id ? itemById(id) : null;
}
export function answer(studentId: string, item: Item, resp: Response, hintsUsed: number) {
  const s = studentOf(studentId); const ses = s.session!; const now = Date.now();
  const phase = ses.kind; const r = recordResponse(s.learner, item, resp, { hintsUsed, at: now, phase });
  let minutes = 0;
  update(() => {
    s.learner = r.state; ses.results.push(r.grade.correct); ses.idx++;
    const l = ledgerOf(s); const key = `${item.id}@${now}`;
    l.post(s.id, 'xp', Math.max(1, r.xp), 'activity', `xp:${key}`);
    minutes = l.earnMinutes(s.id, Math.max(1, r.xp), s.rewards, new Date().setHours(0, 0, 0, 0), `min:${key}`); s.ledger = l.export();
  });
  return { grade: r.grade, xp: r.xp, minutes };
}
/** Rodada de minigame: registra evidência (tipo "game"), XP e minutos pelo mesmo motor e carteira das demais atividades. */
export function answerGame(studentId: string, item: Item, resp: Response, hintsUsed: number) {
  const s = studentOf(studentId); const now = Date.now(); const r = recordResponse(s.learner, item, resp, { hintsUsed, at: now, phase: 'game' }); let minutes = 0;
  update(() => { s.learner = r.state; const l = ledgerOf(s); const key = `${item.id}@${now}`; l.post(s.id, 'xp', Math.max(1, r.xp), 'activity', `xp:${key}`); minutes = l.earnMinutes(s.id, Math.max(1, r.xp), s.rewards, new Date().setHours(0, 0, 0, 0), `min:${key}`); s.ledger = l.export(); });
  return { grade: r.grade, xp: r.xp, minutes };
}
export function finishGame(studentId: string, gameId: string, stars: number) { const s = studentOf(studentId); update(() => { const g = (s.games ??= {}); const c = (g[gameId] ??= { plays: 0, bestStars: 0 }); c.plays++; c.bestStars = Math.max(c.bestStars, stars); }); }
export function finishSession(studentId: string) {
  const s = studentOf(studentId); const ses = s.session!; const now = Date.now();
  update(() => {
    if (ses.kind === 'diagnostic') { s.diagDone = true; s.learner = takeSnapshot(s.learner, MATH_IDS, 'Diagnóstico', now); }
    else if (ses.kind === 'practice') { s.practiceRounds++; s.learner = takeSnapshot(s.learner, MATH_IDS, `Prática ${s.practiceRounds}`, now); }
    else { s.reassessRounds++; s.learner = takeSnapshot(s.learner, MATH_IDS, `Reavaliação ${s.reassessRounds}`, now); }
    s.session = undefined;
  });
}
export const abandonSession = (studentId: string) => update(() => { studentOf(studentId).session = undefined; });
export const reportFor = (s: Student): SkillReport[] => buildReport(s.learner, scope(), MATH_IDS, Date.now(), catalog().all());
export function nextExplanation(studentId: string) {
  const s = studentOf(studentId); const pend = pendingExplanations(s.learner)[0] ?? Object.values(s.learner.hypotheses).find((h) => h.status === 'confirmed' && !s.shownExplanations.includes(h.id)); if (!pend) return null;
  const e = explanationFor(s.learner, pend.id); if (!e) return null;
  update(() => { s.learner = e.state; s.shownExplanations.push(pend.id); }); return { misconceptionId: pend.id, ...e };
}
export const pendingExplanationCount = (s: Student) => pendingExplanations(s.learner).length;
export function addExam(studentId: string, title: string, date: string, skillIds: string[]) { update((d) => { d.exams.push({ id: uid(), studentId, title: title.trim(), date, skillIds }); }); }
export const setAvatar = (studentId: string, spec: import('../ui/art').AvatarSpec) => update(() => { studentOf(studentId).avatar.spec = spec; });
export const setRewards = (studentId: string, xpPerMinute: number, dailyCapMinutes: number) => update(() => { studentOf(studentId).rewards = { xpPerMinute, dailyCapMinutes }; });
export function createReinforcement(studentId: string, teacherId: string, skillIds: string[], count: number, note: string) { update((d) => { d.reinforcement.push({ id: uid(), studentId, teacherId, skillIds, count, note, at: Date.now() }); log(d, teacherId, 'reinforcement', studentId); }); }

// ---------- controle parental (SIMULADO no navegador; protocolo real validado em tests/poc, nativo pendente) ----------
export const SIM_APPS = [
  { id: 'com.google.android.youtube', label: 'YouTube (simulado)' }, { id: 'com.exemplo.jogo.blocos', label: 'Jogo Blocos (simulado)' }, { id: 'com.exemplo.navegador', label: 'Navegador (simulado)' },
  { id: 'com.exemplo.mensagens', label: 'Mensagens (simulado)', essential: true }, { id: 'com.android.dialer', label: 'Telefone / Emergência', essential: true },
];
const emptyRules = (): Rules => ({ blockedApps: [], essentialApps: SIM_APPS.filter((a) => a.essential).map((a) => a.id), restrictedInWindows: [], windows: [], grants: [] });
export function startPairing(familyId: string, studentId: string) { const code = Math.random().toString(36).slice(2, 10).toUpperCase(); update((d) => { d.pairing.push({ code, familyId, studentId, expires: Date.now() + 10 * 60_000 }); }); return code; }
export function completePairing(code: string, platform: 'android' | 'ios', name: string) {
  const p = db.pairing.find((x) => x.code === code.trim().toUpperCase());
  if (!p || p.expires < Date.now()) throw new Error('Código inválido ou expirado.');
  const dev: Device = { id: uid(), familyId: p.familyId, studentId: p.studentId, name, platform, online: true, permissionOk: true, lastHeartbeat: Date.now(), apps: SIM_APPS, rules: emptyRules() };
  update((d) => { d.pairing = d.pairing.filter((x) => x.code !== p.code); d.devices.push(dev); }); return dev;
}
const push = (c: Cmd, status: CommandStatus, detail?: string) => { c.status = transition(c.status, status); c.history.push({ status, at: Date.now(), detail }); };
export function issueCommand(deviceId: string, type: Cmd['type'], appId: string, minutes?: number) {
  const dev = db.devices.find((d) => d.id === deviceId)!; if (dev.rules.essentialApps.includes(appId)) throw new Error('Apps essenciais (telefone, emergência) nunca são bloqueados.');
  const c: Cmd = { id: uid(), deviceId, type, appId, minutes, status: 'pending', history: [{ status: 'pending', at: Date.now() }], createdAt: Date.now(), expiresAt: Date.now() + DAY };
  update((d) => { d.commands.push(c); }); sweep(); return c;
}
export function sweep() {
  const now = Date.now();
  update((d) => { for (const c of d.commands) { if (isTerminal(c.status)) continue; const dev = d.devices.find((x) => x.id === c.deviceId)!;
    if (now > c.expiresAt) { push(c, 'expired'); continue; }
    if (c.status === 'pending' && (!dev.online || !dev.lastHeartbeat || now - dev.lastHeartbeat > 90_000)) push(c, 'device_offline'); } });
}
/** Lado do "dispositivo" simulado: recebe, aplica (se houver permissão) e confirma. */
export function simulatorSync(deviceId: string) {
  const dev = db.devices.find((d) => d.id === deviceId)!; if (!dev.online) return;
  update((d) => { dev.lastHeartbeat = Date.now();
    for (const c of d.commands.filter((x) => x.deviceId === deviceId && !isTerminal(x.status))) {
      if (Date.now() > c.expiresAt) { push(c, 'expired'); continue; }
      push(c, 'received');
      if (!dev.permissionOk) { push(c, 'permission_unavailable', 'serviço de acessibilidade desativado (simulado)'); continue; }
      if (c.type === 'block_app') { dev.rules.blockedApps = [...new Set([...dev.rules.blockedApps, c.appId])]; dev.rules.grants = dev.rules.grants.filter((g) => g.appId !== c.appId); }
      else if (c.type === 'unblock_app') dev.rules.blockedApps = dev.rules.blockedApps.filter((a) => a !== c.appId);
      else dev.rules.grants.push({ appId: c.appId, untilMs: Date.now() + (c.minutes ?? 0) * 60_000 });
      push(c, successStatusFor(c.type) === 'block_applied' && c.type !== 'block_app' ? 'unblock_applied' : successStatusFor(c.type));
    } });
}
export const setSim = (deviceId: string, patch: Partial<Pick<Device, 'online' | 'permissionOk'>>) => update(() => { Object.assign(db.devices.find((d) => d.id === deviceId)!, patch); });
export const appState = (dev: Device, appId: string) => evaluate(dev.rules, appId, localTime(Date.now(), -new Date().getTimezoneOffset()));
export function requestTime(studentId: string, deviceId: string, appId: string, minutes: number, reason: string) { update((d) => { d.timeRequests.push({ id: uid(), studentId, deviceId, appId, minutes, reason: reason.slice(0, 300), status: 'pending', at: Date.now() }); }); }
export function decideTime(id: string, approve: boolean) { const r = db.timeRequests.find((x) => x.id === id)!; update(() => { r.status = approve ? 'approved' : 'denied'; }); if (approve) { issueCommand(r.deviceId, 'grant_time', r.appId, r.minutes); simulatorSync(r.deviceId); } }

// ---------- escola ----------
export function enrollByCode(schoolId: string, classId: string, code: string) {
  const s = db.students.find((x) => x.schoolCode === code.trim().toUpperCase()); if (!s) throw new Error('Código de vínculo não encontrado.');
  if (db.enrollments.some((e) => e.studentId === s.id && e.classId === classId)) throw new Error('Aluno já está nesta turma.');
  update((d) => { d.enrollments.push({ id: uid(), studentId: s.id, classId, schoolId }); }); return s;
}
export function addClass(schoolId: string, name: string, teacherIds: string[]) { update((d) => { d.classes.push({ id: uid(), schoolId, name: name.trim(), teacherIds }); }); }

// ---------- dados de demonstração (contas + vínculos; NENHUM resultado pedagógico) ----------
export const DEMO_PASSWORD = 'demo12345';
export async function seedDemo() {
  if (db.demoSeeded) return;
  const fam = { id: uid(), name: 'Família Demonstração' }, school = { id: uid(), name: 'Escola Demonstração' };
  update((d) => { d.families.push(fam); d.schools.push(school); d.demoSeeded = true; });
  const g = await register({ role: 'guardian', name: 'Responsável Demo', email: 'responsavel@demo.local', password: DEMO_PASSWORD, familyId: fam.id });
  const luna = addStudent(fam.id, { name: 'Luna', birthYear: new Date().getFullYear() - 9, interests: ['animais', 'desenho'] });
  const davi = addStudent(fam.id, { name: 'Davi', birthYear: new Date().getFullYear() - 13, interests: ['futebol', 'jogos'] });
  const caio = addStudent(fam.id, { name: 'Caio', birthYear: new Date().getFullYear() - 6, interests: ['dinossauros'] });
  const bia = addStudent(fam.id, { name: 'Bia', birthYear: new Date().getFullYear() - 16, interests: ['música'] });
  for (const [s, e] of [[luna, 'luna'], [davi, 'davi'], [caio, 'caio'], [bia, 'bia']] as const) { const u = await register({ role: 'student', name: s.name, email: `${e}@demo.local`, password: DEMO_PASSWORD, studentId: s.id, familyId: fam.id }); update(() => { s.userId = u.id; }); }
  const t = await register({ role: 'teacher', name: 'Professora Demo', email: 'professora@demo.local', password: DEMO_PASSWORD, schoolId: school.id });
  await register({ role: 'school_manager', name: 'Gestora Demo', email: 'gestora@demo.local', password: DEMO_PASSWORD, schoolId: school.id });
  await register({ role: 'super_admin', name: 'Administrador Demo', email: 'admin@demo.local', password: DEMO_PASSWORD });
  await register({ role: 'super_admin', name: 'Revisor Demo', email: 'revisor@demo.local', password: DEMO_PASSWORD });
  addClass(school.id, '5º ano A', [t.id]);
  const cls = db.classes[0]!; enrollByCode(school.id, cls.id, luna.schoolCode); enrollByCode(school.id, cls.id, davi.schoolCode);
  setConsent(luna.id, g.id, true); // só a Luna tem consentimento: o Davi aparece como "sem consentimento" para a escola
}
export function adultsOf(d: DB, schoolId?: string) { return d.users.filter((u) => u.role === 'teacher' && u.schoolId === schoolId); }
export { estimate };
export type { SkillReport, Skill };
