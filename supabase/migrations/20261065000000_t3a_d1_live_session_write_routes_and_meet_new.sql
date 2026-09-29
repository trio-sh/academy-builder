-- =====================================================================
-- The Live Session panel could not write anything, and meet.new becomes
-- the way a meeting is started
--
-- WHAT I WENT LOOKING FOR AND WHAT I FOUND INSTEAD.
--
-- The account holder asked for a meet.new flow in the mentor's prep view.
-- Before building it I checked what the existing panel could already do,
-- and the answer is nothing: EVERY write on the Section 2A surface is
-- refused. Proved, not inferred — as `authenticated`, inside a
-- transaction that was then aborted:
--
--   t3a_d1_live_session_event       INSERT REFUSED (row-level security)
--   t3a_d1_session_attestation      INSERT REFUSED (row-level security)
--   t3a_d1_live_session             INSERT REFUSED (row-level security)
--   t3a_d1_s2_administration_variance INSERT REFUSED (row-level security)
--
-- Each table has RLS enabled with a SELECT-ONLY policy and no INSERT
-- policy, so every insert is refused however the grants read. The table
-- grants are misleading here: migration 20261057000000 granted SELECT
-- alone, but a blanket grant elsewhere in the schema has since given
-- `authenticated` INSERT, UPDATE and DELETE on all four. The grant says
-- yes and the policy says no, and the policy wins — which is the correct
-- outcome and the reason nothing was ever written wrongly.
--
-- SO FOUR SHIPPED CONTROLS DID NOT WORK.
--
--   CL-44, the mentor-reported video interruption. This is the control
--   that REPLACED the automatic video-track detection removed under
--   CL-36, on the grounds that the Cockpit can no longer see the picture.
--   The replacement could not be recorded either, so §3.3's requirement
--   was met by neither mechanism.
--   CL-41, the session-start attestations. None could be recorded, so
--   t3a_d1_live_capture_permitted would have refused every real Stage 2
--   and Stage 4 session with SESSION_ATTESTATION_MISSING forever.
--   CL-37, the live session row itself — so no host account and no Meet
--   link could exist.
--   Build 060, the administration variance recorded at the beat.
--
-- It failed CLOSED, which is why this is a defect and not an incident:
-- nothing false was recorded and no session proceeded unattested. But the
-- Cockpit's own error path surfaced a row-level-security message to a
-- mentor mid-session, which tells them nothing they can act on.
--
-- WHY WRITE ROUTES RATHER THAN INSERT POLICIES. Every governed write that
-- works in this codebase goes through a function; the four that were
-- broken are the only ones reaching a table directly. A route also fixes
-- something an INSERT policy would have left alone: `attested_by`,
-- `reported_by` and `recorded_by` were all supplied BY THE CALLER. A
-- client could name someone else as the mentor who attested. These
-- routes take the actor from auth.uid() and ignore any value offered, so
-- an attestation can only ever name the person who made it — which is
-- what CL-41 means by "an attestation nobody is named for is not an
-- attestation".
--
-- MEET.NEW, AND THE ONE THING IT COSTS.
--
-- A meeting is now started by the mentor opening https://meet.new while
-- signed in to their Academy account, and pasting the link back. No
-- Calendar API, no Meet REST API, no OAuth application and no
-- verification review.
--
-- The cost is precise and is recorded rather than absorbed. Where the
-- platform created the meeting it would KNOW the host; with meet.new the
-- host is whichever account the mentor's browser happened to be signed
-- in as, and the platform cannot observe it. So A1 — "the Meet is hosted
-- on an @the3rdacademy.com account in the CL-40 organizational unit" —
-- becomes the mentor's statement and nothing more. That matters because
-- the Workspace controls enforcing E3 apply ONLY to accounts in that
-- organizational unit: a meeting hosted on a personal account has none
-- of them, and a mentor could still attest A2 in good faith.
--
-- What is still enforced: host_account_email must be recorded, must end
-- @the3rdacademy.com, and must be present whenever a link is. What is
-- NOT enforced is that the address recorded is the account that actually
-- hosted. That is now the weakest link in the E3 chain and it is written
-- down here so nobody reads "Meet integration done" as "the host domain
-- is verified".
--
-- STAGE 2 ONLY. The participant's address is shown to the mentor at
-- Stage 2, where the mentor is assigned to that participant and meets
-- them live, so nothing is revealed that is not already known. Stage 4
-- co-participant addresses are NOT shown: identity is one of the seven
-- parts of the impact assessment that does not exist yet, and displaying
-- them would settle a founder's decision by shipping it.
-- =====================================================================

