// Bloom Planner: conexão com Instagram e TikTok (Supabase Edge Function "social")
//
// Rotas (todas sob /functions/v1/social):
//   POST /start               { platform, return_to }  -> { url }   (usuária logada)
//   GET  /callback/instagram  ?code&state                            (redirecionamento da Meta)
//   GET  /callback/tiktok     ?code&state                            (redirecionamento do TikTok)
//   POST /sync                {}                                     (usuária logada: atualiza agora)
//   POST /sync                header x-cron-secret                   (agendamento diário: todas as contas)
//   POST /disconnect          { platform }                           (usuária logada)
//   POST /push-tick           header x-cron-secret                   (a cada 5 min: envia lembretes como notificação)
//   POST /push-test                                                  (usuária logada: notificação de teste)
//   POST /delete-account                                             (usuária logada: apaga conta e todos os dados)
//   POST /data-deletion                                              (pedido de exclusão de dados da Meta)
//
// Segredos (Supabase → Edge Functions → Secrets):
//   IG_APP_ID, IG_APP_SECRET, TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, APP_URL, CRON_SECRET

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/$/, '');
const IG_APP_ID = Deno.env.get('IG_APP_ID') ?? '';
const IG_APP_SECRET = Deno.env.get('IG_APP_SECRET') ?? '';
const TT_KEY = Deno.env.get('TIKTOK_CLIENT_KEY') ?? '';
const TT_SECRET = Deno.env.get('TIKTOK_CLIENT_SECRET') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
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
async function igInsights(mediaId: string, token: string) {
  const out: Record<string, number> = {};
  const sets = ['reach,saved,shares,views,total_interactions', 'reach,saved,shares,total_interactions', 'reach,saved,shares', 'reach,saved'];
  const read = (j: any) => {
    for (const d of j.data ?? []) {
      const v = d.values?.[0]?.value ?? d.total_value?.value;
      if (typeof v === 'number') out[d.name === 'saved' ? 'saves' : d.name] = v;
    }
  };
  for (const s of sets) {
    try { read(await igGet(`${mediaId}/insights?metric=${s}`, token)); break; } catch { /* tenta um conjunto menor */ }
  }
  try { read(await igGet(`${mediaId}/insights?metric=follows`, token)); } catch { /* nem todo post tem */ }
  return out;
}
async function syncInstagram(userId: string, tok: any) {
  let access = tok.access_token as string;
  if (tok.expires_at && new Date(tok.expires_at).getTime() - Date.now() < 20 * 864e5) {
    try {
      const rr = await igGet(`refresh_access_token?grant_type=ig_refresh_token`, access);
      if (rr.access_token) {
        access = rr.access_token;
        await admin.from('social_tokens').update({ access_token: access, expires_at: new Date(Date.now() + (rr.expires_in ?? 5184000) * 1000).toISOString(), updated_at: nowIso() }).eq('user_id', userId).eq('platform', 'instagram');
      }
    } catch (e) { console.error('ig refresh', e); }
  }
  const me = await igGet('me?fields=user_id,username,profile_picture_url,followers_count,media_count', access);
  const media = await igGet('me/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count&limit=40', access);
  const rows = [];
  for (const m of media.data ?? []) {
    const metrics: Record<string, number> = { likes: m.like_count ?? 0, comments: m.comments_count ?? 0 };
    Object.assign(metrics, await igInsights(m.id, access));
    rows.push({
      user_id: userId, platform: 'instagram', ext_id: String(m.id), caption: m.caption ?? '', permalink: m.permalink ?? '',
      media_type: m.media_product_type === 'REELS' ? 'reels' : m.media_type === 'CAROUSEL_ALBUM' ? 'carrossel' : m.media_type === 'VIDEO' ? 'reels' : 'post',
      thumbnail_url: m.thumbnail_url ?? m.media_url ?? null, posted_at: m.timestamp ?? null, metrics, synced_at: nowIso(),
    });
  }
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

function dueReminders(core: any, biz: any, nowN: number) {
  const out: { key: string; title: string; body: string }[] = [];
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
        out.push({ key: `i:${it.id}:${d}`, title: `⏰ ${it.text}`, body: `Lembrete: ${when}` });
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
    for (const r of dueReminders(core, biz, nowN)) {
      const { error } = await admin.from('push_sent').insert({ user_id: uid, key: r.key });
      if (error) continue; // já enviado
      for (const sub of list) if (await sendTo(sub, { title: r.title, body: r.body, url: APP_URL || '/' })) sent++;
    }
  }
  await admin.from('push_sent').delete().lt('sent_at', new Date(Date.now() - 4 * 864e5).toISOString());
  return { users: byUser.size, sent };
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
      if (platform === 'instagram' && (!IG_APP_ID || !IG_APP_SECRET)) return json({ error: 'not_configured' }, 400);
      if (platform === 'tiktok' && (!TT_KEY || !TT_SECRET)) return json({ error: 'not_configured' }, 400);
      await admin.from('oauth_states').delete().lt('created_at', new Date(Date.now() - 3600e3).toISOString());
      const state = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const { error } = await admin.from('oauth_states').insert({ state, user_id: user.id, platform, return_to: safeReturn(return_to) });
      if (error) return json({ error: 'db', detail: error.message }, 500);
      const authUrl = platform === 'instagram'
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
        if (platform === 'instagram') {
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

    if (route[0] === 'disconnect' && req.method === 'POST') {
      const user = await userFrom(req);
      if (!user) return json({ error: 'unauthorized' }, 401);
      const { platform } = await req.json().catch(() => ({}));
      if (!isPlatform(platform)) return json({ error: 'bad_platform' }, 400);
      await admin.from('social_tokens').delete().eq('user_id', user.id).eq('platform', platform);
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
