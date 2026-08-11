-- ============================================================================
-- T3A-DEV-SPEC-002 · Track A governance values + Track B Dimension 1 seed
-- ============================================================================
-- Founder-of-record decisions transmitted 2026-08-11 in T3A-DEV-RESP-001
-- (Dr. Tony Mofoke, The 3rd Academy Inc.). Landing as versioned rule
-- objects — never scalars — so a later change re-versions rather than
-- silently re-writing decisions already applied to issued reports.
--
-- Reads the response corrections:
--   · OD-03 (NOT OD-08) holds the sufficiency rule.
--   · OD-08 is the agreement statistic + threshold.
--   · Permitted-use statement is a §21.8 report-content requirement,
--     not an open-decision entry; still recorded here as versioned
--     configuration because the composition path needs a version to
--     stamp on every issued report.
--   · Computing sufficiency and issuing the report are separate
--     actions — this migration wires configuration only. The composer
--     socket remains disabled per §16.3 until §7.4 human synthesis is
--     built.
-- ============================================================================

-- ============================================================================
-- § 1  GOVERNANCE CONFIG TABLE
-- ============================================================================

CREATE TABLE t3a_governance_config (
  governance_config_id  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key            text NOT NULL,       -- e.g. sufficiency_rule
  version               text NOT NULL,       -- semver-ish, immutable per row
  value                 jsonb NOT NULL,      -- the rule object; scalars are objects with one field
  spec_citation         text NOT NULL,       -- §X.Y or OD-NN
  approved_by           text NOT NULL,       -- founder / body of record
  approved_at           timestamptz NOT NULL DEFAULT now(),
  effective_from        timestamptz NOT NULL DEFAULT now(),
  superseded_by         uuid REFERENCES t3a_governance_config,
  UNIQUE (config_key, version)
);
COMMENT ON TABLE t3a_governance_config IS
  '§16.3 + §19.1: versioned governance configuration. Every row is immutable once approved. A change creates a NEW version row and points superseded_by from the old one. Callers stamp the version they read onto whatever artefact they produce.';

CREATE INDEX t3a_governance_config_key_current_idx
  ON t3a_governance_config (config_key, effective_from DESC)
  WHERE superseded_by IS NULL;

ALTER TABLE t3a_governance_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY t3a_governance_config_read ON t3a_governance_config
  FOR SELECT USING (true);   -- non-secret; read by every role including anon (report renders it)

-- Helper to fetch the current value for a key.
CREATE OR REPLACE FUNCTION t3a_governance_current(p_key text)
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT value
    FROM t3a_governance_config
   WHERE config_key = p_key
     AND superseded_by IS NULL
   ORDER BY effective_from DESC
   LIMIT 1
$$;

-- ============================================================================
-- § 2  SUFFICIENCY RULE (OD-03) — v1
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'sufficiency_rule',
  'v1.0.0',
  jsonb_build_object(
    'target_state', 'recurring_across_stages',
    'observation_count_min', 3,
    'stage_diversity_min', 3,
    'observer_diversity_min', 2,
    'observer_diversity_scope', 'S2..S4 authorised human observers only',
    's1_role', 'may supply one Stage context, never counts toward observer diversity, cannot independently establish highest state',
    's1_not_required_route', jsonb_build_array('S2','S3','S4'),
    'agreement_metric_ref', 'agreement_metric v1.0.0',
    'operating_cost_note', 'Sets the mentor-hour cost of dimension breadth (feeds OD-10 tier design).'
  ),
  'OD-03 § 5.1 + § 7',
  'Founder — Dr. Tony Mofoke (T3A-DEV-RESP-001, 2026-08-11)'
);

