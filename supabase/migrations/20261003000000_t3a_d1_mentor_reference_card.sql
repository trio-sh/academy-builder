-- =====================================================================
-- T3A-D1-EXEC-001 §5.3 and §1.5 — the mentor reference card
--
-- "The mentor reference card carries these lines, the four questions,
--  the material items, the unsupported assertions, the attribution
--  support set and the available routes. It carries NO expected
--  response, no strong answer, no red flag and nothing indicating which
--  line is the better one."
--
-- The card is assembled server-side from two places and no third:
--
--   1. the capture register — t3a_d1_capture_set and
--      t3a_d1_capture_line, loaded verbatim from §5.3;
--   2. the source's own sheet and script, held verbatim in
--      t3a_d1_content_version.body.
--
-- Nothing is composed here. Where the source does not state something,
-- the card says so and names the field, rather than filling the gap.
--
-- The prohibition is structural, not editorial. The register has no
-- column that could hold a preferred line, and section 3 below refuses
-- to let one be added.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The card
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_reference_card(p_source_identifier text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_object   public.t3a_content_object;
  v_body     jsonb;
  v_sheet    jsonb;
  v_stage    text;
  v_questions jsonb;
  v_qcount   int;
  v_sets     jsonb;
BEGIN
  SELECT * INTO v_object FROM public.t3a_content_object
   WHERE family = 'source'::public.t3a_content_family
     AND identifier = p_source_identifier;

  IF v_object.content_object_id IS NULL THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'SOURCE_NOT_FOUND');
  END IF;

  SELECT v.body INTO v_body
  FROM public.t3a_d1_content_version v
  WHERE v.content_object_id = v_object.content_object_id
  ORDER BY v.created_at DESC LIMIT 1;

  IF v_body IS NULL THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'SOURCE_CARRIES_NO_LOADED_VERSION');
  END IF;

  v_sheet := coalesce(v_body -> 'source_sheet', '{}'::jsonb);
  v_stage := v_body ->> 'stage_code';

  -- -------------------------------------------------------------------
  -- The four questions, verbatim from the script
  -- -------------------------------------------------------------------
  -- §1.5: "Every Stage 2 script asks these four, in this order."
  -- They are read out of the loaded script exactly as written. Nothing
  -- is paraphrased, renumbered or supplied where the script has none.
  --
  -- A source with no live script — S1 is administered, S3 is a work
  -- sample — carries no four questions at all, and that is the correct
  -- state rather than a gap to fill.
  SELECT jsonb_agg(jsonb_build_object('ask_no', (m[1])::int, 'question_text', m[2])
                   ORDER BY (m[1])::int)
    INTO v_questions
  FROM regexp_matches(v_body ->> 'verbatim',
                      'ASK ([0-9])[“]([^”]{1,255})[”]', 'g') AS m;

  v_qcount := coalesce(jsonb_array_length(v_questions), 0);

  -- -------------------------------------------------------------------
  -- The capture sets, with their lines, in register order
  -- -------------------------------------------------------------------
  -- Each line carries its text and its order and nothing else. There is
  -- no weight, no rank, no flag and no field a preference could be
  -- written into — see section 3.
  --
  -- Applicability is read off the source sheet, never inferred. Where a
  -- set is conditional the governing field is named and its value is
  -- returned verbatim, so a mentor reading the card can see what the
  -- source said rather than what the platform concluded. A value that
  -- is neither a stated TRUE nor a stated FALSE resolves to
  -- NOT_DETERMINABLE_FROM_SOURCE_SHEET, which sends the mentor to the
  -- source instead of guessing for them.
  WITH governing(capture_set_code, field) AS (
    VALUES ('C5b1', 'accountable_actor_available'),
           ('C5b2', 'available_routes'),
           ('C5c',  'time_reference_called_for'),
           ('C6',   'available_routes'),
           ('C7',   'account_test_point'),
           ('C8a',  'bearing_interest'),
           ('C8b',  'bearing_interest')
  )
  SELECT jsonb_agg(
           jsonb_build_object(
             'capture_set_code', s.capture_set_code,
             'title', s.title,
             'applicability_note', s.applicability_note,
             'governing_field', g.field,
             'governing_value_verbatim', v_sheet ->> g.field,
             'offered',
               CASE
                 WHEN g.field IS NULL THEN 'ALWAYS'
                 WHEN v_sheet ->> g.field IS NULL THEN 'NOT_DETERMINABLE_FROM_SOURCE_SHEET'
                 WHEN upper(btrim(v_sheet ->> g.field)) LIKE 'TRUE%' THEN 'STATED_BY_SOURCE'
                 WHEN upper(btrim(v_sheet ->> g.field)) LIKE 'FALSE%' THEN 'NOT_OFFERED_BY_SOURCE'
                 WHEN upper(btrim(v_sheet ->> g.field)) LIKE 'EMPTY%'
                   OR upper(btrim(v_sheet ->> g.field)) LIKE 'NONE%' THEN 'NOT_OFFERED_BY_SOURCE'
                 WHEN g.field = 'available_routes' THEN 'STATED_BY_SOURCE'
                 ELSE 'NOT_DETERMINABLE_FROM_SOURCE_SHEET'
               END,
             'lines', (SELECT jsonb_agg(jsonb_build_object(
                                 'line_order', l.line_order,
                                 'line_text', l.line_text)
                               ORDER BY l.line_order)
                       FROM public.t3a_d1_capture_line l
                       WHERE l.capture_set_code = s.capture_set_code))
           ORDER BY s.display_order)
    INTO v_sets
  FROM public.t3a_d1_capture_set s
  LEFT JOIN governing g ON g.capture_set_code = s.capture_set_code;

  RETURN jsonb_build_object(
    'rendered', true,
    'source_identifier', p_source_identifier,
    'title', v_object.title,
    'stage_code', v_stage,
    -- §5.18: these sources hold no REC-07 approval and no source-version
    -- hash, so none is registered for serving. The card says so rather
    -- than looking like a live production card.
    'operational_state', v_object.current_operational_state,
    'four_questions', coalesce(v_questions, '[]'::jsonb),
    'four_questions_note',
      CASE
        WHEN v_qcount = 4 THEN NULL
        WHEN v_qcount = 0 AND v_stage IN ('S1','S3')
          THEN 'STAGE_CARRIES_NO_LIVE_SCRIPT'
        ELSE 'FOUR_QUESTIONS_NOT_FULLY_EXTRACTABLE_READ_THE_SCRIPT'
      END,
    'lists', jsonb_build_object(
      'material_items',          public.t3a_d1_reference_list(v_sheet, 'material_items', 'M'),
      'unsupported_assertions',  public.t3a_d1_reference_list(v_sheet, 'assertion_reference_set', 'A'),
      'attribution_support_set', public.t3a_d1_reference_list(v_sheet, 'attribution_support_set', 'AS'),
      'available_routes',        public.t3a_d1_reference_list(v_sheet, 'available_routes', 'R-')),
    'capture_sets', coalesce(v_sets, '[]'::jsonb));
