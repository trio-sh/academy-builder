-- =====================================================================
-- §3.1 — a live view may not open without the consent that covers it
--
-- The outstanding item in the build report reads: "A media provider for
-- the two live views. The measurement layer, the §3.3 verdict and the
-- display are built and proved; what is missing is a stream to attach."
--
-- Before a stream is attached, something has to decide whether a camera
-- may be opened on a participant at all. Nothing did. §7 records
-- OBSERVATION consent and t3a_d1_consent_type_available already refuses
-- to grant RECORDING, but no route asked either question before showing
-- a live view, and t3a_d1_s2_capture_permitted gates only on device
-- class and viewport.
--
-- So this is the gate, and then the transport is gated ON it rather than
-- on the client remembering to ask.
--
-- THE GATE RESOLVES THE PARTICIPANT ITSELF. It takes a stage instance,
-- not a participant, and looks the participant up through the gateway.
-- A caller that could name the participant could name a different one
-- and be told about a consent that has nothing to do with this session.
--
-- NO MEDIA CROSSES THIS DATABASE. What the table below carries is
-- connection metadata — SDP descriptions and ICE candidates, which
-- describe how two browsers reach each other. No frame, no audio sample
-- and no recording is stored, because RECORDING consent is unavailable
-- at every D1 Stage and a store for media would be the first thing to
-- build if it were not.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. Who this stage instance is about
-- ---------------------------------------------------------------------

-- SECURITY DEFINER because the caller may be the mentor, who has no
-- direct read on the gateway row.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_stage_participant(p_stage_instance_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT g.participant_id
  FROM public.t3a_stage_entry_event e
  JOIN public.t3a_observation_path_gateway g
    ON g.observation_path_gateway_id = e.observation_path_gateway_id
  WHERE e.stage_instance_id = p_stage_instance_id
  ORDER BY e.created_at DESC
  LIMIT 1;
$fn$;

-- ---------------------------------------------------------------------
-- 2. The gate
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s2_live_view_permitted(p_stage_instance_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_participant uuid;
  v_state       text;
  v_withdrawn   boolean;
BEGIN
  IF p_stage_instance_id IS NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'STAGE_INSTANCE_NOT_IDENTIFIED');
  END IF;

  v_participant := public.t3a_d1_s2_stage_participant(p_stage_instance_id);

  IF v_participant IS NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'STAGE_INSTANCE_HAS_NO_PARTICIPANT',
      'remedy', 'A live view is opened on a person. If the Stage instance does not name one, there is nothing to consent to.');
  END IF;

  -- The standing OBSERVATION consent for this instance: bound to this
  -- exact instance, or granted for the Stage class with no instance
  -- binding. A superseded row is not the standing one.
  SELECT c.state, c.withdrawn_at IS NOT NULL
    INTO v_state, v_withdrawn
  FROM public.t3a_d1_consent c
  WHERE c.participant_id = v_participant
    AND c.consent_type = 'OBSERVATION'
    AND c.superseded_by IS NULL
    AND (c.stage_instance_id = p_stage_instance_id
         OR (c.stage_instance_id IS NULL AND c.stage_class = 'S2'))
  ORDER BY (c.stage_instance_id = p_stage_instance_id) DESC NULLS LAST,
           c.created_at DESC
  LIMIT 1;

  -- coalesce, for the fourth time in this codebase. With no consent row
  -- at all v_state is NULL, and (NULL <> 'GRANTED') is NULL rather than
  -- true, so an IF on it would fall through to permitting the view in
  -- exactly the case where nobody has agreed to anything.
  IF coalesce(v_state, '') = '' THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'OBSERVATION_CONSENT_NOT_ON_RECORD',
      'participant_id', v_participant);
  END IF;

  IF coalesce(v_withdrawn, false) OR v_state = 'WITHDRAWN' THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'OBSERVATION_CONSENT_WITHDRAWN',
      'participant_id', v_participant,
      'remedy', 'Withdrawal is not reversed in place. A new consent record supersedes it.');
  END IF;

  IF v_state <> 'GRANTED' THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'OBSERVATION_CONSENT_NOT_GRANTED',
      'consent_state', v_state,
      'participant_id', v_participant);
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'participant_id', v_participant,
    -- Stated in the answer so a surface cannot claim it was not told.
    'recording_permitted', false);
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_s2_live_view_permitted(uuid),
  public.t3a_d1_s2_stage_participant(uuid)
TO authenticated;

