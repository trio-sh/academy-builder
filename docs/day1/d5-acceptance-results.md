# D5 acceptance results (Section 11)

Run against the throwaway database on 24 October 2026, under the Section 11 identifiers only. Evidence file: `evidence/d5-acceptance-run.json`. The run re-reads the labelled results of the D5 step files (it fails if a result is absent or failing) and runs the remaining checks itself. Every approval, clearance, consent and account in it is synthetic and exists on the throwaway database only.

**83 of 87 identifiers PASS, 0 FAIL, 4 NOT RUN.** The identifiers not run need the report renderer or a screen; each states why.

| Test | Result | How | Check |
|---|---|---|---|
| D5-01 | PASS | run | an unapproved D5 source is unreachable from the serving gate and from production composition |
|  | PASS | evidence | and from assignment of a Stage 3 source |
| D5-02 | PASS | evidence | a D5 source with a null situation class cannot be approved |
| D5-03 | PASS | evidence | Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent |
| D5-03a | PASS | evidence | Stage 1 instance still open: s1_instance_not_closed |
| D5-03b | PASS | evidence | confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent |
| D5-03c | PASS | evidence | Stage 1 observation uncommitted: s1_observation_not_committed |
| D5-03d | PASS | evidence | no progression, or a progression that blocks: s1_progression_absent_or_blocks |
| D5-04 | PASS | run | Q-D5-06 and Q-D5-06b are unavailable at Stage 1 and at Stage 3: an answer for any of the four is refused and no row is written |
|  | PASS | evidence | the registry's own applicability tables carry the route rule on every loaded source: NOT SERVED at Stages 1 and 3, the session itself at Stages 2 and 4 |
|  | PASS | evidence | and the other elements are served everywhere |
| D5-05 | PASS | run | Q-D5-02 A1 with Q-D5-02b nothing selected is refused: the parent asserts a designated question was asked and the child identifies none |
| D5-06 | PASS | run | Q-D5-07 A3 resolves to ST-D5-034 alone; the unserved child contributes no negative sentence |
| D5-07 | PASS | run | a bound item that is not on this source version's list is refused (identifiers repeat across D5 sources, so an item of another version is recognised by its absence from this one) |
| D5-08 | PASS | run | a bound item from a D1 source is refused |
| D5-09 | PASS | run | a served question unanswered with no missing state code is refused |
| D5-10 | PASS | run | not_applicable and not_yet_observed cannot be posted as missing states |
| D5-11 | PASS | run | a D1 input to a D5 computation is refused as a dimension isolation violation, and D1 observations never enter the D5 observation set |
| D5-12 | PASS | evidence | a D5 clause instance against a D1 clause instance is refused |
| D5-13 | PASS | evidence | FR-D5-2 with no approved cross-context row is refused; the side by side condition still shows |
| D5-14 | PASS | evidence | three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead |
| D5-15 | PASS | evidence | a material contradiction in the full set blocks the recurrence frame although three match |
| D5-16 | PASS | evidence | recurrence configuration unloaded: refused regardless of the data |
| D5-17 | PASS | evidence | a record status entry flagged as a blocker never satisfies the recurring state |
|  | PASS | evidence | a record status entry (ST-D5-003) composes and its clause instance is a recurrence blocker, never equivalent to another |
|  | PASS | evidence | no D5 entry carries the library flag recurrence_blocker (D5 5.7); the record status entries are blockers at the clause instance |
|  | PASS | evidence | three Stages, three related contexts, two observers, the same key and state, configuration locked: refused because the entry describes the record, not conduct |
| D5-18 | PASS | evidence | a D5 row below the floor (one context) cannot be issued: named blocker below_issuance_floor |
| D5-19 | PASS | run | one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer |
| D5-20 | PASS | evidence | the observer of the D1 record of a two-dimension report cannot be its evidence reviewer |
| D5-21 | PASS | evidence | the reviewer cannot be the issuer |
| D5-22 | PASS | evidence | no participant response to the pre-issue review notice: issuance blocks; no timeout |
| D5-23 | PASS | evidence | a correction against a D5 sentence blocks the report; the D5 record is in reconsideration and D1 is untouched |
| D5-24 | PASS | evidence | an in-place edit of a composed statement is refused; supersession only |
| D5-25 | PASS | run | a two-dimension specimen on one page fails and logs layout_overflow; the multi page form renders it without expanding or compressing the single page |
|  | PASS | run | a D1 and D5 report, even a specimen, has no route to the single page renderer (format_mismatch, logged); the multi page renderer takes it |
|  | PASS | evidence | a two dimension report (D1 and D5) renders through the multi page renderer as three pages in a real browser (cover, one dimension page, controls) |
|  | PASS | evidence | every page of the D5 only report is 612 by 792 points, no block passes the content box, nothing overflows (the page boundary) |
| CR-10 | PASS | run | a report that is not a specimen routed to the single page renderer is refused format_mismatch |
| D5-26 | PASS | run | no overall, composite, average or profile element: such an element fails the scan, and none of the 46 statements carries one |
|  | PASS | evidence | no overall, composite, average, profile or score element appears on any page of the rendered D5 only report |
| D5-27 | PASS | evidence | no Section 3.2 closed-list evaluative word in rendered D5 output |
|  | PASS | evidence | every Section 3.2 outcome verb (resolved, settled, conceded, persuaded, reconciled, repaired, built rapport, brought round) fails the scan |
|  | PASS | evidence | the trait, modal and prediction words (collaborative, difficult, rigid, flexible, team player, will, would, always, never, likely) fail the scan |
|  | PASS | evidence | the manner words (calmly, politely, warmly, defensively) fail the scan |
|  | PASS | evidence | every D5 Recorded Conduct Entry and template passes the scan |
|  | PASS | evidence | no word of the Section 5.7a list appears in the rendered D5 block of the browser render |
|  | PASS | evidence | a word that belongs to D2 or D3 (owned, caused, blamed, prioritized, verified) fails as cross_dimension_assertion |
| D5-28 | PASS | run | no named third party in any D5 statement or template (outputs name controlled roles, never people) |
|  | PASS | evidence | none of the 46 loaded entries names a counterpart term as the subject of a verb |
| D5-29 | PASS | evidence | a D5 mentor cannot be authorized from a D1 calibration record |
| D5-30 | PASS | evidence | a participant who met the same D5 interaction pattern family is excluded |
| D5-30a | PASS | evidence | the Stage 2 seven-beat form met under D1 excludes the D5 Stage 2 form without any mapping |
| D5-30b | PASS | evidence | a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent |
| D5-31 | PASS | evidence | D5 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited |
| D5-32 | PASS | evidence | issuing a report that holds a D5 record on D1 consent alone: refused and logged consent_not_inherited |
| D5-33 | PASS | evidence | pool availability needs employer_share for every dimension in the report |
| D5-34 | PASS | evidence | an unloaded evidence currency value blocks issuance (checklist item 13) |
| D5-35 | PASS | run | the correction commitment text does not render while the response time is unloaded: the route returns nothing to render and no default value appears; loaded, it returns the value as loaded (rolled back) |
|  | NOT RUN | surface | the participant correction screen (candidate/ReportReview.tsx) shows no commitment text and no default number while the response time is unloaded — browser against the application on a Supabase project; not run here. Closest real evidence: the route t3a_correction_commitment returns nothing to render while the value is unloaded and the screen reads only that route (D5-35 route entry above, PASS) |
| D5-36 | PASS | evidence | each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults |
| D5-37 | PASS | evidence | a report with the permitted-use text unloaded: the render refuses and the block is never omitted |
| D5-38 | PASS | evidence | a Stage 3 artifact with no tooling declaration is refused and logged |
| D5-39 | PASS | run | the Mentor Cockpit below 1280 by 800 refuses capture (the route returns the refusal and the screen renders it in place of the six regions; it does not reflow); 1280 by 800 permits; a phone refuses |
|  | NOT RUN | surface | the Mentor Cockpit at 1279 by 800, 1280 by 799 and 1280 by 800 in a browser: capture refuses below the minimum in place of the regions and does not reflow — browser against the application on a Supabase project; not run here. Closest real evidence: the route t3a_d1_s2_capture_permitted refuses 1279 by 800, 1280 by 799 and a phone and permits 1280 by 800 (D5-39 route entry above, PASS), and the repository test src/test/d1-surface-contracts.test.ts asserts the cockpit calls that route and carries no viewport number of its own |
| D5-40 | PASS | evidence | an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded |
| D5-41 | PASS | evidence | Stage 4 entry with no group participation record is refused |
| D5-42 | PASS | evidence | capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route |
| D5-43 | PASS | run | no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan |
| D5-44 | PASS | evidence | a source with either drafting-test row empty cannot be approved: drafting_test_incomplete |
| D5-45 | PASS | evidence | a drafting-test reviewer equal to the source author is refused |
| D5-46 | PASS | evidence | a Stage 3 source with no rights record is refused at submission, rights_route_absent |
| D5-47 | PASS | evidence | Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result |
| D5-48 | PASS | run | no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned) |
| D5-48a | PASS | evidence | a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route |
| D5-49 | PASS | evidence | Q-D5-04b and Q-D5-05b selecting the same option both compose as separate determinations; neither is suppressed as a duplicate |
|  | PASS | evidence | a change stated without a proposal composes (Q-D5-04 A3 with Q-D5-05 A1 is permitted) |
| D5-50 | PASS | evidence | a resolution table with one row naming a question absent from the question objects is refused whole and logged; the loader does not skip the row |
| D5-58 | PASS | evidence | a source whose served question has an empty definition cannot enter the production approval path: question_definition_incomplete |
| D5-59 | PASS | evidence | a calibration run on a question with an empty definition does not open: question_definition_incomplete |
| D5-60 | PASS | evidence | the demonstration fixtures and the full acceptance suite run with every question definition empty: the refusal sits on production approval and calibration only |
| D5-61 | PASS | run | a Stage 1 pattern composes with the stage_1_only limitation |
|  | PASS | evidence | a Stage 1 statement carrying a route use entry refuses and logs stage_form_violation |
|  | PASS | evidence | a Stage 3 statement carrying a route use entry refuses and logs stage_form_violation |
|  | PASS | evidence | a Stage 3 record status route entry (ST-D5-029) is a route entry too and refuses |
|  | PASS | evidence | the route entries compose at Stage 2 |
|  | PASS | evidence | the Stage form check bars Q-D5-06 and Q-D5-06b at Stage 1 and Stage 3 only |
|  | PASS | evidence | a performed act verb at Stage 1 refuses and logs stage_form_violation |
| D5-51 | PASS | evidence | the evidence currency statement appears visibly in a rendered report (the multi page report shows it on the controls page, in the availability and status block, with the absolute date) |
| D5-52 | PASS | evidence | any contact initiation from an employer surface is refused and logged contact_permission_absent |
|  | NOT RUN | surface | no contact element renders on any employer surface — browser against the application; not run here. Closest real evidence: the route refuses a contact initiation attempt and logs contact_permission_absent, and the contact permission object is a closed socket with no value (D5-52 entries above, PASS). The employer screens were not scanned for a contact element: EmployerDashboard.tsx carries the employer's own contact details and employerDesk.ts a contactAvailable flag, so a text scan would not decide it |
| D5-53 | PASS | run | every loaded source carries the clearance status from its own sheet (28 of the 33 load; the other five were refused at load by D5-69), and none serves while the clearance is pending |
| D5-54 | PASS | run | a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders |
| D5-55 | PASS | evidence | a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed |
| D5-56 | PASS | evidence | a Stage 2 or Stage 4 beat determination on a source with no loaded mentor_action_sequence is refused: beat_sequence_absent |
|  | PASS | evidence | Q-D5-09 is served exactly where the source carries an exchange test point |
| D5-57 | PASS | evidence | b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2 |
| D5-62 | PASS | evidence | the specimen face renders in full with the specimen footer on every page and no issued claim (the persistence refusal for a demonstration is tested at D5-PP-09) |
| D5-63 | PASS | run | no flag, override or test mode lifts an approval, calibration or activation refusal: every test mode parameter is service route only (checked in the routine, in the routine it delegates to, or by the grant), and no bypass routine exists |
| D5-64 | PASS | evidence | every Section 3.2 outcome verb fails the scan at every Stage (the scan carries no Stage) |
|  | PASS | evidence | a sentence whose subject is a counterpart role label fails as counterpart_as_subject (the spec examples: the colleague declined, the other team refused, the manager would not move) |
|  | PASS | evidence | the rendered output scan logs counterpart_as_subject |
|  | PASS | evidence | no rendered D5 sentence of the browser render has a counterpart role label as the subject of a verb |
|  | PASS | run | every Section 3.2 manner word fails the scan, and none of the 46 D5 statements or 13 templates carries a prohibited word or a counterpart subject |
| D5-65 | PASS | evidence | an altered committed observation with a recomputed hash is refused: commit_seal_invalid (the seal is a server side signature) |
|  | PASS | evidence | submitting the altered record again refuses and logs commit_seal_invalid |
|  | PASS | evidence | under any other key the seal reads as invalid (commit_seal_invalid) |
|  | PASS | evidence | the seal key is never in the database: an unloaded key refuses |
|  | PASS | evidence | an unsealed or differently keyed statement blocks issuance (commit_seal_absent, commit_seal_invalid) |
|  | PASS | evidence | reference: the joint trial refuses a record altered after commit with its hash recomputed, and a ledger entry that fails its commit seal (ADM-07; V25 and V26), eleven of eleven attacks refused |
| D5-66 | PASS | evidence | a second observation record under an identifier already committed is refused; the first record stands |
|  | PASS | evidence | the production commit path checks the seal register for the identifier before it writes (observation_id_not_unique) |
|  | PASS | evidence | reference: the joint trial refuses a second record under a committed observation key (ADM-12; V27) and its store refuses the duplicate key at write |
| D5-67 | PASS | evidence | a single page route for a D5 report refuses format_mismatch and logs it |
|  | PASS | evidence | a D5 only report, even a specimen, has no route to the single page renderer; the multi page only rule is data |
|  | PASS | evidence | a D5 only report renders as three pages through the multi page renderer in a real browser |
|  | PASS | evidence | reference: the same event test renders the D5 only report as three pages and the one dimension specimen is a three page file |
| D5-68 | PASS | evidence | no readable D5 source body (the registry as an authenticated caller reads it) carries either counterpart field |
|  | PASS | evidence | the two fields sit in a sequestered table that only the source registry function reads; anon and authenticated cannot |
|  | PASS | evidence | the Mentor Cockpit reference card renders for every loaded D5 source and carries neither field, name or value; it has the six sections and no expected response |
|  | PASS | evidence | the reference card has the six sections of instruction 039 and no preference key |
|  | PASS | evidence | no database routine names either field |
|  | PASS | evidence | no screen, report builder, export or API handler in the application source names either field |
|  | PASS | evidence | the multi page report fixture and its manifest carry neither field |
|  | PASS | evidence | neither counterpart field nor a counterpart label appears on any page of the rendered D5 only report |
|  | NOT RUN | surface | the Mentor Cockpit reference card and capture surface in D5 mode, opened in a browser for a D5 source — the cockpit and reference card screens of this repository are D1 only (src/pages/dashboard/mentor/ReferenceCard.tsx reads t3a_d1_reference_card); D5 mode is not built, as D2 to D4 mode is not built (the surface step). Closest real evidence: the D5 reference card is built as the routine t3a_d5_reference_card with the six sections and no counterpart field, and every loaded D5 source body, the card for every loaded source, the report fixture, the rendered D5 only report and the application source were searched for both fields (D5-68 entries above, PASS) |
| D5-69 | PASS | evidence | a bound family item with the counterpart as its subject refuses the source at load and logs counterpart_as_subject (all six families) |
|  | PASS | evidence | the subject forms are refused and the counterpart as an object or a possessor is not |
|  | PASS | evidence | the counterpart as the object of the participant's act, or as a possessor, is not refused |
|  | PASS | evidence | the rule is per source and per dimension |
|  | PASS | evidence | of the 33 D5 sources of the package, 28 load and five are refused at load, each for one named item |
|  | PASS | evidence | an entry whose subject is a counterpart role label is refused at load and logged |
| D5-cov | PASS | evidence | 11.3 the coverage test, run first: every reachable answer pattern resolves to statements or a designed refusal, none to two statements and none to nothing |
| D5-PP-01 | PASS | evidence | two D5 observations with an approved row, agreeing: the multiple context frame is available |
| D5-PP-02 | PASS | evidence | two D5 observations, approved row, diverging: held side by side with the divergence condition, neither preferred |
| D5-PP-03 | PASS | evidence | three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause |
| D5-PP-04 | PASS | evidence | Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits |
| D5-PP-05 | PASS | run | Stage 2 with the seven beats: the timing record is complete (seven beats, the pause read from the beat marked as the decision point) and the determinations commit; no D5 question is a timing determination, so none is gated by it |
| D5-PP-06 | PASS | run | a D5 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written) |
| D5-PP-07 | PASS | evidence | a successful correction: a new composed statement supersedes, the original is retained |
| D5-PP-08 | PASS | run | availability granted on a report carrying D5 (employer_share for both dimensions), the pool entry holds no dimension, stage or conduct field, the participant withdraws, the entry leaves the pool, and the evidence record is untouched |
| D5-PP-09 | PASS | run | the four demonstration fixtures are seeded as written (Q-D5-06 and Q-D5-06b not served at Stage 1; Q-D5-06, Q-D5-06b and Q-D5-09 not served at Stage 3; every question served at Stages 2 and 4); the eligibility check is reachable on a demonstration report and no issued report is created |
| D5-PP-10 | PASS | evidence | one participant with D1 and D5 observations: each dimension's state is unchanged by the other's records |

