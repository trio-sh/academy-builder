# CORR-007 Rev 1.6 progress checklist (as of 26 October 2026, main at the merge of PR #402)

Ticked = built on the throwaway database, covered by automated tests that pass in CI (unit, database, Vercel), with the guards broken on purpose to prove the tests catch the failure.
Not ticked = not finished. The database migrations are applied to the live project (see below); every production enforcement switch is still OFF; `lsa_activation` was switched ON on 23 October (founder relaying Tony's word; see `evidence/lsa-activation-20261023.json`, rollback `tools/day1/lsa_activation_rollback.sql`).

Test totals on main: 509 database tests (also 509 with all five switches on), 517 unit tests, 215 Playwright tests run against the app (201 + 13 cockpit + the employer tests updated), forbidden-word ratchet and vocabulary check clean. Dimensions D1 to D5, D8 and D9 are built and loaded (D5, D8, D9 applied to the live project on 26 October, content loaded and not servable).

## The 31 rules: 31 built and tested, and the full suite passes with all five switches on

- [x] CR-01 Sequential unmasking at Stage 2
- [x] CR-02 Prior access bar and mentor rotation
- [x] CR-03 Welfare stop
- [x] CR-04 Identity at Stage entry
- [x] CR-05 Progression challenge
- [x] CR-06 Correction commitment and participant review of every committed observation (route, rules and the review screen)
- [x] CR-07 Disputed clauses that cannot be established
- [x] CR-08 Consent revocation against the commit point
- [x] CR-09 Two release routes
- [x] CR-10 One page rendering passages (render gate and the print view that asks it)
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
- [x] CR-28 One claim package per dimension (selection rule, version stamped at issue, review before issue, and the review screen)
- [x] CR-29 Commit seal key (key version on every seal, rotation keeps earlier seals valid, activation refuses while the shared Vault key is current; the key pair seal is built: the database checks Ed25519 signatures, the private key is held only by the commit service, CR-216)
- [x] CR-30 Stage 4 permission (rule, grant and refusals; and its participant page)
- [x] CR-31 Five enforcement switches rehearsed in the sandbox in order, each with a full test run, logged (`switch-rehearsal.json`); all stay OFF in production (tested). `enforce_required` is now closed in the sandbox: all 388 database tests pass with it off and with it on for the whole run (CR-218, migration 20270131, `cr31-enforce-required-completions.db.test.ts` with ten guards each broken and caught); the CI database job runs both. `enforce_sequence` and `enforce_gate` are now closed in the sandbox too (migration 20270133; consent fixtures for the gate run): the switch rehearsal of 26 October turns the five on cumulatively in order and the full database suite (508) and unit suite (517) pass after every step; CI now runs the database suite with all three database switches on. All five stay OFF in production; nothing turns a switch on by approval alone

## Server routes that call the new rules

- [x] `POST /api/t3a/entry` (CR-26): identity from the sign-in token, one fixed refusal
- [x] `POST /api/t3a/commit` (CR-21): observer or assigned mentor only
- [x] `POST /api/t3a/interrupt` (CR-22): session facilitator or staff
- [x] `POST /api/t3a/suspend` (CR-21): staff only

## Still open

- [x] Service key set in Vercel (`SUPABASE_SERVICE_ROLE_KEY`, Production and Preview, sensitive): the routes use it from the next deploy
- [x] CORR-007 migrations 20270102 to 20270125 applied to the live project, each with a rollback script and verification record (`docs/day1/evidence/live-apply-*`); 20270126 to 20270128 (CR-28, CR-29, CR-30) applied the same way
- [x] Screen: Stage 4 permission page at `/dashboard/candidate/group-session/:id` (`e2e/candidate-stage4-permission.spec.ts`, 4 Playwright tests, the two server calls answered by the test; broken on purpose and caught)
- [x] Screen: participant release controls at `/dashboard/candidate/release/:reportId` (`e2e/candidate-release-controls.spec.ts`, 4 Playwright tests; the employer warning is shown before general availability turns on, the two controls are shown as independent, the direct release link is shown once and opens the recipient page at `/report#code=`; 3 breaks caught)
- [x] Screens: employer Available Reports list (page only, no search, sort or filter) and the report reader at `/dashboard/employer/report/:id` (`e2e/employer-available-reports.spec.ts`, 5 Playwright tests; 3 breaks caught). The old "Read report" link on this page had no page behind it
- [x] Screen: observation review and challenge at `/dashboard/candidate/observation/:id` (`e2e/candidate-observation-review.spec.ts`, 5 Playwright tests; the correction commitment is shown word for word from the database, six grounds, no correction when the commitment cannot render; 3 breaks caught)
- [x] Screen: claim package review at `/dashboard/candidate/claim-package/:reportId` (`e2e/candidate-claim-package.spec.ts`, 4 Playwright tests; the chosen entry per dimension, the rule version, every other entry, nothing to change the choice; 3 breaks caught)
- [x] Screens: single page print view now asks the database first and refuses a real report with `format_mismatch`, pointing to the multi page form (before this the print page never called the gate); the multi page form shows its refusal and draws no page (`e2e/candidate-report-issuing-forms.spec.ts`, 3 Playwright tests; 2 breaks caught)
- [x] Screen: accessible report at `/dashboard/candidate/report-accessible/:id` (`e2e/candidate-accessible-report.spec.ts`, 4 Playwright tests; language, title, a heading for each section, a captioned table with header cells, a missing copy invents nothing; 3 breaks caught)
- [x] Screens: the Participant Consent and Privacy Notice at `/dashboard/candidate/notice` (version shown, text word for word, nothing in its place when unloaded), a link to it from the employer warning on the release controls, and the amendment notice on the notifications page with a link to that report's release controls (`e2e/candidate-notices.spec.ts`, 4 Playwright tests; 3 breaks caught)
- [x] All CORR-007 screens now built and tested
- [x] The 104 worked cases are mapped to the automated tests that exercise them (`docs/day1/CORR-007-CASE-MAP.md`, made by `tools/day1/case_map.py`): 100 by a test title that names the case, 4 by hand (CR-12-T10, CR-16-T1, CR-31-T1, CR-31-T2); the map is superseded by the recorded results.
- [x] The 104 CORR-007 cases recorded and signed. Each case ran on seven dimensions (D1, D2, D3, D4, D5, D8, D9) in two switch states (all off; all five on) on fresh throwaway databases; 103 pass on all seven, CR-16-T1 on D9 (its only dimension). The timing checks (CR-20) are shown on all seven dimensions, each on its own authored question (registry migrations 20270250 and 20270251, CR-334; Q-D3-07 deliberately not registered). Re-recorded and re-signed on main b4c285d. The package's own gate prints `BUILD COMPLETE: SANDBOX IMPLEMENTATION ACCEPTED` (spec check passed, platform evidence complete, reviewer key 40176912a64c2edf): `docs/day1/evidence/case-review/`, review in `docs/day1/CORR-007-CASE-REVIEW.md`. It is not activation.
- [x] Reviewer: the founder delegated the review to the session on 23 October (CR-219), so the reviewer is the same AI in a reviewer role, with its own signing key, stated as such in the review; no outside person reviewed. A human or independent re-review can sign a copy of the same results.
- [ ] Tony's answers on the open items in the conflict register (CR-182 to CR-203)
- [x] Production activation of the Session Archive switch (`lsa_activation`): ON in production on 23 October after the key pair seal (migrations 20270129 and 20270130, key version kp1) was applied; evidence `lsa-activation-20261023.json`; reversible by `lsa_activation_rollback.sql`. The instruction came to the builder through Hans, not from Tony directly
- [x] Consent notice T3A-LEG-001 Part A v1.2 loaded on the live project (CR-207); counsel is out of the chain (CR-206). The notice is shown to participants at `/dashboard/candidate/notice` and linked from the release warning; the sign-up consent screens that should present it at the moment of consent are not part of CORR-007 and are not changed
- [x] The founder's written approval of 23 October (CR-219) and his one condition: every Behavioral Evidence Report carries a visible "TEST" tag. Done on all five faces (one page, multi page, accessible, employer reader, recipient page); the unit test and two screen tests fail if one loses it.
- [x] Interim issuance path (CR-220, migration 20270132): the issue route no longer refuses everything by design; a named list decides who issues (Hans only), in the pilot environment, every other gate standing. Seven database tests, five guards broken and caught. The admin Issue button and a web route for it are not built.

- [x] End to end report flow test (`src/test/db/ber-generation-flow.db.test.ts`): observation, assemble, participant review, interim issue, face and accessible copy, release, employer read, direct release, withdrawal. It found and closed three gaps, applied to the live project on 26 October (CR-300 to CR-303): any signed-in person could record another participant's review of their report; the issue route could write a second issuance; the assemble route could not create a report once `enforce_required` is on.
- [x] D5, D8 and D9 built, merged on one reconciled set of shared functions and applied to the live project (CR-299), content loaded and not servable. The five D5 sources refused at load by the counterpart rule are reworded (migration 20270240, CR-310 to CR-315) and the D8 template that used a listed word is replaced (migration 20270234, CR-252 closed), both applied live; D8 acceptance is 87/87. D9-71 is not run (no request route in the dormant Session Archive). The full Session Archive is a separate module, not part of this build; D8 and D9 carry the registries and resolver it will use. No D5, D8 or D9 Cockpit screens.
- [x] Stage entry hold time set on the live project (1800 seconds), with rollback and record (`docs/day1/evidence/stage-entry-hold-ttl-20261026.json`), so `enforce_required` can be turned on at the founder's activation decision.
