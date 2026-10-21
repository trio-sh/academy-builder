-- Day 1 Domain R: partner organizations, programs, cohorts and jurisdiction (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_r.py
-- and tools/day1/plans/domain_r_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py R      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 18 fields into t3a_field_physical_map.

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

create table if not exists public.t3a_partner_organization (
  partner_organization_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_type text not null,
  organization_industry_code text,
  organization_industry_code_capture_state text not null default 'not_captured' check (organization_industry_code_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  partner_relationship_effective_at timestamptz,
  partner_relationship_ended_at timestamptz,
  data_use_agreement_ref uuid,
  check (organization_type is null or organization_type in ('employer', 'workforce_agency', 'settlement_agency', 'professional_association', 'education_provider', 'community_organization', 'other')),
  check ((organization_industry_code is not null) = (organization_industry_code_capture_state = 'captured')),
  check (partner_relationship_ended_at is null or partner_relationship_effective_at is null or partner_relationship_ended_at >= partner_relationship_effective_at)
);

comment on table public.t3a_partner_organization is 'Domain R partner organizations: type, industry, relationship dates and the data use agreement. Organization level; no participant data.';

drop trigger if exists t3a_capture_state_fill on public.t3a_partner_organization;
create trigger t3a_capture_state_fill before insert or update on public.t3a_partner_organization for each row execute function public.t3a_capture_state_fill('organization_industry_code:organization_industry_code_capture_state');

drop trigger if exists t3a_immutable_columns on public.t3a_partner_organization;
create trigger t3a_immutable_columns before update on public.t3a_partner_organization for each row execute function public.t3a_refuse_column_change('partner_organization_id', 'organization_type', 'created_at');

alter table public.t3a_partner_organization enable row level security;
revoke all on public.t3a_partner_organization from anon, authenticated;

create table if not exists public.t3a_program (
  partner_organization_id uuid not null references public.t3a_partner_organization(partner_organization_id),
  created_at timestamptz not null default now(),
  organization_program_id uuid primary key default gen_random_uuid(),
  program_version text not null,
  check (program_version is null or program_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$')
);

comment on table public.t3a_program is 'Domain R programs: each program version is a row. A change is a new version, never an edit.';

drop trigger if exists t3a_append_only on public.t3a_program;
create trigger t3a_append_only before update or delete on public.t3a_program for each row execute function public.t3a_deny_mutation();

alter table public.t3a_program enable row level security;
revoke all on public.t3a_program from anon, authenticated;

create table if not exists public.t3a_program_membership (
  account_id uuid not null references public.t3a_account(account_id),
  organization_program_id uuid not null references public.t3a_program(organization_program_id),
  program_membership_id uuid primary key default gen_random_uuid(),
  program_enrolled_at timestamptz default now(),
  program_exit_at timestamptz,
  membership_basis_ref uuid,
  check (program_exit_at is null or program_enrolled_at is null or program_exit_at >= program_enrolled_at)
);

comment on table public.t3a_program_membership is 'Domain R program membership. Enrolment is set at creation; the exit time is set once; the basis is a pointer.';

drop trigger if exists t3a_immutable_columns on public.t3a_program_membership;
create trigger t3a_immutable_columns before update on public.t3a_program_membership for each row execute function public.t3a_refuse_column_change('program_membership_id', 'account_id', 'organization_program_id', 'program_enrolled_at');

alter table public.t3a_program_membership enable row level security;
revoke all on public.t3a_program_membership from anon, authenticated;

create table if not exists public.t3a_cohort (
  created_at timestamptz not null default now(),
  cohort_id uuid primary key default gen_random_uuid(),
  cohort_type text not null,
  cohort_definition_version text not null,
  operating_jurisdiction_code text not null,
  jurisdiction_rule_version text not null,
  check (cohort_type is null or cohort_type in ('pilot', 'program', 'design_partner')),
  check (cohort_definition_version is null or cohort_definition_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (operating_jurisdiction_code ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'),
  check (jurisdiction_rule_version is null or jurisdiction_rule_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$')
);

comment on table public.t3a_cohort is 'Domain R cohorts: type, definition version and operating jurisdiction with its rule version. Insert only.';

drop trigger if exists t3a_append_only on public.t3a_cohort;
create trigger t3a_append_only before update or delete on public.t3a_cohort for each row execute function public.t3a_deny_mutation();

alter table public.t3a_cohort enable row level security;
revoke all on public.t3a_cohort from anon, authenticated;

create table if not exists public.t3a_institutional_socket (
  institutional_tenant_id uuid,
  institutional_export_purpose_id uuid
);

comment on table public.t3a_institutional_socket is 'Domain R SOCKET: institutional tenant and export purpose. Structure only; every write is refused. Cross organization isolation holds because no tenant exists (DT-55).';

drop trigger if exists t3a_append_only on public.t3a_institutional_socket;
create trigger t3a_append_only before update or delete on public.t3a_institutional_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_institutional_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_institutional_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_institutional_socket enable row level security;
revoke all on public.t3a_institutional_socket from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'R.organization_type', 'M5', 't3a_partner_organization', 'organization_type', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.organization_industry_code', 'M5', 't3a_partner_organization', 'organization_industry_code', 'organization_industry_code_capture_state', 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.partner_relationship_effective_at', 'M5', 't3a_partner_organization', 'partner_relationship_effective_at', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.partner_relationship_ended_at', 'M5', 't3a_partner_organization', 'partner_relationship_ended_at', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.data_use_agreement_ref', 'M5', 't3a_partner_organization', 'data_use_agreement_ref', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.organization_program_id', 'M5', 't3a_program', 'organization_program_id', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.program_version', 'M5', 't3a_program', 'program_version', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.program_membership_id', 'M5', 't3a_program_membership', 'program_membership_id', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.program_enrolled_at', 'M5', 't3a_program_membership', 'program_enrolled_at', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.program_exit_at', 'M5', 't3a_program_membership', 'program_exit_at', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.membership_basis_ref', 'M5', 't3a_program_membership', 'membership_basis_ref', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.cohort_id', 'M5', 't3a_cohort', 'cohort_id', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.cohort_type', 'M5', 't3a_cohort', 'cohort_type', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.cohort_definition_version', 'M5', 't3a_cohort', 'cohort_definition_version', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.operating_jurisdiction_code', 'M5', 't3a_cohort', 'operating_jurisdiction_code', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.jurisdiction_rule_version', 'M5', 't3a_cohort', 'jurisdiction_rule_version', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.institutional_tenant_id', 'M5', 't3a_institutional_socket', 'institutional_tenant_id', null, 'day1-domain-R-generator', now(), null),
  ('1.3', 'R.institutional_export_purpose_id', 'M5', 't3a_institutional_socket', 'institutional_export_purpose_id', null, 'day1-domain-R-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain R behaviour (hand written; tables above are generated)
-- ---------------------------------------------------------------------------------------------

drop trigger if exists t3a_set_once_trg on public.t3a_program_membership;
create trigger t3a_set_once_trg before update on public.t3a_program_membership for each row execute function public.t3a_set_once('program_exit_at');
drop trigger if exists t3a_set_once_trg on public.t3a_partner_organization;
create trigger t3a_set_once_trg before update on public.t3a_partner_organization for each row execute function public.t3a_set_once('partner_relationship_effective_at', 'partner_relationship_ended_at', 'data_use_agreement_ref');

-- No role reads another organization's rows: these tables have no client grant at all. Reads go through service functions that name one organization.
create or replace function public.t3a_partner_visible(p_partner uuid) returns boolean language sql stable security definer set search_path = public as $$
  select false
$$;
comment on function public.t3a_partner_visible(uuid) is 'Domain R: no organization may see another organization''s records. Always false until a tenant model is ordered (the socket stays empty, DT-55).';
revoke all on function public.t3a_partner_visible(uuid) from public, anon;
grant execute on function public.t3a_partner_visible(uuid) to authenticated, service_role;
