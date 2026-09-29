-- =====================================================================
-- T3A-D1-EXEC-CLOSE-001 Section 3 — the Stage 4 lift condition corrected
--
-- Issue 3 named REC-12 as what Stage 4 production loading waits on, in six
-- places. All six are wrong, and the sixth is also factually untrue: it
-- says REC-12 "was open before this work began". It was not.
-- T3A-D1-EXEC-001 records REC-12 as APPROVED FOR DESIGN, with the
-- instruction to build the shared-session surface and its refusals now,
-- and states that real Stage 4 activation is a separate gate.
--
-- I REPEATED THE WRONG CLAIM WITHOUT CHECKING IT, AND THE TEXT THAT
-- CONTRADICTED IT WAS ALREADY IN THIS DATABASE. The loaded content of the
-- Stage 4 bank says, verbatim: "Activation: REC-12 approved for design.
-- Build the surface and its refusals now; real Stage 4 activation is a
-- separate gate." It has been in t3a_d1_content_version since the load.
-- Issue 3 said deferred, I passed that on as fact in a migration comment,
-- a PR description and a report to the founder, and never asked the
-- database. That is the same fault as every other one on this build:
-- a claim that was checkable and went unchecked.
--
-- WHY THE SIX WORDINGS ARE NOT EDITED. They are sentences inside applied
-- migrations — historical records of what was believed and executed at the
-- time. Rewriting them would be rewriting history, which CL-23 and the
-- whole register-as-data design exist to avoid. The correction is recorded
-- here and in the register, which is where a later reader looks for what
-- is in force. The old comments remain as evidence of the error.
--
-- CL-13 — THE LIFT CONDITION IS FOUR CONDITIONS, IN ORDER, AND ONLY ONE
-- IS THE BUILD'S. Step 3 is completed by Section 3A of this instrument.
-- The other three are the founder's.
--
-- THE OPERATIVE RULE IN CS-I-57 STANDS UNCHANGED: never parse a Stage 4
-- source with the Stage 2 rules, and DEMO-D1-S4-001 stays loaded. What was
-- wrong was the lift CONDITION, not the parsing prohibition.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. The lift condition, as data
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_lift_condition (
  lift_condition_id text PRIMARY KEY,
  scope             text NOT NULL,
  step_order        integer NOT NULL,
  condition_text    text NOT NULL,
  owner             text NOT NULL,
  satisfied         boolean NOT NULL DEFAULT false,
  satisfied_by      text,
  set_by            text NOT NULL,
  supersedes        text,
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, step_order)
);

COMMENT ON TABLE public.t3a_d1_lift_condition IS
  'CL-13. What a deferred item actually waits on, as data rather than as a sentence in a migration comment. Issue 3 stated the Stage 4 lift condition wrongly in six comments, and a comment cannot be corrected without rewriting history — so the condition lives here, where a later reader looks for what is in force.';

ALTER TABLE public.t3a_d1_lift_condition ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_lift_condition_read ON public.t3a_d1_lift_condition;
CREATE POLICY t3a_d1_lift_condition_read ON public.t3a_d1_lift_condition FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_lift_condition TO authenticated;

INSERT INTO public.t3a_d1_lift_condition
  (lift_condition_id, scope, step_order, condition_text, owner, satisfied, satisfied_by, set_by, supersedes)
VALUES
  ('S4-PROD-LIFT-1', 'Stage 4 production loading', 1,
   'Each Stage 4 source has a completed SEVEN-PART impact assessment: shared material, identity, '
   || 'recording, correction, withdrawal, group composition and accommodation. T3A-D1-EXEC-001 places '
   || 'this hold BEFORE REC-07 review, not merely before activation.',
   'Founder and authoring', false, NULL, 'CL-13', 'Issue 3 CS-I-57'),

  ('S4-PROD-LIFT-2', 'Stage 4 production loading', 2,
   'Each Stage 4 source holds a founder REC-07 approval given AFTER its assessment.',
   'Founder', false, NULL, 'CL-13', 'Issue 3 CS-I-57'),

  ('S4-PROD-LIFT-3', 'Stage 4 production loading', 3,
   'A Stage 4 parse rule recognizing B2 ROUND is built and tested.',
   'Developer', true,
   'CLOSE-001 Section 3A, migration 20261055000000. Ten of ten sources yield B1 to B7 with B2 as '
   || 'ROUND; thirty co-participant positions loaded; zero bindings outside the thirteen-set register.',
   'CL-13', 'Issue 3 CS-I-57'),

  ('S4-PROD-LIFT-4', 'Stage 4 production loading', 4,
   'The separate Stage 4 ACTIVATION decision is recorded. Loading is not serving, and building is '
   || 'not activating.',
   'Founder', false, NULL, 'CL-13', 'Issue 3 CS-I-57')
