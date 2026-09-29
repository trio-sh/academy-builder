-- =====================================================================
-- CORR-006 Section 1 — CL-50 is narrowed to labels, and the words
-- "update" and "final" become ordinary speech again
--
-- WHAT THE FOUNDER CORRECTED. CL-50 as issued refused any capture-set
-- label OR qualifier inside verbatim speech. The qualifiers are the
-- ordinary English words "update" and "final", so the rule also refused
-- natural dialogue — "Any update on the figure?", "Is that your final
-- answer?". He records the fault as his instruction's, not the build's.
--
-- The build enforced it literally and said so at the time, flagging the
-- risk rather than narrowing an instruction to suit itself. This is the
-- narrowing, now that it has been ruled.
--
-- CX-01 REFUSES A LABEL THAT EXISTS IN THE CAPTURE REGISTER. That is a
-- real tightening as well as a loosening: the old check matched the
-- SHAPE C[0-9]+[a-z0-9]* rather than asking the register, so it would
-- have refused a token that merely looked like a label.
--
-- AND HERE IS THE PROBLEM WITH READING CX-01 LITERALLY, WHICH IS WHY THIS
-- MIGRATION GOES FURTHER THAN IT AND RECORDS WHY.
--
-- The fault CL-50 was written to catch was the literal text "C8 final"
-- found inside a mentor's spoken line during the Stage 2 parse. C8 IS NOT
-- IN THE REGISTER. The register holds thirteen labels — C1, C2, C3, C4a,
-- C4b, C5a, C5b1, C5b2, C5c, C6, C7, C8a, C8b — because C4, C5 and C8
-- were split when the register was revised. A check that asks only "is
-- this in the register" therefore ACCEPTS "C8 final" and re-opens the
-- exact hole CL-50 closed.
--
-- So the refused set is the register PLUS the three superseded labels
-- C4, C5 and C8, taken from the translation table the Stage 2 parse
-- already uses (scripts/extract-d1-stage2-scripts.mjs LABEL_TRANSLATION)
-- rather than invented here. The DEVELOPER JUDGMENT BOUNDARY directs the
-- most restrictive behavior available where a question is not the build's
-- to settle, and directs recording it. Both are done: the conflict
-- register carries it for the founder to confirm or narrow.
--
-- Measured before changing anything, across all 210 loaded beats:
--   beats containing a bare "update" or "final"      ZERO
--   beats containing a registered label              ZERO
--   beats containing a superseded label (C4, C5, C8) ZERO
-- So CX-02 holds — no loaded sequence changes — and that is asserted
-- below rather than assumed.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. CX-01 — the narrowed rule
-- ---------------------------------------------------------------------

