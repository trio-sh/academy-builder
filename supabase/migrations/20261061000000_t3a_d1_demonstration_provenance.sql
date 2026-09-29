-- =====================================================================
-- E8 — the demonstration pathway, made able to run D1 end to end
--
-- THE DISTINCTION THIS MIGRATION RESTS ON, STATED BEFORE ANYTHING ELSE.
--
-- Stage 1 is administered by the AI service, and
-- t3a_d1_ai_administration_run requires four NOT NULL content references:
-- a model reference, a prompt text, an administration configuration and a
-- safety configuration. None of that content was ever issued, so no run
-- could exist and Stage 1 could not be administered at all.
--
-- PRODUCTION provenance for that machine is not created here and must
-- never be created by a build. A model reference and a safety
-- configuration govern what an automated system says to a real
-- participant under assessment; inventing them would manufacture the
-- provenance of that machine, which is a graver version of the fabricated
-- Cockpit script removed under CL-10.
--
-- What E8 actually asks for is different, and it is achievable honestly:
-- "the DEMONSTRATION pathway running D1 end to end". Note 5 already
-- established the pattern for exactly this — t3a_demo.source carries
-- synthetic_test_only and the fixture is named SYNTHETIC_TEST_ONLY-D1-01.
-- This migration follows that pattern for the four provenance objects.
--
-- SO: DEMONSTRATION PROVENANCE, MARKED AS SUCH, AND STRUCTURALLY BARRED
-- FROM A REAL RUN.
--
--   Every object is named SYNTHETIC_TEST_ONLY-… and carries
--   synthetic_test_only = true in its body. The marking is not a comment:
--   a trigger reads it.
--
--   t3a_d1_ai_administration_run_synthetic_bar refuses any run that cites
--   synthetic provenance unless env_state_at_run is design_only or
--   synthetic_test_only. So a demonstration run is possible and a pilot or
--   production run citing this content is IMPOSSIBLE, not discouraged.
--
--   The SOURCE in a demonstration run is the real, approved source. Only
--   the machine provenance is synthetic. That is the honest arrangement:
--   the text a participant would meet is the issued text; what is stood in
--   for is the administering machine, which does not exist yet.
--
-- WHAT THIS DOES NOT DO, AND WHAT STILL WAITS ON A PERSON.
--
--   It does NOT make a real Stage 1 run possible. Four production
--   provenance objects must still be issued by the founder and authoring,
--   and the guard below will refuse a pilot or production run until they
--   are.
--   It does NOT approve a consent notice version. Real Stage 2 and Stage 4
--   entry still refuses under CL-48 until counsel's wording is approved.
--   It does NOT touch the Stage 4 governance items: the seven-part
--   assessments, the approvals given after them, and the activation
--   decision are the founder's and are untouched.
--
-- The lift conditions are updated to record exactly which step this
-- satisfies and which it does not, so "Stage 1 can run" is never read as
-- "Stage 1 can run for real".
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The four demonstration provenance objects
-- ---------------------------------------------------------------------

DO $prov$
DECLARE
  r record;
  v_obj uuid;
  v_ver uuid;
  v_n   int := 0;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('SYNTHETIC_TEST_ONLY-D1-MODEL-REF',
       'ai_administration_ruleset',
       'Demonstration model reference',
       'Stands in for the issued model reference so the demonstration pathway can run. It names NO '
       || 'real model, states no capability and grants no permission. A production model reference is '
       || 'issued content and is not written by a build.'),
      ('SYNTHETIC_TEST_ONLY-D1-PROMPT-REF',
       'ai_administration_ruleset',
       'Demonstration prompt text',
       'Stands in for the issued Stage 1 prompt text. It contains NO words that would be put to a '
       || 'participant: the demonstration pathway exercises the route, the gate and the record, not '
       || 'the language. Production prompt text is issued content, authored and approved, never '
       || 'generated.'),
      ('SYNTHETIC_TEST_ONLY-D1-ADMIN-CONFIG',
       'configuration',
       'Demonstration administration configuration',
       'Stands in for the issued administration configuration — timing, sequence and administration '
       || 'conditions. Holds no governed value: Note 5 recorded that no production cooldown duration '
       || 'was invented or persisted, and none is invented here either.'),
      ('SYNTHETIC_TEST_ONLY-D1-SAFETY-CONFIG',
       'configuration',
       'Demonstration safety configuration',
       'Stands in for the issued safety configuration. THIS IS THE ONE THAT MATTERS MOST. A real '
       || 'safety configuration decides what an automated system does when a participant discloses '
       || 'harm, distress or risk during an assessment. It is not a technical artifact and a build '
       || 'must never author one. This object asserts NO safety behavior whatsoever; it exists so '
       || 'the demonstration route has a reference to cite, and the guard below makes it unusable '
       || 'outside a demonstration.')
    ) AS t(identifier, family, title, note)
  LOOP
    SELECT content_object_id INTO v_obj FROM public.t3a_content_object
     WHERE identifier = r.identifier AND family = r.family::public.t3a_content_family;

    IF v_obj IS NULL THEN
      INSERT INTO public.t3a_content_object (identifier, family, title, dimension_id)
      VALUES (r.identifier, r.family::public.t3a_content_family, r.title, 'D1')
      RETURNING content_object_id INTO v_obj;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.t3a_d1_content_version
                    WHERE content_object_id = v_obj AND superseded_by IS NULL) THEN
      INSERT INTO public.t3a_d1_content_version (content_object_id, version_no, body)
      VALUES (v_obj, 1, jsonb_build_object(
        'title', r.title,
        'source_identifier', r.identifier,
        -- The marking the guard reads. Not decoration.
        'synthetic_test_only', true,
        'not_for_production', true,
        'what_it_stands_in_for', r.note,
        'issued', false,
        'authored_by', 'none — this is a placeholder so a demonstration route has a reference to cite'))
      RETURNING content_version_id INTO v_ver;
      v_n := v_n + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'demonstration provenance: % versions created', v_n;
