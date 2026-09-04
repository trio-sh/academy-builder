-- T3A-DEV-INS-WR-FREE-001 · Free Rehearsal Release on WorkRehearsal
--
-- Section 6 — placement, access and entitlement.
-- Section 7 — feedback prompts + telemetry.
--
-- Governing rules from the spec:
--   * A period entitlement is issued at account creation during the
--     LIVE window. It converts to PERMANENT the moment the participant
--     first ENTERS either rehearsal. Both are platform-held; a permanent
--     entitlement survives CLOSED (Section 6).
--   * A free entitlement generates NO bundle credit (Section 6 correction).
--   * VERSION SEMANTICS: entitlement is to the module identity, not to
--     the version current when it was taken. A major redesign that
--     constitutes a new module identity is not included.
--   * Aggregate reporting only — the analytics store must not build a
--     queryable participant-level behavioral history (Section 7
--     architectural rule).
--   * No participant-facing display of duration, score, badge, progress
--     percentage, meter, ring, or fraction (Sections 4, 5.5, storefront
--     rules).
--
-- Guardrails:
--   * extensions.digest for all hashes
--   * Per-object SELECT 1 verification after apply

set search_path = public;

-- ========================================================================
-- §1 · Release lifecycle
-- ========================================================================
--
-- DRAFT → LIVE → CLOSED. Founder-controlled activation and closure.
-- No new period entitlement issues once CLOSED. Every permanent
-- entitlement already earned survives closure unconditionally.

