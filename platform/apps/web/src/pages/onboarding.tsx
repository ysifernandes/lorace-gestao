import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ageOf, bandOf, INTERESTS, setProfile, type Maturity } from '../store/db';
import { Axolotl } from '../ui/axolotl';
import { Wordmark, ISpeaker } from '../ui/art';
import { useStudent } from './student';

const MAT: { id: Maturity; t: string; d: string; emoji: string }[] = [
  { id: 'tranquilo', t: 'Mais tranquilo', d: 'Visual e jogos mais leves, com mais apoio.', emoji: '🌤️' },
  { id: 'padrao', t: 'No meu ritmo', d: 'O estilo recomendado para a sua idade.', emoji: '🎯' },
  { id: 'desafiador', t: 'Mais desafiador', d: 'Visual e jogos mais avançados, com mais autonomia.', emoji: '🚀' },
];
/** Cadastro inicial do aluno: interesses (viram o tema dos problemas) e estilo. A IDADE vem do responsável e não é alterada aqui. */
export function Onboarding() {
  const { s } = useStudent(); const nav = useNavigate(); const age = ageOf(s); const young = age < 8; const [step, setStep] = useState(0); const [picked, setPicked] = useState<string[]>(s.interests.filter((i) => INTERESTS.some((x) => x[0] === i)));
  const [mat, setMat] = useState<Maturity>(s.maturity ?? 'padrao'); const band = bandOf({ ...s, maturity: mat }); const teen = band === 'desafiadores' || band === 'estrategistas';
  const say = (t: string) => { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'pt-BR'; speechSynthesis.speak(u); } catch { /* sem voz */ } };
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length < 3 ? [...picked, id] : picked);
  const finish = () => { setProfile(s.id, { interests: picked, maturity: young ? 'padrao' : mat, onboarded: true }); nav('/s', { replace: true }); };
  const title = step === 0 ? (teen ? 'Quais temas você curte?' : 'Do que você mais gosta?') : 'Como você prefere os desafios?';
  const sub = step === 0 ? (teen ? 'Escolha até 3. Vamos usar esses temas nos exercícios e jogos.' : 'Escolha até 3 coisas que você ama!') : 'Você pode mudar isso depois. O conteúdo continua sendo escolhido pelo seu diagnóstico, não só pela idade.';
  return <main className="ax-onb" data-theme={band} data-band={band}><div className="ax-onb-card">
    <Wordmark size={34} tone="dark" /><div className="ax-onb-head">{!teen && <Axolotl state={step === 0 ? 'apresentando' : 'pensativo'} size={young ? 130 : 100} cap />}<div><p className="ax-muted">Olá, {s.name}! {step === 0 ? 'Vamos personalizar o seu espaço.' : 'Última pergunta.'}</p><h1>{title}</h1><p className="ax-muted">{sub}</p>{(young || !teen) && <button className="gm-link" onClick={() => say(`${title}. ${sub}`)} aria-label="Ouvir a pergunta"><ISpeaker size={20} /> Ouvir</button>}</div></div>
    {step === 0 ? <div className={`ax-int ${young ? 'big' : ''}`} role="group" aria-label="Interesses">{INTERESTS.map(([id, label, emoji]) => <button key={id} aria-pressed={picked.includes(id)} className={picked.includes(id) ? 'on' : ''} onClick={() => toggle(id)}><span aria-hidden>{emoji}</span>{label}</button>)}</div>
      : <div className="ax-mat" role="radiogroup" aria-label="Estilo">{MAT.map((m) => <button key={m.id} role="radio" aria-checked={mat === m.id} className={mat === m.id ? 'on' : ''} onClick={() => setMat(m.id)}><span aria-hidden>{m.emoji}</span><b>{m.t}</b><small>{m.d}</small></button>)}</div>}
    <div className="ax-onb-foot"><span className="ax-muted">{step === 0 ? `${picked.length}/3 escolhidos` : `Estilo do app: ${({ exploradores: 'Exploradores', aventureiros: 'Aventureiros', desafiadores: 'Desafiadores', estrategistas: 'Estrategistas' })[band]}`}</span>
      {step === 1 && <button className="ax-outline sm" onClick={() => setStep(0)}>Voltar</button>}
      <button className="ax-primary sm" disabled={step === 0 && picked.length === 0} onClick={() => (step === 0 && !young ? setStep(1) : finish())}>{step === 0 && !young ? 'Continuar' : 'Começar!'}</button></div></div></main>;
}
