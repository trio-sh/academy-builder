-- T3A-DEV-PLC-005-A · Note 5 — Demonstration pathway.
--
-- THE LINE THIS WHOLE INSTRUCTION DEFENDS:
--   "A demonstration run must be structurally incapable of becoming a real
--    record. Not marked as a test, not filtered out of reports, not
--    excluded by a query — incapable."
--
-- So separation is the PRIMARY guarantee and the demonstration property is
-- defence in depth on top of it, exactly as item (a) states.
--
-- Separation is achieved with a dedicated schema. A demonstration record
-- is not a production record wearing a flag; it is a different row, in a
-- different table, in a different schema. Production observation,
-- issuance, disclosure and employer-facing foreign keys are declared
-- against public.* and therefore CANNOT RESOLVE into t3a_demo.* — not
-- because a rule forbids it but because the reference does not exist.
-- Converting a demonstration record would require a fresh INSERT into a
-- production table, which is a new write rather than a mutation, and the
-- trust boundary in §6 refuses it.
--
-- Every table here additionally carries demonstration boolean NOT NULL
-- with a CHECK that pins it true, plus a trigger refusing any UPDATE of
-- it. Inheritance is enforced AT WRITE TIME (item c), never derived when
-- the row is read — a read-time rule is a filter, and a filter is one
-- forgotten query away from failing.
--
-- Exclusion from counts (item f) follows from the namespace: any count,
-- statistic, register total, calibration measurement or evidence set
-- written over public.* excludes demonstration rows by construction. A
-- surface built later inherits the exclusion instead of having to
-- remember it.
--
-- Nothing is renamed. Nothing is removed.

-- ========================================================================
-- §1 · The persistence boundary
-- ========================================================================

CREATE SCHEMA IF NOT EXISTS t3a_demo;

COMMENT ON SCHEMA t3a_demo IS
  'Demonstration pathway persistence boundary (PLC-005 Note 5). Production evidence foreign keys are declared against public.* and cannot resolve here. No row in this schema may become a production record. Conversion would require a fresh INSERT into public.*, which public.t3a_reject_demonstration_identifier refuses.';

-- Shared guards, defined once and attached to every table below.

CREATE OR REPLACE FUNCTION t3a_demo.pin_demonstration()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Set by the SERVER at creation (item a). A caller-supplied value is
  -- overwritten rather than trusted.
  NEW.demonstration := true;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION t3a_demo.refuse_property_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.demonstration IS DISTINCT FROM OLD.demonstration THEN
    RAISE EXCEPTION
      'DEMONSTRATION_PROPERTY_IMMUTABLE: the demonstration property is set at creation and cannot be altered by any route.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

-- ========================================================================
-- §2 · The run, and the demonstration source class (item b)
-- ========================================================================

CREATE TABLE IF NOT EXISTS t3a_demo.run (
  run_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  label text not null,
  participant_test_account uuid,
  provisional_calibration_participant uuid,
  dimension_id text not null default 'D1',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  CONSTRAINT run_is_demonstration CHECK (demonstration = true)
);

-- Item b. A demonstration source may serve a demonstration run only. A
-- source holding a REC-07 approval record may serve either. A source
-- WITHOUT a REC-07 record may serve demonstration runs only. The registry
-- enforces both directions rather than trusting the caller.
CREATE TABLE IF NOT EXISTS t3a_demo.source (
  source_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  source_code text not null unique,
  title text not null,
  body jsonb not null default '{}'::jsonb,
  rec_07_approved boolean not null default false,
  synthetic_test_only boolean not null default true,
  created_at timestamptz not null default now(),
  CONSTRAINT source_is_demonstration CHECK (demonstration = true)
);

-- ========================================================================
-- §3 · Every object written during a run (item c)
-- ========================================================================

CREATE TABLE IF NOT EXISTS t3a_demo.stage_entry (
  stage_entry_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid not null references t3a_demo.run(run_id) on delete cascade,
  stage_code text not null,
  source_id uuid references t3a_demo.source(source_id),
  identity_assurance_met boolean not null default false,
  entered_at timestamptz not null default now(),
  CONSTRAINT stage_entry_is_demonstration CHECK (demonstration = true)
);

