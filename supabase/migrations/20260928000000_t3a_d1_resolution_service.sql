-- =====================================================================
-- T3A-D1-EXEC-001 sections 5.12, 5.13, 5.14 and 5.15
--   The clause instance, the resolution rule table, condition precedence
--   and the generated coverage matrix.
--
-- Section 5.13: "Every row is an input pattern with exactly one output.
-- The service implements this table; it does not reason about it."
--
-- The map from a capture line to a statement is NOT positional. Within
-- C4b the statement register runs 044, 045, 047, 046 while the capture
-- lines run no-attribution, all-aligned, none-aligned, both. Aligning by
-- position would compose "both aligned and non-aligned" for a mentor who
-- selected "none were aligned" — a different sentence about a person.
-- The map is therefore explicit and carries both sides so it is
-- reviewable, and section 5.15's completeness and uniqueness properties
-- are computed from it rather than asserted.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The map: one capture line in, exactly one statement out
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_capture_resolution (
  resolution_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_code     text NOT NULL,
  capture_set_code  text NOT NULL REFERENCES public.t3a_d1_capture_set(capture_set_code),
  capture_line_order integer NOT NULL,
  statement_key     text NOT NULL,
  conduct_element   text NOT NULL,
  UNIQUE (capture_set_code, capture_line_order),
  UNIQUE (statement_key)
);

COMMENT ON TABLE public.t3a_d1_capture_resolution IS
  'Section 5.13. One capture line resolves to exactly one Layer 1 statement. Both unique constraints are load-bearing: the first makes composition deterministic for a given selection, the second stops two selections composing the same sentence.';

