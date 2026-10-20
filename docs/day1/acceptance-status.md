# Day 1 acceptance status (T3A-DEV-DAY1-001 v1.3)

Rebuilt by `tools/day1/acceptance_status.py`. Evidence files are in `docs/day1/evidence/`. Tests ran on the throwaway database (`test-environment.md`); the migrations were then applied to production with a before snapshot, a rollback and a zero-residue probe.

**48 PASS, 13 PASS-DB (database half proven, application half open), 3 OPEN, 3 UNRUN** of 67.

| Test | What | Status | Evidence | Note |
|---|---|---|---|---|
| DT-01 | Dictionary coverage | **PASS** | `production-apply-event-log-capture-state-verification.json` | 522 of 522 active and dormant fields resolve; 0 unmapped; 0 missing capture state; 0 dangling. Checked in production with t3a_field_registry_dt01() |
| DT-02 | Forbidden identifiers | **OPEN** | `forbidden-identifiers-baseline.json` | 1,990 legacy hits in 99 files (CR-006). tools/day1/forbidden_ratchet.py passes: nothing new, nothing worse. Plain DT-02 passes only when the baseline reaches 0 |
| DT-03 | Server side role | **PASS** | `domain-a-test.json` | Sign up asserting a role other than candidate creates no profile and keeps a refusal row (CR-029). Probe in production |
| DT-04 | Unverified holding state | **PASS** | `domain-a-test.json` | Gates on Stage entry, gateway, attempt, observation and disclosure. Production has no unverified accounts, so no live effect today |
| DT-05 | Consent one type per interaction | **PASS** | `domain-b-test.json` |  |
| DT-06 | Consent not inherited | **PASS** | `domain-b-test.json` | Switch enforce_gate is off (CR-035); tested with it on |
| DT-07 | Withdrawal deletes nothing | **PASS** | `domain-b-test.json` | Switch enforce_gate is off (CR-035); tested with it on |
| DT-08 | Socket consent routes | **PASS** | `domain-b-test.json` |  |
| DT-09 | lsa consent default | **PASS** | `domain-b-test.json` |  |
| DT-10 | Gateway before Stage | **PASS** | `domain-c-test.json` |  |
| DT-11 | Stage entry timing | **PASS** | `domain-c-test.json` | 5 minute backdating tolerance is a default (CR-041) |
| DT-12 | Attempt monotonic | **PASS** | `domain-c-test.json` | Cap rule is the live one (CR-007) |
| DT-13 | Welfare stop | **PASS** | `domain-c-test.json` |  |
| DT-14 | Capture never blocks | **PASS** | `domain-d-test.json` |  |
| DT-15 | Mandatory field refusal | **PASS-DB** | `domain-e-test.json` | Logged refusal is in t3a_commit_observation; the live writers do not call it yet (CR-047) |
| DT-16 | Observer at S1 | **PASS-DB** | `domain-e-test.json` | Refused by the table trigger on every route |
| DT-17 | Dual hash | **PASS-DB** | `domain-e-test.json` | Via t3a_commit_observation |
| DT-18 | Sequential unmasking | **PASS-DB** | `domain-e-test.json` | The live S1 flow does not write t3a_stage_sequence yet (CR-047) |
| DT-19 | S1 outcome before S2 | **PASS-DB** | `domain-e-test.json` | enforce_sequence is off (CR-047) |
| DT-20 | No free text | **PASS-DB** | `domain-e-test.json` | Guard and table triggers built; edge functions do not call the guard yet (CR-047) |
| DT-21 | Accommodation reason | **PASS-DB** | `domain-e-test.json` | Same as DT-20 |
| DT-22 | Append only observations | **PASS** | `dt22-dt26-test.json` | Observation guard hardened in 20261124: the older guard watched 12 columns and allowed DELETE |
| DT-23 | Event envelope and payload | **PASS** | `event-registry-test.json` | E2, E5 |
| DT-24 | Hash chain | **PASS** | `event-registry-test.json` | E8, E9, E12; nightly job has no scheduler yet (CR-025) |
| DT-25 | Unknown event name | **PASS** | `event-registry-test.json` | E4 |
| DT-26 | Demonstration inheritance | **PASS** | `dt22-dt26-test.json` | Applies to accounts and events, the only tables with record_property |
| DT-27 | Reviewer is not issuer | **PASS** | `domain-g-test.json` |  |
| DT-28 | Verification code | **PASS** | `domain-g-test.json` | The one existing report has no code (CR-052) |
| DT-29 | Growth Log isolation | **PASS-DB** | `domain-j-test.json` | Database read paths tested for participant, mentor, employer, administrator. The app screens that read Growth Log still exist (CR-058) |
| DT-30 | Growth Log feeds nothing | **OPEN** |  | 13 source files still read or write the Growth Log (src/pages/dashboard/*, TrainingModuleViewer, AssessmentViewer, lib/*). To be removed; the database now discards the writes |
| DT-31 | lsa reads no Growth Log | **PASS** | `domain-lm-test.json` | No Session Archive consumer exists; no database function reads both |
| DT-32 | Rehearsal firewall | **PASS-DB** | `domain-k-test.json` | No foreign key, no column, no database function named has_rehearsed. scripts/check-firewall.mjs already scans the code and mentions the name only as a prohibition |
| DT-33 | Hire row unlinked | **PASS** | `domain-i-test.json` |  |
| DT-34 | Pool filters | **PASS** | `domain-i-test.json` | No pool exists yet (CR-056) |
| DT-35 | Unverified employer | **PASS** | `domain-i-test.json` |  |
| DT-36 | Content read logging | **PASS** | `domain-p-test.json` | The existing oversight log is the content read log (CR-063) |
| DT-37 | Retention guard | **PASS** | `domain-p-test.json` |  |
| DT-38 | Canada hosting | **PASS-DB** | `domain-p-test.json` | Records an operator verification; the actual hosting and backup inspection is the operator's |
| DT-39 | Unset configuration | **PASS** | `domain-p-test.json` | Deployment values are unset until the founder sets them (CR-062) |
| DT-40 | Reconciliation report | **OPEN** | `reconciliation-report.md` | R1 and R2 first pass done; R3 to R6 not yet. Backfills so far write no history |
| DT-41 | Manifest signature | **PASS** | `domain-no-test.json` | Package tool test_tools.py passes 53 of 53 in a clean environment (CR-001); the database records pass and fail results |
| DT-42 | Commercial lever | **PASS** | `acceptance-rules-test.json` |  |
| DT-43 | Idempotent replay | **PASS** | `event-registry-test.json` | E13 |
| DT-44 | Late event ordering | **PASS** | `acceptance-rules-test.json` |  |
| DT-45 | Concurrent correction | **PASS** | `acceptance-rules-test.json` | Staleness is read from the report's version set (CR-065) |
| DT-46 | Preview and issue race | **PASS** | `acceptance-rules-test.json` |  |
| DT-47 | Historical reuse | **UNRUN** |  | Dormant: the Session Archive consent table is closed, so a consent cannot be granted to test against |
| DT-48 | Two clause instances | **PASS** | `acceptance-rules-test.json` |  |
| DT-49 | Dormant write failure | **PASS** | `acceptance-rules-test.json` | Sidecar switch is off while the Session Archive is dormant |
| DT-50 | BER regression | **UNRUN** |  | Needs the D1 content and the BER golden fixtures loaded; the test database has no production rows (CR-027) |
| DT-51 | Stage 1 determinism | **PASS-DB** | `acceptance-rules-test.json` | Via t3a_record_served_instance; the live S1 serving path does not call it yet |
| DT-52 | Stage 4 co participants | **PASS** | `acceptance-rules-test.json` |  |
| DT-53 | Optional fields withheld | **PASS** | `acceptance-rules-test.json` |  |
| DT-54 | Legal hold | **PASS** | `domain-p-test.json` |  |
| DT-55 | Cross organization isolation | **PASS** | `domain-qr-test.json` | No tenant model exists |
| DT-56 | Dictionary drift | **PASS** | `dt56-m7-undeclared-columns.json` | 1,591 persisted columns in 255 tables are not in the dictionary; all are listed as M7. Nothing was deleted |
| DT-57 | Source title preserved | **PASS** | `acceptance-rules-test.json` |  |
| DT-58 | One source bank | **PASS** | `acceptance-rules-test.json` |  |
| DT-59 | Error journal | **PASS-DB** | `domain-p-test.json` | t3a_emit_first and t3a_reconcile_journal; the nine live writers do not use them yet (CR-024) |
| DT-60 | Typed capture state | **PASS** | `production-apply-event-log-capture-state-verification.json` | Typed columns stay null; the companion holds the code. Applied to every domain table and the event log |
| DT-61 | Legacy columns keep working | **UNRUN** |  | Needs each live feature exercised in the app against the legacy columns; no legacy column was changed or read differently in this build |
| DT-62 | Legacy consent mapping | **PASS** | `acceptance-rules-test.json` | No mapping is made by default (CR-065) |
| DT-63 | Growth Log observation view | **PASS-DB** | `domain-j-test.json` | The database writes nothing to the Growth Log and offers the regenerated view; the app does not use the view yet |
| DT-64 | Lifecycle fixtures | **PASS** | `event-registry-test.json` | E2 |
| DT-65 | Conditional requiredness | **PASS** | `acceptance-rules-test.json` | Required-fields switch is off for live writers (CR-038) |
| DT-66 | Reference existence | **PASS** | `event-registry-test.json` | E14; reference rules for 8 id keys (CR-022) |
| DT-67 | Pinned definitions | **PASS** |  | check_dictionary.py refuses a changed field type and a changed enum value as DEFINITION_CHANGED; the generators stop when it fails |
