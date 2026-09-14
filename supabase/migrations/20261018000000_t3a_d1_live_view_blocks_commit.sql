-- =====================================================================
-- §3.3 — an unavailable live view has to stop something
--
-- Raised in review on PR #284 and correct. The availability rule was
-- measured, judged and DISPLAYED. The verdict drove a banner and nothing
-- else: the commit control still wrote an observation record while the
-- screen said the session was paused and advancement blocked.
--
-- That is the same mistake as the report face, in a different place. A
-- rule a screen states and a rule a route enforces are not the same
-- thing, and only the second one is a rule.
--
-- Two halves:
--
--   1. The verdict is RECORDED, not just shown. When a required live
--      view becomes unavailable the client reports it and a pause event
--      is written, so the block outlives the component, the refresh and
--      the mentor closing the tab. t3a_d1_s2_advancement_permitted
--      already refuses while an uncleared pause stands, and now it has
--      something to refuse on.
--
--   2. COMMIT IS GATED SERVER-SIDE. The client cannot be the thing that
--      decides, because the client is where the incentive to press on
--      lives. A commit attempted while a pause stands is refused whatever
--      the interface shows.
--
-- The server cannot see a video track, so the measurement has to come
-- from the client. That is not a reason to leave the decision there: the
-- client reports what it measured, the server records it and refuses on
-- it, and a client that reports nothing leaves the pause standing rather
-- than clearing it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Reporting a live-view verdict
-- ---------------------------------------------------------------------

-- Idempotent per transition: reporting UNAVAILABLE twice does not write
-- two pauses, and reporting AVAILABLE while nothing is paused writes
-- nothing. Only a change of standing writes an event.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_report_live_view(
  p_stage_instance_id uuid,
  p_view              text,
  p_state             text,
  p_reason            text,
  p_recorded_by       uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_last public.t3a_d1_s2_session_event_kind;
  v_paused boolean;
BEGIN
  IF p_view NOT IN ('participant', 'mentor') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'VIEW_NOT_IN_CONTROLLED_SET');
  END IF;

  IF p_state NOT IN ('AVAILABLE', 'DEGRADED', 'UNAVAILABLE') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'STATE_NOT_IN_CONTROLLED_SET');
  END IF;

  SELECT e.event_kind INTO v_last
  FROM public.t3a_d1_s2_session_event e
  WHERE e.stage_instance_id = p_stage_instance_id
    AND e.event_kind IN ('paused', 'pause_cleared')
  ORDER BY e.event_seq DESC
  LIMIT 1;

  -- coalesce is load-bearing, for the third time in this codebase. With
  -- no session event yet, v_last is NULL and (NULL = 'paused') is NULL
  -- rather than false, so `NOT v_paused` is NULL and the pause branch
  -- never fires. The first proof run caught it reporting NO_CHANGE for an
  -- unavailable view — which would have left the commit gate open in
  -- exactly the case it exists for.
  v_paused := coalesce(v_last = 'paused', false);

  -- §3.3: on DEGRADED, surface it and CONTINUE. Only unavailable takes
  -- the pause route, so a degraded view writes nothing here.
  IF p_state = 'UNAVAILABLE' AND NOT v_paused THEN
    INSERT INTO public.t3a_d1_s2_session_event
      (stage_instance_id, event_kind, reason, recorded_by)
    VALUES (p_stage_instance_id, 'paused',
            format('%s live view unavailable: %s', p_view,
                   coalesce(nullif(btrim(p_reason), ''), 'no reason reported')),
            p_recorded_by);

    RETURN jsonb_build_object('recorded', true, 'effect', 'PAUSED');
  END IF;

  -- Restoration. The five-consecutive-second rule is already applied by
  -- t3a_d1_s2_live_view_state before a client reports AVAILABLE again,
  -- so reaching here means the view came back and stayed back.
  IF p_state = 'AVAILABLE' AND v_paused THEN
    INSERT INTO public.t3a_d1_s2_session_event
      (stage_instance_id, event_kind, reason, recorded_by)
    VALUES (p_stage_instance_id, 'pause_cleared',
            format('%s live view restored', p_view), p_recorded_by);

    -- "Any resumption after an unavailable period is recorded as an
    -- administration variance." Written here rather than left to the
    -- mentor, because a variance a mentor has to remember is a variance
    -- that goes unrecorded.
    INSERT INTO public.t3a_d1_s2_administration_variance
      (stage_instance_id, beat_code, variance_kind, narrative, recorded_by)
    VALUES (p_stage_instance_id, 'LIVE_VIEW', 'live_view_resumption',
            format('The %s live view was unavailable and the session resumed after it was restored.', p_view),
            p_recorded_by);

    RETURN jsonb_build_object('recorded', true, 'effect', 'RESUMED_WITH_VARIANCE');
  END IF;

  RETURN jsonb_build_object('recorded', true, 'effect', 'NO_CHANGE');
END;
$fn$;

-- ---------------------------------------------------------------------
-- 2. Commit is refused while a pause stands
-- ---------------------------------------------------------------------

-- The observation record is written by the cockpit directly, so the
-- guard goes on the table rather than in a function the client could
-- route around. A commit is refused while advancement is refused.
--
-- version_set carries the stage_entry_event_id, which is the stage
-- instance the session events are keyed to.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_commit_requires_live_views()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_instance uuid;
  v_verdict  jsonb;
BEGIN
  IF NOT coalesce(NEW.is_committed, false) THEN
    RETURN NEW;
  END IF;

  -- Stage 2 is the live-observation Stage. The other Stages have no live
  -- view to lose, so the guard does not reach past its own §.
  IF NEW.stage_code <> 'S2' THEN
    RETURN NEW;
  END IF;

  v_instance := nullif(NEW.version_set ->> 'stage_entry_event_id', '')::uuid;
  IF v_instance IS NULL THEN
    RETURN NEW;
  END IF;

  v_verdict := public.t3a_d1_s2_advancement_permitted(v_instance);

  IF NOT (v_verdict ->> 'permitted')::boolean THEN
    RAISE EXCEPTION 'COMMIT_REFUSED_WHILE_SESSION_PAUSED: % — a live view was unavailable and has not been restored and cleared',
      v_verdict ->> 'refusal_code'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_s2_commit_requires_live_views_trg
  ON public.t3a_observation_record;
CREATE TRIGGER t3a_d1_s2_commit_requires_live_views_trg
  BEFORE INSERT OR UPDATE ON public.t3a_observation_record
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_s2_commit_requires_live_views();

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s2_report_live_view(uuid, text, text, text, uuid)
TO authenticated;
