// Step 3c: D2 resolution service (INS-003 rules 045 to 054). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function as(role, sql) { await c.query("begin"); let msg = "ok", rows = []; try { if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claims', json_build_object('role','${role}')::text, true)`); } rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const core = async (stage, answers, bound = {}) => (await run(`select t3a_resolve_core('D2','${stage}','${JSON.stringify(answers)}'::jsonb,'${JSON.stringify(bound)}'::jsonb,true) r`))[0].r;
const B = { performed_listed_action_count: 2, contained_item_count: 3, omitted_causal_item_count: 1, contradicted_causal_item_count: 1, affected_party_label: "the client" };

// coverage first (rule 048)
const cov = await run(`select * from t3a_resolution_coverage('D2')`);
const tot = cov.reduce((a, r) => a + r.patterns, 0), gaps = cov.reduce((a, r) => a + r.gap_refusals, 0), amb = cov.reduce((a, r) => a + r.ambiguous, 0);
rec("D2-48", "coverage: every reachable answer pattern resolves to statements or a designed refusal (no gaps)", tot > 500 && gaps === 0, { patterns: tot, gaps });
rec("D2-51", "coverage: no pattern resolves to two statements", amb === 0, amb);
// 045 determinism
const a1 = await core(2, { "Q-D2-01": "A1", "Q-D2-03a": "A1", "Q-D2-03b": "A1" }, B), a2 = await core(2, { "Q-D2-01": "A1", "Q-D2-03a": "A1", "Q-D2-03b": "A1" }, B);
rec("D2-45", "same inputs, same output", JSON.stringify(a1) === JSON.stringify(a2) && a1.outcome === "resolved" && a1.statements.length === 3, a1.outcome);
rec("D2-45", "statements come back in the fixed question order", JSON.stringify(a1.statements.map(s => s.question_code)) === JSON.stringify(["Q-D2-01", "Q-D2-03a", "Q-D2-03b"]), a1.statements.map(s => s.question_code));
// stage twins
const t1 = await core(1, { "Q-D2-03a": "A1", "Q-D2-03b": "A1" }, B), t2 = await core(2, { "Q-D2-03a": "A1", "Q-D2-03b": "A1" }, B);
rec("D2-45", "the Stage 1 and 3 twin and the Stage 2 and 4 twin resolve to different statements", t1.statements[1].statement_key !== t2.statements[1].statement_key, [t1.statements[1].statement_key, t2.statements[1].statement_key]);
rec("D2-45", "a count placeholder is filled from the bound value, never typed", /3 of the items/.test(t1.statements[1].text), t1.statements[1].text);
// 047, 053 no default / nearest / free text
const unm = await core(2, { "Q-D2-01": "A9" }, B); rec("D2-53", "an unmapped pattern refuses and nothing is substituted", unm.outcome === "refused" && unm.reason === "no_approved_statement", unm);
const ft = await core(2, { "Q-D2-01": "they stepped up" }, B); rec("D2-53", "free text in place of an answer code refuses", ft.reason === "free_text_or_unknown_value", ft);
// production mode fails closed
const prod = await as("service_role", `select t3a_resolve_observation('D2','2','{"Q-D2-01":"A1"}'::jsonb) r`);
rec("D2-47", "production mode resolves nothing while no statement is approved (fail closed)", prod.rows[0]?.r?.outcome === "refused" && prod.rows[0].r.reason === "no_approved_statement", prod.rows[0]?.r);
const tm = await as("authenticated", `select t3a_resolve_observation('D2','2','{"Q-D2-01":"A1"}'::jsonb,'{}'::jsonb,true) r`);
rec("D2-47", "test mode is the service route only", tm.rows[0]?.r?.reason === "TEST_MODE_IS_SERVICE_ONLY", tm.rows[0]?.r || tm.msg);
// 054 and 5.9 isolation
const iso = await core(2, { "Q-D1-01": "A1" }, B); rec("D2-54", "a D1 question in a D2 resolution refuses as a dimension isolation violation", iso.reason === "dimension_isolation_violation", iso);
// refusal rules
const rr1 = await core(1, { "Q-D2-02": "A1" }, B); rec("D2-RR", "RR-D2-01: a Stage 1 response cannot evidence an action performed", rr1.rule === "RR-D2-01", rr1);
const rr2 = await core(2, { "Q-D2-02": "A1" }, B); rec("D2-RR", "RR-D2-02: an action recorded with no action identified refuses", rr2.rule === "RR-D2-02", rr2);
const rr12 = await core(2, { "Q-D2-03a": "A3", "Q-D2-04a": "A1", "Q-D2-04b": "A1" }, B); rec("D2-RR", "RR-D2-12: nothing stated to anyone, yet a surfacing timed, refuses", rr12.rule === "RR-D2-12", rr12);
const sup = await core(2, { "Q-D2-03a": "A3", "Q-D2-04a": "A3" }, B);
rec("D2-RR", "RR-D2-14: the duplicated absence statement ST-D2-023 is suppressed, ST-D2-017 stays", sup.outcome === "resolved" && !sup.statements.some(s => s.statement_key === "ST-D2-023") && sup.statements.some(s => s.statement_key === "ST-D2-017"), sup.statements?.map(s => s.statement_key));
const child = await core(2, { "Q-D2-02b": "A1" }, B); rec("D2-41", "an answer on a child whose parent did not serve it refuses", child.reason === "child_not_served", child);
// missing states
const ms = await core(2, { "Q-D2-01": "missing:declined", "Q-D2-09": "A1" }, B);
rec("D2-5.8", "a posted missing state composes nothing and does not block the rest", ms.outcome === "resolved" && ms.statements.length === 1, ms.statements?.map(s => s.question_code));
const na = await core(2, { "Q-D2-01": "missing:not_applicable" }, B); rec("D2-5.8", "not_applicable is never posted", na.reason === "missing_state_not_postable", na);
const ny = await core(2, { "Q-D2-01": "missing:not_yet_observed" }, B); rec("D2-5.8", "not_yet_observed is never posted", ny.reason === "missing_state_not_postable", ny);
// bound variables
const bv = await core(2, { "Q-D2-03a": "A1", "Q-D2-03b": "A1" }, { contained_item_count: 0 }); rec("D2-5.7c", "a count outside the grammar refuses", bv.reason === "bound_variable_invalid", bv);
// 046 composed statement is immutable is covered at commit (INS-002); logged refusal persists
const before = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='no_approved_statement'`))[0].n;
await as("service_role", `select t3a_resolve_observation('D2','2','{"Q-D2-01":"A1"}'::jsonb) r`);
rec("D2-47", "a refusal on the logged route persists in the refusal log", (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='no_approved_statement'`))[0].n === before + 1, before);
// D1 unaffected
rec("D1-same", "D1 statements are not reachable from a D2 resolution", (await run(`select count(*)::int n from t3a_d1_statement_library where dimension_id='D1' and question_code is not null`))[0].n === 0, null);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
