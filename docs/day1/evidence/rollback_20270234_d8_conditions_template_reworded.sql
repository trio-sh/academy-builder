-- Rollback of 20270234000000_d8_conditions_template_reworded.sql: the D8 conditions row points at L-D8-COMP-001 again and it is live again; the new template is removed.
begin;
update public.t3a_d1_condition_precedence set language_template_id = 'L-D8-COMP-001' where dimension_id = 'D8' and language_template_id = 'L-D8-COMP-002';
update public.t3a_d1_language_template set retired = false where language_template_id = 'L-D8-COMP-001';
delete from public.t3a_d1_language_template where language_template_id = 'L-D8-COMP-002';
commit;
