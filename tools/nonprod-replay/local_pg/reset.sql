drop schema public cascade; create schema public;
grant usage on schema public to public, anon, authenticated, service_role; grant all on schema public to neondb_owner;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
