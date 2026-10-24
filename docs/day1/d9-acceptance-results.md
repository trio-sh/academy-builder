# D9 acceptance results (Section 11)

Run against the throwaway database on 24 October 2026, under the Section 11 identifiers only. Evidence file: `evidence/d9-acceptance-run.json`. The run re-reads the labelled results of the D9 step files (it fails if a result is absent or failing) and runs the remaining checks itself. Every approval, clearance, consent and account in it is synthetic and exists on the throwaway database only.

**88 of 89 identifiers PASS, 0 FAIL, 1 NOT RUN.** Each identifier not run states why.

| Test | Result | How | Check |
|---|---|---|---|
| D9-01 | PASS | run | an unapproved D9 source is unreachable from the serving gate and from production composition |
|  | PASS | evidence | and from assignment of a Stage 3 source |
| D9-02 | PASS | evidence | a D9 source with a null situation class cannot be approved (D9-02 names d8_situation_class, a slip for d9_situation_class: the check is on d9_situation_class) |
|  | PASS | evidence | and a source written 'code with code' is read by its first named class |
| D9-03 | PASS | evidence | Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent |
| D9-03a | PASS | evidence | Stage 1 instance still open: s1_instance_not_closed |
| D9-03b | PASS | evidence | confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent |
| D9-03c | PASS | evidence | Stage 1 observation uncommitted: s1_observation_not_committed |
| D9-03d | PASS | evidence | no progression, or a progression that blocks: s1_progression_absent_or_blocks |
| D9-04 | PASS | run | Q-D9-09 at Stage 3 is unavailable (an answer and a missing state both refuse) and Q-D9-06 or Q-D9-06b on a source whose trial_steps is empty is unavailable; no row is written for either |
|  | PASS | evidence | and the Stage 3 pattern composes with no clause at all for Q-D9-09 |
| D9-05 | PASS | run | Q-D9-01 A1 with Q-D9-01b nothing selected is refused: the parent asserts a listed indication was named and the child identifies none |
|  | PASS | evidence | the same for each of the seven pairs, and the resolution rules RR-D9-01 to RR-D9-08 refuse their patterns |
| D9-06 | PASS | run | Q-D9-03 A3 resolves to ST-D9-013 alone; the unserved child contributes no negative sentence |
|  | PASS | evidence | and composition writes no child clause |
| D9-07 | PASS | run | a bound item from another source version (NW3 is on other D9 sources, not on this version) is refused |
| D9-08 | PASS | run | a bound item from a D1 source is refused |
| D9-09 | PASS | run | a served question unanswered with no missing state code is refused |
| D9-10 | PASS | run | not_applicable and not_yet_observed cannot be posted as missing states |
| D9-11 | PASS | run | a D1 input to a D9 computation is refused as a dimension isolation violation, and D1 observations never enter the D9 observation set |
|  | PASS | evidence | and a D9 evidence state counts D9 records only |
| D9-12 | PASS | evidence | a D9 clause instance against a D1 clause instance is refused (shown against D3 and D4 clause instances: the key namespace of a dimension is its own) |
| D9-13 | PASS | evidence | FR-D9-2 with no approved cross-context row is refused; the side by side condition still shows |
| D9-14 | PASS | evidence | three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead |
| D9-15 | PASS | evidence | a material contradiction in the full set blocks the recurrence frame although three match |
| D9-16 | PASS | evidence | recurrence configuration unloaded: refused regardless of the data |
| D9-17 | PASS | evidence | a record_status entry (ST-D9-044) in three contexts never satisfies the recurring frame |
|  | PASS | evidence | and the platform composes every record_status entry as a recurrence blocker, with the library flag false for all 44 entries |
| D9-18 | PASS | evidence | a D9 row below the floor (one context) cannot be issued: named blocker below_issuance_floor |
| D9-19 | PASS | run | one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer |
| D9-20 | PASS | evidence | the observer of the D1 record of a two-dimension report cannot be its evidence reviewer |
| D9-21 | PASS | evidence | the reviewer cannot be the issuer |
| D9-22 | PASS | evidence | no participant response to the pre-issue review notice: issuance blocks; no timeout |
| D9-23 | PASS | evidence | a correction against a D9 sentence blocks the report; the D9 record is in reconsideration and D1 is untouched |
| D9-24 | PASS | evidence | an in-place edit of a composed statement is refused; supersession only |
| D9-25 | PASS | run | a two-dimension specimen on one page fails and logs layout_overflow; the multi page form renders it without expanding or compressing the single page |
|  | PASS | evidence | a two-dimension report with D9 renders through the multi page renderer; the single page route refuses format_mismatch and the multi page route is renderable with two dimension blocks |
| CR-10 | PASS | run | a report that is not a specimen routed to the single page renderer is refused format_mismatch |
| D9-26 | PASS | run | no overall, composite, average or profile element: such an element fails the scan, and none of the 44 statements carries one |
|  | PASS | run | and none of the 13 templates, nor the report's own controlled structure, carries one |
| D9-27 | PASS | evidence | no Section 3.2 word (the 11 verbs another dimension owns, the performed acts, the learning and capacity words and the modals), in rendered D9 output |
|  | PASS | evidence | a word that belongs to another dimension fails as cross_dimension_assertion, at the scan and at composition |
|  | PASS | evidence | and a composed entry carrying such a word refuses at composition |
| D9-28 | PASS | run | no named third party in any D9 statement or template (outputs name controlled roles, never people), and every one of the 35 sources states that it names no real person or organization |
| D9-29 | PASS | evidence | a D9 mentor cannot be authorized from a D1 calibration record |
| D9-30 | PASS | evidence | a participant who met the same D9 interaction pattern family is excluded |
| D9-30a | PASS | evidence | the Stage 2 seven-beat form met under D1 excludes the D9 Stage 2 form without any mapping |
| D9-30b | PASS | evidence | a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent |
| D9-31 | PASS | evidence | D9 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited |
| D9-32 | PASS | evidence | issuing a report that holds a D9 record on D1 consent alone: refused and logged consent_not_inherited |
| D9-33 | PASS | evidence | pool availability needs employer_share for every dimension in the report |
| D9-34 | PASS | evidence | an unloaded evidence currency value blocks issuance (checklist item 13) |
| D9-35 | PASS | run | the correction commitment text does not render while the response time is unloaded: the route returns nothing to render and no default value appears; loaded, it returns the value as loaded (rolled back) |
| D9-36 | PASS | evidence | each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults |
| D9-37 | PASS | evidence | a report with the permitted-use text unloaded: the render refuses and the block is never omitted |
| D9-38 | PASS | evidence | a Stage 3 artifact with no tooling declaration is refused and logged |
| D9-39 | PASS | run | the Mentor Cockpit below 1280 by 800 refuses capture (the route returns the refusal; the screen draws it in place of the six regions and does not reflow; the browser at 1280 by 800 is not run here); 1280 by 800 permits; a phone refuses |
| D9-40 | PASS | evidence | an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded |
| D9-41 | PASS | evidence | Stage 4 entry with no group participation record is refused |
| D9-42 | PASS | evidence | capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route |
| D9-43 | PASS | run | no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan |
| D9-44 | PASS | evidence | a source with either drafting-test row empty cannot be approved: drafting_test_incomplete |
| D9-45 | PASS | evidence | a drafting-test reviewer equal to the source author is refused |
| D9-46 | PASS | evidence | a Stage 3 source with no rights record is refused at submission, rights_route_absent |
| D9-47 | PASS | evidence | Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result |
| D9-48 | PASS | run | no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned) |
| D9-48a | PASS | evidence | a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route |
| D9-49 | PASS | evidence | Q-D9-02 A1 and Q-D9-03 A1 in one observation: both compose as separate clauses and render side by side; neither is suppressed, subordinated or worded as the conclusion |
|  | PASS | evidence | and the same two answers resolve to the same four entries whatever order they arrive in; a participant who states neither composes no adverse clause |
| D9-50 | PASS | evidence | a resolution table with one row naming a question absent from the question objects is refused whole and logged; the loader does not skip the row |
| D9-58 | PASS | evidence | a source whose served question has an empty definition cannot enter the production approval path: question_definition_incomplete |
| D9-59 | PASS | evidence | a calibration run on a question with an empty definition does not open: question_definition_incomplete |
| D9-60 | PASS | evidence | the demonstration fixtures and the full acceptance suite run with every question definition empty: the refusal sits on production approval and calibration only |
| D9-61 | PASS | evidence | a performed act word in a composed D9 entry refuses and logs stage_form_violation at Stages 1, 2, 3 and 4 (each of the twelve words checked at every Stage) |
|  | PASS | run | the twelve words are registered for D9 at every Stage and for no other dimension |
|  | PASS | run | a Stage 1 pattern composes with the stage_1_only limitation (every element is carried at Stage 1) |
| D9-51 | PASS | evidence | the evidence currency statement appears visibly in a rendered report (the multi page report shows it on the controls page, with the evidence currency date) |
| D9-52 | PASS | evidence | any contact initiation from an employer surface is refused and logged contact_permission_absent |
| D9-53 | PASS | run | every loaded source carries the clearance status from its own sheet, and a D9 source whose sheet says PENDING keeps that value (never defaulted) and does not serve |
| D9-54 | PASS | run | a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders |
| D9-55 | PASS | evidence | a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed |
| D9-56 | PASS | evidence | a timing determination with no loaded mentor_action_sequence is refused: beat_sequence_absent |
| D9-57 | PASS | evidence | b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2 |
| D9-62 | PASS | evidence | the specimen face renders in full with the specimen watermark on every page (the persistence refusal for a demonstration is tested at D9-PP-09 in the database run) |
| D9-63 | PASS | run | no flag, override or test mode lifts an approval, calibration or activation refusal: every test mode parameter is service route only (checked in the routine, in the routine it delegates to, or by the grant), and no bypass routine exists |
| D9-64 | PASS | run | all 88 words of Section 5.7a fail the scan, every statement (44), template (13) and the clauses composed at all four Stages carry none of them and have a statement as their subject, and the nine record status entries that record an absence describe a statement not observed, never a capacity |
|  | PASS | evidence | and a sentence whose subject is the participant's capacity, knowledge or state refuses as capacity_observation, at the check and at composition |
| D9-65 | PASS | evidence | an altered committed observation with a recomputed hash is refused: commit_seal_invalid (the seal is a server side signature) |
|  | PASS | evidence | the seal key is never in the database: an unloaded key refuses |
| D9-66 | PASS | evidence | a second observation record under an identifier already committed is refused; the first record stands |
| D9-67 | PASS | evidence | a single page route for a D9 report refuses format_mismatch and logs it |
|  | PASS | evidence | also for a D9 only specimen (no route from a D9 report to the single page renderer) |
|  | PASS | evidence | a D9 only report renders as three pages through the multi page renderer |
| D9-68 | PASS | evidence | practice_origin appears nowhere: the display route strips it, the reference card of all 39 sources never carries it, no statement, template, capture line or question stem holds it |
|  | PASS | evidence | and the display body of every source has no practice_origin key and no text of it |
| D9-69 | PASS | evidence | a sheet field for a response, capacity, knowledge, state or speed, or a list item naming ability, age, origin, language or education, is refused at load and logged capacity_observation |
| D9-70 | PASS | run | a claim package for a stated change (a participant who stated a change and nothing about keeping) and one for a kept approach (the reverse) come out of the same builder with the same keys, the same entry type, the same evidence state frame, the same disposition, the same context shape and no differences or dependencies attached to either; they differ only in the entry identifier and text |
|  | PASS | run | the multi page renderer's own source (layout, view and styles) has no branch, class or style keyed to a D9 entry, question, element or to a change or a kept approach: the frame, labels, order markers, type and colour of a claim package depend on its evidence state and entry type only |
|  | PASS | evidence | no entry and no template joins a change and a kept approach with but, however, although or instead, and the frames carry no mention of either |
|  | PASS | evidence | and the eight conditions are the same for every entry |
|  | PASS | evidence | the browser render of a D9 only report shows no per-entry styling: the claim package block carries the dimension, never a change or a kept marker |
| D9-71 | PASS | evidence | neither REK-D9-002 nor REK-D9-003 has a family, a direction rule, an entry or a state mapping in the D9 content package, and a request for either yields no direction, progression or regression finding (the module is dormant: the request is refused LSA-R04 and no request log route exists to write to) |
|  | PASS | evidence | each of the four requests over differing sequences |
|  | NOT RUN | surface | the Session Archive request is logged: the dormant module has no request route and so no request log (activation stays off); the refusal code is returned by the resolver and nothing else is written — no request route exists in the dormant module |
| D9-PP-01 | PASS | evidence | two D9 observations with an approved row, agreeing: the multiple context frame is available |
| D9-PP-02 | PASS | evidence | two D9 observations, approved row, diverging: held side by side with the divergence condition, neither preferred (L-D9-DIV-001) |
|  | PASS | evidence | and the divergence template states that neither is presented in preference to the other |
| D9-PP-03 | PASS | evidence | three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause (L-D9-REC-001) |
|  | PASS | evidence | and the recurrence template is loaded word for word |
| D9-PP-04 | PASS | evidence | Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits |
| D9-PP-05 | PASS | run | Stage 2 with the seven beats: a complete timing record, the decision point read from the beat marked as one, and the determinations commit (D9 holds no timing question: the timing route is applied only if the register has one) |
| D9-PP-06 | PASS | run | a D9 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written); the 25 items are the 23 platform items and D9 items 34 and 35 |
| D9-PP-07 | PASS | evidence | a successful correction: a new composed statement supersedes, the original is retained |
| D9-PP-08 | PASS | run | availability granted on a report carrying D9 (employer_share for both dimensions), the pool state reads available (an approved organization reading the entry is the employer surface and is not run here), the pool entry holds no dimension, stage or conduct field, the participant withdraws, the entry leaves the pool, and the evidence record is untouched (and the status-only verification still returns the issued status before and after the withdrawal) |
| D9-PP-09 | PASS | run | the four demonstration fixtures are seeded as written (sixteen questions each; Q-D9-09 alone is NOT SERVED at Stage 3 and nothing is NOT SERVED at Stages 1, 2 and 4); the eligibility check is reachable on a demonstration report and no issued report is created |
| D9-PP-10 | PASS | evidence | one participant with D1 and D4 observations (D8 is built in parallel and is not in this branch): the D9 state is unchanged by the other dimensions' records |
| 11.3 | PASS | run | every reachable D9 answer pattern (all four Stages) resolves to ONE statement set or ONE designed refusal: no pattern resolves to two statements and none resolves to nothing without a refusal |
|  | PASS | evidence | and the same coverage is asserted in the resolution step |

## Reading this honestly

- PASS means the stated behavior was observed on the throwaway database. It is not a statement about production data: production holds no approved source, no authorized mentor, no clearance and no consent for this dimension, so no observation can occur there. That is the designed first state.
- Entries marked `evidence` are results of the earlier step files, re-read here; entries marked `run` were run by the acceptance file itself.
- Test identifiers inside the earlier step evidence files are build instruction numbers, not these identifiers (CR-119).
