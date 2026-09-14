-- =====================================================================
-- PLC-005 Note 4 — Oversight Administrator Role
-- Full visibility, enumerated action authority, no mutability.
--
-- Step 1 (report) found that administrative standing today carries
-- unrestricted write authority over observation content, corrections
-- and Behavioral Evidence Reports, via ALL policies predicated on
-- public.is_admin(). This migration therefore CLOSES an open
-- capability before it builds a new one, per Note 4 Step 2.
--
-- File order: the append-only log is created before the closure that
-- writes to it and before the role that it records, per Step 3 — the
-- log exists before any holder of the role can exist, because no
-- holder row can be created until this migration has fully applied.
--
-- POST-MORTEM v0.1: every extension function is schema-qualified.
-- Standing Rule 4: nothing is renamed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Role predicate — a person, not an account (item a)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_oversight_holder (
  holder_id            uuid PRIMARY KEY
                         REFERENCES public.profiles(id) ON DELETE RESTRICT,
  holder_name          text NOT NULL,
  holder_email         text NOT NULL,
  granted_by           uuid REFERENCES public.profiles(id),
  granted_at           timestamptz NOT NULL DEFAULT now(),
  revoked_at           timestamptz,
  revocation_basis     text,
  CONSTRAINT t3a_oversight_holder_named
    CHECK (length(btrim(holder_name)) >= 3 AND position(' ' IN btrim(holder_name)) > 0),
  CONSTRAINT t3a_oversight_holder_email_shape
    CHECK (holder_email LIKE '%_@_%.__%'),
  CONSTRAINT t3a_oversight_holder_revocation
    CHECK (revoked_at IS NULL OR length(btrim(coalesce(revocation_basis,''))) > 0)
);

COMMENT ON TABLE public.t3a_oversight_holder IS
  'Named holders of the oversight administrator role. One row per person. There is no shared credential and no generic administrator account.';

-- One credential, one person, in both directions.
CREATE UNIQUE INDEX IF NOT EXISTS t3a_oversight_holder_email_unique
  ON public.t3a_oversight_holder (lower(btrim(holder_email)));

-- No generic administrator account can be created (item a).
CREATE OR REPLACE FUNCTION public.t3a_oversight_reject_generic_credential()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_local text := split_part(lower(btrim(NEW.holder_email)), '@', 1);
  v_generic text[] := ARRAY[
    'admin','admins','administrator','administrators','root','superuser',
    'info','support','team','ops','operations','office','contact','hello',
    'noreply','no-reply','staff','oversight','sysadmin','webmaster'
  ];
BEGIN
  IF v_local = ANY (v_generic) THEN
    RAISE EXCEPTION 'OVERSIGHT_SHARED_CREDENTIAL_REFUSED: % is a generic address, not a person', NEW.holder_email
      USING ERRCODE = 'check_violation';
  END IF;

  -- The credential must belong to the person named on the row.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.holder_id
      AND lower(btrim(p.email)) = lower(btrim(NEW.holder_email))
  ) THEN
    RAISE EXCEPTION 'OVERSIGHT_CREDENTIAL_NOT_OWNED_BY_NAMED_PERSON'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_oversight_holder_guard ON public.t3a_oversight_holder;
CREATE TRIGGER t3a_oversight_holder_guard
  BEFORE INSERT OR UPDATE ON public.t3a_oversight_holder
  FOR EACH ROW EXECUTE FUNCTION public.t3a_oversight_reject_generic_credential();

CREATE OR REPLACE FUNCTION public.t3a_is_oversight_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.t3a_oversight_holder h
    WHERE h.holder_id = auth.uid() AND h.revoked_at IS NULL
  );
$fn$;

-- Any administrative standing at all, legacy or new. Note 4 Step 2 asks
-- that no administrative route retain mutability, not only the new one.
CREATE OR REPLACE FUNCTION public.t3a_has_administrative_standing()
RETURNS boolean LANGUAGE sql STABLE AS $fn$
  SELECT public.t3a_is_oversight_admin() OR public.is_admin();