INSERT INTO public.t3a_d1_capture_resolution
  (question_code, capture_set_code, capture_line_order, statement_key, conduct_element) VALUES
  -- C1 / Q-D1-01 — what was said about the issue
  ('Q-D1-01','C1',1,'ST-D1-011','CE-01'),
  ('Q-D1-01','C1',2,'ST-D1-012','CE-01'),
  ('Q-D1-01','C1',3,'ST-D1-013','CE-01'),
  -- C2 / Q-D1-02 — when it was first raised (chronological, order kept)
  ('Q-D1-02','C2',1,'ST-D1-021','CE-02'),
  ('Q-D1-02','C2',2,'ST-D1-022','CE-02'),
  ('Q-D1-02','C2',3,'ST-D1-023','CE-02'),
  ('Q-D1-02','C2',4,'ST-D1-024','CE-02'),
  -- C3 / Q-D1-03a — what the account contained
  ('Q-D1-03a','C3',1,'ST-D1-031','CE-03'),
  ('Q-D1-03a','C3',2,'ST-D1-032','CE-03'),
  ('Q-D1-03a','C3',3,'ST-D1-033','CE-03'),
  ('Q-D1-03a','C3',4,'ST-D1-034','CE-03'),
  ('Q-D1-03a','C3',5,'ST-D1-035','CE-03'),
  -- C4a / Q-D1-04a — the participant's own part
  ('Q-D1-04a','C4a',1,'ST-D1-041','CE-04'),
  ('Q-D1-04a','C4a',2,'ST-D1-042','CE-04'),
  ('Q-D1-04a','C4a',3,'ST-D1-043','CE-04'),
  -- C4b / Q-D1-04b — attribution to another person.
  -- NOT positional: line 3 is "none were aligned" and resolves to 046,
  -- line 4 is "both" and resolves to 047.
  ('Q-D1-04b','C4b',1,'ST-D1-044','CE-04'),
  ('Q-D1-04b','C4b',2,'ST-D1-045','CE-04'),
  ('Q-D1-04b','C4b',3,'ST-D1-046','CE-04'),
  ('Q-D1-04b','C4b',4,'ST-D1-047','CE-04'),
  -- C5a / Q-D1-05a — corrective action
  ('Q-D1-05a','C5a',1,'ST-D1-051','CE-05'),
  ('Q-D1-05a','C5a',2,'ST-D1-052','CE-05'),
  ('Q-D1-05a','C5a',3,'ST-D1-053','CE-05'),
  -- C5b1 / Q-D1-05b1 — accountable actor
  ('Q-D1-05b1','C5b1',1,'ST-D1-054a','CE-05'),
  ('Q-D1-05b1','C5b1',2,'ST-D1-055a','CE-05'),
  -- C5b2 / Q-D1-05b2 — corrective route
  ('Q-D1-05b2','C5b2',1,'ST-D1-054b','CE-05'),
  ('Q-D1-05b2','C5b2',2,'ST-D1-055c','CE-05'),
  ('Q-D1-05b2','C5b2',3,'ST-D1-055b','CE-05'),
  -- C5c / Q-D1-05c — time reference
  ('Q-D1-05c','C5c',1,'ST-D1-056','CE-05'),
  ('Q-D1-05c','C5c',2,'ST-D1-057','CE-05'),
  -- C6 / Q-D1-06 — which route was used
  ('Q-D1-06','C6',1,'ST-D1-061','CE-06'),
  ('Q-D1-06','C6',2,'ST-D1-062','CE-06'),
  ('Q-D1-06','C6',3,'ST-D1-063','CE-06'),
  -- C7 / Q-D1-07 — what changed when the account was tested
  ('Q-D1-07','C7',1,'ST-D1-071','CE-07'),
  ('Q-D1-07','C7',2,'ST-D1-072','CE-07'),
  ('Q-D1-07','C7',3,'ST-D1-073','CE-07'),
  ('Q-D1-07','C7',4,'ST-D1-074','CE-07'),
  ('Q-D1-07','C7',5,'ST-D1-075','CE-07'),
  -- C8a / Q-D1-08a — disclosure timing. Chronological, order kept, and
  -- "at the decision point" is its own state, never collapsed into
  -- before or after.
  ('Q-D1-08a','C8a',1,'ST-D1-081','CE-08'),
  ('Q-D1-08a','C8a',2,'ST-D1-085','CE-08'),
  ('Q-D1-08a','C8a',3,'ST-D1-082','CE-08'),
  ('Q-D1-08a','C8a',4,'ST-D1-084','CE-08'),
  -- C8b / Q-D1-08b — prompt condition
  ('Q-D1-08b','C8b',1,'ST-D1-083b','CE-08'),
  ('Q-D1-08b','C8b',2,'ST-D1-083','CE-08'),
  ('Q-D1-08b','C8b',3,'ST-D1-083c','CE-08')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Section 5.14 — condition precedence, fixed
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_condition_precedence (
  condition_code       text PRIMARY KEY,
  precedence_order     integer NOT NULL UNIQUE,
  language_template_id text,
  renders_before_conduct boolean NOT NULL,
  effect               text NOT NULL
);

COMMENT ON TABLE public.t3a_d1_condition_precedence IS
  'Section 5.14. Conditions co-occur and their order changes what a reader sees first, so the order is fixed and two records under the same conditions read the same way.';

INSERT INTO public.t3a_d1_condition_precedence
  (condition_code, precedence_order, language_template_id, renders_before_conduct, effect) VALUES
  ('conditions_compromised', 1, 'L-D1-COMP-001', true,
   'The limitation language is stated before the conduct description. Nothing may precede it'),
  ('stage_1_only',           2, 'L-D1-S1-001',   true,
   'The fixed administration note follows the limitation, if any, and precedes the description'),
  ('mixed_or_divergent',     3, 'L-D1-DIV-001',  false,
   'Both descriptions render, in observation order, with neither marked preferred'),
  ('single_observer',        4, 'L-D1-SINGLE-001', false,
   'The fixed note follows the description'),
  ('earlier_attempt_differs',5, 'L-D1-ATT-001',  false,
   'The note follows, and both attempts are held in the full record'),
  ('evidence_expired',       6, 'L-D1-EXP-001',  false,
   'The fixed note follows all others. The observation contributes to history, not to the current state')
ON CONFLICT (condition_code) DO NOTHING;

