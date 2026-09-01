-- T3A-D1 · Repair migration and canonical namespace.
--
-- Post-mortem: The earlier D1 migrations (20260901..20260904) were
-- applied via a helper that swallowed SQL errors returned as JSON in
-- HTTP-200 bodies. The upshot:
--   * `digest(text, unknown)` failed on Supabase because pgcrypto's
--     digest is in the `extensions` schema, not `public`. Every
--     generated column that used it never landed. That took down
--     t3a_content_version, t3a_resolution_rule and, by cascade, every
--     table referencing them.
--   * Several table names in the D1 design collide with earlier
--     spec-002 placeholders (t3a_statement_library — 279 rows,
--     t3a_composed_statement, t3a_conflict_declaration). CREATE TABLE
--     IF NOT EXISTS silently skipped my rows, and downstream references
--     to columns my design defines but the legacy shape does not carry
--     then failed.
--
-- Fix: adopt the `t3a_d1_*` prefix as the canonical D1 namespace, use
-- extensions.digest, and let the legacy tables stand alongside.  The
-- fixed helper script now surfaces DB errors as failures rather than
-- reporting them "ok".

set search_path = public;

-- ========================================================================
-- §1 · Content version + supporting registries
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_content_version (
  content_version_id uuid primary key default gen_random_uuid(),
  content_object_id uuid not null references public.t3a_content_object(content_object_id) on delete restrict,
  version_no text not null,
  approval_status public.t3a_approval_status not null default 'drafting',
  operational_state public.t3a_operational_state not null default 'not_applicable',
  approved_by uuid,
  approved_at timestamptz,
  effective_at timestamptz,
  superseded_by uuid references public.t3a_d1_content_version(content_version_id) on delete restrict,
  retired_at timestamptz,
  retired_reason text,
  body jsonb not null default '{}'::jsonb,
  body_hash text generated always as (encode(extensions.digest(body::text, 'sha256'), 'hex')) stored,
  created_at timestamptz not null default now(),
  created_by uuid,
  UNIQUE (content_object_id, version_no),
  CONSTRAINT t3a_d1_content_version_approved_complete CHECK (
    approval_status <> 'approved'
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND effective_at IS NOT NULL)
  ),
  CONSTRAINT t3a_d1_content_version_retired_has_reason CHECK (
    approval_status <> 'retired' OR retired_reason IS NOT NULL
  ),
  CONSTRAINT t3a_d1_content_version_superseded_has_successor CHECK (
    approval_status <> 'superseded' OR superseded_by IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS t3a_d1_content_version_object_idx
  ON public.t3a_d1_content_version (content_object_id);
CREATE INDEX IF NOT EXISTS t3a_d1_content_version_status_idx
  ON public.t3a_d1_content_version (approval_status, operational_state);

ALTER TABLE public.t3a_d1_content_version ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_content_version_read" ON public.t3a_d1_content_version;
CREATE POLICY "t3a_d1_content_version_read"
  ON public.t3a_d1_content_version FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "t3a_d1_content_version_insert_admin" ON public.t3a_d1_content_version;
CREATE POLICY "t3a_d1_content_version_insert_admin"
  ON public.t3a_d1_content_version FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "t3a_d1_content_version_update_admin" ON public.t3a_d1_content_version;
CREATE POLICY "t3a_d1_content_version_update_admin"
  ON public.t3a_d1_content_version FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_d1_content_version TO authenticated;

-- Immutability trigger for content-version rows.
CREATE OR REPLACE FUNCTION public.t3a_d1_content_version_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.body IS DISTINCT FROM NEW.body)
     OR (OLD.content_object_id IS DISTINCT FROM NEW.content_object_id)
     OR (OLD.version_no IS DISTINCT FROM NEW.version_no) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'CONTENT_HISTORY_OVERWRITE: version body / identifier is immutable',
      ERRCODE = '22023';
  END IF;
  IF NEW.approval_status = 'approved'
     AND (NEW.approved_by IS NULL OR NEW.approved_at IS NULL OR NEW.effective_at IS NULL) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'APPROVAL_INCOMPLETE: approved requires authority, timestamp and effective date',
      ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_d1_content_version_immutable_trg ON public.t3a_d1_content_version;
