-- ============================================================================
-- T3A-DEV-SPEC-002 · Track B · Dimension 4 (Communication Under Pressure)
-- ============================================================================
-- Same atomic factual-determination architecture as D1..D3. Clear, timely
-- messages with appropriate tone when stakes are high.
--
-- IMPORTANT — DRAFT, NOT APPROVED
--   Rows land with approved_at = NULL. D4 stays NOT-OBSERVABLE until the
--   founder ratifies via t3a_ratify_question_set (installed in the D2
--   migration).
--
--   Founder ratifies by running:
--     SELECT t3a_ratify_question_set('D4', 'v1.0.0-draft', 'v1.0.0', auth.uid());
-- ============================================================================

-- ============================================================================
-- § 1  QUESTIONS · D4 v1.0.0-draft
-- ============================================================================

INSERT INTO t3a_determination_question (
  dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at
) VALUES
  ('D4', 'v1.0.0-draft', 1,
   'Was the participant''s message clear enough for the recipient to act on it?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('clear_and_actionable','unclear_or_ambiguous','not_applicable','not_observable')
   ),
   NULL),
  ('D4', 'v1.0.0-draft', 2,
   'Was the message delivered in time for it to be useful in the high-stakes situation?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('delivered_in_time','delivered_too_late','not_applicable','not_observable')
   ),
   NULL),
  ('D4', 'v1.0.0-draft', 3,
   'Did the participant''s tone remain appropriate to the professional relationship and the stakes involved?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('tone_appropriate','tone_inappropriate','not_applicable','not_observable')
   ),
   NULL),
  ('D4', 'v1.0.0-draft', 4,
   'Did the participant communicate to the appropriate audience through the appropriate channel?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('appropriate_audience_and_channel','inappropriate_audience_or_channel','not_applicable','not_observable')
   ),
   NULL),
  ('D4', 'v1.0.0-draft', 5,
   'Where the participant was subject to provocation or hostile response, did their communication avoid escalating the situation?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('did_not_escalate','escalated','no_provocation_occurred','not_observable')
   ),
   NULL);

-- ============================================================================
-- § 2  STATEMENT LIBRARY · D4 v1.0.0-draft
-- ============================================================================

INSERT INTO t3a_statement_library (
  dimension_id, question_set_version, answer_key, statement_body, approved_at
) VALUES
  -- Q01 · Clarity
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q01','a','clear_and_actionable'),
   'The participant''s message was clear enough for the recipient to act on it.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q01','a','unclear_or_ambiguous'),
   'The participant''s message was not clear enough for the recipient to act on it.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q01','a','not_applicable'),
   'No message from the participant was required in this situation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q01','a','not_observable'),
   'No basis for a message-clarity determination was provided.', NULL),

  -- Q02 · Timeliness
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q02','a','delivered_in_time'),
   'The message was delivered in time to be useful in the high-stakes situation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q02','a','delivered_too_late'),
   'The message was delivered too late to be useful in the high-stakes situation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q02','a','not_applicable'),
   'No time-sensitive message was required in this situation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q02','a','not_observable'),
   'No basis for a message-timeliness determination was provided.', NULL),

  -- Q03 · Tone
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q03','a','tone_appropriate'),
   'The participant''s tone remained appropriate to the professional relationship and the stakes involved.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q03','a','tone_inappropriate'),
   'The participant''s tone was not appropriate to the professional relationship and the stakes involved.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q03','a','not_applicable'),
   'No tonal choice arose in this observation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q03','a','not_observable'),
   'No basis for a tone determination was provided.', NULL),

  -- Q04 · Audience + channel
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q04','a','appropriate_audience_and_channel'),
   'The participant communicated to the appropriate audience through the appropriate channel.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q04','a','inappropriate_audience_or_channel'),
   'The participant communicated to an inappropriate audience, or through an inappropriate channel, for the situation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q04','a','not_applicable'),
   'No audience or channel choice arose in this observation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q04','a','not_observable'),
   'No basis for an audience-and-channel determination was provided.', NULL),

  -- Q05 · Non-escalation
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q05','a','did_not_escalate'),
   'Where the participant was subject to provocation or hostile response, their communication did not escalate the situation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q05','a','escalated'),
   'Where the participant was subject to provocation or hostile response, their communication escalated the situation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q05','a','no_provocation_occurred'),
   'No provocation or hostile response was directed at the participant in this observation.', NULL),
  ('D4', 'v1.0.0-draft', jsonb_build_object('q','D4-Q05','a','not_observable'),
   'No basis for a non-escalation determination was provided.', NULL);

NOTIFY pgrst, 'reload schema';
