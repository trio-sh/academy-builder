-- CR-23: a Stage 1 observation counts toward recurrence only where the approved cross context map row declares the act types compatible.
-- A statement of intention never supports a claim that an act was carried out, so a recurrence frame whose contexts include a Stage 1 source
-- is refused for that clause unless every pair involving that source has a map row with act_types_compatible. Nothing changes for contexts
-- that are not Stage 1. Existing rows are not compatible until someone declares them so.
alter table public.t3a_cross_context_relationship add column if not exists act_types_compatible boolean not null default false;
comment on column public.t3a_cross_context_relationship.act_types_compatible is 'CR-23: the approved row declares the act types of the two contexts compatible. Required for a Stage 1 context to count toward recurrence.';

create or replace function public.t3a_cr23_source_stage(p_source uuid) returns text
language sql stable security definer set search_path = public as $fn$
  select body ->> 'stage_code' from public.t3a_d1_content_version where content_version_id = p_source
$fn$;
create or replace function public.t3a_cr23_context_pair(p_dimension text, p_a uuid, p_b uuid) returns text
language sql stable security definer set search_path = public as $fn$
  select case
    when (public.t3a_cr23_source_stage(p_a) = 'S1' or public.t3a_cr23_source_stage(p_b) = 'S1')
         and not exists (select 1 from public.t3a_cross_context_relationship r where r.dimension_id = p_dimension and p_a is distinct from p_b
                           and r.source_version_a = least(p_a, p_b) and r.source_version_b = greatest(p_a, p_b) and r.act_types_compatible)
      then 'stage_1_act_types_not_declared_compatible'
    when not public.t3a_contexts_related(p_dimension, p_a, p_b) then 'contexts_not_approved_distinct'
    else 'ok' end
$fn$;
revoke all on function public.t3a_cr23_context_pair(text, uuid, uuid), public.t3a_cr23_source_stage(uuid) from public, anon;
grant execute on function public.t3a_cr23_context_pair(text, uuid, uuid), public.t3a_cr23_source_stage(uuid) to authenticated, service_role;

do $m$
declare v_def text; v_new text;
begin
  select pg_get_functiondef('public.t3a_evidence_state(uuid, text, boolean)'::regprocedure) into v_def;
  if position('t3a_cr23_context_pair' in v_def) = 0 then
    v_new := replace(v_def,
      E'          if x < y and not public.t3a_contexts_related(p_dimension, x, y) then pair_ok := false; end if;\n        end loop; end loop;\n        if not pair_ok then reasons := reasons || ''contexts_not_approved_distinct''::text; end if;',
      E'          if x < y and public.t3a_cr23_context_pair(p_dimension, x, y) = ''stage_1_act_types_not_declared_compatible'' then s1_refused := true; end if;\n          if x < y and public.t3a_cr23_context_pair(p_dimension, x, y) <> ''ok'' then pair_ok := false; end if;\n        end loop; end loop;\n        if s1_refused then reasons := reasons || ''stage_1_act_types_not_declared_compatible''::text;\n        elsif not pair_ok then reasons := reasons || ''contexts_not_approved_distinct''::text; end if;');
    if v_new = v_def then raise exception 'CR-23: the evidence state did not have the expected pair check'; end if;
    v_new := replace(v_new, E'reasons text[]; contexts uuid[]; x uuid; y uuid; pair_ok boolean;', E'reasons text[]; contexts uuid[]; x uuid; y uuid; pair_ok boolean; s1_refused boolean := false;');
    if position('s1_refused boolean' in v_new) = 0 then raise exception 'CR-23: the evidence state did not have the expected declarations'; end if;
    v_new := replace(v_new, E'        pair_ok := true;\n', E'        pair_ok := true; s1_refused := false;\n');
    execute v_new;
  end if;
end $m$;
