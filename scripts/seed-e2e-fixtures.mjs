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

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const key = await serviceKey();
const mentorId = await ensureAccount(key, MENTOR);
const candidateId = await ensureAccount(key, CANDIDATE);
console.log(`mentor    ${MENTOR} ${mentorId}`);
console.log(`candidate ${CANDIDATE} ${candidateId}`);

// -------------------------------------------------------------------
// The five role accounts the rest of the browser suite signs in as.
//
// They did not exist, and the reason was not what it looked like.
// e2e/auth.setup.ts hardcodes the Supabase project bloujipdkyjsgzwxnoej,
// which is gone — the app runs on tnjyywtulpdyackmwnca — and it also wrote
// its session under the localStorage key "the3rdacademy-auth" while the
// client uses supabase-js's default. Two independent reasons nothing it
// wrote could ever have been read, which cockpit.setup.ts had already
// diagnosed in its own docstring.
//
// The visible effect was five failing setup projects and ONE HUNDRED AND
// EIGHTY-SEVEN tests reported as "did not run" — a number easy to read
// past, and repeatedly misattributed to the outstanding email-confirmation
// work. Creating the accounts here and signing in through the real form
// is what makes those suites able to run at all.
const ROLE_ACCOUNTS = [
  { role: 'candidate',    email: 'testcandidate@t3a.test',  first: 'Test', last: 'Candidate' },
  { role: 'mentor',       email: 'testmentor@t3a.test',     first: 'Test', last: 'Mentor' },
  { role: 'employer',     email: 'testemployer@t3a.test',   first: 'Test', last: 'Employer' },
  { role: 'school_admin', email: 'testschool@t3a.test',     first: 'Test', last: 'School' },
  { role: 'admin',        email: 'testadmin@t3a.test',      first: 'Test', last: 'Admin' },
];

const roleIds = {};
for (const a of ROLE_ACCOUNTS) {
  roleIds[a.role] = await ensureAccount(key, a.email);
}

// Profiles, with onboarding_completed true: without it every route
// diverts to "finish setting up your account" and the suites would be
// testing the onboarding page.
//
// The role is set directly here rather than through t3a_grant_role. That
// route records a basis and is the right path for a real grant; these are
// fixture accounts on a non-production environment, and the seed already
// refuses to run at all when the environment is production_active.
await sql(`
do $roles$
begin
${ROLE_ACCOUNTS.map((a) => `
  insert into public.profiles (id, email, first_name, last_name, role, is_active, onboarding_completed)
  values (${q(roleIds[a.role])}::uuid, ${q(a.email)}, ${q(a.first)}, ${q(a.last)}, '${a.role}'::public.user_role, true, true)
  on conflict (id) do update set role = '${a.role}'::public.user_role,
                                 is_active = true,
                                 onboarding_completed = true;`).join('\n')}
end
$roles$;`);

