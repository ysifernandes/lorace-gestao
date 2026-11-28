import { HashRouter, MemoryRouter, Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from '@edu/types';
import { brand } from '@edu/brand';
import { useDB, currentUser, logout, sweep } from './store/db';
import { Logo, Badge, Btn, ErrorBoundary, Toaster, Notice } from './ui';
import { HOME, Login } from './pages/auth';
import { StudentSession, StudentExplain, StudentProgress } from './pages/student';
import { AxShell, Dashboard } from './pages/ax';
import { Onboarding } from './pages/onboarding';
import { GameRoute, GamesPage } from './games/Games';
import { Estudar, Missoes, Conquistas, Biblioteca, Tutor, Familia } from './pages/ax-pages';
import { ParentHome, ParentChild } from './pages/parent';
import { TeacherHome, TeacherStudent, ManagerHome } from './pages/school';
import { AdminContent, AdminPlans, AdminSystem } from './pages/admin';
import { useEffect } from 'react';
import { BrandGallery } from './pages/brand';

function Guard({ role, children }: { role: Role; children: ReactNode }) {
  const d = useDB(); const u = currentUser(d); if (!u) return <Navigate to="/login" replace />; if (u.role !== role) return <Navigate to={HOME[u.role]} replace />; return <>{children}</>;
}
const NAV: Record<string, [string, string][]> = {
  guardian: [['/p', 'Minha família']], teacher: [['/t', 'Turmas e mapa']], school_manager: [['/m', 'Instituição']],
  super_admin: [['/a', 'Conteúdo'], ['/a/planos', 'Planos e cobrança'], ['/a/sistema', 'Sistema']],
};
function AdultShell({ role }: { role: string }) {
  const u = currentUser(useDB())!; const label = { guardian: 'Responsável', teacher: 'Professor(a)', school_manager: 'Gestão escolar', super_admin: 'Administração' }[role];
  return <div className="shell" data-theme="adulto"><aside className="side" aria-label="Menu"><div className="row brand" style={{ marginBottom: 14 }}><Logo size={34} /><b>{brand.name}</b></div>{NAV[role]!.map(([to, l]) => <NavLink key={to} end to={to} className={({ isActive }) => (isActive ? 'on' : '')}>{l}</NavLink>)}
    <div className="foot" style={{ marginTop: 'auto' }}>{brand.provisional && <Badge tone="warn">nome provisório</Badge>}<p className="sm" style={{ color: '#d9d3ff' }}>{label}: {u.name}</p><Btn variant="light sm" onClick={logout}>Sair</Btn></div></aside><main className="main"><div className="topbar"><Logo size={30} /><b className="grow">{brand.name}</b><span className="sm">{u.name}</span><Btn variant="sm" onClick={logout}>Sair</Btn></div><Outlet /></main></div>;
}
function Root() { const u = currentUser(useDB()); return <Navigate to={u ? HOME[u.role] : '/login'} replace />; }

// Preview publicado (moldura sem rotas por hash): VITE_MEMORY_ROUTER=1 usa roteamento em memória.
const Router = import.meta.env.VITE_MEMORY_ROUTER ? MemoryRouter : HashRouter;
export default function App() {
  useEffect(() => { sweep(); const t = setInterval(sweep, 15_000); return () => clearInterval(t); }, []);
  return <ErrorBoundary><Router><Routes>
    <Route path="/" element={<Root />} /><Route path="/login" element={<Login />} /><Route path="/marca" element={<BrandGallery />} />
    <Route path="/s/comecar" element={<Guard role="student"><Onboarding /></Guard>} />
    <Route path="/s" element={<Guard role="student"><AxShell /></Guard>}><Route index element={<Dashboard />} /><Route path="estudar" element={<Estudar />} /><Route path="jogos" element={<GamesPage />} /><Route path="jogos/:id" element={<GameRoute />} /><Route path="missoes" element={<Missoes />} /><Route path="conquistas" element={<Conquistas />} /><Route path="biblioteca" element={<Biblioteca />} /><Route path="tutor" element={<Tutor />} /><Route path="familia" element={<Familia />} /><Route path="session" element={<StudentSession />} /><Route path="explain" element={<StudentExplain />} /><Route path="progress" element={<StudentProgress />} /></Route>
    <Route path="/p" element={<Guard role="guardian"><AdultShell role="guardian" /></Guard>}><Route index element={<ParentHome />} /><Route path="child/:id" element={<ParentChild />} /></Route>
    <Route path="/t" element={<Guard role="teacher"><AdultShell role="teacher" /></Guard>}><Route index element={<TeacherHome />} /><Route path="student/:id" element={<TeacherStudent />} /></Route>
    <Route path="/m" element={<Guard role="school_manager"><AdultShell role="school_manager" /></Guard>}><Route index element={<ManagerHome />} /><Route path="student/:id" element={<TeacherStudent />} /></Route>
    <Route path="/a" element={<Guard role="super_admin"><AdultShell role="super_admin" /></Guard>}><Route index element={<AdminContent />} /><Route path="planos" element={<AdminPlans />} /><Route path="sistema" element={<AdminSystem />} /></Route>
    <Route path="*" element={<Notice tone="bad">Página não encontrada.</Notice>} />
  </Routes></Router><Toaster /></ErrorBoundary>;
}
