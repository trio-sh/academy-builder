-- ---------------------------------------------------------------------------------------------
-- Domain D behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

-- DT-14: capture never blocks. A source that lacks content a registry field asks for is stored as it is, the
-- field's capture state is not_authored, and longitudinal use stays not_eligible (the comparison fields are DORMANT).
create or replace function public.t3a_source_not_authored() returns trigger language plpgsql as $$
declare pair text; col text; cs text;
begin
  foreach pair in array array[
    'content_sensitivity:content_sensitivity_capture_state', 'atlas_moment_id:atlas_moment_id_capture_state', 'atlas_terrain_id:atlas_terrain_id_capture_state',
    'beat_sequence:beat_sequence_capture_state', 'situation_context:situation_context_capture_state',
    'comparison_family_id:comparison_family_id_capture_state', 'comparison_demand_id:comparison_demand_id_capture_state',
    'observation_opportunity_id:observation_opportunity_id_capture_state', 'demand_conditions_version:demand_conditions_version_capture_state',
    'form_relationship_id:form_relationship_id_capture_state', 'variation_intent:variation_intent_capture_state'] loop
    col := split_part(pair, ':', 1); cs := split_part(pair, ':', 2);
    if to_jsonb(new)->>col is null then new := jsonb_populate_record(new, jsonb_build_object(cs, 'not_authored')); end if;
  end loop;
  new.longitudinal_use_status := 'not_eligible';
  new.longitudinal_use_status_capture_state := 'captured';
  return new;
end $$;
drop trigger if exists t3a_source_not_authored_trg on public.t3a_source;
create trigger t3a_source_not_authored_trg before insert or update on public.t3a_source for each row execute function public.t3a_source_not_authored();
update public.t3a_source set longitudinal_use_status = 'not_eligible' where longitudinal_use_status is null;
