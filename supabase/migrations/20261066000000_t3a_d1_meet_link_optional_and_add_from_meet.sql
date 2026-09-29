-- =====================================================================
-- The Meet link is optional, because the participant is added from
-- inside Meet — and that moves CL-42/CL-43 from a gate to a procedure
--
-- WHAT I GOT WRONG. I built t3a_d1_live_session_begin to require a link
-- AND a host, and described the flow as "manual creation". Neither was
-- right. meet.new CREATES AND STARTS the meeting in one action, and the
-- participant is then added from Meet's own control inside the meeting.
-- The account holder corrected this and the correction is load-bearing,
-- not cosmetic.
--
-- WHAT THE PLATFORM ACTUALLY NEEDS, MEASURED RATHER THAN ASSUMED.
-- t3a_d1_live_capture_permitted requires host_account_email and does NOT
-- look at meet_link at all. Proved in an aborted transaction: with the
-- host recorded, the three attestations made and NO LINK WHATSOEVER,
-- capture returns permitted=true. So the link was never a precondition
-- for anything — I had invented a requirement and then enforced it.
--
-- The host is different and stays required. The Workspace controls that
-- enforce E3 apply only to accounts in the CL-40 organizational unit, so
-- which account hosted is the fact the whole E3 chain hangs from. A link
-- is just a URL.
--
-- SO: the link becomes optional. If one is given it must still be a
-- Google Meet address, because the record says the channel is Meet.
--
-- THE CONSEQUENCE OF ADDING FROM INSIDE MEET, WHICH IS THE REAL POINT OF
-- THIS MIGRATION.
--
-- CL-42 and CL-43 put the Meet link behind Stage entry:
-- t3a_d1_meet_link_release_permitted refuses to release it until
-- t3a_d1_live_capture_permitted passes, because a Stage entry event
-- existing IS the evidence that identity and consent were checked.
--
-- When the mentor clicks Add inside Meet, GOOGLE sends the invitation
-- immediately. The platform is not in that path and cannot be. So the
-- release gate still answers correctly when asked, and nothing asks it.
-- A mentor who adds the participant before Stage entry has passed has
-- given them the meeting, and no database guard can prevent it.
--
-- This is NOT a reason to go back to a platform-issued link: that would
-- reintroduce the Calendar API and the whole integration surface to
-- protect a URL. It IS a reason to write down that one more control has
-- moved from machine-enforced to procedural, next to A1 and E3, so the
-- three are read together rather than discovered one at a time.
--
-- The count now stands at three for a live session: E3 rests on
-- attestation (CL-40), the host account is stated rather than verified
-- (meet.new), and the moment of admission is the mentor's discipline
-- rather than a gate (this). Each is defensible. Together they mean a
-- live session is governed mostly by a trained person, and the record
-- should say so plainly rather than implying otherwise.
-- =====================================================================

set search_path = public;

CREATE OR REPLACE FUNCTION public.t3a_d1_live_session_begin(
  p_stage_entry_event_id uuid,
  p_meet_link            text,
  p_host_account_email   text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_link  text := nullif(btrim(coalesce(p_meet_link, '')), '');
  v_host  text := lower(btrim(coalesce(p_host_account_email, '')));
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NO_MENTOR_IDENTIFIED');
  END IF;

  IF NOT public.t3a_d1_is_assigned_mentor(p_stage_entry_event_id) THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NOT_ASSIGNED_MENTOR');
  END IF;

  -- The host is the fact E3 hangs from. The link is not.
  IF v_host = '' THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'HOST_ACCOUNT_REQUIRED',
      'remedy', 'Name the account the meeting was started under. The controls that keep recording, transcripts and note-taking off apply only to accounts in the CL-40 organizational unit, so this is the one thing that must be recorded.');
  END IF;

  IF v_host NOT LIKE '%@the3rdacademy.com' THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'MEET_HOST_OUTSIDE_DOMAIN',
      'remedy', 'Start the meeting while signed in to your @the3rdacademy.com account. A meeting hosted anywhere else is not covered by the Workspace controls that keep recording and transcripts off.');
  END IF;

  -- Optional now. If given, it must be what it claims to be.
  IF v_link IS NOT NULL AND v_link !~* '^https://meet\.google\.com/[a-z0-9-]+' THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'NOT_A_GOOGLE_MEET_LINK',
      'remedy', 'Leave this empty if you added the participant from inside Meet. If you do paste a link it must be the https://meet.google.com/... address, because the record says the channel is Google Meet.');
  END IF;

  INSERT INTO public.t3a_d1_live_session
    (stage_entry_event_id, host_account_email, meet_link, link_status, link_released_at)
  VALUES (p_stage_entry_event_id, v_host, v_link,
          CASE WHEN v_link IS NULL THEN 'not_issued' ELSE 'issued' END,
          CASE WHEN v_link IS NULL THEN NULL ELSE now() END)
  ON CONFLICT (stage_entry_event_id) DO UPDATE
    SET host_account_email = EXCLUDED.host_account_email,
        meet_link          = coalesce(EXCLUDED.meet_link, public.t3a_d1_live_session.meet_link),
        link_status        = CASE
                               WHEN EXCLUDED.meet_link IS NOT NULL THEN 'issued'
                               ELSE public.t3a_d1_live_session.link_status END,
        link_released_at   = CASE
                               WHEN EXCLUDED.meet_link IS NOT NULL THEN now()
                               ELSE public.t3a_d1_live_session.link_released_at END;

  RETURN jsonb_build_object('ok', true,
    'host_account_email', v_host,
    'link_recorded', v_link IS NOT NULL,
    'host_is_attested_not_verified', true,
    'admission_is_procedural', v_link IS NULL,
    'note', CASE WHEN v_link IS NULL
      THEN 'Recorded. You are adding the participant from inside Meet, so the platform is not in that path: do not add them before Stage entry has passed, because nothing here can stop it.'
      ELSE 'Recorded. The platform cannot see which account meet.new hosted under, so A1 rests on your statement.' END);
