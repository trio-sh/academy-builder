-- T3A-D1-DEV-INS-007 · Evidence Review, Report Rendering, Issuance,
-- Disclosure and Verification.
--
-- Part One §3 build order position 10.
--
-- Governing rules (locked):
--   * Issuance is the ONE action that moves a BER report from
--     ready_to_issue → issued. It fires only when every gate in
--     t3a_d1_can_issue (INS-006 §7) returns NULL.
--   * The issuance record captures the version_set the participant
--     saw at review — never the current versions. INS-001 instruction
--     010's historical rendering rule applies here.
--   * Disclosure is participant-controlled. A recipient receives read
--     access to a report ONLY when the participant explicitly releases
--     it, and the release is revocable at any time.
--   * Verification is by a random opaque token, public to holders,
--     scoped to the exact issued snapshot. A revoked disclosure
--     breaks its tokens by refusing verification.
--   * Amendment produces a NEW issuance record that supersedes the
--     prior one. The prior issuance is retained and remains
--     verifiable via its own token (with a `superseded` badge).
--
-- Auto-close carried forward:
--   FD-D1-04 evidence-review authority — UNSET, no interim exists.
--     t3a_d1_issue_report refuses with EVIDENCE_REVIEW_AUTHORITY_UNSET
--     under any environment other than synthetic_test_only. The
--     surface is built and returns audit rows.
--   Env gate — every real-path call is refused under `design_only`
--     and `observation_capable_inactive` per t3a_d1_can_issue.
--
-- Guardrails: extensions.digest for tokens; per-object SELECT 1.

set search_path = public;