for (const a of ROLE_ACCOUNTS) {
  console.log(`${a.role.padEnd(13)} ${a.email} ${roleIds[a.role]}`);
}

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
  -- Standing approval, not merely the existence of an approved row.
  -- CS-I-45 voids a carry-forward by recording a WITHDRAWAL, and a
  -- withdrawal cannot delete the approval it withdraws — so three sources
  -- currently hold an 'approved' row and are not servable.
  select cv.content_version_id into v_ver
    from public.t3a_content_object co
    join public.t3a_d1_content_version cv on cv.content_object_id = co.content_object_id
   where co.identifier = 'SRC-D1-S2-001'
     and cv.superseded_by is null
     and public.t3a_d1_source_version_approved(cv.content_version_id);

  if v_ver is null then
    raise exception 'NO_APPROVED_SOURCE: SRC-D1-S2-001 holds no standing REC-07 approval, so there is nothing the cockpit may serve';
  end if;

  -- Reuse an entry only where it pins the version that is live NOW. A
  -- Stage entry pins the version it served and must keep doing so, so a
  -- corrected source does not rewrite an existing entry — it needs a new
  -- one. Reusing an entry that pins a superseded version would have the
  -- suite testing the sheet the correction replaced, and every assertion
  -- would still pass while proving nothing about the fix.
  select e.stage_entry_event_id into v_entry
    from public.t3a_stage_entry_event e
   where e.session_identity = 'e2e_fixture' and e.stage_code = 'S2'
     and e.source_version_id = v_ver
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

  -- =================================================================
  -- E8 — the Stage 1 DEMONSTRATION pathway, so D1 can run end to end.
  --
  -- Stage 1 is AI-administered and its four provenance references were
  -- never issued, so no run could exist and the confirmation workbench
  -- could never open. Production provenance is not invented; the
  -- demonstration objects loaded by 20261061000000 are cited instead, and
  -- t3a_d1_ai_run_synthetic_bar refuses them outside design_only.
  --
  -- The SOURCE is the real approved Stage 1 source. Only the machine
  -- provenance is a stand-in.
  -- =================================================================
  declare
    v_prov jsonb := public.t3a_d1_demonstration_provenance();
    v_s1ver uuid;
    v_s1si uuid;
    v_s1entry uuid;
    v_run uuid;
  begin
    select cv.content_version_id into v_s1ver
      from public.t3a_content_object co
      join public.t3a_d1_content_version cv
        on cv.content_object_id = co.content_object_id and cv.superseded_by is null
     where co.identifier = 'SRC-D1-S1-001';

    -- v_gw is only assigned when a NEW S2 entry is created; where the S2
    -- entry was reused it is null, so the gateway is read back rather than
    -- assumed. A silent null here inserted a row with no gateway and the
    -- NOT NULL constraint caught it.
    if v_gw is null then
      select e.observation_path_gateway_id into v_gw
        from public.t3a_stage_entry_event e
       where e.stage_entry_event_id = v_entry;
    end if;

    if v_prov is null or v_s1ver is null or v_gw is null then
      raise notice 'S1 demonstration skipped: provenance, source or gateway missing';
    else
      select e.stage_entry_event_id, e.stage_instance_id into v_s1entry, v_s1si
        from public.t3a_stage_entry_event e
       where e.session_identity = 'e2e_fixture_s1' and e.stage_code = 'S1'
         and e.source_version_id = v_s1ver
       order by e.created_at desc limit 1;

      if v_s1entry is null then
        insert into public.t3a_stage_instance
          (participant_id, stage_code, dimension_id, attempt_no, completed_at)
        values (v_part, 'S1', 'D1', 1, now())
        returning stage_instance_id into v_s1si;

        insert into public.t3a_stage_entry_event
          (observation_path_gateway_id, stage_instance_id, stage_code, dimensions_in_play,
           session_identity, assistance_rules_version, administration_conditions,
           participant_id, dimension_id, source_version_id,
           randomization_seed, presentation_variant_seed,
           administration_conditions_snapshot, env_state_at_entry)
        values (v_gw, v_s1si, 'S1', ARRAY['D1']::public.t3a_dimension_code[],
                'e2e_fixture_s1', 'e2e', '{}'::jsonb, v_part, 'D1', v_s1ver,
                1, 1, '{}'::jsonb, 'design_only')
        returning stage_entry_event_id into v_s1entry;
      end if;

      if not exists (select 1 from public.t3a_d1_ai_administration_run
                      where stage_entry_event_id = v_s1entry) then
        insert into public.t3a_d1_ai_administration_run
          (stage_entry_event_id, participant_id, dimension_id, source_version_id,
           model_ref_version_id, prompt_ref_version_id,
           admin_config_version_id, safety_config_version_id,
           rendered_body, env_state_at_run, status, run_completed_at)
        values (v_s1entry, v_part, 'D1', v_s1ver,
                (v_prov->>'SYNTHETIC_TEST_ONLY-D1-MODEL-REF')::uuid,
                (v_prov->>'SYNTHETIC_TEST_ONLY-D1-PROMPT-REF')::uuid,
                (v_prov->>'SYNTHETIC_TEST_ONLY-D1-ADMIN-CONFIG')::uuid,
                (v_prov->>'SYNTHETIC_TEST_ONLY-D1-SAFETY-CONFIG')::uuid,
                'DEMONSTRATION RESPONSES — SYNTHETIC_TEST_ONLY. No real person produced these and '
                || 'no determination taken from them is evidence about anyone.',
                'design_only', 'completed', now());
      end if;

      -- CORR-02: the routing record is what puts the pending action on the
      -- Mentor Desk. Without it the gate is enforced and invisible.
      if not exists (select 1 from public.t3a_d1_s1_routing
                      where stage_instance_id = v_s1si) then
        insert into public.t3a_d1_s1_routing
          (stage_instance_id, participant_id, dimension_id, assigned_mentor_id)
        values (v_s1si, v_part, 'D1', v_mentor);
      end if;

      raise notice 's1_demonstration stage_instance=% entry=%', v_s1si, v_s1entry;
    end if;
  end;

  raise notice 'stage_entry_event_id=%', v_entry;
end
$seed$;

select e.stage_entry_event_id,
       e.source_version_id,
       cv.superseded_by,
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
  // CS-I-48. The suite asserts on this before anything else: a fixture
  // pinned to superseded content makes every later assertion meaningless
  // while still reporting green.
  supersededBy: entry.superseded_by ?? null,
  // AC-04 compares what Pane 1 renders against the approved text itself,
  // not against "the pane is non-empty". The register holds that text
  // under `verbatim`; there is no canonical_body on any loaded source.
  canonicalBody: entry.canonical_body,
};

writeFileSync(resolve(ROOT, 'e2e/.fixture.json'), JSON.stringify(fixture, null, 2));
console.log(`stage entry: ${fixture.stageEntryEventId}`);
console.log('wrote e2e/.fixture.json');
