# Day 1 Reconciliation Report (interim)

Package: T3A-DEV-DAY1-001 v1.3 (Dr. Tony Mofoke, 18 October 2026). Prepared for Hans Ade.
Status: **R1 inventory complete. R2 mapping is an automated first pass. R3 to R6 not started. No migration has been applied and no row has been changed.**

## 1. What was run, and against what

- R1 used `reference/000_inventory_read_only_postgresql.sql` exactly as shipped (catalog queries only, no row data) against the production Supabase project, using the access token Hans supplied earlier in the session.
- Row counts are `count(*)` aggregates per table (`evidence/row-counts.json`). No row content was read.
- The package tools were run first, per `00_START_HERE.md` 4.1: `sha256sum -c` passes; `check_dictionary.py` passes (600 fields, 122 events, 67 tests); `test_tools.py` passes 53 of 53. The system `cryptography` library in this sandbox crashes on import (missing `_cffi_backend`), which fails the one signature test; a clean install in a scratch folder passes it. This is an environment fault, not a package defect (conflict register CR-001).
- The package requires migrations to be applied in a non production environment first (9.1.4). **None exists for this project**, so nothing was applied. See CR-002.

## 2. Inventory facts (R1)

| Item | Count |
|---|---|
| Public tables | 233 (`t3a_*`: 188, legacy: 45) |
| Tables holding any rows | 89 |
| Columns, constraints, indexes | 2,624 / 2,384 / 562 |
| RLS policies | 439 |
| Migration files in repo | 152 |

The database is effectively pre-launch. Largest row counts are D1 registry and content tables (for example `t3a_d1_content_identity_assertion` 755, `t3a_statement_library` 279). Real person data: `profiles` 15, `candidate_profiles` 3, `mentor_profiles` 4, `mentor_assignments` 3, `t3a_observation_record` 6, `growth_log_entries` 5. `skill_passports`, `endorsements`, `t3a_event_log` and `field_registry` hold 0 rows or do not exist.

## 3. Dictionary mapping, first pass (R2)

Method: for each of the 600 dictionary fields, look for a live column of the same name. Same name and compatible type family gives M1; same name with a different type family gives M3; no live column gives M5. **This is a name and type match only. It cannot confirm meaning**, and common names (`created_at`, `schema_version`, `dimension_id`) match many unrelated tables, so M1 is optimistic and every M1 row still needs a human check of table and meaning before it is registered. `evidence/r2-summary.json` and `reconciliation-mapping.csv` hold the detail.

| Class | Fields | Note |
|---|---|---|
| M1 EXACT (candidate) | 156 | 140 ACTIVE, 16 SOCKET |
| M3 TYPE (candidate) | 9 | e.g. `A.identity_assurance_evidence_ref` is text, dictionary says identifier; `E.authorization_snapshot_ref` is jsonb |
| M5 MISSING | 435 | 361 ACTIVE, 14 DORMANT, 60 SOCKET |

Domain A (identity, account, role) is the largest gap: 43 of 47 fields have no live column. Domains L (commercial), M (lsa), I (employer) and R (programs) are almost entirely absent, as expected for structures that do not exist yet.

M2, M4 and M7 need judgement and are not assigned automatically. 1,111 columns in `t3a_*` tables and the columns of 45 legacy tables carry names not in the dictionary and will be M7 LEGACY unless reclassified.

## 4. Prohibited items already present (M6)

Package 5.1 forbids these. M6 action: stop new writes, freeze read only, remove from every read path, display and export, keep the data, record. Table 5.1 applies to identifiers; matches below are by name. Detail in `evidence/m6-scan.json`.

**Definite matches**

| Rule | Where |
|---|---|
| 5.1.1 score, rating, rank, percentile, BARS | 14 tables, 13 legacy plus `t3a_observation.ordinal_anchor` |
| 5.1.2 level_1..4, observation_level | `observation_loops`, `observation_sessions` |
| 5.1.3 tier, band, match | `candidate_profiles`, `employer_profiles`, `skill_passports`, `talentvisa_quotas`, `t3a_discovery_query_log.pool_band_before/after` |
| 5.1.4 skill_passport | table `skill_passports`, column on `candidate_profiles` |
| 5.1.5 endorsement | table `endorsements`, columns on `mentor_profiles`, `observation_loops`; function `submit_endorsement` |
| 5.1.6 escalate | `t3a_safety_event.escalated_at`, `escalated_to_safety_contact` (likely the welfare route the package allows; confirm) |
| 5.1.9 dimensions_flagged | `t3a_mentor_judgment.dimensions_flagged` |
| 5.1.10 AI suggestion to a mentor | `t3a_mentor_judgment.ai_assist_notes_accepted`, `ai_assist_notes_ignored` |
| 5.1.17 hire outcome | `t3a_employer_hire_record.hired_on` (the package allows an unlinked hire row; confirm it carries no participant or report reference, DT-33) |

