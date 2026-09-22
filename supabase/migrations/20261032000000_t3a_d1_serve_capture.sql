-- =====================================================================
-- CS-I-01 to CS-I-16 — serving the determination capture
--
-- One route the cockpit calls with the served source sheet and the
-- answers so far. It returns the questions that are served, the capture
-- lines each one offers, and — for the five source-bound controls — the
-- options drawn from the served source version.
--
-- CS-I-01 is the reason this is a route and not a lookup in the
-- interface: "Do not hard-code the mapping in the serving code and do
-- not compile it in." The mapping is read from
-- t3a_d1_question_capture_map at serve time, every time.
--
-- WHAT IS ENFORCED HERE
--
--   CS-I-04  A served question whose capture set will not resolve
--            refuses. No partial set, no neighbouring set, no free text.
--   CS-I-05  Bound options come from the SERVED SOURCE VERSION's field,
--            never from the register and never from another version.
--   CS-I-07  A bound control whose family is absent or empty refuses.
--            It does not render an empty slot and does not quietly
--            degrade to a fixed-option control.
--   CS-I-08  Q-D1-06 is one bound slot plus two fixed options: with n
--            routes it renders n + 2 lines, and the two fixed lines are
--            never expanded from the source.
--   CS-I-13  Service comes from t3a_d1_served_questions, which reads the
--            source applicability table. The register says which set a
--            question uses; it never says whether a question is served.
--   CS-I-14  A child that is not reached has NO row. Not a null, not a
--            missing-state code.
--
-- A NOTE ON THE BOUND ITEM TEXT, recorded rather than worked around.
-- The loaded source sheets carry these families as prose carrying item
-- identifiers — "M1 the figure is wrong. M2 the participant supplied
-- it. M3 the error is the". Several end mid-sentence. Whether the issued
-- edition truncates them or the content load did cannot be settled from
-- this repository, which does not hold the issued file. The parse below
-- therefore splits on the identifiers and keeps whatever text follows
-- verbatim: it does not repair, complete or trim an item. Where a family
-- yields no identifiable item the control refuses under CS-I-07 rather
-- than serving a participant an empty or invented choice. The
-- completeness of the item text is recorded as a conflict; it is a
-- content question, not a serving one.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. Parse a bound family into its items
-- ---------------------------------------------------------------------

