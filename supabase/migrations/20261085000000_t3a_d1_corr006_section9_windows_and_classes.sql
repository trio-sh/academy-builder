-- =====================================================================
-- CORR-006 Section 9 — CX-32, the bank-level session windows, and CX-33,
-- the interaction pattern family
--
-- BOTH INSTRUCTIONS SAY "CONFIRM". Measuring first is therefore the work,
-- not the preliminary, and the two measurements came out differently:
--
--   CX-32. NO WINDOW IS STORED FOR ANY OF THE TWENTY. Every Stage 2 and
--   Stage 4 source has source_sheet.max_seconds NULL — not a wrong value, no
--   value. CX-32 says "Where it does not, apply it" and supplies the numbers,
--   so the build applies them: Stage 2 600 to 1,200 and Stage 4 1,200 to
--   1,800, per session, at BANK level.
--
--   CX-33. EVERY ONE OF THE TWENTY STATES ITS CLASS AT ITS HEAD. All twenty
--   parse: S-1, S-2, S-3 with S-1, S-4, S-5, S-6, S-1, S-2, S-7, S-5 with
--   S-2, then S-5 with S-2, S-1, S-3 with S-1, S-4, S-2, S-6 with S-1, S-5,
--   S-7 with S-1, S-2 with S-1, S-3 with S-1. Nothing is missing at the
--   source.
--
--   WHAT IS MISSING IS THE REGISTRY. t3a_source — the table whose
--   interaction_pattern_family column exists "for prior-exposure exclusion" —
--   HOLDS ZERO ROWS. So the family is not null for some sources; it is
--   absent for all forty, because the registry that would hold it was never
--   populated.
--
-- ---------------------------------------------------------------------
-- WHY THIS MIGRATION APPLIES THE WINDOWS AND DOES NOT POPULATE THE FAMILY.
--
-- CX-32 grants the authority in terms: "Where it does not, apply it," and it
-- states the values. So they are applied.
--
-- CX-33 grants no such authority. It says "Confirm the build derives...
-- Where a family is null, report the source and DO NOT INFER ONE." So the
-- derivation is built and published as a function, and what it yields for all
-- twenty is reported — but no t3a_source row is written.
--
-- That restraint is not pedantry about wording. interaction_pattern_family
-- decides PRIOR-EXPOSURE EXCLUSION: two sources in one family are the same
-- pattern, so meeting one excludes the other. Writing those rows decides
-- which situations a participant may and may not be observed on. Whether
-- "S-5" and "S-5 with S-2" are one family or two is a doctrine question with
-- that consequence, and the DEVELOPER JUDGMENT BOUNDARY reserves it.
--
-- The derivation below takes the PRIMARY class only, and that choice is the
-- most restrictive available rather than the most convenient: grouping "S-5"
-- with "S-5 with S-2" makes the family BROADER, which excludes MORE and lets
-- a participant meet fewer repeats of one pattern. If the founder rules that
-- the secondary class splits the family, the effect is to exclude less, and
-- that is a loosening only he can authorize.
--
-- Nothing is served in the meantime: no real observation can occur before
-- activation.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. CX-32 — the bank-level windows, applied
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_bank_session_window (
  stage_code   public.t3a_stage_code PRIMARY KEY,
  min_seconds  integer NOT NULL CHECK (min_seconds > 0),
  max_seconds  integer NOT NULL CHECK (max_seconds > 0),
  issued_under text NOT NULL,
  note         text NOT NULL,
  CONSTRAINT t3a_d1_bank_session_window_ordered CHECK (min_seconds < max_seconds)
);

COMMENT ON TABLE public.t3a_d1_bank_session_window IS
  'CX-32. Session windows set at BANK level rather than per source, for Stage 2 and Stage 4. Stage 1 is different and stays different: AC-B3a sets a window per source, held in t3a_d1_s1_time_window, and this table deliberately carries no S1 row so nothing can read a bank window for a Stage that has ten of its own.';

INSERT INTO public.t3a_d1_bank_session_window
  (stage_code, min_seconds, max_seconds, issued_under, note)
