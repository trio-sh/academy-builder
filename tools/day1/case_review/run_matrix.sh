#!/bin/bash
# Runs the CORR-007 rule tests once per dimension, each time on a freshly built throwaway database, and keeps the raw vitest JSON.
#   PGL_SOCK=/tmp/pgl PGL_PORT=5433 T3A_TEST_DB_URL=... bash tools/day1/case_review/run_matrix.sh <out dir> [D1 D2 ...]
# The dimension swap is explained in vitest.db.dim.config.ts. With T3A_ENFORCE_ALSO / enforced runs use the matching config the same way.
set -u
OUT="$1"; shift; DIMS="${*:-D1 D2 D3 D4 D5 D8 D9}"
cd "$(dirname "$0")/../../.."; mkdir -p "$OUT"
for d in $DIMS; do
  bash tools/nonprod-replay/local_pg/build.sh >/dev/null 2>&1
  if [ "$d" = D1 ]; then unset T3A_CASE_DIM; else export T3A_CASE_DIM=$d; fi
  npx vitest run -c vitest.db.dim.config.ts --reporter=json --outputFile="$OUT/$d.json" >"$OUT/$d.log" 2>&1
  python3 -c "import json;r=json.load(open('$OUT/$d.json'));print('$d',r['numPassedTests'],'passed',r['numFailedTests'],'failed')"
done