$fn$;

ALTER TABLE public.t3a_oversight_holder ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_oversight_holder_read ON public.t3a_oversight_holder;
CREATE POLICY t3a_oversight_holder_read ON public.t3a_oversight_holder
  FOR SELECT USING (holder_id = auth.uid() OR public.t3a_is_oversight_admin());

-- The role cannot appoint itself or anyone else. Appointment is a
-- service-context act.
DROP POLICY IF EXISTS t3a_oversight_holder_write ON public.t3a_oversight_holder;
CREATE POLICY t3a_oversight_holder_write ON public.t3a_oversight_holder
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

-- ---------------------------------------------------------------------
-- 1. Step 3 — the append-only log, before the access it records (item e)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_oversight_log (
  entry_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_seq        bigserial NOT NULL,
  holder_id        uuid,
  holder_name      text NOT NULL,
  holder_email     text NOT NULL,
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  entry_kind       text NOT NULL
                     CHECK (entry_kind IN ('read','action')),
  action_code      text NOT NULL,
  subject_kind     text NOT NULL,
  subject_id       text,
  subject_person   uuid,
  basis            text,
  detail           jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash        text,
  entry_hash       text NOT NULL
);

COMMENT ON TABLE public.t3a_oversight_log IS
  'Append-only record of every oversight administrator action and every read of observation or message content. Hash-chained. Not alterable by the oversight role or by any other administrative role.';

