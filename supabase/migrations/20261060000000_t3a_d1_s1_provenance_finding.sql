-- =====================================================================
-- CLOSE-001 E8 / E9 — why D1 cannot yet run end to end
--
-- The close-out asks for two things to be confirmed implemented:
--   E8  PLC-005-A Note 5, the demonstration pathway running D1 end to end
--   E9  PLC-005-A Note 7, the Stage 1 outcome reaching the mentor before
--       Stage 2 can begin
--
-- WHAT WAS FOUND, AND IT IS NOT A SCREEN GAP.
--
-- FIRST, TWO REPORTS WERE STALE AND I READ THEM AS CURRENT. Note 7 records
-- the Mentor Desk workbench interface as "ships separately". It shipped:
-- src/pages/dashboard/mentor/S1Workbench.tsx exists, is routed at
-- s1-workbench/:runId, and calls t3a_d1_s1_workbench_may_open and
-- t3a_d1_s1_may_confirm. I reported it as unbuilt on the strength of the
-- report rather than the repository. The report is the stale artifact; the
-- code is the fact.
--
-- SECOND, THE ONE PIECE GENUINELY MISSING WAS SMALL AND IS NOW BUILT.
-- Nothing read t3a_d1_s1_routing, so no surface told a mentor that a Stage
-- 1 outcome was waiting. The gate that stops Stage 2 was enforced with no
-- way for the person it waits on to know. A mentor would have had to know
-- the run id and type the URL. CORR-02 is built: see
-- t3a_d1_s1_pending_for_mentor and the Stage 1 section on the Mentor Desk.
--
-- THIRD, AND THIS IS THE ONE THAT MATTERS: STAGE 1 CANNOT BE ADMINISTERED
-- AT ALL, BECAUSE ITS PROVENANCE CONTENT WAS NEVER ISSUED.
--
-- t3a_d1_ai_administration_run requires four NOT NULL references into
-- t3a_d1_content_version: model_ref_version_id, prompt_ref_version_id,
-- admin_config_version_id and safety_config_version_id. Measured:
--
--   content families loaded          source = 40, statement_library = 1
--   model / prompt / config / safety  NONE
--   S1 source sheets naming a model_reference   0 of 10
--   S1 source sheets naming a prompt_text_ref   0 of 10
--
-- The only two places the issued file mentions those field names at all
-- are SRC-D1-S2-010 and SRC-D1-S3-010 — and in both cases it is the
-- last-source-in-bank run-on from the STAGE 4 common section, reading
-- "model_reference and prompt_text_ref: NOT_APPLICABLE — no model
-- administers this source; it is human-facilitated." That is Stage 4
-- declaring the fields inapplicable to itself. It is not Stage 1 provenance
-- and must not be read as any.
--
-- So no AI administration run can be created without inventing a model
-- reference, a prompt text, an administration configuration and a safety
-- configuration. THEY ARE NOT INVENTED HERE. Fabricating them would
-- manufacture the provenance of a machine that administers a real
-- assessment to a real participant — a worse version of the invented
-- Cockpit script removed under CL-10, and the one thing a build must never
-- do.
--
-- THE REFUSAL IS THE CONTROL WORKING. t3a_d1_s1_workbench_may_open already
-- refuses with S1_WORKBENCH_PROVENANCE_INCOMPLETE and names which inputs
-- are missing. The workbench cannot open because it should not open. What
-- is absent is content, and content is not a build decision.
--
-- CONSEQUENCE FOR THE CLOSE-OUT, STATED PLAINLY RATHER THAN SCORED AS
-- PASSED:
--
--   E9  The gate, its refusals, the workbench screen and the pending action
--       are ALL built. The populated path cannot be demonstrated, because
--       no Stage 1 run can exist. Built: yes. Demonstrated: no.
--   E8  Not implemented, and blocked on two things, neither of them a
--       screen: the Stage 1 AI administration provenance content above,
--       and the test accounts Note 5 Step 4 names as a human task — the
--       same accounts whose absence fails the five auth.setup role logins.
--
-- Note 5's CORR-13 demonstration fixture is in the same position: a Stage 1
-- fixture needs an AI administration run, so it cannot be built either. A
-- fixture assembled from invented provenance would make the pending action
-- and the workbench both look proved while proving nothing — which is the
-- fault CL-10, CS-I-48 and CS-I-54a were each written to stop.
-- =====================================================================

