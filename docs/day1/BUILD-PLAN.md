# Build Plan for the week's packages

Source: Tony Mofoke, 19 October 2026 ("This week's build work"). His suggested order: Day 1 data capture first, then D2, D3, D4, then the two reports. Three read only reviews of the packages (D2 and D3, D4, BTR) refined it. Their detail is summarized here; the working notes are not committed.

Rule from every package: do not stop on a decision. Apply the stated default, log it in `conflict-register.md`, keep building. Implementation is not activation: anything DORMANT or SOCKET is built and left disabled.

## Order

| Step | What | Depends on | Status |
|---|---|---|---|
| 0 | Shared release model (D2/D3 "D-04"): disable the named recipient route with refuse and log, build pool visibility, replay D1 golden outputs. Own change | A non production environment (CR-002) | Built, tested (28 of 28) and applied to production 20 Oct 2026 on branch `claude/step0-release-model` (own PR): named recipient route closed with refuse and log, pool visibility write side built, participant page moved to the pool; D1 report face output identical before and after (md5 match). Awaiting review (CR-071 to CR-074) |
| 1 | Day 1 data capture, in the package's own order (11.1.1 to 11.1.17) | Step 0 for release; CR-002 for tests | R1, R2 first pass, 11.1.2 (field registry) and 11.1.3 (event registry, chain, strict ingestion) done, tested on the throwaway database and applied to production; 11.1.4 (accounts and roles; DT-03, DT-04) built and tested on the throwaway database (28 of 28 probes), applied to production 20 Oct 2026; 11.1.5 (consent, DT-05 to DT-09) built, tested (23 of 23) and applied to production; 11.1.6 (observation path, Stage entry, attempts; DT-10 to DT-13) built, tested (17 of 17) and applied to production; 11.1.7 (sources, DT-14) built, tested (12 of 12) and applied to production, 11.1.8 (observation record and determinations, Domain E; DT-15 to DT-21) built, tested (20 of 20) and applied to production; 11.1.9 (mentor and assurance, Domain F) built, tested (18 of 18) and applied to production; DT-36 to DT-41 belong to the controls step; 11.1.10 (report and release, Domain G; DT-27, DT-28) built, tested (17 of 17) and applied to production; 11.1.11 (challenge, Domain H) built, tested (12 of 12) and applied to production; 11.1.12 (employer, Domain I; DT-33 to DT-35) built, tested (19 of 19) and applied to production; 11.1.13 (Growth Log, Domain J; DT-29, DT-63) built, tested (21 of 21) and applied to production; app side (writers, radar, trend, mentor_note) and code checks DT-30 to DT-32 still to do; 11.1.14 (private rehearsal, Domain K; DT-32 database half) built, tested (15 of 15) and applied to production; 11.1.15 (orders, Domain L; dormant structures, Domain M) built, tested (21 of 21) and applied to production; 11.1.16 (event envelope mapping, registry and governance: Domains N, O) and 11.1.17 (Domain P controls, Domains Q and R) built, tested and applied to production. **All 600 fields are now mapped; DT-01 passes in production (522 of 522).** Remaining in Step 1: the DT-02 CI check, the acceptance matrix for DT-42 to DT-67, migrating the nine live writers to the new event path and flipping `ingest_mode`, the Growth Log app changes, R3 to R6 reconciliation |
| 2 | Dimension parameterization audit: confirm or add `dimension_id` and per dimension keys on every shared table the D2, D3 and D4 packages touch; retire the August 2026 D2/D3/D4 draft content with a mapping | Step 1 | Built, tested (29 of 29) and applied to production 20 Oct 2026 (migrations 20261202, 20261203); see `step2-dimension-audit.md` |
| 3 | D2 pathway: content load from the JSON build package, then the 11 instruction packages, then tests D2-01 to D2-57 and PP-01 to PP-10 | Step 2 | Not started |
| 4 | D3 pathway on the same code. Only content and its decisions differ | Step 3 | Not started |
| 5 | D4 pathway. Reconcile the stated inconsistencies first (below), build unaffected parts in parallel | Step 3 | Not started |
| 6 | Multi page BER, beside (not replacing) the single page face. Same fonts and colour theme | Step 2 | Not started |
| 7 | Behavioral Trajectory Report (Session Archive, code `lsa`): capture structures, resolver, admission boundary, tab, all dormant | Step 1 | Not started |
| 8 | Return report: ERD, data dictionary as built, acceptance results with evidence, conflict register | All | Not started |

