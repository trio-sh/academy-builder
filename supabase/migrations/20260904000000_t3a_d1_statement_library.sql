-- T3A-D1-DEV-INS-003 · Statement Library and Deterministic Resolution
-- Service.
--
-- Part Q of the D1 Complete Build Package v1.1.
-- Instruction numbers 068..074.
--
-- Governing rules (all locked, not defaults):
--   * Deterministic resolution — same inputs, same output, every time
--     (INS-003 instruction 068).
--   * Composed statements are IMMUTABLE once written (INS-003 069).
--     The record ties a composed_statement_id to ONE observation, never
--     to an array of clause identifiers.
--   * Refusal is the only response when no pattern matches. No nearest,
--     no fragment composition, no free-text fallback. THERE IS NO
--     DEFAULT (INS-003 070).
--   * Coverage: every reachable answer pattern for a served source
--     resolves to exactly one statement OR to one logged refusal
--     (INS-003 071).
--   * Matching key: the answer_pattern_key stored on
--     t3a_resolution_rule. Until CA-06 v1.0 defines a clause-equivalence
--     key, MATCHING REQUIRES THE SAME t3a_statement_library ROW — no
--     matching is derived from prose.

set search_path = public;

-- ========================================================================
-- §1 · Refusal reason enum
-- ========================================================================

