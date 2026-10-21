-- Day 1 acceptance rules that cut across domains (T3A-DEV-DAY1-001 v1.3): DT-45, DT-46, DT-49, DT-51, DT-52, DT-53, DT-57, DT-58, DT-62, DT-65.
-- Hand written. Every rule here is additive and, where it could change what a live screen does, sits behind a switch that is off (CR-065).

alter table public.t3a_capture_config add column if not exists enable_lsa_sidecar boolean not null default false;
comment on column public.t3a_capture_config.enable_lsa_sidecar is 'DT-49: when true, a committed observation also tries the dormant Session Archive sidecar write; a failure is logged and never undoes the commit. Off while the Session Archive is dormant.';

-- DT-45 / DT-46: issuance refuses on a stale version set or a stale preview.
create or replace function public.t3a_issuance_freshness() returns trigger language plpgsql security definer set search_path = public as $$
declare v_set text; v_prev text;
begin
  select version_set::text, preview_state into v_set, v_prev from public.t3a_d1_ber_report where ber_report_id = new.ber_report_id;
  if exists (select 1 from public.t3a_observation n where n.supersedes is not null and v_set like '%' || n.supersedes::text || '%') then
    raise exception 'STALE_VERSION_SET: an observation in this report was superseded after assembly; a fresh assembly is required' using errcode = '42501';
  end if;
  if v_prev = 'stale' then
    raise exception 'PREVIEW_STALE: consent changed after the participant preview; the preview must be shown again before issue' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_issuance_freshness_trg on public.t3a_d1_report_issuance;
create trigger t3a_1_issuance_freshness_trg before insert on public.t3a_d1_report_issuance for each row execute function public.t3a_issuance_freshness();

create or replace function public.t3a_consent_withdrawal_stales_preview() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.consent_status = 'withdrawn' then
    update public.t3a_d1_ber_report r set preview_state = 'stale'
     where r.participant_id = new.account_id and r.issued_at is null and coalesce(r.preview_state, 'current') = 'current'
       and not exists (select 1 from public.t3a_d1_report_issuance i where i.ber_report_id = r.ber_report_id);
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_consent_stales_preview_trg on public.t3a_consent_record;
create trigger t3a_1_consent_stales_preview_trg after insert on public.t3a_consent_record for each row execute function public.t3a_consent_withdrawal_stales_preview();

-- DT-49: the dormant sidecar write cannot undo or block a committed observation. Off unless the switch is on.
create or replace function public.t3a_observation_sidecar() returns trigger language plpgsql security definer set search_path = public as $$
declare v_msg text;
begin
  if not (select enable_lsa_sidecar from public.t3a_capture_config) then return null; end if;
  begin
    insert into public.t3a_lsa_sidecar (account_id) values (new.participant_id);
  exception when others then
    v_msg := sqlerrm;
  end;
  if v_msg is not null then
    perform public.t3a_capture_refuse('lsa.sidecar_write', 'LSA_SIDECAR_WRITE_FAILED', new.observation_id::text, left(v_msg, 200));
  end if;
  return null;
end $$;
drop trigger if exists t3a_9_observation_sidecar_trg on public.t3a_observation;
create trigger t3a_9_observation_sidecar_trg after insert on public.t3a_observation for each row execute function public.t3a_observation_sidecar();

