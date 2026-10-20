-- T3A-DEV-DAY1-001 Version 1.3, reconciliation step R1 (PostgreSQL). Read only: no data changes and no row level personal data.
-- Run with a read only role. Save the output as inventory evidence for the reconciliation report.
SELECT current_database() AS database_name, current_setting('server_version') AS postgres_version, current_user AS inspection_role;
SELECT n.nspname AS schema_name,c.relname AS object_name,c.relkind AS object_kind
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2;
SELECT table_schema,table_name,column_name,data_type,udt_name,is_nullable,column_default
FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema')
ORDER BY table_schema,table_name,ordinal_position;
SELECT table_schema,table_name,constraint_name,constraint_type
FROM information_schema.table_constraints WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,3;
SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2,3;
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies ORDER BY 1,2,3;
SELECT routine_schema,routine_name,routine_type FROM information_schema.routines
WHERE routine_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1,2;
