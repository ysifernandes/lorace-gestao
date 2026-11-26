// Bloom: funciona offline e recebe notificações (push)
const CACHE = 'bloom-v5';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'supabase-js.2.45.4.umd.js'])).catch(() => {}));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  // silent:false = toca o som do aparelho; requireInteraction = no computador, fica na tela até ela tocar
  const opts = { body: d.body || '', icon: 'icon-192.png', badge: 'icon-192.png', data: d.url || './', silent: false, requireInteraction: true, vibrate: [200, 100, 200] };
  if (d.tag) { opts.tag = d.tag; opts.renotify = true; } // o aviso novo substitui o anterior da mesma tarefa
  e.waitUntil(self.registration.showNotification(d.title || 'Bloom', opts));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => {
    const url = e.notification.data || './';
    for (const c of list) if ('focus' in c) { c.postMessage({ type: 'open', url }); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
