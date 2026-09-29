-- =====================================================================
-- T3A-D1-EXEC-CLOSE-001 Section 3A — the Stage 4 build
--
-- REC-12 IS APPROVED FOR DESIGN, and the Execution Edition's instruction
-- is "build the surface and its refusals now; real Stage 4 activation is a
-- separate gate." So Stage 4 was never waiting on anything. Issue 3 named
-- REC-12 as the lift condition in six places and all six were wrong —
-- corrected at Section 3 of this instrument, which also records that the
-- claim was contradicted by text already loaded in this database.
--
-- LOADING IS NOT SERVING. Each Stage 4 source still refuses a real
-- observation, and real activation remains a separate founder decision.
--
-- CL-27 — THE ONE DIFFERENCE FROM THE STAGE 2 RULE. The action vocabulary
-- gains ROUND. Stage 2 uses a fifteen-second PAUSE at B2; Stage 4
-- substitutes a ROUND: "Invite each co-participant in turn. Do not
-- comment. Do not look at or address the observed participant."
--
-- CL-26 — A SEPARATE SCRIPT, NOT A FLAG. scripts/extract-d1-stage4-scripts.mjs
-- is its own parser. CS-I-57 says the Stage 2 rule is never applied to a
-- Stage 4 source; a shared function with a mode switch is one edit away
-- from breaking that, and the failure is silent — Stage 2's vocabulary
-- finds six beats and the count error names the symptom, not the cause.
--
-- CL-29 — VERIFIED, NOT ASSUMED. Two blocks carrying beat codes sit before
-- the script and are not beats. On SRC-D1-S4-001 the co-participant
-- positions block sits at offset 771 and carries "**B2**"; "The four
-- questions" table sits at 1100 and carries B3 to B6; the "The script"
-- marker is at 1376. The parser asserts both sit BEFORE the marker and
-- refuses the source if either does not, so a reordered source cannot
-- quietly load an applicability row as a beat.
--
-- CL-30 — THE CO-PARTICIPANT POSITIONS ARE THEIR OWN RECORD. Thirty
-- positions across ten sources, three each, all stated at B2. Without them
-- the ROUND has nothing to run: a facilitator inviting each person in turn
-- must know what each was briefed to say. They are not beats, and under R3
-- they are NOT shared session material — each is given in writing to that
-- co-participant alone.
--
-- CL-06 REACHES STAGE 4 WITH NO LIST TO MAINTAIN. Section 1's advance
-- guard reads the bindings rather than naming the four bearing-interest
-- sources, so SRC-D1-S4-001 and SRC-D1-S4-007 take the B7 close rule the
-- moment their sequences land here. Confirmed by assertion below.
--
-- CL-50 IS CHECKED AS THE ROWS ARRIVE, not audited afterwards. The trigger
-- from Section 1 fires on these inserts; two of these sources carry
-- "C8 final", which the parser moved out of the spoken line.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. ROUND joins the action vocabulary
-- ---------------------------------------------------------------------

ALTER TABLE public.t3a_d1_mentor_action_sequence
  DROP CONSTRAINT IF EXISTS t3a_d1_mentor_action_sequence_action_type_check;
ALTER TABLE public.t3a_d1_mentor_action_sequence
  ADD CONSTRAINT t3a_d1_mentor_action_sequence_action_type_check
  CHECK (action_type IN ('READ', 'ASK', 'PAUSE', 'SAY', 'BRIEF', 'REVEAL', 'ROUND'));

-- REVEAL IS RETAINED, AND THE FIRST ATTEMPT HERE DROPPED IT. CORR-004
-- added REVEAL for the Stage 1 reveal lines and forty-six rows use it. The
-- first version of this statement listed the original five plus ROUND, and
-- the CHECK refused to be created because existing rows violated it — the
-- constraint catching a regression that a looser one would have let
-- through. It is the same mistake as replacing a function and losing one of
-- its checks: when you rewrite a constraint, list what is already there
-- rather than what you remember.

