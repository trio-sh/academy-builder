-- =====================================================================
-- CORR-006 Section 4, AC-B3a — the ten Stage 1 time windows
--
-- WHAT AC-B3a SAYS, AND WHAT MEASURING IT FOUND.
--
-- "The issued file stores each Stage 1 window with both numbers in
-- max_seconds and an empty min_seconds, so the loaded values are checked
-- here... Where a loaded value differs, the run for that source refuses
-- until corrected."
--
-- Measured before writing anything. The loaded values ALREADY AGREE with
-- AC-B3a, for all ten:
--
--     source          source_sheet.max_seconds    AC-B3a (min, max)
--     SRC-D1-S1-001   '600 / 1500.'               600, 1500
--     SRC-D1-S1-002   '360 / 900.'                360,  900
--     SRC-D1-S1-003   '360 / 900.'                360,  900
--     SRC-D1-S1-004   '480 / 1500.'               480, 1500
--     SRC-D1-S1-005   '360 / 1200.'               360, 1200
--     SRC-D1-S1-006   '480 / 1200.'               480, 1200
--     SRC-D1-S1-007   '360 / 1000.'               360, 1000
--     SRC-D1-S1-008   '480 / 1200.'               480, 1200
--     SRC-D1-S1-009   '480 / 1200.'               480, 1200
--     SRC-D1-S1-010   '480 / 1200.'               480, 1200
--
-- and source_sheet.min_seconds is the literal string ',' on all ten — the
-- empty field AC-B3a describes, which picked up a stray comma in the load.
--
-- SO THIS IS NOT A CORRECTION OF TEN WRONG NUMBERS. Nothing about the
-- numbers is wrong. What is wrong is the SHAPE: a run cannot read
-- '600 / 1500.', and AC-B3 requires the run to count to max_seconds from
-- when the situation text is first shown and to record min_seconds for the
-- confirmer. A value only a person can read is not a value the engine has.
--
-- I state this plainly because the obvious build here — "load the ten
-- correct windows" — would have quietly replaced the loaded content with
-- the instrument's numbers and reported ten corrections. It would have
-- looked identical on the way out, and it would have hidden the fact that
-- the load was right. If a loaded value ever does differ, the check below
-- is what says so, and it refuses rather than overwriting.
--
-- WHAT IS BUILT.
--   1. The AC-B3a table, as ten rows, under its own identifier.
--   2. A parser for the loaded prose, which refuses to guess: exactly two
--      integers, smaller first, or it reports that it cannot read it.
--   3. A comparison anyone can read, per source.
--   4. A refusal on the run, so a source whose window disagrees cannot be
--      administered. AC-B3a: "the run for that source refuses until
--      corrected" — and correcting it is a content act, not this build's.
--
-- NOTHING OVERWRITES THE LOADED CONTENT. The source_sheet is issued text
-- and stays exactly as issued, comma and all.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. AC-B3a, as rows
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_s1_time_window (
  source_identifier text PRIMARY KEY,
  min_seconds       integer NOT NULL CHECK (min_seconds > 0),
  max_seconds       integer NOT NULL CHECK (max_seconds > 0),
  issued_under      text NOT NULL,
  CONSTRAINT t3a_d1_s1_time_window_ordered CHECK (min_seconds < max_seconds)
);

COMMENT ON TABLE public.t3a_d1_s1_time_window IS
  'AC-B3a. The ten Stage 1 time windows as the founder issued them, in seconds, as two readable numbers. This is the ISSUED value; the loaded source_sheet holds the same pair as prose ("600 / 1500.") and is not changed by this build. t3a_d1_s1_window_check compares the two and the run refuses where they disagree. min_seconds is recorded with a run for the confirmer and for scheduling and is NEVER imposed on the participant — AC-B3: "No minimum is imposed on the participant."';

INSERT INTO public.t3a_d1_s1_time_window
  (source_identifier, min_seconds, max_seconds, issued_under)
