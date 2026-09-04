-- T3A-D1-DEV-INS-012 · Stage 1 administration, capture and provenance.
--
-- Instruction numbers 075..082 of Part One §3.
--
-- Governing rules (all locked, not defaults):
--   * AI administration carries full provenance: model_ref,
--     prompt_ref, admin_config_ref, safety_config_ref, ALL VERSIONED
--     via t3a_d1_content_version (INS-012 075).
--   * A Stage 1 observation enters the evidence record ONLY following a
--     valid confirmation by an authorized person (INS-012 076).
--   * The Stage 1 administration note refuses to render unless a valid
--     confirmation record exists for the EXACT source version and
--     session instance, by an actor authorized AT THE TIME
--     (INS-012 077 + acceptance test 079, 080).
--   * FD-D1-09 fail-closed interim: Q-D1-06 is NOT SERVED at Stage 1,
--     and no Stage 1 statement may say the participant `used`, `took`,
--     `followed`, `chose` or `acted through` a route (INS-012 078 +
--     acceptance test 082).
--
-- Guardrails from POST-MORTEM v0.1:
--   * All extension functions schema-qualified (extensions.*).
--   * Every new table verified with a separate SELECT 1 after apply.

set search_path = public;

-- ========================================================================
-- §1 · AI administration run
-- ========================================================================
--
-- One row per AI-administered Stage 1 session attempt. Every provenance
-- pointer references a t3a_d1_content_version row so the exact model,
-- prompt, admin configuration and safety configuration in force can be
-- reconstructed.

CREATE TABLE IF NOT EXISTS public.t3a_d1_ai_administration_run (
  ai_administration_run_id uuid primary key default gen_random_uuid(),
  stage_entry_event_id uuid not null references public.t3a_stage_entry_event(stage_entry_event_id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  source_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  model_ref_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  prompt_ref_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  admin_config_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  safety_config_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  rendered_body text not null,
  rendered_body_hash text generated always as (encode(extensions.digest(rendered_body, 'sha256'), 'hex')) stored,
  env_state_at_run public.t3a_env_state not null,
  run_started_at timestamptz not null default now(),
  run_completed_at timestamptz,
  status text not null default 'in_progress' check (status IN ('in_progress','completed','failed','aborted'))
);

CREATE INDEX IF NOT EXISTS t3a_d1_ai_administration_run_participant_idx
  ON public.t3a_d1_ai_administration_run (participant_id, dimension_id);

CREATE INDEX IF NOT EXISTS t3a_d1_ai_administration_run_stage_entry_idx
  ON public.t3a_d1_ai_administration_run (stage_entry_event_id);

ALTER TABLE public.t3a_d1_ai_administration_run ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_ai_admin_run_read" ON public.t3a_d1_ai_administration_run;
CREATE POLICY "t3a_d1_ai_admin_run_read"
  ON public.t3a_d1_ai_administration_run FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "t3a_d1_ai_admin_run_write_admin" ON public.t3a_d1_ai_administration_run;
CREATE POLICY "t3a_d1_ai_admin_run_write_admin"
  ON public.t3a_d1_ai_administration_run FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_d1_ai_administration_run TO authenticated;

-- Immutability: an administration run is a historical fact.  Only the
-- status may flip once through the terminal transition, and never in a
-- way that alters the rendered body or the provenance pointers.
CREATE OR REPLACE FUNCTION public.t3a_d1_ai_administration_run_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.rendered_body IS DISTINCT FROM NEW.rendered_body)
     OR (OLD.stage_entry_event_id IS DISTINCT FROM NEW.stage_entry_event_id)
     OR (OLD.source_version_id IS DISTINCT FROM NEW.source_version_id)
     OR (OLD.model_ref_version_id IS DISTINCT FROM NEW.model_ref_version_id)
     OR (OLD.prompt_ref_version_id IS DISTINCT FROM NEW.prompt_ref_version_id)
     OR (OLD.admin_config_version_id IS DISTINCT FROM NEW.admin_config_version_id)
     OR (OLD.safety_config_version_id IS DISTINCT FROM NEW.safety_config_version_id) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'AI_ADMIN_RUN_IMMUTABLE: provenance and rendered body are immutable after write',
      ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_d1_ai_administration_run_guard_trg ON public.t3a_d1_ai_administration_run;
CREATE TRIGGER t3a_d1_ai_administration_run_guard_trg
  BEFORE UPDATE ON public.t3a_d1_ai_administration_run
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_ai_administration_run_guard();

-- ========================================================================
-- §2 · Human confirmation record
-- ========================================================================
--
-- A Stage 1 observation cannot enter the record without exactly one
-- valid confirmation. The confirmation is bound to the EXACT stage
-- entry event and the EXACT source version served in that session.
-- Any subsequent change to the source version makes the confirmation
-- stale by definition and it is refused at render time (INS-012 080).

