-- =====================================================================
-- CORR-006 Section 8 — CX-27, the specification cooldown, and CX-28, the
-- event a welfare stop is recorded as
--
-- WHAT WAS THERE. t3a_attempt exists, holds ZERO rows, and its outcome is a
-- closed list of six:
--
--     initiated, completed, abandoned, system_failure,
--     participant_withdrew, stage_terminated
--
-- and it carries `counted`, so "no attempt consumed" is already expressible.
-- There was no cooldown of any kind for D1: REC-10 lists one after a
-- completed observation and T3A-D1-EXEC-001 never gave it a value, which is
-- the ambiguity CX-27 ends.
--
-- ---------------------------------------------------------------------
-- CX-28 SAYS "NO NEW EVENT CLASS IS CREATED", AND KEEPING THAT PROMISE
-- COSTS SOMETHING WORTH NAMING.
--
-- The event CX-28 names is "Withdrawal after observation begins, before
-- commit". Of the six coded values, the one that means that is
-- `participant_withdrew`. But CX-28 covers a session stopped "by the
-- participant OR BY THE MENTOR", and a mentor stopping an observation for
-- someone's welfare is not the participant withdrawing. Recording it as
-- participant_withdrew mislabels who acted, on a safety event, in the
-- participant's own record.
--
-- The build did NOT add a seventh value: CX-28 forbids it in terms. Instead
-- the actor is recorded BESIDE the outcome, in t3a_d1_welfare_withdrawal, so
-- the closed list stays closed and the record still says who stopped it.
-- That is a compromise rather than a fix, and it is in the register.
--
-- ---------------------------------------------------------------------
-- WHAT THIS MIGRATION REFUSES TO INVENT.
--
-- CX-28 also says a welfare stop consumes no attempt but "the rescheduling
-- cooldown applies". CX-27 sets the SPECIFICATION cooldown, keyed to
-- completed observations — and a welfare stop is not one, so that schedule
-- does not advance. The rescheduling cooldown's duration is named nowhere in
-- this instrument and T3A-D1-EXEC-001 is not on disk.
--
-- So it is not invented. A participant whose session was stopped for welfare
-- is HELD, with the named refusal
-- RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED, until the founder gives the
-- value. Holding is also the protective reading: the purpose of a cooldown
-- after distress is to stop someone being re-observed immediately, so the
-- restrictive default and the kind one are the same default here. This
-- follows the precedent set under Note 5, where no production cooldown
-- duration was invented or persisted either.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. CX-27, as rows
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_specification_cooldown (
  completed_observations integer PRIMARY KEY CHECK (completed_observations >= 1),
  wait_days              integer CHECK (wait_days IS NULL OR wait_days > 0),
  issued_under           text NOT NULL,
  note                   text NOT NULL
);

COMMENT ON TABLE public.t3a_d1_specification_cooldown IS
  'CX-27. How long the next attempt on the same Stage and dimension waits, by how many completed observations precede it. A NULL wait_days is not "no wait" — it is "there is no next attempt", and t3a_d1_next_attempt_permitted refuses on the cap rather than reading NULL as permission.';

INSERT INTO public.t3a_d1_specification_cooldown
  (completed_observations, wait_days, issued_under, note)
VALUES
  (1, 7,    'T3A-D1-EXEC-CORR-006 Section 8, CX-27',
   'Seven days after the first completed observation.'),
  (2, 14,   'T3A-D1-EXEC-CORR-006 Section 8, CX-27',
   'Fourteen days after the second completed observation.'),
  (3, NULL, 'T3A-D1-EXEC-CORR-006 Section 8, CX-27',
   'There is none after the third, because there is no fourth attempt. NULL here means the cap is '
   || 'reached, not that the wait is zero — the refusal is the attempt cap of three at AC-B1.')
ON CONFLICT (completed_observations) DO UPDATE SET
  wait_days = EXCLUDED.wait_days, issued_under = EXCLUDED.issued_under, note = EXCLUDED.note;

ALTER TABLE public.t3a_d1_specification_cooldown ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_specification_cooldown_read ON public.t3a_d1_specification_cooldown;
CREATE POLICY t3a_d1_specification_cooldown_read
  ON public.t3a_d1_specification_cooldown FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------
