do $$ declare s uuid; p uuid; sc public.t3a_scenario_class; n1 int; n2 int; a1 int; a2 int;
begin
  select account_id into p from public.t3a_account limit 1;
  select (enum_range(null::public.t3a_scenario_class))[1] into sc;
  insert into public.t3a_rehearsal_session(participant_id, scenario_class, module_id, module_version, rehearsal_completion_state) values (p, sc, gen_random_uuid(), '1.0', 'partial') returning rehearsal_session_id into s;
  insert into public.t3a_rehearsal_attempt(participant_id, rehearsal_session_id, rehearsal_attempt_no, module_completion_state, module_completion_at) values (p, s, 9, 'complete', now()) returning rehearsal_attempt_no into a1;
  insert into public.t3a_rehearsal_attempt(participant_id, rehearsal_session_id, rehearsal_attempt_no, module_completion_state, module_completion_at) values (p, s, 9, 'complete', now()) returning rehearsal_attempt_no into a2;
  select count(*) into n1 from public.t3a_rehearsal_firewall_findings();
  raise exception 'PROBE attempt_numbers=% % firewall_findings=%', a1, a2, n1;
end $$;