-- DT-51: Stage 1 serves fixed content only. The route that records a served instance refuses anything adaptive or generated at S1.
create or replace function public.t3a_record_served_instance(p jsonb, p_stage_code text, p_content_mode text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_cols text;
begin
  if p_stage_code = 'S1' and p_content_mode is distinct from 'fixed' then
    return public.t3a_capture_refuse('served_instance.record', 'S1_CONTENT_NOT_DETERMINISTIC', coalesce(p->>'participant_id', ''), 'Stage 1 serves fixed content only; ' || coalesce(p_content_mode, 'null') || ' content is refused');
  end if;
  if p_stage_code = 'S1' and (nullif(p->>'stage1_engine_version', '') is null or nullif(p->>'stage1_script_version', '') is null) then
    return public.t3a_capture_refuse('served_instance.record', 'S1_VERSIONS_REQUIRED', coalesce(p->>'participant_id', ''), 'stage1_engine_version and stage1_script_version are recorded on every Stage 1 served instance');
  end if;
  select string_agg(format('%I', a.attname), ', ') into v_cols from pg_attribute a
   where a.attrelid = 'public.t3a_served_instance'::regclass and a.attnum > 0 and not a.attisdropped and p ? a.attname::text;
  execute format('insert into public.t3a_served_instance (%1$s) select %1$s from jsonb_populate_record(null::public.t3a_served_instance, $1) returning served_instance_id', v_cols) into v_id using p;
  return jsonb_build_object('outcome', 'recorded', 'served_instance_id', v_id);
end $$;
revoke all on function public.t3a_record_served_instance(jsonb, text, text) from public, anon, authenticated;
grant execute on function public.t3a_record_served_instance(jsonb, text, text) to service_role;

-- DT-52: only the observed participant has an observation record. A co-participant in a Stage 4 group session never does.
create or replace function public.t3a_observation_subject_rule() returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select participant_id into v_owner from public.t3a_stage_instance where stage_instance_id = new.stage_instance_id;
  if v_owner is not null and v_owner is distinct from new.participant_id then
    raise exception 'OBSERVATION_FOR_NON_OBSERVED_PARTICIPANT: an observation record belongs to the participant whose Stage instance it is' using errcode = '23514';
  end if;
  if exists (select 1 from public.t3a_d1_group_session g join public.t3a_d1_group_session_member m on m.group_session_id = g.group_session_id
              where g.stage_instance_id = new.stage_instance_id and m.participant_id = new.participant_id and m.member_role = 'co_participant') then
    raise exception 'OBSERVATION_FOR_CO_PARTICIPANT: a co-participant has no observation record; only the observed participant does' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_observation_subject_trg on public.t3a_observation;
create trigger t3a_1_observation_subject_trg before insert on public.t3a_observation for each row execute function public.t3a_observation_subject_rule();

-- DT-53: an optional profile field left empty is recorded as never_asked (or declined when the participant declined), never as a bare gap.
create or replace function public.t3a_profile_withheld() returns trigger language plpgsql as $$
declare pair text; col text; cs text;
begin
  foreach pair in array tg_argv loop
    col := split_part(pair, ':', 1); cs := split_part(pair, ':', 2);
    if to_jsonb(new)->col is null or to_jsonb(new)->col = 'null'::jsonb then
      if to_jsonb(new)->>cs = 'not_captured' then new := jsonb_populate_record(new, jsonb_build_object(cs, 'never_asked')); end if;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists t3a_z_profile_withheld_trg on public.t3a_participant_profile;
create trigger t3a_z_profile_withheld_trg before insert on public.t3a_participant_profile for each row execute function public.t3a_profile_withheld(
  'legal_name:legal_name_capture_state', 'display_name:display_name_capture_state', 'country_of_residence:country_of_residence_capture_state', 'subdivision_of_residence:subdivision_of_residence_capture_state', 'city_of_residence:city_of_residence_capture_state', 'privacy_jurisdiction_code:privacy_jurisdiction_code_capture_state', 'preferred_language:preferred_language_capture_state', 'timezone:timezone_capture_state', 'occupation_interest:occupation_interest_capture_state', 'profile_field_source:profile_field_source_capture_state', 'notification_channel_preference:notification_channel_preference_capture_state', 'target_industry_code:target_industry_code_capture_state', 'role_seniority_context_code:role_seniority_context_code_capture_state', 'recruitment_channel_code:recruitment_channel_code_capture_state');

-- DT-57: a source title is stored with the version of the source it belongs to, so a historical record shows the title it was made under.
create table if not exists public.t3a_source_title_history (
  title_seq bigint generated always as identity primary key,
  source_id uuid not null references public.t3a_source(source_id),
  source_display_title text not null,
  effective_from timestamptz not null default now()
);
comment on table public.t3a_source_title_history is 'DT-57: every title a source has had, with the time it took effect. Insert only.';
drop trigger if exists t3a_append_only on public.t3a_source_title_history;
create trigger t3a_append_only before update or delete on public.t3a_source_title_history for each row execute function public.t3a_deny_mutation();
alter table public.t3a_source_title_history enable row level security;
revoke all on public.t3a_source_title_history from anon, authenticated;

create or replace function public.t3a_source_title_record() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.source_display_title is not null and (tg_op = 'INSERT' or new.source_display_title is distinct from old.source_display_title) then
    insert into public.t3a_source_title_history (source_id, source_display_title) values (new.source_id, new.source_display_title);
  end if;
  return null;
end $$;
drop trigger if exists t3a_9_source_title_trg on public.t3a_source;
create trigger t3a_9_source_title_trg after insert or update of source_display_title on public.t3a_source for each row execute function public.t3a_source_title_record();

create or replace function public.t3a_source_title_as_of(p_source uuid, p_at timestamptz) returns text language sql stable security definer set search_path = public as $$
  select source_display_title from public.t3a_source_title_history where source_id = p_source and effective_from <= p_at order by title_seq desc limit 1
$$;
revoke all on function public.t3a_source_title_as_of(uuid, timestamptz) from public, anon;
grant execute on function public.t3a_source_title_as_of(uuid, timestamptz) to authenticated, service_role;

-- DT-58: one source bank. The registry holds one bank per module; a second is refused, and a source can name only a registered bank.
create table if not exists public.t3a_source_bank (
  module_code text primary key check (module_code ~ '^[a-z][a-z0-9_]{1,63}$'),
  source_bank_id uuid not null unique default gen_random_uuid(),
  registered_at timestamptz not null default now()
);
comment on table public.t3a_source_bank is 'DT-58: the single source bank of a module. Insert only.';
drop trigger if exists t3a_append_only on public.t3a_source_bank;
create trigger t3a_append_only before update or delete on public.t3a_source_bank for each row execute function public.t3a_deny_mutation();
alter table public.t3a_source_bank enable row level security;
revoke all on public.t3a_source_bank from anon, authenticated;

create or replace function public.t3a_register_source_bank(p_module text) returns jsonb language plpgsql security definer set search_path = public as $$
declare v uuid;
begin
  if exists (select 1 from public.t3a_source_bank where module_code = p_module) then
    return public.t3a_capture_refuse('source_bank.register', 'SECOND_SOURCE_BANK_REFUSED', p_module, 'a module has one source bank');
  end if;
  insert into public.t3a_source_bank (module_code) values (p_module) returning source_bank_id into v;
  return jsonb_build_object('outcome', 'registered', 'source_bank_id', v);
end $$;
revoke all on function public.t3a_register_source_bank(text) from public, anon, authenticated;
grant execute on function public.t3a_register_source_bank(text) to service_role;

create or replace function public.t3a_source_bank_rule() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.source_bank_id is not null and not exists (select 1 from public.t3a_source_bank b where b.source_bank_id = new.source_bank_id) then
    raise exception 'SOURCE_BANK_NOT_REGISTERED: a source names only a registered source bank' using errcode = '23503';
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_source_bank_trg on public.t3a_source;
create trigger t3a_1_source_bank_trg before insert or update of source_bank_id on public.t3a_source for each row execute function public.t3a_source_bank_rule();

-- DT-62: a legacy consent is mapped to a new purpose only when counsel has recorded that its stored text covers that purpose.
-- No coverage row exists, so nothing maps: the record stays legacy and new capture for the purpose needs a fresh grant.
create table if not exists public.t3a_legacy_consent_coverage (
  legacy_consent_id uuid not null,
  purpose text not null check (purpose in ('rehearsal','observation','longitudinal_comparison','report_release','contact','research','institutional_aggregate','followup')),
  confirmed_by text not null,
  confirmed_at timestamptz not null default now(),
  primary key (legacy_consent_id, purpose)
);
comment on table public.t3a_legacy_consent_coverage is 'DT-62: counsel confirmations that a legacy consent text covers a purpose. Empty by default.';
alter table public.t3a_legacy_consent_coverage enable row level security;
revoke all on public.t3a_legacy_consent_coverage from anon, authenticated;

create or replace function public.t3a_map_legacy_consent(p_legacy_consent uuid, p_purpose text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.t3a_legacy_consent_coverage c where c.legacy_consent_id = p_legacy_consent and c.purpose = p_purpose) then
    return public.t3a_capture_refuse('consent.map_legacy', 'LEGACY_CONSENT_DOES_NOT_COVER_PURPOSE', p_legacy_consent::text, 'no counsel confirmation that the stored text covers ' || coalesce(p_purpose, 'null') || '; the record stays legacy and a fresh grant is needed');
  end if;
  return jsonb_build_object('outcome', 'covered', 'note', 'coverage confirmed; the mapping itself is a governed step and writes nothing here');
end $$;
revoke all on function public.t3a_map_legacy_consent(uuid, text) from public, anon, authenticated;
grant execute on function public.t3a_map_legacy_consent(uuid, text) to service_role;

-- DT-65: conditional requiredness. Stage 1 needs no entry authority actor; Stages 2 to 4 do (enforced once the required-fields switch is on).
create or replace function public.t3a_entry_authority_rule() returns trigger language plpgsql as $$
begin
  if new.stage_code::text <> 'S1' and new.entry_authority_actor_id is null and (select enforce_required from public.t3a_capture_config) then
    raise exception 'T3A_REQUIRED_FIELD_MISSING: entry_authority_actor_id is required to enter %', new.stage_code using errcode = '23502';
  end if;
  return new;
end $$;
drop trigger if exists t3a_2_entry_authority_trg on public.t3a_stage_entry_event;
create trigger t3a_2_entry_authority_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_entry_authority_rule();
