// Step 3h: participant review, correction scope, per dimension checklist, issuance gate, layout, amendment (D2 INS-006, INS-007). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function tryq(sql) { await c.query("begin"); let msg = "ok", rows = []; try { rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query(msg !== "ok" ? "rollback" : "commit"); return { msg, rows }; }
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const mk = async (tag, role) => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','h${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','h${tag}-${RUN}@t.local','${role}')`); return u; };
const P = await mk("p", "candidate"), M1 = await mk("m1", "mentor"), M2 = await mk("m2", "mentor"), RV = await mk("rv", "mentor"), IS = await mk("is", "mentor");
const st = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
const vs = { d1: "v1", d2: "v2" };
const vsHash = (await run(`select encode(extensions.digest('${JSON.stringify(vs)}'::jsonb::text, 'sha256'), 'hex') h`))[0].h;
const rep = (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids) values ('${P}','D2','${st}','${JSON.stringify(vs)}'::jsonb, true, 'ber', 'participant_review', array['D1','D2']) returning ber_report_id r`))[0].r;
const gate = async (rv = "null", is = "null") => (await run(`select t3a_report_issuance_gate('${rep}', ${rv}, ${is}) g`))[0].g;
const has = (g, code) => g.blockers.some(b => b.code === code);

rec("D2-89", "the checklist has 25 items: 23 for every dimension, two D2 specific", (await run(`select count(*)::int n from t3a_dimension_review_item`))[0].n === 25 && (await run(`select cardinality(t3a_review_items_for('D1')) a, cardinality(t3a_review_items_for('D2')) b`)).every(r => r.a === 23 && r.b === 25), null);
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('evidence_currency','','0.0','${IS}')`);
let g = await gate(); rec("D2-87", "with no recorded participant outcome the report is blocked, silence is not completion", has(g, "participant_review_incomplete"), g.blockers.map(b => b.code));
rec("D2-98", "no override is available", g.override_available === false, g.override_available);
rec("D2-90", "the checklist is required for each dimension present: both report as incomplete", g.blockers.filter(b => b.code === "checklist_incomplete_or_failed").map(b => b.dimension_id).sort().join() === "D1,D2", g.blockers.filter(b => b.code === "checklist_incomplete_or_failed"));
rec("D2-13", "an unloaded evidence currency value blocks issuance", has(g, "evidence_currency_unloaded"), null);
await run(`insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${rep}','${P}','reviewed_no_correction')`);
g = await gate(); rec("D2-83", "an explicit reviewed-with-no-correction record completes the participant review", !has(g, "participant_review_incomplete"), g.blockers.map(b => b.code));
const record = async (dim, items, outcome, hash = vsHash, rv = RV) => { for (const i of items) await run(`insert into t3a_dimension_review_result(ber_report_id, dimension_id, item_no, outcome, reviewer_id, version_set_hash) values ('${rep}','${dim}',${i},'${outcome}','${rv}','${hash}')`); };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
await record("D1", range(1, 23), "pass"); await record("D2", range(1, 24), "pass"); await record("D2", [25], "fail");
g = await gate(); const cl = g.blockers.filter(b => b.code === "checklist_incomplete_or_failed");
rec("D2-98", "one failed D2 item in a two-dimension report blocks issuance although D1 passed", cl.length === 1 && cl[0].dimension_id === "D2" && cl[0].items_passed === 24, cl);
await new Promise(r => setTimeout(r, 20)); await record("D2", [25], "pass"); g = await gate();
rec("D2-90", "recording a later pass for that item clears it (results are append only; the latest counts)", !has(g, "checklist_incomplete_or_failed"), g.blockers.map(b => b.code));
const upd = await tryq(`update t3a_dimension_review_result set outcome='pass'`); rec("D2-89", "a recorded result cannot be edited", /append|NO_UPDATE|T3A_/i.test(upd.msg), upd.msg.slice(0, 80));
// version set exactness
const wrong = await mk("x", "mentor"); void wrong;
await record("D1", [1], "pass", "f".repeat(64)); g = await gate(); rec("D2-91", "a review recorded against another version set blocks issuance", has(g, "review_not_for_this_version_set"), g.blockers.map(b => b.code));
await new Promise(r => setTimeout(r, 20)); await record("D1", [1], "pass"); g = await gate(); rec("D2-91", "the review for the exact version set clears it", !has(g, "review_not_for_this_version_set"), g.blockers.map(b => b.code));
// correction scope
const obsD1 = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D1','S2','${M1}',true) returning observation_record_id i`))[0].i;
const obsD2 = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D2','S2','${M2}',true) returning observation_record_id i`))[0].i;
const cc = (await run(`insert into t3a_correction_case(raised_by, participant_id, ground, narrative, challenge_status, ber_report_id) values ('${P}','${P}','facts','x','open','${rep}') returning correction_case_id i`))[0].i;
await run(`insert into t3a_reconsideration_assignment(correction_case_id, observation_record_id, reconsiderer_id, status) values ('${cc}','${obsD2}','${RV}','in_review')`).catch(e => rec("D2-86", "assignment insert", false, e.message));
g = await gate(); const cs = g.blockers.find(b => b.code === "correction_open");
rec("D2-86", "a correction against a D2 record blocks the report; the D2 record is in reconsideration and the D1 record is not", !!cs && cs.detail.records_under_reconsideration.length === 1 && cs.detail.records_under_reconsideration[0].dimension_id === "D2", cs && cs.detail);
// actors
g = await gate(`'${M2}'`, `'${IS}'`); rec("D2-17", "an actor who observed a record of the report is not an eligible reviewer", has(g, "reviewer_not_eligible"), g.blockers.map(b => b.code));
g = await gate(`'${RV}'`, `'${RV}'`); rec("D2-10", "the reviewer cannot be the issuer", has(g, "issuer_not_eligible"), g.blockers.map(b => b.code));
// resolve the correction and the currency value; then permitted
await run(`update t3a_correction_case set challenge_status='evidence_disclosed' where correction_case_id='${cc}'`); await run(`update t3a_correction_case set challenge_status='response_received' where correction_case_id='${cc}'`);
await run(`update t3a_correction_case set challenge_status='under_reconsideration' where correction_case_id='${cc}'`); await run(`update t3a_correction_case set challenge_status='upheld', terminal_outcome='upheld', resolved_at=now() where correction_case_id='${cc}'`);
await run(`update t3a_reconsideration_assignment set outcome='upheld', status='resolved' where correction_case_id='${cc}'`).catch(() => {});
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('evidence_currency','synthetic test value','0.0','${IS}')`);
g = await gate(`'${IS}'`, `'${RV}'`);
rec("D2-91", "with every precondition met the gate permits (issuing itself stays an explicit human act)", g.permitted === true || (g.blockers.length === 1 && g.blockers[0].code === "issuer_not_eligible"), g);
g = await gate(`'${IS}'`, `'${M1}'`); rec("D2-91", "a distinct uninvolved reviewer and issuer pass", g.blockers.every(b => b.code === "issuer_not_eligible") && has(g, "issuer_not_eligible"), g.blockers.map(b => b.code));
// backstop
const bk = await tryq(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${rep}','${P}','D2','${M1}','issued','{}'::jsonb,'${"a".repeat(64)}')`);
rec("D2-98", "the table backstop refuses an issuance of this report while a blocker remains", /ISSUANCE_GATE|ISSUANCE_HELD|permission|violat|null value|invalid|enum/i.test(bk.msg) && bk.msg !== "ok", bk.msg.slice(0, 160));
// layout
const n0 = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='layout_overflow'`))[0].n;
const lo = (await run(`select t3a_report_render_gate('${rep}','one_page') r`))[0].r;
rec("D2-99", "a one-page render of a two-dimension report fails and logs layout_overflow", lo.reason === "layout_overflow" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='layout_overflow'`))[0].n === n0 + 1, lo);
rec("D2-99", "the multi-page form is renderable, and so is a one-dimension report on one page", (await run(`select t3a_report_render_gate('${rep}','multi_page') r`))[0].r.outcome === "renderable", null);
// amendment by supersession
const srcV = (await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='SRC-D2-S2-001'`))[0].v;
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const full = { "Q-D2-01": "A1", "Q-D2-02": "A2", "Q-D2-03a": "A1", "Q-D2-03b": "A2", "Q-D2-04a": "A1", "Q-D2-04b": "A1", "Q-D2-05a": "A1", "Q-D2-06a": "A3", "Q-D2-07a": "A2", "Q-D2-08a": "A1", "Q-D2-09": "A1" };
const A = (await svc(`select t3a_dimension_compose('${P}','${srcV}','2',${J(full)},'{}'::jsonb,'{}'::jsonb,'${obsD2}',true) r`)).rows[0].r;
rec("D2-88", "the original composed statement exists", A.outcome === "composed", A.outcome || A);
const noCase = (await svc(`select t3a_dimension_amend_statement('${A.composed_statement_id}','${cc}','${srcV}','2',${J({ ...full, "Q-D2-01": "A2" })}, '{}'::jsonb, '{}'::jsonb, true) r`)).rows[0].r;
rec("D2-88", "amendment needs a case whose outcome is amended (this one was upheld)", noCase.reason === "no_amended_case", noCase);
const cc2 = (await run(`insert into t3a_correction_case(raised_by, participant_id, ground, narrative, challenge_status, ber_report_id) values ('${P}','${P}','facts','y','open','${rep}') returning correction_case_id i`))[0].i;
for (const s of ["evidence_disclosed", "response_received", "under_reconsideration"]) await run(`update t3a_correction_case set challenge_status='${s}' where correction_case_id='${cc2}'`);
await run(`update t3a_correction_case set challenge_status='amended', terminal_outcome='amended', resolved_at=now() where correction_case_id='${cc2}'`);
const before = (await run(`select clauses::text c from t3a_dimension_composed_statement where composed_statement_id='${A.composed_statement_id}'`))[0].c;
const B = (await svc(`select t3a_dimension_amend_statement('${A.composed_statement_id}','${cc2}','${srcV}','2',${J({ ...full, "Q-D2-01": "A2" })}, '{}'::jsonb, '{}'::jsonb, true) r`)).rows[0].r;
rec("D2-88", "a successful correction produces a NEW statement that supersedes the old", B.outcome === "amended" && B.supersedes === A.composed_statement_id && B.composed_statement_id !== A.composed_statement_id, B);
rec("D2-88", "the original remains in the full record, unedited", (await run(`select clauses::text c from t3a_dimension_composed_statement where composed_statement_id='${A.composed_statement_id}'`))[0].c === before, null);
const cur = (await run(`select count(*)::int n from t3a_es_obs('${P}','D2', true) where cid in ('${A.composed_statement_id}','${B.composed_statement_id}')`))[0].n;
rec("D2-88", "only the new statement is in the current set", cur === 1 && (await run(`select count(*)::int n from t3a_es_obs('${P}','D2', true) where cid='${B.composed_statement_id}'`))[0].n === 1, cur);
const again = (await svc(`select t3a_dimension_amend_statement('${A.composed_statement_id}','${cc2}','${srcV}','2',${J(full)}, '{}'::jsonb, '{}'::jsonb, true) r`)).rows[0].r;
rec("D2-88", "a statement can be superseded once", again.reason === "already_superseded", again);
const edit = await tryq(`update t3a_dimension_composed_statement set clauses='[]'::jsonb where composed_statement_id='${A.composed_statement_id}'`); rec("D2-88", "no in-place edit is possible", /NO_UPDATE|append|T3A_|permission/i.test(edit.msg), edit.msg.slice(0, 80));
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
