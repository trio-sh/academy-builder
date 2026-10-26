-- Rollback of 20270250000000_timing_reference_field_registry.sql: the hard coded rule on the three D1 question codes comes back, the registry goes.
CREATE OR REPLACE FUNCTION public.t3a_d1_reference_field(p_question_code text)
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE p_question_code
           WHEN 'Q-D1-02'  THEN 'enquiry_point'
           WHEN 'Q-D1-07'  THEN 'account_test_point'
           WHEN 'Q-D1-08a' THEN 'bearing_interest'
         END;
$fn$;
alter function public.t3a_d1_reference_beat(jsonb, text) immutable;
grant execute on function public.t3a_d1_reference_field(text) to authenticated;
drop table if exists public.t3a_timing_reference_field;
