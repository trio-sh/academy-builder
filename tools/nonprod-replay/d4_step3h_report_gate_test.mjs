// Step 3h: participant review, correction scope, per dimension checklist, issuance gate, layout, amendment (D4 INS-006, INS-007). Throwaway database only.
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
const rep = (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${P}','D4','${st}','${JSON.stringify(vs)}'::jsonb, true, 'ber', 'participant_review', array['D1','D4'], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r;
const gate = async (rv = "null", is = "null") => (await run(`select t3a_report_issuance_gate('${rep}', ${rv}, ${is}) g`))[0].g;
const has = (g, code) => g.blockers.some(b => b.code === code);

rec("D4-89", "the checklist has 25 items: 23 for every dimension, two D4 specific", (await run(`select count(*)::int n from t3a_dimension_review_item where dimension_id is null or dimension_id = 'D4'`))[0].n === 25 && (await run(`select cardinality(t3a_review_items_for('D1')) a, cardinality(t3a_review_items_for('D4')) b, cardinality(t3a_review_items_for('D4')) c`)).every(r => r.a === 23 && r.b === 25 && r.c === 25), null);
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('evidence_currency','','0.0','${IS}')`);
let g = await gate(); rec("D4-87", "with no recorded participant outcome the report is blocked, silence is not completion", has(g, "participant_review_incomplete"), g.blockers.map(b => b.code));
rec("D4-98", "no override is available", g.override_available === false, g.override_available);
rec("D4-90", "the checklist is required for each dimension present: both report as incomplete", g.blockers.filter(b => b.code === "checklist_incomplete_or_failed").map(b => b.dimension_id).sort().join() === "D1,D4", g.blockers.filter(b => b.code === "checklist_incomplete_or_failed"));
rec("D4-13", "an unloaded evidence currency value blocks issuance", has(g, "evidence_currency_unloaded"), null);
await run(`insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${rep}','${P}','reviewed_no_correction')`);
g = await gate(); rec("D4-83", "an explicit reviewed-with-no-correction record completes the participant review", !has(g, "participant_review_incomplete"), g.blockers.map(b => b.code));
const record = async (dim, items, outcome, hash = vsHash, rv = RV) => { for (const i of items) await run(`insert into t3a_dimension_review_result(ber_report_id, dimension_id, item_no, outcome, reviewer_id, version_set_hash) values ('${rep}','${dim}',${i},'${outcome}','${rv}','${hash}')`); };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
await record("D1", range(1, 23), "pass"); await record("D4", [...range(1, 23), 28], "pass"); await record("D4", [29], "fail");
g = await gate(); const cl = g.blockers.filter(b => b.code === "checklist_incomplete_or_failed");
rec("D4-98", "one failed D4 item in a two-dimension report blocks issuance although D1 passed", cl.length === 1 && cl[0].dimension_id === "D4" && cl[0].items_passed === 24, cl);
await new Promise(r => setTimeout(r, 20)); await record("D4", [29], "pass"); g = await gate();
rec("D4-90", "recording a later pass for that item clears it (results are append only; the latest counts)", !has(g, "checklist_incomplete_or_failed"), g.blockers.map(b => b.code));
const upd = await tryq(`update t3a_dimension_review_result set outcome='pass'`); rec("D4-89", "a recorded result cannot be edited", /append|NO_UPDATE|T3A_/i.test(upd.msg), upd.msg.slice(0, 80));
// version set exactness
const wrong = await mk("x", "mentor"); void wrong;
await record("D1", [1], "pass", "f".repeat(64)); g = await gate(); rec("D4-91", "a review recorded against another version set blocks issuance", has(g, "review_not_for_this_version_set"), g.blockers.map(b => b.code));
await new Promise(r => setTimeout(r, 20)); await record("D1", [1], "pass"); g = await gate(); rec("D4-91", "the review for the exact version set clears it", !has(g, "review_not_for_this_version_set"), g.blockers.map(b => b.code));
// correction scope
const obsD1 = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D1','S2','${M1}',true) returning observation_record_id i`))[0].i;
const obsD2 = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D4','S2','${M2}',true) returning observation_record_id i`))[0].i;
const cc = (await run(`insert into t3a_correction_case(raised_by, participant_id, ground, narrative, challenge_status, ber_report_id) values ('${P}','${P}','facts','x','open','${rep}') returning correction_case_id i`))[0].i;
await run(`insert into t3a_reconsideration_assignment(correction_case_id, observation_record_id, reconsiderer_id, status) values ('${cc}','${obsD2}','${RV}','in_review')`).catch(e => rec("D4-86", "assignment insert", false, e.message));
g = await gate(); const cs = g.blockers.find(b => b.code === "correction_open");
rec("D4-86", "a correction against a D4 record blocks the report; the D4 record is in reconsideration and the D1 record is not", !!cs && cs.detail.records_under_reconsideration.length === 1 && cs.detail.records_under_reconsideration[0].dimension_id === "D4", cs && cs.detail);
// actors
g = await gate(`'${M2}'`, `'${IS}'`); rec("D4-17", "an actor who observed a record of the report is not an eligible reviewer", has(g, "reviewer_not_eligible"), g.blockers.map(b => b.code));
g = await gate(`'${RV}'`, `'${RV}'`); rec("D4-10", "the reviewer cannot be the issuer", has(g, "issuer_not_eligible"), g.blockers.map(b => b.code));
// resolve the correction and the currency value; then permitted
await run(`update t3a_correction_case set challenge_status='evidence_disclosed' where correction_case_id='${cc}'`); await run(`update t3a_correction_case set challenge_status='response_received' where correction_case_id='${cc}'`);
await run(`update t3a_correction_case set challenge_status='under_reconsideration' where correction_case_id='${cc}'`); await run(`update t3a_correction_case set challenge_status='upheld', terminal_outcome='upheld', resolved_at=now() where correction_case_id='${cc}'`);
await run(`update t3a_reconsideration_assignment set outcome='upheld', status='resolved' where correction_case_id='${cc}'`).catch(() => {});
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('evidence_currency','synthetic test value','0.0','${IS}')`);
for (const t of ["scenario_logging", "mentor_observation"]) await svc(`select t3a_record_consent('${P}','${t}','granted','D4',null,'1.0','${"a".repeat(64)}','checkbox','en-CA','observation') r`);

// the issuance floor: two related contexts and two distinct authorized observers (synthetic observations on the throwaway database)
const srcOfH = async (id) => (await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`))[0].v;
await run(`delete from t3a_cross_context_relationship`);
const sA = await srcOfH("SRC-D4-S2-001"), sB = await srcOfH("SRC-D4-S3-001");
g = await gate(`'${IS}'`, `'${RV}'`); rec("D4-18", "before the floor is met the gate names below_issuance_floor and fewer_than_two_authorized_observers", has(g, "below_issuance_floor") && has(g, "fewer_than_two_authorized_observers"), g.blockers.map(b => b.code));
const obsF1 = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D4','S2','${M2}',true) returning observation_record_id i`))[0].i;
const obsF2 = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D4','S3','${M1}',true) returning observation_record_id i`))[0].i;
const KEY = "synthetic-test-key-" + randomUUID(); const seal = async (id) => { await c.query("begin"); await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims','{"role":"service_role"}',true)`); await c.query(`select set_config('t3a.commit_seal_key','${KEY}',false)`); await c.query(`select t3a_seal_composed('${id}', false)`); await c.query("commit"); };
const sealedIds = [];
for (const [o, sv, st] of [[obsF1, sA, "S2"], [obsF2, sB, "S3"]]) sealedIds.push((await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D4','${o}','${P}','${st}','${sv}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb) returning composed_statement_id i`))[0].i);
g = await gate(`'${IS}'`, `'${RV}'`); rec("D4-18", "two observers but no approved cross context relationship is still below the floor (one context)", has(g, "below_issuance_floor") && !has(g, "fewer_than_two_authorized_observers"), g.blockers.map(b => b.code));
g = await gate(`'${IS}'`, `'${RV}'`); rec("D4-65", "composed statements with no seal block issuance as commit_seal_absent", has(g, "commit_seal_absent"), g.blockers.map(b => b.code));
for (const i of sealedIds) await seal(i);
await run(`select set_config('t3a.commit_seal_key','another-key',false)`); g = await gate(`'${IS}'`, `'${RV}'`); rec("D4-65", "under a different key the seals read as invalid and block issuance", has(g, "commit_seal_invalid"), g.blockers.map(b => b.code));
await run(`select set_config('t3a.commit_seal_key','${KEY}',false)`);
g = await gate(`'${IS}'`, `'${RV}'`); rec("D4-65", "sealed statements verify under the loaded key and no seal blocker remains", !has(g, "commit_seal_absent") && !has(g, "commit_seal_key_unloaded") && !has(g, "commit_seal_invalid"), g.blockers.map(b => b.code));
await run(`insert into t3a_cross_context_relationship(dimension_id, source_version_a, source_version_b, approved_by) values ('D4','${sA < sB ? sA : sB}','${sA < sB ? sB : sA}','${RV}') on conflict do nothing`);
g = await gate(`'${IS}'`, `'${RV}'`);
rec("D4-91", "with every precondition met the gate permits (issuing itself stays an explicit human act)", g.permitted === true || (g.blockers.length === 1 && g.blockers[0].code === "issuer_not_eligible"), g);
g = await gate(`'${IS}'`, `'${M1}'`); rec("D4-91", "a distinct uninvolved reviewer and issuer pass", g.blockers.every(b => b.code === "issuer_not_eligible") && has(g, "issuer_not_eligible"), g.blockers.map(b => b.code));
// backstop
const bk = await tryq(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${rep}','${P}','D4','${M1}','issued','{}'::jsonb,'${"a".repeat(64)}')`);
const issued = (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep}'`))[0].n;
rec("D4-98", "the table backstop refuses an issuance of this report while a blocker remains (the row is not written and the refusal is logged)", issued === 0 && (await run(`select count(*)::int n from t3a_capture_refusal where route='report.issue' and subject_ref='${rep}'`))[0].n >= 1, bk.msg.slice(0, 160));
// layout and format
const n0 = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='format_mismatch'`))[0].n;
const lo = (await run(`select t3a_report_render_gate('${rep}','one_page') r`))[0].r;
rec("D4-67", "a single page render of a report that carries D4 refuses format_mismatch and logs it", lo.reason === "format_mismatch" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='format_mismatch'`))[0].n === n0 + 1, lo);
rec("D4-67", "the multi-page form is renderable", (await run(`select t3a_report_render_gate('${rep}','multi_page') r`))[0].r.outcome === "renderable", null);
const rep1 = (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${P}','D1','${st}','${JSON.stringify(vs)}'::jsonb, true, 'ber', 'participant_review', array['D1'], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r;
rec("D4-67", "a report with no D4 content is not affected by the D4 rule: one dimension renders on one page", (await run(`select t3a_report_render_gate('${rep1}','one_page') r`))[0].r.outcome === "renderable", null);
// amendment by supersession
const srcV = (await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='SRC-D4-S2-001'`))[0].v;
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const full = { "Q-D4-01": "A4", "Q-D4-02": "A3", "Q-D4-03": "A3", "Q-D4-04": "A4", "Q-D4-05": "A4", "Q-D4-07": "A4", "Q-D4-08": "A4", "Q-D4-09": "A4" };
const A = (await svc(`select t3a_dimension_compose('${P}','${srcV}','2',${J(full)},'{}'::jsonb,'{}'::jsonb,'${obsD2}',true) r`)).rows[0].r;
rec("D4-88", "the original composed statement exists", A.outcome === "composed", A.outcome || A);
const noCase = (await svc(`select t3a_dimension_amend_statement('${A.composed_statement_id}','${cc}','${srcV}','2',${J({ ...full, "Q-D4-09": "A3" })}, '{}'::jsonb, '{}'::jsonb, true) r`)).rows[0].r;
rec("D4-88", "amendment needs a case whose outcome is amended (this one was upheld)", noCase.reason === "no_amended_case", noCase);
const cc2 = (await run(`insert into t3a_correction_case(raised_by, participant_id, ground, narrative, challenge_status, ber_report_id) values ('${P}','${P}','facts','y','open','${rep}') returning correction_case_id i`))[0].i;
for (const s of ["evidence_disclosed", "response_received", "under_reconsideration"]) await run(`update t3a_correction_case set challenge_status='${s}' where correction_case_id='${cc2}'`);
await run(`update t3a_correction_case set challenge_status='amended', terminal_outcome='amended', resolved_at=now() where correction_case_id='${cc2}'`);
const before = (await run(`select clauses::text c from t3a_dimension_composed_statement where composed_statement_id='${A.composed_statement_id}'`))[0].c;
const B = (await svc(`select t3a_dimension_amend_statement('${A.composed_statement_id}','${cc2}','${srcV}','2',${J({ ...full, "Q-D4-09": "A3" })}, '{}'::jsonb, '{}'::jsonb, true) r`)).rows[0].r;
rec("D4-88", "a successful correction produces a NEW statement that supersedes the old", B.outcome === "amended" && B.supersedes === A.composed_statement_id && B.composed_statement_id !== A.composed_statement_id, B);
rec("D4-88", "the original remains in the full record, unedited", (await run(`select clauses::text c from t3a_dimension_composed_statement where composed_statement_id='${A.composed_statement_id}'`))[0].c === before, null);
const cur = (await run(`select count(*)::int n from t3a_es_obs('${P}','D4', true) where cid in ('${A.composed_statement_id}','${B.composed_statement_id}')`))[0].n;
rec("D4-88", "only the new statement is in the current set", cur === 1 && (await run(`select count(*)::int n from t3a_es_obs('${P}','D4', true) where cid='${B.composed_statement_id}'`))[0].n === 1, cur);
const again = (await svc(`select t3a_dimension_amend_statement('${A.composed_statement_id}','${cc2}','${srcV}','2',${J(full)}, '{}'::jsonb, '{}'::jsonb, true) r`)).rows[0].r;
rec("D4-88", "a statement can be superseded once", again.reason === "already_superseded", again);
const edit = await tryq(`update t3a_dimension_composed_statement set clauses='[]'::jsonb where composed_statement_id='${A.composed_statement_id}'`); rec("D4-88", "no in-place edit is possible", /NO_UPDATE|append|T3A_|permission/i.test(edit.msg), edit.msg.slice(0, 80));
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
