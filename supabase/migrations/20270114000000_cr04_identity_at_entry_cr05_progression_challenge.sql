-- CORR-007 Rev 1.6 rules CR-04 (identity at Stage entry) and CR-05 (progression challenge) (CR-194).
-- CR-04: identity at Stage entry rests on account authentication only. Visual confirmation against the account name is withdrawn and is not a dependency of entry.
--   Authorship and assistance statements are recorded as declarations. No identity vendor is used and no biometric is captured. A mentor's concrete concern about who
--   is present ends the session as an administration matter and goes to the integrity route; it is never recorded as conduct. An identity failure consumes no attempt:
--   a participant who could not authenticate meets the rescheduling wait, an identity service failure is a technical failure with no wait, and the participant is told
--   nothing about why entry refused. The join link is released only to the participant's own account.
-- CR-05: a challenge to a progression decision never pauses calendar time and never holds re-entry. A corrected decision replaces the original in the record as of the
--   original decision date; its effect on eligibility runs from the date of correction. A repeat attempt made while a challenge was open stays recorded and counted, and
--   the participant is told so before choosing to re-enter. Challenge state is held apart from attempt and cooldown state.
-- Nothing here activates a Stage or turns an enforcement switch on.

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-04. The join link belongs to the participant's account
-- ---------------------------------------------------------------------------------------------------------------------

-- The older read policy let any caller, signed in or not, read every meet link. It now opens to the participant of the session, the mentor assigned to it, and administrative standing.
drop policy if exists t3a_d1_live_session_read on public.t3a_d1_live_session;
create policy t3a_d1_live_session_read on public.t3a_d1_live_session for select using (
  public.t3a_is_service_context() or public.t3a_has_administrative_standing()
  or exists (select 1 from public.t3a_stage_entry_event e where e.stage_entry_event_id = t3a_d1_live_session.stage_entry_event_id and e.participant_id = auth.uid())
  or public.t3a_d1_is_assigned_mentor(t3a_d1_live_session.stage_entry_event_id));
revoke all on public.t3a_d1_live_session from anon;
revoke insert, update, delete, truncate on public.t3a_d1_live_session from authenticated;

-- The link is released only to the account the session belongs to, and only after the Stage entry exists and the link has been issued.
create or replace function public.t3a_cr04_join_link(p_stage_entry_event_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); e public.t3a_stage_entry_event; s public.t3a_d1_live_session;
begin
  select * into e from public.t3a_stage_entry_event where stage_entry_event_id = p_stage_entry_event_id;
  if v_actor is null or e.stage_entry_event_id is null or e.participant_id is distinct from v_actor then
    return jsonb_build_object('released', false);                      -- the same answer for every reason: no detail about why
  end if;
  select * into s from public.t3a_d1_live_session where stage_entry_event_id = p_stage_entry_event_id;
  if s.stage_entry_event_id is null or s.link_status = 'not_issued' or s.meet_link is null then return jsonb_build_object('released', false); end if;
  return jsonb_build_object('released', true, 'meet_link', s.meet_link, 'admit_from_waiting_room_only', true);