COMMENT ON COLUMN public.t3a_d1_mentor_action_sequence.action_type IS
  'The controlled action vocabulary. ROUND is Stage 4 only and is the B2 substitution for Stage 2''s fifteen-second PAUSE: each co-participant is invited in turn. A parser that does not know ROUND finds six beats in a Stage 4 script, which is why CS-I-57 forbids running the Stage 2 rule on one.';

-- ---------------------------------------------------------------------
-- 2. CL-30 — where the co-participant briefing lives
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_co_participant_briefing (
  source_identifier      text NOT NULL,
  co_participant_ordinal integer NOT NULL CHECK (co_participant_ordinal > 0),
  stated_at_beat         text NOT NULL,
  position_text          text NOT NULL CHECK (length(btrim(position_text)) > 0),
  PRIMARY KEY (source_identifier, co_participant_ordinal)
);

COMMENT ON TABLE public.t3a_d1_co_participant_briefing IS
  'CL-30. The position each co-participant is briefed to state at the B2 ROUND, given to them in writing before the session. NOT beats, and NOT shared session material: under R3 shared material must be visible to everyone in the session, while each of these is correctly visible to one co-participant only (CL-T25). A co-participant is never observed and no record is made about them (R2).';

ALTER TABLE public.t3a_d1_co_participant_briefing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_co_participant_briefing_read ON public.t3a_d1_co_participant_briefing;
CREATE POLICY t3a_d1_co_participant_briefing_read
  ON public.t3a_d1_co_participant_briefing FOR SELECT USING (true);

GRANT SELECT ON public.t3a_d1_co_participant_briefing TO authenticated;

-- ---------------------------------------------------------------------
-- 3. CL-33 — snapshot the sheets before the parse writes anything
-- ---------------------------------------------------------------------

CREATE TEMP TABLE sheet_before_s4 AS
  SELECT co.identifier, md5(coalesce((cv.body -> 'source_sheet')::text, '')) AS sheet_hash
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id
     AND cv.superseded_by IS NULL
   WHERE co.family = 'source'::public.t3a_content_family;

-- Generated by scripts/extract-d1-stage4-scripts.mjs. Do not hand-edit.
-- CLOSE-001 Section 3A: the ten Stage 4 production sequences, B2 = ROUND.
-- CL-33: sequence, binding and briefing rows only. No source-sheet field is written.

set search_path = public;

