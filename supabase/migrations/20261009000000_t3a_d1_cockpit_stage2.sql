-- =====================================================================
-- T3A-D1-EXEC-001 §3 — the Stage 2 live surface
--
-- "The system carries the procedure; the mentor carries the
--  observation."
--
-- Three of §3's rules were interface-only and are made server-side here,
-- because a refusal that lives in a screen is not a refusal (Standing
-- Rule 6: a holding state is proved by requesting the route directly).
--
--   §3.1 / build 058 and 065 — below 1280 by 800, Stage 2 live capture
--        REFUSES. It does not reflow, collapse a pane, or reduce either
--        live view. Mobile is blocked outright.
--
--   §3.3 — the live-view availability rule, with its four thresholds:
--        degraded at three seconds, unavailable at ten, restoration
--        needs five, and any resumption after an unavailable period is
--        an administration variance.
--
--   build 060 — administration variance is recordable AT THE BEAT,
--        without leaving the cockpit, not only at session end. "An
--        inconvenient self-report will not be made."
--
-- And build 063's mentor-load instrument, which is a process measure for
-- the pilot and must never become evidence about a participant. That is
-- enforced structurally: the table has no participant column and no
-- score column, and section 5 refuses to let either be added.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. The viewport refusal
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s2_capture_permitted(
  p_viewport_width  int,
  p_viewport_height int,
  p_device_class    text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
BEGIN
  -- "Mobile phone is blocked." Stated first, because a phone that
  -- reported a large viewport would otherwise pass on size alone.
  IF lower(coalesce(p_device_class, '')) IN ('phone', 'mobile', 'handset') THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'STAGE_2_LIVE_CAPTURE_NOT_AVAILABLE_ON_A_PHONE',
      'remedy', 'Use a desktop or laptop.');
  END IF;

  IF p_viewport_width IS NULL OR p_viewport_height IS NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'VIEWPORT_NOT_REPORTED');
  END IF;

  -- 1280 by 800 is the minimum, and it is a floor rather than a hint.
  -- The alternative to refusing is reducing a live view, which §3.1
  -- forbids in the same sentence that sets the number.
  IF p_viewport_width < 1280 OR p_viewport_height < 800 THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'VIEWPORT_BELOW_SUPPORTED_MINIMUM',
      'minimum_width', 1280, 'minimum_height', 800,
      'reported_width', p_viewport_width, 'reported_height', p_viewport_height,
      'remedy', 'Use a viewport of at least 1280 by 800. The layout does not reflow, collapse a pane, or reduce either live view.');
  END IF;

  RETURN jsonb_build_object('permitted', true);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 2. The live-view availability rule
-- ---------------------------------------------------------------------

