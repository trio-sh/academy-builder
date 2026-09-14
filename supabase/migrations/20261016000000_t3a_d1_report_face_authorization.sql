-- =====================================================================
-- Closing a hole I opened — t3a_d1_report_face had no caller check
--
-- Raised in review on PR #282 and correct. 20261004000000 created
-- t3a_d1_report_face(ber_report_id) as SECURITY DEFINER and granted
-- EXECUTE to anon and authenticated with no authorization check of any
-- kind. Any caller holding a report UUID could read that participant's
-- composed conduct rows.
--
-- It is not theoretical. t3a_employer_pool_query returns each pool
-- entry's ber_report_id to an approved employer, so the UUID is handed
-- out by design — and a direct RPC call with it bypassed the
-- participant-controlled release entirely and kept working after the
-- participant revoked.
--
-- This is exactly the shape of the three USING(true) tables the employer
-- desk work closed, rebuilt by me in a function two weeks later, which
-- is worth stating plainly: a refusal is not a habit, it has to be
-- written every time.
--
-- Three fixes, and one route that did not exist at all.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. The assembly, separated from the entitlement to see it
-- ---------------------------------------------------------------------

-- Identical to what t3a_d1_report_face did before, under a new name and
-- with NO GRANT TO ANY ROLE. Only the two gates below reach it, so there
-- is no longer a path that assembles a face without first establishing
-- who is asking.

CREATE OR REPLACE FUNCTION public.t3a_d1_report_face_assemble(p_ber_report_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r          public.t3a_d1_ber_report;
  v_ready    jsonb;
  v_review   jsonb;
  v_blocks   jsonb;
  v_conduct  jsonb;
BEGIN
  SELECT * INTO r FROM public.t3a_d1_ber_report
   WHERE ber_report_id = p_ber_report_id;

  IF r.ber_report_id IS NULL THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'BER_REPORT_NOT_FOUND');
  END IF;

  -- A mandatory block whose controlled text is not loaded means the face
  -- would render with a hole in it. A partial report face is worse than
  -- none, because a reader cannot see what is missing.
  v_ready := public.t3a_d1_report_face_renderable();
  IF NOT (v_ready ->> 'renderable')::boolean THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', v_ready ->> 'refusal_code',
      'blocks', v_ready -> 'blocks');
  END IF;

  -- §6.1 — review governs issuance, and there is no override.
  v_review := public.t3a_d1_review_blocks_issuance(p_ber_report_id);
  IF (v_review ->> 'blocked')::boolean THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'REVIEW_BLOCKS_ISSUANCE',
      'blocking_detail', v_review -> 'blocking_detail',
      'items_not_recorded', v_review -> 'items_not_recorded',
      'override_available', false);
  END IF;

  -- -------------------------------------------------------------------
  -- Block 4 — the observed conduct table
  -- -------------------------------------------------------------------
  -- The composed statements, as composed. No statement is re-worded, and
  -- a superseded one does not appear: an amendment supersedes, and the
  -- face shows the standing version.
  --
  -- composed_by, observer_id and confirmer_id are deliberately not
  -- selected. Block 5 says mentor names never render, and a column that
  -- is never read cannot leak.
  SELECT jsonb_agg(jsonb_build_object(
           'dimension_id', o.dimension_id,
           'stage_code', o.stage_code,
           'statement', s.composed_body,
           'composed_at', s.composed_at)
         ORDER BY s.composed_at)
    INTO v_conduct
  FROM public.t3a_d1_composed_statement s
  JOIN public.t3a_observation_record o
    ON o.observation_record_id = s.observation_record_id
  WHERE o.participant_id = r.participant_id
    AND o.dimension_id = r.dimension_id
    -- Only committed observations reach a report face.
    AND o.is_committed
    AND NOT EXISTS (SELECT 1 FROM public.t3a_d1_composed_statement later
                    WHERE later.supersedes = s.composed_statement_id);

  -- -------------------------------------------------------------------
  -- The eleven blocks, in contract order
  -- -------------------------------------------------------------------
  -- A conditional block is returned with renders=false and its reason,
  -- rather than omitted. A reader of the payload can then see that the
  -- block exists and did not fire, which is not the same as a block
  -- that was left out.
  SELECT jsonb_agg(jsonb_build_object(
           'block_no', b.block_no,
           'block_name', b.block_name,
           'render_behaviour', b.render_behaviour,
           'renders', CASE WHEN b.renders_always THEN true
                           WHEN b.block_no = 11 THEN false
                           WHEN b.block_no = 3 THEN false
                           ELSE false END,
           'not_rendering_reason',
             CASE WHEN b.renders_always THEN NULL
                  WHEN b.block_no = 11 THEN 'NO_SEPARATELY_DOCUMENTED_JOB_FAMILY_EVIDENCE'
                  WHEN b.block_no = 3 THEN 'NO_DIVERGENCE_TRIGGERED'
                  ELSE 'CONDITION_NOT_MET' END,
           'controlled_text_ref', b.controlled_text_ref,
           -- §6.2 — verbatim, as stored. No interpolation step exists.
           'controlled_text', t.body,
           'controlled_text_is_verbatim', t.verbatim,
           'rows', CASE WHEN b.block_no = 4 THEN coalesce(v_conduct, '[]'::jsonb)
                        ELSE NULL END)
         ORDER BY b.block_no)
    INTO v_blocks
  FROM public.t3a_d1_report_block b
  LEFT JOIN public.t3a_d1_report_controlled_text t
    ON t.text_ref = b.controlled_text_ref
  WHERE b.render_target = 'report_face';

  RETURN jsonb_build_object(
    'rendered', true,
    'ber_report_id', r.ber_report_id,
    'dimension_id', r.dimension_id,
    'status', r.status,
    'version_set', r.version_set,
    'issued_at', r.issued_at,
    'amended_at', r.amended_at,
    'withdrawn_at', r.withdrawn_at,
    -- §6.3 — the traceability sheet is never part of the face. It is
    -- named here as absent so a caller cannot mistake its absence for an
    -- oversight and go looking for it.
    'traceability_sheet', 'NEVER_PART_OF_THE_REPORT_FACE',
    'blocks', coalesce(v_blocks, '[]'::jsonb));
