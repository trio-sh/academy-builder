-- ============================================================================
-- T3A-DEV-SPEC-002 v2.0 · Step 4 · Section 13 service endpoints
-- ============================================================================
-- The service layer named in Section 13.  Each endpoint is a SECURITY
-- DEFINER Postgres function so the authority + preconditions live at the
-- boundary the RLS gates, not in client code.  Client code CAN ONLY reach
-- the evidence chain through these functions; direct INSERT/UPDATE to the
-- t3a_* tables remains blocked by RLS (no INSERT/UPDATE policies exist
-- for the caller role).
--
-- Every function fails visibly on a violation.  Section 21.13 missing-
-- state codes and Section 13 authority rules are enforced with RAISE
-- EXCEPTION.  No function may implicitly proceed on a missing precondition
-- (§16.3 socket discipline, AC-53).
--
-- Locked in the spec, enforced here:
--   §13  confirmS1Observation and recordProgressionDecision are separate
--        persisted actions — no side-effect writes between them.
--   §12.1 #5   every consequential S2..S4 observation traces to an
--              authorized human observer.
--   §12.1 #6   every evidence change is append-only.
--   §7.3       mentors do NOT write statement text — determinations
--              resolve to a library entry, or the commit refuses.
--   §16.3      empty sockets refuse; no fallback, no default.
--
-- Heavier endpoints (deriveSufficiency, assembleReportDraft, issueReport,
-- queryDiscovery) land as feature-disabled sockets in this PR — they
-- return a logged refusal rather than a default.  Their real bodies
-- ship in Step 5+ once the sufficiency rules, statement library and
-- discovery privacy floor are configured.
--
-- Naming: every function is `t3a_<verb>_<subject>()`, returns the new
-- row's uuid (or a jsonb result for multi-row operations).  Exceptions
-- carry a SQLSTATE 'T3A01' so callers can distinguish spec refusals
-- from ordinary DB errors.
-- ============================================================================

BEGIN;

