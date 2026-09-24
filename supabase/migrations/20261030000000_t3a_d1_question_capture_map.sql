-- =====================================================================
-- The question → capture set register
--
-- Six acceptance tests (AC-05, AC-06, AC-08, AC-12, AC-13, AC-27) block
-- on one fact: which capture set answers which question. Every other
-- part is built — fifteen question objects, thirteen capture sets,
-- forty-four capture lines, ten branch rules, and
-- t3a_d1_served_questions(source_sheet, answers) already deciding what a
-- given source serves. A cockpit that knows a question applies still has
-- no approved answer set to offer, so Pane 2 renders nothing.
--
-- THIS MIGRATION SHIPS THE REGISTER EMPTY. Not one mapping row is
-- inserted. Which approved answers a participant is offered for a given
-- question is a decision about evidence meaning, and it is a governing
-- input from the issued Execution Edition, not a build detail. The
-- structure is built so that the ruling is LOADED rather than written.
--
-- Two things found while building it, both of which change what the
-- draft in docs/d1-execution/EXEC-001-question-capture-mapping-DRAFT.md
-- said.
--
-- 1. THE SERVING FUNCTION ALREADY RECORDS WHICH QUESTIONS ARE BOUND TO A
--    SOURCE FIELD, in its bound_family column: Q-D1-03b1 to
--    material_items, Q-D1-03b2 to assertion_reference_set,
--    Q-D1-04b-child to attribution_support_set, Q-D1-05b2 and Q-D1-06 to
--    available_routes.
--
--    BUT bound_family IS OVERLOADED and cannot be used alone to decide
--    this. For Q-D1-03b1 it names where the ANSWER OPTIONS come from —
--    the question's answer_type reads "Structured selection, multi, bound
--    to the source version's material_items". For Q-D1-05b2 it names the
--    field that GATES service — that question's answer_type is "Single
--    select, fixed", so its answers come from a catalogue and only its
--    applicability depends on the source. Same column, two meanings.
--    answer_type is the signal that separates them; bound_family is not.
--
--    So the register below records the distinction explicitly rather than
--    leaving a later reader to rediscover that the column means two
--    things.
--
-- 2. THERE IS A SIXTEENTH SERVED CODE. t3a_d1_served_questions emits
--    Q-D1-04b-child, which is not one of the fifteen rows in
--    t3a_d1_question_object. BR-06 serves it where Q-D1-04b returned
--    'aligned' or 'both'.
--
--    That answers, in part, the draft's second open item — "a bound child
--    selection on one option: which option?" The option is 'aligned',
--    and 'both' also reaches it. It was already decided, in code, and the
--    draft asked for a ruling on something the branch rules had settled.
--    What remains open is narrower: whether the child takes a capture set
--    of its own or draws entirely from attribution_support_set.
--
--    It also means the register keys on SERVED CODES, not on question
--    objects. A foreign key to t3a_d1_question_object would have rejected
--    the child outright.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The register
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_question_capture_map (
  question_code     text PRIMARY KEY,

  -- Exactly one of these two describes where the answers come from.
  answer_origin     text NOT NULL
                    CHECK (answer_origin IN ('CAPTURE_SET', 'SOURCE_BOUND')),
  capture_set_code  text REFERENCES public.t3a_d1_capture_set(capture_set_code)
                    ON DELETE RESTRICT,
  bound_field       text,

  -- No row exists without naming the authority that decided it. This is
  -- the whole point of the table: it holds a ruling, not a reading.
  ruling_reference  text NOT NULL CHECK (length(btrim(ruling_reference)) > 0),
  ruled_by          text NOT NULL CHECK (length(btrim(ruled_by)) > 0),
  ruled_at          timestamptz NOT NULL DEFAULT now(),
  note              text,

  CONSTRAINT t3a_d1_question_capture_map_origin_consistent CHECK (
    (answer_origin = 'CAPTURE_SET'
       AND capture_set_code IS NOT NULL AND bound_field IS NULL)
    OR
    (answer_origin = 'SOURCE_BOUND'
       AND capture_set_code IS NULL AND bound_field IS NOT NULL)
  )
);

COMMENT ON TABLE public.t3a_d1_question_capture_map IS
  'Which capture set answers which question. Ships empty: every row is a governing ruling from the issued Execution Edition, never an inference from the code numbering. The numbering is nearly positional and not reliably so — Q-D1-03a pairs with C3, and no C3a exists — so a row written by reading the codes would be a developer deciding which approved answers a participant is offered.';

COMMENT ON COLUMN public.t3a_d1_question_capture_map.answer_origin IS
  'CAPTURE_SET: the options are the lines of a set in t3a_d1_capture_line. SOURCE_BOUND: the options are drawn from a field of the source version, so there is no catalogue and no capture set. Read from the question''s answer_type, NOT from t3a_d1_served_questions.bound_family, which names the gating field for some questions and the answer field for others.';

COMMENT ON COLUMN public.t3a_d1_question_capture_map.ruling_reference IS
  'Where the pairing was ruled — the Execution Edition section, note or approval that decided it. NOT NULL and non-blank by constraint, so no row can enter this register without an authority behind it.';

-- ---------------------------------------------------------------------
-- 2. A row may only name a question the serving logic actually emits
-- ---------------------------------------------------------------------

