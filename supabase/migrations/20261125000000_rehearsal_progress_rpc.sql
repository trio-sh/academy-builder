-- Free practice progress without the Growth Log (CR-067).
-- BridgeFast used the platform written Growth Log as its record of which practices a participant had started or finished. The Growth Log is now the
-- participant's own notebook and the platform writes nothing to it (20261113), so that progress moves to the private rehearsal store, which is
-- participant only and never read by evidence code (DT-32). The app calls these two functions; it has no table access to the rehearsal store.

create table if not exists public.t3a_rehearsal_module (
  module_id uuid primary key,
  module_slug text not null unique check (module_slug ~ '^[a-z0-9][a-z0-9-]{0,80}$'),
  registered_at timestamptz not null default now()
);
comment on table public.t3a_rehearsal_module is 'Private rehearsal modules known to the app, keyed by their slug. module_id is derived from the slug so it is stable. Insert only.';
drop trigger if exists t3a_append_only on public.t3a_rehearsal_module;
create trigger t3a_append_only before update or delete on public.t3a_rehearsal_module for each row execute function public.t3a_deny_mutation();
alter table public.t3a_rehearsal_module enable row level security;
revoke all on public.t3a_rehearsal_module from anon, authenticated;

create or replace function public.t3a_rehearsal_record_practice(p_slug text, p_state text default 'complete') returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_mod uuid; v_session uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_state not in ('complete', 'partial', 'abandoned') then raise exception 'T3A_REHEARSAL_STATE: % is not a completion state', p_state using errcode = '22023'; end if;
  v_mod := md5('t3a:rehearsal-module:' || p_slug)::uuid;
  insert into public.t3a_rehearsal_module (module_id, module_slug) values (v_mod, p_slug) on conflict do nothing;
  insert into public.t3a_rehearsal_session (participant_id, scenario_class, module_id, rehearsal_completion_state, ended_at)
    values (v_uid, 'private_rehearsal', v_mod, p_state, case when p_state = 'complete' then now() end) returning rehearsal_session_id into v_session;
  return v_session;
end $$;
revoke all on function public.t3a_rehearsal_record_practice(text, text) from public, anon;
grant execute on function public.t3a_rehearsal_record_practice(text, text) to authenticated;

-- The caller's own practices: one row per module, latest first.
create or replace function public.t3a_rehearsal_progress() returns table (module_slug text, last_practiced_at timestamptz, completion_state text)
language sql stable security definer set search_path = public as $$
  select distinct on (m.module_slug) m.module_slug, s.started_at, s.rehearsal_completion_state
    from public.t3a_rehearsal_session s join public.t3a_rehearsal_module m on m.module_id = s.module_id
   where s.participant_id = auth.uid()
   order by m.module_slug, s.started_at desc
$$;
revoke all on function public.t3a_rehearsal_progress() from public, anon;
grant execute on function public.t3a_rehearsal_progress() to authenticated;
