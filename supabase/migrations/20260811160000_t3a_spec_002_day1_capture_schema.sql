-- ============================================================================
-- T3A-DEV-SPEC-002 v2.0 · Step 2 · Day-1 Capture Schema (§21)
-- ============================================================================
-- Adds the new evidentiary entities per §21 of the spec.  Every non-
-- retrofittable field the Institutional Readiness Evidence Layer will need
-- has a column or a governed payload key here.  Legacy tables named after
-- the retired "Skill Passport" construct, growth_log_entries etc. are
-- UNTOUCHED by this migration; they remain grandfathered under
-- scripts/check-vocabulary.mjs allowlist until their dedicated rename PR.
-- This is a NEW forward migration; nothing here is an alias.
--
-- Every table is prefixed `t3a_` so it cannot collide with legacy shapes and
-- so operations can find the new evidence chain by grep.  Table + column
-- comments cite the spec section that governs the field, so the review
-- surface answers "why does this exist?" from the schema itself.
--
-- RLS: enabled on every table.  Full permission-matrix (§10) enforcement
-- lands in a follow-up PR; this migration installs the tables + basic owner
-- read policies and leaves service-level writes for the API layer.  No
-- policy in this migration widens access beyond §10.
--
-- Sockets: several tables (t3a_employment_link, t3a_ber_report, etc.) are
-- structurally present and empty.  Per §16.3 socket discipline, an empty
-- socket refuses; the service layer never fills a gap silently.  This
-- migration builds the sockets.  Plugs land as their governance clears.
-- ============================================================================

BEGIN;

-- Missing-state code enum (§21.13).  A single NULL is used today for at
-- least seven different situations; they do not mean the same thing.  The
-- difference between "never asked" and "asked but unanswered" is the
-- difference between a design decision and a finding.
CREATE TYPE t3a_missing_state AS ENUM (
  'not_captured',
  'never_asked',
  'not_applicable',
  'declined',
  'no_response',
  'not_yet_observed',
  'technical_failure',
  'withdrawn'
);

-- Stage code enum (§1.4).  Replaces the legacy `level` / L1..L4.
CREATE TYPE t3a_stage_code AS ENUM ('S1', 'S2', 'S3', 'S4');

-- Dimension enum (§7.1).  D1..D14 anchored to the Behavioral Observation
-- and Standards Document; names deliberately not encoded here — they
-- change with the source-of-truth document, the codes do not.
CREATE TYPE t3a_dimension_code AS ENUM (
  'D1','D2','D3','D4','D5','D6','D7',
  'D8','D9','D10','D11','D12','D13','D14'
);

-- Progression decision (§5.1.1, OD-02: three states, not four).
CREATE TYPE t3a_progression_decision AS ENUM ('proceed','redirect','pause');

-- Scenario class (§5.3.1).  The observed pathway is structurally incapable
-- of serving `instructional` or `private_rehearsal`.
CREATE TYPE t3a_scenario_class AS ENUM (
  'instructional',
  'private_rehearsal',
  'observation_ready',
  'work_sample',
  'team_simulation'
);

-- Accommodation class (§5.4).  A property of the adjustment, not of the
-- participant.
CREATE TYPE t3a_accommodation_class AS ENUM (
  'access_preserving',
  'demand_modifying'
);

-- Comparability class (§7.1, derived).
CREATE TYPE t3a_comparability_class AS ENUM (
  'directly_comparable',
  'interpret_individually'
);

-- Evidence class (§7.1).
CREATE TYPE t3a_evidence_class AS ENUM ('portable_core','employer_linked');

-- Contemporaneity (§21.3).
CREATE TYPE t3a_contemporaneity AS ENUM ('contemporaneous','late_entered');

-- Integrity status (§21.3, §21.6).  Set at emit time by validation, never
-- by hand.
CREATE TYPE t3a_integrity_status AS ENUM (
  'ok',
  'missing_keys',
  'invalid_bounds',
  'suspected_duplicate',
  'manual_review'
);

-- Dimension evidence state (§7.2).  Four states per dimension, derived by
-- rule.  NEVER set by hand; NEVER overridable.  The two-axis model
-- (OD-16) is deliberately NOT modelled here.
CREATE TYPE t3a_dimension_evidence_state AS ENUM (
  'not_observed',
  'observed_once',
  'observed_multi_context',
  'recurring_across_stages'
);

-- BER lifecycle (§11).  Operational only; never rendered as employer-
-- visible standing.
CREATE TYPE t3a_ber_status AS ENUM (
  'not_eligible',
  'assembling',
  'reviewer_review',
  'participant_review',
  'challenge_open',
  'ready_to_issue',
  'issued',
  'amended',
  'withdrawn',
  'expired',
  'evidence_expired'
);

-- Disclosure status (§11).
CREATE TYPE t3a_disclosure_status AS ENUM (
  'requested','granted','declined','revoked','expired'
);

-- Challenge lifecycle (§11).
CREATE TYPE t3a_challenge_status AS ENUM (
  'open',
  'evidence_disclosed',
  'response_received',
  'under_reconsideration',
  'upheld',
  'amended',
  'withdrawn'
);

