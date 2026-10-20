# Non-production test environment (resolves CR-002)

The Day 1 package requires migrations to run in a non production environment first (9.1.4) and acceptance tests to run against a running non production system (13.2). This is how that environment was built. It holds no production data.

## What it is

A throwaway PostgreSQL 17 database from Neon's anonymous database service, created for this work. It expires on 23 October 2026 and is not claimed by any account. The connection string is not stored in the repository. Rebuild it any time from the scripts in `tools/nonprod-replay/`.

## How it was built

1. `shim.sql` adds the pieces Supabase provides that plain Postgres lacks: the `anon`, `authenticated` and `service_role` roles, an `auth` schema with `auth.uid()`, `auth.role()` and `auth.jwt()`, a minimal `storage` schema, and the extensions.
2. `wrappers.sql` adds three `public` helper functions (`digest`, `gen_random_bytes`, `uuid_generate_v4`) that forward to the extension versions. Test environment only; they are not in any migration.
3. `apply_stmt.mjs` replays all 152 migrations statement by statement in file order, continuing past errors, as `psql` does. `split.mjs` is the statement splitter (handles dollar quoting, quoted identifiers and comments).
4. `inv.mjs` runs the same catalog inventory used against production so the two can be compared.
5. `policy_test.mjs` seeds synthetic users and runs probes as `anon`, `authenticated` and `service_role`.

The sandbox cannot make direct Postgres connections, so the scripts reach Neon over its WebSocket endpoint through the HTTPS proxy. Install `@neondatabase/serverless`, `ws` and `https-proxy-agent` in a scratch folder and run with `NODE_USE_ENV_PROXY=1`.

## How faithful it is

Evidence: `evidence/nonprod-replay-fidelity.json`.

- 3,285 of 3,332 statements applied; 47 errors in 14 files.
- Catalog diff against production: all 233 public tables and all 2,092 public columns match. Policies: 418 in production, 428 in the test copy, none missing, 10 extra. Routines: none missing; the only extras are the three shim helpers.
- The 47 errors are of two kinds. Some are legacy conflicts (the repo has two competing `002_*` schema files and two files that redefine the same policies). Most of the rest are guard checks inside D1 migrations that assert production row counts (for example "expected 37 standing approved, found 0"); they fail in a copy that has the schema but not production's rows. That means the structure is reproduced but not the production data. Do not read a pass here as proof about production data.

## First use

`20261100000000_close_open_access_policies.sql` (CR-004) was applied to this environment and tested. 14 probes, before and after: `evidence/policy-test-results.json`. It is not applied to production.