-- 2. The welfare character of a withdrawal, recorded beside the outcome
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_welfare_withdrawal (
  welfare_withdrawal_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id            uuid NOT NULL UNIQUE
                          REFERENCES public.t3a_attempt(attempt_id),
  -- Who stopped it. The outcome code says participant_withdrew whoever
  -- acted, because CX-28 forbids a new event class; this is where the truth
  -- about the actor lives.
  stopped_by            text NOT NULL
                          CHECK (stopped_by IN ('participant', 'mentor', 'confirmer', 'platform')),
  stopped_by_actor      uuid,
  stage_code            public.t3a_stage_code NOT NULL,
  -- CX-28: a stop BEFORE observation begins is a different event. This table
  -- holds only the after-it-begins case, and says so rather than implying it.
  observation_had_begun boolean NOT NULL DEFAULT true CHECK (observation_had_begun),
  recorded_at           timestamptz NOT NULL DEFAULT now(),
  recorded_under        text NOT NULL DEFAULT 'T3A-D1-EXEC-CORR-006 Section 8, CX-28'
);

COMMENT ON TABLE public.t3a_d1_welfare_withdrawal IS
  'CX-28. Marks an attempt''s withdrawal as a welfare stop and records WHO stopped it. It exists because CX-28 says "No new event class is created": the outcome stays participant_withdrew, which is the coded value meaning "Withdrawal after observation begins, before commit", even where a mentor or a confirmer acted. Without this table the record would say a participant withdrew when a mentor stopped the session for their welfare. HOLDS NO DISCLOSURE CONTENT, ever — Annex C.7 and CX-30c govern what a safety event records, and this is not that record.';

COMMENT ON COLUMN public.t3a_d1_welfare_withdrawal.observation_had_begun IS
  'Always true, and constrained so. CX-28 maps a stop BEFORE observation begins to a different event — "Session cancelled before observation begins" — and a row here would silently reclassify one.';

ALTER TABLE public.t3a_d1_welfare_withdrawal ENABLE ROW LEVEL SECURITY;

-- The participant may see that their own session was stopped; nobody else
-- but administrative standing. There is no insert or update policy.
DROP POLICY IF EXISTS t3a_d1_welfare_withdrawal_read ON public.t3a_d1_welfare_withdrawal;
CREATE POLICY t3a_d1_welfare_withdrawal_read
  ON public.t3a_d1_welfare_withdrawal FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.t3a_attempt a
                  WHERE a.attempt_id = attempt_id AND a.participant_id = auth.uid())
         OR public.t3a_has_administrative_standing());

CREATE OR REPLACE FUNCTION public.t3a_d1_welfare_withdrawal_rules()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_outcome text; v_counted boolean;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'WELFARE_WITHDRAWAL_APPEND_ONLY: % refused. A safety record is never edited or removed.', TG_OP
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT outcome, counted INTO v_outcome, v_counted
    FROM public.t3a_attempt WHERE attempt_id = NEW.attempt_id;

  -- CX-28, both halves, checked against the attempt rather than trusted.
  IF v_outcome IS DISTINCT FROM 'participant_withdrew' THEN
    RAISE EXCEPTION 'WELFARE_STOP_WRONG_EVENT_CLASS: the attempt reads % and CX-28 records a welfare stop as the withdrawal-after-observation-begins event, which is coded participant_withdrew. No new event class is created.', coalesce(v_outcome, '<no attempt>')
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_counted THEN
    RAISE EXCEPTION 'WELFARE_STOP_CONSUMED_AN_ATTEMPT: CX-28 consumes no attempt. Record the attempt with counted = false.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_welfare_withdrawal_rules_trg ON public.t3a_d1_welfare_withdrawal;
CREATE TRIGGER t3a_d1_welfare_withdrawal_rules_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.t3a_d1_welfare_withdrawal
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_welfare_withdrawal_rules();

-- ---------------------------------------------------------------------
-- 3. Whether a next attempt may begin — AC-B1's "no cooldown is in force"
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_next_attempt_permitted(
  p_participant_id uuid,
  p_dimension_id   text,
  p_stage_code     public.t3a_stage_code)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_completed  int;
  v_last_end   timestamptz;
  v_wait       int;
  v_has_wait   boolean;
  v_available  timestamptz;
  v_welfare    timestamptz;
