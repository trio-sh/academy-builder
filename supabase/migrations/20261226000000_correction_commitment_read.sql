-- D2 to D4 Section 11, test 35: the participant correction surface shows the response time commitment only when the
-- value is loaded. The value is the founder's (Section 12.1); there is no default and no fallback. Unloaded means the
-- surface renders nothing in its place.
create or replace function public.t3a_correction_commitment() returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when v is null or btrim(v) = ''
              then jsonb_build_object('rendered', false, 'reason', 'correction_response_time_unloaded')
              else jsonb_build_object('rendered', true, 'value', btrim(v)) end
  from (select (select configuration_value from public.t3a_configuration_value where configuration_key = 'correction_response_time' order by configuration_seq desc limit 1) as v) x
$fn$;
revoke all on function public.t3a_correction_commitment() from public;
grant execute on function public.t3a_correction_commitment() to anon, authenticated, service_role;
