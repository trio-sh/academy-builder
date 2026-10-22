-- Founder decisions of 21 October 2026 (CR-174): REC-03 correction commitment values, T-EVNOTE-001 version 2, and the Stage 4
-- group participation notice. Each is a configuration or controlled-text row, so counsel can change it without a code change.
-- A key is seeded only while its latest value is absent or blank (unset), so a value already loaded is never overridden.
-- Nothing here activates Stage 4: s4_activation_state is not touched and Stage 4 entry keeps refusing with s4_not_activated.
-- The set_by value is the all-zero system identifier: the values are the founder's, loaded from his written answer.

insert into public.t3a_configuration_value (configuration_key, configuration_value, configuration_version, set_by)
select k, v, '1.0', '00000000-0000-0000-0000-000000000000'::uuid
from (values
  ('correction_acknowledge_business_days', '5'),
  ('correction_decision_target_business_days', '20'),
  ('correction_response_time', 'We will acknowledge your correction within 5 business days and aim to give you the decision within 20 business days. If a case needs longer, we will tell you why and when to expect it.'),
  ('s4_group_notice_version', '1.0'),
  ('s4_group_notice_text', E'In this session you will take part in a live discussion on Google Meet with a mentor and three people who play set roles. Only you are observed. The session is not recorded. The other people will see and hear what you say, and each has agreed to keep the session confidential. You can stop at any time by saying so; stopping is not held against you and records no finding.\nDo you agree to take part in this group session?')
) as t(k, v)
where coalesce((select nullif(btrim(c.configuration_value), '') from public.t3a_configuration_value c where c.configuration_key = t.k order by c.configuration_seq desc limit 1), '') = '';

-- The hash binds every permission to the exact text shown.
insert into public.t3a_configuration_value (configuration_key, configuration_value, configuration_version, set_by)
select 's4_group_notice_hash',
       encode(sha256(convert_to((select configuration_value from public.t3a_configuration_value where configuration_key = 's4_group_notice_text' order by configuration_seq desc limit 1), 'UTF8')), 'hex'),
       '1.0', '00000000-0000-0000-0000-000000000000'::uuid
where coalesce((select nullif(btrim(configuration_value), '') from public.t3a_configuration_value where configuration_key = 's4_group_notice_hash' order by configuration_seq desc limit 1), '') = '';

insert into public.t3a_d1_report_controlled_text (text_ref, block_no, body)
values ('T-EVNOTE-001', null, 'Stage 1 written situations are presented through a fixed automated process that shows each situation exactly as written and generates nothing. A Stage 1 observation enters the evidence record only after authorized human confirmation. Source linked statements remain subject to participant review, correction, amendment and evidence currency controls.')
on conflict (text_ref) do nothing;

-- The notice the participant reads: paragraph 2.21 and the two numbers, read from configuration; unset means nothing renders.
create or replace function public.t3a_correction_commitment() returns jsonb language sql stable security definer set search_path = public as $fn$
  with c as (
    select
      (select nullif(btrim(configuration_value), '') from public.t3a_configuration_value where configuration_key = 'correction_response_time' order by configuration_seq desc limit 1) as sentence,
      (select nullif(btrim(configuration_value), '') from public.t3a_configuration_value where configuration_key = 'correction_acknowledge_business_days' order by configuration_seq desc limit 1) as ack,
      (select nullif(btrim(configuration_value), '') from public.t3a_configuration_value where configuration_key = 'correction_decision_target_business_days' order by configuration_seq desc limit 1) as dec)
  select case when sentence is null or ack is null or dec is null
              then jsonb_build_object('rendered', false, 'reason', 'correction_response_time_unloaded')
              else jsonb_build_object('rendered', true, 'value', sentence, 'acknowledge_business_days', ack::int, 'decision_target_business_days', dec::int) end
  from c
$fn$;
revoke all on function public.t3a_correction_commitment() from public;
grant execute on function public.t3a_correction_commitment() to anon, authenticated, service_role;

-- The text the one question permission screen shows, with the version and hash recorded on the answer.
create or replace function public.t3a_group_participation_notice() returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when v is null or h is null or t is null
              then jsonb_build_object('rendered', false, 'reason', 'group_notice_unloaded')
              else jsonb_build_object('rendered', true, 'notice_version', v, 'notice_hash', h, 'text', t) end
  from (select
    (select nullif(configuration_value, '') from public.t3a_configuration_value where configuration_key = 's4_group_notice_version' order by configuration_seq desc limit 1) as v,
    (select nullif(configuration_value, '') from public.t3a_configuration_value where configuration_key = 's4_group_notice_hash' order by configuration_seq desc limit 1) as h,
    (select nullif(configuration_value, '') from public.t3a_configuration_value where configuration_key = 's4_group_notice_text' order by configuration_seq desc limit 1) as t) x
$fn$;
revoke all on function public.t3a_group_participation_notice() from public;
grant execute on function public.t3a_group_participation_notice() to authenticated, service_role;
