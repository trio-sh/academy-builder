// CR-068: the first two live writers (path opened, progression recorded) emit canonical events. Throwaway database only.
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
const P = randomUUID(), M = randomUUID(), RUN = P.slice(0, 8);
for (const [u, e, r] of [[P, "p", "candidate"], [M, "m", "mentor"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','lw${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','lw${e}-${RUN}@t.local','${r}')`); }
await c.query(`insert into t3a_identity_assurance(participant_id, identity_assurance_method, registration_jurisdiction, country_code, language_preference, timezone, occupational_classification_version) values ('${P}','account_authentication','CA-ON','CA','en','America/Toronto','NOC 2021 Version 1.0')`).catch(e => console.log("ia", e.message));
await c.query(`insert into t3a_consent_state(participant_id, consent_type, consent_status, consent_copy_version, consent_method) values ('${P}','mentor_observation','granted','1.0','checkbox')`).catch(e => console.log("cs", e.message));
// counted for this script's own two people only, so events written by other test files running in the same database never change the counts
const mine = `actor_id in ('${P}','${M}')`;
const before = (await run(`select count(*)::int n from t3a_event_log where ${mine}`))[0].n;
const gw = await as("authenticated", P, `select t3a_create_observation_path_gateway('account_authentication','1.0','1.0') g`, true);
rec("CR-068", "opening the gateway works and writes a canonical observation.path_opened event", gw.msg === "ok" && (await run(`select count(*)::int n from t3a_event_log where event_name='observation.path_opened' and resource_id='${gw.rows[0]?.g}'`))[0].n === 1, gw.msg.slice(0, 160));
const ev = (await run(`select event_name, event_processing_state, previous_hash is not null ph, payload ? 'observation_path_gateway_id' has_id from t3a_event_log where resource_id='${gw.rows[0]?.g}'`))[0];
rec("CR-068", "the event is accepted (not quarantined), chained and carries the canonical payload", ev && ev.event_processing_state === "accepted" && ev.ph && ev.has_id, ev);
const chain = await run(`select count(*)::int n from t3a_event_chain_findings()`); rec("CR-068", "the event chain verifies", chain[0].n === 0, chain[0].n);
const si = (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','S2','D1',1,'active') returning stage_instance_id i`))[0].i;
await run(`insert into t3a_role_grant(user_id, spec_role) values ('${M}','mentor')`).catch(e => console.log('rg', e.message));
// CR-18: a progression decision follows the commit, so the participant's Stage 2 observation is committed before any decision is recorded
await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${P}','D1','S2', true, now())`);
const free = await as("authenticated", M, `select t3a_record_progression_decision('${si}','D1','proceed','They handled the pressure well and stayed calm throughout the session.') r`, false);
rec("DT-20", "a progression decision sent with free text is refused by the live endpoint", /FREE_TEXT_REFUSED/.test(free.msg), free.msg.slice(0, 120));
const pd = await as("authenticated", M, `select t3a_record_progression_decision(p_stage_instance_id => '${si}', p_dimension_id => 'D1', p_decision => 'proceed') r`, true);
rec("CR-068", "a progression decision without free text is recorded", pd.msg === "ok", pd.msg.slice(0, 160));
const ev2 = (await run(`select event_name, event_processing_state from t3a_event_log where event_name='observation.progression_recorded' order by ingested_at desc limit 1`))[0];
rec("CR-068", "it writes a canonical observation.progression_recorded event, accepted", ev2 && ev2.event_processing_state === "accepted", ev2);
const withCode = await as("authenticated", M, `select t3a_record_progression_decision(p_stage_instance_id => '${await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','S2','D1',2,'active') returning stage_instance_id i`).then(r => r[0].i)}', p_dimension_id => 'D1', p_decision => 'redirect', p_rationale_code => 'R_EVIDENCE_GAP') r`, true);
rec("CR-068", "a controlled rationale code is accepted and carried in the event", withCode.msg === "ok" && (await run(`select count(*)::int n from t3a_event_log where event_name='observation.progression_recorded' and payload->>'decision_rationale_code'='R_EVIDENCE_GAP' and ${mine}`))[0].n === 1, withCode.msg.slice(0, 120));
const badCode = await as("authenticated", M, `select t3a_record_progression_decision(p_stage_instance_id => '${si}', p_dimension_id => 'D1', p_decision => 'pause', p_rationale_code => 'a sentence of free words') r`, false);
rec("DT-20", "a sentence passed as the code is refused", /FREE_TEXT_REFUSED/.test(badCode.msg), badCode.msg.slice(0, 100));
const after = (await run(`select count(*)::int n from t3a_event_log where ${mine}`))[0].n; rec("CR-068", "refused calls wrote no event", after === before + 3, [before, after]);
const mj = await run(`select decision_rationale from t3a_mentor_judgment where stage_instance_id='${si}'`); rec("DT-20", "no rationale text is stored on the judgment row", mj.every(r => r.decision_rationale === null), mj);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
