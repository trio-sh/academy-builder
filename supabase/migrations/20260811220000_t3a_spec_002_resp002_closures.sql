-- ============================================================================
-- T3A-DEV-SPEC-002 · Follow-on decisions from T3A-DEV-RESP-002
-- ============================================================================
-- Dr. Tony Mofoke, The 3rd Academy Inc., 2026-08-11.
--
-- Closes OD-10, OD-11, OD-12. Sets the privacy-counsel calendar and the
-- revised Design Partner Pilot window. Corrects the earlier misuse of
-- OD-03 for the sufficiency-rule configuration (OD-03 is evidence
-- weighting; the sufficiency rule is a separately versioned founder
-- setting and is not an OD-register entry). Records the standing OD-03
-- decision explicitly for the first time.
--
-- Track B D2 content is not authored here. Founder work; sequencing per
-- pilot-scenario mapping still to be done. D2 remains not-observable
-- until its content lands, and the mentor Determinations page continues
-- to render the spec-compliant refusal panel for any dimension whose
-- content is not seeded.
-- ============================================================================

-- ============================================================================
-- § 1  Correct the sufficiency_rule spec_citation
-- ============================================================================
-- Prior migration cited "OD-03 § 5.1 + § 7". OD-03 is a different thing.
-- The rule is a separately versioned founder-set configuration. Value
-- itself remains v1.0.0 with no change.
-- ============================================================================

UPDATE t3a_governance_config
   SET spec_citation = $c$Founder-set configuration (NOT OD-03) - § 5.1 + § 7. See T3A-DEV-RESP-002 corrigendum.$c$
 WHERE config_key = 'sufficiency_rule' AND version = 'v1.0.0';

-- ============================================================================
-- § 2  OD-03 evidence-weighting policy - standing decision recorded
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'evidence_weighting_policy',
  'v1.0.0',
  jsonb_build_object(
    'policy', 'no_weighting_no_averaging_no_resolution_function',
    'body', 'No weighting, averaging or resolution function is built across observations. Each observation stands as itself in the record. Composition joins named determinations into a rendered statement — it never scores or aggregates them.',
    'binding', 'This decision is standing. Any request to add cross-observation aggregation is spec-hostile at the doctrinal layer, not a configuration change.'
  ),
  'OD-03 § 5.1 + § 7 - standing founder decision',
  'Founder - Dr. Tony Mofoke (T3A-DEV-RESP-002, 2026-08-11)'
);

-- ============================================================================
-- § 3  Privacy-counsel calendar and Design Partner Pilot window
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'counsel_calendar',
  'v1.0.0',
  jsonb_build_object(
    'binding_gate', 'No Behavioral Evidence Report issues until all seven rows of t3a_retention_schedule carry a populated counsel_ratified_at.',
    'milestones', jsonb_build_array(
      jsonb_build_object(
        'name', 'privacy_counsel_engaged',
        'not_later_than', '2027-01-04',
        'rationale', 'Founder direction: no date fixed before this point. Engagement, briefing, review and ratification realistically run six to ten weeks from here.'
      ),
      jsonb_build_object(
        'name', 'calibration_study_window',
        'starts', '2027-01-04',
        'ends', '2027-04-30',
        'rationale', 'Runs in parallel with the counsel engagement. Requires Track B content for pilot-scope dimensions to be authored beforehand.'
      ),
      jsonb_build_object(
        'name', 'retention_schedule_ratified',
        'not_later_than', '2027-03-15',
        'rationale', 'Populates counsel_ratified_at on all seven rows, unblocks G2, and enables the destruction job to be configured rather than merely disabled.'
      ),
      jsonb_build_object(
        'name', 'design_partner_pilot_opens',
        'not_earlier_than', '2027-06-01',
        'rationale', 'Both gates clear before the pilot rather than racing it, with a month of buffer after calibration completes.'
      ),
      jsonb_build_object(
        'name', 'first_post_launch_retention_review',
        'trigger', 'first of: 50 issued reports OR 6 months after first report issues',
        'rationale', 'A review of how the policy operated, held once it has actually operated.'
      ),
      jsonb_build_object(
        'name', 'recurring_review',
        'cadence', 'annually each August',
        'plus_out_of_cycle', 'whenever categories of personal information, evidence uses, jurisdictions or retention purposes materially change'
      )
    ),
    'first_revenue_note', 'Cost of this caution is that first revenue moves into H2 2027. Removes the exposure of collecting participant data under an unreviewed retention schedule.'
  ),
  'T3A-DEV-RESP-002 § 1',
  'Founder - Dr. Tony Mofoke (T3A-DEV-RESP-002, 2026-08-11)'
);

