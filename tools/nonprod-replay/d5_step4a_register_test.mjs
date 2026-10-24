// Step 4a: the D5 question definition register (D-05), the resolution table loader (D5-50) and the shared machinery D5 needs. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
process.on("uncaughtException", e => { console.log("ERR", e.message, JSON.stringify(R.slice(-3))); process.exit(1); });
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows, r: rows[0]?.r }; };
const refused = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const n = async (sql) => (await run(sql))[0].n;

// the content load
rec("D5-load", "D5 loads 16 questions, 16 capture sets, 46 capture lines, 7 branch rules, 46 statements, 10 numbered resolution rules, 13 templates, 33 source objects", [await n(`select count(*)::int n from t3a_d1_question_object where dimension_id='D5'`), await n(`select count(*)::int n from t3a_d1_capture_set where dimension_id='D5'`), await n(`select count(*)::int n from t3a_d1_capture_line where dimension_id='D5'`), await n(`select count(*)::int n from t3a_d1_branch_rule where dimension_id='D5'`), await n(`select count(*)::int n from t3a_d1_statement_library where dimension_id='D5'`), await n(`select count(*)::int n from t3a_resolution_refusal_rule where dimension_id='D5' and rule_code ~ '^RR-D5-[0-9]+$'`), await n(`select count(*)::int n from t3a_d1_language_template where dimension_id='D5'`), await n(`select count(*)::int n from t3a_content_object where identifier ~ '^SRC-D5-S[1-4]-0'`)].join() === "16,16,46,7,46,10,13,33", null);
rec("D5-load", "the identifiers the package retires or never issued (S1-007, S1-009, S2-005, S2-006, S3-008) are not registered", await n(`select count(*)::int n from t3a_content_object where identifier in ('SRC-D5-S1-007','SRC-D5-S1-009','SRC-D5-S2-005','SRC-D5-S2-006','SRC-D5-S3-008')`) === 0, null);
rec("D5-load", "every branch rule has its parent, child and serving answers derived on load", await n(`select count(*)::int n from t3a_d1_branch_rule where dimension_id='D5' and (parent_question is null or child_question is null or serving_answers is null)`) === 0, null);
rec("D5-load", "no D5 version is approved, no source is active, none holds an approval record", await n(`select count(*)::int n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.dimension_id='D5' and o.identifier like 'SRC-D5-S_-0%' and (v.approval_status<>'drafting' or v.approved_at is not null)`) === 0 && await n(`select count(*)::int n from t3a_d1_source_approval a join t3a_content_object o on o.content_object_id=a.source_id where o.identifier like 'SRC-D5-S_-0%'`) === 0, null);
rec("D5-load", "D1 and D2 content are untouched by the D5 load", [await n(`select count(*)::int n from t3a_d1_question_object where dimension_id='D1'`), await n(`select count(*)::int n from t3a_d1_question_object where dimension_id='D2'`), await n(`select count(*)::int n from t3a_d1_statement_library where dimension_id='D1'`), await n(`select count(*)::int n from t3a_d1_statement_library where dimension_id='D2'`)].join() === "15,15,44,61", null);
rec("D5-load", "the placeholder grammar is data: D2 has 5 rows, D5 has 7", [await n(`select count(*)::int n from t3a_dimension_placeholder where dimension_id='D2'`), await n(`select count(*)::int n from t3a_dimension_placeholder where dimension_id='D5'`)].join() === "5,7", null);
rec("D5-load", "one conduct element per question group (Q-D5-06 and Q-D5-06b alone carry CE-D5-06)", (await run(`select count(*)::int n from t3a_d1_question_object where dimension_id='D5' and conduct_element = 'CE-D5-06'`))[0].n === 2, null);

// the register (D-05)
const rows = await n(`select count(*)::int n from t3a_question_definition where dimension_id='D5'`);
rec("D-05", "the register has one row per question and answer pair (46) with the structural fields populated", rows === 46 && await n(`select count(*)::int n from t3a_question_definition where dimension_id='D5' and (exact_stem is null or required_or_conditional is null or statement_mapping is null or stage_applicability is null)`) === 0, rows);
rec("D-05", "the five semantic fields are empty on every row; nothing in this build wrote one", await n(`select count(*)::int n from t3a_question_definition where dimension_id='D5' and (operational_definition is not null or minimum_observable_evidence is not null or inclusion_example is not null or exclusion_example is not null or ambiguity_rule is not null)`) === 0, null);
rec("D-05", "every one of the 16 questions carries calibration_ready false", (await run(`select q.question_code, public.t3a_question_calibration_ready('D5', q.question_code) r from t3a_d1_question_object q where q.dimension_id='D5'`)).every(x => x.r === false), null);
rec("D-05", "a structurally complete row is not mistaken for a ready one: statement_mapping populated, semantic fields empty, ready false", await n(`select count(*)::int n from t3a_question_definition d where d.dimension_id='D5' and d.statement_mapping is not null and not public.t3a_question_calibration_ready('D5', d.question_id)`) === 46, null);
rec("D-05", "a dimension with no register (D2) is not subject to the rule", (await run(`select cardinality(t3a_source_unready_questions(v.content_version_id)) n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='SRC-D2-S2-001'`))[0].n === 0, null);

