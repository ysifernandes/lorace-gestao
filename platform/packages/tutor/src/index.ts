// Arquitetura do tutor (axolote). NÃO há provedor de IA conectado: tudo aqui é regra determinística e testada; a conversa livre fica indisponível
// até existir provedor + moderação aprovada. Princípios: não entregar resposta pronta, dicas progressivas, linguagem por idade, minimização de dados.
import type { AgeBand } from '@edu/types';
import { EXPLANATIONS, MISCONCEPTIONS, type Item } from '@edu/content-math';

export type Risk = 'ok' | 'pii' | 'self_harm' | 'stranger_contact' | 'off_topic' | 'abuse' | 'cheat_request';
export interface Moderation { allowed: boolean; risk: Risk; /** avisar o responsável (sem expor o texto da criança, salvo política) */ notifyGuardian: boolean; reply?: string }

const RULES: { risk: Exclude<Risk, 'ok'>; re: RegExp }[] = [
  { risk: 'self_harm', re: /\b(me matar|quero morrer|me machucar|n[aã]o quero viver|suic[ií]d)/i },
  { risk: 'pii', re: /(\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b)|(\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b)|([\w.+-]+@[\w-]+\.[\w.]+)|(\b(rua|avenida|av\.)\s+[\wÀ-ú ]+,?\s*\d+)/i },
  { risk: 'stranger_contact', re: /(encontrar|me encontrar|marcar encontro|manda (foto|fotos)|tira a roupa|segredo (nosso|entre n[oó]s)|n[aã]o conta (pra|para) (ningu[eé]m|seus pais))/i },
  { risk: 'abuse', re: /\b(idiota|burro|imbecil|porra|caralho|merda)\b/i },
  { risk: 'cheat_request', re: /(d[aá] (a|só a) resposta|me diz (o )?resultado|faz (a|minha) (prova|tarefa) (pra|para) mim|qual [eé] a resposta)/i },
];
export const OFF_TOPIC = /(namor|dinheiro do pix|jogo de azar|apostas?|compr(ar|a) (agora|online))/i;

const SAFE: Record<Exclude<Risk, 'ok'>, string> = {
  self_harm: 'Sinto muito que você esteja se sentindo assim. Você é importante. Converse agora com um adulto de confiança; vou avisar seu responsável. Se estiver em perigo, ligue 188 (CVV) ou 190.',
  pii: 'Vamos guardar seus dados pessoais só para você: não conte telefone, endereço ou documentos por aqui. Posso te ajudar com a atividade?',
  stranger_contact: 'Isso é um assunto para falar com seus responsáveis. Combinar encontros ou guardar segredos de adultos não é seguro. Vou avisar quem cuida de você.',
  abuse: 'Vamos manter a conversa gentil. Quer tentar a atividade de novo juntos?',
  off_topic: 'Eu sou o tutor dos estudos, então esse assunto fica com um adulto de confiança. Vamos voltar ao que você está aprendendo?',
  cheat_request: 'Eu não vou dar a resposta pronta, mas vou te ajudar a chegar nela! Quer uma dica?',
};
export function moderateInput(text: string): Moderation {
  const t = text.slice(0, 1000);
  for (const r of RULES) if (r.re.test(t)) return { allowed: r.risk === 'cheat_request', risk: r.risk, notifyGuardian: r.risk === 'self_harm' || r.risk === 'stranger_contact', reply: SAFE[r.risk] };
  if (OFF_TOPIC.test(t)) return { allowed: false, risk: 'off_topic', notifyGuardian: false, reply: SAFE.off_topic };
  return { allowed: true, risk: 'ok', notifyGuardian: false };
}

