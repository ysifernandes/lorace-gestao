import { useState } from "react";
import { api, mediaUrl } from "../api";
import { Badge, Button, Card, ErrorBox, STATUS_LABEL, fmtDate, usd, useApi, useToast } from "../ui";

const FILTERS = ["", "script_review", "awaiting_approval", "producing", "scheduled", "published", "exported", "failed"];

function Review({ v, reload, toast }) {
  const [reviewer, setReviewer] = useState(() => localStorage.getItem("reviewer") || "");
  const [reason, setReason] = useState("");
  const save = (r) => { setReviewer(r); try { localStorage.setItem("reviewer", r); } catch { /* */ } };
  const act = (path, msg) => async () => {
    try {
      await api(`/videos/${v.id}/${path}`, { method: "POST", body: { reviewer, reason } });
      toast(msg); reload();
    } catch (e) { toast(e.message, "bad"); }
  };
  const canReview = ["script_review", "awaiting_approval"].includes(v.status);
  if (!canReview && v.status !== "failed") return null;
  return (
    <Card title="Decisão humana" className="review-card">
      {v.review_reasons?.length > 0 && (
        <div className="banner warn small">
          <b>Motivos de revisão obrigatória:</b>
          <ul>{v.review_reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
      {canReview && (
        <>
          <div className="row gap wrap">
            <input placeholder="Seu nome (revisor)" value={reviewer} onChange={(e) => save(e.target.value)} />
            <input placeholder="Motivo (para rejeição)" value={reason} onChange={(e) => setReason(e.target.value)} className="grow" />
          </div>
          <div className="row gap">
            {v.status === "script_review" && <Button kind="primary" disabled={reviewer.length < 2} onClick={act("approve-script", "Roteiro aprovado — produção iniciada")}>Aprovar roteiro e produzir</Button>}
            {v.status === "awaiting_approval" && <Button kind="primary" disabled={reviewer.length < 2} onClick={act("approve", "Vídeo aprovado para publicação")}>Aprovar publicação</Button>}
            <Button kind="danger" disabled={reviewer.length < 2} onClick={act("reject", "Vídeo rejeitado")}>Rejeitar</Button>
          </div>
          {v.status === "awaiting_approval" && <p className="small muted">A publicação real só ocorre se a prontidão estiver completa; caso contrário o vídeo é exportado em dry-run ou bloqueado.</p>}
        </>
      )}
      {v.status === "failed" && <Button onClick={async () => { await api(`/videos/${v.id}/retry`, { method: "POST" }); toast("Reprocessando"); reload(); }}>Tentar novamente</Button>}
    </Card>
  );
}

function Detail({ id, close }) {
  const { data: v, error, reload } = useApi(`/videos/${id}`, { interval: 5000 });
  const [toast, toastNode] = useToast();
  if (error) return <ErrorBox error={error} />;
  if (!v) return <div className="spinner" />;
  const s = v.script;
  const q = v.quality_report || {};
  const bust = v.updated_at;
  return (
    <div className="detail">
      {toastNode}
      <header className="page-head">
        <div>
          <button className="link" onClick={close}>← voltar</button>
          <h1>#{v.id} · {v.title}</h1>
          <div className="row gap"><Badge status={v.status} /><Badge tone="info">{v.format === "short" ? "Short 1080×1920" : "Horizontal 1920×1080"}</Badge>
            {v.is_demo && <Badge tone="info">demonstração</Badge>}<span className="muted small">custo {usd(v.cost_usd)}</span></div>
        </div>
      </header>
      {v.error && <div className="banner bad">{v.error}</div>}
      <Review v={v} reload={reload} toast={toast} />
      <div className="grid two">
        <Card title="Prévia">
          {v.video_path ? <video className={`player ${v.format}`} src={mediaUrl(v.id, "video", bust)} controls /> : <p className="muted">Ainda não renderizado.</p>}
          {v.thumbnail_path && <><h4>Thumbnail</h4><img className="thumb" src={mediaUrl(v.id, "thumbnail", bust)} alt="thumbnail" /></>}
          {v.publish_result?.url && <p><a href={v.publish_result.url} target="_blank" rel="noreferrer">Abrir no YouTube ↗</a></p>}
          {v.publish_result?.outbox && <p className="small muted">Exportado em: <span className="mono">{v.publish_result.outbox}</span></p>}
          {v.publish_at && <p className="small">Agendado para {fmtDate(v.publish_at)}</p>}
        </Card>
        <Card title="Auditoria de qualidade">
          {["script", "final"].map((k) => q[k] && (
            <div key={k} className="qa">
              <h4>{k === "script" ? "Roteiro" : "Vídeo final"} <Badge tone={q[k].passed ? "good" : "bad"}>{q[k].passed ? "aprovado" : "reprovado"}</Badge></h4>
              {q[k].issues?.map((i) => <div key={i} className="qa-item bad">✕ {i}</div>)}
              {q[k].warnings?.map((i) => <div key={i} className="qa-item warn">! {i}</div>)}
              {k === "script" && <div className="small muted">{q.script.word_count} palavras · ~{q.script.estimated_seconds}s · similaridade máx. {Math.round((q.script.max_similarity || 0) * 100)}%</div>}
              {k === "script" && q.script.fact_check && <div className="small">Checagem de fatos: <b>{q.script.fact_check.verdict}</b> — {q.script.fact_check.notes}</div>}
            </div>
          ))}
          <h4>Provedores</h4>
          <div className="row gap wrap">{Object.entries(v.providers || {}).map(([k, p]) => <Badge key={k} tone="muted">{k}: {p}</Badge>)}</div>
        </Card>
      </div>
      {s && (
        <Card title="Roteiro">
          <p className="hook">🎣 {s.hook}</p>
          <ol className="scenes">
            {s.scenes.map((sc, i) => (
              <li key={i}><p>{sc.narration}</p>
                <div className="small muted">visual: “{sc.visual_query}” · texto: {sc.on_screen_text || "—"} · fontes: {sc.source_ids.map((x) => `[${x}]`).join(" ")}</div></li>
            ))}
          </ol>
          <p className="cta">📣 {s.cta}</p>
          <h4>Fontes</h4>
          <ul>{s.sources.map((x) => <li key={x.id}>[{x.id}] <a href={x.url} target="_blank" rel="noreferrer">{x.title}</a></li>)}</ul>
        </Card>
      )}
      <div className="grid two">
        {v.seo && (
          <Card title="SEO">
            <p><b>Título escolhido:</b> {v.seo.chosen_title}</p>
            <p className="small muted">Alternativas: {v.seo.titles?.join(" · ")}</p>
            <pre className="pre">{v.seo.final_description}</pre>
            <div className="row gap wrap">{v.seo.tags?.map((t) => <span key={t} className="tag">{t}</span>)}</div>
          </Card>
        )}
        <Card title="Ativos e licenças">
          <table className="table compact"><tbody>
            {v.assets.map((a, i) => <tr key={i}><td>{a.scene}</td><td>{a.provider}</td><td className="small">{a.license}</td><td className="small">{a.source_url ? <a href={a.source_url} target="_blank" rel="noreferrer">origem</a> : "—"}</td></tr>)}
          </tbody></table>
          <h4>Custos</h4>
          <table className="table compact"><tbody>
            {v.costs.map((c) => <tr key={c.id}><td>{c.provider}</td><td>{c.description}</td><td>{usd(c.amount_usd)}</td></tr>)}
          </tbody></table>
          {v.costs.length === 0 && <p className="muted small">Sem custos (provedores demo).</p>}
        </Card>
      </div>
      <Card title="Log do vídeo">
        <div className="log">{v.logs.map((l) => <div key={l.id} className={`log-line ${l.level}`}><span className="mono muted">{fmtDate(l.ts)}</span> <b>[{l.module}]</b> {l.message}</div>)}</div>
      </Card>
    </div>
  );
}

export default function Videos({ openVideo, setOpenVideo }) {
  const [filter, setFilter] = useState("");
  const { data, error } = useApi(`/videos${filter ? `?status=${filter}` : ""}`, { interval: 5000 });
  if (openVideo) return <Detail id={openVideo} close={() => setOpenVideo(null)} />;
  return (
    <div className="page">
      <header className="page-head"><h1>Vídeos</h1></header>
      <div className="row gap wrap filters">
        {FILTERS.map((f) => <button key={f} className={`chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f ? STATUS_LABEL[f] : "Todos"}</button>)}
      </div>
      <ErrorBox error={error} />
      <Card>
        <table className="table">
          <thead><tr><th>#</th><th>Título</th><th>Formato</th><th>Status</th><th>Custo</th><th>Criado</th></tr></thead>
          <tbody>
            {(data || []).map((v) => (
              <tr key={v.id} className="clickable" onClick={() => setOpenVideo(v.id)}>
                <td className="mono">{v.id}</td>
                <td>{v.title} {v.is_demo && <Badge tone="info">demo</Badge>} {v.requires_human_review && <Badge tone="warn">sensível</Badge>}</td>
                <td>{v.format}</td><td><Badge status={v.status} /></td><td>{usd(v.cost_usd)}</td><td className="small">{fmtDate(v.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.length === 0 && <p className="muted">Nenhum vídeo.</p>}
      </Card>
    </div>
  );
}
