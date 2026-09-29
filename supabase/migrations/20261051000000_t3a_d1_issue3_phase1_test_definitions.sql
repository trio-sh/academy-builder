-- =====================================================================
-- Issue 3 Section 6, PHASE 1 — redefine three tests. DO NOT RUN THEM.
--
-- Loading the Stage 2 sequences changes the behavior three existing tests
-- depend on. All three pass today BECAUSE no Stage 2 sequence is loaded,
-- so the moment the parse completes all three would go red and the
-- register would drop from 30 of 30. The old definitions must be gone
-- before the parse, not after.
--
-- Nothing here executes a test. No evidence row is written and no outcome
-- is recorded. This migration changes what the three tests MEAN.
--
-- A GAP THIS EXPOSED, AND WHY THERE IS NOW A TABLE. AC-13 has a real
-- definition — a row in t3a_d1_acceptance_test, which is the issued
-- register. CS-21 and CS-32 had none. They existed only as prose inside
-- migration comments and evidence narratives, so "redefine CS-21" had
-- nothing to edit and a later reader had nothing to check a restatement
-- against. A correction test that lives only in a comment cannot be
-- restated, superseded or audited. They are now rows.
--
-- WHAT CHANGES, AND WHAT DELIBERATELY DOES NOT
--
-- CS-I-55 — AC-13. Its GOVERNING TEXT IS UNCHANGED: "A missing required
--   beat timestamp prevents the dependent timing determination." The
--   register row is not touched, because the test was never wrong about
--   what it tests. The FIXTURE was wrong. It passed on
--   BEAT_SCRIPT_NOT_LOADED — a missing DEFINITION — where the governing
--   text says a missing RUNTIME timestamp. Those are different
--   conditions, and the old fixture would have gone green on a source
--   with no script at all. New fixture: SRC-D1-S2-001 with its sequence
--   LOADED, a session record in which the B3 timestamp is absent, and
--   Q-D1-02 requested. Refused by name, and by that name only.
--
-- CS-I-56 — CS-21. It asserts that a production source with no loaded
--   sequence refuses its timing determination by name. After the parse,
--   every served Stage 1 and Stage 2 production source has a loaded
--   sequence, so the fixture it names will no longer exist anywhere.
--   Re-pointed to SRC-D1-S3-010, whose enquiry_point is stated in words
--   — "The written enquiry, within one working day of submission" — so no
--   beat resolves and the determination refuses under CS-I-35. That
--   behavior is permanent and survives the parse.
--
-- CS-I-56a — CS-32, and CS-I-41 with it. Thirteen becomes TWENTY-THREE,
--   itemized as three demonstration, ten Stage 1, ten Stage 2. The first
--   clause of CS-I-41 — that the three demonstration sequences remain
--   loaded — stands unchanged. After the parse a count of thirteen is a
--   FAILED PARSE, not a passing test, which is why the restatement is
--   itemized by group: a bare total would go green on the wrong mix.
--
-- AC-13 and CS-21 now test two different things, as they always should
-- have: AC-13 a missing runtime timestamp on a DEFINED sequence, CS-21 a
-- decision point that cannot resolve to any beat.
--
-- WHY THE SUPERSEDED DEFINITIONS ARE KEPT. Each restated row records the
-- definition it replaces and why it could no longer hold. A test whose
-- old fixture is deleted reads as though it had always been correct, and
-- the reason these three needed restating is the part worth keeping.
-- =====================================================================

set search_path = public;

