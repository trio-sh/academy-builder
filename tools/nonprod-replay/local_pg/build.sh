#!/bin/bash
# Builds a throwaway local Postgres 16 database `t3a` from the repository migrations (same statement-tolerant two pass load as the Neon rebuild).
# A full build takes about 20 seconds and the whole test set about 20 seconds, against about 7 and 15 minutes on Neon.
# Prerequisite: a running Postgres 16 with a superuser role neondb_owner and an empty database t3a, socket dir $PGL_SOCK, port $PGL_PORT.
#   PGL_SOCK=/tmp/pgl PGL_PORT=5433 bash tools/nonprod-replay/local_pg/build.sh
# Over TCP (CI): PGL_HOST=localhost PGL_PORT=5432 PGL_USER=neondb_owner PGPASSWORD=... bash tools/nonprod-replay/local_pg/build.sh
# The tests import @neondatabase/serverless; for a local run, point node_modules/@neondatabase/serverless at a stub that re-exports pg.Client
# and put "postgresql://neondb_owner@localhost:$PGL_PORT/t3a?host=$PGL_SOCK" in conn.txt beside the tests.
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"; REPO="$(cd "$HERE/../../.." && pwd)"
P="psql -h ${PGL_HOST:-${PGL_SOCK:-/tmp/pgl}} -p ${PGL_PORT:-5433} -U ${PGL_USER:-neondb_owner} -d t3a -q"
$P -f "$HERE/reset.sql" >/dev/null 2>&1; $P -f "$HERE/shim.sql" >/dev/null 2>&1; $P -f "$HERE/wrappers.sql" >/dev/null 2>&1
LOG="${T3A_BUILD_LOG:-${TMPDIR:-/tmp}/t3a_build.log}"; : > "$LOG"
RETRY="${TMPDIR:-/tmp}/t3a_retry.lst"; : > "$RETRY"
for pass in 1 2; do
  for f in $(ls "$REPO"/supabase/migrations/*.sql | LC_ALL=C sort); do
    # T3A_BUILD_UPTO=<14 digit version> builds only the migrations up to and including it (the live baseline rehearsal)
    if [ -n "${T3A_BUILD_UPTO:-}" ] && [ "$(basename "$f" | cut -c1-14)" \> "$T3A_BUILD_UPTO" ]; then continue; fi
    # second pass only for files that errored the first time: a file that applied cleanly is never run twice (re-running double loads content rows)
    if [ "$pass" = 2 ] && ! grep -qxF "$f" "$RETRY"; then continue; fi
    (echo "set search_path to public, extensions;"; cat "$f") > "${TMPDIR:-/tmp}/t3a_cur.sql"
    n=$($P -v ON_ERROR_STOP=0 -f "${TMPDIR:-/tmp}/t3a_cur.sql" 2>&1 | grep -c "ERROR")
    [ "$pass" = 1 ] && [ "$n" -gt 0 ] && echo "$f" >> "$RETRY"
    echo "pass$pass $(basename "$f") errors=$n" >> "$LOG"
  done
done
echo built
