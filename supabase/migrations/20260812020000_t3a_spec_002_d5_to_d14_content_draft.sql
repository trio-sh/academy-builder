-- ============================================================================
-- T3A-DEV-SPEC-002 · Track B · Dimensions D5..D14 drafts (bulk)
-- ============================================================================
-- All ten remaining dimensions drafted in the same atomic factual-
-- determination pattern established by D1..D4. Rows land with
-- approved_at = NULL and stay NOT-OBSERVABLE until the founder ratifies
-- each dimension via
--   SELECT t3a_ratify_question_set(<Dx>, 'v1.0.0-draft', 'v1.0.0', auth.uid());
--
-- Content is developer-drafted from the dimension descriptions in the
-- current framework. Wording, options, and statement bodies are open to
-- founder amendment before ratification.
--
-- Coverage:
--   D5  Collaboration & Conflict Resolution
--   D6  Resilience & Recovery
--   D7  Learning Agility
--   D8  Workplace Adaptability
--   D9  Prioritization & Time Management
--   D10 Professional Boundaries
--   D11 Creative Problem-Solving
--   D12 Customer & Service Focus
--   D13 Influence & Persuasion
--   D14 Relationship Building
--
-- 50 questions total (5 per dimension), 200 statement library rows total
-- (4 per question), everything at v1.0.0-draft.
-- ============================================================================

