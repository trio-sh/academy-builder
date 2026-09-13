-- =====================================================================
-- T3A-D1-EXEC-001 sections 5.2, 5.3 and 5.4
--   The question object register, the thirteen capture sets, and the
--   branch rules as serving logic.
--
-- Section 5.3: "Per-source applicability governs serving. Every active
-- source carries a per-question Direct / Conditional / Not Served table,
-- and that table alone governs." BR-08 says the same in bold: SOURCE
-- APPLICABILITY GOVERNS. Read what each source sheet carries; never
-- infer service or non-service from the Stage. The serving function
-- below therefore takes the source sheet, never the Stage.
--
-- Section 5.4: a question not served produces no answer and no missing
-- state. It is absent because it never applied, and the composed
-- statement must not reference it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The registers
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_question_object (
  question_code          text PRIMARY KEY,
  conduct_element        text NOT NULL,
  answer_type            text NOT NULL,
  applicability          text NOT NULL,
  missing_state_eligible boolean NOT NULL,
  display_order          integer NOT NULL
);

COMMENT ON TABLE public.t3a_d1_question_object IS
  'Section 5.2. Nine primary question objects and six conditional children. Missing-state eligibility is a property of the question, and a missing state is metadata on the field, never a value inside the answer enumeration.';

CREATE TABLE IF NOT EXISTS public.t3a_d1_capture_set (
  capture_set_code   text PRIMARY KEY,
  title              text NOT NULL,
  applicability_note text,
  display_order      integer NOT NULL
);

COMMENT ON TABLE public.t3a_d1_capture_set IS
  'Section 5.3. The thirteen sets the mentor selects from, identical across every source, rendered at the beat rather than repeated in each source.';

CREATE TABLE IF NOT EXISTS public.t3a_d1_capture_line (
  capture_line_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capture_set_code text NOT NULL REFERENCES public.t3a_d1_capture_set(capture_set_code) ON DELETE RESTRICT,
  line_text        text NOT NULL,
  line_order       integer NOT NULL,
  UNIQUE (capture_set_code, line_order)
);

COMMENT ON TABLE public.t3a_d1_capture_line IS
  'Section 5.3. Within every set each line states exactly which combination it covers: no line is a superset of another and no two can be true at once. The table deliberately carries NO expected response, no strong answer, no red flag and no column that could indicate which line is the better one. A mentor who knows the preferred answer will find it, and two mentors who both know it agree with each other about the participant rather than about what happened.';

CREATE TABLE IF NOT EXISTS public.t3a_d1_branch_rule (
  rule_code      text PRIMARY KEY,
  rule_condition text NOT NULL,
  rule_effect    text NOT NULL,
  rule_order     integer NOT NULL
);

COMMENT ON TABLE public.t3a_d1_branch_rule IS
  'Section 5.4. The rules are held as data so the serving logic and the issued instruction cannot drift apart.';

ALTER TABLE public.t3a_d1_question_object ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_capture_set     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_capture_line    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_branch_rule     ENABLE ROW LEVEL SECURITY;

DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['t3a_d1_question_object','t3a_d1_capture_set',
                           't3a_d1_capture_line','t3a_d1_branch_rule'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_read ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_write ON public.%I FOR ALL
         USING (public.t3a_is_service_context())
         WITH CHECK (public.t3a_is_service_context())', t, t);
  END LOOP;
END;
$rls$;

-- ---------------------------------------------------------------------
-- 2. Serving — the branch rules, applied to the source sheet
-- ---------------------------------------------------------------------

-- Returns one row per question object with its serving decision and the
-- rule that produced it. A question that is not served carries no answer
-- and no missing state, and the reason names the rule so the interface
-- never has to guess.
CREATE OR REPLACE FUNCTION public.t3a_d1_served_questions(
  p_source_sheet jsonb,
  p_answers      jsonb DEFAULT '{}'::jsonb)
RETURNS TABLE (question_code text, served boolean, reason_code text, bound_family text)
LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  has_enquiry     boolean := p_source_sheet ? 'enquiry_point';
  has_info        boolean := p_source_sheet ? 'information_made_available';
  has_items       boolean := p_source_sheet ? 'material_items';
  has_support     boolean := p_source_sheet ? 'attribution_support_set';
  has_routes      boolean := p_source_sheet ? 'available_routes';
  has_test_point  boolean := p_source_sheet ? 'account_test_point';
  has_post_test   boolean := p_source_sheet ? 'post_test_account_opportunity';
  has_interest    boolean := p_source_sheet ? 'bearing_interest';
  actor_available boolean := lower(coalesce(p_source_sheet ->> 'accountable_actor_available','')) LIKE 'true%';
  time_called     boolean := lower(coalesce(p_source_sheet ->> 'time_reference_called_for','')) LIKE 'true%';

  a_03a text := p_answers ->> 'Q-D1-03a';
  a_04b text := p_answers ->> 'Q-D1-04b';
  a_05a text := p_answers ->> 'Q-D1-05a';
  a_08a text := p_answers ->> 'Q-D1-08a';

  -- A parent carrying a missing state means the child is never reached:
  -- not served, no child row, and no missing state written for the child.
  -- coalesce is load-bearing: with no 'missing' object present,
  -- (p_answers -> 'missing') is NULL and NULL ? 'x' is NULL, not false.
  -- Left as NULL it propagates through the AND and every conditional
  -- child reads as not served, including the ones BR-02a and BR-02b
  -- require to be served.
  m_03a boolean := coalesce((p_answers -> 'missing') ? 'Q-D1-03a', false);
  m_04b boolean := coalesce((p_answers -> 'missing') ? 'Q-D1-04b', false);
  m_05a boolean := coalesce((p_answers -> 'missing') ? 'Q-D1-05a', false);
  m_08a boolean := coalesce((p_answers -> 'missing') ? 'Q-D1-08a', false);
BEGIN
  -- Q-D1-01 — always where the element is in play.
  RETURN QUERY SELECT 'Q-D1-01'::text, true, 'DIRECT'::text, NULL::text;

  -- Q-D1-02 — BR-07: served only where the source carries enquiry_point.
  RETURN QUERY SELECT 'Q-D1-02'::text, has_enquiry,
    CASE WHEN has_enquiry THEN 'DIRECT' ELSE 'BR-07' END, NULL::text;

  -- Q-D1-03a — served where the source carries the information and the items.
  RETURN QUERY SELECT 'Q-D1-03a'::text, (has_info AND has_items),
    CASE WHEN (has_info AND has_items) THEN 'DIRECT' ELSE 'NOT_CARRIED' END, NULL::text;

  -- Q-D1-03b1 — BR-02a: an omission, or both. BR-01 otherwise.
  RETURN QUERY SELECT 'Q-D1-03b1'::text,
    (has_info AND has_items AND NOT m_03a AND a_03a IN ('omission','both')),
    CASE
      WHEN NOT (has_info AND has_items) THEN 'NOT_CARRIED'
      WHEN m_03a THEN 'PARENT_MISSING_STATE'
      WHEN a_03a IN ('omission','both') THEN 'BR-02a'
      ELSE 'BR-01' END,
    'material_items'::text;

  -- Q-D1-03b2 — BR-02b: an unsupported claim, or both. BR-01 otherwise.
  RETURN QUERY SELECT 'Q-D1-03b2'::text,
    (has_info AND has_items AND NOT m_03a AND a_03a IN ('unsupported_claim','both')),
    CASE
      WHEN NOT (has_info AND has_items) THEN 'NOT_CARRIED'
      WHEN m_03a THEN 'PARENT_MISSING_STATE'
      WHEN a_03a IN ('unsupported_claim','both') THEN 'BR-02b'
      ELSE 'BR-01' END,
    'assertion_reference_set'::text;

  -- Q-D1-04a — always where the element is in play.
  RETURN QUERY SELECT 'Q-D1-04a'::text, true, 'DIRECT'::text, NULL::text;

  -- Q-D1-04b — served where the source carries the support set.
  RETURN QUERY SELECT 'Q-D1-04b'::text, has_support,
    CASE WHEN has_support THEN 'DIRECT' ELSE 'NOT_CARRIED' END, NULL::text;

  -- Q-D1-04b bound child — BR-06: served in BOTH the aligned state and
  -- the both-aligned-and-non-aligned state, because the resolution table
  -- needs the aligned items in each.
  RETURN QUERY SELECT 'Q-D1-04b-child'::text,
    (has_support AND NOT m_04b AND a_04b IN ('aligned','both')),
    CASE
      WHEN NOT has_support THEN 'NOT_CARRIED'
      WHEN m_04b THEN 'PARENT_MISSING_STATE'
      WHEN a_04b IN ('aligned','both') THEN 'BR-06'
      ELSE 'NOT_REACHED' END,
    'attribution_support_set'::text;

  -- Q-D1-05a — always where the element is in play.
  RETURN QUERY SELECT 'Q-D1-05a'::text, true, 'DIRECT'::text, NULL::text;

  -- Q-D1-05b1 — BR-03 and BR-05.
  RETURN QUERY SELECT 'Q-D1-05b1'::text,
    (actor_available AND NOT m_05a AND a_05a = 'action'),
    CASE
      WHEN NOT actor_available THEN 'BR-03'
      WHEN m_05a THEN 'PARENT_MISSING_STATE'
      WHEN a_05a IS DISTINCT FROM 'action' THEN 'BR-05'
      ELSE 'CONDITIONAL' END, NULL::text;

  -- Q-D1-05b2 — carried routes, and BR-05. BR-03 does not affect it.
  RETURN QUERY SELECT 'Q-D1-05b2'::text,
    (has_routes AND NOT m_05a AND a_05a = 'action'),
    CASE
      WHEN NOT has_routes THEN 'NOT_CARRIED'
      WHEN m_05a THEN 'PARENT_MISSING_STATE'
      WHEN a_05a IS DISTINCT FROM 'action' THEN 'BR-05'
      ELSE 'CONDITIONAL' END,
    'available_routes'::text;

  -- Q-D1-05c — BR-04 and BR-05.
  RETURN QUERY SELECT 'Q-D1-05c'::text,
    (time_called AND NOT m_05a AND a_05a = 'action'),
    CASE
      WHEN NOT time_called THEN 'BR-04'
      WHEN m_05a THEN 'PARENT_MISSING_STATE'
      WHEN a_05a IS DISTINCT FROM 'action' THEN 'BR-05'
      ELSE 'CONDITIONAL' END, NULL::text;

  -- Q-D1-06 — served where the source carries available_routes. Section 1
  -- places Q-D1-06 route use at Stage 1 in the prohibited category for
  -- launch; that prohibition is enforced at the Stage 1 serving gate, not
  -- by pretending the source does not carry the field.
  RETURN QUERY SELECT 'Q-D1-06'::text, has_routes,
    CASE WHEN has_routes THEN 'DIRECT' ELSE 'NOT_CARRIED' END,
    'available_routes'::text;

  -- Q-D1-07 — served where the source carries both the test point and
  -- the post-test opportunity.
  RETURN QUERY SELECT 'Q-D1-07'::text, (has_test_point AND has_post_test),
    CASE WHEN (has_test_point AND has_post_test) THEN 'DIRECT' ELSE 'BR-07' END, NULL::text;

  -- Q-D1-08a — BR-07: served where the source carries a bearing interest.
  RETURN QUERY SELECT 'Q-D1-08a'::text, has_interest,
    CASE WHEN has_interest THEN 'DIRECT' ELSE 'BR-07' END, NULL::text;

  -- Q-D1-08b — BR-09: not served where no disclosure occurred. There is
  -- no not-applicable line; no row exists at all.
  RETURN QUERY SELECT 'Q-D1-08b'::text,
    (has_interest AND NOT m_08a AND a_08a IS NOT NULL AND a_08a <> 'not_within_period'),
    CASE
      WHEN NOT has_interest THEN 'BR-07'
      WHEN m_08a THEN 'PARENT_MISSING_STATE'
      WHEN a_08a = 'not_within_period' THEN 'BR-09'
      WHEN a_08a IS NULL THEN 'NOT_REACHED'
      ELSE 'CONDITIONAL' END, NULL::text;
END;
$fn$;

-- A missing state is metadata on the field and never a value inside the
-- answer enumeration. Posting one against a Not Served question refuses
-- and logs; so does posting a code that may never be applied at commit.
CREATE OR REPLACE FUNCTION public.t3a_d1_missing_state_permitted(
  p_code text,
  p_served boolean)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
BEGIN
  IF p_code IN ('not applicable', 'not yet observed') THEN
    -- Inapplicability is expressed by non-service under the branch rules,
    -- not by a missing state. "Not yet observed" describes a dimension
    -- before observation, not a field within one.
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'MISSING_STATE_CODE_NOT_APPLICABLE_AT_COMMIT');
  END IF;

  IF p_code NOT IN ('not captured','never asked','declined','no response',
                    'technical failure','withdrawn') THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'MISSING_STATE_CODE_NOT_IN_CONTROLLED_VOCABULARY');
  END IF;

  IF NOT p_served THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'MISSING_STATE_AGAINST_NOT_SERVED_QUESTION');
  END IF;

  RETURN jsonb_build_object('permitted', true);
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_served_questions(jsonb, jsonb),
  public.t3a_d1_missing_state_permitted(text, boolean)
TO anon, authenticated;
