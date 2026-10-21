-- Day 1 Domain F: mentor authorization, conflicts, calibration and assurance (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_f.py
-- and tools/day1/plans/domain_f_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py F      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 48 fields into t3a_field_physical_map.

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


-- t3a_mentor_authorization: extended in place (existing rows are kept)

alter table public.t3a_mentor_authorization add column if not exists reference_set_version_capture_state text not null default 'not_captured' check (reference_set_version_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists authorization_status text check (authorization_status is null or authorization_status in ('authorized', 'supervised', 'suspended', 'lapsed', 'withdrawn'));

alter table public.t3a_mentor_authorization add column if not exists reviewer_authorization boolean ;

alter table public.t3a_mentor_authorization add column if not exists issuer_authorization boolean ;

alter table public.t3a_mentor_authorization add column if not exists supervised_sessions_completed integer ;

alter table public.t3a_mentor_authorization add column if not exists supervised_sessions_completed_capture_state text not null default 'not_captured' check (supervised_sessions_completed_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists supervised_status_started_at timestamptz ;

alter table public.t3a_mentor_authorization add column if not exists supervised_status_started_at_capture_state text not null default 'not_captured' check (supervised_status_started_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists supervision_finding_code text ;

alter table public.t3a_mentor_authorization add column if not exists supervision_finding_code_capture_state text not null default 'not_captured' check (supervision_finding_code_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists suspension_started_at timestamptz ;

alter table public.t3a_mentor_authorization add column if not exists suspension_extension_count integer ;

alter table public.t3a_mentor_authorization add column if not exists independent_approver_id uuid ;

alter table public.t3a_mentor_authorization add column if not exists observations_per_month_commitment integer ;

alter table public.t3a_mentor_authorization add column if not exists observations_per_month_commitment_capture_state text not null default 'not_captured' check (observations_per_month_commitment_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists engagement_started_at timestamptz ;

alter table public.t3a_mentor_authorization add column if not exists engagement_started_at_capture_state text not null default 'not_captured' check (engagement_started_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists sourcing_channel text check (sourcing_channel is null or sourcing_channel in ('primary_contributor_network', 'professional_network', 'professional_association', 'retiring_employee_channel', 'other'));

alter table public.t3a_mentor_authorization add column if not exists sourcing_channel_capture_state text not null default 'not_captured' check (sourcing_channel_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists sourcing_employer_ref uuid ;

alter table public.t3a_mentor_authorization add column if not exists sourcing_employer_ref_capture_state text not null default 'not_captured' check (sourcing_employer_ref_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists observer_qualification_record_ref uuid ;

alter table public.t3a_mentor_authorization add column if not exists observer_qualification_record_ref_capture_state text not null default 'not_captured' check (observer_qualification_record_ref_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists observer_specialty_domain_codes text[] ;

alter table public.t3a_mentor_authorization add column if not exists observer_specialty_domain_codes_capture_state text not null default 'not_captured' check (observer_specialty_domain_codes_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_mentor_authorization add column if not exists qualification_reviewed_at timestamptz ;

alter table public.t3a_mentor_authorization add column if not exists qualification_reviewed_at_capture_state text not null default 'not_captured' check (qualification_reviewed_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

update public.t3a_mentor_authorization set reference_set_version_capture_state = 'captured' where reference_set_version is not null and reference_set_version_capture_state = 'not_captured';

update public.t3a_mentor_authorization set supervised_sessions_completed_capture_state = 'captured' where supervised_sessions_completed is not null and supervised_sessions_completed_capture_state = 'not_captured';

update public.t3a_mentor_authorization set supervised_status_started_at_capture_state = 'captured' where supervised_status_started_at is not null and supervised_status_started_at_capture_state = 'not_captured';

update public.t3a_mentor_authorization set supervision_finding_code_capture_state = 'captured' where supervision_finding_code is not null and supervision_finding_code_capture_state = 'not_captured';

update public.t3a_mentor_authorization set observations_per_month_commitment_capture_state = 'captured' where observations_per_month_commitment is not null and observations_per_month_commitment_capture_state = 'not_captured';

update public.t3a_mentor_authorization set engagement_started_at_capture_state = 'captured' where engagement_started_at is not null and engagement_started_at_capture_state = 'not_captured';

update public.t3a_mentor_authorization set sourcing_channel_capture_state = 'captured' where sourcing_channel is not null and sourcing_channel_capture_state = 'not_captured';

update public.t3a_mentor_authorization set sourcing_employer_ref_capture_state = 'captured' where sourcing_employer_ref is not null and sourcing_employer_ref_capture_state = 'not_captured';

update public.t3a_mentor_authorization set observer_qualification_record_ref_capture_state = 'captured' where observer_qualification_record_ref is not null and observer_qualification_record_ref_capture_state = 'not_captured';

update public.t3a_mentor_authorization set observer_specialty_domain_codes_capture_state = 'captured' where observer_specialty_domain_codes is not null and observer_specialty_domain_codes_capture_state = 'not_captured';

update public.t3a_mentor_authorization set qualification_reviewed_at_capture_state = 'captured' where qualification_reviewed_at is not null and qualification_reviewed_at_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_mentor_authorization;
create trigger t3a_capture_state_fill before insert or update on public.t3a_mentor_authorization for each row execute function public.t3a_capture_state_fill('reference_set_version:reference_set_version_capture_state', 'supervised_sessions_completed:supervised_sessions_completed_capture_state', 'supervised_status_started_at:supervised_status_started_at_capture_state', 'supervision_finding_code:supervision_finding_code_capture_state', 'observations_per_month_commitment:observations_per_month_commitment_capture_state', 'engagement_started_at:engagement_started_at_capture_state', 'sourcing_channel:sourcing_channel_capture_state', 'sourcing_employer_ref:sourcing_employer_ref_capture_state', 'observer_qualification_record_ref:observer_qualification_record_ref_capture_state', 'observer_specialty_domain_codes:observer_specialty_domain_codes_capture_state', 'qualification_reviewed_at:qualification_reviewed_at_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_mentor_authorization;
create trigger t3a_2_required_fields_trg before insert on public.t3a_mentor_authorization for each row execute function public.t3a_require_fields('authorization_status', 'reviewer_authorization', 'issuer_authorization');

-- t3a_conflict_declaration: extended in place (existing rows are kept)

alter table public.t3a_conflict_declaration add column if not exists declared_entity_refs uuid[] ;

alter table public.t3a_conflict_declaration add column if not exists recusal_id uuid ;

drop trigger if exists t3a_2_required_fields_trg on public.t3a_conflict_declaration;
create trigger t3a_2_required_fields_trg before insert on public.t3a_conflict_declaration for each row execute function public.t3a_require_fields('declared_entity_refs');

-- t3a_d1_involvement: extended in place (existing rows are kept)

alter table public.t3a_d1_involvement add column if not exists evidence_cycle_id uuid ;

alter table public.t3a_d1_involvement add column if not exists cycle_function text check (cycle_function is null or cycle_function in ('guide', 'observer', 'evidence_reviewer'));

alter table public.t3a_d1_involvement add column if not exists s1_exposure_flag boolean ;

drop trigger if exists t3a_2_required_fields_trg on public.t3a_d1_involvement;
create trigger t3a_2_required_fields_trg before insert on public.t3a_d1_involvement for each row execute function public.t3a_require_fields('evidence_cycle_id', 'cycle_function', 's1_exposure_flag');

-- t3a_moderation_sample: extended in place (existing rows are kept)

alter table public.t3a_moderation_sample add column if not exists sampling_plan_version_capture_state text not null default 'not_captured' check (sampling_plan_version_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

update public.t3a_moderation_sample set sampling_plan_version_capture_state = 'captured' where sampling_plan_version is not null and sampling_plan_version_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_moderation_sample;
create trigger t3a_capture_state_fill before insert or update on public.t3a_moderation_sample for each row execute function public.t3a_capture_state_fill('sampling_plan_version:sampling_plan_version_capture_state');

create table if not exists public.t3a_calibration_record (
  mentor_id uuid not null,
  calibration_record_id uuid primary key default gen_random_uuid(),
  stimulus_unit_id uuid,
  stimulus_unit_id_capture_state text not null default 'not_captured' check (stimulus_unit_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  paired_determination_set_id uuid,
  paired_determination_set_id_capture_state text not null default 'not_captured' check (paired_determination_set_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  agreement_statistic_inputs jsonb,
  agreement_statistic_inputs_capture_state text not null default 'not_captured' check (agreement_statistic_inputs_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  agreement_threshold_version text,
  agreement_threshold_version_capture_state text not null default 'not_captured' check (agreement_threshold_version_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  moderation_sample_flag boolean,
  moderation_sample_flag_capture_state text not null default 'not_captured' check (moderation_sample_flag_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  recorded_at timestamptz not null default now(),
  check ((stimulus_unit_id is not null) = (stimulus_unit_id_capture_state = 'captured')),
  check ((paired_determination_set_id is not null) = (paired_determination_set_id_capture_state = 'captured')),
  check ((agreement_statistic_inputs is not null) = (agreement_statistic_inputs_capture_state = 'captured')),
  check (agreement_threshold_version is null or agreement_threshold_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check ((agreement_threshold_version is not null) = (agreement_threshold_version_capture_state = 'captured')),
  check ((moderation_sample_flag is not null) = (moderation_sample_flag_capture_state = 'captured'))
);

comment on table public.t3a_calibration_record is 'Domain F calibration and agreement records: paired determinations on a stimulus unit, with the inputs to the agreement statistic.';

drop trigger if exists t3a_capture_state_fill on public.t3a_calibration_record;
create trigger t3a_capture_state_fill before insert or update on public.t3a_calibration_record for each row execute function public.t3a_capture_state_fill('stimulus_unit_id:stimulus_unit_id_capture_state', 'paired_determination_set_id:paired_determination_set_id_capture_state', 'agreement_statistic_inputs:agreement_statistic_inputs_capture_state', 'agreement_threshold_version:agreement_threshold_version_capture_state', 'moderation_sample_flag:moderation_sample_flag_capture_state');

drop trigger if exists t3a_append_only on public.t3a_calibration_record;
create trigger t3a_append_only before update or delete on public.t3a_calibration_record for each row execute function public.t3a_deny_mutation();

alter table public.t3a_calibration_record enable row level security;
revoke all on public.t3a_calibration_record from anon, authenticated;

create table if not exists public.t3a_mentor_invitation (
  invitee_email text not null check (invitee_email = lower(btrim(invitee_email))),
  mentor_invitation_id uuid primary key default gen_random_uuid(),
  invited_by uuid not null,
  invitation_sent_at timestamptz not null default now(),
  invitation_expires_at timestamptz not null,
  invitation_redeemed_at timestamptz,
  mentor_agreement_version text,
  mentor_agreement_signed_at timestamptz,
  check (mentor_agreement_version is null or mentor_agreement_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (invitation_expires_at > invitation_sent_at)
);

comment on table public.t3a_mentor_invitation is 'Domain F mentor invitations. Redemption and agreement signing are set once.';

drop trigger if exists t3a_immutable_columns on public.t3a_mentor_invitation;
create trigger t3a_immutable_columns before update on public.t3a_mentor_invitation for each row execute function public.t3a_refuse_column_change('mentor_invitation_id', 'invitee_email', 'invited_by', 'invitation_sent_at', 'invitation_expires_at');

alter table public.t3a_mentor_invitation enable row level security;
revoke all on public.t3a_mentor_invitation from anon, authenticated;

create table if not exists public.t3a_mentor_appeal (
  mentor_id uuid not null,
  mentor_appeal_id uuid primary key default gen_random_uuid(),
  opened_at timestamptz not null default now(),
  decided_at timestamptz
);

comment on table public.t3a_mentor_appeal is 'Domain F mentor appeals against an authorization decision. The decision time is set once.';

drop trigger if exists t3a_immutable_columns on public.t3a_mentor_appeal;
create trigger t3a_immutable_columns before update on public.t3a_mentor_appeal for each row execute function public.t3a_refuse_column_change('mentor_appeal_id', 'mentor_id', 'opened_at');

alter table public.t3a_mentor_appeal enable row level security;
revoke all on public.t3a_mentor_appeal from anon, authenticated;

create table if not exists public.t3a_mentor_confidence_socket (
  determination_id uuid,
  mentor_confidence_per_determination text,
  check (mentor_confidence_per_determination is null or mentor_confidence_per_determination in ('high', 'moderate', 'low'))
);

comment on table public.t3a_mentor_confidence_socket is 'Domain F SOCKET: mentor confidence per determination. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_mentor_confidence_socket;
create trigger t3a_append_only before update or delete on public.t3a_mentor_confidence_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_mentor_confidence_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_mentor_confidence_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_mentor_confidence_socket enable row level security;
revoke all on public.t3a_mentor_confidence_socket from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'F.authorization_id', 'M3', 't3a_mentor_authorization', 'mentor_authorization_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.authorized_dimension_id', 'M3', 't3a_mentor_authorization', 'dimension_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.effective_from', 'M3', 't3a_mentor_authorization', 'authorized_from', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.effective_to', 'M3', 't3a_mentor_authorization', 'authorized_until', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.calibration_status', 'M1', 't3a_mentor_authorization', 'calibration_status', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.reference_set_version', 'M1', 't3a_mentor_authorization', 'reference_set_version', 'reference_set_version_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.authorization_status', 'M5', 't3a_mentor_authorization', 'authorization_status', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.reviewer_authorization', 'M5', 't3a_mentor_authorization', 'reviewer_authorization', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.issuer_authorization', 'M5', 't3a_mentor_authorization', 'issuer_authorization', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.supervised_sessions_completed', 'M5', 't3a_mentor_authorization', 'supervised_sessions_completed', 'supervised_sessions_completed_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.supervised_status_started_at', 'M5', 't3a_mentor_authorization', 'supervised_status_started_at', 'supervised_status_started_at_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.supervision_finding_code', 'M5', 't3a_mentor_authorization', 'supervision_finding_code', 'supervision_finding_code_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.suspension_started_at', 'M5', 't3a_mentor_authorization', 'suspension_started_at', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.suspension_extension_count', 'M5', 't3a_mentor_authorization', 'suspension_extension_count', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.independent_approver_id', 'M5', 't3a_mentor_authorization', 'independent_approver_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.observations_per_month_commitment', 'M5', 't3a_mentor_authorization', 'observations_per_month_commitment', 'observations_per_month_commitment_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.engagement_started_at', 'M5', 't3a_mentor_authorization', 'engagement_started_at', 'engagement_started_at_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.sourcing_channel', 'M5', 't3a_mentor_authorization', 'sourcing_channel', 'sourcing_channel_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.sourcing_employer_ref', 'M5', 't3a_mentor_authorization', 'sourcing_employer_ref', 'sourcing_employer_ref_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.observer_qualification_record_ref', 'M5', 't3a_mentor_authorization', 'observer_qualification_record_ref', 'observer_qualification_record_ref_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.observer_specialty_domain_codes', 'M5', 't3a_mentor_authorization', 'observer_specialty_domain_codes', 'observer_specialty_domain_codes_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.qualification_reviewed_at', 'M5', 't3a_mentor_authorization', 'qualification_reviewed_at', 'qualification_reviewed_at_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.conflict_declaration_id', 'M1', 't3a_conflict_declaration', 'conflict_declaration_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.declared_at', 'M1', 't3a_conflict_declaration', 'declared_at', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.declared_entity_refs', 'M5', 't3a_conflict_declaration', 'declared_entity_refs', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.recusal_id', 'M5', 't3a_conflict_declaration', 'recusal_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.involvement_id', 'M1', 't3a_d1_involvement', 'involvement_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.evidence_cycle_id', 'M5', 't3a_d1_involvement', 'evidence_cycle_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.cycle_function', 'M5', 't3a_d1_involvement', 'cycle_function', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.s1_exposure_flag', 'M5', 't3a_d1_involvement', 's1_exposure_flag', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.sampling_plan_version', 'M1', 't3a_moderation_sample', 'sampling_plan_version', 'sampling_plan_version_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.calibration_record_id', 'M5', 't3a_calibration_record', 'calibration_record_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.stimulus_unit_id', 'M5', 't3a_calibration_record', 'stimulus_unit_id', 'stimulus_unit_id_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.paired_determination_set_id', 'M5', 't3a_calibration_record', 'paired_determination_set_id', 'paired_determination_set_id_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.agreement_statistic_inputs', 'M5', 't3a_calibration_record', 'agreement_statistic_inputs', 'agreement_statistic_inputs_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.agreement_threshold_version', 'M5', 't3a_calibration_record', 'agreement_threshold_version', 'agreement_threshold_version_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.moderation_sample_flag', 'M5', 't3a_calibration_record', 'moderation_sample_flag', 'moderation_sample_flag_capture_state', 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.mentor_invitation_id', 'M5', 't3a_mentor_invitation', 'mentor_invitation_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.invited_by', 'M5', 't3a_mentor_invitation', 'invited_by', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.invitation_sent_at', 'M5', 't3a_mentor_invitation', 'invitation_sent_at', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.invitation_expires_at', 'M5', 't3a_mentor_invitation', 'invitation_expires_at', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.invitation_redeemed_at', 'M5', 't3a_mentor_invitation', 'invitation_redeemed_at', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.mentor_agreement_version', 'M5', 't3a_mentor_invitation', 'mentor_agreement_version', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.mentor_agreement_signed_at', 'M5', 't3a_mentor_invitation', 'mentor_agreement_signed_at', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.mentor_appeal_id', 'M5', 't3a_mentor_appeal', 'mentor_appeal_id', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.opened_at', 'M5', 't3a_mentor_appeal', 'opened_at', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.decided_at', 'M5', 't3a_mentor_appeal', 'decided_at', null, 'day1-domain-F-generator', now(), null),
  ('1.3', 'F.mentor_confidence_per_determination', 'M5', 't3a_mentor_confidence_socket', 'mentor_confidence_per_determination', null, 'day1-domain-F-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain F behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

drop trigger if exists t3a_set_once_trg on public.t3a_mentor_invitation;
create trigger t3a_set_once_trg before update on public.t3a_mentor_invitation for each row
  execute function public.t3a_set_once('invitation_redeemed_at', 'mentor_agreement_version', 'mentor_agreement_signed_at');
drop trigger if exists t3a_set_once_trg on public.t3a_mentor_appeal;
create trigger t3a_set_once_trg before update on public.t3a_mentor_appeal for each row execute function public.t3a_set_once('decided_at');

-- Authorization rules: a suspension has a start time and only a suspended authorization has one; a lapse after a suspension
-- may be extended only with an independent approver. (The package gives the field; the approver rule is the default in CR-050.)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 't3a_mentor_authorization_status_chk') then
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_status_chk check (
      authorization_status is null or authorization_status in ('authorized', 'supervised', 'suspended', 'lapsed', 'withdrawn')) not valid;
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_suspension_chk check (
      (suspension_started_at is null) or authorization_status in ('suspended', 'lapsed', 'withdrawn')) not valid;
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_extension_chk check (
      coalesce(suspension_extension_count, 0) = 0 or independent_approver_id is not null) not valid;
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_cycle_chk check (observer_specialty_domain_codes is null or cardinality(observer_specialty_domain_codes) <= 20) not valid;
    alter table public.t3a_d1_involvement add constraint t3a_d1_involvement_cycle_fn_chk check (cycle_function is null or cycle_function in ('guide', 'observer', 'evidence_reviewer')) not valid;
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_channel_chk check (sourcing_channel is null or sourcing_channel in
      ('primary_contributor_network', 'professional_network', 'professional_association', 'retiring_employee_channel', 'other')) not valid;
  end if;
end $$;

-- Redeeming an invitation. Refusals are logged and returned (not raised) so the log is kept.
create or replace function public.t3a_redeem_invitation(p_invitation uuid, p_agreement_version text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.t3a_mentor_invitation;
begin
  select * into v from public.t3a_mentor_invitation where mentor_invitation_id = p_invitation;
  if not found then return public.t3a_capture_refuse('mentor.invitation.redeem', 'INVITATION_UNKNOWN', p_invitation::text, 'no such invitation'); end if;
  if v.invitation_redeemed_at is not null then return public.t3a_capture_refuse('mentor.invitation.redeem', 'INVITATION_ALREADY_REDEEMED', p_invitation::text, 'an invitation is redeemed once'); end if;
  if v.invitation_expires_at < now() then return public.t3a_capture_refuse('mentor.invitation.redeem', 'INVITATION_EXPIRED', p_invitation::text, 'the invitation has expired'); end if;
  if p_agreement_version is null or p_agreement_version !~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$' then
    return public.t3a_capture_refuse('mentor.invitation.redeem', 'AGREEMENT_VERSION_REQUIRED', p_invitation::text, 'the mentor agreement version is recorded at signing');
  end if;
  update public.t3a_mentor_invitation set invitation_redeemed_at = now(), mentor_agreement_version = p_agreement_version, mentor_agreement_signed_at = now()
   where mentor_invitation_id = p_invitation;
  return jsonb_build_object('outcome', 'redeemed', 'mentor_invitation_id', p_invitation);
end $$;
revoke all on function public.t3a_redeem_invitation(uuid, text) from public, anon;
grant execute on function public.t3a_redeem_invitation(uuid, text) to authenticated, service_role;

-- Is this mentor authorized for this dimension now, and without an open conflict with this participant?
create or replace function public.t3a_mentor_may_observe(p_mentor uuid, p_dimension text, p_participant uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'authorized', exists (select 1 from public.t3a_mentor_authorization a where a.mentor_id = p_mentor and a.dimension_id::text = p_dimension
                          and a.authorized_from <= now() and (a.authorized_until is null or a.authorized_until > now())
                          and coalesce(a.authorization_status, 'authorized') in ('authorized', 'supervised')),
    'conflict_open', exists (select 1 from public.t3a_conflict_declaration c where c.mentor_id = p_mentor and c.participant_id = p_participant and c.cleared_at is null))
$$;
