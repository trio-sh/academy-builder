-- FD-D1-04, interim (CR-220). Until now the issue route refused every call by design: the authority check ended in a fixed refusal and the route allowed no
-- environment but the synthetic one. The founder's approval of 23 October 2026 left the decision to the founder's delegate. The interim is a named list:
-- only a person on it (recorded as a decision, append-only, revocable) can pass the authority check, and only in the pilot or synthetic environment.
-- Every other gate stands unchanged: the issuance floor, an open challenge, the participant's own review, the reviewer-is-not-issuer rule, the calibration
-- boundary and the freshness and hold checks. A person is never added by this file; the list starts empty. Production stays refused.

create table if not exists public.t3a_d1_evidence_review_authority_event (
  event_id uuid primary key default gen_random_uuid(),
  person_id uuid not null,
  action text not null check (action in ('grant', 'revoke')),
  scope text not null default 'test_pilot' check (scope = 'test_pilot'),
  decision_ref text not null check (btrim(decision_ref) <> ''),
  recorded_at timestamptz not null default now()
);
alter table public.t3a_d1_evidence_review_authority_event enable row level security;
revoke all on public.t3a_d1_evidence_review_authority_event from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_d1_evidence_review_authority_event;
create trigger t3a_append_only before update or delete on public.t3a_d1_evidence_review_authority_event for each row execute function public.t3a_deny_mutation();

create or replace function public.t3a_d1_holds_review_authority(p_person uuid) returns boolean
language sql stable security definer set search_path = public as $fn$
  select coalesce((select action = 'grant' from public.t3a_d1_evidence_review_authority_event where person_id = p_person order by recorded_at desc, event_id desc limit 1), false);
$fn$;
revoke all on function public.t3a_d1_holds_review_authority(uuid) from public, anon, authenticated;
grant execute on function public.t3a_d1_holds_review_authority(uuid) to service_role;

