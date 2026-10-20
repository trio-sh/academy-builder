-- Step 3d: the D2 source gateway (INS-004 rules 019 to 029, directives D-01, D-02, D-03).
--
-- * derived fields: administration_form_id (from the Stage, crosses dimensions) and interaction_pattern_family_id (from the situation class, dimension scoped)
-- * D-01: two drafting-test rows per source version, reviewer never the author; an empty row refuses approval as drafting_test_incomplete
-- * D-02: a Stage 3 source needs a rights record before it can even be submitted for approval (rights_route_absent)
-- * D-03: Stage 4 entry refuses behind the unloaded s4_activation_state (s4_not_activated)
-- * prior exposure: source version, administration form (crosses dimensions) and pattern family (dimension scoped); cross-dimension pattern comparison refuses until an approved mapping row exists
-- * one serving gate that every observation-capable route calls

create table if not exists public.t3a_administration_form (
  stage_code text primary key check (stage_code in ('S1', 'S2', 'S3', 'S4')),
  administration_form_id text not null unique
);
insert into public.t3a_administration_form values ('S1', 'FORM-S1-SEQUENTIAL-REVEAL'), ('S2', 'FORM-S2-SEVEN-BEAT'), ('S3', 'FORM-S3-ASYNC-SUBMISSION'), ('S4', 'FORM-S4-GROUP-ROUND') on conflict do nothing;

create table if not exists public.t3a_interaction_pattern_family (
  dimension_id text not null,
  situation_class text not null,
  interaction_pattern_family_id text not null,
  primary key (dimension_id, situation_class),
  unique (dimension_id, interaction_pattern_family_id)
);
insert into public.t3a_interaction_pattern_family values
  ('D2', 'SC-D2-1', 'IPF-D2-01'), ('D2', 'SC-D2-2', 'IPF-D2-02'), ('D2', 'SC-D2-3', 'IPF-D2-03'), ('D2', 'SC-D2-4', 'IPF-D2-04'),
  ('D2', 'SC-D2-5', 'IPF-D2-05'), ('D2', 'SC-D2-6', 'IPF-D2-06'), ('D2', 'SC-D2-7', 'IPF-D2-07') on conflict do nothing;

-- Cross-dimension pattern mapping: built with its foreign keys and left EMPTY. Every cross-dimension comparison refuses until a row exists.
create table if not exists public.t3a_cross_dimension_pattern_map (
  dimension_a text not null, pattern_a text not null,
  dimension_b text not null, pattern_b text not null,
  approved_by uuid not null, approved_at timestamptz not null default now(),
  primary key (dimension_a, pattern_a, dimension_b, pattern_b),
  check (dimension_a <> dimension_b)
);

create table if not exists public.t3a_source_authorship (
  source_version_id uuid primary key references public.t3a_d1_content_version(content_version_id),
  source_author_identity text[] not null check (cardinality(source_author_identity) > 0),
  recorded_at timestamptz not null default now()
);

create table if not exists public.t3a_source_drafting_test (
  source_version_id uuid not null references public.t3a_d1_content_version(content_version_id),
  test_no int not null check (test_no in (1, 2)),
  outcome text not null check (btrim(outcome) <> ''),
  reviewer_identity text not null check (btrim(reviewer_identity) <> ''),
  tested_on date not null,
  version_tested_ref text not null check (btrim(version_tested_ref) <> ''),
  recorded_at timestamptz not null default now(),
  primary key (source_version_id, test_no)
);

create table if not exists public.t3a_source_rights_record (
  source_version_id uuid primary key references public.t3a_d1_content_version(content_version_id),
  rights_basis text not null check (btrim(rights_basis) <> ''),
  confidentiality_basis text not null check (btrim(confidentiality_basis) <> ''),
  permitted_use_basis text not null check (btrim(permitted_use_basis) <> ''),
  authorship_provenance_basis text not null check (btrim(authorship_provenance_basis) <> ''),
  approver_id uuid not null, approved_on date not null,
  recorded_at timestamptz not null default now()
);