CREATE TRIGGER t3a_d1_content_version_immutable_trg
  BEFORE UPDATE ON public.t3a_d1_content_version
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_content_version_immutable();

-- Redirect t3a_content_object.current_version_id at t3a_d1_content_version.
-- The legacy column type is uuid so this is a data-model note only; the
-- FK is not enforced against the new table but the pointer is set by
-- the bind trigger below on approval.

CREATE OR REPLACE FUNCTION public.t3a_d1_content_version_bind_current()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved') THEN
    UPDATE public.t3a_content_object
       SET current_version_id = NEW.content_version_id,
           current_operational_state = NEW.operational_state,
           updated_at = now(),
           updated_by = NEW.approved_by
     WHERE content_object_id = NEW.content_object_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_d1_content_version_bind_current_trg ON public.t3a_d1_content_version;
CREATE TRIGGER t3a_d1_content_version_bind_current_trg
  AFTER UPDATE OF approval_status ON public.t3a_d1_content_version
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_content_version_bind_current();

-- Content is servable predicate — updated to point at the new table.
CREATE OR REPLACE FUNCTION public.t3a_content_is_servable(p_content_version_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.t3a_d1_content_version v
      JOIN public.t3a_content_object o ON o.content_object_id = v.content_object_id
     WHERE v.content_version_id = p_content_version_id
       AND v.approval_status = 'approved'
       AND v.operational_state = 'active'
       AND o.retired_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.t3a_content_is_servable(uuid) TO authenticated;

-- ========================================================================
-- §2 · Rendered instance (uses extensions.digest correctly this time)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_rendered_instance (
  rendered_instance_id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  canonical_source_hash text not null,
  presentation_variant_values jsonb not null default '{}'::jsonb,
  rendered_instance_hash text not null,
  created_at timestamptz not null default now(),
  UNIQUE (source_version_id, rendered_instance_hash)
);

ALTER TABLE public.t3a_d1_rendered_instance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_rendered_instance_read" ON public.t3a_d1_rendered_instance;
CREATE POLICY "t3a_d1_rendered_instance_read"
  ON public.t3a_d1_rendered_instance FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT ON public.t3a_d1_rendered_instance TO authenticated;

-- ========================================================================
-- §3 · Version lineage, change classification, content load event
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_version_lineage (
  version_lineage_id uuid primary key default gen_random_uuid(),
  child_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  parent_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  parent_family public.t3a_content_family not null,
  relation text not null default 'binds',
  created_at timestamptz not null default now(),
  UNIQUE (child_version_id, parent_version_id, parent_family, relation)
);

ALTER TABLE public.t3a_d1_version_lineage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_version_lineage_read" ON public.t3a_d1_version_lineage;
CREATE POLICY "t3a_d1_version_lineage_read"
  ON public.t3a_d1_version_lineage FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT ON public.t3a_d1_version_lineage TO authenticated;

CREATE TABLE IF NOT EXISTS public.t3a_d1_change_classification (
  change_classification_id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  kind public.t3a_change_kind not null,
  calibration_clearance_affecting boolean not null default false,
  prior_clearance_carries_over boolean not null default false,
  supersedes_change_id uuid references public.t3a_d1_change_classification(change_classification_id) on delete restrict,
  actor uuid,
  effective_date timestamptz not null default now(),
  rationale text
);

ALTER TABLE public.t3a_d1_change_classification ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_change_classification_read" ON public.t3a_d1_change_classification;
CREATE POLICY "t3a_d1_change_classification_read"
  ON public.t3a_d1_change_classification FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT ON public.t3a_d1_change_classification TO authenticated;

CREATE TABLE IF NOT EXISTS public.t3a_d1_content_load_event (
  content_load_event_id uuid primary key default gen_random_uuid(),
  env_state public.t3a_env_state not null,
  content_object_id uuid not null references public.t3a_content_object(content_object_id) on delete restrict,
  content_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  governed_status public.t3a_governed_config_status not null,
  loaded_by uuid,
  loaded_at timestamptz not null default now(),
  manifest_id uuid,
  notes text
);

ALTER TABLE public.t3a_d1_content_load_event ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_content_load_event_read" ON public.t3a_d1_content_load_event;
CREATE POLICY "t3a_d1_content_load_event_read"
  ON public.t3a_d1_content_load_event FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT ON public.t3a_d1_content_load_event TO authenticated;

-- ========================================================================
-- §4 · Progression decision (was missing)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_progression_decision (
  progression_decision_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  decision public.t3a_progression_value not null,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  authority_snapshot_id uuid references public.t3a_authority_snapshot(authority_snapshot_id) on delete restrict,
  observation_record_id uuid references public.t3a_observation_record(observation_record_id) on delete restrict,
  cleared_from uuid references public.t3a_d1_progression_decision(progression_decision_id) on delete restrict,
  cleared_at timestamptz,
  cleared_by uuid,
  rationale text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_d1_progression_decision_participant_idx
  ON public.t3a_d1_progression_decision (participant_id, dimension_id, created_at DESC);

ALTER TABLE public.t3a_d1_progression_decision ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_progression_decision_read" ON public.t3a_d1_progression_decision;
CREATE POLICY "t3a_d1_progression_decision_read"
  ON public.t3a_d1_progression_decision FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR recorded_by = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "t3a_d1_progression_decision_insert" ON public.t3a_d1_progression_decision;
CREATE POLICY "t3a_d1_progression_decision_insert"
  ON public.t3a_d1_progression_decision FOR INSERT TO authenticated
  WITH CHECK (recorded_by = auth.uid() OR public.is_admin());

GRANT SELECT, INSERT ON public.t3a_d1_progression_decision TO authenticated;

-- ========================================================================
-- §5 · D1-namespaced conflict declaration (legacy t3a_conflict_declaration
--      carries the earlier spec-002 shape; leave it alone)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_conflict_declaration (
  conflict_declaration_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  target_kind text not null check (target_kind IN ('participant','source_family','organization')),
  target_ref text not null,
  declared_at timestamptz not null default now(),
  rationale text,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS t3a_d1_conflict_declaration_actor_idx
  ON public.t3a_d1_conflict_declaration (actor_id, target_kind, target_ref)
  WHERE revoked_at IS NULL;

ALTER TABLE public.t3a_d1_conflict_declaration ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_conflict_declaration_read" ON public.t3a_d1_conflict_declaration;
CREATE POLICY "t3a_d1_conflict_declaration_read"
  ON public.t3a_d1_conflict_declaration FOR SELECT TO authenticated
  USING (actor_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "t3a_d1_conflict_declaration_insert_self" ON public.t3a_d1_conflict_declaration;
CREATE POLICY "t3a_d1_conflict_declaration_insert_self"
  ON public.t3a_d1_conflict_declaration FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.t3a_d1_conflict_declaration TO authenticated;

-- Update the involvement test to look at the D1 conflict table.
CREATE OR REPLACE FUNCTION public.t3a_involvement_test(
  p_actor_id uuid,
  p_observation_record_id uuid,
  p_requested_authority public.t3a_authority
) RETURNS public.t3a_involvement_reason
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_record public.t3a_observation_record%rowtype;
BEGIN
  SELECT * INTO v_record FROM public.t3a_observation_record WHERE observation_record_id = p_observation_record_id;
  IF NOT FOUND THEN RETURN 'INVOLVEMENT_TEST_HARD_BLOCK'; END IF;

  IF p_requested_authority = 'reconsider' AND v_record.observer_id = p_actor_id THEN
    RETURN 'PRIOR_OBSERVER_OF_RECORD';
  END IF;
  IF p_requested_authority = 'reconsider' AND v_record.confirmer_id = p_actor_id THEN
    RETURN 'PRIOR_CONFIRMER_OF_RECORD';
  END IF;
  IF p_requested_authority = 'reconsider' AND EXISTS (
    SELECT 1 FROM public.t3a_reconsideration_assignment ra
     WHERE ra.observation_record_id = p_observation_record_id
       AND ra.reconsiderer_id = p_actor_id
  ) THEN
    RETURN 'PRIOR_RECONSIDERER_OF_RECORD';
  END IF;
  IF p_requested_authority IN ('confirm','record_progression','evidence_review','issue','reconsider')
     AND v_record.observer_id = p_actor_id THEN
    RETURN 'PRIOR_OBSERVER_OF_RECORD';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.t3a_d1_conflict_declaration
     WHERE actor_id = p_actor_id
       AND target_kind = 'participant'
       AND target_ref = v_record.participant_id::text
       AND revoked_at IS NULL
  ) THEN
    RETURN 'DECLARED_CONFLICT';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_role_authorization ra
     WHERE ra.actor_id = p_actor_id
       AND ra.authority = p_requested_authority
       AND ra.status = 'granted'
       AND (ra.dimension_id IS NULL OR ra.dimension_id = v_record.dimension_id)
       AND (ra.stage_codes = '{}'::text[] OR v_record.stage_code = ANY (ra.stage_codes))
       AND (ra.effective_to IS NULL OR ra.effective_to > now())
  ) THEN
    RETURN 'INSUFFICIENT_AUTHORIZATION';
  END IF;

  RETURN 'ELIGIBLE';
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_involvement_test(uuid, uuid, public.t3a_authority) TO authenticated;

-- ========================================================================
-- §6 · Source approvals + name clearance (both failed silently earlier)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_source_approval (
  source_approval_id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.t3a_source(source_id) on delete restrict,
  source_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  status text not null default 'pending' check (status IN ('pending','approved','withdrawn')),
  approved_by uuid,
  approved_at timestamptz,
  UNIQUE (source_id, source_version_id)
);

ALTER TABLE public.t3a_d1_source_approval ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_source_approval_read" ON public.t3a_d1_source_approval;
CREATE POLICY "t3a_d1_source_approval_read"
  ON public.t3a_d1_source_approval FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT, UPDATE ON public.t3a_d1_source_approval TO authenticated;

CREATE TABLE IF NOT EXISTS public.t3a_d1_source_name_clearance (
  name_clearance_id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  presentation_variant_values jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status IN ('pending','cleared','rejected')),
  cleared_at timestamptz,
  cleared_by uuid,
  UNIQUE (source_version_id, presentation_variant_values)
);

ALTER TABLE public.t3a_d1_source_name_clearance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_source_name_clearance_read" ON public.t3a_d1_source_name_clearance;
CREATE POLICY "t3a_d1_source_name_clearance_read"
  ON public.t3a_d1_source_name_clearance FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT, UPDATE ON public.t3a_d1_source_name_clearance TO authenticated;

-- ========================================================================
-- §7 · D1 statement library, resolution rule, composed statement,
--      resolution refusal (all under the t3a_d1_ prefix so the legacy
--      279-row t3a_statement_library keeps its shape)
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_d1_statement_library (
  statement_library_id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references public.t3a_d1_content_version(content_version_id) on delete restrict,
  dimension_id text not null,
  question_set_version text not null,
  stage_code public.t3a_stage_code not null,
  statement_key text not null,
  statement_body text not null,
  bound_variables text[] not null default '{}'::text[],
  bound_condition_renderings jsonb not null default '{}'::jsonb,
  supersedes uuid references public.t3a_d1_statement_library(statement_library_id) on delete restrict,
  retired boolean not null default false,
  created_at timestamptz not null default now(),
  UNIQUE (dimension_id, question_set_version, stage_code, statement_key)
);

CREATE INDEX IF NOT EXISTS t3a_d1_statement_library_dim_stage_idx
  ON public.t3a_d1_statement_library (dimension_id, stage_code);

ALTER TABLE public.t3a_d1_statement_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_statement_library_read" ON public.t3a_d1_statement_library;
CREATE POLICY "t3a_d1_statement_library_read"
  ON public.t3a_d1_statement_library FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT, UPDATE ON public.t3a_d1_statement_library TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_d1_statement_library_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.statement_body IS DISTINCT FROM NEW.statement_body)
     OR (OLD.statement_key IS DISTINCT FROM NEW.statement_key)
     OR (OLD.dimension_id IS DISTINCT FROM NEW.dimension_id)
     OR (OLD.question_set_version IS DISTINCT FROM NEW.question_set_version)
     OR (OLD.stage_code IS DISTINCT FROM NEW.stage_code)
     OR (OLD.bound_variables IS DISTINCT FROM NEW.bound_variables)
     OR (OLD.bound_condition_renderings IS DISTINCT FROM NEW.bound_condition_renderings) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'STATEMENT_LIBRARY_IMMUTABLE: only the retired flag may be updated in place. Correct by inserting a superseding row.',
      ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_d1_statement_library_immutable_trg ON public.t3a_d1_statement_library;