END;
$fn$;

REVOKE ALL ON FUNCTION public.t3a_d1_report_face_assemble(uuid) FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 1. The face answers to a caller who is entitled to it
-- ---------------------------------------------------------------------

-- Three callers are entitled, and nobody else:
--   - the participant whose report it is;
--   - an actor with administrative standing, for evidence review;
--   - a named recipient holding a live release token, who has no account
--     and therefore reaches it through section 2 instead.
--
-- anon loses EXECUTE outright. A recipient is not an anonymous caller
-- with a UUID; they are a token holder, and that is a different route.
CREATE OR REPLACE FUNCTION public.t3a_d1_report_face(p_ber_report_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_participant uuid;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'NO_CALLER_IDENTIFIED');
  END IF;

  SELECT participant_id INTO v_participant
    FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;

  IF v_participant IS NULL THEN
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'BER_REPORT_NOT_FOUND');
  END IF;

  IF v_actor <> v_participant
     AND NOT public.t3a_has_administrative_standing() THEN
    -- Holding the identifier is not entitlement. An employer reaching
    -- here with a pool ber_report_id is refused, and refused again after
    -- a release is revoked, because the release route is section 2 and
    -- this one never served them.
    RETURN jsonb_build_object('rendered', false,
      'refusal_code', 'CALLER_NOT_ENTITLED_TO_THIS_REPORT',
      'remedy', 'A named recipient reads a report through the release the participant issued, not by its identifier.');
  END IF;

  RETURN public.t3a_d1_report_face_assemble(p_ber_report_id);
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.t3a_d1_report_face(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.t3a_d1_report_face(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 2. The recipient's route — the token decides, every call
-- ---------------------------------------------------------------------

-- Also raised in review: after redeeming, the recipient page loaded the
-- global block schedule and the controlled texts and never the redeemed
-- report, so a valid recipient saw the explanatory boilerplate and the
-- block-4 render-behaviour string instead of the report they were
-- released.
--
-- The token is re-checked here rather than trusted from the redemption,
-- so revocation takes effect on the next call rather than at the next
-- login the recipient does not have.
CREATE OR REPLACE FUNCTION public.t3a_d1_report_face_for_release(
  p_token            text,
  p_verified_address text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_redeem jsonb;
BEGIN
  -- One gate, not two. Every state the redemption refuses — unknown
  -- token, wrong address, revoked, expired, superseded, consent not
  -- granted — is refused here by calling it rather than by a second copy
  -- of the rules that could drift from it.
  v_redeem := public.t3a_d1_redeem_release_token(p_token, p_verified_address);

  IF NOT (v_redeem ->> 'content')::boolean THEN
    RETURN v_redeem;
  END IF;

  RETURN jsonb_build_object(
    'content', true,
    'report_version', v_redeem ->> 'report_version',
    'face', public.t3a_d1_report_face_assemble(
              (v_redeem ->> 'ber_report_id')::uuid));
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_report_face_for_release(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Issuing a release — the route that did not exist
-- ---------------------------------------------------------------------

-- Also raised in review, and also correct: the participant's release
-- form prevented the browser submit and showed a success toast. It
-- created no consent and no token, so there was no link for the named
-- recipient to redeem. The screen advertised an action the system could
-- not perform.
--
-- §7.1: a DISCLOSURE consent is per release and never standing, so each
-- release is its own consent naming one recipient and one report at one
-- version. Releasing again to the same person is a new consent.
CREATE OR REPLACE FUNCTION public.t3a_d1_issue_release_token(
  p_ber_report_id    uuid,
  p_recipient_name   text,
  p_recipient_org    text,
  p_recipient_address text,
  p_expires_at       timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
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
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_issue_release_token(uuid, text, text, text, timestamptz)
TO authenticated;
