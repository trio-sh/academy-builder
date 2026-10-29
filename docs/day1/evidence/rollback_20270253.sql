-- Rollback of migration 20270253: puts the open policy back (it is what the live project had before).
drop policy if exists mentor_assigned_dimensions_rw on public.mentor_assigned_dimensions;
create policy mentor_assigned_dimensions_rw on public.mentor_assigned_dimensions for all using (true) with check (true);