-- Standard error raiser used across every endpoint.  T3A01 is a custom
-- SQLSTATE (5 chars, class 'T3', not colliding with reserved classes).
-- Message begins with the spec section so a caller sees where to look.
CREATE OR REPLACE FUNCTION t3a_raise(section text, msg text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'T3A01',
    MESSAGE = section || ': ' || msg;
END;
$$;

-- ============================================================================
-- createObservationPathGateway  (§13, §21.2)
-- ============================================================================
-- Records the crossing from private preparation into the observed chain.
-- Once per participant per observation path.  Carries no dimension key
-- and no Stage instance key.  Fails without registration identity,
-- observation consent and eligibility.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_create_observation_path_gateway(
  p_session_identity_method     text,
  p_observation_consent_version text,
  p_assistance_rules_version    text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant uuid := auth.uid();
  v_id uuid;
BEGIN
  -- §13 authority: participant on their own action.
  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 createObservationPathGateway',
      'no auth.uid(): unauthenticated caller cannot open a gateway');
  END IF;

  -- §21.1 precondition: registration identity must exist.
  IF NOT EXISTS (
    SELECT 1 FROM t3a_identity_assurance
      WHERE participant_id = v_participant
  ) THEN
    PERFORM t3a_raise('§14.2 identity assurance',
      'registration identity not established for participant; open a gateway is refused');
  END IF;

  -- §21.1 precondition: observation-consent must be granted and current.
  IF NOT EXISTS (
    SELECT 1 FROM t3a_consent_state
      WHERE participant_id = v_participant
        AND consent_type = 'mentor_observation'
        AND consent_status = 'granted'
  ) THEN
    PERFORM t3a_raise('§21.1 consent',
      'mentor_observation consent not granted; gateway refused');
  END IF;

  IF p_session_identity_method IS NULL OR btrim(p_session_identity_method) = '' THEN
    PERFORM t3a_raise('§14.2', 'session_identity_method required');
  END IF;
  IF p_observation_consent_version IS NULL OR btrim(p_observation_consent_version) = '' THEN
    PERFORM t3a_raise('§21.2', 'observation_consent_version required');
  END IF;
  IF p_assistance_rules_version IS NULL OR btrim(p_assistance_rules_version) = '' THEN
    PERFORM t3a_raise('§21.2', 'assistance_rules_version required');
  END IF;

  INSERT INTO t3a_observation_path_gateway (
    participant_id, session_identity_method,
    observation_consent_version, assistance_rules_version,
    coaching_terminated_at
  ) VALUES (
    v_participant, p_session_identity_method,
    p_observation_consent_version, p_assistance_rules_version,
    now()
  ) RETURNING observation_path_gateway_id INTO v_id;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id, subject_id,
    resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'observation_path_gateway_opened', 'PARTICIPANT', 'PARTICIPANT',
    v_participant, v_participant, 'observation_path_gateway', v_id,
    jsonb_build_object(
      'observation_consent_version', p_observation_consent_version,
      'assistance_rules_version', p_assistance_rules_version
    ),
    encode(digest(v_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$$;

-- ============================================================================
-- createStageEntryEvent  (§13, §21.2)
-- ============================================================================
-- Opens one Stage instance for observation.  Once per Stage instance,
-- S1 through S4.  Fired immediately before observation begins — NEVER
-- at allocation, because conditions can change between the two.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_create_stage_entry_event(
  p_stage_instance_id       uuid,
  p_session_identity        text,
  p_assistance_rules_version text,
  p_administration_conditions jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant uuid;
  v_gateway uuid;
  v_stage t3a_stage_code;
  v_dim   t3a_dimension_code;
  v_id uuid;
BEGIN
  SELECT participant_id, stage_code, dimension_id
    INTO v_participant, v_stage, v_dim
    FROM t3a_stage_instance
    WHERE stage_instance_id = p_stage_instance_id;

  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 createStageEntryEvent',
      'stage_instance not found');
  END IF;

  -- Active gateway must exist for the participant.  Gateway carries no
  -- dimension/stage key, so we pick the most recent one — the spec says
  -- "one per participant per observation path" and the path is defined
  -- by the participant's active enrolment.
  SELECT observation_path_gateway_id INTO v_gateway
    FROM t3a_observation_path_gateway
    WHERE participant_id = v_participant
    ORDER BY created_at DESC
    LIMIT 1;

  IF v_gateway IS NULL THEN
    PERFORM t3a_raise('§5.1.1 entry conditions',
      'no observation_path_gateway for participant; cannot open Stage instance');
  END IF;

  -- §7.3.1 socket refusal: the dimension must have an approved question
  -- set + at least one approved statement library entry.  A dimension
  -- whose determination content is absent is NOT observable.
  IF NOT EXISTS (
    SELECT 1 FROM t3a_determination_question
      WHERE dimension_id = v_dim AND approved_at IS NOT NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM t3a_statement_library
      WHERE dimension_id = v_dim AND approved_at IS NOT NULL
  ) THEN
    PERFORM t3a_raise('§7.3.1 socket refusal',
      format('dimension %s has no approved determination content; Stage refused', v_dim));
  END IF;

  INSERT INTO t3a_stage_entry_event (
    observation_path_gateway_id, stage_instance_id,
    stage_code, dimensions_in_play,
    session_identity, assistance_rules_version, administration_conditions
  ) VALUES (
    v_gateway, p_stage_instance_id,
    v_stage, ARRAY[v_dim],
    p_session_identity, p_assistance_rules_version, p_administration_conditions
  ) RETURNING stage_entry_event_id INTO v_id;

  UPDATE t3a_stage_instance
     SET state = 'active', activated_at = now()
   WHERE stage_instance_id = p_stage_instance_id;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id, subject_id,
    resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'stage_entry_event_opened', 'OBSERVATION', 'SYSTEM',
    v_participant, v_participant, 'stage_entry_event', v_id,
    jsonb_build_object(
      'stage_code', v_stage,
      'dimension_id', v_dim,
      'assistance_rules_version', p_assistance_rules_version
    ),
    encode(digest(v_id::text || p_stage_instance_id::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$$;

-- ============================================================================
-- confirmS1Observation  (§13, AC-55, AC-58)
-- ============================================================================
-- Human confirmation that a machine-administered S1 observation is
-- eligible to enter the evidence record.  Authorized mentor only.
-- Writes NO progression decision — that is a separate call (AC-58).
-- The S1 confirmer is recorded in t3a_mentor_judgment.human_confirmation_*,
-- NEVER in t3a_observation.observer_id.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_confirm_s1_observation(
  p_observation_id  uuid,
  p_confirmation_role text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_stage t3a_stage_code;
  v_dim   t3a_dimension_code;
  v_stage_instance uuid;
  v_snapshot jsonb;
  v_judgment_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT t3a_is_mentor() THEN
    PERFORM t3a_raise('§13 confirmS1Observation',
      'authorized mentor role required');
  END IF;

  SELECT stage_code, dimension_id, stage_instance_id
    INTO v_stage, v_dim, v_stage_instance
    FROM t3a_observation
    WHERE observation_id = p_observation_id;

  IF v_stage IS NULL THEN
    PERFORM t3a_raise('§13', 'observation not found');
  END IF;
  IF v_stage <> 'S1' THEN
    PERFORM t3a_raise('§13 confirmS1Observation',
      format('only S1 observations are confirmed here; got %s', v_stage));
  END IF;

  -- Authorization current AT the confirmation date must exist for this
  -- dimension (§21.4 authorization_snapshot_ref).  A later lookup cannot
  -- recover the state, so snapshot it now.
  SELECT jsonb_build_object(
    'mentor_authorization_id', mentor_authorization_id,
    'calibration_status', calibration_status,
    'reference_set_version', reference_set_version,
    'authorized_from', authorized_from,
    'authorized_until', authorized_until,
    'as_at', now()
  ) INTO v_snapshot
  FROM t3a_mentor_authorization
  WHERE mentor_id = v_actor
    AND dimension_id = v_dim
    AND authorized_from <= now()
    AND (authorized_until IS NULL OR authorized_until >= now())
    AND calibration_status = 'current';

  IF v_snapshot IS NULL THEN
    PERFORM t3a_raise('§14.2 authorization-at-date',
      format('no current authorization for dimension %s at %s', v_dim, now()));
  END IF;

  INSERT INTO t3a_mentor_judgment (
    stage_instance_id, observation_id,
    human_confirmation_actor_id, human_confirmation_at,
    confirmation_role, authorization_snapshot_ref
  ) VALUES (
    v_stage_instance, p_observation_id,
    v_actor, now(),
    p_confirmation_role, v_snapshot
  ) RETURNING mentor_judgment_id INTO v_judgment_id;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    's1_observation_confirmed', 'MENTOR', 'MENTOR', v_actor,
    'observation', p_observation_id,
    jsonb_build_object('mentor_judgment_id', v_judgment_id, 'dimension_id', v_dim),
    encode(digest(v_judgment_id::text || p_observation_id::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_judgment_id;
END;
$$;

-- ============================================================================
-- recordProgressionDecision  (§13, AC-58, AC-59, AC-60)
-- ============================================================================
-- Proceed / redirect / pause on one dimension and one Stage instance.
-- Separate from confirmS1Observation.  ONE canonical entity serves all
-- four Stages (AC-60).  Cannot be recorded against an S1 instance that
-- has not been confirmed (AC-59).
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_record_progression_decision(
  p_stage_instance_id  uuid,
  p_dimension_id       t3a_dimension_code,
  p_decision           t3a_progression_decision,
  p_rationale          text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_stage t3a_stage_code;
  v_participant uuid;
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT t3a_is_mentor() THEN
    PERFORM t3a_raise('§13 recordProgressionDecision',
      'authorized mentor role required');
  END IF;
  IF p_rationale IS NULL OR length(btrim(p_rationale)) < 20 THEN
    PERFORM t3a_raise('§21.4',
      'decision_rationale is required and minimum two sentences');
  END IF;

  SELECT stage_code, participant_id
    INTO v_stage, v_participant
    FROM t3a_stage_instance
    WHERE stage_instance_id = p_stage_instance_id;

  IF v_stage IS NULL THEN
    PERFORM t3a_raise('§13', 'stage_instance not found');
  END IF;

  -- AC-59: cannot record a progression decision for an S1 instance
  -- that has not been confirmed.
  IF v_stage = 'S1' AND NOT EXISTS (
    SELECT 1 FROM t3a_mentor_judgment
      WHERE stage_instance_id = p_stage_instance_id
        AND human_confirmation_actor_id IS NOT NULL
  ) THEN
    PERFORM t3a_raise('AC-59',
      'S1 instance has no confirmation; progression decision refused');
  END IF;

  INSERT INTO t3a_mentor_judgment (
    stage_instance_id,
    progression_decision, progression_dimension_id, decision_rationale
  ) VALUES (
    p_stage_instance_id,
    p_decision, p_dimension_id, p_rationale
  ) RETURNING mentor_judgment_id INTO v_id;

  -- Redirect holds the next Stage; Pause suspends observation on the
  -- dimension.  State transitions per §11.
  IF p_decision = 'redirect' THEN
    UPDATE t3a_stage_instance
       SET state = 'redirected'
     WHERE stage_instance_id = p_stage_instance_id;
  ELSIF p_decision = 'pause' THEN
    UPDATE t3a_stage_instance
       SET state = 'paused'
     WHERE stage_instance_id = p_stage_instance_id;
  ELSIF p_decision = 'proceed' THEN
    UPDATE t3a_stage_instance
       SET state = 'completed', completed_at = now()
     WHERE stage_instance_id = p_stage_instance_id
       AND state IN ('active', 'scheduled', 'eligible');
  END IF;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'progression_decision_recorded', 'MENTOR', 'MENTOR', v_actor,
    v_participant, 'stage_instance', p_stage_instance_id,
    jsonb_build_object(
      'decision', p_decision,
      'dimension_id', p_dimension_id,
      'stage_code', v_stage
    ),
    encode(digest(v_id::text || p_stage_instance_id::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$$;

-- ============================================================================
-- commitObservation  (§13, §12.1 #5, AC-08)
-- ============================================================================
-- Write an observation to the evidence domain.  Mentor at S2..S4;
-- mentor confirmation at S1 (which goes through confirmS1Observation
-- above, not here).  Never the AI layer (AC-11).
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_commit_observation(
  p_participant_id           uuid,
  p_stage_instance_id        uuid,
  p_source_version_id        uuid,
  p_dimension_id             t3a_dimension_code,
  p_stage_code               t3a_stage_code,
  p_attempt_no               integer,
  p_determination_answers    jsonb,
  p_relevance_basis          jsonb,
  p_evidence_class           t3a_evidence_class,
  p_administration_conditions jsonb DEFAULT '{}'::jsonb,
  p_administration_variance  jsonb DEFAULT '{}'::jsonb,
  p_accommodation_class      t3a_accommodation_class DEFAULT NULL,
  p_descriptor_version       text DEFAULT '',
  p_ordinal_anchor           integer DEFAULT NULL,
  p_evidence_notes           text DEFAULT NULL,
  p_contemporaneity          t3a_contemporaneity DEFAULT 'contemporaneous',
  p_late_entry_delay_seconds integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_authorization_snapshot jsonb;
  v_composed_id uuid;
  v_statement_id uuid;
  v_source_class t3a_scenario_class;
  v_id uuid;
BEGIN
  IF v_actor IS NULL OR NOT t3a_is_mentor() THEN
    PERFORM t3a_raise('§13 commitObservation',
      'authorized mentor role required (AC-11: AI layer cannot commit)');
  END IF;
  IF p_stage_code = 'S1' THEN
    PERFORM t3a_raise('§13 commitObservation',
      'S1 goes through t3a_confirm_s1_observation, not commitObservation');
  END IF;

  -- §12.1 #5: observer authorization must be current AT the observation
  -- date.  Snapshot it now — a later lookup cannot recover the state.
  SELECT jsonb_build_object(
    'mentor_authorization_id', mentor_authorization_id,
    'calibration_status', calibration_status,
    'reference_set_version', reference_set_version,
    'as_at', now()
  ) INTO v_authorization_snapshot
  FROM t3a_mentor_authorization
  WHERE mentor_id = v_actor
    AND dimension_id = p_dimension_id
    AND authorized_from <= now()
    AND (authorized_until IS NULL OR authorized_until >= now())
    AND calibration_status = 'current';

  IF v_authorization_snapshot IS NULL THEN
    PERFORM t3a_raise('§12.1 #5 / AC-08',
      format('mentor %s not currently authorized for dimension %s', v_actor, p_dimension_id));
  END IF;

  -- §5.3.1 socket refusal: source cannot be instructional/private_rehearsal.
  SELECT scenario_class INTO v_source_class
    FROM t3a_source_version WHERE source_version_id = p_source_version_id;
  IF v_source_class IS NULL THEN
    PERFORM t3a_raise('§13', 'source_version not found');
  END IF;
  IF v_source_class IN ('instructional', 'private_rehearsal') THEN
    PERFORM t3a_raise('§5.3.1',
      format('scenario class %s is structurally incapable of serving the observed pathway', v_source_class));
  END IF;

  -- §7.3 composition: determination_answers MUST resolve to a library
  -- entry.  A mentor cannot write statement text directly (AC-09, AC-50).
  SELECT statement_id INTO v_statement_id
    FROM t3a_statement_library
   WHERE dimension_id = p_dimension_id
     AND answer_key = p_determination_answers
     AND approved_at IS NOT NULL
   LIMIT 1;

  IF v_statement_id IS NULL THEN
    PERFORM t3a_raise('AC-49 / AC-50',
      format('no approved statement library entry resolves the given determinations for %s', p_dimension_id));
  END IF;

  INSERT INTO t3a_composed_statement (statement_id, rendered_body)
    SELECT v_statement_id, statement_body FROM t3a_statement_library
      WHERE statement_id = v_statement_id
    RETURNING composed_statement_id INTO v_composed_id;

  INSERT INTO t3a_observation (
    participant_id, stage_code, dimension_id, source_version_id,
    attempt_no, stage_instance_id, observer_id,
    observer_authorization_at_date, ordinal_anchor, descriptor_version,
    determination_answers, composed_statement_id, relevance_basis,
    evidence_class, administration_conditions, administration_variance,
    accommodation_class, comparability_class, evidence_notes,
    contemporaneity, late_entry_delay_seconds
  ) VALUES (
    p_participant_id, p_stage_code, p_dimension_id, p_source_version_id,
    p_attempt_no, p_stage_instance_id, v_actor,
    v_authorization_snapshot, p_ordinal_anchor, p_descriptor_version,
    p_determination_answers, v_composed_id, p_relevance_basis,
    p_evidence_class, p_administration_conditions, p_administration_variance,
    p_accommodation_class,
    CASE WHEN p_accommodation_class = 'demand_modifying'
         THEN 'interpret_individually'::t3a_comparability_class
         ELSE 'directly_comparable'::t3a_comparability_class END,
    p_evidence_notes,
    p_contemporaneity, p_late_entry_delay_seconds
  ) RETURNING observation_id INTO v_id;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'observation_committed', 'OBSERVATION', 'MENTOR', v_actor,
    p_participant_id, 'observation', v_id,
    jsonb_build_object(
      'stage_code', p_stage_code,
      'dimension_id', p_dimension_id,
      'source_version_id', p_source_version_id
    ),
    encode(digest(v_id::text || v_actor::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$$;

-- ============================================================================
-- openChallenge  (§13, §8, §21.9)
-- ============================================================================
-- Participant opens a challenge against a specific statement + evidence
-- item.  Independent reconsideration.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_open_challenge(
  p_ber_report_id           uuid,
  p_disputed_statement_id   uuid,
  p_disputed_observation_id uuid,
  p_challenge_ground        t3a_challenge_ground
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
BEGIN
  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 openChallenge', 'unauthenticated caller');
  END IF;

  SELECT participant_id INTO v_owner
    FROM t3a_ber_report WHERE ber_report_id = p_ber_report_id;
  IF v_owner IS NULL THEN
    PERFORM t3a_raise('§13', 'ber_report not found');
  END IF;
  IF v_owner <> v_participant THEN
    PERFORM t3a_raise('§13', 'a participant can only challenge their own report');
  END IF;

  INSERT INTO t3a_challenge_case (
    ber_report_id, participant_id,
    disputed_statement_id, disputed_observation_id,
    challenge_ground, status, observation_notification_timestamp
  ) VALUES (
    p_ber_report_id, v_participant,
    p_disputed_statement_id, p_disputed_observation_id,
    p_challenge_ground, 'open', now()
  ) RETURNING challenge_case_id INTO v_id;

  -- §8 + AC-16: an open challenge does NOT set talentvisa_active to
  -- false; do NOT touch t3a_discoverability here.

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'challenge_opened', 'PARTICIPANT', 'PARTICIPANT', v_participant,
    v_participant, 'challenge_case', v_id,
    jsonb_build_object('ber_report_id', p_ber_report_id, 'ground', p_challenge_ground),
    encode(digest(v_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$$;

-- ============================================================================
-- createDisclosure  (§13, §9.1, AC-21, AC-22)
-- ============================================================================
-- Participant-only.  Identity and BER are two separate authorizations —
-- granting the first does NOT imply the second.  Named recipient,
-- scope, access period.  Direct-link recipient binding token stored
-- as SHA-256 hash, never plaintext.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_create_disclosure(
  p_ber_report_id          uuid,
  p_recipient_org_id       uuid,
  p_recipient_email        text,
  p_access_scope           text,
  p_access_period_starts   timestamptz,
  p_access_period_ends     timestamptz,
  p_release_identity_now   boolean DEFAULT false,
  p_release_report_now     boolean DEFAULT false,
  p_recipient_binding_token text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant uuid := auth.uid();
  v_owner uuid;
  v_id uuid;
BEGIN
  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 createDisclosure', 'unauthenticated caller');
  END IF;

  SELECT participant_id INTO v_owner
    FROM t3a_ber_report WHERE ber_report_id = p_ber_report_id;
  IF v_owner IS NULL THEN
    PERFORM t3a_raise('§13', 'ber_report not found');
  END IF;
  IF v_owner <> v_participant THEN
    PERFORM t3a_raise('§13',
      'participant can only release their own report — no administrator-created release');
  END IF;
  IF p_access_period_ends <= p_access_period_starts THEN
    PERFORM t3a_raise('§13',
      'access_period_ends must be after access_period_starts');
  END IF;

  INSERT INTO t3a_disclosure (
    ber_report_id, participant_id, recipient_org_id, recipient_email,
    access_scope, access_period_starts, access_period_ends,
    identity_released_at, report_released_at,
    status, recipient_binding_token_hash
  ) VALUES (
    p_ber_report_id, v_participant, p_recipient_org_id, p_recipient_email,
    p_access_scope, p_access_period_starts, p_access_period_ends,
    CASE WHEN p_release_identity_now THEN now() END,
    CASE WHEN p_release_report_now   THEN now() END,
    'granted',
    CASE WHEN p_recipient_binding_token IS NOT NULL
         THEN encode(digest(p_recipient_binding_token, 'sha256'), 'hex')
    END
  ) RETURNING disclosure_id INTO v_id;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, payload, integrity_hash
  ) VALUES (
    'disclosure_created', 'PARTICIPANT', 'PARTICIPANT', v_participant,
    v_participant, 'disclosure', v_id,
    jsonb_build_object(
      'ber_report_id', p_ber_report_id,
      'identity_released', p_release_identity_now,
      'report_released', p_release_report_now
    ),
    encode(digest(v_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
  );

  RETURN v_id;
END;
$$;

-- ============================================================================
-- revokeDisclosure  (§13, §9.1)
-- ============================================================================
-- Revocation is immediate and does NOT alter the evidence.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_revoke_disclosure(p_disclosure_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_participant IS NULL THEN
    PERFORM t3a_raise('§13 revokeDisclosure', 'unauthenticated caller');
  END IF;
  SELECT participant_id INTO v_owner
    FROM t3a_disclosure WHERE disclosure_id = p_disclosure_id;
  IF v_owner IS NULL THEN
    PERFORM t3a_raise('§13', 'disclosure not found');
  END IF;
  IF v_owner <> v_participant THEN
    PERFORM t3a_raise('§13',
      'a participant can only revoke their own disclosure');
  END IF;

  UPDATE t3a_disclosure
     SET status = 'revoked', revoked_at = now()
   WHERE disclosure_id = p_disclosure_id
     AND revoked_at IS NULL;

  INSERT INTO t3a_event_log (
    event_name, event_category, actor_type, actor_id,
    subject_id, resource_type, resource_id, integrity_hash
  ) VALUES (
    'disclosure_revoked', 'PARTICIPANT', 'PARTICIPANT', v_participant,
    v_participant, 'disclosure', p_disclosure_id,
    encode(digest(p_disclosure_id::text || v_participant::text || now()::text, 'sha256'), 'hex')
  );

  RETURN true;
END;
$$;

-- ============================================================================
-- verifyReport  (§13, §9.6)
-- ============================================================================
-- Public, no-account.  Confirms genuine / current / superseded /
-- withdrawn / under_challenge / evidence_expired.  Returns status only,
-- NEVER content.  Callable by anon: the function is SECURITY DEFINER
-- and reads only what the verification set allows.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_verify_report(p_ber_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status t3a_ber_status;
  v_current_until date;
  v_open_challenge boolean;
  v_evidence_intact boolean;
BEGIN
  SELECT status, current_until INTO v_status, v_current_until
    FROM t3a_ber_report WHERE ber_report_id = p_ber_report_id;
  IF v_status IS NULL THEN
    RETURN jsonb_build_object('verified', false, 'reason', 'not_found');
  END IF;

  v_open_challenge := EXISTS (
    SELECT 1 FROM t3a_challenge_case
     WHERE ber_report_id = p_ber_report_id
       AND status NOT IN ('upheld','amended','withdrawn')
  );

  -- Underlying evidence must still exist (not destroyed by retention).
  v_evidence_intact := NOT EXISTS (
    SELECT 1 FROM t3a_destruction_event de
     WHERE de.retention_class = 'observation_evidence'
       AND de.resource_type = 'observation'
       AND de.resource_id IN (
         SELECT unnest(contributing_observation_ids)
           FROM t3a_ber_statement WHERE ber_report_id = p_ber_report_id
       )
  );

  RETURN jsonb_build_object(
    'verified', true,
    'status', CASE
      WHEN v_status = 'withdrawn' THEN 'withdrawn'
      WHEN v_status = 'amended'   THEN 'superseded'
      WHEN v_status = 'expired'   THEN 'expired'
      WHEN NOT v_evidence_intact  THEN 'evidence_expired'
      WHEN v_open_challenge       THEN 'under_challenge'
      WHEN v_status = 'issued'    THEN 'current'
      ELSE 'not_current'
    END,
    'current_until', v_current_until,
    'notice', 'Verification returns status only, never content.'
  );
END;
$$;
-- The verification endpoint must be reachable without an account.
GRANT EXECUTE ON FUNCTION t3a_verify_report(uuid) TO anon;

-- ============================================================================
-- Feature-disabled socket endpoints
-- ============================================================================
-- The heavier operations from §13 (deriveSufficiency, assembleReportDraft,
-- issueReport, queryDiscovery) land here as feature-disabled sockets —
-- the endpoint exists so callers can't get a silent default, but the
-- body refuses with a logged reason.  Real bodies ship in a follow-up
-- once the sufficiency rules, statement library approvals, and discovery
-- privacy floor are configured.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_derive_sufficiency(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM t3a_raise('§13 deriveSufficiency',
    'socket present, engine not yet enabled — pending sufficiency rules version approval (OD-08). Call refuses per §16.3.');
END;
$$;

CREATE OR REPLACE FUNCTION t3a_assemble_report_draft(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM t3a_raise('§13 assembleReportDraft',
    'socket present, assembler not yet enabled — pending sufficiency rules + permitted_use_version + evidence_currency_period approvals. Call refuses per §16.3.');
END;
$$;

CREATE OR REPLACE FUNCTION t3a_issue_report(p_ber_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT t3a_is_reviewer() THEN
    PERFORM t3a_raise('§13 issueReport',
      'Evidence Reviewer role required; issuance is an explicit human action (AC-11)');
  END IF;
  PERFORM t3a_raise('§13 issueReport',
    'socket present, issuance not yet enabled — pending G2 (permitted_use, evidence_currency, retention_periods, agreement_threshold, security_standard). Call refuses per §16.3.');
END;
$$;

CREATE OR REPLACE FUNCTION t3a_query_discovery(p_criteria jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT t3a_is_employer() THEN
    PERFORM t3a_raise('§13 queryDiscovery', 'employer role required');
  END IF;
  PERFORM t3a_raise('§13 queryDiscovery',
    'socket present, discovery not yet enabled — pending closed field schedule wiring, minimum floor, count bands, TEER-shape monitor (§9.5). Call refuses per §16.3.');
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