create table if not exists public.t3a_source_approval_request (
  request_id uuid primary key default gen_random_uuid(),
  source_version_id uuid not null references public.t3a_d1_content_version(content_version_id),
  requested_by uuid, requested_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['t3a_administration_form', 't3a_interaction_pattern_family', 't3a_cross_dimension_pattern_map', 't3a_source_authorship', 't3a_source_drafting_test', 't3a_source_rights_record', 't3a_source_approval_request'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
  foreach t in array array['t3a_source_authorship', 't3a_source_drafting_test', 't3a_source_rights_record', 't3a_source_approval_request'] loop
    execute format('drop trigger if exists t3a_append_only on public.%I', t);
    execute format('create trigger t3a_append_only before update or delete on public.%I for each row execute function public.t3a_deny_mutation()', t);
  end loop;
end $$;

create or replace function public.t3a_administration_form_of(p_stage text) returns text language sql stable as $fn$
  select administration_form_id from public.t3a_administration_form where stage_code = upper(p_stage)
$fn$;

-- The non-author rule, structural (D-01): the write is refused and logged when the reviewer is the author or a member of the author list,
-- or when no author is recorded (the rule cannot be evaluated, so the write fails closed).
create or replace function public.t3a_drafting_test_guard() returns trigger language plpgsql security definer set search_path = public as $fn$
declare a text[];
begin
  select source_author_identity into a from public.t3a_source_authorship where source_version_id = new.source_version_id;
  if a is null then
    perform public.t3a_capture_refuse('source.drafting_test', 'source_author_identity_absent', new.source_version_id::text, 'the author of this source version is not recorded, so the non-author rule cannot be evaluated');
    return null;
  end if;
  if new.reviewer_identity = any (a) then
    perform public.t3a_capture_refuse('source.drafting_test', 'reviewer_is_source_author', new.source_version_id::text, 'the reviewer of a drafting test may not be the author of the source');
    return null;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_0_drafting_test_guard_trg on public.t3a_source_drafting_test;
create trigger t3a_0_drafting_test_guard_trg before insert on public.t3a_source_drafting_test for each row execute function public.t3a_drafting_test_guard();

-- Preconditions of an approval. Null means none fails. D1 versions are not re-judged.
create or replace function public.t3a_source_approval_preconditions(p_version uuid) returns text language plpgsql stable security definer set search_path = public as $fn$
declare v public.t3a_d1_content_version; o public.t3a_content_object; sc text; dim text; stage text;
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_version;
  if v.content_version_id is null then return 'source_version_not_found'; end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text;
  if dim is null or dim = 'D1' then return null; end if;
  stage := v.body ->> 'stage_code';
  sc := v.body -> 'source_sheet' ->> (lower(dim) || '_situation_class');
  if sc is null or not exists (select 1 from public.t3a_interaction_pattern_family f where f.dimension_id = dim and f.situation_class = sc) then return 'situation_class_absent_or_unknown'; end if;
  if public.t3a_administration_form_of(stage) is null then return 'administration_form_absent'; end if;
  if (select count(*) from public.t3a_source_drafting_test t where t.source_version_id = p_version) < 2 then return 'drafting_test_incomplete'; end if;
  if stage = 'S3' and not exists (select 1 from public.t3a_source_rights_record r where r.source_version_id = p_version) then return 'rights_route_absent'; end if;
  if not exists (select 1 from public.t3a_source_approval_request q where q.source_version_id = p_version) then return 'not_submitted_for_approval'; end if;
  if not exists (select 1 from public.t3a_d1_source_name_clearance c where c.source_version_id = p_version and c.status = 'cleared') then return 'name_clearance_pending'; end if;
  return null;
end $fn$;

-- Submission for approval (D-02): a Stage 3 source with no rights record cannot enter the queue.
create or replace function public.t3a_source_submit_for_approval(p_version uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v public.t3a_d1_content_version; o public.t3a_content_object; stage text; sc text;
begin
  if not public.t3a_has_administrative_standing() and not public.t3a_is_service_context() then
    return public.t3a_capture_refuse('source.submit', 'APPROVER_LACKS_STANDING', p_version::text, 'submission for approval needs administrative standing');
  end if;
  select * into v from public.t3a_d1_content_version where content_version_id = p_version;
  if v.content_version_id is null then return public.t3a_capture_refuse('source.submit', 'source_version_not_found', p_version::text, 'no such version'); end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  stage := v.body ->> 'stage_code';
  if o.dimension_id::text <> 'D1' then
    sc := v.body -> 'source_sheet' ->> (lower(o.dimension_id::text) || '_situation_class');
    if sc is null then return public.t3a_capture_refuse('source.submit', 'situation_class_absent_or_unknown', p_version::text, 'a null situation class blocks the approval record'); end if;
    if stage = 'S3' and not exists (select 1 from public.t3a_source_rights_record r where r.source_version_id = p_version) then
      return public.t3a_capture_refuse('source.submit', 'rights_route_absent', p_version::text, 'a Stage 3 source with no rights record cannot enter the approval queue');
    end if;
  end if;
  insert into public.t3a_source_approval_request (source_version_id, requested_by) values (p_version, auth.uid());
  return jsonb_build_object('outcome', 'queued', 'source_version_id', p_version);
end $fn$;
revoke all on function public.t3a_source_submit_for_approval(uuid) from public, anon;
grant execute on function public.t3a_source_submit_for_approval(uuid) to authenticated, service_role;

-- Backstop on the table: whatever route writes an approval, the preconditions hold.
create or replace function public.t3a_source_approval_backstop() returns trigger language plpgsql security definer set search_path = public as $fn$
declare c text;
begin
  if new.status = 'approved' then
    c := public.t3a_source_approval_preconditions(new.source_version_id);
    if c is not null then raise exception 'SOURCE_APPROVAL_PRECONDITION: %', c using errcode = 'check_violation'; end if;
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_0_source_approval_backstop_trg on public.t3a_d1_source_approval;
create trigger t3a_0_source_approval_backstop_trg before insert on public.t3a_d1_source_approval for each row execute function public.t3a_source_approval_backstop();

-- Cross-dimension pattern comparison refuses until an approved mapping row exists.
create or replace function public.t3a_pattern_compare(p_dim_a text, p_pattern_a text, p_dim_b text, p_pattern_b text) returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  if p_dim_a = p_dim_b then return jsonb_build_object('outcome', 'compared', 'same_pattern', p_pattern_a = p_pattern_b); end if;
  if exists (select 1 from public.t3a_cross_dimension_pattern_map m where (m.dimension_a, m.pattern_a, m.dimension_b, m.pattern_b) in ((p_dim_a, p_pattern_a, p_dim_b, p_pattern_b), (p_dim_b, p_pattern_b, p_dim_a, p_pattern_a))) then
    return jsonb_build_object('outcome', 'compared', 'same_pattern', true, 'via', 'approved mapping');
  end if;
  return public.t3a_capture_refuse('exposure.pattern', 'cross_dimension_pattern_unmapped', p_dim_a || ':' || p_pattern_a || ' / ' || p_dim_b || ':' || p_pattern_b, 'no approved mapping row; pattern identifiers of different dimensions are not interchangeable');
end $fn$;

-- Prior exposure, read from the Stage entries (each names the exact source version it served). Three separate fields (5.6): the version, the form (crosses dimensions) and the pattern (this dimension only).
create or replace function public.t3a_prior_exposure(p_participant uuid, p_source_version uuid) returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare v public.t3a_d1_content_version; o public.t3a_content_object; stage text; form text; sc text; ipf text; dim text; reasons text[] := '{}';
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_source_version;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text; stage := v.body ->> 'stage_code'; form := public.t3a_administration_form_of(stage);
  sc := v.body -> 'source_sheet' ->> (lower(dim) || '_situation_class');
  select interaction_pattern_family_id into ipf from public.t3a_interaction_pattern_family where dimension_id = dim and situation_class = sc;
  if exists (select 1 from public.t3a_stage_entry_event s where s.participant_id = p_participant and s.source_version_id = p_source_version) then reasons := reasons || 'source_version_met'::text; end if;
  if exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id
              where s.participant_id = p_participant and public.t3a_administration_form_of(pv.body ->> 'stage_code') = form) then reasons := reasons || 'administration_form_met'::text; end if;
  if ipf is not null and exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id join public.t3a_content_object po on po.content_object_id = pv.content_object_id
              join public.t3a_interaction_pattern_family pf on pf.dimension_id = po.dimension_id::text and pf.situation_class = pv.body -> 'source_sheet' ->> (lower(po.dimension_id::text) || '_situation_class')
              where s.participant_id = p_participant and po.dimension_id::text = dim and pf.interaction_pattern_family_id = ipf) then reasons := reasons || 'pattern_family_met'::text; end if;
  return jsonb_build_object('excluded', cardinality(reasons) > 0, 'reasons', to_jsonb(reasons), 'administration_form_id', form, 'interaction_pattern_family_id', ipf);
end $fn$;
revoke all on function public.t3a_prior_exposure(uuid, uuid) from public, anon;
grant execute on function public.t3a_prior_exposure(uuid, uuid) to authenticated, service_role;

-- Stage entry gate for Stage 4 (D-03): behind a single loaded configuration value with no default.
create or replace function public.t3a_s4_activation_state() returns text language sql stable security definer set search_path = public as $fn$
  select configuration_value from public.t3a_configuration_value where configuration_key = 's4_activation_state' order by configuration_seq desc limit 1
$fn$;

-- The serving gate every observation-capable route calls. Draft, in review, retired, superseded, blocked and unapproved content is unreachable.
create or replace function public.t3a_source_serving_gate(p_version uuid, p_stage text, p_participant uuid default null) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v public.t3a_d1_content_version; o public.t3a_content_object; st text := upper(p_stage); ex jsonb;
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_version;
  if v.content_version_id is null then return public.t3a_capture_refuse('source.serve', 'source_version_not_found', p_version::text, 'no such version'); end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  if st = 'S4' and public.t3a_s4_activation_state() is null then
    return public.t3a_capture_refuse('source.serve', 's4_not_activated', p_version::text, 'Stage 4 entry is disabled behind s4_activation_state, which is not loaded');
  end if;
  if coalesce(v.body ->> 'stage_code', '') <> st then return public.t3a_capture_refuse('source.serve', 'source_stage_mismatch', p_version::text, 'the source belongs to Stage ' || coalesce(v.body ->> 'stage_code', '?')); end if;
  if v.superseded_by is not null or v.retired_at is not null or o.retired_at is not null then return public.t3a_capture_refuse('source.serve', 'source_superseded_or_retired', p_version::text, 'superseded and retired versions do not serve'); end if;
  if v.approval_status <> 'approved' or not public.t3a_d1_source_version_approved(p_version) then return public.t3a_capture_refuse('source.serve', 'source_not_approved', p_version::text, 'only an exact approved version serves'); end if;
  if v.operational_state <> 'active' then return public.t3a_capture_refuse('source.serve', 'source_not_active', p_version::text, 'the version is not loaded and active'); end if;
  if p_participant is not null then
    ex := public.t3a_prior_exposure(p_participant, p_version);
    if (ex ->> 'excluded')::boolean then return public.t3a_capture_refuse('source.serve', 'prior_exposure_exclusion', p_participant::text, ex ->> 'reasons'); end if;
  end if;
  return jsonb_build_object('outcome', 'servable', 'source_version_id', p_version);
end $fn$;
revoke all on function public.t3a_source_serving_gate(uuid, text, uuid) from public, anon;
grant execute on function public.t3a_source_serving_gate(uuid, text, uuid) to authenticated, service_role;

-- D2 4.1 restates the platform cooldown ladder (seven days after the first completed observation, fourteen after the second, none after the third).
insert into public.t3a_d1_specification_cooldown (dimension_id, completed_observations, wait_days, issued_under, note)
  select 'D2', completed_observations, wait_days, issued_under, 'D2 4.1 restates the platform ladder (T3A-D1-EXEC-CORR-006 Section 8)' from public.t3a_d1_specification_cooldown where dimension_id = 'D1'
  on conflict do nothing;

-- The live approval route with the precondition block added (generated from the production definition).
CREATE OR REPLACE FUNCTION public.t3a_d1_record_source_approval(p_source_id uuid, p_source_version_id uuid, p_status text, p_basis_kind text DEFAULT NULL::text, p_referenced_identifier text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor    uuid := auth.uid();
  v_body     jsonb;
  v_object   uuid;
  v_standing text;
  v_requires boolean;
  v_approval uuid;
  v_pre      text;
BEGIN
  IF v_actor IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'NO_APPROVER_IDENTIFIED');
  END IF;

  -- Standing is checked here, not taken from the caller's word for it.
  IF NOT public.t3a_has_administrative_standing() THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'APPROVER_LACKS_STANDING');
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'withdrawn') THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'STATUS_NOT_IN_CONTROLLED_SET');
  END IF;

  -- CX-18. Checked BEFORE anything is written, so a missing basis is a
  -- named refusal rather than a deferred constraint error at commit.
  IF p_status = 'approved' THEN
    IF coalesce(btrim(p_basis_kind), '') = '' THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_REQUIRED',
        'remedy', 'An approval records what it rested on. Select one of the three bases at CORR-006 Section 5.2.',
        'closed_list', (SELECT jsonb_agg(jsonb_build_object(
                                 'basis_kind', k.basis_kind,
                                 'records', k.records,
                                 'requires_referenced_identifier', k.requires_referenced_identifier)
                                 ORDER BY k.basis_kind)
                          FROM public.t3a_d1_approval_basis_kind k));
    END IF;

    SELECT k.requires_referenced_identifier INTO v_requires
      FROM public.t3a_d1_approval_basis_kind k
     WHERE k.basis_kind = p_basis_kind;

    IF v_requires IS NULL THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_NOT_IN_CLOSED_LIST',
        'remedy', 'The list of bases is closed. It is widened by an instrument, not by an approver.');
    END IF;

    IF v_requires AND coalesce(btrim(p_referenced_identifier), '') = '' THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_REQUIRES_AN_IDENTIFIER',
        'remedy', 'That basis records a named document or instrument. Name it.');
    END IF;

    IF NOT v_requires AND coalesce(btrim(p_referenced_identifier), '') <> '' THEN
      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'APPROVAL_BASIS_TAKES_NO_IDENTIFIER',
        'remedy', 'That basis records that the text was read in this screen. It names no document.');
    END IF;
  END IF;

  SELECT body, content_object_id INTO v_body, v_object
    FROM public.t3a_d1_content_version
   WHERE content_version_id = p_source_version_id;

  IF v_body IS NULL THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_NOT_FOUND');
  END IF;

  -- The object and the version must be the same source. Retained
  -- verbatim: this file replaces the route, and a replacement that drops
  -- a check is a regression dressed as a fix.
  IF v_object IS DISTINCT FROM p_source_id THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'VERSION_DOES_NOT_BELONG_TO_THIS_SOURCE');
  END IF;

  -- A superseded version cannot be approved. Approving one would mean a
  -- source served text that a later correction had already replaced.
  IF EXISTS (SELECT 1 FROM public.t3a_d1_content_version
             WHERE content_version_id = p_source_version_id
               AND superseded_by IS NOT NULL) THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_SUPERSEDED');
  END IF;

  -- §5.18: an approval names an exact version, and the version must be
  -- able to say which text it is. No hash, no approval.
  IF coalesce(btrim(v_body ->> 'source_version_hash'), '') = ''
     AND p_status = 'approved' THEN
    RETURN jsonb_build_object('recorded', false,
      'refusal_code', 'SOURCE_VERSION_CARRIES_NO_HASH',
      'remedy', 'An approval names an exact text. Assign the source-version hash before approving it.');
  END IF;

  -- D2 INS-004: a source of a later dimension needs its drafting tests, its rights route (Stage 3), its derived fields and its name clearance
  -- before an approval can be recorded. D1 approvals already recorded are not re-judged.
  IF p_status = 'approved' THEN
    v_pre := public.t3a_source_approval_preconditions(p_source_version_id);
    IF v_pre IS NOT NULL THEN
      INSERT INTO public.t3a_d1_approval_refusal_log
        (source_id, source_version_id, attempted_status, refusal_code, standing_at_refusal, attempted_by)
      VALUES (p_source_id, p_source_version_id, p_status, v_pre, public.t3a_d1_version_standing_status(p_source_version_id), v_actor);
      RETURN jsonb_build_object('recorded', false, 'refusal_code', v_pre,
        'remedy', 'This is a precondition of the dimension, not a decision. The refusal is the control.');
    END IF;
  END IF;

  -- AX-04. Lock before reading standing, on the same key the trigger
  -- uses, so the route and the backstop serialize against each other
  -- rather than each against itself.
  IF p_status = 'approved' THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended(p_source_id::text || ':' || p_source_version_id::text, 0));

    -- AX-08. This was an EXISTS on status = 'approved', which refused any
    -- re-approval of a withdrawn version — the same defect as the index,
    -- in the route. It now asks what is STANDING.
    v_standing := public.t3a_d1_version_standing_status(p_source_version_id);

    IF v_standing = 'approved' THEN
      -- AX-03: refused AND logged. This row commits because the function
      -- returns rather than raising.
      INSERT INTO public.t3a_d1_approval_refusal_log
        (source_id, source_version_id, attempted_status, refusal_code,
         standing_at_refusal, attempted_by)
      VALUES (p_source_id, p_source_version_id, p_status,
              'SOURCE_VERSION_ALREADY_APPROVED', v_standing, v_actor);

      RETURN jsonb_build_object('recorded', false,
        'refusal_code', 'SOURCE_VERSION_ALREADY_APPROVED',
        'remedy', 'The version holds a standing approval. Record a withdrawal before approving it again; the withdrawal stays in the history.');
    END IF;
  END IF;

  INSERT INTO public.t3a_d1_source_approval
    (source_id, source_version_id, status, approved_by, approved_at)
  VALUES (p_source_id, p_source_version_id, p_status, v_actor, now())
  RETURNING source_approval_id INTO v_approval;

  -- CX-16's shape, for a live approval: a separate row keyed to the
  -- approval. The approval row itself carries no basis column and gains
  -- none.
  IF p_status = 'approved' THEN
    INSERT INTO public.t3a_d1_approval_basis
      (source_approval_id, basis_kind, referenced_identifier, basis_text,
       basis_entered_on, recorded_under)
    VALUES (v_approval, p_basis_kind, nullif(btrim(p_referenced_identifier), ''),
            NULL, current_date,
            'Selected in the approval screen under CORR-006 Section 5.2, CX-18');
  END IF;

  RETURN jsonb_build_object('recorded', true,
    'status', p_status,
    'approved_by', v_actor,
    'basis_kind', CASE WHEN p_status = 'approved' THEN p_basis_kind END);