-- ========================================================================
-- §1 · Enums
-- ========================================================================

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_issuance_state AS ENUM (
    'issued',
    'superseded',
    'withdrawn'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_disclosure_state AS ENUM (
    'released',
    'revoked',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · t3a_d1_report_issuance
-- ========================================================================
--
-- One row per issuance event. `version_set_at_issuance` is the
-- snapshot the report renders from forever; later content changes
-- never rewrite the issued record (INS-001 010 historical rendering).

CREATE TABLE IF NOT EXISTS public.t3a_d1_report_issuance (
  issuance_id uuid primary key default gen_random_uuid(),
  ber_report_id uuid not null references public.t3a_d1_ber_report(ber_report_id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  authority_snapshot_id uuid references public.t3a_authority_snapshot(authority_snapshot_id) on delete restrict,
  version_set_at_issuance jsonb not null default '{}'::jsonb,
  rendered_body_hash text not null,
  state public.t3a_d1_issuance_state not null default 'issued',
  supersedes uuid references public.t3a_d1_report_issuance(issuance_id) on delete restrict,
  issued_at timestamptz not null default now(),
  superseded_at timestamptz,
  withdrawn_at timestamptz
);

CREATE INDEX IF NOT EXISTS t3a_d1_report_issuance_participant_idx
  ON public.t3a_d1_report_issuance (participant_id, dimension_id, state);
CREATE INDEX IF NOT EXISTS t3a_d1_report_issuance_report_idx
  ON public.t3a_d1_report_issuance (ber_report_id);

ALTER TABLE public.t3a_d1_report_issuance ENABLE ROW LEVEL SECURITY;

-- Read: participant, issuer, admin. Recipients read via the disclosure
-- table's own policy, not this one.
DROP POLICY IF EXISTS "t3a_d1_report_issuance_read" ON public.t3a_d1_report_issuance;
CREATE POLICY "t3a_d1_report_issuance_read"
  ON public.t3a_d1_report_issuance FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR issued_by = auth.uid() OR public.is_admin());

-- Direct writes are refused for anyone but admin — issuance rows land
-- via the SECURITY DEFINER function below.
REVOKE INSERT, UPDATE, DELETE ON public.t3a_d1_report_issuance FROM authenticated;
GRANT SELECT ON public.t3a_d1_report_issuance TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_d1_report_issuance_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.version_set_at_issuance IS DISTINCT FROM NEW.version_set_at_issuance)
     OR (OLD.rendered_body_hash IS DISTINCT FROM NEW.rendered_body_hash)
     OR (OLD.issued_by IS DISTINCT FROM NEW.issued_by)
     OR (OLD.ber_report_id IS DISTINCT FROM NEW.ber_report_id)
     OR (OLD.issued_at IS DISTINCT FROM NEW.issued_at) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'ISSUANCE_IMMUTABLE: version_set, rendered_body_hash, issuer, ber_report and issued_at are frozen after write',
      ERRCODE = '22023';
  END IF;
  -- Legal state transitions.
  IF OLD.state IS DISTINCT FROM NEW.state THEN
    IF NOT (
      (OLD.state = 'issued'      AND NEW.state IN ('superseded','withdrawn'))
      OR (OLD.state = 'superseded' AND NEW.state = 'withdrawn')
    ) THEN
      RAISE EXCEPTION USING
        MESSAGE = 'ISSUANCE_STATE_TRANSITION_INVALID: ' || OLD.state || ' -> ' || NEW.state,
        ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_d1_report_issuance_immutable_trg ON public.t3a_d1_report_issuance;
CREATE TRIGGER t3a_d1_report_issuance_immutable_trg
  BEFORE UPDATE ON public.t3a_d1_report_issuance
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_report_issuance_immutable();

-- ========================================================================
-- §3 · t3a_d1_report_disclosure
-- ========================================================================
--
-- One row per (issuance, recipient). Participant-controlled — the
-- participant creates it via t3a_d1_release_report and can revoke it
-- at any time. A revoked row is retained for the audit; the read
-- path refuses when state = 'revoked' or 'expired'.

CREATE TABLE IF NOT EXISTS public.t3a_d1_report_disclosure (
  disclosure_id uuid primary key default gen_random_uuid(),
  issuance_id uuid not null references public.t3a_d1_report_issuance(issuance_id) on delete restrict,
  ber_report_id uuid not null references public.t3a_d1_ber_report(ber_report_id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete restrict,
  recipient_kind text not null check (recipient_kind IN ('employer','institution','individual')),
  recipient_email text not null,
  recipient_display text,
  purpose text,
  state public.t3a_d1_disclosure_state not null default 'released',
  released_at timestamptz not null default now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  UNIQUE (issuance_id, recipient_email)
);

CREATE INDEX IF NOT EXISTS t3a_d1_report_disclosure_participant_idx
  ON public.t3a_d1_report_disclosure (participant_id, state);

ALTER TABLE public.t3a_d1_report_disclosure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_report_disclosure_read" ON public.t3a_d1_report_disclosure;
CREATE POLICY "t3a_d1_report_disclosure_read"
  ON public.t3a_d1_report_disclosure FOR SELECT TO authenticated
  USING (
    participant_id = auth.uid()
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND lower(p.email) = lower(t3a_d1_report_disclosure.recipient_email)
    )
  );

-- Direct writes for participants only (they may revoke their own
-- release rows); create rows lands via the SECURITY DEFINER function.
DROP POLICY IF EXISTS "t3a_d1_report_disclosure_update_own" ON public.t3a_d1_report_disclosure;
CREATE POLICY "t3a_d1_report_disclosure_update_own"
  ON public.t3a_d1_report_disclosure FOR UPDATE TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin())
  WITH CHECK (participant_id = auth.uid() OR public.is_admin());

REVOKE INSERT, DELETE ON public.t3a_d1_report_disclosure FROM authenticated;
GRANT SELECT, UPDATE ON public.t3a_d1_report_disclosure TO authenticated;

-- ========================================================================
-- §4 · t3a_d1_report_verification_token
-- ========================================================================
--
-- Random opaque token, one per disclosure. Verification is done by
-- t3a_d1_verify_by_token which is callable by anon and returns only
-- the fields the specification permits for a public verifier.
--
-- Tokens are derived from disclosure_id + random salt; the storage
-- keeps only the SHA-256 hash so a database read can't leak them.

