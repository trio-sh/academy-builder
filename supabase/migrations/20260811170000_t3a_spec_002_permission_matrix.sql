-- ============================================================================
-- T3A-DEV-SPEC-002 v2.0 · Step 3 · Permission matrix (§10) + role grants
-- ============================================================================
-- Section 10 of the spec locks a per-role, per-object read/write matrix.
-- Step 2 landed the tables with placeholder owner-read policies; this
-- migration installs the full matrix.
--
-- Roles per §3: participant, mentor, reviewer, coordinator, commercial,
-- employer, admin, verification (unauthenticated).  The existing
-- profiles.role column carries the app-level account role
-- (candidate/mentor/employer/school_admin/admin) and is preserved
-- unchanged — this migration adds a SEPARATE t3a_role_grant table.
--
-- Rationale (§21.1): "Model roles as an account-to-role assignment
-- rather than a single column, so one account can hold more than one
-- authorized role without any role widening another's permissions."
-- Grants are per-role, per-account.  A user can hold multiple grants
-- (e.g. mentor + reviewer) without any grant elevating another.
--
-- Independence rules in §3 that are NOT expressed here — "reviewer must
-- be uninvolved in the challenged observation", "conflict declarations
-- block allocation" — belong to the service layer; RLS enforces WHO
-- can see WHAT category, not case-by-case independence within a
-- category.  A reviewer who reads a case they authored is a service-
-- level bug, not an RLS bug.
--
-- Writes: every new-table INSERT / UPDATE still requires the service
-- role until the Section 13 endpoints land (Step 4).  Client-side
-- writes to the evidence chain are never permitted.
-- ============================================================================

BEGIN;

-- ------------------------------------------------------------------
-- t3a_role_grant + helper function
-- ------------------------------------------------------------------

CREATE TYPE t3a_spec_role AS ENUM (
  'participant',
  'mentor',
  'reviewer',
  'coordinator',
  'commercial',
  'employer',
  'admin'
);

CREATE TABLE t3a_role_grant (
  role_grant_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spec_role         t3a_spec_role NOT NULL,
  granted_at        timestamptz NOT NULL DEFAULT now(),
  granted_by        uuid,
  revoked_at        timestamptz,
  UNIQUE (user_id, spec_role)
);
COMMENT ON TABLE t3a_role_grant IS
  '§3 + §21.1: per-account grant of a T3A-DEV-SPEC-002 role. Separate from profiles.role. One account can hold multiple grants; no grant widens another.';

CREATE INDEX t3a_role_grant_user_active_idx
  ON t3a_role_grant (user_id, spec_role) WHERE revoked_at IS NULL;

ALTER TABLE t3a_role_grant ENABLE ROW LEVEL SECURITY;
-- A user can see their own grants; only the service role writes.
CREATE POLICY t3a_role_grant_self ON t3a_role_grant
  FOR SELECT USING (user_id = auth.uid());

-- t3a_has_role: does the current user hold an active grant of this role?
-- SECURITY DEFINER so the check can read t3a_role_grant even under the
-- caller's restricted RLS. STABLE so Postgres can cache it within a
-- statement.
CREATE OR REPLACE FUNCTION t3a_has_role(role_key t3a_spec_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM t3a_role_grant
    WHERE user_id = auth.uid()
      AND spec_role = role_key
      AND revoked_at IS NULL
  );
$$;

-- Convenience predicates so policies read naturally.
CREATE OR REPLACE FUNCTION t3a_is_mentor()      RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t3a_has_role('mentor')      $$;
CREATE OR REPLACE FUNCTION t3a_is_reviewer()    RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t3a_has_role('reviewer')    $$;
CREATE OR REPLACE FUNCTION t3a_is_coordinator() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t3a_has_role('coordinator') $$;
CREATE OR REPLACE FUNCTION t3a_is_commercial()  RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t3a_has_role('commercial')  $$;
CREATE OR REPLACE FUNCTION t3a_is_employer()    RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t3a_has_role('employer')    $$;
CREATE OR REPLACE FUNCTION t3a_is_admin()       RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT t3a_has_role('admin')       $$;