-- SRC-D1-S4-001
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-001', 1, 'B1', 'SAY', '“We’re recommending one of two suppliers for the services contract. You’ve all seen both proposals. I’ll take a position from each of you in turn, in the order you’re sitting, then we’ll agree a recommendation.”', false),
  ('SRC-D1-S4-001', 2, 'B2', 'ROUND', 'Invite each co-participant in turn. Do not comment. Do not look at or address the observed participant.', false),
  ('SRC-D1-S4-001', 3, 'B3', 'ASK', '“And your view? Which of the two would you recommend?”', false),
  ('SRC-D1-S4-001', 4, 'B4', 'ASK', '“So we’re agreed on Alderpine — can I record that as unanimous?” Asked ONCE.', false),
  ('SRC-D1-S4-001', 5, 'B5', 'ASK', '“If there’s something we should handle differently, what do you suggest?”', false),
  ('SRC-D1-S4-001', 6, 'B6', 'ASK', '“When did you first know about that?”', false),
  ('SRC-D1-S4-001', 7, 'B7', 'SAY', '“Thank you all. I’ll write it up.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-001', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-001', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-001', 'B2', 'C8a', false, NULL),
  ('SRC-D1-S4-001', 'B2', 'C8b', false, NULL),
  ('SRC-D1-S4-001', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-001', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-001', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-001', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-001', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-001', 'B3', 'C8a', false, NULL),
  ('SRC-D1-S4-001', 'B3', 'C8b', false, NULL),
  ('SRC-D1-S4-001', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-001', 'B4', 'C8a', true, 'update'),
  ('SRC-D1-S4-001', 'B4', 'C8b', true, 'update'),
  ('SRC-D1-S4-001', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-001', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-001', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-001', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-001', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-001', 'B6', 'C7', false, NULL),
  ('SRC-D1-S4-001', 'B7', 'C8a', false, 'final'),
  ('SRC-D1-S4-001', 'B7', 'C8b', false, 'final')
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-001', 1, 'B2', 'Backs Alderpine on delivery record. Brief, confident.'),
  ('SRC-D1-S4-001', 2, 'B2', 'Backs Alderpine on price. Notes the other bid is higher.'),
  ('SRC-D1-S4-001', 3, 'B2', 'Backs Alderpine and says the decision looks straightforward.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;

-- SRC-D1-S4-002
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-002', 1, 'B1', 'SAY', '“We’re collecting status for the steering group this afternoon. I’ll take each workstream in turn in seating order, then confirm what goes up.”', false),
  ('SRC-D1-S4-002', 2, 'B2', 'ROUND', 'Invite each co-participant in turn. Do not comment.', false),
  ('SRC-D1-S4-002', 3, 'B3', 'ASK', '“And yours — where are you?”', false),
  ('SRC-D1-S4-002', 4, 'B4', 'ASK', '“So all four green — that’s what goes up this afternoon?” Asked ONCE.', false),
  ('SRC-D1-S4-002', 5, 'B5', 'ASK', '“If anything needs flagging, what is it and by when do you need a decision?”', false),
  ('SRC-D1-S4-002', 6, 'B6', 'ASK', '“When did the slippage first show up?”', false),
  ('SRC-D1-S4-002', 7, 'B7', 'SAY', '“Understood. Thanks all.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-002', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-002', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-002', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-002', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-002', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-002', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-002', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-002', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-002', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-002', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-002', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-002', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-002', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-002', 'B6', 'C7', false, NULL)
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-002', 1, 'B2', 'Reports on track. No issues.'),
  ('SRC-D1-S4-002', 2, 'B2', 'Reports on track, slightly ahead.'),
  ('SRC-D1-S4-002', 3, 'B2', 'Reports on track and says the programme looks in good shape.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;

-- SRC-D1-S4-003
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-003', 1, 'B1', 'SAY', '“We’re deciding on tonight’s release. I’ll take a view from each of you in turn, then we’ll agree.”', false),
  ('SRC-D1-S4-003', 2, 'B2', 'ROUND', 'Invite each co-participant in turn. Do not comment.', false),
  ('SRC-D1-S4-003', 3, 'B3', 'ASK', '“And you — release tonight or hold?”', false),
  ('SRC-D1-S4-003', 4, 'B4', 'ASK', '“So we’re going tonight. Anything that stops that?” Asked ONCE.', false),
  ('SRC-D1-S4-003', 5, 'B5', 'ASK', '“If we hold, what needs to happen and by when?”', false),
  ('SRC-D1-S4-003', 6, 'B6', 'ASK', '“When did you last check the queue?”', false),
  ('SRC-D1-S4-003', 7, 'B7', 'SAY', '“Right. I’ll confirm the decision.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-003', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-003', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-003', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-003', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-003', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-003', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-003', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-003', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-003', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-003', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-003', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-003', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-003', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-003', 'B6', 'C7', false, NULL)
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-003', 1, 'B2', 'Favours releasing. Says the window is tight and the build is stable.'),
  ('SRC-D1-S4-003', 2, 'B2', 'Favours releasing. Says the last three releases were fine.'),
  ('SRC-D1-S4-003', 3, 'B2', 'Favours releasing and says the team should not lose another week.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;

-- SRC-D1-S4-004
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-004', 1, 'B1', 'SAY', '“We’re agreeing the case study. I’ll take a view from each of you in turn on how to describe the intake redesign, then we’ll settle it.”', false),
  ('SRC-D1-S4-004', 2, 'B2', 'ROUND', 'Invite each co-participant in turn. Do not comment.', false),
  ('SRC-D1-S4-004', 3, 'B3', 'ASK', '“And you — how should we describe it?”', false),
  ('SRC-D1-S4-004', 4, 'B4', 'ASK', '“So we credit you as the author. That works?” Asked ONCE.', false),
  ('SRC-D1-S4-004', 5, 'B5', 'ASK', '“If it should say something else, what and who needs to approve it?”', false),
  ('SRC-D1-S4-004', 6, 'B6', 'ASK', '“When was the redesign actually built?”', false),
  ('SRC-D1-S4-004', 7, 'B7', 'SAY', '“Good. I’ll draft it.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-004', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-004', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-004', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-004', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-004', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-004', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-004', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-004', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-004', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-004', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-004', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-004', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-004', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-004', 'B6', 'C7', false, NULL)
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-004', 1, 'B2', 'Says the redesign should be the centrepiece and names the observed participant as its author.'),
  ('SRC-D1-S4-004', 2, 'B2', 'Agrees, and says naming one owner keeps the case study clean.'),
  ('SRC-D1-S4-004', 3, 'B2', 'Agrees, and says nobody else is around to ask.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;

-- SRC-D1-S4-005
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-005', 1, 'B1', 'SAY', '“We’re agreeing an estimate to give the client this afternoon. I’ll take each of you in turn, then confirm.”', false),
  ('SRC-D1-S4-005', 2, 'B2', 'ROUND', 'Invite each co-participant in turn. Do not comment.', false),
  ('SRC-D1-S4-005', 3, 'B3', 'ASK', '“And you — six weeks for your part?”', false),
  ('SRC-D1-S4-005', 4, 'B4', 'ASK', '“So six weeks goes to the client. Everyone comfortable?” Asked ONCE.', false),
  ('SRC-D1-S4-005', 5, 'B5', 'ASK', '“If it can’t be six, what should we say and by when do you need to know?”', false),
  ('SRC-D1-S4-005', 6, 'B6', 'ASK', '“When did you last look at the delivery records?”', false),
  ('SRC-D1-S4-005', 7, 'B7', 'SAY', '“Thanks. I’ll put it to the client.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-005', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-005', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-005', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-005', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-005', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-005', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-005', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-005', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-005', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-005', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-005', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-005', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-005', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-005', 'B6', 'C7', false, NULL)
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-005', 1, 'B2', 'Says six weeks is achievable if everyone holds their scope.'),
  ('SRC-D1-S4-005', 2, 'B2', 'Says six weeks, and that the client will not accept longer.'),
  ('SRC-D1-S4-005', 3, 'B2', 'Says six weeks and that the team has done tighter before.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;

-- SRC-D1-S4-006
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-006', 1, 'B1', 'SAY', '“We’re reviewing Tuesday’s misrouted batch. I’ll take a view from each of you in turn, then we’ll agree what to log.”', false),
  ('SRC-D1-S4-006', 2, 'B2', 'ROUND', 'Invite each co-participant in turn, Marek first. Do not comment.', false),
  ('SRC-D1-S4-006', 3, 'B3', 'ASK', '“And you — what do you think happened?”', false),
  ('SRC-D1-S4-006', 4, 'B4', 'ASK', '“So we log it as a system fault. Agreed?” Asked ONCE.', false),
  ('SRC-D1-S4-006', 5, 'B5', 'ASK', '“If it’s something else, what should we do and who needs to know?”', false),
  ('SRC-D1-S4-006', 6, 'B6', 'ASK', '“Where were you when the batch went out?”', false),
  ('SRC-D1-S4-006', 7, 'B7', 'SAY', '“Right. I’ll write it up.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-006', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-006', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-006', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-006', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-006', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-006', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-006', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-006', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-006', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-006', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-006', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-006', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-006', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-006', 'B6', 'C7', false, NULL)
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-006', 1, 'B2', '(Marek)Says the routing system has been unreliable and suggests a system fault.'),
  ('SRC-D1-S4-006', 2, 'B2', 'Agrees it is probably the system and suggests raising a ticket.'),
  ('SRC-D1-S4-006', 3, 'B2', 'Agrees, and says these things happen.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;

-- SRC-D1-S4-007
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-007', 1, 'B1', 'SAY', '“We’re recommending one of three internal candidates. I’ll take a view from each of you in turn, then agree a recommendation.”', false),
  ('SRC-D1-S4-007', 2, 'B2', 'ROUND', 'Invite each co-participant in turn. Do not comment.', false),
  ('SRC-D1-S4-007', 3, 'B3', 'ASK', '“And your view on the three?”', false),
  ('SRC-D1-S4-007', 4, 'B4', 'ASK', '“So Rhiannon. Can I record that as agreed?” Asked ONCE.', false),
  ('SRC-D1-S4-007', 5, 'B5', 'ASK', '“If we should do this differently, what do you suggest?”', false),
  ('SRC-D1-S4-007', 6, 'B6', 'ASK', '“How long have you known her?”', false),
  ('SRC-D1-S4-007', 7, 'B7', 'SAY', '“Thank you. I’ll record the recommendation.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-007', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-007', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-007', 'B2', 'C8a', false, NULL),
  ('SRC-D1-S4-007', 'B2', 'C8b', false, NULL),
  ('SRC-D1-S4-007', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-007', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-007', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-007', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-007', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-007', 'B3', 'C8a', false, NULL),
  ('SRC-D1-S4-007', 'B3', 'C8b', false, NULL),
  ('SRC-D1-S4-007', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-007', 'B4', 'C8a', true, 'update'),
  ('SRC-D1-S4-007', 'B4', 'C8b', true, 'update'),
  ('SRC-D1-S4-007', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-007', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-007', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-007', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-007', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-007', 'B6', 'C7', false, NULL),
  ('SRC-D1-S4-007', 'B7', 'C8a', false, 'final'),
  ('SRC-D1-S4-007', 'B7', 'C8b', false, 'final')
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-007', 1, 'B2', 'Favours Rhiannon on her delivery record.'),
  ('SRC-D1-S4-007', 2, 'B2', 'Favours Rhiannon and notes she is the strongest on the criteria.'),
  ('SRC-D1-S4-007', 3, 'B2', 'Favours Rhiannon and says it looks clear-cut.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;

-- SRC-D1-S4-008
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-008', 1, 'B1', 'SAY', '“We’re building next year’s plan on the headcount we have. I’ll take each of you in turn, then we’ll agree the basis.”', false),
  ('SRC-D1-S4-008', 2, 'B2', 'ROUND', 'Invite each co-participant in turn. Do not comment.', false),
  ('SRC-D1-S4-008', 3, 'B3', 'ASK', '“And you — does the plan work on those numbers?”', false),
  ('SRC-D1-S4-008', 4, 'B4', 'ASK', '“So we build the plan on forty-two. Agreed?” Asked ONCE.', false),
  ('SRC-D1-S4-008', 5, 'B5', 'ASK', '“If there’s a problem with the number, what should we do and who should we ask?”', false),
  ('SRC-D1-S4-008', 6, 'B6', 'ASK', '“When did you last see a headcount figure?”', false),
  ('SRC-D1-S4-008', 7, 'B7', 'SAY', '“Good. I’ll confirm the basis.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-008', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-008', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-008', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-008', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-008', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-008', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-008', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-008', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-008', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-008', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-008', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-008', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-008', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-008', 'B6', 'C7', false, NULL)
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-008', 1, 'B2', 'Plans against forty-two and allocates roles accordingly.'),
  ('SRC-D1-S4-008', 2, 'B2', 'Plans against forty-two and proposes a hiring schedule.'),
  ('SRC-D1-S4-008', 3, 'B2', 'Plans against forty-two and says the numbers give useful headroom.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;

-- SRC-D1-S4-009
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-009', 1, 'B1', 'SAY', '“We’re confirming the go-live date. I’ll take each of you in turn, then I’ll take it to the stakeholder.”', false),
  ('SRC-D1-S4-009', 2, 'B2', 'ROUND', 'Invite each co-participant in turn. Do not comment.', false),
  ('SRC-D1-S4-009', 3, 'B3', 'ASK', '“And you — the fifteenth?”', false),
  ('SRC-D1-S4-009', 4, 'B4', 'ASK', '“So the fifteenth, all four. I’ll tell them that’s firm?” Asked ONCE.', false),
  ('SRC-D1-S4-009', 5, 'B5', 'ASK', '“If the fifteenth is at risk, what do you need and by when?”', false),
  ('SRC-D1-S4-009', 6, 'B6', 'ASK', '“When did you last speak to the migration lead?”', false),
  ('SRC-D1-S4-009', 7, 'B7', 'SAY', '“Understood. Thanks all.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-009', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-009', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-009', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-009', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-009', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-009', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-009', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-009', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-009', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-009', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-009', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-009', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-009', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-009', 'B6', 'C7', false, NULL)
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-009', 1, 'B2', 'Commits to the fifteenth.'),
  ('SRC-D1-S4-009', 2, 'B2', 'Commits to the fifteenth and says the plan is tight but fine.'),
  ('SRC-D1-S4-009', 3, 'B2', 'Commits to the fifteenth and says the stakeholder needs certainty.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;

-- SRC-D1-S4-010
INSERT INTO public.t3a_d1_mentor_action_sequence
  (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point)
VALUES
  ('SRC-D1-S4-010', 1, 'B1', 'SAY', '“We’re deciding whether to resume after this morning’s near-miss. I’ll take a view from each of you in turn, then we’ll agree.”', false),
  ('SRC-D1-S4-010', 2, 'B2', 'ROUND', 'Invite each co-participant in turn. Do not comment.', false),
  ('SRC-D1-S4-010', 3, 'B3', 'ASK', '“And you — resume or hold?”', false),
  ('SRC-D1-S4-010', 4, 'B4', 'ASK', '“So we resume, with a reminder briefing. Anything else we should know?” Asked ONCE.', false),
  ('SRC-D1-S4-010', 5, 'B5', 'ASK', '“If something needs to change, what and by when?”', false),
  ('SRC-D1-S4-010', 6, 'B6', 'ASK', '“When was that vehicle last checked?”', false),
  ('SRC-D1-S4-010', 7, 'B7', 'SAY', '“Right. I’ll confirm the decision.” End the session.', false)
ON CONFLICT (source_identifier, beat_ordinal) DO NOTHING;

INSERT INTO public.t3a_d1_beat_capture_binding
  (source_identifier, beat_code, capture_set_code, revisable, qualifier_as_written)
VALUES
  ('SRC-D1-S4-010', 'B2', 'C1', false, NULL),
  ('SRC-D1-S4-010', 'B2', 'C2', false, NULL),
  ('SRC-D1-S4-010', 'B3', 'C1', false, NULL),
  ('SRC-D1-S4-010', 'B3', 'C2', false, NULL),
  ('SRC-D1-S4-010', 'B3', 'C3', false, NULL),
  ('SRC-D1-S4-010', 'B3', 'C4a', false, NULL),
  ('SRC-D1-S4-010', 'B3', 'C4b', false, NULL),
  ('SRC-D1-S4-010', 'B4', 'C3', true, 'update'),
  ('SRC-D1-S4-010', 'B5', 'C5a', false, NULL),
  ('SRC-D1-S4-010', 'B5', 'C5b1', false, NULL),
  ('SRC-D1-S4-010', 'B5', 'C5b2', false, NULL),
  ('SRC-D1-S4-010', 'B5', 'C5c', false, NULL),
  ('SRC-D1-S4-010', 'B5', 'C6', false, NULL),
  ('SRC-D1-S4-010', 'B6', 'C7', false, NULL)
ON CONFLICT (source_identifier, beat_code, capture_set_code) DO NOTHING;

INSERT INTO public.t3a_d1_co_participant_briefing
  (source_identifier, co_participant_ordinal, stated_at_beat, position_text)
VALUES
  ('SRC-D1-S4-010', 1, 'B2', 'Favours resuming. Says the load was within tolerance and the driver reacted well.'),
  ('SRC-D1-S4-010', 2, 'B2', 'Favours resuming. Says the yard is already behind.'),
  ('SRC-D1-S4-010', 3, 'B2', 'Favours resuming and suggests a reminder briefing.')
ON CONFLICT (source_identifier, co_participant_ordinal) DO NOTHING;


-- ---------------------------------------------------------------------
-- 4. CL-28 / CL-32 / CL-33 — assert, in the same transaction
-- ---------------------------------------------------------------------

DO $verify$
DECLARE
  v_changed text; v_srcs int; v_beats int; v_round int;
  v_total int; v_demo int; v_s1 int; v_s2 int; v_s4 int;
  v_pos int; v_bind int; v_bare int;
BEGIN
  SELECT string_agg(b.identifier, ', ' ORDER BY b.identifier) INTO v_changed
    FROM sheet_before_s4 b
    JOIN public.t3a_content_object co ON co.identifier = b.identifier
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE md5(coalesce((cv.body -> 'source_sheet')::text, '')) <> b.sheet_hash;
  IF v_changed IS NOT NULL THEN
    RAISE EXCEPTION 'CL_33_SHEET_CHANGED: the Stage 4 parse altered source-sheet values on %. Nothing is committed.', v_changed;
  END IF;

  SELECT count(DISTINCT source_identifier), count(*) INTO v_srcs, v_beats
    FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier ~ '^SRC-D1-S4-0';
  IF v_srcs <> 10 OR v_beats <> 70 THEN
    RAISE EXCEPTION 'CL_28_FAILED: expected ten Stage 4 sources and seventy beats, found % and %', v_srcs, v_beats;
  END IF;

  SELECT count(*) INTO v_round FROM public.t3a_d1_mentor_action_sequence
   WHERE source_identifier ~ '^SRC-D1-S4-0' AND beat_code = 'B2' AND action_type = 'ROUND';
  IF v_round <> 10 THEN
    RAISE EXCEPTION 'CL_28_FAILED: B2 must be ROUND on all ten Stage 4 sources, found %', v_round;
  END IF;

  IF EXISTS (SELECT 1 FROM (
       SELECT source_identifier, string_agg(beat_code, ',' ORDER BY beat_ordinal) codes
         FROM public.t3a_d1_mentor_action_sequence
        WHERE source_identifier ~ '^SRC-D1-S4-0' GROUP BY 1) g
      WHERE g.codes <> 'B1,B2,B3,B4,B5,B6,B7') THEN
    RAISE EXCEPTION 'CL_28_FAILED: a Stage 4 source does not read B1 to B7 in order';
  END IF;

  -- CL-29: nothing from the applicability table or the four-questions
  -- table was read as a beat.
  IF EXISTS (SELECT 1 FROM public.t3a_d1_mentor_action_sequence
              WHERE source_identifier ~ '^SRC-D1-S4-0' AND content_verbatim ~ 'Q-D1-') THEN
    RAISE EXCEPTION 'CL_29_FAILED: a Stage 4 beat verbatim names a question code';
  END IF;

  -- CL-30
  SELECT count(*) INTO v_pos FROM public.t3a_d1_co_participant_briefing;
  IF v_pos <> 30 THEN
    RAISE EXCEPTION 'CL_30_FAILED: expected thirty co-participant positions (three per source), found %', v_pos;
  END IF;
  IF EXISTS (SELECT 1 FROM public.t3a_d1_co_participant_briefing WHERE stated_at_beat <> 'B2') THEN
    RAISE EXCEPTION 'CL_30_FAILED: every co-participant position is stated at the B2 ROUND';
  END IF;

  -- CL-31
  SELECT count(*) INTO v_bare FROM public.t3a_d1_beat_capture_binding
   WHERE capture_set_code IN ('C4', 'C5', 'C8');
  IF v_bare <> 0 THEN
    RAISE EXCEPTION 'CL_31_FAILED: % bindings still name a superseded eight-set label', v_bare;
  END IF;

  -- CL-32. Thirty-three, itemized. This restates Issue 3 CS-I-56a, which
  -- set it at twenty-three, and CS-32 and CS-57 with it.
  SELECT count(DISTINCT source_identifier) INTO v_total FROM public.t3a_d1_mentor_action_sequence;
  SELECT count(DISTINCT source_identifier) INTO v_demo FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier LIKE 'DEMO-%';
  SELECT count(DISTINCT source_identifier) INTO v_s1 FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier ~ '^SRC-D1-S1-';
  SELECT count(DISTINCT source_identifier) INTO v_s2 FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier ~ '^SRC-D1-S2-';
  SELECT count(DISTINCT source_identifier) INTO v_s4 FROM public.t3a_d1_mentor_action_sequence WHERE source_identifier ~ '^SRC-D1-S4-';
  IF v_total <> 33 OR v_demo <> 3 OR v_s1 <> 10 OR v_s2 <> 10 OR v_s4 <> 10 THEN
    RAISE EXCEPTION 'CL_32_FAILED: expected 33 as 3 demonstration, 10 Stage 1, 10 Stage 2, 10 Stage 4; found total=% demo=% s1=% s2=% s4=%',
      v_total, v_demo, v_s1, v_s2, v_s4;
  END IF;

  -- CS-55 stays true: the STAGE 2 rule still touched zero Stage 4 sources.
  -- These ten were loaded by the Stage 4 rule, which is a different thing.

  -- CL-06 reaching Stage 4 without a list: the two bearing-interest Stage 4
  -- sources must now close C8 at B7, by binding rather than by name.
  IF (SELECT count(*) FROM public.t3a_d1_beat_capture_binding
       WHERE source_identifier IN ('SRC-D1-S4-001', 'SRC-D1-S4-007')
         AND beat_code = 'B7' AND qualifier_as_written = 'final') <> 4 THEN
    RAISE EXCEPTION 'CL_06_STAGE4_FAILED: SRC-D1-S4-001 and SRC-D1-S4-007 must each close C8a and C8b at B7';
  END IF;

  SELECT count(*) INTO v_bind FROM public.t3a_d1_beat_capture_binding;
  RAISE NOTICE 'Stage 4 loaded: % sources, % beats, % positions, % bindings total', v_srcs, v_beats, v_pos, v_bind;
END;
$verify$;

-- ---------------------------------------------------------------------
-- 5. CL-34 — the AC-12 per-Stage record for Stage 4
-- ---------------------------------------------------------------------

UPDATE public.t3a_d1_stage_claim
   SET status = 'not_claimable',
       reason = 'Sequences loaded; not claimable until the Stage 4 activation decision. Ten sequences '
             || 'parsed under CLOSE-001 Section 3A with B2 as ROUND, and the co-participant briefings '
             || 'loaded. Loading is not serving: a real observation on any Stage 4 production source '
             || 'still refuses, and activation is a separate founder decision.',
       set_by = 'CL-34',
       supersedes = 'CS-I-60'
 WHERE scope = 'Stage 4 production';

-- Stage 4 DEMONSTRATION remains claimable through DEMO-D1-S4-001, which is
-- untouched by the production deferral (CS-I-57a).
INSERT INTO public.t3a_d1_stage_claim (scope, test_id, status, reason, set_by, supersedes)
VALUES ('Stage 4 demonstration', 'AC-12', 'claimable',
        'DEMO-D1-S4-001 is loaded through its Facilitator card and is not one of the ten Stage 4 '
        || 'production sources. Unloading it would drop the sequence count and remove the Stage 4 '
        || 'demonstration from the AC-12 claim.',
        'CL-34', 'CS-I-57a')
ON CONFLICT (scope) DO UPDATE SET
  status = EXCLUDED.status, reason = EXCLUDED.reason,
  set_by = EXCLUDED.set_by, supersedes = EXCLUDED.supersedes;
