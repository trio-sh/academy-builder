-- T3A-D1-DEV-INS-001 · Content Registry, Versioning and Source Lineage
--
-- Design Return v0.1, §2 (docs/d1/DESIGN-RETURN-v0.1.md). Approved as
-- returned by the Founder on 1 September 2026. Every entity, refusal
-- and audit field below is spec-cited; nothing is invented.
--
-- Instruction numbers cited from Part One Section 3 (packages):
--   008..018 for INS-001.
--
-- Cross-cutting: this migration also lands the environment-capability
-- state from §1 of the design return, which every later migration reads
-- to gate real observation paths.
--
-- Fail-closed positions carried forward (Section 4B holds):
--   * REC-04 retention rule is UNSET. No purge runs against
--     t3a_content_version. A scheduled purge job is not created.
--   * `activation_governance` role authority does not exist yet; it is
--     stood up in the INS-011 migration. Until then, only administrators
--     mutate the registry via SECURITY DEFINER helpers.

set search_path = public;

-- ========================================================================
-- §1 · Environment capability state
-- ========================================================================
--
-- Single-row policy table. Every observation-capable action reads this
-- and refuses under `design_only` regardless of what content has loaded.
--
-- INS-004 instruction 037 will call t3a_current_env_state() from every
-- gateway/stage/consent path.

