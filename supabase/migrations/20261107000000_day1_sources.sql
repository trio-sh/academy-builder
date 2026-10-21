-- Day 1 Domain D: sources, versions and served instances (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_d.py
-- and tools/day1/plans/domain_d_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py D      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 63 fields into t3a_field_physical_map.

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


-- t3a_source: extended in place (existing rows are kept)

alter table public.t3a_source add column if not exists source_bank_id uuid ;

alter table public.t3a_source add column if not exists source_display_title text ;

alter table public.t3a_source add column if not exists source_created_by uuid ;

alter table public.t3a_source add column if not exists source_effective_from timestamptz ;

alter table public.t3a_source add column if not exists source_effective_until timestamptz ;

alter table public.t3a_source add column if not exists source_material_manifest_ref uuid ;

alter table public.t3a_source add column if not exists situation_class text ;

alter table public.t3a_source add column if not exists secondary_situation_class text ;

alter table public.t3a_source add column if not exists interaction_pattern_family_id uuid ;

alter table public.t3a_source add column if not exists administration_form_id uuid ;

alter table public.t3a_source add column if not exists name_clearance_status text check (name_clearance_status is null or name_clearance_status in ('CLEARED', 'PENDING'));

alter table public.t3a_source add column if not exists serving_eligible boolean ;

alter table public.t3a_source add column if not exists content_sensitivity text check (content_sensitivity is null or content_sensitivity in ('standard', 'SENSITIVE_CONTENT'));

alter table public.t3a_source add column if not exists content_sensitivity_capture_state text not null default 'not_captured' check (content_sensitivity_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists atlas_moment_id uuid ;

alter table public.t3a_source add column if not exists atlas_moment_id_capture_state text not null default 'not_captured' check (atlas_moment_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists atlas_terrain_id uuid ;

alter table public.t3a_source add column if not exists atlas_terrain_id_capture_state text not null default 'not_captured' check (atlas_terrain_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists beat_sequence jsonb ;

alter table public.t3a_source add column if not exists beat_sequence_capture_state text not null default 'not_captured' check (beat_sequence_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists situation_context jsonb ;

alter table public.t3a_source add column if not exists situation_context_capture_state text not null default 'not_captured' check (situation_context_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists comparison_family_id uuid ;

alter table public.t3a_source add column if not exists comparison_family_id_capture_state text not null default 'not_captured' check (comparison_family_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists comparison_demand_id uuid ;

alter table public.t3a_source add column if not exists comparison_demand_id_capture_state text not null default 'not_captured' check (comparison_demand_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists observation_opportunity_id uuid ;

alter table public.t3a_source add column if not exists observation_opportunity_id_capture_state text not null default 'not_captured' check (observation_opportunity_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists demand_conditions_version text check (demand_conditions_version is null or demand_conditions_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_source add column if not exists demand_conditions_version_capture_state text not null default 'not_captured' check (demand_conditions_version_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists form_relationship_id uuid ;

alter table public.t3a_source add column if not exists form_relationship_id_capture_state text not null default 'not_captured' check (form_relationship_id_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists variation_intent text ;

alter table public.t3a_source add column if not exists variation_intent_capture_state text not null default 'not_captured' check (variation_intent_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists longitudinal_use_status text check (longitudinal_use_status is null or longitudinal_use_status in ('eligible', 'not_eligible'));

alter table public.t3a_source add column if not exists longitudinal_use_status_capture_state text not null default 'not_captured' check (longitudinal_use_status_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source add column if not exists capture_catalog_version text check (capture_catalog_version is null or capture_catalog_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_source add column if not exists resolution_rule_version text check (resolution_rule_version is null or resolution_rule_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

alter table public.t3a_source add column if not exists delivery_script_version text check (delivery_script_version is null or delivery_script_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$');

update public.t3a_source set content_sensitivity_capture_state = 'captured' where content_sensitivity is not null and content_sensitivity_capture_state = 'not_captured';

update public.t3a_source set atlas_moment_id_capture_state = 'captured' where atlas_moment_id is not null and atlas_moment_id_capture_state = 'not_captured';

update public.t3a_source set atlas_terrain_id_capture_state = 'captured' where atlas_terrain_id is not null and atlas_terrain_id_capture_state = 'not_captured';

update public.t3a_source set beat_sequence_capture_state = 'captured' where beat_sequence is not null and beat_sequence_capture_state = 'not_captured';

update public.t3a_source set situation_context_capture_state = 'captured' where situation_context is not null and situation_context_capture_state = 'not_captured';

update public.t3a_source set comparison_family_id_capture_state = 'captured' where comparison_family_id is not null and comparison_family_id_capture_state = 'not_captured';

update public.t3a_source set comparison_demand_id_capture_state = 'captured' where comparison_demand_id is not null and comparison_demand_id_capture_state = 'not_captured';

update public.t3a_source set observation_opportunity_id_capture_state = 'captured' where observation_opportunity_id is not null and observation_opportunity_id_capture_state = 'not_captured';

update public.t3a_source set demand_conditions_version_capture_state = 'captured' where demand_conditions_version is not null and demand_conditions_version_capture_state = 'not_captured';

update public.t3a_source set form_relationship_id_capture_state = 'captured' where form_relationship_id is not null and form_relationship_id_capture_state = 'not_captured';

update public.t3a_source set variation_intent_capture_state = 'captured' where variation_intent is not null and variation_intent_capture_state = 'not_captured';

update public.t3a_source set longitudinal_use_status_capture_state = 'captured' where longitudinal_use_status is not null and longitudinal_use_status_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_source;
create trigger t3a_capture_state_fill before insert or update on public.t3a_source for each row execute function public.t3a_capture_state_fill('content_sensitivity:content_sensitivity_capture_state', 'atlas_moment_id:atlas_moment_id_capture_state', 'atlas_terrain_id:atlas_terrain_id_capture_state', 'beat_sequence:beat_sequence_capture_state', 'situation_context:situation_context_capture_state', 'comparison_family_id:comparison_family_id_capture_state', 'comparison_demand_id:comparison_demand_id_capture_state', 'observation_opportunity_id:observation_opportunity_id_capture_state', 'demand_conditions_version:demand_conditions_version_capture_state', 'form_relationship_id:form_relationship_id_capture_state', 'variation_intent:variation_intent_capture_state', 'longitudinal_use_status:longitudinal_use_status_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_source;
create trigger t3a_2_required_fields_trg before insert on public.t3a_source for each row execute function public.t3a_require_fields('source_bank_id', 'source_display_title', 'source_created_by', 'source_effective_from', 'source_material_manifest_ref', 'situation_class', 'secondary_situation_class', 'interaction_pattern_family_id', 'administration_form_id', 'name_clearance_status', 'serving_eligible', 'capture_catalog_version', 'resolution_rule_version', 'delivery_script_version');

-- t3a_source_version: extended in place (existing rows are kept)

alter table public.t3a_source_version add column if not exists min_seconds_capture_state text not null default 'not_captured' check (min_seconds_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source_version add column if not exists max_seconds_capture_state text not null default 'not_captured' check (max_seconds_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served'));

alter table public.t3a_source_version add column if not exists source_status text check (source_status is null or source_status in ('authored_not_approved', 'approved', 'suspended', 'retired'));

alter table public.t3a_source_version add column if not exists approval_record_id uuid ;

alter table public.t3a_source_version add column if not exists approval_authority text ;

alter table public.t3a_source_version add column if not exists version_change_reason text ;

update public.t3a_source_version set min_seconds_capture_state = 'captured' where min_seconds is not null and min_seconds_capture_state = 'not_captured';

update public.t3a_source_version set max_seconds_capture_state = 'captured' where max_seconds is not null and max_seconds_capture_state = 'not_captured';

drop trigger if exists t3a_capture_state_fill on public.t3a_source_version;
create trigger t3a_capture_state_fill before insert or update on public.t3a_source_version for each row execute function public.t3a_capture_state_fill('min_seconds:min_seconds_capture_state', 'max_seconds:max_seconds_capture_state');

drop trigger if exists t3a_2_required_fields_trg on public.t3a_source_version;
create trigger t3a_2_required_fields_trg before insert on public.t3a_source_version for each row execute function public.t3a_require_fields('source_status', 'approval_record_id', 'approval_authority', 'version_change_reason');

-- t3a_rendered_instance: extended in place (existing rows are kept)

-- t3a_stage_entry_event: extended in place (existing rows are kept)

create table if not exists public.t3a_served_instance (
  participant_id uuid not null,
  source_version_id uuid not null references public.t3a_source_version(source_version_id),
  stage_entry_event_id uuid references public.t3a_stage_entry_event(stage_entry_event_id),
  rendered_instance_id uuid references public.t3a_rendered_instance(rendered_instance_id),
  served_instance_id uuid primary key default gen_random_uuid(),
  served_at timestamptz not null default now(),
  question_set_version text not null,
  statement_library_version text not null,
  answer_key_version text not null,
  recurrence_key_version text not null,
  template_register_version text not null,
  stage1_engine_version text not null,
  stage1_script_version text not null,
  served_language text not null,
  check (question_set_version is null or question_set_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (statement_library_version is null or statement_library_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (answer_key_version is null or answer_key_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (recurrence_key_version is null or recurrence_key_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (template_register_version is null or template_register_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (stage1_engine_version is null or stage1_engine_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (stage1_script_version is null or stage1_script_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$')
);

comment on table public.t3a_served_instance is 'Domain D served instance: what was shown, in which language, under which rule and engine versions. Insert only.';

drop trigger if exists t3a_append_only on public.t3a_served_instance;
create trigger t3a_append_only before update or delete on public.t3a_served_instance for each row execute function public.t3a_deny_mutation();

alter table public.t3a_served_instance enable row level security;
revoke all on public.t3a_served_instance from anon, authenticated;

create table if not exists public.t3a_ai_provenance_socket (
  served_instance_id uuid,
  ai_model_deployment_id uuid,
  ai_prompt_hash char(64),
  ai_system_message_version text,
  ai_output_schema_version text,
  check (ai_prompt_hash is null or ai_prompt_hash ~ '^[0-9a-f]{64}$'),
  check (ai_system_message_version is null or ai_system_message_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'),
  check (ai_output_schema_version is null or ai_output_schema_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$')
);

comment on table public.t3a_ai_provenance_socket is 'Domain D SOCKET: AI model and prompt provenance. Structure only; every write is refused.';

drop trigger if exists t3a_append_only on public.t3a_ai_provenance_socket;
create trigger t3a_append_only before update or delete on public.t3a_ai_provenance_socket for each row execute function public.t3a_deny_mutation();

drop trigger if exists t3a_socket_closed on public.t3a_ai_provenance_socket;
create trigger t3a_socket_closed before insert or update on public.t3a_ai_provenance_socket for each row execute function public.t3a_socket_closed();

alter table public.t3a_ai_provenance_socket enable row level security;
revoke all on public.t3a_ai_provenance_socket from anon, authenticated;

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'D.source_id', 'M1', 't3a_source', 'source_id', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_created_at', 'M3', 't3a_source', 'created_at', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_bank_id', 'M5', 't3a_source', 'source_bank_id', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_display_title', 'M5', 't3a_source', 'source_display_title', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_created_by', 'M5', 't3a_source', 'source_created_by', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_effective_from', 'M5', 't3a_source', 'source_effective_from', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_effective_until', 'M5', 't3a_source', 'source_effective_until', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_material_manifest_ref', 'M5', 't3a_source', 'source_material_manifest_ref', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.situation_class', 'M5', 't3a_source', 'situation_class', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.secondary_situation_class', 'M5', 't3a_source', 'secondary_situation_class', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.interaction_pattern_family_id', 'M5', 't3a_source', 'interaction_pattern_family_id', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.administration_form_id', 'M5', 't3a_source', 'administration_form_id', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.name_clearance_status', 'M5', 't3a_source', 'name_clearance_status', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.serving_eligible', 'M5', 't3a_source', 'serving_eligible', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.content_sensitivity', 'M5', 't3a_source', 'content_sensitivity', 'content_sensitivity_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.atlas_moment_id', 'M5', 't3a_source', 'atlas_moment_id', 'atlas_moment_id_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.atlas_terrain_id', 'M5', 't3a_source', 'atlas_terrain_id', 'atlas_terrain_id_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.beat_sequence', 'M5', 't3a_source', 'beat_sequence', 'beat_sequence_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.situation_context', 'M5', 't3a_source', 'situation_context', 'situation_context_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.comparison_family_id', 'M5', 't3a_source', 'comparison_family_id', 'comparison_family_id_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.comparison_demand_id', 'M5', 't3a_source', 'comparison_demand_id', 'comparison_demand_id_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.observation_opportunity_id', 'M5', 't3a_source', 'observation_opportunity_id', 'observation_opportunity_id_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.demand_conditions_version', 'M5', 't3a_source', 'demand_conditions_version', 'demand_conditions_version_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.form_relationship_id', 'M5', 't3a_source', 'form_relationship_id', 'form_relationship_id_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.variation_intent', 'M5', 't3a_source', 'variation_intent', 'variation_intent_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.longitudinal_use_status', 'M5', 't3a_source', 'longitudinal_use_status', 'longitudinal_use_status_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.capture_catalog_version', 'M5', 't3a_source', 'capture_catalog_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.resolution_rule_version', 'M5', 't3a_source', 'resolution_rule_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.delivery_script_version', 'M5', 't3a_source', 'delivery_script_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_version_id', 'M1', 't3a_source_version', 'source_version_id', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_version_hash', 'M1', 't3a_source_version', 'source_version_hash', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.scenario_class', 'M1', 't3a_source_version', 'scenario_class', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.relevant_conduct', 'M1', 't3a_source_version', 'relevant_conduct', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.irrelevant_conduct', 'M1', 't3a_source_version', 'irrelevant_conduct', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.stated_standard', 'M3', 't3a_source_version', 'stated_standard', null, 'day1-domain-D-generator', now(), 'live column is text; the dictionary type is an object (CR-043)'),
  ('1.3', 'D.permitted_administration_variance', 'M3', 't3a_source_version', 'permitted_administration_variance', null, 'day1-domain-D-generator', now(), 'live column is text; the dictionary type is an object (CR-043)'),
  ('1.3', 'D.unsupported_inferences', 'M1', 't3a_source_version', 'unsupported_inferences', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.cross_context_map', 'M1', 't3a_source_version', 'cross_context_map', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.min_seconds', 'M1', 't3a_source_version', 'min_seconds', 'min_seconds_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.max_seconds', 'M1', 't3a_source_version', 'max_seconds', 'max_seconds_capture_state', 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.compatibility_class', 'M1', 't3a_source_version', 'compatibility_class', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.approved_at', 'M1', 't3a_source_version', 'approved_at', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.source_status', 'M5', 't3a_source_version', 'source_status', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.approval_record_id', 'M5', 't3a_source_version', 'approval_record_id', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.approval_authority', 'M5', 't3a_source_version', 'approval_authority', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.version_change_reason', 'M5', 't3a_source_version', 'version_change_reason', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.presentation_variant_values', 'M1', 't3a_rendered_instance', 'presentation_variant_values', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.rendered_instance_hash', 'M1', 't3a_rendered_instance', 'rendered_instance_hash', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.randomization_seed', 'M1', 't3a_stage_entry_event', 'randomization_seed', null, 'day1-domain-D-generator', now(), 'live column is bigint; the dictionary type is text (CR-043)'),
  ('1.3', 'D.served_instance_id', 'M5', 't3a_served_instance', 'served_instance_id', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.served_at', 'M5', 't3a_served_instance', 'served_at', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.question_set_version', 'M5', 't3a_served_instance', 'question_set_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.statement_library_version', 'M5', 't3a_served_instance', 'statement_library_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.answer_key_version', 'M5', 't3a_served_instance', 'answer_key_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.recurrence_key_version', 'M5', 't3a_served_instance', 'recurrence_key_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.template_register_version', 'M5', 't3a_served_instance', 'template_register_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.stage1_engine_version', 'M5', 't3a_served_instance', 'stage1_engine_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.stage1_script_version', 'M5', 't3a_served_instance', 'stage1_script_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.served_language', 'M5', 't3a_served_instance', 'served_language', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.ai_model_deployment_id', 'M5', 't3a_ai_provenance_socket', 'ai_model_deployment_id', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.ai_prompt_hash', 'M5', 't3a_ai_provenance_socket', 'ai_prompt_hash', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.ai_system_message_version', 'M5', 't3a_ai_provenance_socket', 'ai_system_message_version', null, 'day1-domain-D-generator', now(), null),
  ('1.3', 'D.ai_output_schema_version', 'M5', 't3a_ai_provenance_socket', 'ai_output_schema_version', null, 'day1-domain-D-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain D behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- DT-14: capture never blocks. A source that lacks content a registry field asks for is stored as it is, the
-- field's capture state is not_authored, and longitudinal use stays not_eligible (the comparison fields are DORMANT).
create or replace function public.t3a_source_not_authored() returns trigger language plpgsql as $$
declare pair text; col text; cs text;
begin
  foreach pair in array array[
    'content_sensitivity:content_sensitivity_capture_state', 'atlas_moment_id:atlas_moment_id_capture_state', 'atlas_terrain_id:atlas_terrain_id_capture_state',
    'beat_sequence:beat_sequence_capture_state', 'situation_context:situation_context_capture_state',
    'comparison_family_id:comparison_family_id_capture_state', 'comparison_demand_id:comparison_demand_id_capture_state',
    'observation_opportunity_id:observation_opportunity_id_capture_state', 'demand_conditions_version:demand_conditions_version_capture_state',
    'form_relationship_id:form_relationship_id_capture_state', 'variation_intent:variation_intent_capture_state'] loop
    col := split_part(pair, ':', 1); cs := split_part(pair, ':', 2);
    if to_jsonb(new)->>col is null then new := jsonb_populate_record(new, jsonb_build_object(cs, 'not_authored')); end if;
  end loop;
  new.longitudinal_use_status := 'not_eligible';
  new.longitudinal_use_status_capture_state := 'captured';
  return new;
end $$;
drop trigger if exists t3a_source_not_authored_trg on public.t3a_source;
create trigger t3a_source_not_authored_trg before insert or update on public.t3a_source for each row execute function public.t3a_source_not_authored();
update public.t3a_source set longitudinal_use_status = 'not_eligible' where longitudinal_use_status is null;
