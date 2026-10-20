-- Step 4b: the recurrence blockers D3 names (D3 Section 5.9, test D3-17): ST-D3-043 records that no handover occurred and ST-D3-051 is neither pole of CE-D3-09. Neither ever counts toward the recurring state.
update public.t3a_d1_statement_library set recurrence_blocker = true where dimension_id = 'D3' and statement_key in ('ST-D3-043', 'ST-D3-051');

-- D3 5.7a: told, informed, disclosed, notified, admitted, acknowledged, blamed and attributed belong to D2 and D4; a rendered D3 sentence containing one refuses and logs cross_dimension_assertion.
update public.t3a_rce_prohibited_vocabulary set reason = 'cross_dimension_assertion' where dimension_id = 'D3' and version = 'PV-D3-1.0' and word in ('told', 'informed', 'disclosed', 'notified', 'admitted', 'acknowledged', 'blamed', 'attributed');

-- The question definition register (D3 D-05), structural rows only: one per question and answer pair. The five semantic fields stay empty; this build never writes them.
insert into public.t3a_question_definition(dimension_id, question_id, answer_id, exact_stem, stage_applicability, required_or_conditional, missing_state_route, child_branch_rule, statement_mapping)
select m.dimension_id, m.question_code, 'A' || l.line_order, cs.title,
       (select string_agg(distinct unnest_s, ',' order by unnest_s) from (select unnest(coalesce(s.applicable_stages, array[s.stage_code::text])) unnest_s from public.t3a_d1_statement_library s where s.dimension_id = m.dimension_id and s.question_code = m.question_code and s.answer_code = 'A' || l.line_order) z),
       case when exists (select 1 from public.t3a_d1_branch_rule b where b.dimension_id = m.dimension_id and b.child_question = m.question_code) then 'conditional' else 'required' end,
       'platform missing state codes',
       (select b.parent_question || ' ' || array_to_string(b.serving_answers, ',') from public.t3a_d1_branch_rule b where b.dimension_id = m.dimension_id and b.child_question = m.question_code),
       (select string_agg(s.statement_key, ',' order by s.statement_key) from public.t3a_d1_statement_library s where s.dimension_id = m.dimension_id and s.question_code = m.question_code and s.answer_code = 'A' || l.line_order)
  from public.t3a_d1_question_capture_map m
  join public.t3a_d1_capture_set cs on cs.dimension_id = m.dimension_id and cs.capture_set_code = m.capture_set_code
  join public.t3a_d1_capture_line l on l.dimension_id = m.dimension_id and l.capture_set_code = m.capture_set_code
 where m.dimension_id = 'D3'
on conflict do nothing;