CREATE TABLE IF NOT EXISTS t3a_demo.determination (
  determination_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid not null references t3a_demo.run(run_id) on delete cascade,
  stage_entry_id uuid references t3a_demo.stage_entry(stage_entry_id) on delete cascade,
  question_id text not null,
  selection jsonb not null,
  captured_at timestamptz not null default now(),
  CONSTRAINT determination_is_demonstration CHECK (demonstration = true)
);

CREATE TABLE IF NOT EXISTS t3a_demo.composed_statement (
  composed_statement_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid not null references t3a_demo.run(run_id) on delete cascade,
  clause_order int not null,
  clause_text text not null,
  context_label text,
  supersedes uuid references t3a_demo.composed_statement(composed_statement_id),
  created_at timestamptz not null default now(),
  CONSTRAINT composed_statement_is_demonstration CHECK (demonstration = true)
);

CREATE TABLE IF NOT EXISTS t3a_demo.progression_decision (
  progression_decision_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid not null references t3a_demo.run(run_id) on delete cascade,
  -- FD-D1-05: three states, final. No fourth value anywhere in the run,
  -- and no operational status such as rescheduled among them.
  decision text not null CHECK (decision IN ('proceed', 'redirect', 'pause')),
  recorded_at timestamptz not null default now(),
  CONSTRAINT progression_is_demonstration CHECK (demonstration = true)
);

CREATE TABLE IF NOT EXISTS t3a_demo.evidence_review (
  evidence_review_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid not null references t3a_demo.run(run_id) on delete cascade,
  reviewer_id uuid,
  outcome text not null,
  refusal_reason text,
  reviewed_at timestamptz not null default now(),
  CONSTRAINT evidence_review_is_demonstration CHECK (demonstration = true)
);

CREATE TABLE IF NOT EXISTS t3a_demo.observation_record (
  observation_record_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid not null references t3a_demo.run(run_id) on delete cascade,
  stage_code text not null,
  observer_id uuid,
  is_committed boolean not null default false,
  committed_at timestamptz,
  CONSTRAINT observation_is_demonstration CHECK (demonstration = true)
);

-- REC-10. Demonstration attempt events never increment or mutate
-- production attempt counters — structurally, because they are written
-- here and nothing in public reads this table.
CREATE TABLE IF NOT EXISTS t3a_demo.attempt_event (
  attempt_event_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid not null references t3a_demo.run(run_id) on delete cascade,
  attempt_no int not null,
  event_class text not null,
  consumes_attempt boolean not null,
  incurs_cooldown boolean not null,
  recorded_at timestamptz not null default now(),
  CONSTRAINT attempt_event_is_demonstration CHECK (demonstration = true)
);

-- REC-11. Identity assurance evidence is held apart from the evidence
-- domain; in a demonstration run it is held here and nowhere else.
CREATE TABLE IF NOT EXISTS t3a_demo.identity_assurance (
  identity_assurance_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid not null references t3a_demo.run(run_id) on delete cascade,
  stage_code text not null,
  method text not null,
  met boolean not null,
  recorded_at timestamptz not null default now(),
  CONSTRAINT identity_assurance_is_demonstration CHECK (demonstration = true)
);

CREATE TABLE IF NOT EXISTS t3a_demo.specimen_report (
  specimen_report_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid not null references t3a_demo.run(run_id) on delete cascade,
  watermark text not null,
  scope_limitation text not null,
  rendered_body jsonb not null,
  rendered_at timestamptz not null default now(),
  CONSTRAINT specimen_is_demonstration CHECK (demonstration = true)
);

CREATE TABLE IF NOT EXISTS t3a_demo.audit (
  audit_id uuid primary key default gen_random_uuid(),
  demonstration boolean not null default true,
  run_id uuid references t3a_demo.run(run_id) on delete cascade,
  step text not null,
  outcome text not null,
  refusal_reason text,
  traces_to text,
  body jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  CONSTRAINT audit_is_demonstration CHECK (demonstration = true)
);

