// Bloom Planner: conexão com Instagram e TikTok (Supabase Edge Function "social")
//
// Rotas (todas sob /functions/v1/social):
//   POST /start               { platform, return_to }  -> { url }   (usuária logada)
//   GET  /callback/instagram  ?code&state                            (redirecionamento da Meta)
//   GET  /callback/tiktok     ?code&state                            (redirecionamento do TikTok)
//   POST /sync                {}                                     (usuária logada: atualiza agora)
//   POST /sync                header x-cron-secret                   (agendamento diário: todas as contas)
//   POST /choices / /choose   { ext_id }                             (usuária logada: escolher a conta do Instagram)
//   POST /analyze             { posts }                              (usuária logada: análise dos resultados pela Claude)
//   POST /script              { titulo, formato, notas }             (usuária logada: gancho, roteiro e legenda de uma ideia)
//   POST /disconnect          { platform }                           (usuária logada)
//   POST /push-tick           header x-cron-secret                   (a cada 5 min: envia lembretes como notificação)
//   POST /push-test                                                  (usuária logada: notificação de teste)
//   POST /delete-account                                             (usuária logada: apaga conta e todos os dados)
//   POST /data-deletion                                              (pedido de exclusão de dados da Meta)
//
// Segredos (Supabase → Edge Functions → Secrets):
//   META_APP_ID, META_APP_SECRET, META_CONFIG_ID (Instagram pelo Login do Facebook para Empresas, apps novos)
//   ou IG_APP_ID, IG_APP_SECRET (Instagram pelo login do Instagram, apps antigos)
//   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, APP_URL, CRON_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';
import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');
const IG_APP_ID = Deno.env.get('IG_APP_ID') ?? '';
const IG_APP_SECRET = Deno.env.get('IG_APP_SECRET') ?? '';
const META_APP_ID = Deno.env.get('META_APP_ID') ?? '';
const META_APP_SECRET = Deno.env.get('META_APP_SECRET') ?? '';
const META_CONFIG_ID = Deno.env.get('META_CONFIG_ID') ?? '';
const FB = 'https://graph.facebook.com/v21.0';
const fbMode = () => !!(META_APP_ID && META_APP_SECRET);
const igConfigured = () => fbMode() || !!(IG_APP_ID && IG_APP_SECRET);
const TT_KEY = Deno.env.get('TIKTOK_CLIENT_KEY') ?? '';
const TT_SECRET = Deno.env.get('TIKTOK_CLIENT_SECRET') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
const AI_PER_DAY = 30; // pedidos à Claude por usuária por dia (análises + roteiros)
const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'https://bloom-planner-nine.vercel.app';
if (VAPID_PUBLIC && VAPID_PRIVATE) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const FN_BASE = `${SUPABASE_URL}/functions/v1/social`;
const REDIRECT: Record<string, string> = {
  instagram: `${FN_BASE}/callback/instagram`,
  tiktok: `${FN_BASE}/callback/tiktok`,
};
const IG = 'https://graph.instagram.com';
const TT = 'https://open.tiktokapis.com/v2';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

type Platform = 'instagram' | 'tiktok';
const isPlatform = (p: unknown): p is Platform => p === 'instagram' || p === 'tiktok';
const nowIso = () => new Date().toISOString();

async function userFrom(req: Request) {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user;
}