-- ============================================================================
-- § 3  PERMITTED-USE STATEMENT (§21.8) — v1
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'permitted_use_statement',
  'v1.0.0',
  jsonb_build_object(
    'render_rule', 'rendered on every issued Behavioral Evidence Report, in full, without truncation',
    'body', 'Permitted use. This Behavioral Evidence Report is supplementary information for use by the authorized recipient in a lawful, job-related employment decision concerning the person named in the report. It documents observed conduct only within the workplace situations and evidence period stated. It is not a score, ranking, recommendation, prediction of job performance, retention or probation outcome, or a statement of personality or character. The report is current only until the date shown and should not be relied upon after that date. The person named in the report may challenge any statement it contains. The recipient remains responsible for determining relevance and job-relatedness and for making the employment decision.',
    'names_security_standard', false,
    'names_certification_claim', false
  ),
  '§ 21.8 report content — currency + challenge sentences added in v1',
  'Founder — Dr. Tony Mofoke (T3A-DEV-RESP-001, 2026-08-11)'
);

-- ============================================================================
-- § 4  EVIDENCE CURRENCY PERIOD (OD-05) — v1
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'evidence_currency_period',
  'v1.0.0',
  jsonb_build_object(
    'per_observation_months', 18,
    'per_observation_anchor', 'observation_date',
    'current_until_rule', 'min(issuance_date + 18 months, earliest_expiry_of_a_necessary_observation)',
    'render_dates_on_face', true,
    'render_dates_rationale', 'A current-tense claim resting on evidence a year and a half old must show its date range so the reader can judge recency instead of inferring it from the word current.'
  ),
  'OD-05 § 5.2 + § 21.8',
  'Founder — Dr. Tony Mofoke (T3A-DEV-RESP-001, 2026-08-11)'
);

-- ============================================================================
-- § 5  CHALLENGE RESPONSE COMMITMENT (OD-06) — v1
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'challenge_response_commitment',
  'v1.0.0',
  jsonb_build_object(
    'tracks', jsonb_build_array(
      jsonb_build_object(
        'name', 'acknowledgment',
        'commitment_business_days', 2,
        'scope', 'Both correction and determination tracks — confirms receipt and states which track the case has been assigned to.'
      ),
      jsonb_build_object(
        'name', 'correction',
        'commitment_business_days', 5,
        'anchor', 'acceptance',
        'scope', 'Factual or clerical error — identity details, Stage or dimension labels, or a composed statement that does not match the recorded answer key.'
      ),
      jsonb_build_object(
        'name', 'determination',
        'commitment_business_days', 20,
        'anchor', 'acceptance',
        'extension_business_days', 10,
        'extension_rule', 'One extension available where further observation or third-party input is required — notified in writing with a revised decision date before the original window expires.',
        'scope', 'The participant disputes the determination itself.'
      )
    ),
    'while_challenge_open', jsonb_build_object(
      'release_suspended', true,
      'existing_disclosures_flagged', 'under_challenge — disputed statement stops travelling while it is disputed'
    ),
    'reviewer_roles', jsonb_build_array('challenge_reviewer_primary','challenge_reviewer_alternate'),
    'conflict_disclosure', 'Interim arrangement: the founder of the issuing company adjudicates challenges to that company''s own reports. Recorded honestly on the platform''s conflict register, with a defined path to independent review at a stated volume of issued reports.',
    'path_to_independent_review', 'To be set alongside the OD-07 counsel engagement calendar in Part Four of T3A-DEV-RESP-001.'
  ),
  'OD-06 § 9.5 + § 21.9',
  'Founder — Dr. Tony Mofoke (T3A-DEV-RESP-001, 2026-08-11)'
);

