-- CR-17 wiring (CR-187): the comparison route reads the selection log. An observation whose source was chosen by the family-exposure fallback
-- (comparison = 'not_eligible') is refused for comparison, with one fixed code. Read-only; changes no row; service role only.
create or replace function public.t3a_cr17_comparison_gate(p_observation_record uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $fn$
declare o public.t3a_observation_record; e record; s record;
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_COMPARISON_GATE_SERVICE_ONLY: the comparison gate is a service route' using errcode = '42501'; end if;
  select * into o from public.t3a_observation_record where observation_record_id = p_observation_record;
  if o.observation_record_id is null then return jsonb_build_object('outcome', 'refused', 'reason', 'OBSERVATION_NOT_FOUND'); end if;
  select * into e from public.t3a_stage_entry_event where stage_instance_id = o.stage_instance_id order by entered_at desc nulls last limit 1;
  if e.stage_entry_event_id is null or e.source_version_id is null then
    return jsonb_build_object('outcome', 'comparable', 'mode', 'unselected', 'observation_record_id', o.observation_record_id);
  end if;
  select * into s from public.t3a_source_selection_log l
   where l.participant_id = o.participant_id and l.dimension_id = o.dimension_id and l.stage_code = o.stage_code and l.selected_source_version_id = e.source_version_id
   order by l.selected_at desc, l.selection_id limit 1;
  if s.selection_id is null then return jsonb_build_object('outcome', 'comparable', 'mode', 'unselected', 'observation_record_id', o.observation_record_id); end if;
  if s.comparison = 'not_eligible' then
    return jsonb_build_object('outcome', 'refused', 'reason', 'COMPARISON_NOT_ELIGIBLE', 'observation_record_id', o.observation_record_id);
  end if;
  return jsonb_build_object('outcome', 'comparable', 'mode', s.comparison, 'observation_record_id', o.observation_record_id);
end $fn$;
revoke all on function public.t3a_cr17_comparison_gate(uuid) from public, anon, authenticated;
grant execute on function public.t3a_cr17_comparison_gate(uuid) to service_role;
