-- ============================================================================
-- T3A-DEV-SPEC-002 · Track B · Dimension 2 (Accountability & Ownership)
-- ============================================================================
-- Drafted using the atomic factual-determination architecture established
-- for D1 in T3A-DEV-RESP-001. Per T3A-DEV-RESP-002 § 5, D2 proceeds now
-- because it is required under any pilot-scenario ordering.
--
-- IMPORTANT — DRAFT, NOT APPROVED
--   Rows land with approved_at = NULL. The mentor Determinations page
--   filters on approved_at IS NOT NULL, so D2 stays NOT-OBSERVABLE — the
--   §7.3.1 refusal panel continues to render for D2 until the founder
--   ratifies the content and sets approved_at on each row.
--
--   Ratification is a founder action, not a developer action. Recorded as
--   an explicit approval event per §21.4.
--
--   Authorship pattern is the developer's draft using the D1 schema as a
--   template; founder review may amend question wording, answer options,
--   or statement bodies before approval.
-- ============================================================================

-- ============================================================================
-- § 1  QUESTIONS · D2 v1.0.0-draft
-- ============================================================================

INSERT INTO t3a_determination_question (
  dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at
) VALUES
  ('D2', 'v1.0.0-draft', 1,
   'When the outcome at issue was attributable to the participant''s actions, did the participant take responsibility for that outcome?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('took_responsibility','deflected','not_applicable','not_observable')
   ),
   NULL),
  ('D2', 'v1.0.0-draft', 2,
   'Where the participant had committed to a task or timeline, did they follow through on that commitment?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('followed_through','did_not_follow_through','not_applicable','not_observable')
   ),
   NULL),
  ('D2', 'v1.0.0-draft', 3,
   'When the participant made an error in the situation, did they acknowledge it?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('acknowledged','did_not_acknowledge','no_error_occurred','not_observable')
   ),
   NULL),
  ('D2', 'v1.0.0-draft', 4,
   'Where an error required correction, did the participant take the corrective action within their scope?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('took_corrective_action','did_not_take_action','not_applicable','not_observable')
   ),
   NULL),
  ('D2', 'v1.0.0-draft', 5,
   'Did the participant address the situation without waiting for external prompting to do so?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('acted_without_prompting','only_after_prompting','not_applicable','not_observable')
   ),
   NULL);

-- ============================================================================
-- § 2  STATEMENT LIBRARY · D2 v1.0.0-draft
-- ============================================================================
-- One statement per (question, chosen_answer). Same register as D1 — report
-- the determination and nothing beyond it. not_applicable / not_observable
-- never silently become adverse.
-- ============================================================================

INSERT INTO t3a_statement_library (
  dimension_id, question_set_version, answer_key, statement_body, approved_at
) VALUES
  -- Q01 · Taking responsibility
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q01','a','took_responsibility'),
   'Where the outcome at issue was attributable to the participant''s actions, the participant took responsibility for that outcome.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q01','a','deflected'),
   'Where the outcome at issue was attributable to the participant''s actions, the participant deflected responsibility for that outcome.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q01','a','not_applicable'),
   'No outcome attributable to the participant''s actions arose in this situation.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q01','a','not_observable'),
   'No basis for a taking-responsibility determination was provided.', NULL),

  -- Q02 · Follow-through
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q02','a','followed_through'),
   'Where the participant had committed to a task or timeline, the participant followed through on that commitment.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q02','a','did_not_follow_through'),
   'Where the participant had committed to a task or timeline, the participant did not follow through on that commitment.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q02','a','not_applicable'),
   'No commitment to a task or timeline arose in this situation.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q02','a','not_observable'),
   'No basis for a follow-through determination was provided.', NULL),

  -- Q03 · Acknowledging errors
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q03','a','acknowledged'),
   'Where the participant made an error in the situation, the participant acknowledged it.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q03','a','did_not_acknowledge'),
   'Where the participant made an error in the situation, the participant did not acknowledge it.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q03','a','no_error_occurred'),
   'No error by the participant occurred in this situation.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q03','a','not_observable'),
   'No basis for an error-acknowledgement determination was provided.', NULL),

  -- Q04 · Corrective action
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q04','a','took_corrective_action'),
   'Where an error required correction, the participant took the corrective action within their scope.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q04','a','did_not_take_action'),
   'Where an error required correction, the participant did not take the corrective action within their scope.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q04','a','not_applicable'),
   'No error requiring correction arose in this situation.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q04','a','not_observable'),
   'No basis for a corrective-action determination was provided.', NULL),

  -- Q05 · Ownership without external prompting
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q05','a','acted_without_prompting'),
   'The participant addressed the situation without waiting for external prompting.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q05','a','only_after_prompting'),
   'The participant addressed the situation only after external prompting.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q05','a','not_applicable'),
   'No addressing of the situation was required in this observation.', NULL),
  ('D2', 'v1.0.0-draft', jsonb_build_object('q','D2-Q05','a','not_observable'),
   'No basis for an unprompted-ownership determination was provided.', NULL);

-- ============================================================================
-- § 3  RATIFICATION HELPER
-- ============================================================================
-- Founder ratifies the draft by running:
--   SELECT t3a_ratify_question_set('D2', 'v1.0.0-draft', 'v1.0.0', auth.uid());
-- The helper renames the question_set_version, stamps approved_at + approved_by
-- on every question and statement in one transaction, and writes an event log
-- entry.  Refuses if the caller is not admin.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_ratify_question_set(
  p_dimension_id     t3a_dimension_code,
  p_draft_version    text,
  p_approved_version text,
  p_approver         uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_q_count int;
  v_s_count int;
BEGIN
  IF NOT t3a_is_admin() THEN
    PERFORM t3a_raise('§21.4 ratification', 'admin role required to ratify a question set');
  END IF;

  UPDATE t3a_determination_question
     SET question_set_version = p_approved_version,
         approved_at          = now(),
         approved_by          = p_approver
   WHERE dimension_id = p_dimension_id
     AND question_set_version = p_draft_version
     AND approved_at IS NULL;
  GET DIAGNOSTICS v_q_count = ROW_COUNT;

  UPDATE t3a_statement_library
     SET question_set_version = p_approved_version,
         approved_at          = now(),
         approved_by          = p_approver
   WHERE dimension_id = p_dimension_id
     AND question_set_version = p_draft_version
     AND approved_at IS NULL;
  GET DIAGNOSTICS v_s_count = ROW_COUNT;

  IF v_q_count = 0 AND v_s_count = 0 THEN
    PERFORM t3a_raise('§21.4 ratification',
      'no draft rows found for that dimension and draft version - nothing to ratify');
  END IF;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'question_set_ratified', 'GOVERNANCE', 'ADMIN', p_approver,
    p_approver, 'determination_question_set', p_approver,
    jsonb_build_object(
      'dimension_id', p_dimension_id,
      'draft_version', p_draft_version,
      'approved_version', p_approved_version,
      'questions_ratified', v_q_count,
      'statements_ratified', v_s_count
    ),
    encode(digest(p_dimension_id::text || p_approved_version || now()::text, 'sha256'), 'hex')
  );
END;
$$;

COMMENT ON FUNCTION t3a_ratify_question_set(t3a_dimension_code, text, text, uuid) IS
  'One-shot ratification helper. Renames the draft version and stamps approved_at + approved_by on every question and statement in one transaction. Admin-only. Writes a governance event to t3a_event_log so the audit trail shows who approved what and when.';

NOTIFY pgrst, 'reload schema';
