// Step 3c: D5 resolution service (INS-003 rules 045 to 054). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function as(role, sql) { await c.query("begin"); let msg = "ok", rows = []; try { if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claims', json_build_object('role','${role}')::text, true)`); } rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const core = async (stage, answers, bound = {}) => (await run(`select t3a_resolve_core('D5','${stage}','${JSON.stringify(answers)}'::jsonb,'${JSON.stringify(bound)}'::jsonb,true) r`))[0].r;
const B = { stated_position_count: 1, asked_question_count: 2, named_item_count: 2, proposed_option_count: 1, changed_option_count: 1, used_route_count: 1, agreement_content_count: 2 };

const cov = await run(`select * from t3a_resolution_coverage('D5')`);
const tot = cov.reduce((a, r) => a + Number(r.patterns), 0), gaps = cov.reduce((a, r) => a + Number(r.gap_refusals), 0), amb = cov.reduce((a, r) => a + Number(r.ambiguous), 0);
rec("D5-cov", "coverage: every reachable answer pattern resolves to statements or a designed refusal (no gaps)", tot > 300 && gaps === 0, { patterns: tot, gaps });
rec("D5-cov", "coverage: no pattern resolves to two statements", amb === 0, amb);
const a1 = await core(2, { "Q-D5-01": "A1", "Q-D5-01b": "A2" }, B), a2 = await core(2, { "Q-D5-01": "A1", "Q-D5-01b": "A2" }, B);
rec("D5-res", "same inputs, same output", JSON.stringify(a1) === JSON.stringify(a2) && a1.outcome === "resolved" && a1.statements.length === 2, a1);
rec("D5-res", "statements come back in the fixed question order", JSON.stringify(a1.statements.map(s => s.question_code)) === JSON.stringify(["Q-D5-01", "Q-D5-01b"]), a1.statements.map(s => s.question_code));
const cnt = await core(2, { "Q-D5-02": "A1", "Q-D5-02b": "A1" }, B); rec("D5-res", "a count placeholder is filled from the bound value, never typed", /asked 2 of the questions the situation set out/.test(cnt.statements?.[1]?.text), cnt.statements?.[1]?.text);
const unm = await core(2, { "Q-D5-01": "A9" }, B); rec("D5-res", "an unmapped pattern refuses and nothing is substituted", unm.outcome === "refused" && unm.reason === "no_approved_statement", unm);
const ft = await core(2, { "Q-D5-01": "they spoke up" }, B); rec("D5-res", "free text in place of an answer code refuses", ft.reason === "free_text_or_unknown_value", ft);
const prod = await as("service_role", `select t3a_resolve_observation('D5','2','{"Q-D5-01":"A3"}'::jsonb) r`);
rec("D5-res", "production mode resolves nothing while no statement is approved (fail closed)", prod.rows[0]?.r?.outcome === "refused" && prod.rows[0].r.reason === "no_approved_statement", prod.rows[0]?.r);
const tm = await as("authenticated", `select t3a_resolve_observation('D5','2','{"Q-D5-01":"A3"}'::jsonb,'{}'::jsonb,true) r`); rec("D5-res", "test mode is the service route only", tm.rows[0]?.r?.reason === "TEST_MODE_IS_SERVICE_ONLY", tm.rows[0]?.r || tm.msg);
const iso = await core(2, { "Q-D4-01": "A1" }, B); rec("D5-res", "a D4 question in a D5 resolution refuses as a dimension isolation violation", iso.reason === "dimension_isolation_violation", iso);
const child = await core(2, { "Q-D5-02b": "A1" }, B); rec("D5-res", "an answer on a child whose parent did not serve it refuses", child.reason === "child_not_served", child);
const ms = await core(2, { "Q-D5-01": "missing:declined", "Q-D5-09": "A4" }, B); rec("D5-res", "a posted missing state composes nothing and does not block the rest", ms.outcome === "resolved" && ms.statements.length === 1, ms.statements?.map(s => s.question_code));
const na = await core(2, { "Q-D5-01": "missing:not_applicable" }, B); rec("D5-res", "not_applicable is never posted", na.reason === "missing_state_not_postable", na);
const bv = await core(2, { "Q-D5-02": "A1", "Q-D5-02b": "A1" }, { asked_question_count: 0 }); rec("D5-res", "a count outside the grammar refuses", bv.reason === "bound_variable_invalid", bv);
const t07 = await core(2, { "Q-D5-07": "A3" }, B); rec("D5-06", "Q-D5-07 A3 resolves to ST-D5-034 alone; the unserved child contributes no negative sentence", t07.outcome === "resolved" && t07.statements.length === 1 && t07.statements[0].statement_key === "ST-D5-034", t07.statements?.map(s => s.statement_key));
// D5-04 and D5-61: the resolution rules carry no Stage; a route answer is barred at Stage 1 and Stage 3 by the Stage form check (data: t3a_stage_form_question.stage_codes), and the source marks the questions NOT SERVED
const sfc = async (st, qc) => (await run(`select t3a_stage_form_check('${st}', '[{"question_code":"${qc}","statement_key":"X","text":"the participant used a route the situation made available"}]'::jsonb, 'D5') r`))[0].r;
rec("D5-61", "a route use entry (Q-D5-06) at Stage 1 and at Stage 3 is barred by the Stage form check; at Stage 2 and Stage 4 it is not", (await sfc("1", "Q-D5-06")).outcome === "violation" && (await sfc("3", "Q-D5-06")).outcome === "violation" && (await sfc("2", "Q-D5-06")).outcome === "ok" && (await sfc("4", "Q-D5-06")).outcome === "ok", null);
rec("D5-61", "so is the bound route question Q-D5-06b, and an element served at Stage 1 and 3 (Q-D5-04) is not barred", (await sfc("1", "Q-D5-06b")).outcome === "violation" && (await sfc("3", "Q-D5-06b")).outcome === "violation" && (await sfc("3", "Q-D5-04")).outcome === "ok", null);
const rrOk = await core(2, { "Q-D5-04": "A3", "Q-D5-05": "A1", "Q-D5-05b": "A1" }, B); rec("D5-RR", "Q-D5-04 A3 with Q-D5-05 A1 is permitted: a change to the participant's own position may be stated without proposing anything", rrOk.outcome === "resolved" && rrOk.statements.map(s => s.statement_key).join() === "ST-D5-018,ST-D5-021,ST-D5-025", rrOk.statements?.map(s => s.statement_key) || rrOk);
const rr1 = await core(2, { "Q-D5-01": "A1" }, B); rec("D5-RR", "RR-D5-01: a designated position stated with Q-D5-01b unanswered refuses", rr1.rule === "RR-D5-01" || rr1.reason === "RR-D5-01", rr1);
const contra = await core(2, { "Q-D5-07": "A1", "Q-D5-07b": "A1", "Q-D5-04": "A3", "Q-D5-05": "A4" }, B); rec("D5-RR", "RR-D5-09: an agreement and its recording stated where nothing was proposed and no change was stated refuses", contra.rule === "RR-D5-09" || contra.reason === "RR-D5-09", contra);
const contra2 = await core(2, { "Q-D5-07": "A2", "Q-D5-07b": "A1", "Q-D5-04": "A3", "Q-D5-05": "A4" }, B); rec("D5-RR", "RR-D5-10: an agreement stated with no statement about recording, where nothing was proposed and no change was stated, refuses", contra2.rule === "RR-D5-10" || contra2.reason === "RR-D5-10", contra2);
const rr8 = await core(2, { "Q-D5-07": "A2" }, B); rec("D5-RR", "RR-D5-08: an agreement stated with Q-D5-07b unanswered refuses", rr8.rule === "RR-D5-08" || rr8.reason === "RR-D5-08", rr8);
const before = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='no_approved_statement'`))[0].n;
await as("service_role", `select t3a_resolve_observation('D5','2','{"Q-D5-01":"A3"}'::jsonb) r`);
rec("D5-res", "a refusal on the logged route persists in the refusal log", (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='no_approved_statement'`))[0].n === before + 1, before);
// prohibited output
const chk = async (t) => (await run(`select t3a_prohibited_output_check('D5', $1) r`.replace("$1", `'${t.replace(/'/g, "''")}'`)))[0].r;
let r = await chk("<p>the participant stated as their own a position the situation set out</p>"); rec("D5-64", "a clean statement passes", r.passed === true, r);
r = await chk("the participant asked the colleague a question the situation set out"); rec("D5-69", "a counterpart role label as the object of the participant's act is not refused (only the subject of a verb is)", r.passed === true, r);
for (const w of ["calmly", "politely", "warmly", "defensively"]) { r = await chk("the participant spoke " + w); rec("D5-64", "a manner word fails (" + w + ")", r.passed === false, r); }
for (const w of ["resolved", "settled", "conceded", "persuaded", "reconciled", "repaired", "built rapport", "brought round"]) { r = await chk("the participant " + w + " the matter"); rec("D5-64", "an outcome verb fails (" + w + ")", r.passed === false && r.findings.some(f => f.rule === "retired_or_prohibited_vocabulary"), r); }
for (const w of ["collaborative", "difficult", "rigid", "flexible", "team player", "will", "would", "always", "never", "likely"]) { r = await chk("the participant was " + w); rec("D5-64", "a trait, modal or prediction word fails (" + w + ")", r.passed === false, r); }
for (const s of ["the colleague declined the proposal", "The other team refused", "the manager would not move", "the participant stated a position and the lead decides", "the participant stated a position, the chair takes the decision"]) { r = await chk(s); rec("D5-64", "a sentence whose subject is a counterpart role label fails as counterpart_as_subject: " + s, r.passed === false && r.findings.some(f => f.rule === "counterpart_as_subject"), r); }
r = await chk("the participant gave a strong response"); rec("D5-64", "a closed-list evaluative phrase fails (strong response)", r.passed === false, r);
for (const w of ["owned", "caused", "blamed", "prioritized", "verified"]) { r = await chk("the participant " + w + " the matter"); rec("D5-64", "a word that belongs to another dimension fails as cross_dimension_assertion (" + w + ")", r.passed === false && r.findings.some(f => f.rule === "cross_dimension_assertion"), r); }
r = await chk("<span>★★★☆☆</span>"); rec("D5-63", "stars fail", r.passed === false, r);
r = await chk("the participant gave a red flag"); rec("D5-63", "a flag wording is rejected (red flag)", r.passed === false, r);
r = await chk("the candidate attended"); rec("D5-63", "a retired term fails (candidate)", r.passed === false, r);
const bad = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D5' and (t3a_prohibited_output_check('D5', statement_body) ->> 'passed')::boolean is not true`);
rec("D5-64", "every D5 Recorded Conduct Entry passes the prohibited-output check", bad.length === 0, bad.slice(0, 5));
const tpl = await run(`select language_template_id from t3a_d1_language_template where dimension_id='D5' and (t3a_prohibited_output_check('D5', template_body) ->> 'passed')::boolean is not true`);
rec("D5-64", "every D5 template passes the prohibited-output check", tpl.length === 0, tpl);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
