-- =====================================================================
-- T3A-DEV-CN-EMP-001 — Employer Desk
-- Refusals that are actually logged.
--
-- Items 5, 8, 9A, 9B, 10 and 12 each require that a refused route be
-- "refused server-side and logged", and Item 12 acceptance A3 inspects
-- the refusal log's contents directly. A refusal raised as an exception
-- cannot satisfy that: the raise aborts the statement, and the abort
-- rolls back everything the statement did, including the log insert.
-- PostgreSQL has no autonomous transaction.
--
-- So every employer-desk route that must log its own refusal returns a
-- refusal instead of raising. Nothing is written on the refusal path
-- except the log line, the caller receives an unambiguous refusal code
-- rather than an empty result, and the log survives because the
-- statement commits.
--
-- The one route that still raises is the connection-request trigger: a
-- trigger cannot decline a write by returning a value without silently
-- allowing the statement to appear to succeed, and refusing the write
-- matters more there than logging the attempt. That residue is recorded
-- in the conflict register.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Item 8 / Item 5 — the pool query
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.t3a_employer_pool_query(jsonb, text);

CREATE OR REPLACE FUNCTION public.t3a_employer_pool_query(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_sort    text  DEFAULT 'recently_available')
RETURNS TABLE (
  refusal_code        text,
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
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
      jsonb_build_object('reason', 'organization is not verified'));
    RETURN QUERY SELECT 'EMPLOYER_NOT_VERIFIED'::text,
      NULL::uuid, NULL::text, NULL::text, NULL::uuid, NULL::date, NULL::date,
      NULL::text, NULL::date, NULL::boolean, NULL::boolean;
    RETURN;
  END IF;

  SELECT array_agg(filter_key) INTO v_permitted
  FROM public.t3a_employer_pool_permitted_filters();

  FOR v_key IN SELECT jsonb_object_keys(coalesce(p_filters, '{}'::jsonb)) LOOP
    IF NOT (v_key = ANY (v_permitted)) THEN
      PERFORM public.t3a_employer_desk_log(
        'pool_query_refused_unsupported_parameter', 't3a_employer_pool_query',
        'employer_profile', v_org::text,
        jsonb_build_object('parameter', v_key,
                           'reason', 'parameter is not an approved pool filter'));
      RETURN QUERY SELECT 'POOL_PARAMETER_NOT_PERMITTED'::text,
        NULL::uuid, NULL::text, NULL::text, NULL::uuid, NULL::date, NULL::date,
        NULL::text, NULL::date, NULL::boolean, NULL::boolean;
      RETURN;
    END IF;
  END LOOP;

  IF p_sort NOT IN ('recently_available', 'alphabetical') THEN
    PERFORM public.t3a_employer_desk_log(
      'pool_query_refused_unsupported_sort', 't3a_employer_pool_query',
      'employer_profile', v_org::text,
      jsonb_build_object('sort', p_sort,
                         'reason', 'ordering is availability or alphabetical only'));
    RETURN QUERY SELECT 'POOL_SORT_NOT_PERMITTED'::text,
      NULL::uuid, NULL::text, NULL::text, NULL::uuid, NULL::date, NULL::date,
      NULL::text, NULL::date, NULL::boolean, NULL::boolean;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT NULL::text,
         e.participant_id, e.stated_full_name, e.stated_role_or_field,
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

-- Item 3 first cell. A figure that cannot be read renders as not
-- available and is logged — never as zero (Item 3, 5.4).
DROP FUNCTION IF EXISTS public.t3a_employer_pool_count();

CREATE OR REPLACE FUNCTION public.t3a_employer_pool_count()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE v_org uuid := public.t3a_current_employer_profile();
BEGIN
  IF NOT public.t3a_current_employer_is_verified() THEN
    PERFORM public.t3a_employer_desk_log(
      'pool_count_refused_not_verified', 't3a_employer_pool_count',
      'employer_profile', v_org::text,
      jsonb_build_object('reason', 'organization is not verified'));
    RETURN jsonb_build_object('available', false,
                              'refusal_code', 'EMPLOYER_NOT_VERIFIED');
  END IF;

  RETURN jsonb_build_object('available', true, 'value',
    (SELECT count(*) FROM public.t3a_employer_pool_entry
     WHERE visibility_withdrawn_at IS NULL));
END;
$fn$;

-- ---------------------------------------------------------------------
-- Item 10 — opening a conversation
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.t3a_employer_open_conversation(uuid);