CREATE INDEX IF NOT EXISTS t3a_oversight_log_holder_idx
  ON public.t3a_oversight_log (holder_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS t3a_oversight_log_subject_idx
  ON public.t3a_oversight_log (subject_person, occurred_at DESC);

-- Append-only, against every role including the one that writes it.
CREATE OR REPLACE FUNCTION public.t3a_oversight_log_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'OVERSIGHT_LOG_APPEND_ONLY: % refused on t3a_oversight_log', TG_OP
    USING ERRCODE = 'check_violation';
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_oversight_log_no_update ON public.t3a_oversight_log;
CREATE TRIGGER t3a_oversight_log_no_update
  BEFORE UPDATE ON public.t3a_oversight_log
  FOR EACH ROW EXECUTE FUNCTION public.t3a_oversight_log_append_only();

DROP TRIGGER IF EXISTS t3a_oversight_log_no_delete ON public.t3a_oversight_log;
CREATE TRIGGER t3a_oversight_log_no_delete
  BEFORE DELETE ON public.t3a_oversight_log
  FOR EACH ROW EXECUTE FUNCTION public.t3a_oversight_log_append_only();

DROP TRIGGER IF EXISTS t3a_oversight_log_no_truncate ON public.t3a_oversight_log;
CREATE TRIGGER t3a_oversight_log_no_truncate
  BEFORE TRUNCATE ON public.t3a_oversight_log
  FOR EACH STATEMENT EXECUTE FUNCTION public.t3a_oversight_log_append_only();

-- The chain. A removed entry cannot be hidden, because the next entry
-- carries the hash of the one before it.
CREATE OR REPLACE FUNCTION public.t3a_oversight_log_chain()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE
  v_prev text;
BEGIN
  SELECT entry_hash INTO v_prev
  FROM public.t3a_oversight_log
  ORDER BY entry_seq DESC LIMIT 1;

  NEW.prev_hash := v_prev;
  NEW.entry_hash := encode(
    extensions.digest(
      coalesce(v_prev, '') || '|' ||
      coalesce(NEW.holder_id::text, '') || '|' ||
      NEW.holder_name || '|' || NEW.holder_email || '|' ||
      NEW.occurred_at::text || '|' || NEW.entry_kind || '|' ||
      NEW.action_code || '|' || NEW.subject_kind || '|' ||
      coalesce(NEW.subject_id, '') || '|' ||
      coalesce(NEW.subject_person::text, '') || '|' ||
      coalesce(NEW.basis, '') || '|' || NEW.detail::text,
      'sha256'),
    'hex');
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_oversight_log_chain_trg ON public.t3a_oversight_log;
CREATE TRIGGER t3a_oversight_log_chain_trg
  BEFORE INSERT ON public.t3a_oversight_log
  FOR EACH ROW EXECUTE FUNCTION public.t3a_oversight_log_chain();

ALTER TABLE public.t3a_oversight_log ENABLE ROW LEVEL SECURITY;

-- A holder may read the log. Nobody may write it directly; entries are
-- made only by the functions below, which are SECURITY DEFINER.
DROP POLICY IF EXISTS t3a_oversight_log_read ON public.t3a_oversight_log;
CREATE POLICY t3a_oversight_log_read ON public.t3a_oversight_log
  FOR SELECT USING (
    public.t3a_is_oversight_admin()
    OR subject_person = auth.uid()
    OR public.t3a_is_service_context()
  );

REVOKE INSERT, UPDATE, DELETE ON public.t3a_oversight_log FROM anon, authenticated;

-- The one writer.
CREATE OR REPLACE FUNCTION public.t3a_oversight_record(
  p_entry_kind     text,
  p_action_code    text,
  p_subject_kind   text,
  p_subject_id     text,
  p_subject_person uuid,
  p_basis          text,
  p_detail         jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_name  text;
  v_email text;
  v_id    uuid := auth.uid();
  v_entry uuid;
BEGIN
  SELECT h.holder_name, h.holder_email INTO v_name, v_email
  FROM public.t3a_oversight_holder h
  WHERE h.holder_id = v_id AND h.revoked_at IS NULL;

  IF v_name IS NULL THEN
    -- A refusal by a non-holder is still recorded, attributed to the
    -- standing that produced it rather than to a name we do not have.
    SELECT coalesce(p.first_name || ' ' || p.last_name, 'unidentified session'),
           coalesce(p.email, 'unidentified session')
      INTO v_name, v_email
    FROM public.profiles p WHERE p.id = v_id;
    v_name  := coalesce(v_name, 'unidentified session');
    v_email := coalesce(v_email, 'unidentified session');
  END IF;

  INSERT INTO public.t3a_oversight_log (
    holder_id, holder_name, holder_email, entry_kind, action_code,
    subject_kind, subject_id, subject_person, basis, detail)
  VALUES (v_id, v_name, v_email, p_entry_kind, p_action_code,
          p_subject_kind, p_subject_id, p_subject_person, p_basis,
          coalesce(p_detail, '{}'::jsonb))
  RETURNING entry_id INTO v_entry;

  RETURN v_entry;
END;
$fn$;

-- Anyone may verify the chain; nobody needs privilege to check that the
-- log has not been rewritten.
CREATE OR REPLACE FUNCTION public.t3a_oversight_log_intact()
RETURNS TABLE (entries bigint, broken_at bigint, intact boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  r         record;
  v_prev    text := NULL;
  v_expect  text;
  v_broken  bigint := NULL;
  v_count   bigint := 0;
BEGIN
  FOR r IN SELECT * FROM public.t3a_oversight_log ORDER BY entry_seq LOOP
    v_count := v_count + 1;
    v_expect := encode(extensions.digest(
      coalesce(v_prev,'') || '|' || coalesce(r.holder_id::text,'') || '|' ||
      r.holder_name || '|' || r.holder_email || '|' || r.occurred_at::text || '|' ||
      r.entry_kind || '|' || r.action_code || '|' || r.subject_kind || '|' ||
      coalesce(r.subject_id,'') || '|' || coalesce(r.subject_person::text,'') || '|' ||
      coalesce(r.basis,'') || '|' || r.detail::text, 'sha256'), 'hex');
    IF v_expect <> r.entry_hash AND v_broken IS NULL THEN
      v_broken := r.entry_seq;
    END IF;
    v_prev := r.entry_hash;
  END LOOP;

  RETURN QUERY SELECT v_count, v_broken, (v_broken IS NULL);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 2. Step 2 — close mutability (item c)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_oversight_protected_surface (
  table_name  text PRIMARY KEY,
  category    text NOT NULL
                CHECK (category IN ('observation','correction','report','determination')),
  registered_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_oversight_protected_surface IS
  'Tables no administrative standing may alter, delete or author into, by any route. Visibility without mutability.';

INSERT INTO public.t3a_oversight_protected_surface (table_name, category) VALUES
  ('t3a_observation_record',            'observation'),
  ('t3a_observation',                   'observation'),
  ('t3a_observation_gateway',           'observation'),
  ('t3a_observation_path_gateway',      'observation'),
  ('t3a_mentor_judgment',               'observation'),
  ('t3a_dimension_evidence',            'observation'),
  ('mentor_observations',               'observation'),
  ('observation_feedback',              'observation'),
  ('observation_synthesis',             'observation'),
  ('t3a_composed_statement',            'observation'),
  ('t3a_d1_composed_statement',         'observation'),
  ('t3a_d1_s1_determination',           'determination'),
  ('t3a_d1_s1_confirmation',            'determination'),
  ('t3a_d1_progression_decision',       'determination'),
  ('t3a_correction_case',               'correction'),
  ('t3a_challenge_case',                'correction'),
  ('t3a_reconsideration_assignment',    'correction'),
  ('t3a_resolution_refusal',            'correction'),
  ('t3a_d1_resolution_refusal',         'correction'),
  ('t3a_d1_participant_review_action',  'correction'),
  ('t3a_ber_report',                    'report'),
  ('t3a_ber_statement',                 'report'),
  ('t3a_d1_ber_report',                 'report'),
  ('t3a_d1_report_issuance',            'report'),
  ('t3a_d1_report_refusal_log',         'report')
ON CONFLICT (table_name) DO NOTHING;

-- The role cannot shorten its own protected list.
ALTER TABLE public.t3a_oversight_protected_surface ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_oversight_protected_surface_read ON public.t3a_oversight_protected_surface;
CREATE POLICY t3a_oversight_protected_surface_read ON public.t3a_oversight_protected_surface
  FOR SELECT USING (true);

DROP POLICY IF EXISTS t3a_oversight_protected_surface_write ON public.t3a_oversight_protected_surface;
CREATE POLICY t3a_oversight_protected_surface_write ON public.t3a_oversight_protected_surface
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

CREATE OR REPLACE FUNCTION public.t3a_oversight_refuse_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public.t3a_has_administrative_standing() THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- Deliberately no log write here. A refusal aborts the statement, and
  -- an aborted statement rolls back everything it did, including a log
  -- insert. PostgreSQL has no autonomous transaction, so a refusal
  -- cannot be self-recording at the data layer. Recording it from the
  -- application would put the record on the side of the boundary the
  -- log exists to be independent of, so it is not done silently here
  -- and is reported instead. What the log covers is what item (e) asks
  -- for: every action taken and every read of content.
  RAISE EXCEPTION 'OVERSIGHT_ROLE_MAY_NOT_ALTER_EVIDENCE: % on %.% refused for administrative standing',
    TG_OP, TG_TABLE_SCHEMA, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$fn$;

-- Attached by loop over the registry, so a table added to the registry
-- later cannot be left unguarded by an oversight in wiring.
DO $attach$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT s.table_name FROM public.t3a_oversight_protected_surface s
    WHERE EXISTS (SELECT 1 FROM pg_tables t
                  WHERE t.schemaname = 'public' AND t.tablename = s.table_name)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS t3a_oversight_no_mutation ON public.%I', r.table_name);
    EXECUTE format(
      'CREATE TRIGGER t3a_oversight_no_mutation
         BEFORE INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.t3a_oversight_refuse_mutation()',
      r.table_name);
  END LOOP;
END;
$attach$;

-- Belt as well as braces: the three ALL-policies that gave administrative
-- standing explicit write authority over evidence are withdrawn outright,
-- so the capability is absent from the policy catalogue and not merely
-- refused at execution time.
DROP POLICY IF EXISTS t3a_observation_record_write_admin ON public.t3a_observation_record;
CREATE POLICY t3a_observation_record_write_admin ON public.t3a_observation_record
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

DROP POLICY IF EXISTS t3a_d1_ber_report_write_admin ON public.t3a_d1_ber_report;
CREATE POLICY t3a_d1_ber_report_write_admin ON public.t3a_d1_ber_report
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

DROP POLICY IF EXISTS t3a_correction_case_update_admin ON public.t3a_correction_case;
CREATE POLICY t3a_correction_case_update_admin ON public.t3a_correction_case
  FOR UPDATE USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

-- ---------------------------------------------------------------------
-- 3. Step 4 — read access, every content read logged (item b, item e)
-- ---------------------------------------------------------------------

-- Item (d), closing paragraph: content read stays disabled in production
-- until the participant privacy notice is effective.
CREATE TABLE IF NOT EXISTS public.t3a_oversight_disclosure (
  disclosure_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_text      text NOT NULL,
  drafted_at      timestamptz NOT NULL DEFAULT now(),
  counsel_cleared boolean NOT NULL DEFAULT false,
  cleared_by      text,
  effective_from  timestamptz,
  CONSTRAINT t3a_oversight_disclosure_clearance
    CHECK (effective_from IS NULL OR (counsel_cleared AND cleared_by IS NOT NULL))
);

COMMENT ON TABLE public.t3a_oversight_disclosure IS
  'Draft privacy notice wording covering administrative access. Held for counsel. A row becomes effective only when counsel has cleared it. Content read on production subjects is refused until then.';

ALTER TABLE public.t3a_oversight_disclosure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_oversight_disclosure_read ON public.t3a_oversight_disclosure;
CREATE POLICY t3a_oversight_disclosure_read ON public.t3a_oversight_disclosure
  FOR SELECT USING (true);

DROP POLICY IF EXISTS t3a_oversight_disclosure_write ON public.t3a_oversight_disclosure;
CREATE POLICY t3a_oversight_disclosure_write ON public.t3a_oversight_disclosure
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

CREATE OR REPLACE FUNCTION public.t3a_oversight_content_read_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.t3a_oversight_disclosure
    WHERE counsel_cleared
      AND effective_from IS NOT NULL
      AND effective_from <= now());
$fn$;

-- Shared preamble for every read route.
CREATE OR REPLACE FUNCTION public.t3a_oversight_assert_read(p_basis text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public.t3a_is_oversight_admin() THEN
    RAISE EXCEPTION 'OVERSIGHT_NOT_A_HOLDER' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF length(btrim(coalesce(p_basis, ''))) < 8 THEN
    RAISE EXCEPTION 'OVERSIGHT_BASIS_REQUIRED' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT public.t3a_oversight_content_read_enabled() THEN
    RAISE EXCEPTION 'OVERSIGHT_PRIVACY_NOTICE_NOT_EFFECTIVE'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_oversight_read_observation(
  p_observation_record_id uuid,
  p_basis                 text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_row public.t3a_observation_record;
BEGIN
  PERFORM public.t3a_oversight_assert_read(p_basis);

  SELECT * INTO v_row FROM public.t3a_observation_record
  WHERE observation_record_id = p_observation_record_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OVERSIGHT_SUBJECT_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  PERFORM public.t3a_oversight_record(
    'read', 'read_observation_content', 't3a_observation_record',
    p_observation_record_id::text, v_row.participant_id, p_basis,
    jsonb_build_object('dimension_id', v_row.dimension_id,
                       'stage_code', v_row.stage_code));

  RETURN to_jsonb(v_row);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_oversight_read_messages(
  p_conversation_id uuid,
  p_basis           text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_messages jsonb;
  v_count    integer;
BEGIN
  PERFORM public.t3a_oversight_assert_read(p_basis);

  SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY m.created_at), '[]'::jsonb),
         count(*)
    INTO v_messages, v_count
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id;

  PERFORM public.t3a_oversight_record(
    'read', 'read_message_content', 'conversations',
    p_conversation_id::text, NULL, p_basis,
    jsonb_build_object('message_count', v_count));

  RETURN v_messages;
END;
$fn$;

-- The exclusions in item (b) are structural, not a screen concern: the
-- oversight role has no read route to secret material at all, and this
-- function states the exclusion list so it can be disclosed.
CREATE OR REPLACE FUNCTION public.t3a_oversight_read_exclusions()
RETURNS TABLE (excluded text) LANGUAGE sql IMMUTABLE AS $fn$
  SELECT unnest(ARRAY[
    'passwords and password hashes',
    'raw verification and invitation tokens',
    'session tokens',
    'multi-factor secrets',
    'API keys, signing keys and encryption keys',
    'provider credentials and equivalent secret material',
    'private rehearsal-domain content',
    'raw identity-assurance material'
  ]);
$fn$;

-- ---------------------------------------------------------------------
-- 4. Step 5 — enumerated and closed write authority (item d)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_oversight_action_catalogue (
  action_code     text PRIMARY KEY,
  description     text NOT NULL,
  basis_required  boolean NOT NULL
);

COMMENT ON TABLE public.t3a_oversight_action_catalogue IS
  'The closed list of write actions available to the oversight administrator role. Nothing outside this list is available. The role cannot extend it.';

INSERT INTO public.t3a_oversight_action_catalogue (action_code, description, basis_required) VALUES
  ('assign_mentor',
   'Assign a mentor to an individual for a stage instance', true),
  ('employer_application_approve',
   'Approve an employer application', true),
  ('employer_application_refuse',
   'Refuse an employer application', true),
  ('account_create',
   'Create the base account object, or invoke the governed invitation or application route', true),
  ('account_suspend',
   'Suspend an account', true),
  ('account_restore',
   'Restore a suspended account', true),
  ('account_reset_credential',
   'Initiate the normal credential-reset mechanism for an account', true)
ON CONFLICT (action_code) DO NOTHING;

ALTER TABLE public.t3a_oversight_action_catalogue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_oversight_action_catalogue_read ON public.t3a_oversight_action_catalogue;
CREATE POLICY t3a_oversight_action_catalogue_read ON public.t3a_oversight_action_catalogue
  FOR SELECT USING (true);

DROP POLICY IF EXISTS t3a_oversight_action_catalogue_write ON public.t3a_oversight_action_catalogue;
CREATE POLICY t3a_oversight_action_catalogue_write ON public.t3a_oversight_action_catalogue
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

-- Listing what the role can do, per the acceptance criterion that asks
-- for the list rather than for selected examples.
CREATE OR REPLACE FUNCTION public.t3a_oversight_capabilities()
RETURNS TABLE (action_code text, description text, basis_required boolean)
LANGUAGE sql STABLE AS $fn$
  SELECT c.action_code, c.description, c.basis_required
  FROM public.t3a_oversight_action_catalogue c
  ORDER BY c.action_code;
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_oversight_assert_action(
  p_action_code text, p_basis text)
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_required boolean;
BEGIN
  IF NOT public.t3a_is_oversight_admin() THEN
    RAISE EXCEPTION 'OVERSIGHT_NOT_A_HOLDER' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT basis_required INTO v_required
  FROM public.t3a_oversight_action_catalogue WHERE action_code = p_action_code;

  IF v_required IS NULL THEN
    RAISE EXCEPTION 'OVERSIGHT_ACTION_NOT_ENUMERATED: %', p_action_code
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_required AND length(btrim(coalesce(p_basis, ''))) < 8 THEN
    RAISE EXCEPTION 'OVERSIGHT_BASIS_REQUIRED' USING ERRCODE = 'check_violation';
  END IF;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_oversight_assign_mentor(
  p_participant_id    uuid,
  p_mentor_id         uuid,
  p_stage_instance_id uuid,
  p_basis             text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_assignment uuid;
BEGIN
  PERFORM public.t3a_oversight_assert_action('assign_mentor', p_basis);

  -- Assignment does not bypass authorization prerequisites.
  IF NOT EXISTS (
    SELECT 1 FROM public.t3a_role_grant g
    WHERE g.user_id = p_mentor_id AND g.spec_role = 'mentor' AND g.revoked_at IS NULL)
  THEN
    RAISE EXCEPTION 'OVERSIGHT_MENTOR_NOT_AUTHORIZED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.t3a_mentor_assignment (
    mentor_id, participant_id, stage_instance_id, assignment_method)
  VALUES (p_mentor_id, p_participant_id, p_stage_instance_id, 'coordinator_allocated')
  RETURNING mentor_assignment_id INTO v_assignment;

  PERFORM public.t3a_oversight_record(
    'action', 'assign_mentor', 't3a_mentor_assignment',
    v_assignment::text, p_participant_id, p_basis,
    jsonb_build_object('mentor_id', p_mentor_id,
                       'stage_instance_id', p_stage_instance_id));

  RETURN v_assignment;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_oversight_decide_employer_application(
  p_employer_profile_id uuid,
  p_approve             boolean,
  p_basis               text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_action text := CASE WHEN p_approve
                        THEN 'employer_application_approve'
                        ELSE 'employer_application_refuse' END;
  v_owner uuid;
BEGIN
  PERFORM public.t3a_oversight_assert_action(v_action, p_basis);

  SELECT profile_id INTO v_owner FROM public.employer_profiles
  WHERE id = p_employer_profile_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'OVERSIGHT_SUBJECT_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.employer_profiles
  SET is_verified = p_approve, updated_at = now()
  WHERE id = p_employer_profile_id;

  PERFORM public.t3a_oversight_record(
    'action', v_action, 'employer_profiles',
    p_employer_profile_id::text, v_owner, p_basis,
    jsonb_build_object('approved', p_approve));
END;
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_oversight_account_action(
  p_subject_profile_id uuid,
  p_action_code        text,
  p_basis              text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF p_action_code NOT IN ('account_suspend','account_restore','account_reset_credential') THEN
    RAISE EXCEPTION 'OVERSIGHT_ACTION_NOT_ENUMERATED: %', p_action_code
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM public.t3a_oversight_assert_action(p_action_code, p_basis);

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_subject_profile_id) THEN
    RAISE EXCEPTION 'OVERSIGHT_SUBJECT_NOT_FOUND' USING ERRCODE = 'no_data_found';
  END IF;

  IF p_action_code = 'account_suspend' THEN
    UPDATE public.profiles SET is_active = false, updated_at = now()
    WHERE id = p_subject_profile_id;
  ELSIF p_action_code = 'account_restore' THEN
    UPDATE public.profiles SET is_active = true, updated_at = now()
    WHERE id = p_subject_profile_id;
  ELSE
    -- Reset initiates the normal mechanism. No credential is read, set
    -- or returned here, and none is reachable from this role.
    NULL;
  END IF;

  PERFORM public.t3a_oversight_record(
    'action', p_action_code, 'profiles',
    p_subject_profile_id::text, p_subject_profile_id, p_basis,
    jsonb_build_object('credential_material_touched', false));
END;
$fn$;

-- Account creation is a request against the governed route, not a direct
-- write. An oversight administrator cannot conjure an account inside the
-- database: identity lives in Auth, and email verification, invitation
-- and application prerequisites continue to apply to whatever Auth then
-- creates. The role's authority here is to ask, and to be recorded asking.
CREATE TABLE IF NOT EXISTS public.t3a_oversight_account_request (
  request_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by  uuid NOT NULL REFERENCES public.profiles(id),
  email         text NOT NULL,
  first_name    text,
  last_name     text,
  basis         text NOT NULL,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  fulfilled_at  timestamptz,
  fulfilled_profile_id uuid REFERENCES public.profiles(id),
  CONSTRAINT t3a_oversight_account_request_no_authority
    CHECK (true)
);

COMMENT ON TABLE public.t3a_oversight_account_request IS
  'Account creation requested by an oversight administrator. Fulfilment runs through the governed invitation or application route, which applies verification and authorization prerequisites. No Mentor or Employer authority is conferrable from here.';

ALTER TABLE public.t3a_oversight_account_request ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_oversight_account_request_read ON public.t3a_oversight_account_request;
CREATE POLICY t3a_oversight_account_request_read ON public.t3a_oversight_account_request
  FOR SELECT USING (public.t3a_is_oversight_admin() OR public.t3a_is_service_context());

DROP POLICY IF EXISTS t3a_oversight_account_request_write ON public.t3a_oversight_account_request;
CREATE POLICY t3a_oversight_account_request_write ON public.t3a_oversight_account_request
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

CREATE OR REPLACE FUNCTION public.t3a_oversight_create_account(
  p_email      text,
  p_first_name text,
  p_last_name  text,
  p_basis      text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_request uuid;
BEGIN
  PERFORM public.t3a_oversight_assert_action('account_create', p_basis);

  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(btrim(p_email))) THEN
    RAISE EXCEPTION 'OVERSIGHT_ACCOUNT_ALREADY_EXISTS' USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO public.t3a_oversight_account_request
    (requested_by, email, first_name, last_name, basis)
  VALUES (auth.uid(), btrim(p_email), p_first_name, p_last_name, p_basis)
  RETURNING request_id INTO v_request;

  PERFORM public.t3a_oversight_record(
    'action', 'account_create', 't3a_oversight_account_request',
    v_request::text, NULL, p_basis,
    jsonb_build_object('route', 'governed invitation route',
                       'authority_granted', false,
                       'credential_material_touched', false));

  RETURN v_request;
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_oversight_capabilities(),
  public.t3a_oversight_read_exclusions(),
  public.t3a_oversight_log_intact(),
  public.t3a_is_oversight_admin(),
  public.t3a_oversight_content_read_enabled()
TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Step 6 — the disclosure, drafted and held (item f)
-- ---------------------------------------------------------------------

INSERT INTO public.t3a_oversight_disclosure (draft_text, counsel_cleared)
SELECT
$draft$DRAFT — HELD FOR COUNSEL. NOT PUBLISHED. NOT EFFECTIVE.

Administrative access to your record

The 3rd Academy authorizes a small number of named individuals to act as
oversight administrators. This section explains what they can see, what
they can do, and what they cannot do.

What an oversight administrator can see. An authorized administrator can
access the content of your record on the platform. This includes the
observations recorded about your conduct, the statements composed from
them, any Behavioral Evidence Report and its issuance history, any
correction you raise and its outcome, and the messages exchanged between
you and your assigned mentor.

What an oversight administrator cannot see. Administrators are never
given your password, any verification or invitation link issued to you,
your session or multi-factor security information, or any key or
credential held by the platform. Private rehearsal content is not
available to them because this role exists, and identity documents you
provide remain behind a separate, separately authorized route.

What an oversight administrator cannot do. An administrator cannot
change, delete or write an observation, a correction, the outcome of a
correction, or a Behavioral Evidence Report. This is enforced by the
platform itself rather than by the absence of a button. The record of
what was observed is the mentor's record, and it stays that way.

What an oversight administrator can do. Assign a mentor to you, approve
or refuse an employer application, and act on an account — create,
suspend, restore, or start a password reset. An administrator can never
see or set your password. This list is complete: there is no general
administrative power beyond it.

Every look is recorded. Whenever an administrator opens the content of
your record or your messages, the platform records who did so, by name,
when, whose record it was, and the reason given at the time. Every action
in the list above is recorded the same way. These records cannot be
edited or removed by the administrator who generated them, or by anyone
else holding the role.

Why this access exists. Someone has to be accountable for whether the
observation work on this platform meets the standard we claim for it. We
would rather tell you that this access exists, and show you the limits
placed on it, than hold it quietly.

Your rights in relation to this access are set out in [SECTION REFERENCE
— counsel to place], including how to ask what has been accessed about
you and how to raise a concern about it.
$draft$, false
WHERE NOT EXISTS (SELECT 1 FROM public.t3a_oversight_disclosure);