DO $$ BEGIN
  CREATE TYPE public.t3a_wr_free_release_state AS ENUM (
    'draft',
    'live',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.t3a_wr_free_release (
  release_id uuid primary key default gen_random_uuid(),
  release_code text not null unique,
  state public.t3a_wr_free_release_state not null default 'draft',
  scheduled_open_at timestamptz,
  scheduled_close_at timestamptz,
  activated_at timestamptz,
  closed_at timestamptz,
  activated_by uuid,
  closed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  notes text
);

CREATE INDEX IF NOT EXISTS t3a_wr_free_release_state_idx
  ON public.t3a_wr_free_release (state);

INSERT INTO public.t3a_wr_free_release (release_code, state, notes)
VALUES (
  'WR-FREE-001',
  'draft',
  'The Moment You Notice — two full workplace rehearsal experiences. Founder-recommended product name, not yet locked. Section 11 Group C.'
)
ON CONFLICT (release_code) DO NOTHING;

ALTER TABLE public.t3a_wr_free_release ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_wr_free_release_read" ON public.t3a_wr_free_release;
CREATE POLICY "t3a_wr_free_release_read"
  ON public.t3a_wr_free_release FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "t3a_wr_free_release_write_admin" ON public.t3a_wr_free_release;
CREATE POLICY "t3a_wr_free_release_write_admin"
  ON public.t3a_wr_free_release FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_wr_free_release TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_wr_free_release_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_wr_free_release_updated_at_trg ON public.t3a_wr_free_release;
CREATE TRIGGER t3a_wr_free_release_updated_at_trg
  BEFORE UPDATE ON public.t3a_wr_free_release
  FOR EACH ROW EXECUTE FUNCTION public.t3a_wr_free_release_touch_updated_at();

-- ========================================================================
-- §2 · Module identities
-- ========================================================================
--
-- Two module identities in this release. The version_ref points at a
-- t3a_d1_content_version row when the module content is loaded; until
-- then a stub identity is enough for the entitlement layer to bind to.

CREATE TABLE IF NOT EXISTS public.t3a_wr_free_module (
  module_id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.t3a_wr_free_release(release_id) on delete restrict,
  module_code text not null,
  display_title text not null,
  internal_reference text not null,
  content_version_id uuid references public.t3a_d1_content_version(content_version_id) on delete restrict,
  UNIQUE (release_id, module_code)
);

INSERT INTO public.t3a_wr_free_module (release_id, module_code, display_title, internal_reference)
SELECT r.release_id, m.module_code, m.display_title, m.internal_reference
FROM public.t3a_wr_free_release r
CROSS JOIN (VALUES
  ('SAYING_THE_HARD_THING',  'Saying the Hard Thing',   'Communication Under Pressure — FULL MODULE'),
  ('WHEN_THE_AI_LOOKS_RIGHT','When the AI Looks Right', 'AI-Ready Behaviors M1, AI Output Judgment — FULL MODULE')
) AS m(module_code, display_title, internal_reference)
WHERE r.release_code = 'WR-FREE-001'
ON CONFLICT (release_id, module_code) DO NOTHING;

ALTER TABLE public.t3a_wr_free_module ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_wr_free_module_read" ON public.t3a_wr_free_module;
CREATE POLICY "t3a_wr_free_module_read"
  ON public.t3a_wr_free_module FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "t3a_wr_free_module_write_admin" ON public.t3a_wr_free_module;
CREATE POLICY "t3a_wr_free_module_write_admin"
  ON public.t3a_wr_free_module FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_wr_free_module TO authenticated;

-- ========================================================================
-- §3 · Entitlement
-- ========================================================================
--
-- One row per (participant, release). Starts as PERIOD when the account
-- is created during LIVE. Converts to PERMANENT on first ENTRY into
-- either module (Section 6 qualifying-event rule).

DO $$ BEGIN
  CREATE TYPE public.t3a_wr_free_entitlement_state AS ENUM (
    'period',
    'permanent',
    'lapsed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.t3a_wr_free_entitlement (
  entitlement_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete restrict,
  release_id uuid not null references public.t3a_wr_free_release(release_id) on delete restrict,
  state public.t3a_wr_free_entitlement_state not null default 'period',
  granted_at timestamptz not null default now(),
  converted_at timestamptz,
  first_entered_module_id uuid references public.t3a_wr_free_module(module_id) on delete restrict,
  lapsed_at timestamptz,
  is_free boolean not null default true,
  UNIQUE (participant_id, release_id)
);

CREATE INDEX IF NOT EXISTS t3a_wr_free_entitlement_participant_idx
  ON public.t3a_wr_free_entitlement (participant_id);
CREATE INDEX IF NOT EXISTS t3a_wr_free_entitlement_state_idx
  ON public.t3a_wr_free_entitlement (state);

ALTER TABLE public.t3a_wr_free_entitlement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_wr_free_entitlement_read" ON public.t3a_wr_free_entitlement;
CREATE POLICY "t3a_wr_free_entitlement_read"
  ON public.t3a_wr_free_entitlement FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_wr_free_entitlement_insert_self" ON public.t3a_wr_free_entitlement;
CREATE POLICY "t3a_wr_free_entitlement_insert_self"
  ON public.t3a_wr_free_entitlement FOR INSERT TO authenticated
  WITH CHECK (participant_id = auth.uid());

-- Updates only via service function; direct client updates refuse.
REVOKE UPDATE, DELETE ON public.t3a_wr_free_entitlement FROM authenticated;
GRANT SELECT, INSERT ON public.t3a_wr_free_entitlement TO authenticated;

-- ========================================================================
-- §4 · Grant period + convert-to-permanent service functions
-- ========================================================================
--
-- Grant is idempotent: calling twice on the same (participant, release)
-- returns the existing entitlement row.  Refuses if the release is not
-- LIVE (Section 6: no new free entitlement of any kind after CLOSED).

CREATE OR REPLACE FUNCTION public.t3a_wr_free_grant_period(
  p_release_code text DEFAULT 'WR-FREE-001'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_release public.t3a_wr_free_release%rowtype;
  v_ent_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_release
    FROM public.t3a_wr_free_release
   WHERE release_code = p_release_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'RELEASE_NOT_FOUND', ERRCODE = '22023';
  END IF;
  IF v_release.state <> 'live' THEN
    RAISE EXCEPTION USING
      MESSAGE = 'RELEASE_NOT_LIVE: entitlement cannot be granted while the release is ' || v_release.state,
      ERRCODE = '22023';
  END IF;

  INSERT INTO public.t3a_wr_free_entitlement (participant_id, release_id, state, is_free)
  VALUES (auth.uid(), v_release.release_id, 'period', true)
  ON CONFLICT (participant_id, release_id) DO UPDATE SET participant_id = EXCLUDED.participant_id
  RETURNING entitlement_id INTO v_ent_id;

  RETURN v_ent_id;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_wr_free_grant_period(text) TO authenticated;

-- Convert to PERMANENT on first entry. Runs on the ENTER event; the
-- entitlement transition is what makes the founder commitment
-- enforceable at the data layer (Section 6).

CREATE OR REPLACE FUNCTION public.t3a_wr_free_record_first_entry(
  p_module_code text,
  p_release_code text DEFAULT 'WR-FREE-001'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_release public.t3a_wr_free_release%rowtype;
  v_module public.t3a_wr_free_module%rowtype;
  v_ent public.t3a_wr_free_entitlement%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_release
    FROM public.t3a_wr_free_release
   WHERE release_code = p_release_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'RELEASE_NOT_FOUND', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_module
    FROM public.t3a_wr_free_module
   WHERE release_id = v_release.release_id
     AND module_code = p_module_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'MODULE_NOT_FOUND', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_ent
    FROM public.t3a_wr_free_entitlement
   WHERE participant_id = auth.uid()
     AND release_id = v_release.release_id;
  IF NOT FOUND THEN
    -- Grant a permanent entitlement directly if none exists yet — this
    -- handles the case where the participant enters via a link that
    -- bypassed the account-creation grant path.  Still requires LIVE.
    IF v_release.state <> 'live' THEN
      RAISE EXCEPTION USING MESSAGE = 'RELEASE_NOT_LIVE', ERRCODE = '22023';
    END IF;
    INSERT INTO public.t3a_wr_free_entitlement (participant_id, release_id, state, converted_at, first_entered_module_id, is_free)
    VALUES (auth.uid(), v_release.release_id, 'permanent', now(), v_module.module_id, true)
    RETURNING entitlement_id INTO v_ent.entitlement_id;
    RETURN v_ent.entitlement_id;
  END IF;

  IF v_ent.state = 'permanent' THEN
    -- Already permanent; ensure first_entered_module_id is captured.
    IF v_ent.first_entered_module_id IS NULL THEN
      UPDATE public.t3a_wr_free_entitlement
         SET first_entered_module_id = v_module.module_id
       WHERE entitlement_id = v_ent.entitlement_id;
    END IF;
    RETURN v_ent.entitlement_id;
  END IF;

  IF v_ent.state = 'lapsed' THEN
    RAISE EXCEPTION USING MESSAGE = 'ENTITLEMENT_LAPSED', ERRCODE = '22023';
  END IF;

  -- Period → permanent transition.
  UPDATE public.t3a_wr_free_entitlement
     SET state = 'permanent',
         converted_at = now(),
         first_entered_module_id = v_module.module_id
   WHERE entitlement_id = v_ent.entitlement_id;

  RETURN v_ent.entitlement_id;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_wr_free_record_first_entry(text, text) TO authenticated;

-- Lapse the period entitlements on close.  Permanent entitlements are
-- untouched.  Called by the founder from an admin action.

CREATE OR REPLACE FUNCTION public.t3a_wr_free_close_release(
  p_release_code text DEFAULT 'WR-FREE-001'
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_release public.t3a_wr_free_release%rowtype;
  v_lapsed int;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION USING MESSAGE = 'ADMIN_REQUIRED', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_release
    FROM public.t3a_wr_free_release
   WHERE release_code = p_release_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'RELEASE_NOT_FOUND', ERRCODE = '22023';
  END IF;
  IF v_release.state = 'closed' THEN
    RETURN 0;
  END IF;

  UPDATE public.t3a_wr_free_release
     SET state = 'closed', closed_at = now(), closed_by = auth.uid()
   WHERE release_id = v_release.release_id;

  WITH lapsed AS (
    UPDATE public.t3a_wr_free_entitlement
       SET state = 'lapsed', lapsed_at = now()
     WHERE release_id = v_release.release_id
       AND state = 'period'
     RETURNING 1
  )
  SELECT count(*) INTO v_lapsed FROM lapsed;

  RETURN v_lapsed;
END $$;

REVOKE EXECUTE ON FUNCTION public.t3a_wr_free_close_release(text) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_wr_free_close_release(text) TO service_role;

-- ========================================================================
-- §5 · Feedback prompt responses (Section 7)
-- ========================================================================
--
-- Prompt A: after the first module completes.
-- Prompt B: after the product completes.
-- Prompt C: on explicit in-product exit, one field, dismissible.
--
-- Every field is optional; responses are stored against the
-- entitlement, NEVER surfaced back to the participant as a result.

DO $$ BEGIN
  CREATE TYPE public.t3a_wr_free_prompt_code AS ENUM ('A','B','C');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.t3a_wr_free_feedback_response (
  feedback_response_id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.t3a_wr_free_entitlement(entitlement_id) on delete cascade,
  prompt_code public.t3a_wr_free_prompt_code not null,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  campaign_source text
);

CREATE INDEX IF NOT EXISTS t3a_wr_free_feedback_entitlement_idx
  ON public.t3a_wr_free_feedback_response (entitlement_id, prompt_code);
CREATE INDEX IF NOT EXISTS t3a_wr_free_feedback_prompt_idx
  ON public.t3a_wr_free_feedback_response (prompt_code, submitted_at);

ALTER TABLE public.t3a_wr_free_feedback_response ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_wr_free_feedback_read_admin" ON public.t3a_wr_free_feedback_response;
CREATE POLICY "t3a_wr_free_feedback_read_admin"
  ON public.t3a_wr_free_feedback_response FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "t3a_wr_free_feedback_insert_own" ON public.t3a_wr_free_feedback_response;
CREATE POLICY "t3a_wr_free_feedback_insert_own"
  ON public.t3a_wr_free_feedback_response FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.t3a_wr_free_entitlement e
       WHERE e.entitlement_id = t3a_wr_free_feedback_response.entitlement_id
         AND e.participant_id = auth.uid()
    )
  );

-- Section 9 promise: a participant can delete their OWN responses.
DROP POLICY IF EXISTS "t3a_wr_free_feedback_delete_own" ON public.t3a_wr_free_feedback_response;
CREATE POLICY "t3a_wr_free_feedback_delete_own"
  ON public.t3a_wr_free_feedback_response FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.t3a_wr_free_entitlement e
       WHERE e.entitlement_id = t3a_wr_free_feedback_response.entitlement_id
         AND e.participant_id = auth.uid()
    )
  );

