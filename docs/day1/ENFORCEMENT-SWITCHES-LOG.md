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
