-- Rollback of 20261215000000_d2_demonstration_fixtures.sql (the four demonstration source objects, their versions, authorship and drafting test rows; nothing else)
alter table public.t3a_source_drafting_test disable trigger all;
delete from public.t3a_source_drafting_test where source_version_id in (select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.identifier like 'DEMO-D2-S_-001');
alter table public.t3a_source_drafting_test enable trigger all;
delete from public.t3a_source_authorship where source_version_id in (select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id) where o.identifier like 'DEMO-D2-S_-001');
delete from public.t3a_d1_content_version where content_object_id in (select content_object_id from public.t3a_content_object where identifier like 'DEMO-D2-S_-001');
delete from public.t3a_content_object where identifier like 'DEMO-D2-S_-001';
