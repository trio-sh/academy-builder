-- CORR-007 Rev 1.6 rule CR-08 (CR-196): consent revocation against the commit point.
--   Before each consequential act (start, serve, submit, capture, confirm, commit, review, release) the platform checks that the applicable permission is still in effect.
--   The commit point decides a race. A revocation effective before the commit: the act refuses, the work ends quarantined and nothing counts. A commit before the revocation:
--   the commit stands, counts if it is a completed observation, and its output is then excluded from composition. A revocation cancels every later act that depended on it,
--   including work already queued. The historical consent record stays immutable. Every act and every revocation takes a position in one sequence for the participant; the
--   order is the sequence taken inside the database under a per-participant lock, never a comparison of clock times.
-- The binding of the real commit to this check sits behind the existing consent switch (t3a_consent_config.enforce_gate), which stays off. Nothing here activates a Stage.

-- ---------------------------------------------------------------------------------------------------------------------
-- The sequence, the quarantine and the queue
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_act_sequence (
  act_seq        bigint generated always as identity primary key,
  participant_id uuid not null,
  dimension_id   text,
  kind           text not null check (kind in ('act', 'revocation')),
  act            text not null check (act in ('start', 'serve', 'submit', 'capture', 'confirm', 'commit', 'review', 'release', 'consent_revocation')),
  outcome        text not null check (outcome in ('allowed', 'refused', 'recorded')),
  subject_ref    text,
  recorded_at    timestamptz not null default now(),
  check ((kind = 'revocation') = (act = 'consent_revocation'))
);
create index if not exists t3a_act_sequence_participant_idx on public.t3a_act_sequence (participant_id, act_seq desc);

create table if not exists public.t3a_cr08_quarantine (
  quarantine_id  uuid primary key default gen_random_uuid(),
  participant_id uuid not null,
  dimension_id   text,
  subject_ref    text,
  reason         text not null check (reason in ('consent_revoked_before_commit')),
  act_seq        bigint not null references public.t3a_act_sequence(act_seq),
  recorded_at    timestamptz not null default now()
);

create table if not exists public.t3a_queued_act (
  queued_act_id  uuid primary key default gen_random_uuid(),
  participant_id uuid not null,
  dimension_id   text not null,
  stage_code     text,
  act            text not null check (act in ('start', 'serve', 'submit', 'capture', 'confirm', 'commit', 'review', 'release')),
  subject_ref    text,
  queued_at_seq  bigint not null,
  queued_at      timestamptz not null default now()
);
create table if not exists public.t3a_queued_act_event (
  event_seq     bigint generated always as identity primary key,
  queued_act_id uuid not null references public.t3a_queued_act(queued_act_id),
  event         text not null check (event in ('cancelled', 'executed', 'refused')),
  act_seq       bigint,
  recorded_at   timestamptz not null default now()
);