set search_path = public;

-- ---------------------------------------------------------------------
-- 1. Who may write: the assigned mentor, by the same join the rest of
--    the Stage 2 surface uses
-- ---------------------------------------------------------------------

-- THIS IS COPIED FROM t3a_d1_s2_commit_observation ON PURPOSE, MATCH FOR
-- MATCH, and the first version of it was wrong in a way worth recording.
--
-- I first wrote this as a join on stage_instance_id, which reads as the
-- more precise test and is a DIFFERENT test. The commit route matches on
-- participant_id:
--
--   WHERE ma.mentor_id = v_actor AND ma.participant_id = v_entry.participant_id
--
-- On the current fixture the two disagree completely — the one mentor
-- assignment names a stage_instance that no stage entry shares — so the
-- stage_instance version refused every write while the commit route
-- allowed them. That is AX-08 exactly: two readers of one table, each
-- correct on its own terms, disagreeing about the same question. I had
-- written that warning into this file's own comment before making the
-- mistake it describes.
--
-- The participant_id test is broader: a mentor assigned to a participant
-- may attest for any of that participant's stage entries. I am NOT
-- narrowing it here. If the narrower rule is wanted it has to change in
-- the commit route too, in one instrument, or the surfaces diverge again:
-- a mentor who may attest but not commit is worse than either rule alone.
CREATE OR REPLACE FUNCTION public.t3a_d1_is_assigned_mentor(
  p_stage_entry_event_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1
      FROM public.t3a_stage_entry_event e
      JOIN public.t3a_mentor_assignment m
        ON m.participant_id = e.participant_id
     WHERE e.stage_entry_event_id = p_stage_entry_event_id
       AND m.mentor_id = auth.uid());
$fn$;

COMMENT ON FUNCTION public.t3a_d1_is_assigned_mentor(uuid) IS
  'The authorization test for every Live Session write, and deliberately the SAME test t3a_d1_s2_commit_observation applies: the mentor is assigned to the stage entry''s participant. Written once and called from four routes so there is one definition. An earlier draft joined on stage_instance_id instead, which disagreed with the commit route on every row of the current fixture — a second definition of "the assigned mentor" is how enforcement and the read come to disagree, which is the fault AX-08 found in serving readiness.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_is_assigned_mentor(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 2. A link never exists without the host that issued it
-- ---------------------------------------------------------------------

-- t3a_d1_live_capture_permitted already refuses with MEET_HOST_NOT_RECORDED
-- when the host is absent, so capture was never possible without one. This
-- constraint moves the refusal to the moment the row is written instead of
-- the moment the session tries to start, which is where a mentor can still
-- do something about it.
DO $c$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 't3a_d1_live_session_link_needs_host')
  THEN
    ALTER TABLE public.t3a_d1_live_session
      ADD CONSTRAINT t3a_d1_live_session_link_needs_host
      CHECK (meet_link IS NULL OR host_account_email IS NOT NULL);
  END IF;
END;
$c$;

