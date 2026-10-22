-- Rollback of 20261231000000_founder_texts_rec03_evnote_s4notice.sql and 20270101000000_consent_notice_v1_2.sql.
-- t3a_configuration_value is append-only, so the rows are not deleted: each value is unset by appending a blank row (a blank value reads as unset everywhere).
drop trigger if exists t3a_consent_stamp_notice on public.t3a_consent_record;
drop function if exists public.t3a_consent_stamp_notice();
drop function if exists public.t3a_consent_notice();
drop function if exists public.t3a_group_participation_notice();
insert into public.t3a_configuration_value (configuration_key, configuration_value, configuration_version, set_by)
select k, '', '1.0', '00000000-0000-0000-0000-000000000000'::uuid
from unnest(array['correction_acknowledge_business_days','correction_decision_target_business_days','correction_response_time','s4_group_notice_version','s4_group_notice_text','s4_group_notice_hash','consent_notice_text','consent_notice_hash']) k;
delete from public.t3a_d1_report_controlled_text where text_ref = 'T-EVNOTE-001';
-- t3a_correction_commitment() returns to the single-value reader of 20261226000000_correction_commitment_read.sql
create or replace function public.t3a_correction_commitment() returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when v is null or btrim(v) = ''
              then jsonb_build_object('rendered', false, 'reason', 'correction_response_time_unloaded')
              else jsonb_build_object('rendered', true, 'value', btrim(v)) end
  from (select (select configuration_value from public.t3a_configuration_value where configuration_key = 'correction_response_time' order by configuration_seq desc limit 1) as v) x
$fn$;