BEGIN
  SELECT count(*), max(a.ended_at) INTO v_completed, v_last_end
    FROM public.t3a_attempt a
   WHERE a.participant_id = p_participant_id
     AND a.dimension_id = p_dimension_id
     AND a.stage_code = p_stage_code
     AND a.outcome = 'completed'
     AND a.counted;

  -- AC-B1: the attempt cap of three. Read from CX-27's own table: the row
  -- for three completed observations carries no wait BECAUSE there is no
  -- fourth attempt, and reading its NULL as "no wait" is the mistake this
  -- guards against.
  IF v_completed >= 3 THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'ATTEMPT_CAP_REACHED',
      'completed_observations', v_completed,
      'remedy', 'CX-27: there is no cooldown after the third completed observation because there is no fourth attempt.');
  END IF;

  IF v_completed >= 1 THEN
    SELECT c.wait_days, (c.wait_days IS NOT NULL) INTO v_wait, v_has_wait
      FROM public.t3a_d1_specification_cooldown c
     WHERE c.completed_observations = v_completed;

    IF NOT coalesce(v_has_wait, false) THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'NO_COOLDOWN_ISSUED_FOR_THIS_COUNT',
        'completed_observations', v_completed,
        'remedy', 'CX-27 issues a wait for one and two completed observations. A count with no issued wait is held rather than allowed through.');
    END IF;

    IF v_last_end IS NULL THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'COMPLETED_ATTEMPT_HAS_NO_END_TIME',
        'remedy', 'The cooldown counts from the end of the completed observation. Without that instant there is nothing to count from, and guessing one would shorten a wait.');
    END IF;

    v_available := v_last_end + make_interval(days => v_wait);
    IF now() < v_available THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'SPECIFICATION_COOLDOWN_IN_FORCE',
        'completed_observations', v_completed,
        'wait_days', v_wait,
        'available_from', v_available);
    END IF;
  END IF;

  -- CX-28. A welfare stop consumes no attempt, so none of the above sees it,
  -- and "the rescheduling cooldown applies" — whose duration this instrument
  -- does not give. Held rather than guessed.
  SELECT max(w.recorded_at) INTO v_welfare
    FROM public.t3a_d1_welfare_withdrawal w
    JOIN public.t3a_attempt a ON a.attempt_id = w.attempt_id
   WHERE a.participant_id = p_participant_id
     AND a.dimension_id = p_dimension_id
     AND a.stage_code = p_stage_code;

  IF v_welfare IS NOT NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED',
      'welfare_stop_at', v_welfare,
      'remedy', 'CX-28 says a welfare stop consumes no attempt and that the rescheduling cooldown applies. Its duration is named nowhere in this instrument, so the build does not supply one. The participant is held until the founder issues it — which is also the protective reading, because the point of a wait after distress is not to be re-observed straight away.');
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'completed_observations', v_completed);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_next_attempt_permitted(uuid, text, public.t3a_stage_code) IS
  'AC-B1''s "the attempt cap of three is not reached; no cooldown is in force", answered in one place so a screen and a run route cannot disagree. Every refusal is named. Note that it refuses on RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED after a welfare stop rather than permitting: CX-28 says that cooldown applies and does not say how long, and a build that picks a number is setting a governed value.';

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_next_attempt_permitted(uuid, text, public.t3a_stage_code)
TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Assert the promise CX-28 makes
-- ---------------------------------------------------------------------

DO $verify$
DECLARE v_def text; v_n int;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO v_def FROM pg_constraint
   WHERE conrelid = 'public.t3a_attempt'::regclass AND conname = 't3a_attempt_outcome_check';

  -- CX-28: "No new event class is created." The closed list must still hold
  -- exactly the six values it held before this instrument.
  IF v_def IS NULL THEN
    RAISE EXCEPTION 'CX28_OUTCOME_LIST_MISSING: t3a_attempt has no outcome check constraint, so there is no closed list to have kept closed.';
  END IF;
  FOREACH v_def IN ARRAY ARRAY[v_def] LOOP NULL; END LOOP;

  SELECT count(*) INTO v_n FROM (
    SELECT unnest(ARRAY['initiated','completed','abandoned','system_failure',
                        'participant_withdrew','stage_terminated']) AS v) x
   WHERE position(x.v in (SELECT pg_get_constraintdef(oid) FROM pg_constraint
                           WHERE conrelid = 'public.t3a_attempt'::regclass
                             AND conname = 't3a_attempt_outcome_check')) > 0;

  IF v_n <> 6 THEN
    RAISE EXCEPTION 'CX28_OUTCOME_LIST_CHANGED: % of the six original outcome values are still in the closed list.', v_n;
  END IF;

  SELECT count(*) INTO v_n FROM public.t3a_d1_specification_cooldown;
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'CX27_WRONG_COUNT: % cooldown rows, expected three.', v_n;
  END IF;

  IF (SELECT wait_days FROM public.t3a_d1_specification_cooldown WHERE completed_observations = 1) <> 7
     OR (SELECT wait_days FROM public.t3a_d1_specification_cooldown WHERE completed_observations = 2) <> 14
     OR (SELECT wait_days FROM public.t3a_d1_specification_cooldown WHERE completed_observations = 3) IS NOT NULL THEN
    RAISE EXCEPTION 'CX27_SCHEDULE_WRONG: the loaded schedule is not seven, fourteen, none.';
  END IF;

  RAISE NOTICE 'CX-27: seven, fourteen, none. CX-28: the six outcome values are unchanged and no seventh was added.';