end $fn$;
revoke all on function public.t3a_cr04_join_link(uuid) from public, anon;
grant execute on function public.t3a_cr04_join_link(uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-04. The entry identity decision
-- ---------------------------------------------------------------------------------------------------------------------

-- Called by the entry service once the account has or has not authenticated. An active attempt is ended with the defined event; the participant's answer carries no detail.
create or replace function public.t3a_cr04_entry_identity(p_participant uuid, p_dimension text, p_stage public.t3a_stage_code, p_account_authenticated boolean, p_identity_service_failed boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_end jsonb; v_ending text;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('entry.identity', 'SERVICE_ONLY', coalesce(p_participant::text, ''), 'identity at entry is decided by the entry service'); end if;
  if coalesce(p_identity_service_failed, false) then v_ending := 'identity_failure_service';
  elsif p_account_authenticated is true then
    -- Account authentication is the whole of it: no vendor, no biometric, no visual confirmation is asked for or required.
    return jsonb_build_object('admitted', true, 'basis', 'account_authentication', 'visual_confirmation_required', false);
  else v_ending := 'identity_failure_participant'; end if;
  v_end := public.t3a_attempt_end(p_participant, p_dimension, p_stage, v_ending);
  perform public.t3a_capture_refuse('entry.identity', case v_ending when 'identity_failure_service' then 'IDENTITY_SERVICE_FAILED' else 'ACCOUNT_NOT_AUTHENTICATED' end, p_participant::text || ' ' || p_dimension || ' ' || p_stage::text, 'entry refused; ending ' || v_ending);
  -- What the participant is told: nothing about the reason. The detail is for the entry service's own log and is not shown.
  return jsonb_build_object('admitted', false, 'participant_message', 'We could not start your session. Please try again later.', 'attempt_consumed', false, 'service_detail', jsonb_build_object('ending', v_ending, 'result', v_end));
end $fn$;
revoke all on function public.t3a_cr04_entry_identity(uuid, text, public.t3a_stage_code, boolean, boolean) from public, anon, authenticated;
grant execute on function public.t3a_cr04_entry_identity(uuid, text, public.t3a_stage_code, boolean, boolean) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-04. Declarations of authorship and assistance
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_authorship_declaration (
  declaration_id    uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references public.profiles(id),
  stage_instance_id uuid,
  stage_code        text not null check (stage_code in ('S1', 'S2', 'S3', 'S4')),
  kind              text not null check (kind in ('authorship', 'assistance')),
  value_code        text not null check (value_code in ('own_work', 'not_own_work', 'no_assistance', 'tools_only', 'person_assisted', 'other_assistance')),
  provenance        text not null,
  declared_at       timestamptz not null default now(),
  check ((kind = 'authorship' and value_code in ('own_work', 'not_own_work')) or (kind = 'assistance' and value_code in ('no_assistance', 'tools_only', 'person_assisted', 'other_assistance')))
);
create index if not exists t3a_authorship_declaration_idx on public.t3a_authorship_declaration (participant_id, stage_code, declared_at desc);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_authorship_declaration;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_authorship_declaration for each row execute function public.t3a_deny_mutation();
alter table public.t3a_authorship_declaration enable row level security;
revoke all on public.t3a_authorship_declaration from anon, authenticated;
drop policy if exists t3a_authorship_declaration_own on public.t3a_authorship_declaration;
create policy t3a_authorship_declaration_own on public.t3a_authorship_declaration for select to authenticated using (participant_id = auth.uid());
grant select on public.t3a_authorship_declaration to authenticated;

-- A statement the participant makes about their own work; the account that made it is the provenance. Nothing is verified and nothing is captured but the declaration.
create or replace function public.t3a_authorship_declare(p_stage public.t3a_stage_code, p_kind text, p_value text, p_stage_instance uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then return public.t3a_capture_refuse('declaration.record', 'NO_PARTICIPANT_IDENTIFIED', '', 'no signed-in participant'); end if;
  if p_stage_instance is not null and not exists (select 1 from public.t3a_stage_instance where stage_instance_id = p_stage_instance and participant_id = v_actor) then
    return public.t3a_capture_refuse('declaration.record', 'NOT_THE_PARTICIPANTS_SESSION', v_actor::text, 'a declaration is about the participant''s own session');
  end if;
  begin
    insert into public.t3a_authorship_declaration (participant_id, stage_instance_id, stage_code, kind, value_code, provenance) values (v_actor, p_stage_instance, p_stage::text, p_kind, p_value, 'account:' || v_actor::text);
  exception when check_violation then
    return public.t3a_capture_refuse('declaration.record', 'DECLARATION_NOT_IN_CONTROLLED_SET', v_actor::text, coalesce(p_kind, '') || ' ' || coalesce(p_value, ''));
  end;
  return jsonb_build_object('outcome', 'declared', 'kind', p_kind, 'value', p_value);
end $fn$;
revoke all on function public.t3a_authorship_declare(public.t3a_stage_code, text, text, uuid) from public, anon;
grant execute on function public.t3a_authorship_declare(public.t3a_stage_code, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-04. A mentor's concern about who is present
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_integrity_concern (
  integrity_concern_id uuid primary key default gen_random_uuid(),
  stage_entry_event_id uuid not null references public.t3a_stage_entry_event(stage_entry_event_id),
  participant_id       uuid not null,
  raised_by            uuid not null,
  basis_code           text not null check (basis_code in ('different_person_present', 'account_shared', 'other_identity_concern')),
  raised_at            timestamptz not null default now()
);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_integrity_concern;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_integrity_concern for each row execute function public.t3a_deny_mutation();
alter table public.t3a_integrity_concern enable row level security;
revoke all on public.t3a_integrity_concern from anon, authenticated;   -- the participant is not shown it; staff read it through the integrity route

-- The session ends as an administration matter; the concern is held on the integrity route and writes nothing to the conduct record.
create or replace function public.t3a_identity_concern_raise(p_stage_entry_event_id uuid, p_basis text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); e public.t3a_stage_entry_event; m public.t3a_attempt_ending_map%rowtype; v_att uuid; v_id uuid;
begin
  select * into e from public.t3a_stage_entry_event where stage_entry_event_id = p_stage_entry_event_id;
  if e.stage_entry_event_id is null then return public.t3a_capture_refuse('integrity.concern', 'STAGE_ENTRY_NOT_FOUND', coalesce(p_stage_entry_event_id::text, ''), 'no such session'); end if;
  if v_actor is null or not public.t3a_d1_is_assigned_mentor(p_stage_entry_event_id) then
    return public.t3a_capture_refuse('integrity.concern', 'ONLY_THE_ASSIGNED_MENTOR_RAISES_A_CONCERN', coalesce(v_actor::text, ''), 'the mentor of this session raises an identity concern');
  end if;
  if e.stage_code::text not in ('S2', 'S4') then return public.t3a_capture_refuse('integrity.concern', 'MENTOR_CONCERN_IS_A_LIVE_STAGE_ROUTE', v_actor::text, 'a mentor is present at Stages 2 and 4 only'); end if;
  if p_basis not in ('different_person_present', 'account_shared', 'other_identity_concern') then
    return public.t3a_capture_refuse('integrity.concern', 'BASIS_NOT_IN_CONTROLLED_SET', v_actor::text, coalesce(p_basis, 'none'));
  end if;
  insert into public.t3a_integrity_concern (stage_entry_event_id, participant_id, raised_by, basis_code) values (p_stage_entry_event_id, e.participant_id, v_actor, p_basis) returning integrity_concern_id into v_id;
  -- ended as an administration matter: counts nothing, no wait, no finding
  select * into m from public.t3a_attempt_ending_map where ending = 'administration_failure';
  select attempt_id into v_att from public.t3a_attempt_live where participant_id = e.participant_id and dimension_id = e.dimension_id and stage_code = e.stage_code and outcome = 'initiated' order by created_at desc limit 1;
  if v_att is not null then
    update public.t3a_attempt set outcome = m.outcome, attempt_event_class = m.attempt_event_class, counted = false, ended_at = now() where attempt_id = v_att;
  end if;
  return jsonb_build_object('outcome', 'session_ended', 'ended_as', 'administration_matter', 'integrity_concern_id', v_id, 'recorded_as_conduct', false);
end $fn$;
revoke all on function public.t3a_identity_concern_raise(uuid, text) from public, anon;
grant execute on function public.t3a_identity_concern_raise(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-05. The progression challenge
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_progression_challenge_event (
  challenge_event_seq bigint generated always as identity primary key,
  challenge_id        uuid not null,
  decision_id         uuid not null,
  participant_id      uuid not null,
  dimension_id        text not null,
  event               text not null check (event in ('opened', 'notice_shown', 'upheld', 'corrected', 'withdrawn')),
  detail              text,
  recorded_at         timestamptz not null default now()
);
create index if not exists t3a_progression_challenge_event_idx on public.t3a_progression_challenge_event (participant_id, dimension_id, challenge_event_seq desc);
create index if not exists t3a_progression_challenge_event_cid_idx on public.t3a_progression_challenge_event (challenge_id, challenge_event_seq desc);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_progression_challenge_event;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_progression_challenge_event for each row execute function public.t3a_deny_mutation();
alter table public.t3a_progression_challenge_event enable row level security;
revoke all on public.t3a_progression_challenge_event from anon, authenticated;
drop policy if exists t3a_progression_challenge_event_own on public.t3a_progression_challenge_event;
create policy t3a_progression_challenge_event_own on public.t3a_progression_challenge_event for select to authenticated using (participant_id = auth.uid());
grant select on public.t3a_progression_challenge_event to authenticated;

-- The challenge that is open for a participant and dimension now: opened, and not yet upheld, corrected or withdrawn.
create or replace function public.t3a_progression_challenge_open_id(p_participant uuid, p_dimension text) returns uuid language sql stable security definer set search_path = public as $fn$
  select o.challenge_id from public.t3a_progression_challenge_event o
   where o.participant_id = p_participant and o.dimension_id = p_dimension and o.event = 'opened'
     and not exists (select 1 from public.t3a_progression_challenge_event r where r.challenge_id = o.challenge_id and r.event in ('upheld', 'corrected', 'withdrawn'))
   order by o.challenge_event_seq desc limit 1
$fn$;
revoke all on function public.t3a_progression_challenge_open_id(uuid, text) from public, anon, authenticated;
grant execute on function public.t3a_progression_challenge_open_id(uuid, text) to service_role;

create or replace function public.t3a_progression_challenge_open(p_decision uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); d public.t3a_d1_progression_decision; v_id uuid := gen_random_uuid();
begin
  if v_actor is null then return public.t3a_capture_refuse('challenge.progression_open', 'NO_PARTICIPANT_IDENTIFIED', '', 'no signed-in participant'); end if;
  select * into d from public.t3a_d1_progression_decision where progression_decision_id = p_decision;
  if d.progression_decision_id is null or d.participant_id <> v_actor then
    return public.t3a_capture_refuse('challenge.progression_open', 'NOT_THE_PARTICIPANTS_DECISION', v_actor::text, 'a participant challenges a decision about themselves');
  end if;
  if public.t3a_progression_challenge_open_id(v_actor, d.dimension_id) is not null then
    return public.t3a_capture_refuse('challenge.progression_open', 'CHALLENGE_ALREADY_OPEN', v_actor::text, 'a challenge is already open on this dimension');
  end if;
  insert into public.t3a_progression_challenge_event (challenge_id, decision_id, participant_id, dimension_id, event) values (v_id, p_decision, v_actor, d.dimension_id, 'opened');
  -- Challenge state is its own record: no attempt, no wait and no hold is written here.
  return jsonb_build_object('outcome', 'opened', 'challenge_id', v_id, 'pauses_time', false, 'holds_reentry', false);
end $fn$;
revoke all on function public.t3a_progression_challenge_open(uuid) from public, anon;
grant execute on function public.t3a_progression_challenge_open(uuid) to authenticated;

-- What the participant is told before choosing to re-enter while a challenge is open. Showing it is recorded.
create or replace function public.t3a_progression_challenge_notice(p_dimension text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); v_ch uuid; v_dec uuid;
begin
  if v_actor is null then return jsonb_build_object('open', false); end if;
  v_ch := public.t3a_progression_challenge_open_id(v_actor, p_dimension);
  if v_ch is null then return jsonb_build_object('open', false); end if;
  select decision_id into v_dec from public.t3a_progression_challenge_event where challenge_id = v_ch and event = 'opened';
  if not exists (select 1 from public.t3a_progression_challenge_event where challenge_id = v_ch and event = 'notice_shown') then
    insert into public.t3a_progression_challenge_event (challenge_id, decision_id, participant_id, dimension_id, event) values (v_ch, v_dec, v_actor, p_dimension, 'notice_shown');
  end if;
  return jsonb_build_object('open', true, 'notice', 'Your challenge does not pause time or hold your re-entry. A repeat attempt made while it is open is recorded and counted, whatever the outcome of the challenge.');
end $fn$;
revoke all on function public.t3a_progression_challenge_notice(text) from public, anon;
grant execute on function public.t3a_progression_challenge_notice(text) to authenticated;

-- Re-entry is never held by a challenge, but it is not made blind: the notice must have been shown for the open challenge before an attempt starts.
do $do$ begin
  if to_regprocedure('public.t3a_attempt_begin_base(uuid,text,public.t3a_stage_code,text,timestamptz)') is null then
    alter function public.t3a_attempt_begin(uuid, text, public.t3a_stage_code, text, timestamptz) rename to t3a_attempt_begin_base;
  end if;
end $do$;
create or replace function public.t3a_attempt_begin(p_participant uuid, p_dimension text, p_stage public.t3a_stage_code, p_key text, p_at timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_ch uuid;
begin
  if public.t3a_is_service_context() and p_key is not null and p_key <> '' and not exists (select 1 from public.t3a_attempt_request where idempotency_key = p_key) then
    v_ch := public.t3a_progression_challenge_open_id(p_participant, p_dimension);
    if v_ch is not null and not exists (select 1 from public.t3a_progression_challenge_event where challenge_id = v_ch and event = 'notice_shown') then
      return public.t3a_capture_refuse('attempt.begin', 'PROGRESSION_CHALLENGE_NOTICE_REQUIRED', p_participant::text, 'show the open-challenge notice before the participant chooses to re-enter')
             || jsonb_build_object('notice_required', true);
    end if;
  end if;
  return public.t3a_attempt_begin_base(p_participant, p_dimension, p_stage, p_key, p_at);
end $fn$;

-- The outcome of a challenge is recorded by the governed route (the reconsideration of CR-13 reaches it); a correction adds a decision row and erases nothing.
create or replace function public.t3a_progression_challenge_resolve(p_challenge uuid, p_outcome text, p_corrected public.t3a_progression_value default null, p_recorded_by uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare o public.t3a_progression_challenge_event; d public.t3a_d1_progression_decision; v_new uuid;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('challenge.progression_resolve', 'SERVICE_ONLY', coalesce(p_challenge::text, ''), 'a challenge is resolved by the governed route'); end if;
  select * into o from public.t3a_progression_challenge_event where challenge_id = p_challenge and event = 'opened';
  if o.challenge_id is null then return public.t3a_capture_refuse('challenge.progression_resolve', 'CHALLENGE_NOT_FOUND', coalesce(p_challenge::text, ''), 'no such challenge'); end if;
  if exists (select 1 from public.t3a_progression_challenge_event where challenge_id = p_challenge and event in ('upheld', 'corrected', 'withdrawn')) then
    return public.t3a_capture_refuse('challenge.progression_resolve', 'CHALLENGE_ALREADY_RESOLVED', p_challenge::text, 'already resolved');
  end if;
  if p_outcome not in ('upheld', 'corrected', 'withdrawn') then return public.t3a_capture_refuse('challenge.progression_resolve', 'OUTCOME_NOT_IN_CONTROLLED_SET', p_challenge::text, coalesce(p_outcome, 'none')); end if;
  if p_outcome = 'corrected' then
    if p_corrected is null or p_recorded_by is null then return public.t3a_capture_refuse('challenge.progression_resolve', 'CORRECTION_INCOMPLETE', p_challenge::text, 'a corrected decision and the person recording it are required'); end if;
    select * into d from public.t3a_d1_progression_decision where progression_decision_id = o.decision_id;
    insert into public.t3a_d1_progression_decision (participant_id, dimension_id, decision, recorded_by, corrected_decision_ref, original_decision_date, correction_effective_date, decided_at, decided_by)
      values (d.participant_id, d.dimension_id, p_corrected, p_recorded_by, d.progression_decision_id, coalesce(d.decided_at, d.created_at), now(), now(), p_recorded_by) returning progression_decision_id into v_new;
  end if;
  insert into public.t3a_progression_challenge_event (challenge_id, decision_id, participant_id, dimension_id, event, detail) values (p_challenge, o.decision_id, o.participant_id, o.dimension_id, p_outcome, v_new::text);
  return jsonb_build_object('outcome', p_outcome, 'corrected_decision_id', v_new);
end $fn$;
revoke all on function public.t3a_progression_challenge_resolve(uuid, text, public.t3a_progression_value, uuid) from public, anon, authenticated;
grant execute on function public.t3a_progression_challenge_resolve(uuid, text, public.t3a_progression_value, uuid) to service_role;

-- The decision on the record as of a date: a correction stands in for its original from the original decision date.
create or replace function public.t3a_progression_record_value(p_participant uuid, p_dimension text, p_as_of timestamptz default now()) returns text
language sql stable security definer set search_path = public as $fn$
  select x.decision::text from public.t3a_d1_progression_decision x
   where x.participant_id = p_participant and x.dimension_id = p_dimension and x.cleared_at is null
     and coalesce(x.original_decision_date, x.decided_at, x.created_at) <= p_as_of
     and not exists (select 1 from public.t3a_d1_progression_decision c where c.corrected_decision_ref = x.progression_decision_id and c.cleared_at is null)
   order by coalesce(x.original_decision_date, x.decided_at, x.created_at) desc, x.created_at desc limit 1
$fn$;
revoke all on function public.t3a_progression_record_value(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.t3a_progression_record_value(uuid, text, timestamptz) to service_role;

-- The decision that governs eligibility at a moment: the original until the correction is made, the correction from its own date.
create or replace function public.t3a_progression_eligibility_value(p_participant uuid, p_dimension text, p_at timestamptz default now()) returns text
language sql stable security definer set search_path = public as $fn$
  select x.decision::text from public.t3a_d1_progression_decision x
   where x.participant_id = p_participant and x.dimension_id = p_dimension and x.cleared_at is null
     and coalesce(x.correction_effective_date, x.decided_at, x.created_at) <= p_at
     and not exists (select 1 from public.t3a_d1_progression_decision c where c.corrected_decision_ref = x.progression_decision_id and c.cleared_at is null and c.correction_effective_date <= p_at)
   order by coalesce(x.correction_effective_date, x.decided_at, x.created_at) desc, x.created_at desc limit 1
$fn$;
revoke all on function public.t3a_progression_eligibility_value(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.t3a_progression_eligibility_value(uuid, text, timestamptz) to service_role;

-- The two routes wrapped by CR-03 and CR-05 (renamed, then recreated) must keep the base functions' service-only grants. A recreated function starts with the
-- default execute right for everyone; the CR-03 wrapper of t3a_attempt_eligibility shipped that way and let any caller read another participant's attempt window.
revoke all on function public.t3a_attempt_begin(uuid, text, public.t3a_stage_code, text, timestamptz) from public, anon, authenticated;
grant execute on function public.t3a_attempt_begin(uuid, text, public.t3a_stage_code, text, timestamptz) to service_role;
revoke all on function public.t3a_attempt_eligibility(uuid, text, public.t3a_stage_code, timestamptz) from public, anon, authenticated;
grant execute on function public.t3a_attempt_eligibility(uuid, text, public.t3a_stage_code, timestamptz) to service_role;