END;
$function$;

-- The attempt rule reads the cooldown ladder of its own dimension (the ladder table is now keyed by dimension).
CREATE OR REPLACE FUNCTION public.t3a_d1_next_attempt_permitted(p_participant_id uuid, p_dimension_id text, p_stage_code t3a_stage_code)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_completed  int;
  v_last_end   timestamptz;
  v_wait       int;
  v_has_wait   boolean;
  v_available  timestamptz;
  v_welfare    timestamptz;
BEGIN
  SELECT count(*), max(a.ended_at) INTO v_completed, v_last_end
    FROM public.t3a_attempt a
   WHERE a.participant_id = p_participant_id
     AND a.dimension_id = p_dimension_id
     AND a.stage_code = p_stage_code
     AND a.outcome = 'completed'
     AND a.counted;

  -- AC-B1: the attempt cap of three. Read from CX-27's own table: the row
  -- for three completed observations carries no wait BECAUSE there is no
  -- fourth attempt, and reading its NULL as "no wait" is the mistake this
  -- guards against.
  IF v_completed >= 3 THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'ATTEMPT_CAP_REACHED',
      'completed_observations', v_completed,
      'remedy', 'CX-27: there is no cooldown after the third completed observation because there is no fourth attempt.');
  END IF;

  IF v_completed >= 1 THEN
    SELECT c.wait_days, (c.wait_days IS NOT NULL) INTO v_wait, v_has_wait
      FROM public.t3a_d1_specification_cooldown c
     WHERE c.completed_observations = v_completed AND c.dimension_id = p_dimension_id;

    IF NOT coalesce(v_has_wait, false) THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'NO_COOLDOWN_ISSUED_FOR_THIS_COUNT',
        'completed_observations', v_completed,
        'remedy', 'CX-27 issues a wait for one and two completed observations. A count with no issued wait is held rather than allowed through.');
    END IF;

    IF v_last_end IS NULL THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'COMPLETED_ATTEMPT_HAS_NO_END_TIME',
        'remedy', 'The cooldown counts from the end of the completed observation. Without that instant there is nothing to count from, and guessing one would shorten a wait.');
    END IF;

    v_available := v_last_end + make_interval(days => v_wait);
    IF now() < v_available THEN
      RETURN jsonb_build_object('permitted', false,
        'refusal_code', 'SPECIFICATION_COOLDOWN_IN_FORCE',
        'completed_observations', v_completed,
        'wait_days', v_wait,
        'available_from', v_available);
    END IF;
  END IF;

  -- CX-28. A welfare stop consumes no attempt, so none of the above sees it,
  -- and "the rescheduling cooldown applies" — whose duration this instrument
  -- does not give. Held rather than guessed.
  SELECT max(w.recorded_at) INTO v_welfare
    FROM public.t3a_d1_welfare_withdrawal w
    JOIN public.t3a_attempt a ON a.attempt_id = w.attempt_id
   WHERE a.participant_id = p_participant_id
     AND a.dimension_id = p_dimension_id
     AND a.stage_code = p_stage_code;

  IF v_welfare IS NOT NULL THEN
    RETURN jsonb_build_object('permitted', false,
      'refusal_code', 'RESCHEDULING_COOLDOWN_DURATION_NOT_ISSUED',
      'welfare_stop_at', v_welfare,
      'remedy', 'CX-28 says a welfare stop consumes no attempt and that the rescheduling cooldown applies. Its duration is named nowhere in this instrument, so the build does not supply one. The participant is held until the founder issues it — which is also the protective reading, because the point of a wait after distress is not to be re-observed straight away.');
  END IF;

  RETURN jsonb_build_object('permitted', true,
    'completed_observations', v_completed);
END;
$function$;
