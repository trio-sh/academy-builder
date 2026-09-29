-- =====================================================================
-- T3A-D1-EXEC-CLOSE-001 Section 2A — live sessions on Google Meet
--
-- E2 left the live-media provider open. It is Google Meet, hosted on
-- the3rdacademy.com accounts, in its own window beside the Cockpit. The
-- Cockpit is RETAINED and keeps every job that is not video: the verbatim
-- script, beat time-stamping, the B2 pause timer, determination capture,
-- administration variance and the session controls. CE-02 and CE-08 both
-- depend on a time-stamped beat, which is why the Cockpit cannot simply be
-- replaced by a video call.
--
-- WHY MEET'S VIDEO IS NOT FED INTO THE COCKPIT. The only route to Meet's
-- live media is the Meet Media API, which is in Developer Preview and
-- requires every participant in the call to be enrolled in that
-- programme. Real participants will not be. So the Cockpit cannot read the
-- video track, and every rule that depended on reading it is replaced by a
-- mentor attestation or a mentor-reported control — not by a guess.
--
-- THE CONSEQUENCE, STATED PLAINLY. Several of these controls rest on a
-- person's word rather than on something the platform can observe. That is
-- weaker than machine enforcement and it is the honest design given the
-- constraint: an attestation that is recorded, timed and attributable is
-- evidence, while a control that claims to detect what it cannot read is
-- a lie in the record. Where the Workspace configuration at CL-40 cannot
-- be applied, E3 rests on the attestation alone and the session record
-- says so — t3a_d1_live_session.e3_rests_on_attestation_alone.
--
-- ON THE INTEGRATION ITSELF, FOR THE RECORD. Creating a Meet space needs
-- the meetings.space.created scope, which Google classes as SENSITIVE, not
-- restricted. The restricted Drive scopes are needed only for recordings
-- and transcripts — which E3 forbids — so they are never requested. And
-- for an app used only inside a Workspace organization, Google does not
-- review sensitive or restricted scopes at all. So the compliance burden
-- that would normally make this hard is absent precisely because the
-- specification already forbids the thing that would have caused it.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. CL-48 — the consent notice version register
--
-- The consent record binds to a notice_version_id and its hash, but no
-- register of notice versions existed, so there was nowhere for CL-48's
-- flag to live and nothing for Stage entry to check. A free-text version
-- string cannot be asked whether it names Google Meet.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_consent_notice_version (
  notice_version_id     text PRIMARY KEY,
  notice_version_hash   text NOT NULL,
  names_google_meet     boolean NOT NULL DEFAULT false,
  states_no_recording   boolean NOT NULL DEFAULT false,
  approved_at           timestamptz,
  approved_by_as_signed text,
  recorded_at           timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_consent_notice_version IS
  'CL-48. Which notice version a consent binds to, and what it says. Stage 2 and Stage 4 real entry requires a version that NAMES Google Meet as the live-session channel and STATES that nothing is recorded or transcribed. Ships EMPTY: the wording is controlled content for counsel, not for the build, so until an approved version is loaded real Stage 2 and Stage 4 entry refuses — which it already does before activation.';

ALTER TABLE public.t3a_d1_consent_notice_version ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_consent_notice_version_read ON public.t3a_d1_consent_notice_version;
CREATE POLICY t3a_d1_consent_notice_version_read
  ON public.t3a_d1_consent_notice_version FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_consent_notice_version TO authenticated;

-- ---------------------------------------------------------------------
-- 2. CL-37 / CL-40 / CL-42 — the live session record
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_live_session (
  stage_entry_event_id  uuid PRIMARY KEY
    REFERENCES public.t3a_stage_entry_event(stage_entry_event_id) ON DELETE RESTRICT,
  channel               text NOT NULL DEFAULT 'google_meet'
                          CHECK (channel = 'google_meet'),
  host_account_email    text,
  meet_link             text,
  link_status           text NOT NULL DEFAULT 'not_issued'
                          CHECK (link_status IN ('not_issued', 'issued', 'participant_admitted')),
  link_released_at      timestamptz,
  visual_confirmation_recorded_at timestamptz,
  e3_rests_on_attestation_alone   boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_live_session IS
  'CL-37. What the Live Session panel shows, and the server''s copy of it. The Cockpit cannot see the Meet window, so everything here is either supplied by the mentor and attributed, or a status the platform itself controls (link release, visual confirmation).';

COMMENT ON COLUMN public.t3a_d1_live_session.e3_rests_on_attestation_alone IS
  'CL-40. True where the Workspace configuration — recording, transcripts, note-taking, meeting artifacts and Meet Media API access all off — could not be confirmed as applied. Then E3 rests on attestation A2 alone, and the session record says so rather than implying machine enforcement it does not have. Defaults to TRUE: the honest default is the weaker claim.';

-- A1. A meeting hosted anywhere else refuses. Enforced on the record, not
-- only in the attestation, so a session cannot carry an out-of-domain host
-- with an attestation ticked beside it.
CREATE OR REPLACE FUNCTION public.t3a_d1_live_session_host_domain()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.host_account_email IS NOT NULL
     AND lower(NEW.host_account_email) NOT LIKE '%@the3rdacademy.com' THEN
    RAISE EXCEPTION 'MEET_HOST_OUTSIDE_DOMAIN: % is not an @the3rdacademy.com account. A meeting hosted anywhere else refuses, because the Workspace controls that enforce E3 apply only to accounts in the organizational unit at CL-40.',
      NEW.host_account_email
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_live_session_host_domain_trg ON public.t3a_d1_live_session;
CREATE TRIGGER t3a_d1_live_session_host_domain_trg
  BEFORE INSERT OR UPDATE ON public.t3a_d1_live_session
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_live_session_host_domain();

ALTER TABLE public.t3a_d1_live_session ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_live_session_read ON public.t3a_d1_live_session;
CREATE POLICY t3a_d1_live_session_read ON public.t3a_d1_live_session FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_live_session TO authenticated;

-- ---------------------------------------------------------------------
-- 3. CL-41 — the session-start attestations
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_session_attestation (
  stage_entry_event_id uuid NOT NULL
    REFERENCES public.t3a_stage_entry_event(stage_entry_event_id) ON DELETE RESTRICT,
  attestation_code     text NOT NULL CHECK (attestation_code IN ('A1', 'A2', 'A3', 'A4')),
  attested_by          uuid NOT NULL,
  attested_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (stage_entry_event_id, attestation_code)
);

COMMENT ON TABLE public.t3a_d1_session_attestation IS
  'CL-41. A1 the Meet is hosted on an @the3rdacademy.com account in the CL-40 organizational unit; A2 recording, transcripts and note-taking are off; A3 both windows are visible; A4 (Stage 4 only) the facilitator will share only the material window. Each recorded with its actor and time, because an attestation nobody is named for is not an attestation.';

CREATE OR REPLACE FUNCTION public.t3a_d1_session_attestation_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'SESSION_ATTESTATION_APPEND_ONLY: % refused. A mentor''s attestation is a statement made at a time; it is not edited afterwards.', TG_OP
    USING ERRCODE = 'check_violation';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_session_attestation_append_only_trg ON public.t3a_d1_session_attestation;
CREATE TRIGGER t3a_d1_session_attestation_append_only_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_session_attestation
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_session_attestation_append_only();

ALTER TABLE public.t3a_d1_session_attestation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_session_attestation_read ON public.t3a_d1_session_attestation;
CREATE POLICY t3a_d1_session_attestation_read
  ON public.t3a_d1_session_attestation FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_session_attestation TO authenticated;

-- ---------------------------------------------------------------------
-- 4. CL-44 / CL-45 — interruptions and integrity incidents
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_live_session_event (
  live_session_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_entry_event_id  uuid NOT NULL
    REFERENCES public.t3a_stage_entry_event(stage_entry_event_id) ON DELETE RESTRICT,
  event_kind            text NOT NULL
    CHECK (event_kind IN ('video_interrupted', 'video_restored', 'recording_indicator_seen')),
  beat_code             text,
  reported_by           uuid NOT NULL,
  reported_at           timestamptz NOT NULL DEFAULT now(),
  -- REC-10 classification, so a failure of the platform or of
  -- administration never consumes a participant's attempt.
  rec10_classification  text
    CHECK (rec10_classification IN ('technical_or_platform_failure', 'source_or_mentor_administration_failure')),
  narrative             text
);

COMMENT ON TABLE public.t3a_d1_live_session_event IS
  'CL-44 and CL-45. This replaces the automatic detection in T3A-D1-EXEC-001 Section 3.3, which read the video track — something the Cockpit cannot do when the video is in Meet. A mentor reports; the platform records who and when. An interruption is a technical or platform failure under REC-10 and a recording indicator is a source or mentor administration failure: neither consumes an attempt and neither triggers a cooldown.';

ALTER TABLE public.t3a_d1_live_session_event ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_live_session_event_read ON public.t3a_d1_live_session_event;
CREATE POLICY t3a_d1_live_session_event_read
  ON public.t3a_d1_live_session_event FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_live_session_event TO authenticated;

-- ---------------------------------------------------------------------
-- 5. CL-41 / CL-48 — whether live capture is permitted at all
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_live_capture_permitted(
  p_stage_entry_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_stage    text;
  v_env      text;
  v_required text[];
  v_missing  text[];
  v_session  record;
  v_notice   boolean;
  v_open     boolean;
BEGIN
  SELECT e.stage_code::text, e.env_state_at_entry::text
    INTO v_stage, v_env
    FROM public.t3a_stage_entry_event e
   WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  IF v_stage IS NULL THEN
    RETURN jsonb_build_object('permitted', false, 'refusal', 'STAGE_ENTRY_NOT_FOUND');
  END IF;

  -- Only Stages 2 and 4 run live video. Everything else is unaffected.
  IF v_stage NOT IN ('S2', 'S4') THEN
    RETURN jsonb_build_object('permitted', true, 'live_video', false, 'stage_code', v_stage);
  END IF;

  -- CL-41. A1 to A3 always; A4 at Stage 4.
  v_required := CASE WHEN v_stage = 'S4'
                     THEN ARRAY['A1', 'A2', 'A3', 'A4']
                     ELSE ARRAY['A1', 'A2', 'A3'] END;

  SELECT array_agg(code ORDER BY code) INTO v_missing
    FROM unnest(v_required) AS code
   WHERE NOT EXISTS (
     SELECT 1 FROM public.t3a_d1_session_attestation a
      WHERE a.stage_entry_event_id = p_stage_entry_event_id
        AND a.attestation_code = code);

  SELECT * INTO v_session FROM public.t3a_d1_live_session
   WHERE stage_entry_event_id = p_stage_entry_event_id;

  -- CL-48. A real Stage entry needs an approved notice version that names
  -- Google Meet and states nothing is recorded. Demonstration runs are
  -- unaffected.
  IF v_env = 'design_only' THEN
    v_notice := true;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM public.t3a_d1_consent_notice_version n
       WHERE n.names_google_meet AND n.states_no_recording AND n.approved_at IS NOT NULL)
      INTO v_notice;
  END IF;

  -- CL-45. A recording indicator ends the session; capture does not resume.
  SELECT EXISTS (
    SELECT 1 FROM public.t3a_d1_live_session_event ev
     WHERE ev.stage_entry_event_id = p_stage_entry_event_id
       AND ev.event_kind = 'recording_indicator_seen')
    INTO v_open;

  IF v_open THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal', 'RECORDING_INDICATOR_SEEN',
      'remedy', 'The session was ended without commit and an integrity incident recorded. Under REC-10 this is a source or mentor administration failure: no attempt consumed, no cooldown.');
  END IF;

  IF NOT v_notice THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal', 'CONSENT_VERSION_DOES_NOT_NAME_GOOGLE_MEET',
      'remedy', 'Load an approved consent notice version that names Google Meet as the live-session channel and states that nothing is recorded or transcribed. The wording is for counsel, not for the build.');
  END IF;

  IF v_missing IS NOT NULL AND array_length(v_missing, 1) > 0 THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal', 'SESSION_ATTESTATION_MISSING',
      'missing', to_jsonb(v_missing),
      'stage_code', v_stage);
  END IF;

  IF v_session.host_account_email IS NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal', 'MEET_HOST_NOT_RECORDED');
  END IF;

  RETURN jsonb_build_object('permitted', true, 'live_video', true,
    'stage_code', v_stage,
    'channel', 'google_meet',
    'e3_rests_on_attestation_alone', v_session.e3_rests_on_attestation_alone);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_live_capture_permitted(uuid) IS
  'CL-41. Fail-closed: live capture at Stage 2 or Stage 4 is refused until every attestation is recorded, the host account is recorded and in-domain, an approved consent notice version names Google Meet, and no recording indicator has been reported. Proved by calling this route directly, never by observing that the interface hides a control.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_live_capture_permitted(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 6. CL-42 / CL-43 — the Meet link is released only after Stage entry
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_meet_link_release_permitted(
  p_stage_entry_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v_stage text;
  v_ok    jsonb;
BEGIN
  SELECT e.stage_code::text INTO v_stage
    FROM public.t3a_stage_entry_event e
   WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  IF v_stage IS NULL THEN
    RETURN jsonb_build_object('release', false, 'refusal', 'STAGE_ENTRY_NOT_FOUND');
  END IF;

  -- The link is never shown before Stage entry passes. A Stage entry event
  -- existing IS the evidence that identity and consent were checked — the
  -- route that writes it is the one that checks them — and at Stage 2 the
  -- Stage 1 confirmation gate in T3A-DEV-PLC-005-A Note 7 applies.
  v_ok := public.t3a_d1_live_capture_permitted(p_stage_entry_event_id);

  IF (v_ok ->> 'permitted') IS DISTINCT FROM 'true' THEN
    RETURN jsonb_build_object('release', false,
      'refusal', 'STAGE_ENTRY_NOT_PASSED',
      'underlying', v_ok);
  END IF;

  RETURN jsonb_build_object('release', true,
    'admit_from_waiting_room_only', true,
    'note', 'CL-43: participants are admitted by the host from the waiting room, never automatically. The REC-11 visual confirmation is recorded against the verified Academy identity, NOT against the Meet display name, which need not match.');
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_meet_link_release_permitted(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 7. CL-25 — the Stage 4 shared-session refusals, R1 to R6
--
-- Recorded as data as well as enforced, because each has a different
-- enforcement mechanism and three of them are NOT machine-enforceable
-- inside the platform. Writing down which is which is the point: a table
-- claiming six controls where three are attestations would overstate the
-- position exactly as the serving-readiness report did.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_stage4_refusal (
  refusal_code   text PRIMARY KEY,
  rule           text NOT NULL,
  enforced_by    text NOT NULL,
  enforcement_kind text NOT NULL
    CHECK (enforcement_kind IN ('database_guard', 'by_construction', 'workspace_configuration', 'mentor_attestation')),
  recorded_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_d1_stage4_refusal IS
  'CL-25. The six Stage 4 shared-session rules and, for each, HOW it is enforced. enforcement_kind is the honest part: only some are database guards. R1 rests on Workspace configuration plus a mentor attestation because the Cockpit cannot read Meet, and R3 and R4 hold by construction rather than by a control that could fail.';

ALTER TABLE public.t3a_d1_stage4_refusal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS t3a_d1_stage4_refusal_read ON public.t3a_d1_stage4_refusal;
CREATE POLICY t3a_d1_stage4_refusal_read ON public.t3a_d1_stage4_refusal FOR SELECT USING (true);
GRANT SELECT ON public.t3a_d1_stage4_refusal TO authenticated;

INSERT INTO public.t3a_d1_stage4_refusal (refusal_code, rule, enforced_by, enforcement_kind) VALUES
  ('R1', 'No recording at Stage 4.',
   'E3 plus Section 2A: the Workspace configuration at CL-40 (recording, automatic recording, '
   || 'transcripts, note-taking, meeting artifacts and Meet Media API access all off), attestation A2 '
   || 'at CL-41, and ending the session under CL-45 if an indicator appears. The RECORDING consent type '
   || 'is registered as UNAVAILABLE so no route may request it.',
   'workspace_configuration'),

  ('R2', 'Exactly one participant is observed per session; co-participants are never observed and no record is made about them.',
   'By construction: t3a_stage_entry_event names ONE participant_id, and the co-participant briefing '
   || 'table holds positions against the SOURCE, never against a person. There is no column in which a '
   || 'record about a co-participant could be written.',
   'by_construction'),

  ('R3', 'Shared session material is visible to every participant in the session.',
   'By construction plus CL-46: shared material is shown by the facilitator sharing a single window. '
   || 'Each co-participant''s own position is NOT shared material and is correctly visible to that '
   || 'co-participant alone — delivered in writing through the platform before the session, never '
   || 'through Meet chat.',
   'by_construction'),

  ('R4', 'One participant''s correction never alters another''s record.',
   'Holds by construction under R2: with one observed participant per session there is no other record '
   || 'for a correction to reach.',
   'by_construction'),

  ('R5', 'Withdrawal retains determinations immutably in historical and audit storage and excludes them from current composition, issuance and release.',
   'Database guard: the append-only triggers on the determination and approval records refuse deletion, '
   || 'and withdrawal is recorded as a later row rather than an erasure.',
   'database_guard'),

  ('R6', 'Accommodation is settled before group composition, never during the session.',
   'Database guard plus attestation: an accommodation change after the group is composed refuses and '
   || 'logs.',
   'database_guard')
ON CONFLICT (refusal_code) DO UPDATE SET
  rule = EXCLUDED.rule, enforced_by = EXCLUDED.enforced_by,
  enforcement_kind = EXCLUDED.enforcement_kind;