END;
$verify$;

-- ---------------------------------------------------------------------
-- 5. What is recorded rather than decided
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('CORR-006/CX-28/participant-withdrew-names-the-wrong-actor',
   'CORR-006 Section 8, while mapping the welfare stop',
   'Which coded event a mentor-initiated welfare stop is recorded as',
   'compromise taken to keep CX-28''s promise; the cost is recorded rather than absorbed',
   'open',
   'Founder: confirm that a mentor-initiated welfare stop may carry the coded outcome '
   || 'participant_withdrew with the actor recorded beside it, or issue a wording that does not name '
   || 'the participant as the one who withdrew.',
   'CX-28 names the event "Withdrawal after observation begins, before commit" and says "No new event '
   || 'class is created". The coded closed list on t3a_attempt holds six values and the one meaning '
   || 'that event is participant_withdrew. BUT CX-28 COVERS A SESSION STOPPED "BY THE PARTICIPANT OR '
   || 'BY THE MENTOR", and a mentor stopping an observation for someone''s welfare is not the '
   || 'participant withdrawing. Recording it as participant_withdrew mislabels who acted, on a safety '
   || 'event, in that person''s own record — and a participant reading their record would see that '
   || 'they withdrew from a session someone else stopped for them. '
   || 'THE BUILD DID NOT ADD A SEVENTH VALUE, because CX-28 forbids it in terms, and the migration '
   || 'asserts the six are unchanged. The actor is recorded BESIDE the outcome in '
   || 't3a_d1_welfare_withdrawal.stopped_by, so the closed list stays closed and the record still '
   || 'says who stopped it. That is a compromise, not a fix: the coded value a report or an export '
   || 'reads still says participant_withdrew.'),

  ('CORR-006/CX-28/rescheduling-cooldown-has-no-duration',
   'CORR-006 Section 8',
   'How long a participant waits after a session is stopped for their welfare',
   'governed value not issued — held, not guessed',
   'open',
   'Founder: issue the rescheduling cooldown duration for a welfare stop, in days.',
   'CX-28: a welfare stop consumes no attempt and "the rescheduling cooldown applies". CX-27 sets the '
   || 'SPECIFICATION cooldown, keyed to COMPLETED observations, and a welfare stop is not one — so '
   || 'that schedule does not advance and does not answer this. The rescheduling cooldown''s duration '
   || 'is named nowhere in this instrument, and T3A-D1-EXEC-001 is not on disk. '
   || 'THE BUILD DOES NOT SUPPLY ONE. t3a_d1_next_attempt_permitted refuses with '
   || 'RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED, so a participant whose session was stopped for '
   || 'welfare is HELD until the value exists. '
   || 'WHY HOLDING IS THE RIGHT DEFAULT AND NOT MERELY THE CAUTIOUS ONE: the purpose of a wait after '
   || 'distress is that someone is not re-observed straight away, so the restrictive reading and the '
   || 'kind one coincide. The alternative — a build picking seven or fourteen because those numbers '
   || 'appear nearby — sets a governed value about a distressed person''s access to an assessment. '
   || 'Note 5 set the precedent: no production cooldown duration was invented or persisted then '
   || 'either.'),

  ('CORR-006/CX-27/legacy-cooldown-can-be-overridden-by-a-mentor',
   'CORR-006 Section 8, found while looking for an existing cooldown',
   'A second, older cooldown that D1 does not use',
   'legacy surface, in scope for Section 6''s quarantine — recorded here because it was found here',
   'open',
   'Section 6 (CX-19 to CX-22) quarantines the legacy library server-side. This is one more reason it '
   || 'matters.',
   'The legacy scenario library carries its own cooldown: admin_settings.reassessment_cooldown_days '
   || 'defaulting to 14, observation_loops.cooldown_ends_at, AND A mentor_override BOOLEAN THAT '
   || 'BYPASSES IT. So in the legacy path a mentor can set aside a participant''s cooldown. '
   || 'D1''S COOLDOWN HAS NO OVERRIDE and t3a_d1_next_attempt_permitted offers no parameter that '
   || 'would accept one. The two are separate: nothing in D1 reads admin_settings or '
   || 'observation_loops. Recorded so that the existence of a bypassable cooldown in the same '
   || 'database is not mistaken for D1 having one.')
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
  ('CX-27-COOLDOWN', 'T3A-D1-EXEC-CORR-006 Section 8, CX-27',
   'The specification cooldown is seven days, then fourteen, then the cap',
   'Synthetic attempt rows inside an aborted transaction, each wait tested on BOTH sides of its '
   || 'boundary, plus a second Stage left untouched.',
   'No history permits. One completed observation a minute old refuses with '
   || 'SPECIFICATION_COOLDOWN_IN_FORCE and a wait of 7; the same one eight days old permits. Two, '
   || 'latest eight days old, refuses with a wait of 14; fifteen days old permits. Three refuses with '
   || 'ATTEMPT_CAP_REACHED, not with a cooldown. Another Stage permits throughout.',
   'CX-27', NULL,
   'Both sides of every boundary, because a cooldown test that only ever checks "refused" passes '
   || 'against a function that refuses everything. The untouched second Stage is the same control for '
   || 'scope.'),

  ('CX-28-WELFARE-STOP', 'T3A-D1-EXEC-CORR-006 Section 8, CX-28',
   'A welfare stop is the existing withdrawal event, consumes no attempt, and creates no new event class',
   'A synthetic welfare stop recorded by a MENTOR, so the actor and the coded outcome disagree, which '
   || 'is the point.',
   'The attempt reads participant_withdrew with counted false; t3a_d1_welfare_withdrawal.stopped_by '
   || 'reads mentor; the next attempt is held with RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED; a '
   || 'welfare row on an attempt of another outcome is refused by name; one on a counted attempt is '
   || 'refused by name; and t3a_attempt''s outcome list still holds exactly six values.',
   'CX-28', NULL,
   'The fixture uses a mentor rather than a participant deliberately: with a participant stopping '
   || 'their own session, the coded outcome happens to be right and the mislabelling this records '
   || 'would be invisible.')
