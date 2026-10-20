-- Rollback of 20261201000000_step0_release_model.sql (Step 0). Restores the three functions to their pre-change bodies and removes what Step 0 added.
drop trigger if exists t3a_9_pool_follow_consent_trg on public.t3a_consent_record;
drop trigger if exists t3a_9_pool_follow_report_trg on public.t3a_d1_ber_report;
drop trigger if exists t3a_3_named_route_closed_trg on public.t3a_d1_release_token;
drop trigger if exists t3a_3_named_route_closed_trg on public.t3a_disclosure;
drop trigger if exists t3a_3_named_route_closed_trg on public.t3a_report_release;
drop function if exists public.t3a_pool_follow_consent();
drop function if exists public.t3a_pool_follow_report();
drop function if exists public.t3a_named_route_closed();
drop function if exists public.t3a_pool_state(uuid);
drop function if exists public.t3a_pool_withdraw(uuid);
drop function if exists public.t3a_pool_make_available(uuid, text, text, text, text, boolean);
drop index if exists public.t3a_report_release_one_pool_uq;
drop index if exists public.t3a_employer_pool_entry_report_uq;
drop index if exists public.t3a_employer_pool_entry_participant_idx;
-- Only valid while the pool table is empty or holds one entry per participant:
alter table public.t3a_employer_pool_entry add constraint t3a_employer_pool_entry_participant_id_key unique (participant_id);
grant insert, update, delete on public.t3a_employer_pool_entry to authenticated;
CREATE OR REPLACE FUNCTION public.t3a_d1_issue_release_token(p_ber_report_id uuid, p_recipient_name text, p_recipient_org text, p_recipient_address text, p_expires_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor   uuid := auth.uid();
  r         public.t3a_d1_ber_report;
  v_consent uuid;
  v_token   text;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('issued', false,
      'refusal_code', 'NO_PARTICIPANT_IDENTIFIED');
  END IF;

  SELECT * INTO r FROM public.t3a_d1_ber_report
   WHERE ber_report_id = p_ber_report_id;

  IF r.ber_report_id IS NULL THEN
    RETURN jsonb_build_object('issued', false,
      'refusal_code', 'BER_REPORT_NOT_FOUND');
  END IF;

  -- Only the participant releases their own report. Nobody releases it
  -- for them, including anyone with administrative standing.
  IF r.participant_id <> v_actor THEN
    RETURN jsonb_build_object('issued', false,
      'refusal_code', 'ONLY_THE_PARTICIPANT_RELEASES_THEIR_REPORT');
  END IF;

  IF r.issued_at IS NULL THEN
    RETURN jsonb_build_object('issued', false,
      'refusal_code', 'REPORT_NOT_ISSUED');
  END IF;

  IF coalesce(btrim(p_recipient_name), '') = ''
     OR coalesce(btrim(p_recipient_address), '') = '' THEN
    RETURN jsonb_build_object('issued', false,
      'refusal_code', 'RECIPIENT_MUST_BE_NAMED_AND_ADDRESSED');
  END IF;

  IF p_expires_at IS NULL OR p_expires_at <= now() THEN
    RETURN jsonb_build_object('issued', false,
      'refusal_code', 'RELEASE_MUST_EXPIRE_IN_THE_FUTURE');
  END IF;

  -- Its own consent, per release.
  INSERT INTO public.t3a_d1_consent
    (participant_id, consent_type, state, granted_at, capture_channel, capture_actor)
  VALUES (v_actor, 'DISCLOSURE', 'GRANTED', now(), 'participant_surface', v_actor)
  RETURNING consent_id INTO v_consent;

  -- The token is returned once and stored only as a hash, so the link
  -- cannot be recovered from the record by anyone, including us.
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.t3a_d1_release_token
    (consent_id, ber_report_id, report_version, recipient_name,
     recipient_org, recipient_address, token_hash, expires_at)
  VALUES (v_consent, p_ber_report_id, coalesce(r.version_set ->> 'label', 'v1'),
          btrim(p_recipient_name), nullif(btrim(coalesce(p_recipient_org, '')), ''),
          btrim(p_recipient_address),
          encode(extensions.digest(v_token, 'sha256'), 'hex'),
          p_expires_at);

  RETURN jsonb_build_object('issued', true,
    'token', v_token,
    'recipient_address', btrim(p_recipient_address),
    'expires_at', p_expires_at,
    'note', 'This link is shown once. It is stored only as a hash, so it cannot be recovered afterwards.');
END;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_d1_redeem_release_token(p_token text, p_verified_address text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t public.t3a_d1_release_token;
  v_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex');
BEGIN
  SELECT * INTO t FROM public.t3a_d1_release_token WHERE token_hash = v_hash;

  IF t.release_token_id IS NULL THEN
    RETURN jsonb_build_object('content', false, 'state', 'UNKNOWN_TOKEN');
  END IF;

  -- Address verification at redemption. The token is bound to the
  -- recipient, so a correct token at the wrong address returns nothing.
  IF lower(btrim(coalesce(p_verified_address,''))) <> lower(btrim(t.recipient_address)) THEN
    RETURN jsonb_build_object('content', false, 'state', 'ADDRESS_NOT_VERIFIED');
  END IF;

  -- A revoked token returns the revoked state and no content,
  -- immediately.
  IF t.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('content', false, 'state', 'REVOKED');
  END IF;

  IF t.expires_at <= now() THEN
    RETURN jsonb_build_object('content', false, 'state', 'EXPIRED');
  END IF;

  -- A release covers one version. Where the report is amended, the
  -- recipient sees the superseded state, not the new version, until a
  -- new release is made.
  IF t.superseded_at IS NOT NULL THEN
    RETURN jsonb_build_object('content', false, 'state', 'SUPERSEDED');
  END IF;

  -- The consent is per release and never standing.
  IF NOT EXISTS (SELECT 1 FROM public.t3a_d1_consent c
                 WHERE c.consent_id = t.consent_id
                   AND c.consent_type = 'DISCLOSURE'
                   AND c.state = 'GRANTED') THEN
    RETURN jsonb_build_object('content', false, 'state', 'DISCLOSURE_CONSENT_NOT_GRANTED');
  END IF;

  UPDATE public.t3a_d1_release_token
     SET redeemed_at = coalesce(redeemed_at, now())
   WHERE release_token_id = t.release_token_id;

  RETURN jsonb_build_object(
    'content', true,
    'render_target', 'report_face',
    'ber_report_id', t.ber_report_id,
    'report_version', t.report_version);
END;
$function$;
CREATE OR REPLACE FUNCTION public.t3a_create_disclosure(p_ber_report_id uuid, p_recipient_org_id uuid, p_recipient_email text, p_access_scope text, p_access_period_starts timestamp with time zone, p_access_period_ends timestamp with time zone, p_release_identity_now boolean DEFAULT false, p_release_report_now boolean DEFAULT false, p_recipient_binding_token text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_participant uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
BEGIN
  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 createDisclosure', 'unauthenticated caller');
  END IF;

  SELECT participant_id INTO v_owner
    FROM t3a_ber_report WHERE ber_report_id = p_ber_report_id;
  IF v_owner IS NULL THEN
    PERFORM t3a_raise('§13', 'ber_report not found');
  END IF;
  IF v_owner <> v_participant THEN
    PERFORM t3a_raise('§13',
      'participant can only release their own report — no administrator-created release');
  END IF;
  IF p_access_period_ends <= p_access_period_starts THEN
    PERFORM t3a_raise('§13',
      'access_period_ends must be after access_period_starts');
  END IF;

  INSERT INTO t3a_disclosure (
    ber_report_id, participant_id, recipient_org_id, recipient_email,
    access_scope, access_period_starts, access_period_ends,
    identity_released_at, report_released_at,
    status, recipient_binding_token_hash
  ) VALUES (
    p_ber_report_id, v_participant, p_recipient_org_id, p_recipient_email,
    p_access_scope, p_access_period_starts, p_access_period_ends,
    CASE WHEN p_release_identity_now THEN now() END,
    CASE WHEN p_release_report_now   THEN now() END,
    'granted',
    CASE WHEN p_recipient_binding_token IS NOT NULL
         THEN encode(digest(p_recipient_binding_token, 'sha256'), 'hex')
    END
  ) RETURNING disclosure_id INTO v_id;

  IF public.t3a_canonical_writers_on() THEN
    PERFORM public.t3a_emit_event(
      'release.recipient_created', 'PARTICIPANT', v_participant::text, 'participant', 'release', v_id,
      jsonb_build_object(
        'recipient_release_id', v_id,
        'recipient_address_hash', encode(digest(lower(btrim(p_recipient_email)), 'sha256'), 'hex'),
        'token_state', 'active'),
      'disclosure_created:' || v_id::text, NULL, v_participant);
  ELSE
  INSERT INTO t3a_event_log (
      event_name, event_category, actor_type, actor_id,
      subject_id, resource_type, resource_id, payload, integrity_hash
    ) VALUES (
      'disclosure_created', 'PARTICIPANT', 'PARTICIPANT', v_participant,
      v_participant, 'disclosure', v_id,
      jsonb_build_object(
        'ber_report_id', p_ber_report_id,
        'identity_released', p_release_identity_now,
        'report_released', p_release_report_now
      ),
      encode(digest(v_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
    );
  END IF;

  RETURN v_id;
END;
$function$;
