-- T3A-D1-DEV-INS-005 · Sufficiency and Report Language Gating.
--
-- Instruction numbers 083..092 of Part One §3.
--
-- Governing rules:
--   * Evidence state is derived PER DIMENSION at assembly. There is ONE
--     state for D1. It is NEVER stored on an observation — an
--     observation made in January cannot change because another arrives
--     in March (INS-005 083, 084).
--   * Fourteen controlled language templates with identifiers. Braces
--     mark record-bound variables filled by the service — never free
--     text (INS-005 085).
--   * Prohibited-output check runs ON RENDERED OUTPUT — catches dots,
--     bars, stars, traffic lights, progress/coverage meters, blank-row
--     markers, colour used to signal quality (INS-005 086).
--   * Condition rendering in fixed precedence order. Limitation always
--     stated BEFORE the conduct description (INS-005 087).
--
-- Auto-closes:
--   * FD-D1-03 issuance floor: UNSET. `t3a_d1_issuance_floor` returns
--     `NOT_APPROVED`. `t3a_d1_render_report_language` refuses with
--     ISSUANCE_FLOOR_NOT_MET. When the floor lands, add a row to
--     t3a_d1_issuance_floor_config and repoint the reader.
--   * FD-D1-08 fourth-state frame: NOT AUTHORED. The reader refuses
--     any request for a fourth-state frame with FD_D1_08_FOURTH_STATE.
--   * CA-04 Part C multi-context frame: NO ROWS EXIST. Multi-context
--     comparison requests refuse; separate side-by-side rendering is
--     still permitted (INS-005 acceptance test 091).
--
-- Guardrails: extensions.digest for hashes; per-object verification
-- with SELECT 1 after apply.

set search_path = public;

