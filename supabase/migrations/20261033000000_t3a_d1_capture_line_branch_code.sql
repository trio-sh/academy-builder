-- =====================================================================
-- The capture line a mentor selects, and the branch it triggers
--
-- t3a_d1_served_questions decides what a source serves partly from the
-- answers already given: it reads 'omission', 'both', 'action',
-- 'not_within_period'. Those are branch codes. What a mentor actually
-- selects is a CAPTURE LINE. Nothing joined the two, so the cockpit had
-- no way to turn a selected line into a branch decision.
--
-- The branch rules themselves supply the join, by quoting the line:
--
--   BR-01  "Q-D1-03a returns *Corresponded* or *No account*"
--   BR-02a "Q-D1-03a returns an omission, or both"
--   BR-02b "Q-D1-03a returns an unsupported claim, or both"
--   BR-05  "Q-D1-05a returns *Did not refer to any corrective action*"
--   BR-06  "Q-D1-04b returns *aligned to the support set* or
--           *both aligned and non-aligned*"
--   BR-09  "Q-D1-08a returns *Not within the observed period*"
--
-- So the code below is read off the rule text against the line text. It
-- is not a new decision about what any answer means.
--
-- WHY THIS IS A SEPARATE COLUMN AND NOT THE ANSWER ITSELF. Two lines may
-- trigger the same branch while remaining different determinations. C5a
-- line 1 ("Named one or more specific corrective actions") and line 2
-- ("Said action was needed without naming a specific action") both refer
-- to corrective action, so both serve the same children — but they are
-- not the same finding about the participant, and a record that stored
-- only the branch code would say they were.
--
-- Therefore: a determination persists the LINE — capture set plus line
-- order — and branch_code is consulted only to decide what is served
-- next. Collapsing the two would lose evidence, which is the one thing
-- this register exists to prevent.
--
-- ONE INTERPRETATION IS RECORDED RATHER THAN ASSUMED SILENT. C5a line 2
-- is given the same branch code as line 1, because BR-05 withholds the
-- children only where the participant "did not refer to any corrective
-- action", and line 2 does refer to one without naming it. The
-- alternative reading — that only a SPECIFIC named action opens the
-- children — is not what BR-05 says, but it is close enough to the
-- wording that it is flagged for the founders rather than settled here.
-- Recorded in t3a_d1_acceptance_evidence against CS-I-13.
-- =====================================================================

set search_path = public;

ALTER TABLE public.t3a_d1_capture_line
  ADD COLUMN IF NOT EXISTS branch_code text;

COMMENT ON COLUMN public.t3a_d1_capture_line.branch_code IS
  'The value t3a_d1_served_questions reads when evaluating the branch rules. NULL where the line triggers no branch. It is NOT the determination: a determination persists the capture set and line order, because two lines may share a branch code while remaining different findings.';

-- C3 — read against BR-01, BR-02a and BR-02b.
UPDATE public.t3a_d1_capture_line SET branch_code = 'corresponded'
  WHERE capture_set_code = 'C3' AND line_order = 1;
UPDATE public.t3a_d1_capture_line SET branch_code = 'omission'
  WHERE capture_set_code = 'C3' AND line_order = 2;
UPDATE public.t3a_d1_capture_line SET branch_code = 'unsupported_claim'
  WHERE capture_set_code = 'C3' AND line_order = 3;
UPDATE public.t3a_d1_capture_line SET branch_code = 'both'
  WHERE capture_set_code = 'C3' AND line_order = 4;
UPDATE public.t3a_d1_capture_line SET branch_code = 'no_account'
  WHERE capture_set_code = 'C3' AND line_order = 5;

-- C4b — read against BR-06. Lines 2 and 4 serve the bound child; lines 1
-- and 3 do not, because in neither is there an aligned item to identify.
UPDATE public.t3a_d1_capture_line SET branch_code = 'no_attribution'
  WHERE capture_set_code = 'C4b' AND line_order = 1;
UPDATE public.t3a_d1_capture_line SET branch_code = 'aligned'
  WHERE capture_set_code = 'C4b' AND line_order = 2;
UPDATE public.t3a_d1_capture_line SET branch_code = 'none_aligned'
  WHERE capture_set_code = 'C4b' AND line_order = 3;
UPDATE public.t3a_d1_capture_line SET branch_code = 'both'
  WHERE capture_set_code = 'C4b' AND line_order = 4;

-- C5a — read against BR-05. See the note above on line 2.
UPDATE public.t3a_d1_capture_line SET branch_code = 'action'
  WHERE capture_set_code = 'C5a' AND line_order IN (1, 2);
UPDATE public.t3a_d1_capture_line SET branch_code = 'no_action'
  WHERE capture_set_code = 'C5a' AND line_order = 3;

-- C8a — read against BR-09. Only line 4 withholds Q-D1-08b.
UPDATE public.t3a_d1_capture_line SET branch_code = 'disclosed'
  WHERE capture_set_code = 'C8a' AND line_order IN (1, 2, 3);
UPDATE public.t3a_d1_capture_line SET branch_code = 'not_within_period'
  WHERE capture_set_code = 'C8a' AND line_order = 4;

-- Turn a set of selected lines into the answers object the branch rules
-- read, so the interface never assembles branch codes itself.
CREATE OR REPLACE FUNCTION public.t3a_d1_branch_answers(p_selected jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
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
$fn$;

COMMENT ON FUNCTION public.t3a_d1_branch_answers(jsonb) IS
  'Maps selected capture lines to the branch codes t3a_d1_served_questions reads. The interface sends the lines it was offered; it never composes a branch code.';
