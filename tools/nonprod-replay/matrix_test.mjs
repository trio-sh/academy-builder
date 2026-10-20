// Day 1 acceptance: DT-22 (observation, determination, event log) and DT-26. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function as(role, sub, sql, commit = false) {
  await c.query("begin"); let msg = "ok", rows = [];
  try {
    if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claim.sub','${sub}',true), set_config('request.jwt.claims', json_build_object('sub','${sub}','role','${role}')::text, true)`); }
    rows = (await c.query(sql)).rows;
  } catch (e) { msg = e.message; }
  await c.query(msg !== "ok" || !commit ? "rollback" : "commit"); return { msg, rows };
}
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
// DT-22: use rows left by earlier tests
const ob = (await run(`select observation_id from t3a_observation limit 1`))[0]?.observation_id, de = (await run(`select determination_id from t3a_determination limit 1`))[0]?.determination_id, ev = (await run(`select event_id from t3a_event_log limit 1`))[0]?.event_id;
for (const [t, id, col] of [["t3a_observation", ob, "observation_id"], ["t3a_determination", de, "determination_id"], ["t3a_event_log", ev, "event_id"]]) {
  if (!id) { rec("DT-22", `${t}: no row to test`, false, "run the domain tests first"); continue; }
  for (const [who, role] of [["table owner", null], ["service role", "service_role"], ["signed-in user", "authenticated"]]) {
    // refused = an error, or no row touched (row security hides it from the caller)
    const upd = await as(role, randomUUID(), `with u as (update ${t} set ${t === "t3a_event_log" ? "event_name" : t === "t3a_observation" ? "descriptor_version" : "state_code"} = 'x' where ${col}='${id}' returning 1) select count(*)::int n from u`);
    const del = await as(role, randomUUID(), `with d as (delete from ${t} where ${col}='${id}' returning 1) select count(*)::int n from d`);
    const refusedU = upd.msg !== "ok" || upd.rows[0].n === 0, refusedD = del.msg !== "ok" || del.rows[0].n === 0;
    rec("DT-22", `${t}: UPDATE and DELETE refused for the ${who}`, refusedU && refusedD, [upd.msg.slice(0, 50), upd.rows[0]?.n, del.msg.slice(0, 50), del.rows[0]?.n]);
  }
}
// DT-26
const D = randomUUID(), RUN = D.slice(0, 8);
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${D}','demo-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${D}','demo-${RUN}@t.local','candidate')`);
const D2 = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${D2}','demo2-${RUN}@t.local',now())`);
await run(`insert into t3a_account(account_id, account_creation_route, email_address, record_property, capture_gaps) values ('${D2}','administrator_provisioned','demo2-${RUN}@t.local','demonstration','{age_eligibility_attestation}')`);
rec("DT-26", "a demonstration account cannot be turned into a real one", (await as(null, null, `update t3a_account set record_property = 'real' where account_id='${D2}'`)).msg !== "ok");
const bad = await as(null, null, `select t3a_ingest_event('consent.granted','PARTICIPANT','${D2}','participant','consent','${randomUUID()}','{"consent_id":"${randomUUID()}"}'::jsonb,'demo-bad-${RUN}',null,'${D2}',null,null,'internal_job','real')`);
rec("DT-26", "a real event about a demonstration account is refused", /RECORD_PROPERTY_NOT_INHERITED|rejected|refused/i.test(JSON.stringify(bad.rows) + bad.msg), (JSON.stringify(bad.rows) + bad.msg).slice(0, 140));
const good = await as(null, null, `select t3a_ingest_event('consent.granted','PARTICIPANT','${D2}','participant','consent','${randomUUID()}','{"consent_id":"${randomUUID()}"}'::jsonb,'demo-good-${RUN}',null,'${D2}',null,null,'internal_job','demonstration') r`, true);
const kids = await run(`select record_property from t3a_event_log where subject_id='${D2}'`);
rec("DT-26", "every child row of the demonstration account carries record_property = demonstration", kids.length >= 1 && kids.every(k => k.record_property === "demonstration") && (await run(`select record_property from t3a_account where account_id='${D2}'`))[0].record_property === "demonstration", kids);
const conv = (await run(`select t3a_convert_record_property('${D2}','real') r`))[0].r; rec("DT-26", "a conversion attempt is refused and logged", conv.reason === "RECORD_PROPERTY_CONVERSION_REFUSED" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='RECORD_PROPERTY_CONVERSION_REFUSED'`))[0].n >= 1, conv);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
