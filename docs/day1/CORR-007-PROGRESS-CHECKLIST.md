# CORR-007 Rev 1.6 progress checklist (as of 23 October 2026, main at the merge of PR #368)

Ticked = built on the throwaway database, covered by automated tests that pass in CI (unit, database, Vercel), with the guards broken on purpose to prove the tests catch the failure.
Not ticked = not finished. Nothing here is applied to the live project, and every production switch and `lsa_activation` is still OFF.

Test totals on main: 366 database tests, 447 unit tests, forbidden-word ratchet and vocabulary check clean.

## The 31 rules: 31 built and tested (switches 3 to 5 do not yet pass the full suite, see the last rule)

- [x] CR-01 Sequential unmasking at Stage 2
- [x] CR-02 Prior access bar and mentor rotation
- [x] CR-03 Welfare stop
- [x] CR-04 Identity at Stage entry
- [x] CR-05 Progression challenge
- [x] CR-06 Correction commitment and participant review of every committed observation (route and rules; the screen is in the screens item)
- [x] CR-07 Disputed clauses that cannot be established
- [x] CR-08 Consent revocation against the commit point
- [x] CR-09 Two release routes
- [x] CR-10 One page rendering passages (render gate; the issuing screen is in the screens item)
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
- [x] CR-27 T-EVNOTE-001 version 2
- [x] CR-28 One claim package per dimension (selection rule, version stamped at issue, review before issue; the screen is in the screens item)
- [x] CR-29 Commit seal key (key version on every seal, rotation keeps earlier seals valid, activation refuses while the shared Vault key is current; the production key pair itself is a pre-activation job, see CR-211)
- [x] CR-30 Stage 4 permission (rule, grant and refusals; the screen component calls it, routing it into a participant page is in the screens item)
- [x] CR-31 Five enforcement switches rehearsed in the sandbox in order, each with a full test run, logged (`switch-rehearsal.json`); all stay OFF in production (tested). Finding: switches 1 and 2 are clean, switches 3 to 5 fail 222 of 364 database tests because test fixtures do not yet fill every required field. That fix is a pre-activation job, see CR-213

## Server routes that call the new rules

- [x] `POST /api/t3a/entry` (CR-26): identity from the sign-in token, one fixed refusal
- [x] `POST /api/t3a/commit` (CR-21): observer or assigned mentor only
- [x] `POST /api/t3a/interrupt` (CR-22): session facilitator or staff
- [x] `POST /api/t3a/suspend` (CR-21): staff only

## Still open

- [x] Service key set in Vercel (`SUPABASE_SERVICE_ROLE_KEY`, Production and Preview, sensitive): the routes use it from the next deploy
- [x] CORR-007 migrations 20270102 to 20270125 applied to the live project, each with a rollback script and verification record (`docs/day1/evidence/live-apply-*`); 20270126 to 20270128 (CR-28, CR-29, CR-30) applied the same way
- [ ] Screens: participant release controls, Available Reports, Stage 4 permission screen, notices, accessible report (Playwright)
- [ ] The 104 CORR-007 cases with signed results and the build-complete check
- [ ] Independent CORR-007 reviewer named (not Hans, not the builder) for the 104 cases
- [ ] Tony's answers on the open items in the conflict register (CR-182 to CR-203)
- [ ] Production activation of the Session Archive switch (`lsa_activation`): scripts and rollback ready and tested in the sandbox; waits on the founder's word
- [x] Consent notice T3A-LEG-001 Part A v1.2 loaded on the live project (CR-207); counsel is out of the chain (CR-206). Whether the consent screens show it to participants is part of the screens work below