/** Escada de dicas: nunca revela a resposta final. Níveis além das dicas do item pedem que o aluno explique o raciocínio. */
export function nextHint(item: Item, level: number): { text: string; level: number; exhausted: boolean } {
  if (level < item.hints.length) return { text: item.hints[level]!, level: level + 1, exhausted: false };
  return { text: 'Conte para mim como você está pensando, passo a passo. Se quiser, posso mostrar outra explicação do conceito.', level, exhausted: true };
}
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
/** Guarda de vazamento: bloqueia respostas do tutor que contenham o gabarito. */
export function leaksAnswer(reply: string, item: Item): boolean {
  const answers: string[] = 'options' in item ? [item.options.find((o) => o.id === item.correct)!.text] : 'accepted' in item ? item.accepted : [];
  const r = norm(reply); return answers.some((a) => a.trim().length > 0 && new RegExp(`(^|[^0-9a-z/])${norm(a).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}($|[^0-9a-z/])`).test(r));
}
/** Outra abordagem de explicação quando "não entendi" se repete. */
export function alternateExplanation(misconceptionId: string, round: number) { const l = EXPLANATIONS[misconceptionId]; if (!l) return null; const v = l[round % l.length]!; return { method: v.method, title: v.title, body: v.body, label: MISCONCEPTIONS[misconceptionId]?.label ?? '' }; }

/** Contexto mínimo enviado a QUALQUER provedor: sem nome, escola, e-mail ou histórico bruto. */
export interface TutorContext { ageBand: AgeBand; interests: string[]; skill?: string; itemStatement?: string; weakSkills: string[] }
export function buildContext(o: { ageBand: AgeBand; interests: string[]; skill?: string; itemStatement?: string; weakSkills: string[] }): TutorContext {
  const scrub = (s: string) => s.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]').replace(/\d{8,}/g, '[número]');
  return { ageBand: o.ageBand, interests: o.interests.slice(0, 3).map((i) => scrub(i).slice(0, 30)), skill: o.skill, itemStatement: o.itemStatement && scrub(o.itemStatement).slice(0, 300), weakSkills: o.weakSkills.slice(0, 3) };
}
export const toneFor = (b: AgeBand) => ({ exploradores: 'frases curtas, palavras simples, muito incentivo, apoio de áudio', aventureiros: 'tom de aventura, exemplos do dia a dia', desafiadores: 'direto, desafiador, valoriza autonomia', estrategistas: 'objetivo, sem infantilizar, foco em metas' })[b];

export class ProviderUnavailable extends Error { constructor() { super('Nenhum provedor de IA configurado.'); } }
export interface LLMProvider { readonly id: string; complete(ctx: TutorContext, userText: string): Promise<string> }
export const UnavailableProvider: LLMProvider = { id: 'indisponivel', async complete() { throw new ProviderUnavailable(); } };

/** Resposta do tutor: moderação → regras → (se houver) provedor, sempre com guarda de vazamento. */
export async function tutorReply(o: { text: string; ctx: TutorContext; item?: Item; hintLevel?: number; provider?: LLMProvider }): Promise<{ reply: string; risk: Risk; notifyGuardian: boolean; source: 'moderacao' | 'regras' | 'provedor' | 'indisponivel'; hintLevel?: number }> {
  const m = moderateInput(o.text);
  if (!m.allowed) return { reply: m.reply!, risk: m.risk, notifyGuardian: m.notifyGuardian, source: 'moderacao' };
  if (o.item && (m.risk === 'cheat_request' || /\b(dica|ajuda|n[aã]o sei|travei)\b/i.test(o.text))) { const h = nextHint(o.item, o.hintLevel ?? 0); return { reply: h.text, risk: m.risk, notifyGuardian: false, source: 'regras', hintLevel: h.level }; }
  try { const r = await (o.provider ?? UnavailableProvider).complete(o.ctx, o.text); const bad = o.item && leaksAnswer(r, o.item); return bad ? { reply: nextHint(o.item!, o.hintLevel ?? 0).text, risk: 'ok', notifyGuardian: false, source: 'regras' } : { reply: r, risk: 'ok', notifyGuardian: false, source: 'provedor' }; }
  catch (e) { if (e instanceof ProviderUnavailable) return { reply: 'A conversa livre com o tutor ainda não está disponível. Posso te dar uma dica da atividade ou outra explicação!', risk: 'ok', notifyGuardian: false, source: 'indisponivel' }; throw e; }
}