ON CONFLICT (lift_condition_id) DO UPDATE SET
  condition_text = EXCLUDED.condition_text,
  owner          = EXCLUDED.owner,
  satisfied      = EXCLUDED.satisfied,
  satisfied_by   = EXCLUDED.satisfied_by,
  set_by         = EXCLUDED.set_by,
  supersedes     = EXCLUDED.supersedes;

-- ---------------------------------------------------------------------
-- 2. The conflict register entry, amended rather than replaced
-- ---------------------------------------------------------------------

UPDATE public.t3a_d1_build_conflict_register
   SET classification = 'deferred LOADING — the build item is complete',
       blocked_on     = 'S4-PROD-LIFT-1, -2 and -4 in t3a_d1_lift_condition (founder). NOT REC-12.',
       amended_by     = 'CL-13',
       note = note || ' '
         || 'AMENDED BY CLOSE-001 CL-13: naming REC-12 as the lift condition was WRONG. '
         || 'T3A-D1-EXEC-001 records REC-12 as approved for design with the instruction to build the '
         || 'surface and its refusals now, and that text was already loaded in this database when the '
         || 'claim was made and repeated. The build item — a ROUND-aware parse rule — is DONE under '
         || 'Section 3A: ten sequences and thirty co-participant briefings are loaded. What Stage 4 '
         || 'now waits on is governance only: the seven-part impact assessments, the approvals given '
         || 'after them, and the activation decision. The operative prohibition in CS-I-57 is '
         || 'unchanged: the Stage 2 rule is never applied to a Stage 4 source, and DEMO-D1-S4-001 '
         || 'stays loaded.'
 WHERE entry_id = 'CS-I-42/stage-4';

-- ---------------------------------------------------------------------
-- 3. CL-14 / CL-17 — the provenance of the ten Stage 4 approvals
--
-- WHAT WAS FOUND, RECORDED WITHOUT ACTING ON IT. CL-16 authorizes
-- withdrawal where no assessment record exists, and the founder signed
-- that authorization at Section 6A. It is NOT executed by this migration:
-- the developer was instructed by the account holder to report the
-- findings first and withhold the withdrawals pending their decision. A
-- withdrawal of a named person's approval is not a step to take while an
-- instruction to hold is outstanding.
--
--   ATTRIBUTABLE, NOT UNACCOUNTED. All ten trace to Ekosse Mofoke
--   <tony.3rdacademy@gmail.com>, the only holder in t3a_oversight_holder,
--   standing live. Originals on the superseded versions with no carry
--   basis; the current-version rows carried by 20261039000000 under
--   PARSE_RECOVERY_CORR_003 with the identity assertion PASSING on all
--   ten. So they are nothing like the unaccounted SRC-D1-S3-010 row, and
--   CL-24's link case does not arise.
--
--   NO ASSESSMENT EXISTS. Searched t3a_d1_* and the whole public schema
--   for any impact-assessment record: none. The only matching tables are
--   candidate_self_assessments and self_assessments, which are participant
--   self-assessment, unrelated. No assessment in the repository either.
--   So on CL-15 none of the ten qualifies to stand, and all ten fall to
--   CL-16.
--
--   AND A FINDING WIDER THAN STAGE 4, WHICH IS WHY IT IS RECORDED HERE
--   RATHER THAN LEFT IN AN EMAIL. All FORTY original approvals were
--   written between 17:59:51 and 18:01:18 on 2026-09-21 — one minute
--   twenty-seven seconds for forty sources, a median of 2.1 seconds apart,
--   against an average source body of 9,502 characters. An approval
--   asserts that the approver holds THAT EXACT TEXT fit to put in front of
--   a participant. Nobody reads fifteen hundred words in two seconds,
--   forty times.
--
--   The mechanism did everything it was built to do: a named holder with
--   live standing, one row per source, through the governed route, and no
--   approve-all control exists. The substance did not follow. This
--   instrument authorizes withdrawal for the ten Stage 4 sources only, and
--   nothing here touches the other thirty — but the founders should know
--   that the concern CL-14 raises about Stage 4 is not confined to it.
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_approval_audit_finding
  (source_approval_id, finding, established, recorded_by)