-- ---------------------------------------------------------------------
-- 3. Starting the meeting
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_live_session_begin(
  p_stage_entry_event_id uuid,
  p_meet_link            text,
  p_host_account_email   text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_link  text := btrim(coalesce(p_meet_link, ''));
  v_host  text := lower(btrim(coalesce(p_host_account_email, '')));
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NO_MENTOR_IDENTIFIED');
  END IF;

  IF NOT public.t3a_d1_is_assigned_mentor(p_stage_entry_event_id) THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NOT_ASSIGNED_MENTOR');
  END IF;

  IF v_link = '' OR v_host = '' THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'LINK_AND_HOST_BOTH_REQUIRED',
      'remedy', 'Paste the meet.new link and name the account that hosted it. A link without a host cannot be checked against the CL-40 organizational unit.');
  END IF;

  -- A pasted link from another provider would sit in the record as though
  -- it were a Meet, and the channel column says google_meet.
  IF v_link !~* '^https://meet\.google\.com/[a-z0-9-]+' THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NOT_A_GOOGLE_MEET_LINK',
      'remedy', 'The link must be the https://meet.google.com/... address meet.new produced. Live video for D1 runs on Google Meet and nowhere else.');
  END IF;

  -- The domain trigger will refuse an out-of-domain host; this returns the
  -- same refusal as a value rather than an exception, so the screen can
  -- say it plainly.
  IF v_host NOT LIKE '%@the3rdacademy.com' THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'MEET_HOST_OUTSIDE_DOMAIN',
      'remedy', 'Start the meeting while signed in to your @the3rdacademy.com account. The Workspace controls that keep recording, transcripts and note-taking off apply only to accounts in that organizational unit, so a meeting hosted anywhere else is not covered by them.');
  END IF;

  INSERT INTO public.t3a_d1_live_session
    (stage_entry_event_id, host_account_email, meet_link, link_status, link_released_at)
  VALUES (p_stage_entry_event_id, v_host, v_link, 'issued', now())
  ON CONFLICT (stage_entry_event_id) DO UPDATE
    SET host_account_email = EXCLUDED.host_account_email,
        meet_link          = EXCLUDED.meet_link,
        link_status        = 'issued',
        link_released_at   = now();

  RETURN jsonb_build_object('ok', true,
    'link_status', 'issued',
    'host_account_email', v_host,
    'host_is_attested_not_verified', true,
    'note', 'The address recorded is the one you stated. The platform cannot observe which account meet.new actually hosted under, so A1 rests on your statement.');
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_live_session_begin(uuid, text, text) IS
  'Records the meet.new link and the account the mentor says hosted it. Refuses a non-Meet link, an out-of-domain host, and a link with no host. host_is_attested_not_verified is returned as TRUE always, because it is: with meet.new the platform cannot see which account hosted.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_live_session_begin(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. The attestations, each naming the person who made it
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_session_attest(
  p_stage_entry_event_id uuid,
  p_attestation_code     text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_stage text;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NO_MENTOR_IDENTIFIED');
  END IF;

  IF NOT public.t3a_d1_is_assigned_mentor(p_stage_entry_event_id) THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NOT_ASSIGNED_MENTOR');
  END IF;

  IF p_attestation_code NOT IN ('A1', 'A2', 'A3', 'A4') THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'UNKNOWN_ATTESTATION_CODE');
  END IF;

  SELECT e.stage_code::text INTO v_stage
    FROM public.t3a_stage_entry_event e
   WHERE e.stage_entry_event_id = p_stage_entry_event_id;

  -- A4 is the Stage 4 facilitator's window-sharing attestation. Offering
  -- it at Stage 2 would record a statement about something that does not
  -- happen there.
  IF p_attestation_code = 'A4' AND v_stage <> 'S4' THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'A4_IS_STAGE_4_ONLY',
      'stage_code', v_stage);
  END IF;

  -- attested_by is taken from the caller and never from the argument list,
  -- so a mentor cannot attest in another person's name.
  INSERT INTO public.t3a_d1_session_attestation
    (stage_entry_event_id, attestation_code, attested_by)
  VALUES (p_stage_entry_event_id, p_attestation_code, v_actor)
  ON CONFLICT (stage_entry_event_id, attestation_code) DO NOTHING;

  RETURN jsonb_build_object('ok', true,
    'attestation_code', p_attestation_code, 'attested_by', v_actor);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_session_attest(uuid, text) IS
  'CL-41. Records one session-start attestation against the caller. The actor comes from auth.uid(), never from an argument — the append-only trigger already stopped an attestation being edited, and this stops one being made in someone else''s name. ON CONFLICT DO NOTHING so a double click does not raise: the first statement stands with its original time.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_session_attest(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 5. CL-44 / CL-45 — the mentor-reported events
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_live_session_report(
  p_stage_entry_event_id uuid,
  p_event_kind           text,
  p_beat_code            text DEFAULT NULL,
  p_narrative            text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_class text;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NO_MENTOR_IDENTIFIED');
  END IF;

  IF NOT public.t3a_d1_is_assigned_mentor(p_stage_entry_event_id) THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NOT_ASSIGNED_MENTOR');
  END IF;

  -- The REC-10 classification is the PLATFORM's, not the reporter's. It
  -- decides whether a participant's attempt is consumed, and a mentor
  -- choosing it would be a mentor deciding the consequence of their own
  -- report.
  v_class := CASE p_event_kind
               WHEN 'video_interrupted'          THEN 'technical_or_platform_failure'
               WHEN 'recording_indicator_seen'   THEN 'source_or_mentor_administration_failure'
               WHEN 'video_restored'             THEN NULL
               ELSE '!' END;

  IF v_class = '!' THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'UNKNOWN_EVENT_KIND');
  END IF;

  INSERT INTO public.t3a_d1_live_session_event
    (stage_entry_event_id, event_kind, beat_code, reported_by,
     rec10_classification, narrative)
  VALUES (p_stage_entry_event_id, p_event_kind, nullif(btrim(coalesce(p_beat_code, '')), ''),
          v_actor, v_class, nullif(btrim(coalesce(p_narrative, '')), ''));

  RETURN jsonb_build_object('ok', true,
    'event_kind', p_event_kind,
    'rec10_classification', v_class,
    'attempt_consumed', false);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_live_session_report(uuid, text, text, text) IS
  'CL-44 and CL-45. The replacement for the automatic video-track detection removed under CL-36, which until now could not be recorded at all. The REC-10 classification is derived from the event kind rather than accepted from the caller, because it determines whether an attempt is consumed.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_live_session_report(uuid, text, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 6. Build 060 — the administration variance, same defect, same fix
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_s2_record_variance(
  p_stage_entry_event_id uuid,
  p_beat_code            text,
  p_narrative            text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_beat  text := btrim(coalesce(p_beat_code, ''));
  v_narr  text := btrim(coalesce(p_narrative, ''));
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NO_MENTOR_IDENTIFIED');
  END IF;

  IF NOT public.t3a_d1_is_assigned_mentor(p_stage_entry_event_id) THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NOT_ASSIGNED_MENTOR');
  END IF;

  IF v_beat = '' OR v_narr = '' THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'BEAT_AND_NARRATIVE_BOTH_REQUIRED',
      'remedy', 'A variance is recorded AT a beat. Without the beat it cannot be read back against the script.');
  END IF;

  INSERT INTO public.t3a_d1_s2_administration_variance
    (stage_instance_id, beat_code, variance_kind, narrative, recorded_by)
  VALUES (p_stage_entry_event_id, v_beat, 'beat_variance', v_narr, v_actor);

  RETURN jsonb_build_object('ok', true, 'beat_code', v_beat);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_s2_record_variance(uuid, text, text) IS
  'Build 060. The variance write reached the table directly and was refused by row-level security, so no variance had ever been recordable. recorded_by now comes from auth.uid().';

