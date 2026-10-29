// Day 1 step 11.1.6 probes (DT-10..DT-13, Domain C structure). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const P = randomUUID(), RUN = P.slice(0, 8);
const run = async (sql) => (await c.query(sql)).rows;
async function as(role, sub, sql, commit = true) {
  await c.query("begin"); let msg = "ok", rows = [];
  try {
    if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claim.sub','${sub}',true), set_config('request.jwt.claims', json_build_object('sub','${sub}','role','${role}')::text, true)`); }
    rows = (await c.query(sql)).rows;
  } catch (e) { msg = e.message; }
  await c.query(msg !== "ok" || !commit ? "rollback" : "commit"); return { msg, rows };
}
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${P}','c-${RUN}@t.local',now())`);
await c.query(`insert into profiles(id,email,role) values ('${P}','c-${RUN}@t.local','candidate')`);
const GW = (await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at, observation_notification_timestamp) values ('${P}','account_authentication','1.0','1.0',now(), now()) returning observation_path_gateway_id g`))[0].g;
rec("C-gw", "gateway row accepts the new nullable columns; opened_at maps to created_at", (await run(`select observation_notification_timestamp is null n, created_at is not null c from t3a_observation_path_gateway where observation_path_gateway_id='${GW}'`))[0].c);
const si = async (dim = "D1", stage = "S1") => (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','${stage}','${dim}',1,'scheduled') returning stage_instance_id i`).catch(e => [{ err: e.message }]))[0];
const sinst = await si();
const entry = (gw, inst, extra = "") => `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, entry_authority_actor_id${extra ? ", " + extra.split("=")[0] : ""}) values ('${P}','D1','S1',${gw},'${inst}','x','1.0','{}','{D1}','{}', gen_random_uuid()${extra ? ", " + extra.split("=")[1] : ""})`;
// DT-10
const noGw = await as(null, null, entry("null", sinst.i || randomUUID()), false); const badGw = await as(null, null, entry(`'${randomUUID()}'`, sinst.i || randomUUID()), false);
rec("DT-10", "Stage entry with no gateway is refused", noGw.msg !== "ok", noGw.msg.slice(0, 100)); rec("DT-10", "Stage entry with a gateway that does not exist is refused", badGw.msg !== "ok", badGw.msg.slice(0, 100));
const okEntry = await as(null, null, entry(`'${GW}'`, sinst.i || randomUUID()) + " returning stage_entry_event_id, entered_at, administration_conditions_capture_state cs");
rec("DT-10", "Stage entry with the participant's gateway is accepted", okEntry.msg === "ok" && okEntry.rows.length === 1, okEntry.msg.slice(0, 120));
rec("C-state", "administration_conditions capture state filled by the trigger", okEntry.rows[0]?.cs === "captured", okEntry.rows[0]);
// DT-11
const MENTOR = randomUUID(); // a person cannot be their own mentor (CR-340), so the allocation names a separate mentor
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${MENTOR}','m-${RUN}@t.local',now())`);
await c.query(`insert into profiles(id,email,role) values ('${MENTOR}','m-${RUN}@t.local','mentor')`);
const a1 = await run(`insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method, prior_allocation_count) values ('${MENTOR}','${P}','${sinst.i}','system_allocated',0) returning created_at`).catch(e => [{ err: e.message }]);
await new Promise(r => setTimeout(r, 1500));
await run(`insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by, captured_at) values ('${sinst.i}','${P}','D1','${P}',now())`);
const si2 = await si("D1", "S2");
const e2 = await run(entry(`'${GW}'`, si2.i || randomUUID()).replace("'D1','S1'", "'D1','S2'") + " returning entered_at").catch(e => [{ err: e.message }]);
rec("DT-11", "allocate a mentor, wait, enter the Stage: entry time is the entry action, later than the allocation", a1[0].created_at && e2[0].entered_at && new Date(e2[0].entered_at) - new Date(a1[0].created_at) >= 1000, { alloc: a1[0], entry: e2[0] });
const back = await as(null, null, entry(`'${GW}'`, randomUUID(), `entered_at=now() - interval '1 hour'`), false); rec("DT-11", "a backdated entry time is refused", /BACKDATED/.test(back.msg), back.msg.slice(0, 100));
// DT-12
const ins = (outcome, cls = "null", counted = true) => `insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, attempt_event_class, attempt_rules_version) values ('${P}','D1','S1','${outcome}',${counted},now() - interval '150 days',${cls === "null" ? "null" : `'${cls}'`}, '1.0') returning attempt_id, attempt_no, counted`;
const at = []; for (let i = 0; i < 3; i++) at.push((await run(ins("completed", "completed_observation")))[0]);
rec("DT-12", "three counted attempts numbered 1, 2, 3", at.map(a => a.attempt_no).join() === "1,2,3", at);
const reset = await as(null, null, `update t3a_attempt set attempt_no = 1 where attempt_id='${at[2].attempt_id}'`); rec("DT-12", "attempt_no cannot be lowered or reset (owner route)", /IMMUTABLE/.test(reset.msg), reset.msg.slice(0, 90));
const reset2 = await as("service_role", P, `update t3a_attempt set attempt_no = 0 where participant_id='${P}'`); rec("DT-12", "attempt_no cannot be reset through the service role either", /IMMUTABLE|permission/.test(reset2.msg), reset2.msg.slice(0, 90));
const del = await as(null, null, `delete from t3a_attempt where participant_id='${P}'`); rec("DT-12", "attempts cannot be deleted", /NO_DELETE/.test(del.msg), del.msg.slice(0, 90));
const cap = (await run(`select t3a_d1_next_attempt_permitted('${P}','D1','S1') r`))[0].r; rec("DT-12", "fourth counted attempt refuses under the loaded rule", cap.permitted === false && cap.refusal_code === "ATTEMPT_CAP_REACHED", cap);
// DT-13
const w = (await run(ins("participant_withdrew", "welfare_stop", true).replace("'D1','S1'", "'D1','S3'")))[0].counted;
const wc = (await run(`select cooldown_class cc, counted from t3a_attempt where participant_id='${P}' and attempt_event_class='welfare_stop'`))[0]; rec("DT-13", "welfare stop: attempt_counted false, cooldown_class none, even when supplied counted", w === false && wc.cc === "none", wc);
// strict switch
const nostrict = await as(null, null, `insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, attempt_rules_version, attempt_event_class) values ('${P}','D2','S1','initiated',false, '1.0', 'completed_observation')`, false); rec("C-live", "with the required-fields switch off, the live writers' inserts still pass", nostrict.msg === "ok", nostrict.msg.slice(0, 90));
await run("select enforce_required as v from t3a_capture_config").then(async (r) => { globalThis._prev_enforce_required = r[0].v; return run("update t3a_capture_config set enforce_required = true"); });
const strict = await as(null, null, `insert into t3a_conflict_declaration(mentor_id, participant_id, reason_class) values (gen_random_uuid(), '${P}', 'family')`, false); rec("C-strict", "with the switch on, a missing required field that no route completes is refused by name", /T3A_REQUIRED_FIELD_MISSING/.test(strict.msg), strict.msg.slice(0, 100));
await run(`update t3a_capture_config set enforce_required = ${globalThis._prev_enforce_required}`);
const mapC = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'C.%'`))[0].n; rec("DT-01(C)", "all 36 Domain C fields mapped", mapC === 36, mapC);
const cols = (await run(`select count(*)::int n from information_schema.columns where table_name='t3a_attempt' and column_name in ('attempt_no','attempt_event_class','cooldown_class','attempt_reason')`))[0].n; rec("C-cols", "new attempt columns exist", cols === 4);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