END;
$fn$;

COMMENT ON FUNCTION public.t3a_d1_live_session_begin(uuid, text, text) IS
  'Records the account the meeting was started under, and optionally the link. The LINK IS OPTIONAL because t3a_d1_live_capture_permitted never looked at it — proved: host recorded, attestations made, no link, capture permitted. The HOST is required because the Workspace controls enforcing E3 apply only to accounts in the CL-40 organizational unit. Where the participant is added from inside Meet, admission happens outside the platform and CL-42/CL-43 become procedural rather than gated; admission_is_procedural says so in the reply.';

GRANT EXECUTE ON FUNCTION public.t3a_d1_live_session_begin(uuid, text, text) TO authenticated;

-- ---------------------------------------------------------------------
-- The three procedural controls, recorded together
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_d1_build_conflict_register
  (entry_id, opened_by, scope, classification, status, blocked_on, note)
VALUES
  ('SECTION-2A/three-procedural-controls', 'meet.new correction',
   'What a live session actually rests on',
   'accepted position — recorded so the three are read together',
   'open',
   'Nothing. This is the position, written down rather than discovered one control at a time.',
   'A D1 live session now rests on THREE controls that are procedural rather than machine-enforced, '
   || 'and they are listed together because each was accepted separately and the total is what matters. '
   || '(1) E3 — nothing recorded or transcribed — rests on attestation A2: the Cockpit cannot read the '
   || 'Meet window, and e3_rests_on_attestation_alone defaults TRUE. '
   || '(2) A1 — the meeting is hosted in the CL-40 organizational unit — is the mentor''s statement: '
   || 'meet.new starts the meeting in the mentor''s own browser and the platform cannot observe which '
   || 'account hosted. The domain of what it is TOLD is checked; the truth of it is not. '
   || '(3) ADMISSION — CL-42 and CL-43 put the link behind Stage entry, but when the participant is '
   || 'added from Meet''s own control inside the meeting, Google sends the invitation and the platform '
   || 'is not in that path. t3a_d1_meet_link_release_permitted still answers correctly when asked, and '
   || 'nothing asks it. A mentor who adds the participant before Stage entry has passed has given them '
   || 'the meeting, and no database guard can prevent that. '
   || 'NONE OF THE THREE IS A REASON TO REBUILD THE INTEGRATION. Restoring a platform-issued link would '
   || 'bring back the Calendar API, the OAuth application and the verification review in order to '
   || 'protect a URL. The right response is mentor training and this register entry, not code. '
   || 'What would be wrong is a reader concluding from a green live-capture gate that the platform '
   || 'enforces any of the three. It enforces that the host is recorded and in-domain, that the '
   || 'attestations exist and name their maker, and that an approved consent notice names Google Meet. '
   || 'Everything else in a live session is a trained person doing what they said they would.')
ON CONFLICT (entry_id) DO UPDATE SET
  status = EXCLUDED.status, blocked_on = EXCLUDED.blocked_on, note = EXCLUDED.note;
