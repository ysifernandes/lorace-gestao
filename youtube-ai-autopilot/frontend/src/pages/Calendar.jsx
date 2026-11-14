import { Badge, Card, ErrorBox, useApi } from "../ui";

export default function Calendar({ go }) {
  const { data, error } = useApi("/calendar", { interval: 10000 });
  const byDate = {};
  (data || []).forEach((e) => { (byDate[e.date] ||= []).push(e); });
  const dates = Object.keys(byDate).sort();
  return (
    <div className="page">
      <header className="page-head"><div><h1>Calendário editorial</h1><p className="muted">Pautas agendadas por dia e o estado de cada vídeo.</p></div></header>
      <ErrorBox error={error} />
      <div className="calendar">
        {dates.map((d) => (
          <Card key={d} title={new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}>
            {byDate[d].map((e) => (
              <div key={e.idea_id} className={`cal-item ${e.video_id ? "clickable" : ""}`} onClick={() => e.video_id && go("videos", e.video_id)}>
                <b>{e.title}</b>
                <div className="row gap">{e.video_status ? <Badge status={e.video_status} /> : <Badge tone="muted">sem vídeo</Badge>}{e.sensitive && <Badge tone="warn">sensível</Badge>}</div>
              </div>
            ))}
          </Card>
        ))}
        {dates.length === 0 && <p className="muted">Nada agendado.</p>}
      </div>
    </div>
  );
}
