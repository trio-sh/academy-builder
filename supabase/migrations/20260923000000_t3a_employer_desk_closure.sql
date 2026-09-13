-- =====================================================================
-- T3A-DEV-CN-EMP-001 — Employer Desk
-- Build order steps 1 to 4:
--   1. Close endpoints first
--   2. Gate on verification state (Item 2)
--   3. Run the account audit (Item 11)
--   4. Remove outcome and evidence-contaminating capture (Items 3, 12)
--
-- Endpoints are closed before any interface work, so no surface this
-- note removes is reachable by direct route while pages are rebuilt.
--
-- POST-MORTEM v0.1: every extension function is schema-qualified.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. The employer desk event log — refusals and state anomalies
--    Several items require a log line at the moment of refusal, so the
--    log is created before the refusals that write to it.
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_employer_desk_event (
  event_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_seq     bigserial NOT NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  actor_id      uuid,
  event_code    text NOT NULL,
  route         text,
  subject_kind  text,
  subject_id    text,
  detail        jsonb NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.t3a_employer_desk_event IS
  'Append-only log of employer desk refusals, gate decisions and state anomalies. Item 12 step 5.10 governs what a refusal may carry: never the submitted body and never the attempted participant or report reference.';

CREATE INDEX IF NOT EXISTS t3a_employer_desk_event_code_idx
  ON public.t3a_employer_desk_event (event_code, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.t3a_employer_desk_event_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'EMPLOYER_DESK_LOG_APPEND_ONLY: % refused', TG_OP
    USING ERRCODE = 'check_violation';
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_employer_desk_event_no_update ON public.t3a_employer_desk_event;
CREATE TRIGGER t3a_employer_desk_event_no_update
  BEFORE UPDATE ON public.t3a_employer_desk_event
  FOR EACH ROW EXECUTE FUNCTION public.t3a_employer_desk_event_append_only();

DROP TRIGGER IF EXISTS t3a_employer_desk_event_no_delete ON public.t3a_employer_desk_event;
CREATE TRIGGER t3a_employer_desk_event_no_delete
  BEFORE DELETE ON public.t3a_employer_desk_event
  FOR EACH ROW EXECUTE FUNCTION public.t3a_employer_desk_event_append_only();

ALTER TABLE public.t3a_employer_desk_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_employer_desk_event_read ON public.t3a_employer_desk_event;
CREATE POLICY t3a_employer_desk_event_read ON public.t3a_employer_desk_event
  FOR SELECT USING (
    public.t3a_is_oversight_admin() OR public.t3a_is_service_context());

REVOKE INSERT, UPDATE, DELETE ON public.t3a_employer_desk_event FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.t3a_employer_desk_log(
  p_event_code   text,
  p_route        text DEFAULT NULL,
  p_subject_kind text DEFAULT NULL,
  p_subject_id   text DEFAULT NULL,
  p_detail       jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.t3a_employer_desk_event
    (actor_id, event_code, route, subject_kind, subject_id, detail)
  VALUES (auth.uid(), p_event_code, p_route, p_subject_kind, p_subject_id,
          coalesce(p_detail, '{}'::jsonb))
  RETURNING event_id INTO v_id;
  RETURN v_id;
END;
$fn$;

-- ---------------------------------------------------------------------
-- 1. Item 2 — one verification value, one source
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_employer_application (
  application_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_profile_id  uuid NOT NULL UNIQUE
                         REFERENCES public.employer_profiles(id) ON DELETE RESTRICT,
  organization_legal_name text,
  business_number      text,
  work_email           text,
  email_domain         text,
  submitted_at         timestamptz NOT NULL DEFAULT now(),
  creation_route       text NOT NULL DEFAULT 'unknown'
                         CHECK (creation_route IN ('application','public_signup','unknown')),
  approval_decision    text
                         CHECK (approval_decision IN ('approved','withdrawn')),
  approved_by          text,
  approved_at          timestamptz,
  approval_basis       text,
  withdrawn_at         timestamptz,
  CONSTRAINT t3a_employer_application_approval_shape
    CHECK (approval_decision IS DISTINCT FROM 'approved' OR approved_at IS NOT NULL)
);

COMMENT ON TABLE public.t3a_employer_application IS
  'The employer application record. This is the single source of organization verification state. One value, two renderings, never two fields.';

ALTER TABLE public.t3a_employer_application ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_employer_application_read ON public.t3a_employer_application;
CREATE POLICY t3a_employer_application_read ON public.t3a_employer_application
  FOR SELECT USING (
    public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context()
    OR EXISTS (SELECT 1 FROM public.employer_profiles e
               WHERE e.id = employer_profile_id AND e.profile_id = auth.uid()));

-- An employer cannot request, trigger or advance verification (Item 2, 7.4).
DROP POLICY IF EXISTS t3a_employer_application_write ON public.t3a_employer_application;
CREATE POLICY t3a_employer_application_write ON public.t3a_employer_application
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

-- The three controlled values, and nothing else.
CREATE OR REPLACE FUNCTION public.t3a_employer_verification(
  p_employer_profile_id uuid)
RETURNS TABLE (state text, approved_at timestamptz, approver text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r public.t3a_employer_application;
BEGIN
  IF p_employer_profile_id IS NULL THEN
    RETURN QUERY SELECT 'not_verified'::text, NULL::timestamptz, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO r FROM public.t3a_employer_application
  WHERE employer_profile_id = p_employer_profile_id;

  -- No application record, or an approval withdrawn: Not verified.
  IF NOT FOUND OR r.approval_decision = 'withdrawn' THEN
    RETURN QUERY SELECT 'not_verified'::text, NULL::timestamptz, NULL::text;
    RETURN;
  END IF;

  -- An application exists and no approval decision is recorded: Pending.
  IF r.approval_decision IS NULL THEN
    RETURN QUERY SELECT 'pending'::text, NULL::timestamptz, NULL::text;
    RETURN;
  END IF;

  IF r.approval_decision = 'approved' THEN
    -- The approver is returned as the record holds it. Where it holds
    -- none the caller renders "Approver not recorded"; nothing is
    -- inferred, backfilled or supplied here (Item 2, 5.6).
    RETURN QUERY SELECT 'verified'::text, r.approved_at,
      nullif(btrim(coalesce(r.approved_by, '')), '');
    RETURN;
  END IF;

  -- Unreadable or unrecognized. Never default to Verified (Item 2, 5.7).
  RETURN QUERY SELECT 'not_verified'::text, NULL::timestamptz, NULL::text;
END;
$fn$;

-- The gate every other item reads.
CREATE OR REPLACE FUNCTION public.t3a_employer_verification_state(
  p_employer_profile_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT state FROM public.t3a_employer_verification(p_employer_profile_id);
$fn$;

-- The employer profile of the calling session, or NULL.
CREATE OR REPLACE FUNCTION public.t3a_current_employer_profile()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT e.id FROM public.employer_profiles e WHERE e.profile_id = auth.uid() LIMIT 1;
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_current_employer_is_verified()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT public.t3a_employer_verification_state(
           public.t3a_current_employer_profile()) = 'verified';
$fn$;

-- ---------------------------------------------------------------------
-- 2. Item 10 — participant contact consent, defaulting closed
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_participant_contact_consent (
  participant_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  contact_open      boolean NOT NULL DEFAULT false,
  notice_version    text,
  consent_timestamp timestamptz,
  withdrawn_at      timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT t3a_contact_consent_recorded
    CHECK (NOT contact_open OR (notice_version IS NOT NULL AND consent_timestamp IS NOT NULL))
);

COMMENT ON TABLE public.t3a_participant_contact_consent IS
  'Participant contact consent. Distinct from report visibility: report visibility permits reading, contact consent permits contact, and neither implies the other. Defaults to closed. Scoped to approved employers as a class, never to an organization.';

ALTER TABLE public.t3a_participant_contact_consent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_contact_consent_read ON public.t3a_participant_contact_consent;
CREATE POLICY t3a_contact_consent_read ON public.t3a_participant_contact_consent
  FOR SELECT USING (
    participant_id = auth.uid()
    OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context());

DROP POLICY IF EXISTS t3a_contact_consent_write_own ON public.t3a_participant_contact_consent;
CREATE POLICY t3a_contact_consent_write_own ON public.t3a_participant_contact_consent
  FOR ALL USING (participant_id = auth.uid() OR public.t3a_is_service_context())
  WITH CHECK (participant_id = auth.uid() OR public.t3a_is_service_context());

-- Never set by making a report available, never inferred (Item 10, 5.5).
CREATE OR REPLACE FUNCTION public.t3a_participant_contact_open(p_participant_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(
    (SELECT c.contact_open AND c.withdrawn_at IS NULL
     FROM public.t3a_participant_contact_consent c
     WHERE c.participant_id = p_participant_id),
    false);
$fn$;

-- ---------------------------------------------------------------------
-- 3. BUILD ORDER STEP 1 — close the endpoints
-- ---------------------------------------------------------------------

-- 3a. Item 8 / 9A — the participant listing route.
--     candidate_profiles_read was USING (true): every authenticated
--     session could read every participant profile row, which is the
--     listing capability Item 8 removes. Employers reach participants
--     only through the approved-employer pool, never through this table.
DROP POLICY IF EXISTS candidate_profiles_read ON public.candidate_profiles;
CREATE POLICY candidate_profiles_read ON public.candidate_profiles
  FOR SELECT USING (
    profile_id = auth.uid()
    OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context()
    OR EXISTS (
         SELECT 1 FROM public.t3a_mentor_assignment m
         WHERE m.mentor_id = auth.uid() AND m.participant_id = candidate_profiles.profile_id));

-- 3b. Item 10 — the connection-request mechanism, entirely.
--     No connection object is created at launch. Records are retained;
--     the employer's view of them is removed (Item 10, 5.8).
DROP POLICY IF EXISTS t3x_connections_rw ON public.t3x_connections;

DROP POLICY IF EXISTS t3x_connections_read ON public.t3x_connections;
CREATE POLICY t3x_connections_read ON public.t3x_connections
  FOR SELECT USING (
    candidate_id = auth.uid()
    OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context());

DROP POLICY IF EXISTS t3x_connections_write ON public.t3x_connections;
CREATE POLICY t3x_connections_write ON public.t3x_connections
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

-- The policy is the permission; the trigger is the refusal, so a direct
-- route call is refused and logged rather than silently returning zero
-- rows. Hiding the control in the interface is not the control.
CREATE OR REPLACE FUNCTION public.t3a_refuse_connection_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF public.t3a_is_service_context() THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  PERFORM public.t3a_employer_desk_log(
    'connection_request_refused', 't3x_connections', 'connection', NULL,
    jsonb_build_object('operation', TG_OP));

  RAISE EXCEPTION 'CONNECTION_REQUEST_RETIRED: an employer may never initiate contact with a participant who has not opened contact'
    USING ERRCODE = 'insufficient_privilege';
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_no_connection_requests ON public.t3x_connections;
CREATE TRIGGER t3a_no_connection_requests
  BEFORE INSERT OR UPDATE OR DELETE ON public.t3x_connections
  FOR EACH ROW EXECUTE FUNCTION public.t3a_refuse_connection_request();

-- 3c. Item 12 — participant-linked feedback submission.
--     employer_feedback carried candidate_id, performance_rating,
--     readiness_accuracy, behavioral_alignment and would_hire_again
--     under ALL USING (true) WITH CHECK (true): an uncontrolled
--     performance file on a named person, writable by anyone.
--     It is quarantined, not deleted (Item 12, 5.2 and 7.4).
CREATE SCHEMA IF NOT EXISTS t3a_quarantine;

COMMENT ON SCHEMA t3a_quarantine IS
  'Restricted legacy quarantine. Content here is not available through ordinary application routes and is not migrated into any report, matching function, analytics or research dataset. Retention is governed through the privacy and records-governance process.';

REVOKE ALL ON SCHEMA t3a_quarantine FROM anon, authenticated;

DO $quarantine$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables
             WHERE schemaname = 'public' AND tablename = 'employer_feedback') THEN
    EXECUTE 'ALTER TABLE public.employer_feedback SET SCHEMA t3a_quarantine';
  END IF;
END;
$quarantine$;

DO $quarantine_lock$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables
             WHERE schemaname = 't3a_quarantine' AND tablename = 'employer_feedback') THEN
    EXECUTE 'DROP POLICY IF EXISTS employer_feedback_rw ON t3a_quarantine.employer_feedback';
    EXECUTE 'ALTER TABLE t3a_quarantine.employer_feedback ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON t3a_quarantine.employer_feedback FROM anon, authenticated';
  END IF;
END;
$quarantine_lock$;

-- ---------------------------------------------------------------------
-- 4. Item 3 — the two objects, and they never merge
-- ---------------------------------------------------------------------

-- Hires recorded: an employer-entered organization figure. The table
-- carries no participant column and no record column, so a structured
-- linkage cannot be stored even by a caller that wants one.
CREATE TABLE IF NOT EXISTS public.t3a_employer_hire_record (
  hire_record_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_profile_id uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  role_title          text,
  hired_on            date,
  recorded_at         timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_employer_hire_record IS
  'Hires recorded — an employer-entered figure about the employer own organization. No participant reference, no record reference, no attribution. Never derived from platform activity. Count the hire; never state a cause.';

ALTER TABLE public.t3a_employer_hire_record ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_employer_hire_record_own ON public.t3a_employer_hire_record;
CREATE POLICY t3a_employer_hire_record_own ON public.t3a_employer_hire_record
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.employer_profiles e
            WHERE e.id = employer_profile_id AND e.profile_id = auth.uid())
    OR public.t3a_is_oversight_admin())
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employer_profiles e
            WHERE e.id = employer_profile_id AND e.profile_id = auth.uid()));

-- The optional attestation. Held with timestamp and context, identified
-- on every surface as the employer's own statement. It never increments
-- Hires recorded and never becomes a platform-generated attribution.
CREATE TABLE IF NOT EXISTS public.t3a_record_informed_decision (
  attestation_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_profile_id uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  ber_report_id       uuid NOT NULL,
  statement           text NOT NULL DEFAULT 'This record informed our decision.',
  interaction_context text,
  stated_at           timestamptz NOT NULL DEFAULT now(),
  is_employer_statement boolean NOT NULL DEFAULT true,
  CONSTRAINT t3a_attestation_controlled_wording
    CHECK (statement = 'This record informed our decision.'),
  CONSTRAINT t3a_attestation_is_employer_statement
    CHECK (is_employer_statement = true)
);

COMMENT ON TABLE public.t3a_record_informed_decision IS
  'Optional employer attestation attached to a specific record interaction. The employer own statement, never a platform attribution, never aggregated into a figure of the form "The 3rd Academy influenced N hires".';

ALTER TABLE public.t3a_record_informed_decision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_record_informed_decision_own ON public.t3a_record_informed_decision;
CREATE POLICY t3a_record_informed_decision_own ON public.t3a_record_informed_decision
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.employer_profiles e
            WHERE e.id = employer_profile_id AND e.profile_id = auth.uid())
    OR public.t3a_is_oversight_admin())
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.employer_profiles e
            WHERE e.id = employer_profile_id AND e.profile_id = auth.uid()));

