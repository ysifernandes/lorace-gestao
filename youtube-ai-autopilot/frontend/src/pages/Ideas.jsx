import { api } from "../api";
import { Badge, Button, Card, ErrorBox, fmtDate, useApi, useToast } from "../ui";

export default function Ideas({ go }) {
  const ideas = useApi("/ideas", { interval: 8000 });
  const trends = useApi("/trends");
  const [toast, toastNode] = useToast();
  return (
    <div className="page">
      {toastNode}
      <header className="page-head"><div><h1>Pautas</h1><p className="muted">Ideias pontuadas pelo planejador e tendências coletadas.</p></div></header>
      <ErrorBox error={ideas.error || trends.error} />
      <Card title="Ideias">
        <table className="table">
          <thead><tr><th>Score</th><th>Título / ângulo</th><th>Composição</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {(ideas.data || []).map((i) => (
              <tr key={i.id}>
                <td className="score">{i.score.toFixed(1)}</td>
                <td><b>{i.title}</b>{i.sensitive && <> <Badge tone="warn">exige revisão</Badge></>}<div className="small muted">{i.angle}</div>
                  {i.sensitive_reasons?.length > 0 && <div className="small warn-text">{i.sensitive_reasons.join(" · ")}</div>}</td>
                <td className="small">{Object.entries(i.score_breakdown || {}).filter(([, v]) => typeof v === "number").map(([k, v]) => <div key={k}>{k}: {v}</div>)}</td>
                <td><Badge status={i.status}>{i.status}</Badge>{i.scheduled_for && <div className="small muted">{i.scheduled_for}</div>}</td>
                <td>
                  {i.status === "proposed" && (
                    <div className="row gap">
                      <Button kind="ghost" onClick={async () => { try { const r = await api(`/ideas/${i.id}/produce`, { method: "POST", body: { format: "short" } }); toast(`Vídeo #${r.video_id} criado`); ideas.reload(); } catch (e) { toast(e.message, "bad"); } }}>Produzir Short</Button>
                      <Button kind="ghost" onClick={async () => { await api(`/ideas/${i.id}/reject`, { method: "POST" }); ideas.reload(); }}>Descartar</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ideas.data?.length === 0 && <p className="muted">Nenhuma ideia ainda. Execute o pipeline no Dashboard.</p>}
      </Card>
      <Card title="Tendências coletadas">
        <table className="table compact">
          <thead><tr><th>Tema</th><th>Fonte</th><th>Popularidade</th><th>Relevância</th><th>Concorrência</th><th>Fontes</th><th>Coleta</th></tr></thead>
          <tbody>
            {(trends.data || []).map((t) => (
              <tr key={t.id}>
                <td>{t.source_url ? <a href={t.source_url} target="_blank" rel="noreferrer">{t.topic}</a> : t.topic} {t.is_news && <Badge tone="info">notícia</Badge>}</td>
                <td className="small">{t.source}</td><td>{t.popularity.toFixed(0)}</td><td>{t.relevance.toFixed(0)}</td>
                <td className="small">{t.competition != null ? t.competition.toFixed(0) : <span className="muted" title="Configure o YouTube para medir">não medida</span>}</td>
                <td>{t.source_count}</td><td className="small">{fmtDate(t.collected_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