// D5-04 and the route rule (0.6.15, 0.6.16) in the registry's own data: the applicability table and the route list of every loaded source follow the Stage rules
const apps = await run(`select o.identifier, v.body->>'stage_code' st, v.body->'source_sheet'->'available_routes' routes, v.body->'source_sheet'->>'exchange_test_point' etp,
  (select jsonb_object_agg(a->>'question', a->>'state') from jsonb_array_elements(v.body->'question_applicability') a) app from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D5-S[1-4]-0' order by 1`);
const byStage = (st) => apps.filter(a => a.st === st);
rec("D5-04", "at Stage 1 (8 sources) and Stage 3 (5 sources) Q-D5-06 and Q-D5-06b are NOT SERVED on every loaded source and its route list is empty (a written response or a submission proposes a route, it does not use one)", byStage("S1").length === 8 && byStage("S3").length === 5 && [...byStage("S1"), ...byStage("S3")].every(a => a.app["Q-D5-06"] === "NOT SERVED" && a.app["Q-D5-06b"] === "NOT SERVED" && a.routes.length === 0), apps.map(a => a.identifier + ":" + a.app["Q-D5-06"]).slice(0, 3));
rec("D5-04", "at Stage 2 (7 sources) and Stage 4 (8 sources) Q-D5-06 is served and Q-D5-06b follows it, and the only selectable route is the session itself (one route on each list)", byStage("S2").length === 7 && byStage("S4").length === 8 && [...byStage("S2"), ...byStage("S4")].every(a => a.app["Q-D5-06"] === "DIRECT" && a.app["Q-D5-06b"] === "CONDITIONAL" && a.routes.length === 1 && /session/i.test(a.routes[0].text)), byStage("S2").map(a => a.routes[0]?.text));
rec("D5-56", "Q-D5-09 is served exactly where the source carries an exchange test point (Stages 1, 2 and 4) and is NOT SERVED at Stage 3, where the asynchronous form has none", apps.every(a => (a.app["Q-D5-09"] === "NOT SERVED") === (a.etp === null)) && byStage("S3").every(a => a.app["Q-D5-09"] === "NOT SERVED" && a.etp === null), [...new Set(apps.map(a => a.st + ":" + a.etp + ":" + a.app["Q-D5-09"]))]);
rec("D5-04", "every other element is served at every Stage on every loaded source (CE-D5-01 to 05, 07 and 08 and their children)", apps.every(a => ["Q-D5-01", "Q-D5-02", "Q-D5-03", "Q-D5-04", "Q-D5-05", "Q-D5-07", "Q-D5-08"].every(q => a.app[q] === "DIRECT") && ["Q-D5-01b", "Q-D5-02b", "Q-D5-03b", "Q-D5-04b", "Q-D5-05b", "Q-D5-07b"].every(q => a.app[q] === "CONDITIONAL")), null);

