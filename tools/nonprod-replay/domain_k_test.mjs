// Day 1 step 11.1.14 probes (DT-32, Domain K). Throwaway database only.
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
const P = randomUUID(), M = randomUUID(), E = randomUUID(), RUN = P.slice(0, 8);
for (const [u, e, r] of [[P, "p", "candidate"], [M, "m", "mentor"], [E, "e", "employer"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','k${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','k${e}-${RUN}@t.local','${r}')`); }
const sc = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_rehearsal_session' and column_name='scenario_class'`))[0].u}))[1] s`))[0].s;
const sess = (await run(`insert into t3a_rehearsal_session(participant_id, scenario_class, module_id, module_version, rehearsal_completion_state, response_modality, workplace_moment_id) values ('${P}','${sc}', gen_random_uuid(), '1.0', 'partial', 'text', gen_random_uuid()) returning rehearsal_session_id i, rehearsal_started_at_capture_state s, rehearsal_completed_at_capture_state e`))[0];
rec("K-session", "a rehearsal session is stored with the new module fields; unfinished => completed_at capture state not captured", sess.i && sess.e === "not_captured", sess);
await run(`update t3a_rehearsal_session set ended_at = now() where rehearsal_session_id='${sess.i}'`);
rec("K-state", "setting the completion time fills its capture state", (await run(`select rehearsal_completed_at_capture_state s from t3a_rehearsal_session where rehearsal_session_id='${sess.i}'`))[0].s === "captured");
const badMod = await as(null, null, `update t3a_rehearsal_session set response_modality='telepathy' where rehearsal_session_id='${sess.i}'`, false); rec("K-enum", "a response modality outside the three listed values is refused", /check|violat/i.test(badMod.msg), badMod.msg.slice(0, 80));
const att = (n) => `insert into t3a_rehearsal_attempt(participant_id, rehearsal_session_id, rehearsal_attempt_no, module_completion_state, module_completion_at, reference_examples_viewed_refs, consequence_horizons_displayed) values ('${P}','${sess.i}', 99, 'complete', now(), '{}', '[]') returning rehearsal_attempt_no n`;
const a1 = (await run(att()))[0].n, a2 = (await run(att()))[0].n;
rec("K-attempt", "rehearsal attempts are numbered in sequence whatever number is supplied", a1 === 1 && a2 === 2, [a1, a2]);
const noTime = await as(null, null, `insert into t3a_rehearsal_attempt(participant_id, rehearsal_session_id, rehearsal_attempt_no, module_completion_state) values ('${P}','${sess.i}', 1, 'complete')`, false); rec("K-attempt", "a complete attempt without a completion time is refused", /check|violat/i.test(noTime.msg), noTime.msg.slice(0, 80));
const upd = await as(null, null, `update t3a_rehearsal_attempt set module_completion_state='partial' where participant_id='${P}'`, false); rec("K-attempt", "attempts cannot be edited", /APPEND_ONLY/.test(upd.msg), upd.msg.slice(0, 70));
// feedback
const fb = await run(`insert into t3a_coaching_feedback(rehearsal_session_id, feedback_body, feedback_source_type) values ('${sess.i}','Reference sentence','canned_reference') returning feedback_source_type_capture_state s, feedback_viewed_at_capture_state v`);
rec("K-feedback", "feedback records its source type; unviewed => viewed state not captured", fb[0].s === "captured" && fb[0].v === "not_captured", fb[0]);
// telemetry socket
const tel = await as(null, null, `insert into t3a_rehearsal_telemetry_aggregate(cohort_period, sessions_started, sessions_completed, feedback_generated_count, feedback_acknowledged_count, retake_within_window_count, retake_window_days, duration_distribution, scenario_class) values ('2026-10',1,1,1,1,1,7,'{}','${sc}')`, false); rec("K-socket", "the aggregate telemetry socket refuses every write", /SOCKET_ROUTE_CLOSED/.test(tel.msg), tel.msg.slice(0, 80));
// privacy: owner only
for (const [who, id] of [["participant", P], ["mentor", M], ["employer", E]]) {
  const r1 = await as("authenticated", id, `select count(*)::int n from t3a_rehearsal_session`), r2 = await as("authenticated", id, `select count(*)::int n from t3a_rehearsal_attempt`), r3 = await as("authenticated", id, `select count(*)::int n from t3a_coaching_feedback`);
  const n = [r1, r2, r3].map(r => r.rows[0]?.n);
  rec("DT-29", `${who} reads rehearsal sessions, attempts, feedback: ${who === "participant" ? "own only" : "nothing"}`, who === "participant" ? n.every(x => x >= 1) : n.every(x => x === 0), n);
}
// DT-32
const fw = await run(`select * from t3a_rehearsal_firewall_findings()`); rec("DT-32", "no foreign key joins the evidence store to the rehearsal store, in either direction", fw.length === 0, fw);
const hr = await run(`select count(*)::int n from pg_proc p where p.pronamespace = 'public'::regnamespace and pg_get_functiondef(p.oid) ~* 'has_rehearsed'`); rec("DT-32", "no database function mentions has_rehearsed", hr[0].n === 0, hr[0].n);
const hc = await run(`select count(*)::int n from information_schema.columns where table_schema='public' and column_name ~* 'has_rehearsed'`); rec("DT-32", "no column is named has_rehearsed", hc[0].n === 0, hc[0].n);
const mapK = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'K.%'`))[0].n; rec("DT-01(K)", "all 40 Domain K fields mapped", mapK === 40, mapK);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