**Need a human look (possible free text, 5.1.11 and 5.1.14):** `rationale`, `decision_rationale`, `evidence_notes`, `notes` columns on 19 tables, 10 of them `t3a_*`. Whether each is a controlled code or free text has not been checked.

Row counts for affected legacy tables are 0 except `growth_log_entries` (5), `mentor_assignments` (3) and `candidate_profiles` (3). Freezing them destroys nothing.

## 5. Security findings outside the dictionary

Found while reading the policy inventory. These are not Day 1 fields but Day 1 8.1.4 requires least privilege "enforced at the endpoint and the data layer".

- **38 legacy tables carry open write policies (`USING true` or `WITH CHECK true`) for ordinary users; none of the `t3a_*` tables do.** Several are granted to `PUBLIC`, which includes anonymous callers: `skill_passports_all`, `endorsements_all`, `mentor_observations_all`, `liveworks_*_all`, `talentvisa_nominations_all`, `employer_feedback_all`, and "Allow all" insert/update/delete policies on `bridgefast_modules`, `bridgefast_progress`, `employer_profiles`, `mentor_assignments`, `notifications`, `t3x_connections`, `liveworks_projects`. Full list: `evidence/open-write-policies.json`.
- **`growth_log_entries_rw` and `growth_logs_rw` allow ALL for any authenticated user.** Any signed in mentor, employer or participant can read, edit or delete anyone's Growth Log. The Growth Log rule is participant only (REQ-GL-001 3.6; Day 1 DT-29).
- `profiles_read` lets any authenticated user read all 15 profiles. Day 1 says profile data is context, never shown to a mentor.

Nothing was changed. These need your decision before a fix is applied (CR-004).

## 6. Forbidden identifier baseline (DT-02)

`check_forbidden_identifiers.py` over the repo (excluding `dist/`, `docs/`, `e2e/`, `public/`, `scripts/`, `api/`): **1,990 hits in 359 files**. By rule: score 827, endorsement 358, tier 330, behavioral_score 115, rating/rank/percentile 105, skill_passport 101, contains validate 87, shortlist 32, observation_level 28, ordinal_anchor 7. Concentration: `src/pages/dashboard` 738, `supabase/migrations` 310 (37 files), `src/components/assessment` 110, `src/types/database.types.ts` 103, `src/lib/mentorMatching.ts` 100, `src/services/aiResponseAnalysis.ts` 84. Per file detail: `evidence/forbidden-identifiers-baseline.json`.

The package excludes migration files applied before the package (4.2), so most of the 310 migration hits are excluded by rule. The `src` hits are not. DT-02 passes only when they are retired or the code is removed.

## 7. Growth Log (Domain J, REQ-GL-001)

The package and REQ-GL-001 both say the platform writes nothing into the Growth Log (3.5), the log feeds nothing, only the participant reads it, and there is no score, trend chart or progress indicator. The code today writes automatically from 8 source files and about 27 call sites (`GetStarted.tsx`, `MentorDashboard.tsx`, `CandidateDashboard.tsx`, `TrainingModuleViewer.tsx`, `AssessmentViewer.tsx`, `resumeParser.ts`, `storage.ts`, `supabase.ts`) plus four database functions, the dashboard shows a radar of behavioral scores and a 30 day trend chart, and a mentor writes `mentor_note` into `metadata`. Five rows exist and all five are platform generated (training x2, assessment, resume upload, signup); none is a participant written practice note. All of this conflicts. The earlier recommendation to keep a 30 day trend and a mentor selection feed was wrong and is withdrawn.

## 8. Not yet done

R3 migration plan, R4 apply and test, R5 history marking, R6 final report; field registry load; event registry and hash chain; DT-01 to DT-67 acceptance run. These depend on the decision in CR-002 (a non production environment).
