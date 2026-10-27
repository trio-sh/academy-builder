-- Rollback of migration 20270251: removes the six rows it registered; the three D1 rows (20270250) stay.
delete from public.t3a_timing_reference_field where question_code in ('Q-D2-09','Q-D3-09','Q-D4-09','Q-D5-09','Q-D8-09','Q-D9-09');
