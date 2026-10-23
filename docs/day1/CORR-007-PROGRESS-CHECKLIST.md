# CORR-007 Rev 1.6 progress checklist (as of 23 October 2026, main at the merge of PR #368)

Ticked = built on the throwaway database, covered by automated tests that pass in CI (unit, database, Vercel), with the guards broken on purpose to prove the tests catch the failure.
Not ticked = not finished. Nothing here is applied to the live project, and every production switch and `lsa_activation` is still OFF.

Test totals on main: 342 database tests, 442 unit tests, forbidden-word ratchet and vocabulary check clean.

## The 31 rules: 24 built and tested, 7 partly built

- [x] CR-01 Sequential unmasking at Stage 2
- [x] CR-02 Prior access bar and mentor rotation
- [x] CR-03 Welfare stop
- [x] CR-04 Identity at Stage entry
- [x] CR-05 Progression challenge
- [ ] CR-06 Correction commitment (loaded and rendered from configuration; participant screen tested only by a contract test)
- [x] CR-07 Disputed clauses that cannot be established
- [x] CR-08 Consent revocation against the commit point
- [x] CR-09 Two release routes
- [ ] CR-10 Multi-page renderer (built earlier; not re-checked against Rev 1.6)
- [x] CR-11 Checklist lists (platform items and the dimension's own items)
- [x] CR-12 Attempts and cooldowns
- [x] CR-13 Involvement, review, issue and reconsideration
- [x] CR-14 Reuse of a form across dimensions
- [x] CR-15 Second independent observer in the pilot
- [x] CR-16 Per-dimension prohibited vocabulary (D9 list loaded)
- [x] CR-17 Retake pools, source selection and the comparison gate
- [x] CR-18 Progression decision only after commit
- [x] CR-19 Minimum observation context for the mentor
- [x] CR-20 Stage 2 and 4 timing and capture refusals
- [x] CR-21 Recovery and source suspension
- [x] CR-22 Stage 4 interruptions
- [x] CR-23 Stage 1 toward recurrence
- [x] CR-24 Second evidence state
- [x] CR-25 Accessible tagged report copy
- [x] CR-26 Eligibility before entry
- [ ] CR-27 T-EVNOTE-001 version 2 (loaded)
- [ ] CR-28 One claim package per dimension (reader built; review and issue record still to build)
- [ ] CR-29 Commit seal key (vault key in place; key-pair signature still to build)
- [ ] CR-30 Stage 4 permission (screen and notice loaded; not routed)
- [ ] CR-31 Five enforcement switches (run in the sandbox in order; all stay OFF in production)

## Server routes that call the new rules

- [x] `POST /api/t3a/entry` (CR-26): identity from the sign-in token, one fixed refusal
- [x] `POST /api/t3a/commit` (CR-21): observer or assigned mentor only
- [x] `POST /api/t3a/interrupt` (CR-22): session facilitator or staff
- [x] `POST /api/t3a/suspend` (CR-21): staff only

## Still open

- [ ] Service key set in Vercel (`SUPABASE_SERVICE_ROLE_KEY`): without it the four routes answer "service unavailable"
- [ ] CORR-007 migrations applied to the live project, with rollback script and verification record
- [ ] Screens: participant release controls, Available Reports, Stage 4 permission screen, notices, accessible report (Playwright)
- [ ] The 104 CORR-007 cases with signed results and the build-complete check
- [ ] Independent CORR-007 reviewer named (not Hans, not the builder)
- [ ] Tony's answers on the open items in the conflict register (CR-182 to CR-203)
- [ ] Production activation of the Session Archive switch (`lsa_activation`): scripts and rollback ready and tested in the sandbox; waits on the founder's word
- [ ] Consent notice shown to real participants: waits on counsel's review