CREATE TRIGGER t3a_d1_statement_library_immutable_trg
  BEFORE UPDATE ON public.t3a_d1_statement_library
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_statement_library_immutable();

CREATE TABLE IF NOT EXISTS public.t3a_d1_resolution_rule (
  resolution_rule_id uuid primary key default gen_random_uuid(),
  dimension_id text not null,
  question_set_version text not null,
  stage_code public.t3a_stage_code not null,
  answer_pattern jsonb not null,
  answer_pattern_key text generated always as (encode(extensions.digest(answer_pattern::text, 'sha256'), 'hex')) stored,
  statement_library_id uuid not null references public.t3a_d1_statement_library(statement_library_id) on delete restrict,
  precedence int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  UNIQUE (dimension_id, question_set_version, stage_code, answer_pattern_key)
);

CREATE INDEX IF NOT EXISTS t3a_d1_resolution_rule_dim_stage_idx
  ON public.t3a_d1_resolution_rule (dimension_id, stage_code, active);

ALTER TABLE public.t3a_d1_resolution_rule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_resolution_rule_read" ON public.t3a_d1_resolution_rule;
CREATE POLICY "t3a_d1_resolution_rule_read"
  ON public.t3a_d1_resolution_rule FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT, UPDATE ON public.t3a_d1_resolution_rule TO authenticated;