SELECT h.source_approval_id,
       'unaccounted',
       jsonb_build_object(
         'source_identifier', h.source_identifier,
         'source_version_id', h.source_version_id,
         'approved_at', h.approved_at,
         'recorded_approver', h.approved_by,
         'approver_name', 'Ekosse Mofoke <tony.3rdacademy@gmail.com>',
         'approver_standing', 'live, unrevoked in t3a_oversight_holder',
         'carry_forward_basis', h.carry_forward_basis,
         'finding_kind', 'PRECONDITION_NOT_EVIDENCED',
         'precondition',
           'T3A-D1-EXEC-001: "NO S4 SOURCE MAY BE SUBMITTED FOR REC-07 APPROVAL until REC-12 is '
           || 'approved AND the source has a completed shared-material, identity, recording, '
           || 'correction, withdrawal, group-composition AND ACCOMMODATION-IMPACT assessment. The '
           || 'hold sits BEFORE review, not merely before activation."',
         'what_was_checked',
           'No impact-assessment record exists in the public schema or the repository. Only '
           || 'candidate_self_assessments and self_assessments match by name and both are '
           || 'participant self-assessment, unrelated. So under CL-15 this approval does not qualify '
           || 'to stand and falls to CL-16.',
         'distinguished_from_S3_010',
           'This approval is ATTRIBUTABLE — a named holder with live standing, through the governed '
           || 'route. It is not unaccounted in the sense the SRC-D1-S3-010 row is, so CL-24''s '
           || 'shared-origin link does not arise. What is missing is the precondition, not the actor.',
         'wider_finding',
           'All forty original approvals were written in 1 minute 27 seconds on 2026-09-21, a median '
           || '2.1 seconds apart, against an average source body of 9,502 characters. The mechanism '
           || 'held; the reading it asserts did not happen. This instrument authorizes withdrawal for '
           || 'the ten Stage 4 sources only and nothing here touches the other thirty.',
         'action_withheld',
           'CL-16 withdrawal NOT executed. The account holder instructed that findings be reported '
           || 'and withdrawals held pending their decision.'),
       'CL-14 and CL-17, migration 20261056000000'
  FROM public.t3a_d1_source_approval_history h
 WHERE h.source_identifier ~ '^SRC-D1-S4-0'
   AND h.is_standing
   AND h.version_is_current
   AND h.status = 'approved'
ON CONFLICT (source_approval_id, finding) DO NOTHING;

DO $report$
DECLARE v_n int;
BEGIN
  SELECT count(*) INTO v_n FROM public.t3a_d1_approval_audit_finding f
    JOIN public.t3a_d1_source_approval a ON a.source_approval_id = f.source_approval_id
    JOIN public.t3a_content_object co ON co.content_object_id = a.source_id
   WHERE co.identifier ~ '^SRC-D1-S4-0';
  IF v_n <> 10 THEN
    RAISE EXCEPTION 'CL_17_FAILED: expected a recorded finding for each of the ten Stage 4 approvals, found %', v_n;
  END IF;
  RAISE NOTICE 'CL-14/CL-17: ten Stage 4 approval findings recorded. CL-16 withdrawal deliberately NOT executed.';
END;
$report$;