-- ============================================================================
-- § 6  NAMED SECURITY STANDARD (OD-09) — v1
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'named_security_standard',
  'v1.0.0',
  jsonb_build_object(
    'standards', jsonb_build_array(
      jsonb_build_object('identifier','ISO/IEC 27001:2022','role','design and control baseline'),
      jsonb_build_object('identifier','ISO/IEC 27701:2025','role','stand-alone privacy information management standard — second edition, 14 October 2025, replacing the 2019 version')
    ),
    'render_as_certified', false,
    'render_as_conformant', false,
    'render_as_compliant', false,
    'render_rule', 'The platform is NOT described as certified, conformant, or compliant with either standard, in the permitted-use statement or anywhere else, unless and until that status is independently achieved through completed third-party audit. Until then the socket stays empty and the report names nothing.',
    'operational_consequence', 'Evidenced over an operating period. Logging, access-control, and change-management decisions at G1 either accumulate that evidence from the start or they do not. Retrofitting means re-running the period.'
  ),
  'OD-09 § 21.13',
  'Founder — Dr. Tony Mofoke (T3A-DEV-RESP-001, 2026-08-11)'
);

-- ============================================================================
-- § 7  AGREEMENT METRIC (the actual OD-08) — v1
-- ============================================================================

INSERT INTO t3a_governance_config (config_key, version, value, spec_citation, approved_by) VALUES (
  'agreement_metric',
  'v1.0.0',
  jsonb_build_object(
    'metric', 'Krippendorff alpha',
    'difference_function', 'nominal',
    'difference_function_note', 'Alpha calculated with an ordinal difference function on nominal data returns a number that does not mean what it appears to mean. Dimension 1 answers are nominal single-select enumerations.',
    'threshold', 0.80,
    'threshold_rationale', 'Published methodological guidance treats 0.80 and above as reliable and roughly 0.67 to 0.79 as supporting tentative conclusions only. For employer-facing behavioral evidence the higher bar is the right posture.',
    'min_paired_observations_per_dimension', 30,
    'sampling_rule', 'Sampled across the difficulty range — confidence limits reported.',
    'exclusions', jsonb_build_array('not_applicable','not_observable'),
    'exclusions_rationale', 'Two observers who both record not_observable would otherwise register as perfect agreement, inflating alpha with cases where nothing was determined. Report the not_observable rate separately.',
    'release_policy', 'Per-dimension release: a dimension remains unobservable until BOTH its content AND its agreement evidence are approved. Do not gate launch on the full 14-dimension set at 0.80.'
  ),
  'OD-08 § 7.3 + § 12',
  'Founder — Dr. Tony Mofoke (T3A-DEV-RESP-001, 2026-08-11)'
);

-- ============================================================================
-- § 8  RETENTION SCHEDULE (OD-07) — v1 minimums, destruction disabled
-- ============================================================================

-- Founder's canonical class names differ from the day-1 seed. Extend the
-- enum forward-only.
ALTER TYPE t3a_retention_class ADD VALUE IF NOT EXISTS 'observation_source';
ALTER TYPE t3a_retention_class ADD VALUE IF NOT EXISTS 'composed_statement';
ALTER TYPE t3a_retention_class ADD VALUE IF NOT EXISTS 'event_log';
ALTER TYPE t3a_retention_class ADD VALUE IF NOT EXISTS 'disclosure';
ALTER TYPE t3a_retention_class ADD VALUE IF NOT EXISTS 'challenge_case';
ALTER TYPE t3a_retention_class ADD VALUE IF NOT EXISTS 'identity_assurance';
ALTER TYPE t3a_retention_class ADD VALUE IF NOT EXISTS 'rehearsal_artifact';

-- Extend the schedule to carry counsel-ratification + rule expression.
ALTER TABLE t3a_retention_schedule
  ADD COLUMN IF NOT EXISTS counsel_ratified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rule_expression jsonb,
  ADD COLUMN IF NOT EXISTS participant_deletable boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN t3a_retention_schedule.counsel_ratified_at IS
  'Automated destruction refuses to run until this timestamp is set for the row. Alberta private-sector privacy legislation gives no general authority to retain personal information for a fixed number of years — counsel resolves the tension before destruction is enabled. Over-retention is reversible; destruction is not.';

