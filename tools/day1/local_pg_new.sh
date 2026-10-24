#!/bin/bash
# Makes and starts one more throwaway Postgres 16 cluster for database tests, so several builds can run side by side.
#   bash tools/day1/local_pg_new.sh /tmp/pgl_d8 5434     then:   PGL_SOCK=/tmp/pgl_d8 PGL_PORT=5434 bash tools/nonprod-replay/local_pg/build.sh
# Needs the postgres 16 server binaries and a `postgres` OS user (the cloud session has both). Runs as root and drops to postgres for the server.
set -eu
D="$1"; PORT="$2"; BIN=/usr/lib/postgresql/16/bin
mkdir -p "$D"; chown postgres "$D"
su postgres -c "$BIN/initdb -D $D/data -A trust -U postgres >/dev/null"
su postgres -c "$BIN/pg_ctl -D $D/data -o '-p $PORT -k $D' -l $D/log.txt -w start >/dev/null"
psql -h "$D" -p "$PORT" -U postgres -qc "create role neondb_owner superuser login" -c "create database t3a owner neondb_owner"
echo "cluster ready: PGL_SOCK=$D PGL_PORT=$PORT T3A_TEST_DB_URL=postgresql://neondb_owner@localhost:$PORT/t3a?host=$D"
