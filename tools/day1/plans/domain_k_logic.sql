-- ---------------------------------------------------------------------------------------------
-- Domain K behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- The aggregate telemetry table is a SOCKET: structure only, every write refused until it is activated.
drop trigger if exists t3a_socket_closed on public.t3a_rehearsal_telemetry_aggregate;
create trigger t3a_socket_closed before insert or update on public.t3a_rehearsal_telemetry_aggregate for each row execute function public.t3a_socket_closed();

-- Rehearsal attempt numbers run in sequence per participant and module and never go down.
create or replace function public.t3a_rehearsal_attempt_seq() returns trigger language plpgsql security definer set search_path = public as $$
begin
  select coalesce(max(a.rehearsal_attempt_no), 0) + 1 into new.rehearsal_attempt_no
    from public.t3a_rehearsal_attempt a where a.participant_id = new.participant_id and a.rehearsal_session_id = new.rehearsal_session_id;
  return new;
end $$;
drop trigger if exists t3a_0_rehearsal_attempt_seq_trg on public.t3a_rehearsal_attempt;
create trigger t3a_0_rehearsal_attempt_seq_trg before insert on public.t3a_rehearsal_attempt for each row execute function public.t3a_rehearsal_attempt_seq();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 't3a_rehearsal_session_state_chk') then
    alter table public.t3a_rehearsal_session add constraint t3a_rehearsal_session_state_chk check (rehearsal_completion_state is null or rehearsal_completion_state in ('complete', 'partial', 'abandoned')) not valid;
    alter table public.t3a_rehearsal_session add constraint t3a_rehearsal_session_modality_chk check (response_modality is null or response_modality in ('text', 'voice', 'accessible_alternative')) not valid;
    alter table public.t3a_rehearsal_attempt add constraint t3a_rehearsal_attempt_state_chk check (module_completion_state is null or module_completion_state in ('complete', 'partial', 'abandoned')) not valid;
    alter table public.t3a_rehearsal_attempt add constraint t3a_rehearsal_attempt_retention_chk check (retention_check_status is null or retention_check_status in ('pending', 'served', 'completed', 'declined', 'expired')) not valid;
    alter table public.t3a_coaching_feedback add constraint t3a_coaching_feedback_source_chk check (feedback_source_type is null or feedback_source_type in ('canned_reference', 'self_reflection', 'human_developmental')) not valid;
  end if;
end $$;

-- The rehearsal firewall (DT-32): this function reports any foreign key between the rehearsal store and the evidence store.
-- It returns no rows when the boundary is intact.
create or replace function public.t3a_rehearsal_firewall_findings() returns table (child_table text, parent_table text, constraint_name text)
language sql stable security definer set search_path = public as $$
  with rehearsal as (select c.oid, c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname in
      ('t3a_rehearsal_session', 't3a_rehearsal_attempt', 't3a_rehearsal_activity_history', 't3a_rehearsal_artifact', 't3a_coaching_feedback', 't3a_rehearsal_telemetry_aggregate', 't3a_growth_log_entry')),
  evidence as (select c.oid, c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname in
      ('t3a_observation', 't3a_observation_record', 't3a_attempt', 't3a_stage_entry_event', 't3a_stage_instance', 't3a_observation_path_gateway', 't3a_d1_ber_report',
       't3a_d1_report_issuance', 't3a_determination', 't3a_dimension_evidence', 't3a_challenge_case', 't3a_mentor_judgment', 't3a_d1_progression_decision'))
  select cl.relname::text, pl.relname::text, k.conname::text from pg_constraint k
    join pg_class cl on cl.oid = k.conrelid join pg_class pl on pl.oid = k.confrelid
   where k.contype = 'f' and ((cl.oid in (select oid from rehearsal) and pl.oid in (select oid from evidence))
                           or (cl.oid in (select oid from evidence) and pl.oid in (select oid from rehearsal)))
$$;
revoke all on function public.t3a_rehearsal_firewall_findings() from public, anon, authenticated;
grant execute on function public.t3a_rehearsal_firewall_findings() to service_role;