function safeReturn(url?: string | null) {
  try {
    if (url && APP_URL && new URL(url).origin === new URL(APP_URL).origin) return url;
  } catch { /* ignore */ }
  return APP_URL || SUPABASE_URL;
}
function backTo(returnTo: string | null | undefined, params: Record<string, string>) {
  const u = new URL(safeReturn(returnTo));
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return Response.redirect(u.toString(), 302);
}
function page(msg: string, status = 400) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bloom</title><body style="font-family:system-ui;padding:32px;max-width:520px;margin:auto;color:#3b2326"><h2>Bloom</h2><p>${msg}</p>${APP_URL ? `<p><a href="${APP_URL}">Voltar para o Bloom</a></p>` : ''}</body>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/* ---------------- Instagram ---------------- */
async function igGet(path: string, token: string) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`${IG}/${path}${sep}access_token=${encodeURIComponent(token)}`);
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`instagram ${path.split('?')[0]}: ${j.error?.message ?? r.status}`);
  return j;
}
async function fbGet(path: string, token: string) {
  const sep = path.includes('?') ? '&' : '?';
  const r = await fetch(`${FB}/${path}${sep}access_token=${encodeURIComponent(token)}`);
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`facebook ${path.split('?')[0]}: ${j.error?.message ?? r.status}`);
  return j;
}
async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}
async function igInsights(mediaId: string, token: string, get = igGet) {
  const out: Record<string, number> = {};
  const sets = ['reach,saved,shares,views,total_interactions', 'reach,saved,shares,total_interactions', 'reach,saved,shares', 'reach,saved'];
  const read = (j: any) => {
    for (const d of j.data ?? []) {
      const v = d.values?.[0]?.value ?? d.total_value?.value;
      if (typeof v === 'number') out[d.name === 'saved' ? 'saves' : d.name] = v;
    }
  };
  const follows = get(`${mediaId}/insights?metric=follows`, token).catch(() => null); // nem todo post tem
  for (const s of sets) {
    try { read(await get(`${mediaId}/insights?metric=${s}`, token)); break; } catch { /* tenta um conjunto menor */ }
  }
  const f = await follows; if (f) read(f);
  return out;
}
async function syncInstagram(userId: string, tok: any) {
  let access = tok.access_token as string;
  // Login do Facebook para Empresas: token da página (não expira) + id da conta profissional do Instagram
  const fbIg = typeof tok.refresh_token === 'string' && tok.refresh_token.startsWith('fb:') ? tok.refresh_token.slice(3) : '';
  const get = fbIg ? fbGet : igGet;
  if (!fbIg && tok.expires_at && new Date(tok.expires_at).getTime() - Date.now() < 20 * 864e5) {
    try {
      const rr = await igGet(`refresh_access_token?grant_type=ig_refresh_token`, access);
      if (rr.access_token) {
        access = rr.access_token;
        await admin.from('social_tokens').update({ access_token: access, expires_at: new Date(Date.now() + (rr.expires_in ?? 5184000) * 1000).toISOString(), updated_at: nowIso() }).eq('user_id', userId).eq('platform', 'instagram');
      }
    } catch (e) { console.error('ig refresh', e); }
  }
  const me = await get(fbIg ? `${fbIg}?fields=id,username,profile_picture_url,followers_count,media_count` : 'me?fields=user_id,username,profile_picture_url,followers_count,media_count', access);
  const media = await get(`${fbIg || 'me'}/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=40`, access);
  const rows = await pool((media.data ?? []) as any[], 10, async (m) => {
    const metrics: Record<string, number> = { likes: m.like_count ?? 0, comments: m.comments_count ?? 0 };
    Object.assign(metrics, await igInsights(m.id, access, get));
    return {
      user_id: userId, platform: 'instagram', ext_id: String(m.id), caption: m.caption ?? '', permalink: m.permalink ?? '',
      media_type: m.media_product_type === 'REELS' ? 'reels' : m.media_type === 'CAROUSEL_ALBUM' ? 'carrossel' : m.media_type === 'VIDEO' ? 'reels' : 'post',
      thumbnail_url: m.thumbnail_url ?? m.media_url ?? null, posted_at: m.timestamp ?? null, metrics, synced_at: nowIso(),
    };
  });
  if (rows.length) {
    const { error } = await admin.from('social_posts').upsert(rows);
    if (error) throw new Error('db: ' + error.message);
  }
  await admin.from('social_accounts').update({
    ext_user_id: String(me.user_id ?? me.id ?? ''), username: me.username ?? null, avatar_url: me.profile_picture_url ?? null,
    followers: me.followers_count ?? null, last_sync: nowIso(), last_error: null,
  }).eq('user_id', userId).eq('platform', 'instagram');
  return rows.length;
}

async function useIgChoice(userId: string, extId: string) {
  const { data: ch } = await admin.from('social_choices').select('*').eq('user_id', userId).eq('platform', 'instagram').eq('ext_id', extId).maybeSingle();
  if (!ch) return false;
  const { data: cur } = await admin.from('social_tokens').select('refresh_token').eq('user_id', userId).eq('platform', 'instagram').maybeSingle();
  if (cur?.refresh_token !== 'fb:' + extId) await admin.from('social_posts').delete().eq('user_id', userId).eq('platform', 'instagram'); // números da conta anterior saem
  await admin.from('social_tokens').upsert({ user_id: userId, platform: 'instagram', access_token: ch.access_token, refresh_token: 'fb:' + extId, expires_at: null, updated_at: nowIso() });
  await admin.from('social_accounts').upsert({ user_id: userId, platform: 'instagram', connected_at: nowIso(), last_error: null, username: ch.username, avatar_url: ch.avatar_url });
  return true;
}

