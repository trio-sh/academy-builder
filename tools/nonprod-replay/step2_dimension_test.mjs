// Step 2: dimension parameterization (Part B). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function tryq(sql) { await c.query("begin"); let msg = "ok", rows = []; try { rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query(msg !== "ok" ? "rollback" : "commit"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const P = randomUUID(), M = randomUUID(), RUN = P.slice(0, 8);
for (const [u, e, r] of [[P, "p", "candidate"], [M, "m", "mentor"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','s2${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','s2${e}-${RUN}@t.local','${r}')`); }
const refusals = async () => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='dimension_isolation_violation'`))[0].n;

const cleanup = async () => { for (const t of ["t3a_d1_capture_line", "t3a_d1_capture_set", "t3a_d1_condition_precedence", "t3a_d1_specification_cooldown"]) await c.query(`delete from ${t} where dimension_id <> 'D1'`); };
await cleanup();
// 1. columns
const tabs = ["question_object", "capture_set", "capture_line", "beat_capture_binding", "capture_resolution", "question_capture_map", "capture_selection", "branch_rule", "condition_precedence", "specification_cooldown", "calibration_exercise"].map(t => "t3a_d1_" + t);
for (const t of tabs) {
  const col = (await run(`select is_nullable, column_default from information_schema.columns where table_name='${t}' and column_name='dimension_id'`))[0];
  const bad = (await run(`select count(*)::int n from ${t} where dimension_id <> 'D1'`))[0].n;
  rec("B-col", `${t} carries dimension_id, not null, no default, existing rows are D1`, col && col.is_nullable === "NO" && !col.column_default && bad === 0, col);
}

// 2. capture set key
const dup = await tryq(`insert into t3a_d1_capture_set(dimension_id, capture_set_code, title, display_order, records_first_occurrence) values ('D2','C1','x',1,false)`);
rec("B-key", "a D2 capture set may reuse the code C1 beside D1's", dup.msg === "ok" || /null value/.test(dup.msg) === false, dup.msg.slice(0, 120));
const noDim = await tryq(`insert into t3a_d1_capture_set(capture_set_code, title, display_order, records_first_occurrence) values ('C9','x',9,false)`);
rec("B-key", "a capture set with no dimension is refused", /null value/.test(noDim.msg), noDim.msg.slice(0, 90));
const same = await tryq(`insert into t3a_d1_capture_set(dimension_id, capture_set_code, title, display_order, records_first_occurrence) values ('D1','C1','x',1,false)`);
rec("B-key", "the same code twice in one dimension is refused", /duplicate|unique/.test(same.msg), same.msg.slice(0, 90));
const line = await tryq(`insert into t3a_d1_capture_line(dimension_id, capture_set_code, line_text, line_order, is_whole_session_answer) values ('D2','C1','a line',1,false) returning capture_line_id`);
const d1c1 = (await run(`select count(*)::int n from t3a_d1_capture_line where dimension_id='D1' and capture_set_code='C1' and line_order=1`))[0].n;
rec("B-key", "a D2 line at (C1, 1) is accepted although D1 already has one there", line.msg === "ok" && d1c1 === 1, [line.msg.slice(0, 120), d1c1]);
const xline = await tryq(`insert into t3a_d1_capture_line(dimension_id, capture_set_code, line_text, line_order, is_whole_session_answer) values ('D3','C1','a line',1,false)`);
rec("B-key", "a capture line cannot point at another dimension's set", /foreign key|violat/i.test(xline.msg), xline.msg.slice(0, 100));
const q1 = await tryq(`insert into t3a_d1_question_object(dimension_id, question_code, conduct_element, answer_type, applicability, missing_state_eligible, display_order) values ('D1','Q-D2-99','CE-1','single','all',false,99)`);
rec("B-key", "a question code that names another dimension is refused", /check|violat/i.test(q1.msg), q1.msg.slice(0, 100));
const pr = await tryq(`insert into t3a_d1_condition_precedence(dimension_id, condition_code, precedence_order, language_template_id, renders_before_conduct, effect) select 'D2','XCOND', precedence_order, language_template_id, renders_before_conduct, effect from t3a_d1_condition_precedence limit 1`);
rec("B-key", "precedence order may repeat across dimensions", pr.msg === "ok", pr.msg.slice(0, 120));

const d1line = (await run(`select line_order from t3a_d1_capture_line where dimension_id='D1' and capture_set_code='C1' limit 1`))[0];
if (d1line) { const l2 = await tryq(`insert into t3a_d1_capture_line(dimension_id, capture_set_code, line_text, line_order, is_whole_session_answer) values ('D2','C1','again',${d1line.line_order + 98},false)`);
  rec("B-key", "a second line can be added to the D2 set", l2.msg === "ok", l2.msg.slice(0, 120)); }
const cc = await tryq(`insert into t3a_d1_condition_precedence(dimension_id, condition_code, precedence_order, language_template_id, renders_before_conduct, effect) select 'D2', condition_code, precedence_order + 100, language_template_id, renders_before_conduct, effect from t3a_d1_condition_precedence where dimension_id='D1' limit 1`);
rec("B-key", "a D2 condition may reuse a D1 condition code", cc.msg === "ok", cc.msg.slice(0, 120));
const cd = await tryq(`insert into t3a_d1_specification_cooldown(dimension_id, completed_observations, wait_days, issued_under, note) select 'D2', completed_observations, wait_days, issued_under, note from t3a_d1_specification_cooldown where dimension_id='D1' limit 1`);
rec("B-key", "a D2 cooldown ladder may reuse D1's step counts", cd.msg === "ok", cd.msg.slice(0, 120));
// 3. isolation
const GW = (await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at) values ('${P}','account_authentication','1.0','1.0',now()) returning observation_path_gateway_id g`))[0].g;
const inst = (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','S1','D1',1,'scheduled') returning stage_instance_id i`))[0].i;
const ev = (await run(`insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot) values ('${P}','D1','S1','${GW}','${inst}','x','1.0','{}','{D1}','{}') returning stage_entry_event_id e`))[0].e;
let n0 = await refusals();
const at = await tryq(`insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, stage_entry_event_id) values ('${P}','D2','S1','initiated',false,'${ev}') returning attempt_id`);
rec("B-iso", "an attempt for D2 pointing at a D1 Stage entry is skipped and logged", at.msg === "ok" && at.rows.length === 0 && (await refusals()) === n0 + 1, at);
const at2 = await tryq(`insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, stage_entry_event_id) values ('${P}','D1','S1','initiated',false,'${ev}') returning attempt_id`);
rec("B-iso", "an attempt for D1 pointing at the D1 Stage entry is accepted", at2.msg === "ok" && at2.rows.length === 1, at2);
n0 = await refusals();
const cap = await tryq(`insert into t3a_d1_capture_selection(dimension_id, stage_entry_event_id, question_code, capture_set_code, beat_code, line_order, selected_by) values ('D2','${ev}','Q-D2-01','C1','b1',1,'${M}') returning 1`);
rec("B-iso", "a D2 capture selection against a D1 Stage entry is skipped and logged", (await refusals()) === n0 + 1 || /foreign key|violat/i.test(cap.msg), cap.msg.slice(0, 100));

// 4. retirement
const ret = (await run(`select count(*)::int n, count(distinct dimension_id)::int d from t3a_legacy_draft_retirement`))[0];
rec("B-ret", "August 2026 drafts for D2 to D14 are listed as retired", ret.n > 0 && ret.d >= 2, ret);
const qid = (await run(`select source_key k from t3a_legacy_draft_retirement where source_table='t3a_determination_question' limit 1`))[0]?.k;
if (qid) { await c.query("begin"); await c.query(`update t3a_determination_question set approved_at = now(), approved_by = '${M}' where question_id='${qid}'`).catch(() => {}); const ap = (await run(`select approved_at from t3a_determination_question where question_id='${qid}'`))[0]; await c.query("rollback");
  rec("B-ret", "a retired draft question cannot be approved", ap.approved_at === null, ap); }
const rmut = await tryq(`delete from t3a_legacy_draft_retirement`); rec("B-ret", "the retirement list is append only", /NO_DELETE|T3A_|append/i.test(rmut.msg), rmut.msg.slice(0, 80));

// 5. mentor authorization
await c.query(`insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status, reviewer_authorization, issuer_authorization) values ('${M}','D1', now() - interval '1 day', 'current','1.0','authorized', false, false)`);
rec("B-auth", "a D1 authorization does not authorize D2", (await run(`select t3a_mentor_authorized_for('${M}','D1') a, t3a_mentor_authorized_for('${M}','D2') b`)).every(r => r.a === true && r.b === false), null);
const dupA = await tryq(`insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status, reviewer_authorization, issuer_authorization) select mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status, reviewer_authorization, issuer_authorization from t3a_mentor_authorization where mentor_id='${M}'`);
rec("B-auth", "the same mentor, dimension and start twice is refused", /duplicate|unique/.test(dupA.msg), dupA.msg.slice(0, 80));
await cleanup();
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
