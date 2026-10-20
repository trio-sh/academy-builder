-- Rollback of 20261213000000_step3_stage3_stage4.sql (restores t3a_s4_activation_state as it was before this step)
drop function if exists public.t3a_s3_assign(uuid, uuid, timestamptz);
drop function if exists public.t3a_s3_respond(uuid, text);
drop function if exists public.t3a_s3_submit(uuid, text, boolean, boolean, text, boolean, text, uuid);
drop function if exists public.t3a_s3_deadline_sweep(timestamptz);
drop function if exists public.t3a_s3_capture_gate(uuid, uuid);
drop function if exists public.t3a_s4_compose_session(uuid, uuid, uuid, uuid[], boolean);
drop function if exists public.t3a_s4_record_group_participation(uuid);
drop function if exists public.t3a_s4_enter(uuid);
drop function if exists public.t3a_s4_lane_view(uuid, uuid);
alter table public.t3a_s4_group_participation disable trigger t3a_append_only;
alter table public.t3a_s4_entry_attempt disable trigger t3a_append_only;
drop table if exists public.t3a_s4_entry_attempt;
drop table if exists public.t3a_s4_group_participation;
alter table public.t3a_d1_work_sample_submission drop column if exists dimension_id;
CREATE OR REPLACE FUNCTION public.t3a_s4_activation_state()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select configuration_value from public.t3a_configuration_value where configuration_key = 's4_activation_state' order by configuration_seq desc limit 1
$function$
;
