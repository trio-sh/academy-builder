# CORR-007: review of the 104 worked cases

Reviewer: Claude, in the reviewer role. Builder: the same Claude model in the builder role (session `session_01HsSQ1TEzdCLan4rGpsqE4A`). **No other person or system reviewed this.** Dr Tony Mofoke's written approval of 23 October 2026 (CR-219) delegated the build, the tests and their review to the session and said he expects no review of his own; section 5.1 of the package, which asks for a reviewer who is not the one who ran the cases, is met here by role, as the founder allowed, and by nothing more. The key that signs the results is the reviewer role's own (public key `docs/day1/evidence/case-review/reviewer_public.pem`, fingerprint `40176912a64c2edf`); anyone who wants a human or independent review can re-run everything below and sign their own copy.

Build recorded: `T3A-LEVELER-SANDBOX-b4c285d-20261027`, code commit `b4c285d2993c` (main at PR 410, migrations to 20270251). Results folder: `docs/day1/evidence/case-review/` (`platform_results.json`, its signature, 104 evidence files).

## What was run

The rule tests of CR-01 to CR-32 were run **once per dimension** (D1, D2, D3, D4, D5, D8, D9), each time on a freshly built throwaway database, and **in two states**: with every switch off (as production keeps them), and with all five switches on (`canonical_writers`, strict ingest, `enforce_required`, `enforce_sequence`, `enforce_gate`: the sandbox state). A case is recorded as run on a dimension only where every test it maps to passed in both states. How: `tools/day1/case_review/run_matrix.sh`, `analyze.py`, `build_results.py`; the dimension swap is in `vitest.db.dim.config.ts`.

Each test file has a primary dimension (the one it declares or names most). For another dimension the run swaps it with the primary everywhere in the file, so the same assertions run on synthetic fixtures of that dimension (sources, mentors, clearances, reports). That proves the platform rule works for that dimension's records; it does not prove anything about a dimension's authored content, which has its own acceptance runs (D2 to D9).

Results (default state / sandbox state, whole database suite per dimension, every test, not only the case tests): D1 554 pass 0 fail in both; D2 553 (1 fail) in both; D3 552 (2) in both; D4 551 (3) in both; D5 549 (5) in both; D8 549 (5) in both; D9 549 (5) in both. The failures are tests that belong to one dimension's own content (named in the limits below), not case tests. The two states agree on every dimension. The unit suite ran 517/517 and the switch log (all five on, in order, the whole suite after each) is `docs/day1/evidence/switch-rehearsal.json`.

## What I checked as reviewer

1. **Every case against its tests.** All 104 rows of `platform_results.json` (what is run, expected result) were read against the full name of every test they map to. 100 map by title (the describe or test title names the case, `CR-12 T11`, `T3, T5:`, `T9 + T16:`, or a `Tn:` title in that rule's own file); 4 are mapped by hand: CR-12-T10, CR-16-T1, CR-31-T1, CR-31-T2. Corrections I made while reading: tests under another rule's describe in a shared file (cr04-cr05, cr06-cr10-cr27) were wrongly attached to a case and no longer are; CR-31-T1/T2 had been matched to unrelated tests of the same number and now map to the switch log (T1: three unit tests and the all-on state test) and the production defaults test (T2); CR-16-T1 is a D9 list test and is counted for D9 only, as the matrix says.
2. **Bodies, not only titles**, for the cases most likely to be mapped loosely: CR-02, CR-08 (every act in both orders around the commit point, the race), CR-12 (dates, month end, display zone, callbacks, daylight saving), CR-13-T3, CR-20, CR-26-T2, CR-28-T3, CR-29, CR-31. Two tests were wrong for other dimensions and were fixed rather than excused: CR-13-T3 assumed the table trigger answers first, which holds for D1 only (other dimensions meet the issuance gate first, which also refuses the same person; the test now asserts the gate's refusal and that no row is written), and CR-21-T3 / CR-28-T3 assumed D2 sorts before D3.
3. **Independent re-run** of cr09, cr12, cr13 and cr25 on a database I built separately, as D5, with all five switches on: 79/79.
4. **Test the tests.** With the reviewer-is-not-issuer guards removed from the database the D5 run of CR-13-T3 fails; with them back it passes. Earlier the flow test, the consent gate (domain_b DT-06/DT-07) and the switch rehearsal were each seen failing when the thing they guard was broken.
5. **The artifacts** name the case and the build, list every mapped test with its status on each dimension and each state, and the gate re-checked their digests.

## Limits, stated as they are

- **CR-20 is shown on all seven dimensions, on each dimension's own authored question.** The timing machinery is driven by a registry (`t3a_timing_reference_field`, migrations 20270250 and 20270251). D1 carries Q-D1-02, Q-D1-07 and Q-D1-08a; D2 Q-D2-09, D3 Q-D3-09, D4 Q-D4-09, D5 Q-D5-09, D8 Q-D8-09 and D9 Q-D9-09, each read against the beat its source states in that dimension's test point field (CR-334). No stand-in question is used. One authored question is deliberately not registered: Q-D3-07 (`handover_point`), because half the loaded D3 sources state the handover point in words with no beat (CR-334).
- **CR-16 is a D9 rule** (D1 to D8 read NOT_APPLICABLE in the matrix); its evidence is the D9 list test, unswapped.
- **CR-31-T2.** "All off" is shown for the five enforcement switches in a database built from the migrations and in the live project (checked 26 October: canonical writers off, ingest legacy_tolerant, required, sequence and gate false). `lsa_activation` is **on** in the live project by the founder's decision (CR-217); the package text predates that decision.
- **Dimension tests that only hold for their own dimension** and fail on others by design, so are not case tests: the D1 consent-table test in cr08, the per-dimension list tests in cr16, the interim issuance and seal-key production-default tests (cr32 T2, cr29), the single-page-route test for D4 in cr06.
- This is the sandbox implementation. It does not itself authorize real participants; that stays the founder's recorded decisions.

## Verdict

All 104 cases are recorded with PASS: 103 on all seven dimensions and CR-16-T1 on D9 (its only dimension), with the CR-20 limit above. Every rule is shown on every dimension it applies to. I accept the platform evidence on these terms and sign `platform_results.json`.