-- Seed founder-approved rows (destruction disabled).
INSERT INTO t3a_retention_schedule (retention_class, rule_expression, participant_deletable) VALUES
  ('observation_source', jsonb_build_object(
     'minimum', 'max(observation_date + 5 years, last_referencing_ber_report_ceases_current + 3 years)',
     'note', 'Whichever is later — the source must outlive the currency of any report it feeds.'
   ), false),
  ('composed_statement', jsonb_build_object(
     'minimum', 'last_referencing_ber_report_version_ceases_current + 5 years'
   ), false),
  ('event_log', jsonb_build_object(
     'minimum', 'event_timestamp + 7 years',
     'note', 'Personal-information entries and system-integrity entries are separable so counsel can set a shorter period for the former without weakening the process record.'
   ), false),
  ('disclosure', jsonb_build_object(
     'minimum', 'disclosure_expiry_or_revocation + 5 years'
   ), false),
  ('challenge_case', jsonb_build_object(
     'minimum', 'challenge_closure + 7 years'
   ), false),
  ('identity_assurance', jsonb_build_object(
     'minimum', 'max(account_closure, last_report_expiry) + 2 years',
     'hard_constraint', 'Raw identity-document images are NEVER stored. The platform holds the assurance result and the identity provider''s reference only.'
   ), false),
  ('rehearsal_artifact', jsonb_build_object(
     'minimum', 'rehearsal_session_end + 180 days',
     'hard_constraint', 'Shortest period of any class. Participant-initiated deletion available at any time before that. The WorkRehearsal firewall exists so that rehearsal never reaches observation — data no longer held cannot cross it.'
   ), true)
ON CONFLICT (retention_class) DO NOTHING;

-- Destruction guard.  Any caller that attempts destruction under a
-- non-ratified class gets a hard T3A01 refusal.
CREATE OR REPLACE FUNCTION t3a_retention_destruction_allowed(p_class t3a_retention_class)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT counsel_ratified_at IS NOT NULL
    FROM t3a_retention_schedule
   WHERE retention_class = p_class
$$;

COMMENT ON FUNCTION t3a_retention_destruction_allowed(t3a_retention_class) IS
  'OD-07 destruction guard. Returns TRUE only when privacy counsel has ratified the class''s period. Callers that ignore the check must be caught in code review — the periods are set but the mechanism is idle until ratification. G2 remains blocked.';

-- ============================================================================
-- § 9  COMPOSED STATEMENT VERSION STAMPING
-- ============================================================================
-- Founder requirement (T3A-DEV-RESP-001): "Every composed statement
-- records the statement_library_version that produced it, alongside the
-- answer key." Answer keys are stable identifiers — once issued, a key is
-- never re-used and never re-meaned. Retire and replace instead.
-- ============================================================================

ALTER TABLE t3a_composed_statement
  ADD COLUMN IF NOT EXISTS statement_library_version text,
  ADD COLUMN IF NOT EXISTS answer_key jsonb;

COMMENT ON COLUMN t3a_composed_statement.statement_library_version IS
  'Stamped at composition time. Later wording changes to the statement library create a NEW version; issued reports keep pointing at the version that produced their rendered_body. Without this stamp a later revision would silently rewrite the substance of already-issued reports.';

COMMENT ON COLUMN t3a_composed_statement.answer_key IS
  'Snapshot of the answer key that resolved to this composed statement. Stable identifier — never re-used, never re-meaned.';

-- ============================================================================
-- § 10  DIMENSION 1 CONTENT SEED — INTEGRITY AND ETHICS
-- ============================================================================
-- Atomic factual determinations. The mentor answers what happened. The
-- platform resolves that answer into a pre-written statement. Every
-- answer key maps to one approved composed statement. not_applicable and
-- not_observable never silently become adverse.
-- ============================================================================

-- --- QUESTIONS ------------------------------------------------------------

