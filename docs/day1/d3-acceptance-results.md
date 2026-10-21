# D3 acceptance results (Section 11)

Run against the throwaway database on 20 October 2026, under the Section 11 identifiers only. Evidence file: `evidence/d3-acceptance-run.json`. The run re-reads the labelled results of the D3 step files (it fails if a result is absent or failing) and runs the remaining checks itself. Every approval, clearance, consent and account in it is synthetic and exists on the throwaway database only.

**78 of 78 identifiers PASS, 0 FAIL, 0 NOT RUN.**

| Test | Result | How | Check |
|---|---|---|---|
| D3-01 | PASS | run | an unapproved D3 source is unreachable from the serving gate and from production composition |
|  | PASS | evidence | and from assignment of a Stage 3 source |
| D3-02 | PASS | evidence | a D3 source with a null situation class cannot be approved |
| D3-03 | PASS | evidence | Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent |
| D3-03a | PASS | evidence | Stage 1 instance still open: s1_instance_not_closed |
| D3-03b | PASS | evidence | confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent |
| D3-03c | PASS | evidence | Stage 1 observation uncommitted: s1_observation_not_committed |
| D3-03d | PASS | evidence | no progression, or a progression that blocks: s1_progression_absent_or_blocks |
| D3-04 | PASS | run | a question the source marks NOT SERVED is unavailable: an answer for it is refused and no row is written (Q-D3-08 on the Stage 1 source; see CR on D3-04) |
| D3-05 | PASS | run | Q-D3-02 A1 with Q-D3-02b nothing selected is refused: the parent asserts a component was affected and the child identifies none |
| D3-06 | PASS | run | Q-D3-07 A3 resolves to ST-D3-042 alone; the unserved child contributes no negative sentence |
| D3-07 | PASS | run | a bound item from another source version is refused |
| D3-08 | PASS | run | a bound item from a D1 source is refused |
| D3-09 | PASS | run | a served question unanswered with no missing state code is refused |
| D3-10 | PASS | run | not_applicable and not_yet_observed cannot be posted as missing states |
| D3-11 | PASS | run | a D1 input to a D3 computation is refused as a dimension isolation violation, and D1 observations never enter the D3 observation set |
| D3-12 | PASS | evidence | a D3 clause instance against a D1 clause instance is refused |
| D3-13 | PASS | evidence | FR-D3-2 with no approved cross-context row is refused; the side by side condition still shows |
| D3-14 | PASS | evidence | three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead |
| D3-15 | PASS | evidence | a material contradiction in the full set blocks the recurrence frame although three match |
| D3-16 | PASS | evidence | recurrence configuration unloaded: refused regardless of the data |
| D3-17 | PASS | evidence | a recurrence blocker never counts toward the recurring state |
|  | PASS | evidence | ST-D3-043 is a recurrence blocker and is never equivalent |
|  | PASS | evidence | ST-D3-051 is a recurrence blocker and is never equivalent |
| D3-18 | PASS | evidence | a D3 row below the floor (one context) cannot be issued: named blocker below_issuance_floor |
| D3-19 | PASS | run | one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer |
| D3-20 | PASS | evidence | the observer of the D1 record of a two-dimension report cannot be its evidence reviewer |
| D3-21 | PASS | evidence | the reviewer cannot be the issuer |
| D3-22 | PASS | evidence | no participant response to the pre-issue review notice: issuance blocks; no timeout |
| D3-23 | PASS | evidence | a correction against a D3 sentence blocks the report; the D3 record is in reconsideration and D1 is untouched |
| D3-24 | PASS | evidence | an in-place edit of a composed statement is refused; supersession only |
| D3-25 | PASS | evidence | a two-dimension report on one page fails and logs layout_overflow; the form does not expand or compress |
| D3-26 | PASS | run | no overall, composite, average or profile element: such an element fails the scan, and none of the 68 statements carries one |
| D3-27 | PASS | evidence | no Section 3.2 comparative or evaluative word, and no word that belongs to another dimension, in rendered D3 output |
|  | PASS | evidence | a word that belongs to D2 or D4 fails as cross_dimension_assertion |
| D3-28 | PASS | run | no named third party in any D3 statement or template (outputs name controlled roles, never people) |
| D3-29 | PASS | evidence | a D3 mentor cannot be authorized from a D1 calibration record |
| D3-30 | PASS | evidence | a participant who met the same D3 interaction pattern family is excluded |
| D3-30a | PASS | evidence | the Stage 2 seven-beat form met under D1 excludes the D3 Stage 2 form without any mapping |
| D3-30b | PASS | evidence | a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent |
| D3-31 | PASS | evidence | D3 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited |
| D3-32 | PASS | evidence | issuing a report that holds a D3 record on D1 consent alone: refused and logged consent_not_inherited |
| D3-33 | PASS | evidence | pool availability needs employer_share for every dimension in the report |
| D3-34 | PASS | evidence | an unloaded evidence currency value blocks issuance (checklist item 13) |
| D3-35 | PASS | run | the correction commitment text does not render while the response time is unloaded: the route returns nothing to render and no default value appears; loaded, it returns the value as loaded (rolled back) |
| D3-36 | PASS | evidence | each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults |
| D3-37 | PASS | evidence | a report with the permitted-use text unloaded: the render refuses and the block is never omitted |
| D3-38 | PASS | evidence | a Stage 3 artifact with no tooling declaration is refused and logged |
| D3-39 | PASS | run | the Mentor Cockpit below 1280 by 800 refuses capture (the route returns the refusal and the screen renders it in place of the six regions; it does not reflow); 1280 by 800 permits; a phone refuses |
| D3-40 | PASS | evidence | an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded |
| D3-41 | PASS | evidence | Stage 4 entry with no group participation record is refused |
| D3-42 | PASS | evidence | capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route |
| D3-43 | PASS | run | no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan |
| D3-44 | PASS | evidence | a source with either drafting-test row empty cannot be approved: drafting_test_incomplete |
| D3-45 | PASS | evidence | a drafting-test reviewer equal to the source author is refused |
| D3-46 | PASS | evidence | a Stage 3 source with no rights record is refused at submission, rights_route_absent |
| D3-47 | PASS | evidence | Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result |
| D3-48 | PASS | run | no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned) |
| D3-48a | PASS | evidence | a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route |
| D3-49 | PASS | evidence | Q-D3-02b and Q-D3-07b selecting the same component both compose as separate determinations; neither is suppressed as a duplicate |
| D3-50 | PASS | evidence | a resolution table with one row naming a question absent from the question objects is refused whole and logged; the loader does not skip the row |
| D3-58 | PASS | evidence | a source whose served question has an empty definition cannot enter the production approval path: question_definition_incomplete |
| D3-59 | PASS | evidence | a calibration run on a question with an empty definition does not open: question_definition_incomplete |
| D3-60 | PASS | evidence | the demonstration fixtures and the full acceptance suite run with every question definition empty: the refusal sits on production approval and calibration only |
| D3-61 | PASS | evidence | a Stage 1 statement for an action-bearing element resolves to the stated-plan variant |
|  | PASS | evidence | a performed act verb at Stage 1 refuses and logs stage_form_violation |
| D3-51 | PASS | evidence | the evidence currency statement appears visibly in a rendered report (the multi page report shows it on the controls page, with the evidence currency date) |
| D3-52 | PASS | evidence | any contact initiation from an employer surface is refused and logged contact_permission_absent |
| D3-53 | PASS | run | every loaded source carries the clearance status from its own sheet, and none serves while the clearance is pending |
| D3-54 | PASS | run | a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders |
| D3-55 | PASS | evidence | a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed |
| D3-56 | PASS | evidence | a CE-D3-04 timing determination with no loaded mentor_action_sequence is refused: beat_sequence_absent |
| D3-57 | PASS | evidence | b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2 |
| D3-PP-01 | PASS | evidence | two D3 observations with an approved row, agreeing: the multiple context frame is available |
| D3-PP-02 | PASS | evidence | two D3 observations, approved row, diverging: held side by side with the divergence condition, neither preferred |
| D3-PP-03 | PASS | evidence | three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause |
| D3-PP-04 | PASS | evidence | Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits |
| D3-PP-05 | PASS | run | Stage 2 with the seven beats: a complete timing record permits the timing determination and the determinations commit |
| D3-PP-06 | PASS | run | a D3 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written) |
| D3-PP-07 | PASS | evidence | a successful correction: a new composed statement supersedes, the original is retained |
| D3-PP-08 | PASS | run | availability granted on a report carrying D3 (employer_share for both dimensions), the pool entry holds no dimension, stage or conduct field, the participant withdraws, the entry leaves the pool, and the evidence record is untouched |
| D3-PP-09 | PASS | run | the four demonstration fixtures are seeded as written (Q-D3-08 not served at Stage 1; Q-D3-08 and Q-D3-09 not served at Stage 3); the eligibility check is reachable on a demonstration report and no issued report is created |
| D3-PP-10 | PASS | evidence | one participant with D1 and D3 observations: each dimension's state is unchanged by the other's records |

## Reading this honestly

- PASS means the stated behavior was observed on the throwaway database. It is not a statement about production data: production holds no approved source, no authorized mentor, no clearance and no consent for this dimension, so no observation can occur there. That is the designed first state.
- Entries marked `evidence` are results of the earlier step files, re-read here; entries marked `run` were run by the acceptance file itself.
- Test identifiers inside the earlier step evidence files are build instruction numbers, not these identifiers (CR-119).
