-- Step 4b (D8): the content flags D8 names (D8 Execution Edition v2.1 Sections 3.2, 5.7, 5.7a and 5.10; tests D8-17, D8-27, D8-61, D8-64).
-- Hand written, like the D3 flags (20261221000000): the generator does not know which retired word is a performed act, a word of another dimension or a state.

-- 5.7: no D8 entry says the participant performed an act, at any Stage. The six verbs of Section 5.7 and test D8-61 (took, acted, sought, performed, applied, carried out),
-- and the four more that instruction 060 names (began, completed, assigned, escalated). The shared list still applies at Stage 1.
insert into public.t3a_stage_form_verb_dimension (dimension_id, verb, note) values
  ('D8', 'took', 'D8 Section 5.7 and test D8-61'), ('D8', 'acted', 'D8 Section 5.7 and test D8-61'), ('D8', 'sought', 'D8 Section 5.7 and test D8-61'),
  ('D8', 'performed', 'D8 Section 5.7 and test D8-61'), ('D8', 'applied', 'D8 Section 5.7 and test D8-61'), ('D8', 'carried out', 'D8 Section 5.7 and test D8-61'),
  ('D8', 'began', 'D8 instruction 060'), ('D8', 'completed', 'D8 instruction 060'), ('D8', 'assigned', 'D8 instruction 060'), ('D8', 'escalated', 'D8 instruction 060')
on conflict do nothing;

-- 5.7a: owned, caused, blamed, prioritized, verified, proposed, agreed, learned and realized belong to D2, D3, D5 and D9 (cross_dimension_assertion; set by the seeds migration too, repeated here so that this file stands alone).
update public.t3a_rce_prohibited_vocabulary set reason = 'cross_dimension_assertion'
 where dimension_id = 'D8' and version = 'PV-D8-1.0' and word in ('owned', 'caused', 'blamed', 'prioritized', 'verified', 'proposed', 'agreed', 'learned', 'realized');

-- 5.7a: every other listed word that is not a performed act, a modal or an absolute refuses as a claim about how the participant bore the setback: state_observation.
update public.t3a_rce_prohibited_vocabulary set reason = 'state_observation'
 where dimension_id = 'D8' and version = 'PV-D8-1.0'
   and word not in ('owned', 'caused', 'blamed', 'prioritized', 'verified', 'proposed', 'agreed', 'learned', 'realized',
                    'took', 'acted', 'sought', 'performed', 'applied', 'carried out',
                    'will', 'would', 'tends to', 'always', 'never', 'likely');

-- 5.10: No D8 entry carries recurrence_blocker. A record status entry carries no conduct toward recurrence; that is held by the rule record_status_never_recurs (machinery step), not by a flag on the entry.
do $c$ begin
  if exists (select 1 from public.t3a_d1_statement_library where dimension_id = 'D8' and recurrence_blocker) then raise exception 'D8 Section 5.10: no D8 entry carries recurrence_blocker'; end if;
end $c$;
