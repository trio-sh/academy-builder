-- Day 1 DT-26: demonstration inheritance. Everything that belongs to a demonstration account is a demonstration record, and a record
-- cannot be converted between real, synthetic_test and demonstration. A refused conversion is logged, not raised, so the log is kept.

create or replace function public.t3a_event_record_property_inherit() returns trigger language plpgsql security definer set search_path = public as $$
declare v_prop text;
begin
  if new.subject_id is not null then
    select record_property into v_prop from public.t3a_account where account_id = new.subject_id;
    if v_prop = 'demonstration' and new.record_property is distinct from 'demonstration' then
      raise exception 'RECORD_PROPERTY_NOT_INHERITED: an event about a demonstration account is a demonstration event' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists t3a_0_record_property_inherit_trg on public.t3a_event_log;
create trigger t3a_0_record_property_inherit_trg before insert on public.t3a_event_log for each row execute function public.t3a_event_record_property_inherit();

create or replace function public.t3a_convert_record_property(p_account uuid, p_to text) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  return public.t3a_capture_refuse('record_property.convert', 'RECORD_PROPERTY_CONVERSION_REFUSED', p_account::text, 'a record is real, synthetic_test or demonstration for life; conversion to ' || coalesce(p_to, 'null') || ' is refused');
end $$;
revoke all on function public.t3a_convert_record_property(uuid, text) from public, anon, authenticated;
grant execute on function public.t3a_convert_record_property(uuid, text) to service_role;

-- DT-22: an observation is never changed or removed. The older guard only watched twelve identifying columns and said nothing about DELETE, so
-- a result field could be edited and a row deleted. The only changes now allowed are the pointer to the superseding record (null to a value) and a
-- capture state moving from not_captured to captured, which is bookkeeping done when a column is added.
create or replace function public.t3a_observation_strict_append_only() returns trigger language plpgsql as $$
declare k text; o jsonb; n jsonb;
begin
  if tg_op = 'DELETE' then
    raise exception 'T3A_APPEND_ONLY: an observation is never deleted; correct it with a superseding record' using errcode = '42501';
  end if;
  o := to_jsonb(old); n := to_jsonb(new);
  for k in select key from jsonb_each(n) loop
    if n->k is distinct from o->k then
      if k = 'superseded_by' and o->>k is null then continue; end if;
      if k like '%\_capture\_state' and o->>k = 'not_captured' and n->>k = 'captured' then continue; end if;
      raise exception 'T3A_APPEND_ONLY: % cannot change on an observation; correct it with a superseding record', k using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists t3a_0_observation_strict_append_only_trg on public.t3a_observation;
create trigger t3a_0_observation_strict_append_only_trg before update or delete on public.t3a_observation for each row execute function public.t3a_observation_strict_append_only();
