#!/usr/bin/env bash
# Para cada suíte: cria banco descartável, aplica shim do Supabase + migrations (+ seed quando indicado) e roda o SQL de teste.
set -euo pipefail
cd "$(dirname "$0")/../.."
if ! pg_isready -q 2>/dev/null; then pg_ctlcluster 16 main start; sleep 3; fi
as_pg() { su postgres -c "$*"; }
run() { as_pg "psql -v ON_ERROR_STOP=1 -q -X -d edu_test -f $PWD/$1"; }
fresh() {
  as_pg "psql -q -X -c 'drop database if exists edu_test' -c 'create database edu_test'" >/dev/null 2>&1
  run tests/db/shim_supabase.sql
  for f in database/migrations/*.sql; do run "$f" >/dev/null; done
}
pnpm -s seed:gen >/dev/null
echo "== migrations + RLS (rls.sql)";      fresh; run tests/db/rls.sql
echo "== revisão de segurança (security.sql)"; fresh; run tests/db/security.sql
echo "== seed de conteúdo (seed.sql)";     fresh; run database/seed/0001_content.sql; run tests/db/seed.sql
echo "DB TESTS OK"
