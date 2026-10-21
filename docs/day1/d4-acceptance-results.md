# D4 acceptance results (Section 11)

Run against the throwaway database on 20 October 2026, under the Section 11 identifiers only. Evidence file: `evidence/d4-acceptance-run.json`. The run re-reads the labelled results of the D4 step files (it fails if a result is absent or failing) and runs the remaining checks itself. Every approval, clearance, consent and account in it is synthetic and exists on the throwaway database only.

**84 of 84 identifiers PASS, 0 FAIL, 0 NOT RUN.**

| Test | Result | How | Check |
|---|---|---|---|
| D4-01 | PASS | run | an unapproved D4 source is unreachable from the serving gate and from production composition |
|  | PASS | evidence | and from assignment of a Stage 3 source |
| D4-02 | PASS | evidence | a D4 source with a null situation class cannot be approved |
| D4-03 | PASS | evidence | Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent |
| D4-03a | PASS | evidence | Stage 1 instance still open: s1_instance_not_closed |
| D4-03b | PASS | evidence | confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent |
| D4-03c | PASS | evidence | Stage 1 observation uncommitted: s1_observation_not_committed |
| D4-03d | PASS | evidence | no progression, or a progression that blocks: s1_progression_absent_or_blocks |
| D4-04 | PASS | run | Q-D4-07 and Q-D4-07b are unavailable at Stage 1: an answer for either is refused and no row is written |
| D4-05 | PASS | run | Q-D4-02 A1 with Q-D4-02b nothing selected is refused: the parent asserts designated items were contained and the child identifies none |
| D4-06 | PASS | run | Q-D4-07 A3 resolves to ST-D4-036 alone; the unserved child contributes no negative sentence |
| D4-07 | PASS | run | a bound item from another source version is refused |
| D4-08 | PASS | run | a bound item from a D1 source is refused |
| D4-09 | PASS | run | a served question unanswered with no missing state code is refused |
| D4-10 | PASS | run | not_applicable and not_yet_observed cannot be posted as missing states |
| D4-11 | PASS | run | a D1 input to a D4 computation is refused as a dimension isolation violation, and D1 observations never enter the D4 observation set |
| D4-12 | PASS | evidence | a D4 clause instance against a D1 clause instance is refused |
| D4-13 | PASS | evidence | FR-D4-2 with no approved cross-context row is refused; the side by side condition still shows |
| D4-14 | PASS | evidence | three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead |
| D4-15 | PASS | evidence | a material contradiction in the full set blocks the recurrence frame although three match |
| D4-16 | PASS | evidence | recurrence configuration unloaded: refused regardless of the data |
| D4-17 | PASS | evidence | a recurrence blocker never counts toward the recurring state |
|  | PASS | evidence | ST-D4-015 is a recurrence blocker and is never equivalent |
|  | PASS | evidence | ST-D4-010 and ST-D4-015 are the two recurrence blockers |
| D4-18 | PASS | evidence | a D4 row below the floor (one context) cannot be issued: named blocker below_issuance_floor |
| D4-19 | PASS | run | one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer |
| D4-20 | PASS | evidence | the observer of the D1 record of a two-dimension report cannot be its evidence reviewer |
| D4-21 | PASS | evidence | the reviewer cannot be the issuer |
| D4-22 | PASS | evidence | no participant response to the pre-issue review notice: issuance blocks; no timeout |
| D4-23 | PASS | evidence | a correction against a D4 sentence blocks the report; the D4 record is in reconsideration and D1 is untouched |
| D4-24 | PASS | evidence | an in-place edit of a composed statement is refused; supersession only |
| D4-25 | PASS | run | a two-dimension report on one page fails and logs layout_overflow; the multi page form renders it without expanding or compressing the single page |
| D4-26 | PASS | run | no overall, composite, average or profile element: such an element fails the scan, and none of the 68 statements carries one |
| D4-27 | PASS | evidence | no Section 3.2 comparative or evaluative word, and no word that belongs to another dimension, in rendered D4 output |
|  | PASS | evidence | a word that belongs to D2 or D4 fails as cross_dimension_assertion |
| D4-28 | PASS | run | no named third party in any D4 statement or template (outputs name controlled roles, never people) |
| D4-29 | PASS | evidence | a D4 mentor cannot be authorized from a D1 calibration record |
| D4-30 | PASS | evidence | a participant who met the same D4 interaction pattern family is excluded |
| D4-30a | PASS | evidence | the Stage 2 seven-beat form met under D1 excludes the D4 Stage 2 form without any mapping |
| D4-30b | PASS | evidence | a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent |
| D4-31 | PASS | evidence | D4 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited |
| D4-32 | PASS | evidence | issuing a report that holds a D4 record on D1 consent alone: refused and logged consent_not_inherited |
| D4-33 | PASS | evidence | pool availability needs employer_share for every dimension in the report |
| D4-34 | PASS | evidence | an unloaded evidence currency value blocks issuance (checklist item 13) |
| D4-35 | PASS | run | the correction commitment text does not render while the response time is unloaded: the route returns nothing to render and no default value appears; loaded, it returns the value as loaded (rolled back) |
| D4-36 | PASS | evidence | each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults |
| D4-37 | PASS | evidence | a report with the permitted-use text unloaded: the render refuses and the block is never omitted |
| D4-38 | PASS | evidence | a Stage 3 artifact with no tooling declaration is refused and logged |
| D4-39 | PASS | run | the Mentor Cockpit below 1280 by 800 refuses capture (the route returns the refusal and the screen renders it in place of the six regions; it does not reflow); 1280 by 800 permits; a phone refuses |
| D4-40 | PASS | evidence | an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded |
| D4-41 | PASS | evidence | Stage 4 entry with no group participation record is refused |
| D4-42 | PASS | evidence | capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route |
| D4-43 | PASS | run | no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan |
| D4-44 | PASS | evidence | a source with either drafting-test row empty cannot be approved: drafting_test_incomplete |
| D4-45 | PASS | evidence | a drafting-test reviewer equal to the source author is refused |
| D4-46 | PASS | evidence | a Stage 3 source with no rights record is refused at submission, rights_route_absent |
| D4-47 | PASS | evidence | Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result |
| D4-48 | PASS | run | no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned) |
| D4-48a | PASS | evidence | a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route |
| D4-49 | PASS | evidence | Q-D4-02b and Q-D4-03b selecting the same item both compose as separate determinations; neither is suppressed as a duplicate |
| D4-50 | PASS | evidence | a resolution table with one row naming a question absent from the question objects is refused whole and logged; the loader does not skip the row |
| D4-58 | PASS | evidence | a source whose served question has an empty definition cannot enter the production approval path: question_definition_incomplete |
| D4-59 | PASS | evidence | a calibration run on a question with an empty definition does not open: question_definition_incomplete |
| D4-60 | PASS | evidence | the demonstration fixtures and the full acceptance suite run with every question definition empty: the refusal sits on production approval and calibration only |
| D4-61 | PASS | run | a Stage 1 pattern composes with the stage_1_only limitation |
|  | PASS | run | a Stage 1 statement carrying a channel use entry refuses and logs stage_form_violation |
|  | PASS | evidence | a performed act verb at Stage 1 refuses and logs stage_form_violation |
| D4-51 | PASS | evidence | the evidence currency statement appears visibly in a rendered report (the multi page report shows it on the controls page, with the evidence currency date) |
| D4-52 | PASS | evidence | any contact initiation from an employer surface is refused and logged contact_permission_absent |
| D4-53 | PASS | run | every loaded source carries the clearance status from its own sheet, and none serves while the clearance is pending |
| D4-54 | PASS | run | a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders |
| D4-55 | PASS | evidence | a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed |
| D4-56 | PASS | evidence | a CE-D4-04 timing determination with no loaded mentor_action_sequence is refused: beat_sequence_absent |
| D4-57 | PASS | evidence | b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2 |
| D4-62 | PASS | evidence | the specimen face renders in full with the specimen watermark on every page (the persistence refusal for a demonstration is tested at D4-PP-09 and D4-62 in the database run) |
| D4-63 | PASS | run | no flag, override or test mode lifts an approval, calibration or activation refusal: every test mode parameter is service route only (checked in the routine, in the routine it delegates to, or by the grant), and no bypass routine exists |
| D4-64 | PASS | run | every Section 3.2 manner word fails the scan, and none of the D4 statements or templates carries one |
| D4-65 | PASS | evidence | an altered committed observation with a recomputed hash is refused: commit_seal_invalid (the seal is a server side signature) |
|  | PASS | evidence | the seal key is never in the database: an unloaded key refuses |
| D4-66 | PASS | evidence | a second observation record under an identifier already committed is refused; the first record stands |
| D4-67 | PASS | evidence | a single page route for a D4 report refuses format_mismatch and logs it |
|  | PASS | evidence | a D4 only report renders as three pages through the multi page renderer |
| D4-PP-01 | PASS | evidence | two D4 observations with an approved row, agreeing: the multiple context frame is available |
| D4-PP-02 | PASS | evidence | two D4 observations, approved row, diverging: held side by side with the divergence condition, neither preferred |
| D4-PP-03 | PASS | evidence | three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause |
| D4-PP-04 | PASS | evidence | Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits |
| D4-PP-05 | PASS | run | Stage 2 with the seven beats: a complete timing record permits the timing determination and the determinations commit |
| D4-PP-06 | PASS | run | a D4 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written) |
| D4-PP-07 | PASS | evidence | a successful correction: a new composed statement supersedes, the original is retained |
| D4-PP-08 | PASS | run | availability granted on a report carrying D4 (employer_share for both dimensions), the pool entry holds no dimension, stage or conduct field, the participant withdraws, the entry leaves the pool, and the evidence record is untouched |
| D4-PP-09 | PASS | run | the four demonstration fixtures are seeded as written (Q-D4-06, Q-D4-07 and Q-D4-07b not served at Stage 1; Q-D4-06 and Q-D4-09 not served at Stage 3); the eligibility check is reachable on a demonstration report and no issued report is created |
| D4-PP-10 | PASS | evidence | one participant with D1 and D4 observations: each dimension's state is unchanged by the other's records |

## Reading this honestly

- PASS means the stated behavior was observed on the throwaway database. It is not a statement about production data: production holds no approved source, no authorized mentor, no clearance and no consent for this dimension, so no observation can occur there. That is the designed first state.
- Entries marked `evidence` are results of the earlier step files, re-read here; entries marked `run` were run by the acceptance file itself.
- Test identifiers inside the earlier step evidence files are build instruction numbers, not these identifiers (CR-119).