ALTER TABLE public.t3a_d1_capture_resolution     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_condition_precedence   ENABLE ROW LEVEL SECURITY;

DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['t3a_d1_capture_resolution','t3a_d1_condition_precedence'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_read ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_write ON public.%I FOR ALL
       USING (public.t3a_is_service_context())
       WITH CHECK (public.t3a_is_service_context())', t, t);
  END LOOP;
END;
$rls$;

-- ---------------------------------------------------------------------
-- 3. Section 5.12 and 5.13 — composition
-- ---------------------------------------------------------------------

-- Composes an observation into an ordered set of clause instances, or
-- refuses. The service implements the table; it does not reason about it,
-- and where the table says refuse it refuses rather than choosing.
--
-- p_selections: { "Q-D1-01": 2, "Q-D1-03a": 2, ... } capture line orders
-- p_missing:    { "Q-D1-02": "declined", ... }
-- p_bound:      { "omitted_items": [...], "route_used": "...",
--                 "support_set_items": [...] }
CREATE OR REPLACE FUNCTION public.t3a_d1_compose_observation(
  p_source_sheet jsonb,
  p_selections   jsonb DEFAULT '{}'::jsonb,
  p_missing      jsonb DEFAULT '{}'::jsonb,
  p_bound        jsonb DEFAULT '{}'::jsonb,
  p_conditions   text[] DEFAULT ARRAY[]::text[])
RETURNS jsonb
LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  q            record;
  v_line       integer;
  v_key        text;
  v_body       text;
  v_element    text;
  v_clauses    jsonb := '[]'::jsonb;
  v_conditions jsonb := '[]'::jsonb;
  v_answers    jsonb := '{}'::jsonb;
  v_omitted    jsonb := coalesce(p_bound -> 'omitted_items', '[]'::jsonb);
  c            record;
BEGIN
  -- Serving is decided by the branch rules against the source sheet.
  -- Answers are re-expressed as the codes the branch rules read.
  FOR q IN SELECT * FROM public.t3a_d1_capture_resolution LOOP
    v_line := (p_selections ->> q.question_code)::integer;
    IF v_line IS NULL THEN CONTINUE; END IF;
  END LOOP;

  v_answers := jsonb_build_object('missing', p_missing);
  IF (p_selections ? 'Q-D1-03a') THEN
    v_answers := v_answers || jsonb_build_object('Q-D1-03a',
      CASE (p_selections ->> 'Q-D1-03a')::integer
        WHEN 1 THEN 'corresponded' WHEN 2 THEN 'omission'
        WHEN 3 THEN 'unsupported_claim' WHEN 4 THEN 'both'
        ELSE 'no_account' END);
  END IF;
  IF (p_selections ? 'Q-D1-04b') THEN
    v_answers := v_answers || jsonb_build_object('Q-D1-04b',
      CASE (p_selections ->> 'Q-D1-04b')::integer
        WHEN 1 THEN 'none' WHEN 2 THEN 'aligned'
        WHEN 3 THEN 'not_aligned' ELSE 'both' END);
  END IF;
  IF (p_selections ? 'Q-D1-05a') THEN
    v_answers := v_answers || jsonb_build_object('Q-D1-05a',
      CASE WHEN (p_selections ->> 'Q-D1-05a')::integer = 3 THEN 'none' ELSE 'action' END);
  END IF;
  IF (p_selections ? 'Q-D1-08a') THEN
    v_answers := v_answers || jsonb_build_object('Q-D1-08a',
      CASE WHEN (p_selections ->> 'Q-D1-08a')::integer = 4
           THEN 'not_within_period' ELSE 'disclosed' END);
  END IF;

  -- Refusal: a served question with neither an answer nor a missing state
  -- is not committable.
  FOR q IN
    SELECT s.question_code FROM public.t3a_d1_served_questions(p_source_sheet, v_answers) s
    WHERE s.served AND s.question_code <> 'Q-D1-04b-child'
  LOOP
    IF NOT (p_selections ? q.question_code) AND NOT (p_missing ? q.question_code) THEN
      RETURN jsonb_build_object('composed', false,
        'refusal_code', 'SERVED_QUESTION_UNANSWERED_AND_NO_MISSING_STATE',
        'question_code', q.question_code);
    END IF;
  END LOOP;

  -- Refusal: the parent asserts an omission and the child identifies
  -- none. One of them is wrong and the service must not choose.
  IF (p_selections ->> 'Q-D1-03a')::integer IN (2, 4)
     AND jsonb_array_length(v_omitted) = 0 THEN
    RETURN jsonb_build_object('composed', false,
      'refusal_code', 'OMISSION_ASSERTED_WITH_NO_ITEM_IDENTIFIED');
  END IF;

  -- Clauses, in fixed conduct-element order and never in the order the
  -- mentor happened to capture them.
  FOR q IN
    SELECT r.*, l.line_text, sl.statement_body
    FROM public.t3a_d1_capture_resolution r
    JOIN public.t3a_d1_capture_line l
      ON l.capture_set_code = r.capture_set_code AND l.line_order = r.capture_line_order
    JOIN public.t3a_d1_statement_library sl ON sl.statement_key = r.statement_key
    WHERE p_selections ? r.question_code
      AND (p_selections ->> r.question_code)::integer = r.capture_line_order
    ORDER BY r.conduct_element,
             CASE r.question_code
               WHEN 'Q-D1-03a' THEN 0 WHEN 'Q-D1-03b1' THEN 1 WHEN 'Q-D1-03b2' THEN 2
               WHEN 'Q-D1-05a' THEN 0 WHEN 'Q-D1-05b1' THEN 1
               WHEN 'Q-D1-05b2' THEN 2 WHEN 'Q-D1-05c' THEN 3
               WHEN 'Q-D1-08a' THEN 0 WHEN 'Q-D1-08b' THEN 1
               ELSE 0 END
  LOOP
    v_body := q.statement_body;

    -- Bound variables are filled from the record. They are never a
    -- free-text slot and never anything a person types.
    IF v_body LIKE '%{omitted_items}%' THEN
      v_body := replace(v_body, '{omitted_items}',
        (SELECT string_agg(value #>> '{}', ', ') FROM jsonb_array_elements(v_omitted)));
    END IF;
    IF v_body LIKE '%{route_used}%' THEN
      v_body := replace(v_body, '{route_used}', coalesce(p_bound ->> 'route_used', ''));
    END IF;

    v_clauses := v_clauses || jsonb_build_object(
      'conduct_element', q.conduct_element,
      'question_code', q.question_code,
      -- Section 5.12: state_code EQUALS the approved statement identifier.
      -- No separate state code is invented, derived or abbreviated.
      'state_code', q.statement_key,
      'clause_text', v_body);
  END LOOP;

  -- Conditions, in the fixed 5.14 precedence.
  FOR c IN
    SELECT * FROM public.t3a_d1_condition_precedence
    WHERE condition_code = ANY (p_conditions)
    ORDER BY precedence_order
  LOOP
    v_conditions := v_conditions || jsonb_build_object(
      'condition_code', c.condition_code,
      'order', c.precedence_order,
      'template_id', c.language_template_id,
      'before_conduct', c.renders_before_conduct);
  END LOOP;

  RETURN jsonb_build_object(
    'composed', true,
    'clauses', v_clauses,
    'conditions', v_conditions,
    -- The support-set item identifier is retained in the record and is
    -- NOT rendered: naming the item would name the person.
    'retained_not_rendered', jsonb_build_object(
      'support_set_items', coalesce(p_bound -> 'support_set_items', '[]'::jsonb)));
END;
$fn$;

-- ---------------------------------------------------------------------
-- 4. Section 5.15 — the coverage matrix, generated not maintained
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_coverage_matrix()
RETURNS TABLE (property text, passed boolean, detail text)
LANGUAGE plpgsql STABLE AS $fn$
BEGIN
  -- Completeness: every capture line maps to a statement, or the service
  -- would refuse a valid observation.
  RETURN QUERY
  SELECT 'Completeness'::text,
         NOT EXISTS (
           SELECT 1 FROM public.t3a_d1_capture_line l
           LEFT JOIN public.t3a_d1_capture_resolution r
             ON r.capture_set_code = l.capture_set_code
            AND r.capture_line_order = l.line_order
           WHERE r.resolution_id IS NULL),
         coalesce((SELECT string_agg(l.capture_set_code || '#' || l.line_order, ', ')
                   FROM public.t3a_d1_capture_line l
                   LEFT JOIN public.t3a_d1_capture_resolution r
                     ON r.capture_set_code = l.capture_set_code
                    AND r.capture_line_order = l.line_order
                   WHERE r.resolution_id IS NULL), 'every capture line resolves');

  -- Uniqueness: no pattern maps to more than one statement, or two
  -- mentors could produce different reports from identical answers.
  RETURN QUERY
  SELECT 'Uniqueness'::text,
         NOT EXISTS (
           SELECT 1 FROM public.t3a_d1_capture_resolution
           GROUP BY capture_set_code, capture_line_order HAVING count(*) > 1),
         'one capture line, exactly one statement'::text;

  -- No statement is reachable from two different capture lines.
  RETURN QUERY
  SELECT 'No shared output'::text,
         NOT EXISTS (
           SELECT 1 FROM public.t3a_d1_capture_resolution
           GROUP BY statement_key HAVING count(*) > 1),
         'one statement, exactly one capture line'::text;

  -- No impossible paths: every mapped statement exists in the library.
  RETURN QUERY
  SELECT 'No impossible paths'::text,
         NOT EXISTS (
           SELECT 1 FROM public.t3a_d1_capture_resolution r
           LEFT JOIN public.t3a_d1_statement_library s ON s.statement_key = r.statement_key
           WHERE s.statement_library_id IS NULL),
         coalesce((SELECT string_agg(r.statement_key, ', ')
                   FROM public.t3a_d1_capture_resolution r
                   LEFT JOIN public.t3a_d1_statement_library s ON s.statement_key = r.statement_key
                   WHERE s.statement_library_id IS NULL),
                  'every mapped statement exists in the library');

  -- Every library statement is reachable. An unreachable statement means
  -- the map and the library disagree.
  RETURN QUERY
  SELECT 'No unreachable statement'::text,
         NOT EXISTS (
           SELECT 1 FROM public.t3a_d1_statement_library s
           LEFT JOIN public.t3a_d1_capture_resolution r ON r.statement_key = s.statement_key
           WHERE r.resolution_id IS NULL),
         coalesce((SELECT string_agg(s.statement_key, ', ')
                   FROM public.t3a_d1_statement_library s
                   LEFT JOIN public.t3a_d1_capture_resolution r ON r.statement_key = s.statement_key
                   WHERE r.resolution_id IS NULL),
                  'every library statement is reachable');

  -- No limitation leakage: every condition holds a template and the
  -- precedence order is a dense sequence with no ties.
  RETURN QUERY
  SELECT 'No limitation leakage'::text,
         NOT EXISTS (SELECT 1 FROM public.t3a_d1_condition_precedence
                     WHERE language_template_id IS NULL)
         AND (SELECT count(DISTINCT precedence_order) = count(*)
              FROM public.t3a_d1_condition_precedence),
         'every condition renders through a template, in a fixed order'::text;

  -- No absence language: the retired generic nothing-was-observed frame
  -- must not exist. It collapsed source-design absence into a
  -- participant-facing result.
  RETURN QUERY
  SELECT 'No absence language'::text,
         NOT EXISTS (SELECT 1 FROM public.t3a_d1_language_template
                     WHERE language_template_id = 'L-D1-NO-001'),
         'L-D1-NO-001 is withdrawn and absent'::text;
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_compose_observation(jsonb, jsonb, jsonb, jsonb, text[]),
  public.t3a_d1_coverage_matrix()
TO anon, authenticated;