-- Splits on the item identifiers the sources themselves use — M1, A1,
-- AS1, R-a — and returns each with the text that follows it, unaltered.
-- Nothing is inferred about an item that carries no identifier.
CREATE OR REPLACE FUNCTION public.t3a_d1_parse_bound_items(p_raw text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  v_clean text;
  v_items jsonb := '[]'::jsonb;
  v_match text[];
  v_key   text;
  v_body  text;
  v_pos   int := 1;
  v_next  int;
BEGIN
  IF p_raw IS NULL THEN RETURN v_items; END IF;

  -- The load escaped square brackets; they carry annotations such as
  -- "[Q-D1-06 OBSERVABLE IN SESSION]", which belong to the item text.
  v_clean := btrim(replace(replace(p_raw, '\[', '['), '\]', ']'));

  -- A source that states the family as absent carries no items. "Empty."
  -- is how the issued sheets say so.
  IF v_clean = '' OR lower(v_clean) IN ('empty.', 'empty', 'none.', 'none') THEN
    RETURN '[]'::jsonb;
  END IF;

  LOOP
    v_match := regexp_match(substr(v_clean, v_pos),
                            '(AS[0-9]+|M[0-9]+|A[0-9]+|R-[a-z])(\s|$)');
    EXIT WHEN v_match IS NULL;

    v_key := v_match[1];
    v_next := v_pos + strpos(substr(v_clean, v_pos), v_key) - 1;

    -- Close the previous item at this identifier.
    IF jsonb_array_length(v_items) > 0 THEN
      v_body := btrim(substr(v_clean, v_pos, v_next - v_pos));
      v_items := jsonb_set(v_items,
        ARRAY[(jsonb_array_length(v_items) - 1)::text, 'label'],
        to_jsonb(v_body));
    END IF;

    v_items := v_items || jsonb_build_object('key', v_key, 'label', '');
    v_pos := v_next + length(v_key);
  END LOOP;

  IF jsonb_array_length(v_items) > 0 THEN
    v_body := btrim(substr(v_clean, v_pos));
    v_items := jsonb_set(v_items,
      ARRAY[(jsonb_array_length(v_items) - 1)::text, 'label'],
      to_jsonb(v_body));
  END IF;

  RETURN v_items;
END;
$fn$;

-- ---------------------------------------------------------------------
-- 2. The serving route
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_serve_capture(
  p_source_sheet jsonb,
  p_answers      jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_out      jsonb := '[]'::jsonb;
  v_row      record;
  v_map      public.t3a_d1_question_capture_map%ROWTYPE;
  v_lines    jsonb;
  v_options  jsonb;
  v_raw      text;
  v_entry    jsonb;
BEGIN
  FOR v_row IN
    SELECT * FROM public.t3a_d1_served_questions(p_source_sheet, p_answers)
    WHERE served                                   -- CS-I-14: no row at all
      AND question_code NOT LIKE '%-child'         -- the child rides its parent
  LOOP
    SELECT * INTO v_map FROM public.t3a_d1_question_capture_map
    WHERE question_code = v_row.question_code;

    -- CS-I-04 / CS-I-16.
    IF NOT FOUND THEN
      v_out := v_out || jsonb_build_object(
        'question_code', v_row.question_code,
        'refused', true,
        'refusal', 'CAPTURE_MAPPING_NOT_RULED');
      CONTINUE;
    END IF;

    SELECT coalesce(jsonb_agg(
             jsonb_build_object('line_order', l.line_order, 'line_text', l.line_text)
             ORDER BY l.line_order), '[]'::jsonb)
    INTO v_lines
    FROM public.t3a_d1_capture_line l
    WHERE l.capture_set_code = v_map.capture_set_code;

    IF jsonb_array_length(v_lines) = 0 THEN
      v_out := v_out || jsonb_build_object(
        'question_code', v_row.question_code,
        'refused', true,
        'refusal', 'CAPTURE_SET_EMPTY',
        'capture_set_code', v_map.capture_set_code);
      CONTINUE;
    END IF;

    v_entry := jsonb_build_object(
      'question_code',       v_row.question_code,
      'refused',             false,
      'capture_set_code',    v_map.capture_set_code,
      'conduct_element',     v_map.conduct_element,
      'answer_type',         v_map.answer_type,
      'control_ordinal',     v_map.control_ordinal,
      'reason_code',         v_row.reason_code,
      'source_bound_family', v_map.source_bound_family,
      'lines',               v_lines);

    -- CS-I-05 and CS-I-07: the bound options, or a refusal.
    IF v_map.source_bound_family IS NOT NULL THEN
      v_raw := p_source_sheet ->> v_map.source_bound_family;
      v_options := public.t3a_d1_parse_bound_items(v_raw);

      IF jsonb_array_length(v_options) = 0 THEN
        v_entry := v_entry || jsonb_build_object(
          'refused', true,
          'refusal', 'BOUND_FAMILY_ABSENT_OR_EMPTY');
      ELSE
        v_entry := v_entry || jsonb_build_object('bound_options', v_options);
      END IF;
    END IF;

    v_out := v_out || v_entry;
  END LOOP;

  RETURN jsonb_build_object(
    'served', v_out,
    'served_count', jsonb_array_length(v_out));
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_serve_capture(jsonb, jsonb) IS
  'CS-I-01. The cockpit''s single serving route: which questions are served, the capture lines each offers, and the bound options for the five source-bound controls. The mapping is read from the register at serve time and is never compiled into the interface.';

-- C3 renders as one visual group holding three separately persisted
-- controls (CS-I-03). This names the group so the interface does not have
-- to know in advance that C3 is the one set that spans more than one.
CREATE OR REPLACE FUNCTION public.t3a_d1_capture_groups()
RETURNS TABLE (capture_set_code text, controls jsonb)
LANGUAGE sql STABLE AS $fn$
  SELECT m.capture_set_code,
         jsonb_agg(jsonb_build_object('question_code', m.question_code,
                                      'control_ordinal', m.control_ordinal)
                   ORDER BY m.control_ordinal NULLS FIRST)
  FROM public.t3a_d1_question_capture_map m
  GROUP BY m.capture_set_code
  HAVING count(*) > 1;
$fn$;
