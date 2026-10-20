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

-- What the participant sees of their observations is regenerated from the canonical record. No scores, no trend, no progress,
-- no mentor wording. Their own rows only (security invoker + row security on the base table is not enough, so the view filters itself).
create or replace view public.t3a_growth_log_observation_view with (security_invoker = false) as
  select o.observation_id, o.participant_id, o.stage_code, o.dimension_id, o.created_at as committed_at
    from public.t3a_observation o
   where o.participant_id = auth.uid();
revoke all on public.t3a_growth_log_observation_view from public, anon;
grant select on public.t3a_growth_log_observation_view to authenticated;
comment on view public.t3a_growth_log_observation_view is 'Domain J: the participant''s observation history, regenerated from t3a_observation on every read. Nothing is stored in the Growth Log for it (DT-63).';
