-- CORR-007 Rev 1.6 rules CR-21 (recovery, source suspension and shared submissions) and CR-22 (Stage 4 interruptions) (CR-199).
-- CR-21: (a) a restart in the middle of capture or commit creates no duplicate instance and never advances silently; correction events are kept.
--        (b) suspending a source that has served instances opens an impact review listing every served instance and every report; nothing is cancelled automatically.
--        (c) at Stage 3, withdrawing permission for one of two dimensions on a shared submission refuses that dimension's record; the other stands (proved in the tests
--            against the CR-08 route and trigger; no new code is needed for it).
-- CR-22: each Stage 4 interruption has its stated attempt effect and return constraint, and no finding about anyone.
-- Nothing here activates a Stage or turns an enforcement switch on.

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-21 (a). Restart without duplicates, commit once
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.t3a_observation_record add column if not exists stage_instance_id uuid;
create unique index if not exists t3a_observation_record_one_commit_per_instance_uq on public.t3a_observation_record (stage_instance_id) where stage_instance_id is not null and is_committed is true;

create table if not exists public.t3a_commit_request (
  idempotency_key       text not null,
  stage_instance_id     uuid not null,
  observation_record_id uuid not null,
  requested_at          timestamptz not null default now(),
  primary key (stage_instance_id, idempotency_key)
);
drop trigger if exists t3a_deny_mutation_trg on public.t3a_commit_request;
create trigger t3a_deny_mutation_trg before update or delete on public.t3a_commit_request for each row execute function public.t3a_deny_mutation();
alter table public.t3a_commit_request enable row level security;
revoke all on public.t3a_commit_request from anon, authenticated;