## Reading this honestly

- PASS means the stated behavior was observed on the throwaway database. It is not a statement about production data: production holds no approved source, no authorized mentor, no clearance and no consent for this dimension, so no observation can occur there. That is the designed first state.
- Entries marked `evidence` are results of the earlier step files, re-read here; entries marked `run` were run by the acceptance file itself.
- Test identifiers inside the earlier step evidence files are build instruction numbers, not these identifiers (CR-119).

## Notes on the D5 run

- 28 of the 33 D5 sources load. Five (SRC-D5-S2-009, S3-001, S3-007, S4-004, S4-010) are refused at load by the counterpart rule of Section 5.2 because one bound family item has the counterpart role label as the subject of a verb (conflict register CR-232). The counts of D5-53, D5-55 and D5-69 are therefore for 28 sources; the five are named and logged, not skipped.
- Four identifiers end NOT RUN, each only in its screen clause: D5-35 (participant correction screen), D5-39 (Mentor Cockpit at 1280 by 800 in a browser), D5-52 (no contact element on any employer screen) and D5-68 (the Mentor Cockpit in D5 mode, which this repository does not have; its screens are D1 only, as for D2 to D4). The route behind each is tested and passes; the entries say which evidence is the closest real one.
- D5-62, D5-67, D5-51, D5-37, D5-25 and part of D5-26, D5-27, D5-64 and D5-68 read a real browser render of the repository's frozen multi page specimen reduced to its D5 claim package (docs/day1/evidence/d5-ber-multipage-render-check.json). That fixture holds a generic illustrative D5 entry, not the D5 library, so it proves the page layout, the three page count and the refusals, not D5 wording; the D5 wording is scanned in the database (D5-27, D5-64).
- D5-65 and D5-66 also read the package's own reference checks (docs/day1/evidence/d5-package-checks.json, check 3.1.5: the eleven admission attacks, including the record altered after commit with its hash recomputed and the second record under a committed key). Check 3.1.11 (byte identity of the shared folders against the D2 to D4 folders) could not be run here; see CR-240.
- D5-17 is held two ways at once: no library entry carries recurrence_blocker (Section 5.7) and no record status entry counts toward recurrence (D5-17); see CR-235 for the reading.
