# Enforcement switches in the sandbox: log of 22 October 2026

Authority: Tony Mofoke's answer 8 (21 October): in the sandbox, one at a time, in the order below, rerunning the full test suite on a copy after each; production switches stay off; `lsa_activation` stays off. CORR-007 rule CR-31.

Method: a fresh database is rebuilt from the repository migrations for every row (local Postgres 16, 212 migrations; it matches the Neon throwaway database test for test at the all-off baseline, 1,294 passing and 14 failing, the same 14 as before any switch), the switches up to that row are turned on, and all 65 test files are run. Counts are individual checks. The 14 baseline failures are old and unrelated to the switches: `domain_no` (4), `domain_g` (2), `step3h` (4) and its D3 copy, and test files that exit without counts.

| Step | Switch turned on | Passing | Failing | What changed against the step before |
|---|---|---|---|---|
| 0 | none | 1,294 | 14 | baseline |
| 1 | `canonical_writers` (`t3a_event_config`) | 1,293 | 16 | `step0_release_test` showed 2 failures in this run, but the failure is intermittent (see point 1); the Neon run of this step showed no change (1,267 and 14, as step 0) |
| 2 | strict event ingest (`ingest_mode` = strict) | 1,294 | 14 | no change against step 0 |
| 3 | `enforce_required` (`t3a_capture_config`) | 770 | 10 | 25 test files stop at `T3A_REQUIRED_FIELD_MISSING`; the test rows do not fill every required field. Three more files lose checks (`domain_a`, `matrix`, `rehearsal_progress`), all for the same reason |
| 4 | `enforce_sequence` | 770 | 10 | no change: the step 3 stops hide it |
| 5 | `enforce_gate` (`t3a_consent_config`) | 770 | 10 | no change: hidden by the same stops |

