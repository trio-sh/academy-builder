-- Rollback of 20261217000000_step3_issuance_floor.sql (restores the gate and backstop as the consent step left them)
CREATE OR REPLACE FUNCTION public.t3a_report_issuance_gate(p_ber_report_id uuid, p_reviewer uuid DEFAULT NULL::uuid, p_issuer uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.t3a_d1_ber_report; dims text[]; d text; items int[]; blockers jsonb := '[]'::jsonb; passed int; latest_hash text; cs jsonb; act jsonb; rv uuid;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = p_ber_report_id;
  if b.ber_report_id is null then return jsonb_build_object('permitted', false, 'blockers', jsonb_build_array(jsonb_build_object('code', 'BER_REPORT_NOT_FOUND'))); end if;
  dims := coalesce(b.represented_dimension_ids, array[b.dimension_id::text]);

  -- 083: pre-issue participant review is a precondition; non-response is not completion; no timeout, no deemed acceptance
  if not exists (select 1 from public.t3a_d1_participant_review_action a where a.ber_report_id = p_ber_report_id and a.action in ('reviewed_no_correction', 'correction_raised')) then
    blockers := blockers || jsonb_build_object('code', 'participant_review_incomplete', 'detail', 'no explicit recorded outcome; silence is never consent and no timeout applies');
  end if;
  -- 082: a correction open against any record in the report blocks the whole report
  cs := public.t3a_report_correction_state(p_ber_report_id);
  if (cs ->> 'open')::boolean then blockers := blockers || jsonb_build_object('code', 'correction_open', 'detail', cs); end if;
  -- 090: the checklist runs once per dimension present; a pass on one dimension never carries another
  foreach d in array dims loop
    items := public.t3a_review_items_for(d);
    select count(distinct r.item_no) into passed from public.t3a_dimension_review_result r
      where r.ber_report_id = p_ber_report_id and r.dimension_id = d and r.item_no = any (items)
        and r.outcome = 'pass' and r.recorded_at = (select max(x.recorded_at) from public.t3a_dimension_review_result x where x.ber_report_id = r.ber_report_id and x.dimension_id = r.dimension_id and x.item_no = r.item_no);
    if passed < cardinality(items) then
      blockers := blockers || jsonb_build_object('code', 'checklist_incomplete_or_failed', 'dimension_id', d, 'items_required', cardinality(items), 'items_passed', passed);
    end if;
    -- 091: the review is for the exact version set
    select r.version_set_hash into latest_hash from public.t3a_dimension_review_result r where r.ber_report_id = p_ber_report_id and r.dimension_id = d order by r.recorded_at desc limit 1;
    if latest_hash is not null and b.version_set is not null and b.version_set <> '{}'::jsonb
       and latest_hash <> encode(extensions.digest(b.version_set::text, 'sha256'), 'hex') then
      blockers := blockers || jsonb_build_object('code', 'review_not_for_this_version_set', 'dimension_id', d);
    end if;
  end loop;
  -- 019 / 011: two distinct actors, neither involved in any record in the report
  if p_reviewer is not null then act := public.t3a_report_actor_gate(p_reviewer, p_ber_report_id, 'evidence_review'); if act ->> 'outcome' <> 'eligible' then blockers := blockers || jsonb_build_object('code', 'reviewer_not_eligible', 'detail', act ->> 'reason'); end if; end if;
  if p_issuer is not null then
    act := public.t3a_report_actor_gate(p_issuer, p_ber_report_id, 'issue');
    if act ->> 'outcome' <> 'eligible' then blockers := blockers || jsonb_build_object('code', 'issuer_not_eligible', 'detail', act ->> 'reason');
    elsif exists (select 1 from public.t3a_dimension_review_result r where r.ber_report_id = p_ber_report_id and r.reviewer_id = p_issuer) then
      blockers := blockers || jsonb_build_object('code', 'issuer_not_eligible', 'detail', 'reviewer_cannot_issue');
    end if;
  end if;
  -- 013 / item 13: the evidence currency value must be loaded
  if coalesce((select btrim(configuration_value) from public.t3a_configuration_value where configuration_key = 'evidence_currency' order by configuration_seq desc limit 1), '') = '' then blockers := blockers || jsonb_build_object('code', 'evidence_currency_unloaded'); end if;
  -- 032: consent is never inherited; every non D1 dimension in the report needs its own grants
  foreach d in array dims loop
    if d <> 'D1' and public.t3a_dimension_consent_state(b.participant_id, d) <> 'granted' then
      blockers := blockers || jsonb_build_object('code', public.t3a_dimension_consent_state(b.participant_id, d), 'dimension_id', d);
    end if;
  end loop;
  return jsonb_build_object('permitted', jsonb_array_length(blockers) = 0, 'blockers', blockers, 'override_available', false);
end $function$
;
CREATE OR REPLACE FUNCTION public.t3a_issuance_gate_backstop()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.t3a_d1_ber_report; g jsonb; x jsonb;
begin
  select * into b from public.t3a_d1_ber_report where ber_report_id = new.ber_report_id;
  if b.ber_report_id is not null and exists (select 1 from unnest(coalesce(b.represented_dimension_ids, array[b.dimension_id::text])) y where y <> 'D1') then
    g := public.t3a_report_issuance_gate(new.ber_report_id, null, new.issued_by);
    if not (g ->> 'permitted')::boolean then
      for x in select * from jsonb_array_elements(g -> 'blockers') loop
        perform public.t3a_capture_refuse('report.issue', x ->> 'code', new.ber_report_id::text, coalesce(x ->> 'detail', x ->> 'dimension_id', 'issuance gate blocker'));
      end loop;
      return null;
    end if;
  end if;
  return new;
end $function$
;
