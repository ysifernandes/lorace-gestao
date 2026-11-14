// Cliente da API. O painel guarda apenas o ADMIN_TOKEN (na sessão do navegador);
// segredos de provedores (Claude, ElevenLabs, YouTube) ficam exclusivamente no backend.
const KEY = "autopilot_admin_token";

export const getToken = () => {
  try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; }
};
export const setToken = (t) => {
  try { sessionStorage.setItem(KEY, t); } catch { /* sessão indisponível */ }
};

export class ApiError extends Error {
  constructor(status, detail) {
    super(typeof detail === "string" ? detail : detail?.message || JSON.stringify(detail));
    this.status = status;
    this.detail = detail;
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const isJson = res.headers.get("content-type")?.includes("json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) throw new ApiError(res.status, data?.detail ?? data);
  return data;
}

export const mediaUrl = (videoId, kind, bust = "") => {
  const t = getToken();
  return `/api/videos/${videoId}/media/${kind}?${t ? `token=${encodeURIComponent(t)}&` : ""}v=${bust}`;
};
