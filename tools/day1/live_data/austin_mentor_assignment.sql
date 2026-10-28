-- CR-336: gives the Austin test account the formal records Catherine Litanga's account has: an eligible Stage 1 (D1) instance, and a coordinator allocated
-- t3a_mentor_assignment to Tony Mofoke's mentor account. The entry route reuses an eligible Stage 1 instance, so her first entry finds this one. Idempotent.
-- Rollback: docs/day1/evidence/rollback_austin_mentor_assignment.sql
do $do$
declare v_p uuid; v_m uuid; v_si uuid;
begin
  select id into v_p from public.profiles where email = 'austinegakehmi@gmail.com';
  select id into v_m from public.profiles where email = 'tony1mofoke@yahoo.com';
  if v_p is null or v_m is null then raise exception 'AUSTIN_ASSIGNMENT_ACCOUNT_MISSING'; end if;
  select stage_instance_id into v_si from public.t3a_stage_instance where participant_id = v_p and stage_code = 'S1' and dimension_id = 'D1' and attempt_no = 1;
  if v_si is null then
    insert into public.t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values (v_p, 'S1', 'D1', 1, 'eligible') returning stage_instance_id into v_si;
  end if;
  if not exists (select 1 from public.t3a_mentor_assignment where mentor_id = v_m and participant_id = v_p) then
    insert into public.t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) values (v_m, v_p, v_si, 'coordinator_allocated');
  end if;
end
$do$;
