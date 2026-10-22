-- CORR-007 Rev 1.6 rule CR-12 (part 2): one active attempt per participant, Stage and dimension (ATTEMPT_ACTIVE), a repeated start with the
-- same idempotency key returns the existing attempt, a completion callback is counted once, an ending or callback with no active attempt is
-- refused and logged without reserving its identifier, an ending that matches no defined event fails closed and blocks a new attempt until it
-- is classified, and a reclassified ending keeps the original, supersedes it, and recalculates the count and waits while the issued attempt
-- number stays and the gap stays visible. The ending names and their effects are rows of one table.

alter table public.t3a_attempt add column if not exists superseded_by uuid references public.t3a_attempt(attempt_id);
alter table public.t3a_attempt add column if not exists supersedes uuid references public.t3a_attempt(attempt_id);

create or replace view public.t3a_attempt_live as select * from public.t3a_attempt where superseded_by is null;
revoke all on public.t3a_attempt_live from public, anon, authenticated;

create table if not exists public.t3a_attempt_ending_map (
  ending text primary key,
  outcome text not null,
  attempt_event_class text not null,
  counted boolean not null,
  wait_kind text not null check (wait_kind in ('completed', 'rescheduling', 'none'))
);
alter table public.t3a_attempt_ending_map enable row level security;
revoke all on public.t3a_attempt_ending_map from anon, authenticated;
insert into public.t3a_attempt_ending_map (ending, outcome, attempt_event_class, counted, wait_kind) values
  ('completed_observation', 'completed', 'completed_observation', true, 'completed'),
  ('withdrawal_participant_choice', 'participant_withdrew', 'withdrawal_after_start_before_commit', false, 'rescheduling'),
  ('no_show', 'abandoned', 'participant_no_show', false, 'rescheduling'),
  ('identity_failure_participant', 'abandoned', 'identity_verification_failure', false, 'rescheduling'),
  ('identity_failure_service', 'system_failure', 'technical_failure', false, 'none'),
  ('welfare_stop', 'participant_withdrew', 'welfare_stop', false, 'none'),
  ('technical_failure', 'system_failure', 'technical_failure', false, 'none'),
  ('accommodation_interruption', 'abandoned', 'accommodation_interruption', false, 'none'),
  ('administration_failure', 'system_failure', 'administration_failure', false, 'none'),
  ('cancelled_before_observation', 'abandoned', 'cancelled_before_start', false, 'none')
on conflict (ending) do nothing;

create table if not exists public.t3a_attempt_request (
  idempotency_key text primary key,
  attempt_id uuid not null references public.t3a_attempt(attempt_id),
  requested_at timestamptz not null default now()
);
create table if not exists public.t3a_attempt_callback (
  callback_id text primary key,
  attempt_id uuid not null references public.t3a_attempt(attempt_id),
  recorded_at timestamptz not null default now()
);
create table if not exists public.t3a_attempt_unclassified (
  attempt_id uuid primary key references public.t3a_attempt(attempt_id),
  ending_name text not null,
  recorded_at timestamptz not null default now(),
  classified_at timestamptz
);
alter table public.t3a_attempt_request enable row level security; alter table public.t3a_attempt_callback enable row level security; alter table public.t3a_attempt_unclassified enable row level security;
revoke all on public.t3a_attempt_request, public.t3a_attempt_callback, public.t3a_attempt_unclassified from anon, authenticated;
drop trigger if exists t3a_append_only on public.t3a_attempt_request; create trigger t3a_append_only before update or delete on public.t3a_attempt_request for each row execute function public.t3a_deny_mutation();
drop trigger if exists t3a_append_only on public.t3a_attempt_callback; create trigger t3a_append_only before update or delete on public.t3a_attempt_callback for each row execute function public.t3a_deny_mutation();

-- Backstop at write: one active attempt per participant, Stage and dimension, whatever route inserts it.
create unique index if not exists t3a_attempt_one_active on public.t3a_attempt (participant_id, dimension_id, stage_code) where outcome = 'initiated' and superseded_by is null;

-- A superseding row keeps the number of the row it supersedes; every other insert still takes the next number.
create or replace function public.t3a_attempt_sequence() returns trigger language plpgsql security definer set search_path to 'public' as $fn$
declare v_no int;
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.participant_id::text || new.dimension_id || new.stage_code::text, 0));
    if new.supersedes is not null then
      select attempt_no into v_no from public.t3a_attempt where attempt_id = new.supersedes;
      new.attempt_no := v_no;
    else
      new.attempt_no := greatest(coalesce(new.attempt_no, 0),
        coalesce((select max(attempt_no) from public.t3a_attempt where participant_id = new.participant_id and dimension_id = new.dimension_id and stage_code = new.stage_code), 0) + 1);
    end if;
    if new.attempt_event_class = 'welfare_stop' then new.counted := false; new.cooldown_class := 'none'; end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.attempt_no is distinct from old.attempt_no then
      raise exception 'T3A_ATTEMPT_NO_IMMUTABLE: attempt_no cannot be changed, lowered or reset' using errcode = '42501';
    end if;
    if new.attempt_event_class = 'welfare_stop' then new.counted := false; new.cooldown_class := 'none'; end if;
    return new;
  end if;
  raise exception 'T3A_ATTEMPT_NO_DELETE: attempts are never deleted; the sequence never decreases' using errcode = '42501';