CREATE TABLE IF NOT EXISTS public.t3a_d1_correction_test (
  correction_test_id  text PRIMARY KEY,
  instrument          text NOT NULL,
  test_name           text NOT NULL,
  fixture             text NOT NULL,
  required_result     text NOT NULL,
  restated_by         text,
  supersedes_fixture  text,
  why_restated        text,
  defined_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_correction_test IS
  'The CS-series correction tests as definitions rather than prose. A test that exists only in a migration comment cannot be restated, superseded or audited — which is exactly the position CS-21 and CS-32 were in when Issue 3 asked for them to be redefined. Like t3a_d1_acceptance_test, this holds no outcome column: a passing test cannot be recorded by editing the specification of the test.';

ALTER TABLE public.t3a_d1_correction_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_correction_test_read ON public.t3a_d1_correction_test;
CREATE POLICY t3a_d1_correction_test_read ON public.t3a_d1_correction_test
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT ON public.t3a_d1_correction_test TO authenticated;

INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('CS-21', 'T3A-D1-EXEC-CORR-003',
   'A decision point that resolves to no beat refuses its timing determination by name',
   'SRC-D1-S3-010. Its enquiry_point is stated in words — "The written enquiry, within one '
   || 'working day of submission" — so no beat code resolves from it.',
   'The timing determination is refused and named under CS-I-35. Not offered and disabled; '
   || 'not offered at all.',
   'CS-I-56',
   'A production source with no loaded mentor action sequence. After the Stage 2 parse every '
   || 'served Stage 1 and Stage 2 production source has a loaded sequence, so this fixture '
   || 'will not exist on any served source.',
   'The old fixture tested the absence of a definition, which the parse removes. The new one '
   || 'tests a decision point that cannot resolve to a beat, which is permanent: it is a '
   || 'property of how SRC-D1-S3-010 states its enquiry point, not of what happens to be '
   || 'loaded.'),

  ('CS-32', 'T3A-D1-EXEC-CORR-004',
   'The loaded mentor action sequence inventory is twenty-three, itemized by group',
   'Every loaded sequence, counted by group: demonstration, Stage 1 production, Stage 2 '
   || 'production.',
   'Twenty-three: three demonstration, ten Stage 1 production, ten Stage 2 production. '
   || 'Itemized, not a bare total — a total alone passes on the wrong mix. Zero Stage 3 and '
   || 'zero Stage 4 PRODUCTION sequences; DEMO-D1-S4-001 is a demonstration source and is '
   || 'counted in the three.',
   'CS-I-56a',
   'Thirteen sequences: three demonstration and ten Stage 1 production.',
   'Thirteen was correct only while no Stage 2 sequence was loaded. After Section 6.1 a count '
   || 'of thirteen is a failed parse, not a passing test. CS-I-41, the instruction behind it, '
   || 'is amended to twenty-three by the same ruling; its first clause — that the three '
   || 'demonstration sequences remain loaded — stands unchanged.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  test_name          = EXCLUDED.test_name,
  fixture            = EXCLUDED.fixture,
  required_result    = EXCLUDED.required_result,
  restated_by        = EXCLUDED.restated_by,
  supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated       = EXCLUDED.why_restated;

-- AC-13's register row is NOT edited. Its governing text was right; only
-- the fixture was wrong, and a fixture is not part of the issued
-- specification. The restated fixture is recorded here so that the change
-- is auditable without touching the register.
INSERT INTO public.t3a_d1_correction_test
  (correction_test_id, instrument, test_name, fixture, required_result,
   restated_by, supersedes_fixture, why_restated)
VALUES
  ('AC-13-FIXTURE', 'T3A-D1-REC07-REAPP-001 Issue 3',
   'Fixture for register test AC-13. The register row is unchanged.',
   'SRC-D1-S2-001 with its mentor action sequence LOADED — seven beats B1 to B7 present — a '
   || 'session record in which the B3 timestamp is absent, and Q-D1-02 requested. That the '
   || 'sequence is loaded is asserted, not assumed, so a regressed parse fails this test '
   || 'instead of letting it pass for the wrong reason.',
   'Q-D1-02 refused and named BEAT_TIMESTAMP_MISSING, and NOT named '
   || 'BEAT_SCRIPT_NOT_LOADED or REFERENCE_BEAT_NOT_IN_SEQUENCE. No radio control is '
   || 'rendered: prevented means offering nothing, not offering something disabled.',
   'CS-I-55',
   'SRC-D1-S2-001 with no loaded sequence, accepting any of BEAT_SCRIPT_NOT_LOADED, '
   || 'REFERENCE_BEAT_NOT_IN_SEQUENCE or BEAT_TIMESTAMP_MISSING.',
   'AC-13''s governing text is a missing required beat TIMESTAMP — a missing runtime record. '
   || 'The old fixture passed on BEAT_SCRIPT_NOT_LOADED, a missing DEFINITION, which is a '
   || 'different condition: it would have gone green on a source with no script at all and red '
   || 'the moment one loaded. It was not testing AC-13.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  test_name          = EXCLUDED.test_name,
  fixture            = EXCLUDED.fixture,
  required_result    = EXCLUDED.required_result,
  restated_by        = EXCLUDED.restated_by,
  supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated       = EXCLUDED.why_restated;
