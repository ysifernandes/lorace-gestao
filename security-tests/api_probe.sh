#!/usr/bin/env bash
# Sondagem sem login da função de borda em produção: só pedidos que devem ser RECUSADOS. Não cria nem altera dados.
FN=https://zeatslwacibkodkjbswg.supabase.co/functions/v1/social
K=$(cat "$(dirname "$0")/../app/.anon_key")
c(){ printf "%-52s -> " "$1"; shift; curl -s -m 30 -o /tmp/probe.out -w "%{http_code}" "$@"; echo "  $(head -c 90 /tmp/probe.out)"; }
for r in start sync analyze plan assist script command choices choose disconnect push-test delete-account; do c "POST /$r sem login (anon key)" -X POST "$FN/$r" -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d '{}'; done
c "POST /sync sem nenhum cabeçalho" -X POST "$FN/sync"
c "POST /push-tick segredo errado" -X POST "$FN/push-tick" -H "x-cron-secret: errado"
c "POST /push-tick sem segredo" -X POST "$FN/push-tick"
c "POST /sync segredo errado (sem login)" -X POST "$FN/sync" -H "x-cron-secret: errado"
c "POST /data-deletion sem assinatura" -X POST "$FN/data-deletion" -d 'signed_request=abc.def'
c "POST /deauthorize sem assinatura" -X POST "$FN/deauthorize" -H "Content-Type: application/json" -d '{"signed_request":"x.y"}'
c "GET  /data-deletion-status código falso" "$FN/data-deletion-status?code=zzzzzzzz"
c "GET  /callback/instagram state falso" "$FN/callback/instagram?state=falso&code=x"
c "GET  rota inexistente" "$FN/nao-existe"
echo "--- CORS (origem de outro site)"; curl -s -m 30 -i -X OPTIONS "$FN/start" -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST" | grep -i "^access-control-allow-origin\|^HTTP" ; echo "(sem linha access-control-allow-origin = recusado)"
echo "--- CORS (site do Bloom)"; curl -s -m 30 -i -X OPTIONS "$FN/start" -H "Origin: https://bloom-planner-nine.vercel.app" -H "Access-Control-Request-Method: POST" | grep -i "^access-control-allow-origin\|^HTTP"