END;
$fn$;

-- ---------------------------------------------------------------------
-- 2. One source list, returned verbatim or refused
-- ---------------------------------------------------------------------

-- §1.5: sections 2 and 3 of the card are "the two lists it is checked
-- against". A malformed list is worse than an absent one, because a
-- mentor checks a claim against it and gets a wrong answer. So a list
-- that does not carry the source's own item prefix is refused with its
-- raw value shown, and the card sends the mentor to the source.
CREATE OR REPLACE FUNCTION public.t3a_d1_reference_list(
  p_sheet  jsonb,
  p_field  text,
  p_prefix text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
DECLARE
  v_raw text := p_sheet ->> p_field;
BEGIN
  IF v_raw IS NULL THEN
    RETURN jsonb_build_object('field', p_field, 'well_formed', false,
      'refusal_code', 'FIELD_ABSENT_FROM_SOURCE_SHEET');
  END IF;

  -- The source states an empty set in words, and that is an answer.
  IF upper(btrim(v_raw)) LIKE 'EMPTY%' OR upper(btrim(v_raw)) LIKE 'NONE%' THEN
    RETURN jsonb_build_object('field', p_field, 'well_formed', true,
      'verbatim', v_raw, 'empty_set', true);
  END IF;

  -- Two of the forty loaded sheets carry question-applicability table
  -- text in this field instead of the list — see the load report. The
  -- card refuses those rather than presenting the wrong text as a
  -- checkable list.
  IF btrim(v_raw) !~ ('^' || p_prefix || '[0-9a-z]') THEN
    RETURN jsonb_build_object('field', p_field, 'well_formed', false,
      'refusal_code', 'LIST_NOT_IN_SOURCE_FORMAT_READ_THE_SOURCE',
      'verbatim', v_raw);
  END IF;

  RETURN jsonb_build_object('field', p_field, 'well_formed', true,
    'verbatim', v_raw, 'empty_set', false);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 3. No preferred line can be added to the register
-- ---------------------------------------------------------------------

-- The card holds no preferred line because the register has no column
-- one could be written into. That is true today by omission; this makes
-- it true tomorrow by refusal.
--
-- §1.5: "Stripping exactly that material out of the legacy scenarios was
-- the largest single change in the Stage 1 migration, and reintroducing
-- it here under another name would undo it." The guard therefore matches
-- the names such a column would plausibly carry, not one name.
CREATE OR REPLACE FUNCTION public.t3a_d1_capture_register_no_preference()
RETURNS event_trigger LANGUAGE plpgsql AS $fn$
DECLARE
  r record;
  c text;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
           WHERE object_type = 'table' LOOP
    IF r.object_identity IN ('public.t3a_d1_capture_line',
                             'public.t3a_d1_capture_set') THEN
      FOR c IN SELECT column_name FROM information_schema.columns
               WHERE table_schema = 'public'
                 AND table_name = split_part(r.object_identity, '.', 2) LOOP
        IF c ~* '(expected|preferred|strong|correct|ideal|model_answer|red_flag|redflag|weight|score|rank|better|desirab|positive|negative)' THEN
          RAISE EXCEPTION 'CAPTURE_REGISTER_HOLDS_NO_PREFERRED_LINE: column %.% would indicate which line is better; T3A-D1-EXEC-001 section 1.5 forbids it',
            r.object_identity, c
            USING ERRCODE = 'check_violation';
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$fn$;

DROP EVENT TRIGGER IF EXISTS t3a_d1_capture_register_no_preference_trg;
CREATE EVENT TRIGGER t3a_d1_capture_register_no_preference_trg
  ON ddl_command_end
  WHEN TAG IN ('ALTER TABLE', 'CREATE TABLE')
  EXECUTE FUNCTION public.t3a_d1_capture_register_no_preference();

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_reference_card(text),
  public.t3a_d1_reference_list(jsonb, text, text)
TO anon, authenticated;
