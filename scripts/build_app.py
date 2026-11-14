"""Gera app/index.html a partir de planner.html, com a configuração do Supabase e as tags de app (PWA).
Uso: python3 scripts/build_app.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUPABASE_URL = 'https://zeatslwacibkodkjbswg.supabase.co'
# Chave pública (anon): pode ficar no site. A segurança vem das regras de acesso (RLS) do banco.
ANON_KEY_FILE = ROOT / 'app' / '.anon_key'

src = (ROOT / 'planner.html').read_text()
anon = ANON_KEY_FILE.read_text().strip()
head_extra = f'''<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Bloom">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#fbd3e9">
<script>window.BLOOM_CONFIG = {{ supabaseUrl: '{SUPABASE_URL}', anonKey: '{anon}' }};</script>
'''
out = src.replace('<title>Bloom Planner</title>', '<title>Bloom Planner</title>\n' + head_extra, 1)
assert out != src
(ROOT / 'app' / 'index.html').write_text(out)
print('app/index.html ok')