VALUES
  ('SRC-D1-S1-001', 600, 1500, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a'),
  ('SRC-D1-S1-002', 360,  900, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a'),
  ('SRC-D1-S1-003', 360,  900, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a'),
  ('SRC-D1-S1-004', 480, 1500, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a'),
  ('SRC-D1-S1-005', 360, 1200, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a'),
  ('SRC-D1-S1-006', 480, 1200, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a'),
  ('SRC-D1-S1-007', 360, 1000, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a'),
  ('SRC-D1-S1-008', 480, 1200, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a'),
  ('SRC-D1-S1-009', 480, 1200, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a'),
  ('SRC-D1-S1-010', 480, 1200, 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a')
ON CONFLICT (source_identifier) DO UPDATE SET
  min_seconds  = EXCLUDED.min_seconds,
  max_seconds  = EXCLUDED.max_seconds,
  issued_under = EXCLUDED.issued_under;

ALTER TABLE public.t3a_d1_s1_time_window ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_s1_time_window_read ON public.t3a_d1_s1_time_window;
CREATE POLICY t3a_d1_s1_time_window_read
  ON public.t3a_d1_s1_time_window FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------
-- 2. Reading the loaded prose, without guessing
--
-- The parser takes ALL integers in the string and insists there are
-- exactly two. It does not take the first two and move on: '600 / 1500 per
-- session, 90 grace' would then read as 600/1500 and silently drop a third
-- number that changes what the field means. Two or nothing.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_parse_loaded_window(p_text text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  v_nums bigint[];
BEGIN
  IF coalesce(btrim(p_text), '') = '' THEN
    RETURN jsonb_build_object('readable', false, 'why', 'the field is empty');
  END IF;

  SELECT array_agg(m[1]::bigint ORDER BY ord)
    INTO v_nums
    FROM regexp_matches(p_text, '(\d+)', 'g') WITH ORDINALITY AS t(m, ord);

  IF v_nums IS NULL THEN
    RETURN jsonb_build_object('readable', false, 'why', 'no number appears in the field');
  END IF;

  IF array_length(v_nums, 1) <> 2 THEN
    RETURN jsonb_build_object('readable', false,
      'why', format('the field holds %s numbers, and a window is exactly two', array_length(v_nums, 1)),
      'numbers_found', to_jsonb(v_nums));
  END IF;

  IF v_nums[1] >= v_nums[2] THEN
    RETURN jsonb_build_object('readable', false,
      'why', 'the first number is not smaller than the second, so which is the minimum cannot be read from the order',
      'numbers_found', to_jsonb(v_nums));
  END IF;

  RETURN jsonb_build_object('readable', true,
    'min_seconds', v_nums[1], 'max_seconds', v_nums[2]);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_parse_loaded_window(text) IS
  'AC-B3a. Reads the two numbers out of a loaded source_sheet max_seconds field such as "600 / 1500.". Refuses to guess: exactly two integers, smaller first, or it reports readable=false with why. It never returns a partial window, because a half-read time limit is worse than none.';

-- ---------------------------------------------------------------------
-- 3. The comparison, per source
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_window_check(p_source_identifier text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_issued  public.t3a_d1_s1_time_window;
  v_raw     text;
  v_parsed  jsonb;
BEGIN
  SELECT * INTO v_issued FROM public.t3a_d1_s1_time_window
   WHERE source_identifier = p_source_identifier;

  IF v_issued.source_identifier IS NULL THEN
    RETURN jsonb_build_object('agrees', false,
      'refusal_code', 'NO_ISSUED_WINDOW_FOR_THIS_SOURCE',
      'source_identifier', p_source_identifier,
      'remedy', 'AC-B3a names ten Stage 1 sources. A source outside that list has no issued window and cannot be administered at Stage 1.');
  END IF;

  SELECT cv.body -> 'source_sheet' ->> 'max_seconds' INTO v_raw
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = p_source_identifier;

  v_parsed := public.t3a_d1_s1_parse_loaded_window(v_raw);

  IF NOT (v_parsed ->> 'readable')::boolean THEN
    RETURN jsonb_build_object('agrees', false,
      'refusal_code', 'LOADED_WINDOW_CANNOT_BE_READ',
      'source_identifier', p_source_identifier,
      'loaded_text', v_raw,
      'why', v_parsed ->> 'why',
      'issued_min_seconds', v_issued.min_seconds,
      'issued_max_seconds', v_issued.max_seconds);
  END IF;

  IF (v_parsed ->> 'min_seconds')::int <> v_issued.min_seconds
     OR (v_parsed ->> 'max_seconds')::int <> v_issued.max_seconds THEN
    RETURN jsonb_build_object('agrees', false,
      'refusal_code', 'LOADED_WINDOW_DIFFERS_FROM_ISSUED',
      'source_identifier', p_source_identifier,
      'loaded_text', v_raw,
      'loaded_min_seconds', (v_parsed ->> 'min_seconds')::int,
      'loaded_max_seconds', (v_parsed ->> 'max_seconds')::int,
      'issued_min_seconds', v_issued.min_seconds,
      'issued_max_seconds', v_issued.max_seconds,
      'remedy', 'AC-B3a: the run for this source refuses until corrected. Correcting the loaded value is a content act under an instrument, not a migration.');
  END IF;

  RETURN jsonb_build_object('agrees', true,
    'source_identifier', p_source_identifier,
    'min_seconds', v_issued.min_seconds,
    'max_seconds', v_issued.max_seconds,
    'loaded_text', v_raw,
    'issued_under', v_issued.issued_under);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_window_check(text) IS
  'AC-B3a. Whether one Stage 1 source''s LOADED window agrees with the ISSUED one, and if not, which of the three ways it fails: the source has no issued window, the loaded field cannot be read as two numbers, or the two numbers differ. Reports the values rather than a bare false, because a time limit that disagrees with itself is the kind of thing someone has to read.';

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s1_parse_loaded_window(text),
  public.t3a_d1_s1_window_check(text)
TO authenticated;

-- All ten at once, for a screen or a report.
CREATE OR REPLACE FUNCTION public.t3a_d1_s1_window_survey()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT coalesce(jsonb_agg(public.t3a_d1_s1_window_check(w.source_identifier)
                            ORDER BY w.source_identifier), '[]'::jsonb)
    FROM public.t3a_d1_s1_time_window w;
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_s1_window_survey() TO authenticated;

-- ---------------------------------------------------------------------
-- 4. The run refuses where the window disagrees
--
-- AC-B3a puts the consequence on the RUN, per source, not on the load. So
-- it is enforced where a run is written, and a disagreement disables that
-- one source rather than Stage 1 as a whole.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s1_run_window_agrees()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_ident text;
  v_check jsonb;
BEGIN
  SELECT co.identifier INTO v_ident
    FROM public.t3a_d1_content_version cv
    JOIN public.t3a_content_object co ON co.content_object_id = cv.content_object_id
   WHERE cv.content_version_id = NEW.source_version_id;

  -- Only the ten Stage 1 production sources carry an issued window. A
  -- demonstration run on some other source is not what AC-B3a governs, and
  -- refusing it here would be this rule reaching past its own subject.
  IF NOT EXISTS (SELECT 1 FROM public.t3a_d1_s1_time_window
                  WHERE source_identifier = v_ident) THEN
    RETURN NEW;
  END IF;

  v_check := public.t3a_d1_s1_window_check(v_ident);

  IF NOT (v_check ->> 'agrees')::boolean THEN
    RAISE EXCEPTION 'S1_RUN_WINDOW_DISAGREES: % cannot be administered — %. %',
      v_ident, v_check ->> 'refusal_code', v_check::text
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s1_run_window_agrees() IS
  'AC-B3a. Refuses a Stage 1 run whose source''s loaded time window disagrees with the issued one, by name, per source. A source with no issued window passes through untouched: the ten named in AC-B3a are its whole subject, and a demonstration run on anything else is governed elsewhere.';

DROP TRIGGER IF EXISTS t3a_d1_s1_run_window_agrees_trg
  ON public.t3a_d1_ai_administration_run;
CREATE TRIGGER t3a_d1_s1_run_window_agrees_trg
  BEFORE INSERT ON public.t3a_d1_ai_administration_run
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_s1_run_window_agrees();

-- ---------------------------------------------------------------------
-- 5. Assert the state this migration found, so it is on the record
-- ---------------------------------------------------------------------

DO $verify$
DECLARE
  v_n        int;
  v_bad      text;
  v_min_txt  text;
BEGIN
  SELECT count(*) INTO v_n FROM public.t3a_d1_s1_time_window;
  IF v_n <> 10 THEN
    RAISE EXCEPTION 'ACB3A_WRONG_COUNT: % issued windows, expected ten.', v_n;
  END IF;

  SELECT string_agg(c ->> 'source_identifier' || ' (' || (c ->> 'refusal_code') || ')', ', ')
    INTO v_bad
    FROM jsonb_array_elements(public.t3a_d1_s1_window_survey()) c
   WHERE NOT (c ->> 'agrees')::boolean;

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'ACB3A_DISAGREEMENT_AT_LOAD_TIME: % — this migration asserts what it measured, and the measurement said all ten agreed.', v_bad;
  END IF;

  -- The empty min_seconds AC-B3a describes, recorded as found rather than
  -- tidied away. If a later load fills it in, this notice stops matching
  -- and someone should look at whether the parse should read it instead.
  SELECT string_agg(DISTINCT coalesce(cv.body -> 'source_sheet' ->> 'min_seconds', '<absent>'), ' | ')
    INTO v_min_txt
    FROM public.t3a_d1_s1_time_window w
    JOIN public.t3a_content_object co ON co.identifier = w.source_identifier
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL;

  RAISE NOTICE 'AC-B3a: ten issued windows loaded; all ten agree with the loaded source_sheet. Loaded min_seconds reads: %', v_min_txt;
END;
$verify$;

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/AC-B3a/loaded-window-is-prose',
   'CORR-006 Section 4, measured before building',
   'How a Stage 1 time window is stored',
   'shape defect, not a value defect — the issued numbers were right all along',
   'open',
   'Founder: note that the source_sheet still holds the window as prose. Correcting the loaded text '
   || 'is a content act under an instrument; the build compares rather than overwrites.',
   'AC-B3a directs the loaded windows to be CHECKED and says "where a loaded value differs, the run '
   || 'for that source refuses until corrected". MEASURED FIRST: all ten loaded values already agree '
   || 'with AC-B3a — 600/1500, 360/900, 360/900, 480/1500, 360/1200, 480/1200, 360/1000, 480/1200, '
   || '480/1200, 480/1200 — and source_sheet.min_seconds is the literal string '','' on all ten, the '
   || 'empty field AC-B3a describes, with a stray comma from the load. '
   || 'SO NOTHING ABOUT THE NUMBERS IS WRONG. What is wrong is that they are stored as the prose '
   || '"600 / 1500." in a single field, which a run cannot read, while AC-B3 requires the run to '
   || 'count to max_seconds from when the situation is first shown and to record min_seconds for the '
   || 'confirmer. '
   || 'WHY THIS IS WORTH A REGISTER ENTRY RATHER THAN A SILENT FIX: the obvious build — load the ten '
   || 'correct windows over the top — would have looked identical on the way out and would have '
   || 'reported ten corrections that were not corrections. It would also have overwritten issued '
   || 'content with a build''s reading of an instrument. The issued source_sheet is unchanged, comma '
   || 'and all; the two numbers now also exist in t3a_d1_s1_time_window, where a run can read them, '
   || 'and t3a_d1_s1_window_check refuses rather than reconciles if they ever part company.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;

-- ---------------------------------------------------------------------
-- 6. The evidence, as rows
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('AC-B3a-WINDOWS', 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a',
   'The ten Stage 1 windows are the issued ones, and a run refuses where a loaded value differs',
   'TWO SYNTHETIC Stage 1 sources created inside an aborted transaction — one whose loaded window '
   || 'disagrees with its issued window, one whose agrees — plus the one existing demonstration run '
   || 'row as the template for every other NOT NULL column. NOT the real ten: they all agree, so a '
   || 'test of "refuses where a value differs" has no subject among them, and mutating an issued '
   || 'source_sheet to manufacture one would mean editing issued content to test a guard.',
   'The parser reads 600/1500 from "600 / 1500.", and reports unreadable for the loaded min field '
   || '(","), for a field holding three numbers, and for a reversed pair. The check reports '
   || 'LOADED_WINDOW_DIFFERS_FROM_ISSUED, agrees, and NO_ISSUED_WINDOW_FOR_THIS_SOURCE respectively. '
   || 'A run on the disagreeing source is refused with S1_RUN_WINDOW_DISAGREES and a run on the '
   || 'agreeing source is ACCEPTED.',
   'AC-B3a', NULL,
   'Fixture stated at length because the obvious fixture — the real ten — would pass every assertion '
   || 'here while proving nothing about the refusal, which is the half of AC-B3a that does the work.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated = EXCLUDED.why_restated;

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('AC-B3a-WINDOWS', 'pass',
   'scripts/proofs/s1-time-window-proof.sql, self-aborting: parseNormal=READ_600_1500 '
   || 'parseTheLoadedMinField=UNREADABLE parseThreeNumbers=UNREADABLE parseReversed=UNREADABLE '
   || 'checkDisagreeing=LOADED_WINDOW_DIFFERS_FROM_ISSUED checkAgreeing=AGREES '
   || 'checkUnlisted=NO_ISSUED_WINDOW_FOR_THIS_SOURCE runOnDisagreeing=REFUSED_BY_NAME '
   || 'runOnAgreeing=ACCEPTED. Nothing committed; verified afterwards that the two synthetic sources '
   || 'are absent, ten issued windows stand, and the run table still holds its single demonstration '
   || 'row.',
   '20261075000000', 'Claude Code, automated, non-production environment',
   'runOnAgreeing is the negative control. Without it, runOnDisagreeing=REFUSED_BY_NAME is also what '
   || 'a guard that refuses every run would produce.');
