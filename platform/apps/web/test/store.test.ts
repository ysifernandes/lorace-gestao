import { beforeEach, describe, expect, it } from 'vitest';
import * as S from '../src/store/db';

const reset = () => S.resetAll();
async function world() { reset(); await S.seedDemo(); const d = S.getDB(); const by = (e: string) => d.users.find((u) => u.email === e)!; return { d, by }; }

describe('autenticação local', () => {
  beforeEach(reset);
  it('registra, valida e autentica; senha nunca em claro; erros genéricos', async () => {
    await expect(S.register({ role: 'guardian', name: 'A', email: 'ruim', password: '12345678' })).rejects.toThrow(/E-mail/);
    await expect(S.register({ role: 'guardian', name: 'A', email: 'a@x.com', password: 'curta' })).rejects.toThrow(/8 caracteres/);
    const u = await S.register({ role: 'guardian', name: 'Ana', email: 'A@X.com', password: 'senhaforte1' });
    expect(JSON.stringify(S.getDB())).not.toContain('senhaforte1'); expect(u.hash).toHaveLength(64);
    await expect(S.register({ role: 'guardian', name: 'Ana', email: 'a@x.com', password: 'outrasenha1' })).rejects.toThrow(/Já existe/);
    await expect(S.login('a@x.com', 'errada1234')).rejects.toThrow('E-mail ou senha incorretos.');
    await expect(S.login('naoexiste@x.com', 'senhaforte1')).rejects.toThrow('E-mail ou senha incorretos.'); // mesma mensagem: não revela se o e-mail existe
    expect((await S.login('a@x.com', 'senhaforte1')).id).toBe(u.id);
  });
});

describe('permissões e escopo de dados', () => {
  it('responsável vê só os filhos; admin não vê dado de criança; aluno só vê a si', async () => {
    const { d, by } = await world();
    expect(S.visibleStudents(d, by('responsavel@demo.local')).visible.map((s) => s.name).sort()).toEqual(['Bia', 'Caio', 'Davi', 'Luna', 'Malu', 'Teo']);
    expect(S.visibleStudents(d, by('admin@demo.local')).visible).toHaveLength(0);
    expect(S.visibleStudents(d, by('luna@demo.local')).visible.map((s) => s.name)).toEqual(['Luna']);
  });
  it('escola só vê aluno matriculado COM consentimento; revogar remove o acesso; professor só das suas turmas', async () => {
    const { d, by } = await world(); const t = by('professora@demo.local'), m = by('gestora@demo.local'), g = by('responsavel@demo.local');
    const names = (u: typeof t) => S.visibleStudents(S.getDB(), u).visible.map((s) => s.name);
    expect(names(t)).toEqual(['Luna']); expect(S.visibleStudents(d, t).hiddenNoConsent).toBe(1); // Davi matriculado, sem consentimento
    const davi = d.students.find((s) => s.name === 'Davi')!; S.setConsent(davi.id, g.id, true); expect(names(t).sort()).toEqual(['Davi', 'Luna']);
    S.setConsent(davi.id, g.id, false); expect(names(m)).toEqual(['Luna']);
    const caio = d.students.find((s) => s.name === 'Caio')!; S.setConsent(caio.id, g.id, true); expect(names(t)).not.toContain('Caio'); // consentiu mas não está matriculado
    const other = { ...t, id: 'outro', schoolId: 'outra-escola' }; expect(names(other)).toEqual([]);
    expect(S.canSee(S.getDB(), t, davi.id)).toBe(false);
  });
});

describe('jornada persistida e carteira', () => {
  it('responder atividade registra evidência, XP e minutos respeitando o teto diário', async () => {
    const { d } = await world(); const luna = d.students.find((s) => s.name === 'Luna')!;
    S.setRewards(luna.id, 1, 5); S.startSession(luna.id, 'diagnostic');
    for (let i = 0; i < 4; i++) { const it = S.currentItem(luna.id)!; S.answer(luna.id, it, it.kind === 'multiple_choice' || it.kind === 'word_problem' || it.kind === 'reasoning' ? { choice: it.correct } : { text: 'x' }, 0); }
    const b = S.balances(luna); expect(luna.learner.responses).toHaveLength(4); expect(b.xp).toBeGreaterThan(0); expect(b.minutes).toBeLessThanOrEqual(5); expect(b.verified).toBe(true);
    luna.ledger[0]!.delta = 9999; expect(S.balances(luna).verified).toBe(false); // adulteração detectada
  });
});

