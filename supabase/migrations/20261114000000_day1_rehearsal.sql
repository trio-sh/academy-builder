-- Day 1 Domain K: private rehearsal (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_k.py
-- and tools/day1/plans/domain_k_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py K      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 40 fields into t3a_field_physical_map.

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


-- t3a_rehearsal_session: extended in place (existing rows are kept)

alter table public.t3a_rehearsal_session add column if not exists rehearsal_started_at_capture_state text not null default 'not_captured' check (rehearsal_started_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_rehearsal_session add column if not exists rehearsal_completed_at_capture_state text not null default 'not_captured' check (rehearsal_completed_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_rehearsal_session add column if not exists module_id uuid ;

alter table public.t3a_rehearsal_session add column if not exists module_version text check (module_version is null or module_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_rehearsal_session add column if not exists workplace_moment_id uuid ;

alter table public.t3a_rehearsal_session add column if not exists rehearsal_completion_state text check (rehearsal_completion_state is null or rehearsal_completion_state in ('complete', 'partial', 'abandoned'));

alter table public.t3a_rehearsal_session add column if not exists rehearsal_completion_state_capture_state text not null default 'not_captured' check (rehearsal_completion_state_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_rehearsal_session add column if not exists rehearsal_choice_record_id uuid ;

alter table public.t3a_rehearsal_session add column if not exists module_dimension_id uuid ;

alter table public.t3a_rehearsal_session add column if not exists module_dimension_id_capture_state text not null default 'not_captured' check (module_dimension_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_rehearsal_session add column if not exists module_segment_id uuid ;

alter table public.t3a_rehearsal_session add column if not exists module_segment_id_capture_state text not null default 'not_captured' check (module_segment_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_rehearsal_session add column if not exists private_scenario_id uuid ;

alter table public.t3a_rehearsal_session add column if not exists private_scenario_id_capture_state text not null default 'not_captured' check (private_scenario_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_rehearsal_session add column if not exists private_scenario_version text check (private_scenario_version is null or private_scenario_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_rehearsal_session add column if not exists private_scenario_version_capture_state text not null default 'not_captured' check (private_scenario_version_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_rehearsal_session add column if not exists variant_tuple jsonb ;

alter table public.t3a_rehearsal_session add column if not exists variant_tuple_capture_state text not null default 'not_captured' check (variant_tuple_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_rehearsal_session add column if not exists response_modality text check (response_modality is null or response_modality in ('text', 'voice', 'accessible_alternative'));

alter table public.t3a_rehearsal_session add column if not exists response_modality_capture_state text not null default 'not_captured' check (response_modality_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_rehearsal_session add column if not exists voice_transcript_ref uuid ;

alter table public.t3a_rehearsal_session add column if not exists voice_transcript_ref_capture_state text not null default 'not_captured' check (voice_transcript_ref_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

update public.t3a_rehearsal_session set rehearsal_started_at_capture_state = 'captured' where started_at is not null and rehearsal_started_at_capture_state = 'not_captured';

update public.t3a_rehearsal_session set rehearsal_completed_at_capture_state = 'captured' where ended_at is not null and rehearsal_completed_at_capture_state = 'not_captured';

update public.t3a_rehearsal_session set rehearsal_completion_state_capture_state = 'captured' where rehearsal_completion_state is not null and rehearsal_completion_state_capture_state = 'not_captured';

update public.t3a_rehearsal_session set module_dimension_id_capture_state = 'captured' where module_dimension_id is not null and module_dimension_id_capture_state = 'not_captured';

update public.t3a_rehearsal_session set module_segment_id_capture_state = 'captured' where module_segment_id is not null and module_segment_id_capture_state = 'not_captured';

update public.t3a_rehearsal_session set private_scenario_id_capture_state = 'captured' where private_scenario_id is not null and private_scenario_id_capture_state = 'not_captured';

update public.t3a_rehearsal_session set private_scenario_version_capture_state = 'captured' where private_scenario_version is not null and private_scenario_version_capture_state = 'not_captured';

update public.t3a_rehearsal_session set variant_tuple_capture_state = 'captured' where variant_tuple is not null and variant_tuple_capture_state = 'not_captured';

update public.t3a_rehearsal_session set response_modality_capture_state = 'captured' where response_modality is not null and response_modality_capture_state = 'not_captured';

update public.t3a_rehearsal_session set voice_transcript_ref_capture_state = 'captured' where voice_transcript_ref is not null and voice_transcript_ref_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_rehearsal_session;
create trigger t3a_capture_state_fill before insert or update on public.t3a_rehearsal_session for each row execute function public.t3a_capture_state_fill('started_at:rehearsal_started_at_capture_state', 'ended_at:rehearsal_completed_at_capture_state', 'rehearsal_completion_state:rehearsal_completion_state_capture_state', 'module_dimension_id:module_dimension_id_capture_state', 'module_segment_id:module_segment_id_capture_state', 'private_scenario_id:private_scenario_id_capture_state', 'private_scenario_version:private_scenario_version_capture_state', 'variant_tuple:variant_tuple_capture_state', 'response_modality:response_modality_capture_state', 'voice_transcript_ref:voice_transcript_ref_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_rehearsal_session;
create trigger t3a_2_required_fields_trg before insert on public.t3a_rehearsal_session for each row execute function public.t3a_require_fields('module_id', 'module_version', 'workplace_moment_id');

-- t3a_coaching_feedback: extended in place (existing rows are kept)

alter table public.t3a_coaching_feedback add column if not exists feedback_acknowledged_at_capture_state text not null default 'not_captured' check (feedback_acknowledged_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_coaching_feedback add column if not exists feedback_source_type text check (feedback_source_type is null or feedback_source_type in ('canned_reference', 'self_reflection', 'human_developmental'));

alter table public.t3a_coaching_feedback add column if not exists feedback_source_type_capture_state text not null default 'not_captured' check (feedback_source_type_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_coaching_feedback add column if not exists feedback_viewed_at timestamptz ;

alter table public.t3a_coaching_feedback add column if not exists feedback_viewed_at_capture_state text not null default 'not_captured' check (feedback_viewed_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

update public.t3a_coaching_feedback set feedback_acknowledged_at_capture_state = 'captured' where acknowledged_at is not null and feedback_acknowledged_at_capture_state = 'not_captured';

update public.t3a_coaching_feedback set feedback_source_type_capture_state = 'captured' where feedback_source_type is not null and feedback_source_type_capture_state = 'not_captured';

update public.t3a_coaching_feedback set feedback_viewed_at_capture_state = 'captured' where feedback_viewed_at is not null and feedback_viewed_at_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_coaching_feedback;
create trigger t3a_capture_state_fill before insert or update on public.t3a_coaching_feedback for each row execute function public.t3a_capture_state_fill('acknowledged_at:feedback_acknowledged_at_capture_state', 'feedback_source_type:feedback_source_type_capture_state', 'feedback_viewed_at:feedback_viewed_at_capture_state');

-- t3a_rehearsal_telemetry_aggregate: extended in place (existing rows are kept)

create table if not exists public.t3a_rehearsal_attempt (
  participant_id uuid not null references public.t3a_account(account_id),
  rehearsal_session_id uuid not null references public.t3a_rehearsal_session(rehearsal_session_id),
  rehearsal_attempt_id uuid primary key default gen_random_uuid(),
  rehearsal_attempt_no integer not null,
  module_completion_state text,
  module_completion_state_capture_state text not null default 'not_captured' check (module_completion_state_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  module_completion_at timestamptz,
  module_completion_at_capture_state text not null default 'not_captured' check (module_completion_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  rehearsal_decision_path_ref uuid,
  participant_artifact_ref uuid,
  participant_artifact_version text,
  participant_reflection_ref uuid,
  reflection_prompt_id uuid,
  reflection_prompt_version text,
  final_personal_sentence_ref uuid,
  reference_examples_viewed_refs uuid[],
  consequence_horizons_displayed jsonb,
  retention_check_instance_id uuid,
  retention_check_instance_id_capture_state text not null default 'not_captured' check (retention_check_instance_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  retention_check_status text,
  retention_check_status_capture_state text not null default 'not_captured' check (retention_check_status_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  recorded_at timestamptz not null default now(),
  check (module_completion_state is null or module_completion_state in ('complete', 'partial', 'abandoned')),
  check ((module_completion_state is not null) = (module_completion_state_capture_state = 'captured')),
  check ((module_completion_at is not null) = (module_completion_at_capture_state = 'captured')),
  check (participant_artifact_version is null or participant_artifact_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (reflection_prompt_version is null or reflection_prompt_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check ((retention_check_instance_id is not null) = (retention_check_instance_id_capture_state = 'captured')),
  check (retention_check_status is null or retention_check_status in ('pending', 'served', 'completed', 'declined', 'expired')),
  check ((retention_check_status is not null) = (retention_check_status_capture_state = 'captured')),
  check (module_completion_state is distinct from 'complete' or module_completion_at is not null)
);

comment on table public.t3a_rehearsal_attempt is 'Domain K rehearsal attempts: private, participant only, never evidence. Pointers to the participant''s own artifacts, not copies.';

drop trigger if exists t3a_capture_state_fill on public.t3a_rehearsal_attempt;
create trigger t3a_capture_state_fill before insert or update on public.t3a_rehearsal_attempt for each row execute function public.t3a_capture_state_fill('module_completion_state:module_completion_state_capture_state', 'module_completion_at:module_completion_at_capture_state', 'retention_check_instance_id:retention_check_instance_id_capture_state', 'retention_check_status:retention_check_status_capture_state');

drop trigger if exists t3a_append_only on public.t3a_rehearsal_attempt;
create trigger t3a_append_only before update or delete on public.t3a_rehearsal_attempt for each row execute function public.t3a_deny_mutation();

alter table public.t3a_rehearsal_attempt enable row level security;
revoke all on public.t3a_rehearsal_attempt from anon, authenticated;

grant select (participant_id, rehearsal_session_id, rehearsal_attempt_id, rehearsal_attempt_no, module_completion_state, module_completion_at, rehearsal_decision_path_ref, participant_artifact_ref, participant_artifact_version, participant_reflection_ref, reflection_prompt_id, reflection_prompt_version, final_personal_sentence_ref, reference_examples_viewed_refs, consequence_horizons_displayed, retention_check_instance_id, retention_check_status, module_completion_state_capture_state, module_completion_at_capture_state, retention_check_instance_id_capture_state, retention_check_status_capture_state, recorded_at) on public.t3a_rehearsal_attempt to authenticated;

drop policy if exists t3a_rehearsal_attempt_own_read on public.t3a_rehearsal_attempt;
create policy t3a_rehearsal_attempt_own_read on public.t3a_rehearsal_attempt for select to authenticated using (participant_id = auth.uid());

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'K.rehearsal_session_id', 'M1', 't3a_rehearsal_session', 'rehearsal_session_id', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.rehearsal_started_at', 'M3', 't3a_rehearsal_session', 'started_at', 'rehearsal_started_at_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.rehearsal_completed_at', 'M3', 't3a_rehearsal_session', 'ended_at', 'rehearsal_completed_at_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.module_id', 'M5', 't3a_rehearsal_session', 'module_id', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.module_version', 'M5', 't3a_rehearsal_session', 'module_version', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.workplace_moment_id', 'M5', 't3a_rehearsal_session', 'workplace_moment_id', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.rehearsal_completion_state', 'M5', 't3a_rehearsal_session', 'rehearsal_completion_state', 'rehearsal_completion_state_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.rehearsal_choice_record_id', 'M5', 't3a_rehearsal_session', 'rehearsal_choice_record_id', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.module_dimension_id', 'M5', 't3a_rehearsal_session', 'module_dimension_id', 'module_dimension_id_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.module_segment_id', 'M5', 't3a_rehearsal_session', 'module_segment_id', 'module_segment_id_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.private_scenario_id', 'M5', 't3a_rehearsal_session', 'private_scenario_id', 'private_scenario_id_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.private_scenario_version', 'M5', 't3a_rehearsal_session', 'private_scenario_version', 'private_scenario_version_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.variant_tuple', 'M5', 't3a_rehearsal_session', 'variant_tuple', 'variant_tuple_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.response_modality', 'M5', 't3a_rehearsal_session', 'response_modality', 'response_modality_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.voice_transcript_ref', 'M5', 't3a_rehearsal_session', 'voice_transcript_ref', 'voice_transcript_ref_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.feedback_acknowledged_at', 'M3', 't3a_coaching_feedback', 'acknowledged_at', 'feedback_acknowledged_at_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.feedback_source_type', 'M5', 't3a_coaching_feedback', 'feedback_source_type', 'feedback_source_type_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.feedback_viewed_at', 'M5', 't3a_coaching_feedback', 'feedback_viewed_at', 'feedback_viewed_at_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.cohort_period', 'M1', 't3a_rehearsal_telemetry_aggregate', 'cohort_period', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.sessions_started', 'M1', 't3a_rehearsal_telemetry_aggregate', 'sessions_started', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.sessions_completed', 'M1', 't3a_rehearsal_telemetry_aggregate', 'sessions_completed', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.feedback_generated_count', 'M1', 't3a_rehearsal_telemetry_aggregate', 'feedback_generated_count', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.feedback_acknowledged_count', 'M1', 't3a_rehearsal_telemetry_aggregate', 'feedback_acknowledged_count', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.retake_within_window_count', 'M1', 't3a_rehearsal_telemetry_aggregate', 'retake_within_window_count', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.duration_distribution', 'M1', 't3a_rehearsal_telemetry_aggregate', 'duration_distribution', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.rehearsal_attempt_id', 'M5', 't3a_rehearsal_attempt', 'rehearsal_attempt_id', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.rehearsal_attempt_no', 'M5', 't3a_rehearsal_attempt', 'rehearsal_attempt_no', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.module_completion_state', 'M5', 't3a_rehearsal_attempt', 'module_completion_state', 'module_completion_state_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.module_completion_at', 'M5', 't3a_rehearsal_attempt', 'module_completion_at', 'module_completion_at_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.rehearsal_decision_path_ref', 'M5', 't3a_rehearsal_attempt', 'rehearsal_decision_path_ref', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.participant_artifact_ref', 'M5', 't3a_rehearsal_attempt', 'participant_artifact_ref', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.participant_artifact_version', 'M5', 't3a_rehearsal_attempt', 'participant_artifact_version', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.participant_reflection_ref', 'M5', 't3a_rehearsal_attempt', 'participant_reflection_ref', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.reflection_prompt_id', 'M5', 't3a_rehearsal_attempt', 'reflection_prompt_id', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.reflection_prompt_version', 'M5', 't3a_rehearsal_attempt', 'reflection_prompt_version', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.final_personal_sentence_ref', 'M5', 't3a_rehearsal_attempt', 'final_personal_sentence_ref', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.reference_examples_viewed_refs', 'M5', 't3a_rehearsal_attempt', 'reference_examples_viewed_refs', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.consequence_horizons_displayed', 'M5', 't3a_rehearsal_attempt', 'consequence_horizons_displayed', null, 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.retention_check_instance_id', 'M5', 't3a_rehearsal_attempt', 'retention_check_instance_id', 'retention_check_instance_id_capture_state', 'day1-domain-K-generator', now(), null),
  ('1.3', 'K.retention_check_status', 'M5', 't3a_rehearsal_attempt', 'retention_check_status', 'retention_check_status_capture_state', 'day1-domain-K-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain K behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- The aggregate telemetry table is a SOCKET: structure only, every write refused until it is activated.
drop trigger if exists t3a_socket_closed on public.t3a_rehearsal_telemetry_aggregate;
create trigger t3a_socket_closed before insert or update on public.t3a_rehearsal_telemetry_aggregate for each row execute function public.t3a_socket_closed();

-- Rehearsal attempt numbers run in sequence per participant and module and never go down.
create or replace function public.t3a_rehearsal_attempt_seq() returns trigger language plpgsql security definer set search_path = public as $$
begin
  select coalesce(max(a.rehearsal_attempt_no), 0) + 1 into new.rehearsal_attempt_no
    from public.t3a_rehearsal_attempt a where a.participant_id = new.participant_id and a.rehearsal_session_id = new.rehearsal_session_id;
  return new;
end $$;
drop trigger if exists t3a_0_rehearsal_attempt_seq_trg on public.t3a_rehearsal_attempt;
create trigger t3a_0_rehearsal_attempt_seq_trg before insert on public.t3a_rehearsal_attempt for each row execute function public.t3a_rehearsal_attempt_seq();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 't3a_rehearsal_session_state_chk') then
    alter table public.t3a_rehearsal_session add constraint t3a_rehearsal_session_state_chk check (rehearsal_completion_state is null or rehearsal_completion_state in ('complete', 'partial', 'abandoned')) not valid;
    alter table public.t3a_rehearsal_session add constraint t3a_rehearsal_session_modality_chk check (response_modality is null or response_modality in ('text', 'voice', 'accessible_alternative')) not valid;
    alter table public.t3a_rehearsal_attempt add constraint t3a_rehearsal_attempt_state_chk check (module_completion_state is null or module_completion_state in ('complete', 'partial', 'abandoned')) not valid;
    alter table public.t3a_rehearsal_attempt add constraint t3a_rehearsal_attempt_retention_chk check (retention_check_status is null or retention_check_status in ('pending', 'served', 'completed', 'declined', 'expired')) not valid;
    alter table public.t3a_coaching_feedback add constraint t3a_coaching_feedback_source_chk check (feedback_source_type is null or feedback_source_type in ('canned_reference', 'self_reflection', 'human_developmental')) not valid;
  end if;
end $$;

-- The rehearsal firewall (DT-32): this function reports any foreign key between the rehearsal store and the evidence store.
-- It returns no rows when the boundary is intact.
create or replace function public.t3a_rehearsal_firewall_findings() returns table (child_table text, parent_table text, constraint_name text)
language sql stable security definer set search_path = public as $$
  with rehearsal as (select c.oid, c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname in
      ('t3a_rehearsal_session', 't3a_rehearsal_attempt', 't3a_rehearsal_activity_history', 't3a_rehearsal_artifact', 't3a_coaching_feedback', 't3a_rehearsal_telemetry_aggregate', 't3a_growth_log_entry')),
  evidence as (select c.oid, c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname in
      ('t3a_observation', 't3a_observation_record', 't3a_attempt', 't3a_stage_entry_event', 't3a_stage_instance', 't3a_observation_path_gateway', 't3a_d1_ber_report',
       't3a_d1_report_issuance', 't3a_determination', 't3a_dimension_evidence', 't3a_challenge_case', 't3a_mentor_judgment', 't3a_d1_progression_decision'))
  select cl.relname::text, pl.relname::text, k.conname::text from pg_constraint k
    join pg_class cl on cl.oid = k.conrelid join pg_class pl on pl.oid = k.confrelid
   where k.contype = 'f' and ((cl.oid in (select oid from rehearsal) and pl.oid in (select oid from evidence))
                           or (cl.oid in (select oid from evidence) and pl.oid in (select oid from rehearsal)))
$$;
revoke all on function public.t3a_rehearsal_firewall_findings() from public, anon, authenticated;
grant execute on function public.t3a_rehearsal_firewall_findings() to service_role;
