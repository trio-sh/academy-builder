-- D8-64 / CR-252: the D8 conditions template L-D8-COMP-001 read "The conditions of this observation were affected by a recorded technical event." and "affected" is on the
-- Section 5.7a list that the D8 prohibited output scan applies to every rendered sentence. The package's own checks do not scan templates, which is why this was not seen
-- in the package. The founder delegated the wording decision to the build session (CR-219): the one word is changed to "changed", which says the same of the conditions
-- of the observation and nothing of the participant. A template body is frozen after write, so this adds L-D8-COMP-002, moves the D8 "conditions_compromised"
-- precedence row to it and retires L-D8-COMP-001 (a retired template is never rendered). No scan was loosened and no word removed from the list.
insert into public.t3a_d1_language_template(language_template_id, dimension_id, template_body, bound_variables, eligible_states, precedence)
select 'L-D8-COMP-002', dimension_id, 'The conditions of this observation were changed by a recorded technical event.', bound_variables, eligible_states, precedence
  from public.t3a_d1_language_template where language_template_id = 'L-D8-COMP-001'
on conflict (language_template_id) do nothing;
update public.t3a_d1_condition_precedence set language_template_id = 'L-D8-COMP-002' where dimension_id = 'D8' and language_template_id = 'L-D8-COMP-001';
update public.t3a_d1_language_template set retired = true where language_template_id = 'L-D8-COMP-001';
