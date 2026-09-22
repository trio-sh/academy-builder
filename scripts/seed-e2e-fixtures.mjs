#!/usr/bin/env node
/**
 * Test accounts and a Stage 2 fixture for the end-to-end suite.
 *
 * WHY THIS EXISTS. Eleven acceptance tests are about what a mentor sees
 * and does in the Stage 2 cockpit — layout, beat synchronisation, refresh
 * recovery, working without a second tab. None of them can be executed
 * from SQL, and all of them need a mentor signed in against a source that
 * is actually being served. This creates that.
 *
 * WHAT IT CREATES, and why each piece is needed:
 *
 *   e2e-mentor@t3a.test       a mentor WITHOUT oversight standing.
 *                             t3a_oversight_refuse_mutation refuses an
 *                             observation record from any account holding
 *                             administrative standing, so a test that
 *                             used the founder's account could never
 *                             commit.
 *   e2e-candidate@t3a.test    the observed participant.
 *   gateway + stage entry     an S2 entry against a REC-07-approved
 *                             source, so the cockpit has real content to
 *                             render rather than a placeholder.
 *   mentor assignment         the commit route refuses a mentor who is
 *                             not assigned to the participant.
 *   observe authority         and refuses one holding no current observe
 *                             authority for the dimension and Stage.
 *   OBSERVATION consent       t3a_d1_s2_live_view_permitted refuses a
 *                             live view without it.
 *
 * WHAT IT IS NOT. Not production data, and it says so in every row it can:
 * the accounts use a .test address that cannot receive mail, the
 * session_identity is 'e2e_fixture', and the environment this runs
 * against reports design_only. Run it against a production-active
 * environment and it refuses.
 *
 * IDEMPOTENT. Re-running reuses the accounts and the fixture rather than
 * stacking new ones, so the suite can be run repeatedly without the
 * database growing a fixture per run.
 *
 *   SBP=<token> PROJECT_REF=<ref> node scripts/seed-e2e-fixtures.mjs
 *
 * It prints the stage entry id the cockpit spec navigates to.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SBP = process.env.SBP;
const REF = process.env.PROJECT_REF;
if (!SBP || !REF) {
  console.error('need SBP and PROJECT_REF');
  process.exit(2);
}

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PASSWORD = process.env.E2E_PASSWORD || 'E2eFixture!2026';

const MENTOR = 'e2e-mentor@t3a.test';
const CANDIDATE = 'e2e-candidate@t3a.test';

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SBP}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
  const text = await res.text();
  if (!res.ok) throw new Error(`sql failed: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

async function serviceKey() {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${SBP}` } });
  const keys = await res.json();
  const k = keys.find((x) => x.type === 'secret') || keys.find((x) => x.name === 'service_role');
  if (!k) throw new Error('no service key');
  return k.api_key;
}

async function ensureAccount(key, email) {
  const base = `https://${REF}.supabase.co`;

  const found = await fetch(
    `${base}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const list = await found.json();
  const existing = (list.users || []).find((u) => u.email === email);
  if (existing) {
    // Reset the password so a re-run still knows how to sign in, even if
    // something changed it.
    await fetch(`${base}/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      headers: { apikey: key, Authorization: `Bearer ${key}`,
                 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
    });
    return existing.id;
  }

  const res = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`,
               'Content-Type': 'application/json' },
    body: JSON.stringify({
      email, password: PASSWORD, email_confirm: true,
      user_metadata: { first_name: 'E2E', last_name: email.startsWith('e2e-mentor') ? 'Mentor' : 'Candidate' },
    }),
  });
  const body = await res.json();
  if (!body.id) throw new Error(`create ${email}: ${JSON.stringify(body).slice(0, 300)}`);
  return body.id;
}

// ---------------------------------------------------------------------

const env = await sql(`select public.t3a_current_env_state()::text as env`);
if (env[0].env === 'production_active') {
  console.error('✗ refusing: this environment is production_active. '
    + 'Fixtures are not created against a production environment.');
  process.exit(1);
}
console.log(`environment: ${env[0].env}`);

const key = await serviceKey();
const mentorId = await ensureAccount(key, MENTOR);
const candidateId = await ensureAccount(key, CANDIDATE);
console.log(`mentor    ${MENTOR} ${mentorId}`);
console.log(`candidate ${CANDIDATE} ${candidateId}`);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const rows = await sql(`
do $seed$
declare
  v_mentor uuid := ${q(mentorId)}::uuid;
  v_part   uuid := ${q(candidateId)}::uuid;
  v_ver uuid; v_gw uuid; v_entry uuid; v_si uuid;
begin
  -- Profiles. Role is granted through the route so a basis is recorded.
  -- onboarding_completed matters: with it false the app diverts every
  -- route, including the cockpit, to a "finish setting up your account"
  -- step, and the suite would be testing the onboarding page.
  insert into public.profiles (id, email, first_name, last_name, role, is_active, onboarding_completed)
  values (v_mentor, ${q(MENTOR)}, 'E2E', 'Mentor', 'candidate', true, true)
  on conflict (id) do update set onboarding_completed = true;
  insert into public.profiles (id, email, first_name, last_name, role, is_active, onboarding_completed)
  values (v_part, ${q(CANDIDATE)}, 'E2E', 'Candidate', 'candidate', true, true)
  on conflict (id) do update set onboarding_completed = true;

  if (select role from public.profiles where id = v_mentor) <> 'mentor' then
    perform public.t3a_grant_role(v_mentor, 'mentor',
      'End-to-end test fixture. A mentor holding no oversight standing is '
      || 'required because t3a_oversight_refuse_mutation refuses an observation '
      || 'record from any account with administrative standing, so the eleven '
      || 'Stage 2 cockpit acceptance tests cannot run as the founder.');
  end if;

  -- A source that actually holds a REC-07 approval. Without one the
  -- cockpit has nothing it may serve, which is the whole point.
  select cv.content_version_id into v_ver
    from public.t3a_content_object co
    join public.t3a_d1_content_version cv on cv.content_object_id = co.content_object_id
    join public.t3a_d1_source_approval a on a.source_version_id = cv.content_version_id
   where co.identifier = 'SRC-D1-S2-001'
     and cv.superseded_by is null and a.status = 'approved';

  if v_ver is null then
    raise exception 'NO_APPROVED_SOURCE: SRC-D1-S2-001 holds no standing REC-07 approval, so there is nothing the cockpit may serve';
  end if;

  select e.stage_entry_event_id into v_entry
    from public.t3a_stage_entry_event e
   where e.session_identity = 'e2e_fixture' and e.stage_code = 'S2'
   order by e.created_at desc limit 1;

  if v_entry is null then
    insert into public.t3a_observation_path_gateway
      (participant_id, session_identity_method, observation_consent_version,
       assistance_rules_version, coaching_terminated_at)
    values (v_part, 'e2e_fixture', 'e2e', 'e2e', now())
    returning observation_path_gateway_id into v_gw;

    insert into public.t3a_stage_entry_event
      (observation_path_gateway_id, stage_instance_id, stage_code, dimensions_in_play,
       session_identity, assistance_rules_version, administration_conditions,
       source_version_id)
    values (v_gw, gen_random_uuid(), 'S2', ARRAY['D1']::public.t3a_dimension_code[],
            'e2e_fixture', 'e2e', '{}'::jsonb, v_ver)
    returning stage_entry_event_id into v_entry;
  end if;

  -- Assignment: the commit route refuses an unassigned mentor.
  select stage_instance_id into v_si from public.t3a_stage_instance
   where participant_id = v_part and stage_code = 'S2' limit 1;
  if v_si is null then
    insert into public.t3a_stage_instance (participant_id, stage_code, dimension_id, attempt_no)
    values (v_part, 'S2', 'D1', 1) returning stage_instance_id into v_si;
  end if;

  if not exists (select 1 from public.t3a_mentor_assignment
                  where mentor_id = v_mentor and participant_id = v_part) then
    insert into public.t3a_mentor_assignment
      (mentor_id, participant_id, stage_instance_id, assignment_method, prior_allocation_count)
    values (v_mentor, v_part, v_si, 'system_allocated', 0);
  end if;

  -- Observe authority: the commit route refuses a mentor without one.
  if not exists (select 1 from public.t3a_role_authorization
                  where actor_id = v_mentor and authority = 'observe'
                    and status = 'granted' and withdrawn_at is null) then
    insert into public.t3a_role_authorization
      (actor_id, authority, dimension_id, stage_codes, status, granted_at,
       effective_from, notes)
    values (v_mentor, 'observe'::public.t3a_authority, 'D1', ARRAY['S2'],
            'granted', now(), now(),
            'End-to-end test fixture account. Not a person.');
  end if;

  -- OBSERVATION consent: the live view refuses without it.
  if not exists (select 1 from public.t3a_d1_consent
                  where participant_id = v_part and consent_type = 'OBSERVATION'
                    and state = 'GRANTED' and superseded_by is null) then
    insert into public.t3a_d1_consent
      (participant_id, consent_type, notice_version_id, notice_version_hash,
       stage_class, stage_instance_id, state, granted_at)
    values (v_part, 'OBSERVATION', 'e2e-fixture', 'e2e-fixture', 'S2', v_entry,
            'GRANTED', now());
  end if;

  raise notice 'stage_entry_event_id=%', v_entry;
end
$seed$;

select e.stage_entry_event_id,
       e.source_version_id,
       cv.body ->> 'verbatim' as canonical_body
  from public.t3a_stage_entry_event e
  left join public.t3a_d1_content_version cv
    on cv.content_version_id = e.source_version_id
 where e.session_identity = 'e2e_fixture' and e.stage_code = 'S2'
 order by e.created_at desc limit 1;
`);

const entry = rows[rows.length - 1];
if (!entry?.stage_entry_event_id) throw new Error('no stage entry produced');

const fixture = {
  mentorEmail: MENTOR,
  candidateEmail: CANDIDATE,
  password: PASSWORD,
  mentorId,
  candidateId,
  stageEntryEventId: entry.stage_entry_event_id,
  sourceVersionId: entry.source_version_id,
  // AC-04 compares what Pane 1 renders against the approved text itself,
  // not against "the pane is non-empty". The register holds that text
  // under `verbatim`; there is no canonical_body on any loaded source.
  canonicalBody: entry.canonical_body,
};

writeFileSync(resolve(ROOT, 'e2e/.fixture.json'), JSON.stringify(fixture, null, 2));
console.log(`stage entry: ${fixture.stageEntryEventId}`);
console.log('wrote e2e/.fixture.json');
