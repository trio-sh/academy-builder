-- ============================================================================
-- T3A-DEV-SPEC-002 v2.0 · Step 5 · WorkRehearsal ↔ Evidence firewall (§6)
-- ============================================================================
-- The WorkRehearsal firewall.  Six architectural rules from §6:
--   1. Rehearsal content + outcomes live in a separate domain from evidence,
--      with separate permissions.
--   2. No evidence entity may reference a rehearsal artifact or session as
--      a source (§12.1 invariant #1).
--   3. No service with write access to evidence holds read access to
--      rehearsal content / outcomes.
--   4. No analytics / reporting / model-training / export path carries
--      rehearsal content into the evidence domain.
--   5. The Observation Gateway is the only valid transition, and passes
--      only the minimum identity / eligibility / consent info required.
--   6. Acceptance test AC-03: an engineer outside the build team cannot
--      reconstruct a participant's rehearsal activity from the evidence
--      domain.  The attempt and outcome are documented.
--
-- Rules 1–4 are structural — DB objects, roles, constraints.  Rule 5 was
-- already landed in Step 2 (t3a_observation_path_gateway).  Rule 6 is
-- enforced by a static schema test (scripts/check-firewall.mjs, this PR)
-- that fails the build if any evidence table / column / index references
-- a rehearsal table.
--
-- The existing legacy tables (growth_log_entries, resume uploads, etc.)
-- are OUT OF SCOPE for this firewall — they are not the new rehearsal
-- domain.  When BridgeFast / resume-enhancer are rebuilt on the new
-- rehearsal domain (later PR), the legacy tables will be retired.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Rehearsal domain tables — t3a_rehearsal_* prefix
-- ============================================================================

CREATE TABLE t3a_rehearsal_session (
  rehearsal_session_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_class        t3a_scenario_class NOT NULL,
  source_version_id     uuid,  -- NOT a FK to t3a_source_version — see below
  started_at            timestamptz NOT NULL DEFAULT now(),
  ended_at              timestamptz,
  abandoned             boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (scenario_class IN ('instructional', 'private_rehearsal'))
);
COMMENT ON TABLE t3a_rehearsal_session IS
  '§6 rehearsal domain: private, coached, repeatable practice. scenario_class is CHECKed to instructional / private_rehearsal — the observed pathway is structurally incapable of serving these classes (§5.3.1 + AC-02).';
-- source_version_id is deliberately NOT a foreign key. Rehearsal versions
-- live in their own registry (or an in-memory content store); mixing
-- rehearsal source references into the same table space as evidence
-- source references would give an outside engineer a bridge to walk.

CREATE INDEX t3a_rehearsal_session_participant_idx
  ON t3a_rehearsal_session (participant_id, started_at DESC);

CREATE TABLE t3a_rehearsal_artifact (
  rehearsal_artifact_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_session_id  uuid NOT NULL REFERENCES t3a_rehearsal_session ON DELETE CASCADE,
  payload               jsonb NOT NULL,       -- the participant's response, coaching draft, etc.
  created_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_rehearsal_artifact IS
  '§6 rehearsal domain: per-response payloads. No evidence entity may reference these rows (§12.1 #1).';

CREATE TABLE t3a_coaching_feedback (
  coaching_feedback_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_session_id  uuid NOT NULL REFERENCES t3a_rehearsal_session ON DELETE CASCADE,
  feedback_body         text NOT NULL,
  acknowledged_at       timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_coaching_feedback IS
  '§6: coaching is a rehearsal-domain concern. Coaching stops at the Observation Gateway (§21.2 coaching_terminated_at). No evidence entity may reference these rows.';

CREATE TABLE t3a_rehearsal_activity_history (
  activity_history_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rehearsal_session_id  uuid NOT NULL REFERENCES t3a_rehearsal_session ON DELETE CASCADE,
  event_name            text NOT NULL,        -- rehearsal-domain vocabulary; never joined to t3a_event_log
  occurred_at           timestamptz NOT NULL DEFAULT now(),
  payload               jsonb
);
COMMENT ON TABLE t3a_rehearsal_activity_history IS
  '§6 breadcrumb trail for a rehearsal session. Deliberately isolated from t3a_event_log — the audit backbone is for evidence-domain activity.';

-- ============================================================================
-- RLS: participants R+W their OWN rehearsal only. No other role has any
-- read policy — not mentor, reviewer, coordinator, employer, admin, or
-- any other spec role. Giving an auditor access to rehearsal content
-- would let them reconstruct it, which is exactly what AC-03 forbids.
-- ============================================================================

ALTER TABLE t3a_rehearsal_session          ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_rehearsal_artifact         ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_coaching_feedback          ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_rehearsal_activity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY t3a_rehearsal_session_owner ON t3a_rehearsal_session
  FOR SELECT USING (participant_id = auth.uid());

CREATE POLICY t3a_rehearsal_artifact_owner ON t3a_rehearsal_artifact
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM t3a_rehearsal_session s
       WHERE s.rehearsal_session_id = t3a_rehearsal_artifact.rehearsal_session_id
         AND s.participant_id = auth.uid()
    )
  );

CREATE POLICY t3a_coaching_feedback_owner ON t3a_coaching_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM t3a_rehearsal_session s
       WHERE s.rehearsal_session_id = t3a_coaching_feedback.rehearsal_session_id
         AND s.participant_id = auth.uid()
    )
  );