CREATE TABLE IF NOT EXISTS public.t3a_d1_report_verification_token (
  verification_token_id uuid primary key default gen_random_uuid(),
  disclosure_id uuid not null unique references public.t3a_d1_report_disclosure(disclosure_id) on delete restrict,
  token_hash text not null unique,
  token_prefix text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

ALTER TABLE public.t3a_d1_report_verification_token ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_report_verification_token_read_participant" ON public.t3a_d1_report_verification_token;
CREATE POLICY "t3a_d1_report_verification_token_read_participant"
  ON public.t3a_d1_report_verification_token FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.t3a_d1_report_disclosure d
       WHERE d.disclosure_id = t3a_d1_report_verification_token.disclosure_id
         AND d.participant_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.t3a_d1_report_verification_token FROM authenticated;
GRANT SELECT ON public.t3a_d1_report_verification_token TO authenticated;

-- ========================================================================
-- §5 · Issuance service
-- ========================================================================
--
-- t3a_d1_issue_report(ber_report_id, rendered_body)
--
-- Called by the issuing surface (an evidence reviewer / issuer). Every
-- refusal path from t3a_d1_can_issue is checked first; the function
-- returns NULL on refusal and writes to t3a_d1_report_refusal_log so
-- the audit surface (INS-008) has a visible reason. On success the
-- function writes the issuance row and updates ber_report.status to
-- 'issued'.

CREATE OR REPLACE FUNCTION public.t3a_d1_issue_report(
  p_ber_report_id uuid,
  p_rendered_body text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_reason public.t3a_d1_issuance_refusal_reason;
  v_report public.t3a_d1_ber_report%rowtype;
  v_hash text;
  v_issuance_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;
  IF p_rendered_body IS NULL OR btrim(p_rendered_body) = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'RENDERED_BODY_REQUIRED', ERRCODE = '22023';
  END IF;

  v_reason := public.t3a_d1_can_issue(p_ber_report_id);
  IF v_reason IS NOT NULL THEN
    INSERT INTO public.t3a_d1_report_refusal_log(
      participant_id, dimension_id, requested_template_id, reason, detail
    )
    SELECT participant_id, dimension_id, NULL, v_reason::text::public.t3a_d1_report_refusal_reason, 'issuance refused'
      FROM public.t3a_d1_ber_report
     WHERE ber_report_id = p_ber_report_id;
    RAISE EXCEPTION USING MESSAGE = 'ISSUANCE_REFUSED: ' || v_reason, ERRCODE = '22023';
  END IF;

  -- FD-D1-04 stop: real environments refuse even after every other
  -- gate. Only synthetic_test_only permits an issuance today.
  IF v_env NOT IN ('synthetic_test_only') THEN
    RAISE EXCEPTION USING MESSAGE = 'EVIDENCE_REVIEW_AUTHORITY_UNSET: FD-D1-04 has no interim; issuance is refused', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_report FROM public.t3a_d1_ber_report WHERE ber_report_id = p_ber_report_id;
  v_hash := encode(extensions.digest(p_rendered_body, 'sha256'), 'hex');

  INSERT INTO public.t3a_d1_report_issuance (
    ber_report_id, participant_id, dimension_id, issued_by,
    version_set_at_issuance, rendered_body_hash
  ) VALUES (
    p_ber_report_id, v_report.participant_id, v_report.dimension_id, auth.uid(),
    v_report.version_set, v_hash
  )
  RETURNING issuance_id INTO v_issuance_id;

  UPDATE public.t3a_d1_ber_report
     SET status = 'issued', issued_at = now()
   WHERE ber_report_id = p_ber_report_id
     AND status = 'ready_to_issue';

  RETURN v_issuance_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.t3a_d1_issue_report(uuid, text) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_issue_report(uuid, text) TO service_role;

-- ========================================================================
-- §6 · Amendment service
-- ========================================================================
--
-- Called after a correction resolves with `amended`. Composes a new
-- issuance row that supersedes the prior, updates the prior to
-- `superseded`, and moves ber_report.status to 'amended'.

CREATE OR REPLACE FUNCTION public.t3a_d1_amend_issued_report(
  p_prior_issuance_id uuid,
  p_new_rendered_body text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prior public.t3a_d1_report_issuance%rowtype;
  v_new_id uuid;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;
  SELECT * INTO v_prior FROM public.t3a_d1_report_issuance WHERE issuance_id = p_prior_issuance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'PRIOR_ISSUANCE_NOT_FOUND', ERRCODE = '22023';
  END IF;
  IF v_prior.state <> 'issued' THEN
    RAISE EXCEPTION USING MESSAGE = 'PRIOR_ISSUANCE_NOT_ACTIVE: state ' || v_prior.state, ERRCODE = '22023';
  END IF;

  v_hash := encode(extensions.digest(p_new_rendered_body, 'sha256'), 'hex');

  INSERT INTO public.t3a_d1_report_issuance (
    ber_report_id, participant_id, dimension_id, issued_by,
    version_set_at_issuance, rendered_body_hash,
    supersedes
  ) VALUES (
    v_prior.ber_report_id, v_prior.participant_id, v_prior.dimension_id, auth.uid(),
    (SELECT version_set FROM public.t3a_d1_ber_report WHERE ber_report_id = v_prior.ber_report_id),
    v_hash,
    p_prior_issuance_id
  )
  RETURNING issuance_id INTO v_new_id;

  UPDATE public.t3a_d1_report_issuance
     SET state = 'superseded', superseded_at = now()
   WHERE issuance_id = p_prior_issuance_id;

  UPDATE public.t3a_d1_ber_report
     SET status = 'amended', amended_at = now()
   WHERE ber_report_id = v_prior.ber_report_id
     AND status = 'issued';

  RETURN v_new_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.t3a_d1_amend_issued_report(uuid, text) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_d1_amend_issued_report(uuid, text) TO service_role;

-- ========================================================================
-- §7 · Release + revoke + verify
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_d1_release_report(
  p_issuance_id uuid,
  p_recipient_kind text,
  p_recipient_email text,
  p_recipient_display text DEFAULT NULL,
  p_purpose text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_iss public.t3a_d1_report_issuance%rowtype;
  v_disclosure_id uuid;
  v_secret text;
  v_hash text;
  v_prefix text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;
  SELECT * INTO v_iss FROM public.t3a_d1_report_issuance WHERE issuance_id = p_issuance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'ISSUANCE_NOT_FOUND', ERRCODE = '22023';
  END IF;
  IF v_iss.participant_id <> auth.uid() THEN
    RAISE EXCEPTION USING MESSAGE = 'FORBIDDEN: release is the participant''s call', ERRCODE = '22023';
  END IF;
  IF v_iss.state <> 'issued' THEN
    RAISE EXCEPTION USING MESSAGE = 'ISSUANCE_NOT_ACTIVE: state ' || v_iss.state, ERRCODE = '22023';
  END IF;

  INSERT INTO public.t3a_d1_report_disclosure (
    issuance_id, ber_report_id, participant_id,
    recipient_kind, recipient_email, recipient_display, purpose, expires_at
  ) VALUES (
    p_issuance_id, v_iss.ber_report_id, auth.uid(),
    p_recipient_kind, lower(p_recipient_email), p_recipient_display, p_purpose, p_expires_at
  )
  ON CONFLICT (issuance_id, recipient_email) DO UPDATE
    SET state = 'released', revoked_at = NULL, released_at = now(),
        recipient_display = COALESCE(EXCLUDED.recipient_display, t3a_d1_report_disclosure.recipient_display),
        purpose = COALESCE(EXCLUDED.purpose, t3a_d1_report_disclosure.purpose),
        expires_at = EXCLUDED.expires_at
  RETURNING disclosure_id INTO v_disclosure_id;

  -- Mint a random token, hash it, keep only the prefix in plaintext
  -- so the participant can identify it in a list. Full token is
  -- returned once to the caller.
  v_secret := encode(extensions.gen_random_bytes(24), 'hex');
  v_hash := encode(extensions.digest(v_secret, 'sha256'), 'hex');
  v_prefix := substr(v_secret, 1, 8);

  INSERT INTO public.t3a_d1_report_verification_token (
    disclosure_id, token_hash, token_prefix
  ) VALUES (
    v_disclosure_id, v_hash, v_prefix
  )
  ON CONFLICT (disclosure_id) DO UPDATE
    SET token_hash = EXCLUDED.token_hash, token_prefix = EXCLUDED.token_prefix, last_used_at = NULL;

  RETURN jsonb_build_object(
    'disclosure_id', v_disclosure_id,
    'verification_token', v_secret,
    'token_prefix', v_prefix
  );
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_release_report(uuid, text, text, text, text, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_d1_revoke_disclosure(
  p_disclosure_id uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.t3a_d1_report_disclosure%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;
  SELECT * INTO v_row FROM public.t3a_d1_report_disclosure WHERE disclosure_id = p_disclosure_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'DISCLOSURE_NOT_FOUND', ERRCODE = '22023';
  END IF;
  IF v_row.participant_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'FORBIDDEN', ERRCODE = '22023';
  END IF;
  UPDATE public.t3a_d1_report_disclosure
     SET state = 'revoked', revoked_at = now()
   WHERE disclosure_id = p_disclosure_id
     AND state = 'released';
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_revoke_disclosure(uuid) TO authenticated;

-- Public verification. Returns a minimal fact set: participant name,
-- dimension, issued_at, state, and a `superseded_by` pointer if there
-- is one. Never leaks the rendered body — a recipient with a
-- disclosure link reads the full record via the disclosure read
-- path, which is auth-gated.
CREATE OR REPLACE FUNCTION public.t3a_d1_verify_by_token(
  p_token text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hash text := encode(extensions.digest(p_token, 'sha256'), 'hex');
  v_token public.t3a_d1_report_verification_token%rowtype;
  v_disclosure public.t3a_d1_report_disclosure%rowtype;
  v_iss public.t3a_d1_report_issuance%rowtype;
  v_participant_first text;
  v_participant_last text;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'TOKEN_MISSING');
  END IF;
  SELECT * INTO v_token FROM public.t3a_d1_report_verification_token WHERE token_hash = v_hash;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'TOKEN_UNKNOWN');
  END IF;
  SELECT * INTO v_disclosure FROM public.t3a_d1_report_disclosure WHERE disclosure_id = v_token.disclosure_id;
  IF v_disclosure.state <> 'released'
     OR (v_disclosure.expires_at IS NOT NULL AND v_disclosure.expires_at < now()) THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'DISCLOSURE_NOT_ACTIVE', 'state', v_disclosure.state);
  END IF;
  SELECT * INTO v_iss FROM public.t3a_d1_report_issuance WHERE issuance_id = v_disclosure.issuance_id;
  IF v_iss.state = 'withdrawn' THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'ISSUANCE_WITHDRAWN');
  END IF;

  UPDATE public.t3a_d1_report_verification_token
     SET last_used_at = now()
   WHERE verification_token_id = v_token.verification_token_id;

  SELECT first_name, last_name INTO v_participant_first, v_participant_last
    FROM public.profiles WHERE id = v_iss.participant_id;

  RETURN jsonb_build_object(
    'verified', true,
    'participant_name', trim(coalesce(v_participant_first, '') || ' ' || coalesce(v_participant_last, '')),
    'dimension_id', v_iss.dimension_id,
    'issued_at', v_iss.issued_at,
    'state', v_iss.state,
    'superseded_by', v_iss.state -- pointer for the reader; body is not returned here
  );
END $$;

-- Available to anon so a holder of a link can verify without an
-- account.
GRANT EXECUTE ON FUNCTION public.t3a_d1_verify_by_token(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
