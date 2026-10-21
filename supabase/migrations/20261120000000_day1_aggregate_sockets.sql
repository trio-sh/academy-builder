-- Day 1 Domain Q: aggregate, licensing, research and follow-up structures (closed) (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_q.py
-- and tools/day1/plans/domain_q_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py Q      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 31 fields into t3a_field_physical_map.

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

create table if not exists public.t3a_aggregate_dataset_socket (
  aggregate_dataset_definition_id uuid,
  suppression_floor_k integer,
  output_id uuid,
  framing_disclaimer_version text,
  delivered_at timestamptz,
  metric_definition_id uuid,
  metric_definition_version text,
  metric_allowed_use_ref uuid,
  analysis_population_rule_ref uuid,
  analysis_time_window_ref uuid,
  aggregate_source_snapshot_digest char(64),
  aggregate_denominator_count integer,
  aggregate_unknown_count integer,
  source_version_mix_ref uuid,
  stage_mix_ref uuid,
  reidentification_review_ref uuid,
  publication_authorization_ref uuid,
  public_trend_count_series jsonb,
  concentration_risk_result jsonb,
  check (framing_disclaimer_version is null or framing_disclaimer_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (metric_definition_version is null or metric_definition_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (aggregate_source_snapshot_digest is null or aggregate_source_snapshot_digest ~ '^[0-9a-f]{64}$')
);

comment on table public.t3a_aggregate_dataset_socket is 'Domain Q SOCKET: aggregate dataset definitions, metrics, outputs and their disclosure controls. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_aggregate_dataset_socket;
create trigger t3a_append_only before update or delete on public.t3a_aggregate_dataset_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_aggregate_dataset_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_aggregate_dataset_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_aggregate_dataset_socket enable row level security;
revoke all on public.t3a_aggregate_dataset_socket from anon, authenticated;

create table if not exists public.t3a_licensee_socket (
  licensee_id uuid,
  license_terms_version text,
  misuse_termination_at timestamptz,
  check (license_terms_version is null or license_terms_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$')
);

comment on table public.t3a_licensee_socket is 'Domain Q SOCKET: licensees and licence terms. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_licensee_socket;
create trigger t3a_append_only before update or delete on public.t3a_licensee_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_licensee_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_licensee_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_licensee_socket enable row level security;
revoke all on public.t3a_licensee_socket from anon, authenticated;

create table if not exists public.t3a_research_socket (
  research_protocol_id uuid,
  ethics_approval_ref uuid,
  consented_attribute_record jsonb
);

comment on table public.t3a_research_socket is 'Domain Q SOCKET: research protocol, ethics approval and consented attributes. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_research_socket;
create trigger t3a_append_only before update or delete on public.t3a_research_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_research_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_research_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_research_socket enable row level security;
revoke all on public.t3a_research_socket from anon, authenticated;

create table if not exists public.t3a_followup_socket (
  followup_window text,
  followup_sent_at timestamptz,
  followup_response_status text,
  question_set_version text,
  verification_level text,
  delivery_channel text,
  check (followup_window is null or followup_window in ('30d', '60d', '90d')),
  check (followup_response_status is null or followup_response_status in ('received', 'not_received', 'declined', 'unknown')),
  check (question_set_version is null or question_set_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (verification_level is null or verification_level in ('self_reported', 'platform_verified', 'mentor_confirmed', 'employer_confirmed')),
  check (delivery_channel is null or delivery_channel in ('email', 'in_platform'))
);

comment on table public.t3a_followup_socket is 'Domain Q SOCKET: follow-up windows and responses. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_followup_socket;
create trigger t3a_append_only before update or delete on public.t3a_followup_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_followup_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_followup_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_followup_socket enable row level security;
revoke all on public.t3a_followup_socket from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'Q.aggregate_dataset_definition_id', 'M5', 't3a_aggregate_dataset_socket', 'aggregate_dataset_definition_id', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.suppression_floor_k', 'M5', 't3a_aggregate_dataset_socket', 'suppression_floor_k', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.output_id', 'M5', 't3a_aggregate_dataset_socket', 'output_id', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.framing_disclaimer_version', 'M5', 't3a_aggregate_dataset_socket', 'framing_disclaimer_version', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.delivered_at', 'M5', 't3a_aggregate_dataset_socket', 'delivered_at', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.metric_definition_id', 'M5', 't3a_aggregate_dataset_socket', 'metric_definition_id', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.metric_definition_version', 'M5', 't3a_aggregate_dataset_socket', 'metric_definition_version', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.metric_allowed_use_ref', 'M5', 't3a_aggregate_dataset_socket', 'metric_allowed_use_ref', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.analysis_population_rule_ref', 'M5', 't3a_aggregate_dataset_socket', 'analysis_population_rule_ref', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.analysis_time_window_ref', 'M5', 't3a_aggregate_dataset_socket', 'analysis_time_window_ref', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.aggregate_source_snapshot_digest', 'M5', 't3a_aggregate_dataset_socket', 'aggregate_source_snapshot_digest', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.aggregate_denominator_count', 'M5', 't3a_aggregate_dataset_socket', 'aggregate_denominator_count', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.aggregate_unknown_count', 'M5', 't3a_aggregate_dataset_socket', 'aggregate_unknown_count', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.source_version_mix_ref', 'M5', 't3a_aggregate_dataset_socket', 'source_version_mix_ref', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.stage_mix_ref', 'M5', 't3a_aggregate_dataset_socket', 'stage_mix_ref', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.reidentification_review_ref', 'M5', 't3a_aggregate_dataset_socket', 'reidentification_review_ref', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.publication_authorization_ref', 'M5', 't3a_aggregate_dataset_socket', 'publication_authorization_ref', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.public_trend_count_series', 'M5', 't3a_aggregate_dataset_socket', 'public_trend_count_series', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.concentration_risk_result', 'M5', 't3a_aggregate_dataset_socket', 'concentration_risk_result', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.licensee_id', 'M5', 't3a_licensee_socket', 'licensee_id', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.license_terms_version', 'M5', 't3a_licensee_socket', 'license_terms_version', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.misuse_termination_at', 'M5', 't3a_licensee_socket', 'misuse_termination_at', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.research_protocol_id', 'M5', 't3a_research_socket', 'research_protocol_id', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.ethics_approval_ref', 'M5', 't3a_research_socket', 'ethics_approval_ref', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.consented_attribute_record', 'M5', 't3a_research_socket', 'consented_attribute_record', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.followup_window', 'M5', 't3a_followup_socket', 'followup_window', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.followup_sent_at', 'M5', 't3a_followup_socket', 'followup_sent_at', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.followup_response_status', 'M5', 't3a_followup_socket', 'followup_response_status', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.question_set_version', 'M5', 't3a_followup_socket', 'question_set_version', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.verification_level', 'M5', 't3a_followup_socket', 'verification_level', null, 'day1-domain-Q-generator', now(), null),
  ('1.3', 'Q.delivery_channel', 'M5', 't3a_followup_socket', 'delivery_channel', null, 'day1-domain-Q-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