-- Derived from the function rather than from a hardcoded list, so the
-- register and the branch rules cannot drift apart. An empty source sheet
-- returns every code with served = false, which is exactly the roster
-- wanted here.
CREATE OR REPLACE FUNCTION public.t3a_d1_servable_question_codes()
RETURNS TABLE (question_code text)
LANGUAGE sql STABLE AS $fn$
  SELECT q.question_code FROM public.t3a_d1_served_questions('{}'::jsonb) q;
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_d1_question_capture_map_guard()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_servable_question_codes() c
    WHERE c.question_code = NEW.question_code)
  THEN
    RAISE EXCEPTION
      'QUESTION_CODE_NOT_SERVED: % is not a code t3a_d1_served_questions emits',
      NEW.question_code
      USING ERRCODE = '23514';
  END IF;

  -- A SOURCE_BOUND row must name a field the serving logic binds that
  -- question to. Naming a different field would describe a question the
  -- cockpit does not serve.
  IF NEW.answer_origin = 'SOURCE_BOUND' AND NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_served_questions('{}'::jsonb) q
    WHERE q.question_code = NEW.question_code
      AND q.bound_family = NEW.bound_field)
  THEN
    RAISE EXCEPTION
      'BOUND_FIELD_MISMATCH: the serving logic does not bind % to %',
      NEW.question_code, NEW.bound_field
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_question_capture_map_guard
  ON public.t3a_d1_question_capture_map;
CREATE TRIGGER t3a_d1_question_capture_map_guard
  BEFORE INSERT OR UPDATE ON public.t3a_d1_question_capture_map
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_question_capture_map_guard();

-- ---------------------------------------------------------------------
-- 3. The gap, queryable rather than narrative
-- ---------------------------------------------------------------------

-- What is still unruled, as data. While this returns rows, the cockpit
-- cannot serve those questions and the six tests stay blocked.
CREATE OR REPLACE VIEW public.t3a_d1_question_capture_gap AS
  SELECT c.question_code,
         qo.conduct_element,
         qo.answer_type,
         (qo.question_code IS NULL) AS is_bound_child
  FROM public.t3a_d1_servable_question_codes() c
  LEFT JOIN public.t3a_d1_question_object qo ON qo.question_code = c.question_code
  LEFT JOIN public.t3a_d1_question_capture_map m ON m.question_code = c.question_code
  WHERE m.question_code IS NULL;

COMMENT ON VIEW public.t3a_d1_question_capture_gap IS
  'Served question codes carrying no ruled capture mapping. Empty means the register is complete and the cockpit can serve every question the branch rules reach.';

-- ---------------------------------------------------------------------
-- 4. The read route, which fails closed
-- ---------------------------------------------------------------------

-- Returns the answer catalogue for a question, or a refusal. It does NOT
-- fall back to a positional guess when no mapping exists: a cockpit that
-- offered plausible-looking answers for an unruled question would put
-- unapproved options in front of a participant, which is worse than
-- offering none.
CREATE OR REPLACE FUNCTION public.t3a_d1_capture_for_question(p_question_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_map public.t3a_d1_question_capture_map%ROWTYPE;
  v_lines jsonb;
BEGIN
  SELECT * INTO v_map FROM public.t3a_d1_question_capture_map
  WHERE question_code = p_question_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'permitted', false,
      'refusal', 'CAPTURE_MAPPING_NOT_RULED',
      'question_code', p_question_code,
      'detail', 'No ruled mapping exists for this question. The cockpit '
             || 'serves no answers rather than inferring them.');
  END IF;

  IF v_map.answer_origin = 'SOURCE_BOUND' THEN
    RETURN jsonb_build_object(
      'permitted', true,
      'answer_origin', 'SOURCE_BOUND',
      'bound_field', v_map.bound_field,
      'question_code', p_question_code);
  END IF;

  SELECT coalesce(jsonb_agg(
           jsonb_build_object('line_text', l.line_text, 'line_order', l.line_order)
           ORDER BY l.line_order), '[]'::jsonb)
  INTO v_lines
  FROM public.t3a_d1_capture_line l
  WHERE l.capture_set_code = v_map.capture_set_code;

  RETURN jsonb_build_object(
    'permitted', true,
    'answer_origin', 'CAPTURE_SET',
    'capture_set_code', v_map.capture_set_code,
    'question_code', p_question_code,
    'lines', v_lines);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 5. Access, on the same terms as the other D1 registers
-- ---------------------------------------------------------------------

ALTER TABLE public.t3a_d1_question_capture_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_question_capture_map_read
  ON public.t3a_d1_question_capture_map;
CREATE POLICY t3a_d1_question_capture_map_read
  ON public.t3a_d1_question_capture_map FOR SELECT USING (true);

DROP POLICY IF EXISTS t3a_d1_question_capture_map_write
  ON public.t3a_d1_question_capture_map;
CREATE POLICY t3a_d1_question_capture_map_write
  ON public.t3a_d1_question_capture_map FOR ALL
  USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

GRANT SELECT ON public.t3a_d1_question_capture_map TO authenticated;
GRANT SELECT ON public.t3a_d1_question_capture_gap TO authenticated;
