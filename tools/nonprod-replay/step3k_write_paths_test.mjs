// Step 3k: direct write paths around Stage 3 and Stage 4 are closed. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const asRole = async (role, sub, sql) => { await c.query("begin"); let msg = "ok", rows = [], count = null; try { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claims', '${JSON.stringify(sub ? { role, sub } : { role })}', true)`); await c.query(`select set_config('request.jwt.claim.sub', '${sub || ""}', true)`); const res = await c.query(sql); rows = res.rows; count = res.rowCount; } catch (e) { msg = e.message; } await c.query(msg === "ok" ? "commit" : "rollback"); return { msg, rows, count, r: rows[0]?.r }; };
const mkU = async (tag, role) => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','k${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','k${tag}-${RUN}@t.local','${role}')`); return u; };
const P = await mkU("p", "candidate"), FAC = await mkU("f", "mentor"), OBS = await mkU("o", "candidate"), CO = await mkU("c", "candidate"), STRANGER = await mkU("s", "candidate");
const sub = (await run(`insert into t3a_d1_work_sample_submission(participant_id, state, deadline_at) values ('${P}','ACCEPTED', now() + interval '1 day') returning submission_id i`))[0].i;
const gs = (await run(`insert into t3a_d1_group_session(facilitator_id, observed_participant_id) values ('${FAC}','${OBS}') returning group_session_id i`))[0].i;
await run(`insert into t3a_d1_group_session_member(group_session_id, participant_id, member_role) values ('${gs}','${OBS}','observed'), ('${gs}','${CO}','co_participant')`);

let r = await asRole("authenticated", P, `select state from t3a_d1_work_sample_submission where submission_id='${sub}'`);
rec("D2-WP-1", "a participant still reads their own submission", r.rows.length === 1, r.msg);
r = await asRole("authenticated", STRANGER, `select state from t3a_d1_work_sample_submission where submission_id='${sub}'`);
rec("D2-WP-1", "another participant cannot read it", r.rows.length === 0, r.msg);
r = await asRole("authenticated", P, `update t3a_d1_work_sample_submission set state='AVAILABLE_FOR_CAPTURE', artifact_ref='x' where submission_id='${sub}'`);
rec("D2-WP-2", "a participant cannot move their own submission to a state by direct write", r.count === 0 && (await run(`select state from t3a_d1_work_sample_submission where submission_id='${sub}'`))[0].state === "ACCEPTED", r.msg);
r = await asRole("authenticated", P, `insert into t3a_d1_work_sample_submission(participant_id, state) values ('${P}','AVAILABLE_FOR_CAPTURE')`);
rec("D2-WP-2", "a participant cannot insert a submission row directly", r.msg !== "ok", r.msg.slice(0, 90));
r = await asRole("authenticated", FAC, `insert into t3a_d1_group_session(facilitator_id, observed_participant_id) values ('${FAC}','${OBS}')`);
rec("D2-WP-3", "a facilitator cannot insert a session directly, bypassing composition", r.msg !== "ok", r.msg.slice(0, 90));
r = await asRole("authenticated", FAC, `insert into t3a_d1_group_session_member(group_session_id, participant_id, member_role) values ('${gs}','${STRANGER}','co_participant')`);
rec("D2-WP-3", "a facilitator cannot add a member directly", r.msg !== "ok", r.msg.slice(0, 90));
r = await asRole("authenticated", FAC, `select group_session_id from t3a_d1_group_session`); rec("D2-WP-3", "the facilitator still reads their session", r.rows.some(x => x.group_session_id === gs), r.msg);
r = await asRole("authenticated", OBS, `select group_session_id from t3a_d1_group_session`); rec("D2-WP-3", "the observed participant cannot read the session row", r.rows.length === 0, r.msg);
// member event
r = await asRole("anon", null, `select t3a_d1_group_member_event('${gs}','${CO}','disconnect') r`);
rec("D2-WP-4", "a caller who is not signed in cannot record a member event", /permission denied/i.test(r.msg), r.msg.slice(0, 90));
{ const n = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='not_permitted_for_this_session'`))[0].n;
  r = await asRole("authenticated", STRANGER, `select t3a_d1_group_member_event('${gs}','${CO}','disconnect') r`);
  rec("D2-WP-4", "a signed in stranger is refused and the attempt is logged", r.r?.reason === "not_permitted_for_this_session" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='not_permitted_for_this_session'`))[0].n === n + 1, r.r || r.msg); }
r = await asRole("authenticated", FAC, `select t3a_d1_group_member_event('${gs}','${CO}','disconnect') r`); rec("D2-WP-4", "the facilitator records a co-participant disconnection as a variance, removing nothing", r.r?.recorded === true && r.r.co_participant_records_removed === 0, r.r || r.msg);
r = await asRole("authenticated", OBS, `select t3a_d1_group_member_event('${gs}','${OBS}','disconnect') r`); rec("D2-WP-4", "the observed participant's own disconnection pauses the stage instance", r.r?.effect === "STAGE_INSTANCE_PAUSED", r.r || r.msg);
r = await asRole("authenticated", OBS, `select t3a_d1_group_member_event('${gs}','${CO}','withdraw') r`); rec("D2-WP-4", "a participant cannot record an event for someone else", r.r?.reason === "not_permitted_for_this_session", r.r || r.msg);
rec("D2-WP-5", "the six D1 stage functions are not executable by anon", (await run(`select bool_or(has_function_privilege('anon', p.oid, 'execute')) b from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('t3a_d1_group_member_event','t3a_d1_group_capture_permitted','t3a_d1_work_sample_provenance_check','t3a_d1_s1_workbench_may_open','t3a_d1_s1_may_confirm','t3a_d1_s1_capture_contemporaneity')`))[0].b === false, null);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
