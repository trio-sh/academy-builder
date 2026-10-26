-- Rollback of 20270225000000_d9_session_archive_content.sql: removes the 30 inactive draft records of the D9 package. The registry table is append only, so the guard is lifted for this delete only.
-- Valid while the activation flag is off and no D9 record has been approved (a draft carries no approval, so nothing else reads it).
alter table public.t3a_lsa_registry_record disable trigger t3a_append_only;
delete from public.t3a_lsa_registry_record where package_id = 'T3A-D9-LSA-CONTENT-001' and status = 'draft_for_approval';
alter table public.t3a_lsa_registry_record enable trigger t3a_append_only;