Because step 3 hides steps 4 and 5, the last two were also run on top of step 2 with `enforce_required` left off (out of Tony's order, for information only):

| Run | Passing | Failing | What changed |
|---|---|---|---|
| step 2 plus `enforce_sequence` | 1,236 | 18 | Stage 2 entry refuses `S1_OUTCOME_NOT_DELIVERED` in 4 files; the test participants never have a Stage 1 outcome delivered |
| step 2 plus `enforce_sequence` plus `enforce_gate` | 1,208 | 18 | `acceptance_rules` stops on `LEGACY_CONSENT_DOES_NOT_COVER_PURPOSE`; `matrix` loses 2 checks that depend on rows the stopped tests would have written |

## What this means

1. **`canonical_writers` is safe in the sandbox, with one intermittent failure to explain.** With it on, `step0_release_test` failed in 2 of 11 local runs (the participant's pool withdrawal event was refused `PAYLOAD_INVALID` by the payload check in strict ingest) and passed in the other 9; the Neon run was clean. I have not found the cause; it looks like a timing-dependent check on the payload, and it is not caused by this switch's setting alone. It is listed here so it is not mistaken for a new regression.
2. **`enforce_required` refuses rows that omit a required field.** The test fixtures omit them, so the suite has to be updated before steps 4 and 5 can be judged in Tony's order. The live screens and edge functions must supply the same fields before this switch is ever turned on outside the sandbox (CR-035, CR-047).
3. **`enforce_sequence` enforces a rule that CORR-007 reverses.** As built, Stage 2 entry waits for the Stage 1 outcome to be delivered to the mentor. CORR-007 rule CR-01 (sequential unmasking) says the opposite: the Stage 2 mentor sees only "Stage 1 confirmed on this dimension" until the Stage 2 commit. This switch should not be turned on beyond the sandbox until CR-01 is built and the sequence rule is rewritten to match it.
4. **`enforce_gate` refuses participants whose consent sits in the older tables** (`LEGACY_CONSENT_DOES_NOT_COVER_PURPOSE`). The live screens still write the older tables (CR-035), so turning it on in production would lock participants out until the consent screens write `t3a_consent_record`.
5. Production was checked after these runs: `canonical_writers` off, `ingest_mode` legacy_tolerant, `enforce_required`, `enforce_sequence` and `enforce_gate` all false. `lsa_activation` untouched.

## Update after CORR-007 CR-01 (22 October, later)

Point 3 above is resolved. `enforce_sequence` now enforces CR-01: Stage 2 entry needs Stage 1 confirmed on the dimension (`S1_NOT_CONFIRMED`), and the Stage 1 outcome is no longer delivered to the Stage 2 mentor first. Rerun on the new code: steps 0 to 2 are unchanged (1,416 passing, the same 14 old failures); step 3 (`enforce_required`) still stops the old fixtures; with `enforce_required` left off, `enforce_sequence` refuses the Stage 2 entries of five old test files because their participants have no Stage 1 confirmation. That is the rule working. Those fixtures need a confirmation row before the switch can be judged against the full suite.

## Update 23 October: `lsa_activation` on in the sandbox only

On a freshly built throwaway database (all 300 database tests pass with the flag off), the flag was set on (`t3a_lsa_flag('lsa_activation')` = true) and the full database suite rerun: 299 pass and 1 fails, `lsa_registry_test.mjs`, the test that asserts an active registry record is refused while activation is off. That is the rule working, not a regression. Production is untouched and the flag stays off there. `tools/day1/lsa_activation_on.sql` and `lsa_activation_rollback.sql` are ready, tested on the throwaway database (on, then off, then on again), and have not been run anywhere else. Turning the flag on in production waits for the founder's word (CLAUDE.md rule 5).

## Rerun on the final CORR-007 build: 23 October 2026 (CR-31)

Run by `tools/day1/switch_rehearsal.py` on the build that includes CR-01 to CR-30 (main at the merge of #377). A fresh database is rebuilt from the migrations for every step; the switches are turned on cumulatively, in the stated order; after each step the full database suite (364 tests) and the full unit suite (447 tests) run. The result is `docs/day1/evidence/switch-rehearsal.json`. `lsa_activation` stays off at every step. Production was not touched.

| Step | Switches on | Database suite (failed / total) | Unit suite |
|---|---|---|---|
| 0 | none | 0 / 364 | 447 pass |
| 1 | `canonical_writers` | 0 / 364 | 447 pass |
| 2 | + strict event ingest | 0 / 364 | 447 pass |
| 3 | + `enforce_required` | 222 / 364 (40 distinct tests) | 447 pass |
| 4 | + `enforce_sequence` | 222 / 364 | 447 pass |
| 5 | + `enforce_gate` | 228 / 364 | 447 pass |

Finding. The first two switches are safe on this build. `enforce_required` is not: every failure traced is a direct row insert in a test fixture or an older test script that does not fill a required field (the only function in the stack is the required-field trigger itself); no route or function failure was seen, but the routes are not yet proven under enforcement because their tests stop earlier at the fixture. Fields seen: `ber_standard_version` and `ber_version` on the report row, `attempt_rules_version` on an attempt, `application_status` on an employer application, `decided_by` on a progression decision), so the writes stop at `T3A_REQUIRED_FIELD_MISSING`. The later two steps add nothing beyond step 3 except six more failures at `enforce_gate`. This is the same shape as the 22 October run. Nothing here is wrong in production because production keeps every switch off. Job left for the builder before any activation decision: make the fixtures supply the required fields (the counts: observation notification timestamp 107, mentor reviewer authorization 47, attempt rules version 39, report standard version 37, report version 31, employer application status 25, progression decider 15), so the route tests reach the real writers, then rerun this script until steps 3 to 5 are clean. Tests CR-31-T1 (the log shows five switches on in order, each with a full run, lsa_activation off) and CR-31-T2 (a database built from the migrations reads every switch and lsa_activation off) are `src/test/cr31-switch-log.test.ts` and `src/test/db/cr31-production-defaults.db.test.ts`; both were broken on purpose and caught it.

## Update 23 October (later): `enforce_required` closed in the sandbox (CR-218)

The earlier finding was that turning `enforce_required` on stopped 222 of 364 database tests at the fixtures, so the routes were not yet proven under it. The fixtures now fill every required field, and with the routes reached the run showed that eight production writers did the same thing the fixtures did: they insert first and fill the required fields afterwards, which the check refuses. Migration `20270131000000_cr31_enforce_required_completions.sql` completes them (details in CR-218), only while the switch is on and only a field that is still empty.

- All 388 database tests pass with the switch off (`npm run test:db`) and 388 pass with it on from the start to the end of the run (`npm run test:db:enforced`, which also sets the stage entry hold time, a setting that must be in place before the switch is turned on in production). The CI database job now runs both.
- One older fact the first run hid: the older scripts that turn the switch on for one check turned it off again at the end, so the rest of the run was never under it. They now put it back to what it was.
- Not done: `enforce_sequence` and `enforce_gate`. With `enforce_sequence` also on, 9 older scripts fail because they enter Stage 2 with no Stage 1 confirmation on record (the new rule refusing correctly; their fixtures need the confirmation), and the database tests written for the rule pass. With `enforce_gate` also on, 47 more tests fail on consent fixtures. These two are not proven and stay off. `canonical_writers` and strict event ingest were not rerun with this change.
- `stage_entry_hold_ttl` was empty on the live project; it was set to 1800 seconds on 26 October (CR-306). Nothing was turned on.

- Applied to the live project on 23 October: migration 20270131 (record `evidence/live-apply-20270131-verification.json`, rollback `evidence/live-apply-20270131-rollback.sql`). After it `enforce_required` still reads false on live and `lsa_activation` is on; the 11 new triggers do nothing while the switch is off.

## Update 26 October: all five switches pass the full suite in the sandbox

`tools/day1/switch_rehearsal.py` re-run on main at PR 401: a fresh database for every step, switches on cumulatively in the stated order (`canonical_writers`, strict ingest, `enforce_required`, `enforce_sequence`, `enforce_gate`), and after each step the full database suite (508 tests) and unit suite (517) pass with 0 failures (`evidence/switch-rehearsal.json`). The sequence and gate closure: a Stage 2 entry fixture gets a Stage 1 confirmation; every fixture account gets consent on creation in the gate run, and the scripts that test consent absence keep bare accounts; the stage entry event derives its participant first (migration 20270133, applied to the live project). The CI database job runs the suite with all three database switches on. In production all five are still OFF (checked on the live project on 26 October); `lsa_activation` is on by CR-217.

## 26 October 2026: final evidence run

The case matrices were re-run on main 3cecc7e (migrations to 20270250) in both states, default (all off) and sandbox (all five on), on every dimension, and the 104 cases re-recorded and re-signed (`docs/day1/evidence/case-review/`). Unit suite 517/517. All five switches are still OFF on the live project; `lsa_activation` stays on by CR-217; stage entry hold time is set (1800).
