-- CORR-007 Rev 1.6 rule CR-14: reuse of an administration form across dimensions.
-- A participant who met a form under another dimension is refused it unless an approved source design review lifts the exclusion for that form,
-- source version and participant, unexpired. Only a review whose status is approved, approved by a person other than its author, lifts it;
-- a draft, rejected, withdrawn or expired review lifts nothing. A review accepts procedural familiarity with a form only: it never lifts the
-- exclusion for a source the participant has already met or for a pattern family they have already met. A retake in the SAME dimension is not
-- a reuse of a form across dimensions (CR-17 serves retakes on the same Stage). Supersedes D2/D3/D4 instructions 023 and 028 and the same
-- dimension form exclusion they described.

create table if not exists public.t3a_source_design_review (
  review_seq bigint generated always as identity primary key,
  review_id uuid not null,
  status text not null check (status in ('draft', 'approved', 'rejected', 'withdrawn')),
  administration_form_id text not null,
  source_version_ids uuid[] not null,
  reviewed_statement text not null check (btrim(reviewed_statement) <> ''),
  participant_scope text not null default 'all',
  expires_on date,
  author_id uuid not null,
  approved_by uuid,
  recorded_at timestamptz not null default now(),
  check (status <> 'approved' or (approved_by is not null and approved_by <> author_id))
);
comment on table public.t3a_source_design_review is 'CR-14: each row is one state of a review; the latest row for a review_id governs. Approved needs an approver other than the author.';
create index if not exists t3a_source_design_review_id on public.t3a_source_design_review (review_id, review_seq desc);
drop trigger if exists t3a_append_only on public.t3a_source_design_review;
create trigger t3a_append_only before update or delete on public.t3a_source_design_review for each row execute function public.t3a_deny_mutation();
alter table public.t3a_source_design_review enable row level security;
revoke all on public.t3a_source_design_review from anon, authenticated;

create or replace function public.t3a_design_review_record(p_review uuid, p_status text, p_form text, p_versions uuid[], p_reviewed text, p_scope text, p_expires date, p_author uuid, p_approver uuid) returns jsonb
language plpgsql security definer set search_path = public as $fn$
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_DESIGN_REVIEW_SERVICE_ONLY: reviews are recorded by the service route only' using errcode = '42501'; end if;
  if p_status = 'approved' and (p_approver is null or p_approver = p_author) then
    return public.t3a_capture_refuse('design_review.record', 'REVIEW_APPROVER_MUST_DIFFER_FROM_AUTHOR', coalesce(p_review::text, ''), 'only a review approved by a person other than its author counts');
  end if;
  insert into public.t3a_source_design_review (review_id, status, administration_form_id, source_version_ids, reviewed_statement, participant_scope, expires_on, author_id, approved_by)
  values (p_review, p_status, p_form, p_versions, p_reviewed, coalesce(p_scope, 'all'), p_expires, p_author, p_approver);
  return jsonb_build_object('outcome', 'recorded', 'review_id', p_review, 'status', p_status);
end $fn$;
revoke all on function public.t3a_design_review_record(uuid, text, text, uuid[], text, text, date, uuid, uuid) from public, anon, authenticated;
grant execute on function public.t3a_design_review_record(uuid, text, text, uuid[], text, text, date, uuid, uuid) to service_role;

create or replace function public.t3a_design_review_lifts(p_participant uuid, p_source_version uuid, p_form text) returns boolean
language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from (select distinct on (review_id) * from public.t3a_source_design_review order by review_id, review_seq desc) r
     where r.status = 'approved' and r.approved_by is not null and r.approved_by <> r.author_id
       and r.administration_form_id = p_form and p_source_version = any (r.source_version_ids)
       and (r.participant_scope = 'all' or r.participant_scope = p_participant::text)
       and (r.expires_on is null or r.expires_on >= current_date))
$fn$;
revoke all on function public.t3a_design_review_lifts(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.t3a_design_review_lifts(uuid, uuid, text) to service_role, authenticated;

CREATE OR REPLACE FUNCTION public.t3a_prior_exposure(p_participant uuid, p_source_version uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.t3a_d1_content_version; o public.t3a_content_object; stage text; form text; sc text; ipf text; dim text; reasons text[] := '{}';
begin
  select * into v from public.t3a_d1_content_version where content_version_id = p_source_version;
  select * into o from public.t3a_content_object where content_object_id = v.content_object_id;
  dim := o.dimension_id::text; stage := v.body ->> 'stage_code'; form := public.t3a_administration_form_of(stage);
  sc := v.body -> 'source_sheet' ->> (lower(dim) || '_situation_class');
  select interaction_pattern_family_id into ipf from public.t3a_interaction_pattern_family where dimension_id = dim and situation_class = sc;
  if exists (select 1 from public.t3a_stage_entry_event s where s.participant_id = p_participant and s.source_version_id = p_source_version) then reasons := reasons || 'source_version_met'::text; end if;
  -- CR-14: the form exclusion is for a form met under ANOTHER dimension, and an approved, unexpired source design review can lift it (never the source or the pattern family)
  if exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id
              join public.t3a_content_object po2 on po2.content_object_id = pv.content_object_id
              where s.participant_id = p_participant and po2.dimension_id::text <> dim and public.t3a_administration_form_of(pv.body ->> 'stage_code') = form)
     and not public.t3a_design_review_lifts(p_participant, p_source_version, form) then reasons := reasons || 'administration_form_met'::text; end if;
  if ipf is not null and exists (select 1 from public.t3a_stage_entry_event s join public.t3a_d1_content_version pv on pv.content_version_id = s.source_version_id join public.t3a_content_object po on po.content_object_id = pv.content_object_id
              join public.t3a_interaction_pattern_family pf on pf.dimension_id = po.dimension_id::text and pf.situation_class = pv.body -> 'source_sheet' ->> (lower(po.dimension_id::text) || '_situation_class')
              where s.participant_id = p_participant and po.dimension_id::text = dim and pf.interaction_pattern_family_id = ipf) then reasons := reasons || 'pattern_family_met'::text; end if;
  return jsonb_build_object('excluded', cardinality(reasons) > 0, 'reasons', to_jsonb(reasons), 'administration_form_id', form, 'interaction_pattern_family_id', ipf);
end $function$;
