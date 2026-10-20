// Day 1 step 11.1.5 probes (DT-05..DT-09, Domain B structure). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const A = randomUUID(), B = randomUUID(), RUN = A.slice(0, 8);
const run = async (sql, p = []) => (await c.query(sql, p)).rows;
async function as(role, sub, sql, commit = true) {
  await c.query("begin"); let msg = "ok", rows = [];
  try {
    if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claim.sub','${sub}',true), set_config('request.jwt.claims', json_build_object('sub','${sub}','role','${role}')::text, true)`); }
    rows = (await c.query(sql)).rows;
  } catch (e) { msg = e.message; }
  await c.query(msg !== "ok" || !commit ? "rollback" : "commit"); return { msg, rows };
}
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${A}','a-${RUN}@t.local',now()),('${B}','b-${RUN}@t.local',now())`);
await c.query(`insert into profiles(id,email,role) values ('${A}','a-${RUN}@t.local','candidate'),('${B}','b-${RUN}@t.local','candidate')`);
const H = "a".repeat(64);
const rc = (acc, type, status, dim, stage, extra = "") => `select t3a_record_consent('${acc}','${type}','${status}',${dim ? `'${dim}'` : "null"},${stage ? `'${stage}'` : "null"},'1.0','${H}','checkbox','en-CA','observation'${extra}) r`;
const cnt = async (t, a) => (await run(`select count(*)::int n from ${t} where account_id='${a}'`))[0].n;