/* ---------------- TikTok ---------------- */
async function ttToken(params: Record<string, string>) {
  const r = await fetch(`${TT}/oauth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({ client_key: TT_KEY, client_secret: TT_SECRET, ...params }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`tiktok token: ${j.error_description ?? j.error ?? r.status}`);
  return j;
}
async function saveTtTokens(userId: string, j: any) {
  await admin.from('social_tokens').upsert({
    user_id: userId, platform: 'tiktok', access_token: j.access_token, refresh_token: j.refresh_token ?? null,
    expires_at: new Date(Date.now() + (j.expires_in ?? 86400) * 1000).toISOString(),
    refresh_expires_at: j.refresh_expires_in ? new Date(Date.now() + j.refresh_expires_in * 1000).toISOString() : null,
    updated_at: nowIso(),
  });
}
async function syncTikTok(userId: string, tok: any) {
  let access = tok.access_token as string;
  if (!tok.expires_at || new Date(tok.expires_at).getTime() - Date.now() < 3600e3) {
    if (!tok.refresh_token) throw new Error('tiktok: conexão expirou, conecte de novo');
    const j = await ttToken({ grant_type: 'refresh_token', refresh_token: tok.refresh_token });
    await saveTtTokens(userId, j);
    access = j.access_token;
  }
  const H = { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' };
  const ur = await fetch(`${TT}/user/info/?fields=open_id,display_name,avatar_url,follower_count`, { headers: H });
  const uj = await ur.json();
  if (uj.error && uj.error.code !== 'ok') throw new Error(`tiktok user: ${uj.error.message || uj.error.code}`);
  const user = uj.data?.user ?? {};
  const fields = 'id,title,video_description,create_time,share_url,cover_image_url,view_count,like_count,comment_count,share_count';
  const rows = [];
  let cursor: number | undefined;
  for (let page = 0; page < 3; page++) {
    const r = await fetch(`${TT}/video/list/?fields=${fields}`, { method: 'POST', headers: H, body: JSON.stringify(cursor ? { max_count: 20, cursor } : { max_count: 20 }) });
    const j = await r.json();
    if (j.error && j.error.code !== 'ok') throw new Error(`tiktok videos: ${j.error.message || j.error.code}`);
    for (const v of j.data?.videos ?? []) {
      rows.push({
        user_id: userId, platform: 'tiktok', ext_id: String(v.id), caption: v.video_description || v.title || '', permalink: v.share_url ?? '',
        media_type: 'curto', thumbnail_url: v.cover_image_url ?? null, posted_at: v.create_time ? new Date(v.create_time * 1000).toISOString() : null,
        metrics: { views: v.view_count ?? 0, likes: v.like_count ?? 0, comments: v.comment_count ?? 0, shares: v.share_count ?? 0 }, synced_at: nowIso(),
      });
    }
    if (!j.data?.has_more) break;
    cursor = j.data.cursor;
  }
  if (rows.length) {
    const { error } = await admin.from('social_posts').upsert(rows);
    if (error) throw new Error('db: ' + error.message);
  }
  await admin.from('social_accounts').update({
    ext_user_id: user.open_id ?? null, username: user.display_name ?? null, avatar_url: user.avatar_url ?? null,
    followers: user.follower_count ?? null, last_sync: nowIso(), last_error: null,
  }).eq('user_id', userId).eq('platform', 'tiktok');
  return rows.length;
}

async function syncAccount(userId: string, platform: Platform) {
  const { data: tok } = await admin.from('social_tokens').select('*').eq('user_id', userId).eq('platform', platform).maybeSingle();
  if (!tok) return { platform, ok: false, error: 'not_connected' };
  try {
    const count = platform === 'instagram' ? await syncInstagram(userId, tok) : await syncTikTok(userId, tok);
    return { platform, ok: true, count };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e).slice(0, 300);
    console.error('sync', platform, msg);
    await admin.from('social_accounts').update({ last_error: msg, last_sync: nowIso() }).eq('user_id', userId).eq('platform', platform);
    return { platform, ok: false, error: msg };
  }
}

/* ---------------- Notificações (Web Push) ---------------- */
// Horários do planner são "hora local" sem fuso. Trabalhamos com minutos "ingênuos" (como se fossem UTC).
const naive = (date: string, time: string) => { const [y, m, d] = date.split('-').map(Number); const [h, mi] = (time || '00:00').split(':').map(Number); return Date.UTC(y, m - 1, d, h, mi) / 60000; };
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
function localNowNaive(tz: string) {
  let parts: Record<string, string> = {};
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  } catch { return localNowNaive('America/Sao_Paulo'); }
  return naive(`${parts.year}-${parts.month}-${parts.day}`, `${parts.hour}:${parts.minute}`);
}
const dowOf = (date: string) => new Date(date + 'T00:00:00Z').getUTCDay();
function occursOn(it: any, date: string) {
  if (!it.due) return false;
  const rep = it.repeat && it.repeat !== 'none' ? it.repeat : null;
  if (!rep) return it.due === date;
  if (date < it.due) return false;
  if (rep === 'daily') return true;
  if (rep === 'weekdays') { const d = dowOf(date); return d >= 1 && d <= 5; }
  if (rep === 'weekly') return dowOf(date) === dowOf(it.due);
  if (rep === 'monthly') return date.slice(8) === it.due.slice(8);
  return false;
}
const isDoneOn = (it: any, date: string) => (it.repeat && it.repeat !== 'none' ? !!(it.doneDates && it.doneDates[date]) : !!it.done);

// "Insistir até concluir": depois do 1º lembrete, repete a cada N minutos até a tarefa ser concluída.
// Com "adiar" (it.snooze = 'AAAA-MM-DDTHH:MM'), volta a avisar nesse horário e segue repetindo dali.
function nagSlot(base: number, snooze: number, now: number, every: number, win: number) {
  let anchor = base, k0 = 1;
  if (snooze && snooze > base) { if (now < snooze) return null; anchor = snooze; k0 = 0; }
  if (now < anchor) return null;
  if (!every) return k0 === 0 && now - anchor < win ? { anchor, k: 0 } : null;
  const k = Math.floor((now - anchor) / every);
  if (k < k0) return null;
  return now - (anchor + k * every) < win ? { anchor, k } : null;
}
const snoozeMin = (it: any) => (typeof it.snooze === 'string' && it.snooze.length >= 16 ? naive(it.snooze.slice(0, 10), it.snooze.slice(11, 16)) : 0);
function pendingNags(core: any, nowN: number) {
  const out: { key: string; id: string; date: string; text: string; since: string }[] = [];
  const every = core?.ui?.nagMin === undefined || core?.ui?.nagMin === null ? 30 : Number(core.ui.nagMin) || 0;
  const hour = Math.floor((((nowN % 1440) + 1440) % 1440) / 60);
  const quiet = core?.ui?.nagQuiet !== false && (hour >= 22 || hour < 8);
  const today = isoDay(nowN * 60000);
  const oldest = isoDay((nowN - 14 * 1440) * 60000);
  for (const it of core?.tasks?.items ?? []) {
    if (it.remindMin === undefined || it.remindMin === null || it.remindMin === '' || !it.due) continue;
    const rep = it.repeat && it.repeat !== 'none';
    const dates = rep ? [today] : (it.due <= today && it.due >= oldest ? [it.due] : []);
    for (const d of dates) {
      if (!occursOn(it, d) || isDoneOn(it, d)) continue;
      const base = naive(d, it.time || '09:00') - Number(it.remindMin);
      const slot = nagSlot(base, snoozeMin(it), nowN, it.nag === 'off' ? 0 : every, 15);
      if (!slot || (quiet && slot.k > 0)) continue;
      out.push({ key: `n:${it.id}:${d}:${slot.anchor}:${slot.k}`, id: it.id, date: d, text: it.text, since: d === today ? (it.time ? `era às ${it.time}` : 'era para hoje') : `atrasada desde ${d.slice(8)}/${d.slice(5, 7)}` });
    }
  }
  return out;
}

function dueReminders(core: any, biz: any, nowN: number) {
  const out: { key: string; title: string; body: string; tag?: string; url?: string }[] = [];
  const WINDOW = 15; // minutos de tolerância para atrasos do agendador
  const today = isoDay(nowN * 60000);
  const days = [isoDay((nowN - 1440) * 60000), today, isoDay((nowN + 1440) * 60000)];
  for (const it of core?.tasks?.items ?? []) {
    if (it.remindMin === undefined || it.remindMin === null || it.remindMin === '' || !it.due) continue;
    for (const d of days) {
      if (!occursOn(it, d) || isDoneOn(it, d)) continue;
      const fire = naive(d, it.time || '09:00') - Number(it.remindMin);
      if (fire <= nowN && fire > nowN - WINDOW) {
        const when = it.time ? (d === today ? `hoje às ${it.time}` : `amanhã às ${it.time}`) : 'para hoje';
        out.push({ key: `i:${it.id}:${d}`, title: `⏰ ${it.text}`, body: `Lembrete: ${when} · toque para concluir ou adiar`, tag: `t:${it.id}`, url: `?task=${encodeURIComponent(it.id + ':' + d)}` });
      }
    }
  }
  for (const p of biz?.posts ?? []) {
    if (!p.date || !p.time || p.status === 'publicado') continue;
    const fire = naive(p.date, p.time);
    if (fire <= nowN && fire > nowN - WINDOW) out.push({ key: `p:${p.id}:${p.date}T${p.time}`, title: '📸 Hora de postar', body: p.title || 'Seu conteúdo está agendado para agora' });
  }
  return out;
}
async function sendTo(sub: any, payload: Record<string, string>) {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600 });
    return true;
  } catch (e) {
    const code = (e as any)?.statusCode;
    if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    else console.error('push', code, String((e as any)?.body ?? e).slice(0, 200));
    return false;
  }
}
async function pushTick() {
  const { data: subs } = await admin.from('push_subscriptions').select('*');
  const byUser = new Map<string, any[]>();
  for (const s of subs ?? []) { if (!byUser.has(s.user_id)) byUser.set(s.user_id, []); byUser.get(s.user_id)!.push(s); }
  let sent = 0;
  for (const [uid, list] of byUser) {
    const { data: docs } = await admin.from('planner_docs').select('name,json').eq('user_id', uid).in('name', ['core', 'biz']);
    let core: any = {}, biz: any = {};
    try { core = JSON.parse(docs?.find((d) => d.name === 'core')?.json ?? '{}'); } catch { /* vazio */ }
    try { biz = JSON.parse(docs?.find((d) => d.name === 'biz')?.json ?? '{}').biz ?? {}; } catch { /* vazio */ }
    const nowN = localNowNaive(list[0].tz || 'America/Sao_Paulo');
    const base = (APP_URL || '') + '/';
    for (const r of dueReminders(core, biz, nowN)) {
      const { error } = await admin.from('push_sent').insert({ user_id: uid, key: r.key });
      if (error) continue; // já enviado
      for (const sub of list) if (await sendTo(sub, { title: r.title, body: r.body, url: base + (r.url || ''), tag: r.tag || '' })) sent++;
    }
    // tarefas que continuam sem concluir: um aviso só, juntando todas
    const nags: any[] = [];
    for (const n of pendingNags(core, nowN)) {
      const { error } = await admin.from('push_sent').insert({ user_id: uid, key: n.key });
      if (!error) nags.push(n);
    }
    if (nags.length) {
      const one = nags.length === 1;
      const payload = {
        title: one ? `⏰ Ainda pendente: ${nags[0].text}` : `⏰ ${nags.length} tarefas ainda pendentes`,
        body: one ? `${nags[0].since} · toque para concluir ou adiar` : nags.slice(0, 4).map((n) => '• ' + n.text).join('\n') + (nags.length > 4 ? `\n+ ${nags.length - 4}` : ''),
        url: base + '?task=' + encodeURIComponent(nags.map((n) => n.id + ':' + n.date).join(',')),
        tag: 'bloom-pendentes',
      };
      for (const sub of list) if (await sendTo(sub, payload)) sent++;
    }
  }
  await admin.from('push_sent').delete().lt('sent_at', new Date(Date.now() - 4 * 864e5).toISOString());
  return { users: byUser.size, sent };
}

/* ---------------- Análise dos resultados (Claude) ---------------- */
const AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['resumo', 'fazer_mais', 'ganchos', 'melhor_horario', 'evitar', 'proximas_ideias'],
  properties: {
    resumo: { type: 'string' },
    fazer_mais: { type: 'array', items: { type: 'string' } },
    ganchos: { type: 'array', items: { type: 'string' } },
    melhor_horario: { type: 'string' },
    evitar: { type: 'array', items: { type: 'string' } },
    proximas_ideias: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['titulo', 'formato', 'por_que', 'gancho', 'roteiro', 'legenda'],
        properties: {
          titulo: { type: 'string' },
          formato: { type: 'string', enum: ['reels', 'carrossel', 'stories', 'post'] },
          por_que: { type: 'string' },
          gancho: { type: 'string' },
          roteiro: { type: 'string' },
          legenda: { type: 'string' },
        },
      },
    },
  },
};
const AI_SYSTEM = `Você é uma estrategista de conteúdo para pequenas empreendedoras brasileiras. Você recebe os resultados dos posts de uma empreendedora (JSON) e devolve uma análise curta e prática, em português do Brasil, com tom acolhedor e direto.
A "nota_0_100" compara o engajamento e as visualizações de cada post com a média da própria empreendedora (50 = na média).
Baseie cada conclusão nos números recebidos; se houver poucos posts, diga que a conclusão é preliminar. Não invente números.
Campos: "resumo" (2 a 3 frases), "fazer_mais" (até 3 itens), "ganchos" (até 3 ganchos ou começos que funcionaram, citando o post), "melhor_horario" (1 frase), "evitar" (até 2 itens), "proximas_ideias" (3 ideias de post, cada uma pronta para produzir):
- "formato": reels, carrossel, stories ou post.
- "gancho": a primeira frase falada ou escrita, que prende nos 3 primeiros segundos.
- "roteiro": para reels e stories, um roteiro de 30 a 60 segundos dividido em cenas, cada linha no formato "CENA 1 (o que aparece): o que ela fala"; para carrossel, o texto de cada slide ("SLIDE 1: ..."); para post, o texto da arte. Termine com uma chamada para ação. Use a voz da empreendedora, em primeira pessoa, e frases curtas.
- "legenda": legenda pronta para o Instagram, com 2 a 4 parágrafos curtos, chamada para ação e até 5 hashtags no final.`;
// mantém só campos conhecidos e textos curtos: o que vai para a Claude é decidido aqui, não pelo app
function cleanPosts(raw: unknown) {
  const keys = ['titulo', 'rede', 'formato', 'pasta', 'data', 'dia_semana', 'hora', 'gancho', 'nota_0_100', 'minha_avaliacao', 'o_que_funcionou', 'views', 'reach', 'likes', 'comments', 'saves', 'shares', 'follows', 'clicks', 'sales'];
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 150).map((p: any) => {
    const o: Record<string, unknown> = {};
    for (const k of keys) {
      const v = p?.[k];
      if (typeof v === 'number' && Number.isFinite(v)) o[k] = v;
      else if (typeof v === 'string' && v.trim()) o[k] = v.slice(0, 200);
    }
    return o;
  });
}
const SCRIPT_RULES = `- "gancho": a primeira frase falada ou escrita, que prende nos 3 primeiros segundos.
- "roteiro": para reels e stories, um roteiro de 30 a 60 segundos dividido em cenas, cada linha no formato "CENA 1 (o que aparece): o que ela fala"; para carrossel, o texto de cada slide ("SLIDE 1: ..."); para post, o texto da arte. Termine com uma chamada para ação. Use a voz da empreendedora, em primeira pessoa, e frases curtas.
- "legenda": legenda pronta para o Instagram, com 2 a 4 parágrafos curtos, chamada para ação e até 5 hashtags no final.`;
const SCRIPT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['gancho', 'roteiro', 'legenda'],
  properties: { gancho: { type: 'string' }, roteiro: { type: 'string' }, legenda: { type: 'string' } },
};
async function aiAllowed(userId: string) {
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await admin.from('ai_usage').select('user_id', { count: 'exact', head: true }).eq('user_id', userId).gte('at', since);
  if ((count ?? 0) >= AI_PER_DAY) return false;
  await admin.from('ai_usage').insert({ user_id: userId });
  return true;
}
// uma chamada à Claude com saída em JSON no formato pedido
async function askClaude(system: string, user: string, schema: unknown) {
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
  try {
    const resp: any = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default', // se o pedido for recusado, a própria API tenta de novo em outro modelo
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      system,
      messages: [{ role: 'user', content: user }],
    } as any);
    if (resp.stop_reason === 'refusal') return { status: 422, body: { error: 'refused' } };
    if (resp.stop_reason === 'max_tokens') return { status: 502, body: { error: 'truncated' } };
    const text = (resp.content ?? []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    return { status: 200, body: { ok: true, data: JSON.parse(text) } };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) { console.error('ai auth'); return { status: 400, body: { error: 'bad_key' } }; }
    if (e instanceof Anthropic.RateLimitError) return { status: 429, body: { error: 'rate_limited' } };
    if (e instanceof Anthropic.APIError) { console.error('ai api', e.status, e.message); return { status: 502, body: { error: 'api', status: e.status } }; }
    if (e instanceof SyntaxError) { console.error('ai json'); return { status: 502, body: { error: 'bad_output' } }; }
    console.error('ai', e);
    return { status: 500, body: { error: 'failed' } };
  }
}
async function writeScript(userId: string, body: any) {
  if (!ANTHROPIC_KEY) return { status: 400, body: { error: 'not_configured' } };
  const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
  const titulo = clip(body?.titulo, 200);
  if (!titulo) return { status: 400, body: { error: 'no_title' } };
  if (!(await aiAllowed(userId))) return { status: 429, body: { error: 'rate_limited' } };
  const ideia = { titulo, formato: clip(body?.formato, 40) || 'reels', por_que: clip(body?.por_que, 300), gancho_atual: clip(body?.gancho, 200), notas: clip(body?.notas, 500), pasta: clip(body?.pasta, 80) };
  const system = `Você é roteirista de conteúdo para pequenas empreendedoras brasileiras no Instagram e no TikTok. Escreva em português do Brasil, com tom acolhedor e direto. Use só o que a ideia diz; não invente dados, preços ou promessas sobre o negócio dela.\n${SCRIPT_RULES}`;
  return askClaude(system, `Ideia de conteúdo (JSON):\n${JSON.stringify(ideia)}`, SCRIPT_SCHEMA);
}
async function analyzePosts(userId: string, raw: unknown) {
  if (!ANTHROPIC_KEY) return { status: 400, body: { error: 'not_configured' } };
  const posts = cleanPosts(raw);
  if (posts.length < 2) return { status: 400, body: { error: 'few_posts' } };
  if (!(await aiAllowed(userId))) return { status: 429, body: { error: 'rate_limited' } };
  return askClaude(AI_SYSTEM, `Resultados dos posts (JSON):\n${JSON.stringify(posts)}`, AI_SCHEMA);
}

/* ---------------- Rotas ---------------- */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const route = parts.slice(parts.indexOf('social') + 1);

  try {
    if (route[0] === 'start' && req.method === 'POST') {
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { platform, return_to } = await req.json().catch(() => ({}));
      if (!isPlatform(platform)) return json({ error: 'bad_platform' }, 400);
      if (platform === 'instagram' && !igConfigured()) return json({ error: 'not_configured' }, 400);
      if (platform === 'tiktok' && (!TT_KEY || !TT_SECRET)) return json({ error: 'not_configured' }, 400);
      await admin.from('oauth_states').delete().lt('created_at', new Date(Date.now() - 3600e3).toISOString());
      const state = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const { error } = await admin.from('oauth_states').insert({ state, user_id: user.id, platform, return_to: safeReturn(return_to) });
      if (error) return json({ error: 'db', detail: error.message }, 500);
      const authUrl = platform === 'instagram' && fbMode()
        ? `https://www.facebook.com/v21.0/dialog/oauth?` + new URLSearchParams({ client_id: META_APP_ID, redirect_uri: REDIRECT.instagram, response_type: 'code', state, ...(META_CONFIG_ID ? { config_id: META_CONFIG_ID } : { scope: 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement,business_management' }) })
        : platform === 'instagram'
        ? 'https://www.instagram.com/oauth/authorize?' + new URLSearchParams({ enable_fb_login: '0', force_authentication: '1', client_id: IG_APP_ID, redirect_uri: REDIRECT.instagram, response_type: 'code', scope: 'instagram_business_basic,instagram_business_manage_insights', state })
        : 'https://www.tiktok.com/v2/auth/authorize/?' + new URLSearchParams({ client_key: TT_KEY, scope: 'user.info.basic,user.info.stats,video.list', response_type: 'code', redirect_uri: REDIRECT.tiktok, state });
      return json({ url: authUrl });
    }

    if (route[0] === 'callback' && isPlatform(route[1])) {
      const platform = route[1];
      const state = url.searchParams.get('state') ?? '';
      const { data: st } = await admin.from('oauth_states').select('*').eq('state', state).maybeSingle();
      if (!st || st.platform !== platform) return page('Esse link de conexão expirou. Volte para o Bloom e tente conectar de novo.');
      await admin.from('oauth_states').delete().eq('state', state);
      const code = (url.searchParams.get('code') ?? '').replace(/#_$/, '');
      if (url.searchParams.get('error') || !code) return backTo(st.return_to, { social: 'cancelled', platform });
      try {
        if (platform === 'instagram' && fbMode()) {
          const q = (o: Record<string, string>) => new URLSearchParams({ client_id: META_APP_ID, client_secret: META_APP_SECRET, ...o }).toString();
          const r1 = await fetch(`${FB}/oauth/access_token?` + q({ redirect_uri: REDIRECT.instagram, code }));
          const j1 = await r1.json();
          if (!j1.access_token) throw new Error('facebook token: ' + (j1.error?.message ?? r1.status));
          let userTok = j1.access_token;
          try {
            const r2 = await fetch(`${FB}/oauth/access_token?` + q({ grant_type: 'fb_exchange_token', fb_exchange_token: userTok }));
            const j2 = await r2.json();
            if (j2.access_token) userTok = j2.access_token;
          } catch (e) { console.error('fb long-lived', e); }
          // a conta profissional do Instagram fica ligada a uma página do Facebook
          const pages = await fbGet('me/accounts?fields=id,name,access_token,instagram_business_account{id,username,profile_picture_url}&limit=100', userTok);
          const found = (pages.data ?? []).filter((x: any) => x.instagram_business_account?.id);
          if (!found.length) return backTo(st.return_to, { social: 'error', platform, reason: 'no_page' });
          // guarda todas as contas liberadas, para a usuária escolher (e poder trocar depois)
          await admin.from('social_choices').delete().eq('user_id', st.user_id).eq('platform', platform);
          await admin.from('social_choices').insert(found.map((x: any) => ({ user_id: st.user_id, platform, ext_id: x.instagram_business_account.id, username: x.instagram_business_account.username ?? null, page_name: x.name ?? null, avatar_url: x.instagram_business_account.profile_picture_url ?? null, access_token: x.access_token || userTok })));
          if (found.length > 1) return backTo(st.return_to, { social: 'choose', platform });
          await useIgChoice(st.user_id, found[0].instagram_business_account.id);
        } else if (platform === 'instagram') {
          const r = await fetch('https://api.instagram.com/oauth/access_token', {
            method: 'POST',
            body: new URLSearchParams({ client_id: IG_APP_ID, client_secret: IG_APP_SECRET, grant_type: 'authorization_code', redirect_uri: REDIRECT.instagram, code }),
          });
          const j = await r.json();
          const short = j.access_token ?? j.data?.[0]?.access_token;
          if (!short) throw new Error('instagram token: ' + (j.error_message ?? j.error?.message ?? r.status));
          let token = short;
          let expires = new Date(Date.now() + 3600e3).toISOString();
          try {
            const ll = await igGet(`access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(IG_APP_SECRET)}`, short);
            if (ll.access_token) { token = ll.access_token; expires = new Date(Date.now() + (ll.expires_in ?? 5184000) * 1000).toISOString(); }
          } catch (e) { console.error('ig long-lived', e); }
          await admin.from('social_tokens').upsert({ user_id: st.user_id, platform, access_token: token, refresh_token: null, expires_at: expires, updated_at: nowIso() });
        } else {
          const j = await ttToken({ code, grant_type: 'authorization_code', redirect_uri: REDIRECT.tiktok });
          await saveTtTokens(st.user_id, j);
        }
        await admin.from('social_accounts').upsert({ user_id: st.user_id, platform, connected_at: nowIso(), last_error: null });
        await syncAccount(st.user_id, platform);
        return backTo(st.return_to, { social: 'connected', platform });
      } catch (e) {
        console.error('callback', platform, e);
        return backTo(st.return_to, { social: 'error', platform });
      }
    }

    if (route[0] === 'sync' && req.method === 'POST') {
      if (CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET) {
        const { data: accounts } = await admin.from('social_accounts').select('user_id, platform');
        const results = [];
        for (const a of accounts ?? []) results.push(await syncAccount(a.user_id, a.platform as Platform));
        return json({ ok: true, synced: results.length, failed: results.filter((r) => !r.ok).length });
      }
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { data: accounts } = await admin.from('social_accounts').select('platform').eq('user_id', user.id);
      const results = [];
      for (const a of accounts ?? []) results.push(await syncAccount(user.id, a.platform as Platform));
      return json({ ok: true, results });
    }

    if (route[0] === 'analyze' && req.method === 'POST') {
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { posts } = await req.json().catch(() => ({}));
      const r = await analyzePosts(user.id, posts);
      return json(r.body, r.status);
    }

    if (route[0] === 'script' && req.method === 'POST') {
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const body = await req.json().catch(() => ({}));
      const r = await writeScript(user.id, body);
      return json(r.body, r.status);
    }

    if (route[0] === 'choices' && req.method === 'POST') {
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { data: list } = await admin.from('social_choices').select('ext_id,username,page_name,avatar_url').eq('user_id', user.id).eq('platform', 'instagram');
      const { data: cur } = await admin.from('social_tokens').select('refresh_token').eq('user_id', user.id).eq('platform', 'instagram').maybeSingle();
      return json({ choices: (list ?? []).map((c) => ({ ...c, current: cur?.refresh_token === 'fb:' + c.ext_id })) });
    }

    if (route[0] === 'choose' && req.method === 'POST') {
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { ext_id } = await req.json().catch(() => ({}));
      if (!ext_id || !(await useIgChoice(user.id, String(ext_id)))) return json({ error: 'not_found' }, 404);
      const r = await syncAccount(user.id, 'instagram');
      return json({ ok: true, sync: r });
    }

    if (route[0] === 'disconnect' && req.method === 'POST') {
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { platform } = await req.json().catch(() => ({}));
      if (!isPlatform(platform)) return json({ error: 'bad_platform' }, 400);
      await admin.from('social_tokens').delete().eq('user_id', user.id).eq('platform', platform);
      await admin.from('social_choices').delete().eq('user_id', user.id).eq('platform', platform);
      await admin.from('social_accounts').delete().eq('user_id', user.id).eq('platform', platform);
      await admin.from('social_posts').delete().eq('user_id', user.id).eq('platform', platform);
      return json({ ok: true });
    }

    if (route[0] === 'push-tick' && req.method === 'POST') {
      if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) return json({ error: 'unauthorized' }, 401);
      if (!VAPID_PRIVATE) return json({ error: 'not_configured' }, 400);
      return json({ ok: true, ...(await pushTick()) });
    }

    if (route[0] === 'push-test' && req.method === 'POST') {
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { data: list } = await admin.from('push_subscriptions').select('*').eq('user_id', user.id);
      if (!list?.length) return json({ error: 'no_subscription' }, 400);
      let ok = 0;
      for (const sub of list) if (await sendTo(sub, { title: 'Bloom 🎀', body: 'Notificações funcionando! Seus lembretes vão chegar aqui.', url: APP_URL || '/' })) ok++;
      return json({ ok: ok > 0, sent: ok });
    }

    if (route[0] === 'delete-account' && req.method === 'POST') {
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) return json({ error: 'delete_failed' }, 500);
      return json({ ok: true });
    }

    if (route[0] === 'data-deletion' && req.method === 'POST') {
      const code = crypto.randomUUID().slice(0, 8);
      return json({ url: `${APP_URL}/exclusao-de-dados.html?pedido=${code}`, confirmation_code: code });
    }

    return json({ error: 'not_found' }, 404);
  } catch (e) {
    console.error('social', e);
    return json({ error: 'server_error' }, 500);
  }
});
