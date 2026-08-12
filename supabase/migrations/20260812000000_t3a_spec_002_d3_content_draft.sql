-- ============================================================================
-- T3A-DEV-SPEC-002 · Track B · Dimension 3 (Execution Reliability)
-- ============================================================================
-- Same atomic factual-determination architecture as D1 (approved) and
-- D2 (draft, T3A-DEV-RESP-002 § 5). Delivering consistent, quality work
-- on time without constant supervision.
--
-- IMPORTANT — DRAFT, NOT APPROVED
--   Rows land with approved_at = NULL. D3 stays NOT-OBSERVABLE — the
--   §7.3.1 refusal panel continues to render for D3 until the founder
--   ratifies the content via t3a_ratify_question_set (installed in the
--   D2 migration).
--
--   The founder ratifies by running:
--     SELECT t3a_ratify_question_set('D3', 'v1.0.0-draft', 'v1.0.0', auth.uid());
--
--   Authorship pattern is the developer's draft using the D1 schema as
--   a template; founder review may amend question wording, answer
--   options, or statement bodies before approval.
-- ============================================================================

-- ============================================================================
-- § 1  QUESTIONS · D3 v1.0.0-draft
-- ============================================================================

INSERT INTO t3a_determination_question (
  dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at
) VALUES
  ('D3', 'v1.0.0-draft', 1,
   'Did the work the participant delivered meet the stated standard of the deliverable?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('met_standard','did_not_meet_standard','not_applicable','not_observable')
   ),
   NULL),
  ('D3', 'v1.0.0-draft', 2,
   'Where a deadline applied, was the work delivered by the stated deadline?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('delivered_on_time','delivered_late','not_applicable','not_observable')
   ),
   NULL),
  ('D3', 'v1.0.0-draft', 3,
   'Did the participant complete the required work without ongoing supervisory prompting?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('completed_without_prompting','required_ongoing_prompting','not_applicable','not_observable')
   ),
   NULL),
  ('D3', 'v1.0.0-draft', 4,
   'Was the participant''s work output consistent across the observation period?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('consistent','inconsistent','not_applicable','not_observable')
   ),
   NULL),
  ('D3', 'v1.0.0-draft', 5,
   'Where an obstacle arose that would affect delivery, did the participant communicate it in time for it to be addressed?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('communicated_in_time','did_not_communicate_in_time','no_obstacle_arose','not_observable')
   ),
   NULL);

-- ============================================================================
-- § 2  STATEMENT LIBRARY · D3 v1.0.0-draft
-- ============================================================================

INSERT INTO t3a_statement_library (
  dimension_id, question_set_version, answer_key, statement_body, approved_at
) VALUES
  -- Q01 · Standard of the deliverable
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q01','a','met_standard'),
   'The work the participant delivered met the stated standard of the deliverable.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q01','a','did_not_meet_standard'),
   'The work the participant delivered did not meet the stated standard of the deliverable.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q01','a','not_applicable'),
   'No stated standard applied to the deliverable in this situation.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q01','a','not_observable'),
   'No basis for a standard-of-deliverable determination was provided.', NULL),

  -- Q02 · Deadline
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q02','a','delivered_on_time'),
   'Where a deadline applied, the participant delivered the work by the stated deadline.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q02','a','delivered_late'),
   'Where a deadline applied, the participant delivered the work after the stated deadline.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q02','a','not_applicable'),
   'No deadline applied to the deliverable in this situation.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q02','a','not_observable'),
   'No basis for a deadline-adherence determination was provided.', NULL),

  -- Q03 · Working without supervision
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q03','a','completed_without_prompting'),
   'The participant completed the required work without ongoing supervisory prompting.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q03','a','required_ongoing_prompting'),
   'The participant required ongoing supervisory prompting to complete the required work.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q03','a','not_applicable'),
   'No supervisory context applied in this observation.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q03','a','not_observable'),
   'No basis for a self-directed-completion determination was provided.', NULL),

  -- Q04 · Consistency
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q04','a','consistent'),
   'The participant''s work output was consistent across the observation period.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q04','a','inconsistent'),
   'The participant''s work output was inconsistent across the observation period.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q04','a','not_applicable'),
   'The observation period was too short to support a consistency determination.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q04','a','not_observable'),
   'No basis for a consistency determination was provided.', NULL),

  -- Q05 · Communicating obstacles
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q05','a','communicated_in_time'),
   'Where an obstacle arose that would affect delivery, the participant communicated it in time for it to be addressed.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q05','a','did_not_communicate_in_time'),
   'Where an obstacle arose that would affect delivery, the participant did not communicate it in time for it to be addressed.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q05','a','no_obstacle_arose'),
   'No obstacle affecting delivery arose in this situation.', NULL),
  ('D3', 'v1.0.0-draft', jsonb_build_object('q','D3-Q05','a','not_observable'),
   'No basis for an obstacle-communication determination was provided.', NULL);

NOTIFY pgrst, 'reload schema';
