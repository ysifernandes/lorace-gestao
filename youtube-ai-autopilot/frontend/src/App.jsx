import { useEffect, useState } from "react";
import { api, setToken } from "./api";
import Dashboard from "./pages/Dashboard.jsx";
import Videos from "./pages/Videos.jsx";
import Ideas from "./pages/Ideas.jsx";
import Calendar from "./pages/Calendar.jsx";
import Analytics from "./pages/Analytics.jsx";
import Integrations from "./pages/Integrations.jsx";
import Settings from "./pages/Settings.jsx";
import Logs from "./pages/Logs.jsx";

const PAGES = [
  { id: "dashboard", label: "Dashboard", icon: "◈", C: Dashboard },
  { id: "videos", label: "Vídeos", icon: "▶", C: Videos },
  { id: "ideas", label: "Pautas", icon: "✦", C: Ideas },
  { id: "calendar", label: "Calendário", icon: "▦", C: Calendar },
  { id: "analytics", label: "Analytics", icon: "◔", C: Analytics },
  { id: "integrations", label: "Integrações", icon: "⬡", C: Integrations },
  { id: "settings", label: "Configurações", icon: "⚙", C: Settings },
  { id: "logs", label: "Logs & Fila", icon: "≡", C: Logs },
];

function Login({ onDone, error }) {
  const [t, setT] = useState("");
  return (
    <div className="login">
      <div className="card glass login-card">
        <div className="brand big"><span className="logo-dot" />YouTube AI Autopilot</div>
        <p className="muted">Informe o ADMIN_TOKEN definido no arquivo .env do servidor.</p>
        <input type="password" value={t} onChange={(e) => setT(e.target.value)} placeholder="ADMIN_TOKEN"
               onKeyDown={(e) => e.key === "Enter" && (setToken(t), onDone())} />
        {error && <p className="bad-text">{error}</p>}
        <button className="btn primary" onClick={() => { setToken(t); onDone(); }}>Entrar</button>
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState(() => (location.hash.slice(1) || "dashboard"));
  const [auth, setAuth] = useState("checking");
  const [authErr, setAuthErr] = useState("");
  const [openVideo, setOpenVideo] = useState(null);

  const check = () => api("/dashboard").then(() => setAuth("ok")).catch((e) => {
    if (e.status === 401) { setAuth("login"); setAuthErr(e.message); } else setAuth("ok");
  });
  useEffect(() => { check(); }, []);
  useEffect(() => { location.hash = page; }, [page]);

  if (auth === "checking") return <div className="login"><div className="spinner" /></div>;
  if (auth === "login") return <Login onDone={check} error={authErr} />;

  const Current = (PAGES.find((p) => p.id === page) || PAGES[0]).C;
  const go = (p, videoId) => { setPage(p); if (videoId) setOpenVideo(videoId); };
  return (
    <div className="shell">
      <aside className="sidebar glass">
        <div className="brand"><span className="logo-dot" />AI Autopilot</div>
        <nav>
          {PAGES.map((p) => (
            <button key={p.id} className={`nav-item ${page === p.id ? "active" : ""}`} onClick={() => setPage(p.id)}>
              <span className="nav-icon">{p.icon}</span>{p.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot muted small">YouTube AI Autopilot v1.0</div>
      </aside>
      <main className="content">
        <Current go={go} openVideo={openVideo} setOpenVideo={setOpenVideo} />
      </main>
    </div>
  );
}