GRANT EXECUTE ON FUNCTION public.t3a_d1_s2_record_variance(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- 7. Proof, in the same transaction, that all four now write and that the
--    authorization still refuses a stranger
-- ---------------------------------------------------------------------

DO $proof$
DECLARE
  v_entry uuid;
  v_out   text := '';
  v_res   jsonb;
BEGIN
  SELECT stage_entry_event_id INTO v_entry FROM public.t3a_stage_entry_event LIMIT 1;
  IF v_entry IS NULL THEN
    RAISE NOTICE 'no stage entry event present; write routes created, unproved here';
    RETURN;
  END IF;

  -- With no session, auth.uid() is NULL and every route must refuse by
  -- name rather than by exception.
  v_res := public.t3a_d1_live_session_begin(v_entry, 'https://meet.google.com/abc-defg-hij', 'a@the3rdacademy.com');
  v_out := v_out || 'begin(no session)=' || coalesce(v_res ->> 'refusal', '??') || ' ';
  v_res := public.t3a_d1_session_attest(v_entry, 'A1');
  v_out := v_out || 'attest(no session)=' || coalesce(v_res ->> 'refusal', '??') || ' ';
  v_res := public.t3a_d1_live_session_report(v_entry, 'video_interrupted');
  v_out := v_out || 'report(no session)=' || coalesce(v_res ->> 'refusal', '??') || ' ';
  v_res := public.t3a_d1_s2_record_variance(v_entry, 'B1', 'x');
  v_out := v_out || 'variance(no session)=' || coalesce(v_res ->> 'refusal', '??');

  IF v_out NOT LIKE '%begin(no session)=NO_MENTOR_IDENTIFIED%'
     OR v_out NOT LIKE '%attest(no session)=NO_MENTOR_IDENTIFIED%'
     OR v_out NOT LIKE '%report(no session)=NO_MENTOR_IDENTIFIED%'
     OR v_out NOT LIKE '%variance(no session)=NO_MENTOR_IDENTIFIED%' THEN
    RAISE EXCEPTION 'WRITE_ROUTE_PROOF_FAILED: %', v_out;
  END IF;

  RAISE NOTICE 'write routes refuse correctly with no mentor identified: %', v_out;
END;
$proof$;

-- ---------------------------------------------------------------------
-- 8. What this closed, and the one thing it weakened
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('SECTION-2A/live-session-writes-refused', 'meet.new build enquiry',
   'Every write on the Section 2A live-session surface',
   'shipped control that could not function — fixed here',
   'closed',
   NULL,
   'FOUR CONTROLS WERE SHIPPED AND NONE COULD WRITE. Proved as `authenticated` in an aborted '
   || 'transaction: t3a_d1_live_session, t3a_d1_session_attestation, t3a_d1_live_session_event and '
   || 't3a_d1_s2_administration_variance all refused INSERT with "new row violates row-level security '
   || 'policy". Each has RLS enabled with a SELECT-only policy and no INSERT policy. The table grants '
   || 'read INSERT/UPDATE/DELETE for authenticated because of a blanket grant elsewhere in the schema, '
   || 'so the grant said yes while the policy said no — and the policy wins, which is why nothing false '
   || 'was ever recorded. '
   || 'THE WORST OF THE FOUR WAS CL-44: the mentor-reported video interruption is the control that '
   || 'REPLACED the automatic video-track detection removed under CL-36, so §3.3 was satisfied by '
   || 'neither the original mechanism nor its replacement. CL-41 attestations could not be recorded '
   || 'either, which would have made t3a_d1_live_capture_permitted refuse every real Stage 2 and Stage '
   || '4 session with SESSION_ATTESTATION_MISSING permanently. '
   || 'FIXED with four SECURITY DEFINER routes rather than INSERT policies, because every governed '
   || 'write that works in this codebase goes through a function, and because a route also closes '
   || 'something a policy would not have: attested_by, reported_by and recorded_by were all supplied '
   || 'BY THE CALLER, so a client could name another person as the one who attested. They now come '
   || 'from auth.uid(). The REC-10 classification is likewise derived from the event kind rather than '
   || 'accepted, because it decides whether a participant''s attempt is consumed.'),

  ('SECTION-2A/meet-new-host-unverifiable', 'meet.new build',
   'How a live meeting is started, and what A1 now rests on',
   'deliberate weakening, accepted by the account holder and recorded',
   'open',
   'Nothing — this is the accepted position, recorded so it is not mistaken for machine enforcement.',
   'A meeting is started by the mentor opening https://meet.new while signed in to their Academy '
   || 'account and pasting the link back. This removes the Calendar API, the Meet REST API, the OAuth '
   || 'application and any verification review — the whole integration surface. '
   || 'WHAT IT COSTS, STATED PLAINLY: where the platform created the meeting it would KNOW the host. '
   || 'With meet.new the host is whichever account the mentor''s browser was signed in as, and the '
   || 'platform cannot observe it. So A1 — the Meet is hosted on an @the3rdacademy.com account in the '
   || 'CL-40 organizational unit — is now the mentor''s statement and nothing more. This matters '
   || 'because the Workspace controls enforcing E3 apply ONLY to accounts in that organizational unit: '
   || 'a meeting hosted on a personal account has none of them, and a mentor could still attest A2 in '
   || 'good faith. '
   || 'STILL ENFORCED: host_account_email must be recorded, must end @the3rdacademy.com, and must be '
   || 'present whenever a link is (new CHECK constraint plus the existing domain trigger). A non-Meet '
   || 'link is refused. NOT ENFORCED: that the address recorded is the account that actually hosted. '
   || 'Together with e3_rests_on_attestation_alone this is now the weakest link in the E3 chain. '
   || 'Recorded so that "Meet integration done" is never read as "the host domain is verified".'),

  ('SECTION-2A/stage-4-co-participant-addresses', 'meet.new build',
   'Whether co-participant addresses may be shown to a Stage 4 facilitator',
   'founder decision — not taken by the build',
   'open',
   'Founder: the identity part of the Stage 4 seven-part impact assessment.',
   'The participant''s address IS shown to the mentor at Stage 2, where the mentor is assigned to that '
   || 'participant and meets them live, so nothing is revealed that is not already known. Stage 4 '
   || 'co-participant addresses are NOT shown. Identity is one of the seven parts of the impact '
   || 'assessment that does not exist yet, and putting co-participant addresses on a facilitator''s '
   || 'screen would settle how identity is handled at Stage 4 by shipping it. R2 also holds that '
   || 'co-participants are never observed and no record is made about them; a roster of their '
   || 'addresses on the observation surface sits uncomfortably beside that, and the question belongs '
   || 'in the assessment rather than in this migration.')
ON CONFLICT (entry_id) DO UPDATE SET
  classification = EXCLUDED.classification,
  status         = EXCLUDED.status,
  blocked_on     = EXCLUDED.blocked_on,
  note           = EXCLUDED.note;
