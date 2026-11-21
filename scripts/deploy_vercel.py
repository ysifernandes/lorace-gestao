"""Publica a pasta app/ na Vercel (projeto bloom-planner, produção).
Uso: python3 scripts/deploy_vercel.py   (o token da Vercel é injetado pelo proxy do ambiente)
"""
import base64, json, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'app'
TEAM = 'team_GJ9Q12h8KHe2gBPRPXoZDUdh'
files = []
for f in sorted(ROOT.iterdir()):
    if f.name.startswith('.') or f.is_dir():
        continue
    data = f.read_bytes()
    if f.suffix in ('.png', '.jpg', '.ico'):
        files.append({'file': f.name, 'data': base64.b64encode(data).decode(), 'encoding': 'base64'})
    else:
        files.append({'file': f.name, 'data': data.decode('utf-8'), 'encoding': 'utf-8'})
body = {'name': 'bloom-planner', 'target': 'production', 'files': files,
        'projectSettings': {'framework': None, 'buildCommand': None, 'installCommand': None, 'outputDirectory': None}}
r = subprocess.run(['curl', '-sS', '-m', '180', '-X', 'POST', f'https://api.vercel.com/v13/deployments?teamId={TEAM}&skipAutoDetectionConfirmation=1',
                    '-H', 'Authorization: Bearer proxy-injected', '-H', 'Content-Type: application/json', '--data-binary', '@-'],
                   input=json.dumps(body), capture_output=True, text=True)
d = json.loads(r.stdout or '{}')
if 'error' in d:
    print('ERRO', d['error']); sys.exit(1)
print('deployment', d.get('id'), d.get('readyState'), d.get('url'))
print('aliases', d.get('alias'))