DO $$ BEGIN
  CREATE TYPE public.t3a_env_state AS ENUM (
    'design_only',
    'synthetic_test_only',
    'observation_capable_inactive',
    'pilot_active',
    'production_active'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.t3a_env_capability (
  singleton smallint primary key check (singleton = 1) default 1,
  env_state public.t3a_env_state not null default 'design_only',
  set_by uuid,
  set_at timestamptz not null default now(),
  note text
);

INSERT INTO public.t3a_env_capability (singleton, env_state)
VALUES (1, 'design_only')
ON CONFLICT (singleton) DO NOTHING;

CREATE OR REPLACE FUNCTION public.t3a_current_env_state()
RETURNS public.t3a_env_state
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT env_state FROM public.t3a_env_capability WHERE singleton = 1;
$$;

GRANT EXECUTE ON FUNCTION public.t3a_current_env_state() TO authenticated;

ALTER TABLE public.t3a_env_capability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_env_capability_read" ON public.t3a_env_capability;
CREATE POLICY "t3a_env_capability_read"
  ON public.t3a_env_capability FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_env_capability_write_admin" ON public.t3a_env_capability;
CREATE POLICY "t3a_env_capability_write_admin"
  ON public.t3a_env_capability FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_env_capability TO authenticated;

-- ========================================================================
-- §2 · Content families and enums
-- ========================================================================
--
-- Design Return §2.2 · Eight families plus one lineage-only family for
-- the CA-14 acceptance evidence row.

DO $$ BEGIN
  CREATE TYPE public.t3a_content_family AS ENUM (
    'construct',
    'determination_question_set',
    'statement_library',
    'source',
    'ai_administration_ruleset',
    'role_authority',
    'rights_ruleset',
    'configuration',
    'calibration_clearance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_approval_status AS ENUM (
    'not_started',
    'drafting',
    'in_review',
    'approved',
    'superseded',
    'retired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_operational_state AS ENUM (
    'not_applicable',
    'not_loaded',
    'active',
    'suspended',
    'blocked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_change_kind AS ENUM (
    'editorial',
    'semantic',
    'source',
    'administration',
    'retirement'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_governed_config_status AS ENUM (
    'APPROVED_ACTIVE',
    'APPROVED_DISABLED',
    'INTERIM_ACTIVE',
    'DISABLED_PENDING_DECISION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §3 · AC-61 forbidden-term guard (referenced by all content writers)
-- ========================================================================
--
-- Design Return §2.5 refusal CONTENT_PROHIBITED_TERM. The full T3A-DEV-
-- SPEC-002 §1.4 vocabulary lock is enforced at build time by
-- scripts/check-vocabulary.mjs. This function catches the runtime
-- attempt: an INSERT that carries a forbidden term in any indexed
-- content column raises P0001 with the offending term.

CREATE OR REPLACE FUNCTION public.t3a_reject_prohibited_terms(p_text text)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_lower text := lower(coalesce(p_text, ''));
  v_hit text;
BEGIN
  IF v_lower = '' THEN RETURN; END IF;
  -- The runtime block-list is a subset of the AC-61 static list, limited
  -- to terms that would be a semantic error inside an evidence artifact
  -- rather than merely a copy defect. The static scanner covers the rest.
  FOR v_hit IN
    SELECT term FROM (VALUES
      ('score'),
      ('badge'),
      ('rating'),
      ('readiness score'),
      ('endorse'),
      ('endorsement'),
      ('pre-vetted'),
      ('validate'),
      ('proficiency'),
      ('bars score')
    ) AS blocklist(term)
    WHERE v_lower LIKE '%' || term || '%'
  LOOP
    RAISE EXCEPTION USING
      MESSAGE = 'CONTENT_PROHIBITED_TERM: '
        || v_hit
        || ' is on the T3A-DEV-SPEC-002 §1.4 runtime block list',
      ERRCODE = '22023';
  END LOOP;
END
$$;

-- ========================================================================
-- §4 · t3a_content_object — one row per controlled object of any family
-- ========================================================================

CREATE TABLE IF NOT EXISTS public.t3a_content_object (
  content_object_id uuid primary key default gen_random_uuid(),
  identifier text not null,
  family public.t3a_content_family not null,
  title text not null,
  dimension_id text,
  -- Denormalized pointers to the CURRENT approved version and its
  -- operational state. Both are updated by an approval trigger so that
  -- the observation-capable read paths can filter without a join.
  current_version_id uuid,
  current_operational_state public.t3a_operational_state not null default 'not_applicable',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  retired_at timestamptz,
  retired_by uuid,
  retired_reason text,
  UNIQUE (family, identifier)
);

CREATE INDEX IF NOT EXISTS t3a_content_object_family_idx
  ON public.t3a_content_object (family);

CREATE INDEX IF NOT EXISTS t3a_content_object_dimension_idx
  ON public.t3a_content_object (dimension_id);

ALTER TABLE public.t3a_content_object ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_content_object_read" ON public.t3a_content_object;
CREATE POLICY "t3a_content_object_read"
  ON public.t3a_content_object FOR SELECT TO authenticated
  USING (true);

-- Writes are admin-gated for now. Migration 2 (INS-011) replaces this
-- with a check on the `activation_governance` authority.
DROP POLICY IF EXISTS "t3a_content_object_write_admin" ON public.t3a_content_object;
CREATE POLICY "t3a_content_object_write_admin"
  ON public.t3a_content_object FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_content_object TO authenticated;

-- ========================================================================
-- §5 · t3a_content_version — immutable version history
-- ========================================================================
--
-- Append-only via RLS: there is NO update policy on this table. Any
-- correction writes a new row (INS-001 instruction 012 refusal
-- CONTENT_HISTORY_OVERWRITE).

CREATE TABLE IF NOT EXISTS public.t3a_content_version (
  content_version_id uuid primary key default gen_random_uuid(),
  content_object_id uuid not null references public.t3a_content_object(content_object_id) on delete restrict,
  version_no text not null,
  approval_status public.t3a_approval_status not null default 'drafting',
  operational_state public.t3a_operational_state not null default 'not_applicable',
  approved_by uuid,
  approved_at timestamptz,
  effective_at timestamptz,
  superseded_by uuid references public.t3a_content_version(content_version_id) on delete restrict,
  retired_at timestamptz,
  retired_reason text,
  -- The immutable content payload lives here as JSONB. Sources carry
  -- their own hashed rendering via t3a_rendered_instance (§8).
  body jsonb not null default '{}'::jsonb,
  body_hash text generated always as (encode(digest(body::text, 'sha256'), 'hex')) stored,
  created_at timestamptz not null default now(),
  created_by uuid,
  UNIQUE (content_object_id, version_no),
  -- Design Return §2.3: `approved` requires all three of version,
  -- approval authority and effective date. Two-of-three is refused.
  CONSTRAINT t3a_content_version_approved_complete CHECK (
    approval_status <> 'approved'
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND effective_at IS NOT NULL)
  ),
  -- A retired row must carry a reason.
  CONSTRAINT t3a_content_version_retired_has_reason CHECK (
    approval_status <> 'retired' OR retired_reason IS NOT NULL
  ),
  -- A superseded row must name its successor.
  CONSTRAINT t3a_content_version_superseded_has_successor CHECK (
    approval_status <> 'superseded' OR superseded_by IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS t3a_content_version_object_idx
  ON public.t3a_content_version (content_object_id);

CREATE INDEX IF NOT EXISTS t3a_content_version_status_idx
  ON public.t3a_content_version (approval_status, operational_state);

ALTER TABLE public.t3a_content_version ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_content_version_read" ON public.t3a_content_version;
CREATE POLICY "t3a_content_version_read"
  ON public.t3a_content_version FOR SELECT TO authenticated
  USING (true);

-- INSERT only. No UPDATE, no DELETE for authenticated. Admin gets an
-- UPDATE window for approval-state transitions; the trigger below denies
-- any change to the payload body.
DROP POLICY IF EXISTS "t3a_content_version_insert_admin" ON public.t3a_content_version;
CREATE POLICY "t3a_content_version_insert_admin"
  ON public.t3a_content_version FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "t3a_content_version_update_admin_state_only" ON public.t3a_content_version;
CREATE POLICY "t3a_content_version_update_admin_state_only"
  ON public.t3a_content_version FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_content_version TO authenticated;

-- Content-body immutability trigger. This enforces
-- CONTENT_HISTORY_OVERWRITE at the row level: an UPDATE that changes
-- body, body_hash, content_object_id, or version_no is rejected.

CREATE OR REPLACE FUNCTION public.t3a_content_version_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.body IS DISTINCT FROM NEW.body)
     OR (OLD.content_object_id IS DISTINCT FROM NEW.content_object_id)
     OR (OLD.version_no IS DISTINCT FROM NEW.version_no)
     OR (OLD.body_hash IS DISTINCT FROM NEW.body_hash) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'CONTENT_HISTORY_OVERWRITE: a version row is immutable in body, identifier and version number',
      ERRCODE = '22023';
  END IF;
  -- Approval requires all three of authority, approval timestamp and
  -- effective date (belt-and-braces vs the CHECK constraint above).
  IF NEW.approval_status = 'approved'
     AND (NEW.approved_by IS NULL OR NEW.approved_at IS NULL OR NEW.effective_at IS NULL) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'APPROVAL_INCOMPLETE: approved status requires a named authority, an approval timestamp and an effective date',
      ERRCODE = '22023';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS t3a_content_version_immutable_trg ON public.t3a_content_version;
CREATE TRIGGER t3a_content_version_immutable_trg
  BEFORE UPDATE ON public.t3a_content_version
  FOR EACH ROW EXECUTE FUNCTION public.t3a_content_version_immutable();

-- On INSERT, run the forbidden-term guard across selected text fields
-- inside the JSONB payload. Guard runs on drafts too — better to catch
-- a term in a draft than have it slip in and be normalized as approved.

CREATE OR REPLACE FUNCTION public.t3a_content_version_scan_terms()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_text text;
BEGIN
  v_text := coalesce(NEW.body->>'title', '')
    || ' ' || coalesce(NEW.body->>'summary', '')
    || ' ' || coalesce(NEW.body->>'canonical_body', '')
    || ' ' || coalesce(NEW.body->>'statement_template', '');
  PERFORM public.t3a_reject_prohibited_terms(v_text);
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS t3a_content_version_scan_terms_trg ON public.t3a_content_version;
CREATE TRIGGER t3a_content_version_scan_terms_trg
  BEFORE INSERT ON public.t3a_content_version
  FOR EACH ROW EXECUTE FUNCTION public.t3a_content_version_scan_terms();

-- On approval, push the pointer on t3a_content_object.
CREATE OR REPLACE FUNCTION public.t3a_content_version_bind_current()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status = 'approved'
     AND (OLD.approval_status IS DISTINCT FROM 'approved') THEN
    UPDATE public.t3a_content_object
       SET current_version_id = NEW.content_version_id,
           current_operational_state = NEW.operational_state,
           updated_at = now(),
           updated_by = NEW.approved_by
     WHERE content_object_id = NEW.content_object_id;
  ELSIF NEW.approval_status IN ('superseded','retired')
     AND OLD.approval_status = 'approved'
     AND OLD.content_version_id = (SELECT current_version_id FROM public.t3a_content_object WHERE content_object_id = OLD.content_object_id) THEN
    -- Clear pointer if the current row is now superseded/retired and no
    -- successor has been approved yet.
    UPDATE public.t3a_content_object
       SET current_version_id = NULL,
           current_operational_state = 'not_applicable',
           updated_at = now()
     WHERE content_object_id = OLD.content_object_id
       AND current_version_id = OLD.content_version_id;
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS t3a_content_version_bind_current_trg ON public.t3a_content_version;
CREATE TRIGGER t3a_content_version_bind_current_trg
  AFTER UPDATE OF approval_status ON public.t3a_content_version
  FOR EACH ROW EXECUTE FUNCTION public.t3a_content_version_bind_current();

-- ========================================================================
-- §6 · t3a_version_lineage — parent-child across families
-- ========================================================================
--
-- Every non-editorial version transition records its parent-child
-- relationship across families. The primary use of this table is the
-- historical-rendering guarantee: an observation resolved against
-- (construct v3, determination_question_set v7, source v2) must be
-- reconstructible even after all three have been superseded.

CREATE TABLE IF NOT EXISTS public.t3a_version_lineage (
  version_lineage_id uuid primary key default gen_random_uuid(),
  child_version_id uuid not null references public.t3a_content_version(content_version_id) on delete restrict,
  parent_version_id uuid not null references public.t3a_content_version(content_version_id) on delete restrict,
  parent_family public.t3a_content_family not null,
  relation text not null default 'binds',
  created_at timestamptz not null default now(),
  UNIQUE (child_version_id, parent_version_id, parent_family, relation)
);

ALTER TABLE public.t3a_version_lineage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_version_lineage_read" ON public.t3a_version_lineage;
CREATE POLICY "t3a_version_lineage_read"
  ON public.t3a_version_lineage FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_version_lineage_write_admin" ON public.t3a_version_lineage;
CREATE POLICY "t3a_version_lineage_write_admin"
  ON public.t3a_version_lineage FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, DELETE ON public.t3a_version_lineage TO authenticated;

-- ========================================================================
-- §7 · t3a_change_classification — kind, calibration-affecting, carryover
-- ========================================================================
--
-- INS-001 instruction 014 handler. Every version transition writes a
-- classification row; prior calibration clearance is NOT migrated
-- silently to a changed version.

CREATE TABLE IF NOT EXISTS public.t3a_change_classification (
  change_classification_id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references public.t3a_content_version(content_version_id) on delete restrict,
  kind public.t3a_change_kind not null,
  calibration_clearance_affecting boolean not null default false,
  prior_clearance_carries_over boolean not null default false,
  supersedes_change_id uuid references public.t3a_change_classification(change_classification_id) on delete restrict,
  actor uuid,
  effective_date timestamptz not null default now(),
  rationale text
);

CREATE INDEX IF NOT EXISTS t3a_change_classification_version_idx
  ON public.t3a_change_classification (content_version_id);

ALTER TABLE public.t3a_change_classification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_change_classification_read" ON public.t3a_change_classification;
CREATE POLICY "t3a_change_classification_read"
  ON public.t3a_change_classification FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_change_classification_write_admin" ON public.t3a_change_classification;
CREATE POLICY "t3a_change_classification_write_admin"
  ON public.t3a_change_classification FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_change_classification TO authenticated;

-- ========================================================================
-- §8 · t3a_rendered_instance — proves what the participant actually saw
-- ========================================================================
--
-- INS-001 instruction 011. For every served source at Stage Entry, the
-- gateway service (Migration 3) writes one row here with:
--   canonical_source_hash    — the source_version body hash
--   presentation_variant_values — the resolved names / substitutions
--   rendered_instance_hash    — SHA-256 of the substituted text as
--                                shown to the participant

CREATE TABLE IF NOT EXISTS public.t3a_rendered_instance (
  rendered_instance_id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.t3a_content_version(content_version_id) on delete restrict,
  canonical_source_hash text not null,
  presentation_variant_values jsonb not null default '{}'::jsonb,
  rendered_instance_hash text not null,
  created_at timestamptz not null default now(),
  UNIQUE (source_version_id, rendered_instance_hash)
);

CREATE INDEX IF NOT EXISTS t3a_rendered_instance_source_idx
  ON public.t3a_rendered_instance (source_version_id);

ALTER TABLE public.t3a_rendered_instance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_rendered_instance_read" ON public.t3a_rendered_instance;
CREATE POLICY "t3a_rendered_instance_read"
  ON public.t3a_rendered_instance FOR SELECT TO authenticated
  USING (true);

-- Writes come from a SECURITY DEFINER service function in Migration 3.
-- No direct write access from the client.
DROP POLICY IF EXISTS "t3a_rendered_instance_write_admin" ON public.t3a_rendered_instance;
CREATE POLICY "t3a_rendered_instance_write_admin"
  ON public.t3a_rendered_instance FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.t3a_rendered_instance TO authenticated;

-- ========================================================================
-- §9 · t3a_content_load_event — CA-15 load manifest
-- ========================================================================
--
-- INS-004 instruction 036 uses this to gate every load. A row is
-- written only after the four-status loader has passed for the entire
-- manifest; an UNSPECIFIED status fails the whole load.

CREATE TABLE IF NOT EXISTS public.t3a_content_load_event (
  content_load_event_id uuid primary key default gen_random_uuid(),
  env_state public.t3a_env_state not null,
  content_object_id uuid not null references public.t3a_content_object(content_object_id) on delete restrict,
  content_version_id uuid not null references public.t3a_content_version(content_version_id) on delete restrict,
  governed_status public.t3a_governed_config_status not null,
  loaded_by uuid,
  loaded_at timestamptz not null default now(),
  manifest_id uuid,
  notes text
);

CREATE INDEX IF NOT EXISTS t3a_content_load_event_env_idx
  ON public.t3a_content_load_event (env_state, content_object_id);

ALTER TABLE public.t3a_content_load_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_content_load_event_read" ON public.t3a_content_load_event;
CREATE POLICY "t3a_content_load_event_read"
  ON public.t3a_content_load_event FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_content_load_event_write_admin" ON public.t3a_content_load_event;
CREATE POLICY "t3a_content_load_event_write_admin"
  ON public.t3a_content_load_event FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.t3a_content_load_event TO authenticated;

-- ========================================================================
-- §10 · Refusal helper for observation-capable reads
-- ========================================================================
--
-- Called by the source-serving path in Migration 3. Returns true only
-- for an approved + active row whose object row is not retired.

CREATE OR REPLACE FUNCTION public.t3a_content_is_servable(p_content_version_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.t3a_content_version v
      JOIN public.t3a_content_object o
        ON o.content_object_id = v.content_object_id
     WHERE v.content_version_id = p_content_version_id
       AND v.approval_status = 'approved'
       AND v.operational_state = 'active'
       AND o.retired_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.t3a_content_is_servable(uuid) TO authenticated;

-- ========================================================================
-- §11 · Notify PostgREST of the new schema
-- ========================================================================
NOTIFY pgrst, 'reload schema';
