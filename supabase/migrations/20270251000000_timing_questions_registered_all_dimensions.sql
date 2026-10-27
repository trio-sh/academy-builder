-- CORR-007 rule CR-20 on every dimension, with each dimension's own authored question (CR-334, superseding the stand-in noted in CR-332).
-- Each dimension's C7 or C9 question that the source sheet makes applicable through a "test point" field is a timing dependent determination: it is read against the beat
-- the source states in that field (CS-I-32). Registered here, one row each, from the authored question and the authored source field; no question, source or capture line is changed.
-- Registered: Q-D2-09 (knowledge_test_point), Q-D3-09 (delivery_test_point), Q-D4-09 (statement_test_point), Q-D5-09 (exchange_test_point), Q-D8-09 and Q-D9-09 (account_test_point).
-- Checked against the loaded content before registering: every non blank value of those fields in the loaded D2, D3 (delivery), D4, D5, D8 and D9 sources states a beat (B or R number),
-- so no loaded source is made unservable by the registration.
-- Not registered: Q-D3-07 (handover_point). Half of the loaded D3 sources state the handover point in words with no beat, so registering it would refuse them; it stays a decision
-- for the evidence author (CR-334).
insert into public.t3a_timing_reference_field(question_code, dimension_id, source_sheet_field, note) values
  ('Q-D2-09', 'D2', 'knowledge_test_point', 'CS-I-32: the D2 test point question, read against the beat stated in knowledge_test_point'),
  ('Q-D3-09', 'D3', 'delivery_test_point',  'CS-I-32: the D3 delivery test point question, read against the beat stated in delivery_test_point'),
  ('Q-D4-09', 'D4', 'statement_test_point', 'CS-I-32: the D4 test point question, read against the beat stated in statement_test_point'),
  ('Q-D5-09', 'D5', 'exchange_test_point',  'CS-I-32: the D5 test point question, read against the beat stated in exchange_test_point'),
  ('Q-D8-09', 'D8', 'account_test_point',   'CS-I-32: the D8 test point question, read against the beat stated in account_test_point'),
  ('Q-D9-09', 'D9', 'account_test_point',   'CS-I-32: the D9 test point question, read against the beat stated in account_test_point')
on conflict (question_code) do nothing;
