# Step 2: dimension parameterization audit

Scope: every shared table the D2, D3 and D4 packages touch. Production audited 20 Oct 2026 (277 `t3a_` tables).

## Result

| Class | Tables | Outcome |
|---|---|---|
| Already dimension keyed (`dimension_id` present) | 38, including attempt, stage instance, stage entry, observation, observation record, mentor authorization, source, statement library, progression decision, BER report, issuance, evidence | Confirmed. Attempt counters are per participant, Stage and dimension through the stage instance key |
| Structure tables keyed by code alone | `t3a_d1_question_object`, `capture_set`, `capture_line`, `beat_capture_binding`, `capture_resolution`, `question_capture_map`, `capture_selection`, `branch_rule`, `condition_precedence`, `specification_cooldown`, `calibration_exercise` | `dimension_id` added, not null, no default, existing rows D1 (migration 20261202) |
| Keys that would collide across dimensions | capture set code (the D2 package reuses C1, C2 ...), capture line order, resolution order and statement key, condition code, cooldown step | Re-keyed with `dimension_id` (20261202, 20261203). The collision on line order was found by the production probe and is why 20261203 exists |
| Child tables that hang off a parent that has the dimension | the rest of the `t3a_d1_*` tables (approval, audit, pilot, live session, report block ...) | No change. They reach the dimension through the parent. `t3a_d1_report_block` is the platform face schedule and moves with the thirteen block face in Step 6 |
| August 2026 drafts (D2 to D14) | 65 unapproved questions, 260 statements | Listed in `t3a_legacy_draft_retirement` (325 rows) with the edition that supersedes each; a retired question cannot be approved. Nothing deleted or served |

## Isolation guards (refuse and log `dimension_isolation_violation`)

attempt against its Stage entry; progression decision against its observation record; composed statement (record against statement); Stage entry against its source; capture selection against its Stage entry. The mentor authorization table gets one row per mentor, dimension and start, and `t3a_mentor_authorized_for(mentor, dimension)` answers per dimension only (D1 clearance never confers D2).

## Evidence

- Throwaway database: 29 of 29 (`tools/nonprod-replay/step2_dimension_test.mjs`, `evidence/step2-dimension-test.json`).
- Production: D1 capture groups, coverage matrix and per-question capture output are byte identical before and after (md5 in `evidence/production-apply-step2-verification.json`). A zero residue probe showed D2 can reuse C1 and line order, and that a cross-dimension line is refused.
- Rollback: `evidence/rollback_step2_dimension_parameterize.sql`.

## Still open (carried to Step 3)

1. Done in Step 3a (migration 20261204): twelve D1 readers and the mentor workbench are dimension aware or pinned to D1. Output is byte identical in production and with D2 rows loaded on the throwaway database (`evidence/step3a-readers-test.json`, `production-apply-step3a-verification.json`). The D1 specific serving and composition logic is deliberately not generalized.
2. D2 and D3 Section 5 (about 4,400 lines of content) was not read in full, so further collisions inside it are possible. The content load will fail on a collision rather than overwrite; each one is logged.
3. `t3a_statement_library` cannot be updated by anyone (`t3a_statement_library_immutable` names columns that do not exist). The retirement is therefore a mapping, not a status change on the rows.
