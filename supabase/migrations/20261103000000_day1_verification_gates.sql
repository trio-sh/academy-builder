-- Day 1 step 11.1.4, acceptance test DT-04: the unverified holding state.
--
-- T3A-DEV-DAY1-001 v1.3, DT-04: "Create participant, do not verify, call mentor request, release and Stage
-- entry endpoints. All refuse with a stated reason; observation cannot be recorded."
--
-- 20260919000000_t3a_enforce_email_verification.sql already gates mentor requests, connections, conversations,
-- messages, observation records and BER reports. This adds the same guards, with the same functions, to the
-- routes that migration did not reach: Stage entry, the path gateway, attempts, committed observations and
-- release. Triggers, not interface conditions, so they hold when a route is called directly.
--
-- The triggers are named t3a_0_... so they run before the routes' own checks (triggers fire in name order) and the
-- refusal reason is the verification reason, not a later field error.
-- Additive. No function is changed. Every account in production is already verified, so no one is affected today.

do $$
declare r record;
begin
  for r in
    select * from (values
      ('t3a_stage_entry_event',        'participant_id', 'subject'),
      ('t3a_observation_path_gateway', 'participant_id', 'subject'),
      ('t3a_attempt',                  'participant_id', 'subject'),
      ('t3a_observation',              'participant_id', 'subject'),
      ('t3a_disclosure',               'participant_id', 'subject'),
      ('t3a_disclosure',               null,             'actor')
    ) as v(tbl, col, kind)
  loop
    if to_regclass('public.' || r.tbl) is null then
      raise notice 'route % is absent; recorded, not assumed', r.tbl;
      continue;
    end if;
    if r.kind = 'subject' then
      execute format('drop trigger if exists t3a_0_verify_gate_subject_trg on public.%I', r.tbl);
      execute format('create trigger t3a_0_verify_gate_subject_trg before insert on public.%I for each row execute function public.t3a_require_subject_email_verified(%L)', r.tbl, r.col);
    else
      execute format('drop trigger if exists t3a_0_verify_gate_actor_trg on public.%I', r.tbl);
      execute format('create trigger t3a_0_verify_gate_actor_trg before insert on public.%I for each row execute function public.t3a_require_actor_email_verified()', r.tbl);
    end if;
  end loop;
end $$;
