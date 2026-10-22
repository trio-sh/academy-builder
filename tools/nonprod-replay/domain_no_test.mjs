// Day 1 step 11.1.16 probes (Domain N mapping; Domain O registry, change, configuration, manifest; DT-39, DT-41 database half). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
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
const A = randomUUID(), RUN = A.slice(0, 8), H = "9".repeat(64);
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${A}','o-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${A}','o-${RUN}@t.local','admin')`);
const svc = (sql, commit = false) => as("service_role", A, sql, commit);
// N: mapping only
const mapN = (await run(`select count(*)::int n, count(distinct physical_table)::int t from t3a_field_physical_map where qualified_name like 'N.%'`))[0]; rec("DT-01(N)", "all 29 Domain N fields mapped to t3a_event_log", mapN.n === 29 && mapN.t === 1, mapN);
const dangling = await run(`select m.qualified_name from t3a_field_physical_map m where m.qualified_name like 'N.%' and not exists (select 1 from information_schema.columns c where c.table_name = m.physical_table and c.column_name = m.physical_column)`); rec("DT-01(N)", "every mapped event log column exists", dangling.length === 0, dangling);
// O: registry and change
const asset = (await run(`insert into t3a_registry_asset(asset_type, current_version, deployment_status) values ('question_set','1.0','deployed') returning asset_id i`))[0].i;
const nosvc = await as("authenticated", A, `select t3a_register_change('${asset}','1.1','${A}','fix','founder','A','${H}') r`); rec("O-change", "a signed in user cannot change a registry asset (service route only)", nosvc.rows[0]?.r?.reason === "SERVICE_CONTEXT_REQUIRED" || /permission denied/.test(nosvc.msg), nosvc.rows[0]?.r || nosvc.msg.slice(0, 60));
const noReason = await svc(`select t3a_register_change('${asset}','1.1','${A}','','founder','A','${H}') r`); rec("O-change", "a change without a reason is refused and logged", noReason.rows[0]?.r?.reason === "REASON_AND_AUTHORITY_REQUIRED", noReason.rows[0]?.r || noReason.msg.slice(0, 60));
const ok = await svc(`select t3a_register_change('${asset}','1.1','${A}','Corrected wording','Founder','A','${H}') r`, true); rec("O-change", "a change with reason and authority is recorded", ok.rows[0]?.r?.outcome === "changed", ok.rows[0]?.r || ok.msg.slice(0, 80));
const after = (await run(`select current_version, previous_version from t3a_registry_asset where asset_id='${asset}'`))[0]; rec("O-change", "the previous version is kept when the current one moves", after.current_version === "1.1" && after.previous_version === "1.0", after);
const badClass = await as(null, null, `insert into t3a_change_request(asset_id, changed_by, compatibility_class, version_change_reason, approval_authority, version_hash) values ('${asset}','${A}','Z','r','a','${H}')`, false); rec("O-change", "a compatibility class outside A, B, C is refused", /check|violat/i.test(badClass.msg), badClass.msg.slice(0, 80));
const upd = await as(null, null, `update t3a_change_request set version_change_reason = 'x'`, false); rec("O-change", "change requests cannot be edited", /APPEND_ONLY/.test(upd.msg), upd.msg.slice(0, 70));
// DT-39: a key of its own, so another test's configuration cannot change what 'unset' means here
const DT39KEY = 'dt39_probe_' + randomUUID().replace(/-/g, '').slice(0, 12);
const r0 = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='CONFIGURATION_UNSET'`))[0].n;
const unset = (await run(`select t3a_config_get('${DT39KEY}') r`))[0].r;
rec("DT-39", "reading an unset configuration key refuses visibly, is logged and returns no default", unset.reason === "CONFIGURATION_UNSET" && unset.value === undefined && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='CONFIGURATION_UNSET'`))[0].n === r0 + 1, unset);
const set = await svc(`select t3a_config_set('${DT39KEY}','86400','1.0','${A}') r`, true); const got = (await run(`select t3a_config_get('${DT39KEY}') r`))[0].r;
rec("DT-39", "once set, the value is returned with its version", set.msg === "ok" && got.outcome === "set" && got.value === "86400" && got.version === "1.0", got);
const clientSet = await as("authenticated", A, `select t3a_config_set('x_key','1','1.0','${A}')`, false); rec("DT-39", "a signed in user cannot set configuration", /permission denied|CONFIG_SERVICE_ONLY/.test(clientSet.msg), clientSet.msg.slice(0, 70));
await svc(`select t3a_config_set('${DT39KEY}','43200','1.1','${A}')`, true); const latest = (await run(`select t3a_config_get('${DT39KEY}') r`))[0].r; rec("DT-39", "the latest value wins; earlier rows are kept", latest.value === "43200" && (await run(`select count(*)::int n from t3a_configuration_value where configuration_key='${DT39KEY}'`))[0].n === 2, latest);
// DT-41 database half
const good = await svc(`select t3a_record_manifest_verification('m1','sig-ok',true) v`, true), bad = await svc(`select t3a_record_manifest_verification('m1','sig-tampered',false) v`, true);
const res = await run(`select verification_result from t3a_manifest_verification where manifest_ref='m1' order by manifest_verified_at, verification_id`); rec("DT-41", "a valid and a tampered manifest signature are both recorded, the tampered one as a fail", res.map(r => r.verification_result).sort().join() === "fail,pass", res);
const mapO = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'O.%'`))[0].n; rec("DT-01(O)", "all 20 Domain O fields mapped", mapO === 20, mapO);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