-- ============================================================================
-- § 4  OD-10 CLOSED - no tier-based dimension entitlement
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'dimension_availability_policy',
  'v1.0.0',
  jsonb_build_object(
    'od_reference', 'OD-10',
    'status', 'CLOSED',
    'decision', 'No tier-based dimension entitlement at launch. Payment, sponsorship or product status MUST NOT make a particular dimension reportable or non-reportable, alter the sufficiency standard applied to it, or suppress evidence that has already been generated.',
    'doctrinal_ground', 'If payment changes how evidence is treated, evidence breadth becomes a function of spend, and the assurance claim the entire product rests on dissolves.',
    't3x_permitted_use', jsonb_build_object(
      'field', 'dimension_evidence_available[D1..D14]',
      'usage', 'Binary discovery filter only. Indicates whether current reportable evidence exists for a dimension and nothing else.',
      'never_expose', jsonb_build_array(
        'Stage composition', 'observation counts', 'depth', 'sufficiency state',
        'dates', 'quality values', 'relative strength'
      ),
      't3x_filters_final_list', jsonb_build_array(
        'TalentVisa status',
        'target occupation or job family',
        'dimensions with reportable evidence'
      )
    ),
    'commercial_levers', jsonb_build_object(
      'permitted', jsonb_build_array(
        'number of observation engagements',
        'mentor-hour allocation',
        'access duration'
      ),
      'never_permitted', jsonb_build_array(
        'varying which dimensions may be reported',
        'varying the sufficiency standard applied to any dimension',
        'suppression of evidence already generated for non-payment',
        'purchasing a Stage (Stages are governed evidence architecture, not product units)'
      )
    )
  ),
  'OD-10 § 8 + § 9',
  'Founder - Dr. Tony Mofoke (T3A-DEV-RESP-002, 2026-08-11)'
);

-- ============================================================================
-- § 5  OD-11 CLOSED - observer identity on the report face
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'observer_identity_display',
  'v1.0.0',
  jsonb_build_object(
    'od_reference', 'OD-11',
    'status', 'CLOSED',
    'names_on_report_face', false,
    'multiplicity_statement', jsonb_build_object(
      'mandatory', true,
      'single_mentor_form', 'Observed and confirmed by an authorized The 3rd Academy mentor.',
      'multi_mentor_form', 'Observed and confirmed by more than one authorized The 3rd Academy mentor.',
      'no_exact_count_rationale', 'A precise number edges toward exposing the sufficiency threshold itself.'
    ),
    'why_names_withheld', jsonb_build_array(
      'A recipient who can identify the mentor can route around the governed challenge process, which is the only channel where a disputed determination gets properly reviewed.',
      'A mentor identifiable by an employer carries retaliation exposure that will cost recruitment long before it costs anything else.'
    ),
    'identity_storage_and_access', 'Observer identity remains a first-class stored evidence field. Fully traceable internally, available through the governed challenge process, and available through the approved employer-request route where that route applies.'
  ),
  'OD-11 § 21.8',
  'Founder - Dr. Tony Mofoke (T3A-DEV-RESP-002, 2026-08-11)'
);

-- ============================================================================
-- § 6  OD-12 CLOSED - mentor authorization granularity: per dimension
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'mentor_authorization_granularity',
  'v1.0.0',
  jsonb_build_object(
    'od_reference', 'OD-12',
    'status', 'CLOSED',
    'granularity', 'per_dimension',
    'rule', 'A mentor authorized for D2 is not thereby authorized for D4. Authorization attaches to the behavioral dimension.',
    'stage_eligibility', 'Stage-specific capability or eligibility is an operational assignment question and is represented separately. Never a substitute for dimension authorization.',
    'binding', 'The authorization in force on the observation date governs that observation, and is recorded with it. Later changes to a mentor authorization never retroactively qualify or disqualify an observation already made.',
    'coarsening_note', 'Per-dimension can be coarsened later without migrating historical evidence records. The reverse direction would require structural change to already-written records - not chosen.'
  ),
  'OD-12 § 21.12',
  'Founder - Dr. Tony Mofoke (T3A-DEV-RESP-002, 2026-08-11)'
);

-- ============================================================================
-- § 7  ISSUANCE GATE - retention ratification hard block
-- ============================================================================
-- The counsel calendar's binding gate: no BER issues until all seven
-- retention rows carry counsel_ratified_at. Wire this into the DB layer
-- so no client can bypass it. t3a_issue_report currently refuses per
-- §16.3 anyway; this adds a second refusal that survives even after
-- §7.4 human synthesis lands.
-- ============================================================================

CREATE OR REPLACE FUNCTION t3a_issuance_permitted()
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM t3a_retention_schedule
     WHERE retention_class IN (
       'observation_source','composed_statement','event_log','disclosure',
       'challenge_case','identity_assurance','rehearsal_artifact'
     )
       AND counsel_ratified_at IS NULL
  );
$$;

COMMENT ON FUNCTION t3a_issuance_permitted() IS
  'Binding issuance gate (T3A-DEV-RESP-002 § 1). Returns TRUE only when every founder-canonical retention row carries a counsel_ratified_at. t3a_issue_report must call this before proceeding. Removes the exposure of collecting participant data under an unreviewed retention schedule.';

-- Update the report-issuer socket to consult the gate FIRST, before the
-- pre-existing socket-disabled refusal. If the gate is closed, callers
-- get the gate-specific reason (counsel-ratification) rather than the
-- generic "socket not enabled" message.
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
  IF NOT t3a_issuance_permitted() THEN
    PERFORM t3a_raise('§13 issueReport',
      'Issuance gate closed - one or more retention classes still awaits privacy-counsel ratification (T3A-DEV-RESP-002 § 1). No report may issue until all seven t3a_retention_schedule rows carry counsel_ratified_at.');
  END IF;
  PERFORM t3a_raise('§13 issueReport',
    'socket present, assembler not yet enabled - pending §7.4 human synthesis wiring. Call refuses per §16.3.');
END;
$$;

-- Reload PostgREST schema.
NOTIFY pgrst, 'reload schema';
