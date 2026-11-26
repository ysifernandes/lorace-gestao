// Testes unitários das funções de segurança da função de borda (supabase/functions/social/index.ts).
// Extrai o código real do arquivo (sem copiar à mão) e roda no Node. Uso: NODE_PATH=<pasta com esbuild> node security-tests/edge_units.cjs
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { transformSync } = require('esbuild');
const src = fs.readFileSync(path.resolve(__dirname, '..', 'supabase/functions/social/index.ts'), 'utf8');
function grab(startRe, endMarker) { const i = src.search(startRe); if (i < 0) throw new Error('não achei ' + startRe); const j = src.indexOf(endMarker, i); return src.slice(i, j + endMarker.length); }
const code = [
  grab(/function safeEq/, '\n}\n'),
  grab(/const PUSH_HOSTS/, '\nfunction pushEndpointOk(u: unknown) {\n  try { const x = new URL(String(u)); return x.protocol === \'https:\' && !x.port && !x.username && PUSH_HOSTS.some((r) => r.test(x.hostname)); } catch { return false; }\n}'),
  grab(/const b64u/, '\n}\n'.repeat(0) + "  } catch { return null; }\n}"),
].join('\n');
const js = transformSync(code + '\nmodule.exports = { safeEq, pushEndpointOk, parseSignedRequest };', { loader: 'ts' }).code;
const m = { exports: {} }; new Function('module', 'crypto', 'atob', 'TextEncoder', 'TextDecoder', js)(m, crypto.webcrypto, atob, TextEncoder, TextDecoder);
const { safeEq, pushEndpointOk, parseSignedRequest } = m.exports;
let fail = 0; const t = (n, ok) => { console.log((ok ? 'OK    ' : 'FALHA ') + n); if (!ok) fail++; };
t('safeEq igual', safeEq('abc123', 'abc123')); t('safeEq diferente', !safeEq('abc123', 'abc124')); t('safeEq tamanhos diferentes', !safeEq('abc', 'abcd')); t('safeEq vazio x segredo', !safeEq('', 'segredo'));
for (const u of ['https://fcm.googleapis.com/fcm/send/abc', 'https://web.push.apple.com/QAbc', 'https://updates.push.services.mozilla.com/wpush/v2/x', 'https://wns2-par02p.notify.windows.com/?token=x']) t('push aceito: ' + u, pushEndpointOk(u));
for (const u of ['http://fcm.googleapis.com/x', 'https://169.254.169.254/latest/meta-data', 'https://localhost/x', 'https://fcm.googleapis.com.evil.com/x', 'https://evil.com/fcm.googleapis.com', 'https://user@fcm.googleapis.com/x', 'https://fcm.googleapis.com:8443/x', 'file:///etc/passwd', 'não é url', '', null, 'https://storage.googleapis.com/x', 'https://xpush.apple.com.evil.io/']) t('push RECUSADO: ' + u, !pushEndpointOk(u));
(async () => {
  const secret = 'segredo-de-teste', b64 = (b) => Buffer.from(b).toString('base64url');
  const payload = b64(JSON.stringify({ user_id: '123', algorithm: 'HMAC-SHA256' }));
  const sig = b64(crypto.createHmac('sha256', secret).update(payload).digest());
  t('signed_request válido', (await parseSignedRequest(sig + '.' + payload, secret))?.user_id === '123');
  t('signed_request com payload adulterado', (await parseSignedRequest(sig + '.' + b64(JSON.stringify({ user_id: '999' })), secret)) === null);
  t('signed_request com segredo errado', (await parseSignedRequest(sig + '.' + payload, 'outro')) === null);
  t('signed_request sem segredo configurado', (await parseSignedRequest(sig + '.' + payload, '')) === null);
  t('signed_request lixo', (await parseSignedRequest('lixo', secret)) === null && (await parseSignedRequest('', secret)) === null);
  console.log(fail ? `\n${fail} FALHA(S)` : '\ntodos passaram'); process.exit(fail ? 1 : 0);
})();
