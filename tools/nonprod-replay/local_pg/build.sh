#!/bin/bash
# Builds a throwaway local Postgres 16 database `t3a` from the repository migrations (same statement-tolerant two pass load as the Neon rebuild).
# A full build takes about 20 seconds and the whole test set about 20 seconds, against about 7 and 15 minutes on Neon.
# Prerequisite: a running Postgres 16 with a superuser role neondb_owner and an empty database t3a, socket dir $PGL_SOCK, port $PGL_PORT.
#   PGL_SOCK=/tmp/pgl PGL_PORT=5433 bash tools/nonprod-replay/local_pg/build.sh
# The tests import @neondatabase/serverless; for a local run, point node_modules/@neondatabase/serverless at a stub that re-exports pg.Client
# and put "postgresql://neondb_owner@localhost:$PGL_PORT/t3a?host=$PGL_SOCK" in conn.txt beside the tests.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../../.." && pwd)"
P="psql -h ${PGL_SOCK:-/tmp/pgl} -p ${PGL_PORT:-5433} -U neondb_owner -d t3a -q"
$P -f "$HERE/reset.sql" >/dev/null 2>&1; $P -f "$HERE/shim.sql" >/dev/null 2>&1; $P -f "$HERE/wrappers.sql" >/dev/null 2>&1
for pass in 1 2; do
  for f in $(ls "$REPO"/supabase/migrations/*.sql | sort); do
    (echo "set search_path to public, extensions;"; cat "$f") > "${TMPDIR:-/tmp}/t3a_cur.sql"
    $P -v ON_ERROR_STOP=0 -f "${TMPDIR:-/tmp}/t3a_cur.sql" >/dev/null 2>&1
  done
done
echo built