VALUES
  ('S2', 600, 1200, 'T3A-D1-EXEC-CORR-006 Section 9, CX-32',
   'Six hundred minimum, one thousand two hundred maximum per session, for every source in the '
   || 'Stage 2 bank. Applied because no window was stored for any of the ten.'),
  ('S4', 1200, 1800, 'T3A-D1-EXEC-CORR-006 Section 9, CX-32',
   'One thousand two hundred to one thousand eight hundred per session, for every source in the '
   || 'Stage 4 bank. Applied because no window was stored for any of the ten.')
ON CONFLICT (stage_code) DO UPDATE SET
  min_seconds = EXCLUDED.min_seconds, max_seconds = EXCLUDED.max_seconds,
  issued_under = EXCLUDED.issued_under, note = EXCLUDED.note;

ALTER TABLE public.t3a_d1_bank_session_window ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_bank_session_window_read ON public.t3a_d1_bank_session_window;
CREATE POLICY t3a_d1_bank_session_window_read
  ON public.t3a_d1_bank_session_window FOR SELECT TO authenticated USING (true);

-- One place that answers "what window applies to this source", so a Cockpit
-- and a run route cannot disagree, and so the per-source/bank-level
-- difference between Stage 1 and the rest lives in one function.
CREATE OR REPLACE FUNCTION public.t3a_d1_session_window(p_source_identifier text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_stage text;
  v_bank  public.t3a_d1_bank_session_window;
  v_s1    jsonb;
BEGIN
  v_stage := (regexp_match(p_source_identifier, '^SRC-D1-(S[1-4])-'))[1];

  IF v_stage IS NULL THEN
    RETURN jsonb_build_object('applies', false,
      'refusal_code', 'NOT_A_D1_SOURCE_IDENTIFIER',
      'source_identifier', p_source_identifier);
  END IF;

  -- Stage 1 is per source, under AC-B3a, and is answered by its own check so
  -- that the loaded-versus-issued comparison is not bypassed here.
  IF v_stage = 'S1' THEN
    v_s1 := public.t3a_d1_s1_window_check(p_source_identifier);
    RETURN jsonb_build_object('applies', (v_s1 ->> 'agrees')::boolean,
      'level', 'per_source',
      'issued_under', 'T3A-D1-EXEC-CORR-006 Annex B, AC-B3a',
      'min_seconds', v_s1 -> 'min_seconds',
      'max_seconds', v_s1 -> 'max_seconds',
      'refusal_code', v_s1 -> 'refusal_code',
      'stage_code', 'S1');
  END IF;

  SELECT * INTO v_bank FROM public.t3a_d1_bank_session_window
   WHERE stage_code = v_stage::public.t3a_stage_code;

  IF v_bank.stage_code IS NULL THEN
    RETURN jsonb_build_object('applies', false,
      'refusal_code', 'NO_BANK_WINDOW_FOR_THIS_STAGE',
      'stage_code', v_stage,
      'remedy', 'CX-32 sets bank windows for Stage 2 and Stage 4. Stage 3 has none here, and a run at a Stage with no window is held rather than given a guessed one.');
  END IF;

  RETURN jsonb_build_object('applies', true,
    'level', 'bank',
    'stage_code', v_stage,
    'min_seconds', v_bank.min_seconds,
    'max_seconds', v_bank.max_seconds,
    'issued_under', v_bank.issued_under);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_session_window(text) IS
  'CX-32. The session window that applies to one source: per source at Stage 1 under AC-B3a, at bank level at Stages 2 and 4 under CX-32. Refuses by name where no window is issued for a Stage rather than returning a default, because a session run to a guessed time limit is a session run to nobody''s time limit.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_session_window(text) TO authenticated;

-- ---------------------------------------------------------------------
-- 2. CX-33 — the derivation, published but not written into the registry
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_stated_situation_class(p_source_identifier text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_verbatim text;
  v_stated   text;
  v_primary  text;
  v_with     text;
BEGIN
  SELECT cv.body ->> 'verbatim' INTO v_verbatim
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier = p_source_identifier;

  IF v_verbatim IS NULL THEN
    RETURN jsonb_build_object('stated', false, 'refusal_code', 'SOURCE_NOT_FOUND');
  END IF;

  v_stated := btrim((regexp_match(v_verbatim, 'Situation class ([^.\n]+)'))[1]);

  IF v_stated IS NULL THEN
    -- CX-33: report the source and do not infer one.
    RETURN jsonb_build_object('stated', false,
      'refusal_code', 'SOURCE_STATES_NO_SITUATION_CLASS',
      'source_identifier', p_source_identifier,
      'remedy', 'CX-33: report the source and do not infer a family. Nothing is served before activation, so no observation depends on a guess.');
  END IF;

  v_primary := (regexp_match(v_stated, '^(S-[0-9]+)'))[1];
  v_with    := (regexp_match(v_stated, 'with (S-[0-9]+)'))[1];

  IF v_primary IS NULL THEN
    RETURN jsonb_build_object('stated', false,
      'refusal_code', 'SITUATION_CLASS_NOT_IN_THE_EXPECTED_FORM',
      'source_identifier', p_source_identifier,
      'stated_text', v_stated);
  END IF;

  RETURN jsonb_build_object('stated', true,
    'source_identifier', p_source_identifier,
    'stated_text', v_stated,
    'primary_class', v_primary,
    'secondary_class', v_with,
    -- The DERIVED family. Primary class only, which groups "S-5" with
    -- "S-5 with S-2" — the broader grouping, so it excludes more.
    'derived_family', v_primary,
    'derivation', 'the primary stated class alone; the secondary class does not split the family',
    'why_this_derivation',
      'interaction_pattern_family decides prior-exposure exclusion, so a broader family excludes more '
      || 'and lets a participant meet fewer repeats of one pattern. Splitting on the secondary class '
      || 'would excludeLESS, which is a loosening only the founder can authorize.',
    'written_to_registry', false);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_stated_situation_class(text) IS
  'CX-33. The situation class a source states at its head, and the interaction pattern family derived from it. It DOES NOT WRITE t3a_source: CX-33 says confirm and report, and writing a family decides prior-exposure exclusion — which situations a participant may be observed on. The derivation takes the primary class alone, the broader and therefore more restrictive grouping. Where a source states no class it refuses by name and infers nothing, exactly as CX-33 directs.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_stated_situation_class(text) TO authenticated;

-- The whole bank at once, so "confirm for all twenty" is one call.
CREATE OR REPLACE FUNCTION public.t3a_d1_bank_class_and_window_survey()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'source_identifier', co.identifier,
           'window', public.t3a_d1_session_window(co.identifier),
           'class', public.t3a_d1_stated_situation_class(co.identifier),
           'registry_row_exists', EXISTS (SELECT 1 FROM public.t3a_source s
                                           WHERE s.content_object_id = co.content_object_id))
           ORDER BY co.identifier), '[]'::jsonb)
    FROM public.t3a_content_object co
   WHERE co.identifier ~ '^SRC-D1-S[24]-';