-- ---------------------------------------------------------------------
-- 3. The transport, gated on the gate
-- ---------------------------------------------------------------------

-- Two browsers cannot reach each other without exchanging an offer, an
-- answer and a set of candidate routes. That exchange is all this table
-- is: it is a relay, not a record, and nothing here is evidence.
--
-- Putting the exchange behind RLS is what makes the consent gate
-- structural rather than advisory. A client that skips the gate and
-- opens its own camera still cannot form a connection, because it cannot
-- write or read a single signal row. The refusal does not depend on the
-- client choosing to honor it.
CREATE TABLE IF NOT EXISTS public.t3a_d1_s2_live_view_signal (
  signal_id         uuid primary key default gen_random_uuid(),
  stage_instance_id uuid not null,
  from_actor        uuid not null references public.profiles(id) on delete restrict,
  to_actor          uuid not null references public.profiles(id) on delete restrict,
  -- 'bye' closes a connection. There is deliberately no 'record'.
  kind              text not null check (kind IN ('offer', 'answer', 'ice', 'bye')),
  payload           jsonb not null,
  created_at        timestamptz not null default now(),
  CONSTRAINT t3a_d1_s2_live_view_signal_not_self CHECK (from_actor <> to_actor)
);

COMMENT ON TABLE public.t3a_d1_s2_live_view_signal IS
  'WebRTC signalling for the Stage 2 live views: SDP and ICE only. No media, no frame and no recording is stored here or anywhere else — RECORDING consent is unavailable at every D1 Stage. Readable and writable only while t3a_d1_s2_live_view_permitted says the OBSERVATION consent stands, which is what makes that gate structural.';

CREATE INDEX IF NOT EXISTS t3a_d1_s2_live_view_signal_delivery_idx
  ON public.t3a_d1_s2_live_view_signal (stage_instance_id, to_actor, created_at);

ALTER TABLE public.t3a_d1_s2_live_view_signal ENABLE ROW LEVEL SECURITY;

-- A relay is append-only for the same reason the logs are: an edited
-- offer is a different connection.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_live_view_signal_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Spent signals are cleared by the janitor below, running as the
    -- table owner, not by a client editing the exchange.
    IF current_setting('t3a.signal_sweep', true) = 'on' THEN
      RETURN OLD;
    END IF;
  END IF;
  RAISE EXCEPTION 'LIVE_VIEW_SIGNAL_APPEND_ONLY: % refused', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_s2_live_view_signal_append_only_trg
  ON public.t3a_d1_s2_live_view_signal;
CREATE TRIGGER t3a_d1_s2_live_view_signal_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_s2_live_view_signal
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_s2_live_view_signal_append_only();

-- Who may take part: exactly two people, plus the oversight route.
--
--   * the participant this Stage instance is about;
--   * the mentor ASSIGNED to that participant, which is the ordinary
--     case and the one that matters. An earlier draft of this function
--     admitted a mentor only through t3a_has_administrative_standing(),
--     which would have meant no ordinary mentor could run a Stage 2
--     session at all — only an oversight administrator. The assignment
--     register is what says who this participant's mentor is, so that
--     is what is read.
--   * a Stage 4 facilitator, for the shared session.
--
-- Not "any authenticated account that knows a stage instance id", and
-- not any mentor either: an assignment to THIS participant is required.
--
-- AND NOT AN OVERSIGHT ADMINISTRATOR. An earlier draft of this function
-- ended with `OR public.t3a_has_administrative_standing()`, copied from
-- the approval routes without thinking about what it means here. On an
-- approval route that clause is correct. On the media path it would let
-- every oversight holder join any participant's live video, in any
-- session, without being assigned to them and without appearing anywhere
-- in the session's record.
--
-- Oversight standing exists to approve sources and to read what was
-- recorded afterwards. Watching a person through their camera is not an
-- administrative act, and a standing that grew to include it would be
-- the broadest privilege in the platform. Proving this function caught
-- it: the test for "an unassigned mentor is refused" passed the
-- unassigned mentor, because the only mentor account on the system holds
-- oversight standing.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_live_view_party(p_stage_instance_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT coalesce(
    public.t3a_d1_s2_stage_participant(p_stage_instance_id) = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.t3a_mentor_assignment ma
      WHERE ma.mentor_id = auth.uid()
        AND ma.participant_id
            = public.t3a_d1_s2_stage_participant(p_stage_instance_id)
    )
    OR EXISTS (
      SELECT 1 FROM public.t3a_d1_group_session gs
      WHERE gs.stage_instance_id = p_stage_instance_id
        AND gs.facilitator_id = auth.uid()
    ), false);
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_s2_live_view_party(uuid) TO authenticated;