describe('controle parental simulado (estados reais)', () => {
  it('pendente → offline → recebido → aplicado; perda de permissão; essenciais; concessão com expiração', async () => {
    const { d } = await world(); const luna = d.students.find((s) => s.name === 'Luna')!;
    const code = S.startPairing(luna.familyId, luna.id); expect(() => S.completePairing('ERRADO12', 'android', 'x')).toThrow(/inválido/);
    const dev = S.completePairing(code, 'android', 'Cel'); expect(() => S.completePairing(code, 'android', 'x')).toThrow(); // uso único
    const yt = 'com.google.android.youtube';
    const c = S.issueCommand(dev.id, 'block_app', yt); expect(c.status).toBe('pending'); expect(S.appState(dev, yt).allowed).toBe(true); // nada aplicado ainda
    S.setSim(dev.id, { online: false }); dev.lastHeartbeat = Date.now() - 200_000; S.sweep(); expect(c.status).toBe('device_offline');
    S.setSim(dev.id, { online: true }); S.simulatorSync(dev.id); expect(c.status).toBe('block_applied'); expect(S.appState(dev, yt).allowed).toBe(false);
    S.setSim(dev.id, { permissionOk: false }); const c2 = S.issueCommand(dev.id, 'block_app', 'com.exemplo.navegador'); S.simulatorSync(dev.id); expect(c2.status).toBe('permission_unavailable');
    expect(() => S.issueCommand(dev.id, 'block_app', 'com.android.dialer')).toThrow(/essenciais/);
    S.setSim(dev.id, { permissionOk: true }); S.requestTime(luna.id, dev.id, yt, 10, 'terminar'); const r = S.getDB().timeRequests[0]!; S.decideTime(r.id, true);
    expect(S.appState(dev, yt)).toMatchObject({ allowed: true, reason: 'grant' }); dev.rules.grants[0]!.untilMs = Date.now() - 1; expect(S.appState(dev, yt).allowed).toBe(false); // reaplica ao expirar
  });
});

describe('personalização por idade, interesses e maturidade', () => {
  const mk = async () => { const { d } = await world(); const by = (n: string) => d.students.find((x) => x.name === n)!; return { d, by }; };
  it('faixa vem da idade informada pelo responsável e atualiza com o ano', async () => {
    const { by } = await mk(); const y = new Date().getFullYear();
    expect([by('Caio'), by('Luna'), by('Malu'), by('Teo')].map((s) => S.bandOf(s))).toEqual(['exploradores', 'aventureiros', 'desafiadores', 'estrategistas']);
    const luna = by('Luna'); luna.birthYear = y - 11; expect(S.bandOf(luna)).toBe('desafiadores'); // aniversário muda a faixa sem ninguém configurar
  });
  it('ajuste de maturidade move UMA faixa e respeita travas de segurança', async () => {
    const { by } = await mk(); const y = new Date().getFullYear();
    const malu = by('Malu'); S.setProfile(malu.id, { maturity: 'tranquilo' }); expect(S.bandOf(malu)).toBe('aventureiros'); S.setProfile(malu.id, { maturity: 'desafiador' }); expect(S.bandOf(malu)).toBe('desafiadores'); // 12 anos não vai para 14–17
    const luna = by('Luna'); S.setProfile(luna.id, { maturity: 'desafiador' }); expect(S.bandOf(luna)).toBe('desafiadores');
    const teo = by('Teo'); S.setProfile(teo.id, { maturity: 'tranquilo' }); expect(S.bandOf(teo)).toBe('desafiadores'); S.setProfile(teo.id, { maturity: 'desafiador' }); expect(S.bandOf(teo)).toBe('estrategistas');
    const caio = by('Caio'); S.setProfile(caio.id, { maturity: 'tranquilo' }); expect(S.bandOf(caio)).toBe('exploradores'); // já é a menor faixa
    const kid = by('Luna'); kid.birthYear = y - 9; kid.maturity = 'tranquilo'; expect(S.bandOf(kid)).toBe('exploradores'); kid.birthYear = y - 10; expect(S.bandOf(kid)).toBe('aventureiros'); // a faixa 5–7 só é usada até 9 anos
  });
  it('diagnóstico só mira habilidades compatíveis com a idade (e o conteúdo avançado existe para os mais velhos)', async () => {
    const { by } = await mk(); const caio = S.targetIds(by('Caio')), luna = S.targetIds(by('Luna')), teo = S.targetIds(by('Teo'));
    expect(caio).toContain('add.facts'); expect(caio).not.toContain('frac.simplify'); expect(caio).not.toContain('perc.of'); expect(luna).not.toContain('alg.eq1'); expect(luna).not.toContain('ratio.prop');
    for (const k of ['perc.of', 'perc.change', 'ratio.prop', 'alg.eq1', 'data.mean', 'fin.interest']) expect(teo).toContain(k);
    expect(teo.length).toBeGreaterThan(luna.length); expect(luna.length).toBeGreaterThan(caio.length);
  });
  it('cadastro inicial: aluno novo precisa se cadastrar; escolhe até 3 interesses; estilo é salvo', async () => {
    const { by } = await mk(); const teo = by('Teo'); expect(teo.onboarded).toBe(false); expect(by('Luna').onboarded).toBe(true);
    S.setProfile(teo.id, { interests: ['futebol', 'jogos', 'musica', 'espaco'], onboarded: true }); expect(teo.interests).toEqual(['futebol', 'jogos', 'musica']); expect(teo.onboarded).toBe(true);
  });
});
