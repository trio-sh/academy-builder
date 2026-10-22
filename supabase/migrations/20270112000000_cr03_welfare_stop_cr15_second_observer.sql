-- CORR-007 Rev 1.6 rules CR-03 (welfare stop) and CR-15 (a second independent observer in the pilot) (CR-192).
-- CR-03: a welfare stop is the existing event "Withdrawal after observation begins, before commit" carrying a welfare flag. It consumes no attempt, creates no
--   adverse finding and starts no wait. A stop before observation begins is "Session cancelled before observation begins"; a stop for someone else's welfare is an
--   administration interruption for the observed participant. No new event class. Any limit on return is an individual eligibility hold set and lifted through the
--   safety route; it is not a Pause, not a cooldown, and creates no commit and no progression decision. The cooldown stays a row in the attempt rule table.
-- CR-15: with the participant's consent a pilot session may carry a second independent observer who captures the same event independently. Neither capture is
--   visible to the other observer until both are locked. The second observer is involved for the involvement test.
-- Nothing here activates a Stage or turns an enforcement switch on.

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-03. The welfare flag and the endings
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.t3a_attempt add column if not exists welfare_flag boolean not null default false;
alter table public.t3a_attempt add column if not exists welfare_subject text check (welfare_subject is null or welfare_subject in ('self', 'other_person'));
alter table public.t3a_attempt_ending_map add column if not exists welfare_flag boolean not null default false;
alter table public.t3a_attempt_ending_map add column if not exists welfare_subject text check (welfare_subject is null or welfare_subject in ('self', 'other_person'));

update public.t3a_attempt_ending_map set welfare_flag = true, welfare_subject = 'self' where ending = 'welfare_stop';
insert into public.t3a_attempt_ending_map (ending, outcome, attempt_event_class, counted, wait_kind, welfare_flag, welfare_subject) values
  ('welfare_stop_participant', 'participant_withdrew', 'welfare_stop', false, 'none', true, 'self'),
  ('welfare_stop_mentor', 'participant_withdrew', 'welfare_stop', false, 'none', true, 'self'),
  ('welfare_stop_before_observation', 'abandoned', 'cancelled_before_start', false, 'none', true, 'self'),
  ('welfare_stop_co_participant', 'system_failure', 'administration_failure', false, 'none', true, 'other_person')
on conflict (ending) do nothing;

-- The flag follows the event class wherever the attempt row was written (including the older stop route, which inserts the row directly).
create or replace function public.t3a_attempt_welfare_flag() returns trigger language plpgsql as $fn$
begin
  if new.attempt_event_class = 'welfare_stop' then
    new.welfare_flag := true; new.counted := false; new.cooldown_class := 'none';
    new.welfare_subject := coalesce(new.welfare_subject, 'self');
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_5_attempt_welfare_flag_trg on public.t3a_attempt;
create trigger t3a_5_attempt_welfare_flag_trg before insert or update on public.t3a_attempt for each row execute function public.t3a_attempt_welfare_flag();

-- The older stop route writes the attempt without an event class; the welfare withdrawal record that follows names it.
create or replace function public.t3a_attempt_class_from_welfare_withdrawal() returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  update public.t3a_attempt set attempt_event_class = 'welfare_stop' where attempt_id = new.attempt_id and attempt_event_class is null;
  return new;
end $fn$;
drop trigger if exists t3a_9_attempt_class_from_welfare_trg on public.t3a_d1_welfare_withdrawal;
create trigger t3a_9_attempt_class_from_welfare_trg after insert on public.t3a_d1_welfare_withdrawal for each row execute function public.t3a_attempt_class_from_welfare_withdrawal();

