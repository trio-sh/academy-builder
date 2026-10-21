-- Day 1 Domain A: identity, account and role (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_a.py
-- and tools/day1/plans/domain_a_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py A      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 47 fields into t3a_field_physical_map.

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

create table if not exists public.t3a_account (
  account_id uuid primary key,
  account_created_at timestamptz not null default now(),
  account_creation_route text,
  account_creation_route_capture_state text not null default 'not_captured' check (account_creation_route_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  email_address text not null,
  email_verification_state text not null default 'unverified',
  email_verification_sent_at timestamptz,
  email_verification_sent_at_capture_state text not null default 'not_captured' check (email_verification_sent_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  email_verified_at timestamptz,
  email_verified_at_capture_state text not null default 'not_captured' check (email_verified_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  identity_assurance_method text not null default 'account_authentication',
  age_eligibility_attestation text,
  record_property text not null default 'real',
  pilot_cohort_id uuid,
  pilot_cohort_id_capture_state text not null default 'not_captured' check (pilot_cohort_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  account_state text not null default 'active',
  identity_link_status text not null default 'unverified',
  participant_lifecycle_state text,
  participant_lifecycle_state_capture_state text not null default 'not_captured' check (participant_lifecycle_state_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  capture_gaps text[] not null default '{}',
  dictionary_version text not null default '1.3',
  updated_at timestamptz not null default now(),
  check (account_creation_route is null or account_creation_route in ('public_signup', 'mentor_invitation', 'employer_application', 'administrator_provisioned', 'legacy_unknown')),
  check ((account_creation_route is not null) = (account_creation_route_capture_state = 'captured')),
  check (email_address = lower(btrim(email_address))),
  check (email_verification_state is null or email_verification_state in ('unverified', 'verified')),
  check ((email_verification_sent_at is not null) = (email_verification_sent_at_capture_state = 'captured')),
  check ((email_verified_at is not null) = (email_verified_at_capture_state = 'captured')),
  check (identity_assurance_method is null or identity_assurance_method in ('account_authentication')),
  check (identity_assurance_method = 'account_authentication'),
  check (age_eligibility_attestation is null or age_eligibility_attestation in ('attested_18_or_over', 'attested_under_18')),
  check (record_property is null or record_property in ('real', 'synthetic_test', 'demonstration')),
  check ((pilot_cohort_id is not null) = (pilot_cohort_id_capture_state = 'captured')),
  check (account_state is null or account_state in ('active', 'restricted', 'suspended', 'closed')),
  check (identity_link_status is null or identity_link_status in ('unverified', 'verified', 'challenged', 'deactivated')),
  check (participant_lifecycle_state is null or participant_lifecycle_state in ('registered', 'onboarding', 'active', 'inactive', 'closed')),
  check ((participant_lifecycle_state is not null) = (participant_lifecycle_state_capture_state = 'captured')),
  check (age_eligibility_attestation is not null or 'age_eligibility_attestation' = any (capture_gaps)),
  check ((email_verification_state = 'verified') = (email_verified_at is not null))
);

comment on table public.t3a_account is 'Domain A account root. One row per account. Mirrors auth.users; the role lives in t3a_role_assignment.';

drop trigger if exists t3a_capture_state_fill on public.t3a_account;
create trigger t3a_capture_state_fill before insert or update on public.t3a_account for each row execute function public.t3a_capture_state_fill('account_creation_route:account_creation_route_capture_state', 'email_verification_sent_at:email_verification_sent_at_capture_state', 'email_verified_at:email_verified_at_capture_state', 'pilot_cohort_id:pilot_cohort_id_capture_state', 'participant_lifecycle_state:participant_lifecycle_state_capture_state');

drop trigger if exists t3a_immutable_columns on public.t3a_account;
create trigger t3a_immutable_columns before update on public.t3a_account for each row execute function public.t3a_refuse_column_change('account_id', 'account_created_at', 'account_creation_route', 'identity_assurance_method', 'age_eligibility_attestation', 'record_property');

alter table public.t3a_account enable row level security;
revoke all on public.t3a_account from anon, authenticated;

grant select (account_id, account_created_at, account_creation_route, email_address, email_verification_state, email_verification_sent_at, email_verified_at, identity_assurance_method, age_eligibility_attestation, record_property, pilot_cohort_id, account_state, identity_link_status, participant_lifecycle_state, account_creation_route_capture_state, email_verification_sent_at_capture_state, email_verified_at_capture_state, pilot_cohort_id_capture_state, participant_lifecycle_state_capture_state, capture_gaps, dictionary_version, updated_at) on public.t3a_account to authenticated;

drop policy if exists t3a_account_own_read on public.t3a_account;
create policy t3a_account_own_read on public.t3a_account for select to authenticated using (account_id = auth.uid());

create table if not exists public.t3a_role_assignment (
  account_id uuid not null references public.t3a_account(account_id),
  role_assignment_id uuid primary key default gen_random_uuid(),
  role_code text not null,
  role_grant_basis text not null,
  role_granted_by uuid not null,
  role_granted_at timestamptz not null default now(),
  role_effective_from timestamptz not null default now(),
  role_rules_version text not null,
  role_effective_until timestamptz,
  participant_pseudonym_ref uuid,
  check (role_code is null or role_code in ('participant', 'mentor', 'employer_user', 'coordinator', 'oversight_administrator', 'commercial', 'system_service')),
  check (role_grant_basis is null or role_grant_basis in ('self_serve_individual', 'invitation_redeemed', 'employer_application_approved', 'administrator_grant')),
  check (role_rules_version is null or role_rules_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check ((role_code = 'participant' and role_grant_basis in ('self_serve_individual','administrator_grant')) or (role_code = 'mentor' and role_grant_basis in ('invitation_redeemed','administrator_grant')) or (role_code = 'employer_user' and role_grant_basis in ('employer_application_approved','administrator_grant')) or (role_code in ('coordinator','oversight_administrator','commercial','system_service') and role_grant_basis = 'administrator_grant')),
  check ((role_code = 'participant') = (participant_pseudonym_ref is not null)),
  check (role_effective_until is null or role_effective_until > role_effective_from)
);

comment on table public.t3a_role_assignment is 'Domain A role grants. Insert only; a revocation is a row in t3a_role_assignment_revocation. Roles are set server side only.';

create index if not exists t3a_role_assignment_account_idx on public.t3a_role_assignment (account_id, role_code);

create index if not exists t3a_role_assignment_pseudonym_idx on public.t3a_role_assignment (participant_pseudonym_ref) where participant_pseudonym_ref is not null;

drop trigger if exists t3a_append_only on public.t3a_role_assignment;
create trigger t3a_append_only before update or delete on public.t3a_role_assignment for each row execute function public.t3a_deny_mutation();

alter table public.t3a_role_assignment enable row level security;
revoke all on public.t3a_role_assignment from anon, authenticated;

grant select (account_id, role_assignment_id, role_code, role_grant_basis, role_granted_by, role_granted_at, role_effective_from, role_rules_version, role_effective_until) on public.t3a_role_assignment to authenticated;

drop policy if exists t3a_role_assignment_own_read on public.t3a_role_assignment;
create policy t3a_role_assignment_own_read on public.t3a_role_assignment for select to authenticated using (account_id = auth.uid());

create table if not exists public.t3a_role_assignment_revocation (
  role_assignment_id uuid primary key references public.t3a_role_assignment(role_assignment_id),
  role_revoked_by uuid not null,
  role_revoked_at timestamptz not null default now(),
  role_revocation_basis text not null,
  check (role_revocation_basis ~ '^[a-z0-9_]+$')
);

comment on table public.t3a_role_assignment_revocation is 'Domain A role revocations. One row per revoked assignment.';

drop trigger if exists t3a_append_only on public.t3a_role_assignment_revocation;
create trigger t3a_append_only before update or delete on public.t3a_role_assignment_revocation for each row execute function public.t3a_deny_mutation();

alter table public.t3a_role_assignment_revocation enable row level security;
revoke all on public.t3a_role_assignment_revocation from anon, authenticated;

create table if not exists public.t3a_participant_profile (
  account_id uuid primary key references public.t3a_account(account_id),
  legal_name text,
  legal_name_capture_state text not null default 'not_captured' check (legal_name_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  display_name text,
  display_name_capture_state text not null default 'not_captured' check (display_name_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  country_of_residence text,
  country_of_residence_capture_state text not null default 'not_captured' check (country_of_residence_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  subdivision_of_residence text,
  subdivision_of_residence_capture_state text not null default 'not_captured' check (subdivision_of_residence_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  city_of_residence text,
  city_of_residence_capture_state text not null default 'not_captured' check (city_of_residence_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  privacy_jurisdiction_code text,
  privacy_jurisdiction_code_capture_state text not null default 'not_captured' check (privacy_jurisdiction_code_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  preferred_language text,
  preferred_language_capture_state text not null default 'not_captured' check (preferred_language_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  timezone text,
  timezone_capture_state text not null default 'not_captured' check (timezone_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  occupation_interest text[],
  occupation_interest_capture_state text not null default 'not_captured' check (occupation_interest_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  occupational_classification_version text not null default 'NOC 2021 Version 1.0',
  profile_field_source jsonb,
  profile_field_source_capture_state text not null default 'not_captured' check (profile_field_source_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  notification_channel_preference text,
  notification_channel_preference_capture_state text not null default 'not_captured' check (notification_channel_preference_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  target_industry_code text,
  target_industry_code_capture_state text not null default 'not_captured' check (target_industry_code_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  role_seniority_context_code text,
  role_seniority_context_code_capture_state text not null default 'not_captured' check (role_seniority_context_code_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  recruitment_channel_code text,
  recruitment_channel_code_capture_state text not null default 'not_captured' check (recruitment_channel_code_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  updated_at timestamptz not null default now(),
  check ((legal_name is not null) = (legal_name_capture_state = 'captured')),
  check ((display_name is not null) = (display_name_capture_state = 'captured')),
  check (country_of_residence is null or country_of_residence ~ '^[A-Z]{2}$'),
  check ((country_of_residence is not null) = (country_of_residence_capture_state = 'captured')),
  check ((subdivision_of_residence is not null) = (subdivision_of_residence_capture_state = 'captured')),
  check ((city_of_residence is not null) = (city_of_residence_capture_state = 'captured')),
  check ((privacy_jurisdiction_code is not null) = (privacy_jurisdiction_code_capture_state = 'captured')),
  check ((preferred_language is not null) = (preferred_language_capture_state = 'captured')),
  check ((timezone is not null) = (timezone_capture_state = 'captured')),
  check ((occupation_interest is not null) = (occupation_interest_capture_state = 'captured')),
  check (profile_field_source is null or jsonb_typeof(profile_field_source) = 'object'),
  check ((profile_field_source is not null) = (profile_field_source_capture_state = 'captured')),
  check (notification_channel_preference is null or notification_channel_preference in ('email', 'in_platform')),
  check ((notification_channel_preference is not null) = (notification_channel_preference_capture_state = 'captured')),
  check ((target_industry_code is not null) = (target_industry_code_capture_state = 'captured')),
  check (role_seniority_context_code is null or role_seniority_context_code in ('entry', 'early_career', 'experienced', 'supervisory', 'executive')),
  check ((role_seniority_context_code is not null) = (role_seniority_context_code_capture_state = 'captured')),
  check (recruitment_channel_code is null or recruitment_channel_code in ('search', 'social_media', 'referral', 'employer', 'community_organization', 'job_fair', 'partner_program', 'other')),
  check ((recruitment_channel_code is not null) = (recruitment_channel_code_capture_state = 'captured'))
);

comment on table public.t3a_participant_profile is 'Domain A participant profile fields. Context, never evidence; no mentor read path.';

drop trigger if exists t3a_capture_state_fill on public.t3a_participant_profile;
create trigger t3a_capture_state_fill before insert or update on public.t3a_participant_profile for each row execute function public.t3a_capture_state_fill('legal_name:legal_name_capture_state', 'display_name:display_name_capture_state', 'country_of_residence:country_of_residence_capture_state', 'subdivision_of_residence:subdivision_of_residence_capture_state', 'city_of_residence:city_of_residence_capture_state', 'privacy_jurisdiction_code:privacy_jurisdiction_code_capture_state', 'preferred_language:preferred_language_capture_state', 'timezone:timezone_capture_state', 'occupation_interest:occupation_interest_capture_state', 'profile_field_source:profile_field_source_capture_state', 'notification_channel_preference:notification_channel_preference_capture_state', 'target_industry_code:target_industry_code_capture_state', 'role_seniority_context_code:role_seniority_context_code_capture_state', 'recruitment_channel_code:recruitment_channel_code_capture_state');

drop trigger if exists t3a_immutable_columns on public.t3a_participant_profile;
create trigger t3a_immutable_columns before update on public.t3a_participant_profile for each row execute function public.t3a_refuse_column_change('account_id');

alter table public.t3a_participant_profile enable row level security;
revoke all on public.t3a_participant_profile from anon, authenticated;

grant select (account_id, legal_name, display_name, country_of_residence, subdivision_of_residence, city_of_residence, privacy_jurisdiction_code, preferred_language, timezone, occupation_interest, occupational_classification_version, profile_field_source, notification_channel_preference, target_industry_code, role_seniority_context_code, recruitment_channel_code, legal_name_capture_state, display_name_capture_state, country_of_residence_capture_state, subdivision_of_residence_capture_state, city_of_residence_capture_state, privacy_jurisdiction_code_capture_state, preferred_language_capture_state, timezone_capture_state, occupation_interest_capture_state, profile_field_source_capture_state, notification_channel_preference_capture_state, target_industry_code_capture_state, role_seniority_context_code_capture_state, recruitment_channel_code_capture_state, updated_at) on public.t3a_participant_profile to authenticated;

drop policy if exists t3a_participant_profile_own_read on public.t3a_participant_profile;
create policy t3a_participant_profile_own_read on public.t3a_participant_profile for select to authenticated using (account_id = auth.uid());

create table if not exists public.t3a_participant_document (
  document_id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.t3a_account(account_id),
  profile_document_ref text not null,
  uploaded_at timestamptz not null default now()
);

comment on table public.t3a_participant_document is 'Domain A uploaded profile documents (pointers only). Never evidence; no mentor read path.';

drop trigger if exists t3a_append_only on public.t3a_participant_document;
create trigger t3a_append_only before update or delete on public.t3a_participant_document for each row execute function public.t3a_deny_mutation();

alter table public.t3a_participant_document enable row level security;
revoke all on public.t3a_participant_document from anon, authenticated;

grant select (document_id, account_id, profile_document_ref, uploaded_at) on public.t3a_participant_document to authenticated;

drop policy if exists t3a_participant_document_own_read on public.t3a_participant_document;
create policy t3a_participant_document_own_read on public.t3a_participant_document for select to authenticated using (account_id = auth.uid());

create table if not exists public.t3a_participant_enrollment (
  account_id uuid not null references public.t3a_account(account_id),
  enrollment_event_id uuid primary key default gen_random_uuid(),
  enrollment_scope text not null,
  enrolled_at timestamptz not null default now(),
  check (enrollment_scope is null or enrollment_scope in ('rehearsal_product', 'observation_pathway', 'program'))
);

comment on table public.t3a_participant_enrollment is 'Domain A enrollments (participant.enrolled).';

drop trigger if exists t3a_append_only on public.t3a_participant_enrollment;
create trigger t3a_append_only before update or delete on public.t3a_participant_enrollment for each row execute function public.t3a_deny_mutation();

alter table public.t3a_participant_enrollment enable row level security;
revoke all on public.t3a_participant_enrollment from anon, authenticated;

grant select (account_id, enrollment_event_id, enrollment_scope, enrolled_at) on public.t3a_participant_enrollment to authenticated;

drop policy if exists t3a_participant_enrollment_own_read on public.t3a_participant_enrollment;
create policy t3a_participant_enrollment_own_read on public.t3a_participant_enrollment for select to authenticated using (account_id = auth.uid());

create table if not exists public.t3a_identity_assurance_socket (
  account_id uuid not null,
  identity_assurance_provider_ref uuid,
  identity_assurance_evidence_ref text
);

comment on table public.t3a_identity_assurance_socket is 'Domain A SOCKET: identity assurance by an external provider. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_identity_assurance_socket;
create trigger t3a_append_only before update or delete on public.t3a_identity_assurance_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_identity_assurance_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_identity_assurance_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_identity_assurance_socket enable row level security;
revoke all on public.t3a_identity_assurance_socket from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'A.account_id', 'M5', 't3a_account', 'account_id', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.account_created_at', 'M5', 't3a_account', 'account_created_at', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.account_creation_route', 'M5', 't3a_account', 'account_creation_route', 'account_creation_route_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.email_address', 'M5', 't3a_account', 'email_address', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.email_verification_state', 'M5', 't3a_account', 'email_verification_state', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.email_verification_sent_at', 'M5', 't3a_account', 'email_verification_sent_at', 'email_verification_sent_at_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.email_verified_at', 'M5', 't3a_account', 'email_verified_at', 'email_verified_at_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.identity_assurance_method', 'M5', 't3a_account', 'identity_assurance_method', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.age_eligibility_attestation', 'M5', 't3a_account', 'age_eligibility_attestation', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.record_property', 'M5', 't3a_account', 'record_property', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.pilot_cohort_id', 'M5', 't3a_account', 'pilot_cohort_id', 'pilot_cohort_id_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.account_state', 'M5', 't3a_account', 'account_state', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.identity_link_status', 'M5', 't3a_account', 'identity_link_status', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.participant_lifecycle_state', 'M5', 't3a_account', 'participant_lifecycle_state', 'participant_lifecycle_state_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_assignment_id', 'M5', 't3a_role_assignment', 'role_assignment_id', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_code', 'M5', 't3a_role_assignment', 'role_code', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_grant_basis', 'M5', 't3a_role_assignment', 'role_grant_basis', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_granted_by', 'M5', 't3a_role_assignment', 'role_granted_by', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_granted_at', 'M5', 't3a_role_assignment', 'role_granted_at', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_effective_from', 'M5', 't3a_role_assignment', 'role_effective_from', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_rules_version', 'M5', 't3a_role_assignment', 'role_rules_version', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_effective_until', 'M5', 't3a_role_assignment', 'role_effective_until', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.participant_pseudonym_ref', 'M5', 't3a_role_assignment', 'participant_pseudonym_ref', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_revoked_by', 'M5', 't3a_role_assignment_revocation', 'role_revoked_by', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_revoked_at', 'M5', 't3a_role_assignment_revocation', 'role_revoked_at', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_revocation_basis', 'M5', 't3a_role_assignment_revocation', 'role_revocation_basis', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.legal_name', 'M5', 't3a_participant_profile', 'legal_name', 'legal_name_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.display_name', 'M5', 't3a_participant_profile', 'display_name', 'display_name_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.country_of_residence', 'M5', 't3a_participant_profile', 'country_of_residence', 'country_of_residence_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.subdivision_of_residence', 'M5', 't3a_participant_profile', 'subdivision_of_residence', 'subdivision_of_residence_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.city_of_residence', 'M5', 't3a_participant_profile', 'city_of_residence', 'city_of_residence_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.privacy_jurisdiction_code', 'M5', 't3a_participant_profile', 'privacy_jurisdiction_code', 'privacy_jurisdiction_code_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.preferred_language', 'M5', 't3a_participant_profile', 'preferred_language', 'preferred_language_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.timezone', 'M5', 't3a_participant_profile', 'timezone', 'timezone_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.occupation_interest', 'M5', 't3a_participant_profile', 'occupation_interest', 'occupation_interest_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.occupational_classification_version', 'M5', 't3a_participant_profile', 'occupational_classification_version', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.profile_field_source', 'M5', 't3a_participant_profile', 'profile_field_source', 'profile_field_source_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.notification_channel_preference', 'M5', 't3a_participant_profile', 'notification_channel_preference', 'notification_channel_preference_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.target_industry_code', 'M5', 't3a_participant_profile', 'target_industry_code', 'target_industry_code_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.role_seniority_context_code', 'M5', 't3a_participant_profile', 'role_seniority_context_code', 'role_seniority_context_code_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.recruitment_channel_code', 'M5', 't3a_participant_profile', 'recruitment_channel_code', 'recruitment_channel_code_capture_state', 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.profile_document_ref', 'M5', 't3a_participant_document', 'profile_document_ref', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.enrollment_event_id', 'M5', 't3a_participant_enrollment', 'enrollment_event_id', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.enrollment_scope', 'M5', 't3a_participant_enrollment', 'enrollment_scope', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.enrolled_at', 'M5', 't3a_participant_enrollment', 'enrolled_at', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.identity_assurance_provider_ref', 'M5', 't3a_identity_assurance_socket', 'identity_assurance_provider_ref', null, 'day1-domain-A-generator', now(), null),
  ('1.3', 'A.identity_assurance_evidence_ref', 'M5', 't3a_identity_assurance_socket', 'identity_assurance_evidence_ref', null, 'day1-domain-A-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain A behaviour (hand written; the tables above are generated)
-- ---------------------------------------------------------------------------------------------

-- 1. DT-03 refusal log. The earlier guard (20260918000000) wrote the refusal row and then raised, and the raise
--    rolled the row back, so a refused attempt left no trace. Refusals now keep the transaction: the row is
--    written and the attempt has no effect (insert: no profile row; update: role unchanged).
create or replace function public.t3a_profiles_role_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_service boolean := public.t3a_is_service_context();
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if v_service or new.role is not distinct from 'candidate' then
      insert into public.t3a_role_grant_attempt (target_profile_id, attempted_by, from_role, to_role, operation, outcome, reason_code, service_context)
      values (new.id, v_actor, null, new.role, 'INSERT', 'permitted', null, v_service);
      return new;
    end if;
    insert into public.t3a_role_grant_attempt (target_profile_id, attempted_by, from_role, to_role, operation, outcome, reason_code, service_context)
    values (new.id, v_actor, null, new.role, 'INSERT', 'refused', 'ROLE_SELF_ASSERTION_REFUSED', false);
    raise notice 'ROLE_SELF_ASSERTION_REFUSED: a role other than candidate cannot be self-assigned. Mentor is by invitation; employer is by application.';
    return null;
  end if;
  if new.role is distinct from old.role then
    if v_service then
      insert into public.t3a_role_grant_attempt (target_profile_id, attempted_by, from_role, to_role, operation, outcome, reason_code, service_context)
      values (new.id, v_actor, old.role, new.role, 'UPDATE', 'permitted', null, true);
      return new;
    end if;
    insert into public.t3a_role_grant_attempt (target_profile_id, attempted_by, from_role, to_role, operation, outcome, reason_code, service_context)
    values (new.id, v_actor, old.role, new.role, 'UPDATE', 'refused', 'ROLE_SELF_ASSERTION_REFUSED', false);
    raise notice 'ROLE_SELF_ASSERTION_REFUSED: role is granted by The 3rd Academy and cannot be changed from a client session.';
    new.role := old.role;
  end if;
  return new;
end $$;

-- 2. Legacy role to Domain A role (provisional, CR-029).
create or replace function public.t3a_domain_a_role(p_legacy text)
returns table (role_code text, role_grant_basis text) language sql immutable as $$
  select case p_legacy when 'candidate' then 'participant' when 'mentor' then 'mentor' when 'employer' then 'employer_user'
                       when 'school_admin' then 'coordinator' when 'admin' then 'oversight_administrator' end,
         case p_legacy when 'candidate' then 'self_serve_individual' else 'administrator_grant' end
$$;

-- 3. Grant and revoke: server side only.
create or replace function public.t3a_grant_role(p_account uuid, p_role text, p_basis text, p_granted_by uuid, p_rules_version text default '1.0')
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_pseud uuid;
begin
  if not public.t3a_is_service_context() then
    raise exception 'ROLE_SELF_ASSERTION_REFUSED: roles are granted server side only' using errcode = '42501';
  end if;
  v_pseud := case when p_role = 'participant' then
    coalesce((select participant_pseudonym_ref from public.t3a_role_assignment where account_id = p_account and participant_pseudonym_ref is not null limit 1), gen_random_uuid()) end;
  insert into public.t3a_role_assignment (account_id, role_code, role_grant_basis, role_granted_by, role_rules_version, participant_pseudonym_ref)
  values (p_account, p_role, p_basis, p_granted_by, p_rules_version, v_pseud) returning role_assignment_id into v_id;
  return v_id;
end $$;

create or replace function public.t3a_revoke_role(p_assignment uuid, p_revoked_by uuid, p_basis text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.t3a_is_service_context() then
    raise exception 'ROLE_SELF_ASSERTION_REFUSED: roles are revoked server side only' using errcode = '42501';
  end if;
  insert into public.t3a_role_assignment_revocation (role_assignment_id, role_revoked_by, role_revoked_at, role_revocation_basis)
  values (p_assignment, p_revoked_by, now(), p_basis);
end $$;

-- 4. Keep the account root in step with auth.users and profiles (insert and verification).
create or replace function public.t3a_account_sync(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare u record; l text; m record;
begin
  select id, email, created_at, email_confirmed_at into u from auth.users where id = p_id;
  if not found then return; end if;
  select role::text into l from public.profiles where id = p_id;
  insert into public.t3a_account (account_id, account_created_at, account_creation_route, email_address, email_verification_state, email_verified_at, capture_gaps)
  values (u.id, u.created_at, case when l in ('mentor','employer') then 'legacy_unknown' else 'public_signup' end, lower(btrim(u.email)),
          case when u.email_confirmed_at is not null then 'verified' else 'unverified' end, u.email_confirmed_at, array['age_eligibility_attestation'])
  on conflict (account_id) do update set
    email_verification_state = excluded.email_verification_state, email_verified_at = excluded.email_verified_at, updated_at = now()
  where t3a_account.email_verification_state is distinct from excluded.email_verification_state;
  if l is not null and not exists (select 1 from public.t3a_role_assignment where account_id = p_id) then
    select * into m from public.t3a_domain_a_role(l);
    if m.role_code is not null then
      insert into public.t3a_role_assignment (account_id, role_code, role_grant_basis, role_granted_by, role_rules_version, participant_pseudonym_ref)
      values (p_id, m.role_code, m.role_grant_basis, p_id, '1.0', case when m.role_code = 'participant' then gen_random_uuid() end);
    end if;
  end if;
end $$;

create or replace function public.t3a_account_sync_profiles_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin perform public.t3a_account_sync(new.id); return new; end $$;
drop trigger if exists t3a_account_sync_trg on public.profiles;
create trigger t3a_account_sync_trg after insert on public.profiles for each row execute function public.t3a_account_sync_profiles_trg();

create or replace function public.t3a_account_sync_auth_trg() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at then perform public.t3a_account_sync(new.id); end if;
  return new;
end $$;
drop trigger if exists t3a_account_sync_auth on auth.users;
create trigger t3a_account_sync_auth after update on auth.users for each row execute function public.t3a_account_sync_auth_trg();

-- 5. Backfill existing accounts (no events: no history is invented).
select public.t3a_account_sync(id) from public.profiles;
