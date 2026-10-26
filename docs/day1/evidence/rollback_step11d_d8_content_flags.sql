-- Rollback of 20270215000000_d8_content_flags.sql. Removes the D8 all-stage verbs; the vocabulary reasons it set are on D8 rows, which the seeds and content rollbacks delete. Run first.
delete from public.t3a_stage_form_verb_dimension where dimension_id = 'D8';
update public.t3a_rce_prohibited_vocabulary set reason = null where dimension_id = 'D8' and version = 'PV-D8-1.0' and reason = 'state_observation';
update public.t3a_rce_prohibited_vocabulary set reason = null where dimension_id = 'D8' and version = 'PV-D8-1.0' and reason = 'cross_dimension_assertion';