CREATE OR REPLACE FUNCTION public.t3a_employer_open_conversation(
  p_participant_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_org  uuid := public.t3a_current_employer_profile();
  v_conv uuid;
BEGIN
  IF NOT public.t3a_current_employer_is_verified() THEN
    PERFORM public.t3a_employer_desk_log(
      'conversation_refused_not_verified', 't3a_employer_open_conversation',
      'employer_profile', v_org::text,
      jsonb_build_object('reason', 'organization is not verified'));
    RETURN jsonb_build_object('opened', false,
                              'refusal_code', 'EMPLOYER_NOT_VERIFIED');
  END IF;

  -- The element having rendered on a card is not authority to open a
  -- thread. Consent is rechecked server-side at this moment.
  IF NOT public.t3a_participant_contact_open(p_participant_id) THEN
    PERFORM public.t3a_employer_desk_log(
      'conversation_refused_no_contact_consent', 't3a_employer_open_conversation',
      'participant', p_participant_id::text,
      jsonb_build_object('reason', 'participant has not opened contact'));
    RETURN jsonb_build_object('opened', false,
                              'refusal_code', 'CONTACT_CONSENT_ABSENT');
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

  RETURN jsonb_build_object('opened', true, 'conversation_id', v_conv);
END;
$fn$;

-- ---------------------------------------------------------------------
-- Item 9A — the coverage disclosure
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.t3a_coverage_disclosure();

CREATE OR REPLACE FUNCTION public.t3a_coverage_disclosure()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  cur  public.t3a_coverage_snapshot;
  prev public.t3a_coverage_snapshot;
  v_org uuid := public.t3a_current_employer_profile();
BEGIN
  IF NOT public.t3a_current_employer_is_verified() THEN
    PERFORM public.t3a_employer_desk_log(
      'coverage_refused_not_verified', 't3a_coverage_disclosure',
      'employer_profile', v_org::text,
      jsonb_build_object('reason', 'organization is not verified'));
    RETURN jsonb_build_object('available', false,
                              'refusal_code', 'EMPLOYER_NOT_VERIFIED');
  END IF;

  SELECT * INTO cur FROM public.t3a_coverage_snapshot
  ORDER BY published_at DESC LIMIT 1;

  IF cur.snapshot_id IS NULL THEN
    -- Never estimate. The blocks render with the figures absent.
    PERFORM public.t3a_employer_desk_log(
      'coverage_figures_unavailable', 't3a_coverage_disclosure', NULL, NULL,
      jsonb_build_object('reason', 'no coverage snapshot has been published'));
    RETURN jsonb_build_object('available', true, 'figures_available', false,
                              'change_block_available', false);
  END IF;

  SELECT * INTO prev FROM public.t3a_coverage_snapshot
  WHERE snapshot_id = cur.previous_snapshot_id;

  RETURN jsonb_build_object(
    'available', true,
    'figures_available', true,
    'reports_available', cur.reports_available,
    'areas_in_service', to_jsonb(cur.areas_in_service),
    'last_updated', cur.published_at,
    'change_block_available', (prev.snapshot_id IS NOT NULL),
    'reports_became_available',
      CASE WHEN prev.snapshot_id IS NULL THEN NULL
           ELSE GREATEST(cur.reports_available - prev.reports_available, 0) END,
    'area_entered_service',
      CASE WHEN prev.snapshot_id IS NULL THEN NULL
           ELSE coalesce(array_length(cur.areas_in_service, 1), 0)
                > coalesce(array_length(prev.areas_in_service, 1), 0) END);
END;
$fn$;

-- ---------------------------------------------------------------------
-- Item 12 — Employer Feedback
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.t3a_employer_submit_feedback(text, text, jsonb);

CREATE OR REPLACE FUNCTION public.t3a_employer_submit_feedback(
  p_category text,
  p_body     text,
  p_extra    jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
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
  -- refused server-side and logged. The log carries the attempt, route,
  -- actor, time and reason only: never the submitted body, never the
  -- attempted participant or report reference (Item 12, 5.10).
  FOR v_key IN SELECT jsonb_object_keys(coalesce(p_extra, '{}'::jsonb)) LOOP
    IF lower(v_key) = ANY (v_banned) THEN
      PERFORM public.t3a_employer_desk_log(
        'feedback_refused_participant_linked', 't3a_employer_submit_feedback',
        NULL, NULL,
        jsonb_build_object('reason',
          'submission carried a structured participant, report, hire or employment reference'));
      RETURN jsonb_build_object('accepted', false,
        'refusal_code', 'FEEDBACK_PARTICIPANT_LINKAGE_REFUSED');
    END IF;
  END LOOP;

  IF p_category = 'liveworks_experience' AND NOT public.t3a_liveworks_activated() THEN
    PERFORM public.t3a_employer_desk_log(
      'feedback_refused_category_unavailable', 't3a_employer_submit_feedback',
      NULL, NULL, jsonb_build_object('reason', 'LiveWorks is not activated'));
    RETURN jsonb_build_object('accepted', false,
      'refusal_code', 'FEEDBACK_CATEGORY_NOT_AVAILABLE');
  END IF;

  INSERT INTO public.t3a_employer_product_feedback
    (employer_profile_id, submitted_by, category, body)
  VALUES (public.t3a_current_employer_profile(), auth.uid(), p_category, p_body)
  RETURNING feedback_id INTO v_id;

  RETURN jsonb_build_object('accepted', true, 'feedback_id', v_id);
END;
$fn$;

-- ---------------------------------------------------------------------
-- Item 9B — the coverage console
-- ---------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.t3a_coverage_console_read(text, text, text);

CREATE OR REPLACE FUNCTION public.t3a_coverage_console_read(
  p_measure text,
  p_basis   text,
  p_segment text DEFAULT NULL)
RETURNS TABLE (refusal_code text, label text, value text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  -- Item 9B, 5.7: Oversight Administrator only, and a coverage query is
  -- a read, so it is logged with holder, time, measure and basis.
  IF NOT public.t3a_is_oversight_admin() THEN
    PERFORM public.t3a_employer_desk_log(
      'coverage_console_refused_not_oversight', 't3a_coverage_console_read',
      'measure', p_measure,
      jsonb_build_object('reason', 'caller does not hold the oversight administrator role'));
    RETURN QUERY SELECT 'COVERAGE_CONSOLE_OVERSIGHT_ONLY'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF length(btrim(coalesce(p_basis, ''))) < 8 THEN
    PERFORM public.t3a_employer_desk_log(
      'coverage_console_refused_no_basis', 't3a_coverage_console_read',
      'measure', p_measure, jsonb_build_object('reason', 'no basis stated'));
    RETURN QUERY SELECT 'COVERAGE_CONSOLE_BASIS_REQUIRED'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Item 9B, 5.5: no combination of dimension with region, availability
  -- or another dimension is built.
  IF p_segment IS NOT NULL THEN
    PERFORM public.t3a_oversight_record(
      'read', 'coverage_console_intersection_refused', 'coverage_measure',
      p_measure, NULL, p_basis,
      jsonb_build_object('segment_requested', p_segment));
    PERFORM public.t3a_employer_desk_log(
      'coverage_console_refused_intersection', 't3a_coverage_console_read',
      'measure', p_measure,
      jsonb_build_object('reason', 'arbitrary multi-dimension intersections are not built'));
    RETURN QUERY SELECT 'COVERAGE_INTERSECTION_NOT_BUILT'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.t3a_coverage_console_measures() m
                 WHERE m.measure_code = p_measure) THEN
    PERFORM public.t3a_employer_desk_log(
      'coverage_console_refused_not_enumerated', 't3a_coverage_console_read',
      'measure', p_measure, jsonb_build_object('reason', 'measure is not enumerated'));
    RETURN QUERY SELECT 'COVERAGE_MEASURE_NOT_ENUMERATED'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  PERFORM public.t3a_oversight_record(
    'read', 'coverage_console_read', 'coverage_measure',
    p_measure, NULL, p_basis, '{}'::jsonb);

  IF p_measure = 'reports_held_total' THEN
    RETURN QUERY SELECT NULL::text, 'Reports held'::text,
      (SELECT count(*)::text FROM public.t3a_d1_ber_report);

  ELSIF p_measure = 'reports_available' THEN
    RETURN QUERY SELECT NULL::text, 'Available to approved employers'::text,
      (SELECT count(*)::text FROM public.t3a_employer_pool_entry
       WHERE visibility_withdrawn_at IS NULL);

  ELSIF p_measure = 'reports_not_employer_visible' THEN
    RETURN QUERY SELECT NULL::text, 'Not employer-visible'::text,
      (SELECT GREATEST(count(*) - (SELECT count(*) FROM public.t3a_employer_pool_entry
                                   WHERE visibility_withdrawn_at IS NULL), 0)::text
       FROM public.t3a_d1_ber_report);

  ELSIF p_measure = 'reports_with_open_correction' THEN
    RETURN QUERY SELECT NULL::text, 'With an open correction'::text,
      (SELECT count(*)::text FROM public.t3a_correction_case
       WHERE resolved_at IS NULL);

  ELSIF p_measure = 'reports_by_current_through_band' THEN
    -- Four controlled bands and no others. No free-form date input.
    RETURN QUERY
    SELECT NULL::text, b.band, coalesce(c.n, 0)::text
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
    RETURN QUERY SELECT NULL::text, 'Sources with a recorded approval'::text,
      (SELECT count(*)::text FROM public.t3a_d1_source_approval);

  ELSE
    -- observation_coverage: presence and completion only. The console
    -- reports that a number of reports contain a completed observation
    -- in a dimension. It never reports that a number of participants
    -- demonstrated anything in that dimension.
    RETURN QUERY SELECT NULL::text,
      'Reports containing a completed observation'::text,
      (SELECT count(DISTINCT participant_id)::text
       FROM public.t3a_observation_record WHERE is_committed);
  END IF;
END;
$fn$;

GRANT EXECUTE ON FUNCTION
  public.t3a_employer_pool_query(jsonb, text),
  public.t3a_employer_pool_count(),
  public.t3a_employer_open_conversation(uuid),
  public.t3a_coverage_disclosure(),
  public.t3a_employer_submit_feedback(text, text, jsonb),
  public.t3a_coverage_console_read(text, text, text)
TO anon, authenticated;
