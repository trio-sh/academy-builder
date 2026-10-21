-- Day 1 Domain E: observation record, determinations and progression (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_e.py
-- and tools/day1/plans/domain_e_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py E      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 78 fields into t3a_field_physical_map.

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


-- t3a_observation: extended in place (existing rows are kept)

alter table public.t3a_observation add column if not exists administration_variance_capture_state text not null default 'not_captured' check (administration_variance_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists comparability_class_capture_state text not null default 'not_captured' check (comparability_class_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists submission_origin_capture_state text not null default 'not_captured' check (submission_origin_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists served_instance_id uuid ;

alter table public.t3a_observation add column if not exists captured_at timestamptz ;

alter table public.t3a_observation add column if not exists capture_delay_seconds integer ;

alter table public.t3a_observation add column if not exists observer_role text check (observer_role is null or observer_role in ('primary_observer', 'second_independent_observer', 'silent_supervisor', 'facilitator_observer'));

alter table public.t3a_observation add column if not exists observer_authorization_snapshot_ref uuid ;

alter table public.t3a_observation add column if not exists s1_human_confirmation_actor_id uuid ;

alter table public.t3a_observation add column if not exists s1_human_confirmation_at timestamptz ;

alter table public.t3a_observation add column if not exists response_artifact_ref uuid ;

alter table public.t3a_observation add column if not exists response_artifact_ref_capture_state text not null default 'not_captured' check (response_artifact_ref_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists response_sequence_number integer ;

alter table public.t3a_observation add column if not exists response_sequence_number_capture_state text not null default 'not_captured' check (response_sequence_number_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists response_submitted_at timestamptz ;

alter table public.t3a_observation add column if not exists response_submitted_at_capture_state text not null default 'not_captured' check (response_submitted_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists s3_submission_provenance jsonb ;

alter table public.t3a_observation add column if not exists beat_code text ;

alter table public.t3a_observation add column if not exists beat_code_capture_state text not null default 'not_captured' check (beat_code_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists beat_started_at timestamptz ;

alter table public.t3a_observation add column if not exists beat_started_at_capture_state text not null default 'not_captured' check (beat_started_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists data_source text check (data_source is null or data_source in ('observed', 'stated_by_participant', 'mentor_entered', 'system_derived', 'employer_reported'));

alter table public.t3a_observation add column if not exists record_snapshot_hash char(64) check (record_snapshot_hash is null or record_snapshot_hash ~ '^[0-9a-f]{64}$');

alter table public.t3a_observation add column if not exists evidence_currency_expires_at timestamptz ;

alter table public.t3a_observation add column if not exists session_started_at timestamptz ;

alter table public.t3a_observation add column if not exists session_started_at_capture_state text not null default 'not_captured' check (session_started_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists session_ended_at timestamptz ;

alter table public.t3a_observation add column if not exists session_ended_at_capture_state text not null default 'not_captured' check (session_ended_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists session_serving_state text check (session_serving_state is null or session_serving_state in ('not_served', 'served', 'aborted', 'completed'));

alter table public.t3a_observation add column if not exists session_admin_state text check (session_admin_state is null or session_admin_state in ('normal', 'disrupted', 'withdrawn', 'welfare_stopped', 'corrected'));

alter table public.t3a_observation add column if not exists question_serving_state text check (question_serving_state is null or question_serving_state in ('direct', 'conditional', 'not_served'));

alter table public.t3a_observation add column if not exists branch_trigger_ref uuid ;

alter table public.t3a_observation add column if not exists prompt_material_sequence jsonb ;

alter table public.t3a_observation add column if not exists prompt_material_sequence_capture_state text not null default 'not_captured' check (prompt_material_sequence_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists observed_opportunity_ref uuid ;

alter table public.t3a_observation add column if not exists observed_opportunity_ref_capture_state text not null default 'not_captured' check (observed_opportunity_ref_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists observation_authorization_ref uuid ;

alter table public.t3a_observation add column if not exists prior_exposure_known_state text check (prior_exposure_known_state is null or prior_exposure_known_state in ('known_exposure', 'no_known_exposure', 'not_collected'));

alter table public.t3a_observation add column if not exists prior_exposure_known_state_capture_state text not null default 'not_captured' check (prior_exposure_known_state_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists observer_calibration_version text check (observer_calibration_version is null or observer_calibration_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_observation add column if not exists observer_independence_state text check (observer_independence_state is null or observer_independence_state in ('independent', 'conflict_declared', 'excluded_by_rule'));

alter table public.t3a_observation add column if not exists reviewer_independence_state text check (reviewer_independence_state is null or reviewer_independence_state in ('independent', 'conflict_declared', 'excluded_by_rule'));

alter table public.t3a_observation add column if not exists capture_edit_history_ref uuid ;

alter table public.t3a_observation add column if not exists technical_issue_codes text[] ;

alter table public.t3a_observation add column if not exists technical_issue_codes_capture_state text not null default 'not_captured' check (technical_issue_codes_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_observation add column if not exists observer_disagreement_refs uuid[] ;

update public.t3a_observation set administration_variance_capture_state = 'captured' where administration_variance is not null and administration_variance_capture_state = 'not_captured';

update public.t3a_observation set comparability_class_capture_state = 'captured' where comparability_class is not null and comparability_class_capture_state = 'not_captured';

update public.t3a_observation set submission_origin_capture_state = 'captured' where submission_origin is not null and submission_origin_capture_state = 'not_captured';

update public.t3a_observation set response_artifact_ref_capture_state = 'captured' where response_artifact_ref is not null and response_artifact_ref_capture_state = 'not_captured';

update public.t3a_observation set response_sequence_number_capture_state = 'captured' where response_sequence_number is not null and response_sequence_number_capture_state = 'not_captured';

update public.t3a_observation set response_submitted_at_capture_state = 'captured' where response_submitted_at is not null and response_submitted_at_capture_state = 'not_captured';

update public.t3a_observation set beat_code_capture_state = 'captured' where beat_code is not null and beat_code_capture_state = 'not_captured';

update public.t3a_observation set beat_started_at_capture_state = 'captured' where beat_started_at is not null and beat_started_at_capture_state = 'not_captured';

update public.t3a_observation set session_started_at_capture_state = 'captured' where session_started_at is not null and session_started_at_capture_state = 'not_captured';

update public.t3a_observation set session_ended_at_capture_state = 'captured' where session_ended_at is not null and session_ended_at_capture_state = 'not_captured';

update public.t3a_observation set prompt_material_sequence_capture_state = 'captured' where prompt_material_sequence is not null and prompt_material_sequence_capture_state = 'not_captured';

update public.t3a_observation set observed_opportunity_ref_capture_state = 'captured' where observed_opportunity_ref is not null and observed_opportunity_ref_capture_state = 'not_captured';

update public.t3a_observation set prior_exposure_known_state_capture_state = 'captured' where prior_exposure_known_state is not null and prior_exposure_known_state_capture_state = 'not_captured';

update public.t3a_observation set technical_issue_codes_capture_state = 'captured' where technical_issue_codes is not null and technical_issue_codes_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_observation;
create trigger t3a_capture_state_fill before insert or update on public.t3a_observation for each row execute function public.t3a_capture_state_fill('administration_variance:administration_variance_capture_state', 'comparability_class:comparability_class_capture_state', 'submission_origin:submission_origin_capture_state', 'response_artifact_ref:response_artifact_ref_capture_state', 'response_sequence_number:response_sequence_number_capture_state', 'response_submitted_at:response_submitted_at_capture_state', 'beat_code:beat_code_capture_state', 'beat_started_at:beat_started_at_capture_state', 'session_started_at:session_started_at_capture_state', 'session_ended_at:session_ended_at_capture_state', 'prompt_material_sequence:prompt_material_sequence_capture_state', 'observed_opportunity_ref:observed_opportunity_ref_capture_state', 'prior_exposure_known_state:prior_exposure_known_state_capture_state', 'technical_issue_codes:technical_issue_codes_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_observation;
create trigger t3a_2_required_fields_trg before insert on public.t3a_observation for each row execute function public.t3a_require_fields('served_instance_id', 'captured_at', 'capture_delay_seconds', 'observer_role', 'observer_authorization_snapshot_ref', 's1_human_confirmation_actor_id', 's1_human_confirmation_at', 's3_submission_provenance', 'data_source', 'record_snapshot_hash', 'evidence_currency_expires_at', 'session_serving_state', 'session_admin_state', 'question_serving_state', 'branch_trigger_ref', 'observation_authorization_ref', 'observer_calibration_version', 'observer_independence_state', 'reviewer_independence_state');

create index if not exists t3a_observation_served_idx on public.t3a_observation (served_instance_id) where served_instance_id is not null;

-- t3a_d1_progression_decision: extended in place (existing rows are kept)

alter table public.t3a_d1_progression_decision add column if not exists decided_by uuid ;

alter table public.t3a_d1_progression_decision add column if not exists decided_at timestamptz ;

alter table public.t3a_d1_progression_decision add column if not exists decision_scope jsonb ;

alter table public.t3a_d1_progression_decision add column if not exists decision_rationale_code text ;

alter table public.t3a_d1_progression_decision add column if not exists decision_rationale_code_capture_state text not null default 'not_captured' check (decision_rationale_code_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_d1_progression_decision add column if not exists corrected_decision_ref uuid ;

alter table public.t3a_d1_progression_decision add column if not exists original_decision_date timestamptz ;

alter table public.t3a_d1_progression_decision add column if not exists correction_effective_date timestamptz ;

alter table public.t3a_d1_progression_decision add column if not exists welfare_stop_ref uuid ;

update public.t3a_d1_progression_decision set decision_rationale_code_capture_state = 'captured' where decision_rationale_code is not null and decision_rationale_code_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_d1_progression_decision;
create trigger t3a_capture_state_fill before insert or update on public.t3a_d1_progression_decision for each row execute function public.t3a_capture_state_fill('decision_rationale_code:decision_rationale_code_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_d1_progression_decision;
create trigger t3a_2_required_fields_trg before insert on public.t3a_d1_progression_decision for each row execute function public.t3a_require_fields('decided_by', 'decided_at', 'decision_scope');

-- t3a_mentor_judgment: extended in place (existing rows are kept)

-- t3a_composed_statement: extended in place (existing rows are kept)

alter table public.t3a_composed_statement add column if not exists statement_version text check (statement_version is null or statement_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_composed_statement add column if not exists statement_digest char(64) check (statement_digest is null or statement_digest ~ '^[0-9a-f]{64}$');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_composed_statement;
create trigger t3a_2_required_fields_trg before insert on public.t3a_composed_statement for each row execute function public.t3a_require_fields('statement_version', 'statement_digest');

create table if not exists public.t3a_stage_sequence (
  stage_instance_id uuid primary key references public.t3a_stage_instance(stage_instance_id),
  participant_id uuid not null,
  dimension_id text not null,
  s1_outcome_delivered_to_mentor_at timestamptz,
  s2_determinations_locked_at timestamptz,
  s1_output_unmasked_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.t3a_stage_sequence is 'Domain E sequence milestones per Stage instance (sequential unmasking). Each time is set once and never changed.';

alter table public.t3a_stage_sequence enable row level security;
revoke all on public.t3a_stage_sequence from anon, authenticated;

create table if not exists public.t3a_determination (
  observation_id uuid not null references public.t3a_observation(observation_id),
  determination_id uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  answer_option_id uuid,
  list_selection_ids uuid[],
  determination_missing_state text,
  determination_missing_state_capture_state text not null default 'not_captured' check (determination_missing_state_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  determined_by uuid not null,
  determined_at timestamptz not null default now(),
  clause_instance_id uuid not null,
  conduct_element_id uuid not null,
  recurrence_equivalence_key_id uuid not null,
  state_code text not null,
  foreign key (question_id) references public.t3a_determination_question(question_id),
  check ((determination_missing_state is not null) = (determination_missing_state_capture_state = 'captured')),
  check (state_code ~ '^[A-Za-z0-9_.:-]{1,64}$')
);

comment on table public.t3a_determination is 'Domain E determinations: a controlled answer to a controlled question. Codes and identifiers only; there is no free text column.';

drop trigger if exists t3a_capture_state_fill on public.t3a_determination;
create trigger t3a_capture_state_fill before insert or update on public.t3a_determination for each row execute function public.t3a_capture_state_fill('determination_missing_state:determination_missing_state_capture_state');

drop trigger if exists t3a_append_only on public.t3a_determination;
create trigger t3a_append_only before update or delete on public.t3a_determination for each row execute function public.t3a_deny_mutation();

alter table public.t3a_determination enable row level security;
revoke all on public.t3a_determination from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'E.observation_id', 'M1', 't3a_observation', 'observation_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.participant_id', 'M1', 't3a_observation', 'participant_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.dimension_id', 'M1', 't3a_observation', 'dimension_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.stage_code', 'M1', 't3a_observation', 'stage_code', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.stage_instance_id', 'M1', 't3a_observation', 'stage_instance_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.source_version_id', 'M1', 't3a_observation', 'source_version_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.contemporaneity', 'M1', 't3a_observation', 'contemporaneity', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.observer_id', 'M1', 't3a_observation', 'observer_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.evidence_class', 'M1', 't3a_observation', 'evidence_class', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.administration_variance', 'M1', 't3a_observation', 'administration_variance', 'administration_variance_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.comparability_class', 'M1', 't3a_observation', 'comparability_class', 'comparability_class_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.integrity_status', 'M1', 't3a_observation', 'integrity_status', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.supersedes', 'M1', 't3a_observation', 'supersedes', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.superseded_by', 'M1', 't3a_observation', 'superseded_by', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.observed_at', 'M3', 't3a_observation', 'occurred_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.committed_at', 'M3', 't3a_observation', 'created_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.submission_origin', 'M1', 't3a_observation', 'submission_origin', 'submission_origin_capture_state', 'day1-domain-E-generator', now(), 'live column is jsonb; the dictionary type is an enum of three values (CR-046)'),
  ('1.3', 'E.served_instance_id', 'M5', 't3a_observation', 'served_instance_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.captured_at', 'M5', 't3a_observation', 'captured_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.capture_delay_seconds', 'M5', 't3a_observation', 'capture_delay_seconds', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.observer_role', 'M5', 't3a_observation', 'observer_role', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.observer_authorization_snapshot_ref', 'M5', 't3a_observation', 'observer_authorization_snapshot_ref', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.s1_human_confirmation_actor_id', 'M5', 't3a_observation', 's1_human_confirmation_actor_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.s1_human_confirmation_at', 'M5', 't3a_observation', 's1_human_confirmation_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.response_artifact_ref', 'M5', 't3a_observation', 'response_artifact_ref', 'response_artifact_ref_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.response_sequence_number', 'M5', 't3a_observation', 'response_sequence_number', 'response_sequence_number_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.response_submitted_at', 'M5', 't3a_observation', 'response_submitted_at', 'response_submitted_at_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.s3_submission_provenance', 'M5', 't3a_observation', 's3_submission_provenance', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.beat_code', 'M5', 't3a_observation', 'beat_code', 'beat_code_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.beat_started_at', 'M5', 't3a_observation', 'beat_started_at', 'beat_started_at_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.data_source', 'M5', 't3a_observation', 'data_source', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.record_snapshot_hash', 'M5', 't3a_observation', 'record_snapshot_hash', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.evidence_currency_expires_at', 'M5', 't3a_observation', 'evidence_currency_expires_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.session_started_at', 'M5', 't3a_observation', 'session_started_at', 'session_started_at_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.session_ended_at', 'M5', 't3a_observation', 'session_ended_at', 'session_ended_at_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.session_serving_state', 'M5', 't3a_observation', 'session_serving_state', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.session_admin_state', 'M5', 't3a_observation', 'session_admin_state', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.question_serving_state', 'M5', 't3a_observation', 'question_serving_state', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.branch_trigger_ref', 'M5', 't3a_observation', 'branch_trigger_ref', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.prompt_material_sequence', 'M5', 't3a_observation', 'prompt_material_sequence', 'prompt_material_sequence_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.observed_opportunity_ref', 'M5', 't3a_observation', 'observed_opportunity_ref', 'observed_opportunity_ref_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.observation_authorization_ref', 'M5', 't3a_observation', 'observation_authorization_ref', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.prior_exposure_known_state', 'M5', 't3a_observation', 'prior_exposure_known_state', 'prior_exposure_known_state_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.observer_calibration_version', 'M5', 't3a_observation', 'observer_calibration_version', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.observer_independence_state', 'M5', 't3a_observation', 'observer_independence_state', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.reviewer_independence_state', 'M5', 't3a_observation', 'reviewer_independence_state', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.capture_edit_history_ref', 'M5', 't3a_observation', 'capture_edit_history_ref', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.technical_issue_codes', 'M5', 't3a_observation', 'technical_issue_codes', 'technical_issue_codes_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.observer_disagreement_refs', 'M5', 't3a_observation', 'observer_disagreement_refs', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.progression_decision_id', 'M1', 't3a_d1_progression_decision', 'progression_decision_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.decision', 'M1', 't3a_d1_progression_decision', 'decision', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.decided_by', 'M5', 't3a_d1_progression_decision', 'decided_by', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.decided_at', 'M5', 't3a_d1_progression_decision', 'decided_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.decision_scope', 'M5', 't3a_d1_progression_decision', 'decision_scope', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.decision_rationale_code', 'M5', 't3a_d1_progression_decision', 'decision_rationale_code', 'decision_rationale_code_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.corrected_decision_ref', 'M5', 't3a_d1_progression_decision', 'corrected_decision_ref', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.original_decision_date', 'M5', 't3a_d1_progression_decision', 'original_decision_date', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.correction_effective_date', 'M5', 't3a_d1_progression_decision', 'correction_effective_date', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.welfare_stop_ref', 'M5', 't3a_d1_progression_decision', 'welfare_stop_ref', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.confirmation_role', 'M1', 't3a_mentor_judgment', 'confirmation_role', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.authorization_snapshot_ref', 'M1', 't3a_mentor_judgment', 'authorization_snapshot_ref', null, 'day1-domain-E-generator', now(), 'live column is jsonb; the dictionary type is an identifier (CR-046)'),
  ('1.3', 'E.statement_id', 'M1', 't3a_composed_statement', 'statement_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.statement_version', 'M5', 't3a_composed_statement', 'statement_version', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.statement_digest', 'M5', 't3a_composed_statement', 'statement_digest', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.s1_outcome_delivered_to_mentor_at', 'M5', 't3a_stage_sequence', 's1_outcome_delivered_to_mentor_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.s2_determinations_locked_at', 'M5', 't3a_stage_sequence', 's2_determinations_locked_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.s1_output_unmasked_at', 'M5', 't3a_stage_sequence', 's1_output_unmasked_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.determination_id', 'M5', 't3a_determination', 'determination_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.question_id', 'M5', 't3a_determination', 'question_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.answer_option_id', 'M5', 't3a_determination', 'answer_option_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.list_selection_ids', 'M5', 't3a_determination', 'list_selection_ids', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.determination_missing_state', 'M5', 't3a_determination', 'determination_missing_state', 'determination_missing_state_capture_state', 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.determined_by', 'M5', 't3a_determination', 'determined_by', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.determined_at', 'M5', 't3a_determination', 'determined_at', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.clause_instance_id', 'M5', 't3a_determination', 'clause_instance_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.conduct_element_id', 'M5', 't3a_determination', 'conduct_element_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.recurrence_equivalence_key_id', 'M5', 't3a_determination', 'recurrence_equivalence_key_id', null, 'day1-domain-E-generator', now(), null),
  ('1.3', 'E.state_code', 'M5', 't3a_determination', 'state_code', null, 'day1-domain-E-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain E behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

alter table public.t3a_capture_config add column if not exists enforce_sequence boolean not null default false;
comment on column public.t3a_capture_config.enforce_sequence is 'Domain E: when true, S2 Stage entry needs the S1 outcome delivered to the mentor (DT-19). Off until the live S1 flow writes t3a_stage_sequence (CR-047).';

create table if not exists public.t3a_capture_refusal (
  refusal_id uuid primary key default gen_random_uuid(),
  route text not null,
  reason_code text not null,
  subject_ref text,
  detail text,
  refused_at timestamptz not null default now()
);
comment on table public.t3a_capture_refusal is 'Refused capture attempts that reached a function route (DT-15, DT-18, DT-20, DT-21). A refusal is written and returned, not raised, so the log is kept.';
drop trigger if exists t3a_append_only on public.t3a_capture_refusal;
create trigger t3a_append_only before update or delete on public.t3a_capture_refusal for each row execute function public.t3a_deny_mutation();
alter table public.t3a_capture_refusal enable row level security;
revoke all on public.t3a_capture_refusal from anon, authenticated;

create or replace function public.t3a_capture_refuse(p_route text, p_reason text, p_subject text, p_detail text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  insert into public.t3a_capture_refusal (route, reason_code, subject_ref, detail) values (p_route, p_reason, left(p_subject, 120), p_detail);
  return jsonb_build_object('outcome', 'refused', 'reason', p_reason, 'detail', p_detail);
end $$;

-- Set once: a milestone time, once written, never changes and never clears.
create or replace function public.t3a_set_once() returns trigger language plpgsql as $$
declare c text;
begin
  foreach c in array tg_argv loop
    if to_jsonb(old)->>c is not null and to_jsonb(new)->c is distinct from to_jsonb(old)->c then
      raise exception 'T3A_SET_ONCE: % was set at % and cannot change', c, to_jsonb(old)->>c using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists t3a_set_once_trg on public.t3a_stage_sequence;
create trigger t3a_set_once_trg before update on public.t3a_stage_sequence for each row
  execute function public.t3a_set_once('s1_outcome_delivered_to_mentor_at', 's2_determinations_locked_at', 's1_output_unmasked_at');

-- Observer rules (DT-15, DT-16). The trigger is the backstop for any route; t3a_commit_observation is the route that logs.
create or replace function public.t3a_observer_rules() returns trigger language plpgsql as $$
begin
  if new.stage_code::text = 'S1' and new.observer_id is not null then
    raise exception 'T3A_OBSERVER_NOT_ALLOWED_AT_S1: observer_id is not set on a Stage 1 record; use the confirmer fields (s1_human_confirmation_actor_id, s1_human_confirmation_at)' using errcode = '23514';
  end if;
  if new.stage_code::text in ('S2', 'S4') and new.observer_id is null and (select enforce_required from public.t3a_capture_config) then
    raise exception 'T3A_REQUIRED_FIELD_MISSING: observer_id is required on a % record', new.stage_code using errcode = '23502';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_observer_rules_trg on public.t3a_observation;
create trigger t3a_1_observer_rules_trg before insert on public.t3a_observation for each row execute function public.t3a_observer_rules();

-- One observation commit from a jsonb of column values. Refusals are logged and returned.
-- S2 and S4 need an observer; S1 must not carry one; the record must name a source version that has a hash and a served instance
-- whose rendered instance has a hash (DT-17: the source hash and the rendered hash are two different objects).
create or replace function public.t3a_commit_observation(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_stage text := p->>'stage_code'; v_sv uuid := nullif(p->>'source_version_id','')::uuid; v_served uuid := nullif(p->>'served_instance_id','')::uuid;
  v_src_hash text; v_ren_hash text; v_row public.t3a_observation; v_cols text; v_subject text := coalesce(p->>'participant_id', '');
begin
  if v_stage = 'S1' and nullif(p->>'observer_id','') is not null then
    return public.t3a_capture_refuse('observation.commit', 'OBSERVER_NOT_ALLOWED_AT_S1', v_subject, 'S1 records carry confirmer fields, not observer_id');
  end if;
  if v_stage in ('S2', 'S4') and nullif(p->>'observer_id','') is null then
    return public.t3a_capture_refuse('observation.commit', 'OBSERVER_REQUIRED', v_subject, v_stage || ' records need observer_id');
  end if;
  select source_version_hash into v_src_hash from public.t3a_source_version where source_version_id = v_sv;
  select r.rendered_instance_hash into v_ren_hash from public.t3a_served_instance s join public.t3a_rendered_instance r on r.rendered_instance_id = s.rendered_instance_id where s.served_instance_id = v_served;
  if v_src_hash is null or v_ren_hash is null then
    return public.t3a_capture_refuse('observation.commit', 'DUAL_HASH_MISSING', v_subject, 'both the source version hash and the rendered instance hash are required');
  end if;
  -- Only the columns the caller named are inserted, so column defaults (created_at, ids) still apply.
  select string_agg(format('%I', a.attname), ', ') into v_cols from pg_attribute a
   where a.attrelid = 'public.t3a_observation'::regclass and a.attnum > 0 and not a.attisdropped and p ? a.attname::text;
  execute format('insert into public.t3a_observation (%1$s) select %1$s from jsonb_populate_record(null::public.t3a_observation, $1) returning *', v_cols) into v_row using p;
  return jsonb_build_object('outcome', 'committed', 'observation_id', v_row.observation_id, 'source_version_hash', v_src_hash, 'rendered_instance_hash', v_ren_hash);
end $$;
revoke all on function public.t3a_commit_observation(jsonb) from public, anon, authenticated;
grant execute on function public.t3a_commit_observation(jsonb) to service_role;

-- Sequential unmasking (DT-18, DT-19).
create or replace function public.t3a_open_s1_output(p_stage_instance uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.t3a_stage_sequence;
begin
  select * into v from public.t3a_stage_sequence where stage_instance_id = p_stage_instance;
  if not found or v.s2_determinations_locked_at is null then
    return public.t3a_capture_refuse('s1_output.open', 'S2_DETERMINATIONS_NOT_LOCKED', p_stage_instance::text, 'the S1 output opens only after the S2 determinations are locked');
  end if;
  if v.s1_output_unmasked_at is null then
    update public.t3a_stage_sequence set s1_output_unmasked_at = now() where stage_instance_id = p_stage_instance;
  end if;
  return jsonb_build_object('outcome', 'opened', 's1_output_unmasked_at', (select s1_output_unmasked_at from public.t3a_stage_sequence where stage_instance_id = p_stage_instance));
end $$;
revoke all on function public.t3a_open_s1_output(uuid) from public, anon;
grant execute on function public.t3a_open_s1_output(uuid) to authenticated, service_role;

create or replace function public.t3a_s2_entry_needs_s1() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.stage_code::text <> 'S2' or not (select enforce_sequence from public.t3a_capture_config) then return new; end if;
  if not exists (select 1 from public.t3a_stage_sequence q where q.participant_id = new.participant_id and q.dimension_id = new.dimension_id
                  and q.s1_outcome_delivered_to_mentor_at is not null) then
    raise exception 'S1_OUTCOME_NOT_DELIVERED: Stage 2 entry waits for the Stage 1 outcome to be delivered to the mentor' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_s2_needs_s1_trg on public.t3a_stage_entry_event;
create trigger t3a_1_s2_needs_s1_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_s2_entry_needs_s1();

-- No free text to a mentor endpoint (DT-20, DT-21). Only controlled keys, with codes or identifiers as values.
create or replace function public.t3a_mentor_input_guard(p_route text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; v jsonb; bad text[] := '{}';
begin
  for k, v in select * from jsonb_each(p) loop
    if k ~* '(rationale|reason|conclusion|comment|note|free_?text|explanation|narrative)' and k !~* '_code$' then bad := bad || k;
    elsif jsonb_typeof(v) = 'string' and (v #>> '{}') !~ '^[A-Za-z0-9_.:-]{1,64}$' and (v #>> '{}') !~ '^[0-9a-fA-F-]{36}$' and (v #>> '{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then bad := bad || k;
    end if;
  end loop;
  if cardinality(bad) > 0 then
    return public.t3a_capture_refuse(p_route, case when exists (select 1 from unnest(bad) b where b ~* 'accommodation') then 'ACCOMMODATION_REASON_REFUSED' else 'FREE_TEXT_REFUSED' end,
      null, 'only controlled codes and identifiers are accepted; refused keys: ' || array_to_string(bad, ', '));
  end if;
  return jsonb_build_object('outcome', 'accepted');
end $$;
grant execute on function public.t3a_mentor_input_guard(text, jsonb) to authenticated, service_role;
revoke all on function public.t3a_mentor_input_guard(text, jsonb) from public, anon;

-- The live mentor tables hold two free text columns the package forbids (CR-014, CR-046). Both tables are empty in production.
create or replace function public.t3a_refuse_free_text() returns trigger language plpgsql as $$
declare c text;
begin
  foreach c in array tg_argv loop
    if to_jsonb(new)->>c is not null then
      raise exception 'T3A_FREE_TEXT_REFUSED: % takes controlled codes only; free text is not stored', c using errcode = '23514';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists t3a_1_no_free_text_trg on public.t3a_mentor_judgment;
create trigger t3a_1_no_free_text_trg before insert or update on public.t3a_mentor_judgment for each row execute function public.t3a_refuse_free_text('decision_rationale', 'session_technical_issues');
drop trigger if exists t3a_1_no_free_text_trg on public.t3a_d1_progression_decision;
create trigger t3a_1_no_free_text_trg before insert or update on public.t3a_d1_progression_decision for each row execute function public.t3a_refuse_free_text('rationale');