-- total_hires on employer_profiles is a platform-held column that an
-- attestation must never touch. It is not dropped (Standing Rule 4,
-- nothing is renamed or removed from the record), but the band reads
-- t3a_employer_hire_record instead, and nothing derives it from
-- platform activity.
COMMENT ON COLUMN public.employer_profiles.total_hires IS
  'Legacy column. Not read by the Employer Desk standing figures band; Hires recorded is counted from t3a_employer_hire_record, which carries no participant linkage.';

-- ---------------------------------------------------------------------
-- 5. Item 11 — the account audit
-- ---------------------------------------------------------------------

-- An account can hold employer authority with no employer_profiles row
-- at all, so the audit is keyed on the account and the organization row
-- is optional. Keying it the other way round would leave exactly those
-- accounts unexamined, which is the exposure Item 11 exists to close.
CREATE TABLE IF NOT EXISTS public.t3a_employer_account_audit (
  audit_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_profile_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employer_profile_id  uuid REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  organization_record_exists boolean NOT NULL DEFAULT false,
  audited_at           timestamptz NOT NULL DEFAULT now(),
  check_work_email_domain   text NOT NULL
    CHECK (check_work_email_domain IN ('pass','fail','not_established')),
  check_free_provider       text NOT NULL
    CHECK (check_free_provider IN ('pass','fail','not_established')),
  check_legal_entity        text NOT NULL
    CHECK (check_legal_entity IN ('pass','fail','not_established')),
  check_domain_age_flag     text NOT NULL
    CHECK (check_domain_age_flag IN ('pass','flagged_for_review','not_established')),
  creation_route       text NOT NULL
    CHECK (creation_route IN ('application','public_signup','unknown')),
  approval_record_exists boolean NOT NULL,
  approver             text,
  approval_basis       text,
  name_matches_address boolean,
  finding_public_signup_route  boolean NOT NULL DEFAULT false,
  finding_approved_without_basis boolean NOT NULL DEFAULT false,
  previous_state       text,
  new_state            text NOT NULL,
  produced_by_check    text NOT NULL
);

