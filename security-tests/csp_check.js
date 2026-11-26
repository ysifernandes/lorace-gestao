// Serve app/ com os cabeçalhos do vercel.json e confere: a página abre, o login aparece, e NENHUMA regra da CSP é violada.
// Também prova que a CSP bloqueia um script injetado.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', 'app');
const V = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json')));
const hdrs = V.headers.find((h) => h.source === '/(.*)').headers;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => {
  let f = q.url.split('?')[0]; if (f === '/') f = '/index.html'; if (!path.extname(f)) f += '.html';
  const fp = path.join(ROOT, path.normalize(f).replace(/^(\.\.[/\\])+/, ''));
  if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { r.writeHead(404); return r.end('nf'); }
  const h = { 'Content-Type': MIME[path.extname(fp)] || 'text/plain' }; for (const x of hdrs) h[x.key] = x.value;
  r.writeHead(200, h); r.end(fs.readFileSync(fp));
}).listen(0, async () => {
  const port = srv.address().port; const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
  const viol = [], errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) => { (window.__v = window.__v || []).push(e.violatedDirective + ' ' + e.blockedURI); }));
  await p.goto(`http://localhost:${port}/`); await p.waitForTimeout(2500);
  console.log('login visível:', await p.$$eval('#auth-form', (e) => e.length) === 1, '| supabase carregado do próprio site:', await p.evaluate(() => typeof window.supabase === 'object'));
  // login falso: prova que a CSP deixa o app falar com o Supabase (esperado: mensagem de senha incorreta)
  await p.fill('#au-email', 'conta.inexistente.teste@example.com'); await p.fill('#au-pass', 'senha-errada-123'); await p.click('#au-go'); await p.waitForTimeout(3500);
  console.log('resposta do login falso:', await p.textContent('#au-msg'));
  // tentativa de injeção: script em linha, script externo, handler em linha
  await p.evaluate(() => { window.__pwn = 0; const s = document.createElement('script'); s.textContent = 'window.__pwn++'; document.head.appendChild(s); const e = document.createElement('script'); e.src = 'https://evil.example/x.js'; document.head.appendChild(e); document.body.insertAdjacentHTML('beforeend', '<img src=x onerror="window.__pwn++">'); });
  await p.waitForTimeout(800);
  const v = await p.evaluate(() => window.__v || []);
  console.log('injeções que rodaram:', await p.evaluate(() => window.__pwn), '(esperado 0)');
  console.log('violações registradas:', [...new Set(v)].join(' | '));
  // headers recebidos
  const resp = await p.request.get(`http://localhost:${port}/`); const hh = resp.headers();
  for (const k of ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security']) console.log(k, '=>', hh[k] ? 'presente' : 'AUSENTE');
  console.log('ERROS DE PÁGINA:', errs.length ? errs : 'nenhum');
  await b.close(); srv.close();
});
