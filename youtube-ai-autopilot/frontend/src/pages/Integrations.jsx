import { useState } from "react";
import { api } from "../api";
import { Button, Card, ErrorBox, StateChip, fmtDate, useApi, useToast } from "../ui";

export default function Integrations() {
  const ints = useApi("/integrations");
  const ready = useApi("/readiness", { interval: 6000 });
  const cfg = useApi("/config");
  const [toast, toastNode] = useToast();
  const [signer, setSigner] = useState("");
  const [checks, setChecks] = useState([]);
  const [phrase, setPhrase] = useState("");
  const [err, setErr] = useState(null);

  const check = async (name) => {
    const r = await api(`/integrations/${name}/check`, { method: "POST" });
    toast(`${name}: ${r.ok ? "OK" : "falhou"} — ${r.detail}`, r.ok ? "good" : "bad");
    ints.reload(); ready.reload();
  };
  const oauth = async () => {
    try { const r = await api("/oauth/youtube/start"); window.open(r.auth_url, "_blank"); }
    catch (e) { toast(e.message, "bad"); }
  };
  const audit = async () => {
    try { await api("/readiness/audit", { method: "POST", body: { signed_by: signer, confirmations: checks } }); toast("Auditoria assinada"); ready.reload(); }
    catch (e) { toast(e.message, "bad"); }
  };
  const authorize = async () => {
    setErr(null);
    try { await api("/config/authorize-autopublish", { method: "POST", body: { confirm_text: phrase, authorized_by: signer } }); toast("Publicação automática autorizada"); cfg.reload(); }
    catch (e) { setErr(e); }
  };

  const items = ready.data?.audit_items || [];
  return (
    <div className="page">
      {toastNode}
      <header className="page-head"><div><h1>Integrações & Prontidão</h1>
        <p className="muted">Segredos ficam no <span className="mono">.env</span> do servidor — este painel só mostra o estado de cada integração.</p></div></header>

      <Card title="Adaptadores">
        <table className="table">
          <thead><tr><th>Módulo</th><th>Provedor</th><th>Estado</th><th>Detalhe</th><th>Última verificação</th><th></th></tr></thead>
          <tbody>
            {(ints.data || []).map((a) => (
              <tr key={a.name}>
                <td className="mono">{a.name}</td><td>{a.provider}</td><td><StateChip state={a.state} /></td>
                <td className="small">{a.detail}</td>
                <td className="small">{a.last_check ? <>{a.last_check.passed ? "✔" : "✕"} {a.last_check.detail}<div className="muted">{fmtDate(a.last_check.checked_at)}</div></> : "—"}</td>
                <td>{a.state !== "not_implemented" && <Button kind="ghost" onClick={() => check(a.name)}>Verificar ao vivo</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row gap"><Button onClick={oauth}>Autorizar canal do YouTube (OAuth 2.0)</Button>
          <span className="small muted">Requer PUBLISHER=youtube e o arquivo client_secret.json em secrets/.</span></div>
      </Card>

      <Card title={<>Prontidão para publicação real {ready.data && (ready.data.ready ? <span className="badge good">pronto</span> : <span className="badge warn">bloqueado</span>)}</>}>
        <ul className="checklist">
          {(ready.data?.items || []).map((i) => (
            <li key={i.key} className={i.passed ? "ok" : i.blocking ? "no" : "opt"}>
              <span className="mark">{i.passed ? "✔" : i.blocking ? "✕" : "○"}</span>
              <div><b>{i.label}</b>{!i.blocking && <span className="muted small"> (opcional)</span>}<div className="small muted">{i.detail}</div></div>
            </li>
          ))}
        </ul>
        <Button onClick={async () => { try { await api("/readiness/run-tests", { method: "POST" }); toast("Testes iniciados — o resultado aparece em instantes"); } catch (e) { toast(e.message, "bad"); } }}>Executar testes automatizados</Button>
      </Card>

      <div className="grid two">
        <Card title="Auditoria humana de conformidade">
          <input placeholder="Seu nome" value={signer} onChange={(e) => setSigner(e.target.value)} />
          {items.map((t, i) => (
            <label key={i} className="check">
              <input type="checkbox" checked={!!checks[i]} onChange={(e) => { const c = [...checks]; c[i] = e.target.checked; setChecks(c); }} />
              <span>{t}</span>
            </label>
          ))}
          <Button kind="primary" disabled={signer.length < 2 || items.some((_, i) => !checks[i])} onClick={audit}>Assinar auditoria</Button>
        </Card>
        <Card title="Autorização de publicação automática">
          {cfg.data?.auto_publish_authorized ? (
            <>
              <p>Autorizada por <b>{cfg.data.auto_publish_authorized_by}</b> em {fmtDate(cfg.data.auto_publish_authorized_at)}.</p>
              <Button kind="danger" onClick={async () => { await api("/config/revoke-autopublish", { method: "POST" }); cfg.reload(); toast("Revogada; modo revisão ativado"); }}>Revogar</Button>
            </>
          ) : (
            <>
              <p className="small">O modo automático publica sem revisão humana (exceto temas sensíveis). Só pode ser ativado com a prontidão completa.
                Digite <span className="mono">AUTORIZO PUBLICACAO AUTOMATICA</span>:</p>
              <input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="frase de confirmação" />
              <ErrorBox error={err} />
              <Button kind="danger" disabled={signer.length < 2} onClick={authorize}>Autorizar (use o nome acima)</Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
