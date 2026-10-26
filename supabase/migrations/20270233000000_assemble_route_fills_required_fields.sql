-- Found by the end to end report flow test run with every switch on (src/test/db/ber-generation-flow.db.test.ts): with enforce_required on, the assemble route
-- (t3a_d1_assemble_ber_for) could not create a report, because it wrote a t3a_d1_ber_report row without the thirteen fields the table now requires (the same kind of
-- gap CR-218 closed for the entry, application and challenge writers). The route now supplies them. Nothing else about it changes: same refusals, same pilot checklist.
--   ber_version, ber_standard_version, permitted_use_version  the first versions, as the report face and the registry carry them ('1.0')
--   represented_dimension_ids                                  the dimension assembled
--   observer_multiplicity_statement_code                       'M5', the registered code; the package does not define a rule that picks another by observer count (CR-300)
--   source_link                                                the committed observations the report was assembled from
--   report_preview_digest, report_content_digest               sha256 of the composed statements, in observation order, at assembly
--   ber_status 'assembling', preview_state 'current', report_type 'ber', specimen_render_flag false
-- verification_code is made by its own trigger. Switch state is untouched: with enforce_required off the route behaves as before.
create or replace function public.t3a_d1_assemble_ber_for(p_participant uuid, p_dimension text) returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_actor       uuid := auth.uid();
  v_env_mode    text;
  v_committed_n integer;
  v_ber_id      uuid;
  v_checklist   record;
  v_digest      text;
  v_obs         uuid[];
begin
  if v_actor is null then
    return jsonb_build_object('ok', false, 'refusal', 'NO_MENTOR_IDENTIFIED');
  end if;

  select count(*) into v_committed_n
    from public.t3a_observation_record o
    join public.t3a_d1_composed_statement s on s.observation_record_id = o.observation_record_id
   where o.participant_id = p_participant and o.dimension_id = p_dimension and o.is_committed;

  if v_committed_n = 0 then
    return jsonb_build_object('ok', false, 'refusal', 'NO_COMMITTED_OBSERVATIONS',
      'detail', 'Record at least one committed observation before assembling a BER.');
  end if;

  select identity_assurance_mode into v_env_mode from public.t3a_env_capability where singleton = 1;

  -- Create or reuse an existing assembling/assembled BER row for this participant+dimension. Never overwrite an issued one — amend instead.
  select ber_report_id into v_ber_id from public.t3a_d1_ber_report
   where participant_id = p_participant and dimension_id = p_dimension and status in ('participant_review','challenge_open','ready_to_issue')
   limit 1;

  if v_ber_id is null then
    select encode(extensions.digest(string_agg(s.composed_body, E'\n' order by o.committed_at, o.observation_record_id), 'sha256'), 'hex'), array_agg(o.observation_record_id order by o.committed_at, o.observation_record_id)
      into v_digest, v_obs
      from public.t3a_observation_record o
      join public.t3a_d1_composed_statement s on s.observation_record_id = o.observation_record_id
     where o.participant_id = p_participant and o.dimension_id = p_dimension and o.is_committed;

    insert into public.t3a_d1_ber_report (
      participant_id, dimension_id, status, version_set, assembled_at,
      ber_version, ber_standard_version, permitted_use_version, represented_dimension_ids, observer_multiplicity_statement_code, source_link,
      ber_status, specimen_render_flag, report_type, report_preview_digest, preview_state, report_content_digest
    ) values (
      p_participant, p_dimension, 'ready_to_issue',
      jsonb_build_object('question_set_version','v1.0','assembled_by', v_actor,'assembled_at', now()), now(),
      '1.0', '1.0', '1.0', array[p_dimension]::text[], 'M5', jsonb_build_object('observation_record_ids', to_jsonb(v_obs)),
      'assembling', false, 'ber', v_digest, 'current', v_digest
    ) returning ber_report_id into v_ber_id;
  end if;

  -- Auto-pass the review checklist items in pilot mode. In production this is replaced by the mentor review UI; a non-pilot caller never
  -- reaches this path because v_env_mode = 'IDV_VERIFIED' would require an explicit mentor review.
  if v_env_mode = 'ATTESTATION_ONLY' then
    for v_checklist in
      select item_no from public.t3a_d1_review_checklist_item
      where item_no not in (select item_no from public.t3a_d1_review_result where ber_report_id = v_ber_id)
    loop
      insert into public.t3a_d1_review_result (ber_report_id, item_no, outcome, detail, reviewed_by, reviewed_at)
      values (v_ber_id, v_checklist.item_no, 'pass', 'PILOT_AUTO_PASS: identity mode ATTESTATION_ONLY; mentor-attested review UI not yet live.', v_actor, now());
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'ber_report_id', v_ber_id, 'committed_statements', v_committed_n, 'review_mode', coalesce(v_env_mode, 'UNAVAILABLE'));
end;
$function$;
