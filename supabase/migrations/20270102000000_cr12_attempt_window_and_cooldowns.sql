-- CORR-007 Rev 1.6 rule CR-12 (part 1): the attempt cap becomes up to three counted attempts in any trailing six months per Stage and
-- dimension; each counted attempt stores its commit instant and exclusion_expiry_at (commit plus six calendar months, month end rule, UTC);
-- the completed observation wait is 7, 14 and 21 days by position in the window; the rescheduling wait is 7 or 14 days; a welfare stop, a
-- technical failure, an accommodation interruption, an administration failure and a cancellation before start carry no wait.
-- Values are rows in one rule table and cannot be changed at runtime. Supersedes CX-27 (the lifetime cap and the 7, 14, none ladder) and the
-- held welfare refusal of CX-28. Part 2 (one active attempt, idempotency, callbacks, unclassified endings, reclassification) follows.

create table if not exists public.t3a_attempt_rule (
  rule_seq bigint generated always as identity primary key,
  rule_key text not null check (rule_key in ('cap', 'window_months', 'completed_wait_days', 'rescheduling_wait_days')),
  rule_value text not null,
  rules_version text not null check (rules_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  set_at timestamptz not null default now()
);
comment on table public.t3a_attempt_rule is 'CR-12 rule values, one place. Append-only; a runtime change or an override is refused and logged (t3a_attempt_rule_change).';
drop trigger if exists t3a_append_only on public.t3a_attempt_rule;
create trigger t3a_append_only before update or delete on public.t3a_attempt_rule for each row execute function public.t3a_deny_mutation();
alter table public.t3a_attempt_rule enable row level security;
revoke all on public.t3a_attempt_rule from anon, authenticated;

insert into public.t3a_attempt_rule (rule_key, rule_value, rules_version)
select k, v, '1.0' from (values ('cap', '3'), ('window_months', '6'), ('completed_wait_days', '7,14,21'), ('rescheduling_wait_days', '7,7,14')) t(k, v)
where not exists (select 1 from public.t3a_attempt_rule r where r.rule_key = t.k);

create or replace function public.t3a_attempt_rule_get(p_key text) returns text language sql stable security definer set search_path = public as $fn$
  select rule_value from public.t3a_attempt_rule where rule_key = p_key order by rule_seq desc limit 1
$fn$;
revoke all on function public.t3a_attempt_rule_get(text) from public, anon;
grant execute on function public.t3a_attempt_rule_get(text) to authenticated, service_role;

-- T8: no route changes a cap, window or wait; asking is refused and logged.
create or replace function public.t3a_attempt_rule_change(p_key text, p_value text) returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  return public.t3a_capture_refuse('attempt.rule', 'ATTEMPT_RULE_CHANGE_REFUSED', coalesce(p_key, ''), 'cap, window and wait values are configuration and cannot be changed or overridden at runtime');
end $fn$;
revoke all on function public.t3a_attempt_rule_change(text, text) from public, anon;
grant execute on function public.t3a_attempt_rule_change(text, text) to authenticated, service_role;

alter table public.t3a_attempt add column if not exists commit_at timestamptz;
alter table public.t3a_attempt add column if not exists exclusion_expiry_at timestamptz;

create or replace function public.t3a_attempt_commit_instant() returns trigger language plpgsql security definer set search_path = public as $fn$
declare m int := coalesce(nullif(public.t3a_attempt_rule_get('window_months'), '')::int, 6);
begin
  if tg_op = 'UPDATE' and old.commit_at is not null and (new.commit_at is distinct from old.commit_at or new.exclusion_expiry_at is distinct from old.exclusion_expiry_at) then
    raise exception 'T3A_ATTEMPT_COMMIT_IMMUTABLE: the commit instant and its exclusion expiry are stored once' using errcode = '42501';
  end if;
  if new.outcome = 'completed' and new.counted and new.commit_at is null then
    new.commit_at := coalesce(new.ended_at, now());
  end if;
  if new.commit_at is not null and new.exclusion_expiry_at is null then
    new.exclusion_expiry_at := ((new.commit_at at time zone 'UTC') + make_interval(months => m)) at time zone 'UTC';
  end if;
  return new;
end $fn$;
drop trigger if exists t3a_3_attempt_commit_instant on public.t3a_attempt;
create trigger t3a_3_attempt_commit_instant before insert or update on public.t3a_attempt for each row execute function public.t3a_attempt_commit_instant();

-- Existing counted completions get their instants (the trigger fills the expiry).
update public.t3a_attempt set commit_at = coalesce(ended_at, created_at) where outcome = 'completed' and counted and commit_at is null;

-- The one answer: may this participant start an attempt at p_at, and if not, when is the earliest instant every limit is satisfied.
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
  select count(*) into v_n from public.t3a_attempt a
   where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage
     and a.outcome = 'completed' and a.counted and a.commit_at <= p_at and p_at < a.exclusion_expiry_at;
  -- the earliest instant the count falls below the cap: the (n - cap + 1)th earliest expiry among those counting
  if v_n >= v_cap then
    select e into v_cap_at from (
      select a.exclusion_expiry_at e from public.t3a_attempt a
       where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage
         and a.outcome = 'completed' and a.counted and a.commit_at <= p_at and p_at < a.exclusion_expiry_at
       order by a.exclusion_expiry_at offset (v_n - v_cap) limit 1) x;
  end if;
  -- every running wait, each as the instant it ends
  select max(w) into v_cool from (
    select a.commit_at + make_interval(days => v_cw[least(greatest(pos.p, 1), array_length(v_cw, 1))]) as w
      from public.t3a_attempt a
      cross join lateral (select count(*)::int p from public.t3a_attempt s
                           where s.participant_id = a.participant_id and s.dimension_id = a.dimension_id and s.stage_code = a.stage_code
                             and s.outcome = 'completed' and s.counted and s.commit_at <= a.commit_at and a.commit_at < s.exclusion_expiry_at) pos
     where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code = p_stage and a.outcome = 'completed' and a.counted and a.commit_at <= p_at
    union all
    select coalesce(a.ended_at, a.created_at) + make_interval(days => v_rw[least(n.c, array_length(v_rw, 1) - 1) + 1])
      from public.t3a_attempt a
      cross join lateral (select count(*)::int c from public.t3a_attempt s
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

-- The screen and run routes keep their three argument question; it now asks the one rule.
create or replace function public.t3a_d1_next_attempt_permitted(p_participant_id uuid, p_dimension_id text, p_stage_code public.t3a_stage_code) returns jsonb
language sql stable security definer set search_path = public as $fn$
  select public.t3a_attempt_eligibility(p_participant_id, p_dimension_id, p_stage_code, now())
$fn$;
grant execute on function public.t3a_d1_next_attempt_permitted(uuid, text, public.t3a_stage_code) to authenticated;