END;
$prov$;

-- ---------------------------------------------------------------------
-- 2. The structural bar — synthetic provenance cannot reach a real run
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_ai_run_synthetic_bar()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_synthetic text;
BEGIN
  SELECT string_agg(DISTINCT co.identifier, ', ' ORDER BY co.identifier)
    INTO v_synthetic
    FROM public.t3a_d1_content_version cv
    JOIN public.t3a_content_object co ON co.content_object_id = cv.content_object_id
   WHERE cv.content_version_id IN (
           NEW.model_ref_version_id,
           NEW.prompt_ref_version_id,
           NEW.admin_config_version_id,
           NEW.safety_config_version_id,
           NEW.source_version_id)
     AND coalesce((cv.body ->> 'synthetic_test_only')::boolean, false);

  IF v_synthetic IS NOT NULL
     AND NEW.env_state_at_run NOT IN ('design_only', 'synthetic_test_only') THEN
    RAISE EXCEPTION 'AI_RUN_CITES_SYNTHETIC_PROVENANCE: % is demonstration content and cannot be cited by a run in env state %. Issue the production model reference, prompt text, administration configuration and safety configuration first — a build does not author them.',
      v_synthetic, NEW.env_state_at_run
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_ai_run_synthetic_bar() IS
  'The demonstration pathway is made possible and a real run citing demonstration provenance is made impossible. Checked on the TABLE rather than in a route, so no caller can reach around it. Reads the synthetic_test_only marking in the cited versions'' bodies, so the marking is enforcement and not a label.';

DROP TRIGGER IF EXISTS t3a_d1_ai_run_synthetic_bar_trg ON public.t3a_d1_ai_administration_run;
CREATE TRIGGER t3a_d1_ai_run_synthetic_bar_trg
  BEFORE INSERT OR UPDATE ON public.t3a_d1_ai_administration_run
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_ai_run_synthetic_bar();

-- ---------------------------------------------------------------------
-- 3. A helper the seed uses, so the four ids are never guessed
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_demonstration_provenance()
RETURNS jsonb LANGUAGE sql STABLE AS $fn$
  SELECT jsonb_object_agg(co.identifier, cv.content_version_id)
    FROM public.t3a_content_object co
    JOIN public.t3a_d1_content_version cv
      ON cv.content_object_id = co.content_object_id AND cv.superseded_by IS NULL
   WHERE co.identifier LIKE 'SYNTHETIC_TEST_ONLY-D1-%';
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_demonstration_provenance() TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Record precisely what this satisfies and what it does not
-- ---------------------------------------------------------------------

UPDATE public.t3a_d1_lift_condition
   SET condition_text = condition_text
         || ' DEMONSTRATION provenance is loaded (SYNTHETIC_TEST_ONLY-D1-MODEL-REF, -PROMPT-REF, '
         || '-ADMIN-CONFIG, -SAFETY-CONFIG) and the demonstration pathway can run end to end. '
         || 'PRODUCTION provenance is still NOT issued, and t3a_d1_ai_run_synthetic_bar refuses any '
         || 'pilot or production run that cites the demonstration objects. This step is NOT satisfied.',
       satisfied = false
 WHERE lift_condition_id = 'S1-RUN-LIFT-1';

INSERT INTO public.t3a_d1_lift_condition
  (lift_condition_id, scope, step_order, condition_text, owner, satisfied, satisfied_by, set_by)
VALUES
  ('S1-DEMO-LIFT-1', 'Stage 1 demonstration', 1,
   'Demonstration provenance exists so the demonstration pathway can run D1 end to end, and is '
   || 'structurally barred from any run outside design_only or synthetic_test_only.',
   'Developer', true,
   'Migration 20261061000000. Four objects loaded and marked synthetic_test_only; '
   || 't3a_d1_ai_run_synthetic_bar enforces the bar on the table.',
   'E8')
ON CONFLICT (lift_condition_id) DO UPDATE SET
  condition_text = EXCLUDED.condition_text,
  satisfied      = EXCLUDED.satisfied,
  satisfied_by   = EXCLUDED.satisfied_by;

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('E8/production-provenance', 'E8 demonstration build',
   'Stage 1 production AI provenance',
   'missing issued content — a build must not author it',
   'open',
   'Founder and authoring: a production model reference, prompt text, administration configuration '
   || 'and safety configuration.',
   'The DEMONSTRATION pathway can now run D1 end to end on synthetic provenance, which is what E8 '
   || 'asks for. A REAL Stage 1 run still cannot happen and is refused on the table by '
   || 't3a_d1_ai_run_synthetic_bar. The safety configuration is the one to look at hardest: it '
   || 'decides what an automated system does when a participant discloses harm or distress during an '
   || 'assessment. That is not a technical artifact, and nothing in this build asserts any safety '
   || 'behavior on its behalf.')
ON CONFLICT (entry_id) DO UPDATE SET
  status = EXCLUDED.status, blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;
