-- Day 1 Domain J: Growth Log (T3A-DEV-DAY1-001 v1.3). GENERATED from tools/day1/plans/domain_j.py
-- and tools/day1/plans/domain_j_logic.sql. Do not edit by hand; regenerate with
--   python3 tools/day1/generate_domain_migration.py J      (verify with --check)
-- Dictionary sha256: 2595989efe30ac69a0b90f774a767e9d1d6ea4555a3b8f8a65d658c0a1f5e513
-- Maps 8 fields into t3a_field_physical_map.

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

create table if not exists public.t3a_growth_log_entry (
  entry_id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid(),
  entry_kind text not null,
  text text,
  text_capture_state text not null default 'not_captured' check (text_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  module_reference text,
  module_reference_capture_state text not null default 'not_captured' check (module_reference_capture_state in ('captured', 'not_captured', 'never_asked', 'declined', 'no_response', 'not_applicable', 'technical_failure', 'withdrawn', 'not_authored', 'not_served')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  schema_version text not null default '1.0',
  foreign key (created_by) references public.t3a_account(account_id),
  check (entry_kind is null or entry_kind in ('practice_note', 'rehearsal_reference')),
  check ((text is not null) = (text_capture_state = 'captured')),
  check ((module_reference is not null) = (module_reference_capture_state = 'captured')),
  check (schema_version is null or schema_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$')
);

comment on table public.t3a_growth_log_entry is 'Domain J Growth Log: the participant''s own practice notes and rehearsal references. Participant only. Feeds nothing, measures nothing, is read by no one else; the platform writes nothing here.';

drop trigger if exists t3a_capture_state_fill on public.t3a_growth_log_entry;
create trigger t3a_capture_state_fill before insert or update on public.t3a_growth_log_entry for each row execute function public.t3a_capture_state_fill('text:text_capture_state', 'module_reference:module_reference_capture_state');

drop trigger if exists t3a_immutable_columns on public.t3a_growth_log_entry;
create trigger t3a_immutable_columns before update on public.t3a_growth_log_entry for each row execute function public.t3a_refuse_column_change('entry_id', 'created_by', 'created_at', 'entry_kind');

alter table public.t3a_growth_log_entry enable row level security;
revoke all on public.t3a_growth_log_entry from anon, authenticated;

grant select (entry_id, created_by, entry_kind, text, module_reference, created_at, updated_at, schema_version, text_capture_state, module_reference_capture_state) on public.t3a_growth_log_entry to authenticated;

drop policy if exists t3a_growth_log_entry_own_read on public.t3a_growth_log_entry;
create policy t3a_growth_log_entry_own_read on public.t3a_growth_log_entry for select to authenticated using (created_by = auth.uid());

insert into public.t3a_field_physical_map (dictionary_version, qualified_name, mapping_class, physical_table, physical_column, capture_state_column, confirmed_by, confirmed_at, note)
values
  ('1.3', 'J.entry_id', 'M5', 't3a_growth_log_entry', 'entry_id', null, 'day1-domain-J-generator', now(), null),
  ('1.3', 'J.created_by', 'M5', 't3a_growth_log_entry', 'created_by', null, 'day1-domain-J-generator', now(), null),
  ('1.3', 'J.entry_kind', 'M5', 't3a_growth_log_entry', 'entry_kind', null, 'day1-domain-J-generator', now(), null),
  ('1.3', 'J.text', 'M5', 't3a_growth_log_entry', 'text', 'text_capture_state', 'day1-domain-J-generator', now(), null),
  ('1.3', 'J.module_reference', 'M5', 't3a_growth_log_entry', 'module_reference', 'module_reference_capture_state', 'day1-domain-J-generator', now(), null),
  ('1.3', 'J.created_at', 'M5', 't3a_growth_log_entry', 'created_at', null, 'day1-domain-J-generator', now(), null),
  ('1.3', 'J.updated_at', 'M5', 't3a_growth_log_entry', 'updated_at', null, 'day1-domain-J-generator', now(), null),
  ('1.3', 'J.schema_version', 'M5', 't3a_growth_log_entry', 'schema_version', null, 'day1-domain-J-generator', now(), null)
on conflict (dictionary_version, qualified_name) do nothing;

-- ---------------------------------------------------------------------------------------------
-- Domain J behaviour (hand written; the table above is generated)
-- ---------------------------------------------------------------------------------------------

-- The participant writes and edits their own notes, and deletes them. No other role has any path in.
grant insert (entry_id, created_by, entry_kind, text, text_capture_state, module_reference, module_reference_capture_state, schema_version),
      update (text, text_capture_state, module_reference, module_reference_capture_state, updated_at),
      delete on public.t3a_growth_log_entry to authenticated;
-- delete is a participant right over their own notebook, so the table is not insert only
drop policy if exists t3a_growth_log_entry_own_insert on public.t3a_growth_log_entry;
create policy t3a_growth_log_entry_own_insert on public.t3a_growth_log_entry for insert to authenticated with check (created_by = auth.uid());
drop policy if exists t3a_growth_log_entry_own_update on public.t3a_growth_log_entry;
create policy t3a_growth_log_entry_own_update on public.t3a_growth_log_entry for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists t3a_growth_log_entry_own_delete on public.t3a_growth_log_entry;
create policy t3a_growth_log_entry_own_delete on public.t3a_growth_log_entry for delete to authenticated using (created_by = auth.uid());

create or replace function public.t3a_growth_log_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists t3a_1_growth_log_touch_trg on public.t3a_growth_log_entry;
create trigger t3a_1_growth_log_touch_trg before update on public.t3a_growth_log_entry for each row execute function public.t3a_growth_log_touch();

-- The older platform written Growth Log (growth_log_entries, growth_logs) is frozen (CR-005):
--  * the five platform generated rows are hidden, not deleted, and counted;
--  * every new insert by any code is discarded and logged, so screens that still write do not break while they are moved;
--  * the owner may no longer see platform generated rows.
alter table public.growth_log_entries add column if not exists platform_hidden_at timestamptz;
update public.growth_log_entries set platform_hidden_at = now() where platform_hidden_at is null;

create or replace function public.t3a_growth_log_legacy_discard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.t3a_capture_refuse('growth_log.platform_write', 'PLATFORM_WRITE_DISCARDED', tg_table_name, 'the platform writes nothing to the Growth Log; the insert was discarded');
  return null;
end $$;
drop trigger if exists t3a_0_growth_log_discard_trg on public.growth_log_entries;
create trigger t3a_0_growth_log_discard_trg before insert on public.growth_log_entries for each row execute function public.t3a_growth_log_legacy_discard();
drop trigger if exists t3a_0_growth_log_discard_trg on public.growth_logs;
create trigger t3a_0_growth_log_discard_trg before insert on public.growth_logs for each row execute function public.t3a_growth_log_legacy_discard();

drop policy if exists growth_log_entries_owner_select on public.growth_log_entries;
do $$ declare r record; begin
  for r in select polname from pg_policy where polrelid = 'public.growth_log_entries'::regclass loop
    execute format('drop policy %I on public.growth_log_entries', r.polname);
  end loop;
end $$;
create policy growth_log_entries_owner_select_visible on public.growth_log_entries for select to authenticated using (candidate_id = auth.uid() and platform_hidden_at is null);

-- What the participant sees of their observations is regenerated from the canonical record. No measures, no trend line, no progress figure,
-- no mentor wording. Their own rows only (security invoker + row security on the base table is not enough, so the view filters itself).
create or replace view public.t3a_growth_log_observation_view with (security_invoker = false) as
  select o.observation_id, o.participant_id, o.stage_code, o.dimension_id, o.created_at as committed_at
    from public.t3a_observation o
   where o.participant_id = auth.uid();
revoke all on public.t3a_growth_log_observation_view from public, anon;
grant select on public.t3a_growth_log_observation_view to authenticated;
comment on view public.t3a_growth_log_observation_view is 'Domain J: the participant''s observation history, regenerated from t3a_observation on every read. Nothing is stored in the Growth Log for it (DT-63).';