-- The ending route copies the flag from the map.
create or replace function public.t3a_attempt_end(p_participant uuid, p_dimension text, p_stage public.t3a_stage_code, p_ending text, p_callback_id text default null, p_at timestamptz default now())
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_prev uuid; v_att public.t3a_attempt; m public.t3a_attempt_ending_map%rowtype;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_ATTEMPT_SERVICE_ONLY: attempts end through the service route only' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_participant::text || p_dimension || p_stage::text, 0));
  if p_callback_id is not null then
    select attempt_id into v_prev from public.t3a_attempt_callback where callback_id = p_callback_id;
    if v_prev is not null then return jsonb_build_object('outcome', 'already_recorded', 'attempt_id', v_prev); end if;
  end if;
  select * into v_att from public.t3a_attempt_live where participant_id = p_participant and dimension_id = p_dimension and stage_code = p_stage and outcome = 'initiated' order by created_at desc limit 1;
  if v_att.attempt_id is null then
    return public.t3a_capture_refuse('attempt.end', 'NO_ACTIVE_ATTEMPT', p_participant::text, 'an ending or callback with no active attempt creates no attempt and no count');
  end if;
  select * into m from public.t3a_attempt_ending_map where ending = p_ending;
  if not found then
    update public.t3a_attempt set outcome = 'system_failure', counted = false, ended_at = p_at where attempt_id = v_att.attempt_id;
    insert into public.t3a_attempt_unclassified (attempt_id, ending_name) values (v_att.attempt_id, coalesce(p_ending, ''));
    if p_callback_id is not null then insert into public.t3a_attempt_callback (callback_id, attempt_id) values (p_callback_id, v_att.attempt_id); end if;
    perform public.t3a_capture_refuse('attempt.end', 'ENDING_UNCLASSIFIED', coalesce(p_ending, ''), 'unclassified ending ' || coalesce(p_ending, '') || ': counts nothing and blocks a new attempt until classified');
    return jsonb_build_object('outcome', 'unclassified', 'attempt_id', v_att.attempt_id, 'counted', false, 'ending', p_ending);
  end if;
  update public.t3a_attempt set outcome = m.outcome, attempt_event_class = m.attempt_event_class, counted = m.counted, ended_at = p_at,
         welfare_flag = m.welfare_flag, welfare_subject = m.welfare_subject where attempt_id = v_att.attempt_id;
  if p_callback_id is not null then insert into public.t3a_attempt_callback (callback_id, attempt_id) values (p_callback_id, v_att.attempt_id); end if;
  return jsonb_build_object('outcome', 'ended', 'attempt_id', v_att.attempt_id, 'counted', m.counted, 'attempt_no', v_att.attempt_no, 'welfare_flag', m.welfare_flag);
end $fn$;

-- The name the participant and the staff see for an ending.
create or replace function public.t3a_attempt_event_label(p_class text, p_welfare boolean) returns text language sql immutable as $fn$
  select case
    when p_class = 'welfare_stop' then 'Withdrawal after observation begins, before commit'
    when p_class = 'cancelled_before_start' then 'Session cancelled before observation begins'
    when p_class = 'administration_failure' and p_welfare then 'Administration interruption'
    when p_class = 'withdrawal_after_start_before_commit' then 'Withdrawal after observation begins, before commit'
    else p_class end
$fn$;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-03. The eligibility hold: set and lifted through the safety route, individual, no narrative
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_eligibility_hold_event (
  hold_seq        bigint generated always as identity primary key,
  participant_id  uuid not null references public.profiles(id),
  event           text not null check (event in ('set', 'lift')),
  safety_event_id uuid references public.t3a_safety_event(safety_event_id),
  acted_by        uuid not null,
  recorded_at     timestamptz not null default now()
);
create index if not exists t3a_eligibility_hold_event_idx on public.t3a_eligibility_hold_event (participant_id, hold_seq desc);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_eligibility_hold_event;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_eligibility_hold_event for each row execute function public.t3a_deny_mutation();
alter table public.t3a_eligibility_hold_event enable row level security;
revoke all on public.t3a_eligibility_hold_event from anon, authenticated;

create or replace function public.t3a_eligibility_hold_active(p_participant uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select event = 'set' from public.t3a_eligibility_hold_event where participant_id = p_participant order by hold_seq desc limit 1), false)
$fn$;
revoke all on function public.t3a_eligibility_hold_active(uuid) from public, anon, authenticated;
grant execute on function public.t3a_eligibility_hold_active(uuid) to service_role;

