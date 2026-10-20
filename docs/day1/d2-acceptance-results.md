# D2 acceptance results (Section 11)

Run against the throwaway database on 20 October 2026, under the Section 11 identifiers only. Evidence file: `evidence/d2-acceptance-run.json`. The run re-reads the labelled results of the earlier step files (it fails if a result is absent or failing) and runs the remaining checks itself. Every approval, clearance, consent and account in it is synthetic and exists on the throwaway database only.

**70 of 74 identifiers PASS, 0 FAIL, 4 NOT RUN.** The four not run need the report renderer or a screen, which are the next steps; each states why.

| Test | Result | How | Check |
|---|---|---|---|
| D2-01 | PASS | run | an unapproved D2 source is unreachable from the serving gate and from production composition |
|  | PASS | evidence | and from assignment of a Stage 3 source |
| D2-02 | PASS | evidence | a D2 source with a null situation class cannot be approved |
| D2-03 | PASS | evidence | Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent |
| D2-03a | PASS | evidence | Stage 1 instance still open: s1_instance_not_closed |
| D2-03b | PASS | evidence | confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent |
| D2-03c | PASS | evidence | Stage 1 observation uncommitted: s1_observation_not_committed |
| D2-03d | PASS | evidence | no progression, or a progression that blocks: s1_progression_absent_or_blocks |
| D2-04 | PASS | run | Q-D2-02b at Stage 1 is unavailable (an answer is refused, no row written) |
| D2-05 | PASS | run | Q-D2-05a A2 with nothing selected at Q-D2-05b is refused |
| D2-06 | PASS | run | Q-D2-07a A3 resolves to ST-D2-041 alone; the unserved child contributes no negative sentence |
| D2-07 | PASS | run | a bound item from another source version is refused |
| D2-08 | PASS | run | a bound item from a D1 source is refused |
| D2-09 | PASS | run | a served question unanswered with no missing state code is refused |
| D2-10 | PASS | run | not_applicable and not_yet_observed cannot be posted as missing states |
| D2-11 | PASS | run | a D1 input to a D2 computation is refused as a dimension isolation violation, and D1 observations never enter the D2 observation set |
| D2-12 | PASS | evidence | a D2 clause instance against a D1 clause instance is refused |
| D2-13 | PASS | evidence | FR-D2-2 with no approved cross-context row is refused; the side by side condition still shows |
| D2-14 | PASS | evidence | three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead |
| D2-15 | PASS | evidence | a material contradiction in the full set blocks the recurrence frame although three match |
| D2-16 | PASS | evidence | recurrence configuration unloaded: refused regardless of the data |
| D2-17 | PASS | evidence | ST-D2-053 never counts toward the recurring state |
| D2-18 | PASS | evidence | a D2 row below the floor (one context) cannot be issued: named blocker below_issuance_floor |
| D2-19 | PASS | run | one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer |
| D2-20 | PASS | evidence | the observer of the D1 record of a two-dimension report cannot be its evidence reviewer |
| D2-21 | PASS | evidence | the reviewer cannot be the issuer |
| D2-22 | PASS | evidence | no participant response to the pre-issue review notice: issuance blocks; no timeout |
| D2-23 | PASS | evidence | a correction against a D2 sentence blocks the report; the D2 record is in reconsideration and D1 is untouched |
| D2-24 | PASS | evidence | an in-place edit of a composed statement is refused; supersession only |
| D2-25 | PASS | evidence | a two-dimension report on one page fails and logs layout_overflow; the form does not expand or compress |
| D2-26 | PASS | run | no overall, composite, average or profile element: such an element fails the scan, and none of the 61 statements carries one |
| D2-27 | PASS | evidence | no Section 3.2 prohibited verb or retired term in rendered D2 output |
| D2-28 | PASS | run | no named third party in any D2 statement or template (outputs name controlled roles, never people) |
| D2-29 | PASS | evidence | a D2 mentor cannot be authorized from a D1 calibration record |
| D2-30 | PASS | evidence | a participant who met the same D2 interaction pattern family is excluded |
| D2-30a | PASS | evidence | the Stage 2 seven-beat form met under D1 excludes the D2 Stage 2 form without any mapping |
| D2-30b | PASS | evidence | a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent |
| D2-31 | PASS | evidence | D2 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited |
| D2-32 | PASS | evidence | issuing a report that holds a D2 record on D1 consent alone: refused and logged consent_not_inherited |
| D2-33 | PASS | evidence | pool availability needs employer_share for every dimension in the report |
| D2-34 | PASS | evidence | an unloaded evidence currency value blocks issuance (checklist item 13) |
| D2-35 | NOT RUN | surface | the correction commitment text does not render when the response time is unloaded — Participant correction screen (surface step). The value is not loaded and has no default in the database. |
| D2-36 | PASS | evidence | each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults |
| D2-37 | NOT RUN | surface | a report with the permitted-use text unloaded: the render refuses — Report renderer (Step 6). The text is not loaded. |
| D2-38 | PASS | evidence | a Stage 3 artifact with no tooling declaration is refused and logged |
| D2-39 | NOT RUN | surface | the Mentor Cockpit opened below 1280 by 800 refuses capture — Cockpit screen (surface step). |
| D2-40 | PASS | evidence | an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded |
| D2-41 | PASS | evidence | Stage 4 entry with no group participation record is refused |
| D2-42 | PASS | evidence | capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route |
| D2-43 | PASS | run | no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan |
| D2-44 | PASS | evidence | a source with either drafting-test row empty cannot be approved: drafting_test_incomplete |
| D2-45 | PASS | evidence | a drafting-test reviewer equal to the source author is refused |
| D2-46 | PASS | evidence | a Stage 3 source with no rights record is refused at submission, rights_route_absent |
| D2-47 | PASS | evidence | Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result |
| D2-48 | PASS | run | no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned) |
| D2-48a | PASS | evidence | a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route |
| D2-49 | PASS | run | Q-D2-06a A2 with a supported support-set item composes ST-D2-038; ST-D2-036 is unreachable on A2 |
| D2-50 | PASS | run | Q-D2-02 A1 with Q-D2-02b submitted with nothing selected is refused and logged; there is no none-of-the-listed option |
| D2-51 | NOT RUN | surface | the evidence currency statement appears visibly in block 4 of a rendered report — Report renderer (Step 6). The gate blocks issuance while the value is unloaded (D2-34). |
| D2-52 | PASS | evidence | any contact initiation from an employer surface is refused and logged contact_permission_absent |
| D2-53 | PASS | run | every loaded source carries the clearance status from its own sheet, and none serves while the clearance is pending |
| D2-54 | PASS | run | a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders |
| D2-55 | PASS | evidence | a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed |
| D2-56 | PASS | evidence | a CE-D2-04 timing determination with no loaded mentor_action_sequence is refused: beat_sequence_absent |
| D2-57 | PASS | evidence | b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2 |
| D2-PP-01 | PASS | evidence | two D2 observations with an approved row, agreeing: the multiple context frame is available |
| D2-PP-02 | PASS | evidence | two D2 observations, approved row, diverging: held side by side with the divergence condition, neither preferred |
| D2-PP-03 | PASS | evidence | three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause |
| D2-PP-04 | PASS | evidence | Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits |
| D2-PP-05 | PASS | run | Stage 2 with the seven beats: a complete timing record permits the timing determination and the determinations commit |
| D2-PP-06 | PASS | run | a D2 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written) |
| D2-PP-07 | PASS | evidence | a successful correction: a new composed statement supersedes, the original is retained |
| D2-PP-08 | PASS | evidence | availability granted, read as the current version, then withdrawn; the evidence record untouched |
| D2-PP-09 | PASS | run | the four demonstration fixtures are seeded as written (Q-D2-02b not served at Stage 1; Q-D2-08a and Q-D2-09 not served at Stage 3); the eligibility check is reachable on a demonstration report and no issued report is created |
| D2-PP-10 | PASS | evidence | one participant with D1 and D2 observations: each dimension's state is unchanged by the other's records |

## Reading this honestly

- PASS means the stated behavior was observed on the throwaway database. It is not a statement about production data: production holds no approved D2 source, no authorized D2 mentor, no clearance and no consent, so no D2 observation can occur there. That is the designed first state.
- D2-18 and D2-19 (the issuance floor) were not built when the Stage gates were; they were found missing by this run and built in step 3n.
- D2-11 is satisfied structurally: the evidence state reads only the participant's records of the dimension asked for, and a D1 input to a D2 computation is refused and logged.
- D2-28 and D2-43 are scans of the 61 statements and 13 templates and of constructed renders; the same scans run again on rendered output when the renderer exists.
- D2-35, D2-37, D2-39 and D2-51 are NOT RUN: the correction commitment text, the permitted-use block, the Cockpit size rule and the currency statement in block 4 are rendering or screen behaviors. Their database side (no default value, the issuance block on an unloaded currency) is covered above.
- Test identifiers inside the earlier `step3*-test.json` files are build instruction numbers, not these identifiers (CR-119).