$fn$;

COMMENT ON FUNCTION public.t3a_d1_bank_class_and_window_survey() IS
  'CX-32 and CX-33 confirmed for all twenty Stage 2 and Stage 4 sources in one call, including whether a t3a_source registry row exists at all — which for every one of them, it does not.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_bank_class_and_window_survey() TO authenticated;

-- ---------------------------------------------------------------------
-- 3. Assert what was measured
-- ---------------------------------------------------------------------

DO $verify$
DECLARE v_n int; v_unstated text; v_nowindow text;
BEGIN
  SELECT count(*) INTO v_n FROM jsonb_array_elements(public.t3a_d1_bank_class_and_window_survey());
  IF v_n <> 20 THEN
    RAISE EXCEPTION 'CX3233_WRONG_COUNT: the survey covers % sources, and the banks hold twenty.', v_n;
  END IF;

  SELECT string_agg(x ->> 'source_identifier', ', ') INTO v_unstated
    FROM jsonb_array_elements(public.t3a_d1_bank_class_and_window_survey()) x
   WHERE NOT (x -> 'class' ->> 'stated')::boolean;
  IF v_unstated IS NOT NULL THEN
    -- Not an abort: CX-33 says report the source. But the measurement said
    -- all twenty state one, so a change here is worth stopping for.
    RAISE EXCEPTION 'CX33_UNSTATED_CLASS: % state no situation class, and all twenty did when this was measured.', v_unstated;
  END IF;

  SELECT string_agg(x ->> 'source_identifier', ', ') INTO v_nowindow
    FROM jsonb_array_elements(public.t3a_d1_bank_class_and_window_survey()) x
   WHERE NOT (x -> 'window' ->> 'applies')::boolean;
  IF v_nowindow IS NOT NULL THEN
    RAISE EXCEPTION 'CX32_NO_WINDOW_APPLIES: % have no session window after this migration.', v_nowindow;
  END IF;

  IF EXISTS (SELECT 1 FROM jsonb_array_elements(public.t3a_d1_bank_class_and_window_survey()) x
              WHERE (x ->> 'registry_row_exists')::boolean) THEN
    RAISE EXCEPTION 'CX33_REGISTRY_ROW_APPEARED: a t3a_source row exists, and this migration writes none. Something else wrote it and the derivation''s "written_to_registry: false" would now be false.';
  END IF;

  RAISE NOTICE 'CX-32: a window now applies to all twenty. CX-33: all twenty state a class, none has a registry row, and none was written.';