// D5-58: production approval path
const mkSrc = async (stage, ident) => {
  const id = `SRC-D5-X-${stage}-${ident}-${RUN}`;
  const sheet = { d5_situation_class: "SC-D5-1" };
  const body = { source_identifier: id, stage_code: stage, source_version_hash: "a".repeat(64), source_sheet: sheet, title: id, question_applicability: [{ question: "Q-D5-01", state: "DIRECT" }, { question: "Q-D5-08", state: "NOT SERVED" }] };
  await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${id}','source','${id}','D5','not_loaded')`);
  const v = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded','${JSON.stringify(body)}'::jsonb from t3a_content_object where identifier='${id}' returning content_version_id v`))[0].v;
  await run(`insert into t3a_source_authorship(source_version_id, source_author_identity) values ('${v}', array['author-x'])`);
  for (const t of [1, 2]) await run(`insert into t3a_source_drafting_test(source_version_id, test_no, outcome, reviewer_identity, tested_on, version_tested_ref) values ('${v}', ${t}, 'recorded', 'reviewer-x', current_date, 'v1')`);
  return v;
};
const s1 = await mkSrc("S2", "a");
rec("D5-58", "with both drafting rows the next failing precondition is question_definition_incomplete", (await run(`select t3a_source_approval_preconditions('${s1}') c`))[0].c === "question_definition_incomplete", null);
let n0 = await refused("question_definition_incomplete");
let r = await svc(`select t3a_source_submit_for_approval('${s1}') r`);
rec("D5-58", "a source whose served question has an empty definition cannot enter the production approval path; the refusal is logged", r.r?.reason === "question_definition_incomplete" && (await refused("question_definition_incomplete")) === n0 + 1 && await n(`select count(*)::int n from t3a_source_approval_request where source_version_id='${s1}'`) === 0, r.r || r.msg);
// completing the one served question lets it through (synthetic definition, throwaway only), and clearing it closes the path again
await run(`update t3a_question_definition set operational_definition='syn', minimum_observable_evidence='syn', inclusion_example='syn', exclusion_example='syn', ambiguity_rule='syn' where dimension_id='D5' and question_id='Q-D5-01'`);
r = await svc(`select t3a_source_submit_for_approval('${s1}') r`);
rec("D5-58", "once every served question is complete the same source queues (Q-D5-08 is NOT SERVED on it and is not counted)", r.r?.outcome === "queued", r.r || r.msg);
await run(`update t3a_question_definition set operational_definition=null, minimum_observable_evidence=null, inclusion_example=null, exclusion_example=null, ambiguity_rule=null where dimension_id='D5' and question_id='Q-D5-01'`);
rec("D5-58", "clearing the definition closes the path again", (await run(`select t3a_question_calibration_ready('D5','Q-D5-01') r`))[0].r === false, null);
rec("D5-60", "the real D5 sources hold no approval and the first failing precondition is named", (await run(`select t3a_source_approval_preconditions(v.content_version_id) c from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='SRC-D5-S2-001'`))[0].c === "drafting_test_incomplete", null);

// D5-50: the resolution table loader refuses a whole table
const good = { rule_code: "RR-D5-T-" + RUN + "-1", pattern_text: "Q-D5-01=A1 + Q-D5-01b=UNANSWERED", pattern: [{ subject: "Q-D5-01", value: "A1" }, { subject: "Q-D5-01b", value: "UNANSWERED" }], outcome: "REFUSE", reason: "synthetic" };
const badRow = { rule_code: "RR-D5-T-" + RUN + "-2", pattern_text: "Q-D5-99=A1", pattern: [{ subject: "Q-D5-99", value: "A1" }], outcome: "REFUSE", reason: "synthetic" };
n0 = await refused("resolution_table_refused");
r = await svc(`select t3a_load_resolution_rules('D5', '${JSON.stringify([good, badRow])}'::jsonb) r`);
rec("D5-50", "a table with one row naming a question that is not in the question objects is refused whole and logged; the good row is not loaded either", r.r?.reason === "resolution_table_refused" && (await refused("resolution_table_refused")) === n0 + 1 && await n(`select count(*)::int n from t3a_resolution_refusal_rule where rule_code like 'RR-D5-T-${RUN}%'`) === 0, r.r || r.msg);
r = await svc(`select t3a_load_resolution_rules('D5', '${JSON.stringify([good])}'::jsonb) r`);
rec("D5-50", "a table whose rows all name real questions loads", r.r?.outcome === "loaded" && r.r.rows === 1, r.r || r.msg);
r = await svc(`select t3a_load_resolution_rules('D5', '${JSON.stringify([{ ...good, rule_code: good.rule_code + "s", outcome: "SUPPRESS", suppress_statement_key: "ST-D5-999" }])}'::jsonb) r`);
rec("D5-50", "a suppress row naming a statement that does not exist is refused", r.r?.reason === "resolution_table_refused", r.r || r.msg);
const noSvc = await c.query("begin").then(async () => { await c.query("set local role authenticated"); await c.query(`select set_config('request.jwt.claims','{"role":"authenticated"}',true)`); try { return (await c.query(`select t3a_load_resolution_rules('D5','[]'::jsonb) r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("rollback"); } });
rec("D5-50", "the loader is the service route only", noSvc.msg ? /permission/.test(noSvc.msg) : false, noSvc);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
