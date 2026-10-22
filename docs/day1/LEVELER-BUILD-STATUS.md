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
| CR-01 to CR-05, CR-07 to CR-09, CR-11 to CR-26 | Platform rules | Not assessed |
| D1 v2.0 rebuild, D5, D8, D9 builds, retake pool maps, D4 v2.2 archive package | Packages | Not started; staging needs the six base packages (`verify_baselines.py`) |
| Specification check (the packages themselves) | Passes on all seven staged dimensions (CR-183) |
| Reviewer signature, 104 cases, `check_build_complete.py` | Acceptance | Not started; needs a reviewer other than Hans |
