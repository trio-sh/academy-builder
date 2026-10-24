// Day 1 step 11.1.4 probes (DT-03, DT-04, Domain A structure). Run against the throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
import { randomUUID } from "node:crypto";
const UV = randomUUID(), V = randomUUID(), U3 = randomUUID(), U4 = randomUUID(); // fresh ids each run: the Domain A tables are append only, so there is no clean-up
await c.query("set search_path to public, extensions");
const RUN = UV.slice(0, 8);
const ids = `'${UV}','${V}','${U3}','${U4}'`;
async function run(sql) { return (await c.query(sql)).rows; }
async function as(role, sub, sql, commit = false) {
  await c.query("begin"); let msg = "ok", rows = [];
  try {
    if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claim.sub','${sub}',true), set_config('request.jwt.claims', json_build_object('sub','${sub}','role','${role}')::text, true)`); }
    rows = (await c.query(sql)).rows;
  } catch (e) { msg = e.message; }
  await c.query(msg !== "ok" || !commit ? "rollback" : "commit"); return { msg, rows };
}
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${UV}','UV-${RUN}@t.local ',null),('${V}','v-${RUN}@t.local',now()),('${U3}','u3-${RUN}@t.local',now()),('${U4}','u4-${RUN}@t.local',null)`);
await c.query(`insert into profiles(id,email,role) values ('${UV}','uv-${RUN}@t.local','candidate'),('${V}','v-${RUN}@t.local','candidate'),('${U4}','u4-${RUN}@t.local','candidate')`);

// Sync and backfill
const acc = await run(`select account_id, email_address, email_verification_state, capture_gaps from t3a_account where account_id in (${ids}) order by 1`);
rec("A-sync", "profile insert creates the account root (email lower-cased, unverified until confirmed)", acc.length === 3 && acc.find(a => a.account_id === UV).email_address === `uv-${RUN}@t.local` && acc.find(a => a.account_id === UV).email_verification_state === "unverified" && acc.find(a => a.account_id === V).email_verification_state === "verified", acc);
rec("A-gap", "age attestation recorded as a capture gap, not invented", acc.every(a => a.capture_gaps.includes("age_eligibility_attestation")));
const ra = await run(`select account_id, role_code, role_grant_basis, participant_pseudonym_ref is not null as has_pseud from t3a_role_assignment where account_id in (${ids})`);
rec("A-role", "legacy candidate maps to participant with a pseudonym", ra.length === 3 && ra.every(r => r.role_code === "participant" && r.has_pseud), ra);
await c.query(`update auth.users set email_confirmed_at = now() where id = '${U4}'`);
const sync = await run(`select email_verification_state, email_verified_at is not null v from t3a_account where account_id='${U4}'`);
rec("A-verify-sync", "confirming the email on auth.users verifies the account root", sync[0].email_verification_state === "verified" && sync[0].v, sync);

// DT-04
const gate = m => /EMAIL_VERIFICATION_REQUIRED/.test(m);
for (const t of ["t3a_stage_entry_event", "t3a_observation_path_gateway", "t3a_attempt", "t3a_observation", "t3a_disclosure"]) {
  // the Stage entry derives its dimension before any gate looks at the row, so the probe names the dimension it is about
  const cols = t === "t3a_stage_entry_event" ? "(participant_id, dimensions_in_play) values ('%P', '{D1}')" : "(participant_id) values ('%P')";
  const u = await as(null, null, `insert into ${t}${cols.replace("%P", UV)}`);
  const v = await as(null, null, `insert into ${t}${cols.replace("%P", V)}`);
  rec("DT-04", `${t}: unverified participant refused with the stated reason; verified passes the gate`, gate(u.msg) && !gate(v.msg), { unverified: u.msg.slice(0, 80), verified: v.msg.slice(0, 80) });
}
const BER_FIELDS = "dimension_id, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, represented_dimension_ids, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag";
const BER_VALUES = "'D1', '1.0', '1.0', '1.0', 'M5', array['D1']::text[], '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false";
for (const t of ["t3a_observation_record", "t3a_d1_ber_report"]) {
  const u = await as(null, null, t === "t3a_d1_ber_report" ? `insert into ${t}(participant_id, ${BER_FIELDS}) values ('${UV}', ${BER_VALUES})` : `insert into ${t}(participant_id) values ('${UV}')`);
  rec("DT-04", `${t}: unverified participant refused (pre-existing guard)`, gate(u.msg), u.msg.slice(0, 80));
}
const mr = await as("authenticated", UV, `insert into t3a_mentor_request(requester_id) values ('${UV}')`);
rec("DT-04", "mentor request by unverified participant refused", gate(mr.msg), mr.msg.slice(0, 80));

