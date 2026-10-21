-- Day 1 Domain G: evidence state, report, review, issuance and release (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_g.py
-- and tools/day1/plans/domain_g_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py G      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 37 fields into t3a_field_physical_map.

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


-- t3a_dimension_evidence: extended in place (existing rows are kept)

alter table public.t3a_dimension_evidence add column if not exists insufficiency_reason_capture_state text not null default 'not_captured' check (insufficiency_reason_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_dimension_evidence add column if not exists dimension_evidence_state text ;

alter table public.t3a_dimension_evidence add column if not exists cross_cutting_condition_flags text[] ;

alter table public.t3a_dimension_evidence add column if not exists cross_cutting_condition_flags_capture_state text not null default 'not_captured' check (cross_cutting_condition_flags_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

update public.t3a_dimension_evidence set insufficiency_reason_capture_state = 'captured' where insufficiency_reason is not null and insufficiency_reason_capture_state = 'not_captured';

update public.t3a_dimension_evidence set cross_cutting_condition_flags_capture_state = 'captured' where cross_cutting_condition_flags is not null and cross_cutting_condition_flags_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_dimension_evidence;
create trigger t3a_capture_state_fill before insert or update on public.t3a_dimension_evidence for each row execute function public.t3a_capture_state_fill('insufficiency_reason:insufficiency_reason_capture_state', 'cross_cutting_condition_flags:cross_cutting_condition_flags_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_dimension_evidence;
create trigger t3a_2_required_fields_trg before insert on public.t3a_dimension_evidence for each row execute function public.t3a_require_fields('dimension_evidence_state');

-- t3a_d1_ber_report: extended in place (existing rows are kept)

alter table public.t3a_d1_ber_report add column if not exists ber_version text check (ber_version is null or ber_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_d1_ber_report add column if not exists ber_standard_version text check (ber_standard_version is null or ber_standard_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_d1_ber_report add column if not exists permitted_use_version text check (permitted_use_version is null or permitted_use_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_d1_ber_report add column if not exists represented_dimension_ids text[] ;

alter table public.t3a_d1_ber_report add column if not exists observer_multiplicity_statement_code text ;

alter table public.t3a_d1_ber_report add column if not exists source_link jsonb ;

alter table public.t3a_d1_ber_report add column if not exists ber_status text check (ber_status is null or ber_status in ('not_eligible', 'assembling', 'reviewer_review', 'participant_review', 'challenge_open', 'ready_to_issue', 'issued', 'amended', 'withdrawn', 'expired', 'evidence_expired'));

alter table public.t3a_d1_ber_report add column if not exists participant_review_opened_at timestamptz ;

alter table public.t3a_d1_ber_report add column if not exists participant_review_opened_at_capture_state text not null default 'not_captured' check (participant_review_opened_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_d1_ber_report add column if not exists participant_review_completed_at timestamptz ;

alter table public.t3a_d1_ber_report add column if not exists participant_review_completed_at_capture_state text not null default 'not_captured' check (participant_review_completed_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_d1_ber_report add column if not exists specimen_render_flag boolean ;

alter table public.t3a_d1_ber_report add column if not exists report_type text check (report_type is null or report_type in ('ber', 'lsa'));

alter table public.t3a_d1_ber_report add column if not exists report_preview_digest char(64) check (report_preview_digest is null or report_preview_digest ~ '^[0-9a-f]{64}$');

alter table public.t3a_d1_ber_report add column if not exists preview_state text check (preview_state is null or preview_state in ('current', 'stale'));

alter table public.t3a_d1_ber_report add column if not exists report_content_digest char(64) check (report_content_digest is null or report_content_digest ~ '^[0-9a-f]{64}$');

alter table public.t3a_d1_ber_report add column if not exists verification_code text ;

update public.t3a_d1_ber_report set participant_review_opened_at_capture_state = 'captured' where participant_review_opened_at is not null and participant_review_opened_at_capture_state = 'not_captured';

update public.t3a_d1_ber_report set participant_review_completed_at_capture_state = 'captured' where participant_review_completed_at is not null and participant_review_completed_at_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_d1_ber_report;
create trigger t3a_capture_state_fill before insert or update on public.t3a_d1_ber_report for each row execute function public.t3a_capture_state_fill('participant_review_opened_at:participant_review_opened_at_capture_state', 'participant_review_completed_at:participant_review_completed_at_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_d1_ber_report;
create trigger t3a_2_required_fields_trg before insert on public.t3a_d1_ber_report for each row execute function public.t3a_require_fields('ber_version', 'ber_standard_version', 'permitted_use_version', 'represented_dimension_ids', 'observer_multiplicity_statement_code', 'source_link', 'ber_status', 'specimen_render_flag', 'report_type', 'report_preview_digest', 'preview_state', 'report_content_digest', 'verification_code');

create unique index if not exists t3a_d1_ber_report_verification_code_uq on public.t3a_d1_ber_report (verification_code) where verification_code is not null;

-- t3a_d1_report_issuance: extended in place (existing rows are kept)

create table if not exists public.t3a_evidence_review (
  ber_report_id uuid not null references public.t3a_d1_ber_report(ber_report_id),
  evidence_review_id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null,
  review_completed_at timestamptz not null default now(),
  version_set_hash char(64) not null,
  review_checklist_results jsonb not null,
  check (version_set_hash is null or version_set_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.t3a_evidence_review is 'Domain G evidence review: who reviewed which report, when, against which version set. The reviewer cannot issue the report.';

drop trigger if exists t3a_append_only on public.t3a_evidence_review;
create trigger t3a_append_only before update or delete on public.t3a_evidence_review for each row execute function public.t3a_deny_mutation();

alter table public.t3a_evidence_review enable row level security;
revoke all on public.t3a_evidence_review from anon, authenticated;

create table if not exists public.t3a_report_release (
  ber_report_id uuid not null references public.t3a_d1_ber_report(ber_report_id),
  recipient_release_id uuid primary key default gen_random_uuid(),
  release_mode text not null,
  recipient_address_hash char(64),
  token_state text not null default 'active',
  employer_visibility_state text not null default 'not_available',
  availability_changed_at timestamptz not null default now(),
  talentvisa_active boolean,
  talentvisa_active_capture_state text not null default 'not_captured' check (talentvisa_active_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  created_at timestamptz not null default now(),
  check (release_mode is null or release_mode in ('named_pilot_recipient', 'approved_employer_pool')),
  check (recipient_address_hash is null or recipient_address_hash ~ '^[0-9a-f]{64}$'),
  check ((release_mode = 'named_pilot_recipient') = (recipient_address_hash is not null)),
  check (token_state is null or token_state in ('active', 'revoked', 'expired', 'superseded')),
  check (employer_visibility_state is null or employer_visibility_state in ('available_to_approved_employers', 'not_available', 'future_availability_withdrawn')),
  check ((talentvisa_active is not null) = (talentvisa_active_capture_state = 'captured'))
);

comment on table public.t3a_report_release is 'Domain G release records: pool visibility and any named recipient release. Only the token state and the visibility state move.';

drop trigger if exists t3a_capture_state_fill on public.t3a_report_release;
create trigger t3a_capture_state_fill before insert or update on public.t3a_report_release for each row execute function public.t3a_capture_state_fill('talentvisa_active:talentvisa_active_capture_state');

drop trigger if exists t3a_immutable_columns on public.t3a_report_release;
create trigger t3a_immutable_columns before update on public.t3a_report_release for each row execute function public.t3a_refuse_column_change('recipient_release_id', 'ber_report_id', 'release_mode', 'recipient_address_hash', 'created_at');

alter table public.t3a_report_release enable row level security;
revoke all on public.t3a_report_release from anon, authenticated;

create table if not exists public.t3a_report_access (
  ber_report_id uuid not null references public.t3a_d1_ber_report(ber_report_id),
  accessor_id uuid,
  report_access_id uuid primary key default gen_random_uuid(),
  accessed_at timestamptz not null default now()
);

comment on table public.t3a_report_access is 'Domain G report access records: one row each time a report is opened.';

drop trigger if exists t3a_append_only on public.t3a_report_access;
create trigger t3a_append_only before update or delete on public.t3a_report_access for each row execute function public.t3a_deny_mutation();

alter table public.t3a_report_access enable row level security;
revoke all on public.t3a_report_access from anon, authenticated;

create table if not exists public.t3a_verification_check (
  ber_report_id uuid references public.t3a_d1_ber_report(ber_report_id),
  outcome text not null,
  verification_check_id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now()
);

comment on table public.t3a_verification_check is 'Domain G verification checks: one row each time a verification code is looked up.';

drop trigger if exists t3a_append_only on public.t3a_verification_check;
create trigger t3a_append_only before update or delete on public.t3a_verification_check for each row execute function public.t3a_deny_mutation();

alter table public.t3a_verification_check enable row level security;
revoke all on public.t3a_verification_check from anon, authenticated;

create table if not exists public.t3a_job_family_socket (
  ber_report_id uuid,
  job_family text
);

comment on table public.t3a_job_family_socket is 'Domain G SOCKET: job family. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_job_family_socket;
create trigger t3a_append_only before update or delete on public.t3a_job_family_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_job_family_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_job_family_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_job_family_socket enable row level security;
revoke all on public.t3a_job_family_socket from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'G.insufficiency_reason', 'M1', 't3a_dimension_evidence', 'insufficiency_reason', 'insufficiency_reason_capture_state', 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.sufficiency_rules_version', 'M1', 't3a_dimension_evidence', 'sufficiency_rules_version', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.dimension_evidence_state', 'M5', 't3a_dimension_evidence', 'dimension_evidence_state', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.cross_cutting_condition_flags', 'M5', 't3a_dimension_evidence', 'cross_cutting_condition_flags', 'cross_cutting_condition_flags_capture_state', 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.ber_report_id', 'M1', 't3a_d1_ber_report', 'ber_report_id', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.ber_version', 'M5', 't3a_d1_ber_report', 'ber_version', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.ber_standard_version', 'M5', 't3a_d1_ber_report', 'ber_standard_version', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.permitted_use_version', 'M5', 't3a_d1_ber_report', 'permitted_use_version', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.represented_dimension_ids', 'M5', 't3a_d1_ber_report', 'represented_dimension_ids', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.observer_multiplicity_statement_code', 'M5', 't3a_d1_ber_report', 'observer_multiplicity_statement_code', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.source_link', 'M5', 't3a_d1_ber_report', 'source_link', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.ber_status', 'M5', 't3a_d1_ber_report', 'ber_status', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.participant_review_opened_at', 'M5', 't3a_d1_ber_report', 'participant_review_opened_at', 'participant_review_opened_at_capture_state', 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.participant_review_completed_at', 'M5', 't3a_d1_ber_report', 'participant_review_completed_at', 'participant_review_completed_at_capture_state', 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.specimen_render_flag', 'M5', 't3a_d1_ber_report', 'specimen_render_flag', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.report_type', 'M5', 't3a_d1_ber_report', 'report_type', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.report_preview_digest', 'M5', 't3a_d1_ber_report', 'report_preview_digest', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.preview_state', 'M5', 't3a_d1_ber_report', 'preview_state', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.report_content_digest', 'M5', 't3a_d1_ber_report', 'report_content_digest', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.verification_code', 'M5', 't3a_d1_ber_report', 'verification_code', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.issued_by', 'M1', 't3a_d1_report_issuance', 'issued_by', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.issued_at', 'M1', 't3a_d1_report_issuance', 'issued_at', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.evidence_review_id', 'M5', 't3a_evidence_review', 'evidence_review_id', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.reviewer_id', 'M5', 't3a_evidence_review', 'reviewer_id', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.review_completed_at', 'M5', 't3a_evidence_review', 'review_completed_at', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.version_set_hash', 'M5', 't3a_evidence_review', 'version_set_hash', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.review_checklist_results', 'M5', 't3a_evidence_review', 'review_checklist_results', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.recipient_release_id', 'M5', 't3a_report_release', 'recipient_release_id', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.release_mode', 'M5', 't3a_report_release', 'release_mode', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.recipient_address_hash', 'M5', 't3a_report_release', 'recipient_address_hash', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.token_state', 'M5', 't3a_report_release', 'token_state', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.employer_visibility_state', 'M5', 't3a_report_release', 'employer_visibility_state', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.availability_changed_at', 'M5', 't3a_report_release', 'availability_changed_at', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.talentvisa_active', 'M5', 't3a_report_release', 'talentvisa_active', 'talentvisa_active_capture_state', 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.report_access_id', 'M5', 't3a_report_access', 'report_access_id', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.verification_check_id', 'M5', 't3a_verification_check', 'verification_check_id', null, 'day1-domain-G-generator', now(), null),
  ('1.3', 'G.job_family', 'M5', 't3a_job_family_socket', 'job_family', null, 'day1-domain-G-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain G behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- DT-28: the verification code is random and cannot be derived from the report id.
create or replace function public.t3a_ber_verification_code() returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.verification_code is null then
    new.verification_code := upper(encode(gen_random_bytes(10), 'hex'));
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_verification_code_trg on public.t3a_d1_ber_report;
create trigger t3a_1_verification_code_trg before insert on public.t3a_d1_ber_report for each row execute function public.t3a_ber_verification_code();

-- DT-27: the reviewer is not the issuer.
create or replace function public.t3a_reviewer_not_issuer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.t3a_evidence_review r where r.ber_report_id = new.ber_report_id and r.reviewer_id = new.issued_by) then
    raise exception 'REVIEWER_IS_ISSUER: the person who reviewed the evidence for this report cannot issue it' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_reviewer_not_issuer_trg on public.t3a_d1_report_issuance;
create trigger t3a_1_reviewer_not_issuer_trg before insert on public.t3a_d1_report_issuance for each row execute function public.t3a_reviewer_not_issuer();

-- A review cannot be recorded by the person who already issued the same report (the other order of the same rule).
create or replace function public.t3a_issuer_not_reviewer() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.t3a_d1_report_issuance i where i.ber_report_id = new.ber_report_id and i.issued_by = new.reviewer_id) then
    raise exception 'REVIEWER_IS_ISSUER: the issuer of this report cannot also be its reviewer' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_issuer_not_reviewer_trg on public.t3a_evidence_review;
create trigger t3a_1_issuer_not_reviewer_trg before insert on public.t3a_evidence_review for each row execute function public.t3a_issuer_not_reviewer();

-- Visibility moves only to a listed state and its change time follows.
create or replace function public.t3a_release_visibility_time() returns trigger language plpgsql as $$
begin
  if new.employer_visibility_state is distinct from old.employer_visibility_state then new.availability_changed_at := now(); end if;
  if old.employer_visibility_state = 'future_availability_withdrawn' and new.employer_visibility_state <> 'future_availability_withdrawn' then
    raise exception 'T3A_VISIBILITY_WITHDRAWN: a withdrawal of future availability cannot be reversed in place' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_release_visibility_trg on public.t3a_report_release;
create trigger t3a_1_release_visibility_trg before update on public.t3a_report_release for each row execute function public.t3a_release_visibility_time();