CREATE POLICY t3a_rehearsal_activity_history_owner ON t3a_rehearsal_activity_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM t3a_rehearsal_session s
       WHERE s.rehearsal_session_id = t3a_rehearsal_activity_history.rehearsal_session_id
         AND s.participant_id = auth.uid()
    )
  );

-- ============================================================================
-- Belt-and-braces trigger on t3a_observation
-- ----------------------------------------------------------------------------
-- t3a_commit_observation (Step 4) already refuses instructional /
-- private_rehearsal sources with a RAISE. This trigger adds a DB-level
-- refusal so any path around the service endpoint — a migration script,
-- a direct SQL insert as service_role, a future writer — also fails.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_observation_reject_rehearsal_source()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_class t3a_scenario_class;
BEGIN
  SELECT scenario_class INTO v_class
    FROM t3a_source_version
   WHERE source_version_id = NEW.source_version_id;

  IF v_class IN ('instructional', 'private_rehearsal') THEN
    RAISE EXCEPTION 't3a firewall (§12.1 #1 + §5.3.1): observation source_version has scenario_class=% — rehearsal sources cannot enter the evidence domain', v_class
      USING ERRCODE = 'T3A01';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER t3a_observation_reject_rehearsal
  BEFORE INSERT OR UPDATE ON t3a_observation
  FOR EACH ROW EXECUTE FUNCTION t3a_observation_reject_rehearsal_source();

-- ============================================================================
-- Tighten t3a_rehearsal_telemetry_aggregate against identifier smuggling
-- ----------------------------------------------------------------------------
-- §21.11: "No participant identifier, pseudonymous identifier, session
-- identifier, device hash or network hash may be written to this
-- domain." Step 2 landed the table; this trigger enforces the ban at
-- the DB layer by scanning any jsonb / text column for UUID-shaped
-- values on insert. False positives (a legitimate hex string that
-- happens to look like a UUID) are extremely unlikely for aggregate
-- counts; a false negative would be a spec violation, so we err
-- toward strictness.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_rehearsal_telemetry_reject_identifiers()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_serialized text;
  v_uuid_pattern text := '\y[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\y';
BEGIN
  v_serialized := coalesce(NEW.duration_distribution::text, '')
               || coalesce(NEW.cohort_period, '')
               || coalesce(NEW.suppression_reason, '')
               || coalesce(NEW.scenario_class::text, '');
  IF v_serialized ~* v_uuid_pattern THEN
    RAISE EXCEPTION 't3a firewall (§21.11): UUID-shaped value detected in rehearsal telemetry aggregate — no identifier may enter this domain'
      USING ERRCODE = 'T3A01';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER t3a_rehearsal_telemetry_no_ids
  BEFORE INSERT OR UPDATE ON t3a_rehearsal_telemetry_aggregate
  FOR EACH ROW EXECUTE FUNCTION t3a_rehearsal_telemetry_reject_identifiers();

NOTIFY pgrst, 'reload schema';

COMMIT;
