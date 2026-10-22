-- A configuration value that is blank is unset. t3a_required_setting returned the blank text as if it were a value, so a caller that casts it
-- (for example the Stage entry hold time, read as an integer) failed with an integer cast error instead of refusing as CONFIGURATION_UNSET.
-- Every other reader of this table already treats a blank value as unset; this one now does too.
create or replace function public.t3a_required_setting(p_key text) returns text language plpgsql stable security definer set search_path = public as $fn$
declare v text;
begin
  select nullif(btrim(configuration_value), '') into v from public.t3a_configuration_value where configuration_key = p_key order by configuration_seq desc limit 1;
  if v is null then select nullif(btrim(to_jsonb(c) ->> p_key), '') into v from public.t3a_deployment_config c where singleton; end if;
  if v is null then
    raise exception 'CONFIGURATION_UNSET: % is not set; this route refuses and does not default', p_key using errcode = '55000';
  end if;
  return v;
end $fn$;
