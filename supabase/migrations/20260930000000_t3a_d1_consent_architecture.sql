-- =====================================================================
-- T3A-D1-EXEC-001 section 7 — consent architecture
--
-- "Build this in full. Real consent capture stays disabled until
-- activation; the model, the states and the refusals are built now."
--
-- Consenting to be observed is not consenting to be found, and is not
-- consenting to disclosure. Discoverability does not exist as a
-- consequence of holding a record.
--
-- A recipient does not need an approved employer account, and an
-- approved employer account does not give access to anything. These are
-- two independent things, and nothing below joins them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Section 7.1 — the controlled consent types
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_consent_type (
  consent_type text PRIMARY KEY,
  covers       text NOT NULL,
  available    boolean NOT NULL
);

COMMENT ON TABLE public.t3a_d1_consent_type IS
  'Section 7.1. RECORDING is present and marked unavailable rather than omitted, because a type that is absent from the register reads as an oversight while a type recorded as unavailable reads as a decision. No Stage carries it and no route may request it.';

INSERT INTO public.t3a_d1_consent_type (consent_type, covers, available) VALUES
  ('OBSERVATION','Being observed in a defined situation at a named Stage', true),
  ('AI_ADMINISTRATION','A situation administered by the AI service, with human confirmation', true),
  ('RECORDING','Any persistence of media. Not granted for D1: no Stage carries it, and Stage 4 has no recording', false),
  ('GROUP_SESSION','Taking part in a shared session where material is visible to other participants', true),
  ('WORK_SAMPLE_SUBMISSION','Submitting an artifact for Stage 3', true),
  ('DISCLOSURE','Releasing an issued report to one named recipient. Per release, never standing', true)
ON CONFLICT (consent_type) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. Section 7.2 — the consent record
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_consent (
  consent_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  consent_type        text NOT NULL REFERENCES public.t3a_d1_consent_type(consent_type),
  notice_version_id   text NOT NULL,
  notice_version_hash text NOT NULL,
  stage_class         text,
  stage_instance_id   uuid,
  source_version_id   uuid,
  state               text NOT NULL DEFAULT 'NOT_REQUESTED'
                        CHECK (state IN ('NOT_REQUESTED','REQUESTED','GRANTED','DECLINED','WITHDRAWN')),
  granted_at          timestamptz,
  declined_at         timestamptz,
  withdrawn_at        timestamptz,
  capture_channel     text,
  capture_actor       uuid,
  superseded_by       uuid REFERENCES public.t3a_d1_consent(consent_id),
  audit_ref           uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  -- The consent binds to the exact notice version and hash the
  -- participant was shown. A later notice version never applies
  -- retroactively to an earlier consent.
  CONSTRAINT t3a_d1_consent_state_times CHECK (
    (state <> 'GRANTED'   OR granted_at   IS NOT NULL) AND
    (state <> 'DECLINED'  OR declined_at  IS NOT NULL) AND
    (state <> 'WITHDRAWN' OR withdrawn_at IS NOT NULL))
);

COMMENT ON TABLE public.t3a_d1_consent IS
  'Section 7.2. A decline is never recorded as a result and never enters the evidence domain: it records that the situation did not run. Withdrawal is not deletion — the observation record survives, and what changes is what may be composed, issued or released from it.';

CREATE INDEX IF NOT EXISTS t3a_d1_consent_lookup_idx
  ON public.t3a_d1_consent (participant_id, consent_type, state);

-- RECORDING may not be requested by any route.
CREATE OR REPLACE FUNCTION public.t3a_d1_consent_type_available()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_ok boolean;
BEGIN
  SELECT available INTO v_ok FROM public.t3a_d1_consent_type
   WHERE consent_type = NEW.consent_type;
  IF NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'CONSENT_TYPE_UNAVAILABLE_IN_D1: % is not carried by any Stage and no route may request it', NEW.consent_type
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_consent_type_guard ON public.t3a_d1_consent;
CREATE TRIGGER t3a_d1_consent_type_guard
  BEFORE INSERT OR UPDATE ON public.t3a_d1_consent
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_consent_type_available();

