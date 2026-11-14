import { useState } from "react";
import { api } from "../api";
import { Badge, Button, Card, ErrorBox, fmtDate, usd, useApi } from "../ui";

export default function Logs() {
  const [level, setLevel] = useState("");
  const logs = useApi(`/logs?limit=400${level ? `&level=${level}` : ""}`, { interval: 4000 });
  const jobs = useApi("/jobs", { interval: 4000 });
  const costs = useApi("/costs", { interval: 15000 });
  return (
    <div className="page">
      <header className="page-head"><h1>Logs, fila e gastos</h1></header>
      <ErrorBox error={logs.error || jobs.error} />
      <div className="grid two">
        <Card title="Fila de jobs">
          <table className="table compact">
            <thead><tr><th>#</th><th>Tipo</th><th>Status</th><th>Tent.</th><th>Erro</th><th></th></tr></thead>
            <tbody>
              {(jobs.data || []).map((j) => (
                <tr key={j.id}>
                  <td className="mono">{j.id}</td><td>{j.type}{j.payload?.video_id ? ` #${j.payload.video_id}` : ""}</td>
                  <td><Badge status={j.status} /></td><td>{j.attempts}/{j.max_attempts}</td>
                  <td className="small err-cell" title={j.last_error || ""}>{(j.last_error || "").slice(0, 90)}</td>
                  <td>{j.status === "failed" && <Button kind="ghost" onClick={async () => { await api(`/jobs/${j.id}/retry`, { method: "POST" }); jobs.reload(); }}>Repetir</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Gastos (30 dias)">
          {costs.data && (
            <>
              <p>Mês atual: <b>{usd(costs.data.month_spend_usd)}</b> de {usd(costs.data.monthly_budget_usd)}</p>
              <table className="table compact"><tbody>
                {Object.entries(costs.data.by_provider_30d).map(([p, v]) => <tr key={p}><td>{p}</td><td>{usd(v)}</td></tr>)}
              </tbody></table>
              {Object.keys(costs.data.by_provider_30d).length === 0 && <p className="muted small">Nenhum gasto registrado.</p>}
            </>
          )}
        </Card>
      </div>
      <Card title="Logs" actions={
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Todos</option><option>INFO</option><option>WARNING</option><option>ERROR</option>
        </select>}>
        <div className="log tall">
          {(logs.data || []).map((l) => (
            <div key={l.id} className={`log-line ${l.level}`}>
              <span className="mono muted">{fmtDate(l.ts)}</span> <b>[{l.module}]</b>{l.video_id ? <span className="muted"> v#{l.video_id}</span> : null} {l.message}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
