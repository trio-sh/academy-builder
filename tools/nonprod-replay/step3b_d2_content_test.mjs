// Step 3b: D2 content load integrity (loaded, not servable). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const n = async (sql) => Number((await run(sql))[0].n);
const D = "dimension_id='D2'";
rec("D2-reg", "15 question objects, 15 capture sets, 15 ruled mappings, 6 branch rules", [await n(`select count(*) n from t3a_d1_question_object where ${D}`), await n(`select count(*) n from t3a_d1_capture_set where ${D}`), await n(`select count(*) n from t3a_d1_question_capture_map where ${D}`), await n(`select count(*) n from t3a_d1_branch_rule where ${D}`)].join() === "15,15,15,6", null);
rec("D2-reg", "61 statements, 14 refusal rules, 13 templates, 8 conditions, 21 retired words", [await n(`select count(*) n from t3a_d1_statement_library where ${D}`), await n(`select count(*) n from t3a_resolution_refusal_rule where ${D}`), await n(`select count(*) n from t3a_d1_language_template where ${D}`), await n(`select count(*) n from t3a_d1_condition_precedence where ${D}`), await n(`select count(*) n from t3a_rce_prohibited_vocabulary where ${D}`)].join() === "61,14,13,8,21", null);
rec("D2-reg", "34 sources loaded, plus the construct, determination and statement library objects", (await n(`select count(*) n from t3a_content_object where ${D} and family='source'`)) === 34 && (await n(`select count(*) n from t3a_content_object where ${D} and family<>'source'`)) === 3, null);
rec("D2-reg", "the six retired and six reserved source identifiers are not registered", (await n(`select count(*) n from t3a_content_object where identifier in ('SRC-D2-S1-005','SRC-D2-S1-006','SRC-D2-S2-004','SRC-D2-S2-006','SRC-D2-S3-004','SRC-D2-S3-010','SRC-D2-S1-011','SRC-D2-S1-012','SRC-D2-S2-011','SRC-D2-S2-012','SRC-D2-S3-011','SRC-D2-S3-012')`)) === 0, null);
// not servable
rec("D2-off", "no D2 version is approved, no source is active, no source holds an approval record", (await n(`select count(*) n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.${D} and (v.approval_status<>'drafting' or v.approved_at is not null)`)) === 0
  && (await n(`select count(*) n from t3a_content_object where ${D} and (current_version_id is not null or current_operational_state='active')`)) === 0
  && (await n(`select count(*) n from t3a_d1_source_approval a join t3a_content_object o on o.content_object_id=a.source_id where o.${D}`)) === 0, null);
rec("D2-off", "every D2 source body says serving_eligible false and every statement is build_only", (await n(`select count(*) n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.${D} and o.family='source' and (v.body->>'serving_eligible')<>'false'`)) === 0 && (await n(`select count(*) n from t3a_d1_statement_library where ${D} and use_disposition<>'build_only'`)) === 0, null);
// integrity of the loaded data against itself
rec("D2-int", "every mapped capture set exists and every question has exactly one mapping", (await n(`select count(*) n from t3a_d1_question_capture_map m left join t3a_d1_capture_set s on s.dimension_id=m.dimension_id and s.capture_set_code=m.capture_set_code where m.${D} and s.capture_set_code is null`)) === 0 && (await n(`select count(*) n from t3a_d1_question_object q left join t3a_d1_question_capture_map m using (dimension_id, question_code) where q.${D} and m.question_code is null`)) === 0, null);
const badAns = await run(`select statement_key, question_code, answer_code from t3a_d1_statement_library l where ${D} and not exists (select 1 from t3a_d1_question_capture_map m join t3a_d1_capture_line cl on cl.dimension_id=m.dimension_id and cl.capture_set_code=m.capture_set_code and cl.line_order = substring(l.answer_code from 2)::int where m.dimension_id=l.dimension_id and m.question_code=l.question_code)`);
rec("D2-int", "every statement points at an existing question and an answer line that exists", badAns.length === 0, badAns.slice(0, 5));
const badRule = await run(`select rule_code from t3a_resolution_refusal_rule r where ${D} and exists (select 1 from jsonb_array_elements(pattern) p where p->>'subject' like 'Q-%' and not exists (select 1 from t3a_d1_question_object q where q.question_code = p->>'subject'))`);
rec("D2-int", "every refusal rule names existing questions; every suppressed statement exists", badRule.length === 0 && (await n(`select count(*) n from t3a_resolution_refusal_rule r where ${D} and suppress_statement_key is not null and not exists (select 1 from t3a_d1_statement_library l where l.statement_key=r.suppress_statement_key)`)) === 0, badRule);
const badBranch = await run(`select rule_code from t3a_d1_branch_rule b where ${D} and not exists (select 1 from t3a_d1_question_object q where b.rule_effect like q.question_code || ' served%')`);
rec("D2-int", "every branch rule names its child question", badBranch.length === 0, badBranch);
const pkgsrc = await run(`select count(*)::int n from t3a_content_object o join t3a_d1_content_version v using (content_object_id) where o.${D} and o.family='source' and jsonb_typeof(v.body->'source_sheet')='object' and (v.body->>'source_version_hash') ~ '^[0-9a-f]{64}$'`);
rec("D2-int", "every source carries its sheet and a 64 character digest", pkgsrc[0].n === 34, pkgsrc);
const cond = await run(`select condition_code, language_template_id from t3a_d1_condition_precedence where ${D} and language_template_id is not null and not exists (select 1 from t3a_d1_language_template t where t.language_template_id=t3a_d1_condition_precedence.language_template_id)`);
rec("D2-int", "every condition that names a template names an existing one", cond.length === 0, cond);
// the readers see the right dimension
const cq = (await run(`select t3a_d1_capture_for_question('Q-D2-01') r`))[0].r;
rec("D2-read", "the reader serves Q-D2-01 with its six D2 lines", cq.permitted === true && cq.lines.length === 6, cq.lines && cq.lines.length);
const qs = await run(`select question_code, (t3a_d1_capture_for_question(question_code)->>'permitted')::boolean p from t3a_d1_question_object where ${D}`);
rec("D2-read", "the reader serves all fifteen D2 questions", qs.every(r => r.p === true) && qs.length === 15, qs.filter(r => !r.p));
const cm = await run(`select property, passed, detail from t3a_d1_coverage_matrix('D2')`);
rec("D2-read", "the D2 coverage matrix runs; the gaps it reports are listed (condition templates for correction_open and stage_1_only)", cm.length === 7, cm.map(r => [r.property, r.passed]));
rec("D1-same", "D1 is untouched: 15 questions, 13 sets, 44 lines, 44 statements", [await n(`select count(*) n from t3a_d1_question_object where dimension_id='D1'`), await n(`select count(*) n from t3a_d1_capture_set where dimension_id='D1'`), await n(`select count(*) n from t3a_d1_capture_line where dimension_id='D1'`), await n(`select count(*) n from t3a_d1_statement_library where dimension_id='D1'`)].join() === "15,13,44,44", null);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
