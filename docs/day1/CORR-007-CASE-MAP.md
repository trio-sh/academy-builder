# CORR-007 worked cases mapped to automated tests

*Superseded on 26 October 2026 by the recorded and signed results in `evidence/case-review/` and `CORR-007-CASE-REVIEW.md` (100 cases map by test title, 4 by hand). The table below is the first map (83 labelled, 21 by rule) and marks nothing PASS.*

| Case | Mapping | Test file | Test title |
|---|---|---|---|
| CR-01-T1 | labelled | cr01-sequential-unmasking.db.test.ts | T1: the Stage 2 mentor is refused and the refusal is logged |
| CR-01-T2 | labelled | cr01-sequential-unmasking.db.test.ts | T2: after the commit the Stage 2 mentor reads the responses, determinations and confirmation in full, read onl |
| CR-01-T3 | labelled | cr01-sequential-unmasking.db.test.ts | T3: Stage 2 determinations are append-only |
| CR-01-T4 | labelled | cr01-sequential-unmasking.db.test.ts | T4: another mentor, an administrator, the API and an export are each refused and logged, with the route named |
| CR-01-T5 | by rule | cr01-sequential-unmasking.db.test.ts | no test title names this case; confirm in the file |
| CR-02-T1 | labelled | cr02-mentor-rotation.db.test.ts | T1: the same mentor twice in a row at any Stage is refused |
| CR-02-T2 | labelled | cr02-mentor-rotation.db.test.ts | T2: mentor A then B is admitted |
| CR-02-T3 | labelled | cr02-mentor-rotation.db.test.ts | T3: Stage 2 with A, then B, then A, where A received Stage 1 after the first commit: the third attempt is refu |
| CR-02-T4 | labelled | cr02-mentor-rotation.db.test.ts | T4: at Stage 3, A then B then A is admitted when no stricter exclusion applies |
| CR-02-T5 | labelled | cr02-mentor-rotation.db.test.ts | T5: a Stage 1 confirmer is never proposed as the same participant's Stage 2 observer on the same dimension |
| CR-02-T6 | labelled | cr02-mentor-rotation.db.test.ts | T6: a Stage 4 repeat attempt with an earlier group composition is refused by the planner |
| CR-02-T7 | labelled | cr02-mentor-rotation.db.test.ts | T7: a Stage 4 attempt with no composition record is refused before entry |
| CR-03-T1 | labelled | cr03-welfare-stop.db.test.ts | T1: before and after observation begins, by the participant and by the mentor, at each Stage: no counted attem |
| CR-03-T2 | labelled | cr03-welfare-stop.db.test.ts | T2: a session stopped for a co-participant's welfare is an administration interruption for the observed partic |
| CR-03-T3 | labelled | cr03-welfare-stop.db.test.ts | T3: the safety route sets and lifts a hold: no commit, no progression decision, no cooldown |
| CR-04-T1 | labelled | cr04-cr05-entry-identity-progression-challenge.db.test.ts | T1: Stage 2 and Stage 4 entry with an authenticated account and no visual confirmation is admitted |
| CR-04-T2 | labelled | cr04-cr05-entry-identity-progression-challenge.db.test.ts | T2: a participant who cannot authenticate: entry refuses, no attempt is consumed, the rescheduling wait applie |
| CR-04-T3 | labelled | cr04-cr05-entry-identity-progression-challenge.db.test.ts | T3: the identity service is unavailable: entry refuses, a technical failure, no wait |
| CR-05-T1 | labelled | cr04-cr05-entry-identity-progression-challenge.db.test.ts | T1: Stage 2 and Stage 4 entry with an authenticated account and no visual confirmation is admitted |
| CR-05-T2 | labelled | cr04-cr05-entry-identity-progression-challenge.db.test.ts | T2: a participant who cannot authenticate: entry refuses, no attempt is consumed, the rescheduling wait applie |
| CR-06-T1 | labelled | cr06-cr10-cr27.db.test.ts | T1: an observation that no report contains is readable by its participant and the challenge route is available |
| CR-06-T2 | labelled | cr06-cr10-cr27.db.test.ts | T2: raising a correction renders the commitment word for word with 5 and 20; with the values unloaded nothing  |
| CR-07-T1 | labelled | cr07-disputed-clauses.db.test.ts | T1: the disputed clause is withdrawn from composition; the rest of the observation stands; nothing is added |
| CR-07-T2 | labelled | cr07-disputed-clauses.db.test.ts | T2: upheld: the observation is withdrawn, the attempt becomes an administration failure counting nothing, and  |
| CR-08-T1 | labelled | cr08-consent-revocation.db.test.ts | T1: ${a}: revocation first refuses and nothing counts; the act first goes through |
| CR-08-T2 | labelled | cr08-consent-revocation.db.test.ts | T2: a revocation and a commit with identical clock times: the sequence orders them, revocation first refuses |
| CR-09-T1 | labelled | cr09-release-routes.db.test.ts | T1: issuing a report and touching neither control lets nobody read it |
| CR-09-T2 | labelled | cr09-release-routes.db.test.ts | T2: with general availability on, an approved employer reads the full current report and the read is in the ac |
| CR-09-T3 | labelled | cr09-release-routes.db.test.ts | T3: an employer who is not approved, or whose approval is withdrawn, is refused |
| CR-09-T4 | labelled | cr09-release-routes.db.test.ts | T4: turning it off ends employer access at once |
| CR-09-T5 | labelled | cr09-release-routes.db.test.ts | T5: a named recipient with no account redeems with the named address; the face renders at the released version |
| CR-09-T6 | labelled | cr09-release-routes.db.test.ts | T6: a different address, or a second report, is refused |
| CR-09-T7 | labelled | cr09-release-routes.db.test.ts | T7: after revocation the redemption returns the revoked state and no content |
| CR-09-T8 | labelled | cr09-release-routes.db.test.ts | T8: after expiry the redemption returns the expired state and no content |
| CR-09-T9 | labelled | cr09-release-routes.db.test.ts | T9 + T16: an amended report shows the new version in the pool, notifies the participant, and returns the super |
| CR-09-T10 | labelled | cr09-release-routes.db.test.ts | T10: turning general availability off while a direct release is active leaves the direct release redeemable |
| CR-09-T11 | labelled | cr09-release-routes.db.test.ts | T11: revoking a direct release while general availability is on leaves the pool read intact, and the interface |
| CR-09-T12 | labelled | cr09-release-routes.db.test.ts | T12: neither route renders a contact element or confers contact permission |
| CR-09-T13 | labelled | cr09-release-routes.db.test.ts | T13: verifying by the verification identifier gives status only |
| CR-09-T14 | labelled | cr09-release-routes.db.test.ts | T14: the Available Reports surface has no search, sort or filter, and the API refuses the parameter |
| CR-09-T15 | labelled | cr09-release-routes.db.test.ts | T15: no output or function carries \"released to your organization\" |
| CR-09-T17 | labelled | cr09-release-routes.db.test.ts | T17: it will not turn on unless the current employer warning was shown, and the version is recorded |
| CR-09-T16 | by rule | cr09-release-routes.db.test.ts | no test title names this case; confirm in the file |
| CR-10-T1 | labelled | cr06-cr10-cr27.db.test.ts | T1: an observation that no report contains is readable by its participant and the challenge route is available |
| CR-11-T1 | by rule | cr11-checklist-two-lists.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T1 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T2 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T3 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T4 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T5 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T6 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T7 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T8 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T9 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T10 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-12-T11 | by rule | cr12-window.db.test.ts | no test title names this case; confirm in the file |
| CR-13-T1 | labelled | cr13-involvement-reconsideration.db.test.ts | T1: a person who observed one record of the report, through an earlier version, is refused as reviewer |
| CR-13-T2 | labelled | cr13-involvement-reconsideration.db.test.ts | T2: a person through a second account of the same canonical identity is refused |
| CR-13-T3 | labelled | cr13-involvement-reconsideration.db.test.ts | T3: one person as both reviewer and issuer is refused, also through a second account |
| CR-13-T4 | labelled | cr13-involvement-reconsideration.db.test.ts | T4: a decision with no independent check is not final and the case stays open |
| CR-13-T5 | labelled | cr13-involvement-reconsideration.db.test.ts | T5: observed through account X, X linked to the person later, the person proposed through account Y: refused |
| CR-14-T1 | labelled | cr14-design-review.db.test.ts | T1: a form met under another dimension, no review loaded: excluded |
| CR-14-T2 | labelled | cr14-design-review.db.test.ts | T2: an approved, unexpired review covering the form, source and participant lifts the exclusion |
| CR-14-T3 | labelled | cr14-design-review.db.test.ts | T3: a review never waives a source or pattern family the participant has already met |
| CR-14-T4 | labelled | cr14-design-review.db.test.ts | T4: a draft, a rejected, a withdrawn and an expired review lift nothing |
| CR-15-T1 | labelled | cr15-second-observer.db.test.ts | T1: two independent capture sets; neither is visible to the other before both lock |
| CR-15-T2 | labelled | cr15-second-observer.db.test.ts | T2: a second observer without the participant's consent is refused |
| CR-16-T1 | by rule | cr16-per-dimension-prohibited-vocabulary.db.test.ts | no test title names this case; confirm in the file |
| CR-17-T1 | labelled | cr17-retake-pools.db.test.ts | T1: a first attempt is served from first_attempt |
| CR-17-T2 | labelled | cr17-retake-pools.db.test.ts | T2: a second attempt is served from retake_1, from an unmet family |
| CR-17-T3 | labelled | cr17-retake-pools.db.test.ts | T3: a second attempt with retake_1 exhausted is served from retake_2 |
| CR-17-T4 | labelled | cr17-retake-pools.db.test.ts | T4: no source is both unmet and of an unmet family: an unmet source of a met family is served, not comparable |
| CR-17-T6 | labelled | cr17-retake-pools.db.test.ts | T6: an unmet source of an unmet family in a pool earlier than the matching one is served; the fallback is not  |
| CR-17-T7 | labelled | cr17-retake-pools.db.test.ts | T7: every approved source has been met: refused and logged; a met source is never served again |
| CR-17-T8 | labelled | cr17-retake-pools.db.test.ts | T8: a first attempt whose pool holds no unmet source borrows from the retake pools; the source's own pool is r |
| CR-17-T9 | labelled | cr17-retake-pools.db.test.ts | T9: a value outside the four pools refuses and nothing is loaded |
| CR-17-T5 | labelled | cr17-retake-pools.db.test.ts | T5: the selection log keeps only the selected source, the policy receipt and the seed |
| CR-18-T1 | labelled | cr18-cr19-progression-after-commit-mentor-context.db.test.ts | T1: a progression decision before commit is refused and logged; after the commit it is recorded |
| CR-18-T2 | labelled | cr18-cr19-progression-after-commit-mentor-context.db.test.ts | T2: a combined commit and progression request is refused before anything is written |
| CR-19-T1 | labelled | cr18-cr19-progression-after-commit-mentor-context.db.test.ts | T1: a progression decision before commit is refused and logged; after the commit it is recorded |
| CR-20-T1 | by rule | cr20-timing-and-capture-refusals.db.test.ts | no test title names this case; confirm in the file |
| CR-20-T2 | by rule | cr20-timing-and-capture-refusals.db.test.ts | no test title names this case; confirm in the file |
| CR-20-T3 | by rule | cr20-timing-and-capture-refusals.db.test.ts | no test title names this case; confirm in the file |
| CR-21-T1 | labelled | cr21-cr22-recovery-suspension-stage4-interruptions.db.test.ts | T1: a restart in the middle of commit: the same key gives the same answer, a new key after the commit is refus |
| CR-21-T2 | labelled | cr21-cr22-recovery-suspension-stage4-interruptions.db.test.ts | T2: every served instance, every observation and every report is listed; nothing is cancelled |
| CR-21-T3 | labelled | cr21-cr22-recovery-suspension-stage4-interruptions.db.test.ts | T3: withdrawing permission for one of two dimensions refuses that dimension's record; the other stands |
| CR-22-T1 | labelled | cr21-cr22-recovery-suspension-stage4-interruptions.db.test.ts | T1: a restart in the middle of commit: the same key gives the same answer, a new key after the commit is refus |
| CR-23-T1 | labelled | cr23-cr24-evidence-state.db.test.ts | T1: Stage 1 is one of three related contexts and no row declares the act types compatible: the frame is refuse |
| CR-24-T1 | labelled | cr23-cr24-evidence-state.db.test.ts | T1: Stage 1 is one of three related contexts and no row declares the act types compatible: the frame is refuse |
| CR-25-T1 | labelled | cr25-accessible-copy.db.test.ts | T1: an issued report has a tagged accessible equivalent with identical content |
| CR-26-T1 | labelled | cr26-eligibility-entry.db.test.ts | T1: creates exactly one Stage entry event and one reservation, and a repeat of the same request creates nothin |
| CR-26-T2 | labelled | cr26-eligibility-entry.db.test.ts | T2: whatever the reason, the answer is one answer: rehearsal exposure cannot be told from the other reasons |
| CR-27-T1 | labelled | cr06-cr10-cr27.db.test.ts | T1: an observation that no report contains is readable by its participant and the challenge route is available |
| CR-28-T1 | labelled | cr28-claim-package-selection.db.test.ts | T1: a dimension with a recurrence clause and three single observation clauses: the recurrence clause is select |
| CR-28-T2 | labelled | cr28-claim-package-selection.db.test.ts | T2: no recurrence clause and two composed statements: the earliest conduct bearing clause of the latest statem |
| CR-28-T3 | labelled | cr28-claim-package-selection.db.test.ts | T3: the participant's review before issue shows the entry selected for each dimension and every other entry; n |
| CR-28-T4 | by rule | cr28-claim-package-selection.db.test.ts | no test title names this case; confirm in the file |
| CR-29-T1 | labelled | cr29-commit-seal-key.db.test.ts | T1: a participant, a mentor or any signed-in role cannot read the signing key or make a seal |
| CR-29-T2 | labelled | cr29-commit-seal-key.db.test.ts | T2: rotate the key; a seal made before and one made after both verify, each under its own key version |
| CR-29-T3 | labelled | cr29-commit-seal-key.db.test.ts | T3: activation is refused while the shared Vault key is the current key, and allowed once a key pair version i |
| CR-30-T1 | labelled | cr30-stage4-permission.db.test.ts | T1: Stage 4 entry while s4_activation_state is not activated is refused with s4_not_activated, whatever the an |
| CR-30-T2 | labelled | cr30-stage4-permission.db.test.ts | T2: with Stage 4 activated, Yes records the Stage 4 grant with the text version and hash; No records nothing a |
| CR-31-T1 | by rule | cr31-switch-log.test.ts | no test title names this case; confirm in the file |
| CR-31-T2 | by rule | cr31-switch-log.test.ts | no test title names this case; confirm in the file |
