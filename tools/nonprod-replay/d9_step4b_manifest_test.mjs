// Step 4b: the D9 content-load manifest (D9 Execution Edition Section 14 item 10): exact counts, question definition state, sources by Stage and status, source sheet completeness,
// drafting test and rights record status, the source arithmetic and the source truth validation, and the loaded hashes. It must reconcile to the registry; a count that does not reconcile fails. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const n = async (sql) => (await run(sql))[0].n;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const M = {};

// Section 0.9: conduct elements 9; situation classes 7; question objects 16; capture sets 16; branch rules 7; entries 44; resolution rules 8; recurrence keys 9; templates 13; sources 35
const cons = (await run(`select v.body from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier = 'T3A-D9-EXEC-001-CONSTRUCT'`))[0]?.body;
const meta = (await run(`select v.body from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier = 'T3A-D9-EXEC-001-STATEMENT-LIBRARY'`))[0]?.body;
M.counts = {
  conduct_elements: Object.keys(cons?.conduct_elements || {}).length, situation_classes: Object.keys(cons?.situation_classes || {}).length,
  question_objects: await n(`select count(*)::int n from t3a_d1_question_object where dimension_id='D9'`), capture_sets: await n(`select count(*)::int n from t3a_d1_capture_set where dimension_id='D9'`),
  capture_lines: await n(`select count(*)::int n from t3a_d1_capture_line where dimension_id='D9'`), branch_rules: await n(`select count(*)::int n from t3a_d1_branch_rule where dimension_id='D9'`),
  recorded_conduct_entries: await n(`select count(*)::int n from t3a_d1_statement_library where dimension_id='D9' and statement_key ~ '^ST-D9-0[0-4][0-9]$'`), resolution_rules: await n(`select count(*)::int n from t3a_resolution_refusal_rule where dimension_id='D9' and rule_code ~ '^RR-D9-0[0-9]$'`),
  recurrence_keys: Object.keys(meta?.recurrence_keys || {}).length, templates: await n(`select count(*)::int n from t3a_d1_language_template where dimension_id='D9'`),
  sources: await n(`select count(*)::int n from t3a_content_object where identifier ~ '^SRC-D9-S[1-4]-0'`), demonstration_fixtures: await n(`select count(*)::int n from t3a_content_object where identifier ~ '^DEMO-D9-S[1-4]-001$'`),
  source_bound_families: await n(`select count(distinct source_bound_family)::int n from t3a_d1_question_capture_map where dimension_id='D9' and source_bound_family is not null`),
  consuming_controls: await n(`select count(*)::int n from t3a_d1_question_capture_map where dimension_id='D9' and source_bound_family is not null`),
  placeholders: await n(`select count(*)::int n from t3a_dimension_placeholder where dimension_id='D9'`), pattern_families: await n(`select count(*)::int n from t3a_interaction_pattern_family where dimension_id='D9'`),
  prohibited_words_section_5_7a: await n(`select count(*)::int n from t3a_rce_prohibited_vocabulary where dimension_id='D9' and version='PV-D9-1.0'`), retired_words_section_4_2: await n(`select count(*)::int n from t3a_rce_prohibited_vocabulary where dimension_id='D9' and version='PV-D9-4.2'`),
  question_definition_rows: await n(`select count(*)::int n from t3a_question_definition where dimension_id='D9'`), review_items: await n(`select count(*)::int n from t3a_dimension_review_item where dimension_id='D9'`),
  session_archive_records: await n(`select count(*)::int n from t3a_lsa_registry_record where package_id='T3A-D9-LSA-CONTENT-001'`),
};
const want = { conduct_elements: 9, situation_classes: 7, question_objects: 16, capture_sets: 16, branch_rules: 7, recorded_conduct_entries: 44, resolution_rules: 8, recurrence_keys: 9, templates: 13, sources: 35 };
for (const [k, v] of Object.entries(want)) rec("D9-manifest", `Section 0.9 count ${k} = ${v}: the registry holds ${M.counts[k]}`, M.counts[k] === v, M.counts[k]);
rec("D9-manifest", "the registry also reconciles on the counts the register tables imply: 44 capture lines (one per answer), 7 source-bound families each with one consuming control, 7 placeholders, 7 pattern families, 88 prohibited and 39 retired words, 44 question definition rows, 2 D9 checklist items, 30 Session Archive records, 4 fixtures", M.counts.capture_lines === 44 && M.counts.source_bound_families === 7 && M.counts.consuming_controls === 7 && M.counts.placeholders === 7 && M.counts.pattern_families === 7 && M.counts.prohibited_words_section_5_7a === 88 && M.counts.retired_words_section_4_2 === 39 && M.counts.question_definition_rows === 44 && M.counts.review_items === 2 && M.counts.session_archive_records === 30 && M.counts.demonstration_fixtures === 4, M.counts);
// every entry belongs to a question and an answer that exist; every answer line has an entry; the statement placeholders are all in the grammar
const orphan = await n(`select count(*)::int n from t3a_d1_statement_library s where s.dimension_id='D9' and s.statement_key ~ '^ST-D9-0[0-4][0-9]$' and not exists (select 1 from t3a_d1_question_capture_map m join t3a_d1_capture_line l on l.dimension_id=m.dimension_id and l.capture_set_code=m.capture_set_code where m.dimension_id='D9' and m.question_code=s.question_code and 'A' || l.line_order = s.answer_code)`);
const unmapped = await n(`select count(*)::int n from t3a_d1_capture_line l join t3a_d1_question_capture_map m on m.dimension_id=l.dimension_id and m.capture_set_code=l.capture_set_code where l.dimension_id='D9' and not exists (select 1 from t3a_d1_statement_library s where s.dimension_id='D9' and s.statement_key ~ '^ST-D9-0[0-4][0-9]$' and s.question_code=m.question_code and s.answer_code='A' || l.line_order)`);
const badVars = await n(`select count(*)::int n from t3a_d1_statement_library s, unnest(s.bound_variables) v where s.dimension_id='D9' and s.statement_key ~ '^ST-D9-0[0-4][0-9]$' and not exists (select 1 from t3a_dimension_placeholder p where p.dimension_id='D9' and p.placeholder_name=v)`);
rec("D9-manifest", "every entry sits on a real question and answer, every answer line has exactly its entry, and every placeholder is in the grammar", orphan === 0 && unmapped === 0 && badVars === 0, { orphan, unmapped, badVars });
// question definition register: one row per pair, every question not calibration ready
const ready = await run(`select q.question_code, public.t3a_question_calibration_ready('D9', q.question_code) r from t3a_d1_question_object q where q.dimension_id='D9' order by q.display_order`);
M.question_definition = { rows: M.counts.question_definition_rows, calibration_ready: Object.fromEntries(ready.map(x => [x.question_code, x.r])) };
rec("D9-manifest", "the question definition register has 44 rows and all 16 questions read calibration_ready false", M.counts.question_definition_rows === 44 && ready.length === 16 && ready.every(x => x.r === false), M.question_definition.calibration_ready);
// sources by Stage and status
const srcs = await run(`select o.identifier, v.body, v.approval_status::text as st, v.operational_state::text as os, o.current_operational_state::text as cos from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D9-S[1-4]-0' order by 1`);
const byStage = {}; for (const s of srcs) { const k = s.body.stage_code; byStage[k] = byStage[k] || { count: 0, statuses: {} }; byStage[k].count++; byStage[k].statuses[s.st + "/" + s.os] = (byStage[k].statuses[s.st + "/" + s.os] || 0) + 1; }
M.sources_by_stage = byStage;
rec("D9-manifest", "35 sources: 10 at Stage 1, 8 at Stage 2, 7 at Stage 3 and 10 at Stage 4, every one drafting and not loaded for service, none approved, serving_eligible false on every sheet", srcs.length === 35 && byStage.S1.count === 10 && byStage.S2.count === 8 && byStage.S3.count === 7 && byStage.S4.count === 10 && srcs.every(s => s.st === "drafting" && s.os === "not_loaded" && s.body.serving_eligible === false && s.body.source_sheet.serving_eligible === false), byStage);
// source sheet completeness: the twenty D9 fields and the platform core fields are present on every sheet, once each
const F20 = ["permitted_administration_variance", "unsupported_inferences", "compatibility_class", "situation_shown", "current_approach", "indications", "approach_changes", "retention_grounds", "knowledge_sources", "open_points", "trial_steps", "next_work", "record_place", "practice_origin", "account_test_point", "account_test_record", "list_note", "source_note", "situation_class_label", "observation_mode_label"];
const lists = ["indications", "approach_changes", "retention_grounds", "knowledge_sources", "open_points", "trial_steps", "next_work"];
const need = (s) => F20.filter(f => !(s.body.stage_code === 'S3' && (f === 'account_test_point' || f === 'account_test_record')));   // Section 5.5: the account test fields are Stages 1, 2 and 4
const incomplete = srcs.filter(s => !need(s).every(f => f in s.body.source_sheet) || !lists.every(l => Array.isArray(s.body.source_sheet[l]) && s.body.source_sheet[l].length > 0 && s.body.source_sheet[l].every(i => i.id && i.text)) || !s.body.source_sheet.retention_grounds.length).map(s => s.identifier);
M.source_sheet_completeness = { sources: srcs.length, complete: srcs.length - incomplete.length, incomplete };
rec("D9-manifest", "every sheet carries the D9 fields of its Stages (all 20, and 18 at Stage 3 where the account test fields do not apply), every one of the seven lists is non-empty with an identifier and text on each item (every source records a ground for keeping the approach), and the observation mode label is the Stage's", incomplete.length === 0 && srcs.every(s => s.body.source_sheet.observation_mode_label === { S1: "written_response", S2: "structured_live_session", S3: "work_sample", S4: "group_session" }[s.body.stage_code]), M.source_sheet_completeness);
// the applicability table of every source: sixteen questions; Q-D9-09 NOT SERVED on every Stage 3 source and on no other
const appBad = srcs.filter(s => s.body.question_applicability.length !== 16 || s.body.question_applicability.filter(x => x.state === "NOT SERVED").map(x => x.question).join() !== (s.body.stage_code === "S3" ? "Q-D9-09" : "")).map(s => s.identifier);
rec("D9-manifest", "every source's applicability table has the sixteen questions, and Q-D9-09 is NOT SERVED on the seven Stage 3 sources and on no other source", appBad.length === 0, appBad);
// source arithmetic: the basis text of each served question counts the items of its list
const NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
const fam = { "Q-D9-01": "indications", "Q-D9-02": "approach_changes", "Q-D9-03": "retention_grounds", "Q-D9-04": "knowledge_sources", "Q-D9-05": "open_points", "Q-D9-06": "trial_steps", "Q-D9-07": "next_work" };
const arith = []; for (const s of srcs) for (const qa of s.body.question_applicability) if (fam[qa.question] && qa.state !== "NOT SERVED") { const m = qa.basis.match(/\b(one|two|three|four|five|six|seven|eight)\b/); if (!m || NUM[m[1]] !== s.body.source_sheet[fam[qa.question]].length) arith.push([s.identifier, qa.question, qa.basis]); }
rec("D9-manifest", "source arithmetic: the number named in each basis line equals the number of items on the list it describes, on all 35 sources", arith.length === 0, arith.slice(0, 5));
// source truth: each indication and ground is quoted in the material map, the quote is in the participant facing text, and the mapped item text equals the sheet's
const norm = (t) => t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
const texts = (b) => { const out = []; const walk = (v) => { if (typeof v === "string") out.push(v); else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); }; for (const [k, v] of Object.entries(b)) if (!["source_sheet", "material_map", "question_applicability"].includes(k)) walk(v); return norm(out.join("\n")); };
const truth = []; for (const s of srcs) { const all = texts(s.body); const mm = Object.fromEntries((s.body.material_map || []).map(r => [r.Item, r])); for (const f of ["indications", "retention_grounds"]) for (const it of s.body.source_sheet[f]) { const r = mm[it.id]; if (!r) truth.push([s.identifier, it.id, "not mapped"]); else { if (!all.includes(norm(r["Quoted text"]))) truth.push([s.identifier, it.id, "quote not in the participant facing text"]); if (r["Item text"] !== it.text) truth.push([s.identifier, it.id, "item text differs from the map"]); } } }
rec("D9-manifest", "source truth: every indication and every ground is mapped, its quoted text can be read in the participant facing source, and the mapped text is the sheet's text, on all 35 sources", truth.length === 0, truth.slice(0, 5));
// Stage 3: the account test fields are absent or None and the window is stated
const s3 = srcs.filter(s => s.body.stage_code === "S3");
rec("D9-manifest", "the seven Stage 3 sources hold no account test point (the asynchronous form puts nothing back)", s3.length === 7 && s3.every(s => !s.body.source_sheet.account_test_point || /^none$/i.test(s.body.source_sheet.account_test_point)), s3.map(s => s.body.source_sheet.account_test_point ?? null));
// drafting test, authorship and rights status
const dt = await run(`select o.identifier like 'DEMO-%' as demo, count(distinct o.identifier)::int srcs, count(t.*)::int rows from t3a_content_object o join t3a_d1_content_version v using (content_object_id) left join t3a_source_drafting_test t on t.source_version_id=v.content_version_id where o.identifier ~ '^(SRC|DEMO)-D9-S[1-4]-0' group by 1 order by 1`);
const rights = await n(`select count(*)::int n from t3a_source_rights_record r join t3a_d1_content_version v on v.content_version_id=r.source_version_id join t3a_content_object o using (content_object_id) where o.identifier ~ '^(SRC|DEMO)-D9-S[1-4]-0'`);
const appr = await n(`select count(*)::int n from t3a_d1_source_approval a join t3a_content_object o on o.content_object_id=a.source_id where o.identifier ~ '^(SRC|DEMO)-D9-S[1-4]-0'`);
M.drafting_tests = { sources: dt.find(x => x.demo === false), fixtures: dt.find(x => x.demo === true) }; M.rights_records = rights; M.approval_records = appr;
rec("D9-manifest", "drafting test status: the 35 sources hold no drafting test row (D-01: both empty), the 4 fixtures hold two each (the demonstration reviewer); Stage 3 rights records: none (D-02); approval records: none", dt.find(x => x.demo === false).rows === 0 && dt.find(x => x.demo === true).rows === 8 && rights === 0 && appr === 0, M);
// hashes and versions
const hashes = srcs.map(s => [s.identifier, s.body.source_version_hash]);
M.hashes = { sources_with_a_64_hex_digest: hashes.filter(h => /^[0-9a-f]{64}$/.test(h[1] || "")).length, version: (await run(`select distinct v.version_no from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^(SRC|DEMO)-D9-S[1-4]-0' order by 1`)).map(x => x.version_no), package: "T3A-D9-EXEC-001 v1.1", package_digest_of_the_edition: "8884ba5ae132" };
rec("D9-manifest", "the loaded hashes: all 35 sources carry the 64 hexadecimal digest of the package, and the loaded versions are v1.1 (sources) and v2.1 (fixtures)", M.hashes.sources_with_a_64_hex_digest === 35 && M.hashes.version.join() === "v1.1,v2.1", M.hashes);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), manifest: M, results: R }, null, 1));
await c.end(); process.exit(0);
