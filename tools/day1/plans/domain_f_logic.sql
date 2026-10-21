-- ---------------------------------------------------------------------------------------------
-- Domain F behaviour (hand written; columns above are generated)
-- ---------------------------------------------------------------------------------------------

drop trigger if exists t3a_set_once_trg on public.t3a_mentor_invitation;
create trigger t3a_set_once_trg before update on public.t3a_mentor_invitation for each row
  execute function public.t3a_set_once('invitation_redeemed_at', 'mentor_agreement_version', 'mentor_agreement_signed_at');
drop trigger if exists t3a_set_once_trg on public.t3a_mentor_appeal;
create trigger t3a_set_once_trg before update on public.t3a_mentor_appeal for each row execute function public.t3a_set_once('decided_at');

-- Authorization rules: a suspension has a start time and only a suspended authorization has one; a lapse after a suspension
-- may be extended only with an independent approver. (The package gives the field; the approver rule is the default in CR-050.)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 't3a_mentor_authorization_status_chk') then
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_status_chk check (
      authorization_status is null or authorization_status in ('authorized', 'supervised', 'suspended', 'lapsed', 'withdrawn')) not valid;
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_suspension_chk check (
      (suspension_started_at is null) or authorization_status in ('suspended', 'lapsed', 'withdrawn')) not valid;
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_extension_chk check (
      coalesce(suspension_extension_count, 0) = 0 or independent_approver_id is not null) not valid;
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_cycle_chk check (observer_specialty_domain_codes is null or cardinality(observer_specialty_domain_codes) <= 20) not valid;
    alter table public.t3a_d1_involvement add constraint t3a_d1_involvement_cycle_fn_chk check (cycle_function is null or cycle_function in ('guide', 'observer', 'evidence_reviewer')) not valid;
    alter table public.t3a_mentor_authorization add constraint t3a_mentor_authorization_channel_chk check (sourcing_channel is null or sourcing_channel in
      ('primary_contributor_network', 'professional_network', 'professional_association', 'retiring_employee_channel', 'other')) not valid;
  end if;
end $$;

-- Redeeming an invitation. Refusals are logged and returned (not raised) so the log is kept.
create or replace function public.t3a_redeem_invitation(p_invitation uuid, p_agreement_version text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v public.t3a_mentor_invitation;
begin
  select * into v from public.t3a_mentor_invitation where mentor_invitation_id = p_invitation;
  if not found then return public.t3a_capture_refuse('mentor.invitation.redeem', 'INVITATION_UNKNOWN', p_invitation::text, 'no such invitation'); end if;
  if v.invitation_redeemed_at is not null then return public.t3a_capture_refuse('mentor.invitation.redeem', 'INVITATION_ALREADY_REDEEMED', p_invitation::text, 'an invitation is redeemed once'); end if;
  if v.invitation_expires_at < now() then return public.t3a_capture_refuse('mentor.invitation.redeem', 'INVITATION_EXPIRED', p_invitation::text, 'the invitation has expired'); end if;
  if p_agreement_version is null or p_agreement_version !~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$' then
    return public.t3a_capture_refuse('mentor.invitation.redeem', 'AGREEMENT_VERSION_REQUIRED', p_invitation::text, 'the mentor agreement version is recorded at signing');
  end if;
  update public.t3a_mentor_invitation set invitation_redeemed_at = now(), mentor_agreement_version = p_agreement_version, mentor_agreement_signed_at = now()
   where mentor_invitation_id = p_invitation;
  return jsonb_build_object('outcome', 'redeemed', 'mentor_invitation_id', p_invitation);
end $$;
revoke all on function public.t3a_redeem_invitation(uuid, text) from public, anon;
grant execute on function public.t3a_redeem_invitation(uuid, text) to authenticated, service_role;

-- Is this mentor authorized for this dimension now, and without an open conflict with this participant?
create or replace function public.t3a_mentor_may_observe(p_mentor uuid, p_dimension text, p_participant uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'authorized', exists (select 1 from public.t3a_mentor_authorization a where a.mentor_id = p_mentor and a.dimension_id::text = p_dimension
                          and a.authorized_from <= now() and (a.authorized_until is null or a.authorized_until > now())
                          and coalesce(a.authorization_status, 'authorized') in ('authorized', 'supervised')),
    'conflict_open', exists (select 1 from public.t3a_conflict_declaration c where c.mentor_id = p_mentor and c.participant_id = p_participant and c.cleared_at is null))
$$;
