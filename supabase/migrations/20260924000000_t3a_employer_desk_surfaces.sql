-- =====================================================================
-- T3A-DEV-CN-EMP-001 — Employer Desk
-- Build order steps 5 to 7:
--   5. Build the pool index to the allowlist (Item 8, 5.3.1)
--   6. The surfaces (Items 3, 5, 6, 8, 9A, 10, 12)
--   7. The Administrative Coverage Console (Item 9B)
--
-- The pool index is built before any listing surface renders, and the
-- console's read log precedes its access.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Item 6 — activation is a configuration value read at request time
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.t3a_employer_desk_config (
  config_key   text PRIMARY KEY,
  config_value jsonb NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid
);

COMMENT ON TABLE public.t3a_employer_desk_config IS
  'Employer desk configuration read at request time. Changing a value changes the rendered state with no code change and no deployment.';

CREATE TABLE IF NOT EXISTS public.t3a_employer_desk_config_change (
  change_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key     text NOT NULL,
  previous_value jsonb,
  new_value      jsonb NOT NULL,
  changed_at     timestamptz NOT NULL DEFAULT now(),
  changed_by     uuid,
  actor_name     text
);

COMMENT ON TABLE public.t3a_employer_desk_config_change IS
  'Item 6 step 5.5. Every change to an activation value, with timestamp and actor. Append-only.';

CREATE OR REPLACE FUNCTION public.t3a_employer_desk_config_append_only()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'CONFIG_CHANGE_LOG_APPEND_ONLY: % refused', TG_OP
    USING ERRCODE = 'check_violation';
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_employer_desk_config_change_no_update ON public.t3a_employer_desk_config_change;
CREATE TRIGGER t3a_employer_desk_config_change_no_update
  BEFORE UPDATE OR DELETE ON public.t3a_employer_desk_config_change
  FOR EACH ROW EXECUTE FUNCTION public.t3a_employer_desk_config_append_only();

CREATE OR REPLACE FUNCTION public.t3a_employer_desk_config_record_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_name text;
BEGIN
  SELECT btrim(coalesce(first_name,'') || ' ' || coalesce(last_name,''))
    INTO v_name FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.t3a_employer_desk_config_change
    (config_key, previous_value, new_value, changed_by, actor_name)
  VALUES (NEW.config_key,
          CASE WHEN TG_OP = 'UPDATE' THEN OLD.config_value ELSE NULL END,
          NEW.config_value, auth.uid(),
          nullif(v_name, ''));
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS t3a_employer_desk_config_logged ON public.t3a_employer_desk_config;
CREATE TRIGGER t3a_employer_desk_config_logged
  AFTER INSERT OR UPDATE ON public.t3a_employer_desk_config
  FOR EACH ROW EXECUTE FUNCTION public.t3a_employer_desk_config_record_change();

ALTER TABLE public.t3a_employer_desk_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_employer_desk_config_change ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_employer_desk_config_read ON public.t3a_employer_desk_config;
CREATE POLICY t3a_employer_desk_config_read ON public.t3a_employer_desk_config
  FOR SELECT USING (true);

DROP POLICY IF EXISTS t3a_employer_desk_config_write ON public.t3a_employer_desk_config;
CREATE POLICY t3a_employer_desk_config_write ON public.t3a_employer_desk_config
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

DROP POLICY IF EXISTS t3a_employer_desk_config_change_read ON public.t3a_employer_desk_config_change;
CREATE POLICY t3a_employer_desk_config_change_read ON public.t3a_employer_desk_config_change
  FOR SELECT USING (
    public.t3a_is_oversight_admin() OR public.t3a_is_service_context());