-- ------------------------------------------------------------------
-- Drop the placeholder owner-read policies from Step 2 before
-- installing the full matrix. Each replacement policy is spec-cited.
-- ------------------------------------------------------------------

DROP POLICY IF EXISTS t3a_own_consent_state          ON t3a_consent_state;
DROP POLICY IF EXISTS t3a_own_identity_assurance     ON t3a_identity_assurance;
DROP POLICY IF EXISTS t3a_own_gateway                ON t3a_observation_path_gateway;
DROP POLICY IF EXISTS t3a_own_stage_instance         ON t3a_stage_instance;
DROP POLICY IF EXISTS t3a_own_observation            ON t3a_observation;
DROP POLICY IF EXISTS t3a_own_dimension_evidence     ON t3a_dimension_evidence;
DROP POLICY IF EXISTS t3a_own_ber_report             ON t3a_ber_report;
DROP POLICY IF EXISTS t3a_own_ber_statement          ON t3a_ber_statement;
DROP POLICY IF EXISTS t3a_own_disclosure             ON t3a_disclosure;
DROP POLICY IF EXISTS t3a_own_discoverability        ON t3a_discoverability;
DROP POLICY IF EXISTS t3a_own_challenge_case         ON t3a_challenge_case;
DROP POLICY IF EXISTS t3a_own_employment_link        ON t3a_employment_link;

-- ============================================================================
-- §10 permission matrix — one section per object.
-- Each SELECT policy encodes the full read matrix; WRITE is confined to
-- the service role until Step 4 lands the Section 13 endpoints.
-- ============================================================================

-- ---- Rehearsal content ---------------------------------------------------
-- Rehearsal lives in a separate domain (§6). This migration installs no
-- policy for that domain — it is out of scope for the evidence chain and
-- will be covered when its dedicated tables land. The relevant invariant
-- for §10 is "no one else may read rehearsal content"; the absence of a
-- rehearsal cross-domain permission here is intentional.

-- ---- Observation Path Gateway (§10: participant R own; mentor / reviewer / coordinator / admin R) --

