# CORR-007 Rev 1.6 leveler: build status

Source: the folder `T3A-Leveler-CORR-007-Rev1_6-21Oct2026` (Drive, file 12), downloaded 22 October 2026. Build instruction: `T3A-LEVELER-BUILD-001` (31 rules, 104 worked cases, one test `check_build_complete.py`). Everything is built and tested on the throwaway database; nothing further goes to the live Supabase project until Hans confirms (CR-177).

Status words: **loaded** = built and tested here; **not assessed** = I have not yet compared the rule with what already exists, so I make no claim.

| Rule | Subject | Status |
|---|---|---|
| CR-06 | Correction commitment (REC-03, paragraph 2.21) | Loaded and rendered from configuration; refuses to render when a value is unloaded. Participant surface tested only by the contract test |
| CR-27 | T-EVNOTE-001 version 2 | Loaded (CR-180) |
| CR-30 | Stage 4 permission | Screen component and notice loaded; not yet routed (no participant-side session list exists); joining with the consent record open (CR-180) |
| CR-31 | Five enforcement switches | Authorised by Tony, not yet started |
| CR-10 | Multi page renderer only | Built earlier (D-07, `berMultipage`) |
| CR-28 | One claim package per dimension | Reader function built earlier; rule version config, participant review of the chosen entry and issue record still to build |
| CR-29 | Commit seal key | Vault key in place (sandbox arrangement); key-pair signature still to build |
| Consent notice 1.2 Section 2 | Word for word, hash on every consent | Loaded (CR-181). Notice Section 4 rules 4.1 to 4.8 not assessed |
| CR-20 | Stage 2 and 4 timing and capture refusals | Codes BEAT_SCRIPT_NOT_LOADED, BEAT_TIMESTAMP_MISSING, REFERENCE_BEAT_NOT_STATED_AS_BEAT exist in migrations; FC-02 and FC-06 refusals and the recording attestation not yet checked against the rule |
| CR-12 | Attempts and cooldowns | Built and tested on the throwaway database (migrations 20270102, 20270103, 20270104): trailing six month window with stored commit and expiry, 7/14/21 day and rescheduling waits, rule values immutable, one active attempt (enforced at write), idempotency keys, callbacks counted once, refusals with no active attempt, fail-closed unclassified endings, reclassification that keeps the number. 48 new checks, all passing; all other tests unchanged. Not yet applied to the live project: the live stage entry creates attempts that never end, so see CR-185 |
| CR-11, CR-16, CR-23, CR-24 | Checklist lists; per-dimension prohibited vocabulary; Stage 1 toward recurrence; second evidence state | Related machinery exists (checklist, prohibited vocabulary, evidence state, cross context map); each still has to be compared with the rule |
| CR-17 | Retake pools | Not found: none of RETAKE_POOL_MISSING_OR_INVALID, RETAKE_SOURCE_UNAVAILABLE, FIRST_ATTEMPT_SOURCE_UNAVAILABLE, family_exposure_fallback, first_attempt_pool_exhausted exist |
| CR-09 | Two release routes | Not found: no general availability, direct release or warning-shown record |
| CR-01, CR-02, CR-03, CR-13, CR-14, CR-15, CR-25 | Sequential unmasking, mentor rotation, welfare stop flag, involvement graph and reconsideration, form reuse review, second observer, accessible tagged copy | Not found by their identifiers |
| CR-04, CR-05, CR-07, CR-08, CR-18, CR-19, CR-21, CR-22, CR-26 | Identity at entry, progression challenge, disputed clauses, consent revocation race, progression after commit, mentor context, recovery, Stage 4 interruptions, eligibility | Not yet compared; behaviour may exist under other names |

These findings come from searching the migrations, source and tools for each rule's own identifiers (22 October). A name not found means "not found by that name", not proof of absence; each rule still needs a comparison against the Appendix A text and its worked cases before it is called built or missing.
| D1 v2.0 rebuild, D5, D8, D9 builds, retake pool maps, D4 v2.2 archive package | Packages | Not started; staging needs the six base packages (`verify_baselines.py`) |
| Specification check (the packages themselves) | Passes on all seven staged dimensions (CR-183) |
| Reviewer signature, 104 cases, `check_build_complete.py` | Acceptance | Not started; needs a reviewer other than Hans |