DO $$ BEGIN
  CREATE TYPE public.t3a_resolution_refusal_reason AS ENUM (
    'NO_MATCHING_RULE',
    'MULTIPLE_MATCHING_RULES',
    'LIBRARY_STATEMENT_INACTIVE',
    'ANSWER_PATTERN_INVALID',
    'OBSERVATION_NOT_COMMITTED',
    'FD_D1_09_ROUTE_LANGUAGE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- §2 · t3a_statement_library
-- ========================================================================
--
-- Pre-authored composed-statement rows. One row per approved (dimension,
-- question_set_version, stage_code, statement_key). The variables in
-- statement_body are named placeholders resolved from the observation's
-- served source (never free-text slots).
--
-- Approval and operational-state live on the parent t3a_content_object
-- and t3a_content_version rows (family = 'statement_library'). This
-- table extends those rows with the resolution-facing fields.

CREATE TABLE IF NOT EXISTS public.t3a_statement_library (
  statement_library_id uuid primary key default gen_random_uuid(),
  content_version_id uuid not null references public.t3a_content_version(content_version_id) on delete restrict,
  dimension_id text not null,
  question_set_version text not null,
  stage_code public.t3a_stage_code not null,
  statement_key text not null,
  statement_body text not null,
  bound_variables text[] not null default '{}'::text[],
  bound_condition_renderings jsonb not null default '{}'::jsonb,
  supersedes uuid references public.t3a_statement_library(statement_library_id) on delete restrict,
  retired boolean not null default false,
  created_at timestamptz not null default now(),
  UNIQUE (dimension_id, question_set_version, stage_code, statement_key)
);

CREATE INDEX IF NOT EXISTS t3a_statement_library_dim_stage_idx
  ON public.t3a_statement_library (dimension_id, stage_code);

ALTER TABLE public.t3a_statement_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_statement_library_read" ON public.t3a_statement_library;
CREATE POLICY "t3a_statement_library_read"
  ON public.t3a_statement_library FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_statement_library_write_admin" ON public.t3a_statement_library;
CREATE POLICY "t3a_statement_library_write_admin"
  ON public.t3a_statement_library FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_statement_library TO authenticated;

-- Immutability: once inserted, only the retired flag may flip.  Body and
-- key are never edited in place.  Corrections write a supersedes row.
CREATE OR REPLACE FUNCTION public.t3a_statement_library_immutable()
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

DROP TRIGGER IF EXISTS t3a_statement_library_immutable_trg ON public.t3a_statement_library;
CREATE TRIGGER t3a_statement_library_immutable_trg
  BEFORE UPDATE ON public.t3a_statement_library
  FOR EACH ROW EXECUTE FUNCTION public.t3a_statement_library_immutable();

-- ========================================================================
-- §3 · t3a_resolution_rule
-- ========================================================================
--
-- Deterministic map: an answer pattern (JSONB) resolves to exactly one
-- statement_library row. A pattern is a JSONB object of
-- { question_id: answer_key | [answer_keys] }.  Match rule: every key
-- in answer_pattern must be present in the observation's answers and
-- must match value-for-value (or subset for multi-select).
--
-- The resolution service enforces exactly-one match; two matches raise
-- MULTIPLE_MATCHING_RULES.

CREATE TABLE IF NOT EXISTS public.t3a_resolution_rule (
  resolution_rule_id uuid primary key default gen_random_uuid(),
  dimension_id text not null,
  question_set_version text not null,
  stage_code public.t3a_stage_code not null,
  answer_pattern jsonb not null,
  answer_pattern_key text generated always as (encode(digest(answer_pattern::text, 'sha256'), 'hex')) stored,
  statement_library_id uuid not null references public.t3a_statement_library(statement_library_id) on delete restrict,
  precedence int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  UNIQUE (dimension_id, question_set_version, stage_code, answer_pattern_key)
);

CREATE INDEX IF NOT EXISTS t3a_resolution_rule_dim_stage_idx
  ON public.t3a_resolution_rule (dimension_id, stage_code, active);

ALTER TABLE public.t3a_resolution_rule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_resolution_rule_read" ON public.t3a_resolution_rule;
CREATE POLICY "t3a_resolution_rule_read"
  ON public.t3a_resolution_rule FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "t3a_resolution_rule_write_admin" ON public.t3a_resolution_rule;
CREATE POLICY "t3a_resolution_rule_write_admin"
  ON public.t3a_resolution_rule FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.t3a_resolution_rule TO authenticated;

-- ========================================================================
-- §4 · t3a_composed_statement
-- ========================================================================
--
-- The output of resolution.  One row per (observation_record).  The
-- composed_body is captured with the exact variables the observation's
-- source resolved (t3a_rendered_instance carries the participant-shown
-- surface; this row carries the mentor-facing statement).
--
-- IMMUTABLE.  There is no UPDATE and no DELETE for authenticated. A
-- successful correction produces a NEW t3a_composed_statement row that
-- supersedes the earlier one (INS-006 097 — amendment by supersession).

CREATE TABLE IF NOT EXISTS public.t3a_composed_statement (
  composed_statement_id uuid primary key default gen_random_uuid(),
  observation_record_id uuid not null unique references public.t3a_observation_record(observation_record_id) on delete restrict,
  statement_library_id uuid not null references public.t3a_statement_library(statement_library_id) on delete restrict,
  resolution_rule_id uuid not null references public.t3a_resolution_rule(resolution_rule_id) on delete restrict,
  composed_body text not null,
  answer_pattern_snapshot jsonb not null,
  bound_variable_values jsonb not null default '{}'::jsonb,
  supersedes uuid references public.t3a_composed_statement(composed_statement_id) on delete restrict,
  version_set jsonb not null default '{}'::jsonb,
  composed_at timestamptz not null default now(),
  composed_by uuid
);

CREATE INDEX IF NOT EXISTS t3a_composed_statement_observation_idx
  ON public.t3a_composed_statement (observation_record_id);

ALTER TABLE public.t3a_composed_statement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_composed_statement_read" ON public.t3a_composed_statement;
CREATE POLICY "t3a_composed_statement_read"
  ON public.t3a_composed_statement FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.t3a_observation_record o
       WHERE o.observation_record_id = t3a_composed_statement.observation_record_id
         AND (o.participant_id = auth.uid()
              OR o.observer_id = auth.uid()
              OR o.confirmer_id = auth.uid()
              OR public.is_admin())
    )
  );

-- INSERT only via SECURITY DEFINER function; direct client writes are
-- refused, catching accidental composition from any surface but the
-- resolution service.
REVOKE INSERT, UPDATE, DELETE ON public.t3a_composed_statement FROM authenticated;
GRANT SELECT ON public.t3a_composed_statement TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_composed_statement_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING
    MESSAGE = 'COMPOSED_STATEMENT_IMMUTABLE: a composed statement may not be edited or deleted. Amend by supersession via the correction path.',
    ERRCODE = '22023';