end $fn$;

-- The eligibility rule now ignores superseded rows.
create or replace function public.t3a_attempt_eligibility(p_participant uuid, p_dimension text, p_stage public.t3a_stage_code, p_at timestamptz default now()) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare
  v_cap int := coalesce(nullif(public.t3a_attempt_rule_get('cap'), '')::int, 3);
  v_cw int[] := string_to_array(public.t3a_attempt_rule_get('completed_wait_days'), ',')::int[];
  v_rw int[] := string_to_array(public.t3a_attempt_rule_get('rescheduling_wait_days'), ',')::int[];
  v_n int; v_cap_at timestamptz; v_cool timestamptz; v_eligible timestamptz;
begin
  if v_cap is null or v_cw is null or v_rw is null then
    return jsonb_build_object('permitted', false, 'refusal_code', 'ATTEMPT_RULES_UNLOADED');
  end if;
  select count(*) into v_n from public.t3a_attempt_live a
   where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage
     and a.outcome = 'completed' and a.counted and a.commit_at <= p_at and p_at < a.exclusion_expiry_at;
  -- the earliest instant the count falls below the cap: the (n - cap + 1)th earliest expiry among those counting
  if v_n >= v_cap then
    select e into v_cap_at from (
      select a.exclusion_expiry_at e from public.t3a_attempt_live a
       where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage
         and a.outcome = 'completed' and a.counted and a.commit_at <= p_at and p_at < a.exclusion_expiry_at
       order by a.exclusion_expiry_at offset (v_n - v_cap) limit 1) x;
  end if;
  -- every running wait, each as the instant it ends
  select max(w) into v_cool from (
    select a.commit_at + make_interval(days => v_cw[least(greatest(pos.p, 1), array_length(v_cw, 1))]) as w
      from public.t3a_attempt_live a
      cross join lateral (select count(*)::int p from public.t3a_attempt_live s
                           where s.participant_id = a.participant_id and s.dimension_id = a.dimension_id and s.stage_code = a.stage_code
                             and s.outcome = 'completed' and s.counted and s.commit_at <= a.commit_at and a.commit_at < s.exclusion_expiry_at) pos
     where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage and a.outcome = 'completed' and a.counted and a.commit_at <= p_at
    union all
    select coalesce(a.ended_at, a.created_at) + make_interval(days => v_rw[least(n.c, array_length(v_rw, 1) - 1) + 1])
      from public.t3a_attempt_live a
      cross join lateral (select count(*)::int c from public.t3a_attempt_live s
                           where s.participant_id = a.participant_id and s.dimension_id = a.dimension_id and s.stage_code = a.stage_code
                             and s.outcome = 'completed' and s.counted and s.commit_at <= coalesce(a.ended_at, a.created_at) and coalesce(a.ended_at, a.created_at) < s.exclusion_expiry_at) n
     where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage
       and a.attempt_event_class in ('identity_verification_failure', 'participant_no_show', 'withdrawal_after_start_before_commit')
       and coalesce(a.ended_at, a.created_at) <= p_at) q;
  v_eligible := greatest(p_at, coalesce(v_cap_at, p_at), coalesce(v_cool, p_at));
  if v_n >= v_cap then
    return jsonb_build_object('permitted', false, 'refusal_code', 'ATTEMPT_CAP_REACHED', 'counted_in_window', v_n, 'earliest_eligible_at', v_eligible);
  elsif v_eligible > p_at then
    return jsonb_build_object('permitted', false, 'refusal_code', 'SPECIFICATION_COOLDOWN_IN_FORCE', 'counted_in_window', v_n, 'earliest_eligible_at', v_eligible, 'available_from', v_eligible);
  end if;
  return jsonb_build_object('permitted', true, 'counted_in_window', v_n);
end $fn$;
revoke all on function public.t3a_attempt_eligibility(uuid, text, public.t3a_stage_code, timestamptz) from public, anon, authenticated;
grant execute on function public.t3a_attempt_eligibility(uuid, text, public.t3a_stage_code, timestamptz) to service_role;

