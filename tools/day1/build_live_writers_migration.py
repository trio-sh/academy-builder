#!/usr/bin/env python3
"""Build supabase/migrations/20261127000000_day1_live_writers_canonical.sql from the live function definitions (CR-068, CR-069).

Each of the seven remaining live writers keeps its existing event insert and gains a canonical branch behind one switch,
t3a_event_config.canonical_writers (off by default). With the switch off nothing a caller sees changes. With it on, the function
captures what the canonical payload needs and emits through t3a_emit_event. t3a_activate_canonical_writers() flips the switch and
sets ingest_mode strict in one step, and only when t3a_canonical_readiness() lists no blocker.

  python3 tools/day1/build_live_writers_migration.py <dir with the seven function definitions>
The definitions are read from production with pg_get_functiondef (see docs/day1/evidence/live-writers-functions-before-prod-2.sql)."""
import re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(sys.argv[1])
OUT = ROOT / "supabase/migrations/20261127000000_day1_live_writers_canonical.sql"

def load(name): return (SRC / f"{name}.sql").read_text()

def wrap(fn, canonical, decls=""):
    """Replace the function's single 'INSERT INTO t3a_event_log (...);' with IF canonical THEN <canonical> ELSE <original> END IF."""
    m = re.search(r"  INSERT INTO t3a_event_log \(.*?\n  \);\n", fn, re.S)
    assert m, "no event insert"
    original = m.group(0).rstrip("\n").replace("\n", "\n  ")
    new = f"  IF public.t3a_canonical_writers_on() THEN\n{canonical}  ELSE\n  {original.strip()}\n  END IF;\n"
    fn = fn[:m.start()] + new + fn[m.end():]
    if decls:
        i = fn.index("BEGIN")
        fn = fn[:i] + decls + fn[i:]
    return fn

_ev = (ROOT / "supabase/migrations/20261102000000_day1_event_registry.sql").read_text()
_m = re.search(r"create or replace function public\.t3a_check_event_payload\(.*?\nend \$\$;\n", _ev, re.S)
assert _m, "payload checker not found"
CHECKER = ("-- The payload checker allowed no time after the event. An expiry or an end is a future moment by nature (stage_entry_hold_expires_at, "
           "consent_expires_at, cooldown_ends_at), so keys ending _expires_at or _ends_at are exempt (CR-069).\n" + _m.group(0) + "\n")