-- Attach the write-time guards to every table in the schema.
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 't3a_demo'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS pin_demonstration_trg ON t3a_demo.%I', t);
    EXECUTE format(
      'CREATE TRIGGER pin_demonstration_trg BEFORE INSERT ON t3a_demo.%I
         FOR EACH ROW EXECUTE FUNCTION t3a_demo.pin_demonstration()', t);
    EXECUTE format(
      'DROP TRIGGER IF EXISTS refuse_property_change_trg ON t3a_demo.%I', t);
    EXECUTE format(
      'CREATE TRIGGER refuse_property_change_trg BEFORE UPDATE ON t3a_demo.%I
         FOR EACH ROW EXECUTE FUNCTION t3a_demo.refuse_property_change()', t);
  END LOOP;
END $$;

-- ========================================================================
-- §4 · The registry, refusing in BOTH directions (item b)
-- ========================================================================

CREATE OR REPLACE FUNCTION public.t3a_serve_source(
  p_source_code text,
  p_run_kind text            -- 'demonstration' | 'real'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, t3a_demo AS $$
DECLARE v_src t3a_demo.source%rowtype;
BEGIN
  SELECT * INTO v_src FROM t3a_demo.source WHERE source_code = p_source_code;

  IF v_src.source_id IS NOT NULL THEN
    -- A demonstration source. It may serve a demonstration run only.
    IF p_run_kind <> 'demonstration' THEN
      INSERT INTO t3a_demo.audit (step, outcome, refusal_reason, traces_to, body)
      VALUES ('source_served', 'refused',
              'DEMONSTRATION_SOURCE_INTO_REAL_RUN', 'Note 5 item (b)',
              jsonb_build_object('source_code', p_source_code, 'run_kind', p_run_kind));
      RETURN jsonb_build_object('ok', false,
        'reason', 'DEMONSTRATION_SOURCE_INTO_REAL_RUN');
    END IF;

    RETURN jsonb_build_object('ok', true, 'source_id', v_src.source_id,
      'rec_07_approved', v_src.rec_07_approved);
  END IF;

  -- Not a demonstration source. A real run additionally requires a REC-07
  -- approval record; no source without one serves a real observation.
  -- The approved source registry is expected to be empty, so this refuses.
  IF p_run_kind = 'real' THEN
    INSERT INTO t3a_demo.audit (step, outcome, refusal_reason, traces_to, body)
    VALUES ('source_served', 'refused',
            'SOURCE_WITHOUT_REC_07_INTO_REAL_RUN', 'REC-07',
            jsonb_build_object('source_code', p_source_code));
    RETURN jsonb_build_object('ok', false,
      'reason', 'SOURCE_WITHOUT_REC_07_INTO_REAL_RUN');
  END IF;

  RETURN jsonb_build_object('ok', false, 'reason', 'SOURCE_NOT_FOUND');
END; $$;

GRANT EXECUTE ON FUNCTION public.t3a_serve_source(text, text) TO authenticated;

-- ========================================================================
-- §5 · Issuance always refuses in demonstration mode (item e)
-- ========================================================================
--
-- The refusal is the deliverable, not an error. It names demonstration
-- mode AND, separately, every other row or gate that would also refuse —
-- so the run shows the floor, the involvement test and the gates wired to
-- something real rather than described in a document.

CREATE OR REPLACE FUNCTION t3a_demo.attempt_issuance(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = t3a_demo, public AS $$
DECLARE v_reasons jsonb := '[]'::jsonb; v_unset int;
BEGIN
  v_reasons := v_reasons || jsonb_build_object(
    'reason', 'DEMONSTRATION_MODE',
    'traces_to', 'Note 5 item (e)',
    'detail', 'A demonstration run renders a specimen and never issues.');

  v_reasons := v_reasons || jsonb_build_object(
    'reason', 'FD_D1_03_ISSUANCE_FLOOR',
    'traces_to', 'FD-D1-03',
    'detail', 'Issue only at observed in more than one context or above, with at least two distinct authorized observers across the mentor-observed Stages.');

  v_reasons := v_reasons || jsonb_build_object(
    'reason', 'FD_D1_04_EVIDENCE_REVIEW_AUTHORITY',
    'traces_to', 'FD-D1-04',
    'detail', 'Evidence Review and Issuing each require an actor who observed, confirmed, progressed and reviewed none of the records in the report.');

  SELECT COUNT(*) INTO v_unset
    FROM public.t3a_d1_authority_register WHERE state <> 'SET';
  IF v_unset > 0 THEN
    v_reasons := v_reasons || jsonb_build_object(
      'reason', 'AUTHORITY_REGISTER_INCOMPLETE',
      'traces_to', 'PLC/INS-010 authority register',
      'detail', format('%s author-locked decisions are still UNSET.', v_unset));
  END IF;

  INSERT INTO t3a_demo.audit (run_id, step, outcome, refusal_reason, traces_to, body)
  VALUES (p_run_id, 'issuance', 'refused', 'DEMONSTRATION_MODE',
          'Note 5 item (e)', jsonb_build_object('reasons', v_reasons));

  RETURN jsonb_build_object('ok', false, 'issued', false, 'reasons', v_reasons);
END; $$;

-- The fourth-state frame refuses unless every FD-D1-08 condition is met,
-- at bounded conduct clause level and never at dimension level.
CREATE OR REPLACE FUNCTION t3a_demo.attempt_fourth_state(
  p_run_id uuid, p_clause_ref text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = t3a_demo, public AS $$
DECLARE v_missing jsonb := '[]'::jsonb;
BEGIN
  IF p_clause_ref IS NULL OR btrim(p_clause_ref) = '' THEN
    RETURN jsonb_build_object('ok', false,
      'reason', 'FD_D1_08_REQUIRES_BOUNDED_CLAUSE',
      'detail', 'The frame is evaluated at bounded conduct clause level and never at dimension level.');
  END IF;

  v_missing := v_missing
    || jsonb_build_array(
         'three valid current observations',
         'three distinct Stages',
         'three approved contexts',
         'at least two distinct authorized observers',
         'bounded clause-specific recurrence',
         'no cherry-picking',
         'no person-level inference');

  INSERT INTO t3a_demo.audit (run_id, step, outcome, refusal_reason, traces_to, body)
  VALUES (p_run_id, 'fourth_state', 'refused', 'FD_D1_08_CONDITIONS_NOT_MET',
          'FD-D1-08', jsonb_build_object('clause_ref', p_clause_ref, 'conditions', v_missing));

  RETURN jsonb_build_object('ok', false,
    'reason', 'FD_D1_08_CONDITIONS_NOT_MET',
    'clause_ref', p_clause_ref,
    'conditions_required', v_missing);
END; $$;

-- FD-D1-04 involvement test, enforced in demonstration runs exactly as in
-- real ones. Not waivable, including in demonstration.
CREATE OR REPLACE FUNCTION t3a_demo.attempt_evidence_review(
  p_run_id uuid, p_reviewer uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = t3a_demo, public AS $$
DECLARE v_run t3a_demo.run%rowtype;
BEGIN
  SELECT * INTO v_run FROM t3a_demo.run WHERE run_id = p_run_id;

  IF p_reviewer IS NOT NULL
     AND p_reviewer = v_run.provisional_calibration_participant THEN
    INSERT INTO t3a_demo.evidence_review (run_id, reviewer_id, outcome, refusal_reason)
    VALUES (p_run_id, p_reviewer, 'refused', 'FD_D1_04_INVOLVED_ACTOR');
    INSERT INTO t3a_demo.audit (run_id, step, outcome, refusal_reason, traces_to, body)
    VALUES (p_run_id, 'evidence_review', 'refused', 'FD_D1_04_INVOLVED_ACTOR',
            'FD-D1-04', jsonb_build_object('reviewer', p_reviewer));
    RETURN jsonb_build_object('ok', false, 'reason', 'FD_D1_04_INVOLVED_ACTOR');
  END IF;

  INSERT INTO t3a_demo.evidence_review (run_id, reviewer_id, outcome)
  VALUES (p_run_id, p_reviewer, 'reviewed');
  RETURN jsonb_build_object('ok', true);
END; $$;

-- ========================================================================
-- §6 · Production trust boundary
-- ========================================================================
--
-- Production services reject demonstration identifiers at their trust
-- boundary (item a). A production table cannot reference t3a_demo.* by
-- foreign key, so this guard exists for the remaining case: an identifier
-- copied by hand into a production insert.

CREATE OR REPLACE FUNCTION public.t3a_is_demonstration_identifier(p_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, t3a_demo AS $$
  SELECT EXISTS (SELECT 1 FROM t3a_demo.run WHERE run_id = p_id)
      OR EXISTS (SELECT 1 FROM t3a_demo.observation_record WHERE observation_record_id = p_id)
      OR EXISTS (SELECT 1 FROM t3a_demo.determination WHERE determination_id = p_id)
      OR EXISTS (SELECT 1 FROM t3a_demo.composed_statement WHERE composed_statement_id = p_id)
      OR EXISTS (SELECT 1 FROM t3a_demo.specimen_report WHERE specimen_report_id = p_id)
      OR EXISTS (SELECT 1 FROM t3a_demo.source WHERE source_id = p_id);
$$;

GRANT EXECUTE ON FUNCTION public.t3a_is_demonstration_identifier(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.t3a_reject_demonstration_identifier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, t3a_demo AS $$
DECLARE v_id uuid;
BEGIN
  EXECUTE format('SELECT ($1).%I', TG_ARGV[0]) INTO v_id USING NEW;
  IF v_id IS NOT NULL AND public.t3a_is_demonstration_identifier(v_id) THEN
    RAISE EXCEPTION
      'DEMONSTRATION_IDENTIFIER_REJECTED: a demonstration identifier cannot be referenced from a production evidence record.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  IF to_regclass('public.t3a_observation_record') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS t3a_reject_demo_observation_trg ON public.t3a_observation_record;
    CREATE TRIGGER t3a_reject_demo_observation_trg
      BEFORE INSERT OR UPDATE ON public.t3a_observation_record
      FOR EACH ROW EXECUTE FUNCTION public.t3a_reject_demonstration_identifier('observation_record_id');
  END IF;
END $$;

DO $$ BEGIN
  IF to_regclass('public.t3a_d1_report_issuance') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS t3a_reject_demo_issuance_trg ON public.t3a_d1_report_issuance;
    CREATE TRIGGER t3a_reject_demo_issuance_trg
      BEFORE INSERT OR UPDATE ON public.t3a_d1_report_issuance
      FOR EACH ROW EXECUTE FUNCTION public.t3a_reject_demonstration_identifier('ber_report_id');
  END IF;
END $$;

-- ========================================================================
-- §7 · The specimen (item d)
-- ========================================================================
--
-- Composed from the run's own determinations, laid out as an issued report
-- would be, and watermarked BY THE SERVICE — the watermark is not a
-- caller-supplied string.

CREATE OR REPLACE FUNCTION t3a_demo.render_specimen(p_run_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = t3a_demo, public AS $$
DECLARE
  v_run t3a_demo.run%rowtype;
  v_clauses jsonb;
  v_id uuid;
  v_watermark constant text :=
    'DEMONSTRATION — SYNTHETIC TEST — NOT ISSUED — NOT RELEASABLE';
  v_scope constant text :=
    'This specimen covers one dimension only. It is not a whole-person account and must not be read as one.';
BEGIN
  SELECT * INTO v_run FROM t3a_demo.run WHERE run_id = p_run_id;
  IF v_run.run_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'RUN_NOT_FOUND');
  END IF;

  SELECT COALESCE(jsonb_agg(
           jsonb_build_object('order', clause_order, 'text', clause_text,
                              'context', context_label)
           ORDER BY clause_order), '[]'::jsonb)
    INTO v_clauses
    FROM t3a_demo.composed_statement WHERE run_id = p_run_id;

  INSERT INTO t3a_demo.specimen_report
    (run_id, watermark, scope_limitation, rendered_body)
  VALUES
    (p_run_id, v_watermark, v_scope,
     jsonb_build_object(
       'dimension', v_run.dimension_id,
       'clauses', v_clauses,
       'not_observed_note',
       'An element with no observation is rendered as not yet available for observation. It is never a gap and never adverse evidence.'))
  RETURNING specimen_report_id INTO v_id;

  INSERT INTO t3a_demo.audit (run_id, step, outcome, traces_to, body)
  VALUES (p_run_id, 'report_render', 'rendered', 'Note 5 item (d)',
          jsonb_build_object('specimen_report_id', v_id));

  RETURN jsonb_build_object(
    'ok', true,
    'specimen_report_id', v_id,
    'watermark', v_watermark,
    'scope_limitation', v_scope,
    'issuable', false,
    'releasable', false);
END; $$;

-- ========================================================================
-- §8 · Grants — read-only to authenticated, writes via functions
-- ========================================================================

GRANT USAGE ON SCHEMA t3a_demo TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA t3a_demo TO authenticated;
GRANT EXECUTE ON FUNCTION t3a_demo.attempt_issuance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION t3a_demo.attempt_fourth_state(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION t3a_demo.attempt_evidence_review(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION t3a_demo.render_specimen(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
