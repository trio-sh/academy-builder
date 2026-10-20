-- Day 1 Domain C: observation path, Stage entry and attempts (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_c.py
-- and tools/day1/plans/domain_c_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py C      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 36 fields into t3a_field_physical_map.

-- shared helpers for Day 1 domain tables (idempotent)
create or replace function public.t3a_deny_mutation() returns trigger language plpgsql as $$
begin raise exception 'T3A_APPEND_ONLY: updates and deletes are refused; write a superseding record'; end $$;

create or replace function public.t3a_refuse_column_change() returns trigger language plpgsql as $$
declare c text;
begin
  foreach c in array tg_argv loop
    if to_jsonb(new)->c is distinct from to_jsonb(old)->c then
      raise exception 'T3A_IMMUTABLE_COLUMN: % cannot change after it is written', c;
    end if;
  end loop;
  return new;
end $$;

create or replace function public.t3a_capture_state_fill() returns trigger language plpgsql as $$
declare pair text; col text; cs text;
begin
  foreach pair in array tg_argv loop
    col := split_part(pair, ':', 1); cs := split_part(pair, ':', 2);
    if to_jsonb(new)->>col is not null then
      new := jsonb_populate_record(new, jsonb_build_object(cs, 'captured'));
    elsif to_jsonb(new)->>cs = 'captured' then
      new := jsonb_populate_record(new, jsonb_build_object(cs, 'not_captured'));
    end if;
  end loop;
  return new;
end $$;

create or replace function public.t3a_socket_closed() returns trigger language plpgsql as $$
begin raise exception 'T3A_SOCKET_ROUTE_CLOSED: % is a SOCKET structure; capture is not enabled', tg_table_name; end $$;

create table if not exists public.t3a_capture_config (
  singleton boolean primary key default true check (singleton),
  enforce_required boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.t3a_capture_config (singleton) values (true) on conflict do nothing;
alter table public.t3a_capture_config enable row level security;
revoke all on public.t3a_capture_config from anon, authenticated;

create or replace function public.t3a_require_fields() returns trigger language plpgsql as $$
declare c text;
begin
  if not (select enforce_required from public.t3a_capture_config) then return new; end if;
  foreach c in array tg_argv loop
    if to_jsonb(new)->c is null or to_jsonb(new)->c = 'null'::jsonb then
      raise exception 'T3A_REQUIRED_FIELD_MISSING: % is required on %', c, tg_table_name using errcode = '23502';
    end if;
  end loop;
  return new;
end $$;


-- t3a_observation_path_gateway: extended in place (existing rows are kept)

alter table public.t3a_observation_path_gateway add column if not exists observation_notification_timestamp timestamptz ;

alter table public.t3a_observation_path_gateway add column if not exists observation_path_completed_at timestamptz ;

drop trigger if exists t3a_2_required_fields_trg on public.t3a_observation_path_gateway;
create trigger t3a_2_required_fields_trg before insert on public.t3a_observation_path_gateway for each row execute function public.t3a_require_fields('observation_notification_timestamp');

-- t3a_stage_entry_event: extended in place (existing rows are kept)

alter table public.t3a_stage_entry_event add column if not exists administration_conditions_capture_state text not null default 'not_captured' check (administration_conditions_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_stage_entry_event add column if not exists session_id uuid ;

alter table public.t3a_stage_entry_event add column if not exists entry_authority_actor_id uuid ;

alter table public.t3a_stage_entry_event add column if not exists entry_authority_actor_id_capture_state text not null default 'not_captured' check (entry_authority_actor_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_stage_entry_event add column if not exists observation_mode text check (observation_mode is null or observation_mode in ('s1_deterministic_engine', 's2_live_video', 's3_asynchronous_submission', 's4_live_group'));

alter table public.t3a_stage_entry_event add column if not exists live_media_provider text ;

alter table public.t3a_stage_entry_event add column if not exists live_media_provider_capture_state text not null default 'not_captured' check (live_media_provider_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_stage_entry_event add column if not exists stage_entry_hold_expires_at timestamptz ;

update public.t3a_stage_entry_event set administration_conditions_capture_state = 'captured' where administration_conditions is not null and administration_conditions_capture_state = 'not_captured';

update public.t3a_stage_entry_event set entry_authority_actor_id_capture_state = 'captured' where entry_authority_actor_id is not null and entry_authority_actor_id_capture_state = 'not_captured';

update public.t3a_stage_entry_event set live_media_provider_capture_state = 'captured' where live_media_provider is not null and live_media_provider_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_stage_entry_event;
create trigger t3a_capture_state_fill before insert or update on public.t3a_stage_entry_event for each row execute function public.t3a_capture_state_fill('administration_conditions:administration_conditions_capture_state', 'entry_authority_actor_id:entry_authority_actor_id_capture_state', 'live_media_provider:live_media_provider_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_stage_entry_event;
create trigger t3a_2_required_fields_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_require_fields('session_id', 'observation_mode', 'stage_entry_hold_expires_at');

-- t3a_attempt: extended in place (existing rows are kept)

alter table public.t3a_attempt add column if not exists attempt_no integer ;

alter table public.t3a_attempt add column if not exists attempt_event_class text check (attempt_event_class is null or attempt_event_class in ('completed_observation', 'technical_failure', 'accommodation_interruption', 'administration_failure', 'cancelled_before_start', 'identity_verification_failure', 'participant_no_show', 'withdrawal_after_start_before_commit', 'welfare_stop'));

alter table public.t3a_attempt add column if not exists attempt_rules_version text check (attempt_rules_version is null or attempt_rules_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_attempt add column if not exists cooldown_class text check (cooldown_class is null or cooldown_class in ('none', 'specification_cooldown', 'rescheduling_cooldown'));

alter table public.t3a_attempt add column if not exists cooldown_class_capture_state text not null default 'not_captured' check (cooldown_class_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_attempt add column if not exists cooldown_ends_at timestamptz ;

alter table public.t3a_attempt add column if not exists cooldown_ends_at_capture_state text not null default 'not_captured' check (cooldown_ends_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_attempt add column if not exists attempt_reason text check (attempt_reason is null or attempt_reason in ('first', 'retake_after_redirect', 'retake_after_pause', 'retake_elected_after_proceed'));

alter table public.t3a_attempt add column if not exists attempt_reason_capture_state text not null default 'not_captured' check (attempt_reason_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_attempt add column if not exists prior_progression_decision_ref uuid ;

alter table public.t3a_attempt add column if not exists prior_progression_decision_ref_capture_state text not null default 'not_captured' check (prior_progression_decision_ref_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_attempt add column if not exists cooldown_completed_at timestamptz ;

alter table public.t3a_attempt add column if not exists cooldown_completed_at_capture_state text not null default 'not_captured' check (cooldown_completed_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_attempt add column if not exists s1_not_required_ruleset_id uuid ;

alter table public.t3a_attempt add column if not exists s1_not_required_ruleset_id_capture_state text not null default 'not_captured' check (s1_not_required_ruleset_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

update public.t3a_attempt set cooldown_class_capture_state = 'captured' where cooldown_class is not null and cooldown_class_capture_state = 'not_captured';

update public.t3a_attempt set cooldown_ends_at_capture_state = 'captured' where cooldown_ends_at is not null and cooldown_ends_at_capture_state = 'not_captured';

update public.t3a_attempt set attempt_reason_capture_state = 'captured' where attempt_reason is not null and attempt_reason_capture_state = 'not_captured';

update public.t3a_attempt set prior_progression_decision_ref_capture_state = 'captured' where prior_progression_decision_ref is not null and prior_progression_decision_ref_capture_state = 'not_captured';

update public.t3a_attempt set cooldown_completed_at_capture_state = 'captured' where cooldown_completed_at is not null and cooldown_completed_at_capture_state = 'not_captured';

update public.t3a_attempt set s1_not_required_ruleset_id_capture_state = 'captured' where s1_not_required_ruleset_id is not null and s1_not_required_ruleset_id_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_attempt;
create trigger t3a_capture_state_fill before insert or update on public.t3a_attempt for each row execute function public.t3a_capture_state_fill('cooldown_class:cooldown_class_capture_state', 'cooldown_ends_at:cooldown_ends_at_capture_state', 'attempt_reason:attempt_reason_capture_state', 'prior_progression_decision_ref:prior_progression_decision_ref_capture_state', 'cooldown_completed_at:cooldown_completed_at_capture_state', 's1_not_required_ruleset_id:s1_not_required_ruleset_id_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_attempt;
create trigger t3a_2_required_fields_trg before insert on public.t3a_attempt for each row execute function public.t3a_require_fields('attempt_no', 'attempt_event_class', 'attempt_rules_version');

create index if not exists t3a_attempt_sequence_idx on public.t3a_attempt (participant_id, dimension_id, stage_code, attempt_no);

-- t3a_mentor_assignment: extended in place (existing rows are kept)

alter table public.t3a_mentor_assignment add column if not exists guidance_between_stages_received boolean ;

alter table public.t3a_mentor_assignment add column if not exists guidance_between_stages_received_capture_state text not null default 'not_captured' check (guidance_between_stages_received_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_assignment add column if not exists guide_account_id uuid ;

alter table public.t3a_mentor_assignment add column if not exists guide_account_id_capture_state text not null default 'not_captured' check (guide_account_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

update public.t3a_mentor_assignment set guidance_between_stages_received_capture_state = 'captured' where guidance_between_stages_received is not null and guidance_between_stages_received_capture_state = 'not_captured';

update public.t3a_mentor_assignment set guide_account_id_capture_state = 'captured' where guide_account_id is not null and guide_account_id_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_mentor_assignment;
create trigger t3a_capture_state_fill before insert or update on public.t3a_mentor_assignment for each row execute function public.t3a_capture_state_fill('guidance_between_stages_received:guidance_between_stages_received_capture_state', 'guide_account_id:guide_account_id_capture_state');

-- t3a_observation: extended in place (existing rows are kept)

alter table public.t3a_observation add column if not exists accommodation_class_capture_state text not null default 'not_captured' check (accommodation_class_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists assistance_declaration_capture_state text not null default 'not_captured' check (assistance_declaration_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists abandonment_state_capture_state text not null default 'not_captured' check (abandonment_state_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists accommodation_applied boolean ;

alter table public.t3a_observation add column if not exists accommodation_applied_capture_state text not null default 'not_captured' check (accommodation_applied_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

update public.t3a_observation set accommodation_class_capture_state = 'captured' where accommodation_class is not null and accommodation_class_capture_state = 'not_captured';

update public.t3a_observation set assistance_declaration_capture_state = 'captured' where assistance_declaration is not null and assistance_declaration_capture_state = 'not_captured';

update public.t3a_observation set abandonment_state_capture_state = 'captured' where abandonment_state is not null and abandonment_state_capture_state = 'not_captured';

update public.t3a_observation set accommodation_applied_capture_state = 'captured' where accommodation_applied is not null and accommodation_applied_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_observation;
create trigger t3a_capture_state_fill before insert or update on public.t3a_observation for each row execute function public.t3a_capture_state_fill('accommodation_class:accommodation_class_capture_state', 'assistance_declaration:assistance_declaration_capture_state', 'abandonment_state:abandonment_state_capture_state', 'accommodation_applied:accommodation_applied_capture_state');

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'C.observation_path_gateway_id', 'M1', 't3a_observation_path_gateway', 'observation_path_gateway_id', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.gateway_opened_at', 'M3', 't3a_observation_path_gateway', 'created_at', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.coaching_terminated_at', 'M1', 't3a_observation_path_gateway', 'coaching_terminated_at', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.session_identity_method', 'M1', 't3a_observation_path_gateway', 'session_identity_method', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.assistance_rules_version', 'M1', 't3a_observation_path_gateway', 'assistance_rules_version', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.observation_notification_timestamp', 'M5', 't3a_observation_path_gateway', 'observation_notification_timestamp', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.observation_path_completed_at', 'M5', 't3a_observation_path_gateway', 'observation_path_completed_at', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.stage_entry_event_id', 'M1', 't3a_stage_entry_event', 'stage_entry_event_id', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.stage_instance_id', 'M1', 't3a_stage_entry_event', 'stage_instance_id', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.stage_code', 'M1', 't3a_stage_entry_event', 'stage_code', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.dimensions_in_play', 'M1', 't3a_stage_entry_event', 'dimensions_in_play', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.administration_conditions', 'M1', 't3a_stage_entry_event', 'administration_conditions', 'administration_conditions_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.session_id', 'M5', 't3a_stage_entry_event', 'session_id', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.entry_authority_actor_id', 'M5', 't3a_stage_entry_event', 'entry_authority_actor_id', 'entry_authority_actor_id_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.observation_mode', 'M5', 't3a_stage_entry_event', 'observation_mode', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.live_media_provider', 'M5', 't3a_stage_entry_event', 'live_media_provider', 'live_media_provider_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.stage_entry_hold_expires_at', 'M5', 't3a_stage_entry_event', 'stage_entry_hold_expires_at', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.attempt_counted', 'M3', 't3a_attempt', 'counted', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.attempt_no', 'M5', 't3a_attempt', 'attempt_no', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.attempt_event_class', 'M5', 't3a_attempt', 'attempt_event_class', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.attempt_rules_version', 'M5', 't3a_attempt', 'attempt_rules_version', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.cooldown_class', 'M5', 't3a_attempt', 'cooldown_class', 'cooldown_class_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.cooldown_ends_at', 'M5', 't3a_attempt', 'cooldown_ends_at', 'cooldown_ends_at_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.attempt_reason', 'M5', 't3a_attempt', 'attempt_reason', 'attempt_reason_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.prior_progression_decision_ref', 'M5', 't3a_attempt', 'prior_progression_decision_ref', 'prior_progression_decision_ref_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.cooldown_completed_at', 'M5', 't3a_attempt', 'cooldown_completed_at', 'cooldown_completed_at_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.s1_not_required_ruleset_id', 'M5', 't3a_attempt', 's1_not_required_ruleset_id', 's1_not_required_ruleset_id_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.mentor_assignment_id', 'M1', 't3a_mentor_assignment', 'mentor_assignment_id', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.assignment_method', 'M1', 't3a_mentor_assignment', 'assignment_method', null, 'day1-domain-C-generator', now(), 'live enum is system_allocated or coordinator_allocated; the dictionary values are automatic or coordinator (CR-039)'),
  ('1.3', 'C.prior_allocation_count', 'M1', 't3a_mentor_assignment', 'prior_allocation_count', null, 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.guidance_between_stages_received', 'M5', 't3a_mentor_assignment', 'guidance_between_stages_received', 'guidance_between_stages_received_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.guide_account_id', 'M5', 't3a_mentor_assignment', 'guide_account_id', 'guide_account_id_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.accommodation_class', 'M1', 't3a_observation', 'accommodation_class', 'accommodation_class_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.assistance_declaration', 'M1', 't3a_observation', 'assistance_declaration', 'assistance_declaration_capture_state', 'day1-domain-C-generator', now(), 'column is jsonb; the dictionary type is an enum of three values (CR-038)'),
  ('1.3', 'C.abandonment_state', 'M1', 't3a_observation', 'abandonment_state', 'abandonment_state_capture_state', 'day1-domain-C-generator', now(), null),
  ('1.3', 'C.accommodation_applied', 'M5', 't3a_observation', 'accommodation_applied', 'accommodation_applied_capture_state', 'day1-domain-C-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain C behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- DT-12: attempt_no is assigned in sequence per participant, dimension and Stage, never reused, never lowered, never deleted.
create or replace function public.t3a_attempt_sequence() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.participant_id::text || new.dimension_id || new.stage_code::text, 0));
    new.attempt_no := greatest(coalesce(new.attempt_no, 0),
      coalesce((select max(attempt_no) from public.t3a_attempt where participant_id = new.participant_id and dimension_id = new.dimension_id and stage_code = new.stage_code), 0) + 1);
    -- DT-13: a welfare stop consumes no attempt and sets no cooldown.
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
end $$;
drop trigger if exists t3a_1_attempt_sequence_trg on public.t3a_attempt;
create trigger t3a_1_attempt_sequence_trg before insert or update or delete on public.t3a_attempt for each row execute function public.t3a_attempt_sequence();

-- Number the attempts already on file, in time order (the trigger above refuses attempt_no changes, so this runs before it is live for them).
do $$
begin
  alter table public.t3a_attempt disable trigger t3a_1_attempt_sequence_trg;
  update public.t3a_attempt a set attempt_no = n.rn
    from (select attempt_id, row_number() over (partition by participant_id, dimension_id, stage_code order by created_at, attempt_id) rn from public.t3a_attempt) n
   where a.attempt_id = n.attempt_id and a.attempt_no is null;
  alter table public.t3a_attempt enable trigger t3a_1_attempt_sequence_trg;
end $$;

-- DT-11: the Stage entry event is created at the entry action. A supplied time is not trusted if it is backdated.
create or replace function public.t3a_stage_entry_time() returns trigger language plpgsql as $$
begin
  if new.entered_at is null or new.entered_at < now() - interval '5 minutes' or new.entered_at > now() + interval '1 minute' then
    if new.entered_at is not null and new.entered_at < now() - interval '5 minutes' then
      raise exception 'T3A_STAGE_ENTRY_BACKDATED: the Stage entry event is created at the entry action, not at allocation or any earlier time' using errcode = '22023';
    end if;
    new.entered_at := now();
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_stage_entry_time_trg on public.t3a_stage_entry_event;
create trigger t3a_1_stage_entry_time_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_stage_entry_time();
