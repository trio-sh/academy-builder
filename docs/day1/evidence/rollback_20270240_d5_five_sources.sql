-- Rollback of 20270240000000_d5_five_sources_reworded.sql (CR-310 to CR-315).
-- Removes exactly the rows that migration added for SRC-D5-S2-009, SRC-D5-S3-001, SRC-D5-S3-007, SRC-D5-S4-004 and SRC-D5-S4-010: their content versions, the load event of each version and the
-- counterpart fields that the counterpart load guard sequestered for each version. The five content objects stay, as they were after 20270202 (an object with no version: the state CR-232 describes).
-- It touches no other D5 row, no function, trigger or rule, and no D5 guard. Valid while none of the five has been used: it refuses (and changes nothing) if a drafting test, an authorship record,
-- an approval, an assignment or any other row refers to one of the five versions, because the foreign keys then stop the delete; remove those first, they are the founder's records, not this script's.
-- The refusal log rows written by the first load (CR-232) are not touched: they are the history.
begin;

do $chk$ declare n int; begin
  select count(*) into n from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id)
   where o.dimension_id = 'D5' and o.family = 'source' and o.identifier in ('SRC-D5-S2-009','SRC-D5-S3-001','SRC-D5-S3-007','SRC-D5-S4-004','SRC-D5-S4-010') and v.body ? 'rewording';
  if n not in (0, 5) then raise exception 'rollback 20270240: expected 5 reworded versions (or none), found %', n; end if;
  if exists (select 1 from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id)
              where o.identifier in ('SRC-D5-S2-009','SRC-D5-S3-001','SRC-D5-S3-007','SRC-D5-S4-004','SRC-D5-S4-010') and (not (v.body ? 'rewording') or v.approval_status::text <> 'drafting')) then
    raise exception 'rollback 20270240: one of the five has a version this migration did not write, or one that has left drafting; nothing is removed';
  end if;
end $chk$;

-- the sequestered counterpart fields (append only table: its guard is lifted for this delete and restored)
alter table public.t3a_source_sequestered_field disable trigger t3a_append_only;
delete from public.t3a_source_sequestered_field where content_version_id in (
  select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id)
   where o.dimension_id = 'D5' and o.identifier in ('SRC-D5-S2-009','SRC-D5-S3-001','SRC-D5-S3-007','SRC-D5-S4-004','SRC-D5-S4-010') and v.body ? 'rewording');
alter table public.t3a_source_sequestered_field enable trigger t3a_append_only;

delete from public.t3a_d1_content_load_event where content_version_id in (
  select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id)
   where o.dimension_id = 'D5' and o.identifier in ('SRC-D5-S2-009','SRC-D5-S3-001','SRC-D5-S3-007','SRC-D5-S4-004','SRC-D5-S4-010') and v.body ? 'rewording');

delete from public.t3a_d1_content_version where content_version_id in (
  select v.content_version_id from public.t3a_d1_content_version v join public.t3a_content_object o using (content_object_id)
   where o.dimension_id = 'D5' and o.identifier in ('SRC-D5-S2-009','SRC-D5-S3-001','SRC-D5-S3-007','SRC-D5-S4-004','SRC-D5-S4-010') and v.body ? 'rewording');

commit;