create or replace function public.t3a_safety_hold_set(p_participant uuid, p_safety_event uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.t3a_is_safety_contact() then return public.t3a_capture_refuse('safety.hold_set', 'SAFETY_CONTACT_ONLY', coalesce(p_participant::text, ''), 'an eligibility hold is set through the safety route'); end if;
  if public.t3a_eligibility_hold_active(p_participant) then return public.t3a_capture_refuse('safety.hold_set', 'HOLD_ALREADY_SET', p_participant::text, 'an eligibility hold is already in force'); end if;
  if p_safety_event is not null and not exists (select 1 from public.t3a_safety_event where safety_event_id = p_safety_event) then
    return public.t3a_capture_refuse('safety.hold_set', 'SAFETY_EVENT_NOT_FOUND', p_participant::text, 'the safety event named does not exist');
  end if;
  insert into public.t3a_eligibility_hold_event (participant_id, event, safety_event_id, acted_by) values (p_participant, 'set', p_safety_event, auth.uid());
  return jsonb_build_object('outcome', 'hold_set', 'pause', false, 'cooldown', false);
end $fn$;
revoke all on function public.t3a_safety_hold_set(uuid, uuid) from public, anon;
grant execute on function public.t3a_safety_hold_set(uuid, uuid) to authenticated;

create or replace function public.t3a_safety_hold_lift(p_participant uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.t3a_is_safety_contact() then return public.t3a_capture_refuse('safety.hold_lift', 'SAFETY_CONTACT_ONLY', coalesce(p_participant::text, ''), 'an eligibility hold is lifted through the safety route'); end if;
  if not public.t3a_eligibility_hold_active(p_participant) then return public.t3a_capture_refuse('safety.hold_lift', 'NO_HOLD_IN_FORCE', p_participant::text, 'no eligibility hold is in force'); end if;
  insert into public.t3a_eligibility_hold_event (participant_id, event, acted_by) values (p_participant, 'lift', auth.uid());
  return jsonb_build_object('outcome', 'hold_lifted', 'commit_created', false, 'progression_created', false, 'cooldown_created', false);
end $fn$;
revoke all on function public.t3a_safety_hold_lift(uuid) from public, anon;
grant execute on function public.t3a_safety_hold_lift(uuid) to authenticated;

-- A hold stops a new attempt; it is a different refusal from a cooldown and sets no wait.
do $do$ begin
  if to_regprocedure('public.t3a_attempt_eligibility_base(uuid,text,public.t3a_stage_code,timestamptz)') is null then
    alter function public.t3a_attempt_eligibility(uuid, text, public.t3a_stage_code, timestamptz) rename to t3a_attempt_eligibility_base;
  end if;
end $do$;
create or replace function public.t3a_attempt_eligibility(p_participant uuid, p_dimension text, p_stage public.t3a_stage_code, p_at timestamptz default now()) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
begin
  if public.t3a_eligibility_hold_active(p_participant) then
    return jsonb_build_object('permitted', false, 'refusal_code', 'ELIGIBILITY_HOLD');
  end if;
  return public.t3a_attempt_eligibility_base(p_participant, p_dimension, p_stage, p_at);
end $fn$;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-15. A second independent observer in the pilot
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_second_observer_consent_event (
  consent_seq       bigint generated always as identity primary key,
  stage_instance_id uuid not null,
  participant_id    uuid not null,
  event             text not null check (event in ('granted', 'withdrawn')),
  recorded_at       timestamptz not null default now()
);
create index if not exists t3a_second_observer_consent_idx on public.t3a_second_observer_consent_event (stage_instance_id, consent_seq desc);

create table if not exists public.t3a_session_observer (
  session_observer_id uuid primary key default gen_random_uuid(),
  stage_instance_id   uuid not null,
  observer_id         uuid not null,
  role                text not null check (role in ('first', 'second')),
  added_at            timestamptz not null default now(),
  unique (stage_instance_id, role)
);

create table if not exists public.t3a_observer_capture (
  capture_id        uuid primary key default gen_random_uuid(),
  stage_instance_id uuid not null,
  observer_id       uuid not null,
  payload           jsonb not null default '{}'::jsonb,
  saved_at          timestamptz not null default now(),
  locked_at         timestamptz,
  unique (stage_instance_id, observer_id)
);

-- A locked capture never changes; an unlocked one changes only its payload.
create or replace function public.t3a_observer_capture_guard() returns trigger language plpgsql as $fn$
begin
  if tg_op = 'DELETE' then raise exception 'T3A_APPEND_ONLY: a capture is never deleted'; end if;
  if old.locked_at is not null then raise exception 'T3A_CAPTURE_LOCKED: a locked capture never changes'; end if;
  if new.stage_instance_id is distinct from old.stage_instance_id or new.observer_id is distinct from old.observer_id then
    raise exception 'T3A_IMMUTABLE_COLUMN: the session and the observer of a capture cannot change';
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_observer_capture_guard_trg on public.t3a_observer_capture;
create trigger t3a_observer_capture_guard_trg before update or delete on public.t3a_observer_capture for each row execute function public.t3a_observer_capture_guard();
drop trigger if exists t3a_deny_mutation_trg on public.t3a_second_observer_consent_event;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_second_observer_consent_event for each row execute function public.t3a_deny_mutation();
drop trigger if exists t3a_deny_mutation_trg on public.t3a_session_observer;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_session_observer for each row execute function public.t3a_deny_mutation();

do $do$ declare t text; begin
  foreach t in array array['t3a_second_observer_consent_event', 't3a_session_observer', 't3a_observer_capture'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $do$;

-- Neither observer reads the other's capture until both are locked.
create or replace function public.t3a_cr15_both_locked(p_stage_instance uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select (select count(*) from public.t3a_session_observer where stage_instance_id = p_stage_instance) = 2
     and (select count(*) from public.t3a_observer_capture c where c.stage_instance_id = p_stage_instance and c.locked_at is not null
            and c.observer_id in (select observer_id from public.t3a_session_observer where stage_instance_id = p_stage_instance)) = 2
$fn$;
-- the row policy below calls it as the reading observer, so authenticated may execute it; it returns a boolean about the session only
revoke all on function public.t3a_cr15_both_locked(uuid) from public, anon;
grant execute on function public.t3a_cr15_both_locked(uuid) to authenticated;

create or replace function public.t3a_cr15_is_observer(p_stage_instance uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.t3a_session_observer s where s.stage_instance_id = p_stage_instance and s.observer_id = auth.uid())
$fn$;
revoke all on function public.t3a_cr15_is_observer(uuid) from public, anon;
grant execute on function public.t3a_cr15_is_observer(uuid) to authenticated;

drop policy if exists t3a_observer_capture_read on public.t3a_observer_capture;
create policy t3a_observer_capture_read on public.t3a_observer_capture for select to authenticated using (
  observer_id = auth.uid() or (public.t3a_cr15_both_locked(stage_instance_id) and public.t3a_cr15_is_observer(stage_instance_id)));
grant select on public.t3a_observer_capture to authenticated;

-- The participant grants or withdraws consent for a second observer on one session.
create or replace function public.t3a_second_observer_consent_set(p_stage_instance uuid, p_granted boolean) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then return public.t3a_capture_refuse('observer2.consent', 'NO_PARTICIPANT_IDENTIFIED', '', 'no signed-in participant'); end if;
  if not exists (select 1 from public.t3a_stage_instance where stage_instance_id = p_stage_instance and participant_id = v_actor) then
    return public.t3a_capture_refuse('observer2.consent', 'NOT_THE_PARTICIPANTS_SESSION', v_actor::text, 'only the participant consents for their own session');
  end if;
  if p_granted is null then return public.t3a_capture_refuse('observer2.consent', 'CONSENT_STATE_REQUIRED', v_actor::text, 'granted or withdrawn must be stated'); end if;
  insert into public.t3a_second_observer_consent_event (stage_instance_id, participant_id, event) values (p_stage_instance, v_actor, case when p_granted then 'granted' else 'withdrawn' end);
  return jsonb_build_object('outcome', case when p_granted then 'granted' else 'withdrawn' end);
end $fn$;
revoke all on function public.t3a_second_observer_consent_set(uuid, boolean) from public, anon;
grant execute on function public.t3a_second_observer_consent_set(uuid, boolean) to authenticated;

-- The planner adds the second observer to a pilot session. It needs a pilot session, the participant's current consent, and an observer independent of the first and
-- of the participant. The second observer is involved for the involvement test from this moment.
create or replace function public.t3a_second_observer_add(p_stage_instance uuid, p_first uuid, p_second uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare si public.t3a_stage_instance; v_ev text; v_may jsonb;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('observer2.add', 'SERVICE_ONLY', coalesce(p_stage_instance::text, ''), 'only the planner adds an observer'); end if;
  select * into si from public.t3a_stage_instance where stage_instance_id = p_stage_instance;
  if si.stage_instance_id is null then return public.t3a_capture_refuse('observer2.add', 'STAGE_INSTANCE_NOT_FOUND', coalesce(p_stage_instance::text, ''), 'no such session'); end if;
  if not exists (select 1 from public.t3a_d1_pilot_enrollment e join public.t3a_d1_pilot_cohort c on c.id = e.cohort_id
                  where e.participant_id = si.participant_id and e.state::text = 'active' and c.state::text = 'open') then
    return public.t3a_capture_refuse('observer2.add', 'SECOND_OBSERVER_PILOT_ONLY', si.participant_id::text, 'a second observer is added only to a session of a pilot participant');
  end if;
  select event into v_ev from public.t3a_second_observer_consent_event where stage_instance_id = p_stage_instance order by consent_seq desc limit 1;
  if v_ev is distinct from 'granted' then
    return public.t3a_capture_refuse('observer2.add', 'SECOND_OBSERVER_CONSENT_REQUIRED', si.participant_id::text, 'the participant has not consented to a second observer on this session');
  end if;
  if public.t3a_cr13_same_person(p_first, p_second) or public.t3a_cr13_same_person(p_second, si.participant_id) or public.t3a_cr13_same_person(p_first, si.participant_id) then
    return public.t3a_capture_refuse('observer2.add', 'SECOND_OBSERVER_NOT_INDEPENDENT', p_second::text, 'the two observers are different people and neither is the participant');
  end if;
  v_may := public.t3a_mentor_may_observe(p_second, si.dimension_id::text, si.participant_id);
  if (v_may ->> 'authorized')::boolean is not true or (v_may ->> 'conflict_open')::boolean is true then
    return public.t3a_capture_refuse('observer2.add', 'SECOND_OBSERVER_NOT_AUTHORIZED', p_second::text, 'the second observer must be authorized for the dimension with no open conflict');
  end if;
  if exists (select 1 from public.t3a_session_observer where stage_instance_id = p_stage_instance and role = 'second') then
    return public.t3a_capture_refuse('observer2.add', 'SECOND_OBSERVER_ALREADY_ADDED', p_stage_instance::text, 'this session already has a second observer');
  end if;
  insert into public.t3a_session_observer (stage_instance_id, observer_id, role) values (p_stage_instance, p_first, 'first') on conflict (stage_instance_id, role) do nothing;
  insert into public.t3a_session_observer (stage_instance_id, observer_id, role) values (p_stage_instance, p_second, 'second');
  insert into public.t3a_d1_involvement (actor_id, participant_id, dimension_id, involving_action, contributing_record_kind, contributing_record_id)
    values (p_second, si.participant_id, si.dimension_id::text, 'observed', 'second_observer_capture', p_stage_instance);
  return jsonb_build_object('outcome', 'added', 'stage_instance_id', p_stage_instance);
end $fn$;
revoke all on function public.t3a_second_observer_add(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.t3a_second_observer_add(uuid, uuid, uuid) to service_role;

create or replace function public.t3a_observer_capture_save(p_stage_instance uuid, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); v_lock timestamptz;
begin
  if v_actor is null then return public.t3a_capture_refuse('observer2.capture', 'NO_OBSERVER_IDENTIFIED', '', 'no signed-in observer'); end if;
  if not exists (select 1 from public.t3a_session_observer where stage_instance_id = p_stage_instance and observer_id = v_actor) then
    return public.t3a_capture_refuse('observer2.capture', 'NOT_AN_OBSERVER_OF_THIS_SESSION', v_actor::text, 'only an observer of the session captures');
  end if;
  select locked_at into v_lock from public.t3a_observer_capture where stage_instance_id = p_stage_instance and observer_id = v_actor;
  if v_lock is not null then return public.t3a_capture_refuse('observer2.capture', 'CAPTURE_LOCKED', v_actor::text, 'a locked capture does not change'); end if;
  insert into public.t3a_observer_capture (stage_instance_id, observer_id, payload) values (p_stage_instance, v_actor, coalesce(p_payload, '{}'::jsonb))
    on conflict (stage_instance_id, observer_id) do update set payload = excluded.payload, saved_at = now();
  return jsonb_build_object('outcome', 'saved');
end $fn$;
revoke all on function public.t3a_observer_capture_save(uuid, jsonb) from public, anon;
grant execute on function public.t3a_observer_capture_save(uuid, jsonb) to authenticated;

create or replace function public.t3a_observer_capture_lock(p_stage_instance uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); c public.t3a_observer_capture;
begin
  if v_actor is null then return public.t3a_capture_refuse('observer2.lock', 'NO_OBSERVER_IDENTIFIED', '', 'no signed-in observer'); end if;
  select * into c from public.t3a_observer_capture where stage_instance_id = p_stage_instance and observer_id = v_actor;
  if c.capture_id is null then return public.t3a_capture_refuse('observer2.lock', 'NO_CAPTURE_TO_LOCK', v_actor::text, 'save a capture first'); end if;
  if c.locked_at is not null then return public.t3a_capture_refuse('observer2.lock', 'CAPTURE_LOCKED', v_actor::text, 'already locked'); end if;
  update public.t3a_observer_capture set locked_at = now() where capture_id = c.capture_id;
  return jsonb_build_object('outcome', 'locked', 'both_locked', public.t3a_cr15_both_locked(p_stage_instance));
end $fn$;
revoke all on function public.t3a_observer_capture_lock(uuid) from public, anon;
grant execute on function public.t3a_observer_capture_lock(uuid) to authenticated;

-- An observer always sees their own capture; the other's appears only once both are locked.
create or replace function public.t3a_observer_capture_read(p_stage_instance uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); v_both boolean; other jsonb;
begin
  if not exists (select 1 from public.t3a_session_observer where stage_instance_id = p_stage_instance and observer_id = v_actor) then
    return public.t3a_capture_refuse('observer2.read', 'NOT_AN_OBSERVER_OF_THIS_SESSION', coalesce(v_actor::text, ''), 'only an observer of the session reads captures');
  end if;
  v_both := public.t3a_cr15_both_locked(p_stage_instance);
  select to_jsonb(c) - 'capture_id' into other from public.t3a_observer_capture c where c.stage_instance_id = p_stage_instance and c.observer_id <> v_actor;
  return jsonb_build_object('outcome', 'read',
    'own', (select to_jsonb(c) - 'capture_id' from public.t3a_observer_capture c where c.stage_instance_id = p_stage_instance and c.observer_id = v_actor),
    'both_locked', v_both,
    'other', case when v_both then other else null end);
end $fn$;
revoke all on function public.t3a_observer_capture_read(uuid) from public, anon;
grant execute on function public.t3a_observer_capture_read(uuid) to authenticated;

-- Agreement of the two locked captures, key by key.
create or replace function public.t3a_observer_agreement(p_stage_instance uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare a jsonb; b jsonb; k text; diff text[] := '{}';
begin
  if not public.t3a_cr15_both_locked(p_stage_instance) then return jsonb_build_object('outcome', 'not_ready', 'reason', 'both captures must be locked'); end if;
  select (array_agg(c.payload order by s.role))[1], (array_agg(c.payload order by s.role))[2] into a, b
    from public.t3a_observer_capture c join public.t3a_session_observer s on s.stage_instance_id = c.stage_instance_id and s.observer_id = c.observer_id where c.stage_instance_id = p_stage_instance;
  for k in select jsonb_object_keys(coalesce(a, '{}'::jsonb) || coalesce(b, '{}'::jsonb)) loop
    if a -> k is distinct from b -> k then diff := diff || k; end if;
  end loop;
  return jsonb_build_object('outcome', 'computed', 'agree', cardinality(diff) = 0, 'differing_keys', to_jsonb(diff));
end $fn$;
revoke all on function public.t3a_observer_agreement(uuid) from public, anon, authenticated;
grant execute on function public.t3a_observer_agreement(uuid) to service_role;