END;
$verify$;

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-33/the-family-registry-is-empty-for-all-forty',
   'CORR-006 Section 9, measured before confirming anything',
   'Where the interaction pattern family is held, and who decides it',
   'the build derives it and reports it; it does not write it, because writing it decides exclusion',
   'open',
   'Founder: confirm the family rule — does "S-5 with S-2" share a family with "S-5", or is it its '
   || 'own? Then the twenty registry rows can be written under that rule.',
   'CX-33 asks the build to confirm it derives the interaction pattern family from the class each '
   || 'source states at its head. MEASURED: ALL TWENTY STATE ONE and every one parses — S-1, S-2, '
   || '"S-3 with S-1", S-4, S-5, S-6, S-1, S-2, S-7, "S-5 with S-2" at Stage 2, and "S-5 with S-2", '
   || 'S-1, "S-3 with S-1", S-4, S-2, "S-6 with S-1", S-5, "S-7 with S-1", "S-2 with S-1", '
   || '"S-3 with S-1" at Stage 4. Nothing is missing at the source. '
   || 'WHAT IS MISSING IS THE REGISTRY. t3a_source, whose interaction_pattern_family column exists '
   || '"for prior-exposure exclusion", HOLDS ZERO ROWS. The family is not null for some sources — it '
   || 'is absent for all forty, because that registry was never populated. '
   || 'THE BUILD DOES NOT POPULATE IT, and the reason is not caution about wording. '
   || 'interaction_pattern_family decides PRIOR-EXPOSURE EXCLUSION: two sources in one family are the '
   || 'same pattern, so meeting one excludes the other. Writing those rows decides which situations a '
   || 'participant may and may not be observed on. Whether "S-5" and "S-5 with S-2" are one family or '
   || 'two is a doctrine question with that consequence. CX-33 also says, in terms, "do not infer '
   || 'one". '
   || 'WHAT IS BUILT INSTEAD: t3a_d1_stated_situation_class derives and publishes the family for any '
   || 'source, and t3a_d1_bank_class_and_window_survey reports all twenty in one call. The derivation '
   || 'takes the PRIMARY class alone, which groups "S-5" with "S-5 with S-2" — the BROADER family, so '
   || 'it excludes MORE and a participant meets fewer repeats of one pattern. Splitting on the '
   || 'secondary class would exclude less, which is a loosening. The restrictive reading is the '
   || 'build''s to take; the loosening is not. '
   || 'NOTHING IS BLOCKED TODAY: no real observation can occur before activation, so nothing is served '
   || 'while this waits.'),

  ('CORR-006/CX-32/no-window-was-stored-for-any-of-the-twenty',
   'CORR-006 Section 9, measured before confirming anything',
   'The session window at Stage 2 and Stage 4',
   'applied under the authority CX-32 gives; the gap it closes was total rather than partial',
   'closed',
   NULL,
   'CX-32 asks the build to confirm it applies the bank-level window to every source in the bank, and '
   || 'says "Where it does not, apply it". MEASURED: NO WINDOW WAS STORED FOR ANY OF THE TWENTY. '
   || 'source_sheet.max_seconds is NULL on every Stage 2 and Stage 4 source — not a wrong value, no '
   || 'value at all. So a Stage 2 or Stage 4 session had no time limit anywhere in the build. '
   || 'APPLIED, with the numbers CX-32 states: Stage 2 600 to 1,200 and Stage 4 1,200 to 1,800 per '
   || 'session, held at bank level in t3a_d1_bank_session_window. '
   || 'THE TABLE DELIBERATELY CARRIES NO S1 ROW. Stage 1''s windows are per source under AC-B3a and '
   || 'live in t3a_d1_s1_time_window; a bank row for S1 would give something a second, conflicting '
   || 'answer for a Stage that has ten of its own. t3a_d1_session_window routes Stage 1 to its own '
   || 'check so the loaded-versus-issued comparison cannot be bypassed, and refuses by name for a '
   || 'Stage with no issued window rather than returning a default — a session run to a guessed limit '
   || 'is a session run to nobody''s limit.')
