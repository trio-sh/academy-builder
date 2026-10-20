# Build Plan for the week's packages

Source: Tony Mofoke, 19 October 2026 ("This week's build work"). His suggested order: Day 1 data capture first, then D2, D3, D4, then the two reports. Three read only reviews of the packages (D2 and D3, D4, BTR) refined it. Their detail is summarized here; the working notes are not committed.

Rule from every package: do not stop on a decision. Apply the stated default, log it in `conflict-register.md`, keep building. Implementation is not activation: anything DORMANT or SOCKET is built and left disabled.

## Order

| Step | What | Depends on | Status |
|---|---|---|---|
| 0 | Shared release model (D2/D3 "D-04"): disable the named recipient route with refuse and log, build pool visibility, replay D1 golden outputs. Own change | A non production environment (CR-002) | Not started |
| 1 | Day 1 data capture, in the package's own order (11.1.1 to 11.1.17) | Step 0 for release; CR-002 for tests | R1, R2 first pass, 11.1.2 (field registry) and 11.1.3 (event registry, chain, strict ingestion) done, tested on the throwaway database and applied to production; 11.1.4 (accounts and roles; DT-03, DT-04) built and tested on the throwaway database (28 of 28 probes), not applied to production; 11.1.5 onward not started |
| 2 | Dimension parameterization audit: confirm or add `dimension_id` and per dimension keys on every shared table the D2, D3 and D4 packages touch; retire the August 2026 D2/D3/D4 draft content with a mapping | Step 1 | Not started |
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