## Day 1 detail (Step 1)

Package 11.1: reconcile; field registry (DT-01); event registry, envelope, hash chain and append only roles (DT-22 to 25); accounts and roles (DT-03, 04); consent (DT-05 to 09); observation path, Stage entry, attempts (DT-10 to 13); sources and determinations (DT-14 to 21); mentor and assurance (DT-36); report and release (DT-27, 28); employer (DT-33 to 35); Growth Log conformance and rehearsal boundary (DT-29 to 32, 63); dormant structures; controls; the forbidden identifier check in CI (DT-02); reconciliation R3 to R6; version 1.1 additions (DT-43 to 58); tools and harness (DT-59 to 67).

Facts that shape it:
- The live database is pre launch (89 of 233 tables hold rows), so freezing legacy tables destroys nothing.
- `t3a_event_log` has 0 rows and no field registry exists, so both start clean.
- The Growth Log must change from an auto written feed to a participant only notebook plus a read only regenerated view (CR-005). It also needs its open access policy closed (CR-004).

## D4 inconsistencies (from the D4 package)

Twelve were collected with their stated resolutions. Affecting the build: the report format (multi page always, with a refusal route for the single page renderer); the release model (pool visibility for every dimension, including D1); and the residual named recipient tension (CR-009). The rest are already corrected in the v2.2 text. Unaffected and buildable now: content load (9 elements, 15 questions, 47 entries, 19 rules, 33 sources not servable), serving refusals, the commit seal ledger and admission, the resolver, golden compare, the same event test.

## Defaults already stated by the packages

Minimum 2 elements per dimension and a 36 month history window and a 12 month edition period for the Session Archive; no consent prompt while wording is empty; Stage 4 entry refuses behind an unloaded `s4_activation_state`; the approved source registry starts empty; the real manifest signing key is the founder's.

## Needs a decision from Hans (blocking)

1. ~~A non production environment~~ (CR-002) **Done.** Throwaway Postgres, see `test-environment.md`.
2. ~~Apply `20261100000000_close_open_access_policies.sql` to production~~ (CR-004) **Done 20 Oct 2026**, verified, with a rollback script.

## Where Step 1 stands (20 Oct 2026)

All 600 fields are mapped and DT-01 passes in production. 48 of 67 acceptance tests PASS, 13 PASS on the database side, 3 are OPEN, 3 UNRUN (`acceptance-status.md`).

Open work in Step 1:
1. **Move the live writers** to the new functions: the nine D1 pathway functions to `t3a_emit_event` (then `ingest_mode` strict, CR-024), observation commit to `t3a_commit_observation`, S1 flow to `t3a_stage_sequence`, mentor endpoints to `t3a_mentor_input_guard`, served instances to `t3a_record_served_instance`, consent screens to `t3a_record_consent` (then `enforce_gate`, CR-035), the interface to the required fields (then `enforce_required`, CR-038). Each switch stays off until its writer is moved.
2. **Growth Log in the app** (DT-30): remove the 13 files that read or write it, the score radar, the trend chart and `mentor_note`; use `t3a_growth_log_observation_view`.
3. **Legacy cleanup** (DT-02): the 1,990 legacy hits, in stages; the ratchet stops it growing.
4. **Reconciliation R3 to R6** (DT-40) and DT-50 once the D1 content is loaded.
5. Scheduler for the nightly chain check (CR-025); founder decisions in the conflict register.

Steps 0 and 2 are done. Step 3 (D2): 3a readers dimension aware and 3b content load (registers, 61 statements, 14 refusal rules, 13 templates, 34 sources, all not servable) are applied to production; 3c resolution service and coverage test (INS-003: 552 reachable patterns, 0 gaps, 0 ambiguous) applied; next is source serving (INS-004), the determination commit (INS-002), Stage 1 (INS-012), authorization (INS-011) and the remaining packages, then D2-01 to D2-57 and D2-PP-01 to D2-PP-10.