ON CONFLICT (entry_id) DO UPDATE SET
  opened_by = EXCLUDED.opened_by, scope = EXCLUDED.scope,
  classification = EXCLUDED.classification, status = EXCLUDED.status,
  blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;

-- ---------------------------------------------------------------------
-- 4. The evidence, and what the derivation would actually exclude
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('CX-3233-BANK-WINDOWS-AND-CLASSES', 'T3A-D1-EXEC-CORR-006 Section 9, CX-32 and CX-33',
   'A window applies to all twenty Stage 2 and Stage 4 sources, and all twenty state a class from which a family derives',
   'All twenty sources at their standing versions, and the t3a_source registry.',
   'Every Stage 2 source reports a bank window of 600/1200 and every Stage 4 source 1200/1800. All '
   || 'twenty state a situation class that parses. No t3a_source registry row exists for any of them, '
   || 'and none is written.',
   'CX-32, CX-33', NULL,
   'The registry assertion is stated as a required result rather than an observation: the derivation '
   || 'reports written_to_registry false, and that claim has to stay true.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated = EXCLUDED.why_restated;

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('CX-3233-BANK-WINDOWS-AND-CLASSES', 'pass',
   't3a_d1_bank_class_and_window_survey() over all twenty: Stage 2 all bank 600/1200, Stage 4 all bank '
   || '1200/1800; stated classes S-1, S-2, "S-3 with S-1", S-4, S-5, S-6, S-1, S-2, S-7, '
   || '"S-5 with S-2" at Stage 2 and "S-5 with S-2", S-1, "S-3 with S-1", S-4, S-2, "S-6 with S-1", '
   || 'S-5, "S-7 with S-1", "S-2 with S-1", "S-3 with S-1" at Stage 4; registry_row_exists false for '
   || 'all twenty. The migration refuses to commit if any of those three changes.',
   '20261085000000', 'Claude Code, automated, non-production environment',
   'WHAT THE DERIVATION WOULD EXCLUDE, stated so the founder is ruling on an effect rather than on a '
   || 'rule. Taking the primary class alone yields seven families across the twenty: S-1 three '
   || 'members, S-2 four, S-3 three, S-4 two, S-5 four, S-6 two, S-7 two. So under this derivation a '
   || 'participant who meets SRC-D1-S2-005 is excluded from SRC-D1-S2-010, SRC-D1-S4-001 and '
   || 'SRC-D1-S4-007 — all S-5. Splitting on the secondary class would separate "S-5 with S-2" from '
   || '"S-5" and free two of those three, which is why the split is a loosening and not the build''s to '
   || 'take. NO ROW WAS WRITTEN either way.');