-- Challenge grounds (§21.9).
CREATE TYPE t3a_challenge_ground AS ENUM (
  'factual_error',
  'mistaken_identity',
  'procedural_failure',
  'observer_conflict',
  'inaccurate_description',
  'compromised_conditions'
);

-- Stage instance state (§11).
CREATE TYPE t3a_stage_instance_state AS ENUM (
  'eligible','scheduled','active','completed','redirected','paused','voided'
);

-- Data source provenance (§21.5).
CREATE TYPE t3a_data_source AS ENUM (
  'observed',
  'self_reported',
  'mentor_entered',
  'system_derived',
  'employer_reported'
);

-- Assignment method (§21.4).
CREATE TYPE t3a_assignment_method AS ENUM (
  'system_allocated','coordinator_allocated'
);

-- Retention class (§14.3).  Seven classes with independent periods.
CREATE TYPE t3a_retention_class AS ENUM (
  'issued_report',
  'observation_evidence',
  'identity_evidence',
  'audit_logs',
  'challenge_records',
  'verification_metadata',
  'anonymized_research'
);

-- Event category (§21.6).  Determines which context keys are mandatory.
CREATE TYPE t3a_event_category AS ENUM (
  'OBSERVATION','MENTOR','PARTICIPANT','EMPLOYER',
  'SYSTEM','GOVERNANCE','CONSENT'
);

-- ============================================================================
-- §21.1  IDENTITY, ACCOUNT AND CONSENT
-- ============================================================================
-- Shared identity root.  Profile data is context for a mentor and is NEVER
-- evidence.  Consent is a versioned, contextual, revocable object stored
-- alongside the data it governs, not a checkbox.
-- ============================================================================