HELPERS = """-- Day 1 live writers, the remaining seven (CR-069). Behind a switch that is off: nothing a caller sees changes until it is activated.

insert into public.t3a_event_config (key, value) values ('canonical_writers', 'off') on conflict (key) do nothing;

create or replace function public.t3a_canonical_writers_on() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'on' from public.t3a_event_config where key = 'canonical_writers'), false)
$$;

-- A required setting is read from the configuration values, then from the deployment configuration. If it is unset the route refuses and
-- does not default (DT-39).
create or replace function public.t3a_required_setting(p_key text) returns text language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  select configuration_value into v from public.t3a_configuration_value where configuration_key = p_key order by configuration_seq desc limit 1;
  if v is null then select (to_jsonb(c) ->> p_key) into v from public.t3a_deployment_config c where singleton; end if;
  if v is null then
    raise exception 'CONFIGURATION_UNSET: % is not set; this route refuses and does not default', p_key using errcode = '55000';
  end if;
  return v;
end $$;
revoke all on function public.t3a_required_setting(text) from public, anon;

-- What stands between the live writers and the canonical path.
create or replace function public.t3a_canonical_readiness() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare k text; missing text[] := '{}'; v text;
begin
  foreach k in array array['attempt_rules_version', 'stage_entry_hold_ttl', 'response_time_committed_version'] loop
    begin v := public.t3a_required_setting(k); exception when others then missing := missing || k; end;
  end loop;
  return jsonb_build_object('canonical_writers', (select value from public.t3a_event_config where key = 'canonical_writers'),
    'ingest_mode', (select value from public.t3a_event_config where key = 'ingest_mode'), 'missing_settings', to_jsonb(missing), 'ready', cardinality(missing) = 0);
end $$;
revoke all on function public.t3a_canonical_readiness() from public, anon;
grant execute on function public.t3a_canonical_readiness() to authenticated, service_role;

create or replace function public.t3a_activate_canonical_writers() returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb := public.t3a_canonical_readiness();
begin
  if not public.t3a_is_service_context() then raise exception 'T3A_ACTIVATION_SERVICE_ONLY' using errcode = '42501'; end if;
  if not (r->>'ready')::boolean then return jsonb_build_object('outcome', 'refused', 'reason', 'SETTINGS_MISSING', 'readiness', r); end if;
  update public.t3a_event_config set value = 'on', updated_at = now() where key = 'canonical_writers';
  update public.t3a_event_config set value = 'strict', updated_at = now() where key = 'ingest_mode';
  return jsonb_build_object('outcome', 'activated', 'readiness', public.t3a_canonical_readiness());
end $$;
revoke all on function public.t3a_activate_canonical_writers() from public, anon, authenticated;
grant execute on function public.t3a_activate_canonical_writers() to service_role;

-- The snapshot hash of an observation is taken when the row is written: sha256 over the row as stored, without the hash itself.
create or replace function public.t3a_observation_snapshot_hash() returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.record_snapshot_hash is null then
    new.record_snapshot_hash := encode(digest(convert_to(((to_jsonb(new)) - 'record_snapshot_hash')::text, 'UTF8'), 'sha256'), 'hex');
  end if;
  return new;
end $$;
drop trigger if exists t3a_8_observation_snapshot_hash_trg on public.t3a_observation;
create trigger t3a_8_observation_snapshot_hash_trg before insert on public.t3a_observation for each row execute function public.t3a_observation_snapshot_hash();

"""

# ---- stage entry
fn = load("t3a_create_stage_entry_event")
fn = wrap(fn, """    v_att_rules := public.t3a_required_setting('attempt_rules_version');
    v_hold := public.t3a_required_setting('stage_entry_hold_ttl')::int;
    SELECT attempt_no INTO v_attempt FROM t3a_stage_instance WHERE stage_instance_id = p_stage_instance_id;
    SELECT session_identity_method INTO v_sim FROM t3a_observation_path_gateway WHERE observation_path_gateway_id = v_gateway;
    v_mode := CASE v_stage::text WHEN 'S1' THEN 's1_deterministic_engine' WHEN 'S2' THEN 's2_live_video'
                                 WHEN 'S3' THEN 's3_asynchronous_submission' ELSE 's4_live_group' END;
    v_session := gen_random_uuid();
    v_authority := CASE WHEN v_stage::text <> 'S1' AND auth.uid() IS NOT NULL AND t3a_is_mentor() THEN auth.uid() END;
    UPDATE t3a_stage_entry_event
       SET session_id = v_session, observation_mode = v_mode, entry_authority_actor_id = v_authority,
           stage_entry_hold_expires_at = now() + make_interval(secs => v_hold)
     WHERE stage_entry_event_id = v_id;
    PERFORM public.t3a_emit_event(
      'observation.stage_entered', 'SYSTEM_SERVICE', 'stage_entry', 'system_service', 'observation', v_id,
      jsonb_build_object(
        'stage_entry_event_id', v_id, 'stage_instance_id', p_stage_instance_id, 'stage_code', v_stage,
        'session_id', v_session, 'session_identity_method', v_sim, 'assistance_rules_version', p_assistance_rules_version,
        'observation_mode', v_mode, 'attempt_no', v_attempt, 'attempt_rules_version', v_att_rules,
        'observation_notification_timestamp', to_jsonb(now()), 'stage_entry_hold_expires_at', to_jsonb(now() + make_interval(secs => v_hold)))
      || CASE WHEN v_authority IS NOT NULL THEN jsonb_build_object('entry_authority_actor_id', v_authority) ELSE '{}'::jsonb END,
      'stage_entered:' || v_id::text, NULL, v_participant);
""", "  v_att_rules text;\n  v_hold int;\n  v_attempt int;\n  v_sim text;\n  v_mode text;\n  v_session uuid;\n  v_authority uuid;\n")
stage = fn

