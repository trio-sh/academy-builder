-- ---------------------------------------------------------------------------------------------
-- Domain C behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- DT-12: attempt_no is assigned in sequence per participant, dimension and Stage, never reused, never lowered, never deleted.
create or replace function public.t3a_attempt_sequence() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.participant_id::text || new.dimension_id || new.stage_code::text, 0));
    new.attempt_no := greatest(coalesce(new.attempt_no, 0),
      coalesce((select max(attempt_no) from public.t3a_attempt where participant_id = new.participant_id and dimension_id = new.dimension_id and stage_code = new.stage_code), 0) + 1);
    -- DT-13: a welfare stop consumes no attempt and sets no cooldown.
    if new.attempt_event_class = 'welfare_stop' then new.counted := false; new.cooldown_class := 'none'; end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.attempt_no is distinct from old.attempt_no then
      raise exception 'T3A_ATTEMPT_NO_IMMUTABLE: attempt_no cannot be changed, lowered or reset' using errcode = '42501';
    end if;
    if new.attempt_event_class = 'welfare_stop' then new.counted := false; new.cooldown_class := 'none'; end if;
    return new;
  end if;
  raise exception 'T3A_ATTEMPT_NO_DELETE: attempts are never deleted; the sequence never decreases' using errcode = '42501';
end $$;
drop trigger if exists t3a_1_attempt_sequence_trg on public.t3a_attempt;
create trigger t3a_1_attempt_sequence_trg before insert or update or delete on public.t3a_attempt for each row execute function public.t3a_attempt_sequence();

-- Number the attempts already on file, in time order (the trigger above refuses attempt_no changes, so this runs before it is live for them).
do $$
begin
  alter table public.t3a_attempt disable trigger t3a_1_attempt_sequence_trg;
  update public.t3a_attempt a set attempt_no = n.rn
    from (select attempt_id, row_number() over (partition by participant_id, dimension_id, stage_code order by created_at, attempt_id) rn from public.t3a_attempt) n
   where a.attempt_id = n.attempt_id and a.attempt_no is null;
  alter table public.t3a_attempt enable trigger t3a_1_attempt_sequence_trg;
end $$;

-- DT-11: the Stage entry event is created at the entry action. A supplied time is not trusted if it is backdated.
create or replace function public.t3a_stage_entry_time() returns trigger language plpgsql as $$
begin
  if new.entered_at is null or new.entered_at < now() - interval '5 minutes' or new.entered_at > now() + interval '1 minute' then
    if new.entered_at is not null and new.entered_at < now() - interval '5 minutes' then
      raise exception 'T3A_STAGE_ENTRY_BACKDATED: the Stage entry event is created at the entry action, not at allocation or any earlier time' using errcode = '22023';
    end if;
    new.entered_at := now();
  end if;
  return new;
end $$;
drop trigger if exists t3a_1_stage_entry_time_trg on public.t3a_stage_entry_event;
create trigger t3a_1_stage_entry_time_trg before insert on public.t3a_stage_entry_event for each row execute function public.t3a_stage_entry_time();
