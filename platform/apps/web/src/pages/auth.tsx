import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { brand } from '@edu/brand';
import { useDB, login, register, seedDemo, DEMO_PASSWORD, update, currentUser, logout } from '../store/db';
import { Card, Btn, Notice, Badge } from '../ui';
import { Axolotl } from '../ui/axolotl';
import { Wordmark } from '../ui/art';
import type { Role } from '@edu/types';

export const HOME: Record<Role, string> = { student: '/s', guardian: '/p', teacher: '/t', school_manager: '/m', super_admin: '/a' };

export function Login() {
  const d = useDB(); const nav = useNavigate(); const [mode, setMode] = useState<'in' | 'up'>('in'); const [f, setF] = useState({ name: '', email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async (fn: () => Promise<{ role: Role }>) => { setBusy(true); setErr(''); try { const u = await fn(); nav(HOME[u.role]); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const demo = async (email: string) => { if (!d.demoSeeded) await seedDemo(); await go(() => login(email, DEMO_PASSWORD)); };
  const signup = () => go(async () => { const fam = { id: crypto.randomUUID(), name: `Família de ${f.name.trim()}` }; update((x) => { x.families.push(fam); }); const u = await register({ role: 'guardian', name: f.name, email: f.email, password: f.password, familyId: fam.id }); return login(f.email, f.password).then(() => u); });
  return <div data-theme="adulto" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16, background: 'var(--hero)' }}><div className="col" style={{ width: '100%', maxWidth: 460 }}>
    <Card><div className="row"><Wordmark size={40} tone="dark" /><span className="grow" /><Axolotl state="feliz" size={84} cap /></div><p className="muted" style={{ margin: '6px 0 0' }}>{brand.tagline}</p>
      {currentUser(d) && <div className="notice" role="status" style={{ marginTop: 10 }}>Você está conectado como <b>{currentUser(d)!.name}</b>. <div className="row" style={{ marginTop: 6 }}><Btn variant="sm" type="button" onClick={() => nav(HOME[currentUser(d)!.role])}>Continuar</Btn><Btn variant="ghost sm" type="button" onClick={logout}>Sair</Btn></div></div>}
      {brand.provisional && <p className="sm"><Badge tone="warn">nome provisório</Badge> {brand.trademarkNote}</p>}
      <div className="tabs" role="tablist" style={{ marginTop: 12 }}><button role="tab" className={mode === 'in' ? 'on' : ''} onClick={() => setMode('in')}>Entrar</button><button role="tab" className={mode === 'up' ? 'on' : ''} onClick={() => setMode('up')}>Criar conta (responsável)</button></div>
      <form onSubmit={(e) => { e.preventDefault(); void (mode === 'in' ? go(() => login(f.email, f.password)) : signup()); }}>
        {mode === 'up' && <><label htmlFor="nm">Seu nome</label><input id="nm" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></>}
        <label htmlFor="em">E-mail</label><input id="em" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /><label htmlFor="pw">Senha</label><input id="pw" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        {err && <div role="alert" className="notice bad" style={{ marginTop: 8 }}>{err}</div>}
        {mode === 'up' && <p className="sm muted">Ao criar a conta como responsável legal você poderá cadastrar crianças e decidir o que é compartilhado. Aceite dos termos e verificação de responsável: pendentes de revisão jurídica.</p>}
        <Btn style={{ marginTop: 12, width: '100%' }} disabled={busy || !f.email || !f.password}>{busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar conta'}</Btn></form></Card>
    <Card className="flat"><h3>Contas de demonstração</h3><p className="sm muted">Criam contas e vínculos neste navegador (senha <code>{DEMO_PASSWORD}</code>). <b>Não há resultados pedagógicos pré-prontos</b>: tudo que aparecer nos painéis vem do uso real.</p>
      <div className="grid g2">{([['Aluna Luna (9 anos)', 'luna@demo.local'], ['Aluno Davi (13)', 'davi@demo.local'], ['Aluno Caio (6)', 'caio@demo.local'], ['Aluna Bia (16)', 'bia@demo.local'], ['Aluno Teo (14, 1º acesso)', 'teo@demo.local'], ['Aluna Malu (12, 1º acesso)', 'malu@demo.local'], ['Responsável', 'responsavel@demo.local'], ['Professora', 'professora@demo.local'], ['Gestora', 'gestora@demo.local'], ['Administrador', 'admin@demo.local'], ['Revisor (2º avaliador)', 'revisor@demo.local']] as const).map(([l, e]) => <Btn key={e} variant="ghost sm" disabled={busy} onClick={() => demo(e)}>{l}</Btn>)}</div></Card>
    <Notice tone="info">Autenticação <b>local de desenvolvimento</b> (dados só neste navegador). Supabase Auth, MFA e recuperação de senha: pendentes de credenciais.</Notice></div></div>;
}