INSERT INTO t3a_determination_question (
  dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at
) VALUES
  ('D1', 'v1.0.0', 1,
   'Did the participant''s conduct remain truthful in relation to the information at issue?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('truthful','misrepresented_or_concealed','not_observable')
   ),
   now()),
  ('D1', 'v1.0.0', 2,
   'Where the situation required information to be disclosed, did the participant communicate it to an appropriate party?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('communicated','not_communicated','not_applicable','not_observable')
   ),
   now()),
  ('D1', 'v1.0.0', 3,
   'Where a confidentiality requirement applied, did the participant''s conduct maintain that requirement?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('maintained','disclosed_contrary_to_requirement','not_applicable','not_observable')
   ),
   now()),
  ('D1', 'v1.0.0', 4,
   'Where pressure or an available shortcut created a choice, did the participant''s conduct remain consistent with the stated integrity standard?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('maintained_standard','departed_from_standard','not_applicable','not_observable')
   ),
   now()),
  ('D1', 'v1.0.0', 5,
   'Where the situation required an integrity concern to be raised, did the participant raise it through an appropriate channel?',
   jsonb_build_object(
     'kind', 'enum',
     'cardinality', 'single_select',
     'options', jsonb_build_array('raised_concern','did_not_raise','not_applicable','not_observable')
   ),
   now());

-- --- STATEMENT LIBRARY ---------------------------------------------------
-- One statement per (question, chosen_answer). The composer joins the
-- five applicable rows into the dimension paragraph on the BER; the
-- composition rule is a service-layer concern (still gated on Track A
-- assembler enablement).
-- ------------------------------------------------------------------------

INSERT INTO t3a_statement_library (dimension_id, question_set_version, answer_key, statement_body, approved_at) VALUES
  -- Q01 · Truthfulness
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q01','a','truthful'),
   'On the information at issue, the participant''s conduct was truthful.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q01','a','misrepresented_or_concealed'),
   'On the information at issue, the participant''s conduct misrepresented or concealed the facts.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q01','a','not_observable'),
   'On the information at issue, no basis for a truthfulness determination was provided.', now()),

  -- Q02 · Disclosure
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q02','a','communicated'),
   'Where the situation required information to be disclosed, the participant communicated it to an appropriate party.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q02','a','not_communicated'),
   'Where the situation required information to be disclosed, the participant did not communicate it to an appropriate party.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q02','a','not_applicable'),
   'A disclosure requirement did not arise in this situation.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q02','a','not_observable'),
   'No basis for a disclosure determination was provided.', now()),

  -- Q03 · Confidentiality
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q03','a','maintained'),
   'Where a confidentiality requirement applied, the participant''s conduct maintained that requirement.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q03','a','disclosed_contrary_to_requirement'),
   'Where a confidentiality requirement applied, the participant''s conduct disclosed information contrary to that requirement.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q03','a','not_applicable'),
   'A confidentiality requirement did not apply in this situation.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q03','a','not_observable'),
   'No basis for a confidentiality determination was provided.', now()),

  -- Q04 · Pressure / shortcut
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q04','a','maintained_standard'),
   'Where pressure or an available shortcut created a choice, the participant''s conduct remained consistent with the stated integrity standard.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q04','a','departed_from_standard'),
   'Where pressure or an available shortcut created a choice, the participant''s conduct departed from the stated integrity standard.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q04','a','not_applicable'),
   'No pressure or shortcut condition arose in this situation.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q04','a','not_observable'),
   'No basis for a standard-under-pressure determination was provided.', now()),

  -- Q05 · Raising concerns
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q05','a','raised_concern'),
   'Where the situation required an integrity concern to be raised, the participant raised it through an appropriate channel.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q05','a','did_not_raise'),
   'Where the situation required an integrity concern to be raised, the participant did not raise it through an appropriate channel.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q05','a','not_applicable'),
   'The situation did not require an integrity concern to be raised.', now()),
  ('D1', 'v1.0.0', jsonb_build_object('q','D1-Q05','a','not_observable'),
   'No basis for a raising-a-concern determination was provided.', now());

-- ============================================================================
-- Reload PostgREST schema so the new function and table land in the API.
-- ============================================================================
NOTIFY pgrst, 'reload schema';