CREATE TABLE IF NOT EXISTS public.t3a_d1_ai_administration_confirmation (
  ai_administration_confirmation_id uuid primary key default gen_random_uuid(),
  ai_administration_run_id uuid not null unique references public.t3a_d1_ai_administration_run(ai_administration_run_id) on delete restrict,
  stage_entry_event_id uuid not null references public.t3a_stage_entry_event(stage_entry_event_id) on delete restrict,
  source_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  confirmed_by uuid not null references public.profiles(id) on delete restrict,
  authority_snapshot_id uuid references public.t3a_authority_snapshot(authority_snapshot_id) on delete restrict,
  confirmed_at timestamptz not null default now(),
  confirmation_note text
);

CREATE INDEX IF NOT EXISTS t3a_d1_ai_admin_confirmation_run_idx
  ON public.t3a_d1_ai_administration_confirmation (ai_administration_run_id);

CREATE INDEX IF NOT EXISTS t3a_d1_ai_admin_confirmation_source_idx
  ON public.t3a_d1_ai_administration_confirmation (source_version_id);

ALTER TABLE public.t3a_d1_ai_administration_confirmation ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_ai_admin_conf_read" ON public.t3a_d1_ai_administration_confirmation;
CREATE POLICY "t3a_d1_ai_admin_conf_read"
  ON public.t3a_d1_ai_administration_confirmation FOR SELECT TO authenticated
  USING (
    confirmed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.t3a_d1_ai_administration_run r
       WHERE r.ai_administration_run_id = t3a_d1_ai_administration_confirmation.ai_administration_run_id
         AND (r.participant_id = auth.uid() OR public.is_admin())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "t3a_d1_ai_admin_conf_write_admin" ON public.t3a_d1_ai_administration_confirmation;
CREATE POLICY "t3a_d1_ai_admin_conf_write_admin"
  ON public.t3a_d1_ai_administration_confirmation FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_d1_ai_administration_confirmation TO authenticated;

-- Confirmation rows are read-only after write. Any withdrawal is a
-- separate refusal event, not an edit.
CREATE OR REPLACE FUNCTION public.t3a_d1_ai_administration_confirmation_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = 'AI_ADMIN_CONFIRMATION_IMMUTABLE: a confirmation may not be edited or deleted. Withdraw the observation via the governed correction path.',
    ERRCODE = '22023';
END $$;

DROP TRIGGER IF EXISTS t3a_d1_ai_administration_confirmation_immutable_trg ON public.t3a_d1_ai_administration_confirmation;
CREATE TRIGGER t3a_d1_ai_administration_confirmation_immutable_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_ai_administration_confirmation
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_ai_administration_confirmation_immutable();

-- ========================================================================
-- §3 · FD-D1-09 language guard
-- ========================================================================
--
-- Scans rendered text for the five verbs that would imply route use
-- under FD-D1-09. Returns the first offending verb it finds, or NULL
-- when the text is clean. Callers refuse to render when the return is
-- non-null.

CREATE OR REPLACE FUNCTION public.t3a_d1_fd_d1_09_route_language_scan(p_text text)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_lower text := lower(coalesce(p_text, ''));
  v_hit text;
BEGIN
  IF v_lower = '' THEN RETURN NULL; END IF;
  FOR v_hit IN
    SELECT verb FROM (VALUES
      ('used'),
      ('took'),
      ('followed'),
      ('chose'),
      ('acted through')
    ) AS blocklist(verb)
    WHERE v_lower ~ ('\m' || regexp_replace(verb, '\s+', '\s+', 'g') || '\M')
  LOOP
    -- Only flag when the verb sits near the word "route" — either verb
    -- appearing before or after within a window of 8 words.
    IF v_lower ~ ('\m' || regexp_replace(v_hit, '\s+', '\s+', 'g') || '\M(\W+\w+){0,8}\W+route\M')
       OR v_lower ~ ('\mroute\M(\W+\w+){0,8}\W+' || regexp_replace(v_hit, '\s+', '\s+', 'g') || '\M') THEN
      RETURN v_hit;
    END IF;
  END LOOP;
  RETURN NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_fd_d1_09_route_language_scan(text) TO authenticated;

-- ========================================================================
-- §4 · Stage 1 note renderer
-- ========================================================================
--
-- Reads the confirmation for a given AI administration run and renders
-- the Stage 1 administration note. Refuses when:
--   * no run row exists                                → RUN_NOT_FOUND
--   * no confirmation exists                           → CONFIRMATION_MISSING (079)
--   * the confirmation's source_version_id has drifted → CONFIRMATION_STALE (080)
--   * the run's rendered body contains route-use verbs → FD_D1_09_ROUTE_LANGUAGE (082)
--   * the environment is design_only/inactive          → ENV_CAPABILITY

CREATE OR REPLACE FUNCTION public.t3a_d1_render_stage1_note(
  p_ai_administration_run_id uuid
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.t3a_d1_ai_administration_run%rowtype;
  v_conf public.t3a_d1_ai_administration_confirmation%rowtype;
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_offending text;
  v_current_source_version_id uuid;
BEGIN
  SELECT * INTO v_run
    FROM public.t3a_d1_ai_administration_run
   WHERE ai_administration_run_id = p_ai_administration_run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'RUN_NOT_FOUND', ERRCODE = '22023';
  END IF;

  IF v_env IN ('design_only','observation_capable_inactive') THEN
    RAISE EXCEPTION USING MESSAGE = 'ENV_CAPABILITY', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_conf
    FROM public.t3a_d1_ai_administration_confirmation
   WHERE ai_administration_run_id = p_ai_administration_run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'CONFIRMATION_MISSING', ERRCODE = '22023';
  END IF;

  -- If the source version bound to the confirmation is no longer the
  -- one the run recorded, the confirmation is stale.
  IF v_conf.source_version_id IS DISTINCT FROM v_run.source_version_id THEN
    RAISE EXCEPTION USING MESSAGE = 'CONFIRMATION_STALE', ERRCODE = '22023';
  END IF;

  -- If the current source-version record has moved on (e.g. superseded
  -- since the confirmation), the note refuses too.
  SELECT source_version_id INTO v_current_source_version_id
    FROM public.t3a_stage_entry_event
   WHERE stage_entry_event_id = v_run.stage_entry_event_id;
  IF v_current_source_version_id IS DISTINCT FROM v_run.source_version_id THEN
    RAISE EXCEPTION USING MESSAGE = 'CONFIRMATION_STALE', ERRCODE = '22023';
  END IF;

  -- FD-D1-09 language scan.
  v_offending := public.t3a_d1_fd_d1_09_route_language_scan(v_run.rendered_body);
  IF v_offending IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'FD_D1_09_ROUTE_LANGUAGE: rendered body contains route-use verb "' || v_offending || '"',
      ERRCODE = '22023';
  END IF;

  RETURN v_run.rendered_body;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_render_stage1_note(uuid) TO authenticated;

-- ========================================================================
-- §5 · Stage 1 confirmation-attaching helper
-- ========================================================================
--
-- Attaches a confirmation to an administration run.  Refuses if:
--   * the actor lacks `confirm` authority for the dimension
--   * a confirmation already exists on the run
--   * the run's rendered body would fail the FD-D1-09 scan

CREATE OR REPLACE FUNCTION public.t3a_d1_confirm_stage1_run(
  p_ai_administration_run_id uuid,
  p_confirmation_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run public.t3a_d1_ai_administration_run%rowtype;
  v_offending text;
  v_conf_id uuid;
BEGIN
  SELECT * INTO v_run
    FROM public.t3a_d1_ai_administration_run
   WHERE ai_administration_run_id = p_ai_administration_run_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'RUN_NOT_FOUND', ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.t3a_role_authorization ra
     WHERE ra.actor_id = auth.uid()
       AND ra.authority = 'confirm'
       AND ra.status = 'granted'
       AND (ra.dimension_id IS NULL OR ra.dimension_id = v_run.dimension_id)
       AND (ra.effective_to IS NULL OR ra.effective_to > now())
  ) THEN
    RAISE EXCEPTION USING MESSAGE = 'INSUFFICIENT_AUTHORIZATION: confirm authority required', ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.t3a_d1_ai_administration_confirmation WHERE ai_administration_run_id = p_ai_administration_run_id) THEN
    RAISE EXCEPTION USING MESSAGE = 'CONFIRMATION_ALREADY_EXISTS', ERRCODE = '22023';
  END IF;

  v_offending := public.t3a_d1_fd_d1_09_route_language_scan(v_run.rendered_body);
  IF v_offending IS NOT NULL THEN
    RAISE EXCEPTION USING
      MESSAGE = 'FD_D1_09_ROUTE_LANGUAGE: cannot confirm — rendered body contains route-use verb "' || v_offending || '"',
      ERRCODE = '22023';
  END IF;

  INSERT INTO public.t3a_d1_ai_administration_confirmation (
    ai_administration_run_id,
    stage_entry_event_id,
    source_version_id,
    confirmed_by,
    confirmation_note
  ) VALUES (
    p_ai_administration_run_id,
    v_run.stage_entry_event_id,
    v_run.source_version_id,
    auth.uid(),
    p_confirmation_note
  )
  RETURNING ai_administration_confirmation_id INTO v_conf_id;

  RETURN v_conf_id;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_confirm_stage1_run(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