CREATE TABLE IF NOT EXISTS public.t3a_d1_composed_statement (
  composed_statement_id uuid primary key default gen_random_uuid(),
  observation_record_id uuid not null unique references public.t3a_observation_record(observation_record_id) on delete restrict,
  statement_library_id uuid not null references public.t3a_d1_statement_library(statement_library_id) on delete restrict,
  resolution_rule_id uuid not null references public.t3a_d1_resolution_rule(resolution_rule_id) on delete restrict,
  composed_body text not null,
  answer_pattern_snapshot jsonb not null,
  bound_variable_values jsonb not null default '{}'::jsonb,
  supersedes uuid references public.t3a_d1_composed_statement(composed_statement_id) on delete restrict,
  version_set jsonb not null default '{}'::jsonb,
  composed_at timestamptz not null default now(),
  composed_by uuid
);

CREATE INDEX IF NOT EXISTS t3a_d1_composed_statement_observation_idx
  ON public.t3a_d1_composed_statement (observation_record_id);

ALTER TABLE public.t3a_d1_composed_statement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_composed_statement_read" ON public.t3a_d1_composed_statement;
CREATE POLICY "t3a_d1_composed_statement_read"
  ON public.t3a_d1_composed_statement FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.t3a_observation_record o
       WHERE o.observation_record_id = t3a_d1_composed_statement.observation_record_id
         AND (o.participant_id = auth.uid()
              OR o.observer_id = auth.uid()
              OR o.confirmer_id = auth.uid()
              OR public.is_admin())
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.t3a_d1_composed_statement FROM authenticated;
GRANT SELECT ON public.t3a_d1_composed_statement TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_d1_composed_statement_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = 'COMPOSED_STATEMENT_IMMUTABLE: a composed statement may not be edited or deleted. Amend by supersession via the correction path.',
    ERRCODE = '22023';
