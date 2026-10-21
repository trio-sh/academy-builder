// Day 1 step 11.1.17 probes (Domain P: DT-36, DT-37, DT-38, DT-39, DT-54, DT-59 and structure). Throwaway database only.
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
const AD = randomUUID(), P = randomUUID(), RUN = AD.slice(0, 8);
for (const [u, e, r] of [[AD, "a", "admin"], [P, "p", "candidate"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','p${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','p${e}-${RUN}@t.local','${r}')`); }
const svc = (sql, commit = false) => as("service_role", AD, sql, commit);
const refusals = async (reason) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${reason}'`))[0].n;
// DT-36 (the existing oversight log is the content read log)
await run(`insert into t3a_oversight_holder(holder_id, holder_name, holder_email) values ('${AD}','Oversight Holder','pa-${RUN}@t.local') on conflict do nothing`);
if ((await run(`select count(*)::int n from t3a_oversight_disclosure where counsel_cleared and effective_from <= now()`))[0].n === 0) await run(`insert into t3a_oversight_disclosure(draft_text, counsel_cleared, cleared_by, effective_from) values ('probe', true, 'test', now() - interval '1 day')`);
const conv = (await run(`select 1`))[0];
const before = (await run(`select count(*)::int n from t3a_oversight_log`))[0].n;
const noBasis = await as("authenticated", AD, `select t3a_oversight_read_messages(gen_random_uuid(), 'x')`, false); rec("DT-36", "an oversight read without a basis is refused", /OVERSIGHT_BASIS_REQUIRED/.test(noBasis.msg), noBasis.msg.slice(0, 80));
const notHolder = await as("authenticated", P, `select t3a_oversight_read_messages(gen_random_uuid(), 'investigating a report')`, false); rec("DT-36", "a person who is not an oversight holder cannot read content", /OVERSIGHT_NOT_A_HOLDER/.test(notHolder.msg), notHolder.msg.slice(0, 80));
const rd = await as("authenticated", AD, `select t3a_oversight_read_messages(gen_random_uuid(), 'investigating a reported message') r`, true);
const after = await run(`select entry_id, holder_id, occurred_at, action_code, subject_kind, subject_id, basis from t3a_oversight_log where holder_id='${AD}' order by entry_seq desc limit 1`);
rec("DT-36", "an oversight read of a message writes a log row with person, time, subject and basis", rd.msg === "ok" && after.length === 1 && after[0].basis && after[0].subject_kind && after[0].occurred_at && after[0].holder_id === AD, rd.msg.slice(0, 80) || after[0]);
const rn = await run(`select count(*)::int n from t3a_oversight_log`); rec("DT-36", "the log grew by one row for the read", rn[0].n === before + 1, [before, rn[0].n]);
// DT-37
const sched = await run(`select retention_class::text c from t3a_retention_schedule where counsel_ratified_at is null limit 1`);
const r0 = await refusals("COUNSEL_NOT_RATIFIED");
const d1 = await svc(`select t3a_attempt_destruction('${sched[0].c}') r`, true); rec("DT-37", "a destruction run with counsel_ratified_at null is refused and logged; nothing destroyed", d1.rows[0]?.r?.reason === "COUNSEL_NOT_RATIFIED" && (await refusals("COUNSEL_NOT_RATIFIED")) === r0 + 1 && (await run(`select count(*)::int n from t3a_destruction_event`))[0].n === 0, d1.rows[0]?.r || d1.msg.slice(0, 80));
await run(`update t3a_retention_schedule set counsel_ratified_at = now() where retention_class::text='${sched[0].c}'`);
const d2 = await svc(`select t3a_attempt_destruction('${sched[0].c}') r`, true); rec("DT-37", "even when ratified the destruction route is a closed socket, logged, nothing destroyed", d2.rows[0]?.r?.reason === "DESTRUCTION_ROUTE_CLOSED" && (await run(`select count(*)::int n from t3a_destruction_event`))[0].n === 0, d2.rows[0]?.r || d2.msg.slice(0, 80));
await run(`update t3a_retention_schedule set counsel_ratified_at = null where retention_class::text='${sched[0].c}'`);
const noc = await svc(`select t3a_attempt_destruction('no_such_class') r`, true); rec("DT-37", "an unknown retention class is refused", noc.rows[0]?.r?.reason === "RETENTION_CLASS_UNKNOWN", noc.rows[0]?.r || noc.msg.slice(0, 80));
const sock = await as(null, null, `insert into t3a_retention_run_socket(destruction_run_id) values (gen_random_uuid())`, false); rec("DT-37", "the destruction and anonymization run table refuses every write", /SOCKET_ROUTE_CLOSED/.test(sock.msg), sock.msg.slice(0, 70));
// DT-54
const rid = randomUUID(); await run(`insert into t3a_legal_hold(resource_type, resource_id) values ('observation','${rid}')`);
const h = await svc(`select t3a_attempt_destruction('${sched[0].c}','observation','${rid}') r`, true); rec("DT-54", "with a legal hold in place the run skips the resource, untouched, and is logged", h.rows[0]?.r?.reason === "LEGAL_HOLD" && (await refusals("LEGAL_HOLD")) >= 1, h.rows[0]?.r || h.msg.slice(0, 80));
await run(`update t3a_legal_hold set released_at = now() where resource_id='${rid}'`); const rel = await as(null, null, `update t3a_legal_hold set released_at = now() + interval '1 day' where resource_id='${rid}'`, false); rec("DT-54", "a hold's release time is set once", /SET_ONCE/.test(rel.msg), rel.msg.slice(0, 70));
// DT-38
const badReg = (await run(`select t3a_record_deployment_verification('us','ca') r`))[0].r; rec("DT-38", "a hosting or backup region other than ca is refused and logged", badReg.reason === "REGION_NOT_CA", badReg);
const okReg = await svc(`select t3a_record_deployment_verification('ca','ca') r`, true); const cfg = (await run(`select hosting_region, backup_region from t3a_deployment_config`))[0];
rec("DT-38", "hosting_region and backup_region = ca and system.deployment_verified is recorded", okReg.rows[0]?.r?.outcome === "verified" && cfg.hosting_region === "ca" && cfg.backup_region === "ca" && (await run(`select count(*)::int n from t3a_event_log where event_name='system.deployment_verified'`))[0].n >= 1, okReg.rows[0]?.r || okReg.msg.slice(0, 100));
const regBad = await as(null, null, `update t3a_deployment_config set hosting_region='us'`, false); rec("DT-38", "the configuration cannot be set to another region", /check|violat/i.test(regBad.msg), regBad.msg.slice(0, 70));
// DT-39
const unset = (await run(`select t3a_deployment_value('mentor_invitation_ttl') r`))[0].r; rec("DT-39", "an unset required value refuses its route, logged, no default", unset.reason === "CONFIGURATION_UNSET" && unset.value === undefined, unset);
await run(`update t3a_deployment_config set mentor_invitation_ttl = 604800`); const set = (await run(`select t3a_deployment_value('mentor_invitation_ttl') r`))[0].r; rec("DT-39", "once set, the value is returned", set.value === 604800, set);
await run(`update t3a_deployment_config set mentor_invitation_ttl = null`); const unset2 = (await run(`select t3a_deployment_value('mentor_invitation_ttl') r`))[0].r; rec("DT-39", "removing the value makes the route refuse again", unset2.reason === "CONFIGURATION_UNSET", unset2);
const zero = await as(null, null, `update t3a_deployment_config set stage_entry_hold_ttl = 0`, false); rec("DT-39", "a zero or negative timing value is refused", /check|violat/i.test(zero.msg), zero.msg.slice(0, 70));
// DT-59
const ok = await svc(`select t3a_emit_first('governance.control_operated','SYSTEM_SERVICE','svc','system_service','event', gen_random_uuid(), jsonb_build_object('control_run_id', gen_random_uuid()), 'ef-${RUN}-1') r`, true); rec("DT-59", "with the store available the event is emitted first and the action may proceed", ok.rows[0]?.r?.outcome === "emitted", ok.rows[0]?.r || ok.msg.slice(0, 100));
const j0 = (await run(`select count(*)::int n from t3a_error_journal`))[0].n;
const fail = await svc(`select t3a_emit_first('not.a.registered.event','SYSTEM_SERVICE','svc','system_service','event', gen_random_uuid(), '{}'::jsonb, 'ef-${RUN}-2', 'parent-123') r`, true);
const jr = await run(`select error_journal_id, event_name, parent_ref, reconciled_event_id from t3a_error_journal order by error_journal_written_at desc limit 1`);
rec("DT-59", "when the event cannot be written the parent action is refused and an error journal row is kept outside the event log", fail.rows[0]?.r?.outcome === "refused" && fail.rows[0].r.reason === "EVENT_STORE_UNAVAILABLE" && (await run(`select count(*)::int n from t3a_error_journal`))[0].n === j0 + 1 && jr[0].parent_ref === "parent-123", fail.rows[0]?.r || fail.msg.slice(0, 100));
const rcn = await svc(`select t3a_reconcile_journal('${jr[0].error_journal_id}','governance.control_operated','SYSTEM_SERVICE','svc','system_service','event', gen_random_uuid(), jsonb_build_object('control_run_id', gen_random_uuid())) r`, true);
rec("DT-59", "on recovery the journal row is reconciled to the emitted event", rcn.rows[0]?.r?.outcome === "reconciled" && (await run(`select reconciled_event_id from t3a_error_journal where error_journal_id='${jr[0].error_journal_id}'`))[0].reconciled_event_id !== null, rcn.rows[0]?.r || rcn.msg.slice(0, 100));
const again = await as(null, null, `update t3a_error_journal set reconciled_event_id = gen_random_uuid() where error_journal_id='${jr[0].error_journal_id}'`, false); rec("DT-59", "a reconciled journal row cannot be re-pointed", /SET_ONCE/.test(again.msg), again.msg.slice(0, 70));
// structure
const inc = await as(null, null, `insert into t3a_incident(severity, affected_record_count) values ('catastrophic', 1)`, false); rec("P-incident", "an incident severity outside the four listed values is refused", /check|violat/i.test(inc.msg), inc.msg.slice(0, 70));
const incOk = await as(null, null, `insert into t3a_incident(severity, affected_record_count) values ('high', 12) returning incident_id`, false); rec("P-incident", "an incident is recorded with severity and count", incOk.msg === "ok", incOk.msg.slice(0, 70));
const sup = await as(null, null, `insert into t3a_suppression(suppression_reason) values ('because')`, false); rec("P-suppress", "a suppression reason outside the four listed values is refused", /check|violat/i.test(sup.msg), sup.msg.slice(0, 70));
const supOk = await as(null, null, `insert into t3a_suppression(suppression_reason) values ('small_n') returning suppression_id`, false); rec("P-suppress", "a listed suppression reason is recorded", supOk.msg === "ok", supOk.msg.slice(0, 70));
const pa = await as(null, null, `insert into t3a_privileged_access(actor_id, access_basis) values ('${AD}','incident_response') returning privileged_access_id`, false); rec("P-priv", "privileged access is recorded with its basis", pa.msg === "ok", pa.msg.slice(0, 70));
const cr = await as(null, null, `insert into t3a_control_run(control_code, result) values ('chain_verify','pass') returning control_run_id`, false); rec("P-control", "a control run is recorded", cr.msg === "ok", cr.msg.slice(0, 70));
const mapP = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'P.%'`))[0].n; rec("DT-01(P)", "all 30 Domain P fields mapped", mapP === 30, mapP);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