CREATE POLICY t3a_gateway_read ON t3a_observation_path_gateway
  FOR SELECT USING (
       participant_id = auth.uid()          -- participant sees their own
    OR t3a_is_mentor()                      -- mentors see gateway events
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

-- ---- Stage Entry Event (§10: same visibility as gateway) --------------

CREATE POLICY t3a_stage_entry_event_read ON t3a_stage_entry_event
  FOR SELECT USING (
       t3a_is_mentor()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
    OR EXISTS (
      SELECT 1 FROM t3a_observation_path_gateway g
       WHERE g.observation_path_gateway_id = t3a_stage_entry_event.observation_path_gateway_id
         AND g.participant_id = auth.uid()
    )
  );

-- ---- Stage instance (participant R own; mentor / reviewer / coordinator R) --

CREATE POLICY t3a_stage_instance_read ON t3a_stage_instance
  FOR SELECT USING (
       participant_id = auth.uid()
    OR t3a_is_mentor()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

-- ---- Source version (all readers except commercial/employer) ---------
-- Sources are content-neutral scenario / brief / work-demand versions.
-- Employers never read the source registry; they see only what the BER
-- surfaces from a released report.

CREATE POLICY t3a_source_version_read ON t3a_source_version
  FOR SELECT USING (
       t3a_is_mentor()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

-- ---- Observation / evidence item -------------------------------------
-- §10: participant R own (AFTER commit); mentor RW own sessions;
-- reviewer R; coordinator R.
-- "After commit" is a service-layer semantics — this policy grants
-- read on ANY committed row participant_id matches. Uncommitted drafts
-- live in the service memory and are never written to this table
-- until the mentor commits.

CREATE POLICY t3a_observation_read ON t3a_observation
  FOR SELECT USING (
       participant_id = auth.uid()
    OR (t3a_is_mentor() AND observer_id = auth.uid())
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

-- ---- Determination + statement library (mentor / reviewer / coordinator R) --

CREATE POLICY t3a_determination_question_read ON t3a_determination_question
  FOR SELECT USING (
       t3a_is_mentor()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

CREATE POLICY t3a_statement_library_read ON t3a_statement_library
  FOR SELECT USING (
       t3a_is_mentor()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

CREATE POLICY t3a_composed_statement_read ON t3a_composed_statement
  FOR SELECT USING (
       t3a_is_mentor()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR EXISTS (
      -- Participant sees composed statements that landed on their own BER
      SELECT 1 FROM t3a_ber_statement s
       JOIN t3a_ber_report r ON r.ber_report_id = s.ber_report_id
       WHERE s.composed_statement_id = t3a_composed_statement.composed_statement_id
         AND r.participant_id = auth.uid()
    )
  );

-- ---- Mentor authorization + conflict + assignment --------------------

CREATE POLICY t3a_mentor_authorization_self ON t3a_mentor_authorization
  FOR SELECT USING (
       mentor_id = auth.uid()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

CREATE POLICY t3a_conflict_declaration_read ON t3a_conflict_declaration
  FOR SELECT USING (
       mentor_id = auth.uid()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

CREATE POLICY t3a_mentor_assignment_read ON t3a_mentor_assignment
  FOR SELECT USING (
       mentor_id = auth.uid()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

-- ---- Mentor judgment / progression decision (§10: mentor W own; reviewer / coordinator R) --
-- Mentor sees their own judgment rows; reviewer + coordinator see all.
-- Participant NEVER sees mentor_judgment (progression / rationale /
-- flags / confidence are internal per §5.1.1 locked note).

CREATE POLICY t3a_mentor_judgment_read ON t3a_mentor_judgment
  FOR SELECT USING (
       (t3a_is_mentor() AND (
            human_confirmation_actor_id = auth.uid()
         OR EXISTS (
              SELECT 1 FROM t3a_observation o
               WHERE o.observation_id = t3a_mentor_judgment.observation_id
                 AND o.observer_id = auth.uid()
            )
       ))
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

-- ---- Provenance (reviewer / coordinator R; no other role) ------------

CREATE POLICY t3a_provenance_read ON t3a_provenance
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

-- ---- Event log (reviewer + coordinator R all; admin R access events only; participant R own actions) --
-- "Access events" per §10 admin row = anything where the actor is an
-- account admin OR event_category = 'SYSTEM' with a resource_type
-- indicating access. The precise category set is service-layer-owned;
-- here we grant admin the SYSTEM category, and rely on the service
-- layer to keep sensitive detail out of SYSTEM payloads.

CREATE POLICY t3a_event_log_read ON t3a_event_log
  FOR SELECT USING (
       actor_id = auth.uid()                        -- own actions
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR (t3a_is_admin() AND event_category = 'SYSTEM')
  );

-- ---- Dimension evidence state (§10: reviewer + coordinator R; nobody else) --
-- Participants + employers NEVER see the raw state — sufficiency governs
-- which LANGUAGE a statement may use and is not itself displayed (AC-54).

CREATE POLICY t3a_dimension_evidence_read ON t3a_dimension_evidence
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

-- ---- BER report + BER statement (§10: participant R own all versions; mentor R own participants; reviewer R; employer R released only) --

CREATE POLICY t3a_ber_report_read ON t3a_ber_report
  FOR SELECT USING (
       participant_id = auth.uid()
    OR (t3a_is_mentor() AND EXISTS (
          -- Mentor sees BERs for participants they have observed
          SELECT 1 FROM t3a_observation o
           WHERE o.participant_id = t3a_ber_report.participant_id
             AND o.observer_id = auth.uid()
       ))
    OR t3a_is_reviewer()
    OR (t3a_is_employer() AND EXISTS (
          -- Employer sees BERs where an active disclosure to them is granted + report released
          SELECT 1 FROM t3a_disclosure d
           WHERE d.ber_report_id = t3a_ber_report.ber_report_id
             AND d.status = 'granted'
             AND d.report_released_at IS NOT NULL
             AND d.revoked_at IS NULL
             AND now() BETWEEN d.access_period_starts AND d.access_period_ends
             AND d.recipient_org_id IN (
                   SELECT rg.user_id FROM t3a_role_grant rg
                    WHERE rg.spec_role = 'employer'
                      AND rg.user_id = auth.uid()
                 )
       ))
  );

CREATE POLICY t3a_ber_statement_read ON t3a_ber_statement
  FOR SELECT USING (
    -- Delegates the same visibility as the parent BER report.
    EXISTS (
      SELECT 1 FROM t3a_ber_report r
       WHERE r.ber_report_id = t3a_ber_statement.ber_report_id
         AND (
              r.participant_id = auth.uid()
           OR t3a_is_reviewer()
           OR (t3a_is_mentor() AND EXISTS (
                 SELECT 1 FROM t3a_observation o
                  WHERE o.participant_id = r.participant_id
                    AND o.observer_id = auth.uid()
              ))
           OR (t3a_is_employer() AND EXISTS (
                 SELECT 1 FROM t3a_disclosure d
                  WHERE d.ber_report_id = r.ber_report_id
                    AND d.status = 'granted'
                    AND d.report_released_at IS NOT NULL
                    AND d.revoked_at IS NULL
                    AND now() BETWEEN d.access_period_starts AND d.access_period_ends
              ))
         )
    )
  );

-- ---- Disclosure object (§10: participant RW own; reviewer R; coordinator R; employer R own) --

CREATE POLICY t3a_disclosure_read ON t3a_disclosure
  FOR SELECT USING (
       participant_id = auth.uid()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR (t3a_is_employer() AND recipient_org_id = auth.uid())
  );

-- Discoverability: participant R own only.
CREATE POLICY t3a_discoverability_read ON t3a_discoverability
  FOR SELECT USING (participant_id = auth.uid());

-- ---- Challenge case (§10: participant RW own; mentor RW as respondent; reviewer RW; coordinator R) --

CREATE POLICY t3a_challenge_case_read ON t3a_challenge_case
  FOR SELECT USING (
       participant_id = auth.uid()
    OR (t3a_is_mentor() AND EXISTS (
          -- Mentor is respondent iff they are the observer on the disputed observation
          SELECT 1 FROM t3a_observation o
           WHERE o.observation_id = t3a_challenge_case.disputed_observation_id
             AND o.observer_id = auth.uid()
       ))
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

-- ---- Employment linkage socket (participant R own; nobody else until §18 clears) --

CREATE POLICY t3a_employment_link_read ON t3a_employment_link
  FOR SELECT USING (
       participant_id = auth.uid()
    OR t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

-- ---- Follow-up metadata (reviewer + coordinator only; participants see their own via a joined view later) --

CREATE POLICY t3a_followup_metadata_read ON t3a_followup_metadata
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

-- ---- Rehearsal telemetry (aggregate; reviewer + coordinator R only) --

CREATE POLICY t3a_rehearsal_telemetry_read ON t3a_rehearsal_telemetry_aggregate
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

-- ---- Assurance domain — reviewer + coordinator + admin --------------

CREATE POLICY t3a_moderation_sample_read ON t3a_moderation_sample
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
  );

CREATE POLICY t3a_retention_schedule_read ON t3a_retention_schedule
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

CREATE POLICY t3a_destruction_event_read ON t3a_destruction_event
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

CREATE POLICY t3a_anonymization_event_read ON t3a_anonymization_event
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

CREATE POLICY t3a_privileged_access_event_read ON t3a_privileged_access_event
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

CREATE POLICY t3a_discovery_query_log_read ON t3a_discovery_query_log
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
    OR (t3a_is_commercial() AND employer_id = auth.uid())
  );

CREATE POLICY t3a_suppression_event_read ON t3a_suppression_event
  FOR SELECT USING (
       t3a_is_reviewer()
    OR t3a_is_coordinator()
    OR t3a_is_admin()
  );

-- ---- Consent + identity assurance (participant R own; reviewer R for challenge defence) --

CREATE POLICY t3a_consent_state_read ON t3a_consent_state
  FOR SELECT USING (
       participant_id = auth.uid()
    OR t3a_is_reviewer()
  );

CREATE POLICY t3a_identity_assurance_read ON t3a_identity_assurance
  FOR SELECT USING (
       participant_id = auth.uid()
    OR t3a_is_reviewer()
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
