import { api } from "../api";
import { Badge, Button, Card, ErrorBox, StateChip, Stat, fmtDate, usd, useApi, useToast } from "../ui";

export default function Dashboard({ go }) {
  const { data, error, reload } = useApi("/dashboard", { interval: 4000 });
  const [toast, toastNode] = useToast();
  if (error) return <ErrorBox error={error} />;
  if (!data) return <div className="spinner" />;
  const c = data.video_counts || {};
  const pct = Math.min(100, (data.month_spend_usd / Math.max(0.01, data.monthly_budget_usd)) * 100);
  const reviewCount = (c.script_review || 0) + (c.awaiting_approval || 0);

  return (
    <div className="page">
      {toastNode}
      <header className="page-head">
        <div>
          <h1>Centro de Controle</h1>
          <p className="muted">Pipeline autônomo de produção — modo <b>{data.mode === "auto" ? "automático" : "revisão humana"}</b></p>
        </div>
        <div className="row gap">
          <Button kind="ghost" onClick={async () => { const r = await api("/pipeline/demo", { method: "POST", body: { format: "short" } }); toast(`Vídeo demo #${r.video_id} na fila`); reload(); }}>
            Gerar vídeo demo
          </Button>
          <Button kind="primary" onClick={async () => { await api("/pipeline/run-now", { method: "POST" }); toast("Execução diária enfileirada"); reload(); }}>
            Executar pipeline agora
          </Button>
        </div>
      </header>

      {!data.publish_ready && (
        <div className="banner warn">
          <b>Publicação real bloqueada.</b> {data.publish_blockers} requisito(s) de prontidão pendente(s) (OAuth, APIs, auditoria, testes).
          Vídeos são apenas exportados localmente (dry-run). <a onClick={() => go("integrations")}>Ver prontidão →</a>
        </div>
      )}

      <div className="grid stats">
        <Stat label="Aguardando você" value={reviewCount} hint="roteiros e vídeos para revisar" accent={reviewCount > 0} />
        <Stat label="Em produção" value={(c.scripting || 0) + (c.producing || 0) + (c.publishing || 0)} hint="etapas em execução" />
        <Stat label="Publicados / agendados" value={(c.published || 0) + (c.scheduled || 0)} hint={`${c.exported || 0} exportados em dry-run`} />
        <Stat label="Falhas" value={c.failed || 0} hint="após todas as tentativas" />
        <div className="stat">
          <span className="stat-label">Gasto no mês</span>
          <span className="stat-value">{usd(data.month_spend_usd)}</span>
          <div className="meter"><div style={{ width: `${pct}%` }} className={pct > 85 ? "hot" : ""} /></div>
          <span className="stat-hint">limite {usd(data.monthly_budget_usd)}</span>
        </div>
        <Stat label="Próxima execução" value={data.next_run ? fmtDate(data.next_run).slice(0, 17) : "—"}
              hint={data.scheduler_enabled ? "scheduler ativo" : "scheduler desligado"} />
      </div>

      <div className="grid two">
        <Card title="Execução em tempo real">
          {data.queue.length === 0 && <p className="muted">Fila vazia.</p>}
          <ul className="timeline">
            {data.queue.map((j) => (
              <li key={j.id} className={j.status === "running" ? "live" : ""}>
                <span className="dot" />
                <div>
                  <b>{j.type}</b> {j.payload?.video_id && <span className="muted">vídeo #{j.payload.video_id}</span>}
                  <div className="small muted">tentativa {j.attempts}/{j.max_attempts} · {fmtDate(j.run_after)}</div>
                </div>
                <Badge status={j.status} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Integrações">
          <table className="table compact">
            <tbody>
              {Object.entries(data.adapters).map(([k, a]) => (
                <tr key={k}><td className="mono">{k}</td><td>{a.provider}</td><td><StateChip state={a.state} /></td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="grid two">
        <Card title="Vídeos recentes" actions={<button className="link" onClick={() => go("videos")}>ver todos</button>}>
          <table className="table">
            <tbody>
              {data.recent_videos.map((v) => (
                <tr key={v.id} className="clickable" onClick={() => go("videos", v.id)}>
                  <td className="mono">#{v.id}</td>
                  <td>{v.title || "—"} {v.is_demo && <Badge tone="info">demo</Badge>}</td>
                  <td>{v.format}</td>
                  <td><Badge status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.recent_videos.length === 0 && <p className="muted">Nenhum vídeo ainda. Clique em “Gerar vídeo demo”.</p>}
        </Card>
        <Card title="Alertas">
          {data.alerts.length === 0 && <p className="muted">Sem alertas pendentes.</p>}
          {data.alerts.map((a) => (
            <div key={a.id} className={`alert ${a.level}`}>
              <span>{a.message}</span>
              <button className="link" onClick={async () => { await api(`/alerts/${a.id}/ack`, { method: "POST" }); reload(); }}>ok</button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
