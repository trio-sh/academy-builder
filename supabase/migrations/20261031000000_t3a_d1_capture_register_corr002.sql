-- =====================================================================
-- T3A-D1-EXEC-CORR-002 — the capture-set register, ruled and loaded
--
-- The ruling arrived. It corrects the reading this build was working
-- from, and the correction matters more than the mapping does.
--
-- THE PREMISE THAT WAS WRONG. 20261030000000 was built on the idea that
-- a question is EITHER answered from a capture set OR bound to a source
-- field — answer_origin, with a CHECK enforcing exactly one. That is
-- false. Being source-bound does not remove a question from a capture
-- set. The binding supplies the OPTIONS; the capture set supplies the
-- LINES. C3 and C6 are both source-bound and both have sets.
--
-- So the constraint that migration called structural enforcement was
-- enforcing a fiction, and it would have refused five of the fifteen
-- rows now being loaded. It is dropped here.
--
-- WHAT RECONCILES THE COUNTS, and it is not what was guessed. C3 is one
-- visual group holding THREE separately persisted controls — Q-D1-03a,
-- Q-D1-03b1 and Q-D1-03b2 — because the child selections belong to the
-- same moment of capture. Twelve sets hold one question object each,
-- C3 holds three: twelve plus three is fifteen, across thirteen sets.
-- The guessed arithmetic (thirteen sets plus two unmapped questions)
-- reached the same total by a route that does not hold. There was never
-- a "source-bound pair" to find: there are FIVE source-bound consuming
-- controls, fed by four families, because Q-D1-05b2 and Q-D1-06 both
-- consume available_routes.
--
-- WHAT THE FILE GOT WRONG ABOUT ITSELF. Section 5.2's Q-D1-04b row says
-- the bound child is served "on one option". BR-06 in the same file says
-- it is served on TWO — all-aligned, and both-aligned-and-non-aligned —
-- because the resolution table needs the aligned items in each. BR-06
-- governs; the column is corrected. t3a_d1_served_questions already
-- implements BR-06 correctly, so the serving logic needs no change on
-- this point: it was right, and the register row it was checked against
-- was the thing that was wrong.
--
-- ALSO SETTLED. The two source-sheet fields this build had been
-- reporting as outstanding are present in the issued edition
-- (SRC-D1-S1-010 attribution_support_set, SRC-D1-S3-010
-- available_routes) and were never a dependency of this register. The
-- register is source-independent: which set a question uses is fixed
-- across every source, and a source that does not carry the field does
-- not serve the question at all.
--
-- Ruling: T3A-D1-EXEC-CORR-002, IMPLEMENT AS SPECIFIED,
-- docs/d1-execution/T3A-D1-EXEC-CORR-002-Capture-Set-Register.md
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. Correct the register's shape
-- ---------------------------------------------------------------------

-- The either/or constraint encoded the false premise. Both facts are now
-- held at once: every question object has a capture set, and five of them
-- additionally bind their options to a source family.
ALTER TABLE public.t3a_d1_question_capture_map
  DROP CONSTRAINT IF EXISTS t3a_d1_question_capture_map_origin_consistent;

ALTER TABLE public.t3a_d1_question_capture_map
  DROP COLUMN IF EXISTS answer_origin;

ALTER TABLE public.t3a_d1_question_capture_map
  RENAME COLUMN bound_field TO source_bound_family;

-- CS-I-01: the register holds capture_set, element, answer_type,
-- source_bound_family and applicability_rule, read at serve time.
ALTER TABLE public.t3a_d1_question_capture_map
  ADD COLUMN IF NOT EXISTS conduct_element    text,
  ADD COLUMN IF NOT EXISTS answer_type        text,
  ADD COLUMN IF NOT EXISTS applicability_rule text,
  -- C3 holds three controls; this orders them within the visual group.
  ADD COLUMN IF NOT EXISTS control_ordinal    integer;

-- Every question object has a capture set. No exceptions, which is the
-- whole correction.
ALTER TABLE public.t3a_d1_question_capture_map
  ALTER COLUMN capture_set_code SET NOT NULL;

COMMENT ON COLUMN public.t3a_d1_question_capture_map.source_bound_family IS
  'The source-version field supplying this control''s OPTIONS, where it has one. Independent of capture_set_code, which supplies the LINES: a control may have both, and five of the fifteen do. Four families feed five consuming controls, because Q-D1-05b2 and Q-D1-06 both consume available_routes.';

COMMENT ON COLUMN public.t3a_d1_question_capture_map.control_ordinal IS
  'Position within a capture set holding more than one control. Only C3 does: Q-D1-03a, Q-D1-03b1 and Q-D1-03b2 render as one visual group and persist as three determinations, never one.';

-- ---------------------------------------------------------------------
-- 2. The guard, corrected
-- ---------------------------------------------------------------------

-- The old guard checked source_bound_family against
-- t3a_d1_served_questions.bound_family. That mismatches by design for
-- Q-D1-04b: the register row carries the family (the parent owns the
-- binding) while the serving function reports it on the emitted child
-- row Q-D1-04b-child. Checking the parent against the child's row would
-- refuse a correct ruling, so the check now accepts either.
CREATE OR REPLACE FUNCTION public.t3a_d1_question_capture_map_guard()
RETURNS trigger LANGUAGE plpgsql AS $fn$
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
$fn$;

