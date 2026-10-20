-- Day 1 Domain I: employer application, verification, pool and contact (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_i.py
-- and tools/day1/plans/domain_i_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py I      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 34 fields into t3a_field_physical_map.

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


-- t3a_employer_application: extended in place (existing rows are kept)

alter table public.t3a_employer_application add column if not exists application_status text check (application_status is null or application_status in ('pending', 'approved', 'declined', 'withdrawn'));

alter table public.t3a_employer_application add column if not exists free_provider_refused boolean ;

alter table public.t3a_employer_application add column if not exists free_provider_refused_capture_state text not null default 'not_captured' check (free_provider_refused_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_employer_application add column if not exists domain_age_flag boolean ;

alter table public.t3a_employer_application add column if not exists domain_age_flag_capture_state text not null default 'not_captured' check (domain_age_flag_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_employer_application add column if not exists accepting_person_name text ;

alter table public.t3a_employer_application add column if not exists accepting_person_title text ;

alter table public.t3a_employer_application add column if not exists record_use_terms_version text check (record_use_terms_version is null or record_use_terms_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_employer_application add column if not exists terms_accepted_at timestamptz ;

alter table public.t3a_employer_application add column if not exists approver_id uuid ;

update public.t3a_employer_application set free_provider_refused_capture_state = 'captured' where free_provider_refused is not null and free_provider_refused_capture_state = 'not_captured';

update public.t3a_employer_application set domain_age_flag_capture_state = 'captured' where domain_age_flag is not null and domain_age_flag_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_employer_application;
create trigger t3a_capture_state_fill before insert or update on public.t3a_employer_application for each row execute function public.t3a_capture_state_fill('free_provider_refused:free_provider_refused_capture_state', 'domain_age_flag:domain_age_flag_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_employer_application;
create trigger t3a_2_required_fields_trg before insert on public.t3a_employer_application for each row execute function public.t3a_require_fields('application_status', 'accepting_person_name', 'accepting_person_title', 'record_use_terms_version', 'terms_accepted_at', 'approver_id');

create table if not exists public.t3a_employer_organization (
  application_id uuid references public.t3a_employer_application(application_id),
  organization_id uuid primary key default gen_random_uuid(),
  verification_status text not null default 'pending',
  liveworks_activation_state text,
  liveworks_activation_state_capture_state text not null default 'not_captured' check (liveworks_activation_state_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  design_partner_flag boolean,
  design_partner_flag_capture_state text not null default 'not_captured' check (design_partner_flag_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verification_status is null or verification_status in ('pending', 'verified', 'not_verified')),
  check (liveworks_activation_state is null or liveworks_activation_state in ('not_activated', 'activated')),
  check ((liveworks_activation_state is not null) = (liveworks_activation_state_capture_state = 'captured')),
  check ((design_partner_flag is not null) = (design_partner_flag_capture_state = 'captured'))
);

comment on table public.t3a_employer_organization is 'Domain I employer organizations. Created on approval of an application; verification status and activation move, nothing else.';

drop trigger if exists t3a_capture_state_fill on public.t3a_employer_organization;
create trigger t3a_capture_state_fill before insert or update on public.t3a_employer_organization for each row execute function public.t3a_capture_state_fill('liveworks_activation_state:liveworks_activation_state_capture_state', 'design_partner_flag:design_partner_flag_capture_state');

drop trigger if exists t3a_immutable_columns on public.t3a_employer_organization;
create trigger t3a_immutable_columns before update on public.t3a_employer_organization for each row execute function public.t3a_refuse_column_change('organization_id', 'application_id', 'created_at');

alter table public.t3a_employer_organization enable row level security;
revoke all on public.t3a_employer_organization from anon, authenticated;

create table if not exists public.t3a_employer_pool_query (
  organization_id uuid not null references public.t3a_employer_organization(organization_id),
  criteria jsonb not null,
  pool_query_id uuid primary key default gen_random_uuid(),
  queried_at timestamptz not null default now()
);

comment on table public.t3a_employer_pool_query is 'Domain I pool queries. Criteria are limited to participant stated fields; the criteria are stored as asked.';

drop trigger if exists t3a_append_only on public.t3a_employer_pool_query;
create trigger t3a_append_only before update or delete on public.t3a_employer_pool_query for each row execute function public.t3a_deny_mutation();

alter table public.t3a_employer_pool_query enable row level security;
revoke all on public.t3a_employer_pool_query from anon, authenticated;

create table if not exists public.t3a_employer_contact_request (
  organization_id uuid not null references public.t3a_employer_organization(organization_id),
  requested_at timestamptz not null default now(),
  contact_request_id uuid primary key default gen_random_uuid(),
  contact_request_state text not null default 'requested',
  check (contact_request_state in ('requested', 'accepted', 'declined', 'withdrawn', 'expired'))
);

comment on table public.t3a_employer_contact_request is 'Domain I contact requests. The state moves; the request does not.';

drop trigger if exists t3a_immutable_columns on public.t3a_employer_contact_request;
create trigger t3a_immutable_columns before update on public.t3a_employer_contact_request for each row execute function public.t3a_refuse_column_change('contact_request_id', 'organization_id', 'requested_at');

alter table public.t3a_employer_contact_request enable row level security;
revoke all on public.t3a_employer_contact_request from anon, authenticated;

create table if not exists public.t3a_hire_record (
  organization_id uuid not null references public.t3a_employer_organization(organization_id),
  hire_recorded_id uuid primary key default gen_random_uuid(),
  recorded_at timestamptz not null default now()
);

comment on table public.t3a_hire_record is 'Domain I hire records. A hire row carries no participant and no report reference (DT-33).';

drop trigger if exists t3a_append_only on public.t3a_hire_record;
create trigger t3a_append_only before update or delete on public.t3a_hire_record for each row execute function public.t3a_deny_mutation();

alter table public.t3a_hire_record enable row level security;
revoke all on public.t3a_hire_record from anon, authenticated;

create table if not exists public.t3a_employer_attestation (
  organization_id uuid not null references public.t3a_employer_organization(organization_id),
  employer_attestation_id uuid primary key default gen_random_uuid(),
  attested_at timestamptz not null default now()
);

comment on table public.t3a_employer_attestation is 'Domain I employer attestations. Organization level; no participant reference.';

drop trigger if exists t3a_append_only on public.t3a_employer_attestation;
create trigger t3a_append_only before update or delete on public.t3a_employer_attestation for each row execute function public.t3a_deny_mutation();

alter table public.t3a_employer_attestation enable row level security;
revoke all on public.t3a_employer_attestation from anon, authenticated;

create table if not exists public.t3a_workspace_note (
  organization_id uuid not null references public.t3a_employer_organization(organization_id),
  workspace_note_id uuid primary key default gen_random_uuid(),
  noted_at timestamptz not null default now()
);

comment on table public.t3a_workspace_note is 'Domain I workspace notes. Organization level; a note holds a pointer, not report content.';

drop trigger if exists t3a_append_only on public.t3a_workspace_note;
create trigger t3a_append_only before update or delete on public.t3a_workspace_note for each row execute function public.t3a_deny_mutation();

alter table public.t3a_workspace_note enable row level security;
revoke all on public.t3a_workspace_note from anon, authenticated;

create table if not exists public.t3a_employment_linkage_socket (
  employment_linkage_id uuid,
  linked_participant_id uuid,
  linked_organization_id uuid,
  linked_role_code text,
  employment_start_date timestamptz,
  employer_respondent_id uuid,
  respondent_role text,
  ats_hris_integration_ref uuid
);

comment on table public.t3a_employment_linkage_socket is 'Domain I SOCKET: employment linkage and follow-up. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_employment_linkage_socket;
create trigger t3a_append_only before update or delete on public.t3a_employment_linkage_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_employment_linkage_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_employment_linkage_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_employment_linkage_socket enable row level security;
revoke all on public.t3a_employment_linkage_socket from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'I.employer_application_id', 'M3', 't3a_employer_application', 'application_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.work_email', 'M1', 't3a_employer_application', 'work_email', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.legal_entity_name', 'M3', 't3a_employer_application', 'organization_legal_name', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.business_registry_id', 'M3', 't3a_employer_application', 'business_number', null, 'day1-domain-I-generator', now(), 'live column is text; the dictionary type is an identifier (CR-055)'),
  ('1.3', 'I.organization_domain', 'M3', 't3a_employer_application', 'email_domain', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.approval_decision', 'M1', 't3a_employer_application', 'approval_decision', null, 'day1-domain-I-generator', now(), 'live column is text; the dictionary has two values (CR-055)'),
  ('1.3', 'I.decided_at', 'M3', 't3a_employer_application', 'approved_at', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.decision_basis', 'M3', 't3a_employer_application', 'approval_basis', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.application_status', 'M5', 't3a_employer_application', 'application_status', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.free_provider_refused', 'M5', 't3a_employer_application', 'free_provider_refused', 'free_provider_refused_capture_state', 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.domain_age_flag', 'M5', 't3a_employer_application', 'domain_age_flag', 'domain_age_flag_capture_state', 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.accepting_person_name', 'M5', 't3a_employer_application', 'accepting_person_name', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.accepting_person_title', 'M5', 't3a_employer_application', 'accepting_person_title', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.record_use_terms_version', 'M5', 't3a_employer_application', 'record_use_terms_version', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.terms_accepted_at', 'M5', 't3a_employer_application', 'terms_accepted_at', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.approver_id', 'M5', 't3a_employer_application', 'approver_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.organization_id', 'M5', 't3a_employer_organization', 'organization_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.verification_status', 'M5', 't3a_employer_organization', 'verification_status', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.liveworks_activation_state', 'M5', 't3a_employer_organization', 'liveworks_activation_state', 'liveworks_activation_state_capture_state', 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.design_partner_flag', 'M5', 't3a_employer_organization', 'design_partner_flag', 'design_partner_flag_capture_state', 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.pool_query_id', 'M5', 't3a_employer_pool_query', 'pool_query_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.contact_request_id', 'M5', 't3a_employer_contact_request', 'contact_request_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.contact_request_state', 'M5', 't3a_employer_contact_request', 'contact_request_state', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.hire_recorded_id', 'M5', 't3a_hire_record', 'hire_recorded_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.employer_attestation_id', 'M5', 't3a_employer_attestation', 'employer_attestation_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.workspace_note_id', 'M5', 't3a_workspace_note', 'workspace_note_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.employment_linkage_id', 'M5', 't3a_employment_linkage_socket', 'employment_linkage_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.linked_participant_id', 'M5', 't3a_employment_linkage_socket', 'linked_participant_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.linked_organization_id', 'M5', 't3a_employment_linkage_socket', 'linked_organization_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.linked_role_code', 'M5', 't3a_employment_linkage_socket', 'linked_role_code', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.employment_start_date', 'M5', 't3a_employment_linkage_socket', 'employment_start_date', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.employer_respondent_id', 'M5', 't3a_employment_linkage_socket', 'employer_respondent_id', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.respondent_role', 'M5', 't3a_employment_linkage_socket', 'respondent_role', null, 'day1-domain-I-generator', now(), null),
  ('1.3', 'I.ats_hris_integration_ref', 'M5', 't3a_employment_linkage_socket', 'ats_hris_integration_ref', null, 'day1-domain-I-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain I behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- Free email providers are refused on application (the dictionary field free_provider_refused records it).
create table if not exists public.t3a_employer_free_provider (domain text primary key check (domain = lower(domain)));
insert into public.t3a_employer_free_provider (domain) values ('gmail.com'), ('yahoo.com'), ('hotmail.com'), ('outlook.com'), ('live.com'), ('aol.com'), ('icloud.com'), ('proton.me'), ('protonmail.com'), ('gmx.com'), ('mail.com'), ('yandex.com'), ('zoho.com')
  on conflict do nothing;
alter table public.t3a_employer_free_provider enable row level security;
revoke all on public.t3a_employer_free_provider from anon, authenticated;

-- the live column is email_domain (organization_domain is the dictionary name); keep both aligned
create or replace function public.t3a_employer_application_fill_live() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email_domain := coalesce(new.email_domain, split_part(lower(new.work_email), '@', 2));
  if new.work_email is not null and exists (select 1 from public.t3a_employer_free_provider f where f.domain = split_part(lower(new.work_email), '@', 2)) then
    new.free_provider_refused := true;
    new.application_status := 'declined';
    new.approval_decision := coalesce(new.approval_decision, 'declined');
  elsif new.free_provider_refused is null then
    new.free_provider_refused := false;
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_employer_application_fill_trg on public.t3a_employer_application;
create trigger t3a_1_employer_application_fill_trg before insert on public.t3a_employer_application for each row execute function public.t3a_employer_application_fill_live();

-- The live check allowed approved and withdrawn only; the dictionary adds declined (CR-055). The table is empty in production.
alter table public.t3a_employer_application drop constraint if exists t3a_employer_application_approval_decision_check;
alter table public.t3a_employer_application add constraint t3a_employer_application_approval_decision_check check (approval_decision is null or approval_decision in ('approved', 'declined', 'withdrawn'));

-- An approved application creates the organization (pending verification); only a verified organization is served.
create or replace function public.t3a_employer_is_verified(p_org uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select verification_status = 'verified' from public.t3a_employer_organization where organization_id = p_org), false)
$$;

-- Pool queries: only participant stated fields may be criteria (DT-34); only a verified organization may ask (DT-35).
-- A refusal is logged and returned; it carries no count or metadata.
create or replace function public.t3a_pool_query(p_org uuid, p_criteria jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; bad text[] := '{}'; allowed text[] := array['occupation_interest', 'country_of_residence', 'subdivision_of_residence', 'city_of_residence',
  'preferred_language', 'target_industry_code', 'role_seniority_context_code', 'recruitment_channel_code', 'timezone']; v_id uuid;
begin
  if not public.t3a_employer_is_verified(p_org) then
    return public.t3a_capture_refuse('employer.pool_query', 'EMPLOYER_NOT_VERIFIED', p_org::text, 'a pending or unverified organization receives nothing');
  end if;
  for k in select jsonb_object_keys(coalesce(p_criteria, '{}'::jsonb)) loop
    if not k = any (allowed) then bad := bad || k; end if;
  end loop;
  if cardinality(bad) > 0 then
    return public.t3a_capture_refuse('employer.pool_query', 'POOL_CRITERION_NOT_ALLOWED', p_org::text, 'criteria are limited to participant stated fields; refused: ' || array_to_string(bad, ', '));
  end if;
  insert into public.t3a_employer_pool_query (organization_id, criteria) values (p_org, coalesce(p_criteria, '{}'::jsonb)) returning pool_query_id into v_id;
  return jsonb_build_object('outcome', 'accepted', 'pool_query_id', v_id);
end $$;
revoke all on function public.t3a_pool_query(uuid, jsonb) from public, anon;
grant execute on function public.t3a_pool_query(uuid, jsonb) to authenticated, service_role;

-- The same gate for a report or count request.
create or replace function public.t3a_employer_gate(p_org uuid, p_route text) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.t3a_employer_is_verified(p_org) then
    return public.t3a_capture_refuse('employer.' || p_route, 'EMPLOYER_NOT_VERIFIED', p_org::text, 'a pending or unverified organization receives nothing');
  end if;
  return jsonb_build_object('outcome', 'allowed');
end $$;
revoke all on function public.t3a_employer_gate(uuid, text) from public, anon;
grant execute on function public.t3a_employer_gate(uuid, text) to authenticated, service_role;