-- ---------------------------------------------------------------------
-- 3. Section 7.3 — states and transitions
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_d1_consent_transition()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE v_ok boolean := false;
BEGIN
  IF OLD.state = NEW.state THEN RETURN NEW; END IF;

  -- NOT_REQUESTED -> REQUESTED -> GRANTED | DECLINED, and GRANTED -> WITHDRAWN.
  v_ok := (OLD.state = 'NOT_REQUESTED' AND NEW.state = 'REQUESTED')
       OR (OLD.state = 'REQUESTED'     AND NEW.state IN ('GRANTED','DECLINED'))
       OR (OLD.state = 'GRANTED'       AND NEW.state = 'WITHDRAWN');

  IF NOT v_ok THEN
    -- A withdrawn consent cannot be re-granted in place. A new consent
    -- record supersedes, with superseded_by linking them.
    IF OLD.state = 'WITHDRAWN' AND NEW.state = 'GRANTED' THEN
      RAISE EXCEPTION 'CONSENT_WITHDRAWN_CANNOT_BE_REGRANTED_IN_PLACE: supersede with a new consent record'
        USING ERRCODE = 'check_violation';
    END IF;
    RAISE EXCEPTION 'CONSENT_TRANSITION_NOT_PERMITTED: % to %', OLD.state, NEW.state
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_d1_consent_state_machine ON public.t3a_d1_consent;
CREATE TRIGGER t3a_d1_consent_state_machine
  BEFORE UPDATE ON public.t3a_d1_consent
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_consent_transition();

-- ---------------------------------------------------------------------
-- 4. Section 7.6 — the Stage-to-consent matrix
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_stage_consent_requirement (
  stage_or_act text NOT NULL,
  consent_type text NOT NULL REFERENCES public.t3a_d1_consent_type(consent_type),
  PRIMARY KEY (stage_or_act, consent_type)
);

COMMENT ON TABLE public.t3a_d1_stage_consent_requirement IS
  'Section 7.6. A Stage never requests a consent it does not need. An S4 co-participant is not observed, generates no observation record, and is never asked for observation consent.';

INSERT INTO public.t3a_d1_stage_consent_requirement (stage_or_act, consent_type) VALUES
  ('S1','OBSERVATION'), ('S1','AI_ADMINISTRATION'),
  ('S2','OBSERVATION'),
  ('S3','OBSERVATION'), ('S3','WORK_SAMPLE_SUBMISSION'),
  ('S4_observed','OBSERVATION'), ('S4_observed','GROUP_SESSION'),
  ('S4_co_participant','GROUP_SESSION'),
  ('release_to_recipient','DISCLOSURE')
ON CONFLICT DO NOTHING;

-- Stage entry refuses where any consent required for that Stage is
-- missing, declined or withdrawn, for the exact notice version. This is
-- the consent-state reference the Cockpit preflight checks.
CREATE OR REPLACE FUNCTION public.t3a_d1_stage_entry_permitted(
  p_participant_id    uuid,
  p_stage_or_act      text,
  p_notice_version_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_missing text;
  v_required integer;
BEGIN
  SELECT count(*) INTO v_required FROM public.t3a_d1_stage_consent_requirement
   WHERE stage_or_act = p_stage_or_act;

  IF v_required = 0 THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'STAGE_NOT_IN_CONSENT_MATRIX', 'stage', p_stage_or_act);
  END IF;

  SELECT string_agg(r.consent_type, ', ' ORDER BY r.consent_type) INTO v_missing
  FROM public.t3a_d1_stage_consent_requirement r
  WHERE r.stage_or_act = p_stage_or_act
    AND NOT EXISTS (
      SELECT 1 FROM public.t3a_d1_consent c
      WHERE c.participant_id = p_participant_id
        AND c.consent_type = r.consent_type
        AND c.state = 'GRANTED'
        AND c.notice_version_id = p_notice_version_id
        AND c.withdrawn_at IS NULL);

  IF v_missing IS NOT NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'CONSENT_MISSING_DECLINED_OR_WITHDRAWN',
      'consent_types', v_missing);
  END IF;

  RETURN jsonb_build_object('permitted', true, 'consents_checked', v_required);
END;
$fn$;