do $do$ declare t text; begin
  foreach t in array array['t3a_act_sequence', 't3a_cr08_quarantine', 't3a_queued_act', 't3a_queued_act_event'] loop
    execute format('drop trigger if exists t3a_deny_mutation_trg on public.%I', t);
    execute format('create trigger t3a_deny_mutation_trg before update or delete on public.%I for each row execute function public.t3a_deny_mutation()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $do$;

insert into public.t3a_attempt_ending_map (ending, outcome, attempt_event_class, counted, wait_kind) values
  ('consent_revoked_before_commit', 'abandoned', 'administration_failure', false, 'none')
on conflict (ending) do nothing;

-- ---------------------------------------------------------------------------------------------------------------------
-- The permission check and the acts
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_cr08_lock(p_participant uuid) returns void language sql as $fn$
  select pg_advisory_xact_lock(hashtextextended('cr08:' || p_participant::text, 0))
$fn$;

create or replace function public.t3a_cr08_permission_in_effect(p_participant uuid, p_dimension text) returns boolean language sql stable security definer set search_path = public as $fn$
  select public.t3a_dimension_consent_state(p_participant, p_dimension, null) = 'granted'
$fn$;
revoke all on function public.t3a_cr08_permission_in_effect(uuid, text) from public, anon, authenticated;
grant execute on function public.t3a_cr08_permission_in_effect(uuid, text) to service_role;

-- A refused commit: the work ends quarantined and counts nothing.
create or replace function public.t3a_cr08_quarantine_commit(p_participant uuid, p_dimension text, p_stage text, p_subject text, p_seq bigint) returns void
language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.t3a_cr08_quarantine (participant_id, dimension_id, subject_ref, reason, act_seq) values (p_participant, p_dimension, p_subject, 'consent_revoked_before_commit', p_seq);
  if p_stage is not null and exists (select 1 from public.t3a_attempt_live a where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code::text = p_stage and a.outcome = 'initiated') then
    update public.t3a_attempt set outcome = 'abandoned', attempt_event_class = 'administration_failure', counted = false, ended_at = now()
     where attempt_id = (select attempt_id from public.t3a_attempt_live a where a.participant_id = p_participant and a.dimension_id = p_dimension and a.stage_code::text = p_stage and a.outcome = 'initiated' order by created_at desc limit 1);
  end if;
end $fn$;
revoke all on function public.t3a_cr08_quarantine_commit(uuid, text, text, text, bigint) from public, anon, authenticated;

create or replace function public.t3a_cr08_act(p_participant uuid, p_dimension text, p_stage text, p_act text, p_subject text default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_ok boolean; v_seq bigint;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('consent.act', 'SERVICE_ONLY', coalesce(p_participant::text, ''), 'acts are checked by the service route'); end if;
  if p_act not in ('start', 'serve', 'submit', 'capture', 'confirm', 'commit', 'review', 'release') then
    return public.t3a_capture_refuse('consent.act', 'ACT_NOT_IN_CONTROLLED_SET', coalesce(p_participant::text, ''), coalesce(p_act, 'none'));
  end if;
  perform public.t3a_cr08_lock(p_participant);
  v_ok := public.t3a_cr08_permission_in_effect(p_participant, p_dimension);
  insert into public.t3a_act_sequence (participant_id, dimension_id, kind, act, outcome, subject_ref) values (p_participant, p_dimension, 'act', p_act, case when v_ok then 'allowed' else 'refused' end, p_subject) returning act_seq into v_seq;
  if v_ok then return jsonb_build_object('outcome', 'allowed', 'act', p_act, 'act_seq', v_seq); end if;
  perform public.t3a_capture_refuse('consent.act', 'PERMISSION_NOT_IN_EFFECT', p_participant::text || ' ' || p_dimension, p_act || ' refused: the permission is no longer in effect');
  if p_act = 'commit' then perform public.t3a_cr08_quarantine_commit(p_participant, p_dimension, p_stage, p_subject, v_seq); end if;
  return jsonb_build_object('outcome', 'refused', 'reason', 'PERMISSION_NOT_IN_EFFECT', 'act', p_act, 'act_seq', v_seq, 'quarantined', p_act = 'commit', 'counts', false);
end $fn$;
revoke all on function public.t3a_cr08_act(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.t3a_cr08_act(uuid, text, text, text, text) to service_role;

-- Work that is queued carries its position; it is re-checked, and cancelled by a revocation, when it runs.
create or replace function public.t3a_cr08_queue(p_participant uuid, p_dimension text, p_stage text, p_act text, p_subject text default null) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_id uuid; v_seq bigint;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('consent.queue', 'SERVICE_ONLY', coalesce(p_participant::text, ''), 'work is queued by the service route'); end if;
  perform public.t3a_cr08_lock(p_participant);
  select coalesce(max(act_seq), 0) into v_seq from public.t3a_act_sequence where participant_id = p_participant;
  insert into public.t3a_queued_act (participant_id, dimension_id, stage_code, act, subject_ref, queued_at_seq) values (p_participant, p_dimension, p_stage, p_act, p_subject, v_seq) returning queued_act_id into v_id;
  return jsonb_build_object('outcome', 'queued', 'queued_act_id', v_id);
end $fn$;
revoke all on function public.t3a_cr08_queue(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.t3a_cr08_queue(uuid, text, text, text, text) to service_role;

create or replace function public.t3a_cr08_run_queued(p_queued_act uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare q public.t3a_queued_act; r jsonb;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('consent.queue', 'SERVICE_ONLY', coalesce(p_queued_act::text, ''), 'queued work runs by the service route'); end if;
  select * into q from public.t3a_queued_act where queued_act_id = p_queued_act;
  if q.queued_act_id is null then return public.t3a_capture_refuse('consent.queue', 'QUEUED_ACT_NOT_FOUND', coalesce(p_queued_act::text, ''), 'no such queued act'); end if;
  if exists (select 1 from public.t3a_queued_act_event e where e.queued_act_id = p_queued_act) then
    return public.t3a_capture_refuse('consent.queue', 'QUEUED_ACT_ALREADY_SETTLED', p_queued_act::text, (select event from public.t3a_queued_act_event where queued_act_id = p_queued_act order by event_seq desc limit 1));
  end if;
  r := public.t3a_cr08_act(q.participant_id, q.dimension_id, q.stage_code, q.act, q.subject_ref);
  insert into public.t3a_queued_act_event (queued_act_id, event, act_seq) values (p_queued_act, case when r ->> 'outcome' = 'allowed' then 'executed' else 'refused' end, (r ->> 'act_seq')::bigint);
  return r;
end $fn$;
revoke all on function public.t3a_cr08_run_queued(uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr08_run_queued(uuid) to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- A revocation: its place in the sequence, the queued work it cancels, and the output of anything already committed
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_cr08_on_revocation() returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_seq bigint; q record; o record; s record;
begin
  if new.consent_status <> 'withdrawn' or new.consent_type not in ('scenario_logging', 'mentor_observation') then return new; end if;
  perform public.t3a_cr08_lock(new.account_id);
  insert into public.t3a_act_sequence (participant_id, dimension_id, kind, act, outcome, subject_ref) values (new.account_id, new.consent_scope_dimension_id, 'revocation', 'consent_revocation', 'recorded', new.consent_id::text) returning act_seq into v_seq;
  -- queued work that depended on the permission is cancelled
  for q in select qa.queued_act_id from public.t3a_queued_act qa
            where qa.participant_id = new.account_id and (new.consent_scope_dimension_id is null or qa.dimension_id = new.consent_scope_dimension_id)
              and not exists (select 1 from public.t3a_queued_act_event e where e.queued_act_id = qa.queued_act_id) loop
    insert into public.t3a_queued_act_event (queued_act_id, event, act_seq) values (q.queued_act_id, 'cancelled', v_seq);
  end loop;
  -- what was committed before the revocation stands and counts; its output leaves composition
  for o in select r.observation_record_id from public.t3a_observation_record r
            where r.participant_id = new.account_id and r.is_committed is true and (new.consent_scope_dimension_id is null or r.dimension_id = new.consent_scope_dimension_id) loop
    for s in select cs.composed_statement_id from public.t3a_dimension_composed_statement cs
              where cs.observation_ref = o.observation_record_id and not exists (select 1 from public.t3a_dimension_statement_withdrawal w where w.composed_statement_id = cs.composed_statement_id) loop
      insert into public.t3a_dimension_statement_withdrawal (composed_statement_id, reason) values (s.composed_statement_id, 'consent revoked after commit (CR-08), act position ' || v_seq::text);
    end loop;
  end loop;
  return new;
end $fn$;
drop trigger if exists t3a_8_cr08_on_revocation_trg on public.t3a_consent_record;
create trigger t3a_8_cr08_on_revocation_trg after insert on public.t3a_consent_record for each row execute function public.t3a_cr08_on_revocation();

-- ---------------------------------------------------------------------------------------------------------------------
-- The commit point of the real observation record, behind the consent switch (off)
-- ---------------------------------------------------------------------------------------------------------------------

create or replace function public.t3a_cr08_commit_gate() returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_seq bigint;
begin
  if tg_op = 'UPDATE' and old.is_committed is true then return new; end if;
  if not coalesce((select enforce_gate from public.t3a_consent_config), false) then return new; end if;
  if new.dimension_id = 'D1' then return new; end if;     -- D1 consent still sits in the older tables (CR-035); this check reads the consent register
  perform public.t3a_cr08_lock(new.participant_id);
  if public.t3a_cr08_permission_in_effect(new.participant_id, new.dimension_id) then
    insert into public.t3a_act_sequence (participant_id, dimension_id, kind, act, outcome, subject_ref) values (new.participant_id, new.dimension_id, 'act', 'commit', 'allowed', new.observation_record_id::text);
    return new;
  end if;
  insert into public.t3a_act_sequence (participant_id, dimension_id, kind, act, outcome, subject_ref) values (new.participant_id, new.dimension_id, 'act', 'commit', 'refused', new.observation_record_id::text) returning act_seq into v_seq;
  perform public.t3a_capture_refuse('consent.act', 'PERMISSION_NOT_IN_EFFECT', new.participant_id::text || ' ' || new.dimension_id, 'commit refused: the permission was revoked before the commit');
  perform public.t3a_cr08_quarantine_commit(new.participant_id, new.dimension_id, new.stage_code, new.observation_record_id::text, v_seq);
  return null;                                           -- the row is not committed; the work is quarantined
end $fn$;
drop trigger if exists t3a_0_cr08_commit_gate_trg on public.t3a_observation_record;
create trigger t3a_0_cr08_commit_gate_trg before insert or update of is_committed on public.t3a_observation_record for each row when (new.is_committed is true) execute function public.t3a_cr08_commit_gate();
