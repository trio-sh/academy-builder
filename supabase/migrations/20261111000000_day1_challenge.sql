-- Day 1 Domain H: challenge, correction and complaint (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_h.py
-- and tools/day1/plans/domain_h_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py H      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 17 fields into t3a_field_physical_map.

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


-- t3a_challenge_case: extended in place (existing rows are kept)

alter table public.t3a_challenge_case add column if not exists evidence_disclosed_at_capture_state text not null default 'not_captured' check (evidence_disclosed_at_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_challenge_case add column if not exists opened_by uuid ;

alter table public.t3a_challenge_case add column if not exists challenge_target_ref uuid ;

alter table public.t3a_challenge_case add column if not exists second_check_actor_id uuid ;

alter table public.t3a_challenge_case add column if not exists challenge_outcome text check (challenge_outcome is null or challenge_outcome in ('upheld', 'amended', 'clause_withdrawn', 'not_upheld'));

alter table public.t3a_challenge_case add column if not exists outcome_reason_code text ;

alter table public.t3a_challenge_case add column if not exists resolved_at timestamptz ;

alter table public.t3a_challenge_case add column if not exists response_time_committed_version text check (response_time_committed_version is null or response_time_committed_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_challenge_case add column if not exists issuance_hold boolean ;

update public.t3a_challenge_case set evidence_disclosed_at_capture_state = 'captured' where evidence_disclosed_at is not null and evidence_disclosed_at_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_challenge_case;
create trigger t3a_capture_state_fill before insert or update on public.t3a_challenge_case for each row execute function public.t3a_capture_state_fill('evidence_disclosed_at:evidence_disclosed_at_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_challenge_case;
create trigger t3a_2_required_fields_trg before insert on public.t3a_challenge_case for each row execute function public.t3a_require_fields('opened_by', 'challenge_target_ref', 'second_check_actor_id', 'challenge_outcome', 'outcome_reason_code', 'resolved_at', 'response_time_committed_version', 'issuance_hold');

-- t3a_reconsideration_assignment: extended in place (existing rows are kept)

create table if not exists public.t3a_correction_request (
  ber_report_id uuid references public.t3a_d1_ber_report(ber_report_id),
  participant_id uuid not null,
  requested_at timestamptz not null default now(),
  correction_request_id uuid primary key default gen_random_uuid(),
  correction_outcome text,
  check (correction_outcome is null or correction_outcome ~ '^[a-z0-9_]{1,64}$')
);

comment on table public.t3a_correction_request is 'Domain H correction requests. The outcome is a controlled code set once.';

drop trigger if exists t3a_immutable_columns on public.t3a_correction_request;
create trigger t3a_immutable_columns before update on public.t3a_correction_request for each row execute function public.t3a_refuse_column_change('correction_request_id', 'ber_report_id', 'participant_id', 'requested_at');

alter table public.t3a_correction_request enable row level security;
revoke all on public.t3a_correction_request from anon, authenticated;

create table if not exists public.t3a_complaint (
  participant_id uuid not null,
  raised_at timestamptz not null default now(),
  complaint_id uuid primary key default gen_random_uuid(),
  complaint_acknowledged_at timestamptz
);

comment on table public.t3a_complaint is 'Domain H complaints. The acknowledgement time is set once.';

drop trigger if exists t3a_immutable_columns on public.t3a_complaint;
create trigger t3a_immutable_columns before update on public.t3a_complaint for each row execute function public.t3a_refuse_column_change('complaint_id', 'participant_id', 'raised_at');

alter table public.t3a_complaint enable row level security;
revoke all on public.t3a_complaint from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'H.challenge_case_id', 'M1', 't3a_challenge_case', 'challenge_case_id', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.challenge_ground', 'M1', 't3a_challenge_case', 'challenge_ground', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.evidence_disclosed_at', 'M1', 't3a_challenge_case', 'evidence_disclosed_at', 'evidence_disclosed_at_capture_state', 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.opened_at', 'M3', 't3a_challenge_case', 'created_at', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.opened_by', 'M5', 't3a_challenge_case', 'opened_by', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.challenge_target_ref', 'M5', 't3a_challenge_case', 'challenge_target_ref', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.second_check_actor_id', 'M5', 't3a_challenge_case', 'second_check_actor_id', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.challenge_outcome', 'M5', 't3a_challenge_case', 'challenge_outcome', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.outcome_reason_code', 'M5', 't3a_challenge_case', 'outcome_reason_code', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.resolved_at', 'M5', 't3a_challenge_case', 'resolved_at', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.response_time_committed_version', 'M5', 't3a_challenge_case', 'response_time_committed_version', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.issuance_hold', 'M5', 't3a_challenge_case', 'issuance_hold', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.reconsiderer_id', 'M1', 't3a_reconsideration_assignment', 'reconsiderer_id', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.correction_request_id', 'M5', 't3a_correction_request', 'correction_request_id', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.correction_outcome', 'M5', 't3a_correction_request', 'correction_outcome', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.complaint_id', 'M5', 't3a_complaint', 'complaint_id', null, 'day1-domain-H-generator', now(), null),
  ('1.3', 'H.complaint_acknowledged_at', 'M5', 't3a_complaint', 'complaint_acknowledged_at', null, 'day1-domain-H-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain H behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

drop trigger if exists t3a_set_once_trg on public.t3a_correction_request;
create trigger t3a_set_once_trg before update on public.t3a_correction_request for each row execute function public.t3a_set_once('correction_outcome');
drop trigger if exists t3a_set_once_trg on public.t3a_complaint;
create trigger t3a_set_once_trg before update on public.t3a_complaint for each row execute function public.t3a_set_once('complaint_acknowledged_at');

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 't3a_challenge_case_outcome_chk') then
    alter table public.t3a_challenge_case add constraint t3a_challenge_case_outcome_chk check (challenge_outcome is null or challenge_outcome in ('upheld', 'amended', 'clause_withdrawn', 'not_upheld')) not valid;
    -- an outcome carries its reason code and its resolution time; a second check is a different person from the reconsiderer is enforced below
    alter table public.t3a_challenge_case add constraint t3a_challenge_case_resolution_chk check (challenge_outcome is null or (outcome_reason_code is not null and resolved_at is not null)) not valid;
    alter table public.t3a_challenge_case add constraint t3a_challenge_case_reason_code_chk check (outcome_reason_code is null or outcome_reason_code ~ '^[A-Za-z0-9_.:-]{1,64}$') not valid;
  end if;
end $$;

-- An upheld, amended or withdrawn-clause outcome needs a second check by someone other than the reconsiderer.
create or replace function public.t3a_challenge_second_check() returns trigger language plpgsql security definer set search_path = public as $$
declare v_recon uuid;
begin
  select reconsiderer_id into v_recon from public.t3a_reconsideration_assignment ra
   join public.t3a_correction_case cc on cc.correction_case_id = ra.correction_case_id where (cc.ber_report_id = new.ber_report_id or cc.ber_report_id = new.d1_ber_report_id) and ra.reconsiderer_id is not null limit 1;
  if new.second_check_actor_id is not null and (new.second_check_actor_id = v_recon or new.second_check_actor_id = new.opened_by) then
    raise exception 'SECOND_CHECK_NOT_INDEPENDENT: the second check is done by someone other than the reconsiderer and the person who opened the challenge' using errcode = '42501';
  end if;
  if new.challenge_outcome in ('upheld', 'amended', 'clause_withdrawn') and new.second_check_actor_id is null then
    raise exception 'SECOND_CHECK_REQUIRED: an outcome that changes the report needs a second check' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_second_check_trg on public.t3a_challenge_case;
create trigger t3a_1_second_check_trg before insert or update on public.t3a_challenge_case for each row execute function public.t3a_challenge_second_check();

-- The challenge table points at the older t3a_ber_report while issuance points at t3a_d1_ber_report (CR-052); this column ties a challenge to the D1 report.
alter table public.t3a_challenge_case add column if not exists d1_ber_report_id uuid references public.t3a_d1_ber_report(ber_report_id);

-- An open challenge with issuance_hold true holds the report: it cannot be issued until the challenge is resolved.
create or replace function public.t3a_issuance_hold() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.t3a_challenge_case c where (c.d1_ber_report_id = new.ber_report_id or c.ber_report_id = new.ber_report_id) and c.issuance_hold is true and c.resolved_at is null) then
    raise exception 'ISSUANCE_HELD: an open challenge holds this report until it is resolved' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_issuance_hold_trg on public.t3a_d1_report_issuance;
create trigger t3a_1_issuance_hold_trg before insert on public.t3a_d1_report_issuance for each row execute function public.t3a_issuance_hold();
