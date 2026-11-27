"""Gera app/index.html a partir de planner.html, com a configuração do Supabase e as tags de app (PWA).
Uso: python3 scripts/build_app.py
"""
import base64, hashlib, json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUPABASE_URL = 'https://zeatslwacibkodkjbswg.supabase.co'
# Chave pública (anon): pode ficar no site. A segurança vem das regras de acesso (RLS) do banco.
ANON_KEY_FILE = ROOT / 'app' / '.anon_key'

src = (ROOT / 'planner.html').read_text()
anon = ANON_KEY_FILE.read_text().strip()
vapid = (ROOT / 'app' / '.vapid_public').read_text().strip()
head_extra = f'''<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Bloom">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#fbd3e9">
<script>window.BLOOM_CONFIG = {{ supabaseUrl: '{SUPABASE_URL}', anonKey: '{anon}', vapidKey: '{vapid}' }};</script>
'''
out = src.replace('<title>Bloom Planner</title>', '<title>Bloom Planner</title>\n' + head_extra, 1)
assert out != src
(ROOT / 'app' / 'index.html').write_text(out)
print('app/index.html ok')

# Cabeçalhos de segurança do site (app/vercel.json). Os scripts em linha do index.html entram na política pelo hash,
# então só o código que está neste arquivo roda; qualquer script injetado é bloqueado pelo navegador.
hashes = [
    "'sha256-" + base64.b64encode(hashlib.sha256(m.encode()).digest()).decode() + "'"
    for m in re.findall(r'<script>(.*?)</script>', out, re.S)
]
host = SUPABASE_URL.replace('https://', '')
csp = '; '.join([
    "default-src 'self'",
    "script-src 'self' " + ' '.join(hashes),
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: data:",
    f"connect-src 'self' https://{host} wss://{host} https://api.open-meteo.com https://geocoding-api.open-meteo.com",
    "worker-src 'self'", "manifest-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
    "upgrade-insecure-requests",
])
vercel = {
    'cleanUrls': True,
    'headers': [
        {'source': '/(.*)', 'headers': [
            {'key': 'Content-Security-Policy', 'value': csp},
            {'key': 'X-Frame-Options', 'value': 'DENY'},
            {'key': 'X-Content-Type-Options', 'value': 'nosniff'},
            {'key': 'Referrer-Policy', 'value': 'strict-origin-when-cross-origin'},
            {'key': 'Permissions-Policy', 'value': 'camera=(), microphone=(self), geolocation=(self), payment=(), usb=()'},
            {'key': 'Strict-Transport-Security', 'value': 'max-age=63072000; includeSubDomains'},
            {'key': 'Cross-Origin-Opener-Policy', 'value': 'same-origin'},
        ]},
        {'source': '/sw.js', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}]},
        {'source': '/', 'headers': [{'key': 'Cache-Control', 'value': 'no-cache'}]},
    ],
}
(ROOT / 'app' / 'vercel.json').write_text(json.dumps(vercel, indent=2) + '\n')
print('app/vercel.json ok,', len(hashes), 'scripts em linha com hash')
