-- CR-220 live data step. NOT RUN until the migration 20270132 is on the project. Usage: psql -v person=<profile id of the interim evidence reviewer> -f this file.
-- Approves the issuance floor for the test pilot (one committed observation, one observer, one Stage) and puts one person on the interim authority list.
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
reset role;
update public.t3a_d1_issuance_floor_config set status = 'approved', minimum_committed_observations = 1, minimum_distinct_observers = 1, minimum_distinct_stages = 1, approved_by = :'person'::uuid, approved_at = now() where singleton = 1;
set local role service_role;
select public.t3a_d1_review_authority_record(:'person'::uuid, 'grant', 'CR-220: interim evidence review authority under the founder approval of 23 October 2026') as granted;
commit;
