-- Production activation of the Session Archive flag. NOT RUN. Usage: psql -v set_by=<auth user id of the person who decided> -f this file. Run only on the founder's word, in a transaction, then run tools/day1/lsa_activation_check.sql.
begin;
insert into public.t3a_configuration_value (configuration_key, configuration_value, configuration_version, set_by)
select 'lsa_activation', 'on', '1.0', :'set_by'::uuid
where not public.t3a_lsa_flag('lsa_activation');
select public.t3a_lsa_flag('lsa_activation') as lsa_activation_is_on;
commit;