// DT-03
const n0 = (await run(`select count(*)::int n from t3a_role_grant_attempt where outcome='refused'`))[0].n;
const s1 = await as("authenticated", U3, `insert into profiles(id,email,role) values ('${U3}','u3-${RUN}@t.local','mentor')`, true);
const n1 = (await run(`select count(*)::int n from t3a_role_grant_attempt where outcome='refused'`))[0].n;
const noRow = (await run(`select count(*)::int n from profiles where id='${U3}'`))[0].n === 0;
rec("DT-03", "signup asserting mentor: no profile created, refusal logged and kept", s1.msg === "ok" && noRow && n1 === n0 + 1, { n0, n1, noRow, msg: s1.msg });
const s2 = await as("authenticated", V, `update profiles set role='admin' where id='${V}'`, true);
const n2 = (await run(`select count(*)::int n from t3a_role_grant_attempt where outcome='refused'`))[0].n;
const roleNow = (await run(`select role::text r from profiles where id='${V}'`))[0].r;
rec("DT-03", "participant promoting self to admin: role unchanged, refusal logged and kept", roleNow === "candidate" && n2 === n1 + 1, { roleNow, n1, n2 });
const s3 = await as("authenticated", U3, `insert into profiles(id,email,role) values ('${U3}','u3-${RUN}@t.local','candidate')`, true);
rec("DT-03", "ordinary signup as candidate still works", s3.msg === "ok" && (await run(`select 1 from t3a_account where account_id='${U3}'`)).length === 1, s3.msg);
const g1 = await as("authenticated", V, `select t3a_grant_role('${V}','mentor','administrator_grant','${V}')`);
rec("DT-03", "client cannot grant a role through the grant function", /ROLE_SELF_ASSERTION_REFUSED/.test(g1.msg), g1.msg.slice(0, 80));
const g2 = await as("service_role", V, `select t3a_grant_role('${V}','mentor','administrator_grant','${V}') id`, true);
rec("DT-03", "service context can grant (mentor, administrator_grant)", g2.msg === "ok" && g2.rows.length === 1, g2.msg);
const bad = await as("service_role", V, `select t3a_grant_role('${V}','mentor','self_serve_individual','${V}')`);
rec("DT-03", "a basis that does not fit the role is refused by the table", /check|violat/i.test(bad.msg), bad.msg.slice(0, 80));
const rv = await as("service_role", V, `select t3a_revoke_role(role_assignment_id,'${V}','test_revoke') from t3a_role_assignment where account_id='${V}' and role_code='mentor'`, true);
rec("A-revoke", "revocation is a separate row; assignment unchanged", rv.msg === "ok" && (await run(`select count(*)::int n from t3a_role_assignment_revocation r join t3a_role_assignment a using (role_assignment_id) where a.account_id='${V}'`))[0].n === 1, rv.msg);

// structure
const upd = await as(null, null, `update t3a_role_assignment set role_code='mentor' where account_id='${V}'`); rec("A-append", "role assignment update refused", /APPEND_ONLY/.test(upd.msg), upd.msg.slice(0, 70));
const del = await as(null, null, `delete from t3a_role_assignment_revocation`); rec("A-append", "revocation delete refused", /APPEND_ONLY/.test(del.msg), del.msg.slice(0, 70));
const imm = await as(null, null, `update t3a_account set account_creation_route='public_signup', account_created_at=now() where account_id='${V}'`); rec("A-immutable", "account creation facts cannot change", /IMMUTABLE_COLUMN/.test(imm.msg), imm.msg.slice(0, 70));
const sock = await as(null, null, `insert into t3a_identity_assurance_socket(account_id) values ('${V}')`); rec("A-socket", "identity assurance socket refuses every write", /SOCKET_ROUTE_CLOSED/.test(sock.msg), sock.msg.slice(0, 70));
const hid = await as("authenticated", V, `select participant_pseudonym_ref from t3a_role_assignment`); rec("A-hidden", "participant pseudonym column not readable by a signed-in user", /permission denied/.test(hid.msg), hid.msg.slice(0, 70));
const own = await as("authenticated", V, `select account_id from t3a_account`); rec("A-rls", "a signed-in user reads only their own account row", own.rows.length === 1 && own.rows[0].account_id === V, own.rows.length);
const anon = await as("anon", V, `select 1 from t3a_account`); rec("A-rls", "anonymous caller cannot read the account root", /permission denied/.test(anon.msg), anon.msg.slice(0, 70));
const pr = await as("authenticated", V, `insert into t3a_participant_profile(account_id) values ('${V}')`); rec("A-rls", "signed-in users cannot write Domain A tables directly", /permission denied/.test(pr.msg), pr.msg.slice(0, 70));
const dt01 = await run(`select * from t3a_field_registry_dt01()`).catch(e => [{ err: e.message }]);
const mapA = await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'A.%'`);
rec("DT-01(A)", "all 47 Domain A fields mapped to a physical column", mapA[0].n === 47, { mapped: mapA[0].n, dt01: JSON.stringify(dt01).slice(0, 200) });
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
