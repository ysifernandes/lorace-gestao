#!/usr/bin/env bash
# Aplica as migrations em um Postgres descartável e executa tests/db/rls.sql.
# Requer Postgres 16 local (pg_ctlcluster) ou PGHOST/PGUSER já configurados.
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=estuda_test
PSQL="psql -v ON_ERROR_STOP=1 -q -X"
if ! pg_isready -q 2>/dev/null; then pg_ctlcluster 16 main start; sleep 3; fi
as_pg() { su postgres -c "$*"; }
as_pg "psql -q -X -c 'drop database if exists $DB' -c 'create database $DB'" >/dev/null
run() { as_pg "psql -v ON_ERROR_STOP=1 -q -X -d $DB -f $PWD/$1"; }
run tests/db/shim_supabase.sql
for f in database/migrations/*.sql; do echo "apply $f"; run "$f"; done
run tests/db/rls.sql
echo "DB TESTS OK"
