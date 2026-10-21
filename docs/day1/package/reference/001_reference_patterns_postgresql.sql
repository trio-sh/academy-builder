-- T3A-DEV-DAY1-001 Version 1.3. REFERENCE PATTERNS (PostgreSQL), not a mandatory schema.
-- Adapt names to the reconciled schema and apply through the repository's migration tool after steps R1 and R2.
-- Additive only. No existing table or column is changed. Nothing here enables a DORMANT or SOCKET route.

-- Pattern 1. Append only enforcement for insert only tables (paragraph 6.1).
CREATE OR REPLACE FUNCTION t3a_deny_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'T3A_APPEND_ONLY: updates and deletes are refused; write a superseding record'; END;
$$;
-- Attach to every insert only table, for example:
-- CREATE TRIGGER t3a_append_only BEFORE UPDATE OR DELETE ON <event_log_table> FOR EACH ROW EXECUTE FUNCTION t3a_deny_mutation();
-- Also revoke UPDATE and DELETE on these tables from the application role.

-- Pattern 2. Idempotency registry for the event log (event_idempotency_key, Domain N).
CREATE TABLE IF NOT EXISTS t3a_event_idempotency (
  idempotency_key text PRIMARY KEY,
  payload_sha256 char(64) NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  source_system text NOT NULL,
  first_accepted_at timestamptz NOT NULL DEFAULT now(),
  event_id uuid NOT NULL UNIQUE
);
-- On insert of an event: if the key exists with the same payload_sha256, return the first event_id;
-- if it exists with a different payload_sha256, write the event with event_processing_state = 'quarantined'.

-- Pattern 3. Optional dormant lsa sidecar (paragraph 3.4). Written after the observation commit, never inside it.
CREATE TABLE IF NOT EXISTS t3a_lsa_observation_sidecar (
  sidecar_id uuid PRIMARY KEY,
  observation_id uuid NOT NULL,
  participant_pseudonym_ref uuid NOT NULL,
  clause_instance_id text,
  source_version_id uuid NOT NULL,
  source_version_hash char(64) NOT NULL CHECK (source_version_hash ~ '^[0-9a-f]{64}$'),
  dormant_fields jsonb NOT NULL,
  capture_state text NOT NULL CHECK (capture_state IN ('captured','not_captured','never_asked','declined','no_response','not_applicable','technical_failure','withdrawn','not_authored','not_served')),
  lsa_consent_state text NOT NULL CHECK (lsa_consent_state IN ('never_asked','granted','declined','withdrawn')),
  dictionary_version text NOT NULL,
  supersedes_sidecar_id uuid,
  record_property text NOT NULL CHECK (record_property IN ('real','synthetic_test','demonstration')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (sidecar_id IS DISTINCT FROM supersedes_sidecar_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS t3a_lsa_sidecar_unique ON t3a_lsa_observation_sidecar (observation_id, COALESCE(clause_instance_id,'__observation__'), dictionary_version, created_at);
CREATE INDEX IF NOT EXISTS t3a_lsa_sidecar_source ON t3a_lsa_observation_sidecar (source_version_id);
-- CREATE TRIGGER t3a_lsa_sidecar_append_only BEFORE UPDATE OR DELETE ON t3a_lsa_observation_sidecar FOR EACH ROW EXECUTE FUNCTION t3a_deny_mutation();
-- dormant_fields may hold only the keys allowlisted in reference/jsonschema/lsa_observation_sidecar_v1.3.schema.json; validate with tools/check_records.py sidecar before insert and quarantine any refused row.
-- Grant INSERT only to the lsa consumer role. No other role reads this table while the module is dormant.
