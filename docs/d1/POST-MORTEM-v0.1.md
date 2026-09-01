# D1 · Post-mortem: silent failures on the first migration pass

**Date:** 1 September 2026.
**Scope:** Migrations `20260901000000_t3a_d1_content_registry.sql` through `20260904000000_t3a_d1_statement_library.sql`.
**Discovered by:** verification query for INS-003 (`t3a_resolution_rule` missing) that turned up several unrelated missing tables.
**Root causes:** two, compounding.

## What went wrong

### 1. The helper script treated JSON-body errors as success

`scratchpad/apply-migration.mjs` was checking only the HTTP status of `exec_claudecode_query`. Supabase's RPC returns HTTP 200 with a JSON body of the form `{"error": "…", "detail": "…", "failed_query": "…"}` when the underlying SQL raises. The script parsed no body and reported every statement as `ok`.

Fix: the script now parses the body and treats an `"error"` key on the returned object as a failure. If the DB rejects a statement, the run aborts and prints both the offending statement and the error.

### 2. `digest()` was not schema-qualified

Two generated columns (`t3a_content_version.body_hash` and `t3a_resolution_rule.answer_pattern_key`) called `digest(...)` unqualified. On Supabase `pgcrypto`'s functions live in the `extensions` schema and are not on the default search path. Every statement that used unqualified `digest` failed — silently, per (1).

Fix: every call is now `extensions.digest(...)`.

## Live-state audit at discovery

Applied but landed only partially. Tables present: `t3a_env_capability`, `t3a_content_object`, `t3a_role_authorization`, `t3a_authority_snapshot`, `t3a_observation_record`, `t3a_reconsideration_assignment`, `t3a_correction_case`, `t3a_action_sequence_rule`, `t3a_observation_gateway`, `t3a_stage_entry_event`, `t3a_attempt`, `t3a_source`.

Tables missing: `t3a_content_version`, `t3a_version_lineage`, `t3a_change_classification`, `t3a_rendered_instance`, `t3a_content_load_event`, `t3a_progression_decision`, `t3a_source_approval`, `t3a_source_name_clearance`, `t3a_resolution_rule`.

Tables I attempted to create that collided with pre-existing spec-002 placeholders (`CREATE TABLE IF NOT EXISTS` skipped mine): `t3a_statement_library` (279 rows of legacy content), `t3a_composed_statement` (empty), `t3a_conflict_declaration` (empty).

## What was actually true vs. what the earlier PR body claimed

The PR body for #258 claimed "81 + 84 + 58 statements, all ok" and listed live-verification queries. The failure detection issue means only some of those statements actually ran. The environment-capability, role-authorization and gateway/stage-entry pieces did land — those are the ones the verification queries were sensitive to. The version-registry, resolution-rule, progression-decision, source-approval and name-clearance pieces did not. That is a serious accuracy defect in the earlier report; there is no way to say "verified live" for a migration you did not actually verify.

## Corrective action

`supabase/migrations/20260905000000_t3a_d1_repair_and_namespace.sql` — applied with the fixed script (105 statements, all genuinely ok):

- Every missing table created under the `t3a_d1_*` prefix so it cannot collide with legacy spec-002 placeholders. The legacy `t3a_statement_library` (279 rows), `t3a_composed_statement` and `t3a_conflict_declaration` are left intact; the D1 build uses `t3a_d1_statement_library`, `t3a_d1_composed_statement` and `t3a_d1_conflict_declaration`.
- Every `digest(...)` call schema-qualified as `extensions.digest(...)`.
- `t3a_involvement_test` and `t3a_content_is_servable` re-created to point at the D1-namespaced tables.
- `t3a_resolve_observation` (INS-003 service function) points at the D1-namespaced tables.

## Pre-flight rule from now on

Two things every future migration and application run does:

- **Schema-qualify every extension function.** `extensions.digest`, `extensions.gen_random_bytes`, `extensions.crypt`, etc. Never rely on `search_path`.
- **Verify each new table is queryable after apply.** A `SELECT 1 FROM <table> LIMIT 0` per table, run separately from the CREATE, must succeed before I claim the migration landed.