-- §3.3 in full, as one function, so the interface cannot hold a second
-- opinion about when a view is unavailable.
--
-- The thresholds are named constants in the body rather than columns,
-- because they are stated in the instruction and are not configuration.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_live_view_state(
  p_track_state              text,
  p_seconds_without_frames   numeric,
  p_seconds_of_decoded_frames numeric DEFAULT 0,
  p_was_unavailable          boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $fn$
DECLARE
  v_state   text;
  v_reason  text;
BEGIN
  -- "immediately on a failed or ended track" — no elapsed time required.
  IF lower(coalesce(p_track_state, '')) IN ('failed', 'ended') THEN
    RETURN jsonb_build_object(
      'state', 'UNAVAILABLE',
      'reason', 'TRACK_' || upper(p_track_state),
      'pause_route_taken', true,
      'source_advancement_blocked', true,
      'variance_on_resumption', true);
  END IF;

  -- Recovering. Five consecutive seconds of decoded frames are required
  -- before capture resumes — four is not four-fifths of the way back.
  IF p_was_unavailable THEN
    IF coalesce(p_seconds_of_decoded_frames, 0) >= 5 THEN
      RETURN jsonb_build_object(
        'state', 'AVAILABLE',
        'reason', 'RESTORED_AFTER_FIVE_SECONDS_OF_DECODED_FRAMES',
        'pause_route_taken', false,
        'source_advancement_blocked', false,
        -- "Any resumption after an unavailable period is recorded as an
        -- administration variance."
        'variance_on_resumption', true);
    END IF;
    RETURN jsonb_build_object(
      'state', 'UNAVAILABLE',
      'reason', 'RESTORATION_NOT_YET_SUSTAINED',
      'pause_route_taken', true,
      'source_advancement_blocked', true,
      'variance_on_resumption', true);
  END IF;

  IF lower(coalesce(p_track_state, '')) IN ('disconnected', 'muted')
     OR coalesce(p_seconds_without_frames, 0) > 0 THEN
    IF coalesce(p_seconds_without_frames, 0) >= 10 THEN
      v_state := 'UNAVAILABLE';
      v_reason := 'TEN_CONSECUTIVE_SECONDS_WITHOUT_DECODED_FRAMES';
    ELSIF coalesce(p_seconds_without_frames, 0) >= 3 THEN
      v_state := 'DEGRADED';
      v_reason := 'THREE_CONSECUTIVE_SECONDS_WITHOUT_DECODED_FRAMES';
    ELSIF lower(coalesce(p_track_state, '')) IN ('disconnected', 'muted') THEN
      -- The transport says so, which is one of the three §3.3 triggers
      -- and does not wait on a frame count.
      v_state := 'DEGRADED';
      v_reason := 'TRACK_' || upper(p_track_state);
    ELSE
      v_state := 'AVAILABLE';
      v_reason := NULL;
    END IF;
  ELSE
    v_state := 'AVAILABLE';
    v_reason := NULL;
  END IF;

  RETURN jsonb_build_object(
    'state', v_state,
    'reason', v_reason,
    -- On DEGRADED the instruction says surface it and CONTINUE. Pausing
    -- on a degraded view would stop a session the mentor can still run.
    'pause_route_taken', (v_state = 'UNAVAILABLE'),
    'source_advancement_blocked', (v_state = 'UNAVAILABLE'),
    'variance_on_resumption', (v_state = 'UNAVAILABLE'));
END;
$fn$;

-- ---------------------------------------------------------------------
-- 3. Beat-level administration variance
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_s2_administration_variance (
  variance_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_instance_id uuid NOT NULL,
  -- Recorded AT the beat. A variance with no beat is a variance recorded
  -- at session end, which is the thing build 060 exists to prevent.
  beat_code        text NOT NULL,
  variance_kind    text NOT NULL,
  narrative        text NOT NULL,
  recorded_by      uuid NOT NULL,
  recorded_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT t3a_d1_s2_variance_narrative_present
    CHECK (length(btrim(narrative)) > 0)
);

ALTER TABLE public.t3a_d1_s2_administration_variance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_d1_s2_variance_own ON public.t3a_d1_s2_administration_variance;
CREATE POLICY t3a_d1_s2_variance_own ON public.t3a_d1_s2_administration_variance
  FOR SELECT TO authenticated USING (recorded_by = auth.uid());

DROP POLICY IF EXISTS t3a_d1_s2_variance_record ON public.t3a_d1_s2_administration_variance;
CREATE POLICY t3a_d1_s2_variance_record ON public.t3a_d1_s2_administration_variance
  FOR INSERT TO authenticated WITH CHECK (recorded_by = auth.uid());

-- A variance is what happened. It is not revised afterwards.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_variance_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'ADMINISTRATION_VARIANCE_APPEND_ONLY: % refused; record a further variance instead', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_s2_variance_append_only_trg
  ON public.t3a_d1_s2_administration_variance;
CREATE TRIGGER t3a_d1_s2_variance_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_s2_administration_variance
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_s2_variance_append_only();

-- ---------------------------------------------------------------------
-- 4. The mentor-load instrument
-- ---------------------------------------------------------------------

-- Build 063: context-switch count, late-capture count and delay,
-- variance-use events, interface-recovery events, capture-correction
-- events. "These are PROCESS MEASURES for the pilot. They are not mentor
-- scores and never become evidence about a participant."
--
-- There is therefore no participant column and no score column. The
-- measures name what the interface did, not how well anyone did it.
CREATE TABLE IF NOT EXISTS public.t3a_d1_s2_mentor_load_event (
  load_event_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_instance_id uuid NOT NULL,
  measure           text NOT NULL,
  delay_seconds     numeric,
  observed_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT t3a_d1_s2_mentor_load_measure_in_set
    CHECK (measure IN ('context_switch', 'late_capture', 'variance_use',
                       'interface_recovery', 'capture_correction'))
);

ALTER TABLE public.t3a_d1_s2_mentor_load_event ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 5. The instrument cannot become evidence about anyone
-- ---------------------------------------------------------------------

-- Build 063's sentence survives only while the table cannot hold a
-- person or a judgment. Enforced rather than asserted, because the
-- acceptance register proved the difference between the two.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_load_instrument_no_subject()
RETURNS event_trigger LANGUAGE plpgsql AS $fn$
DECLARE
  r record;
  c text;
BEGIN
  FOR r IN SELECT * FROM pg_event_trigger_ddl_commands()
           WHERE object_type = 'table' LOOP
    IF r.object_identity = 'public.t3a_d1_s2_mentor_load_event' THEN
      FOR c IN SELECT column_name FROM information_schema.columns
               WHERE table_schema = 'public'
                 AND table_name = 't3a_d1_s2_mentor_load_event' LOOP
        IF c ~* '(participant|candidate|subject|mentor_id|observer|score|rating|rank|grade|performance|quality)' THEN
          RAISE EXCEPTION 'MENTOR_LOAD_INSTRUMENT_IS_NOT_EVIDENCE: column t3a_d1_s2_mentor_load_event.% would make a process measure into a judgment about a person; T3A-D1-EXEC-001 build 063 forbids it', c
            USING ERRCODE = 'check_violation';
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END;
$fn$;

DROP EVENT TRIGGER IF EXISTS t3a_d1_s2_load_instrument_no_subject_trg;
CREATE EVENT TRIGGER t3a_d1_s2_load_instrument_no_subject_trg
  ON ddl_command_end
  WHEN TAG IN ('ALTER TABLE', 'CREATE TABLE')
  EXECUTE FUNCTION public.t3a_d1_s2_load_instrument_no_subject();

GRANT SELECT, INSERT ON public.t3a_d1_s2_administration_variance TO authenticated;
GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s2_capture_permitted(int, int, text),
  public.t3a_d1_s2_live_view_state(text, numeric, numeric, boolean)
TO anon, authenticated;
