// Day 1 step 11.1.13 probes (DT-29, DT-63, Domain J). Throwaway database only.
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
const P = randomUUID(), Q = randomUUID(), M = randomUUID(), E = randomUUID(), AD = randomUUID(), RUN = P.slice(0, 8);
for (const [u, e, r] of [[P, "p", "candidate"], [Q, "q", "candidate"], [M, "m", "mentor"], [E, "e", "employer"], [AD, "a", "admin"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','j${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','j${e}-${RUN}@t.local','${r}')`); }
// participant notebook
const w = await as("authenticated", P, `insert into t3a_growth_log_entry(entry_kind, text) values ('practice_note', 'I rushed the opening; slow down next time') returning entry_id, created_by, text_capture_state`, true);
rec("J-own", "a participant writes a practice note; created_by is them; capture state captured", w.msg === "ok" && w.rows[0].created_by === P && w.rows[0].text_capture_state === "captured", w.msg.slice(0, 100) || w.rows[0]);
const eid = w.rows[0]?.entry_id;
const upd = await as("authenticated", P, `update t3a_growth_log_entry set text = 'Revised note' where entry_id='${eid}' returning updated_at`, true); rec("J-own", "a participant edits their note", upd.msg === "ok" && upd.rows.length === 1, upd.msg.slice(0, 80));
const forge = await as("authenticated", P, `insert into t3a_growth_log_entry(entry_kind, text, created_by) values ('practice_note','x','${Q}')`); rec("J-own", "a participant cannot write a note as someone else", forge.msg !== "ok", forge.msg.slice(0, 90));
const badKind = await as("authenticated", P, `insert into t3a_growth_log_entry(entry_kind, text) values ('platform_summary','x')`); rec("J-own", "an entry kind outside practice_note and rehearsal_reference is refused", /check|violat/i.test(badKind.msg), badKind.msg.slice(0, 80));
const chg = await as("authenticated", P, `update t3a_growth_log_entry set entry_kind='rehearsal_reference' where entry_id='${eid}'`); rec("J-own", "the entry kind and author cannot change after writing", /permission denied|IMMUTABLE/.test(chg.msg), chg.msg.slice(0, 80));
// DT-29
for (const [who, id, role] of [["participant", P, "authenticated"], ["another participant", Q, "authenticated"], ["mentor", M, "authenticated"], ["employer", E, "authenticated"], ["administrator", AD, "authenticated"]]) {
  const r = await as(role, id, `select count(*)::int n from t3a_growth_log_entry`); const n = r.rows[0]?.n;
  rec("DT-29", `${who} reads the Growth Log: ${who === "participant" ? "sees only their own note" : "no content returned"}`, who === "participant" ? n === 1 : n === 0, n);
}
const anon = await as("anon", P, `select 1 from t3a_growth_log_entry`); rec("DT-29", "anonymous callers have no read path", /permission denied/.test(anon.msg), anon.msg.slice(0, 70));
const legacy = await run(`select count(*)::int n from growth_log_entries`);
for (const [who, id] of [["mentor", M], ["employer", E], ["administrator", AD], ["another participant", Q]]) { const r = await as("authenticated", id, `select count(*)::int n from growth_log_entries`); rec("DT-29", `${who} reading the older platform Growth Log table sees nothing`, r.rows[0]?.n === 0, r.rows[0]); }
// platform writes nothing
const before = (await run(`select count(*)::int n from growth_log_entries`))[0].n;
const d1 = await as("authenticated", P, `insert into growth_log_entries(candidate_id, event_type, title) values ('${P}', (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='growth_log_entries' and column_name='event_type'`))[0].u}))[1], 'Auto entry')`, true);
const after = (await run(`select count(*)::int n from growth_log_entries`))[0].n;
rec("DT-63", "a platform insert into the older Growth Log is discarded without an error, and logged", d1.msg === "ok" && after === before && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='PLATFORM_WRITE_DISCARDED'`))[0].n >= 1, { before, after, msg: d1.msg.slice(0, 60) });
const fn = await as("authenticated", P, `select add_growth_log_entry('${P}', 'training', 'Auto entry') x`); const after2 = (await run(`select count(*)::int n from growth_log_entries`))[0].n;
rec("DT-63", "the platform function that used to write entries now writes none", after2 === before, { fn: fn.msg.slice(0, 60), after2 });
// observation view
const sv = (await run(`insert into t3a_source_version(scenario_class, version_label, source_version_hash, compatibility_class, dimensions_in_play, relevant_conduct, irrelevant_conduct, stated_standard, permitted_administration_variance, unsupported_inferences, cross_context_map, min_seconds, max_seconds, source_status, approval_record_id, approval_authority, version_change_reason) values ('observation_ready','j','${"a".repeat(64)}','A','["D1"]','{}','{}','s','v','{}','{}',60,600, 'authored_not_approved', gen_random_uuid(), 'fixture', 'fixture') returning source_version_id i`))[0].i;
const si = (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','S1','D1',1,'scheduled') returning stage_instance_id i`))[0].i;
const enums = (await run(`select (enum_range(null::t3a_contemporaneity))[1] ct, (enum_range(null::t3a_evidence_class))[1] ec, (enum_range(null::t3a_comparability_class))[1] cc, (enum_range(null::t3a_integrity_status))[1] it`))[0];
await run(`insert into t3a_observation(participant_id, stage_code, dimension_id, source_version_id, attempt_no, occurred_at, stage_instance_id, descriptor_version, contemporaneity, evidence_class, comparability_class, integrity_status, served_instance_id, captured_at, capture_delay_seconds, observer_role, observer_authorization_snapshot_ref, s1_human_confirmation_actor_id, s1_human_confirmation_at, s3_submission_provenance, data_source, record_snapshot_hash, evidence_currency_expires_at, session_serving_state, session_admin_state, question_serving_state, branch_trigger_ref, observation_authorization_ref, observer_calibration_version, observer_independence_state, reviewer_independence_state) values ('${P}','S1','D1','${sv}',1,now(),'${si}','1.0','${enums.ct}','${enums.ec}','${enums.cc}','${enums.it}', gen_random_uuid(), now(), 0, 'primary_observer', gen_random_uuid(), gen_random_uuid(), now(), '{}'::jsonb, 'observed', repeat('c',64), now() + interval '1 year', 'served', 'normal', 'direct', gen_random_uuid(), gen_random_uuid(), '1.0', 'independent', 'independent')`);
const glBefore = (await run(`select (select count(*)::int from growth_log_entries) a, (select count(*)::int from t3a_growth_log_entry where created_by='${P}') b`))[0];
const view = await as("authenticated", P, `select * from t3a_growth_log_observation_view`); const viewQ = await as("authenticated", Q, `select * from t3a_growth_log_observation_view`);
rec("DT-63", "after an observation is committed, no Growth Log row was written", glBefore.a === before && glBefore.b === 1, glBefore);
rec("DT-63", "the participant's view shows the observation regenerated from the canonical record; another participant sees none", view.rows.length === 1 && viewQ.rows.length === 0, { own: view.rows.length, other: viewQ.rows.length });
rec("DT-63", "the view carries no score, trend or progress column", !Object.keys(view.rows[0] || {}).some(k => /score|trend|progress|tier|rating/.test(k)), Object.keys(view.rows[0] || {}));
const mapJ = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'J.%'`))[0].n; rec("DT-01(J)", "all 8 Domain J fields mapped", mapJ === 8, mapJ);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