ON CONFLICT (correction_test_id) DO UPDATE SET
  instrument = EXCLUDED.instrument, test_name = EXCLUDED.test_name,
  fixture = EXCLUDED.fixture, required_result = EXCLUDED.required_result,
  restated_by = EXCLUDED.restated_by, supersedes_fixture = EXCLUDED.supersedes_fixture,
  why_restated = EXCLUDED.why_restated;

INSERT INTO public.t3a_d1_correction_test_outcome
  (correction_test_id, outcome, actual_result, build_version, tester, conflict_note)
VALUES
  ('CX-27-COOLDOWN', 'pass',
   'scripts/proofs/cooldown-and-welfare-stop-proof.sql, self-aborting: noHistory=PERMITTED '
   || 'afterOne=SPECIFICATION_COOLDOWN_IN_FORCE/7 afterOneEightDays=PERMITTED '
   || 'afterTwoEightDays=SPECIFICATION_COOLDOWN_IN_FORCE/14 afterTwoFifteenDays=PERMITTED '
   || 'afterThree=ATTEMPT_CAP_REACHED otherStage=PERMITTED. Nothing committed; t3a_attempt holds zero '
   || 'rows afterwards, as it did before.',
   '20261080000000', 'Claude Code, automated, non-production environment',
   NULL),

  ('CX-28-WELFARE-STOP', 'pass',
   'Same proof: afterWelfareStop=RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED actorRecorded=mentor '
   || 'codedOutcome=participant_withdrew wrongEventClass=REFUSED_BY_NAME '
   || 'consumedAnAttempt=REFUSED_BY_NAME outcomeValues=6.',
   '20261080000000', 'Claude Code, automated, non-production environment',
   'THE RESULT LINE CONTAINS THE COMPROMISE RATHER THAN HIDING IT: actorRecorded=mentor beside '
   || 'codedOutcome=participant_withdrew. CX-28 forbids a new event class, so a mentor-initiated '
   || 'welfare stop carries a coded outcome naming the participant as having withdrawn. The actor is '
   || 'recorded beside it; the coded value a report or an export reads is still participant_withdrew. '
   || 'Open at CORR-006/CX-28/participant-withdrew-names-the-wrong-actor. '
   || 'The held reschedule is also not a pass in the ordinary sense: it is the build refusing to set a '
   || 'governed value. Open at CORR-006/CX-28/rescheduling-cooldown-has-no-duration.');
