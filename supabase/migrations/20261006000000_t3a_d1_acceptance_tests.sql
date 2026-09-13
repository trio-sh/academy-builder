-- =====================================================================
-- T3A-D1-EXEC-001 §11 — the acceptance tests
--
-- "Every test is executed and its evidence returned with the build: test
--  identifier, actual result, pass or fail, build version, date, tester.
--  A TEST SPECIFICATION IS NOT A PASSED TEST."
--
-- That sentence decides the shape of everything here. A register of
-- thirty tests is not evidence, so the register and the evidence are two
-- tables, the evidence table is append-only, and the completeness
-- function counts only tests that carry a recorded PASS.
--
-- There is no default outcome. A test with no evidence is not a pass, is
-- not a fail, and is not silently omitted from the count — it is named
-- as being without one. §11 also forbids resolving a test that cannot
-- pass "by hiding a field, adding free text, introducing a default,
-- combining controls, or reducing either live view", so a missing
-- governing input is recorded as a conflict instead.
--
-- The thirty rows are loaded verbatim from the issued document. AC-25 is
-- absent from the issued table and is therefore absent here; the gap is
-- recorded in the report rather than filled.
--
-- T3A-D1-REL-001 makes "the acceptance evidence for Section 11 returned
-- complete" one of its seven activation gates, so
-- t3a_d1_acceptance_evidence_complete() is written to be read by it.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_acceptance_test (
  test_id         text PRIMARY KEY,
  section_ref     text NOT NULL,
  section_title   text NOT NULL,
  test_name       text NOT NULL,
  required_result text NOT NULL,
  display_order   int  NOT NULL
);

-- The register is the issued specification. It is not a place an outcome
-- can be written: there is no column for one, so a passing test cannot
-- be recorded by editing the specification of the test.
ALTER TABLE public.t3a_d1_acceptance_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_acceptance_test_read ON public.t3a_d1_acceptance_test;
CREATE POLICY t3a_d1_acceptance_test_read ON public.t3a_d1_acceptance_test
  FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------
-- The evidence
-- ---------------------------------------------------------------------

DO $mkenum$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 't3a_d1_acceptance_outcome') THEN
    CREATE TYPE public.t3a_d1_acceptance_outcome AS ENUM
      ('pass', 'fail', 'not_executed', 'blocked_by_conflict');
  END IF;
END;
$mkenum$;

CREATE TABLE IF NOT EXISTS public.t3a_d1_acceptance_evidence (
  evidence_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id        text NOT NULL REFERENCES public.t3a_d1_acceptance_test(test_id),
  outcome        public.t3a_d1_acceptance_outcome NOT NULL,
  actual_result  text NOT NULL,
  build_version  text NOT NULL,
  tester         text NOT NULL,
  executed_at    timestamptz NOT NULL DEFAULT now(),
  -- Where a test cannot pass because a governing input is missing, §11
  -- says record it as a conflict. This is where that is recorded, and an
  -- outcome of blocked_by_conflict cannot be written without it.
  conflict_note  text,
  CONSTRAINT t3a_d1_acceptance_evidence_actual_result_present
    CHECK (length(btrim(actual_result)) > 0),
  CONSTRAINT t3a_d1_acceptance_evidence_conflict_stated
    CHECK (outcome <> 'blocked_by_conflict'
           OR length(btrim(coalesce(conflict_note, ''))) > 0)
);

ALTER TABLE public.t3a_d1_acceptance_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_acceptance_evidence_read ON public.t3a_d1_acceptance_evidence;
CREATE POLICY t3a_d1_acceptance_evidence_read ON public.t3a_d1_acceptance_evidence
  FOR SELECT TO anon, authenticated USING (true);

-- Evidence is a record of what happened. A result that can be edited
-- after the fact is not evidence, so the table is append-only: a later
-- run is a new row, and the history shows both.
CREATE OR REPLACE FUNCTION public.t3a_d1_acceptance_evidence_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'ACCEPTANCE_EVIDENCE_APPEND_ONLY: % refused; re-run the test and record a new result', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_acceptance_evidence_append_only_trg
  ON public.t3a_d1_acceptance_evidence;
CREATE TRIGGER t3a_d1_acceptance_evidence_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_acceptance_evidence
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_acceptance_evidence_append_only();

-- ---------------------------------------------------------------------
-- The register, loaded verbatim
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_acceptance_test
  (test_id, section_ref, section_title, test_name, required_result, display_order)