DROP POLICY IF EXISTS "t3a_d1_s2_live_view_signal_read" ON public.t3a_d1_s2_live_view_signal;
CREATE POLICY "t3a_d1_s2_live_view_signal_read"
  ON public.t3a_d1_s2_live_view_signal FOR SELECT TO authenticated
  USING (
    (to_actor = auth.uid() OR from_actor = auth.uid())
    AND public.t3a_d1_s2_live_view_party(stage_instance_id)
    AND (public.t3a_d1_s2_live_view_permitted(stage_instance_id) ->> 'permitted')::boolean
  );

DROP POLICY IF EXISTS "t3a_d1_s2_live_view_signal_send" ON public.t3a_d1_s2_live_view_signal;
CREATE POLICY "t3a_d1_s2_live_view_signal_send"
  ON public.t3a_d1_s2_live_view_signal FOR INSERT TO authenticated
  WITH CHECK (
    from_actor = auth.uid()
    AND public.t3a_d1_s2_live_view_party(stage_instance_id)
    AND (public.t3a_d1_s2_live_view_permitted(stage_instance_id) ->> 'permitted')::boolean
  );

GRANT SELECT, INSERT ON public.t3a_d1_s2_live_view_signal TO authenticated;

-- Signals are spent the moment they are applied. Sweeping them is not
-- erasing a record — there is no record here to erase — it is stopping a
-- relay from accumulating stale routes that describe a network that has
-- moved on.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_sweep_live_view_signals(p_older_than interval DEFAULT interval '10 minutes')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE n integer;
BEGIN
  PERFORM set_config('t3a.signal_sweep', 'on', true);
  DELETE FROM public.t3a_d1_s2_live_view_signal
   WHERE created_at < now() - p_older_than;
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM set_config('t3a.signal_sweep', 'off', true);
  RETURN n;
END;
$fn$;

REVOKE ALL ON FUNCTION public.t3a_d1_s2_sweep_live_view_signals(interval) FROM public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. The relay has to actually relay
-- ---------------------------------------------------------------------

-- An offer that arrives only when the other side happens to poll is not
-- a signalling channel. The table joins the realtime publication so each
-- side is told the moment a signal lands. RLS still decides what each
-- subscriber is allowed to see, so publishing the table does not widen
-- who can read it.
DO $pub$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 't3a_d1_s2_live_view_signal'
    ) THEN
      ALTER PUBLICATION supabase_realtime
        ADD TABLE public.t3a_d1_s2_live_view_signal;
    END IF;
  END IF;
END
$pub$;

-- REPLICA IDENTITY FULL so a subscriber receives the whole row rather
-- than just the key it changed.
ALTER TABLE public.t3a_d1_s2_live_view_signal REPLICA IDENTITY FULL;

-- ---------------------------------------------------------------------
-- 5. What the participant is allowed to know
-- ---------------------------------------------------------------------

-- A participant needs to find out whether a session is open on them,
-- without being able to name a Stage instance and ask about it. This
-- answers only for the caller, and only about their own Stage instances.
--
-- "Open" means: an S2 entry exists, no ended_without_commit event has
-- been recorded against it, and no observation has been committed from
-- it. The window is a guard rather than a rule — a Stage instance from
-- last month is not a session anybody is sitting in, and without it a
-- stale entry would leave this page offering to open a camera forever.
CREATE OR REPLACE FUNCTION public.t3a_d1_s2_my_open_session()
RETURNS TABLE (stage_instance_id uuid, stage_code text, opened_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT e.stage_instance_id, e.stage_code, e.created_at
  FROM public.t3a_stage_entry_event e
  JOIN public.t3a_observation_path_gateway g
    ON g.observation_path_gateway_id = e.observation_path_gateway_id
  WHERE g.participant_id = auth.uid()
    AND e.stage_code = 'S2'
    AND e.created_at > now() - interval '12 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.t3a_d1_s2_session_event se
      WHERE se.stage_instance_id = e.stage_instance_id
        AND se.event_kind = 'ended_without_commit'
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.t3a_observation_record orr
      WHERE orr.version_set ->> 'stage_entry_event_id' = e.stage_instance_id::text
        AND coalesce(orr.is_committed, false)
    )
  ORDER BY e.created_at DESC
  LIMIT 1;
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_s2_my_open_session() TO authenticated;
