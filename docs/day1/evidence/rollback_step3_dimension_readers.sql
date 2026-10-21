-- Rollback of 20261204000000_step3_dimension_readers.sql: restores the twelve readers to their pre-change definitions.
drop trigger if exists t3a_0_capture_selection_dimension_trg on public.t3a_d1_capture_selection;
drop function if exists public.t3a_capture_selection_dimension();
drop function if exists public.t3a_d1_coverage_matrix(text);
CREATE OR REPLACE FUNCTION public.t3a_d1_capture_for_question(p_question_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_map   public.t3a_d1_question_capture_map%ROWTYPE;
  v_lines jsonb;
  v_group jsonb;
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

  SELECT coalesce(jsonb_agg(
           jsonb_build_object('line_text', l.line_text, 'line_order', l.line_order)
           ORDER BY l.line_order), '[]'::jsonb)
  INTO v_lines
  FROM public.t3a_d1_capture_line l
  WHERE l.capture_set_code = v_map.capture_set_code;

  IF jsonb_array_length(v_lines) = 0 THEN
    RETURN jsonb_build_object(
      'permitted', false,
      'refusal', 'CAPTURE_SET_EMPTY',
      'question_code', p_question_code,
      'capture_set_code', v_map.capture_set_code);
  END IF;

  -- Every control sharing this set, so the interface can render C3 as one
  -- visual group without knowing in advance that C3 is the group.
  SELECT coalesce(jsonb_agg(
           jsonb_build_object('question_code', m2.question_code,
                              'control_ordinal', m2.control_ordinal)
           ORDER BY m2.control_ordinal NULLS FIRST), '[]'::jsonb)
  INTO v_group
  FROM public.t3a_d1_question_capture_map m2
  WHERE m2.capture_set_code = v_map.capture_set_code;

  RETURN jsonb_build_object(
    'permitted', true,
    'question_code', p_question_code,
    'capture_set_code', v_map.capture_set_code,
    'conduct_element', v_map.conduct_element,
    'answer_type', v_map.answer_type,
    'source_bound_family', v_map.source_bound_family,
    'control_ordinal', v_map.control_ordinal,
    'group_controls', v_group,
    'lines', v_lines);
END;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_serve_capture(p_source_sheet jsonb, p_answers jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_capture_groups()
 RETURNS TABLE(capture_set_code text, controls jsonb)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT m.capture_set_code,
         jsonb_agg(jsonb_build_object('question_code', m.question_code,
                                      'control_ordinal', m.control_ordinal)
                   ORDER BY m.control_ordinal NULLS FIRST)
  FROM public.t3a_d1_question_capture_map m
  GROUP BY m.capture_set_code
  HAVING count(*) > 1;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_branch_answers(p_selected jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_out jsonb := '{}'::jsonb;
  v_q   text;
  v_code text;
BEGIN
  -- p_selected: { "Q-D1-03a": <line_order>, ... }
  FOR v_q IN SELECT jsonb_object_keys(p_selected) LOOP
    SELECT l.branch_code INTO v_code
    FROM public.t3a_d1_question_capture_map m
    JOIN public.t3a_d1_capture_line l
      ON l.capture_set_code = m.capture_set_code
     AND l.line_order = (p_selected ->> v_q)::int
    WHERE m.question_code = v_q;

    IF v_code IS NOT NULL THEN
      v_out := v_out || jsonb_build_object(v_q, v_code);
    END IF;
  END LOOP;
  RETURN v_out;
END;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_beat_advance_permitted(p_stage_entry_event_id uuid, p_beat_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_source  text;
  v_pending text;
BEGIN
  SELECT cv.body ->> 'source_identifier' INTO v_source
    FROM public.t3a_stage_entry_event e
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = e.source_version_id
   WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  -- Every set that closes at THIS beat and holds no selection.
  SELECT string_agg(b.capture_set_code, ', ' ORDER BY b.capture_set_code)
    INTO v_pending
    FROM public.t3a_d1_beat_capture_binding b
   WHERE b.source_identifier = v_source
     AND b.beat_code = p_beat_code
     AND b.qualifier_as_written = 'final'
     AND NOT EXISTS (
       SELECT 1 FROM public.t3a_d1_capture_selection s
        WHERE s.stage_entry_event_id = p_stage_entry_event_id
          AND s.capture_set_code = b.capture_set_code);

  IF v_pending IS NOT NULL THEN
    RETURN jsonb_build_object(
      'permitted', false,
      'refusal', 'DETERMINATION_UNANSWERED_AT_CLOSING_BEAT',
      'sets', v_pending,
      'beat_code', p_beat_code,
      'source_identifier', v_source);
  END IF;

  RETURN jsonb_build_object('permitted', true, 'beat_code', p_beat_code);
END;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_question_capture_map_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_question_object q
    WHERE q.question_code = NEW.question_code)
  THEN
    RAISE EXCEPTION
      'QUESTION_CODE_NOT_REGISTERED: % is not a question object',
      NEW.question_code
      USING ERRCODE = '23514';
  END IF;

  IF NEW.source_bound_family IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_served_questions('{}'::jsonb) q
    WHERE q.bound_family = NEW.source_bound_family
      AND (q.question_code = NEW.question_code
           OR q.question_code = NEW.question_code || '-child'))
  THEN
    RAISE EXCEPTION
      'BOUND_FAMILY_MISMATCH: the serving logic does not bind % to %',
      NEW.question_code, NEW.source_bound_family
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_capture_visible_at_beat(p_stage_entry_event_id uuid, p_question_code text, p_capture_set_code text, p_beat_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  v_source      text;
  v_first_ord   int;
  v_this_ord    int;
  v_close_beat  text;
  v_close_ord   int;
  v_answered    boolean;
  v_occurrence  boolean;
  v_disclosed   boolean;
BEGIN
  SELECT cv.body ->> 'source_identifier' INTO v_source
    FROM public.t3a_stage_entry_event e
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = e.source_version_id
   WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  SELECT min(m.beat_ordinal) INTO v_first_ord
    FROM public.t3a_d1_beat_capture_binding b
    JOIN public.t3a_d1_mentor_action_sequence m
      ON m.source_identifier = b.source_identifier AND m.beat_code = b.beat_code
   WHERE b.source_identifier = v_source AND b.capture_set_code = p_capture_set_code;

  IF v_first_ord IS NULL THEN
    RETURN jsonb_build_object('visible', false, 'reason', 'SET_NOT_BOUND_ON_THIS_SOURCE');
  END IF;

  SELECT beat_ordinal INTO v_this_ord
    FROM public.t3a_d1_mentor_action_sequence
   WHERE source_identifier = v_source AND beat_code = p_beat_code;

  v_close_beat := public.t3a_d1_capture_close_beat(v_source, p_capture_set_code);
  IF v_close_beat IS NOT NULL THEN
    SELECT beat_ordinal INTO v_close_ord
      FROM public.t3a_d1_mentor_action_sequence
     WHERE source_identifier = v_source AND beat_code = v_close_beat;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.t3a_d1_capture_selection s
                  WHERE s.stage_entry_event_id = p_stage_entry_event_id
                    AND s.question_code = p_question_code
                    AND s.capture_set_code = p_capture_set_code)
    INTO v_answered;

  SELECT s.records_first_occurrence INTO v_occurrence
    FROM public.t3a_d1_capture_set s WHERE s.capture_set_code = p_capture_set_code;

  -- Nothing is visible before the set's first bound beat, and nothing
  -- after it has closed.
  IF v_this_ord IS NULL OR v_this_ord < v_first_ord THEN
    RETURN jsonb_build_object('visible', false, 'reason', 'BEFORE_FIRST_BOUND_BEAT');
  END IF;
  IF v_close_ord IS NOT NULL AND v_this_ord > v_close_ord THEN
    RETURN jsonb_build_object('visible', false, 'reason', 'DETERMINATION_CLOSED');
  END IF;

  -- CL-04. C8b is conditional: under BR-09 it is served only once C8a has
  -- recorded a disclosure, so it becomes visible from that beat and not
  -- before. "Disclosure" is an occurrence line, never the whole-session
  -- line, and is read by the line's stored property rather than its text.
  IF p_capture_set_code = 'C8b' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.t3a_d1_capture_selection s
        JOIN public.t3a_d1_capture_line l
          ON l.capture_set_code = s.capture_set_code AND l.line_order = s.line_order
       WHERE s.stage_entry_event_id = p_stage_entry_event_id
         AND s.capture_set_code = 'C8a'
         AND NOT l.is_whole_session_answer)
      INTO v_disclosed;
    IF NOT v_disclosed THEN
      RETURN jsonb_build_object('visible', false, 'reason', 'C8A_RECORDS_NO_DISCLOSURE');
    END IF;
  END IF;

  -- CL-04. C2 and C8a stay visible at every beat from their first bound
  -- beat until answered or closed, because the occurrence can happen at
  -- any beat. Every other set keeps its per-beat bindings unchanged.
  IF p_capture_set_code IN ('C2', 'C8a') AND NOT v_answered THEN
    RETURN jsonb_build_object(
      'visible', true,
      'reason', 'UNANSWERED_OCCURRENCE_SET_STAYS_VISIBLE',
      'whole_session_lines_offered', (v_close_ord IS NOT NULL AND v_this_ord = v_close_ord),
      'closes_at', coalesce(v_close_beat, 'commit'));
  END IF;

  RETURN jsonb_build_object(
    'visible', EXISTS (SELECT 1 FROM public.t3a_d1_beat_capture_binding b
                        WHERE b.source_identifier = v_source
                          AND b.capture_set_code = p_capture_set_code
                          AND b.beat_code = p_beat_code),
    'reason', 'PER_BEAT_BINDING',
    -- CL-02. Whole-session lines are offered only where the determination
    -- closes at this beat.
    'whole_session_lines_offered', (v_close_ord IS NOT NULL AND v_this_ord = v_close_ord),
    'records_first_occurrence', coalesce(v_occurrence, false),
    'closes_at', coalesce(v_close_beat, 'commit'));
END;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_capture_selection_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_source        text;
  v_close_beat    text;
  v_close_ord     int;
  v_this_ord      int;
  v_occurrence    boolean;
  v_whole_session boolean;
  v_prior         record;
BEGIN
  SELECT cv.body ->> 'source_identifier' INTO v_source
    FROM public.t3a_stage_entry_event e
    JOIN public.t3a_d1_content_version cv
      ON cv.content_version_id = e.source_version_id
   WHERE e.stage_entry_event_id = NEW.stage_entry_event_id;

  IF v_source IS NULL THEN
    RAISE EXCEPTION 'CAPTURE_SELECTION_NO_SOURCE: the Stage entry names no source version'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT s.records_first_occurrence INTO v_occurrence
    FROM public.t3a_d1_capture_set s WHERE s.capture_set_code = NEW.capture_set_code;

  SELECT l.is_whole_session_answer INTO v_whole_session
    FROM public.t3a_d1_capture_line l
   WHERE l.capture_set_code = NEW.capture_set_code
     AND l.line_order = NEW.line_order;

  IF v_whole_session IS NULL THEN
    RAISE EXCEPTION 'CAPTURE_LINE_NOT_IN_SET: line % is not a line of %', NEW.line_order, NEW.capture_set_code
      USING ERRCODE = 'check_violation';
  END IF;

  v_close_beat := public.t3a_d1_capture_close_beat(v_source, NEW.capture_set_code);

  SELECT beat_ordinal INTO v_this_ord
    FROM public.t3a_d1_mentor_action_sequence
   WHERE source_identifier = v_source AND beat_code = NEW.beat_code;

  IF v_close_beat IS NOT NULL THEN
    SELECT beat_ordinal INTO v_close_ord
      FROM public.t3a_d1_mentor_action_sequence
     WHERE source_identifier = v_source AND beat_code = v_close_beat;

    -- CL-01. After a final beat, nothing further is accepted for that
    -- determination.
    IF v_this_ord IS NOT NULL AND v_close_ord IS NOT NULL AND v_this_ord > v_close_ord THEN
      RAISE EXCEPTION 'DETERMINATION_CLOSED: % closed at beat % on %; no selection or revision is accepted after it.',
        NEW.capture_set_code, v_close_beat, v_source
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- CL-02. A whole-session line is offered only when the determination
  -- closes: at its final beat, or at commit where it has none.
  IF v_whole_session THEN
    IF v_close_beat IS NULL THEN
      -- Closes at commit. The commit route records it; a mid-session beat
      -- may not.
      IF NEW.beat_code <> '__COMMIT__' THEN
        RAISE EXCEPTION 'WHOLE_SESSION_ANSWER_BEFORE_CLOSE: % line % can only be true once the session has ended, and % has no final beat for it, so it is offered at commit — not at beat %.',
          NEW.capture_set_code, NEW.line_order, v_source, NEW.beat_code
          USING ERRCODE = 'check_violation';
      END IF;
    ELSIF NEW.beat_code <> v_close_beat THEN
      RAISE EXCEPTION 'WHOLE_SESSION_ANSWER_BEFORE_CLOSE: % line % is offered only at its closing beat % on %, not at beat %.',
        NEW.capture_set_code, NEW.line_order, v_close_beat, v_source, NEW.beat_code
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- CL-03. An occurrence, once recorded, is never revised to a later
  -- occurrence. "update" does not overwrite a recorded occurrence.
  IF coalesce(v_occurrence, false) THEN
    SELECT s.line_order, s.beat_code, l.is_whole_session_answer
      INTO v_prior
      FROM public.t3a_d1_capture_selection s
      JOIN public.t3a_d1_capture_line l
        ON l.capture_set_code = s.capture_set_code AND l.line_order = s.line_order
     WHERE s.stage_entry_event_id = NEW.stage_entry_event_id
       AND s.question_code = NEW.question_code
       AND s.capture_set_code = NEW.capture_set_code
     ORDER BY s.selected_at, s.capture_selection_id
     LIMIT 1;

    IF v_prior.line_order IS NOT NULL
       AND NOT coalesce(v_prior.is_whole_session_answer, false)
       AND v_prior.line_order IS DISTINCT FROM NEW.line_order THEN
      RAISE EXCEPTION 'OCCURRENCE_ALREADY_RECORDED: % recorded occurrence line % at beat %; an occurrence is fixed where it happened and is never revised to a later one.',
        NEW.capture_set_code, v_prior.line_order, v_prior.beat_code
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_version_set(p_stage_entry_event_id uuid, p_source_version_id uuid, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'stage_entry_event_id', p_stage_entry_event_id,
    'source_version_id',    p_source_version_id,
    'answers',              p_answers,

    -- The source text itself, by hash. If the body were ever to change
    -- under a committed record, this is what would stop agreeing with it.
    'source_version_hash',
      (SELECT cv.body ->> 'source_version_hash'
         FROM public.t3a_d1_content_version cv
        WHERE cv.content_version_id = p_source_version_id),

    -- The question register as served: every question code with the
    -- shape that governed it.
    'question_object_version',
      (SELECT encode(extensions.digest(
                string_agg(q.question_code || '|' || q.answer_type || '|'
                           || q.applicability, E'\n' ORDER BY q.display_order),
                'sha256'), 'hex')
         FROM public.t3a_d1_question_object q),

    -- The answer catalogue: the capture sets and their lines. This is
    -- what "answer-catalog version" means — a determination recorded
    -- against a line that has since been reworded must still resolve to
    -- the line that was actually shown.
    'answer_catalogue_version',
      (SELECT encode(extensions.digest(
                string_agg(s.capture_set_code || '|' || l.line_order || '|' || l.line_text,
                           E'\n' ORDER BY s.display_order, l.line_order),
                'sha256'), 'hex')
         FROM public.t3a_d1_capture_set s
         JOIN public.t3a_d1_capture_line l ON l.capture_set_code = s.capture_set_code),

    -- Applicability: the branch rules that decided which questions were
    -- served at all. A record that cannot say which rules applied cannot
    -- explain why a question is absent.
    'applicability_version',
      (SELECT encode(extensions.digest(
                string_agg(b.rule_code || '|' || b.rule_condition || '|' || b.rule_effect,
                           E'\n' ORDER BY b.rule_order),
                'sha256'), 'hex')
         FROM public.t3a_d1_branch_rule b),

    'pinned_at', now());
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_compose_observation(p_source_sheet jsonb, p_selections jsonb DEFAULT '{}'::jsonb, p_missing jsonb DEFAULT '{}'::jsonb, p_bound jsonb DEFAULT '{}'::jsonb, p_conditions text[] DEFAULT ARRAY[]::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_coverage_matrix()
 RETURNS TABLE(property text, passed boolean, detail text)
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_reference_card(p_source_identifier text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
drop function if exists public.t3a_source_dimension(uuid);
drop function if exists public.t3a_event_dimension(uuid);
