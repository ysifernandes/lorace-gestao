// Gera os ícones do app (PNG) a partir do lacinho do Bloom. Uso: node scripts/make_icons.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [size, name, pad] of [[180, 'apple-touch-icon.png', 0.2], [192, 'icon-192.png', 0.2], [512, 'icon-512.png', 0.2], [512, 'icon-maskable-512.png', 0.3]]) {
    await p.setViewportSize({ width: size, height: size });
    const inner = Math.round(size * (1 - pad * 2));
    await p.setContent(`<html><body style="margin:0"><div style="width:${size}px;height:${size}px;background:linear-gradient(160deg,#c95c87,#9c3a64);display:grid;place-items:center">
      <svg width="${inner}" height="${Math.round(inner * 0.67)}" viewBox="0 0 48 32" fill="none" stroke="#fde7f1" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 13C19 6 8 2 6 7s6 11 18 7"/><path d="M24 13c5-7 16-11 18-6s-6 11-18 7"/><path d="M22 15l-7 14M26 15l7 14"/><circle cx="24" cy="14" r="2.8" fill="#fde7f1"/></svg></div></body></html>`);
    await p.screenshot({ path: `app/${name}`, omitBackground: false });
  }
  await b.close();
})();
