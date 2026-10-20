-- Day 1 Domain B: consent and permissions (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_b.py
-- and tools/day1/plans/domain_b_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py B      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 29 fields into t3a_field_physical_map.

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

create table if not exists public.t3a_consent_record (
  account_id uuid not null references public.t3a_account(account_id),
  consent_id uuid primary key default gen_random_uuid(),
  consent_type text not null,
  consent_status text not null,
  consent_timestamp timestamptz not null default now(),
  consent_copy_version text not null,
  consent_copy_hash char(64) not null,
  consent_method text not null,
  consent_language text not null,
  consent_scope_dimension_id text,
  consent_scope_dimension_id_capture_state text not null default 'not_captured' check (consent_scope_dimension_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  consent_scope_stage_code text,
  consent_scope_stage_code_capture_state text not null default 'not_captured' check (consent_scope_stage_code_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  consequence_displayed boolean,
  ip_address_hash char(64),
  ip_address_hash_capture_state text not null default 'not_captured' check (ip_address_hash_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  processing_purpose_id text not null,
  authorization_basis_type text not null,
  consent_actor_id uuid not null,
  consent_effective_at timestamptz,
  consent_effective_at_capture_state text not null default 'not_captured' check (consent_effective_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  consent_expires_at timestamptz,
  consent_expires_at_capture_state text not null default 'not_captured' check (consent_expires_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  historical_reuse_scope text not null default 'future_only',
  recorded_seq bigint generated always as identity,
  check (consent_type is null or consent_type in ('scenario_logging', 'mentor_observation', 'followup_contact', 'employer_share', 'aggregate_regional', 'research_participation')),
  check (consent_type in ('scenario_logging','mentor_observation','employer_share')),
  check (consent_status is null or consent_status in ('granted', 'declined', 'withdrawn')),
  check (consent_copy_version is null or consent_copy_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (consent_copy_hash is null or consent_copy_hash ~ '^[0-9a-f]{64}$'),
  check (consent_method is null or consent_method in ('checkbox', 'e_signature', 'in_session_confirmation', 'verbal_confirmed_accessibility')),
  check (consent_language ~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'),
  check (consent_scope_dimension_id is null or consent_scope_dimension_id in ('D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14')),
  check ((consent_scope_dimension_id is not null) = (consent_scope_dimension_id_capture_state = 'captured')),
  check (consent_scope_stage_code is null or consent_scope_stage_code in ('S1', 'S2', 'S3', 'S4')),
  check ((consent_scope_stage_code is not null) = (consent_scope_stage_code_capture_state = 'captured')),
  check (consent_status <> 'withdrawn' or consequence_displayed is true),
  check (ip_address_hash is null or ip_address_hash ~ '^[0-9a-f]{64}$'),
  check ((ip_address_hash is not null) = (ip_address_hash_capture_state = 'captured')),
  check (processing_purpose_id in ('rehearsal','observation','longitudinal_comparison','report_release','contact','research','institutional_aggregate','followup')),
  check (authorization_basis_type is null or authorization_basis_type in ('consent', 'contract_necessity', 'legal_obligation')),
  check ((consent_effective_at is not null) = (consent_effective_at_capture_state = 'captured')),
  check ((consent_expires_at is not null) = (consent_expires_at_capture_state = 'captured')),
  check (historical_reuse_scope is null or historical_reuse_scope in ('future_only', 'includes_prior_records')),
  check (consent_type <> 'mentor_observation' or consent_scope_dimension_id is not null or consent_status = 'declined')
);

comment on table public.t3a_consent_record is 'Domain B consent records. One consent type per row, never inherited across dimensions. A later record supersedes an earlier one through t3a_consent_supersession; nothing is edited or deleted.';

create index if not exists t3a_consent_record_lookup_idx on public.t3a_consent_record (account_id, consent_type, consent_scope_dimension_id, recorded_seq desc);

drop trigger if exists t3a_capture_state_fill on public.t3a_consent_record;
create trigger t3a_capture_state_fill before insert or update on public.t3a_consent_record for each row execute function public.t3a_capture_state_fill('consent_scope_dimension_id:consent_scope_dimension_id_capture_state', 'consent_scope_stage_code:consent_scope_stage_code_capture_state', 'ip_address_hash:ip_address_hash_capture_state', 'consent_effective_at:consent_effective_at_capture_state', 'consent_expires_at:consent_expires_at_capture_state');

drop trigger if exists t3a_append_only on public.t3a_consent_record;
create trigger t3a_append_only before update or delete on public.t3a_consent_record for each row execute function public.t3a_deny_mutation();

alter table public.t3a_consent_record enable row level security;
revoke all on public.t3a_consent_record from anon, authenticated;

grant select (account_id, consent_id, consent_type, consent_status, consent_timestamp, consent_copy_version, consent_copy_hash, consent_method, consent_language, consent_scope_dimension_id, consent_scope_stage_code, consequence_displayed, ip_address_hash, processing_purpose_id, authorization_basis_type, consent_actor_id, consent_effective_at, consent_expires_at, historical_reuse_scope, consent_scope_dimension_id_capture_state, consent_scope_stage_code_capture_state, ip_address_hash_capture_state, consent_effective_at_capture_state, consent_expires_at_capture_state, recorded_seq) on public.t3a_consent_record to authenticated;

drop policy if exists t3a_consent_record_own_read on public.t3a_consent_record;
create policy t3a_consent_record_own_read on public.t3a_consent_record for select to authenticated using (account_id = auth.uid());

create table if not exists public.t3a_consent_supersession (
  consent_id uuid primary key references public.t3a_consent_record(consent_id),
  superseded_by uuid not null,
  foreign key (superseded_by) references public.t3a_consent_record(consent_id)
);

comment on table public.t3a_consent_supersession is 'Domain B supersession pointers: which later record replaced an earlier one.';

drop trigger if exists t3a_append_only on public.t3a_consent_supersession;
create trigger t3a_append_only before update or delete on public.t3a_consent_supersession for each row execute function public.t3a_deny_mutation();

alter table public.t3a_consent_supersession enable row level security;
revoke all on public.t3a_consent_supersession from anon, authenticated;

create table if not exists public.t3a_consent_state_ref (
  account_id uuid not null references public.t3a_account(account_id),
  consent_state_ref uuid primary key default gen_random_uuid(),
  consent_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

comment on table public.t3a_consent_state_ref is 'Domain B pointer to the consent records current at a capture; stamped on capture records.';

drop trigger if exists t3a_append_only on public.t3a_consent_state_ref;
create trigger t3a_append_only before update or delete on public.t3a_consent_state_ref for each row execute function public.t3a_deny_mutation();

alter table public.t3a_consent_state_ref enable row level security;
revoke all on public.t3a_consent_state_ref from anon, authenticated;

create table if not exists public.t3a_privacy_notice_acknowledgement (
  acknowledgement_id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.t3a_account(account_id),
  privacy_notice_version text not null,
  privacy_notice_hash char(64) not null,
  acknowledged_at timestamptz not null default now(),
  check (privacy_notice_version is null or privacy_notice_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (privacy_notice_hash is null or privacy_notice_hash ~ '^[0-9a-f]{64}$')
);

comment on table public.t3a_privacy_notice_acknowledgement is 'Domain B privacy notice acknowledgements (participant.notice_acknowledged).';

drop trigger if exists t3a_append_only on public.t3a_privacy_notice_acknowledgement;
create trigger t3a_append_only before update or delete on public.t3a_privacy_notice_acknowledgement for each row execute function public.t3a_deny_mutation();

alter table public.t3a_privacy_notice_acknowledgement enable row level security;
revoke all on public.t3a_privacy_notice_acknowledgement from anon, authenticated;

grant select (acknowledgement_id, account_id, privacy_notice_version, privacy_notice_hash, acknowledged_at) on public.t3a_privacy_notice_acknowledgement to authenticated;

drop policy if exists t3a_privacy_notice_acknowledgement_own_read on public.t3a_privacy_notice_acknowledgement;
create policy t3a_privacy_notice_acknowledgement_own_read on public.t3a_privacy_notice_acknowledgement for select to authenticated using (account_id = auth.uid());

create table if not exists public.t3a_contact_consent (
  contact_consent_id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.t3a_account(account_id),
  contact_consent_status text,
  contact_consent_status_capture_state text not null default 'not_captured' check (contact_consent_status_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  contact_consent_at timestamptz,
  contact_consent_at_capture_state text not null default 'not_captured' check (contact_consent_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  recorded_at timestamptz not null default now(),
  check (contact_consent_status is null or contact_consent_status in ('granted', 'declined', 'withdrawn')),
  check ((contact_consent_status is not null) = (contact_consent_status_capture_state = 'captured')),
  check ((contact_consent_at is not null) = (contact_consent_at_capture_state = 'captured'))
);

comment on table public.t3a_contact_consent is 'Domain B contact permission, separate from report availability. Each change is a new row.';

drop trigger if exists t3a_capture_state_fill on public.t3a_contact_consent;
create trigger t3a_capture_state_fill before insert or update on public.t3a_contact_consent for each row execute function public.t3a_capture_state_fill('contact_consent_status:contact_consent_status_capture_state', 'contact_consent_at:contact_consent_at_capture_state');

drop trigger if exists t3a_append_only on public.t3a_contact_consent;
create trigger t3a_append_only before update or delete on public.t3a_contact_consent for each row execute function public.t3a_deny_mutation();

alter table public.t3a_contact_consent enable row level security;
revoke all on public.t3a_contact_consent from anon, authenticated;

grant select (contact_consent_id, account_id, contact_consent_status, contact_consent_at, contact_consent_status_capture_state, contact_consent_at_capture_state, recorded_at) on public.t3a_contact_consent to authenticated;

drop policy if exists t3a_contact_consent_own_read on public.t3a_contact_consent;
create policy t3a_contact_consent_own_read on public.t3a_contact_consent for select to authenticated using (account_id = auth.uid());

create table if not exists public.t3a_lsa_consent (
  account_id uuid not null,
  lsa_consent_state text,
  lsa_consent_state_capture_state text not null default 'not_captured' check (lsa_consent_state_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  lsa_consent_text_version text,
  lsa_consent_text_version_capture_state text not null default 'not_captured' check (lsa_consent_text_version_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  lsa_consent_timestamp timestamptz,
  lsa_consent_timestamp_capture_state text not null default 'not_captured' check (lsa_consent_timestamp_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  lsa_withdrawal_timestamp timestamptz,
  lsa_withdrawal_timestamp_capture_state text not null default 'not_captured' check (lsa_withdrawal_timestamp_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  check (lsa_consent_state is null or lsa_consent_state in ('never_asked', 'granted', 'declined', 'withdrawn')),
  check ((lsa_consent_state is not null) = (lsa_consent_state_capture_state = 'captured')),
  check (lsa_consent_text_version is null or lsa_consent_text_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check ((lsa_consent_text_version is not null) = (lsa_consent_text_version_capture_state = 'captured')),
  check ((lsa_consent_timestamp is not null) = (lsa_consent_timestamp_capture_state = 'captured')),
  check ((lsa_withdrawal_timestamp is not null) = (lsa_withdrawal_timestamp_capture_state = 'captured'))
);

comment on table public.t3a_lsa_consent is 'Domain B DORMANT: Session Archive consent. Structure only; every write is refused until the consent text is loaded and activation is ordered.';

drop trigger if exists t3a_capture_state_fill on public.t3a_lsa_consent;
create trigger t3a_capture_state_fill before insert or update on public.t3a_lsa_consent for each row execute function public.t3a_capture_state_fill('lsa_consent_state:lsa_consent_state_capture_state', 'lsa_consent_text_version:lsa_consent_text_version_capture_state', 'lsa_consent_timestamp:lsa_consent_timestamp_capture_state', 'lsa_withdrawal_timestamp:lsa_withdrawal_timestamp_capture_state');

drop trigger if exists t3a_append_only on public.t3a_lsa_consent;
create trigger t3a_append_only before update or delete on public.t3a_lsa_consent for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_lsa_consent;
create trigger t3a_socket_closed before insert or update on public.t3a_lsa_consent for each row execute function public.t3a_socket_closed();

alter table public.t3a_lsa_consent enable row level security;
revoke all on public.t3a_lsa_consent from anon, authenticated;

create table if not exists public.t3a_group_participation_socket (
  account_id uuid not null,
  group_participation_record_id uuid
);

comment on table public.t3a_group_participation_socket is 'Domain B SOCKET: Stage 4 group participation permission. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_group_participation_socket;
create trigger t3a_append_only before update or delete on public.t3a_group_participation_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_group_participation_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_group_participation_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_group_participation_socket enable row level security;
revoke all on public.t3a_group_participation_socket from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'B.consent_id', 'M5', 't3a_consent_record', 'consent_id', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_type', 'M5', 't3a_consent_record', 'consent_type', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_status', 'M5', 't3a_consent_record', 'consent_status', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_timestamp', 'M5', 't3a_consent_record', 'consent_timestamp', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_copy_version', 'M5', 't3a_consent_record', 'consent_copy_version', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_copy_hash', 'M5', 't3a_consent_record', 'consent_copy_hash', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_method', 'M5', 't3a_consent_record', 'consent_method', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_language', 'M5', 't3a_consent_record', 'consent_language', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_scope_dimension_id', 'M5', 't3a_consent_record', 'consent_scope_dimension_id', 'consent_scope_dimension_id_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_scope_stage_code', 'M5', 't3a_consent_record', 'consent_scope_stage_code', 'consent_scope_stage_code_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consequence_displayed', 'M5', 't3a_consent_record', 'consequence_displayed', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.ip_address_hash', 'M5', 't3a_consent_record', 'ip_address_hash', 'ip_address_hash_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.processing_purpose_id', 'M5', 't3a_consent_record', 'processing_purpose_id', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.authorization_basis_type', 'M5', 't3a_consent_record', 'authorization_basis_type', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_actor_id', 'M5', 't3a_consent_record', 'consent_actor_id', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_effective_at', 'M5', 't3a_consent_record', 'consent_effective_at', 'consent_effective_at_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_expires_at', 'M5', 't3a_consent_record', 'consent_expires_at', 'consent_expires_at_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.historical_reuse_scope', 'M5', 't3a_consent_record', 'historical_reuse_scope', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.superseded_by', 'M5', 't3a_consent_supersession', 'superseded_by', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.consent_state_ref', 'M5', 't3a_consent_state_ref', 'consent_state_ref', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.privacy_notice_version', 'M5', 't3a_privacy_notice_acknowledgement', 'privacy_notice_version', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.privacy_notice_hash', 'M5', 't3a_privacy_notice_acknowledgement', 'privacy_notice_hash', null, 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.contact_consent_status', 'M5', 't3a_contact_consent', 'contact_consent_status', 'contact_consent_status_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.contact_consent_at', 'M5', 't3a_contact_consent', 'contact_consent_at', 'contact_consent_at_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.lsa_consent_state', 'M5', 't3a_lsa_consent', 'lsa_consent_state', 'lsa_consent_state_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.lsa_consent_text_version', 'M5', 't3a_lsa_consent', 'lsa_consent_text_version', 'lsa_consent_text_version_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.lsa_consent_timestamp', 'M5', 't3a_lsa_consent', 'lsa_consent_timestamp', 'lsa_consent_timestamp_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.lsa_withdrawal_timestamp', 'M5', 't3a_lsa_consent', 'lsa_withdrawal_timestamp', 'lsa_withdrawal_timestamp_capture_state', 'day1-domain-B-generator', now(), null),
  ('1.3', 'B.group_participation_record_id', 'M5', 't3a_group_participation_socket', 'group_participation_record_id', null, 'day1-domain-B-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain B behaviour (hand written; the tables above are generated)
-- ---------------------------------------------------------------------------------------------

create table if not exists public.t3a_consent_config (
  singleton boolean primary key default true check (singleton),
  enforce_gate boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table public.t3a_consent_config is 'Domain B switch. enforce_gate false (default): Stage entry and capture are not yet refused for want of consent, because the live screens still write the older consent tables (CR-035).';
insert into public.t3a_consent_config (singleton) values (true) on conflict do nothing;
alter table public.t3a_consent_config enable row level security;
revoke all on public.t3a_consent_config from anon, authenticated;

create table if not exists public.t3a_consent_refusal (
  refusal_id uuid primary key default gen_random_uuid(),
  account_id uuid,
  consent_type text,
  reason_code text not null,
  detail text,
  refused_at timestamptz not null default now()
);
comment on table public.t3a_consent_refusal is 'Domain B refused consent interactions (DT-05, DT-08). No consent row exists for these.';
drop trigger if exists t3a_append_only on public.t3a_consent_refusal;
create trigger t3a_append_only before update or delete on public.t3a_consent_refusal for each row execute function public.t3a_deny_mutation();
alter table public.t3a_consent_refusal enable row level security;
revoke all on public.t3a_consent_refusal from anon, authenticated;

-- Current status of one consent type for one scope. Exact dimension match: consent is never inherited.
-- A record with no stage code covers every stage of its dimension.
create or replace function public.t3a_consent_current(p_account uuid, p_type text, p_dim text, p_stage text default null)
returns text language sql stable security definer set search_path = public as $$
  select consent_status from public.t3a_consent_record
   where account_id = p_account and consent_type = p_type
     and consent_scope_dimension_id is not distinct from p_dim
     and (consent_scope_stage_code is null or consent_scope_stage_code is not distinct from p_stage)
     and (consent_expires_at is null or consent_expires_at > now())
   order by recorded_seq desc limit 1
$$;

create or replace function public.t3a_consent_refuse(p_account uuid, p_type text, p_reason text, p_detail text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  insert into public.t3a_consent_refusal (account_id, consent_type, reason_code, detail) values (p_account, left(p_type, 80), p_reason, p_detail);
  return jsonb_build_object('outcome', 'refused', 'reason', p_reason, 'detail', p_detail);
end $$;

-- One consent interaction = one call = one consent type. Refusals are logged and return; they do not raise, so the log is kept.
create or replace function public.t3a_record_consent(
  p_account uuid, p_type text, p_status text, p_dim text, p_stage text,
  p_copy_version text, p_copy_hash text, p_method text, p_language text, p_purpose text,
  p_reuse text default 'future_only', p_consequence_displayed boolean default null, p_ip_hash text default null,
  p_expires timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare v_actor uuid := coalesce(auth.uid(), p_account); v_id uuid := gen_random_uuid(); v_prev uuid; v_evt text;
begin
  if not public.t3a_is_service_context() and auth.uid() is distinct from p_account then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_ACTOR_MISMATCH', 'a person records consent only for their own account');
  end if;
  if p_type is null or p_type ~ '[,;\[\]{} ]' then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_ONE_TYPE_PER_INTERACTION', 'one interaction carries exactly one consent_type');
  end if;
  if p_type in ('followup_contact', 'aggregate_regional', 'research_participation') then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_ROUTE_DISABLED', p_type || ' capture is not enabled');
  end if;
  if p_type not in ('scenario_logging', 'mentor_observation', 'employer_share') then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSENT_TYPE_UNKNOWN', 'not a listed consent_type');
  end if;
  if p_status = 'withdrawn' and p_consequence_displayed is not true then
    return public.t3a_consent_refuse(p_account, p_type, 'CONSEQUENCE_NOT_DISPLAYED', 'the consequence of withdrawal must be shown before it is processed');
  end if;
  if not exists (select 1 from public.t3a_account where account_id = p_account) then
    return public.t3a_consent_refuse(p_account, p_type, 'ACCOUNT_UNKNOWN', 'no such account');
  end if;
  select consent_id into v_prev from public.t3a_consent_record
   where account_id = p_account and consent_type = p_type and consent_scope_dimension_id is not distinct from p_dim
     and consent_scope_stage_code is not distinct from p_stage
     and not exists (select 1 from public.t3a_consent_supersession s where s.consent_id = t3a_consent_record.consent_id)
   order by recorded_seq desc limit 1;
  insert into public.t3a_consent_record (consent_id, account_id, consent_type, consent_status, consent_copy_version, consent_copy_hash, consent_method,
      consent_language, consent_scope_dimension_id, consent_scope_stage_code, consequence_displayed, ip_address_hash, processing_purpose_id,
      authorization_basis_type, consent_actor_id, consent_effective_at, consent_expires_at, historical_reuse_scope)
  values (v_id, p_account, p_type, p_status, p_copy_version, p_copy_hash, p_method, p_language, p_dim, p_stage, p_consequence_displayed,
      p_ip_hash, p_purpose, 'consent', v_actor, now(), p_expires, p_reuse);
  if v_prev is not null then
    insert into public.t3a_consent_supersession (consent_id, superseded_by) values (v_prev, v_id);
  end if;
  v_evt := 'consent.' || p_status;
  perform public.t3a_emit_event(v_evt, 'PARTICIPANT', v_actor::text, 'participant', 'consent', v_id,
    case when p_status = 'withdrawn' then jsonb_build_object('consent_id', v_id, 'consequence_displayed', true) else jsonb_build_object('consent_id', v_id) end,
    'consent:' || v_id, null, p_account);
  return jsonb_build_object('outcome', 'recorded', 'consent_id', v_id, 'event', v_evt);
end $$;
revoke all on function public.t3a_record_consent(uuid,text,text,text,text,text,text,text,text,text,text,boolean,text,timestamptz) from public, anon;
grant execute on function public.t3a_record_consent(uuid,text,text,text,text,text,text,text,text,text,text,boolean,text,timestamptz) to authenticated, service_role;

-- Session Archive consent state: never_asked while no consent text is loaded and nothing has been recorded (DT-09).
create or replace function public.t3a_lsa_consent_state(p_account uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select lsa_consent_state from public.t3a_lsa_consent where account_id = p_account order by lsa_consent_timestamp desc nulls last limit 1), 'never_asked')
$$;

-- Gate: Stage entry and committed observation need current consent for that dimension (DT-06, DT-07).
-- Off until the enforce_gate switch is turned on, so the live screens keep working (CR-035).
create or replace function public.t3a_require_consent() returns trigger language plpgsql security definer set search_path = public as $$
declare v_dim text := to_jsonb(new)->>'dimension_id'; v_pid uuid := (to_jsonb(new)->>'participant_id')::uuid; v_stage text := to_jsonb(new)->>'stage_code';
  v_type text := tg_argv[0];
begin
  if not (select enforce_gate from public.t3a_consent_config) or v_pid is null then return new; end if;
  if public.t3a_consent_current(v_pid, v_type, v_dim, v_stage) is distinct from 'granted' then
    raise exception 'CONSENT_REQUIRED: % consent for dimension % is not granted; consent is never inherited across dimensions', v_type, coalesce(v_dim, 'unspecified') using errcode = '42501';
  end if;
  return new;
end $$;

do $$
declare r record;
begin
  for r in select * from (values ('t3a_stage_entry_event','mentor_observation'), ('t3a_observation','scenario_logging')) v(tbl, ctype) loop
    if to_regclass('public.' || r.tbl) is null then raise notice 'route % is absent', r.tbl; continue; end if;
    execute format('drop trigger if exists t3a_1_consent_gate_trg on public.%I', r.tbl);
    execute format('create trigger t3a_1_consent_gate_trg before insert on public.%I for each row execute function public.t3a_require_consent(%L)', r.tbl, r.ctype);
  end loop;
end $$;

-- The canonical consent record is now t3a_consent_record. consent.* events point their consent_id at it (CR-035).
update public.t3a_event_reference_rule set ref_table = 't3a_consent_record', ref_column = 'consent_id',
  note = 'Domain B: canonical consent record (was the legacy t3a_d1_consent)' where payload_key = 'consent_id';