-- ---------------------------------------------------------------------
-- 3. The register, loaded — CORR-002 Section 2
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_question_capture_map
  (question_code, capture_set_code, conduct_element, answer_type,
   source_bound_family, applicability_rule, control_ordinal,
   ruling_reference, ruled_by, note)
VALUES
  ('Q-D1-01',    'C1',   'CE-01', 'Single select, fixed', NULL,
   'Always where the element is in play', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.', NULL),

  ('Q-D1-02',    'C2',   'CE-02', 'Single select, fixed', NULL,
   'Source carries enquiry_point', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.', NULL),

  ('Q-D1-03a',   'C3',   'CE-03', 'Single select, fixed', NULL,
   'Source carries information_made_available and material_items', 1,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.',
   'C3 control 1 of 3. One visual group, three persisted determinations.'),

  ('Q-D1-03b1',  'C3',   'CE-03', 'Structured selection, multi', 'material_items',
   'Q-D1-03a returned an omission, or both', 2,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.',
   'C3 control 2 of 3. Source-bound AND set-mapped: the binding supplies the options, C3 supplies the lines.'),

  ('Q-D1-03b2',  'C3',   'CE-03', 'Constrained selection', 'assertion_reference_set',
   'Q-D1-03a returned an unsupported claim, or both', 3,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.',
   'C3 control 3 of 3.'),

  ('Q-D1-04a',   'C4a',  'CE-04', 'Single select, fixed', NULL,
   'Always where the element is in play', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.', NULL),

  ('Q-D1-04b',   'C4b',  'CE-04',
   'Single select, fixed, with a bound child selection on two options',
   'attribution_support_set', 'Source carries attribution_support_set', NULL,
   'T3A-D1-EXEC-CORR-002 Section 1.2', 'Tony Mofoke, The 3rd Academy Inc.',
   'CORR-002 corrects Section 5.2 line 813: the child is served on TWO options, not one. BR-06 governs and already implements it.'),

  ('Q-D1-05a',   'C5a',  'CE-05', 'Single select, fixed', NULL,
   'Always where the element is in play', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.', NULL),

  ('Q-D1-05b1',  'C5b1', 'CE-05', 'Single select, fixed', NULL,
   'accountable_actor_available = true AND Q-D1-05a returned an action', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.', NULL),

  ('Q-D1-05b2',  'C5b2', 'CE-05', 'Single select, fixed', 'available_routes',
   'Source carries available_routes AND Q-D1-05a returned an action', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.',
   'One of two controls consuming available_routes.'),

  ('Q-D1-05c',   'C5c',  'CE-05', 'Single select, fixed', NULL,
   'time_reference_called_for = true AND Q-D1-05a returned an action', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.', NULL),

  ('Q-D1-06',    'C6',   'CE-06',
   'Structured selection, single, bound plus two fixed options', 'available_routes',
   'Source carries available_routes', NULL,
   'T3A-D1-EXEC-CORR-002 Section 1.3', 'Tony Mofoke, The 3rd Academy Inc.',
   'C6 line 1 is the bound slot; lines 2 and 3 are the two fixed options. With n routes C6 renders n+2 lines.'),

  ('Q-D1-07',    'C7',   'CE-07', 'Single select, fixed', NULL,
   'Source carries account_test_point AND post_test_account_opportunity', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.', NULL),

  ('Q-D1-08a',   'C8a',  'CE-08', 'Single select, fixed — timing relative to the decision', NULL,
   'Source carries bearing_interest', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.', NULL),

  ('Q-D1-08b',   'C8b',  'CE-08', 'Single select, fixed — prompt condition', NULL,
   'Source carries bearing_interest AND Q-D1-08a returned a disclosure', NULL,
   'T3A-D1-EXEC-CORR-002 Section 2', 'Tony Mofoke, The 3rd Academy Inc.', NULL)
ON CONFLICT (question_code) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. The gap view and the read route, corrected for the new shape
-- ---------------------------------------------------------------------

DROP VIEW IF EXISTS public.t3a_d1_question_capture_gap;
CREATE VIEW public.t3a_d1_question_capture_gap AS
  SELECT qo.question_code, qo.conduct_element, qo.answer_type
  FROM public.t3a_d1_question_object qo
  LEFT JOIN public.t3a_d1_question_capture_map m
    ON m.question_code = qo.question_code
  WHERE m.question_code IS NULL;

COMMENT ON VIEW public.t3a_d1_question_capture_gap IS
  'Question objects carrying no ruled capture mapping. Empty means the register is complete. Q-D1-04b-child is deliberately absent: it is the bound child OF Q-D1-04b, not a question object of its own, and its options come from the parent''s source_bound_family.';

-- CS-I-04 and CS-I-16: an unresolvable set refuses. It does not render a
-- partial set, substitute a neighbouring one, or fall back to free text.
CREATE OR REPLACE FUNCTION public.t3a_d1_capture_for_question(p_question_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
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
$fn$;

GRANT SELECT ON public.t3a_d1_question_capture_gap TO authenticated;
