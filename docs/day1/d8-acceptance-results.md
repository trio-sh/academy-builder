# D8 acceptance results (Section 11)

Run against the throwaway database on 24 October 2026, under the Section 11 identifiers only. Evidence file: `evidence/d8-acceptance-run.json`. The run re-reads the labelled results of the D8 step files (it fails if a result is absent or failing) and runs the remaining checks itself. Every approval, clearance, consent and account in it is synthetic and exists on the throwaway database only.

**86 of 87 identifiers PASS, 1 FAIL, 0 NOT RUN.**

| Test | Result | How | Check |
|---|---|---|---|
| D8-01 | PASS | run | an unapproved D8 source is unreachable from the serving gate and from production composition |
|  | PASS | evidence | and from assignment of a Stage 3 source |
| D8-02 | PASS | evidence | a D8 source with a null situation class cannot be approved |
| D8-03 | PASS | evidence | Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent |
| D8-03a | PASS | evidence | Stage 1 instance still open: s1_instance_not_closed |
| D8-03b | PASS | evidence | confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent |
| D8-03c | PASS | evidence | Stage 1 observation uncommitted: s1_observation_not_committed |
| D8-03d | PASS | evidence | no progression, or a progression that blocks: s1_progression_absent_or_blocks |
| D8-04 | PASS | run | Q-D8-09 at Stage 3 is unavailable: an answer for it is refused (answer_for_question_not_served) and no row is written |
|  | PASS | evidence | Q-D8-07 and Q-D8-07b on a source whose recurrence_measures is empty are unavailable, and no row is written |
| D8-05 | PASS | run | Q-D8-02 A1 with Q-D8-02b nothing selected is refused: the parent asserts a designated fact was named and the child identifies none |
| D8-06 | PASS | run | Q-D8-07 A3 resolves to ST-D8-034 alone; the unserved child contributes no negative sentence |
| D8-07 | PASS | run | a bound item from another source version is refused |
| D8-08 | PASS | run | a bound item from a D1 source is refused |
| D8-09 | PASS | run | a served question unanswered with no missing state code is refused |
| D8-10 | PASS | run | not_applicable and not_yet_observed cannot be posted as missing states |
| D8-11 | PASS | run | a D1 input to a D8 computation is refused as a dimension isolation violation, and D1 observations never enter the D8 observation set |
|  | PASS | evidence | and the evidence state of D8 is computed from D8 records only |
| D8-12 | PASS | evidence | a D8 clause instance against a D1 clause instance is refused (a D3 and a D4 instance likewise) |
| D8-13 | PASS | evidence | FR-D8-2 with no approved cross-context row is refused; the side by side condition still shows |
| D8-14 | PASS | evidence | three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead |
| D8-15 | PASS | evidence | a material contradiction in the full set blocks the recurrence frame although three match |
| D8-16 | PASS | evidence | recurrence configuration unloaded: refused regardless of the data |
| D8-17 | PASS | evidence | a record status entry such as ST-D8-003 never counts toward the recurring state |
|  | PASS | evidence | ST-D8-003 composed by the real route carries the marker and is never equivalent |
|  | PASS | evidence | no D8 entry carries recurrence_blocker (the refusal is the record_status_never_recurs rule) |
| D8-18 | PASS | evidence | a D8 row below the floor (one context) cannot be issued: named blocker below_issuance_floor |
| D8-19 | PASS | run | one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer |
| D8-20 | PASS | evidence | the observer of the D1 record of a two-dimension report cannot be its evidence reviewer |
| D8-21 | PASS | evidence | the reviewer cannot be the issuer |
| D8-22 | PASS | evidence | no participant response to the pre-issue review notice: issuance blocks; no timeout |
| D8-23 | PASS | evidence | a correction against a D8 sentence blocks the report; the D8 record is in reconsideration and D1 is untouched |
| D8-24 | PASS | evidence | an in-place edit of a composed statement is refused; supersession only |
| D8-25 | PASS | run | a two-dimension specimen on one page fails and logs layout_overflow; the multi page form renders it without expanding or compressing the single page |
|  | PASS | run | a two-dimension report that carries D8 renders through the multi page renderer; the single page route is closed to it (format_mismatch), even for a specimen (Directive D-07) |
|  | PASS | run | (CR-10) a report that is not a specimen routed to the single page renderer is refused format_mismatch |
| D8-26 | PASS | run | no overall, composite, average or profile element: such an element fails the scan, and none of the 44 statements carries one |
| D8-27 | PASS | evidence | no Section 3.2 comparative or evaluative word, and no word that belongs to another dimension, in rendered D8 output |
|  | PASS | evidence | a word that belongs to another dimension fails as cross_dimension_assertion |
|  | PASS | evidence | the arc words (recovered and the rest of the list at Section 5.7a) fail the scan |
| D8-28 | PASS | run | no named third party in any D8 statement or template (outputs name controlled roles, never people) |
| D8-29 | PASS | evidence | a D8 mentor cannot be authorized from a D1 calibration record |
| D8-30 | PASS | evidence | a participant who met the same D8 interaction pattern family is excluded |
| D8-30a | PASS | evidence | the Stage 2 seven-beat form met under D1 excludes the D8 Stage 2 form without any mapping |
| D8-30b | PASS | evidence | a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent |
| D8-31 | PASS | evidence | D8 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited |
| D8-32 | PASS | evidence | issuing a report that holds a D8 record on D1 consent alone: refused and logged consent_not_inherited |
| D8-33 | PASS | evidence | pool availability needs employer_share for every dimension in the report |
| D8-34 | PASS | evidence | an unloaded evidence currency value blocks issuance (checklist item 13) |
| D8-35 | PASS | run | the correction commitment text does not render while the response time is unloaded: the route returns nothing to render and no default value appears; loaded, it returns the value as loaded (rolled back) |
| D8-36 | PASS | evidence | each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults |
| D8-37 | PASS | evidence | a report with the permitted-use text unloaded: the render refuses and the block is never omitted |
| D8-38 | PASS | evidence | a Stage 3 artifact with no tooling declaration is refused and logged |
| D8-39 | PASS | run | the Mentor Cockpit below 1280 by 800 refuses capture (the server route returns the refusal; the repository has no browser test at that viewport, so the screen's rendering of it is not exercised here); 1280 by 800 permits; a phone refuses |
| D8-40 | PASS | evidence | an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded |
| D8-41 | PASS | evidence | Stage 4 entry with no group participation record is refused |
| D8-42 | PASS | evidence | capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route |
| D8-43 | PASS | run | no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan |
| D8-44 | PASS | evidence | a source with either drafting-test row empty cannot be approved: drafting_test_incomplete |
| D8-45 | PASS | evidence | a drafting-test reviewer equal to the source author is refused |
| D8-46 | PASS | evidence | a Stage 3 source with no rights record is refused at submission, rights_route_absent |
| D8-47 | PASS | evidence | Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result |
| D8-48 | PASS | run | no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned) |
| D8-48a | PASS | evidence | a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route |
| D8-49 | PASS | evidence | Q-D8-01b and Q-D8-03b selecting the same action both compose as separate determinations; neither is suppressed as a duplicate |
| D8-50 | PASS | evidence | a resolution table with one row naming a question absent from the question objects is refused whole and logged; the loader does not skip the row |
| D8-58 | PASS | evidence | a source whose served question has an empty definition cannot enter the production approval path: question_definition_incomplete |
| D8-59 | PASS | evidence | a calibration run on a question with an empty definition does not open: question_definition_incomplete |
| D8-60 | PASS | evidence | the demonstration fixtures and the full acceptance suite run with every question definition empty: the refusal sits on production approval and calibration only |
| D8-61 | PASS | evidence | each of took, acted, sought, performed, applied and carried out is refused by the stage form check at every Stage |
|  | PASS | evidence | composing at Stage 1, 2, 3 and 4 with a performed-act verb in the entry refuses and logs stage_form_violation |
|  | PASS | evidence | no D8 entry carries a performed act verb at any Stage |
|  | PASS | run | a Stage 1 pattern composes with the stage_1_only limitation, and every D8 element is composed at Stage 1 |
| D8-51 | PASS | evidence | the evidence currency statement appears visibly in a rendered report (the multi page report shows it on the controls page, with the evidence currency date) |
| D8-52 | PASS | evidence | any contact initiation from an employer surface is refused and logged contact_permission_absent |
| D8-53 | PASS | run | every loaded source carries the clearance status from its own sheet, and none serves while the clearance is pending |
| D8-54 | PASS | run | a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders |
|  | PASS | evidence | and a source that serves a question whose list is absent from the sheet refuses the same way |
| D8-55 | PASS | evidence | a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed |
| D8-56 | PASS | evidence | a Stage 2 or Stage 4 beat determination with no loaded mentor_action_sequence is refused: beat_sequence_absent |
| D8-57 | PASS | evidence | b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2 |
| D8-62 | PASS | evidence | the specimen face renders in full with the specimen watermark on every page (the persistence refusal for a demonstration is tested at D8-PP-09 in the database run) |
| D8-63 | PASS | run | no flag, override or test mode lifts an approval, calibration or activation refusal: every test mode parameter is service route only (checked in the routine, in the routine it delegates to, or by the grant), and no bypass routine exists; the new D8 rule tables are service-read only and append only |
| D8-64 | PASS | run | every Section 5.7a word fails the scan (manner words, the arc words, the state words, sampled), and none of the 44 entries carries a word of the list or has the participant's state as its subject |
|  | PASS | run | all 63 words of Section 5.7a are on the D8 list and each one fails the scan when it appears in a rendered sentence |
|  | PASS | evidence | a composed entry whose subject is the participant's state refuses and logs state_observation; a word of another dimension refuses cross_dimension_assertion |
|  | PASS | evidence | sentences whose subject is the participant's state, and sentences asserting the absence of a reaction, are refused (seven of seven) |
|  | FAIL | evidence | every D8 template passes the prohibited-output scan — EXCEPTION CR-252: L-D8-COMP-001 (Section 5.12) reads 'The conditions of this observation were affected by a recorded technical event.' and 'affected' is on the Section 5.7a list. The template is loaded as written because this build does not decide wording; the scan flags it; the founder decides |
| D8-65 | PASS | evidence | an altered committed observation with a recomputed hash is refused: commit_seal_invalid (the seal is a server side signature) |
|  | PASS | evidence | under another key the seal reads as invalid, and an unloaded key refuses |
| D8-66 | PASS | evidence | a second observation record under an identifier already committed is refused; the first record stands |
| D8-67 | PASS | evidence | a single page route for a D8 report refuses format_mismatch and logs it |
|  | PASS | evidence | a D8 only report renders as three pages through the multi page renderer |
| D8-68 | PASS | run | neither who_knows nor decision_origin appears in a stored source body, a database routine, a composed statement, any screen or API source file (src and api scanned) or the mentor reference card route; the two fields exist only in the service only truth table (a search of the data and the code; no browser was opened on a Cockpit, which in this repository is the D1 screen reading the stored body) |
|  | PASS | evidence | the two fields are retained for source truth, readable by the service role only, and a signed in user can read neither the table nor the reader |
|  | PASS | evidence | no stored D8 source or fixture body holds either field (34 sources and 4 fixtures) |
| D8-69 | PASS | evidence | a source sheet that adds a field for the participant's reaction, state or bearing is refused at load: no version row, state_observation logged |
|  | PASS | evidence | a field for the participant's state is refused at load |
|  | PASS | evidence | a field for the participant's bearing is refused at load |
|  | PASS | evidence | a list item that names a state or a feeling (reassurance) refuses the source at load |
|  | PASS | evidence | a list item that names a personal need (a day off) refuses the source at load |
|  | PASS | evidence | a list item that names a feeling in an action list refuses the source at load |
|  | PASS | evidence | work recovery is not a state: a recovery site or recovering shipped units loads |
|  | PASS | evidence | a good source loads, and all 34 loaded sources passed the guard at load |
| D8-PP-01 | PASS | evidence | two D8 observations with an approved row, agreeing: the multiple context frame is available |
| D8-PP-02 | PASS | evidence | two D8 observations, approved row, diverging: held side by side with the divergence condition, neither preferred |
| D8-PP-03 | PASS | evidence | three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause |
| D8-PP-04 | PASS | evidence | Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits |
| D8-PP-05 | PASS | run | Stage 2 with the seven beats: a complete timing record (seven beats, the pause at the decision point) and the determinations commit |
| D8-PP-06 | PASS | run | a D8 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written). The 25 item checklist is the 23 platform items and the two D8 items |
| D8-PP-07 | PASS | evidence | a successful correction: a new composed statement supersedes, the original is retained |
| D8-PP-08 | PASS | run | availability granted on a report carrying D8 (employer_share for both dimensions), the pool entry holds no dimension, stage or conduct field, the participant withdraws, the entry leaves the pool, and the evidence record is untouched |
| D8-PP-09 | PASS | run | the four demonstration fixtures are seeded as written (sixteen questions each; every element served at Stages 1, 2 and 4; only Q-D8-09 not served at Stage 3); the eligibility check is reachable on a demonstration report and no issued report is created |
| D8-PP-10 | PASS | evidence | one participant with D1 and D8 observations: each dimension's state is unchanged by the other's records |
| D8-11.3 | PASS | evidence | the coverage test: every reachable D8 answer pattern resolves to one statement or one logged refusal; none to two, none to none without a refusal |
|  | PASS | evidence | and no pattern resolves to two statements |

## Reading this honestly

- PASS means the stated behavior was observed on the throwaway database. It is not a statement about production data: production holds no approved source, no authorized mentor, no clearance and no consent for this dimension, so no observation can occur there. That is the designed first state.
- Entries marked `evidence` are results of the earlier step files, re-read here; entries marked `run` were run by the acceptance file itself.
- Test identifiers inside the earlier step evidence files are build instruction numbers, not these identifiers (CR-119).