# ---- commit observation (adds p_served_instance_id)
fn = load("t3a_commit_observation")
fn = fn.replace("p_late_entry_delay_seconds integer DEFAULT NULL::integer)", "p_late_entry_delay_seconds integer DEFAULT NULL::integer, p_served_instance_id uuid DEFAULT NULL::uuid)", 1)
fn = fn.replace("  INSERT INTO t3a_observation (", """  IF public.t3a_canonical_writers_on() THEN
    -- DT-17: both hashes, from the stored source version and the rendered instance that was served.
    v_served := coalesce(p_served_instance_id, (
      SELECT si.served_instance_id FROM t3a_served_instance si
        JOIN t3a_stage_entry_event e ON e.stage_entry_event_id = si.stage_entry_event_id
       WHERE e.stage_instance_id = p_stage_instance_id ORDER BY si.served_at DESC LIMIT 1));
    SELECT source_version_hash INTO v_src_hash FROM t3a_source_version WHERE source_version_id = p_source_version_id;
    SELECT r.rendered_instance_hash INTO v_ren_hash FROM t3a_served_instance s
      JOIN t3a_rendered_instance r ON r.rendered_instance_id = s.rendered_instance_id WHERE s.served_instance_id = v_served;
    IF v_served IS NULL OR v_src_hash IS NULL OR v_ren_hash IS NULL THEN
      PERFORM t3a_raise('DT-17 DUAL_HASH_MISSING',
        'an observation needs a served instance whose source version and rendered instance both carry a hash');
    END IF;
  END IF;

  INSERT INTO t3a_observation (""", 1)
fn = fn.replace("contemporaneity, late_entry_delay_seconds\n  ) VALUES (", "contemporaneity, late_entry_delay_seconds, served_instance_id\n  ) VALUES (", 1)
fn = fn.replace("p_contemporaneity, p_late_entry_delay_seconds\n  ) RETURNING", "p_contemporaneity, p_late_entry_delay_seconds, v_served\n  ) RETURNING", 1)
fn = wrap(fn, """    SELECT record_snapshot_hash, created_at INTO v_snap, v_committed FROM t3a_observation WHERE observation_id = v_id;
    PERFORM public.t3a_emit_event(
      'observation.committed', 'MENTOR', v_actor::text, 'mentor', 'observation', v_id,
      jsonb_build_object(
        'observation_id', v_id, 'dimension_id', p_dimension_id, 'stage_code', p_stage_code, 'stage_instance_id', p_stage_instance_id,
        'served_instance_id', v_served, 'source_version_id', p_source_version_id, 'source_version_hash', v_src_hash,
        'rendered_instance_hash', v_ren_hash, 'record_snapshot_hash', v_snap, 'attempt_no', p_attempt_no, 'committed_at', to_jsonb(v_committed)),
      'observation_committed:' || v_id::text, NULL, p_participant_id);
""", "  v_served uuid;\n  v_src_hash text;\n  v_ren_hash text;\n  v_snap text;\n  v_committed timestamptz;\n")
commit = fn

# ---- confirm S1
fn = load("t3a_confirm_s1_observation")
fn = wrap(fn, """    PERFORM public.t3a_emit_event(
      'observation.s1_confirmed', 'MENTOR', v_actor::text, 'mentor', 'observation', p_observation_id,
      jsonb_build_object(
        's1_human_confirmation_actor_id', v_actor, 's1_human_confirmation_at', to_jsonb(now()), 'confirmation_role', p_confirmation_role,
        'authorization_snapshot_ref', (v_snapshot ->> 'mentor_authorization_id')::uuid, 's1_exposure_flag', true),
      's1_confirmed:' || v_judgment_id::text, NULL, NULL);
""")
s1 = fn