END $$;

DROP TRIGGER IF EXISTS t3a_composed_statement_immutable_trg ON public.t3a_composed_statement;
CREATE TRIGGER t3a_composed_statement_immutable_trg
  BEFORE UPDATE OR DELETE ON public.t3a_composed_statement
  FOR EACH ROW EXECUTE FUNCTION public.t3a_composed_statement_immutable();

-- ========================================================================
-- §5 · t3a_resolution_refusal
-- ========================================================================
--
-- Every refusal is logged.  A committed observation whose answers do
-- not resolve produces a refusal row — never a composed statement.

CREATE TABLE IF NOT EXISTS public.t3a_resolution_refusal (
  resolution_refusal_id uuid primary key default gen_random_uuid(),
  observation_record_id uuid not null references public.t3a_observation_record(observation_record_id) on delete restrict,
  reason public.t3a_resolution_refusal_reason not null,
  detail text,
  answer_pattern_snapshot jsonb not null,
  refused_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS t3a_resolution_refusal_observation_idx
  ON public.t3a_resolution_refusal (observation_record_id);

ALTER TABLE public.t3a_resolution_refusal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "t3a_resolution_refusal_read" ON public.t3a_resolution_refusal;
CREATE POLICY "t3a_resolution_refusal_read"
  ON public.t3a_resolution_refusal FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.t3a_observation_record o
       WHERE o.observation_record_id = t3a_resolution_refusal.observation_record_id
         AND (o.participant_id = auth.uid()
              OR o.observer_id = auth.uid()
              OR o.confirmer_id = auth.uid()
              OR public.is_admin())
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.t3a_resolution_refusal FROM authenticated;
GRANT SELECT ON public.t3a_resolution_refusal TO authenticated;

-- ========================================================================
-- §6 · Resolution service
-- ========================================================================
--
-- t3a_resolve_observation(p_observation_record_id)
--
-- Reads the observation's committed answers from t3a_observation_record.
-- Applies FD-D1-09 language guard for Stage 1 statements. Selects the
-- single active resolution rule whose answer_pattern matches. Writes
-- either t3a_composed_statement (one row) or t3a_resolution_refusal
-- (one row). Never composes from fragments. Never falls back to text.
--
-- Returns the composed_statement_id on success, NULL on refusal.

CREATE OR REPLACE FUNCTION public.t3a_resolve_observation(
  p_observation_record_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_obs public.t3a_observation_record%rowtype;
  v_answers jsonb;
  v_qs_version text;
  v_rule_row public.t3a_resolution_rule%rowtype;
  v_match_count int := 0;
  v_stmt public.t3a_statement_library%rowtype;
  v_composed_id uuid;
  v_body text;
BEGIN
  SELECT * INTO v_obs
    FROM public.t3a_observation_record
   WHERE observation_record_id = p_observation_record_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'OBSERVATION_NOT_FOUND', ERRCODE = '22023';
  END IF;

  IF NOT v_obs.is_committed THEN
    INSERT INTO public.t3a_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
    VALUES (p_observation_record_id, 'OBSERVATION_NOT_COMMITTED', 'Observation must be committed before resolution.', coalesce(v_obs.version_set->'answers', '{}'::jsonb));
    RETURN NULL;
  END IF;

  v_answers := coalesce(v_obs.version_set->'answers', '{}'::jsonb);

  -- FD-D1-09 interim: a Stage 1 statement must not carry route-use
  -- language. If the observation carries an answer for Q-D1-06 at S1
  -- (which cannot happen normally — the question is not served), we
  -- refuse rather than emit language.
  IF v_obs.stage_code = 'S1' AND (v_answers ? 'Q-D1-06') THEN
    INSERT INTO public.t3a_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
    VALUES (p_observation_record_id, 'FD_D1_09_ROUTE_LANGUAGE',
            'Q-D1-06 is not served at Stage 1 under the FD-D1-09 interim; the observation carries an answer that must not be rendered.',
            v_answers);
    RETURN NULL;
  END IF;

  -- Derive the question_set_version from the observation's version_set.
  v_qs_version := coalesce(v_obs.version_set->>'question_set_version', 'v1.0');

  -- Match rules whose answer_pattern is fully satisfied by the answers.
  -- Every key in answer_pattern must exist in the answers with a
  -- matching value.  Single-select values match on equality; multi-
  -- select values match on subset containment.
  FOR v_rule_row IN
    SELECT *
      FROM public.t3a_resolution_rule
     WHERE dimension_id = v_obs.dimension_id
       AND question_set_version = v_qs_version
       AND stage_code = v_obs.stage_code
       AND active = true
     ORDER BY precedence
  LOOP
    IF (
      SELECT bool_and(
        CASE
          WHEN jsonb_typeof(v_rule_row.answer_pattern->key) = 'array'
            THEN v_answers->key <@ (v_rule_row.answer_pattern->key)
          ELSE v_answers->>key = v_rule_row.answer_pattern->>key
        END
      )
      FROM jsonb_object_keys(v_rule_row.answer_pattern) AS key
    ) THEN
      v_match_count := v_match_count + 1;
      IF v_match_count > 1 THEN
        INSERT INTO public.t3a_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
        VALUES (p_observation_record_id, 'MULTIPLE_MATCHING_RULES',
                'More than one active resolution rule matched. The library is not deterministic for this pattern.',
                v_answers);
        RETURN NULL;
      END IF;
      SELECT * INTO v_stmt
        FROM public.t3a_statement_library
       WHERE statement_library_id = v_rule_row.statement_library_id;
    END IF;
  END LOOP;

  IF v_match_count = 0 THEN
    INSERT INTO public.t3a_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
    VALUES (p_observation_record_id, 'NO_MATCHING_RULE',
            'No approved resolution rule matches this answer pattern. Nothing is composed. There is no default.',
            v_answers);
    RETURN NULL;
  END IF;

  IF v_stmt.retired THEN
    INSERT INTO public.t3a_resolution_refusal(observation_record_id, reason, detail, answer_pattern_snapshot)
    VALUES (p_observation_record_id, 'LIBRARY_STATEMENT_INACTIVE',
            'The matched statement library row is retired.',
            v_answers);
    RETURN NULL;
  END IF;

  -- Substitute the bound variables from the observation's version_set.
  v_body := v_stmt.statement_body;
  -- Named placeholders take the form {variable_name} and resolve from
  -- version_set->'bound_variable_values'->name.
  IF v_stmt.bound_variables IS NOT NULL AND array_length(v_stmt.bound_variables, 1) > 0 THEN
    FOR v_rule_row.answer_pattern_key IN
      SELECT unnest(v_stmt.bound_variables)
    LOOP
      v_body := replace(v_body,
        '{' || v_rule_row.answer_pattern_key || '}',
        coalesce(v_obs.version_set->'bound_variable_values'->>v_rule_row.answer_pattern_key, ''));
    END LOOP;
  END IF;

  INSERT INTO public.t3a_composed_statement (
    observation_record_id,
    statement_library_id,
    resolution_rule_id,
    composed_body,
    answer_pattern_snapshot,
    bound_variable_values,
    version_set,
    composed_by,
    composed_at
  ) VALUES (
    p_observation_record_id,
    v_stmt.statement_library_id,
    v_rule_row.resolution_rule_id,
    v_body,
    v_answers,
    coalesce(v_obs.version_set->'bound_variable_values', '{}'::jsonb),
    jsonb_build_object(
      'statement_library_version_id', v_stmt.content_version_id,
      'question_set_version', v_qs_version,
      'observation_version_set', v_obs.version_set
    ),
    coalesce(v_obs.observer_id, auth.uid()),
    now()
  )
  RETURNING composed_statement_id INTO v_composed_id;

  RETURN v_composed_id;

EXCEPTION WHEN unique_violation THEN
  -- Composed statement already exists for this observation record.
  -- Return the existing one; nothing is rewritten.
  SELECT composed_statement_id INTO v_composed_id
    FROM public.t3a_composed_statement
   WHERE observation_record_id = p_observation_record_id;
  RETURN v_composed_id;
END
$$;

GRANT EXECUTE ON FUNCTION public.t3a_resolve_observation(uuid) TO authenticated;

-- ========================================================================
-- §7 · Amendment by supersession
-- ========================================================================
--
-- INS-006 097. A successful correction supersedes the current composed
-- statement with a NEW one; the original is retained and marked as
-- superseded via the successor's `supersedes` field. The service also
-- forbids re-resolving an already-resolved record via
-- t3a_resolve_observation — supersession runs through this dedicated
-- function so the amendment reason is captured.

CREATE OR REPLACE FUNCTION public.t3a_supersede_composed_statement(
  p_prior_composed_statement_id uuid,
  p_amendment_reason text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prior public.t3a_composed_statement%rowtype;
  v_new_composed_id uuid;
  v_new_body text;
BEGIN
  IF p_amendment_reason IS NULL OR btrim(p_amendment_reason) = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'AMENDMENT_REASON_REQUIRED', ERRCODE = '22023';
  END IF;

  SELECT * INTO v_prior
    FROM public.t3a_composed_statement
   WHERE composed_statement_id = p_prior_composed_statement_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'PRIOR_COMPOSED_STATEMENT_NOT_FOUND', ERRCODE = '22023';
  END IF;

  -- Rebuild against the current observation state.
  v_new_composed_id := public.t3a_resolve_observation(v_prior.observation_record_id);

  IF v_new_composed_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AMENDMENT_RESOLUTION_REFUSED: the corrected observation did not resolve', ERRCODE = '22023';
  END IF;

  -- Link the new row to the prior via supersedes.  This is the only
  -- write that touches an existing composed_statement row, and it does
  -- so via a controlled UPDATE that goes through the immutable trigger
  -- disable window.  We use a SECURITY DEFINER path with an
  -- ALTER TRIGGER DISABLE dance, which we deliberately do NOT expose to
  -- callers — this function is the only door.
  BEGIN
    ALTER TABLE public.t3a_composed_statement DISABLE TRIGGER t3a_composed_statement_immutable_trg;
    UPDATE public.t3a_composed_statement
       SET supersedes = p_prior_composed_statement_id
     WHERE composed_statement_id = v_new_composed_id;
  EXCEPTION WHEN OTHERS THEN
    ALTER TABLE public.t3a_composed_statement ENABLE TRIGGER t3a_composed_statement_immutable_trg;
    RAISE;
  END;
  ALTER TABLE public.t3a_composed_statement ENABLE TRIGGER t3a_composed_statement_immutable_trg;

  RETURN v_new_composed_id;
END
$$;

REVOKE EXECUTE ON FUNCTION public.t3a_supersede_composed_statement(uuid, text) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.t3a_supersede_composed_statement(uuid, text) TO service_role;

-- ========================================================================
-- §8 · Coverage matrix view
-- ========================================================================
--
-- The coverage matrix is derived from t3a_resolution_rule. This view
-- expresses coverage per (dimension, question_set_version, stage_code)
-- as a count of active rules. INS-003 instruction 071's exhaustive
-- coverage check is performed by content authoring; the view lets the
-- assurance surface (INS-008) report the state at any moment.

CREATE OR REPLACE VIEW public.t3a_statement_coverage AS
SELECT
  r.dimension_id,
  r.question_set_version,
  r.stage_code,
  count(*) FILTER (WHERE r.active) AS active_rules,
  count(*) FILTER (WHERE r.active = false) AS inactive_rules,
  count(DISTINCT r.statement_library_id) FILTER (WHERE r.active) AS distinct_statements
FROM public.t3a_resolution_rule r
GROUP BY r.dimension_id, r.question_set_version, r.stage_code;

GRANT SELECT ON public.t3a_statement_coverage TO authenticated;

NOTIFY pgrst, 'reload schema';