COMMENT ON TABLE public.t3a_employer_account_audit IS
  'Item 11. One row per employer account. The audit changes verification state and nothing else. Not established is not a pass.';

-- Reconcile an earlier shape of this table, if one was applied.
DO $reshape$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 't3a_employer_account_audit'
               AND column_name = 'employer_profile_id' AND is_nullable = 'NO') THEN
    ALTER TABLE public.t3a_employer_account_audit
      ALTER COLUMN employer_profile_id DROP NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 't3a_employer_account_audit'
                   AND column_name = 'account_profile_id') THEN
    ALTER TABLE public.t3a_employer_account_audit
      ADD COLUMN account_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 't3a_employer_account_audit'
                   AND column_name = 'organization_record_exists') THEN
    ALTER TABLE public.t3a_employer_account_audit
      ADD COLUMN organization_record_exists boolean NOT NULL DEFAULT false;
  END IF;
END;
$reshape$;

ALTER TABLE public.t3a_employer_account_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_employer_account_audit_read ON public.t3a_employer_account_audit;
CREATE POLICY t3a_employer_account_audit_read ON public.t3a_employer_account_audit
  FOR SELECT USING (
    public.t3a_is_oversight_admin() OR public.t3a_is_service_context());

DROP POLICY IF EXISTS t3a_employer_account_audit_write ON public.t3a_employer_account_audit;
CREATE POLICY t3a_employer_account_audit_write ON public.t3a_employer_account_audit
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