# ---- challenge
fn = load("t3a_open_challenge")
fn = wrap(fn, """    v_rt := public.t3a_required_setting('response_time_committed_version');
    UPDATE t3a_challenge_case
       SET opened_by = v_participant, challenge_target_ref = p_ber_report_id, issuance_hold = true, response_time_committed_version = v_rt
     WHERE challenge_case_id = v_id;
    PERFORM public.t3a_emit_event(
      'challenge.opened', 'PARTICIPANT', v_participant::text, 'participant', 'challenge', v_id,
      jsonb_build_object(
        'challenge_case_id', v_id, 'opened_by', v_participant, 'opened_at', to_jsonb(now()), 'challenge_target_ref', p_ber_report_id,
        'challenge_ground', p_challenge_ground, 'response_time_committed_version', v_rt, 'issuance_hold', true),
      'challenge_opened:' || v_id::text, NULL, v_participant);
""", "  v_rt text;\n")
challenge = fn

# ---- disclosure create
fn = load("t3a_create_disclosure")
fn = wrap(fn, """    PERFORM public.t3a_emit_event(
      'release.recipient_created', 'PARTICIPANT', v_participant::text, 'participant', 'release', v_id,
      jsonb_build_object(
        'recipient_release_id', v_id,
        'recipient_address_hash', encode(digest(lower(btrim(p_recipient_email)), 'sha256'), 'hex'),
        'token_state', 'active'),
      'disclosure_created:' || v_id::text, NULL, v_participant);
""")
disc = fn

# ---- disclosure revoke
fn = load("t3a_revoke_disclosure")
fn = wrap(fn, """    PERFORM public.t3a_emit_event(
      'release.changed', 'PARTICIPANT', v_participant::text, 'participant', 'release', p_disclosure_id,
      jsonb_build_object('release_mode', 'named_pilot_recipient', 'employer_visibility_state', 'not_available', 'availability_changed_at', to_jsonb(now())),
      'disclosure_revoked:' || p_disclosure_id::text, NULL, v_participant);
""")
revoke = fn

# ---- ratify
fn = load("t3a_ratify_question_set")
fn = wrap(fn, """    v_hash := encode(digest(
      coalesce((SELECT string_agg(question_id::text || ':' || question_body, '|' ORDER BY order_index, question_id) FROM t3a_determination_question
                 WHERE dimension_id = p_dimension_id AND question_set_version = p_approved_version), '') || '#' ||
      coalesce((SELECT string_agg(statement_id::text, '|' ORDER BY statement_id) FROM t3a_statement_library
                 WHERE dimension_id = p_dimension_id AND question_set_version = p_approved_version), ''), 'sha256'), 'hex');
    v_approval := gen_random_uuid();
    PERFORM public.t3a_emit_event(
      'registry.version_approved', 'ADMINISTRATOR', p_approver::text, 'administrator', 'registry_asset', v_approval,
      jsonb_build_object('approval_record_id', v_approval, 'approved_at', to_jsonb(now()), 'source_effective_from', to_jsonb(now()), 'version_hash', v_hash),
      'version_approved:' || v_approval::text, NULL, p_approver);
""", "  v_hash text;\n  v_approval uuid;\n")
ratify = fn

parts = [CHECKER, HELPERS,
         "-- observation commit gains an optional served instance; drop the old signature first so a call cannot be ambiguous\nDROP FUNCTION IF EXISTS public.t3a_commit_observation(uuid,uuid,uuid,t3a_dimension_code,t3a_stage_code,integer,jsonb,jsonb,t3a_evidence_class,jsonb,jsonb,t3a_accommodation_class,text,integer,text,t3a_contemporaneity,integer);\n"]
for f in (stage, commit, s1, challenge, disc, revoke, ratify):
    parts.append(f.rstrip() + ";\n")
OUT.write_text("\n".join(parts), encoding="utf-8")
print("wrote", OUT.relative_to(ROOT), OUT.stat().st_size)
