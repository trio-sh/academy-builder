// Step 3c: D9 resolution service (INS-003 rules 045 to 054; D9 Sections 5.7, 5.14 and 11.3). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function as(role, sql) { await c.query("begin"); let msg = "ok", rows = []; try { if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claims', json_build_object('role','${role}')::text, true)`); } rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const core = async (stage, answers, bound = {}) => (await run(`select t3a_resolve_core('D9','${stage}','${JSON.stringify(answers)}'::jsonb,'${JSON.stringify(bound)}'::jsonb,true) r`))[0].r;
const B = { named_indication_count: 1, stated_change_count: 2, named_ground_count: 1, stated_source_count: 2, questioned_point_count: 1, stated_trial_count: 1, named_work_count: 1 };

// 11.3 the coverage test, run first
const cov = await run(`select * from t3a_resolution_coverage('D9')`);
const tot = cov.reduce((a, r) => a + Number(r.patterns), 0), gaps = cov.reduce((a, r) => a + Number(r.gap_refusals), 0), amb = cov.reduce((a, r) => a + Number(r.ambiguous), 0);
rec("D9-cov", "coverage: every reachable answer pattern resolves to statements or a designed refusal (no gaps)", tot > 200 && gaps === 0, { patterns: tot, gaps });
rec("D9-cov", "coverage: no pattern resolves to two statements", amb === 0, amb);
rec("D9-cov", "coverage: the eight resolution rules are the only designed refusals, in the parent child groups of Q-D9-01 to Q-D9-07", cov.filter(r => Number(r.designed_refusals) > 0).map(r => r.question_group).filter((v, i, a) => a.indexOf(v) === i).sort().join("|") === ["Q-D9-01,Q-D9-01b", "Q-D9-02,Q-D9-02b", "Q-D9-03,Q-D9-03b", "Q-D9-04,Q-D9-04b", "Q-D9-05,Q-D9-05b", "Q-D9-06,Q-D9-06b", "Q-D9-07,Q-D9-07b"].join("|"), cov.filter(r => Number(r.designed_refusals) > 0).map(r => r.question_group));
const a1 = await core(2, { "Q-D9-01": "A1", "Q-D9-01b": "A1" }, B), a2 = await core(2, { "Q-D9-01": "A1", "Q-D9-01b": "A1" }, B);
rec("D9-res", "same inputs, same output", JSON.stringify(a1) === JSON.stringify(a2) && a1.outcome === "resolved" && a1.statements.length === 2, a1);
rec("D9-res", "statements come back in the fixed question order", JSON.stringify(a1.statements.map(s => s.question_code)) === JSON.stringify(["Q-D9-01", "Q-D9-01b"]), a1.statements.map(s => s.question_code));
const cnt = await core(2, { "Q-D9-02": "A1", "Q-D9-02b": "A1" }, B); rec("D9-res", "a count placeholder is filled from the bound value, never typed", /stated 2 of the changes to the approach/.test(cnt.statements?.[1]?.text), cnt.statements?.[1]?.text);
const unm = await core(2, { "Q-D9-01": "A9" }, B); rec("D9-res", "an unmapped pattern refuses and nothing is substituted", unm.outcome === "refused" && unm.reason === "no_approved_statement", unm);
const ft = await core(2, { "Q-D9-01": "they named the checklist" }, B); rec("D9-res", "free text in place of an answer code refuses", ft.reason === "free_text_or_unknown_value", ft);
const prod = await as("service_role", `select t3a_resolve_observation('D9','2','{"Q-D9-01":"A3"}'::jsonb) r`);
rec("D9-res", "production mode resolves nothing while no statement is approved (fail closed)", prod.rows[0]?.r?.outcome === "refused" && prod.rows[0].r.reason === "no_approved_statement", prod.rows[0]?.r);
const tm = await as("authenticated", `select t3a_resolve_observation('D9','2','{"Q-D9-01":"A3"}'::jsonb,'{}'::jsonb,true) r`); rec("D9-res", "test mode is the service route only", tm.rows[0]?.r?.reason === "TEST_MODE_IS_SERVICE_ONLY", tm.rows[0]?.r || tm.msg);
const iso = await core(2, { "Q-D4-01": "A1" }, B); rec("D9-res", "a D4 question in a D9 resolution refuses as a dimension isolation violation", iso.reason === "dimension_isolation_violation", iso);
const iso1 = await core(2, { "Q-D1-01": "A1" }, B); rec("D9-res", "a D1 question in a D9 resolution refuses as a dimension isolation violation", iso1.reason === "dimension_isolation_violation", iso1);
const child = await core(2, { "Q-D9-02b": "A1" }, B); rec("D9-res", "an answer on a child whose parent did not serve it refuses", child.reason === "child_not_served", child);
const child2 = await core(2, { "Q-D9-02": "A2", "Q-D9-02b": "A1" }, B); rec("D9-res", "an answer on a child whose parent recorded a change outside the list refuses (only A1 serves Q-D9-02b)", child2.reason === "child_not_served", child2);
const ms = await core(2, { "Q-D9-01": "missing:declined", "Q-D9-08": "A1" }, B); rec("D9-res", "a posted missing state composes nothing and does not block the rest", ms.outcome === "resolved" && ms.statements.length === 1, ms.statements?.map(s => s.question_code));
const na = await core(2, { "Q-D9-01": "missing:not_applicable" }, B); rec("D9-res", "not_applicable is never posted", na.reason === "missing_state_not_postable", na);
const ny = await core(2, { "Q-D9-01": "missing:not_yet_observed" }, B); rec("D9-res", "not_yet_observed is never posted", ny.reason === "missing_state_not_postable", ny);
const bv = await core(2, { "Q-D9-01": "A1", "Q-D9-01b": "A1" }, { ...B, named_indication_count: 0 }); rec("D9-res", "a count outside the grammar refuses", bv.reason === "bound_variable_invalid", bv);
// D9-06
const t03 = await core(2, { "Q-D9-03": "A3" }, B);
rec("D9-06", "Q-D9-03 A3 resolves to ST-D9-013 alone; the unserved child contributes no negative sentence", t03.outcome === "resolved" && t03.statements.length === 1 && t03.statements[0].statement_key === "ST-D9-013", t03.statements?.map(s => s.statement_key));
// D9-49: a stated change and a kept approach compose side by side
const both = await core(2, { "Q-D9-02": "A1", "Q-D9-02b": "A1", "Q-D9-03": "A1", "Q-D9-03b": "A1" }, B);
rec("D9-49", "Q-D9-02 A1 and Q-D9-03 A1 in one observation: both compose as separate entries, neither suppressed, and nothing joins them", both.outcome === "resolved" && ["ST-D9-006", "ST-D9-009", "ST-D9-011", "ST-D9-015"].every(k => both.statements.some(s => s.statement_key === k)) && both.statements.length === 4, both.statements?.map(s => s.statement_key));
const neither = await core(2, { "Q-D9-02": "A3", "Q-D9-03": "A4" }, B);
rec("D9-49", "Q-D9-02 A3 with Q-D9-03 A4 is permitted: a participant may state neither, and no adverse clause composes", neither.outcome === "resolved" && neither.statements.map(s => s.statement_key).join() === "ST-D9-008,ST-D9-014" && neither.statements.every(s => s.entry_type === "record_status"), neither.statements?.map(s => s.statement_key));
const keepOnly = await core(2, { "Q-D9-02": "A3", "Q-D9-03": "A1", "Q-D9-03b": "A1" }, B);
rec("D9-49", "a kept approach with no change stated composes the kept entries and nothing for the change beyond its absence record", keepOnly.outcome === "resolved" && keepOnly.statements.map(s => s.statement_key).join() === "ST-D9-008,ST-D9-011,ST-D9-015", keepOnly.statements?.map(s => s.statement_key));
const order = both.statements.map(s => s.question_code);
rec("D9-49", "the composition order is the register order (CE-D9-02 before CE-D9-03) and that order carries no preference: the same two answers in the other order of submission compose identically", JSON.stringify(order) === JSON.stringify(["Q-D9-02", "Q-D9-02b", "Q-D9-03", "Q-D9-03b"]) && JSON.stringify((await core(2, { "Q-D9-03b": "A1", "Q-D9-03": "A1", "Q-D9-02b": "A1", "Q-D9-02": "A1" }, B)).statements.map(s => s.statement_key)) === JSON.stringify(both.statements.map(s => s.statement_key)), order);
// the eight resolution rules, each refusing its own pattern
const rules = [["RR-D9-01", { "Q-D9-01": "A1" }], ["RR-D9-02", { "Q-D9-02": "A1" }], ["RR-D9-03", { "Q-D9-03": "A1" }], ["RR-D9-04", { "Q-D9-04": "A1" }], ["RR-D9-05", { "Q-D9-05": "A1" }], ["RR-D9-06", { "Q-D9-06": "A1" }], ["RR-D9-07", { "Q-D9-07": "A1" }], ["RR-D9-08", { "Q-D9-07": "A2" }]];
for (const [rr, ans] of rules) { const x = await core(2, ans, B); rec("D9-05", `${rr}: the parent records a listed answer and the child identifies none: refuses`, x.outcome === "refused" && x.rule === rr && x.reason === "resolution_rule", x); }
// Q-D9-07 A3 and A4 take no child
const w3 = await core(2, { "Q-D9-07": "A3" }, B); rec("D9-res", "Q-D9-07 A3 (approach applies to work ahead, none named) resolves to ST-D9-034 alone", w3.outcome === "resolved" && w3.statements.map(s => s.statement_key).join() === "ST-D9-034", w3.statements?.map(s => s.statement_key));
const w1 = await core(2, { "Q-D9-07": "A1", "Q-D9-07b": "A2" }, B); rec("D9-res", "Q-D9-07 A1 with Q-D9-07b A2 resolves to ST-D9-032 and ST-D9-037", w1.outcome === "resolved" && w1.statements.map(s => s.statement_key).join() === "ST-D9-032,ST-D9-037", w1.statements?.map(s => s.statement_key));
// every Stage carries the same entries: a statement of what was stated records the same at each Stage (decision register row 0.6.15)
const same = []; for (const st of [1, 2, 3, 4]) same.push(JSON.stringify((await core(st, { "Q-D9-02": "A1", "Q-D9-02b": "A1", "Q-D9-08": "A2" }, B)).statements?.map(s => s.statement_key)));
rec("D9-res", "one entry serves every Stage: the same answers compose the same entries at Stages 1, 2, 3 and 4", new Set(same).size === 1 && same[0] === JSON.stringify(["ST-D9-006", "ST-D9-009", "ST-D9-039"]), same);
const s1 = await core(1, { "Q-D9-07": "A1", "Q-D9-07b": "A1", "Q-D9-09": "A1" }, B); rec("D9-res", "a Stage 1 answer to a work-ahead question and the account test resolves: no D9 question is barred at Stage 1 (every element is carried at Stage 1)", s1.outcome === "resolved" && s1.statements.length === 3, s1);
const before = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='no_approved_statement'`))[0].n;
await as("service_role", `select t3a_resolve_observation('D9','2','{"Q-D9-01":"A3"}'::jsonb) r`);
rec("D9-res", "a refusal on the logged route persists in the refusal log", (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='no_approved_statement'`))[0].n === before + 1, before);
// prohibited output
const chk = async (t) => (await run(`select t3a_prohibited_output_check('D9', $1) r`.replace("$1", `'${t.replace(/'/g, "''")}'`)))[0].r;
let r = await chk("<p>the participant named one of the indications the situation set out</p>"); rec("D9-64", "a clean statement passes", r.passed === true, r);
for (const w of ["learned", "realized", "understood", "picked up", "mastered", "grew", "improved", "agile", "adaptable", "coachable", "receptive", "open minded", "curious", "resistant", "rigid", "stubborn", "defensive", "slow", "quick", "fast", "readily", "easily", "struggled", "capable", "competent", "beginner", "novice"]) {
  r = await chk(`the participant ${w} with the new tool`); rec("D9-64", `the Section 3.2 word "${w}" fails the scan`, r.passed === false, r);
}
for (const w of ["will", "would"]) { r = await chk(`the participant stated that they ${w} keep the checklist`); rec("D9-64", `the modal "${w}" fails the scan even inside reported speech (Section 5.7)`, r.passed === false, r); }
for (const w of ["took", "acted", "sought", "performed", "applied", "carried out", "tried", "tested", "adopted", "changed", "adjusted", "switched"]) { r = await chk(`the participant ${w} the new method`); rec("D9-61", `the performed act word "${w}" fails the scan`, r.passed === false, r); }
for (const w of ["owned", "caused", "blamed", "prioritized", "verified", "proposed", "agreed", "disclosed", "recovered", "resumed", "persuaded"]) { r = await chk(`the participant ${w} the outcome`); rec("D9-27", `the word "${w}", which another dimension owns, fails as cross_dimension_assertion`, r.passed === false && r.findings.some(f => f.rule === "cross_dimension_assertion"), r); }
r = await chk("<span>★★★☆☆</span>"); rec("D9-63", "stars fail", r.passed === false, r);
r = await chk("the participant gave a red flag"); rec("D9-63", "a flag wording is rejected (red flag)", r.passed === false, r);
r = await chk("the candidate attended"); rec("D9-63", "a retired term fails (candidate)", r.passed === false, r);
r = await chk("the participant gave a strong response"); rec("D9-64", "a closed-list evaluative phrase fails (strong response)", r.passed === false, r);
// capacity_observation: the subject of an entry
const subj = async (t) => (await run(`select t3a_entry_subject_check('D9', $1) r`.replace("$1", `'${t.replace(/'/g, "''")}'`)))[0].r;
rec("D9-64", "an entry that begins as a statement of the participant has a statement as its subject", (await subj("the participant named one or more of the indications the situation set out")).outcome === "ok" && (await subj("no statement of a question was observed within the recorded period")).outcome === "ok" && (await subj("when an earlier statement was put back to them, the participant stated content that differs from what the situation records")).outcome === "ok", null);
for (const t of ["the participant is a fast learner", "the participant has good knowledge of the new system", "the participant seemed keen to change", "a capable participant", "the participant lacks experience with the tool"]) rec("D9-64", `a sentence whose subject is the participant's capacity, knowledge or state refuses as capacity_observation: "${t}"`, (await subj(t)).outcome === "violation" && (await subj(t)).rule === "capacity_observation", await subj(t));
const bad = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D9' and statement_key ~ '^ST-D9-0[0-4][0-9]$' and ((t3a_prohibited_output_check('D9', statement_body) ->> 'passed')::boolean is not true or t3a_entry_subject_check('D9', statement_body) ->> 'outcome' <> 'ok')`);
rec("D9-64", "every D9 Recorded Conduct Entry (44) passes the prohibited-output check and has a statement as its subject", bad.length === 0 && (await run(`select count(*)::int n from t3a_d1_statement_library where dimension_id='D9' and statement_key ~ '^ST-D9-0[0-4][0-9]$'`))[0].n === 44, bad.slice(0, 5));
const tpl = await run(`select language_template_id from t3a_d1_language_template where dimension_id='D9' and (t3a_prohibited_output_check('D9', template_body) ->> 'passed')::boolean is not true`);
rec("D9-64", "every D9 template (13) passes the prohibited-output check", tpl.length === 0 && (await run(`select count(*)::int n from t3a_d1_language_template where dimension_id='D9'`))[0].n === 13, tpl);
const joins = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D9' and statement_key ~ '^ST-D9-0[0-4][0-9]$' and statement_body ~* '\\m(but|however|although|instead|whereas|despite)\\M' union all select language_template_id from t3a_d1_language_template where dimension_id='D9' and template_body ~* '\\m(but|however|although|instead|whereas|despite)\\M'`);
rec("D9-70", "no entry and no template joins a change and a kept approach with but, however, although or instead", joins.length === 0, joins);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