-- Start. Same key returns the same attempt; an unclassified ending, a second active attempt and any limit refuse by name.
create or replace function public.t3a_attempt_begin(p_participant uuid, p_dimension text, p_stage public.t3a_stage_code, p_key text, p_at timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_existing uuid; v_el jsonb; v_id uuid;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_ATTEMPT_SERVICE_ONLY: attempts start through the service route only' using errcode = '42501'; end if;
  if p_key is null or p_key = '' then return public.t3a_capture_refuse('attempt.begin', 'IDEMPOTENCY_KEY_MISSING', p_participant::text, 'a start carries an idempotency key'); end if;
  perform pg_advisory_xact_lock(hashtextextended(p_participant::text || p_dimension || p_stage::text, 0));
  select attempt_id into v_existing from public.t3a_attempt_request where idempotency_key = p_key;
  if v_existing is not null then return jsonb_build_object('outcome', 'existing', 'attempt_id', v_existing); end if;
  if exists (select 1 from public.t3a_attempt_unclassified u join public.t3a_attempt a using (attempt_id)
              where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage and u.classified_at is null) then
    return public.t3a_capture_refuse('attempt.begin', 'ENDING_UNCLASSIFIED', p_participant::text, 'an earlier ending matches no defined event; no new attempt until it is classified');
  end if;
  if exists (select 1 from public.t3a_attempt_live a where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage and a.outcome = 'initiated') then
    return public.t3a_capture_refuse('attempt.begin', 'ATTEMPT_ACTIVE', p_participant::text, 'one active attempt per participant, Stage and dimension');
  end if;
  v_el := public.t3a_attempt_eligibility(p_participant, p_dimension, p_stage, p_at);
  if (v_el->>'permitted')::boolean is not true then
    return public.t3a_capture_refuse('attempt.begin', v_el->>'refusal_code', p_participant::text, 'earliest eligible ' || coalesce(v_el->>'earliest_eligible_at', 'n/a')) || jsonb_build_object('earliest_eligible_at', v_el->'earliest_eligible_at');
  end if;
  insert into public.t3a_attempt (participant_id, dimension_id, stage_code, created_at) values (p_participant, p_dimension, p_stage, p_at) returning attempt_id into v_id;
  insert into public.t3a_attempt_request (idempotency_key, attempt_id) values (p_key, v_id);
  return jsonb_build_object('outcome', 'started', 'attempt_id', v_id);
end $fn$;
revoke all on function public.t3a_attempt_begin(uuid, text, public.t3a_stage_code, text, timestamptz) from public, anon, authenticated;
grant execute on function public.t3a_attempt_begin(uuid, text, public.t3a_stage_code, text, timestamptz) to service_role;

-- End. A repeated or racing callback counts once; no active attempt refuses without reserving the callback id; an unknown ending fails closed.
create or replace function public.t3a_attempt_end(p_participant uuid, p_dimension text, p_stage public.t3a_stage_code, p_ending text, p_callback_id text default null, p_at timestamptz default now()) returns jsonb
language plpgsql security definer set search_path = public as $fn$
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
  update public.t3a_attempt set outcome = m.outcome, attempt_event_class = m.attempt_event_class, counted = m.counted, ended_at = p_at where attempt_id = v_att.attempt_id;
  if p_callback_id is not null then insert into public.t3a_attempt_callback (callback_id, attempt_id) values (p_callback_id, v_att.attempt_id); end if;
  return jsonb_build_object('outcome', 'ended', 'attempt_id', v_att.attempt_id, 'counted', m.counted, 'attempt_no', v_att.attempt_no);
end $fn$;
revoke all on function public.t3a_attempt_end(uuid, text, public.t3a_stage_code, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.t3a_attempt_end(uuid, text, public.t3a_stage_code, text, text, timestamptz) to service_role;

-- Classify an unclassified ending (or reclassify any ending): the original row is kept and superseded by a new row that keeps its number.
create or replace function public.t3a_attempt_reclassify(p_attempt uuid, p_new_ending text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare a public.t3a_attempt; m public.t3a_attempt_ending_map%rowtype; v_new uuid;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_ATTEMPT_SERVICE_ONLY: reclassification is a service act' using errcode = '42501'; end if;
  select * into a from public.t3a_attempt where attempt_id = p_attempt;
  if a.attempt_id is null or a.superseded_by is not null then return public.t3a_capture_refuse('attempt.reclassify', 'ATTEMPT_NOT_RECLASSIFIABLE', coalesce(p_attempt::text, ''), 'no such live attempt'); end if;
  select * into m from public.t3a_attempt_ending_map where ending = p_new_ending;
  if not found then return public.t3a_capture_refuse('attempt.reclassify', 'ENDING_UNKNOWN', coalesce(p_new_ending, ''), 'not a defined ending'); end if;
  perform pg_advisory_xact_lock(hashtextextended(a.participant_id::text || a.dimension_id || a.stage_code::text, 0));
  insert into public.t3a_attempt (participant_id, dimension_id, stage_code, stage_entry_event_id, outcome, counted, created_at, ended_at, attempt_event_class, attempt_rules_version, supersedes)
  values (a.participant_id, a.dimension_id, a.stage_code, a.stage_entry_event_id, m.outcome, m.counted, a.created_at, a.ended_at, m.attempt_event_class, a.attempt_rules_version, a.attempt_id) returning attempt_id into v_new;
  update public.t3a_attempt set superseded_by = v_new where attempt_id = a.attempt_id;
  update public.t3a_attempt_unclassified set classified_at = now() where attempt_id = a.attempt_id and classified_at is null;
  return jsonb_build_object('outcome', 'reclassified', 'superseded', a.attempt_id, 'attempt_id', v_new, 'attempt_no', a.attempt_no);
end $fn$;
revoke all on function public.t3a_attempt_reclassify(uuid, text) from public, anon, authenticated;
grant execute on function public.t3a_attempt_reclassify(uuid, text) to service_role;
