import { describe, expect, it } from 'vitest';
import { Ledger, InsufficientBalance, computeXp, levelFor, minutesForXp, xpToReachLevel } from '@estuda/gamification';
import { canTransition, evaluate, inWindow, isTerminal, localTime, successStatusFor, transition, type Rules } from '@estuda/parental-control';
import { RateLimiter, boundedInt, isAppId, isUuid, canonicalize } from '@estuda/security';
import { ageBandFor } from '@estuda/types';

describe('XP e níveis', () => {
  it('não depende só de acerto: esforço+participação garantem piso mesmo com baixa compreensão', () => {
    expect(computeXp({ effort: 1, participation: 1, progress: 0, understanding: 0 }, 30)).toBeGreaterThanOrEqual(15);
    expect(computeXp({ effort: 0.6, participation: 0.6, progress: 0, understanding: 0 }, 30)).toBe(9);
    expect(computeXp({ effort: 0, participation: 0, progress: 1, understanding: 1 }, 30)).toBeLessThan(computeXp({ effort: 1, participation: 1, progress: 1, understanding: 1 }, 30));
    expect(computeXp({ effort: NaN, participation: 2, progress: -1, understanding: 1 }, 30)).toBeGreaterThanOrEqual(0);
  });
  it('níveis crescentes', () => {
    expect([0, 99, 100, 299, 300].map(levelFor)).toEqual([1, 1, 2, 2, 3]);
    expect(xpToReachLevel(3)).toBe(300);
  });
  it('conversão XP→minutos configurável', () => {
    expect(minutesForXp(30, 1)).toBe(30);
    expect(minutesForXp(30, 2)).toBe(15);
    expect(minutesForXp(31, 2)).toBe(15);
    expect(() => minutesForXp(10, 0)).toThrow();
  });
});

describe('Carteira (Ledger)', () => {
  const mk = () => { let t = 1000; return new Ledger(() => t++); };
  it('é idempotente: mesma chave não credita duas vezes', () => {
    const l = mk();
    expect(l.post('w', 'xp', 30, 'mission', 'k1').duplicate).toBe(false);
    expect(l.post('w', 'xp', 30, 'mission', 'k1').duplicate).toBe(true);
    expect(l.balance('w', 'xp')).toBe(30);
    expect(() => l.post('w', 'xp', 99, 'mission', 'k1')).toThrow(/different payload/);
  });
  it('não permite saldo negativo', () => {
    const l = mk();
    l.earnMinutes('w', 30, { xpPerMinute: 1, dailyCapMinutes: 60 }, 0, 'a');
    expect(() => l.spendMinutes('w', 31, 's1')).toThrow(InsufficientBalance);
    l.spendMinutes('w', 30, 's2');
    expect(l.balance('w', 'minutes')).toBe(0);
  });
  it('respeita teto diário', () => {
    const l = mk();
    const cfg = { xpPerMinute: 1, dailyCapMinutes: 45 };
    expect(l.earnMinutes('w', 30, cfg, 0, 'a')).toBe(30);
    expect(l.earnMinutes('w', 30, cfg, 0, 'b')).toBe(15);
    expect(l.earnMinutes('w', 30, cfg, 0, 'c')).toBe(0);
    expect(l.earnMinutes('w', 30, cfg, 0, 'b')).toBe(15); // retry idempotente
    expect(l.balance('w', 'minutes')).toBe(45);
  });
  it('detecta adulteração da cadeia', () => {
    const l = mk();
    l.post('w', 'xp', 10, 'a', '1'); l.post('w', 'xp', 10, 'b', '2'); l.post('w', 'xp', 10, 'c', '3');
    expect(l.verify()).toBe(true);
    l._unsafeRaw()[1]!.delta = 1000;
    expect(l.verify()).toBe(false);
  });
  it('carteiras são isoladas', () => {
    const l = mk(); l.post('a', 'xp', 5, 'x', '1');
    expect(l.balance('b', 'xp')).toBe(0);
  });
});

describe('Controle parental — estados e política', () => {
  it('transições válidas e inválidas', () => {
    expect(canTransition('pending', 'received')).toBe(true);
    expect(canTransition('pending', 'block_applied')).toBe(false); // não pode "aplicar" sem receber
    expect(() => transition('block_applied', 'pending')).toThrow();
    expect(isTerminal('expired')).toBe(true);
    expect(successStatusFor('block_app')).toBe('block_applied');
    expect(successStatusFor('grant_time')).toBe('unblock_applied');
  });
  const rules: Rules = {
    blockedApps: ['yt'], essentialApps: ['dialer'], restrictedInWindows: ['game'],
    windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '21:00', end: '07:00', kind: 'rest' }, { days: [1], start: '14:00', end: '15:00', kind: 'study' }],
    grants: [{ appId: 'yt', untilMs: 5000 }],
  };
  it('essencial nunca é bloqueado, mesmo em bloqueio total ou janela', () => {
    const r = { ...rules, blockedApps: ['dialer'] };
    expect(evaluate(r, 'dialer', { day: 1, minutes: 22 * 60, nowMs: 0 }).allowed).toBe(true);
  });
  it('concessão vence bloqueio até expirar', () => {
    expect(evaluate(rules, 'yt', { day: 2, minutes: 600, nowMs: 4000 }).reason).toBe('grant');
    expect(evaluate(rules, 'yt', { day: 2, minutes: 600, nowMs: 5000 }).reason).toBe('blocked_app');
  });
  it('janelas, inclusive noturnas que cruzam a meia-noite', () => {
    expect(inWindow(rules.windows[0]!, 3, 23 * 60)).toBe(true);
    expect(inWindow(rules.windows[0]!, 3, 3 * 60)).toBe(true);
    expect(inWindow(rules.windows[0]!, 3, 12 * 60)).toBe(false);
    expect(evaluate(rules, 'game', { day: 3, minutes: 23 * 60, nowMs: 0 }).reason).toBe('window');
    expect(evaluate(rules, 'game', { day: 3, minutes: 12 * 60, nowMs: 0 }).allowed).toBe(true);
    expect(evaluate(rules, 'outro', { day: 3, minutes: 23 * 60, nowMs: 0 }).allowed).toBe(true);
  });
  it('localTime aplica fuso', () => {
    const t = localTime(Date.UTC(2024, 0, 1, 2, 30), -180); // 23:30 de dom 31/12
    expect(t.minutes).toBe(23 * 60 + 30);
    expect(t.day).toBe(0);
  });
});

describe('Segurança — utilitários', () => {
  it('validadores', () => {
    expect(isUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    expect(isUuid("1'; drop table")).toBe(false);
    expect(isAppId('com.google.android.youtube')).toBe(true);
    expect(isAppId('a b; rm')).toBe(false);
    expect(boundedInt(5, 1, 10)).toBe(5);
    expect(boundedInt(1.5, 1, 10)).toBeNull();
  });
  it('canonicalize é estável', () => { expect(canonicalize({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe('{"a":[2,{"c":2,"d":1}],"b":1}'); });
  it('rate limiter recarrega', () => {
    const r = new RateLimiter(2, 1);
    expect([r.allow('k', 0), r.allow('k', 0), r.allow('k', 0), r.allow('k', 1500)]).toEqual([true, true, false, true]);
  });
  it('faixas etárias', () => {
    expect([5, 7, 8, 10, 11, 13, 14, 17].map((a) => ageBandFor(a))).toEqual(['exploradores', 'exploradores', 'aventureiros', 'aventureiros', 'desafiadores', 'desafiadores', 'estrategistas', 'estrategistas']);
    expect(ageBandFor(4)).toBeNull();
  });
});