-- The superseded labels, as data rather than as a literal inside the
-- function, so a later register revision can add to them without a code
-- change and so the reason travels with the row.
CREATE TABLE IF NOT EXISTS public.t3a_d1_superseded_capture_label (
  label            text PRIMARY KEY,
  superseded_into  text[] NOT NULL,
  basis            text NOT NULL,
  recorded_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_superseded_capture_label IS
  'Capture-set labels that were split when the register was revised and are therefore NOT in t3a_d1_capture_set. They must still never appear in a mentor''s spoken line: the original CL-50 fault was the text "C8 final", and C8 is one of these. Taken from the translation table the Stage 2 parse uses, never inferred.';

ALTER TABLE public.t3a_d1_superseded_capture_label ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_superseded_capture_label_read ON public.t3a_d1_superseded_capture_label;
CREATE POLICY t3a_d1_superseded_capture_label_read
  ON public.t3a_d1_superseded_capture_label FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_superseded_capture_label TO authenticated;

INSERT INTO public.t3a_d1_superseded_capture_label (label, superseded_into, basis) VALUES
  ('C4', ARRAY['C4a','C4b'],
   'Split when the register was revised. LABEL_TRANSLATION in scripts/extract-d1-stage2-scripts.mjs.'),
  ('C5', ARRAY['C5a','C5b1','C5b2','C5c'],
   'Split when the register was revised. LABEL_TRANSLATION in scripts/extract-d1-stage2-scripts.mjs.'),
  ('C8', ARRAY['C8a','C8b'],
   'Split when the register was revised. LABEL_TRANSLATION in scripts/extract-d1-stage2-scripts.mjs. This is the label from the original CL-50 fault, the spoken text "C8 final".')
ON CONFLICT (label) DO UPDATE SET
  superseded_into = EXCLUDED.superseded_into, basis = EXCLUDED.basis;

CREATE OR REPLACE FUNCTION public.t3a_d1_verbatim_carries_only_speech()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_hit text;
BEGIN
  -- CX-01. A capture-set label in the register, or one the register
  -- superseded, alone or followed by a qualifier. Asking the register
  -- rather than matching a shape: the old check refused anything of the
  -- form C<digits><suffix>, which is not the same claim.
  SELECT code INTO v_hit
    FROM (
      SELECT capture_set_code AS code FROM public.t3a_d1_capture_set
      UNION ALL
      SELECT label FROM public.t3a_d1_superseded_capture_label
    ) labels
   WHERE NEW.content_verbatim ~ ('\y' || code || '\y')
   -- Longest first, so a hit reports C8a rather than C8 where both match.
   ORDER BY length(code) DESC
   LIMIT 1;

  IF v_hit IS NOT NULL THEN
    RAISE EXCEPTION 'VERBATIM_CARRIES_CAPTURE_LABEL: % beat % — the capture-set label "%" is inside the mentor''s spoken line. The binding belongs in t3a_d1_beat_capture_binding, never in the words read aloud.',
      NEW.source_identifier, NEW.beat_code, v_hit
      USING ERRCODE = 'check_violation';
  END IF;

  -- The second clause is GONE. "update" and "final" on their own are
  -- ordinary speech and are accepted: CORR-006 CX-01.
  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_verbatim_carries_only_speech() IS
  'CL-50 as narrowed by CORR-006 CX-01. Refuses a capture-set label in a mentor''s spoken line — read from the register rather than matched as a shape — and ACCEPTS the ordinary words "update" and "final", which the issued rule refused and which would have blocked natural dialogue. The refused set also carries the three superseded labels C4, C5 and C8, because the original fault was the spoken text "C8 final" and C8 is no longer in the register: a register-only check would accept the very thing this rule exists to catch. Checked AT LOAD, so a sequence arriving later is checked as it arrives.';

-- Trigger unchanged in shape; recreated so the binding is explicit.
DROP TRIGGER IF EXISTS t3a_d1_verbatim_only_speech_trg
  ON public.t3a_d1_mentor_action_sequence;
CREATE TRIGGER t3a_d1_verbatim_only_speech_trg
  BEFORE INSERT OR UPDATE ON public.t3a_d1_mentor_action_sequence
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_verbatim_carries_only_speech();

-- ---------------------------------------------------------------------
-- 2. CX-02 — no loaded sequence changes, asserted not assumed
-- ---------------------------------------------------------------------

DO $cx02$
DECLARE
  v_total    int;
  v_label    int;
  v_words    int;
BEGIN
  SELECT count(*) INTO v_total FROM public.t3a_d1_mentor_action_sequence;

  SELECT count(*) INTO v_label
    FROM public.t3a_d1_mentor_action_sequence s
   WHERE EXISTS (
     SELECT 1 FROM (
       SELECT capture_set_code AS code FROM public.t3a_d1_capture_set
       UNION ALL SELECT label FROM public.t3a_d1_superseded_capture_label) l
      WHERE s.content_verbatim ~ ('\y' || l.code || '\y'));

  SELECT count(*) INTO v_words
    FROM public.t3a_d1_mentor_action_sequence
   WHERE content_verbatim ~* '\y(update|final)\y';

  IF v_label <> 0 THEN
    RAISE EXCEPTION 'CX_02_FAILED: % of % loaded beats carry a capture label in spoken text. The narrowed rule would refuse them, so CX-02''s claim that no loaded sequence changes is false and this must be reported rather than applied.', v_label, v_total;
  END IF;

  RAISE NOTICE 'CX-02: % beats checked. Registered-or-superseded label in speech: %. Bare "update"/"final" in speech: % (previously refused, now accepted).',
    v_total, v_label, v_words;
END;
$cx02$;

-- ---------------------------------------------------------------------
-- 3. Correction tests had definitions and nowhere to record an outcome
--
-- t3a_d1_acceptance_evidence carries a foreign key to
-- t3a_d1_acceptance_test — the thirty-row AC register. A CLOSE-001 or
-- CORR-006 test is not an AC register test, and putting one there would
-- move the count X1 expects to read thirty of thirty.
--
-- So correction tests had a definition table and no outcome table, which
-- means the only place to record a result was the definition row itself.
-- SOP-002 Stage 5.4 names that exact fault: hold outcomes in a separate
-- table from definitions, so a passing test can never be recorded by
-- editing the specification of the test.
--
-- This also has to exist before X6 can be answered at all: X6 asks for
-- every CLOSE-001 test, CL-T1 to CL-T38 plus CL-T5a, with its result —
-- thirty-nine rows. There is nowhere to put thirty-nine results today.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_correction_test_outcome (
  outcome_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correction_test_id text NOT NULL
    REFERENCES public.t3a_d1_correction_test(correction_test_id) ON DELETE RESTRICT,
  outcome           text NOT NULL CHECK (outcome IN ('pass', 'fail', 'not_run', 'unachievable')),
  actual_result     text NOT NULL,
  build_version     text NOT NULL,
  tester            text NOT NULL,
  executed_at       timestamptz NOT NULL DEFAULT now(),
  conflict_note     text
);

COMMENT ON TABLE public.t3a_d1_correction_test_outcome IS
  'Outcomes for the correction-instrument tests in t3a_d1_correction_test, kept separate from their definitions so a result can never be recorded by editing the test''s specification (SOP-002 Stage 5.4). Deliberately NOT t3a_d1_acceptance_evidence, which foreign-keys to the thirty-row AC register: a CL or CX test is not an AC register test, and adding one there would move the count X1 reads.';

CREATE INDEX IF NOT EXISTS t3a_d1_correction_test_outcome_by_test
  ON public.t3a_d1_correction_test_outcome (correction_test_id, executed_at DESC);

ALTER TABLE public.t3a_d1_correction_test_outcome ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_correction_test_outcome_read ON public.t3a_d1_correction_test_outcome;
CREATE POLICY t3a_d1_correction_test_outcome_read
  ON public.t3a_d1_correction_test_outcome FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_correction_test_outcome TO authenticated;

-- An outcome is a statement made at a time and is not revised.
CREATE OR REPLACE FUNCTION public.t3a_d1_correction_test_outcome_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'CORRECTION_TEST_OUTCOME_APPEND_ONLY: % refused. A test result is recorded, never amended — record a later run instead.', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_correction_test_outcome_append_only_trg
  ON public.t3a_d1_correction_test_outcome;
CREATE TRIGGER t3a_d1_correction_test_outcome_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_correction_test_outcome
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_correction_test_outcome_append_only();

-- ---------------------------------------------------------------------
-- 4. CL-T37 — the test, which did not exist as data
-- ---------------------------------------------------------------------

-- CX-02 says "re-run CL-T37". There was no CL-T37 row to re-run: it
-- existed only as prose. SOP-002 Stage 5.4 is exactly this — anything an
-- instrument will later amend must be a row. It is created here with its
-- definition, and its outcome goes in the separate evidence table.
INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('CL-T37', 'T3A-D1-EXEC-CORR-006 CX-01 and CX-02',
   'Verbatim mentor speech carries no capture-set label, and ordinary words are accepted',
   'All loaded mentor action sequences, plus four synthetic beats exercising each branch.',
   'ORDINARY SPEECH ACCEPTED: a beat whose spoken line contains the bare word "update" or '
   || '"final" loads. A SPOKEN LABEL REFUSED: a beat whose spoken line contains a label in the '
   || 'capture register, or one the register superseded (C4, C5, C8), is refused by name with '
   || 'VERBATIM_CARRIES_CAPTURE_LABEL. And no currently loaded sequence changes: zero of the 210 '
   || 'loaded beats carry a label in speech.',
   'CX-01', 'CL-50 as issued, which refused the bare words "update" and "final" as well as labels.',
   'The qualifiers are ordinary English words, so the issued rule refused natural dialogue such as '
   || '"Any update on the figure?". The founder records the fault as his instruction''s. The refused '
   || 'set additionally carries C4, C5 and C8 because the original fault was the spoken text "C8 '
   || 'final" and C8 is not in the register — a register-only check would accept it.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument      = EXCLUDED.instrument,
  test_name       = EXCLUDED.test_name,
  fixture         = EXCLUDED.fixture,
  required_result = EXCLUDED.required_result,
  restated_by     = EXCLUDED.restated_by,
  why_restated    = EXCLUDED.why_restated;

-- ---------------------------------------------------------------------
-- 5. Run it. Four branches, each proved, nothing persisted.
-- ---------------------------------------------------------------------

DO $run$
DECLARE
  v_src  text;
  v_out  text := '';
  v_r    text;
BEGIN
  SELECT source_identifier INTO v_src
    FROM public.t3a_d1_mentor_action_sequence LIMIT 1;

  -- (a) ordinary speech using "update" — must be ACCEPTED
  BEGIN
    INSERT INTO public.t3a_d1_mentor_action_sequence
      (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim)
    VALUES (v_src, 99, 'B9', 'ASK', 'Any update on the figure?');
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED(' || SQLERRM || ')';
  END;
  v_out := v_out || 'ordinary "update"=' || v_r || ' ';

  -- (b) ordinary speech using "final" — must be ACCEPTED
  BEGIN
    INSERT INTO public.t3a_d1_mentor_action_sequence
      (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim)
    VALUES (v_src, 98, 'B8', 'ASK', 'Is that your final answer?');
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED(' || SQLERRM || ')';
  END;
  v_out := v_out || 'ordinary "final"=' || v_r || ' ';

  -- (c) a REGISTERED label with a qualifier — must be REFUSED
  BEGIN
    INSERT INTO public.t3a_d1_mentor_action_sequence
      (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim)
    VALUES (v_src, 97, 'B7', 'ASK', 'Record C3 update now.');
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED';
  END;
  v_out := v_out || 'spoken "C3 update"=' || v_r || ' ';

  -- (d) the SUPERSEDED label from the original fault — must be REFUSED
  BEGIN
    INSERT INTO public.t3a_d1_mentor_action_sequence
      (source_identifier, beat_ordinal, beat_code, action_type, content_verbatim)
    VALUES (v_src, 96, 'B6', 'SAY', 'C8 final');
    v_r := 'ACCEPTED';
  EXCEPTION WHEN others THEN v_r := 'REFUSED';
  END;
  v_out := v_out || 'spoken "C8 final"=' || v_r;

  IF v_out NOT LIKE '%ordinary "update"=ACCEPTED%'
     OR v_out NOT LIKE '%ordinary "final"=ACCEPTED%'
     OR v_out NOT LIKE '%spoken "C3 update"=REFUSED%'
     OR v_out NOT LIKE '%spoken "C8 final"=REFUSED%' THEN
    RAISE EXCEPTION 'CL_T37_FAILED: %', v_out;
  END IF;

  -- Record the outcome BEFORE undoing the inserts, in the evidence table
  -- rather than by editing the test's definition.
  DELETE FROM public.t3a_d1_mentor_action_sequence
   WHERE source_identifier = v_src AND beat_ordinal IN (98, 99);

  INSERT INTO public.t3a_d1_correction_test_outcome
    (correction_test_id, outcome, actual_result, build_version, tester)
  VALUES ('CL-T37', 'pass',
    'CL-T37 re-run under CORR-006 CX-01. ' || v_out
    || '. All 210 loaded beats re-checked under the narrowed rule: zero carry a capture label in '
    || 'spoken text, so no loaded sequence changed (CX-02). The two accepted synthetic beats were '
    || 'removed after the test; the two refused ones never persisted.',
    '20261067000000', 'Claude Code, automated, non-production environment');

  RAISE NOTICE 'CL-T37: %', v_out;
END;
$run$;

-- ---------------------------------------------------------------------
-- 6. The finding the founder should see
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-01/superseded-labels', 'CORR-006 Section 1',
   'Which capture-set labels may never appear in mentor speech',
   'most restrictive behavior taken; founder to confirm or narrow',
   'open',
   'Founder: confirm that C4, C5 and C8 stay refused in spoken text, or narrow the rule to the '
   || 'register alone and accept that "C8 final" would then load.',
   'CX-01 refuses "a capture-set label that exists in the dimension''s capture register". READ '
   || 'LITERALLY THAT RE-OPENS THE HOLE CL-50 CLOSED. The fault CL-50 was written for was the '
   || 'literal spoken text "C8 final", and C8 IS NOT IN THE REGISTER: the register holds thirteen '
   || 'labels (C1, C2, C3, C4a, C4b, C5a, C5b1, C5b2, C5c, C6, C7, C8a, C8b) because C4, C5 and C8 '
   || 'were split when it was revised. A register-only check accepts "C8 final". '
   || 'THE BUILD TOOK THE MOST RESTRICTIVE READING, as the DEVELOPER JUDGMENT BOUNDARY directs, and '
   || 'refuses the register PLUS those three superseded labels — held in '
   || 't3a_d1_superseded_capture_label, taken from the translation table the Stage 2 parse already '
   || 'uses rather than invented. Nothing currently loaded is affected either way: zero of 210 beats '
   || 'carry any of the sixteen labels in speech. '
   || 'ALSO WORTH THE FOUNDER''S EYE: CX-01 is a tightening as well as a loosening. The issued check '
   || 'matched the SHAPE C[0-9]+[a-z0-9]*, so it refused anything that merely looked like a label. '
   || 'Asking the register is the narrower and more accurate claim, and it is what CX-01 says.')
ON CONFLICT (entry_id) DO UPDATE SET
  classification = EXCLUDED.classification,
  status         = EXCLUDED.status,
  blocked_on     = EXCLUDED.blocked_on,
  note           = EXCLUDED.note;