CREATE OR REPLACE FUNCTION public.t3a_is_free_email_provider(p_email text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $fn$
  SELECT lower(split_part(coalesce(p_email, ''), '@', 2)) = ANY (ARRAY[
    'gmail.com','googlemail.com','yahoo.com','yahoo.co.uk','hotmail.com',
    'outlook.com','live.com','msn.com','aol.com','icloud.com','me.com',
    'mail.com','gmx.com','gmx.net','yandex.com','proton.me','protonmail.com',
    'zoho.com','tutanota.com','hushmail.com','fastmail.com'
  ]);
$fn$;

-- The audit itself. Runs every existing employer account against the
-- four checks and sets verification state using Item 2 semantics
-- exactly. It never deletes, never approves, never backfills, never
-- edits an account detail and never notifies a holder.
DROP FUNCTION IF EXISTS public.t3a_run_employer_account_audit();

CREATE OR REPLACE FUNCTION public.t3a_run_employer_account_audit()
RETURNS TABLE (
  account_profile_id  uuid,
  employer_profile_id uuid,
  organization_record boolean,
  company_name        text,
  account_email       text,
  account_name        text,
  check_domain        text,
  check_free          text,
  check_entity        text,
  check_domain_age    text,
  creation_route      text,
  approval_exists     boolean,
  approver            text,
  name_matches        boolean,
  previous_state      text,
  new_state           text,
  produced_by         text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r           record;
  v_domain    text;
  v_free      text;
  v_entity    text;
  v_age       text;
  v_route     text;
  v_approval  boolean;
  v_approver  text;
  v_basis     text;
  v_name_ok   boolean;
  v_prev      text;
  v_new       text;
  v_cause     text;
  v_app       public.t3a_employer_application;
BEGIN
  IF NOT (public.t3a_is_service_context() OR public.t3a_is_oversight_admin()) THEN
    RAISE EXCEPTION 'EMPLOYER_AUDIT_NOT_AUTHORIZED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Every account holding employer authority, whether or not it has an
  -- organization row, and every organization row, whether or not its
  -- account still carries the employer role. No account unexamined.
  FOR r IN
    SELECT p.id AS profile_id, e.id AS org_id, e.company_name,
           p.email, p.first_name, p.last_name, p.created_at
    FROM public.profiles p
    LEFT JOIN public.employer_profiles e ON e.profile_id = p.id
    WHERE p.role = 'employer' OR e.id IS NOT NULL
    ORDER BY p.created_at
  LOOP
    v_app := NULL;
    IF r.org_id IS NOT NULL THEN
      SELECT * INTO v_app FROM public.t3a_employer_application a
      WHERE a.employer_profile_id = r.org_id;
    END IF;

    v_prev := public.t3a_employer_verification_state(r.org_id);

    -- Check 1: work email resolving to the stated organization domain.
    IF r.email IS NULL OR coalesce(btrim(r.company_name), '') = '' THEN
      v_domain := 'not_established';
    ELSIF position(lower(regexp_replace(r.company_name, '[^a-zA-Z0-9]', '', 'g'))
                   IN lower(replace(split_part(r.email, '@', 2), '.', ''))) > 0 THEN
      v_domain := 'pass';
    ELSE
      v_domain := 'fail';
    END IF;

    -- Check 2: free providers are refused.
    IF r.email IS NULL THEN
      v_free := 'not_established';
    ELSIF public.t3a_is_free_email_provider(r.email) THEN
      v_free := 'fail';
    ELSE
      v_free := 'pass';
    END IF;

    -- Check 3: legal entity name and business number present.
    IF v_app.application_id IS NULL THEN
      v_entity := 'not_established';
    ELSIF coalesce(btrim(v_app.organization_legal_name), '') <> ''
      AND coalesce(btrim(v_app.business_number), '') <> '' THEN
      v_entity := 'pass';
    ELSE
      v_entity := 'fail';
    END IF;

    -- Check 4: a domain registered within ninety days is flagged for
    -- review, never refused. Registration age is not held on the
    -- platform, so it is recorded as not established rather than passed.
    v_age := 'not_established';

    v_route := CASE
      WHEN v_app.application_id IS NOT NULL THEN coalesce(v_app.creation_route, 'unknown')
      WHEN r.org_id IS NULL THEN 'public_signup'
      ELSE 'unknown'
    END;

    v_approval := coalesce(v_app.approval_decision, '') = 'approved'
                  AND v_app.approved_by IS NOT NULL
                  AND v_app.approval_basis IS NOT NULL;
    v_approver := v_app.approved_by;
    v_basis    := v_app.approval_basis;

    -- Item 11, 5.6: recorded as a finding, never resolved by editing.
    v_name_ok := CASE
      WHEN r.email IS NULL OR coalesce(btrim(r.first_name), '') = '' THEN NULL
      ELSE position(lower(btrim(r.first_name)) IN lower(split_part(r.email, '@', 1))) > 0
    END;

    -- Item 11, 5.3 — Item 2 semantics exactly.
    IF v_app.application_id IS NULL THEN
      v_new := 'not_verified'; v_cause := 'no employer application record exists';
    ELSIF v_app.approval_decision = 'withdrawn' THEN
      v_new := 'not_verified'; v_cause := 'approval withdrawn';
    ELSIF v_domain <> 'pass' OR v_free <> 'pass' OR v_entity <> 'pass' THEN
      v_new := 'pending';      v_cause := 'a check did not pass or was not established';
    ELSIF NOT v_approval THEN
      v_new := 'pending';      v_cause := 'no approval decision recorded naming approver and basis';
    ELSE
      v_new := 'verified';     v_cause := 'approval record complete and every check passed';
    END IF;

    INSERT INTO public.t3a_employer_account_audit (
      account_profile_id, employer_profile_id, organization_record_exists,
      check_work_email_domain, check_free_provider,
      check_legal_entity, check_domain_age_flag, creation_route,
      approval_record_exists, approver, approval_basis, name_matches_address,
      finding_public_signup_route, finding_approved_without_basis,
      previous_state, new_state, produced_by_check)
    VALUES (
      r.profile_id, r.org_id, (r.org_id IS NOT NULL),
      v_domain, v_free, v_entity, v_age, v_route,
      v_approval, v_approver, v_basis, v_name_ok,
      (v_route = 'public_signup'),
      (coalesce(v_app.approval_decision, '') = 'approved'
       AND (v_approver IS NULL OR v_basis IS NULL)),
      v_prev, v_new, v_cause);

    -- The state change is applied to the single source. Where an
    -- approval is recorded without an approver or a basis, the approval
    -- decision is cleared so the account reads Pending. Nothing is
    -- backfilled and no account is approved by the audit.
    IF v_app.application_id IS NOT NULL
       AND coalesce(v_app.approval_decision, '') = 'approved'
       AND (v_approver IS NULL OR v_basis IS NULL) THEN
      UPDATE public.t3a_employer_application
      SET approval_decision = NULL, approved_at = NULL
      WHERE application_id = v_app.application_id;
    END IF;

    PERFORM public.t3a_employer_desk_log(
      'employer_account_audit', NULL, 'profile', r.profile_id::text,
      jsonb_build_object('previous_state', v_prev, 'new_state', v_new,
                         'produced_by', v_cause,
                         'organization_record_exists', (r.org_id IS NOT NULL)));

    account_profile_id  := r.profile_id;
    employer_profile_id := r.org_id;
    organization_record := (r.org_id IS NOT NULL);
    company_name        := r.company_name;
    account_email       := r.email;
    account_name        := btrim(coalesce(r.first_name,'') || ' ' || coalesce(r.last_name,''));
    check_domain        := v_domain; check_free       := v_free;
    check_entity        := v_entity; check_domain_age := v_age;
    creation_route      := v_route;  approval_exists  := v_approval;
    approver            := v_approver; name_matches   := v_name_ok;
    previous_state      := v_prev;   new_state        := v_new;
    produced_by         := v_cause;
    RETURN NEXT;
  END LOOP;
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_employer_verification(uuid),
  public.t3a_employer_verification_state(uuid),
  public.t3a_current_employer_profile(),
  public.t3a_current_employer_is_verified(),
  public.t3a_participant_contact_open(uuid)
TO anon, authenticated;
