// Step 3a: D1 readers are dimension aware (CR-076). Loading a second dimension's rows must not change any D1 output. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const cleanup = async () => {
  await c.query(`delete from t3a_d1_capture_resolution where dimension_id<>'D1'`); await c.query(`delete from t3a_d1_question_capture_map where dimension_id<>'D1'`);
  await c.query(`delete from t3a_d1_question_object where dimension_id<>'D1'`); await c.query(`delete from t3a_d1_capture_line where dimension_id<>'D1'`);
  await c.query(`delete from t3a_d1_capture_set where dimension_id<>'D1'`); await c.query(`delete from t3a_d1_condition_precedence where dimension_id<>'D1'`);
};
await cleanup();
const golden = async () => (await run(`select
 (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'')) from public.t3a_d1_capture_groups() t) groups,
 (select md5(coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text)::text,'')) from public.t3a_d1_coverage_matrix() t) coverage,
 (select md5(coalesce(string_agg(public.t3a_d1_capture_for_question(question_code)::text, '|' order by question_code),'')) from public.t3a_d1_question_object where dimension_id='D1') by_question`))[0];
const before = await golden();
const d1lines = (await run(`select line_text from t3a_d1_capture_line where dimension_id='D1' and capture_set_code='C1' order by line_order`)).map(r => r.line_text);
const d1q = (await run(`select m.question_code from t3a_d1_question_capture_map m where m.dimension_id='D1' and m.capture_set_code='C1' limit 1`))[0]?.question_code;

// load a second dimension that reuses C1, line orders, a condition code and a question to set mapping
await run(`insert into t3a_d1_capture_set(dimension_id, capture_set_code, title, display_order, records_first_occurrence) values ('D2','C1','D2 set',1,false)`);
await run(`insert into t3a_d1_capture_line(dimension_id, capture_set_code, line_text, line_order, is_whole_session_answer) values ('D2','C1','D2 line one',1,false),('D2','C1','D2 line two',2,false)`);
await run(`insert into t3a_d1_question_object(dimension_id, question_code, conduct_element, answer_type, applicability, missing_state_eligible, display_order) values ('D2','Q-D2-01','CE-D2-01','single','all',false,1)`);
await run(`insert into t3a_d1_question_capture_map(dimension_id, question_code, capture_set_code, ruling_reference, ruled_by, ruled_at) values ('D2','Q-D2-01','C1','ref','test',now())`);
await run(`insert into t3a_d1_condition_precedence(dimension_id, condition_code, precedence_order, language_template_id, renders_before_conduct, effect) select 'D2', condition_code, precedence_order, language_template_id, renders_before_conduct, effect from t3a_d1_condition_precedence where dimension_id='D1' limit 1`);
const after = await golden();
rec("R-d1", "D1 capture groups are identical with D2 rows loaded", before.groups === after.groups, [before.groups, after.groups]);
rec("R-d1", "D1 coverage matrix is identical with D2 rows loaded", before.coverage === after.coverage, [before.coverage, after.coverage]);
rec("R-d1", "D1 capture output for every question is identical with D2 rows loaded", before.by_question === after.by_question, [before.by_question, after.by_question]);
if (d1q) { const l = (await run(`select jsonb_path_query_array(t3a_d1_capture_for_question('${d1q}'), '$.lines[*].line_text') x`))[0].x; rec("R-d1", "a D1 question still returns exactly the D1 lines of C1", JSON.stringify(l) === JSON.stringify(d1lines), l); }
const d2 = (await run(`select t3a_d1_capture_for_question('Q-D2-01') r`))[0].r;
rec("R-d2", "a D2 question returns the D2 lines of its own C1 and none of D1's", d2.permitted === true && d2.lines.length === 2 && d2.lines.every(x => /^D2 line/.test(x.line_text)), d2);
const cm1 = await run(`select count(*)::int n from t3a_d1_coverage_matrix('D1')`), cm2 = await run(`select property, passed from t3a_d1_coverage_matrix('D2')`);
rec("R-d2", "the coverage matrix runs for D2 on its own rows and reports the D2 gaps", cm1[0].n === 7 && cm2.length === 7 && cm2.find(r => r.property === "Completeness").passed === false, cm2);
rec("R-fn", "the dimension helpers resolve (default D1 for an unknown source)", (await run(`select t3a_source_dimension(gen_random_uuid()) d, t3a_event_dimension(gen_random_uuid()) e`))[0].d === "D1", null);
rec("R-fn", "a capture selection fills its dimension from its Stage entry", (await run(`select count(*)::int n from pg_trigger where tgname='t3a_0_capture_selection_dimension_trg' and not tgisinternal`))[0].n === 1, null);
await cleanup();
const end = await golden(); rec("R-d1", "after the D2 rows are removed D1 output is unchanged", JSON.stringify(end) === JSON.stringify(before), end);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