VALUES
  ($lit$AC-01$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Standard desktop layout$lit$, $lit$All six regions visible simultaneously. No step replaces or overlays either live view$lit$, 1),
  ($lit$AC-02$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Narrow desktop or tablet$lit$, $lit$Below 1280×800, Stage 2 capture refuses and directs to an approved device. It does not reflow or shrink a view$lit$, 2),
  ($lit$AC-03$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Mobile phone$lit$, $lit$Stage 2 live capture cannot start$lit$, 3),
  ($lit$AC-04$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Exact source text$lit$, $lit$Pane 1 renders the exact active approved version, read-only, with BRIEF/READ/ASK/PAUSE/SAY visually distinct$lit$, 4),
  ($lit$AC-05$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Prompt–capture synchronization$lit$, $lit$Advancing the beat updates the capture set to the exact corresponding questions. Wrong-prompt options cannot remain visible$lit$, 5),
  ($lit$AC-06$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Direct question$lit$, $lit$Renders at the correct beat with only its approved answer set$lit$, 6),
  ($lit$AC-07$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Parent not triggered$lit$, $lit$Child absent, **no missing-state value created**$lit$, 7),
  ($lit$AC-08$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Parent triggered$lit$, $lit$Exact approved child appears; a wrong-source child or list refuses$lit$, 8),
  ($lit$AC-09$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Not Served$lit$, $lit$No answer row, placeholder, missing-state control or report consequence exists$lit$, 9),
  ($lit$AC-10$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Incomplete served item$lit$, $lit$Commit disabled or refuses and logs until a substantive answer or valid missing state exists$lit$, 10),
  ($lit$AC-11$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Missing state$lit$, $lit$Recorded as field metadata, using the eight codes only, never selectable as a substantive answer$lit$, 11),
  ($lit$AC-12$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$B2 pause$lit$, $lit$Pane 1 shows the pause instruction; 10–15 seconds recorded; timing-dependent capture uses the recorded timestamp$lit$, 12),
  ($lit$AC-13$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Timing integrity$lit$, $lit$A missing required beat timestamp prevents the dependent timing determination$lit$, 13),
  ($lit$AC-14$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Administration variance$lit$, $lit$Writes a distinct variance event at the beat; edits no source text and no determination$lit$, 14),
  ($lit$AC-15$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Pause$lit$, $lit$Distinct pause event; blocks source advancement pending clearance; not a progression outcome$lit$, 15),
  ($lit$AC-16$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$End without commit$lit$, $lit$Controlled end event written; captured material not silently discarded; nothing silently committed$lit$, 16),
  ($lit$AC-17$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Refresh and recovery$lit$, $lit$Same Stage instance, source version, interaction point, branch and uncommitted selections restored. No duplicate instance, no silent advance. Late capture identified, never presented as contemporaneous$lit$, 17),
  ($lit$AC-18$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Authorization snapshot$lit$, $lit$A committed action traces to the exact authorization in force at the time$lit$, 18),
  ($lit$AC-19$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Version integrity$lit$, $lit$The saved record proves the exact source, question, answer-catalog and applicability versions used. Later updates rewrite no history$lit$, 19),
  ($lit$AC-20$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$No AI selection$lit$, $lit$Speech, transcript or AI cannot populate, recommend, preselect, reorder or colour-code a determination$lit$, 20),
  ($lit$AC-21$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$No evaluative interface$lit$, $lit$No score, rank, level, readiness, trait, recommendation, evidence state, report statement, coverage meter or preferred-answer cue$lit$, 21),
  ($lit$AC-22$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Separate actions$lit$, $lit$Completing the live sequence confirms, progresses, reviews, issues, discloses and verifies nothing. Combined save-and-advance controls are impossible$lit$, 22),
  ($lit$AC-23$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Participant view unavailable$lit$, $lit$Follows the Section 3.3 rule rather than continuing as if conditions were intact$lit$, 23),
  ($lit$AC-24$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Recording boundary$lit$, $lit$The live views operate without persisting media. No hidden recording$lit$, 24),
  ($lit$AC-26$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$No context switching$lit$, $lit$The mentor completes a synthetic S2 interaction without another document, tab, notes tool, timing tool or question form. Both live views stay visible$lit$, 25),
  ($lit$AC-27$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Procedural burden$lit$, $lit$Current beat, timing, applicable question set, source-bound choices and approved branch surface automatically from governed records$lit$, 26),
  ($lit$AC-28$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Synchronous capture$lit$, $lit$Contemporaneous capture at the beat, with timestamp and context. Post-session reconstruction is not the normal workflow$lit$, 27),
  ($lit$AC-29$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Workload error trap$lit$, $lit$Attempting to advance with a required determination unresolved is prevented, and the mentor is told what procedural item remains **without any suggestion of a preferred substantive answer**$lit$, 28),
  ($lit$AC-30$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Rehearsal firewall$lit$, $lit$No rehearsal completion, frequency, selection, performance or history is visible anywhere in the Cockpit or exposed through its API payload$lit$, 29),
  ($lit$AC-31$lit$, $lit$11.1$lit$, $lit$Cockpit$lit$, $lit$Mentor view unavailable$lit$, $lit$Follows the Section 3.3 rule$lit$, 30)