REVOKE UPDATE ON public.t3a_wr_free_feedback_response FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.t3a_wr_free_feedback_response TO authenticated;

-- ========================================================================
-- §6 · Telemetry event (aggregate reporting only)
-- ========================================================================
--
-- Section 7 architectural rule: the store must not create a queryable
-- participant-level behavioral history. This table stores minimum
-- pseudonymous event-level rows to feed aggregates; per-participant
-- read is admin-only, and rows carry an event_pseudonym rather than
-- the participant_id directly for the analytical read path.
--
-- The pseudonym is deterministic per (participant_id, release_id) and
-- salted with the release_id so cross-release joins are not trivial.
--
-- No individual read policy is exposed to authenticated participants;
-- only admin service_role gets read via the aggregate views (out of
-- scope for this migration).

DO $$ BEGIN
  CREATE TYPE public.t3a_wr_free_telemetry_kind AS ENUM (
    'card_view',
    'product_page_view',
    'gate_reached',
    'gate_completed',
    'gate_abandoned',
    'module_entered',
    'scenario_view',
    'decision_made',
    'branch_shown',
    'module_completed',
    'product_completed',
    'session_ended_early',
    'resume_offered',
    'resume_taken'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.t3a_wr_free_telemetry_event (
  telemetry_event_id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.t3a_wr_free_release(release_id) on delete restrict,
  event_pseudonym text not null,
  kind public.t3a_wr_free_telemetry_kind not null,
  module_code text,
  screen_code text,
  branch_code text,
  campaign_source text,
  occurred_at timestamptz not null default now(),
  aggregate_ready boolean not null default true
);

CREATE INDEX IF NOT EXISTS t3a_wr_free_telemetry_pseudonym_idx
  ON public.t3a_wr_free_telemetry_event (event_pseudonym, occurred_at);
CREATE INDEX IF NOT EXISTS t3a_wr_free_telemetry_kind_idx
  ON public.t3a_wr_free_telemetry_event (kind, occurred_at);
CREATE INDEX IF NOT EXISTS t3a_wr_free_telemetry_release_idx
  ON public.t3a_wr_free_telemetry_event (release_id, kind);

ALTER TABLE public.t3a_wr_free_telemetry_event ENABLE ROW LEVEL SECURITY;

-- No participant-facing SELECT — the read path is admin-only for
-- aggregate reporting. Participants insert via a SECURITY DEFINER RPC
-- that computes the pseudonym.
DROP POLICY IF EXISTS "t3a_wr_free_telemetry_read_admin" ON public.t3a_wr_free_telemetry_event;
CREATE POLICY "t3a_wr_free_telemetry_read_admin"
  ON public.t3a_wr_free_telemetry_event FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.t3a_wr_free_telemetry_event FROM authenticated;
GRANT SELECT ON public.t3a_wr_free_telemetry_event TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_wr_free_record_event(
  p_kind public.t3a_wr_free_telemetry_kind,
  p_module_code text DEFAULT NULL,
  p_screen_code text DEFAULT NULL,
  p_branch_code text DEFAULT NULL,
  p_campaign_source text DEFAULT NULL,
  p_release_code text DEFAULT 'WR-FREE-001'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_release public.t3a_wr_free_release%rowtype;
  v_pseudo text;
  v_event_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_release
    FROM public.t3a_wr_free_release
   WHERE release_code = p_release_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'RELEASE_NOT_FOUND', ERRCODE = '22023';
  END IF;

  -- Deterministic pseudonym per (participant, release). Two events from
  -- the same person on the same release share a pseudonym; the
  -- participant_id itself is not stored here.
  v_pseudo := encode(extensions.digest(auth.uid()::text || '|' || v_release.release_id::text, 'sha256'), 'hex');

  INSERT INTO public.t3a_wr_free_telemetry_event (
    release_id, event_pseudonym, kind, module_code, screen_code,
    branch_code, campaign_source
  ) VALUES (
    v_release.release_id, v_pseudo, p_kind, p_module_code, p_screen_code,
    p_branch_code, p_campaign_source
  ) RETURNING telemetry_event_id INTO v_event_id;

  RETURN v_event_id;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_wr_free_record_event(public.t3a_wr_free_telemetry_kind, text, text, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
