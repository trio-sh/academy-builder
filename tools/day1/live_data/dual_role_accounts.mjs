#!/usr/bin/env node
/**
 * CR-340. Named test accounts on the live project that hold TWO roles each, so the founder can sign in and see each pair's privileges. Synthetic people, `.test` addresses that cannot
 * receive mail. Refuses to run against a production_active environment. Idempotent. `--rollback` removes everything this script created.
 *
 *   SBP=<token> SUPABASE_PROJECT_REF=<ref> DUAL_CREDS=<path to a json file for the generated passwords> node tools/day1/live_data/dual_role_accounts.mjs [--rollback]
 *
 * Passwords are generated on first run and written only to DUAL_CREDS (never printed, never committed). Each account holds its profile role plus a second, administrator-granted
 * `t3a_role_assignment`. The pages open a desk by the one profile role, so each account reaches that one desk through the screens; the database honours both roles.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";

const SBP = process.env.SBP, REF = process.env.SUPABASE_PROJECT_REF, CREDS = process.env.DUAL_CREDS;
if (!SBP || !REF || !CREDS) { console.error("need SBP, SUPABASE_PROJECT_REF, DUAL_CREDS"); process.exit(2); }
const ROLLBACK = process.argv.includes("--rollback");

const ACCOUNTS = [
  { key: "mentor_participant", email: "dual-mentor-participant@t3a.test", first: "Dual", last: "MentorParticipant", profileRole: "mentor", roles: ["mentor", "participant"] },
  { key: "mentor_employer", email: "dual-mentor-employer@t3a.test", first: "Dual", last: "MentorEmployer", profileRole: "mentor", roles: ["mentor", "employer_user"] },
  { key: "participant_employer", email: "dual-participant-employer@t3a.test", first: "Dual", last: "ParticipantEmployer", profileRole: "candidate", roles: ["participant", "employer_user"] },
  { key: "admin_mentor", email: "dual-admin-mentor@t3a.test", first: "Dual", last: "AdminMentor", profileRole: "mentor", roles: ["mentor", "oversight_administrator"] },
  { key: "mentee", email: "dual-mentee@t3a.test", first: "Dual", last: "Mentee", profileRole: "candidate", roles: ["participant"] },
  { key: "stranger_mentee", email: "dual-stranger-mentee@t3a.test", first: "Dual", last: "StrangerMentee", profileRole: "candidate", roles: ["participant"] },
];
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${SBP}`, "Content-Type": "application/json", "User-Agent": "t3a-live-apply/1" }, body: JSON.stringify({ query }) });
  const t = await r.text(); if (!r.ok) throw new Error(`sql failed: ${t.slice(0, 600)}`); return JSON.parse(t);
}
const keys = await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${SBP}`, "User-Agent": "t3a-live-apply/1" } })).json();
const KEY = (keys.find((x) => x.type === "secret") || keys.find((x) => x.name === "service_role")).api_key;
const base = `https://${REF}.supabase.co`;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const findUser = async (email) => ((await (await fetch(`${base}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, { headers: H })).json()).users || []).find((u) => u.email === email);

const env = (await sql(`select public.t3a_current_env_state()::text as env`))[0].env;
if (env === "production_active") { console.error("refusing: production_active"); process.exit(1); }
console.log("environment:", env);

if (ROLLBACK) {
  const emails = ACCOUNTS.map((a) => q(a.email)).join(",");
  const ids = (await sql(`select id from public.profiles where email in (${emails})`)).map((r) => q(r.id)).join(",") || "null";
  await sql(`
    delete from public.mentor_observations where mentor_id in (select id from public.mentor_profiles where profile_id in (${ids})) or candidate_id in (select id from public.candidate_profiles where profile_id in (${ids}));
    delete from public.mentor_assigned_dimensions where mentor_id in (${ids}) or candidate_id in (${ids});
    delete from public.mentor_assignments where mentor_id in (select id from public.mentor_profiles where profile_id in (${ids})) or candidate_id in (select id from public.candidate_profiles where profile_id in (${ids}));
    delete from public.t3a_growth_log_entry where created_by in (${ids});
    delete from public.t3a_employer_application where employer_profile_id in (select id from public.employer_profiles where profile_id in (${ids}));
    delete from public.t3a_oversight_holder where holder_id in (${ids});
    delete from public.t3a_role_assignment where account_id in (${ids});
    delete from public.mentor_profiles where profile_id in (${ids}); delete from public.candidate_profiles where profile_id in (${ids}); delete from public.employer_profiles where profile_id in (${ids});
    delete from public.profiles where id in (${ids});`);
  for (const a of ACCOUNTS) { const u = await findUser(a.email); if (u) await fetch(`${base}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }); }
  console.log("rolled back"); process.exit(0);
}

const creds = existsSync(CREDS) ? JSON.parse(readFileSync(CREDS, "utf8")) : {};
for (const a of ACCOUNTS) creds[a.email] ||= randomBytes(12).toString("base64url") + "!9a";
writeFileSync(CREDS, JSON.stringify(creds, null, 1), { mode: 0o600 });

const ids = {};
for (const a of ACCOUNTS) {
  const u = await findUser(a.email);
  if (u) { await fetch(`${base}/auth/v1/admin/users/${u.id}`, { method: "PUT", headers: H, body: JSON.stringify({ password: creds[a.email], email_confirm: true }) }); ids[a.key] = u.id; continue; }
  const r = await (await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ email: a.email, password: creds[a.email], email_confirm: true, user_metadata: { first_name: a.first, last_name: a.last } }) })).json();
  if (!r.id) throw new Error(`create ${a.email}: ${JSON.stringify(r).slice(0, 200)}`); ids[a.key] = r.id;
}

for (const a of ACCOUNTS) {
  const id = ids[a.key];
  const stmts = [`insert into public.profiles(id,email,first_name,last_name,role,is_active,onboarding_completed) values (${q(id)},${q(a.email)},${q(a.first)},${q(a.last)},'${a.profileRole}'::public.user_role,true,true) on conflict (id) do update set role='${a.profileRole}'::public.user_role,is_active=true,onboarding_completed=true`];
  for (const r of a.roles) {
    stmts.push(`insert into public.t3a_role_assignment(account_id,role_code,role_grant_basis,role_granted_by,role_rules_version,participant_pseudonym_ref) select ${q(id)},'${r}','administrator_grant',${q(id)},'1.0',${r === "participant" ? q(randomUUID()) : "null"} where not exists (select 1 from public.t3a_role_assignment where account_id=${q(id)} and role_code='${r}')`);
    if (r === "mentor") stmts.push(`insert into public.mentor_profiles(profile_id) select ${q(id)} where not exists (select 1 from public.mentor_profiles where profile_id=${q(id)})`);
    if (r === "participant") stmts.push(`insert into public.candidate_profiles(profile_id) select ${q(id)} where not exists (select 1 from public.candidate_profiles where profile_id=${q(id)})`);
    if (r === "employer_user") {
      stmts.push(`insert into public.employer_profiles(profile_id) select ${q(id)} where not exists (select 1 from public.employer_profiles where profile_id=${q(id)})`);
      stmts.push(`insert into public.t3a_employer_application(employer_profile_id,approval_decision,approved_by,approved_at,application_status,accepting_person_name,accepting_person_title,record_use_terms_version,terms_accepted_at,approver_id) select ep.id,'approved','synthetic test account',now(),'approved','Synthetic Person','Director','1.0',now(),gen_random_uuid() from public.employer_profiles ep where ep.profile_id=${q(id)} and not exists (select 1 from public.t3a_employer_application x where x.employer_profile_id=ep.id)`);
    }
    if (r === "oversight_administrator") stmts.push(`insert into public.t3a_oversight_holder(holder_id,holder_name,holder_email) select id,${q(a.first + " " + a.last)},email from public.profiles where id=${q(id)} and not exists (select 1 from public.t3a_oversight_holder where holder_id=${q(id)})`);
  }
  await sql(stmts.join(";\n"));
}

// a private note for each of the two mentees, and the desk assignments: the dual mentors mentor `mentee`; `stranger_mentee` belongs to the existing test mentor
await sql(`
  insert into public.t3a_growth_log_entry(created_by,entry_kind,text) select ${q(ids.mentee)},'practice_note','Private note of the test mentee: no mentor, employer or administrator should ever read this.' where not exists (select 1 from public.t3a_growth_log_entry where created_by=${q(ids.mentee)});
  insert into public.t3a_growth_log_entry(created_by,entry_kind,text) select ${q(ids.stranger_mentee)},'practice_note','Private note of the stranger mentee.' where not exists (select 1 from public.t3a_growth_log_entry where created_by=${q(ids.stranger_mentee)});
  insert into public.mentor_profiles(profile_id) select id from public.profiles where email='testmentor@t3a.test' and not exists (select 1 from public.mentor_profiles m where m.profile_id=profiles.id);
  insert into public.mentor_assignments(mentor_id,candidate_id,status) select mp.id, cp.id,'active' from public.mentor_profiles mp, public.candidate_profiles cp where mp.profile_id in (${[ids.mentor_participant, ids.mentor_employer, ids.admin_mentor].map(q).join(",")}) and cp.profile_id=${q(ids.mentee)} and not exists (select 1 from public.mentor_assignments x where x.mentor_id=mp.id and x.candidate_id=cp.id);
  insert into public.mentor_assignments(mentor_id,candidate_id,status) select mp.id, cp.id,'active' from public.mentor_profiles mp join public.profiles p on p.id=mp.profile_id and p.email='testmentor@t3a.test', public.candidate_profiles cp where cp.profile_id=${q(ids.stranger_mentee)} and not exists (select 1 from public.mentor_assignments x where x.mentor_id=mp.id and x.candidate_id=cp.id);`);
// ids the screen test needs, kept beside the passwords (not printed)
const one = async (query) => (await sql(query))[0];
creds._ids = {
  accounts: ids,
  mentee_candidate_row: (await one(`select id from public.candidate_profiles where profile_id=${q(ids.mentee)}`)).id,
  stranger_candidate_row: (await one(`select id from public.candidate_profiles where profile_id=${q(ids.stranger_mentee)}`)).id,
  mentee_note: (await one(`select entry_id from public.t3a_growth_log_entry where created_by=${q(ids.mentee)} limit 1`)).entry_id,
  mentee_assignment: Object.fromEntries(await Promise.all(["mentor_participant", "mentor_employer", "admin_mentor"].map(async (k) => [k, (await one(`select ma.id as id, ma.mentor_id as mp, ma.candidate_id as cp from public.mentor_assignments ma join public.mentor_profiles mp on mp.id=ma.mentor_id where mp.profile_id=${q(ids[k])} and ma.candidate_id=(select id from public.candidate_profiles where profile_id=${q(ids.mentee)})`))]))),
};
writeFileSync(CREDS, JSON.stringify(creds, null, 1), { mode: 0o600 });
console.log("accounts ready:", ACCOUNTS.map((a) => a.email).join(", "));
