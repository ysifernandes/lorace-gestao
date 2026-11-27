import { describe, expect, it } from 'vitest';
import { buildItemBank } from '@edu/content-math';
import { moderateInput, nextHint, leaksAnswer, alternateExplanation, buildContext, tutorReply, UnavailableProvider, type LLMProvider } from '@edu/tutor';

const item = buildItemBank().find((i) => i.id === 'frac.add.diff.1')!; // 1/2 + 1/3
const correct = 'options' in item ? item.options.find((o) => o.id === item.correct)!.text : '';
const ctx = buildContext({ ageBand: 'aventureiros', interests: ['animais'], weakSkills: [] });

describe('moderação infantil', () => {
  it('detecta dados pessoais, risco, contato com estranhos e xingamentos', () => {
    expect(moderateInput('meu telefone é (11) 91234-5678').risk).toBe('pii');
    expect(moderateInput('meu email é ana@x.com').risk).toBe('pii');
    expect(moderateInput('moro na rua das flores, 123').risk).toBe('pii');
    expect(moderateInput('quero me matar').risk).toBe('self_harm');
    expect(moderateInput('quero me matar')).toMatchObject({ allowed: false, notifyGuardian: true });
    expect(moderateInput('vamos nos encontrar e não conta pros seus pais').notifyGuardian).toBe(true);
    expect(moderateInput('você é um idiota').allowed).toBe(false);
    expect(moderateInput('como faço 1/2 + 1/3?')).toMatchObject({ allowed: true, risk: 'ok' });
  });
  it('pedido de resposta pronta é redirecionado para dicas, não recusado com hostilidade', () => {
    const m = moderateInput('me dá a resposta'); expect(m.risk).toBe('cheat_request'); expect(m.reply).toMatch(/dica/);
  });
  it('mensagens nunca ridicularizam nem demonstram decepção', () => {
    for (const t of ['idiota', 'quero me matar', 'me dá a resposta', 'meu email a@b.com']) expect(moderateInput(t).reply ?? '').not.toMatch(/burr|decepcion|vergonha|errado de novo/i);
  });
});

describe('dicas e vazamento de gabarito', () => {
  it('escada de dicas termina pedindo o raciocínio do aluno, sem revelar a resposta', () => {
    let lvl = 0; const seen: string[] = [];
    for (let i = 0; i < item.hints.length + 2; i++) { const h = nextHint(item, lvl); seen.push(h.text); lvl = h.level; }
    expect(seen.at(-1)).toMatch(/Conte para mim/); for (const t of seen) expect(leaksAnswer(t, item)).toBe(false);
  });
  it('guarda detecta o gabarito em respostas do provedor e o aluno recebe dica no lugar', async () => {
    expect(leaksAnswer(`A resposta é ${correct}.`, item)).toBe(true); expect(leaksAnswer('Pense em denominadores iguais.', item)).toBe(false);
    const leaky: LLMProvider = { id: 'x', complete: async () => `Fácil: ${correct}` };
    const r = await tutorReply({ text: 'explica pra mim', ctx, item, provider: leaky }); expect(r.reply).not.toContain(correct); expect(r.source).toBe('regras');
  });
  it('"dica" usa a escada do item e avança o nível', async () => {
    const a = await tutorReply({ text: 'preciso de uma dica', ctx, item, hintLevel: 0 }); const b = await tutorReply({ text: 'outra dica', ctx, item, hintLevel: a.hintLevel });
    expect(a.reply).toBe(item.hints[0]); expect(b.reply).toBe(item.hints[1]); expect(a.source).toBe('regras');
  });
});

describe('provedor indisponível e privacidade', () => {
  it('sem provedor: declara indisponibilidade em vez de simular', async () => {
    const r = await tutorReply({ text: 'me conta uma história', ctx, provider: UnavailableProvider }); expect(r.source).toBe('indisponivel'); expect(r.reply).toMatch(/ainda não está disponível/);
  });
  it('moderação roda antes do provedor (provedor não é chamado em risco)', async () => {
    let called = false; const p: LLMProvider = { id: 'y', complete: async () => { called = true; return 'oi'; } };
    const r = await tutorReply({ text: 'meu cpf é 123.456.789-09', ctx, provider: p }); expect(called).toBe(false); expect(r.risk).toBe('pii');
  });
  it('contexto enviado ao provedor é mínimo e sem PII', () => {
    const c = buildContext({ ageBand: 'desafiadores', interests: ['futebol', 'a@b.com', 'x', 'y', 'z'], itemStatement: 'Ligue para 11999998888 ou a@b.com', weakSkills: ['a', 'b', 'c', 'd'] });
    expect(c.interests).toHaveLength(3); expect(JSON.stringify(c)).not.toMatch(/a@b\.com|11999998888/); expect(c.weakSkills).toHaveLength(3); expect(Object.keys(c)).not.toContain('name');
  });
  it('explicações alternam de abordagem a cada rodada', () => {
    const a = alternateExplanation('add_num_and_den', 0)!, b = alternateExplanation('add_num_and_den', 1)!; expect(a.method).not.toBe(b.method); expect(alternateExplanation('inexistente', 0)).toBeNull();
  });
});