create or replace function public.t3a_d1_review_authority_record(p_person uuid, p_action text, p_decision_ref text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('review_authority.record', 'service_route_only', coalesce(p_person::text, ''), 'the authority list is changed by the service route only'); end if;
  if p_action not in ('grant', 'revoke') or p_decision_ref is null or btrim(p_decision_ref) = '' or not exists (select 1 from public.profiles where id = p_person) then
    return public.t3a_capture_refuse('review_authority.record', 'authority_record_invalid', coalesce(p_person::text, ''), 'a person who exists, grant or revoke, and the decision it rests on');
  end if;
  insert into public.t3a_d1_evidence_review_authority_event(person_id, action, decision_ref) values (p_person, p_action, p_decision_ref);
  return jsonb_build_object('outcome', 'recorded', 'person_id', p_person, 'action', p_action);
end $fn$;
revoke all on function public.t3a_d1_review_authority_record(uuid, text, text) from public, anon, authenticated;
grant execute on function public.t3a_d1_review_authority_record(uuid, text, text) to service_role;

-- The authority check: the same gates in the same order; the last one passes for a person on the list and refuses for everyone else.
create or replace function public.t3a_d1_can_issue(p_ber_report_id uuid) returns public.t3a_d1_issuance_refusal_reason
language plpgsql stable security definer set search_path = public as $fn$
declare
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_report public.t3a_d1_ber_report%rowtype;
  v_floor public.t3a_d1_issuance_floor_config%rowtype;
  v_review public.t3a_d1_participant_review_action%rowtype;
  v_open_challenges int;
  v_committed int;
  v_distinct_observers int;
  v_distinct_stages int;
begin
  if v_env in ('design_only', 'observation_capable_inactive') then return 'ENV_CAPABILITY'; end if;

  select * into v_report from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if not found then raise exception using message = 'BER_REPORT_NOT_FOUND', errcode = '22023'; end if;

  select * into v_floor from public.t3a_d1_issuance_floor_config where singleton = 1;
  if v_floor.status = 'not_approved' then return 'ISSUANCE_FLOOR_NOT_APPROVED'; end if;

  select count(*), count(distinct o.observer_id), count(distinct o.stage_code)
    into v_committed, v_distinct_observers, v_distinct_stages
    from public.t3a_observation_record o
    join public.t3a_d1_composed_statement cs using (observation_record_id)
   where o.participant_id = v_report.participant_id and o.dimension_id = v_report.dimension_id and o.is_committed = true;

  if (v_floor.minimum_committed_observations is not null and v_committed < v_floor.minimum_committed_observations)
     or (v_floor.minimum_distinct_observers is not null and v_distinct_observers < v_floor.minimum_distinct_observers)
     or (v_floor.minimum_distinct_stages is not null and v_distinct_stages < v_floor.minimum_distinct_stages) then
    return 'ISSUANCE_FLOOR_NOT_MET';
  end if;

  select count(*) into v_open_challenges from public.t3a_correction_case c where c.participant_id = v_report.participant_id and c.terminal_outcome is null;
  if v_open_challenges > 0 then return 'CHALLENGE_OPEN'; end if;

  select * into v_review from public.t3a_d1_participant_review_action where ber_report_id = p_ber_report_id;
  if not found then return 'NON_RESPONSE_BLOCKS_ISSUANCE'; end if;

  -- FD-D1-04, interim (CR-220): a person on the recorded list may pass; production stays refused in the route below.
  if auth.uid() is not null and public.t3a_d1_holds_review_authority(auth.uid()) then return null; end if;
  return 'EVIDENCE_REVIEW_AUTHORITY_UNSET';
end $fn$;

-- The issue route: the same, and the pilot environment is allowed (the report is a test report in the pilot; every face of it carries the TEST tag).
create or replace function public.t3a_d1_issue_report(p_ber_report_id uuid, p_rendered_body text) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_env public.t3a_env_state := public.t3a_current_env_state();
  v_reason public.t3a_d1_issuance_refusal_reason;
  v_report public.t3a_d1_ber_report%rowtype;
  v_hash text;
  v_issuance_id uuid;
begin
  if auth.uid() is null then raise exception using message = 'AUTH_REQUIRED', errcode = '22023'; end if;
  if p_rendered_body is null or btrim(p_rendered_body) = '' then raise exception using message = 'RENDERED_BODY_REQUIRED', errcode = '22023'; end if;

  v_reason := public.t3a_d1_can_issue(p_ber_report_id);
  if v_reason is not null then
    -- the log's reason list does not carry every reason the check can give (the authority one is not in it, so the old route failed on the cast and said
    -- nothing about why): a reason the list has is logged; the refusal itself names the reason either way
    if exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 't3a_d1_report_refusal_reason' and e.enumlabel = v_reason::text) then
      insert into public.t3a_d1_report_refusal_log(participant_id, dimension_id, requested_template_id, reason, detail)
      select participant_id, dimension_id, null, v_reason::text::public.t3a_d1_report_refusal_reason, 'issuance refused'
        from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
    end if;
    raise exception using message = 'ISSUANCE_REFUSED: ' || v_reason, errcode = '22023';
  end if;

  if v_env not in ('synthetic_test_only', 'pilot_active') then
    raise exception using message = 'EVIDENCE_REVIEW_AUTHORITY_UNSET: only the synthetic and pilot environments issue; production is refused', errcode = '22023';
  end if;

  select * into v_report from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  v_hash := encode(extensions.digest(p_rendered_body, 'sha256'), 'hex');

  insert into public.t3a_d1_report_issuance (ber_report_id, participant_id, dimension_id, issued_by, version_set_at_issuance, rendered_body_hash)
  values (p_ber_report_id, v_report.participant_id, v_report.dimension_id, auth.uid(), v_report.version_set, v_hash)
  returning issuance_id into v_issuance_id;

  update public.t3a_d1_ber_report set status = 'issued', issued_at = now() where ber_report_id = p_ber_report_id and status = 'ready_to_issue';
  return v_issuance_id;
end $fn$;