set search_path = public;

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, amended_by, note)
VALUES
  ('CLOSE-001/E8-E9/s1-provenance', 'T3A-D1-EXEC-CLOSE-001 E8 and E9',
   'Stage 1 AI administration provenance',
   'missing issued content — not a build item',
   'open',
   'Founder and authoring: a model reference, a prompt text, an administration configuration and a '
   || 'safety configuration must be issued and loaded as content before any Stage 1 run can exist. '
   || 'Separately, the test accounts Note 5 Step 4 names as a human task.',
   NULL,
   'E9 is BUILT: the Stage 1 gate and its refusals (Note 7), the workbench screen '
   || '(src/pages/dashboard/mentor/S1Workbench.tsx, routed at s1-workbench/:runId) and the pending '
   || 'action on the Mentor Desk (CORR-02, t3a_d1_s1_pending_for_mentor). E9 is NOT DEMONSTRATED, '
   || 'and E8 is not implemented, for one reason: t3a_d1_ai_administration_run requires four NOT '
   || 'NULL content references — model, prompt, administration configuration and safety '
   || 'configuration — and NONE of that content exists. Loaded families are source (40) and '
   || 'statement_library (1) only. Zero of the ten Stage 1 source sheets name a model_reference or a '
   || 'prompt_text_ref. The issued file mentions those field names twice, both times as the Stage 4 '
   || 'common section running on into SRC-D1-S2-010 and SRC-D1-S3-010 to declare them NOT_APPLICABLE '
   || 'because Stage 4 is human-facilitated — which is not Stage 1 provenance. '
   || 'NOTHING WAS INVENTED. Fabricating those four references would manufacture the provenance of '
   || 'the machine that administers a real assessment to a real participant. '
   || 't3a_d1_s1_workbench_may_open already refuses with S1_WORKBENCH_PROVENANCE_INCOMPLETE and names '
   || 'the missing inputs: the refusal is the control working, not a defect. '
   || 'Note 5 CORR-13 demonstration fixture is blocked identically — a Stage 1 fixture needs a run. '
   || 'ALSO CORRECTED: Note 7''s report records the workbench interface as not built. It is built. '
   || 'The report is stale and was read as current, which is how it came to be reported as missing.')
ON CONFLICT (entry_id) DO UPDATE SET
  classification = EXCLUDED.classification,
  status         = EXCLUDED.status,
  blocked_on     = EXCLUDED.blocked_on,
  note           = EXCLUDED.note;

-- The lift condition, as data, so "what is Stage 1 waiting on" has one
-- answer a later reader can find.
INSERT INTO public.t3a_d1_lift_condition
  (lift_condition_id, scope, step_order, condition_text, owner, satisfied, satisfied_by, set_by)
VALUES
  ('S1-RUN-LIFT-1', 'Stage 1 administration', 1,
   'A model reference, prompt text, administration configuration and safety configuration are issued '
   || 'and loaded as content versions. Without all four, t3a_d1_ai_administration_run cannot be '
   || 'created and Stage 1 cannot be administered.',
   'Founder and authoring', false, NULL, 'CLOSE-001 E8/E9 finding'),

  ('S1-RUN-LIFT-2', 'Stage 1 administration', 2,
   'The test accounts Note 5 Step 4 names as a human task exist and can sign in. These are the same '
   || 'accounts whose absence fails the five auth.setup role logins in the browser suite.',
   'The Academy''s administrator', false, NULL, 'CLOSE-001 E8/E9 finding'),

  ('S1-RUN-LIFT-3', 'Stage 1 administration', 3,
   'The Stage 1 gate, its refusals, the workbench screen and the Mentor Desk pending action are '
   || 'built and tested.',
   'Developer', true,
   'Note 7 built the gate and refusals. The workbench screen exists and is routed. CORR-02 built by '
   || 'migration 20261059000000 and the Stage 1 section on the Mentor Desk. Both read routes refuse '
   || 'correctly with no mentor session (NO_MENTOR_IDENTIFIED).',
   'CLOSE-001 E8/E9 finding')
ON CONFLICT (lift_condition_id) DO UPDATE SET
  condition_text = EXCLUDED.condition_text,
  owner          = EXCLUDED.owner,
  satisfied      = EXCLUDED.satisfied,
  satisfied_by   = EXCLUDED.satisfied_by;
