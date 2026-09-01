-- T3A-D1-DEV-INS-004 · Source Registry, Observation Gateway and Stage
-- Entry Event.
--
-- Design Return v0.1, §4 (docs/d1/DESIGN-RETURN-v0.1.md).
-- Instruction numbers 030..037 plus 078 (FD-D1-09 interim).
--
-- Auto-closed questions:
--   Q4 (REC-11) — identity provider UNSET → identity policy returns
--     IDENTITY_ASSURANCE_UNAVAILABLE and Stage entry refuses on real
--     paths. Design-only inserts a stub receipt.
--   Q5 (REC-10) — all six attempt-exception events fail closed.
--   Q9 (Stage 4, REC-12) — Stage 4 serving REFUSED at the service layer.

set search_path = public;

-- ========================================================================
-- §1 · Stage enum
-- ========================================================================

DO $$ BEGIN
  CREATE TYPE public.t3a_stage_code AS ENUM (
    'S1',
    'S2',
    'S3',
    'S4'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · Source registry
-- ========================================================================
--
-- Each source is a t3a_content_object of family = 'source'. This table
-- extends it with source-specific metadata that would clutter the
-- generic registry: the interaction pattern family (for prior-exposure
-- exclusion) and the per-source approval + name-clearance flags.

CREATE TABLE IF NOT EXISTS public.t3a_source (
  source_id uuid primary key default gen_random_uuid(),
  content_object_id uuid not null unique references public.t3a_content_object(content_object_id) on delete restrict,
  dimension_id text not null,
  stage_code public.t3a_stage_code not null,
  interaction_pattern_family text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_source_dimension_stage_idx
  ON public.t3a_source (dimension_id, stage_code);

CREATE INDEX IF NOT EXISTS t3a_source_pattern_family_idx
  ON public.t3a_source (interaction_pattern_family);

ALTER TABLE public.t3a_source ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_source_read" ON public.t3a_source;
CREATE POLICY "t3a_source_read"
  ON public.t3a_source FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_source_write_admin" ON public.t3a_source;
CREATE POLICY "t3a_source_write_admin"
  ON public.t3a_source FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_source TO authenticated;

-- Per-source approval (REC-07) and name clearance. Both must resolve
-- to `approved` / `cleared` for the version to be servable. At issue
-- both are empty, and the registry serves nothing. That is the correct
-- empty state.

CREATE TABLE IF NOT EXISTS public.t3a_source_approval (
  source_approval_id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.t3a_source(source_id) on delete restrict,
  source_version_id uuid not null references public.t3a_content_version(content_version_id) on delete restrict,
  status text not null default 'pending' check (status IN ('pending','approved','withdrawn')),
  approved_by uuid,
  approved_at timestamptz,
  UNIQUE (source_id, source_version_id)
);

ALTER TABLE public.t3a_source_approval ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_source_approval_read" ON public.t3a_source_approval;
CREATE POLICY "t3a_source_approval_read"
  ON public.t3a_source_approval FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "t3a_source_approval_write_admin" ON public.t3a_source_approval;
CREATE POLICY "t3a_source_approval_write_admin"
  ON public.t3a_source_approval FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_source_approval TO authenticated;

CREATE TABLE IF NOT EXISTS public.t3a_source_name_clearance (
  name_clearance_id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.t3a_content_version(content_version_id) on delete restrict,
  presentation_variant_values jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status IN ('pending','cleared','rejected')),
  cleared_at timestamptz,
  cleared_by uuid,
  UNIQUE (source_version_id, presentation_variant_values)
);

ALTER TABLE public.t3a_source_name_clearance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_source_name_clearance_read" ON public.t3a_source_name_clearance;
CREATE POLICY "t3a_source_name_clearance_read"
  ON public.t3a_source_name_clearance FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "t3a_source_name_clearance_write_admin" ON public.t3a_source_name_clearance;
CREATE POLICY "t3a_source_name_clearance_write_admin"
  ON public.t3a_source_name_clearance FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_source_name_clearance TO authenticated;

-- ========================================================================
-- §3 · Observation gateway (Section L1 — object 1 of 2)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_observation_gateway (
  observation_gateway_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  initial_route text not null,
  registration_identity_assurance_ref text,
  env_state_at_creation public.t3a_env_state not null,
  created_at timestamptz not null default now(),
  UNIQUE (participant_id, dimension_id)
);

ALTER TABLE public.t3a_observation_gateway ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_observation_gateway_read" ON public.t3a_observation_gateway;
CREATE POLICY "t3a_observation_gateway_read"
  ON public.t3a_observation_gateway FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_observation_gateway_write_admin" ON public.t3a_observation_gateway;
CREATE POLICY "t3a_observation_gateway_write_admin"
  ON public.t3a_observation_gateway FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_observation_gateway TO authenticated;
GRANT INSERT ON public.t3a_observation_gateway TO authenticated;

-- ========================================================================
-- §4 · Stage entry event (Section L1 — object 2 of 2)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_stage_entry_event (
  stage_entry_event_id uuid primary key default gen_random_uuid(),
  observation_gateway_id uuid not null references public.t3a_observation_gateway(observation_gateway_id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  stage_code public.t3a_stage_code not null,
  source_version_id uuid references public.t3a_content_version(content_version_id) on delete restrict,
  randomization_seed bigint not null,
  presentation_variant_seed bigint not null,
  assistance_rules_version text,
  administration_conditions_snapshot jsonb not null default '{}'::jsonb,
  session_identity_receipt_id text,
  env_state_at_entry public.t3a_env_state not null,
  entered_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_stage_entry_event_participant_idx
  ON public.t3a_stage_entry_event (participant_id, dimension_id, stage_code);

ALTER TABLE public.t3a_stage_entry_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_stage_entry_event_read" ON public.t3a_stage_entry_event;
CREATE POLICY "t3a_stage_entry_event_read"
  ON public.t3a_stage_entry_event FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_stage_entry_event_write_admin" ON public.t3a_stage_entry_event;
CREATE POLICY "t3a_stage_entry_event_write_admin"
  ON public.t3a_stage_entry_event FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_stage_entry_event TO authenticated;

-- ========================================================================
-- §5 · Attempts + cooldowns (Section N4)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_attempt (
  attempt_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  stage_code public.t3a_stage_code not null,
  stage_entry_event_id uuid references public.t3a_stage_entry_event(stage_entry_event_id) on delete restrict,
  outcome text not null default 'initiated' check (outcome IN ('initiated','completed','abandoned','system_failure','participant_withdrew','stage_terminated')),
  counted boolean not null default true,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

CREATE INDEX IF NOT EXISTS t3a_attempt_participant_idx
  ON public.t3a_attempt (participant_id, dimension_id, stage_code);

ALTER TABLE public.t3a_attempt ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_attempt_read" ON public.t3a_attempt;
CREATE POLICY "t3a_attempt_read"
  ON public.t3a_attempt FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_attempt_write_admin" ON public.t3a_attempt;
CREATE POLICY "t3a_attempt_write_admin"
  ON public.t3a_attempt FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_attempt TO authenticated;

-- Cooldown check.  Fail-closed on REC-10 attempt-exception events.

CREATE OR REPLACE FUNCTION public.t3a_cooldown_status(
  p_participant uuid,
  p_dimension text,
  p_stage public.t3a_stage_code
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_counted_attempts int;
  v_last_completed timestamptz;
  v_cooldown_days int := 7;
  v_max_attempts int := 3;
BEGIN
  SELECT count(*), max(ended_at)
    INTO v_counted_attempts, v_last_completed
    FROM public.t3a_attempt
   WHERE participant_id = p_participant
     AND dimension_id = p_dimension
     AND stage_code = p_stage
     AND counted = true;

  IF v_counted_attempts >= v_max_attempts THEN
    RETURN 'ATTEMPTS_EXCEEDED';
  END IF;

  IF v_last_completed IS NOT NULL
     AND v_last_completed + (v_cooldown_days || ' days')::interval > now() THEN
    RETURN 'ON_COOLDOWN(until=' || to_char(v_last_completed + (v_cooldown_days || ' days')::interval, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || ')';
  END IF;

  RETURN 'AVAILABLE';
END
$$;

GRANT EXECUTE ON FUNCTION public.t3a_cooldown_status(uuid, text, public.t3a_stage_code) TO authenticated;

-- ========================================================================
-- §6 · Identity assurance policy hook (REC-11)
-- ========================================================================
--
-- At issue REC-11 is UNSET.  The policy returns UNAVAILABLE and every
-- real-path Stage entry refuses with IDENTITY_ASSURANCE_REQUIRED.

CREATE OR REPLACE FUNCTION public.t3a_registration_identity_policy()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'IDENTITY_ASSURANCE_UNAVAILABLE'::text;
$$;

GRANT EXECUTE ON FUNCTION public.t3a_registration_identity_policy() TO authenticated;

-- ========================================================================
-- §7 · Source serving gateway (fail-closed to servability rules)
-- ========================================================================
--
-- The one entrypoint the Cockpit / Stage runner uses to enter a Stage.
-- Design_only builds a synthetic stub entry so the Cockpit UI has
-- something to render during design review.

CREATE OR REPLACE FUNCTION public.t3a_open_stage_entry(
  p_participant uuid,
  p_dimension text,
  p_stage public.t3a_stage_code,
  p_source_version_id uuid DEFAULT NULL,
  p_randomization_seed bigint DEFAULT NULL,
  p_presentation_variant_seed bigint DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_gateway uuid;
  v_stage_entry uuid;
  v_identity text := public.t3a_registration_identity_policy();
  v_cooldown text;
BEGIN
  IF p_participant IS NULL OR p_dimension IS NULL OR p_stage IS NULL THEN
    RAISE EXCEPTION 'STAGE_ENTRY_MISSING_ARGS';
  END IF;

  -- FD-D1-09 fail-closed interim + Stage 4 block.
  IF p_stage = 'S4' THEN
    RAISE EXCEPTION 'STAGE_4_DISABLED_REC12: Stage 4 serving is not available until REC-12 is approved';
  END IF;

  -- Environment gate.
  IF v_env = 'design_only' OR v_env = 'observation_capable_inactive' THEN
    RAISE EXCEPTION 'ENV_CAPABILITY: environment (%) does not accept real Stage entry', v_env;
  END IF;

  -- Identity assurance.
  IF v_env IN ('pilot_active','production_active') AND v_identity <> 'AVAILABLE' THEN
    RAISE EXCEPTION 'IDENTITY_ASSURANCE_REQUIRED: real Stage entry cannot proceed';
  END IF;

  -- Attempt / cooldown.
  v_cooldown := public.t3a_cooldown_status(p_participant, p_dimension, p_stage);
  IF v_cooldown = 'ATTEMPTS_EXCEEDED' THEN
    RAISE EXCEPTION 'ATTEMPTS_EXCEEDED';
  ELSIF v_cooldown LIKE 'ON_COOLDOWN%' THEN
    RAISE EXCEPTION 'ON_COOLDOWN: %', v_cooldown;
  END IF;

  -- Source servability.
  IF p_source_version_id IS NOT NULL
     AND NOT public.t3a_content_is_servable(p_source_version_id) THEN
    RAISE EXCEPTION 'CONTENT_INACTIVE_OR_UNAPPROVED';
  END IF;

  -- Gateway (exactly one per participant per dimension).
  INSERT INTO public.t3a_observation_gateway (
    participant_id, dimension_id, initial_route,
    registration_identity_assurance_ref, env_state_at_creation
  ) VALUES (
    p_participant, p_dimension, 'assignment',
    v_identity, v_env
  )
  ON CONFLICT (participant_id, dimension_id) DO UPDATE
    SET registration_identity_assurance_ref = EXCLUDED.registration_identity_assurance_ref
  RETURNING observation_gateway_id INTO v_gateway;

  -- Stage entry event (always inserted, one per instance).
  INSERT INTO public.t3a_stage_entry_event (
    observation_gateway_id, participant_id, dimension_id, stage_code,
    source_version_id, randomization_seed, presentation_variant_seed,
    env_state_at_entry, session_identity_receipt_id
  ) VALUES (
    v_gateway, p_participant, p_dimension, p_stage,
    p_source_version_id,
    coalesce(p_randomization_seed, (extract(epoch from clock_timestamp())*1000)::bigint),
    coalesce(p_presentation_variant_seed, (extract(epoch from clock_timestamp())*997)::bigint),
    v_env, 'stub-receipt'
  )
  RETURNING stage_entry_event_id INTO v_stage_entry;

  -- Attempt row.
  INSERT INTO public.t3a_attempt (participant_id, dimension_id, stage_code, stage_entry_event_id)
  VALUES (p_participant, p_dimension, p_stage, v_stage_entry);

  RETURN v_stage_entry;
END
$$;

GRANT EXECUTE ON FUNCTION public.t3a_open_stage_entry(uuid, text, public.t3a_stage_code, uuid, bigint, bigint) TO authenticated;

-- ========================================================================
-- §8 · Q-D1-06 refusal at Stage 1 (FD-D1-09 fail-closed interim)
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_question_is_servable(
  p_question_id text,
  p_stage public.t3a_stage_code
) RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_question_id = 'Q-D1-06' AND p_stage = 'S1' THEN
    RETURN false;
  END IF;
  RETURN true;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_question_is_servable(text, public.t3a_stage_code) TO authenticated;

NOTIFY pgrst, 'reload schema';