-- Commit a pending observation record for a session once. A restart that sends the same key gets the same answer; a different key after a commit is refused, never a second commit.
create or replace function public.t3a_cr21_commit_once(p_stage_instance uuid, p_key text, p_observation_record uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_prev uuid; o public.t3a_observation_record; si public.t3a_stage_instance; v_done uuid;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('commit.once', 'SERVICE_ONLY', coalesce(p_stage_instance::text, ''), 'a commit is made by the service route'); end if;
  if p_key is null or p_key = '' then return public.t3a_capture_refuse('commit.once', 'IDEMPOTENCY_KEY_MISSING', coalesce(p_stage_instance::text, ''), 'a commit carries an idempotency key'); end if;
  select * into si from public.t3a_stage_instance where stage_instance_id = p_stage_instance;
  if si.stage_instance_id is null then return public.t3a_capture_refuse('commit.once', 'STAGE_INSTANCE_NOT_FOUND', coalesce(p_stage_instance::text, ''), 'no such session'); end if;
  perform pg_advisory_xact_lock(hashtextextended('cr21:' || p_stage_instance::text, 0));
  select observation_record_id into v_prev from public.t3a_commit_request where stage_instance_id = p_stage_instance and idempotency_key = p_key;
  if v_prev is not null then return jsonb_build_object('outcome', 'already_committed', 'observation_record_id', v_prev); end if;
  select observation_record_id into v_done from public.t3a_observation_record where stage_instance_id = p_stage_instance and is_committed is true;
  if v_done is not null then
    return public.t3a_capture_refuse('commit.once', 'SESSION_ALREADY_COMMITTED', p_stage_instance::text, 'this session already has its commit; a restart does not make a second one') || jsonb_build_object('observation_record_id', v_done);
  end if;
  select * into o from public.t3a_observation_record where observation_record_id = p_observation_record;
  if o.observation_record_id is null or o.participant_id <> si.participant_id or o.dimension_id <> si.dimension_id::text or o.stage_code <> si.stage_code::text then
    return public.t3a_capture_refuse('commit.once', 'RECORD_NOT_THIS_SESSIONS', p_stage_instance::text, 'the record is not this session''s');
  end if;
  update public.t3a_observation_record set stage_instance_id = p_stage_instance where observation_record_id = p_observation_record;
  update public.t3a_observation_record set is_committed = true, committed_at = now() where observation_record_id = p_observation_record;
  if not exists (select 1 from public.t3a_observation_record where observation_record_id = p_observation_record and is_committed is true) then
    return public.t3a_capture_refuse('commit.once', 'COMMIT_NOT_MADE', p_stage_instance::text, 'the commit was held by an earlier gate (for example a revoked permission)');
  end if;
  insert into public.t3a_commit_request (idempotency_key, stage_instance_id, observation_record_id) values (p_key, p_stage_instance, p_observation_record);
  return jsonb_build_object('outcome', 'committed', 'observation_record_id', p_observation_record);
end $fn$;
revoke all on function public.t3a_cr21_commit_once(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr21_commit_once(uuid, text, uuid) to service_role;

-- Where a restarted session stands. It reads and writes nothing, so asking again can never advance it, duplicate it or lose a correction.
create or replace function public.t3a_cr21_resume(p_stage_instance uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare v_actor uuid := auth.uid(); si public.t3a_stage_instance; v_rec uuid; v_committed boolean;
begin
  select * into si from public.t3a_stage_instance where stage_instance_id = p_stage_instance;
  if si.stage_instance_id is null or not (public.t3a_is_service_context() or v_actor = si.participant_id or public.t3a_has_administrative_standing()
       or exists (select 1 from public.t3a_mentor_assignment m where m.stage_instance_id = p_stage_instance and m.mentor_id = v_actor)) then
    return jsonb_build_object('outcome', 'refused', 'reason', 'SESSION_NOT_AVAILABLE');
  end if;
  select observation_record_id, is_committed is true into v_rec, v_committed from public.t3a_observation_record where stage_instance_id = p_stage_instance order by is_committed desc nulls last, created_at limit 1;
  return jsonb_build_object('outcome', 'resume', 'stage_instance_id', si.stage_instance_id, 'state', si.state,
    'observation_record_id', v_rec, 'committed', coalesce(v_committed, false),
    'capture_rows', (select count(*)::int from public.t3a_observer_capture c where c.stage_instance_id = p_stage_instance),
    'entry_events', (select count(*)::int from public.t3a_stage_entry_event e where e.stage_instance_id = p_stage_instance),
    'correction_events', (select count(*)::int from public.t3a_dimension_composed_statement cs where cs.observation_ref = v_rec and cs.supersedes_composed_statement_id is not null)
                       + (select count(*)::int from public.t3a_dimension_statement_withdrawal w join public.t3a_dimension_composed_statement cs on cs.composed_statement_id = w.composed_statement_id where cs.observation_ref = v_rec),
    'next_step', case when coalesce(v_committed, false) then 'done' when v_rec is null then 'capture' else 'commit' end,
    'advanced', false);
end $fn$;
revoke all on function public.t3a_cr21_resume(uuid) from public, anon;
grant execute on function public.t3a_cr21_resume(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-21 (b). Suspending a source that has served instances opens an impact review
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_source_impact_review (
  review_id         uuid primary key default gen_random_uuid(),
  source_version_id uuid not null,
  reason            text not null check (btrim(reason) <> ''),
  opened_at         timestamptz not null default now()
);
create table if not exists public.t3a_source_impact_item (
  item_id           uuid primary key default gen_random_uuid(),
  review_id         uuid not null references public.t3a_source_impact_review(review_id),
  item_kind         text not null check (item_kind in ('served_instance', 'observation', 'report')),
  item_ref          uuid not null,
  participant_id    uuid not null,
  unique (review_id, item_kind, item_ref)
);
do $do$ declare t text; begin
  foreach t in array array['t3a_source_impact_review', 't3a_source_impact_item'] loop
    execute format('drop trigger if exists t3a_deny_mutation_trg on public.%I', t);
    execute format('create trigger t3a_deny_mutation_trg before update or delete on public.%I for each row execute function public.t3a_deny_mutation()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $do$;

-- The source stops being served; every served instance, every observation made on it and every report that carries one is listed for a person to review. Nothing is changed in any of them.
create or replace function public.t3a_cr21_suspend_source(p_source_version uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare v_review uuid; v_n_inst int; v_n_obs int; v_n_rep int;
begin
  if not public.t3a_is_service_context() and not public.t3a_has_administrative_standing() then
    return public.t3a_capture_refuse('source.suspend', 'APPROVER_LACKS_STANDING', coalesce(p_source_version::text, ''), 'a source is suspended by a person with standing or through the service route');
  end if;
  if coalesce(btrim(p_reason), '') = '' then return public.t3a_capture_refuse('source.suspend', 'REASON_REQUIRED', coalesce(p_source_version::text, ''), 'a suspension names its reason'); end if;
  if not exists (select 1 from public.t3a_d1_content_version where content_version_id = p_source_version) then
    return public.t3a_capture_refuse('source.suspend', 'SOURCE_VERSION_NOT_FOUND', coalesce(p_source_version::text, ''), 'no such source version');
  end if;
  if exists (select 1 from public.t3a_source_impact_review r where r.source_version_id = p_source_version) then
    return public.t3a_capture_refuse('source.suspend', 'SOURCE_ALREADY_SUSPENDED', p_source_version::text, 'a review is already open for this source');
  end if;
  update public.t3a_d1_content_version set operational_state = 'suspended' where content_version_id = p_source_version;
  insert into public.t3a_source_impact_review (source_version_id, reason) values (p_source_version, btrim(p_reason)) returning review_id into v_review;
  insert into public.t3a_source_impact_item (review_id, item_kind, item_ref, participant_id)
    select v_review, 'served_instance', e.stage_entry_event_id, e.participant_id from public.t3a_stage_entry_event e where e.source_version_id = p_source_version;
  get diagnostics v_n_inst = row_count;
  insert into public.t3a_source_impact_item (review_id, item_kind, item_ref, participant_id)
    select distinct v_review, 'observation', cs.observation_ref, cs.participant_id from public.t3a_dimension_composed_statement cs where cs.source_version_id = p_source_version;
  get diagnostics v_n_obs = row_count;
  insert into public.t3a_source_impact_item (review_id, item_kind, item_ref, participant_id)
    select distinct v_review, 'report', b.ber_report_id, b.participant_id from public.t3a_d1_ber_report b
     where exists (select 1 from public.t3a_dimension_composed_statement cs where cs.source_version_id = p_source_version and cs.participant_id = b.participant_id
                     and cs.dimension_id = any (coalesce(b.represented_dimension_ids, array[b.dimension_id::text])));
  get diagnostics v_n_rep = row_count;
  return jsonb_build_object('outcome', 'suspended', 'review_id', v_review, 'served_instances', v_n_inst, 'observations', v_n_obs, 'reports', v_n_rep, 'cancelled_automatically', false);
end $fn$;
revoke all on function public.t3a_cr21_suspend_source(uuid, text) from public, anon;
grant execute on function public.t3a_cr21_suspend_source(uuid, text) to authenticated, service_role;

create or replace function public.t3a_cr21_impact_review(p_review uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
begin
  if not public.t3a_is_service_context() and not public.t3a_has_administrative_standing() then return jsonb_build_object('outcome', 'refused', 'reason', 'NOT_AVAILABLE'); end if;
  return jsonb_build_object('outcome', 'review', 'source_version_id', (select source_version_id from public.t3a_source_impact_review where review_id = p_review),
    'items', coalesce((select jsonb_agg(jsonb_build_object('kind', i.item_kind, 'ref', i.item_ref, 'participant_id', i.participant_id) order by i.item_kind, i.item_ref) from public.t3a_source_impact_item i where i.review_id = p_review), '[]'::jsonb));
end $fn$;
revoke all on function public.t3a_cr21_impact_review(uuid) from public, anon;
grant execute on function public.t3a_cr21_impact_review(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- CR-22. Stage 4 interruptions
-- ---------------------------------------------------------------------------------------------------------------------

create table if not exists public.t3a_s4_interruption (
  interruption_id          uuid primary key default gen_random_uuid(),
  group_session_id         uuid not null references public.t3a_d1_group_session(group_session_id),
  kind                     text not null check (kind in ('observed_withdraws', 'observed_welfare', 'role_player_withdraws', 'role_player_disconnects', 'role_player_substituted', 'technical_disconnection', 'welfare_termination')),
  affected_participant_id  uuid,
  attempt_ending           text not null,
  first_decision_reached   boolean not null,
  content_revealed         boolean not null,
  excludes_determinations  boolean not null,
  new_group_required       boolean not null,
  new_source_required      boolean not null,
  recorded_at              timestamptz not null default now()
);
create table if not exists public.t3a_s4_return_constraint (
  constraint_id       uuid primary key default gen_random_uuid(),
  participant_id      uuid not null,
  interruption_id     uuid not null references public.t3a_s4_interruption(interruption_id),
  source_version_id   uuid,
  member_ids          uuid[] not null,
  new_group_required  boolean not null,
  new_source_required boolean not null,
  recorded_at         timestamptz not null default now()
);
do $do$ declare t text; begin
  foreach t in array array['t3a_s4_interruption', 't3a_s4_return_constraint'] loop
    execute format('drop trigger if exists t3a_deny_mutation_trg on public.%I', t);
    execute format('create trigger t3a_deny_mutation_trg before update or delete on public.%I for each row execute function public.t3a_deny_mutation()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $do$;

-- One route for every interruption. The attempt ending, the return constraint and the exclusion of captured determinations follow from the kind and from two facts the session
-- reports: whether the source's first decision point was reached, and whether any content beyond the pre-brief was revealed. No finding about anyone is written.
create or replace function public.t3a_cr22_interrupt(p_group_session uuid, p_kind text, p_affected uuid default null, p_first_decision_reached boolean default false, p_content_revealed boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare gs public.t3a_d1_group_session; v_dim text; v_ending text; v_excl boolean := false; v_new_group boolean := true; v_new_source boolean := true; v_id uuid; v_end jsonb; v_members uuid[]; v_member_role text;
begin
  if not public.t3a_is_service_context() then return public.t3a_capture_refuse('s4.interrupt', 'SERVICE_ONLY', coalesce(p_group_session::text, ''), 'an interruption is recorded by the service route'); end if;
  select * into gs from public.t3a_d1_group_session where group_session_id = p_group_session;
  if gs.group_session_id is null then return public.t3a_capture_refuse('s4.interrupt', 'SESSION_NOT_FOUND', coalesce(p_group_session::text, ''), 'no such group session'); end if;
  select o.dimension_id::text into v_dim from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where v.content_version_id = gs.source_version_id;
  select coalesce(array_agg(participant_id order by participant_id), '{}') into v_members from public.t3a_d1_group_session_member where group_session_id = p_group_session;
  if p_kind in ('role_player_withdraws', 'role_player_disconnects', 'role_player_substituted') then
    select member_role into v_member_role from public.t3a_d1_group_session_member where group_session_id = p_group_session and participant_id = p_affected;
    if v_member_role is distinct from 'co_participant' then return public.t3a_capture_refuse('s4.interrupt', 'AFFECTED_IS_NOT_A_ROLE_PLAYER_OF_THIS_SESSION', coalesce(p_affected::text, ''), p_kind); end if;
  end if;
  case p_kind
    when 'observed_withdraws' then v_ending := 'withdrawal_participant_choice';
    when 'observed_welfare' then v_ending := 'welfare_stop_participant';
    when 'role_player_withdraws', 'role_player_disconnects', 'role_player_substituted' then
      -- a substitution is not permitted; it is handled as that role player's withdrawal
      v_ending := 'administration_failure';
      if p_first_decision_reached then v_excl := true; else v_new_source := p_content_revealed; end if;
    when 'technical_disconnection' then
      v_ending := 'technical_failure'; v_new_group := false; v_new_source := p_content_revealed;      -- a new session; the same source only if nothing beyond the pre-brief was revealed
    when 'welfare_termination' then
      v_ending := case when p_affected is null or p_affected = gs.observed_participant_id then 'welfare_stop_participant' else 'welfare_stop_co_participant' end;
    else return public.t3a_capture_refuse('s4.interrupt', 'INTERRUPTION_KIND_NOT_IN_CONTROLLED_SET', p_group_session::text, coalesce(p_kind, 'none'));
  end case;
  v_end := public.t3a_attempt_end(gs.observed_participant_id, v_dim, 'S4', v_ending);
  if v_end ->> 'outcome' is distinct from 'ended' then return v_end; end if;
  insert into public.t3a_s4_interruption (group_session_id, kind, affected_participant_id, attempt_ending, first_decision_reached, content_revealed, excludes_determinations, new_group_required, new_source_required)
    values (p_group_session, p_kind, p_affected, v_ending, coalesce(p_first_decision_reached, false), coalesce(p_content_revealed, false), v_excl, v_new_group, v_new_source) returning interruption_id into v_id;
  insert into public.t3a_s4_return_constraint (participant_id, interruption_id, source_version_id, member_ids, new_group_required, new_source_required)
    values (gs.observed_participant_id, v_id, gs.source_version_id, v_members, v_new_group, v_new_source);
  update public.t3a_d1_group_session set ended_at = coalesce(ended_at, now()) where group_session_id = p_group_session;
  return jsonb_build_object('outcome', 'recorded', 'interruption_id', v_id, 'attempt_ending', v_ending, 'attempt_counted', false, 'excludes_determinations', v_excl,
    'new_group_required', v_new_group, 'new_source_required', v_new_source, 'substitution_permitted', false, 'finding_recorded', false);
end $fn$;
revoke all on function public.t3a_cr22_interrupt(uuid, text, uuid, boolean, boolean) from public, anon, authenticated;
grant execute on function public.t3a_cr22_interrupt(uuid, text, uuid, boolean, boolean) to service_role;

-- Captured determinations of an interrupted session are excluded from any use.
create or replace function public.t3a_cr22_session_determinations_excluded(p_group_session uuid) returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.t3a_s4_interruption where group_session_id = p_group_session and excludes_determinations)
$fn$;
revoke all on function public.t3a_cr22_session_determinations_excluded(uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr22_session_determinations_excluded(uuid) to service_role;

-- Composing the next session for a participant who was interrupted: a new group and a new source where the interruption said so.
do $do$ begin
  if to_regprocedure('public.t3a_s4_compose_session_base(uuid,uuid,uuid,uuid[],boolean)') is null then
    alter function public.t3a_s4_compose_session(uuid, uuid, uuid, uuid[], boolean) rename to t3a_s4_compose_session_base;
  end if;
end $do$;
create or replace function public.t3a_s4_compose_session(p_source_version uuid, p_facilitator uuid, p_observed uuid, p_co uuid[], p_accommodation_settled boolean) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare k record; v_members uuid[] := (select coalesce(array_agg(x order by x), '{}') from unnest(array[p_observed] || coalesce(p_co, '{}')) x);
begin
  for k in select * from public.t3a_s4_return_constraint c where c.participant_id = p_observed order by c.recorded_at loop
    if k.new_group_required and k.member_ids = v_members then
      return public.t3a_capture_refuse('s4.compose', 'RETURN_NEEDS_A_NEW_GROUP', coalesce(p_observed::text, ''), 'the earlier session was interrupted; the return is with a new group');
    end if;
    if k.new_source_required and k.source_version_id is not distinct from p_source_version then
      return public.t3a_capture_refuse('s4.compose', 'RETURN_NEEDS_A_NEW_SOURCE', coalesce(p_observed::text, ''), 'the earlier session was interrupted; the return is on a new source');
    end if;
  end loop;
  return public.t3a_s4_compose_session_base(p_source_version, p_facilitator, p_observed, p_co, p_accommodation_settled);
end $fn$;
revoke all on function public.t3a_s4_compose_session(uuid, uuid, uuid, uuid[], boolean) from public, anon;
grant execute on function public.t3a_s4_compose_session(uuid, uuid, uuid, uuid[], boolean) to authenticated, service_role;
-- the renamed original is reachable only through the wrapper, so the return rules cannot be bypassed
revoke all on function public.t3a_s4_compose_session_base(uuid, uuid, uuid, uuid[], boolean) from public, anon, authenticated;
