-- Rollback of 20261212000000_step3_calibration_and_pilot.sql (restores the two gate functions as they were before this step)
drop trigger if exists t3a_0_authorization_needs_clearance_trg on public.t3a_mentor_authorization;
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_observation_record;
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_d1_progression_decision;
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_evidence_review;
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_reconsideration_assignment;
drop trigger if exists t3a_5_calibration_boundary_trg on public.t3a_d1_report_issuance;
drop function if exists public.t3a_calibration_boundary();
drop function if exists public.t3a_authorization_needs_clearance();
drop function if exists public.t3a_calibration_peer_view(uuid, uuid);
drop function if exists public.t3a_calibration_agreement_by_source(uuid, int);
drop function if exists public.t3a_record_calibration_clearance(uuid, text, text, text, text, uuid[]);
drop function if exists public.t3a_pilot_set_stop(text, text, uuid, text);
drop function if exists public.t3a_pilot_path_open(uuid, text, text);
drop function if exists public.t3a_pilot_employer_attempt(text, uuid);
drop function if exists public.t3a_provenance_trace(uuid);
alter table public.t3a_calibration_clearance disable trigger t3a_append_only;
drop table if exists public.t3a_pilot_stop;
drop table if exists public.t3a_calibration_clearance;
drop table if exists public.t3a_calibration_participant;
alter table public.t3a_d1_calibration_exercise drop column if exists dimension_id;
CREATE OR REPLACE FUNCTION public.t3a_source_serving_gate(p_version uuid, p_stage text, p_participant uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.t3a_d1_content_version; o public.t3a_content_object; st text := upper(p_stage); ex jsonb;
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_version;
  if v.content_version_id is null then return public.t3a_capture_refuse('source.serve', 'source_version_not_found', p_version::text, 'no such version'); end if;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  if st = 'S4' and public.t3a_s4_activation_state() is null then
    return public.t3a_capture_refuse('source.serve', 's4_not_activated', p_version::text, 'Stage 4 entry is disabled behind s4_activation_state, which is not loaded');
  end if;
  if coalesce(v.body ->> 'stage_code', '') <> st then return public.t3a_capture_refuse('source.serve', 'source_stage_mismatch', p_version::text, 'the source belongs to Stage ' || coalesce(v.body ->> 'stage_code', '?')); end if;
  if v.superseded_by is not null or v.retired_at is not null or o.retired_at is not null then return public.t3a_capture_refuse('source.serve', 'source_superseded_or_retired', p_version::text, 'superseded and retired versions do not serve'); end if;
  if v.approval_status <> 'approved' or not public.t3a_d1_source_version_approved(p_version) then return public.t3a_capture_refuse('source.serve', 'source_not_approved', p_version::text, 'only an exact approved version serves'); end if;
  if v.operational_state <> 'active' then return public.t3a_capture_refuse('source.serve', 'source_not_active', p_version::text, 'the version is not loaded and active'); end if;
  if p_participant is not null then
    ex := public.t3a_prior_exposure(p_participant, p_version);
    if (ex ->> 'excluded')::boolean then return public.t3a_capture_refuse('source.serve', 'prior_exposure_exclusion', p_participant::text, ex ->> 'reasons'); end if;
  end if;
  return jsonb_build_object('outcome', 'servable', 'source_version_id', p_version);
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_stage_2_entry_gate(p_participant uuid, p_dimension text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s1 record; conf record; assigned uuid; prog text;
begin
  select stage_instance_id, state, completed_at into s1 from public.t3a_stage_instance
   where participant_id = p_participant and dimension_id::text = p_dimension and stage_code::text = 'S1' order by attempt_no desc nulls last, created_at desc limit 1;
  if s1.stage_instance_id is null or s1.completed_at is null then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_instance_not_closed');
  end if;
  select * into conf from public.t3a_d1_s1_confirmation where stage_instance_id = s1.stage_instance_id order by captured_at desc limit 1;
  select assigned_mentor_id into assigned from public.t3a_d1_s1_routing where stage_instance_id = s1.stage_instance_id order by routed_at desc limit 1;
  if conf.s1_confirmation_id is null then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_confirmation_record_absent_or_wrong_actor', 'detail', 'absent');
  end if;
  if assigned is null or conf.confirmed_by is distinct from assigned then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_confirmation_record_absent_or_wrong_actor', 'detail', 'wrong_actor');
  end if;
  if not exists (select 1 from public.t3a_observation_record o where o.participant_id = p_participant and o.dimension_id::text = p_dimension and o.stage_code::text = 'S1' and o.is_committed is true) then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_observation_not_committed');
  end if;
  prog := public.t3a_latest_progression(p_participant, p_dimension);
  if prog is distinct from 'proceed' then
    return jsonb_build_object('eligible', false, 'refusal_code', 's1_confirmation_absent', 'sub_reason', 's1_progression_absent_or_blocks', 'detail', coalesce(prog, 'absent'));
  end if;
  return jsonb_build_object('eligible', true);
end $function$
;