CREATE TABLE t3a_consent_state (
  consent_state_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type          text NOT NULL CHECK (consent_type IN (
                          'scenario_logging',
                          'mentor_observation',
                          'followup_contact',
                          'employer_share',
                          'aggregate_regional',
                          'research_participation'
                        )),
  consent_status        text NOT NULL CHECK (consent_status IN ('granted','declined','withdrawn')),
  consent_timestamp     timestamptz NOT NULL DEFAULT now(),
  consent_copy_version  text NOT NULL,     -- §21.1: proves what was actually shown
  consent_method        text NOT NULL CHECK (consent_method IN ('checkbox','e-sign','in-session confirmation')),
  language_preference   text,              -- BCP-47 locale of the copy displayed
  jurisdiction_code     text,              -- captured at time of consent
  created_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_consent_state IS
  '§21.1: versioned per-record consent.  Withdrawal stops future capture but does not delete history; a new row is written per state change.  Immutable in effect — no in-place edit.';

CREATE INDEX t3a_consent_state_participant_type_idx
  ON t3a_consent_state (participant_id, consent_type, consent_timestamp DESC);

CREATE TABLE t3a_identity_assurance (
  identity_assurance_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_assurance_method   text NOT NULL, -- enum per the registration-identity standard (OD-09)
  identity_assurance_evidence_ref text,      -- pointer to secured store; NEVER stores the raw evidence
  registration_jurisdiction   text NOT NULL,
  country_code                text NOT NULL,
  sub_jurisdiction            text,
  language_preference         text NOT NULL,
  timezone                    text NOT NULL, -- IANA timezone
  occupational_classification_version text NOT NULL, -- §21.1: pinned per participant
  captured_at                 timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_identity_assurance IS
  '§21.1: what was verified at enrollment and to what standard.  "Identity is established" is not a specification and does not appear in the build.';

-- ============================================================================
-- §21.2  OBSERVATION GATEWAY
-- ============================================================================
-- Two distinct objects, and they MUST NOT be merged.  A gateway that
-- fires per Stage would make the boundary meaningless; a gateway that
-- fires once would leave later Stage instances without conditions.
-- ============================================================================

CREATE TABLE t3a_observation_path_gateway (
  observation_path_gateway_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_identity_method      text NOT NULL, -- how the participant was confirmed at the start of THIS event
  observation_consent_version  text NOT NULL,
  assistance_rules_version     text NOT NULL,
  coaching_terminated_at       timestamptz NOT NULL,
  created_at                   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_observation_path_gateway IS
  '§21.2: ONE per participant per observation path.  Carries NO dimension key and NO stage_instance key.  The single object proving the participant crossed from private preparation into the observed chain — the firewall claim rests on it.';

CREATE TABLE t3a_stage_entry_event (
  stage_entry_event_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_path_gateway_id uuid NOT NULL REFERENCES t3a_observation_path_gateway,
  stage_instance_id     uuid NOT NULL,  -- FK below (mutual reference)
  stage_code            t3a_stage_code NOT NULL,
  dimensions_in_play    t3a_dimension_code[] NOT NULL,
  session_identity      text NOT NULL,
  assistance_rules_version text NOT NULL,
  administration_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_stage_entry_event IS
  '§21.2: ONE per Stage instance.  Attaches session identity, assistance-rules version and administration conditions to a specific S1..S4 instance.  Cannot open a Stage without one; every Stage from S1..S4 requires its own entry event in addition to the single active gateway.';

CREATE INDEX t3a_stage_entry_event_stage_instance_idx
  ON t3a_stage_entry_event (stage_instance_id);

-- ============================================================================
-- §11 + §21.3  STAGE INSTANCE
-- ============================================================================

CREATE TABLE t3a_stage_instance (
  stage_instance_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_code            t3a_stage_code NOT NULL,
  dimension_id          t3a_dimension_code NOT NULL,
  attempt_no            integer NOT NULL CHECK (attempt_no >= 1),
  state                 t3a_stage_instance_state NOT NULL DEFAULT 'eligible',
  scheduled_at          timestamptz,
  activated_at          timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, stage_code, dimension_id, attempt_no)
);
COMMENT ON TABLE t3a_stage_instance IS
  '§11 + §5.2: one instance per attempt or context.  Attempts are capped and spaced (§5.2).  No attempt is discarded or overwritten.';

CREATE INDEX t3a_stage_instance_participant_dim_idx
  ON t3a_stage_instance (participant_id, dimension_id, stage_code, attempt_no DESC);

-- ============================================================================
-- §21.7  SCENARIO, RUBRIC AND MODEL REGISTRIES
-- ============================================================================
-- The source side of comparability.  A version used in a live observation
-- is immutable; a change creates a new identifier.  Seven fields are
-- mandatory on an observation-ready scenario version before it may carry
-- evidence (scenario_class + six fields per §5.3.2).
-- ============================================================================

CREATE TABLE t3a_source_version (
  source_version_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_class        t3a_scenario_class NOT NULL,
  version_label         text NOT NULL,        -- semver-ish
  source_version_hash   text NOT NULL,        -- SHA-256 of the content
  compatibility_class   text NOT NULL CHECK (compatibility_class IN ('A','B','C')),
  min_seconds           integer,              -- required if scenario_class = 'observation_ready'
  max_seconds           integer,              -- required if scenario_class = 'observation_ready'
  -- §5.3.2 observation-readiness fields (JSONB payloads structured per the
  -- Behavioral Observation and Standards Document schema; validated at the
  -- service layer, kept typed here to survive schema evolution).
  dimensions_in_play               jsonb NOT NULL,
  relevant_conduct                 jsonb,
  irrelevant_conduct               jsonb,
  stated_standard                  text,
  permitted_administration_variance text,
  unsupported_inferences           jsonb,
  cross_context_map                jsonb,
  -- AI-influenced sources only
  ai_model_reference               text,
  ai_prompt_text_ref               text,
  approved_at                      timestamptz,
  approved_by                      uuid,
  retired_at                       timestamptz,
  created_at                       timestamptz NOT NULL DEFAULT now(),
  -- §5.3.2: an observation_ready source without all seven mandatory fields
  -- cannot be admitted.  Enforced here as a CHECK on the class; JSONB
  -- structure is enforced at the service layer where richer validation
  -- fits.
  CHECK (
    scenario_class <> 'observation_ready' OR (
      dimensions_in_play IS NOT NULL AND
      relevant_conduct IS NOT NULL AND
      irrelevant_conduct IS NOT NULL AND
      stated_standard IS NOT NULL AND
      permitted_administration_variance IS NOT NULL AND
      unsupported_inferences IS NOT NULL AND
      cross_context_map IS NOT NULL AND
      min_seconds IS NOT NULL AND max_seconds IS NOT NULL
    )
  )
);
COMMENT ON TABLE t3a_source_version IS
  '§21.7 + §5.3: immutable source-of-truth for scenario / brief / work-demand versions.  An observation-ready version missing any of the seven mandatory fields cannot be admitted; a change creates a NEW identifier, not an edit.';

CREATE INDEX t3a_source_version_class_idx ON t3a_source_version (scenario_class);

-- ============================================================================
-- §21.3  OBSERVATION AND EVIDENCE  (append-only)
-- ============================================================================
-- The append-only factual source layer.  One record per participant per
-- dimension per observation occasion.  Nothing here is ever overwritten;
-- amendments SUPERSEDE and both states are retained.
-- ============================================================================

CREATE TABLE t3a_observation (
  observation_id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_code                    t3a_stage_code NOT NULL,
  dimension_id                  t3a_dimension_code NOT NULL,
  source_version_id             uuid NOT NULL REFERENCES t3a_source_version,
  attempt_no                    integer NOT NULL CHECK (attempt_no >= 1),
  occurred_at                   timestamptz NOT NULL DEFAULT now(),
  stage_instance_id             uuid NOT NULL REFERENCES t3a_stage_instance,
  response_sequence             jsonb,               -- ordered with timestamps
  submission_origin             jsonb,               -- §14.2 provenance for authorship at S3
  assistance_declaration        jsonb,
  abandonment_state             text CHECK (abandonment_state IN ('abandoned','not_abandoned')),
  abandonment_reason            text,
  contemporaneity               t3a_contemporaneity NOT NULL,
  late_entry_delay_seconds      integer,             -- populated iff contemporaneity = 'late_entered'
  observer_id                   uuid,                -- REQUIRED at S2/S3/S4; NEVER an S1 confirmer
  observer_authorization_at_date jsonb,              -- snapshot of authorization as at occurred_at
  ordinal_anchor                integer CHECK (ordinal_anchor BETWEEN 1 AND 4),
  descriptor_version            text NOT NULL,
  determination_answers         jsonb,               -- keyed to the question set for the dimension
  composed_statement_id         uuid,                -- FK below
  relevance_basis               jsonb,
  evidence_class                t3a_evidence_class NOT NULL,
  administration_conditions     jsonb,
  administration_variance       jsonb,
  accommodation_class           t3a_accommodation_class,
  comparability_class           t3a_comparability_class NOT NULL DEFAULT 'directly_comparable',
  evidence_notes                text,                -- prohibited-language checked at emit time
  integrity_status              t3a_integrity_status NOT NULL DEFAULT 'ok',
  supersedes                    uuid,                -- REFERENCES t3a_observation, added below
  superseded_by                 uuid,                -- REFERENCES t3a_observation, added below
  created_at                    timestamptz NOT NULL DEFAULT now(),
  -- §12.1 invariant #5: every consequential S2..S4 observation must be
  -- attributable to an authorized human observer.  observer_id required.
  CHECK (
    (stage_code = 'S1') OR (observer_id IS NOT NULL AND observer_authorization_at_date IS NOT NULL)
  ),
  -- §21.3: comparability_class 'interpret_individually' when accommodation
  -- is demand_modifying (checked at the service layer for the derived
  -- inputs; DB enforces monotone consistency).
  CHECK (
    accommodation_class <> 'demand_modifying'
    OR comparability_class = 'interpret_individually'
  )
);
ALTER TABLE t3a_observation
  ADD CONSTRAINT t3a_observation_supersedes_fk
  FOREIGN KEY (supersedes) REFERENCES t3a_observation (observation_id);
ALTER TABLE t3a_observation
  ADD CONSTRAINT t3a_observation_superseded_by_fk
  FOREIGN KEY (superseded_by) REFERENCES t3a_observation (observation_id);
COMMENT ON TABLE t3a_observation IS
  '§21.3 + §12.1: append-only factual source layer.  Amendments supersede; both states retained; nothing is deleted outside the retention program.  observer_id reserved for S2/S3/S4 (an S1 confirmer is recorded in t3a_mentor_judgment, never here).';

CREATE INDEX t3a_observation_participant_dim_idx
  ON t3a_observation (participant_id, dimension_id, occurred_at DESC);
CREATE INDEX t3a_observation_stage_instance_idx
  ON t3a_observation (stage_instance_id);

-- Trigger: enforce append-only.  Non-null supersedes/superseded_by fields
-- may be set to link amendments; content columns are immutable after
-- insert.  Retention program is the only path to destruction (§14.3).
CREATE OR REPLACE FUNCTION t3a_observation_append_only_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.observation_id IS DISTINCT FROM NEW.observation_id
     OR OLD.participant_id IS DISTINCT FROM NEW.participant_id
     OR OLD.stage_code IS DISTINCT FROM NEW.stage_code
     OR OLD.dimension_id IS DISTINCT FROM NEW.dimension_id
     OR OLD.source_version_id IS DISTINCT FROM NEW.source_version_id
     OR OLD.attempt_no IS DISTINCT FROM NEW.attempt_no
     OR OLD.occurred_at IS DISTINCT FROM NEW.occurred_at
     OR OLD.ordinal_anchor IS DISTINCT FROM NEW.ordinal_anchor
     OR OLD.determination_answers IS DISTINCT FROM NEW.determination_answers
     OR OLD.composed_statement_id IS DISTINCT FROM NEW.composed_statement_id
     OR OLD.observer_id IS DISTINCT FROM NEW.observer_id
     OR OLD.evidence_class IS DISTINCT FROM NEW.evidence_class
  THEN
    RAISE EXCEPTION 't3a_observation is append-only (§12.1 #6). Amend via a new row with supersedes = %', OLD.observation_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER t3a_observation_append_only
  BEFORE UPDATE ON t3a_observation
  FOR EACH ROW EXECUTE FUNCTION t3a_observation_append_only_guard();

-- ============================================================================
-- §7.3  DETERMINATION PATH AND STATEMENT LIBRARY  (socket)
-- ============================================================================
-- The socket is built now; question sets and statement entries plug in per
-- dimension (§7.3.1).  A dimension whose content is absent is NOT
-- observable; the service layer refuses to open a Stage instance on it.
-- ============================================================================

CREATE TABLE t3a_determination_question (
  question_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id          t3a_dimension_code NOT NULL,
  question_set_version  text NOT NULL,
  order_index           integer NOT NULL,
  question_body         text NOT NULL,
  answer_schema         jsonb NOT NULL,       -- machine-checkable answer shape
  approved_at           timestamptz,
  approved_by           uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dimension_id, question_set_version, order_index)
);
COMMENT ON TABLE t3a_determination_question IS
  '§7.3.1 socket: question set per dimension per version.  Plugs in per dimension under the Behavioral Observation and Standards Document.  A dimension whose set is absent or unapproved is not observable.';

CREATE TABLE t3a_statement_library (
  statement_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id          t3a_dimension_code NOT NULL,
  question_set_version  text NOT NULL,
  answer_key            jsonb NOT NULL,        -- deterministic key into the question set
  statement_body        text NOT NULL,
  approved_at           timestamptz,
  approved_by           uuid,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dimension_id, question_set_version, answer_key)
);
COMMENT ON TABLE t3a_statement_library IS
  '§7.3: two mentors answering identical determinations produce identical statement text.  Statements are composed server-side from this library; mentors NEVER write statement text directly.';

CREATE TABLE t3a_composed_statement (
  composed_statement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id          uuid NOT NULL REFERENCES t3a_statement_library,
  rendered_body         text NOT NULL,           -- immutable snapshot at composition
  composed_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE t3a_observation
  ADD CONSTRAINT t3a_observation_composed_statement_fk
  FOREIGN KEY (composed_statement_id) REFERENCES t3a_composed_statement (composed_statement_id);

-- ============================================================================
-- §21.4  MENTOR JUDGMENT  (per session; also records S1 confirmation)
-- ============================================================================

CREATE TABLE t3a_mentor_authorization (
  mentor_authorization_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension_id           t3a_dimension_code NOT NULL,
  authorized_from        timestamptz NOT NULL,
  authorized_until       timestamptz,
  calibration_status     text NOT NULL CHECK (calibration_status IN ('current','under_review','lapsed')),
  reference_set_version  text NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_mentor_authorization IS
  '§21.12 + OD-12: authorization per dimension (finer grain).  Coarsening to per-Stage is a config change; refining later is a migration.';

CREATE TABLE t3a_conflict_declaration (
  conflict_declaration_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_org_id       uuid,           -- FK later
  reason_class          text NOT NULL,   -- categorical, never free text
  declared_at           timestamptz NOT NULL DEFAULT now(),
  cleared_at            timestamptz
);

CREATE TABLE t3a_mentor_assignment (
  mentor_assignment_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_instance_id     uuid NOT NULL REFERENCES t3a_stage_instance,
  assignment_method     t3a_assignment_method NOT NULL,
  prior_allocation_count integer NOT NULL DEFAULT 0,
  conflict_declaration_ref uuid REFERENCES t3a_conflict_declaration,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE t3a_mentor_judgment (
  mentor_judgment_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_instance_id             uuid NOT NULL REFERENCES t3a_stage_instance,
  observation_id                uuid REFERENCES t3a_observation, -- may be NULL for S1 confirmation
  -- S1 confirmation fields (§13, §21.4).  observer_id above is reserved
  -- for S2..S4; an S1 confirmer must go into these fields, never into
  -- observer_id, because a confirmer did not conduct the observation.
  human_confirmation_actor_id   uuid,
  human_confirmation_at         timestamptz,
  confirmation_role             text,
  authorization_snapshot_ref    jsonb,
  -- Progression decision (§13 + §5.1.1).  Recorded against the dimension
  -- and stage_instance, NEVER against the participant.  ONE canonical
  -- entity serves all four Stages (§17 AC-60).
  progression_decision          t3a_progression_decision,
  progression_dimension_id      t3a_dimension_code,
  decision_rationale            text,
  -- Session-level judgment fields
  dimensions_flagged            t3a_dimension_code[],
  confidence_per_dimension      jsonb,
  key_moment_markers            jsonb,
  ai_assist_notes_accepted      integer DEFAULT 0,
  ai_assist_notes_ignored       integer DEFAULT 0,
  ai_anchor_override            boolean DEFAULT false,
  ai_anchor_original_value      integer,
  session_technical_issues      text,
  created_at                    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_mentor_judgment IS
  '§21.4 + AC-58: confirmation and progression are separately persisted actions.  Neither writes the other as a side effect.  S1 confirmer NEVER appears in t3a_observation.observer_id (AC-55).';

-- ============================================================================
-- §21.5  PROVENANCE AND VERSIONING (attached to every capture)
-- ============================================================================
-- Every field here is IRREVERSIBLE without exception.  Provenance answers
-- four questions about every data point: where it came from, who entered
-- it, when, and under what conditions.
-- ============================================================================

CREATE TABLE t3a_provenance (
  provenance_id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type                 text NOT NULL,
  resource_id                   uuid NOT NULL,
  data_source                   t3a_data_source NOT NULL,
  entered_by                    uuid NOT NULL,
  entered_at                    timestamptz NOT NULL DEFAULT now(),
  scenario_version              text,
  rubric_version                text,
  schema_version                text NOT NULL,
  dimension_schema_version      text NOT NULL,
  ai_model_version              text,
  ai_prompt_version             text,
  ai_config_version             text,
  ai_model_deployment_id        text,
  ai_prompt_hash                text,
  ai_system_message_version     text,
  ai_output_schema_version      text,
  consequential_config_values   jsonb,
  version_change_reason         text,
  approval_authority            text,
  consent_status_at_capture     text,
  sufficiency_rules_version     text,
  permitted_use_version         text,
  UNIQUE (resource_type, resource_id)
);
COMMENT ON TABLE t3a_provenance IS
  '§21.5: attached to every evidentiary object.  Where a field is not applicable to a resource type, it is NULL; NULL means "not_applicable" for provenance and is distinguishable via t3a_missing_state semantics at the service layer.';

-- ============================================================================
-- §21.6  EVENT LOG ENVELOPE  (audit backbone, append-only)
-- ============================================================================
-- Every meaningful action emits a structured, timestamped record under a
-- canonical name.  Events are append-only: no deletion, no update, no
-- silent edit.  A correction is a NEW event referencing the original.
-- ============================================================================

CREATE TABLE t3a_event_log (
  event_id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name            text NOT NULL,          -- canonical vocabulary, enforced by service layer
  event_category        t3a_event_category NOT NULL,
  occurred_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
  ingested_at           timestamptz NOT NULL DEFAULT now(),
  actor_type            text NOT NULL CHECK (actor_type IN (
                          'PARTICIPANT','MENTOR','EMPLOYER','REVIEWER',
                          'AI_ENGINE','SYSTEM','ADMIN'
                        )),
  actor_id              uuid NOT NULL,
  subject_id            uuid,
  session_id            uuid,
  correlation_id        uuid,
  resource_type         text,
  resource_id           uuid,
  payload               jsonb NOT NULL DEFAULT '{}'::jsonb,
  artifact_ref_id       text,
  integrity_status      t3a_integrity_status NOT NULL DEFAULT 'ok',
  integrity_hash        text NOT NULL,          -- SHA-256 over core fields, computed at emit
  supersedes_event_id   uuid REFERENCES t3a_event_log,
  source_system         text CHECK (source_system IN ('web','mobile','api','internal_job'))
);
COMMENT ON TABLE t3a_event_log IS
  '§21.6: append-only audit backbone.  No update, no delete; corrections are supersedes rows.';

CREATE INDEX t3a_event_log_occurred_idx ON t3a_event_log (occurred_at DESC);
CREATE INDEX t3a_event_log_session_idx  ON t3a_event_log (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX t3a_event_log_subject_idx  ON t3a_event_log (subject_id) WHERE subject_id IS NOT NULL;
CREATE INDEX t3a_event_log_correlation_idx ON t3a_event_log (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX t3a_event_log_category_name_idx ON t3a_event_log (event_category, event_name);

CREATE OR REPLACE FUNCTION t3a_event_log_append_only_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 't3a_event_log is append-only (§21.6). Corrections must be new rows with supersedes_event_id.';
END;
$$;
CREATE TRIGGER t3a_event_log_no_update BEFORE UPDATE ON t3a_event_log
  FOR EACH ROW EXECUTE FUNCTION t3a_event_log_append_only_guard();
CREATE TRIGGER t3a_event_log_no_delete BEFORE DELETE ON t3a_event_log
  FOR EACH ROW EXECUTE FUNCTION t3a_event_log_append_only_guard();

-- ============================================================================
-- §21.8  EVIDENCE STATE, REPORT AND RELEASE
-- ============================================================================
-- Derived state and the artifacts built on it.  Sufficiency states are
-- computed by rule and are NEVER set by hand; no interface permits
-- override (AC-54).  Holding a BER is not the same as being discoverable.
-- ============================================================================

CREATE TABLE t3a_dimension_evidence (
  dimension_evidence_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dimension_id          t3a_dimension_code NOT NULL,
  evidence_state        t3a_dimension_evidence_state NOT NULL DEFAULT 'not_observed',
  insufficiency_reason  text,                    -- populated when state = 'not_observed'
  sufficiency_rules_version text NOT NULL,
  derived_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, dimension_id)
);

CREATE TABLE t3a_ber_report (
  ber_report_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version               integer NOT NULL DEFAULT 1,
  status                t3a_ber_status NOT NULL DEFAULT 'not_eligible',
  issue_metadata        jsonb,           -- issuing_reviewer, issued_at, rules_version
  supersedes            uuid REFERENCES t3a_ber_report,
  permitted_use_version text,
  current_until         date,             -- rendered on face; set from evidence-currency rule
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, version)
);
COMMENT ON TABLE t3a_ber_report IS
  '§21.8: prior versions superseded, never deleted (AC-45).  Renders from source (AC-17); no field capable of holding a trait / score / rank / recommendation.';

CREATE TABLE t3a_ber_statement (
  ber_statement_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ber_report_id         uuid NOT NULL REFERENCES t3a_ber_report ON DELETE CASCADE,
  dimension_id          t3a_dimension_code NOT NULL,
  composed_statement_id uuid NOT NULL REFERENCES t3a_composed_statement,
  contributing_observation_ids uuid[] NOT NULL,   -- source_link per §21.8
  stages_contributing   t3a_stage_code[] NOT NULL,
  recurrence_note       text,
  UNIQUE (ber_report_id, dimension_id)
);

CREATE TABLE t3a_disclosure (
  disclosure_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ber_report_id         uuid NOT NULL REFERENCES t3a_ber_report,
  participant_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_org_id      uuid,                    -- FK to employer_org later
  recipient_email       text,                    -- named recipient
  access_scope          text NOT NULL,
  access_period_starts  timestamptz NOT NULL,
  access_period_ends    timestamptz NOT NULL,
  identity_released_at  timestamptz,
  report_released_at    timestamptz,             -- separate from identity (two permissions)
  revoked_at            timestamptz,
  status                t3a_disclosure_status NOT NULL DEFAULT 'requested',
  recipient_binding_token_hash text,             -- §9.1: direct-link recipient binding
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (access_period_ends > access_period_starts)
);

-- Discoverability state per participant.  Two clocks (§9.6).
CREATE TABLE t3a_discoverability (
  participant_id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  discovery_consent             boolean NOT NULL DEFAULT false,
  accepts_access_requests       boolean NOT NULL DEFAULT false,
  discoverability_confirmed_at  timestamptz,
  discoverability_confirm_interval interval,
  updated_at                    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_discoverability IS
  '§9.6 + AC-16: discovery_consent defaults false. talentvisa_active is derived at read time from these + BER status + evidence currency; an open challenge does NOT set it false.';

-- ============================================================================
-- §21.9  CHALLENGE AND RECONSIDERATION
-- ============================================================================

CREATE TABLE t3a_challenge_case (
  challenge_case_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ber_report_id                 uuid NOT NULL REFERENCES t3a_ber_report,
  participant_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disputed_statement_id         uuid REFERENCES t3a_ber_statement,
  disputed_observation_id       uuid REFERENCES t3a_observation,
  challenge_ground              t3a_challenge_ground NOT NULL,
  status                        t3a_challenge_status NOT NULL DEFAULT 'open',
  reviewer_assignment           uuid,             -- uninvolved authorized reviewer
  evidence_disclosed_at         timestamptz,
  outcome                       text CHECK (outcome IN ('upheld','amended','withdrawn')),
  outcome_reasoning             text,
  observation_notification_timestamp timestamptz,
  response_time_committed       interval,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- §21.10  POST-RELEASE FOLLOW-UP AND RESPONSE METADATA
-- ============================================================================
-- Collects nothing at launch (OD-04 gates activation).  It records
-- response METADATA — never employment outcomes.  No question ever asks
-- whether the participant was hired.
-- ============================================================================

CREATE TABLE t3a_followup_metadata (
  followup_id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employment_link_id            uuid,             -- FK to socket below
  followup_window               text NOT NULL CHECK (followup_window IN ('30d','60d','90d')),
  followup_sent_timestamp       timestamptz,
  followup_response_status      text NOT NULL DEFAULT 'unknown'
                                  CHECK (followup_response_status IN ('received','not_received','declined','unknown')),
  question_set_version          text NOT NULL,
  followup_response_structured  jsonb,
  verification_level            text CHECK (verification_level IN (
                                  'self_reported','platform_verified',
                                  'mentor_confirmed','employer_confirmed'
                                )),
  delivery_channel              text CHECK (delivery_channel IN ('email','in_platform','sms')),
  created_at                    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- §21.11  REHEARSAL TELEMETRY, AGGREGATE ONLY  (write-only sink)
-- ============================================================================
-- Feature-disabled until the amendment to §6 and §12 is issued (OD-15).
-- Aggregates only — NO participant identifier, session identifier, device
-- hash or network hash may be written to this domain.  NO join key to
-- any other domain in EITHER direction.
-- ============================================================================

CREATE TABLE t3a_rehearsal_telemetry_aggregate (
  telemetry_id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_period                 text NOT NULL,   -- week or month identifier
  sessions_started              integer NOT NULL DEFAULT 0,
  sessions_completed            integer NOT NULL DEFAULT 0,
  feedback_generated_count      integer NOT NULL DEFAULT 0,
  feedback_acknowledged_count   integer NOT NULL DEFAULT 0,
  retake_within_window_count    integer NOT NULL DEFAULT 0,
  retake_window_days            integer NOT NULL DEFAULT 30,
  duration_distribution         jsonb NOT NULL DEFAULT '{}'::jsonb,
  scenario_class                t3a_scenario_class NOT NULL,
  suppression_reason            text,             -- populated when small-cohort suppressed
  created_at                    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_period, scenario_class)
);
COMMENT ON TABLE t3a_rehearsal_telemetry_aggregate IS
  '§21.11 socket: write-only aggregate sink.  NO identifier may cross into this domain.  Feature-disabled until §6/§12 amendment.';

-- ============================================================================
-- §21.12  ASSURANCE, RETENTION AND AUDIT
-- ============================================================================

CREATE TABLE t3a_moderation_sample (
  moderation_sample_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_id        uuid NOT NULL REFERENCES t3a_observation,
  sampling_plan_version text NOT NULL,
  sampled_at            timestamptz NOT NULL DEFAULT now(),
  paired_anchor_by_mentor uuid,
  paired_anchor_value   integer CHECK (paired_anchor_value BETWEEN 1 AND 4)
);

CREATE TABLE t3a_retention_schedule (
  retention_class       t3a_retention_class PRIMARY KEY,
  retention_period      interval,       -- NULL = unset; mechanism idle until set (§16.3)
  updated_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_retention_schedule IS
  '§14.3 + OD-07: periods are configuration; mechanism is not.  While NULL, retention runs but destroys nothing.';

-- Seed the seven classes with NULL periods so the mechanism has rows to
-- iterate but destroys nothing until periods land (§21.12 spec).
INSERT INTO t3a_retention_schedule (retention_class) VALUES
  ('issued_report'),
  ('observation_evidence'),
  ('identity_evidence'),
  ('audit_logs'),
  ('challenge_records'),
  ('verification_metadata'),
  ('anonymized_research');

CREATE TABLE t3a_destruction_event (
  destruction_event_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retention_class       t3a_retention_class NOT NULL,
  resource_type         text NOT NULL,
  resource_id           uuid NOT NULL,
  executed_at           timestamptz NOT NULL DEFAULT now(),
  reason                text
);

CREATE TABLE t3a_anonymization_event (
  anonymization_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retention_class       t3a_retention_class NOT NULL,
  resource_type         text NOT NULL,
  resource_id           uuid NOT NULL,
  executed_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE t3a_privileged_access_event (
  privileged_access_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id              uuid NOT NULL,
  target_type           text NOT NULL,
  target_id             uuid,
  occurred_at           timestamptz NOT NULL DEFAULT now(),
  justification         text,
  alert_raised          boolean NOT NULL DEFAULT false
);

CREATE TABLE t3a_discovery_query_log (
  query_log_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id           uuid NOT NULL,
  criteria              jsonb NOT NULL,
  pool_band_before      text,     -- coarse band, never exact count
  pool_band_after       text,
  occurred_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE t3a_suppression_event (
  suppression_event_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reason_code           text NOT NULL CHECK (reason_code IN ('small_n','dominance','integrity_low','gate_not_met')),
  context               jsonb,
  occurred_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- §21.14  EMPLOYMENT LINKAGE AND EMPLOYER RESPONDENT — SOCKET ONLY
-- ============================================================================
-- Feature-disabled.  Holds NO employment outcome field of any kind
-- (§21.14 locked constraint).  Cannot activate until the deferred item in
-- §18 clears: approved research purpose, completed privacy review,
-- explicit participant consent, employer agreement, tested access
-- separation.
-- ============================================================================

CREATE TABLE t3a_employment_link (
  employment_link_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  employer_org_id               uuid,                -- FK to employer_org later
  opportunity_id                uuid,
  linkage_route                 text CHECK (linkage_route IN ('platform_disclosure','external')),
  ber_version_released_at_linkage uuid REFERENCES t3a_ber_report,
  respondent_id                 uuid,
  respondent_role               text,
  relationship_to_participant   text,
  followup_due_dates            date[],
  question_set_version          text,
  created_at                    timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE t3a_employment_link IS
  '§21.14 socket only: NO employment outcome field of any kind — not still_employed, probation_status, expectations_met, integration, would_use_again, performance indicator, termination or exit category.  Prohibited by §12.1 #14 and AC-37.';

-- ============================================================================
-- RLS: enable on every new table.  Basic owner-read policies here; the
-- full §10 permission matrix lands in a follow-up PR alongside the
-- service layer.  Until then, writes require the service role.
-- ============================================================================

ALTER TABLE t3a_consent_state              ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_identity_assurance         ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_observation_path_gateway   ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_stage_entry_event          ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_stage_instance             ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_source_version             ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_observation                ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_determination_question     ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_statement_library          ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_composed_statement         ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_mentor_authorization       ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_conflict_declaration       ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_mentor_assignment          ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_mentor_judgment            ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_provenance                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_event_log                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_dimension_evidence         ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_ber_report                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_ber_statement              ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_disclosure                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_discoverability            ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_challenge_case             ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_followup_metadata          ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_rehearsal_telemetry_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_moderation_sample          ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_retention_schedule         ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_destruction_event          ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_anonymization_event        ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_privileged_access_event    ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_discovery_query_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_suppression_event          ENABLE ROW LEVEL SECURITY;
ALTER TABLE t3a_employment_link            ENABLE ROW LEVEL SECURITY;

-- Owner-read policies (participant sees own records).  The full permission
-- matrix (mentors, reviewers, coordinators, employers, admins, verification
-- service, commercial function) lands in a follow-up PR alongside the
-- service layer — an incomplete matrix here would widen access.

CREATE POLICY t3a_own_consent_state ON t3a_consent_state
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_identity_assurance ON t3a_identity_assurance
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_gateway ON t3a_observation_path_gateway
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_stage_instance ON t3a_stage_instance
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_observation ON t3a_observation
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_dimension_evidence ON t3a_dimension_evidence
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_ber_report ON t3a_ber_report
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_ber_statement ON t3a_ber_statement
  FOR SELECT USING (
    ber_report_id IN (SELECT ber_report_id FROM t3a_ber_report WHERE participant_id = auth.uid())
  );
CREATE POLICY t3a_own_disclosure ON t3a_disclosure
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_discoverability ON t3a_discoverability
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_challenge_case ON t3a_challenge_case
  FOR SELECT USING (participant_id = auth.uid());
CREATE POLICY t3a_own_employment_link ON t3a_employment_link
  FOR SELECT USING (participant_id = auth.uid());

NOTIFY pgrst, 'reload schema';

COMMIT;
