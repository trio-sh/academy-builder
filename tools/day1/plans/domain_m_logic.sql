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