-- ============================================================================
-- D5 · Collaboration & Conflict Resolution
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D5', 'v1.0.0-draft', 1, 'Where a task required collaboration, did the participant contribute constructively to the shared work?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('contributed_constructively','withheld_or_obstructed','not_applicable','not_observable')), NULL),
  ('D5', 'v1.0.0-draft', 2, 'Where a disagreement arose, did the participant address it directly with the person involved?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('addressed_directly','avoided_or_routed_around','not_applicable','not_observable')), NULL),
  ('D5', 'v1.0.0-draft', 3, 'Where a disagreement arose, did the participant work toward a resolution that accounted for the other party''s position?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('worked_toward_resolution','dismissed_other_position','not_applicable','not_observable')), NULL),
  ('D5', 'v1.0.0-draft', 4, 'When teammates raised ideas different from the participant''s own, did the participant engage with them on their merits?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('engaged_on_merits','dismissed_without_engagement','not_applicable','not_observable')), NULL),
  ('D5', 'v1.0.0-draft', 5, 'Where roles or responsibilities needed clarification, did the participant help clarify them rather than compete over them?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('helped_clarify','competed_over_roles','not_applicable','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q01','a','contributed_constructively'),'Where a task required collaboration, the participant contributed constructively to the shared work.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q01','a','withheld_or_obstructed'),'Where a task required collaboration, the participant withheld from or obstructed the shared work.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q01','a','not_applicable'),'No collaborative context arose in this observation.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q01','a','not_observable'),'No basis for a contribution-to-collaboration determination was provided.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q02','a','addressed_directly'),'Where a disagreement arose, the participant addressed it directly with the person involved.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q02','a','avoided_or_routed_around'),'Where a disagreement arose, the participant avoided the person involved or routed around them.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q02','a','not_applicable'),'No disagreement arose in this observation.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q02','a','not_observable'),'No basis for a direct-address-of-disagreement determination was provided.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q03','a','worked_toward_resolution'),'Where a disagreement arose, the participant worked toward a resolution that accounted for the other party''s position.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q03','a','dismissed_other_position'),'Where a disagreement arose, the participant dismissed the other party''s position.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q03','a','not_applicable'),'No resolution work was required in this observation.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q03','a','not_observable'),'No basis for a resolution-orientation determination was provided.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q04','a','engaged_on_merits'),'When teammates raised ideas different from the participant''s own, the participant engaged with them on their merits.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q04','a','dismissed_without_engagement'),'When teammates raised ideas different from the participant''s own, the participant dismissed them without engagement.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q04','a','not_applicable'),'No differing ideas were raised by teammates in this observation.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q04','a','not_observable'),'No basis for an engagement-with-differing-ideas determination was provided.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q05','a','helped_clarify'),'Where roles or responsibilities needed clarification, the participant helped clarify them.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q05','a','competed_over_roles'),'Where roles or responsibilities needed clarification, the participant competed over them.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q05','a','not_applicable'),'No role-clarification need arose in this observation.',NULL),
  ('D5','v1.0.0-draft',jsonb_build_object('q','D5-Q05','a','not_observable'),'No basis for a role-clarification determination was provided.',NULL);

-- ============================================================================
-- D6 · Resilience & Recovery
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D6', 'v1.0.0-draft', 1, 'Following a setback in the observation, did the participant continue to engage with the task?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('continued_engaging','disengaged','not_applicable','not_observable')), NULL),
  ('D6', 'v1.0.0-draft', 2, 'Under sustained difficulty, did the participant maintain professional composure?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('maintained_composure','lost_composure','not_applicable','not_observable')), NULL),
  ('D6', 'v1.0.0-draft', 3, 'After a failure, did the participant re-approach the problem rather than repeat the failed approach unchanged?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('re_approached','repeated_unchanged','no_failure_occurred','not_observable')), NULL),
  ('D6', 'v1.0.0-draft', 4, 'When outcomes did not meet expectations, did the participant frame the situation in terms open to further action?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('framed_actionably','framed_as_fixed','not_applicable','not_observable')), NULL),
  ('D6', 'v1.0.0-draft', 5, 'Did the participant seek support appropriate to the difficulty they faced?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('sought_appropriate_support','did_not_seek_support','no_support_needed','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q01','a','continued_engaging'),'Following a setback in the observation, the participant continued to engage with the task.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q01','a','disengaged'),'Following a setback in the observation, the participant disengaged from the task.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q01','a','not_applicable'),'No setback arose in this observation.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q01','a','not_observable'),'No basis for a post-setback engagement determination was provided.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q02','a','maintained_composure'),'Under sustained difficulty, the participant maintained professional composure.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q02','a','lost_composure'),'Under sustained difficulty, the participant lost professional composure.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q02','a','not_applicable'),'No sustained difficulty arose in this observation.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q02','a','not_observable'),'No basis for a composure-under-difficulty determination was provided.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q03','a','re_approached'),'After a failure, the participant re-approached the problem rather than repeating the failed approach.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q03','a','repeated_unchanged'),'After a failure, the participant repeated the failed approach unchanged.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q03','a','no_failure_occurred'),'No failure requiring re-approach occurred in this observation.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q03','a','not_observable'),'No basis for a post-failure re-approach determination was provided.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q04','a','framed_actionably'),'When outcomes did not meet expectations, the participant framed the situation in terms open to further action.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q04','a','framed_as_fixed'),'When outcomes did not meet expectations, the participant framed the situation as fixed.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q04','a','not_applicable'),'No shortfall against expectations arose in this observation.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q04','a','not_observable'),'No basis for a framing determination was provided.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q05','a','sought_appropriate_support'),'The participant sought support appropriate to the difficulty they faced.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q05','a','did_not_seek_support'),'The participant did not seek support appropriate to the difficulty they faced.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q05','a','no_support_needed'),'No support was needed in this observation.',NULL),
  ('D6','v1.0.0-draft',jsonb_build_object('q','D6-Q05','a','not_observable'),'No basis for a support-seeking determination was provided.',NULL);

-- ============================================================================
-- D7 · Learning Agility
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D7', 'v1.0.0-draft', 1, 'Where feedback was offered, did the participant engage with it?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('engaged_with_feedback','dismissed_feedback','no_feedback_offered','not_observable')), NULL),
  ('D7', 'v1.0.0-draft', 2, 'Where feedback was engaged with, did the participant apply it in a subsequent attempt?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('applied_feedback','did_not_apply','no_subsequent_opportunity','not_observable')), NULL),
  ('D7', 'v1.0.0-draft', 3, 'Where new information was relevant to the task, did the participant seek it out?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('sought_new_information','did_not_seek','not_applicable','not_observable')), NULL),
  ('D7', 'v1.0.0-draft', 4, 'Where the participant did not know something needed for the task, did they say so?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('said_so','concealed_gap','not_applicable','not_observable')), NULL),
  ('D7', 'v1.0.0-draft', 5, 'Between comparable attempts at the task, did the participant''s approach show measurable adjustment based on prior outcomes?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('showed_adjustment','repeated_unchanged','not_applicable','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q01','a','engaged_with_feedback'),'Where feedback was offered, the participant engaged with it.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q01','a','dismissed_feedback'),'Where feedback was offered, the participant dismissed it.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q01','a','no_feedback_offered'),'No feedback was offered in this observation.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q01','a','not_observable'),'No basis for a feedback-engagement determination was provided.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q02','a','applied_feedback'),'Where feedback was engaged with, the participant applied it in a subsequent attempt.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q02','a','did_not_apply'),'Where feedback was engaged with, the participant did not apply it in a subsequent attempt.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q02','a','no_subsequent_opportunity'),'No subsequent opportunity to apply the feedback arose in this observation.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q02','a','not_observable'),'No basis for a feedback-application determination was provided.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q03','a','sought_new_information'),'Where new information was relevant to the task, the participant sought it out.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q03','a','did_not_seek'),'Where new information was relevant to the task, the participant did not seek it out.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q03','a','not_applicable'),'No new information was relevant to the task in this observation.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q03','a','not_observable'),'No basis for an information-seeking determination was provided.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q04','a','said_so'),'Where the participant did not know something needed for the task, they said so.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q04','a','concealed_gap'),'Where the participant did not know something needed for the task, they concealed the gap.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q04','a','not_applicable'),'No gap in the participant''s knowledge arose in this observation.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q04','a','not_observable'),'No basis for a knowledge-gap-disclosure determination was provided.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q05','a','showed_adjustment'),'Between comparable attempts at the task, the participant''s approach showed measurable adjustment based on prior outcomes.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q05','a','repeated_unchanged'),'Between comparable attempts at the task, the participant''s approach repeated unchanged.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q05','a','not_applicable'),'No comparable attempts were made in this observation.',NULL),
  ('D7','v1.0.0-draft',jsonb_build_object('q','D7-Q05','a','not_observable'),'No basis for a between-attempts adjustment determination was provided.',NULL);

-- ============================================================================
-- D8 · Workplace Adaptability
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D8', 'v1.0.0-draft', 1, 'Where the setting had unstated norms, did the participant read and act on them?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('read_and_acted','did_not_read','not_applicable','not_observable')), NULL),
  ('D8', 'v1.0.0-draft', 2, 'When the situation shifted, did the participant adjust their behavior to the new state rather than continuing on the prior plan?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('adjusted','continued_on_prior_plan','not_applicable','not_observable')), NULL),
  ('D8', 'v1.0.0-draft', 3, 'Where authority structures applied, did the participant act consistently with them?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('acted_consistently','disregarded','not_applicable','not_observable')), NULL),
  ('D8', 'v1.0.0-draft', 4, 'Where the participant was new to the group, did they observe before intervening?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('observed_first','intervened_immediately','not_applicable','not_observable')), NULL),
  ('D8', 'v1.0.0-draft', 5, 'When cultural or contextual cues indicated a change of register was needed, did the participant adjust it?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('adjusted_register','did_not_adjust','not_applicable','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q01','a','read_and_acted'),'Where the setting had unstated norms, the participant read and acted on them.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q01','a','did_not_read'),'Where the setting had unstated norms, the participant did not read or act on them.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q01','a','not_applicable'),'No unstated norms applied to the setting in this observation.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q01','a','not_observable'),'No basis for a norm-reading determination was provided.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q02','a','adjusted'),'When the situation shifted, the participant adjusted their behavior to the new state.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q02','a','continued_on_prior_plan'),'When the situation shifted, the participant continued on the prior plan.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q02','a','not_applicable'),'No situational shift arose in this observation.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q02','a','not_observable'),'No basis for a situational-adjustment determination was provided.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q03','a','acted_consistently'),'Where authority structures applied, the participant acted consistently with them.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q03','a','disregarded'),'Where authority structures applied, the participant disregarded them.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q03','a','not_applicable'),'No authority structures applied in this observation.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q03','a','not_observable'),'No basis for an authority-consistency determination was provided.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q04','a','observed_first'),'Where the participant was new to the group, they observed before intervening.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q04','a','intervened_immediately'),'Where the participant was new to the group, they intervened immediately.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q04','a','not_applicable'),'The participant was not new to the group in this observation.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q04','a','not_observable'),'No basis for a new-to-group posture determination was provided.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q05','a','adjusted_register'),'When cultural or contextual cues indicated a change of register was needed, the participant adjusted it.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q05','a','did_not_adjust'),'When cultural or contextual cues indicated a change of register was needed, the participant did not adjust it.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q05','a','not_applicable'),'No register-adjustment cue arose in this observation.',NULL),
  ('D8','v1.0.0-draft',jsonb_build_object('q','D8-Q05','a','not_observable'),'No basis for a register-adjustment determination was provided.',NULL);

-- ============================================================================
-- D9 · Prioritization & Time Management
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D9', 'v1.0.0-draft', 1, 'Faced with competing demands, did the participant prioritize the ones that materially affected the outcome?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('prioritized_material','prioritized_incidental','not_applicable','not_observable')), NULL),
  ('D9', 'v1.0.0-draft', 2, 'When time was constrained, did the participant sequence work in a way that used the available time well?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('sequenced_effectively','sequenced_poorly','not_applicable','not_observable')), NULL),
  ('D9', 'v1.0.0-draft', 3, 'Did the participant surface unrealistic timelines rather than commit and miss them?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('surfaced_early','committed_and_missed','not_applicable','not_observable')), NULL),
  ('D9', 'v1.0.0-draft', 4, 'Where reprioritization was needed mid-task, did the participant carry it out?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('reprioritized','continued_on_prior_priorities','no_reprioritization_needed','not_observable')), NULL),
  ('D9', 'v1.0.0-draft', 5, 'Where a demand was outside the participant''s remit, did they decline or redirect it rather than absorb it silently?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('declined_or_redirected','absorbed_silently','not_applicable','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q01','a','prioritized_material'),'Faced with competing demands, the participant prioritized the ones that materially affected the outcome.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q01','a','prioritized_incidental'),'Faced with competing demands, the participant prioritized incidental ones over those that materially affected the outcome.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q01','a','not_applicable'),'No competing demands arose in this observation.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q01','a','not_observable'),'No basis for a prioritization determination was provided.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q02','a','sequenced_effectively'),'When time was constrained, the participant sequenced work in a way that used the available time well.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q02','a','sequenced_poorly'),'When time was constrained, the participant sequenced work in a way that did not use the available time well.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q02','a','not_applicable'),'Time was not constrained in this observation.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q02','a','not_observable'),'No basis for a sequencing determination was provided.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q03','a','surfaced_early'),'The participant surfaced an unrealistic timeline rather than committing to it and missing it.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q03','a','committed_and_missed'),'The participant committed to an unrealistic timeline and missed it.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q03','a','not_applicable'),'No unrealistic timeline arose in this observation.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q03','a','not_observable'),'No basis for a timeline-surfacing determination was provided.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q04','a','reprioritized'),'Where reprioritization was needed mid-task, the participant carried it out.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q04','a','continued_on_prior_priorities'),'Where reprioritization was needed mid-task, the participant continued on prior priorities.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q04','a','no_reprioritization_needed'),'No reprioritization was needed in this observation.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q04','a','not_observable'),'No basis for a mid-task reprioritization determination was provided.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q05','a','declined_or_redirected'),'Where a demand was outside the participant''s remit, the participant declined or redirected it.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q05','a','absorbed_silently'),'Where a demand was outside the participant''s remit, the participant absorbed it silently.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q05','a','not_applicable'),'No out-of-remit demand arose in this observation.',NULL),
  ('D9','v1.0.0-draft',jsonb_build_object('q','D9-Q05','a','not_observable'),'No basis for an out-of-remit-demand determination was provided.',NULL);

-- ============================================================================
-- D10 · Professional Boundaries
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D10', 'v1.0.0-draft', 1, 'In workplace relationships, did the participant''s conduct maintain the boundary appropriate to the professional role?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('maintained_boundary','crossed_boundary','not_applicable','not_observable')), NULL),
  ('D10', 'v1.0.0-draft', 2, 'Where personal and professional interests could conflict, did the participant declare or avoid the conflict?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('declared_or_avoided','acted_on_conflict','no_conflict_arose','not_observable')), NULL),
  ('D10', 'v1.0.0-draft', 3, 'Where a request was outside the professional relationship, did the participant decline it in a way that preserved the relationship?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('declined_and_preserved','accepted_beyond_role','not_applicable','not_observable')), NULL),
  ('D10', 'v1.0.0-draft', 4, 'Did the participant respect others'' stated boundaries when they were raised?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('respected_boundaries','disregarded_boundaries','no_boundary_raised','not_observable')), NULL),
  ('D10', 'v1.0.0-draft', 5, 'When social dynamics pulled the interaction toward the informal, did the participant hold the professional register where it was warranted?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('held_professional_register','drifted_informal','not_applicable','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q01','a','maintained_boundary'),'In workplace relationships, the participant''s conduct maintained the boundary appropriate to the professional role.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q01','a','crossed_boundary'),'In workplace relationships, the participant''s conduct crossed the boundary appropriate to the professional role.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q01','a','not_applicable'),'No relevant workplace relationship arose in this observation.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q01','a','not_observable'),'No basis for a professional-boundary determination was provided.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q02','a','declared_or_avoided'),'Where personal and professional interests could conflict, the participant declared or avoided the conflict.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q02','a','acted_on_conflict'),'Where personal and professional interests could conflict, the participant acted on the conflict without declaring it.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q02','a','no_conflict_arose'),'No conflict between personal and professional interests arose in this observation.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q02','a','not_observable'),'No basis for a conflict-of-interest determination was provided.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q03','a','declined_and_preserved'),'Where a request was outside the professional relationship, the participant declined it in a way that preserved the relationship.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q03','a','accepted_beyond_role'),'Where a request was outside the professional relationship, the participant accepted the request beyond the role.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q03','a','not_applicable'),'No request outside the professional relationship arose in this observation.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q03','a','not_observable'),'No basis for an out-of-role-request determination was provided.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q04','a','respected_boundaries'),'When others'' boundaries were raised, the participant respected them.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q04','a','disregarded_boundaries'),'When others'' boundaries were raised, the participant disregarded them.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q04','a','no_boundary_raised'),'No boundaries were raised by others in this observation.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q04','a','not_observable'),'No basis for a respect-of-others-boundaries determination was provided.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q05','a','held_professional_register'),'When social dynamics pulled the interaction toward the informal, the participant held the professional register where it was warranted.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q05','a','drifted_informal'),'When social dynamics pulled the interaction toward the informal, the participant drifted with them.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q05','a','not_applicable'),'No informal drift pressure arose in this observation.',NULL),
  ('D10','v1.0.0-draft',jsonb_build_object('q','D10-Q05','a','not_observable'),'No basis for a register-holding determination was provided.',NULL);

-- ============================================================================
-- D11 · Creative Problem-Solving
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D11', 'v1.0.0-draft', 1, 'When a standard approach did not work, did the participant look for a different path rather than repeat the standard one?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('looked_for_different_path','repeated_standard','no_standard_approach_failed','not_observable')), NULL),
  ('D11', 'v1.0.0-draft', 2, 'Did the participant use available resources in a way that fit the constraint?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('used_resources_fittingly','did_not','not_applicable','not_observable')), NULL),
  ('D11', 'v1.0.0-draft', 3, 'Where the participant produced an alternative approach, did it address the actual constraint rather than a preferred version of it?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('addressed_actual_constraint','addressed_preferred_version','not_applicable','not_observable')), NULL),
  ('D11', 'v1.0.0-draft', 4, 'Did the participant test the alternative approach before committing to it at scale?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('tested_before_scaling','committed_untested','not_applicable','not_observable')), NULL),
  ('D11', 'v1.0.0-draft', 5, 'Where the alternative approach failed, did the participant recognize the failure quickly?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('recognized_quickly','persisted_past_failure','not_applicable','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q01','a','looked_for_different_path'),'When a standard approach did not work, the participant looked for a different path rather than repeating the standard one.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q01','a','repeated_standard'),'When a standard approach did not work, the participant repeated the standard approach.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q01','a','no_standard_approach_failed'),'No standard approach failed in this observation.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q01','a','not_observable'),'No basis for a different-path determination was provided.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q02','a','used_resources_fittingly'),'The participant used available resources in a way that fit the constraint.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q02','a','did_not'),'The participant did not use available resources in a way that fit the constraint.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q02','a','not_applicable'),'No relevant constraint or resource choice arose in this observation.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q02','a','not_observable'),'No basis for a resource-use determination was provided.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q03','a','addressed_actual_constraint'),'Where the participant produced an alternative approach, it addressed the actual constraint.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q03','a','addressed_preferred_version'),'Where the participant produced an alternative approach, it addressed a preferred version of the constraint rather than the actual one.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q03','a','not_applicable'),'No alternative approach was produced in this observation.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q03','a','not_observable'),'No basis for a constraint-addressed determination was provided.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q04','a','tested_before_scaling'),'The participant tested the alternative approach before committing to it at scale.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q04','a','committed_untested'),'The participant committed to the alternative approach at scale without testing it.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q04','a','not_applicable'),'The alternative approach did not admit staged testing in this observation.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q04','a','not_observable'),'No basis for a test-before-scale determination was provided.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q05','a','recognized_quickly'),'Where the alternative approach failed, the participant recognized the failure quickly.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q05','a','persisted_past_failure'),'Where the alternative approach failed, the participant persisted past the failure.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q05','a','not_applicable'),'The alternative approach did not fail in this observation.',NULL),
  ('D11','v1.0.0-draft',jsonb_build_object('q','D11-Q05','a','not_observable'),'No basis for a failure-recognition determination was provided.',NULL);

-- ============================================================================
-- D12 · Customer & Service Focus
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D12', 'v1.0.0-draft', 1, 'Did the participant identify what the stakeholder actually needed, rather than what was easier to deliver?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('identified_actual_need','delivered_easier_thing','not_applicable','not_observable')), NULL),
  ('D12', 'v1.0.0-draft', 2, 'Did the participant deliver on what was promised to the stakeholder?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('delivered_as_promised','did_not_deliver','not_applicable','not_observable')), NULL),
  ('D12', 'v1.0.0-draft', 3, 'Where the stakeholder''s request could not be met, did the participant say so and explain why?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('said_so_and_explained','avoided_or_deflected','no_such_request','not_observable')), NULL),
  ('D12', 'v1.0.0-draft', 4, 'Did the participant follow up to confirm the stakeholder''s need was addressed rather than assuming it was?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('followed_up','did_not_follow_up','not_applicable','not_observable')), NULL),
  ('D12', 'v1.0.0-draft', 5, 'In the interaction with the stakeholder, did the participant treat them as a person rather than as a ticket?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('treated_as_person','treated_as_transaction','not_applicable','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q01','a','identified_actual_need'),'The participant identified what the stakeholder actually needed, rather than what was easier to deliver.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q01','a','delivered_easier_thing'),'The participant delivered what was easier rather than what the stakeholder actually needed.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q01','a','not_applicable'),'No stakeholder-needs identification arose in this observation.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q01','a','not_observable'),'No basis for a stakeholder-need determination was provided.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q02','a','delivered_as_promised'),'The participant delivered on what was promised to the stakeholder.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q02','a','did_not_deliver'),'The participant did not deliver on what was promised to the stakeholder.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q02','a','not_applicable'),'No stakeholder promise arose in this observation.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q02','a','not_observable'),'No basis for a promise-delivery determination was provided.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q03','a','said_so_and_explained'),'Where the stakeholder''s request could not be met, the participant said so and explained why.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q03','a','avoided_or_deflected'),'Where the stakeholder''s request could not be met, the participant avoided or deflected the answer.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q03','a','no_such_request'),'No unmeetable stakeholder request arose in this observation.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q03','a','not_observable'),'No basis for an unmeetable-request handling determination was provided.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q04','a','followed_up'),'The participant followed up to confirm the stakeholder''s need was addressed.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q04','a','did_not_follow_up'),'The participant did not follow up to confirm the stakeholder''s need was addressed.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q04','a','not_applicable'),'No follow-up opportunity arose in this observation.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q04','a','not_observable'),'No basis for a follow-up determination was provided.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q05','a','treated_as_person'),'In the interaction with the stakeholder, the participant treated them as a person rather than as a ticket.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q05','a','treated_as_transaction'),'In the interaction with the stakeholder, the participant treated them as a transaction.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q05','a','not_applicable'),'No direct stakeholder interaction arose in this observation.',NULL),
  ('D12','v1.0.0-draft',jsonb_build_object('q','D12-Q05','a','not_observable'),'No basis for a stakeholder-treatment determination was provided.',NULL);

-- ============================================================================
-- D13 · Influence & Persuasion
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D13', 'v1.0.0-draft', 1, 'Where the participant needed cooperation from someone with no reporting relationship, did they seek that cooperation directly?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('sought_cooperation_directly','worked_around_person','not_applicable','not_observable')), NULL),
  ('D13', 'v1.0.0-draft', 2, 'In seeking cooperation, did the participant articulate the interest they were asking the other party to serve?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('articulated_interest','did_not_articulate','not_applicable','not_observable')), NULL),
  ('D13', 'v1.0.0-draft', 3, 'Where the other party''s interest differed, did the participant find or offer a form of alignment rather than push through?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('found_or_offered_alignment','pushed_through','not_applicable','not_observable')), NULL),
  ('D13', 'v1.0.0-draft', 4, 'Did the participant secure the cooperation needed to move the task forward?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('secured_cooperation','did_not_secure','not_applicable','not_observable')), NULL),
  ('D13', 'v1.0.0-draft', 5, 'Did the participant use accurate representations of shared work and prior conversations when seeking that cooperation?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('used_accurate_representations','used_inaccurate_representations','not_applicable','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q01','a','sought_cooperation_directly'),'Where the participant needed cooperation from someone with no reporting relationship, they sought that cooperation directly.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q01','a','worked_around_person'),'Where the participant needed cooperation from someone with no reporting relationship, they worked around the person instead of seeking cooperation.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q01','a','not_applicable'),'No cooperation from a person without a reporting relationship was needed in this observation.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q01','a','not_observable'),'No basis for a cooperation-seeking determination was provided.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q02','a','articulated_interest'),'In seeking cooperation, the participant articulated the interest they were asking the other party to serve.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q02','a','did_not_articulate'),'In seeking cooperation, the participant did not articulate the interest they were asking the other party to serve.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q02','a','not_applicable'),'No cooperation-seeking arose in this observation.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q02','a','not_observable'),'No basis for an interest-articulation determination was provided.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q03','a','found_or_offered_alignment'),'Where the other party''s interest differed, the participant found or offered a form of alignment.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q03','a','pushed_through'),'Where the other party''s interest differed, the participant pushed through rather than seeking alignment.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q03','a','not_applicable'),'No interest divergence arose in this observation.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q03','a','not_observable'),'No basis for an alignment determination was provided.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q04','a','secured_cooperation'),'The participant secured the cooperation needed to move the task forward.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q04','a','did_not_secure'),'The participant did not secure the cooperation needed to move the task forward.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q04','a','not_applicable'),'No cooperation was needed to move the task forward in this observation.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q04','a','not_observable'),'No basis for a cooperation-secured determination was provided.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q05','a','used_accurate_representations'),'When seeking cooperation, the participant used accurate representations of shared work and prior conversations.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q05','a','used_inaccurate_representations'),'When seeking cooperation, the participant used inaccurate representations of shared work or prior conversations.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q05','a','not_applicable'),'No representations of shared work or prior conversations were used in this observation.',NULL),
  ('D13','v1.0.0-draft',jsonb_build_object('q','D13-Q05','a','not_observable'),'No basis for a representation-accuracy determination was provided.',NULL);

-- ============================================================================
-- D14 · Relationship Building
-- ============================================================================

INSERT INTO t3a_determination_question (dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at) VALUES
  ('D14', 'v1.0.0-draft', 1, 'Did the participant maintain contact with people they had previously worked with in a way appropriate to the professional relationship?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('maintained_contact_appropriately','did_not_maintain','not_applicable','not_observable')), NULL),
  ('D14', 'v1.0.0-draft', 2, 'When another person''s work created value for the participant, did the participant acknowledge that contribution?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('acknowledged_contribution','did_not_acknowledge','no_such_contribution','not_observable')), NULL),
  ('D14', 'v1.0.0-draft', 3, 'Did the participant extend help to others in ways that did not require immediate reciprocation?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('extended_help','conditioned_on_reciprocation','not_applicable','not_observable')), NULL),
  ('D14', 'v1.0.0-draft', 4, 'Where the participant was introduced to a new professional contact, did they respond in a way that could sustain a future working relationship?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('responded_sustainingly','responded_transactionally','not_applicable','not_observable')), NULL),
  ('D14', 'v1.0.0-draft', 5, 'Did the participant follow through on a stated commitment made in the course of a working relationship?',
   jsonb_build_object('kind','enum','cardinality','single_select','options', jsonb_build_array('followed_through_on_commitment','did_not_follow_through','no_commitment_made','not_observable')), NULL);

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q01','a','maintained_contact_appropriately'),'The participant maintained contact with people they had previously worked with in a way appropriate to the professional relationship.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q01','a','did_not_maintain'),'The participant did not maintain contact with people they had previously worked with.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q01','a','not_applicable'),'No prior working relationships were in view in this observation.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q01','a','not_observable'),'No basis for a contact-maintenance determination was provided.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q02','a','acknowledged_contribution'),'When another person''s work created value for the participant, the participant acknowledged that contribution.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q02','a','did_not_acknowledge'),'When another person''s work created value for the participant, the participant did not acknowledge that contribution.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q02','a','no_such_contribution'),'No such contribution arose in this observation.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q02','a','not_observable'),'No basis for a contribution-acknowledgement determination was provided.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q03','a','extended_help'),'The participant extended help to others in ways that did not require immediate reciprocation.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q03','a','conditioned_on_reciprocation'),'The participant extended help only on conditions of immediate reciprocation.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q03','a','not_applicable'),'No opportunity to extend help arose in this observation.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q03','a','not_observable'),'No basis for a help-extension determination was provided.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q04','a','responded_sustainingly'),'Where the participant was introduced to a new professional contact, they responded in a way that could sustain a future working relationship.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q04','a','responded_transactionally'),'Where the participant was introduced to a new professional contact, they responded transactionally.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q04','a','not_applicable'),'No introduction to a new professional contact arose in this observation.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q04','a','not_observable'),'No basis for a new-contact response determination was provided.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q05','a','followed_through_on_commitment'),'The participant followed through on a stated commitment made in the course of a working relationship.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q05','a','did_not_follow_through'),'The participant did not follow through on a stated commitment made in the course of a working relationship.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q05','a','no_commitment_made'),'No stated commitment was made in this observation.',NULL),
  ('D14','v1.0.0-draft',jsonb_build_object('q','D14-Q05','a','not_observable'),'No basis for a commitment-follow-through determination was provided.',NULL);

NOTIFY pgrst, 'reload schema';
