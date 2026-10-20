do $$ declare r1 jsonb; r2 jsonb; n int;
begin
  r1 := public.t3a_config_get('probe_unset_key');
  insert into public.t3a_registry_asset(asset_type, current_version, deployment_status) values ('probe_asset','1.0','deployed');
  update public.t3a_registry_asset set current_version = '1.1' where asset_type = 'probe_asset';
  select count(*) into n from public.t3a_registry_asset where asset_type = 'probe_asset' and previous_version = '1.0';
  raise exception 'PROBE unset=% previous_kept=%', r1->>'reason', n;
end $$;