-- ========================================================================
-- §1 · Evidence state and language-template enums
-- ========================================================================

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_evidence_state AS ENUM (
    'insufficient',
    'single_event',
    'multi_event_same_context',
    'multi_context'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.t3a_d1_report_refusal_reason AS ENUM (
    'ISSUANCE_FLOOR_NOT_APPROVED',
    'ISSUANCE_FLOOR_NOT_MET',
    'STATE_INSUFFICIENT',
    'STATE_DOES_NOT_PERMIT_TEMPLATE',
    'FD_D1_08_FOURTH_STATE',
    'CROSS_CONTEXT_COMPARISON_UNAVAILABLE',
    'PROHIBITED_OUTPUT_DETECTED',
    'ENV_CAPABILITY'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · Language templates
-- ========================================================================
--
-- Fourteen controlled templates with identifiers. Each template names
-- which evidence-state values may render it. Braces `{variable}` mark
-- bound record variables; the render service refuses if a required
-- bound variable is not supplied.

CREATE TABLE IF NOT EXISTS public.t3a_d1_language_template (
  language_template_id text primary key,
  dimension_id text not null default 'D1',
  template_body text not null,
  bound_variables text[] not null default '{}'::text[],
  eligible_states public.t3a_d1_evidence_state[] not null,
  precedence int not null default 100,
  content_version_id uuid references public.t3a_d1_content_version(content_version_id) on delete restrict,
  retired boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_d1_language_template_dimension_idx
  ON public.t3a_d1_language_template (dimension_id);

ALTER TABLE public.t3a_d1_language_template ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_language_template_read" ON public.t3a_d1_language_template;
CREATE POLICY "t3a_d1_language_template_read"
  ON public.t3a_d1_language_template FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "t3a_d1_language_template_write_admin" ON public.t3a_d1_language_template;
CREATE POLICY "t3a_d1_language_template_write_admin"
  ON public.t3a_d1_language_template FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_d1_language_template TO authenticated;

-- Immutability trigger — template body is fixed once approved.
CREATE OR REPLACE FUNCTION public.t3a_d1_language_template_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.template_body IS DISTINCT FROM NEW.template_body)
     OR (OLD.eligible_states IS DISTINCT FROM NEW.eligible_states)
     OR (OLD.bound_variables IS DISTINCT FROM NEW.bound_variables) THEN
    RAISE EXCEPTION USING
      MESSAGE = 'LANGUAGE_TEMPLATE_IMMUTABLE: template body, eligible_states and bound_variables are frozen after write; supersede via a new content version',
      ERRCODE = '22023';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t3a_d1_language_template_immutable_trg ON public.t3a_d1_language_template;
CREATE TRIGGER t3a_d1_language_template_immutable_trg
  BEFORE UPDATE ON public.t3a_d1_language_template
  FOR EACH ROW EXECUTE FUNCTION public.t3a_d1_language_template_immutable();

-- ========================================================================
-- §3 · Issuance floor (FD-D1-03) configuration
-- ========================================================================
--
-- Single-row policy table. `status` is `not_approved` at issue; the
-- render service refuses when this is not `approved`. Setting a
-- minimum_committed_observations of NULL under `not_approved` blocks
-- all issuance.

CREATE TABLE IF NOT EXISTS public.t3a_d1_issuance_floor_config (
  singleton smallint primary key check (singleton = 1) default 1,
  status text not null default 'not_approved' check (status IN ('not_approved','interim','approved')),
  minimum_committed_observations int,
  minimum_distinct_observers int,
  minimum_distinct_stages int,
  approved_by uuid,
  approved_at timestamptz,
  set_at timestamptz not null default now()
);

INSERT INTO public.t3a_d1_issuance_floor_config (singleton, status)
VALUES (1, 'not_approved')
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.t3a_d1_issuance_floor_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_issuance_floor_read" ON public.t3a_d1_issuance_floor_config;
CREATE POLICY "t3a_d1_issuance_floor_read"
  ON public.t3a_d1_issuance_floor_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "t3a_d1_issuance_floor_write_admin" ON public.t3a_d1_issuance_floor_config;
CREATE POLICY "t3a_d1_issuance_floor_write_admin"
  ON public.t3a_d1_issuance_floor_config FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT ON public.t3a_d1_issuance_floor_config TO authenticated;

-- ========================================================================
-- §4 · Prohibited-output scanner (INS-005 086)
-- ========================================================================
--
-- Runs ON RENDERED OUTPUT. Catches:
--   * bullet-glyph density (dots, bars, stars)
--   * emoji / symbol markers commonly used for progress or quality
--   * traffic-light phrases (red/amber/green as evaluative)
--   * progress and coverage phrases (X of Y, percent-complete)
--   * blank-row markers reading as an unmet count

CREATE OR REPLACE FUNCTION public.t3a_d1_prohibited_output_scan(p_text text)
RETURNS text
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v text := coalesce(p_text, '');
  v_lower text := lower(v);
BEGIN
  IF v = '' THEN RETURN NULL; END IF;

  -- Traffic-light phrasing used evaluatively.
  IF v_lower ~ '\m(red|amber|yellow|green)\M\s+(rating|status|light|flag|zone|score|band)\M' THEN
    RETURN 'TRAFFIC_LIGHT';
  END IF;

  -- Progress / coverage phrasing.
  IF v_lower ~ '\m\d+\s*(of|out of|/|\\)\s*\d+\M'
     OR v_lower ~ '\m\d+\s*%\M'
     OR v_lower ~ '\m(percent|percentage)\M'
     OR v_lower ~ '\m(complete|coverage|readiness)\M\s+(score|rating|meter|bar|ring|percent)\M' THEN
    RETURN 'PROGRESS_OR_COVERAGE';
  END IF;

  -- Star / bar / dot glyph density — three or more consecutive.
  IF v ~ '[★☆●◐◑◒◓■□▲▼▶◀]{3,}' THEN
    RETURN 'GLYPH_METER';
  END IF;

  -- Emoji-as-signal.
  IF v ~ '[🟢🟡🔴🟠🟣🔵⚫⚪🟤✅❌⛔🚫🏆🥇🥈🥉]' THEN
    RETURN 'EMOJI_SIGNAL';
  END IF;

  -- Blank-row markers ("—" repeated in what looks like a table row).
  IF v ~ '(—\s*){3,}' OR v ~ '(-\s*){4,}' THEN
    RETURN 'BLANK_ROW_MARKER';
  END IF;

  RETURN NULL;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_prohibited_output_scan(text) TO authenticated;

-- ========================================================================
-- §5 · Evidence-state derivation
-- ========================================================================
--
-- Computed per (participant, dimension) at assembly time. Reads:
--   * how many observations exist with a composed statement
--   * how many distinct observers contributed
--   * how many distinct stages contributed
--
-- Never stored on the observation.

CREATE OR REPLACE FUNCTION public.t3a_d1_evidence_state_for(
  p_participant uuid,
  p_dimension text
) RETURNS public.t3a_d1_evidence_state
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_committed int;
  v_distinct_observers int;
  v_distinct_stages int;
  v_distinct_contexts int;
BEGIN
  SELECT
    count(*),
    count(DISTINCT o.observer_id),
    count(DISTINCT o.stage_code)
  INTO v_committed, v_distinct_observers, v_distinct_stages
  FROM public.t3a_observation_record o
  JOIN public.t3a_d1_composed_statement cs USING (observation_record_id)
  WHERE o.participant_id = p_participant
    AND o.dimension_id = p_dimension
    AND o.is_committed = true;

  IF v_committed = 0 THEN
    RETURN 'insufficient';
  ELSIF v_committed = 1 THEN
    RETURN 'single_event';
  END IF;

  -- Multi-context requires distinct stages AND distinct observers.
  -- Without an authored CA-04 Part C context row, we treat the same
  -- Stage across mentors as same-context; different Stages as
  -- multi-context.
  v_distinct_contexts := v_distinct_stages;
  IF v_distinct_contexts > 1 AND v_distinct_observers > 1 THEN
    RETURN 'multi_context';
  END IF;

  RETURN 'multi_event_same_context';
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_evidence_state_for(uuid, text) TO authenticated;

-- ========================================================================
-- §6 · Report render service
-- ========================================================================
--
-- The one function that renders a participant's D1 report language.
-- Refuses on every unmet gate; every refusal writes to
-- t3a_d1_report_refusal_log for the audit surface (INS-008).

CREATE TABLE IF NOT EXISTS public.t3a_d1_report_refusal_log (
  report_refusal_id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete restrict,
  dimension_id text not null,
  requested_template_id text,
  reason public.t3a_d1_report_refusal_reason not null,
  detail text,
  refused_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_d1_report_refusal_log_participant_idx
  ON public.t3a_d1_report_refusal_log (participant_id, dimension_id, refused_at DESC);

ALTER TABLE public.t3a_d1_report_refusal_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_d1_report_refusal_log_read" ON public.t3a_d1_report_refusal_log;
CREATE POLICY "t3a_d1_report_refusal_log_read"
  ON public.t3a_d1_report_refusal_log FOR SELECT TO authenticated
  USING (participant_id = auth.uid() OR public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.t3a_d1_report_refusal_log FROM authenticated;
GRANT SELECT ON public.t3a_d1_report_refusal_log TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_d1_render_report_language(
  p_participant uuid,
  p_dimension text,
  p_requested_template_id text DEFAULT NULL,
  p_multi_context_comparison boolean DEFAULT false,
  p_fourth_state_frame boolean DEFAULT false
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_floor public.t3a_d1_issuance_floor_config%rowtype;
  v_state public.t3a_d1_evidence_state;
  v_template public.t3a_d1_language_template%rowtype;
  v_body text;
  v_committed int;
  v_distinct_observers int;
  v_distinct_stages int;
  v_prohibited text;
BEGIN
  IF v_env IN ('design_only','observation_capable_inactive') THEN
    INSERT INTO public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
    VALUES (p_participant, p_dimension, p_requested_template_id, 'ENV_CAPABILITY', 'env ' || v_env);
    RETURN NULL;
  END IF;

  -- FD-D1-08 fourth-state frame refusal.
  IF p_fourth_state_frame THEN
    INSERT INTO public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
    VALUES (p_participant, p_dimension, p_requested_template_id, 'FD_D1_08_FOURTH_STATE',
            'Fourth-state frame is not authored while FD-D1-08 is unapproved or unloaded.');
    RETURN NULL;
  END IF;

  -- CA-04 Part C — no counterpart rows exist, refuse comparisons.
  -- Separate side-by-side rendering is still permitted; a comparison
  -- request must be explicit and is what this parameter names.
  IF p_multi_context_comparison THEN
    INSERT INTO public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
    VALUES (p_participant, p_dimension, p_requested_template_id, 'CROSS_CONTEXT_COMPARISON_UNAVAILABLE',
            'CA-04 Part C carries no approved counterpart rows. Comparison is refused; separate side-by-side rendering remains available.');
    RETURN NULL;
  END IF;

  -- Issuance floor gate.
  SELECT * INTO v_floor FROM public.t3a_d1_issuance_floor_config WHERE singleton = 1;
  IF v_floor.status = 'not_approved' THEN
    INSERT INTO public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
    VALUES (p_participant, p_dimension, p_requested_template_id, 'ISSUANCE_FLOOR_NOT_APPROVED',
            'FD-D1-03 issuance floor is not approved. No report may issue.');
    RETURN NULL;
  END IF;

  -- Verify floor is met.
  SELECT
    count(*),
    count(DISTINCT o.observer_id),
    count(DISTINCT o.stage_code)
  INTO v_committed, v_distinct_observers, v_distinct_stages
  FROM public.t3a_observation_record o
  JOIN public.t3a_d1_composed_statement cs USING (observation_record_id)
  WHERE o.participant_id = p_participant
    AND o.dimension_id = p_dimension
    AND o.is_committed = true;

  IF (v_floor.minimum_committed_observations IS NOT NULL AND v_committed < v_floor.minimum_committed_observations)
     OR (v_floor.minimum_distinct_observers IS NOT NULL AND v_distinct_observers < v_floor.minimum_distinct_observers)
     OR (v_floor.minimum_distinct_stages IS NOT NULL AND v_distinct_stages < v_floor.minimum_distinct_stages) THEN
    INSERT INTO public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
    VALUES (p_participant, p_dimension, p_requested_template_id, 'ISSUANCE_FLOOR_NOT_MET',
            format('committed=%s (min %s), observers=%s (min %s), stages=%s (min %s)',
              v_committed, coalesce(v_floor.minimum_committed_observations, 0),
              v_distinct_observers, coalesce(v_floor.minimum_distinct_observers, 0),
              v_distinct_stages, coalesce(v_floor.minimum_distinct_stages, 0)));
    RETURN NULL;
  END IF;

  -- Evidence state at THIS RENDER — not stored.
  v_state := public.t3a_d1_evidence_state_for(p_participant, p_dimension);
  IF v_state = 'insufficient' THEN
    INSERT INTO public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
    VALUES (p_participant, p_dimension, p_requested_template_id, 'STATE_INSUFFICIENT', 'No committed observations.');
    RETURN NULL;
  END IF;

  -- Choose the template. Caller may specify one; if not, we pick the
  -- highest-precedence unretired template eligible for the state.
  IF p_requested_template_id IS NOT NULL THEN
    SELECT * INTO v_template
    FROM public.t3a_d1_language_template
    WHERE language_template_id = p_requested_template_id
      AND retired = false
      AND v_state = ANY(eligible_states);
    IF NOT FOUND THEN
      INSERT INTO public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
      VALUES (p_participant, p_dimension, p_requested_template_id, 'STATE_DOES_NOT_PERMIT_TEMPLATE',
              format('template %s not eligible under state %s', p_requested_template_id, v_state));
      RETURN NULL;
    END IF;
  ELSE
    SELECT * INTO v_template
    FROM public.t3a_d1_language_template
    WHERE dimension_id = p_dimension
      AND retired = false
      AND v_state = ANY(eligible_states)
    ORDER BY precedence
    LIMIT 1;
    IF NOT FOUND THEN
      INSERT INTO public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
      VALUES (p_participant, p_dimension, p_requested_template_id, 'STATE_DOES_NOT_PERMIT_TEMPLATE',
              format('no template eligible under state %s', v_state));
      RETURN NULL;
    END IF;
  END IF;

  v_body := v_template.template_body;
  -- The bound-variable substitution here is deliberately narrow: real
  -- report assembly (INS-007) composes from t3a_d1_composed_statement
  -- rows and passes the substitution context in. This function is the
  -- gate, not the composer.

  v_prohibited := public.t3a_d1_prohibited_output_scan(v_body);
  IF v_prohibited IS NOT NULL THEN
    INSERT INTO public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
    VALUES (p_participant, p_dimension, p_requested_template_id, 'PROHIBITED_OUTPUT_DETECTED', v_prohibited);
    RETURN NULL;
  END IF;

  RETURN v_body;
END $$;

GRANT EXECUTE ON FUNCTION public.t3a_d1_render_report_language(uuid, text, text, boolean, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
