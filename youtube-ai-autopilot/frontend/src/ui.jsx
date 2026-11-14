import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

export function useApi(path, { interval = 0, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const load = useCallback(async () => {
    try {
      const d = await api(path);
      if (alive.current) { setData(d); setError(null); }
    } catch (e) {
      if (alive.current) setError(e);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    alive.current = true;
    load();
    const id = interval ? setInterval(load, interval) : null;
    return () => { alive.current = false; if (id) clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, interval, ...deps]);
  return { data, error, loading, reload: load };
}

export const STATUS_LABEL = {
  queued: "Na fila", scripting: "Escrevendo roteiro", script_review: "Revisar roteiro",
  script_ready: "Roteiro pronto", producing: "Produzindo", awaiting_approval: "Aguardando aprovação",
  approved: "Aprovado", publishing: "Publicando", scheduled: "Agendado", published: "Publicado",
  exported: "Exportado (dry-run)", failed: "Falhou", rejected: "Rejeitado",
  pending: "Pendente", running: "Executando", done: "Concluído",
};

const TONE = {
  failed: "bad", rejected: "bad", script_review: "warn", awaiting_approval: "warn",
  published: "good", scheduled: "good", done: "good", exported: "info", approved: "good",
  producing: "live", scripting: "live", publishing: "live", running: "live",
};

export function Badge({ status, children, tone }) {
  return <span className={`badge ${tone || TONE[status] || ""}`}>{children || STATUS_LABEL[status] || status}</span>;
}

export function StateChip({ state }) {
  const map = { demo: ["Demo", "info"], configured: ["Configurado", "good"], not_configured: ["Não configurado", "warn"],
    not_implemented: ["Não implementado", "muted"] };
  const [label, tone] = map[state] || [state, ""];
  return <span className={`badge ${tone}`}>{label}</span>;
}

export function Card({ title, actions, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h3>{title}</h3>}
          {actions && <div className="row gap">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, accent }) {
  return (
    <div className={`stat ${accent ? "accent" : ""}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export function Button({ onClick, children, kind = "", disabled, title }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!onClick) return;
    setBusy(true);
    try { await onClick(); } finally { setBusy(false); }
  };
  return (
    <button className={`btn ${kind}`} onClick={run} disabled={disabled || busy} title={title}>
      {busy ? "…" : children}
    </button>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  const blockers = error.detail?.blockers;
  return (
    <div className="error-box">
      <strong>Erro:</strong> {error.message}
      {blockers && <ul>{blockers.map((b) => <li key={b}>{b}</li>)}</ul>}
    </div>
  );
}

export const fmtDate = (s) => (s ? new Date(s.endsWith("Z") || s.includes("+") ? s : s + "Z").toLocaleString("pt-BR") : "—");
export const usd = (n) => `US$ ${(n ?? 0).toFixed(2)}`;

export function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (text, tone = "good") => { setMsg({ text, tone }); setTimeout(() => setMsg(null), 4000); };
  const node = msg ? <div className={`toast ${msg.tone}`}>{msg.text}</div> : null;
  return [show, node];
}
