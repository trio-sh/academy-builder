-- Step 3j: Stage 3 work sample routes and Stage 4 session routes for D2 (D2 Section 8.4 and 8.5, decisions D-02 and D-03).
--
-- Stage 3: assign, accept or decline, submit with the three declarations and the eleven field provenance check, resubmit by supersession, missed deadline as an attribute only.
-- Stage 4: composition (one observed participant, up to three co-participants), the group participation permission object, entry behind s4_activation_state, the facilitator's single capture lane.
-- Nothing here activates Stage 4 or approves a source. Entry refuses while s4_activation_state is not the single value 'activated'.

alter table public.t3a_d1_work_sample_submission add column if not exists dimension_id text check (dimension_id is null or dimension_id ~ '^D[0-9]{1,2}$');

-- The activation value is fail closed: only the exact value 'activated' opens Stage 4. An empty or any other loaded value leaves it closed.
create or replace function public.t3a_s4_activation_state() returns text language sql stable security definer set search_path = public as $fn$
  select case when v = 'activated' then v end from (
    select configuration_value as v from public.t3a_configuration_value where configuration_key = 's4_activation_state' order by configuration_seq desc limit 1) x
$fn$;

create table if not exists public.t3a_s4_group_participation (
  participation_id uuid primary key default gen_random_uuid(),
  group_session_id uuid not null references public.t3a_d1_group_session(group_session_id),
  participant_id uuid not null,
  member_role text not null check (member_role in ('observed', 'co_participant')),
  notice_version text not null, notice_hash text not null,
  granted_at timestamptz not null default now(),
  unique (group_session_id, participant_id)
);
create table if not exists public.t3a_s4_entry_attempt (
  attempt_id uuid primary key default gen_random_uuid(),
  group_session_id uuid, actor_id uuid, result text not null check (result in ('entered', 'refused')), reason_code text,
  attempted_at timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['t3a_s4_group_participation', 't3a_s4_entry_attempt'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('drop trigger if exists t3a_append_only on public.%I', t);
    execute format('create trigger t3a_append_only before update or delete on public.%I for each row execute function public.t3a_deny_mutation()', t);
  end loop;
end $$;

-- ===== Stage 3 =====
create or replace function public.t3a_s3_assign(p_participant uuid, p_source_version uuid, p_deadline timestamptz) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare g jsonb; dim text; att jsonb; n int; si uuid; sub uuid;
begin
  if not public.t3a_is_service_context() and not public.t3a_has_administrative_standing() then
    return public.t3a_capture_refuse('s3.assign', 'APPROVER_LACKS_STANDING', coalesce(p_participant::text, ''), 'a Stage 3 assignment is made by a person with standing or through the service route');
  end if;
  select o.dimension_id::text into dim from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where v.content_version_id = p_source_version;
  if dim is null then return public.t3a_capture_refuse('s3.assign', 'source_version_not_found', coalesce(p_source_version::text, ''), 'no such version'); end if;
  if p_deadline is null or p_deadline <= now() then return public.t3a_capture_refuse('s3.assign', 'deadline_required_in_future', p_participant::text, 'a brief is assigned with a deadline that has not passed'); end if;
  g := public.t3a_source_serving_gate(p_source_version, 'S3', p_participant);
  if g ->> 'outcome' <> 'servable' then return g; end if;
  att := public.t3a_d1_next_attempt_permitted(p_participant, dim, 'S3'::public.t3a_stage_code);
  if not (att ->> 'permitted')::boolean then return public.t3a_capture_refuse('s3.assign', 'attempt_not_permitted', p_participant::text, coalesce(att ->> 'reason', att ->> 'refusal_code', 'attempt rule')); end if;
  select coalesce(max(attempt_no), 0) + 1 into n from public.t3a_stage_instance where participant_id = p_participant and stage_code = 'S3' and dimension_id::text = dim;
  insert into public.t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no) values (p_participant, 'S3', dim::public.t3a_dimension_code, n) returning stage_instance_id into si;
  insert into public.t3a_d1_work_sample_submission(participant_id, source_version_id, stage_instance_id, deadline_at, dimension_id) values (p_participant, p_source_version, si, p_deadline, dim) returning submission_id into sub;
  return jsonb_build_object('outcome', 'assigned', 'submission_id', sub, 'stage_instance_id', si, 'dimension_id', dim);
end $fn$;
revoke all on function public.t3a_s3_assign(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.t3a_s3_assign(uuid, uuid, timestamptz) to authenticated, service_role;

create or replace function public.t3a_s3_respond(p_submission uuid, p_response text) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare s public.t3a_d1_work_sample_submission;
begin
  select * into s from public.t3a_d1_work_sample_submission where submission_id = p_submission;
  if s.submission_id is null or s.participant_id is distinct from auth.uid() then return public.t3a_capture_refuse('s3.respond', 'not_your_assignment', coalesce(p_submission::text, ''), 'only the assigned participant responds'); end if;
  if s.state <> 'ASSIGNED' then return public.t3a_capture_refuse('s3.respond', 'invalid_state_for_response', p_submission::text, 'state is ' || s.state); end if;
  if p_response = 'accept' then
    update public.t3a_d1_work_sample_submission set state = 'ACCEPTED' where submission_id = p_submission;
    return jsonb_build_object('outcome', 'accepted');
  elsif p_response = 'decline' then
    -- a decline records that the situation did not run: no reason is collected, it is never an evidence outcome, and no attempt is consumed
    update public.t3a_d1_work_sample_submission set state = 'DECLINED', declined_at = now() where submission_id = p_submission;
    return jsonb_build_object('outcome', 'declined', 'evidence_outcome', false, 'offer_another_source', true);
  end if;
  return public.t3a_capture_refuse('s3.respond', 'unknown_response', p_submission::text, 'accept or decline');
end $fn$;
revoke all on function public.t3a_s3_respond(uuid, text) from public, anon;
grant execute on function public.t3a_s3_respond(uuid, text) to authenticated, service_role;

-- Submission and resubmission share one check: eleven fields, with prior_version_ref a twelfth only on a resubmission.
create or replace function public.t3a_s3_submit(p_submission uuid, p_artifact_ref text, p_authorship boolean, p_assistance boolean, p_assistance_detail text, p_tooling boolean, p_tooling_detail text, p_prior uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare s public.t3a_d1_work_sample_submission; pr public.t3a_d1_work_sample_submission; newid uuid; chk jsonb; resub boolean := p_prior is not null; subj text;
begin
  if resub then
    select * into pr from public.t3a_d1_work_sample_submission where submission_id = p_prior;
    if pr.submission_id is null or pr.participant_id is distinct from auth.uid() then return public.t3a_capture_refuse('s3.resubmit', 'not_your_submission', coalesce(p_prior::text, ''), 'only the submitting participant resubmits'); end if;
    if pr.superseded_by is not null or pr.state not in ('AVAILABLE_FOR_CAPTURE', 'CAPTURED', 'PROVENANCE_CHECKED', 'SUBMITTED') then
      return public.t3a_capture_refuse('s3.resubmit', 'prior_not_resubmittable', p_prior::text, 'prior state is ' || pr.state || case when pr.superseded_by is not null then ', already superseded' else '' end);
    end if;
    s := pr; subj := p_prior::text;
  else
    select * into s from public.t3a_d1_work_sample_submission where submission_id = p_submission;
    if s.submission_id is null or s.participant_id is distinct from auth.uid() then return public.t3a_capture_refuse('s3.submit', 'not_your_assignment', coalesce(p_submission::text, ''), 'only the assigned participant submits'); end if;
    if s.state not in ('ACCEPTED', 'IN_PROGRESS') then return public.t3a_capture_refuse('s3.submit', 'invalid_state_for_submission', p_submission::text, 'state is ' || s.state); end if;
    subj := p_submission::text;
  end if;
  if p_tooling is null then return public.t3a_capture_refuse('s3.submit', 'AI_USE_DECLARATION_REQUIRED', subj, 'the tooling declaration is required'); end if;
  if p_authorship is null or p_authorship is not true then return public.t3a_capture_refuse('s3.submit', 'AUTHORSHIP_ATTESTATION_NOT_AFFIRMED', subj, 'the authorship attestation must be affirmed to submit'); end if;
  if p_assistance is null then return public.t3a_capture_refuse('s3.submit', 'PROVENANCE_FIELD_MISSING', subj, 'assistance_declaration'); end if;
  if coalesce(trim(p_artifact_ref), '') = '' then return public.t3a_capture_refuse('s3.submit', 'PROVENANCE_FIELD_MISSING', subj, 'artifact_ref'); end if;
  if (p_assistance and p_assistance_detail is null) or (not p_assistance and p_assistance_detail is not null)
     or (p_tooling and p_tooling_detail is null) or (not p_tooling and p_tooling_detail is not null) then
    return public.t3a_capture_refuse('s3.submit', 'DECLARATION_DETAIL_MISMATCH', subj, 'a controlled detail is selected exactly when the declaration is yes');
  end if;
  if s.source_version_id is null or s.stage_instance_id is null or s.deadline_at is null or s.assigned_at is null then
    return public.t3a_capture_refuse('s3.submit', 'PROVENANCE_FIELD_MISSING', subj, 'assignment fields');
  end if;
  if resub then
    insert into public.t3a_d1_work_sample_submission(participant_id, source_version_id, stage_instance_id, state, assigned_at, deadline_at, submitted_at, artifact_ref, authorship_attestation,
        assistance_declaration, assistance_detail, tooling_declaration, tooling_detail, prior_version_ref, dimension_id)
      values (s.participant_id, s.source_version_id, s.stage_instance_id, 'RESUBMITTED', s.assigned_at, s.deadline_at, now(), p_artifact_ref, p_authorship, p_assistance, p_assistance_detail, p_tooling, p_tooling_detail, p_prior, s.dimension_id)
      returning submission_id into newid;
  else
    update public.t3a_d1_work_sample_submission set state = 'SUBMITTED', submitted_at = now(), artifact_ref = p_artifact_ref, authorship_attestation = p_authorship,
        assistance_declaration = p_assistance, assistance_detail = p_assistance_detail, tooling_declaration = p_tooling, tooling_detail = p_tooling_detail where submission_id = p_submission;
    newid := p_submission;
  end if;
  chk := public.t3a_d1_work_sample_provenance_check(newid);
  if not (chk ->> 'passed')::boolean then raise exception 'S3_PROVENANCE_BACKSTOP %', chk::text; end if;
  update public.t3a_d1_work_sample_submission set state = 'PROVENANCE_CHECKED' where submission_id = newid and state <> 'RESUBMITTED';
  update public.t3a_d1_work_sample_submission set state = 'AVAILABLE_FOR_CAPTURE' where submission_id = newid and state = 'PROVENANCE_CHECKED';
  if resub then
    update public.t3a_d1_work_sample_submission set superseded_by = newid where submission_id = p_prior;
    update public.t3a_d1_work_sample_submission set state = 'AVAILABLE_FOR_CAPTURE' where submission_id = newid;
  end if;
  return jsonb_build_object('outcome', 'submitted', 'submission_id', newid, 'fields_checked', chk -> 'fields_checked', 'resubmission', resub);
end $fn$;
revoke all on function public.t3a_s3_submit(uuid, text, boolean, boolean, text, boolean, text, uuid) from public, anon;
grant execute on function public.t3a_s3_submit(uuid, text, boolean, boolean, text, boolean, text, uuid) to authenticated, service_role;

-- A missed deadline is a lifecycle attribute: it composes nothing, is never adverse, and consumes no attempt.
create or replace function public.t3a_s3_deadline_sweep(p_now timestamptz default now()) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare n int;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('s3.deadline', 'service_route_only', '', 'the sweep runs through the service route'); end if;
  update public.t3a_d1_work_sample_submission set deadline_missed = true where state in ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS') and deadline_at < p_now and not deadline_missed;
  get diagnostics n = row_count;
  return jsonb_build_object('outcome', 'swept', 'marked', n, 'composes_statement', false, 'adverse', false, 'attempt_consumed', false);
end $fn$;
revoke all on function public.t3a_s3_deadline_sweep(timestamptz) from public, anon, authenticated;
grant execute on function public.t3a_s3_deadline_sweep(timestamptz) to service_role;

-- Factual capture is by an authorized mentor, after submission, never by the participant, and the mentor must hold no earlier part in the same record.
create or replace function public.t3a_s3_capture_gate(p_submission uuid, p_mentor uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare s public.t3a_d1_work_sample_submission; og jsonb;
begin
  select * into s from public.t3a_d1_work_sample_submission where submission_id = p_submission;
  if s.submission_id is null then return public.t3a_capture_refuse('s3.capture', 'submission_not_found', coalesce(p_submission::text, ''), 'no such submission'); end if;
  if s.superseded_by is not null then return public.t3a_capture_refuse('s3.capture', 'not_available_for_capture', p_submission::text, 'superseded by a later submission'); end if;
  if s.state <> 'AVAILABLE_FOR_CAPTURE' then return public.t3a_capture_refuse('s3.capture', 'not_available_for_capture', p_submission::text, 'state is ' || s.state); end if;
  if p_mentor = s.participant_id then return public.t3a_capture_refuse('s3.capture', 'participant_cannot_capture_own_work', p_mentor::text, 'a participant does not capture determinations on their own submission'); end if;
  og := public.t3a_observer_gate(p_mentor, s.dimension_id, s.participant_id);
  if og ->> 'outcome' <> 'authorized' then return og; end if;
  return jsonb_build_object('outcome', 'may_capture', 'grades_the_work', false, 'artifact_on_report_face', false);
end $fn$;
revoke all on function public.t3a_s3_capture_gate(uuid, uuid) from public, anon;
grant execute on function public.t3a_s3_capture_gate(uuid, uuid) to authenticated, service_role;

-- ===== Stage 4 =====
create or replace function public.t3a_s4_compose_session(p_source_version uuid, p_facilitator uuid, p_observed uuid, p_co uuid[], p_accommodation_settled boolean) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare gs uuid; m uuid; og jsonb; dim text;
begin
  if not public.t3a_is_service_context() and not public.t3a_has_administrative_standing() then
    return public.t3a_capture_refuse('s4.compose', 'APPROVER_LACKS_STANDING', coalesce(p_observed::text, ''), 'a session is composed by a person with standing or through the service route');
  end if;
  if coalesce(cardinality(p_co), 0) > 3 then return public.t3a_capture_refuse('s4.compose', 'too_many_co_participants', p_observed::text, 'up to three co-participants'); end if;
  if p_observed = p_facilitator or p_facilitator = any (coalesce(p_co, '{}')) or p_observed = any (coalesce(p_co, '{}')) or cardinality(p_co) <> (select count(distinct x) from unnest(p_co) x) then
    return public.t3a_capture_refuse('s4.compose', 'roles_must_be_distinct', p_observed::text, 'the facilitator, the observed participant and each co-participant are different people');
  end if;
  if not coalesce(p_accommodation_settled, false) then return public.t3a_capture_refuse('s4.compose', 'accommodation_not_settled', p_observed::text, 'accommodation needs are settled before composition, never during the session'); end if;
  select o.dimension_id::text into dim from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where v.content_version_id = p_source_version;
  if dim is null then return public.t3a_capture_refuse('s4.compose', 'source_version_not_found', coalesce(p_source_version::text, ''), 'no such version'); end if;
  og := public.t3a_observer_gate(p_facilitator, dim, p_observed);
  if og ->> 'outcome' <> 'authorized' then return og; end if;
  if not public.t3a_pilot_path_open(p_observed, dim, 'new') then
    return public.t3a_capture_refuse('s4.compose', 'pilot_path_stopped', p_observed::text, 'a pilot stop is in force');
  end if;
  insert into public.t3a_d1_group_session(source_version_id, facilitator_id, observed_participant_id, accommodation_settled) values (p_source_version, p_facilitator, p_observed, true) returning group_session_id into gs;
  insert into public.t3a_d1_group_session_member(group_session_id, participant_id, member_role) values (gs, p_observed, 'observed');
  foreach m in array coalesce(p_co, '{}') loop
    insert into public.t3a_d1_group_session_member(group_session_id, participant_id, member_role) values (gs, m, 'co_participant');
  end loop;
  return jsonb_build_object('outcome', 'composed', 'group_session_id', gs, 'observation_records_to_be_written', 1);
end $fn$;
revoke all on function public.t3a_s4_compose_session(uuid, uuid, uuid, uuid[], boolean) from public, anon;
grant execute on function public.t3a_s4_compose_session(uuid, uuid, uuid, uuid[], boolean) to authenticated, service_role;

-- The participation permission: given by the person for themselves, bound to the loaded notice version and its hash. With no notice loaded the route refuses.
create or replace function public.t3a_s4_record_group_participation(p_group_session uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare r text; nv text; nh text;
begin
  select member_role into r from public.t3a_d1_group_session_member where group_session_id = p_group_session and participant_id = auth.uid();
  if r is null then return public.t3a_capture_refuse('s4.participation', 'NOT_A_MEMBER_OF_THIS_SESSION', coalesce(p_group_session::text, ''), 'only a member gives their own permission'); end if;
  select nullif(configuration_value, '') into nv from public.t3a_configuration_value where configuration_key = 's4_group_notice_version' order by configuration_seq desc limit 1;
  select nullif(configuration_value, '') into nh from public.t3a_configuration_value where configuration_key = 's4_group_notice_hash' order by configuration_seq desc limit 1;
  if nv is null or nh is null then return public.t3a_capture_refuse('s4.participation', 'group_notice_unloaded', p_group_session::text, 'the approved group participation notice is not loaded'); end if;
  insert into public.t3a_s4_group_participation(group_session_id, participant_id, member_role, notice_version, notice_hash) values (p_group_session, auth.uid(), r, nv, nh) on conflict do nothing;
  return jsonb_build_object('outcome', 'recorded', 'notice_version', nv);
end $fn$;
revoke all on function public.t3a_s4_record_group_participation(uuid) from public, anon;
grant execute on function public.t3a_s4_record_group_participation(uuid) to authenticated, service_role;

-- Entry: every attempt is recorded with its result. There is no bypass, override or test flag.
create or replace function public.t3a_s4_enter(p_group_session uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare gs public.t3a_d1_group_session; res jsonb; code text; missing int; mem int;
begin
  select * into gs from public.t3a_d1_group_session where group_session_id = p_group_session;
  if gs.group_session_id is null then code := 'session_not_found';
  elsif gs.facilitator_id is distinct from auth.uid() and not public.t3a_is_service_context() then code := 'facilitator_only';
  elsif public.t3a_s4_activation_state() is null then code := 's4_not_activated';
  else
    res := public.t3a_source_serving_gate(gs.source_version_id, 'S4', gs.observed_participant_id);
    if res ->> 'outcome' <> 'servable' then code := coalesce(res ->> 'reason', 'source_not_servable');
    else
      select count(*) into mem from public.t3a_d1_group_session_member where group_session_id = p_group_session;
      select count(*) into missing from public.t3a_d1_group_session_member m where m.group_session_id = p_group_session
        and not exists (select 1 from public.t3a_s4_group_participation p where p.group_session_id = m.group_session_id and p.participant_id = m.participant_id);
      if missing > 0 then code := 'group_participation_missing';
      elsif not gs.accommodation_settled then code := 'accommodation_not_settled';
      end if;
    end if;
  end if;
  if code is not null then
    insert into public.t3a_s4_entry_attempt(group_session_id, actor_id, result, reason_code) values (p_group_session, auth.uid(), 'refused', code);
    perform public.t3a_capture_refuse('s4.enter', code, coalesce(p_group_session::text, ''), 'Stage 4 entry refused');
    return jsonb_build_object('outcome', 'refused', 'reason', code);
  end if;
  update public.t3a_d1_group_session set started_at = now() where group_session_id = p_group_session;
  insert into public.t3a_s4_entry_attempt(group_session_id, actor_id, result) values (p_group_session, auth.uid(), 'entered');
  return jsonb_build_object('outcome', 'entered', 'capture_lanes', 1);
end $fn$;
revoke all on function public.t3a_s4_enter(uuid) from public, anon;
grant execute on function public.t3a_s4_enter(uuid) to authenticated, service_role;

-- The one capture lane belongs to the facilitator. No participant, the observed participant included, sees it.
create or replace function public.t3a_s4_lane_view(p_group_session uuid, p_viewer uuid) returns jsonb language plpgsql security definer set search_path = public as $fn$
declare gs public.t3a_d1_group_session;
begin
  select * into gs from public.t3a_d1_group_session where group_session_id = p_group_session;
  if gs.group_session_id is null or gs.facilitator_id is distinct from p_viewer then
    return public.t3a_capture_refuse('s4.lane', 'lane_visible_to_facilitator_only', coalesce(p_viewer::text, ''), 'no participant sees the capture lane, a determination or progression');
  end if;
  return jsonb_build_object('outcome', 'visible', 'lane_for', gs.observed_participant_id, 'lanes', 1);
end $fn$;
revoke all on function public.t3a_s4_lane_view(uuid, uuid) from public, anon;
grant execute on function public.t3a_s4_lane_view(uuid, uuid) to authenticated, service_role;
