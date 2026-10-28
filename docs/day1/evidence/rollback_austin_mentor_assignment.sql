-- Rollback of tools/day1/live_data/austin_mentor_assignment.sql: removes the assignment and the eligible Stage 1 instance it created, only while the instance is still untouched.
delete from public.t3a_mentor_assignment where participant_id = (select id from public.profiles where email = 'austinegakehmi@gmail.com')
  and mentor_id = (select id from public.profiles where email = 'tony1mofoke@yahoo.com');
delete from public.t3a_stage_instance si where si.participant_id = (select id from public.profiles where email = 'austinegakehmi@gmail.com')
  and si.stage_code = 'S1' and si.dimension_id = 'D1' and si.attempt_no = 1 and si.state = 'eligible' and si.activated_at is null
  and not exists (select 1 from public.t3a_stage_entry_event e where e.stage_instance_id = si.stage_instance_id);
