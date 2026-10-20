-- Rollback for 20261113 (Domain J). Applied to production 20 Oct 2026.
-- Restores the platform written Growth Log table to its state before the change (the five rows become visible again to their owner).
drop trigger if exists t3a_0_growth_log_discard_trg on public.growth_log_entries;
drop trigger if exists t3a_0_growth_log_discard_trg on public.growth_logs;
drop policy if exists growth_log_entries_owner_select_visible on public.growth_log_entries;
create policy growth_log_entries_owner_select on public.growth_log_entries for select to authenticated using (candidate_id = auth.uid());
create policy growth_log_entries_owner_insert on public.growth_log_entries for insert to authenticated with check (candidate_id = auth.uid());
update public.growth_log_entries set platform_hidden_at = null;
alter table public.growth_log_entries drop column if exists platform_hidden_at;
drop view if exists public.t3a_growth_log_observation_view;
drop table if exists public.t3a_growth_log_entry cascade;
delete from public.t3a_field_physical_map where qualified_name like 'J.%';
drop function if exists public.t3a_growth_log_legacy_discard(), public.t3a_growth_log_touch();
-- The pre-change policy list is in growth-log-snapshot-before-prod.json; restore any other policy from there.
