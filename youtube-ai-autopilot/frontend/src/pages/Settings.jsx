import { useEffect, useState } from "react";
import { api } from "../api";
import { Button, Card, ErrorBox, useApi, useToast } from "../ui";

const FIELDS = [
  ["Canal", [
    ["channel_name", "Nome do canal", "text"],
    ["niche", "Nicho", "text"],
    ["niche_keywords", "Palavras-chave do nicho (vírgula)", "list"],
    ["language", "Idioma (ex.: pt-BR)", "text"],
    ["region", "Região (ex.: BR)", "text"],
  ]],
  ["Produção", [
    ["daily_videos", "Vídeos por dia", "number"],
    ["video_format", "Formato", ["short", "long", "both"]],
    ["short_duration_sec", "Duração do Short (s)", "number"],
    ["long_duration_sec", "Duração do vídeo horizontal (s)", "number"],
    ["narration_style", "Estilo de narração", "text"],
    ["budget_per_video_usd", "Orçamento por vídeo (US$)", "number"],
    ["min_days_between_similar", "Dias mínimos entre temas parecidos", "number"],
  ]],
  ["Agenda e publicação", [
    ["timezone", "Fuso horário", "text"],
    ["pipeline_run_time", "Horário da execução diária", "time"],
    ["post_time", "Horário de postagem", "time"],
    ["scheduler_enabled", "Scheduler diário ativo", "bool"],
    ["mode", "Modo", ["review", "auto"]],
    ["default_privacy", "Privacidade", ["private", "unlisted", "public"]],
    ["declare_synthetic_media", "Declarar conteúdo sintético/IA ao YouTube", "bool"],
    ["made_for_kids", "Conteúdo para crianças", "bool"],
  ]],
];

const LABELS = { review: "Revisão humana", auto: "Publicação automática", short: "Short 1080×1920", long: "Horizontal 1920×1080",
  both: "Ambos", private: "Privado", unlisted: "Não listado", public: "Público (agendado no horário de postagem)" };

export default function Settings() {
  const { data, error, reload } = useApi("/config");
  const [form, setForm] = useState(null);
  const [err, setErr] = useState(null);
  const [toast, toastNode] = useToast();
  useEffect(() => { if (data) setForm({ ...data, niche_keywords: data.niche_keywords.join(", ") }); }, [data]);
  if (error) return <ErrorBox error={error} />;
  if (!form) return <div className="spinner" />;
  const set = (k, v) => setForm({ ...form, [k]: v });
  const save = async () => {
    setErr(null);
    const body = { ...form, niche_keywords: form.niche_keywords.split(",").map((s) => s.trim()).filter(Boolean) };
    ["daily_videos", "short_duration_sec", "long_duration_sec", "min_days_between_similar"].forEach((k) => (body[k] = parseInt(body[k], 10)));
    body.budget_per_video_usd = parseFloat(body.budget_per_video_usd);
    try { await api("/config", { method: "PUT", body }); toast("Configurações salvas"); reload(); } catch (e) { setErr(e); }
  };
  return (
    <div className="page">
      {toastNode}
      <header className="page-head"><div><h1>Configurações</h1><p className="muted">Preferências editoriais. Chaves de API são definidas apenas no servidor (.env).</p></div>
        <Button kind="primary" onClick={save}>Salvar</Button></header>
      <ErrorBox error={err} />
      <div className="grid three">
        {FIELDS.map(([group, fields]) => (
          <Card key={group} title={group}>
            {fields.map(([k, label, type]) => (
              <label key={k} className="field">
                <span>{label}</span>
                {Array.isArray(type) ? (
                  <select value={form[k]} onChange={(e) => set(k, e.target.value)}>{type.map((o) => <option key={o} value={o}>{LABELS[o] || o}</option>)}</select>
                ) : type === "bool" ? (
                  <input type="checkbox" checked={!!form[k]} onChange={(e) => set(k, e.target.checked)} />
                ) : (
                  <input type={type === "list" ? "text" : type} value={form[k]} onChange={(e) => set(k, e.target.value)} step={k === "budget_per_video_usd" ? "0.1" : undefined} />
                )}
              </label>
            ))}
          </Card>
        ))}
      </div>
      {form.mode === "auto" && !data.auto_publish_authorized && <div className="banner warn">O modo automático exige autorização explícita em Integrações & Prontidão.</div>}
    </div>
  );
}