END $$;

DROP TRIGGER IF EXISTS t3a_d1_composed_statement_immutable_trg ON public.t3a_d1_composed_statement;
CREATE TRIGGER t3a_d1_composed_statement_immutable_trg
  BEFORE UPDATE OR DELETE ON public.t3a_d1_composed_statement
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_composed_statement_immutable();

CREATE TABLE IF NOT EXISTS public.t3a_d1_resolution_refusal (
  resolution_refusal_id uuid primary key default gen_random_uuid(),
  observation_record_id uuid not null references public.t3a_observation_record(observation_record_id) on delete restrict,
  reason public.t3a_resolution_refusal_reason not null,
  detail text,
  answer_pattern_snapshot jsonb not null,
  refused_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_d1_resolution_refusal_observation_idx
  ON public.t3a_d1_resolution_refusal (observation_record_id);

ALTER TABLE public.t3a_d1_resolution_refusal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t3a_d1_resolution_refusal_read" ON public.t3a_d1_resolution_refusal;
CREATE POLICY "t3a_d1_resolution_refusal_read"
  ON public.t3a_d1_resolution_refusal FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.t3a_observation_record o
       WHERE o.observation_record_id = t3a_d1_resolution_refusal.observation_record_id
         AND (o.participant_id = auth.uid()
              OR o.observer_id = auth.uid()
              OR o.confirmer_id = auth.uid()
              OR public.is_admin())
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.t3a_d1_resolution_refusal FROM authenticated;
GRANT SELECT ON public.t3a_d1_resolution_refusal TO authenticated;

-- ========================================================================
-- §8 · Resolution service (points at the D1-namespaced tables)
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_resolve_observation(
  p_observation_record_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_obs public.t3a_observation_record%rowtype;
  v_answers jsonb;
  v_qs_version text;
  v_rule public.t3a_d1_resolution_rule%rowtype;
  v_match_count int := 0;
  v_stmt public.t3a_d1_statement_library%rowtype;
  v_composed_id uuid;
  v_body text;
  v_var text;
BEGIN
  SELECT * INTO v_obs FROM public.t3a_observation_record WHERE observation_record_id = p_observation_record_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'OBSERVATION_NOT_FOUND', ERRCODE = '22023';
  END IF;

  IF NOT v_obs.is_committed THEN
    INSERT INTO public.t3a_d1_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
    VALUES (p_observation_record_id, 'OBSERVATION_NOT_COMMITTED', 'Observation must be committed before resolution.', coalesce(v_obs.version_set->'answers', '{}'::jsonb));
    RETURN NULL;
  END IF;

  v_answers := coalesce(v_obs.version_set->'answers', '{}'::jsonb);
  v_qs_version := coalesce(v_obs.version_set->>'question_set_version', 'v1.0');

  IF v_obs.stage_code = 'S1' AND (v_answers ? 'Q-D1-06') THEN
    INSERT INTO public.t3a_d1_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
    VALUES (p_observation_record_id, 'FD_D1_09_ROUTE_LANGUAGE',
            'Q-D1-06 is not served at Stage 1 under the FD-D1-09 interim; the observation carries an answer that must not be rendered.',
            v_answers);
    RETURN NULL;
  END IF;

  FOR v_rule IN
    SELECT * FROM public.t3a_d1_resolution_rule
     WHERE dimension_id = v_obs.dimension_id
       AND question_set_version = v_qs_version
       AND stage_code = v_obs.stage_code
       AND active = true
     ORDER BY precedence
  LOOP
    IF (
      SELECT bool_and(
        CASE
          WHEN jsonb_typeof(v_rule.answer_pattern->key) = 'array'
            THEN v_answers->key <@ (v_rule.answer_pattern->key)
          ELSE v_answers->>key = v_rule.answer_pattern->>key
        END
      )
      FROM jsonb_object_keys(v_rule.answer_pattern) AS key
    ) THEN
      v_match_count := v_match_count + 1;
      IF v_match_count > 1 THEN
        INSERT INTO public.t3a_d1_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
        VALUES (p_observation_record_id, 'MULTIPLE_MATCHING_RULES', 'More than one active resolution rule matched.', v_answers);
        RETURN NULL;
      END IF;
      SELECT * INTO v_stmt FROM public.t3a_d1_statement_library WHERE statement_library_id = v_rule.statement_library_id;
    END IF;
  END LOOP;

  IF v_match_count = 0 THEN
    INSERT INTO public.t3a_d1_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
    VALUES (p_observation_record_id, 'NO_MATCHING_RULE', 'No approved resolution rule matches this answer pattern.', v_answers);
    RETURN NULL;
  END IF;

  IF v_stmt.retired THEN
    INSERT INTO public.t3a_d1_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
    VALUES (p_observation_record_id, 'LIBRARY_STATEMENT_INACTIVE', 'The matched statement library row is retired.', v_answers);
    RETURN NULL;
  END IF;

  v_body := v_stmt.statement_body;
  IF v_stmt.bound_variables IS NOT NULL AND array_length(v_stmt.bound_variables, 1) > 0 THEN
    FOREACH v_var IN ARRAY v_stmt.bound_variables LOOP
      v_body := replace(v_body, '{' || v_var || '}', coalesce(v_obs.version_set->'bound_variable_values'->>v_var, ''));
    END LOOP;
  END IF;

  INSERT INTO public.t3a_d1_composed_statement (
    observation_record_id, statement_library_id, resolution_rule_id,
    composed_body, answer_pattern_snapshot, bound_variable_values,
    version_set, composed_by
  ) VALUES (
    p_observation_record_id, v_stmt.statement_library_id, v_rule.resolution_rule_id,
    v_body, v_answers, coalesce(v_obs.version_set->'bound_variable_values', '{}'::jsonb),
    jsonb_build_object(
      'statement_library_version_id', v_stmt.content_version_id,
      'question_set_version', v_qs_version,
      'observation_version_set', v_obs.version_set
    ),
    coalesce(v_obs.observer_id, auth.uid())
  )
  RETURNING composed_statement_id INTO v_composed_id;

  RETURN v_composed_id;

EXCEPTION WHEN unique_violation THEN
  SELECT composed_statement_id INTO v_composed_id
    FROM public.t3a_d1_composed_statement WHERE observation_record_id = p_observation_record_id;
  RETURN v_composed_id;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_resolve_observation(uuid) TO authenticated;

CREATE OR REPLACE VIEW public.t3a_d1_statement_coverage AS
SELECT
  r.dimension_id,
  r.question_set_version,
  r.stage_code,
  count(*) FILTER (WHERE r.active) AS active_rules,
  count(*) FILTER (WHERE r.active = false) AS inactive_rules,
  count(DISTINCT r.statement_library_id) FILTER (WHERE r.active) AS distinct_statements
FROM public.t3a_d1_resolution_rule r
GROUP BY r.dimension_id, r.question_set_version, r.stage_code;

GRANT SELECT ON public.t3a_d1_statement_coverage TO authenticated;

NOTIFY pgrst, 'reload schema';