-- Issuance refuses where the consent covering any contributing
-- observation is withdrawn.
CREATE OR REPLACE FUNCTION public.t3a_d1_issuance_consent_intact(
  p_participant_id uuid,
  p_notice_version_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_withdrawn integer;
BEGIN
  SELECT count(*) INTO v_withdrawn FROM public.t3a_d1_consent
   WHERE participant_id = p_participant_id
     AND consent_type IN ('OBSERVATION','AI_ADMINISTRATION','GROUP_SESSION','WORK_SAMPLE_SUBMISSION')
     AND notice_version_id = p_notice_version_id
     AND state = 'WITHDRAWN';

  IF v_withdrawn > 0 THEN
    RETURN jsonb_build_object('intact', false,
      'refusal_code', 'CONTRIBUTING_CONSENT_WITHDRAWN', 'withdrawn_count', v_withdrawn);
  END IF;
  RETURN jsonb_build_object('intact', true);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 5. Section 7.5 — the named recipient
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_d1_release_token (
  release_token_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consent_id        uuid NOT NULL REFERENCES public.t3a_d1_consent(consent_id),
  ber_report_id     uuid NOT NULL,
  report_version    text NOT NULL,
  recipient_name    text NOT NULL,
  recipient_org     text,
  recipient_address text NOT NULL,
  token_hash        text NOT NULL UNIQUE,
  issued_at         timestamptz NOT NULL DEFAULT now(),
  expires_at        timestamptz NOT NULL,
  redeemed_at       timestamptz,
  revoked_at        timestamptz,
  superseded_at     timestamptz
);

COMMENT ON TABLE public.t3a_d1_release_token IS
  'Section 7.5. Recipient-bound, single-report, time-limited. The token is bound to the recipient, the report and the version. No account creation is required of a recipient, and holding an approved employer account confers no access and changes nothing about this route. Only the hash is stored.';

CREATE INDEX IF NOT EXISTS t3a_d1_release_token_report_idx
  ON public.t3a_d1_release_token (ber_report_id, report_version);

-- Redemption. Returns the report face only, at the released version, or
-- a state and no content. What a recipient sees is bounded by what this
-- function returns: no full record, no traceability sheet, no other
-- report, no other participant, no search.
CREATE OR REPLACE FUNCTION public.t3a_d1_redeem_release_token(
  p_token            text,
  p_verified_address text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
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
$fn$;

-- Verification is status-only through the opaque identifier. It returns
-- current, amended or withdrawn, and never content. No participant name,
-- email, report content or recipient identity is derivable from it.
CREATE OR REPLACE FUNCTION public.t3a_d1_verify_status(p_verification_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_state text;
BEGIN
  SELECT CASE
           WHEN i.withdrawn_at  IS NOT NULL THEN 'withdrawn'
           WHEN i.superseded_at IS NOT NULL THEN 'amended'
           ELSE 'current' END
    INTO v_state
  FROM public.t3a_d1_report_verification_token v
  JOIN public.t3a_d1_report_disclosure d ON d.disclosure_id = v.disclosure_id
  JOIN public.t3a_d1_report_issuance   i ON i.issuance_id   = d.issuance_id
  WHERE v.token_hash = encode(extensions.digest(p_verification_id, 'sha256'), 'hex')
  LIMIT 1;

  IF v_state IS NULL THEN
    RETURN jsonb_build_object('known', false);
  END IF;

  -- Status only. No participant name, email, report content or
  -- recipient identity is returned or derivable, by construction: the
  -- function selects one string and returns it.
  RETURN jsonb_build_object('known', true, 'status', v_state);
END;
$fn$;

ALTER TABLE public.t3a_d1_consent_type              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_consent                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_stage_consent_requirement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_d1_release_token             ENABLE ROW LEVEL SECURITY;

DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['t3a_d1_consent_type','t3a_d1_stage_consent_requirement'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_read ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_read ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_write ON public.%I', t, t);
    EXECUTE format('CREATE POLICY %I_write ON public.%I FOR ALL
       USING (public.t3a_is_service_context()) WITH CHECK (public.t3a_is_service_context())', t, t);
  END LOOP;
END;
$rls$;

-- A consent record belongs to the participant it is about.
DROP POLICY IF EXISTS t3a_d1_consent_read ON public.t3a_d1_consent;
CREATE POLICY t3a_d1_consent_read ON public.t3a_d1_consent
  FOR SELECT USING (
    participant_id = auth.uid()
    OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context()
    OR public.t3a_is_reviewer());

DROP POLICY IF EXISTS t3a_d1_consent_write ON public.t3a_d1_consent;
CREATE POLICY t3a_d1_consent_write ON public.t3a_d1_consent
  FOR ALL USING (participant_id = auth.uid() OR public.t3a_is_service_context())
  WITH CHECK (participant_id = auth.uid() OR public.t3a_is_service_context());

-- The participant may revoke at any time, so they own the token row.
-- No recipient reads this table; redemption goes through the function.
DROP POLICY IF EXISTS t3a_d1_release_token_own ON public.t3a_d1_release_token;
CREATE POLICY t3a_d1_release_token_own ON public.t3a_d1_release_token
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.t3a_d1_consent c
            WHERE c.consent_id = consent_id AND c.participant_id = auth.uid())
    OR public.t3a_is_service_context())
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.t3a_d1_consent c
            WHERE c.consent_id = consent_id AND c.participant_id = auth.uid())
    OR public.t3a_is_service_context());

GRANT EXECUTE ON FUNCTION
  public.t3a_d1_stage_entry_permitted(uuid, text, text),
  public.t3a_d1_issuance_consent_intact(uuid, text),
  public.t3a_d1_redeem_release_token(text, text),
  public.t3a_d1_verify_status(text)
TO anon, authenticated;