// DT-05
const two = await as("authenticated", A, rc(A, "scenario_logging,mentor_observation", "granted", "D1", "S1"));
rec("DT-05", "an interaction carrying two consent types is refused and writes no consent row", two.rows[0]?.r?.reason === "CONSENT_ONE_TYPE_PER_INTERACTION" && (await cnt("t3a_consent_record", A)) === 0, two.rows[0]?.r || two.msg);
rec("DT-05", "the refusal is logged", (await run(`select count(*)::int n from t3a_consent_refusal where account_id='${A}' and reason_code='CONSENT_ONE_TYPE_PER_INTERACTION'`))[0].n === 1);
// grant, event
const g = await as("authenticated", A, rc(A, "mentor_observation", "granted", "D1", "S1"));
rec("B-grant", "a participant records consent for their own account; consent.granted event written", g.rows[0]?.r?.outcome === "recorded" && (await run(`select count(*)::int n from t3a_event_log where event_name='consent.granted' and resource_id='${g.rows[0]?.r?.consent_id}'`))[0].n === 1, g.rows[0]?.r || g.msg);
const other = await as("authenticated", B, rc(A, "mentor_observation", "granted", "D1", "S1"));
rec("B-actor", "recording consent for someone else's account is refused and logged", other.rows[0]?.r?.reason === "CONSENT_ACTOR_MISMATCH", other.rows[0]?.r || other.msg);
// DT-06
await as("authenticated", A, rc(A, "scenario_logging", "granted", "D1", "S1"));
await run("update t3a_consent_config set enforce_gate = true");
const cur1 = (await run(`select t3a_consent_current('${A}','mentor_observation','D1','S1') s`))[0].s, cur2 = (await run(`select t3a_consent_current('${A}','mentor_observation','D2','S1') s`))[0].s;
rec("DT-06", "consent granted for D1 is current for D1 and absent for D2", cur1 === "granted" && cur2 === null, { cur1, cur2 });
const se2 = await as(null, null, `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot) values ('${A}','D2','S1',gen_random_uuid(),gen_random_uuid(),'x','1.0','{}','{D2}','{}')`);
rec("DT-06", "Stage entry for D2 refuses for want of D2 consent", /CONSENT_REQUIRED/.test(se2.msg), se2.msg.slice(0, 120));
const se1 = await as(null, null, `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot) values ('${A}','D1','S1',gen_random_uuid(),gen_random_uuid(),'x','1.0','{}','{D1}','{}')`, false);
rec("DT-06", "Stage entry for D1 passes the consent gate (any other refusal is a later check)", !/CONSENT_REQUIRED/.test(se1.msg), se1.msg.slice(0, 120));
// DT-07
const wNo = await as("authenticated", A, rc(A, "scenario_logging", "withdrawn", "D1", "S1"));
rec("DT-07", "withdrawal without the consequence shown is refused", wNo.rows[0]?.r?.reason === "CONSEQUENCE_NOT_DISPLAYED", wNo.rows[0]?.r || wNo.msg);
const wOk = await as("authenticated", A, rc(A, "scenario_logging", "withdrawn", "D1", "S1", ",'future_only',true"));
rec("DT-07", "withdrawal with the consequence shown is recorded; consent.withdrawn event present", wOk.rows[0]?.r?.outcome === "recorded" && (await run(`select count(*)::int n from t3a_event_log where event_name='consent.withdrawn'`))[0].n >= 1, wOk.rows[0]?.r || wOk.msg);
const hist = await run(`select consent_status from t3a_consent_record where account_id='${A}' and consent_type='scenario_logging' order by recorded_seq`);
rec("DT-07", "withdrawal deletes nothing: earlier grant still readable, supersession row written", hist.map(h => h.consent_status).join() === "granted,withdrawn" && (await run(`select count(*)::int n from t3a_consent_supersession s join t3a_consent_record r using (consent_id) where r.account_id='${A}'`))[0].n === 1, hist);
const ob = await as(null, null, `insert into t3a_observation(participant_id, dimension_id, stage_code) values ('${A}','D1','S1')`);
rec("DT-07", "new capture refuses after withdrawal", /CONSENT_REQUIRED/.test(ob.msg), ob.msg.slice(0, 120));
await run("update t3a_consent_config set enforce_gate = false");
const off = await as(null, null, `insert into t3a_observation(participant_id, dimension_id, stage_code) values ('${A}','D1','S1')`, false);
rec("B-gate-off", "with the switch off the gate does not refuse (live screens unchanged)", !/CONSENT_REQUIRED/.test(off.msg), off.msg.slice(0, 100));
// DT-08
for (const t of ["followup_contact", "aggregate_regional", "research_participation"]) {
  const x = await as("authenticated", A, rc(A, t, "granted", null, null));
  rec("DT-08", `${t}: refused and logged, no row`, x.rows[0]?.r?.reason === "CONSENT_ROUTE_DISABLED" && (await run(`select count(*)::int n from t3a_consent_record where account_id='${A}' and consent_type='${t}'`))[0].n === 0, x.rows[0]?.r || x.msg);
}
const direct = await as(null, null, `insert into t3a_consent_record(account_id, consent_type, consent_status, consent_copy_version, consent_copy_hash, consent_method, consent_language, processing_purpose_id, authorization_basis_type, consent_actor_id) values ('${A}','followup_contact','granted','1.0','${H}','checkbox','en','followup','consent','${A}')`);
rec("DT-08", "a direct insert of a disabled type is refused by the table", /check|violat/i.test(msg(direct)), direct.msg.slice(0, 90));
function msg(x) { return x.msg; }
// DT-09
rec("DT-09", "no lsa consent text loaded: state is never_asked; the table is closed", (await run(`select t3a_lsa_consent_state('${A}') s`))[0].s === "never_asked" && /SOCKET_ROUTE_CLOSED/.test((await as(null, null, `insert into t3a_lsa_consent(account_id, lsa_consent_state) values ('${A}','granted')`)).msg));
// structure
const upd = await as(null, null, `update t3a_consent_record set consent_status='granted' where account_id='${A}'`); rec("B-append", "consent records cannot be edited", /APPEND_ONLY/.test(upd.msg));
const del = await as(null, null, `delete from t3a_consent_record where account_id='${A}'`); rec("B-append", "consent records cannot be deleted", /APPEND_ONLY/.test(del.msg));
const own = await as("authenticated", A, `select count(*)::int n from t3a_consent_record`); const oth = await as("authenticated", B, `select count(*)::int n from t3a_consent_record where account_id='${A}'`);
rec("B-rls", "a signed-in user reads only their own consent", own.rows[0].n >= 3 && oth.rows[0].n === 0, { own: own.rows[0], other: oth.rows[0] });
const wr = await as("authenticated", A, `insert into t3a_consent_record(account_id) values ('${A}')`); rec("B-rls", "no direct write by a signed-in user", /permission denied/.test(wr.msg), wr.msg.slice(0, 70));
const ip = await as("authenticated", A, `select consent_actor_id, ip_address_hash from t3a_consent_record limit 1`); rec("B-ip", "the stored address is only a hash column; no raw address column exists", (await run(`select count(*)::int n from information_schema.columns where table_name='t3a_consent_record' and column_name in ('ip_address','ip')`))[0].n === 0);
const mapB = await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'B.%'`); rec("DT-01(B)", "all 29 Domain B fields mapped", mapB[0].n === 29, mapB[0]);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
