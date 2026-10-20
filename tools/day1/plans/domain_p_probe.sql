do $$ declare c text; r1 jsonb; r2 jsonb; r3 jsonb; r4 jsonb; n int;
begin
  select retention_class::text into c from public.t3a_retention_schedule where counsel_ratified_at is null limit 1;
  perform set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  r1 := public.t3a_attempt_destruction(c);
  r2 := public.t3a_deployment_value('mentor_invitation_ttl');
  r3 := public.t3a_emit_first('not.a.registered.event','SYSTEM_SERVICE','svc','system_service','event', gen_random_uuid(), '{}'::jsonb, 'probe-ef', 'probe');
  select count(*) into n from public.t3a_error_journal;
  raise exception 'PROBE destruction=% unset=% emit=% journal_rows_in_probe=%', r1->>'reason', r2->>'reason', r3->>'reason', n;
end $$;