ON CONFLICT (test_id) DO NOTHING;

-- ---------------------------------------------------------------------
-- Whether the evidence is complete
-- ---------------------------------------------------------------------

-- Read by the T3A-D1-REL-001 activation guard as one of its seven gates.
-- It answers from the latest evidence per test, and it never treats an
-- absent result as anything but absent.
CREATE OR REPLACE FUNCTION public.t3a_d1_acceptance_evidence_complete(
  p_build_version text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_total    int;
  v_passed   int;
  v_failed   int;
  v_blocked  int;
  v_without  text;
BEGIN
  SELECT count(*) INTO v_total FROM public.t3a_d1_acceptance_test;

  WITH latest AS (
    SELECT DISTINCT ON (e.test_id) e.test_id, e.outcome
    FROM public.t3a_d1_acceptance_evidence e
    WHERE p_build_version IS NULL OR e.build_version = p_build_version
    ORDER BY e.test_id, e.executed_at DESC
  )
  SELECT count(*) FILTER (WHERE outcome = 'pass'),
         count(*) FILTER (WHERE outcome = 'fail'),
         count(*) FILTER (WHERE outcome = 'blocked_by_conflict')
    INTO v_passed, v_failed, v_blocked
  FROM latest;

  -- Named, not counted. A gate that says "some tests are missing" tells
  -- nobody which ones to run.
  SELECT string_agg(t.test_id, ', ' ORDER BY t.display_order)
    INTO v_without
  FROM public.t3a_d1_acceptance_test t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.t3a_d1_acceptance_evidence e
    WHERE e.test_id = t.test_id
      AND e.outcome = 'pass'
      AND (p_build_version IS NULL OR e.build_version = p_build_version));

  RETURN jsonb_build_object(
    'complete', (coalesce(v_passed, 0) = v_total),
    'build_version', p_build_version,
    'tests_total', v_total,
    'tests_passed', coalesce(v_passed, 0),
    'tests_failed', coalesce(v_failed, 0),
    'tests_blocked_by_conflict', coalesce(v_blocked, 0),
    'without_a_pass', coalesce(v_without, ''),
    -- Stated in the return so no caller can believe one exists.
    'override_available', false);
END;
$fn$;

GRANT SELECT ON public.t3a_d1_acceptance_test, public.t3a_d1_acceptance_evidence
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_acceptance_evidence_complete(text)
  TO anon, authenticated;

-- ---------------------------------------------------------------------
-- The register cannot become the evidence
-- ---------------------------------------------------------------------

-- The comment above says an outcome cannot be recorded by editing the
-- specification of the test, because the register has no column for one.
-- That was true but unenforced: the first proof run added an `outcome`
-- column to the register and was accepted. A claim that only holds until
-- someone runs one ALTER is not a control, so it is enforced.
--
-- "A test specification is not a passed test" survives only if the two
-- stay two tables.
CREATE OR REPLACE FUNCTION public.t3a_d1_acceptance_register_no_outcome()
RETURNS event_trigger LANGUAGE plpgsql AS $fn$
DECLARE
  r record;
  c text;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
           WHERE object_type = 'table' LOOP
    IF r.object_identity = 'public.t3a_d1_acceptance_test' THEN
      FOR c IN SELECT column_name FROM information_schema.columns
               WHERE table_schema = 'public'
                 AND table_name = 't3a_d1_acceptance_test' LOOP
        IF c ~* '(outcome|result|passed|pass_|_pass|failed|status|evidence|tested|executed|verdict)' THEN
          RAISE EXCEPTION 'ACCEPTANCE_REGISTER_HOLDS_NO_OUTCOME: column t3a_d1_acceptance_test.% would let a specification stand in for evidence; T3A-D1-EXEC-001 section 11 forbids it', c
            USING ERRCODE = 'check_violation';
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$fn$;

DROP EVENT TRIGGER IF EXISTS t3a_d1_acceptance_register_no_outcome_trg;
CREATE EVENT TRIGGER t3a_d1_acceptance_register_no_outcome_trg
  ON ddl_command_end
  WHEN TAG IN ('ALTER TABLE', 'CREATE TABLE')
  EXECUTE FUNCTION public.t3a_d1_acceptance_register_no_outcome();