INSERT INTO public.t3a_employer_desk_config (config_key, config_value)
VALUES ('liveworks_employer_activation', 'false'::jsonb)
ON CONFLICT (config_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.t3a_liveworks_activated()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT COALESCE(
    (SELECT config_value = 'true'::jsonb FROM public.t3a_employer_desk_config
     WHERE config_key = 'liveworks_employer_activation'),
    false);
$fn$;

-- The three controlled states of Item 6, and no other combination.
CREATE OR REPLACE FUNCTION public.t3a_liveworks_tile_state()
RETURNS TABLE (state_code text, state_line text, control_enabled boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public.t3a_liveworks_activated() THEN
    RETURN QUERY SELECT 'not_activated'::text,
      'LiveWorks is not open to employers yet.'::text, false;
  ELSIF NOT public.t3a_current_employer_is_verified() THEN
    RETURN QUERY SELECT 'not_verified'::text,
      'LiveWorks is available to verified employers only.'::text, false;
  ELSE
    RETURN QUERY SELECT 'available'::text, NULL::text, true;
  END IF;
END;
$fn$;

-- ---------------------------------------------------------------------
-- 2. Item 8 — the pool index, incapable of conduct search
-- ---------------------------------------------------------------------

-- The exclusion is structural. There is no dimension column, no Stage
-- column, no conduct text column, no conduct-derived metadata column and
-- no embedding column on this table, so the index cannot be made to
-- search conduct by any query written against it.
CREATE TABLE IF NOT EXISTS public.t3a_employer_pool_entry (
  pool_entry_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  stated_full_name    text NOT NULL,
  stated_role_or_field text,
  work_location_preference text,
  availability_to_start    text,
  work_authorization_jurisdiction text,
  open_to_liveworks   boolean,
  ber_report_id       uuid,
  observation_period_start date,
  observation_period_end   date,
  report_status       text,
  current_through     date,
  correction_open     boolean NOT NULL DEFAULT false,
  made_available_at   timestamptz NOT NULL DEFAULT now(),
  visibility_withdrawn_at timestamptz
);

COMMENT ON TABLE public.t3a_employer_pool_entry IS
  'The approved-employer pool index. Filter on what the participant stated; never filter on what was observed about them. This table carries no dimension, Stage, conduct text, conduct-derived field or embedding, so conduct search is structurally impossible rather than merely unexposed.';

CREATE INDEX IF NOT EXISTS t3a_employer_pool_available_idx
  ON public.t3a_employer_pool_entry (made_available_at DESC)
  WHERE visibility_withdrawn_at IS NULL;

ALTER TABLE public.t3a_employer_pool_entry ENABLE ROW LEVEL SECURITY;

-- The participant controls their own entry. Employers never read this
-- table directly; they reach it only through the gated query below.
DROP POLICY IF EXISTS t3a_employer_pool_entry_own ON public.t3a_employer_pool_entry;
CREATE POLICY t3a_employer_pool_entry_own ON public.t3a_employer_pool_entry
  FOR ALL USING (
    participant_id = auth.uid()
    OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context())
  WITH CHECK (participant_id = auth.uid() OR public.t3a_is_service_context());

-- Item 8 acceptance A3 is proved by inspecting the index rather than the
-- query layer, so the field list is returned as data.
CREATE OR REPLACE FUNCTION public.t3a_employer_pool_index_fields()
RETURNS TABLE (field_name text, data_type text)
LANGUAGE sql STABLE AS $fn$
  SELECT column_name::text, data_type::text
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 't3a_employer_pool_entry'
  ORDER BY ordinal_position;
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_employer_pool_permitted_filters()
RETURNS TABLE (filter_key text)
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT unnest(ARRAY[
    'role_or_field_sought',
    'work_location_preference',
    'availability_to_start',
    'work_authorization_jurisdiction',
    'open_to_liveworks'
  ]);
$fn$;

-- The pool query. Accepts only the approved fields; every other
-- parameter refuses server-side and logs.
CREATE OR REPLACE FUNCTION public.t3a_employer_pool_query(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_sort    text  DEFAULT 'recently_available')
RETURNS TABLE (
  participant_id      uuid,
  stated_full_name    text,
  stated_role_or_field text,
  ber_report_id       uuid,
  observation_period_start date,
  observation_period_end   date,
  report_status       text,
  current_through     date,
  correction_open     boolean,
  contact_available   boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_key       text;
  v_permitted text[];
  v_org       uuid := public.t3a_current_employer_profile();
BEGIN
  -- Item 5 step 5.6 / Item 8 step 5.13: a Pending or Not verified
  -- organization receives nothing — no listing, no count, no metadata.
  IF NOT public.t3a_current_employer_is_verified() THEN
    PERFORM public.t3a_employer_desk_log(
      'pool_query_refused_not_verified', 't3a_employer_pool_query',
      'employer_profile', v_org::text,
      jsonb_build_object('state', public.t3a_employer_verification_state(v_org)));
    RAISE EXCEPTION 'EMPLOYER_NOT_VERIFIED: the approved-employer pool is closed to this organization'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT array_agg(filter_key) INTO v_permitted
  FROM public.t3a_employer_pool_permitted_filters();

  FOR v_key IN SELECT jsonb_object_keys(coalesce(p_filters, '{}'::jsonb)) LOOP
    IF NOT (v_key = ANY (v_permitted)) THEN
      PERFORM public.t3a_employer_desk_log(
        'pool_query_refused_unsupported_parameter', 't3a_employer_pool_query',
        'employer_profile', v_org::text,
        jsonb_build_object('parameter', v_key));
      RAISE EXCEPTION 'POOL_PARAMETER_NOT_PERMITTED: % is not an approved pool filter', v_key
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END LOOP;

  IF p_sort NOT IN ('recently_available', 'alphabetical') THEN
    PERFORM public.t3a_employer_desk_log(
      'pool_query_refused_unsupported_sort', 't3a_employer_pool_query',
      'employer_profile', v_org::text, jsonb_build_object('sort', p_sort));
    RAISE EXCEPTION 'POOL_SORT_NOT_PERMITTED: ordering is availability or alphabetical only'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT e.participant_id, e.stated_full_name, e.stated_role_or_field,
         e.ber_report_id, e.observation_period_start, e.observation_period_end,
         e.report_status, e.current_through, e.correction_open,
         public.t3a_participant_contact_open(e.participant_id)
  FROM public.t3a_employer_pool_entry e
  WHERE e.visibility_withdrawn_at IS NULL
    AND (NOT p_filters ? 'role_or_field_sought'
         OR e.stated_role_or_field ILIKE '%' || (p_filters ->> 'role_or_field_sought') || '%')
    AND (NOT p_filters ? 'work_location_preference'
         OR e.work_location_preference = (p_filters ->> 'work_location_preference'))
    AND (NOT p_filters ? 'availability_to_start'
         OR e.availability_to_start = (p_filters ->> 'availability_to_start'))
    AND (NOT p_filters ? 'work_authorization_jurisdiction'
         OR e.work_authorization_jurisdiction = (p_filters ->> 'work_authorization_jurisdiction'))
    AND (NOT p_filters ? 'open_to_liveworks'
         OR (public.t3a_liveworks_activated()
             AND e.open_to_liveworks = ((p_filters ->> 'open_to_liveworks')::boolean)))
  ORDER BY
    CASE WHEN p_sort = 'alphabetical' THEN e.stated_full_name END ASC,
    CASE WHEN p_sort = 'recently_available' THEN e.made_available_at END DESC;
END;
$fn$;

-- The Item 3 first cell. Same gate, so a Pending organization gets no
-- count either.
CREATE OR REPLACE FUNCTION public.t3a_employer_pool_count()
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF NOT public.t3a_current_employer_is_verified() THEN
    RAISE EXCEPTION 'EMPLOYER_NOT_VERIFIED' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN (SELECT count(*)::integer FROM public.t3a_employer_pool_entry
          WHERE visibility_withdrawn_at IS NULL);
END;
$fn$;

-- Item 8 step 5.7 workflow bar, and step 5.10 workspace notes.
CREATE TABLE IF NOT EXISTS public.t3a_employer_saved_report (
  saved_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_profile_id uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  participant_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  saved_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_profile_id, participant_id)
);

CREATE TABLE IF NOT EXISTS public.t3a_employer_report_view (
  view_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_profile_id uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  participant_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.t3a_employer_workspace_note (
  note_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_profile_id uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  participant_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_body           text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_employer_workspace_note IS
  'Organization workspace notes, employer-side only. A note is never part of the Behavioral Evidence Report, never alters any record, is never used for ranking, search, matching or recommendation, and is never surfaced to another organization. It is not rendered on any participant surface in this build, and nothing here asserts that a note is permanently invisible to the participant.';

ALTER TABLE public.t3a_employer_saved_report ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_employer_report_view ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.t3a_employer_workspace_note ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_employer_saved_report_own ON public.t3a_employer_saved_report;
CREATE POLICY t3a_employer_saved_report_own ON public.t3a_employer_saved_report
  FOR ALL USING (EXISTS (SELECT 1 FROM public.employer_profiles e
                         WHERE e.id = employer_profile_id AND e.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employer_profiles e
                      WHERE e.id = employer_profile_id AND e.profile_id = auth.uid()));

DROP POLICY IF EXISTS t3a_employer_report_view_own ON public.t3a_employer_report_view;
CREATE POLICY t3a_employer_report_view_own ON public.t3a_employer_report_view
  FOR ALL USING (EXISTS (SELECT 1 FROM public.employer_profiles e
                         WHERE e.id = employer_profile_id AND e.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employer_profiles e
                      WHERE e.id = employer_profile_id AND e.profile_id = auth.uid()));

-- Employer-side only, and never readable by the participant it names.
DROP POLICY IF EXISTS t3a_employer_workspace_note_own ON public.t3a_employer_workspace_note;
CREATE POLICY t3a_employer_workspace_note_own ON public.t3a_employer_workspace_note
  FOR ALL USING (EXISTS (SELECT 1 FROM public.employer_profiles e
                         WHERE e.id = employer_profile_id AND e.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.employer_profiles e
                      WHERE e.id = employer_profile_id AND e.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- 3. Item 10 — contact begins only from a report, rechecked at the moment
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_employer_open_conversation(
  p_participant_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_org  uuid := public.t3a_current_employer_profile();
  v_conv uuid;
BEGIN
  IF NOT public.t3a_current_employer_is_verified() THEN
    PERFORM public.t3a_employer_desk_log(
      'conversation_refused_not_verified', 't3a_employer_open_conversation',
      'employer_profile', v_org::text, '{}'::jsonb);
    RAISE EXCEPTION 'EMPLOYER_NOT_VERIFIED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- The element having rendered on a card is not authority to open a
  -- thread. Consent is rechecked server-side at this moment.
  IF NOT public.t3a_participant_contact_open(p_participant_id) THEN
    PERFORM public.t3a_employer_desk_log(
      'conversation_refused_no_contact_consent', 't3a_employer_open_conversation',
      'participant', p_participant_id::text, '{}'::jsonb);
    RAISE EXCEPTION 'CONTACT_CONSENT_ABSENT: this participant has not opened contact'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT c.id INTO v_conv
  FROM public.conversations c
  JOIN public.conversation_participants a ON a.conversation_id = c.id AND a.user_id = auth.uid()
  JOIN public.conversation_participants b ON b.conversation_id = c.id AND b.user_id = p_participant_id
  LIMIT 1;

  IF v_conv IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES RETURNING id INTO v_conv;
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (v_conv, auth.uid()), (v_conv, p_participant_id);
  END IF;

  PERFORM public.t3a_employer_desk_log(
    'conversation_opened', 't3a_employer_open_conversation',
    'participant', p_participant_id::text,
    jsonb_build_object('conversation_id', v_conv));

  RETURN v_conv;
END;
$fn$;

-- Item 10 step 5.9 — the Overview metric counts participant-consented
-- conversation threads only: not requests, not pending invitations,
-- not relationships.
CREATE OR REPLACE FUNCTION public.t3a_employer_open_conversation_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $fn$
  SELECT count(DISTINCT cp.conversation_id)::integer
  FROM public.conversation_participants cp
  JOIN public.conversation_participants other
    ON other.conversation_id = cp.conversation_id AND other.user_id <> cp.user_id
  WHERE cp.user_id = auth.uid()
    AND public.t3a_participant_contact_open(other.user_id);
$fn$;

-- ---------------------------------------------------------------------
-- 4. Item 9A — the coverage disclosure
-- ---------------------------------------------------------------------

-- No withdrawal column exists on this table. Withdrawal counts are not
-- rendered at launch, and the structure is what guarantees it rather
-- than a rendering decision that a later change could reverse.
CREATE TABLE IF NOT EXISTS public.t3a_coverage_snapshot (
  snapshot_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  published_at         timestamptz NOT NULL DEFAULT now(),
  reports_available    integer NOT NULL,
  areas_in_service     text[] NOT NULL DEFAULT ARRAY[]::text[],
  previous_snapshot_id uuid REFERENCES public.t3a_coverage_snapshot(snapshot_id)
);

COMMENT ON TABLE public.t3a_coverage_snapshot IS
  'Item 9A. Published coverage snapshots. Block 3 compares the current published snapshot with the immediately preceding one, never with an individual employer last visit. No withdrawal figure is held, so none can be rendered.';

ALTER TABLE public.t3a_coverage_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_coverage_snapshot_read ON public.t3a_coverage_snapshot;
CREATE POLICY t3a_coverage_snapshot_read ON public.t3a_coverage_snapshot
  FOR SELECT USING (true);

DROP POLICY IF EXISTS t3a_coverage_snapshot_write ON public.t3a_coverage_snapshot;
CREATE POLICY t3a_coverage_snapshot_write ON public.t3a_coverage_snapshot
  FOR ALL USING (public.t3a_is_service_context())
  WITH CHECK (public.t3a_is_service_context());

CREATE OR REPLACE FUNCTION public.t3a_publish_coverage_snapshot()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_prev uuid;
  v_id   uuid;
  v_areas text[];
BEGIN
  IF NOT (public.t3a_is_service_context() OR public.t3a_is_oversight_admin()) THEN
    RAISE EXCEPTION 'COVERAGE_SNAPSHOT_NOT_AUTHORIZED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT snapshot_id INTO v_prev FROM public.t3a_coverage_snapshot
  ORDER BY published_at DESC LIMIT 1;

  -- Behavioral areas are named in full; bare identifiers are not
  -- employer-facing text (Item 9A, 5.11).
  SELECT coalesce(array_agg(DISTINCT area ORDER BY area), ARRAY[]::text[])
    INTO v_areas
  FROM (
    SELECT CASE WHEN s.dimension_id::text = 'D1'
                THEN 'Professional Integrity Under Pressure'
                ELSE s.dimension_id::text END AS area
    FROM public.t3a_d1_source_approval s
    WHERE s.dimension_id IS NOT NULL
  ) named;

  INSERT INTO public.t3a_coverage_snapshot
    (reports_available, areas_in_service, previous_snapshot_id)
  VALUES (
    (SELECT count(*)::integer FROM public.t3a_employer_pool_entry
     WHERE visibility_withdrawn_at IS NULL),
    v_areas, v_prev)
  RETURNING snapshot_id INTO v_id;

  RETURN v_id;
END;
$fn$;

-- Blocks 1 and 3 of the disclosure. Gated on Verified per 5.12.
CREATE OR REPLACE FUNCTION public.t3a_coverage_disclosure()
RETURNS TABLE (
  reports_available        integer,
  areas_in_service         text[],
  last_updated             timestamptz,
  figures_available        boolean,
  change_reports_became_available integer,
  change_area_entered_service     boolean,
  change_block_available   boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  cur  public.t3a_coverage_snapshot;
  prev public.t3a_coverage_snapshot;
BEGIN
  IF NOT public.t3a_current_employer_is_verified() THEN
    RAISE EXCEPTION 'EMPLOYER_NOT_VERIFIED' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO cur FROM public.t3a_coverage_snapshot
  ORDER BY published_at DESC LIMIT 1;

  IF cur.snapshot_id IS NULL THEN
    -- Never estimate. The blocks render with the figures absent.
    RETURN QUERY SELECT NULL::integer, NULL::text[], NULL::timestamptz,
                        false, NULL::integer, NULL::boolean, false;
    RETURN;
  END IF;

  SELECT * INTO prev FROM public.t3a_coverage_snapshot
  WHERE snapshot_id = cur.previous_snapshot_id;

  RETURN QUERY SELECT
    cur.reports_available,
    cur.areas_in_service,
    cur.published_at,
    true,
    CASE WHEN prev.snapshot_id IS NULL THEN NULL
         ELSE GREATEST(cur.reports_available - prev.reports_available, 0) END,
    CASE WHEN prev.snapshot_id IS NULL THEN NULL
         ELSE array_length(cur.areas_in_service, 1)
              IS DISTINCT FROM array_length(prev.areas_in_service, 1) END,
    (prev.snapshot_id IS NOT NULL);
END;
$fn$;

-- ---------------------------------------------------------------------
-- 5. Item 12 — Employer Feedback, about the product and never a person
-- ---------------------------------------------------------------------

-- The table carries no participant, report, hire or employment column,
-- so a structured reference cannot be stored whatever a caller sends.
CREATE TABLE IF NOT EXISTS public.t3a_employer_product_feedback (
  feedback_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_profile_id uuid REFERENCES public.employer_profiles(id) ON DELETE SET NULL,
  submitted_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  category            text NOT NULL CHECK (category IN (
                        'ber_clarity','employer_desk_experience',
                        'access_or_workflow','liveworks_experience','general')),
  body                text NOT NULL,
  submitted_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.t3a_employer_product_feedback IS
  'Employer feedback about The 3rd Academy products and the employer experience. Employer feedback about The 3rd Academy must never become behavioral evidence about a participant. Text submitted here is never used as evidence about any participant, never reaches any record, and never enters matching, ordering or a report.';

ALTER TABLE public.t3a_employer_product_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS t3a_employer_product_feedback_own ON public.t3a_employer_product_feedback;
CREATE POLICY t3a_employer_product_feedback_own ON public.t3a_employer_product_feedback
  FOR SELECT USING (
    submitted_by = auth.uid()
    OR public.t3a_is_oversight_admin()
    OR public.t3a_is_service_context());

DROP POLICY IF EXISTS t3a_employer_product_feedback_insert ON public.t3a_employer_product_feedback;
CREATE POLICY t3a_employer_product_feedback_insert ON public.t3a_employer_product_feedback
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

CREATE OR REPLACE FUNCTION public.t3a_employer_submit_feedback(
  p_category text,
  p_body     text,
  p_extra    jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_id  uuid;
  v_key text;
  v_banned text[] := ARRAY[
    'participant_id','candidate_id','participant','candidate',
    'report_id','ber_report_id','report','hire_id','hire',
    'employment_id','employment_link_id','employee_id','person_id',
    'performance_rating','would_hire_again','readiness_accuracy',
    'behavioral_alignment'];
BEGIN
  -- A hand-constructed submission carrying a structured reference is
  -- refused server-side. The refusal log carries the attempt, route,
  -- actor, time and reason only: never the body, never the reference
  -- (Item 12, 5.10).
  FOR v_key IN SELECT jsonb_object_keys(coalesce(p_extra, '{}'::jsonb)) LOOP
    IF lower(v_key) = ANY (v_banned) THEN
      PERFORM public.t3a_employer_desk_log(
        'feedback_refused_participant_linked', 't3a_employer_submit_feedback',
        NULL, NULL,
        jsonb_build_object('reason', 'structured participant, report, hire or employment reference'));
      RAISE EXCEPTION 'FEEDBACK_PARTICIPANT_LINKAGE_REFUSED: employer feedback is about the product, never about a person'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END LOOP;

  IF p_category = 'liveworks_experience' AND NOT public.t3a_liveworks_activated() THEN
    RAISE EXCEPTION 'FEEDBACK_CATEGORY_NOT_AVAILABLE' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.t3a_employer_product_feedback
    (employer_profile_id, submitted_by, category, body)
  VALUES (public.t3a_current_employer_profile(), auth.uid(), p_category, p_body)
  RETURNING feedback_id INTO v_id;

  RETURN v_id;
END;
$fn$;

-- ---------------------------------------------------------------------
-- 6. Item 9B — Administrative Coverage Console
--    The log precedes the access it records: reads go through
--    t3a_oversight_record, which already exists and is append-only.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.t3a_coverage_console_measures()
RETURNS TABLE (measure_code text, description text)
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT * FROM (VALUES
    ('reports_held_total',        'Total Behavioral Evidence Reports held'),
    ('reports_available',         'Reports currently available to approved employers'),
    ('reports_not_employer_visible', 'Reports currently not employer-visible'),
    ('reports_with_open_correction', 'Reports with an open correction'),
    ('reports_by_current_through_band', 'Reports by current-through band'),
    ('source_status',             'Dimension and source status as authored, in service or not in service'),
    ('observation_coverage',      'Observation coverage by dimension, as presence and completion only')
  ) AS m(measure_code, description);
$fn$;

CREATE OR REPLACE FUNCTION public.t3a_coverage_console_read(
  p_measure text,
  p_basis   text,
  p_segment text DEFAULT NULL)
RETURNS TABLE (label text, value text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  -- Item 9B, 5.7: Oversight Administrator only, and a coverage query is
  -- a read, so it is logged with holder, time, measure and basis.
  IF NOT public.t3a_is_oversight_admin() THEN
    PERFORM public.t3a_employer_desk_log(
      'coverage_console_refused_not_oversight', 't3a_coverage_console_read',
      'measure', p_measure, '{}'::jsonb);
    RAISE EXCEPTION 'COVERAGE_CONSOLE_OVERSIGHT_ONLY' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF length(btrim(coalesce(p_basis, ''))) < 8 THEN
    RAISE EXCEPTION 'COVERAGE_CONSOLE_BASIS_REQUIRED' USING ERRCODE = 'check_violation';
  END IF;

  -- Item 9B, 5.5: no combination of dimension with region, availability
  -- or another dimension is built.
  IF p_segment IS NOT NULL THEN
    PERFORM public.t3a_oversight_record(
      'read', 'coverage_console_intersection_refused', 'coverage_measure',
      p_measure, NULL, p_basis,
      jsonb_build_object('segment_requested', p_segment));
    RAISE EXCEPTION 'COVERAGE_INTERSECTION_NOT_BUILT: arbitrary multi-dimension intersections are not available'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.t3a_coverage_console_measures()
                 WHERE measure_code = p_measure) THEN
    RAISE EXCEPTION 'COVERAGE_MEASURE_NOT_ENUMERATED: %', p_measure
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM public.t3a_oversight_record(
    'read', 'coverage_console_read', 'coverage_measure',
    p_measure, NULL, p_basis, '{}'::jsonb);

  IF p_measure = 'reports_held_total' THEN
    RETURN QUERY SELECT 'Reports held'::text,
      (SELECT count(*)::text FROM public.t3a_d1_ber_report);

  ELSIF p_measure = 'reports_available' THEN
    RETURN QUERY SELECT 'Available to approved employers'::text,
      (SELECT count(*)::text FROM public.t3a_employer_pool_entry
       WHERE visibility_withdrawn_at IS NULL);

  ELSIF p_measure = 'reports_not_employer_visible' THEN
    RETURN QUERY SELECT 'Not employer-visible'::text,
      (SELECT (count(*) - (SELECT count(*) FROM public.t3a_employer_pool_entry
                           WHERE visibility_withdrawn_at IS NULL))::text
       FROM public.t3a_d1_ber_report);

  ELSIF p_measure = 'reports_with_open_correction' THEN
    RETURN QUERY SELECT 'With an open correction'::text,
      (SELECT count(*)::text FROM public.t3a_correction_case
       WHERE resolved_at IS NULL);

  ELSIF p_measure = 'reports_by_current_through_band' THEN
    -- Four controlled bands and no others. No free-form date input.
    RETURN QUERY
    SELECT b.band, coalesce(c.n, 0)::text
    FROM (VALUES (1,'30 days or fewer'), (2,'31 to 60 days'),
                 (3,'61 to 90 days'), (4,'more than 90 days')) AS b(ord, band)
    LEFT JOIN (
      SELECT CASE
               WHEN current_through - CURRENT_DATE <= 30 THEN '30 days or fewer'
               WHEN current_through - CURRENT_DATE <= 60 THEN '31 to 60 days'
               WHEN current_through - CURRENT_DATE <= 90 THEN '61 to 90 days'
               ELSE 'more than 90 days' END AS band,
             count(*) AS n
      FROM public.t3a_employer_pool_entry
      WHERE current_through IS NOT NULL
      GROUP BY 1) c ON c.band = b.band
    ORDER BY b.ord;

  ELSIF p_measure = 'source_status' THEN
    RETURN QUERY SELECT 'Sources with a recorded approval'::text,
      (SELECT count(*)::text FROM public.t3a_d1_source_approval);

  ELSE
    -- observation_coverage: presence and completion only. The console
    -- reports that a number of reports contain a completed observation
    -- in a dimension. It never reports that a number of participants
    -- demonstrated anything.
    RETURN QUERY
    SELECT 'Reports containing a completed observation'::text,
      (SELECT count(DISTINCT participant_id)::text
       FROM public.t3a_observation_record WHERE is_committed);
  END IF;
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_liveworks_activated(),
  public.t3a_liveworks_tile_state(),
  public.t3a_employer_pool_query(jsonb, text),
  public.t3a_employer_pool_count(),
  public.t3a_employer_pool_index_fields(),
  public.t3a_employer_pool_permitted_filters(),
  public.t3a_employer_open_conversation(uuid),
  public.t3a_employer_open_conversation_count(),
  public.t3a_coverage_disclosure(),
  public.t3a_employer_submit_feedback(text, text, jsonb),
  public.t3a_coverage_console_measures(),
  public.t3a_coverage_console_read(text, text, text)
TO anon, authenticated;
