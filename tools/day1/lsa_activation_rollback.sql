-- Usage: psql -v set_by=<auth user id> -f this file. Rollback: the flag is append-only, so turning it off is a new row with value 'off'. NOT RUN.
begin;
insert into public.t3a_configuration_value (configuration_key, configuration_value, configuration_version, set_by)
select 'lsa_activation', 'off', '1.1', :'set_by'::uuid
where public.t3a_lsa_flag('lsa_activation');
select public.t3a_lsa_flag('lsa_activation') as lsa_activation_is_on;
commit;
