-- Rolls back tools/day1/interim_issuance_on.sql. The list is append-only, so the person is revoked by a new row; the floor goes back to not approved. Usage: psql -v person=<profile id> -f this file.
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select public.t3a_d1_review_authority_record(:'person'::uuid, 'revoke', 'CR-220 rolled back') as revoked;
reset role;
update public.t3a_d1_issuance_floor_config set status = 'not_approved', minimum_committed_observations = null, minimum_distinct_observers = null, minimum_distinct_stages = null, approved_by = null, approved_at = null where singleton = 1;
commit;
