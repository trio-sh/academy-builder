-- Day 1 Domain M: Session Archive structures (dormant) (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_m.py
-- and tools/day1/plans/domain_m_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py M      (verify with --check)
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

create table if not exists public.t3a_lsa_snapshot (
  account_id uuid,
  lsa_snapshot_id uuid,
  snapshot_at timestamptz,
  pinned_version_set jsonb,
  lsa_comparison_result jsonb
);

comment on table public.t3a_lsa_snapshot is 'Domain M DORMANT: Session Archive snapshot. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_lsa_snapshot;
create trigger t3a_append_only before update or delete on public.t3a_lsa_snapshot for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_lsa_snapshot;
create trigger t3a_socket_closed before insert or update on public.t3a_lsa_snapshot for each row execute function public.t3a_socket_closed();

alter table public.t3a_lsa_snapshot enable row level security;
revoke all on public.t3a_lsa_snapshot from anon, authenticated;

create table if not exists public.t3a_lsa_report (
  account_id uuid,
  lsa_report_id uuid,
  lsa_verification_code text
);

comment on table public.t3a_lsa_report is 'Domain M DORMANT: Session Archive report. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_lsa_report;
create trigger t3a_append_only before update or delete on public.t3a_lsa_report for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_lsa_report;
create trigger t3a_socket_closed before insert or update on public.t3a_lsa_report for each row execute function public.t3a_socket_closed();

alter table public.t3a_lsa_report enable row level security;
revoke all on public.t3a_lsa_report from anon, authenticated;

create table if not exists public.t3a_longitudinal_case (
  account_id uuid,
  longitudinal_case_id uuid,
  comparison_scope_id uuid,
  included_observation_refs uuid[],
  excluded_observation_refs uuid[],
  exclusion_reason_codes text[],
  counterevidence_refs uuid[],
  transition_rule_version text,
  lsa_sufficiency_rule_version text,
  resolution_trace_ref uuid,
  finding_code text,
  check (transition_rule_version is null or transition_rule_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (lsa_sufficiency_rule_version is null or lsa_sufficiency_rule_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (finding_code is null or finding_code in ('progression', 'regression', 'consistency', 'mixed', 'descriptive_only', 'insufficient', 'incomparable'))
);

comment on table public.t3a_longitudinal_case is 'Domain M DORMANT: longitudinal case with its scope, inclusions, exclusions and finding. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_longitudinal_case;
create trigger t3a_append_only before update or delete on public.t3a_longitudinal_case for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_longitudinal_case;
create trigger t3a_socket_closed before insert or update on public.t3a_longitudinal_case for each row execute function public.t3a_socket_closed();

alter table public.t3a_longitudinal_case enable row level security;
revoke all on public.t3a_longitudinal_case from anon, authenticated;

create table if not exists public.t3a_lsa_sidecar (
  account_id uuid,
  lsa_sidecar_id uuid,
  lsa_sidecar_id_capture_state text not null default 'not_captured' check (lsa_sidecar_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  check ((lsa_sidecar_id is not null) = (lsa_sidecar_id_capture_state = 'captured'))
);

comment on table public.t3a_lsa_sidecar is 'Domain M DORMANT: Session Archive sidecar. Structure only; every write is refused.';

drop trigger if exists t3a_capture_state_fill on public.t3a_lsa_sidecar;
create trigger t3a_capture_state_fill before insert or update on public.t3a_lsa_sidecar for each row execute function public.t3a_capture_state_fill('lsa_sidecar_id:lsa_sidecar_id_capture_state');

drop trigger if exists t3a_append_only on public.t3a_lsa_sidecar;
create trigger t3a_append_only before update or delete on public.t3a_lsa_sidecar for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_lsa_sidecar;
create trigger t3a_socket_closed before insert or update on public.t3a_lsa_sidecar for each row execute function public.t3a_socket_closed();

alter table public.t3a_lsa_sidecar enable row level security;
revoke all on public.t3a_lsa_sidecar from anon, authenticated;

create table if not exists public.t3a_session_archive_tab (
  singleton boolean primary key default true check (singleton),
  session_archive_tab_state text not null default 'frozen',
  updated_at timestamptz not null default now(),
  check (session_archive_tab_state is null or session_archive_tab_state in ('frozen'))
);

comment on table public.t3a_session_archive_tab is 'Domain M: the Session Archive tab. One row; its only permitted state is frozen.';

drop trigger if exists t3a_immutable_columns on public.t3a_session_archive_tab;
create trigger t3a_immutable_columns before update on public.t3a_session_archive_tab for each row execute function public.t3a_refuse_column_change('singleton');

alter table public.t3a_session_archive_tab enable row level security;
revoke all on public.t3a_session_archive_tab from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'M.lsa_snapshot_id', 'M5', 't3a_lsa_snapshot', 'lsa_snapshot_id', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.snapshot_at', 'M5', 't3a_lsa_snapshot', 'snapshot_at', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.pinned_version_set', 'M5', 't3a_lsa_snapshot', 'pinned_version_set', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.lsa_comparison_result', 'M5', 't3a_lsa_snapshot', 'lsa_comparison_result', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.lsa_report_id', 'M5', 't3a_lsa_report', 'lsa_report_id', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.lsa_verification_code', 'M5', 't3a_lsa_report', 'lsa_verification_code', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.longitudinal_case_id', 'M5', 't3a_longitudinal_case', 'longitudinal_case_id', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.comparison_scope_id', 'M5', 't3a_longitudinal_case', 'comparison_scope_id', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.included_observation_refs', 'M5', 't3a_longitudinal_case', 'included_observation_refs', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.excluded_observation_refs', 'M5', 't3a_longitudinal_case', 'excluded_observation_refs', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.exclusion_reason_codes', 'M5', 't3a_longitudinal_case', 'exclusion_reason_codes', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.counterevidence_refs', 'M5', 't3a_longitudinal_case', 'counterevidence_refs', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.transition_rule_version', 'M5', 't3a_longitudinal_case', 'transition_rule_version', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.lsa_sufficiency_rule_version', 'M5', 't3a_longitudinal_case', 'lsa_sufficiency_rule_version', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.resolution_trace_ref', 'M5', 't3a_longitudinal_case', 'resolution_trace_ref', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.finding_code', 'M5', 't3a_longitudinal_case', 'finding_code', null, 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.lsa_sidecar_id', 'M5', 't3a_lsa_sidecar', 'lsa_sidecar_id', 'lsa_sidecar_id_capture_state', 'day1-domain-M-generator', now(), null),
  ('1.3', 'M.session_archive_tab_state', 'M5', 't3a_session_archive_tab', 'session_archive_tab_state', null, 'day1-domain-M-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain M behaviour (hand written; tables above are generated)
-- ---------------------------------------------------------------------------------------------

insert into public.t3a_session_archive_tab (singleton, session_archive_tab_state) values (true, 'frozen') on conflict do nothing;
-- The tab can only ever be frozen until activation is ordered by changing this function in its own migration.
create or replace function public.t3a_session_archive_tab_frozen() returns trigger language plpgsql as $$
begin
  if new.session_archive_tab_state is distinct from 'frozen' then
    raise exception 'T3A_SESSION_ARCHIVE_FROZEN: the Session Archive tab is frozen; activation is a separate, ordered change' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_tab_frozen_trg on public.t3a_session_archive_tab;
create trigger t3a_1_tab_frozen_trg before insert or update on public.t3a_session_archive_tab for each row execute function public.t3a_session_archive_tab_frozen();
-- The tab state is readable by any signed in user (the interface renders a frozen tab); nothing else here is.
grant select (singleton, session_archive_tab_state) on public.t3a_session_archive_tab to authenticated;
alter table public.t3a_session_archive_tab enable row level security;
drop policy if exists t3a_session_archive_tab_read on public.t3a_session_archive_tab;
create policy t3a_session_archive_tab_read on public.t3a_session_archive_tab for select to authenticated using (true);
