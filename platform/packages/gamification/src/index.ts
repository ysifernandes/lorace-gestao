import { sha256Hex } from '@edu/security/portable';

// ---------- XP: esforço, participação, progresso e compreensão (não só acerto/velocidade) ----------
export interface XpInput { effort: number; participation: number; progress: number; understanding: number }
const clamp01 = (x: number) => Math.min(1, Math.max(0, Number.isFinite(x) ? x : 0));

/** Pesos iguais; correção só entra via "understanding". Participação+esforço garantem piso (sem punir dificuldade). */
export function computeXp(i: XpInput, maxXp: number): number {
  const e = clamp01(i.effort), p = clamp01(i.participation), g = clamp01(i.progress), u = clamp01(i.understanding);
  const base = (e + p + g + u) / 4;
  const floor = e >= 0.5 && p >= 0.5 ? 0.3 : 0;
  return Math.round(maxXp * Math.max(base, floor));
}

/** Nível n começa em 50·n·(n−1) XP: 1→0, 2→100, 3→300 … */
export const xpToReachLevel = (level: number) => 50 * level * (level - 1);
export function levelFor(totalXp: number): number {
  let l = 1;
  while (totalXp >= xpToReachLevel(l + 1)) l++;
  return l;
}

/** Conversão configurável pelo responsável. `xpPerMinute` = XP necessários por minuto (ex.: 1, 2). */
export function minutesForXp(xp: number, xpPerMinute: number): number {
  if (!(xpPerMinute > 0)) throw new Error('xpPerMinute must be > 0');
  return Math.floor(Math.max(0, xp) / xpPerMinute);
}

// ---------- Carteira auditável (append-only, idempotente, encadeada por hash) ----------
export type Currency = 'xp' | 'minutes';
export interface Tx {
  seq: number; walletId: string; currency: Currency; delta: number; reason: string;
  idempotencyKey: string; createdAt: number; prevHash: string; hash: string;
}
export type PostResult = { tx: Tx; duplicate: boolean };

const GENESIS = '0'.repeat(64);
const hashTx = (t: Omit<Tx, 'hash'>) =>
  sha256Hex([t.prevHash, t.seq, t.walletId, t.currency, t.delta, t.reason, t.idempotencyKey, t.createdAt].join('|'));

export class InsufficientBalance extends Error {}

export class Ledger {
  private txs: Tx[] = [];
  private byKey = new Map<string, Tx>();
  constructor(private now: () => number = Date.now) {}

  balance(walletId: string, currency: Currency): number {
    return this.txs.filter((t) => t.walletId === walletId && t.currency === currency).reduce((s, t) => s + t.delta, 0);
  }

  post(walletId: string, currency: Currency, delta: number, reason: string, idempotencyKey: string): PostResult {
    if (!Number.isInteger(delta) || delta === 0) throw new Error('delta must be a non-zero integer');
    const dup = this.byKey.get(`${walletId}:${idempotencyKey}`);
    if (dup) {
      if (dup.delta !== delta || dup.currency !== currency || dup.reason !== reason) throw new Error('idempotency key reused with different payload');
      return { tx: dup, duplicate: true };
    }
    if (this.balance(walletId, currency) + delta < 0) throw new InsufficientBalance(`${currency} balance would go negative`);
    const prevHash = this.txs.at(-1)?.hash ?? GENESIS;
    const base = { seq: this.txs.length + 1, walletId, currency, delta, reason, idempotencyKey, createdAt: this.now(), prevHash };
    const tx: Tx = { ...base, hash: hashTx(base) };
    this.txs.push(tx);
    this.byKey.set(`${walletId}:${idempotencyKey}`, tx);
    return { tx, duplicate: false };
  }

  /** Concede minutos de entretenimento a partir de XP, respeitando o teto diário. Retorna minutos efetivamente creditados. */
  earnMinutes(walletId: string, xp: number, cfg: { xpPerMinute: number; dailyCapMinutes: number }, dayStart: number, key: string): number {
    const dup = this.byKey.get(`${walletId}:${key}`);
    if (dup) return dup.delta;
    const earnedToday = this.txs
      .filter((t) => t.walletId === walletId && t.currency === 'minutes' && t.reason === 'earn' && t.createdAt >= dayStart)
      .reduce((s, t) => s + t.delta, 0);
    const m = Math.min(minutesForXp(xp, cfg.xpPerMinute), Math.max(0, cfg.dailyCapMinutes - earnedToday));
    if (m <= 0) return 0;
    this.post(walletId, 'minutes', m, 'earn', key);
    return m;
  }

  spendMinutes(walletId: string, minutes: number, key: string): PostResult {
    return this.post(walletId, 'minutes', -minutes, 'spend', key);
  }

  /** Verifica integridade da cadeia; falha se qualquer transação for alterada/removida/reordenada. */
  verify(): boolean {
    let prev = GENESIS;
    return this.txs.every((t, i) => {
      const { hash, ...rest } = t;
      const ok = t.seq === i + 1 && t.prevHash === prev && hashTx(rest) === hash;
      prev = hash;
      return ok;
    });
  }
  /** Persistência (o armazenamento é responsável por não alterar as linhas; verify() detecta adulteração). */
  export(): Tx[] { return this.txs.map((t) => ({ ...t })); }
  static import(txs: Tx[], now: () => number = Date.now): Ledger { const l = new Ledger(now); l.txs = txs.map((t) => ({ ...t })); for (const t of l.txs) l.byKey.set(`${t.walletId}:${t.idempotencyKey}`, t); return l; }
  /** Somente para testes de adulteração. */
  _unsafeRaw(): Tx[] { return this.txs; }
}

/** Títulos de nível (editoriais, configuráveis). Nível acima da lista usa o último título. */
export const LEVEL_TITLES = ['Aprendiz Curioso', 'Descobridor', 'Desbravador', 'Navegador do Saber', 'Explorador do Conhecimento', 'Mestre das Ideias', 'Guardião do Saber'];
export const levelTitle = (level: number) => LEVEL_TITLES[Math.min(Math.max(level, 1), LEVEL_TITLES.length) - 1]!;
