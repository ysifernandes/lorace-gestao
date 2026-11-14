import { api } from "../api";
import { Button, Card, ErrorBox, Stat, useApi, useToast } from "../ui";

function Spark({ series }) {
  if (!series || series.length < 2) return <span className="muted small">—</span>;
  const vals = series.map((p) => p.views || 0);
  const max = Math.max(...vals, 1);
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${28 - (v / max) * 26}`).join(" ");
  return <svg viewBox="0 0 100 30" className="spark"><polyline points={pts} /></svg>;
}

export default function Analytics() {
  const { data, error, reload } = useApi("/analytics", { interval: 30000 });
  const [toast, toastNode] = useToast();
  return (
    <div className="page">
      {toastNode}
      <header className="page-head">
        <div><h1>Analytics</h1><p className="muted">Métricas reais do YouTube Data/Analytics API. Sem vídeos publicados, não há dados.</p></div>
        <Button onClick={async () => { await api("/analytics/sync", { method: "POST" }); toast("Sincronização enfileirada"); setTimeout(reload, 4000); }}>Sincronizar</Button>
      </header>
      <ErrorBox error={error} />
      {data && (
        <>
          <div className="grid stats">
            <Stat label="Visualizações totais" value={data.total_views.toLocaleString("pt-BR")} />
            <Stat label="Retenção média" value={data.avg_retention != null ? `${data.avg_retention.toFixed(1)}%` : "—"} hint="averageViewPercentage" />
            <Stat label="CTR de impressões" value={data.ctr_available ? "disponível" : "indisponível"} hint="não exposto pela API pública" />
            <Stat label="Vídeos medidos" value={data.videos.length} />
          </div>
          {data.insights.length > 0 && <Card title="Aprendizados">{data.insights.map((i) => <p key={i}>• {i}</p>)}</Card>}
          <Card title="Desempenho por vídeo">
            <table className="table">
              <thead><tr><th>Vídeo</th><th>Formato</th><th>Views</th><th>Likes</th><th>Comentários</th><th>Retenção</th><th>Tendência</th></tr></thead>
              <tbody>
                {data.videos.map((v) => (
                  <tr key={v.video_id}>
                    <td><a href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`} target="_blank" rel="noreferrer">{v.title}</a></td>
                    <td>{v.format}</td><td>{v.views ?? "—"}</td><td>{v.likes ?? "—"}</td><td>{v.comments ?? "—"}</td>
                    <td>{v.avg_view_percentage != null ? `${v.avg_view_percentage.toFixed(1)}%` : "—"}</td>
                    <td><Spark series={v.series} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.videos.length === 0 && <p className="muted">Nenhum dado ainda. As métricas aparecem após a primeira publicação real e a sincronização diária (03:17).</p>}
          </Card>
        </>
      )}
    </div>
  );
}
