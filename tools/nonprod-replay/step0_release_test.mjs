// Step 0 (CR-008, CR-053, CR-056): named recipient route closed, pool visibility built. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function as(role, sub, sql, commit = true) {
  await c.query("begin"); let msg = "ok", rows = [];
  try { if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claim.sub','${sub}',true), set_config('request.jwt.claims', json_build_object('sub','${sub}','role','${role}')::text, true)`); } rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; }
  await c.query(msg !== "ok" || !commit ? "rollback" : "commit"); return { msg, rows };
}
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const P = randomUUID(), Q = randomUUID(), RUN = P.slice(0, 8);
for (const [u, e] of [[P, "p"], [Q, "q"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','s0${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role,first_name,last_name) values ('${u}','s0${e}-${RUN}@t.local','candidate','Pat','Test')`); }
const st = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
const mk = async (issued = true) => (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, issued_at, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, represented_dimension_ids, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${P}','D1','${st}','{}', true, 'ber', 'assembling', ${issued ? "now()" : "null"}, '1.0', '1.0', '1.0', 'M5', array['D1']::text[], '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id`))[0].ber_report_id;
const rep = await mk(), notIssued = await mk(false);
const refusals = async (reason) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${reason}'`))[0].n;

// 1. the named route is closed
let n0 = await refusals("NAMED_RECIPIENT_RELEASE_RETIRED");
const iss = await as("authenticated", P, `select t3a_d1_issue_release_token('${rep}','Rae Recruiter','Org','rae@corp.example', now() + interval '10 days') r`, true);
rec("D-04", "issuing a named recipient token is refused and returns a code", iss.msg === "ok" && iss.rows[0].r.issued === false && iss.rows[0].r.refusal_code === "NAMED_RECIPIENT_RELEASE_RETIRED", iss);
rec("D-04", "the refusal is logged (persisted, not rolled back)", (await refusals("NAMED_RECIPIENT_RELEASE_RETIRED")) === n0 + 1, n0);
const tok = (await run(`select count(*)::int n from t3a_d1_release_token`))[0].n; rec("D-04", "no token row exists", tok === 0, tok);
const red = await as("anon", P, `select t3a_d1_redeem_release_token('x','a@b.c') r`, true);
rec("D-04", "redeeming returns the migration state and no content", red.rows[0]?.r?.content === false && red.rows[0]?.r?.state === "PLATFORM_RELEASE_MIGRATION_REQUIRES_GOVERNED_RECORD", red);
const face = await as("anon", P, `select t3a_d1_report_face_for_release('x','a@b.c') r`, true);
rec("D-04", "the report face route also returns no content", face.rows[0]?.r?.content === false, face);
const dn0 = (await run(`select count(*)::int n from t3a_disclosure`))[0].n;
const dis = await as("authenticated", P, `select t3a_create_disclosure('${rep}', null, 'a@b.c', 'report', now(), now() + interval '1 day') r`, true);
rec("D-04", "creating a disclosure returns nothing and creates nothing", dis.msg === "ok" && dis.rows[0].r === null && (await run(`select count(*)::int n from t3a_disclosure`))[0].n === dn0, dis);
await run(`insert into t3a_report_release(ber_report_id, release_mode, recipient_address_hash) values ('${rep}','named_pilot_recipient','${"a".repeat(64)}')`);
rec("D-04", "a direct named recipient release row is refused and skipped", (await run(`select count(*)::int n from t3a_report_release where release_mode='named_pilot_recipient'`))[0].n === 0, null);

// 2. pool visibility
const bad1 = await as("authenticated", Q, `select t3a_pool_make_available('${rep}') r`, true);
rec("D-04", "someone else cannot make the report available", bad1.rows[0]?.r?.reason === "ONLY_THE_PARTICIPANT_RELEASES_THEIR_REPORT", bad1);
const bad2 = await as("authenticated", P, `select t3a_pool_make_available('${notIssued}') r`, true);
rec("D-04", "an unissued report cannot be made available", bad2.rows[0]?.r?.reason === "REPORT_NOT_ISSUED", bad2);
const noCons = await as("authenticated", P, `select t3a_pool_make_available('${rep}') r`, true);
rec("D-04", "without employer_share consent for the dimension, making it available is refused and logged", noCons.rows[0]?.r?.reason === "EMPLOYER_SHARE_CONSENT_REQUIRED" && (await refusals("EMPLOYER_SHARE_CONSENT_REQUIRED")) >= 1, noCons);
const cons = await as("authenticated", P, `select t3a_record_consent('${P}','employer_share','granted','D1',null,'1.0','${"b".repeat(64)}','checkbox','en','report_release') r`, true);
rec("D-04", "employer_share consent for D1 is recorded", cons.msg === "ok" && !cons.rows[0]?.r?.reason, cons);
const ok = await as("authenticated", P, `select t3a_pool_make_available('${rep}', 'Analyst', 'Toronto', 'Immediately', 'CA', false) r`, true);
rec("D-04", "the participant makes their issued report available", ok.rows[0]?.r?.outcome === "available", ok);
const ent = (await run(`select stated_full_name, report_status, visibility_withdrawn_at, (to_jsonb(e) ?| array['dimension_id','stage_code','conduct']) leaks from t3a_employer_pool_entry e where ber_report_id='${rep}'`))[0];
rec("D-04", "a pool entry exists with the stated name and no dimension, stage or conduct field", ent && ent.stated_full_name === "Pat Test" && ent.report_status === "issued" && !ent.visibility_withdrawn_at && !ent.leaks, ent);
rec("D-04", "a release record in pool mode exists", (await run(`select count(*)::int n from t3a_report_release where ber_report_id='${rep}' and release_mode='approved_employer_pool' and employer_visibility_state='available_to_approved_employers'`))[0].n === 1, null);
const dup = await as("authenticated", P, `select t3a_pool_make_available('${rep}') r`, true);
rec("D-04", "making it available twice is refused", dup.rows[0]?.r?.reason === "ALREADY_AVAILABLE", dup);
const direct = await as("authenticated", P, `insert into t3a_employer_pool_entry(participant_id, stated_full_name, ber_report_id) values ('${P}','X','${notIssued}')`, false);
rec("D-04", "a participant cannot write a pool entry directly", /permission denied/.test(direct.msg), direct.msg.slice(0, 80));
const upd = await as("authenticated", P, `update t3a_employer_pool_entry set report_status='issued', correction_open=false where ber_report_id='${rep}'`, false);
rec("D-04", "a participant cannot edit the report fields of an entry", /permission denied/.test(upd.msg), upd.msg.slice(0, 80));
const upd2 = await as("authenticated", P, `update t3a_employer_pool_entry set work_location_preference='Remote' where ber_report_id='${rep}' returning 1`, true);
rec("D-04", "a participant can edit what they state", upd2.msg === "ok" && upd2.rows.length === 1, upd2);
const state = await as("authenticated", P, `select t3a_pool_state('${rep}') r`, true); rec("D-04", "the participant reads their pool state", state.rows[0]?.r?.available === true, state.rows[0]);
const wd = await as("authenticated", P, `select t3a_pool_withdraw('${rep}') r`, true);
rec("D-04", "the participant withdraws", wd.rows[0]?.r?.outcome === "withdrawn", wd);
rec("D-04", "the entry leaves the pool and the release record shows it", (await run(`select (e.visibility_withdrawn_at is not null) w, r.employer_visibility_state s, r.token_state t from t3a_employer_pool_entry e join t3a_report_release r using (ber_report_id) where e.ber_report_id='${rep}'`)).every(x => x.w && x.s === "future_availability_withdrawn" && x.t === "revoked"), null);
const wd2 = await as("authenticated", P, `select t3a_pool_withdraw('${rep}') r`, true); rec("D-04", "withdrawing again is refused", wd2.rows[0]?.r?.reason === "NOT_AVAILABLE", wd2);
const again = await as("authenticated", P, `select t3a_pool_make_available('${rep}') r`, true);
rec("D-04", "a withdrawn entry blocks a fresh entry for the same report (one entry per report)", again.msg !== "ok" || again.rows[0]?.r?.outcome !== "available", again.msg.slice(0, 80));

// 3. the entry follows its report
const rep2 = await mk(); await as("authenticated", P, `select t3a_pool_make_available('${rep2}') r`, true);
await run(`update t3a_d1_ber_report set amended_at = now() where ber_report_id='${rep2}'`).catch(e => rec("D-04", "amend update", false, e.message));
const am = (await run(`select report_status, correction_open, visibility_withdrawn_at from t3a_employer_pool_entry where ber_report_id='${rep2}'`))[0];
rec("D-04", "an amended report is flagged for correction in the pool", am && am.report_status === "amended" && am.correction_open === true, am);
const rep3 = await mk(); await as("authenticated", P, `select t3a_pool_make_available('${rep3}') r`, true);
await run(`update t3a_d1_ber_report set withdrawn_at = now() where ber_report_id='${rep3}'`).catch(e => rec("D-04", "withdraw update", false, e.message));
const w3 = (await run(`select report_status, visibility_withdrawn_at is not null w from t3a_employer_pool_entry where ber_report_id='${rep3}'`))[0];
rec("D-04", "a withdrawn report leaves the pool", w3 && w3.report_status === "withdrawn" && w3.w, w3);
const wc = await mk(); await as("authenticated", P, `select t3a_pool_make_available('${wc}') r`, true);
await as("authenticated", P, `select t3a_record_consent('${P}','employer_share','withdrawn','D1',null,'1.0','${"b".repeat(64)}','checkbox','en','report_release','future_only',true) r`, true);
const wcs = (await run(`select count(*)::int n from t3a_employer_pool_entry where participant_id='${P}' and visibility_withdrawn_at is null`))[0].n;
rec("D-04", "withdrawing employer_share consent takes every entry for that dimension out of the pool", wcs === 0, wcs);
await as("authenticated", P, `select t3a_record_consent('${P}','employer_share','granted','D1',null,'1.0','${"b".repeat(64)}','checkbox','en','report_release') r`, true);
const rep4 = await mk(); await run(`update t3a_d1_ber_report set withdrawn_at = now() where ber_report_id='${rep4}'`);
const w4 = await as("authenticated", P, `select t3a_pool_make_available('${rep4}') r`, true); rec("D-04", "a withdrawn report cannot be made available", w4.rows[0]?.r?.reason === "REPORT_WITHDRAWN", w4);

// 4. golden replay of the face output (unchanged by the release change)
const f1 = (await run(`select md5(t3a_d1_report_face_assemble('${rep}')::text) h`))[0].h, f2 = (await run(`select md5(t3a_d1_report_face_assemble('${rep}')::text) h`))[0].h;
rec("DT-50", "the report face assembles identically before and after the pool actions (same input, same output)", f1 === f2, f1);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
