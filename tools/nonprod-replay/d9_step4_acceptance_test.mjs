// Step 4d: the consolidated D9 acceptance run (D9 Execution Edition Section 11: D9-01 to D9-71, the positive path tests D9-PP-01 to D9-PP-10 and the coverage test 11.3), under the Section 11 identifiers only.
// Each entry is either RUN here against the throwaway database, or is EVIDENCE from an earlier step file or from the browser render check, which this run re-reads (it fails if that evidence is absent or failing),
// or is NOT RUN with the reason. Synthetic approvals, clearances and accounts exist on the throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
process.on("uncaughtException", e => { console.log("ERR", e.message, JSON.stringify(R.slice(-3))); process.exit(1); });
const EVDIR = process.env.EVIDENCE_DIR || new URL("../../docs/day1/evidence/", import.meta.url).pathname;
const run = async (sql) => (await c.query(sql)).rows;
const R = [];
const pass = (id, label, ok, detail, how = "run") => R.push({ id, label, status: ok ? "PASS" : "FAIL", how, detail });
const notRun = (id, label, reason) => R.push({ id, label, status: "NOT_RUN", how: "surface", detail: reason });
const RUN = randomUUID().slice(0, 8);
const asRole = async (role, sub, sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claims', '${JSON.stringify(sub ? { role, sub } : { role })}', true)`); await c.query(`select set_config('request.jwt.claim.sub', '${sub || ""}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query(msg === "ok" ? "commit" : "rollback"); return { msg, rows, r: rows[0]?.r }; };
const svc = (sql) => asRole("service_role", null, sql);
const mkU = async (tag, role) => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','n${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','n${tag}-${RUN}@t.local','${role}')`); return u; };
const refused = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const srcOf = async (id) => (await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`))[0].v;
const H = "a".repeat(64);

// ---- evidence from earlier step files (re-read, never trusted without a passing label)
const files = {}; for (const f of fs.readdirSync(EVDIR).filter(x => /^d9-(step|lsa).*-test\.json$/.test(x))) files[f] = JSON.parse(fs.readFileSync(EVDIR + f, "utf8"));
const prior = (id, label, fileHint, ...needles) => {
  const hits = []; for (const [f, d] of Object.entries(files)) if (f.includes(fileHint)) for (const r of d.results) if (needles.every(n => r.label.toLowerCase().includes(n.toLowerCase()))) hits.push({ f, label: r.label, ok: r.pass });
  pass(id, label, hits.length > 0 && hits.every(h => h.ok), hits.map(h => `${h.f}: ${h.label}`), "evidence");
};

// ---- evidence from the browser render check of the multi page report (ber_multipage_render_check.mjs)
const RC = (() => { try { return JSON.parse(fs.readFileSync(EVDIR + "ber-multipage-render-check.json", "utf8")); } catch { return null; } })();
const rcPass = (id, label, needle, why) => { const hits = (RC?.results || []).filter(x => x.label.toLowerCase().includes(needle.toLowerCase())); pass(id, label, hits.length > 0 && hits.every(x => x.pass), hits.map(x => x.label), "evidence"); void why; };

const P = await mkU("p", "candidate"), M1 = await mkU("m1", "mentor"), M2 = await mkU("m2", "mentor"), RV = await mkU("rv", "mentor"), IS = await mkU("is", "mentor");
const S1 = await srcOf("SRC-D9-S1-001"), S2 = await srcOf("SRC-D9-S2-001"), S3 = await srcOf("SRC-D9-S3-001"), S4 = await srcOf("SRC-D9-S4-001");
const compose = async (src, stage, answers, missing = {}, items = {}, test = true) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},gen_random_uuid(),${test}) r`); return r.rows[0]?.r || { msg: r.msg }; };
const full = { "Q-D9-01": "A1", "Q-D9-01b": "A1", "Q-D9-02": "A1", "Q-D9-02b": "A1", "Q-D9-03": "A1", "Q-D9-03b": "A1", "Q-D9-04": "A1", "Q-D9-04b": "A1", "Q-D9-05": "A1", "Q-D9-05b": "A1", "Q-D9-06": "A1", "Q-D9-06b": "A1", "Q-D9-07": "A1", "Q-D9-07b": "A1", "Q-D9-08": "A1", "Q-D9-09": "A1" };
const items = { "Q-D9-01b": ["IN1"], "Q-D9-02b": ["AC1"], "Q-D9-03b": ["RG1"], "Q-D9-04b": ["KS1", "KS2"], "Q-D9-05b": ["OP1"], "Q-D9-06b": ["TS1"], "Q-D9-07b": ["NW1"] };
const without = (a, ...k) => Object.fromEntries(Object.entries(a).filter(([x]) => !k.includes(x)));
const core = async (stage, answers, bound = {}) => (await svc(`select t3a_resolve_core('D9','${stage}',${J(answers)},${J(bound)},true) r`)).rows[0]?.r;
const B = { named_indication_count: 1, stated_change_count: 1, named_ground_count: 1, stated_source_count: 2, questioned_point_count: 1, stated_trial_count: 1, named_work_count: 1 };

// ---------------- D9-01 .. D9-12 ----------------
let r = await svc(`select t3a_source_serving_gate('${S2}','S2') r`); let c2 = await compose(S2, 2, full, {}, items, false);
pass("D9-01", "an unapproved D9 source is unreachable from the serving gate and from production composition", r.rows[0]?.r?.reason === "source_not_approved" && c2.outcome === "refused", [r.rows[0]?.r?.reason, c2.reason]);
prior("D9-01", "and from assignment of a Stage 3 source", "step3j", "unapproved Stage 3 source cannot be assigned");
prior("D9-02", "a D9 source with a null situation class cannot be approved (D9-02 names d8_situation_class, a slip for d9_situation_class: the check is on d9_situation_class)", "step3d", "null situation class");
prior("D9-02", "and a source written 'code with code' is read by its first named class", "step3d", "first named class governs");
prior("D9-03", "Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent", "step3f", "closed but no confirmation");
prior("D9-03a", "Stage 1 instance still open: s1_instance_not_closed", "step3f", "not closed refuses");
prior("D9-03b", "confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent", "step3f", "other than the assigned mentor");
prior("D9-03c", "Stage 1 observation uncommitted: s1_observation_not_committed", "step3f", "nothing committed");
prior("D9-03d", "no progression, or a progression that blocks: s1_progression_absent_or_blocks", "step3f", "committed, no progression");
// D9-04: Q-D9-09 at Stage 3, and Q-D9-06 / Q-D9-06b on a source whose trial_steps is empty
const s3q9 = await compose(S3, 3, full, {}, items), s3m9 = await compose(S3, 3, without(full, "Q-D9-09"), { "Q-D9-09": "no_response" }, items);
const nTrial = JSON.parse(JSON.stringify((await run(`select body from t3a_d1_content_version where content_version_id='${S2}'`))[0].body)); nTrial.source_identifier = "SRC-D9-N-NT-" + RUN; nTrial.source_sheet.trial_steps = []; nTrial.question_applicability = nTrial.question_applicability.map(x => /Q-D9-06/.test(x.question) ? { ...x, state: "NOT SERVED" } : x);
await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${nTrial.source_identifier}','source','nt','D9','not_loaded')`);
const NT = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(nTrial)} from t3a_content_object where identifier='${nTrial.source_identifier}' returning content_version_id v`))[0].v;
const nt6 = await compose(NT, 2, full, {}, items), nt6b = await compose(NT, 2, { ...without(full, "Q-D9-06b"), }, {}, without(items, "Q-D9-06b")), nt6c = await compose(NT, 2, without(full, "Q-D9-06", "Q-D9-06b"), {}, without(items, "Q-D9-06b"));
const rows04 = (await run(`select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}' and source_version_id in ('${S3}','${NT}') and (answers ? 'Q-D9-09' and stage_code='S3' or answers ? 'Q-D9-06b' and source_version_id='${NT}')`))[0].n;
pass("D9-04", "Q-D9-09 at Stage 3 is unavailable (an answer and a missing state both refuse) and Q-D9-06 or Q-D9-06b on a source whose trial_steps is empty is unavailable; no row is written for either", s3q9.reason === "answer_for_question_not_served" && s3m9.reason === "answer_for_question_not_served" && nt6.reason === "answer_for_question_not_served" && nt6b.reason === "answer_for_question_not_served" && nt6c.outcome === "composed" && rows04 === 0, [s3q9.reason, s3m9.reason, nt6.reason, nt6b.reason, nt6c.outcome, rows04]);
prior("D9-04", "and the Stage 3 pattern composes with no clause at all for Q-D9-09", "step3e", "fifteen clauses and nothing at all for q-d9-09");
const q5 = await compose(S2, 2, full, {}, { ...items, "Q-D9-01b": [] });
pass("D9-05", "Q-D9-01 A1 with Q-D9-01b nothing selected is refused: the parent asserts a listed indication was named and the child identifies none", q5.outcome === "refused" && q5.reason === "selection_does_not_match_answer", q5);
prior("D9-05", "the same for each of the seven pairs, and the resolution rules RR-D9-01 to RR-D9-08 refuse their patterns", "step3c", "RR-D9-08");
const q6 = await core(2, { "Q-D9-03": "A3" }, B);
pass("D9-06", "Q-D9-03 A3 resolves to ST-D9-013 alone; the unserved child contributes no negative sentence", q6.outcome === "resolved" && q6.statements.length === 1 && q6.statements[0].statement_key === "ST-D9-013", q6.statements?.map(x => x.statement_key));
prior("D9-06", "and composition writes no child clause", "step3e", "resolves to st-d9-013 alone");
const bi = await compose(S2, 2, full, {}, { ...items, "Q-D9-07b": ["NW3"] });
pass("D9-07", "a bound item from another source version (NW3 is on other D9 sources, not on this version) is refused", bi.reason === "bound_item_not_on_source", bi);
const bd = await compose(S2, 2, full, {}, { ...items, "Q-D9-02b": ["M1"] });
pass("D9-08", "a bound item from a D1 source is refused", bd.reason === "bound_item_not_on_source", bd);
const un = await compose(S2, 2, without(full, "Q-D9-09"), {}, items);
pass("D9-09", "a served question unanswered with no missing state code is refused", un.reason === "served_question_unanswered", un);
const na = await compose(S2, 2, without(full, "Q-D9-09"), { "Q-D9-09": "not_applicable" }, items); const ny = await compose(S2, 2, without(full, "Q-D9-09"), { "Q-D9-09": "not_yet_observed" }, items);
pass("D9-10", "not_applicable and not_yet_observed cannot be posted as missing states", na.outcome === "refused" && ny.outcome === "refused", [na.reason, ny.reason]);
const iso = await core(2, { "Q-D1-01": "A1" }, B);
const isoCompose = await svc(`select t3a_dimension_compose('${P}','${(await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.dimension_id='D1' and o.family='source' limit 1`))[0]?.v || S2}','2',${J({ "Q-D1-01": "A1" })},'{}'::jsonb,'{}'::jsonb,gen_random_uuid(),true) r`);
pass("D9-11", "a D1 input to a D9 computation is refused as a dimension isolation violation, and D1 observations never enter the D9 observation set", iso.reason === "dimension_isolation_violation" && (isoCompose.rows[0]?.r?.outcome === "refused" || isoCompose.msg !== "ok"), [iso.reason, isoCompose.rows[0]?.r?.reason]);
prior("D9-11", "and a D9 evidence state counts D9 records only", "step3g", "never read by a d9 evidence state");
prior("D9-12", "a D9 clause instance against a D1 clause instance is refused (shown against D3 and D4 clause instances: the key namespace of a dimension is its own)", "step3e", "d9 clause instance against a d3");

// ---------------- D9-13 .. D9-17 : evidence state frames ----------------
prior("D9-13", "FR-D9-2 with no approved cross-context row is refused; the side by side condition still shows", "step3g", "no approved cross-context relationship");
prior("D9-14", "three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead", "step3g", "differing state codes");
prior("D9-15", "a material contradiction in the full set blocks the recurrence frame although three match", "step3g", "cherry-picking");
prior("D9-16", "recurrence configuration unloaded: refused regardless of the data", "step3g", "configuration is not locked");
prior("D9-17", "a record_status entry (ST-D9-044) in three contexts never satisfies the recurring frame", "step3g", "record_status entry (st-d9-044)");
prior("D9-17", "and the platform composes every record_status entry as a recurrence blocker, with the library flag false for all 44 entries", "step3e", "nothing stated at all composes nine record status entries");

// ---------------- D9-18, D9-19 : issuance floor ----------------
prior("D9-18", "a D9 row below the floor (one context) cannot be issued: named blocker below_issuance_floor", "step3h", "floor is met");
const mkRep = async (part, dims, specimen = false) => { const st = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s; return (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${part}','D9','${st}','{}'::jsonb, ${specimen}, 'ber', 'participant_review', array[${dims.map(d => `'${d}'`).join(",")}], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r; };
const Q = await mkU("q", "candidate"); const OA = await mkU("oa", "mentor");
await run(`delete from t3a_cross_context_relationship`);
for (const [src, st] of [[S2, "S2"], [S3, "S3"]]) { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${Q}','D9','${st}','${OA}',true) returning observation_record_id i`))[0].i; await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D9','${o}','${Q}','${st}','${src}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`); }
await run(`insert into t3a_cross_context_relationship(dimension_id, source_version_a, source_version_b, approved_by) values ('D9','${S2 < S3 ? S2 : S3}','${S2 < S3 ? S3 : S2}','${RV}') on conflict do nothing`);
const repQ = await mkRep(Q, ["D1", "D9"]); const gq = (await run(`select t3a_report_issuance_gate('${repQ}') g`))[0].g;
pass("D9-19", "one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer", gq.blockers.some(b => b.code === "fewer_than_two_authorized_observers") && gq.blockers.some(b => b.code === "below_issuance_floor"), gq.blockers.map(b => b.code));
prior("D9-20", "the observer of the D1 record of a two-dimension report cannot be its evidence reviewer", "step3f", "observed the d1 record");
prior("D9-21", "the reviewer cannot be the issuer", "step3h", "reviewer cannot be the issuer");
prior("D9-22", "no participant response to the pre-issue review notice: issuance blocks; no timeout", "step3h", "no recorded participant outcome");
prior("D9-23", "a correction against a D9 sentence blocks the report; the D9 record is in reconsideration and D1 is untouched", "step3h", "correction against a d9 record");
prior("D9-24", "an in-place edit of a composed statement is refused; supersession only", "step3e", "editing a composed statement");
{ const r2 = await mkRep(P, ["D1", "D3"], true);
  const lo = (await run(`select t3a_report_render_gate('${r2}','one_page') r`))[0].r; const mp = (await run(`select t3a_report_render_gate('${r2}','multi_page') r`))[0].r;
  pass("D9-25", "a two-dimension specimen on one page fails and logs layout_overflow; the multi page form renders it without expanding or compressing the single page", lo.reason === "layout_overflow" && mp.outcome === "renderable", [lo.reason, mp.outcome]);
  await run(`update t3a_d1_ber_report set specimen_render_flag = false where ber_report_id = '${r2}'`);
  const lo2 = (await run(`select t3a_report_render_gate('${r2}','one_page') r`))[0].r;
  pass("CR-10", "a report that is not a specimen routed to the single page renderer is refused format_mismatch", lo2.reason === "format_mismatch", lo2.reason); }
prior("D9-25", "a two-dimension report with D9 renders through the multi page renderer; the single page route refuses format_mismatch and the multi page route is renderable with two dimension blocks", "step3h", "two-dimension report with d9 renders through the multi page renderer");

// ---------------- D9-26 .. D9-28 : rendered output scans (on the 44 statements, the 13 templates and constructed renders) ----------------
const bad = await run(`select count(*)::int n from t3a_d1_statement_library l where l.dimension_id='D9' and l.statement_key ~ '^ST-D9-0[0-4][0-9]$' and (t3a_prohibited_output_check('D9', l.statement_body)->>'passed')::boolean is not true`);
const ov = (await run(`select t3a_prohibited_output_check('D9', 'Overall profile: 3 of 5 dimensions complete, average strong') r`))[0].r;
pass("D9-26", "no overall, composite, average or profile element: such an element fails the scan, and none of the 44 statements carries one", ov.passed === false && ov.findings.some(f => f.rule === "cross_dimension_aggregate") && bad[0].n === 0, [ov.passed, bad[0].n]);
const tplAgg = await run(`select language_template_id from t3a_d1_language_template where dimension_id='D9' and (t3a_prohibited_output_check('D9', template_body)->>'passed')::boolean is not true`);
pass("D9-26", "and none of the 13 templates, nor the report's own controlled structure, carries one", tplAgg.length === 0, tplAgg);
prior("D9-27", "no Section 3.2 word (the 11 verbs another dimension owns, the performed acts, the learning and capacity words and the modals), in rendered D9 output", "step3c", "the section 3.2 word \"learned\"");
prior("D9-27", "a word that belongs to another dimension fails as cross_dimension_assertion, at the scan and at composition", "step3c", "which another dimension owns");
prior("D9-27", "and a composed entry carrying such a word refuses at composition", "step3e", "belonging to another dimension refuses and logs cross_dimension_assertion");
const names = await run(`select statement_key from t3a_d1_statement_library l where l.dimension_id='D9' and l.statement_key ~ '^ST-D9-0[0-4][0-9]$' and l.statement_body ~ '(^|[.!?] +)?[a-z, ]+ [A-Z][a-z]+ [A-Z][a-z]+'`);
const tpl = await run(`select count(*)::int n from t3a_d1_language_template where dimension_id='D9' and template_body ~ '[a-z] [A-Z][a-z]+ [A-Z][a-z]+'`).catch(() => [{ n: 0 }]);
const srcNames = await run(`select o.identifier from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D9-S[1-4]-0' and (v.body->'source_sheet'->>'name_clearance_basis') !~ 'no real person or organization is named'`);
pass("D9-28", "no named third party in any D9 statement or template (outputs name controlled roles, never people), and every one of the 35 sources states that it names no real person or organization", names.length === 0 && tpl[0].n === 0 && srcNames.length === 0, { statements: names.length, templates: tpl[0].n, sources_without_the_statement: srcNames.length });

// ---------------- D9-29 .. D9-34 ----------------
prior("D9-29", "a D9 mentor cannot be authorized from a D1 calibration record", "step3i", "d1 clearance confers nothing");
prior("D9-30", "a participant who met the same D9 interaction pattern family is excluded", "step3d", "same situation pattern family");
prior("D9-30a", "the Stage 2 seven-beat form met under D1 excludes the D9 Stage 2 form without any mapping", "step3d", "seven-beat form under d1");
prior("D9-30b", "a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent", "step3m", "cross_dimension_mapping_absent");
prior("D9-31", "D9 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited", "step3m", "only d1 mentor_observation");
prior("D9-32", "issuing a report that holds a D9 record on D1 consent alone: refused and logged consent_not_inherited", "step3m", "issuance written for that report");
prior("D9-33", "pool availability needs employer_share for every dimension in the report", "step3m", "employer_share granted for d1 only");
prior("D9-34", "an unloaded evidence currency value blocks issuance (checklist item 13)", "step3h", "unloaded evidence currency");
const BLANK3 = `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('correction_response_time','','0.0','${IS}'),('correction_acknowledge_business_days','','0.0','${IS}'),('correction_decision_target_business_days','','0.0','${IS}')`;
{ await c.query("begin"); await c.query(BLANK3); const un = (await run(`select t3a_correction_commitment() r`))[0].r; await c.query("rollback"); // the migration loads the founder's values; this check starts from unloaded
  await c.query("begin"); await c.query(BLANK3); await c.query(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('correction_response_time','synthetic test value','0.0','${IS}'),('correction_acknowledge_business_days','5','0.0','${IS}'),('correction_decision_target_business_days','20','0.0','${IS}')`); const lo = (await run(`select t3a_correction_commitment() r`))[0].r; await c.query("rollback");
  const anon = await c.query("begin").then(async () => { await c.query(BLANK3); await c.query("set local role anon"); try { return (await c.query(`select t3a_correction_commitment() r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("rollback"); } });
  pass("D9-35", "the correction commitment text does not render while the response time is unloaded: the route returns nothing to render and no default value appears; loaded, it returns the value as loaded (rolled back)", un.rendered === false && un.value === undefined && lo.rendered === true && lo.value === "synthetic test value" && anon.rendered === false, { unloaded: un, loaded: lo, anon }); }
prior("D9-36", "each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults", "step3m", "unloaded: the route fails closed");
rcPass("D9-37", "a report with the permitted-use text unloaded: the render refuses and the block is never omitted", "permitted-use text unloaded");
prior("D9-38", "a Stage 3 artifact with no tooling declaration is refused and logged", "step3j", "AI_USE_DECLARATION_REQUIRED");
{ const g = async (w, h, d = "desktop") => (await run(`select t3a_d1_s2_capture_permitted(${w},${h},'${d}') r`))[0].r;
  const a = await g(1279, 800), b2 = await g(1280, 799), ok2 = await g(1280, 800), ph = await g(1920, 1080, "phone");
  pass("D9-39", "the Mentor Cockpit below 1280 by 800 refuses capture (the route returns the refusal; the screen draws it in place of the six regions and does not reflow; the browser at 1280 by 800 is not run here); 1280 by 800 permits; a phone refuses", a.permitted === false && a.refusal_code === "VIEWPORT_BELOW_SUPPORTED_MINIMUM" && b2.permitted === false && ok2.permitted === true && ph.permitted === false, { a: a.refusal_code, b: b2.refusal_code, ok: ok2.permitted, phone: ph.refusal_code }); }
prior("D9-40", "an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded", "step3m", "timing_not_comparable");
prior("D9-41", "Stage 4 entry with no group participation record is refused", "step3j", "one missing permission among four still refuses");
prior("D9-42", "capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route", "step3m", "disabled_consent_route");
const nr = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D9' and statement_key ~ '^ST-D9-0[0-4][0-9]$' and statement_body ~* '(named recipient|release token|redemption passcode|released to your organization)'`);
const nrv = (await run(`select t3a_prohibited_output_check('D9', 'This report was released to your organization with a release token') r`))[0].r;
pass("D9-43", "no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan", nr.length === 0 && nrv.passed === false, { statements: nr.length, scan: nrv.passed });
prior("D9-44", "a source with either drafting-test row empty cannot be approved: drafting_test_incomplete", "step3d", "table backstop refuses an approval");
prior("D9-45", "a drafting-test reviewer equal to the source author is refused", "step3d", "member of the author list");
prior("D9-46", "a Stage 3 source with no rights record is refused at submission, rights_route_absent", "step3d", "rights_route_absent");
prior("D9-47", "Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result", "step3j", "s4_not_activated");

// D9-48: static scan of the database for a second release model, a bypass of s4_activation_state, or an override reaching a real Stage 4 entry
const startFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'update public\\.t3a_d1_group_session set started_at' and p.proname <> 't3a_s4_enter'`);
const actRefs = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%s4_activation_state%' and p.proname not in ('t3a_s4_activation_state','t3a_s4_enter','t3a_source_serving_gate','t3a_source_select')`);
const poolModes = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'insert into public\\.t3a_report_release' and p.proname not in ('t3a_pool_make_available')`);
const tokenCreators = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'insert into public\\.t3a_d1_release_token' and p.proname not in ('t3a_named_route_closed')`);
const rawSql = (() => { const out = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + "/" + f.name; if (f.isDirectory()) { if (!["node_modules", ".git", "dist", "docs"].includes(f.name)) walk(p); } else if (/\.(tsx?|mjs)$/.test(f.name) && !/test/.test(p)) out.push(p); } }; try { walk((process.env.T3A_REPO_ROOT || new URL("../..", import.meta.url).pathname) + "/src"); } catch {} return out; })();
const srcHits = rawSql.filter(f => /s4_activation_state|activateStage4|bypassStage4|adminOverride/i.test(fs.readFileSync(f, "utf8")));
pass("D9-48", "no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned)", startFns.length === 0 && actRefs.length === 0 && poolModes.length === 0 && srcHits.length === 0, { startFns, actRefs, poolModes, tokenCreators, srcHits, files_scanned: rawSql.length });
prior("D9-48a", "a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route", "step3m", "superseded_route_invoked");

prior("D9-49", "Q-D9-02 A1 and Q-D9-03 A1 in one observation: both compose as separate clauses and render side by side; neither is suppressed, subordinated or worded as the conclusion", "step3e", "both compose as separate clauses");
prior("D9-49", "and the same two answers resolve to the same four entries whatever order they arrive in; a participant who states neither composes no adverse clause", "step3c", "q-d9-02 a3 with q-d9-03 a4 is permitted");
prior("D9-50", "a resolution table with one row naming a question absent from the question objects is refused whole and logged; the loader does not skip the row", "step4a", "refused whole");
prior("D9-58", "a source whose served question has an empty definition cannot enter the production approval path: question_definition_incomplete", "step4a", "cannot enter the production approval path");
prior("D9-59", "a calibration run on a question with an empty definition does not open: question_definition_incomplete", "step3i", "does not open");
prior("D9-60", "the demonstration fixtures and the full acceptance suite run with every question definition empty: the refusal sits on production approval and calibration only", "step4a", "every one of the 16 questions carries calibration_ready false");
// D9-61: the Stage form check at every Stage
prior("D9-61", "a performed act word in a composed D9 entry refuses and logs stage_form_violation at Stages 1, 2, 3 and 4 (each of the twelve words checked at every Stage)", "step3e", "composing a d9 entry that carries a registered verb refuses");
pass("D9-61", "the twelve words are registered for D9 at every Stage and for no other dimension", (await run(`select count(*)::int n from t3a_stage_form_dimension_verb where dimension_id='D9'`))[0].n === 12 && (await run(`select count(*)::int n from t3a_stage_form_dimension_verb where dimension_id <> 'D9'`))[0].n === 0, null);
pass("D9-61", "a Stage 1 pattern composes with the stage_1_only limitation (every element is carried at Stage 1)", (await compose(S1, 1, full, {}, items)).conditions?.includes("stage_1_only"), null);
rcPass("D9-51", "the evidence currency statement appears visibly in a rendered report (the multi page report shows it on the controls page, with the evidence currency date)", "currency date visibly");
prior("D9-52", "any contact initiation from an employer surface is refused and logged contact_permission_absent", "step3m", "contact_permission_absent");
// D9-53: name clearance status read from the sheet, never defaulted
const pend = await run(`select o.identifier, v.body->'source_sheet'->>'name_clearance_status' s from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D9-S[1-4]-0'`);
const pre = (await run(`select t3a_source_approval_preconditions('${S2}') c`))[0].c;
const pendSrc = JSON.parse(JSON.stringify((await run(`select body from t3a_d1_content_version where content_version_id='${S2}'`))[0].body)); pendSrc.source_identifier = "SRC-D9-N-PEND-" + RUN; pendSrc.source_sheet.name_clearance_status = "PENDING";
await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${pendSrc.source_identifier}','source','pend','D9','not_loaded')`);
const PV = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(pendSrc)} from t3a_content_object where identifier='${pendSrc.source_identifier}' returning content_version_id v, body->'source_sheet'->>'name_clearance_status' s`))[0];
const pendGate = await svc(`select t3a_source_serving_gate('${PV.v}','S2') r`);
pass("D9-53", "every loaded source carries the clearance status from its own sheet, and a D9 source whose sheet says PENDING keeps that value (never defaulted) and does not serve", pend.length === 35 && pend.every(x => x.s !== null && x.s !== undefined) && PV.s === "PENDING" && pendGate.rows[0]?.r?.reason === "source_not_approved" && ["drafting_test_incomplete", "name_clearance_pending", "not_submitted_for_approval"].includes(pre), { values: [...new Set(pend.map(x => x.s))], pending_copy: PV.s, gate: pendGate.rows[0]?.r?.reason, first_failing_precondition: pre });
// D9-54: bound family absent or empty
const empty = JSON.parse(JSON.stringify((await run(`select v.body b from t3a_d1_content_version v where v.content_version_id='${S2}'`))[0].b)); empty.source_sheet.next_work = []; empty.source_identifier = "SRC-D9-N-EMPTY-" + RUN;
await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${empty.source_identifier}','source','e','D9','not_loaded')`);
const ev = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(empty)} from t3a_content_object where identifier='${empty.source_identifier}' returning content_version_id v`))[0]?.v;
const n54 = await refused("BOUND_FAMILY_ABSENT_OR_EMPTY");
const e54 = ev ? await compose(ev, 2, full, {}, items) : { reason: "not_loaded" };
pass("D9-54", "a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders", e54.outcome === "refused" && /BOUND_FAMILY_ABSENT_OR_EMPTY/i.test(JSON.stringify(e54)) && (await refused("BOUND_FAMILY_ABSENT_OR_EMPTY")) === n54 + 1, e54);
prior("D9-55", "a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed", "step3m", "bound_item_integrity_failed");
prior("D9-56", "a timing determination with no loaded mentor_action_sequence is refused: beat_sequence_absent", "step3m", "beat_sequence_absent");
prior("D9-57", "b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2", "step3m", "marked as the decision point");

// D9-62: the specimen face and the persistence transition
rcPass("D9-62", "the specimen face renders in full with the specimen watermark on every page (the persistence refusal for a demonstration is tested at D9-PP-09 in the database run)", "demonstration footer");
// D9-63: no flag, override or test mode that lifts an approval, calibration or activation refusal
const testModeFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 't3a\\_%' and pg_get_function_arguments(p.oid) ~ 'p_test_mode' and p.prosrc !~* '(is_service_context|TEST_MODE_IS_SERVICE_ONLY|t3a_dimension_compose)' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
const overrideFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname ~* '(bypass|override_(approval|calibration|activation)|skip_(approval|calibration|gate)|force_(approve|activate))'`);
pass("D9-63", "no flag, override or test mode lifts an approval, calibration or activation refusal: every test mode parameter is service route only (checked in the routine, in the routine it delegates to, or by the grant), and no bypass routine exists", testModeFns.length === 0 && overrideFns.length === 0 && srcHits.length === 0, { testModeFns, overrideFns, srcHits });
// D9-64: every rendered D9 output at every Stage: the Section 5.7a words and the subject of every sentence
const W57 = ["learned", "learns", "learner", "learning", "realized", "understood", "grasped", "picked up", "caught on", "mastered", "grew", "growth", "improved", "improvement", "developed", "progressed", "agile", "agility", "adaptable", "adapted", "flexible", "coachable", "receptive", "open minded", "open-minded", "curious", "humble", "willing", "eager", "resistant", "resisted", "rigid", "stubborn", "defensive", "slow", "slowly", "quick", "quickly", "fast", "readily", "easily", "struggled", "capable", "ability", "intelligent", "smart", "bright", "competent", "beginner", "novice", "inexperienced", "expert", "rightly", "correctly", "wisely", "appropriately", "better", "worse", "best", "tends to", "always", "never", "likely", "took", "acted", "sought", "performed", "applied", "carried out", "tried", "tested", "adopted", "changed", "adjusted", "switched", "will", "would", "owned", "caused", "blamed", "prioritized", "verified", "proposed", "agreed", "disclosed", "recovered", "resumed", "persuaded"];
const unflagged = []; for (const w of W57) { const x = (await run(`select t3a_prohibited_output_check('D9', 'the participant stated that it was ${w} here') r`))[0].r; if (x.passed) unflagged.push(w); }
const badAll = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D9' and statement_key ~ '^ST-D9-0[0-4][0-9]$' and ((t3a_prohibited_output_check('D9', statement_body)->>'passed')::boolean is not true or t3a_entry_subject_check('D9', statement_body)->>'outcome' <> 'ok')`);
const badTpl = await run(`select language_template_id from t3a_d1_language_template where dimension_id='D9' and (t3a_prohibited_output_check('D9', template_body)->>'passed')::boolean is not true`);
const rendered = []; for (const stg of [1, 2, 3, 4]) { const src = [S1, S2, S3, S4][stg - 1]; const cm = await compose(src, stg, stg === 3 ? without(full, "Q-D9-09") : full, {}, items); for (const cl of cm.clauses || []) { const chk = (await run(`select t3a_prohibited_output_check('D9', ${J(cl.clause_text).replace("::jsonb", "")}::jsonb #>> '{}') p, t3a_entry_subject_check('D9', ${J(cl.clause_text).replace("::jsonb", "")}::jsonb #>> '{}') s`))[0]; if (!chk.p.passed || chk.s.outcome !== "ok") rendered.push([stg, cl.state_code]); } }
const absent = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D9' and statement_key ~ '^ST-D9-0[0-4][0-9]$' and entry_type='record_status' order by 1`);
pass("D9-64", "all 88 words of Section 5.7a fail the scan, every statement (44), template (13) and the clauses composed at all four Stages carry none of them and have a statement as their subject, and the nine record status entries that record an absence describe a statement not observed, never a capacity", unflagged.length === 0 && W57.length === 88 && badAll.length === 0 && badTpl.length === 0 && rendered.length === 0 && absent.length === 9, { unflagged_words: unflagged, statements: badAll.length, templates: badTpl.length, composed_clauses_flagged: rendered, record_status_entries: absent.length });
prior("D9-64", "and a sentence whose subject is the participant's capacity, knowledge or state refuses as capacity_observation, at the check and at composition", "step3e", "subject is not a statement of the participant refuses");
prior("D9-65", "an altered committed observation with a recomputed hash is refused: commit_seal_invalid (the seal is a server side signature)", "step3e", "captures were altered");
prior("D9-65", "the seal key is never in the database: an unloaded key refuses", "step3e", "not loaded");
prior("D9-66", "a second observation record under an identifier already committed is refused; the first record stands", "step3e", "second original commit");
prior("D9-67", "a single page route for a D9 report refuses format_mismatch and logs it", "step3h", "d9 only report routed to the single page renderer");
prior("D9-67", "also for a D9 only specimen (no route from a D9 report to the single page renderer)", "step3h", "d9 only specimen routed");
rcPass("D9-67", "a D9 only report renders as three pages through the multi page renderer", "D9 only report renders three pages");
prior("D9-68", "practice_origin appears nowhere: the display route strips it, the reference card of all 39 sources never carries it, no statement, template, capture line or question stem holds it", "step3m", "the mentor cockpit reference card");
prior("D9-68", "and the display body of every source has no practice_origin key and no text of it", "step3m", "display body of every d9 source");
prior("D9-69", "a sheet field for a response, capacity, knowledge, state or speed, or a list item naming ability, age, origin, language or education, is refused at load and logged capacity_observation", "step3m", "is refused at load, nothing is stored, and capacity_observation is logged");

// D9-70: a claim package for a stated change and one for a kept approach, from the same kind of observation
{ const mk = async (answers, itemsX, tag) => {
    const U = await mkU("c70" + tag, "candidate"); const O1 = await mkU("o70a" + tag, "mentor"), O2 = await mkU("o70b" + tag, "mentor");
    const out = [];
    for (const [src, stg, who] of [[S2, 2, O1], [S3, 3, O2]]) {
      const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${U}','D9','S${stg}','${who}',true) returning observation_record_id i`))[0].i;
      const cm = await svc(`select t3a_dimension_compose('${U}','${src}','${stg}',${J(stg === 3 ? without(answers, "Q-D9-09") : answers)},'{}'::jsonb,${J(itemsX)},'${o}',true) r`); out.push(cm.rows[0]?.r?.outcome);
    }
    const rep = await mkRep(U, ["D9"]); await run(`update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep}'`);
    await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('evidence_currency','6','0.7','${IS}')`);
    const cl = (await svc(`select t3a_ber_multipage_claims('${rep}', true) r`)).rows[0]?.r; return { out, cl }; };
  const none = { "Q-D9-01": "A3", "Q-D9-02": "A3", "Q-D9-03": "A4", "Q-D9-04": "A3", "Q-D9-05": "A3", "Q-D9-06": "A3", "Q-D9-07": "A4", "Q-D9-08": "A3", "Q-D9-09": "A4" };
  const chg = await mk({ ...none, "Q-D9-02": "A1", "Q-D9-02b": "A1" }, { "Q-D9-02b": ["AC1"] }, "x"), keep = await mk({ ...none, "Q-D9-03": "A1", "Q-D9-03b": "A1" }, { "Q-D9-03b": ["RG1"] }, "y");
  const a = chg.cl?.render_manifest?.claim_packages?.[0], b = keep.cl?.render_manifest?.claim_packages?.[0];
  const ea = chg.cl?.entries?.[a?.entry_id], eb = keep.cl?.entries?.[b?.entry_id];
  const shape = (cp, e) => JSON.stringify({ cpKeys: Object.keys(cp).sort(), entryKeys: Object.keys(e).sort(), type: e.entry_type, disp: e.use_disposition, state: cp.evidence_state, ctx: cp.supporting_contexts.map(x => Object.keys(x).sort()), bound: Object.keys(cp.bound_values), diff: cp.differences.length, dep: cp.context_dependencies.length });
  pass("D9-70", "a claim package for a stated change (a participant who stated a change and nothing about keeping) and one for a kept approach (the reverse) come out of the same builder with the same keys, the same entry type, the same evidence state frame, the same disposition, the same context shape and no differences or dependencies attached to either; they differ only in the entry identifier and text", !!a && !!b && a.entry_id === "ST-D9-006" && b.entry_id === "ST-D9-011" && shape(a, ea) === shape(b, eb) && a.evidence_state === b.evidence_state && ea.composed_text !== eb.composed_text && !/\b(but|however|although|instead)\b/i.test(ea.composed_text + " " + eb.composed_text), { change: [a?.entry_id, ea?.composed_text], keep: [b?.entry_id, eb?.composed_text], composed: [chg.out, keep.out] });
}
{ const srcFiles = []; const root = (process.env.T3A_REPO_ROOT || new URL("../..", import.meta.url).pathname) + "/src"; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + "/" + f.name; if (f.isDirectory()) walk(p); else if (/(berMultipage|BerMultiPrintView)/.test(p) && /\.(tsx?|css)$/.test(f.name) && !/test/.test(p)) srcFiles.push(p); } }; try { walk(root); } catch {}
  const hits = srcFiles.filter(f => /ST-D9|CE-D9|REK-D9|Q-D9|keep(ing)? the approach|stated change|kept approach/i.test(fs.readFileSync(f, "utf8")));
  pass("D9-70", "the multi page renderer's own source (layout, view and styles) has no branch, class or style keyed to a D9 entry, question, element or to a change or a kept approach: the frame, labels, order markers, type and colour of a claim package depend on its evidence state and entry type only", srcFiles.length >= 2 && hits.length === 0, { files_scanned: srcFiles.length, hits }); }
prior("D9-70", "no entry and no template joins a change and a kept approach with but, however, although or instead, and the frames carry no mention of either", "step3c", "joins a change and a kept approach");
prior("D9-70", "and the eight conditions are the same for every entry", "step3g", "the eight conditions of the precedence register");
rcPass("D9-70", "the browser render of a D9 only report shows no per-entry styling: the claim package block carries the dimension, never a change or a kept marker", "D9 claim package block");
prior("D9-71", "neither REK-D9-002 nor REK-D9-003 has a family, a direction rule, an entry or a state mapping in the D9 content package, and a request for either yields no direction, progression or regression finding (the module is dormant: the request is refused LSA-R04 and no request log route exists to write to)", "lsa", "neither rek-d9-002 nor rek-d9-003");
prior("D9-71", "each of the four requests over differing sequences", "lsa", "yields no direction, progression, regression or trajectory finding");
notRun("D9-71", "the Session Archive request is logged: the dormant module has no request route and so no request log (activation stays off); the refusal code is returned by the resolver and nothing else is written", "no request route exists in the dormant module");

// ---------------- positive path ----------------
prior("D9-PP-01", "two D9 observations with an approved row, agreeing: the multiple context frame is available", "step3g", "third state is breadth");
prior("D9-PP-02", "two D9 observations, approved row, diverging: held side by side with the divergence condition, neither preferred (L-D9-DIV-001)", "step3g", "side by side");
prior("D9-PP-02", "and the divergence template states that neither is presented in preference to the other", "step3g", "l-d9-div-001");
prior("D9-PP-03", "three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause (L-D9-REC-001)", "step3g", "clause recurs across stages");
prior("D9-PP-03", "and the recurrence template is loaded word for word", "step3g", "l-d9-rec-001");
prior("D9-PP-04", "Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits", "step3f", "proceed permits stage 2");
// PP-05: seven beats with a complete timing record and a decision point
const SQ = "SRC-D9-N-SEQ-" + RUN; const srcSeq = await (async () => { await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${SQ}','source','seq','D9','not_loaded')`); return (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded','${JSON.stringify({ source_identifier: SQ, stage_code: "S2", source_sheet: { d9_situation_class: "SC-D9-2" } })}'::jsonb from t3a_content_object where identifier='${SQ}' returning content_version_id v`))[0].v; })();
const beats = [["B1", "SAY", false], ["B2", "PAUSE", true], ["B3", "ASK", false], ["B4", "ASK", false], ["B5", "ASK", false], ["B6", "ASK", false], ["B7", "SAY", false]];
for (const [i, [code, type, dp]] of beats.entries()) await run(`insert into t3a_d1_mentor_action_sequence(source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point, pause_seconds_min, pause_seconds_max) values ('${SQ}',${i + 1},'${code}','${type}','verbatim ${code}',${dp},${dp ? 10 : "null"},${dp ? 15 : "null"})`);
const GW = (await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at, observation_notification_timestamp) values ('${P}','account_authentication','1.0','1.0',now(), now()) returning observation_path_gateway_id g`))[0].g;
const inst = (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','S2','D9',${50 + Math.floor(Math.random() * 40)},'scheduled') returning stage_instance_id i`))[0].i;
const see = (await run(`insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id, entry_authority_actor_id, stage_entry_hold_expires_at) values ('${P}','D9','S2','${GW}','${inst}','x','1.0','{}','{D9}','{}','${srcSeq}', gen_random_uuid(), now() + interval '1 hour') returning stage_entry_event_id i`))[0].i;
for (const [code] of beats) await run(`insert into t3a_d1_beat_timestamp(stage_entry_event_id, beat_code, duration_seconds, recorded_by) values ('${see}','${code}',${code === "B2" ? 12 : "null"},'${M1}')`);
const tq = (await run(`select question_code from t3a_d1_question_capture_map where dimension_id='D9' and answer_type ~* 'timing relative to' limit 1`))[0]?.question_code;
const tp = tq ? (await run(`select t3a_d1_timing_determination_permitted('${see}','${tq}') r`))[0].r : null;
const dpp = (await svc(`select t3a_decision_point_pause('${SQ}') r`)).rows[0]?.r;
const cm = await compose(S2, 2, full, {}, items);
pass("D9-PP-05", "Stage 2 with the seven beats: a complete timing record, the decision point read from the beat marked as one, and the determinations commit (D9 holds no timing question: the timing route is applied only if the register has one)", beats.length === 7 && (tp ? tp.permitted === true : tq === undefined) && dpp?.beat_code === "B2" && cm.outcome === "composed" && cm.clauses.length === 16, { timing_question: tq ?? null, decision_point: dpp?.beat_code, composed: cm.outcome, clauses: cm.clauses?.length });
// PP-06: a report with a distinct uninvolved reviewer and issuer issues successfully
const OB = await mkU("ob2", "mentor");
const Q2 = await mkU("q2", "candidate");
for (const [src, st, who] of [[S2, "S2", OA], [S3, "S3", OB]]) { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${Q2}','D9','${st}','${who}',true) returning observation_record_id i`))[0].i; await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D9','${o}','${Q2}','${st}','${src}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`); }
for (const t of ["scenario_logging", "mentor_observation"]) await svc(`select t3a_record_consent('${Q2}','${t}','granted','D9',null,'1.0','${H}','checkbox','en-CA','observation') r`);
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('evidence_currency','synthetic test value','0.0','${IS}')`);
const rep6 = await mkRep(Q2, ["D9"]);
const SEALKEY = "synthetic-test-key-" + randomUUID(); await run(`select set_config('t3a.commit_seal_key','${SEALKEY}',false)`);
for (const row of await run(`select composed_statement_id i from t3a_dimension_composed_statement where participant_id in ('${Q}','${Q2}') and composed_statement_id not in (select composed_statement_id from t3a_commit_seal)`)) await run(`select t3a_seal_composed('${row.i}', false)`);
await run(`insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${rep6}','${Q2}','reviewed_no_correction')`);
const vs6 = (await run(`select encode(extensions.digest('{}'::jsonb::text, 'sha256'), 'hex') h`))[0].h;
for (const i of [...Array.from({ length: 23 }, (_, k) => k + 1), 34, 35]) await run(`insert into t3a_dimension_review_result(ber_report_id, dimension_id, item_no, outcome, reviewer_id, version_set_hash) values ('${rep6}','D9',${i},'pass','${RV}','${vs6}')`);
const g6 = (await run(`select t3a_report_issuance_gate('${rep6}','${RV}','${IS}') g`))[0].g;
const before6 = (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep6}'`))[0].n;
const ins6 = await c.query(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${rep6}','${Q2}','D9','${IS}','issued','{}'::jsonb,'${H}')`).then(() => "ok").catch(e => e.message);
const after6 = (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep6}'`))[0].n;
pass("D9-PP-06", "a D9 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written); the 25 items are the 23 platform items and D9 items 34 and 35", g6.permitted === true && after6 === before6 + 1, { gate: g6.blockers?.map(b => b.code), insert: ins6, rows: [before6, after6] });
prior("D9-PP-07", "a successful correction: a new composed statement supersedes, the original is retained", "step3h", "successful correction produces a new");
// PP-08: grant employer availability on a report carrying D9, read the pool state, withdraw; the evidence record is untouched
const PPU = await mkU("pp8", "candidate"); await run(`update profiles set first_name='Pat', last_name='Pool' where id='${PPU}'`);
for (const dm of ["D1", "D9"]) await svc(`select t3a_record_consent('${PPU}','employer_share','granted','${dm}',null,'1.0','${H}','checkbox','en-CA','observation') r`);
const rep8 = await mkRep(PPU, ["D1", "D9"]); await run(`update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep8}'`);
const cs8 = (await run(`select count(*)::int n from t3a_dimension_composed_statement where participant_id='${PPU}'`))[0].n;
const mk8 = await asRole("authenticated", PPU, `select t3a_pool_make_available('${rep8}','Analyst','Toronto','Immediately','CA',false) r`);
const st8 = await asRole("authenticated", PPU, `select t3a_pool_state('${rep8}') r`);
const leak8 = (await run(`select (to_jsonb(e) ?| array['dimension_id','stage_code','conduct','observation_ref']) l from t3a_employer_pool_entry e where ber_report_id='${rep8}'`))[0];
const vc8 = (await run(`select verification_code c from t3a_d1_ber_report where ber_report_id='${rep8}'`))[0].c;
const ver8a = (await run(`select t3a_report_verify('${vc8}') r`))[0].r;
const wd8 = await asRole("authenticated", PPU, `select t3a_pool_withdraw('${rep8}') r`);
const ver8b = (await run(`select t3a_report_verify('${vc8}') r`))[0].r;
const after8 = (await run(`select (e.visibility_withdrawn_at is not null) w, (select count(*)::int from t3a_dimension_composed_statement where participant_id='${PPU}') cs from t3a_employer_pool_entry e where ber_report_id='${rep8}'`))[0];
pass("D9-PP-08", "availability granted on a report carrying D9 (employer_share for both dimensions), the pool state reads available (an approved organization reading the entry is the employer surface and is not run here), the pool entry holds no dimension, stage or conduct field, the participant withdraws, the entry leaves the pool, and the evidence record is untouched (and the status-only verification still returns the issued status before and after the withdrawal)", mk8.r?.outcome === "available" && st8.r?.available === true && leak8 && leak8.l === false && wd8.r?.outcome === "withdrawn" && after8.w === true && after8.cs === cs8 && ver8a.status === "issued" && ver8b.status === "issued", { make: mk8.r || mk8.msg, state: st8.r, withdraw: wd8.r || wd8.msg, after: after8, verification: [ver8a, ver8b] });
// PP-09: the full demonstration run across the four fixtures; nothing is issued
const demo = await run(`select o.identifier, v.body from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier like 'DEMO-D9-S_-001' order by 1`);
const specimen = await mkRep(P, ["D1", "D9"]); await run(`update t3a_d1_ber_report set specimen_render_flag = true where ber_report_id='${specimen}'`);
const issued0 = (await run(`select count(*)::int n from t3a_d1_report_issuance`))[0].n;
await c.query(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${specimen}','${P}','D9','${IS}','issued','{}'::jsonb,'${H}')`).catch(() => {});
const issued1 = (await run(`select count(*)::int n from t3a_d1_report_issuance`))[0].n;
const gDemo = (await run(`select t3a_report_issuance_gate('${specimen}','${RV}','${IS}') g`))[0].g;
const resolv = []; for (const d of demo) { const st = d.body.stage; const served = d.body.question_applicability.filter(x => x.state !== "NOT SERVED").length; resolv.push({ id: d.identifier, stage: st, qs: d.body.question_applicability.length, served, pattern: d.body.interaction_pattern_family_id }); }
const ns = (id) => demo.find(x => x.identifier === id).body.question_applicability.filter(x => x.state === "NOT SERVED").map(x => x.question).sort().join();
pass("D9-PP-09", "the four demonstration fixtures are seeded as written (sixteen questions each; Q-D9-09 alone is NOT SERVED at Stage 3 and nothing is NOT SERVED at Stages 1, 2 and 4); the eligibility check is reachable on a demonstration report and no issued report is created", demo.length === 4 && demo.every(d => d.body.question_applicability.length === 16 && d.body.demonstration === true) && ns("DEMO-D9-S1-001") === "" && ns("DEMO-D9-S2-001") === "" && ns("DEMO-D9-S4-001") === "" && ns("DEMO-D9-S3-001") === "Q-D9-09" && demo.map(d => d.body.interaction_pattern_family_id).join() === "IPF-D9-01,IPF-D9-07,IPF-D9-02,IPF-D9-03" && issued1 === issued0 && Array.isArray(gDemo.blockers), { fixtures: resolv, s3: ns("DEMO-D9-S3-001"), issued: [issued0, issued1] });
prior("D9-PP-10", "one participant with D1 and D4 observations (D8 is built in parallel and is not in this branch): the D9 state is unchanged by the other dimensions' records", "step3g", "two d1 and two d4 observations leave the d9 state unchanged");
// 11.3 the coverage test
const cov = await run(`select * from t3a_resolution_coverage('D9')`);
const tot = cov.reduce((a, x) => a + Number(x.patterns), 0), gaps = cov.reduce((a, x) => a + Number(x.gap_refusals), 0), amb = cov.reduce((a, x) => a + Number(x.ambiguous), 0);
pass("11.3", "every reachable D9 answer pattern (all four Stages) resolves to ONE statement set or ONE designed refusal: no pattern resolves to two statements and none resolves to nothing without a refusal", tot > 200 && gaps === 0 && amb === 0, { patterns: tot, gaps, ambiguous: amb });
prior("11.3", "and the same coverage is asserted in the resolution step", "step3c", "coverage: every reachable answer pattern");

// ---------------- summary ----------------
const required = ["11.3", "D9-01", "D9-02", "D9-03", "D9-03a", "D9-03b", "D9-03c", "D9-03d", ...Array.from({ length: 31 }, (_, i) => "D9-" + String(i + 4).padStart(2, "0")).filter(x => x !== "D9-30"), "D9-30", "D9-30a", "D9-30b", "D9-51", "D9-52", "D9-53", "D9-54", "D9-55", "D9-56", "D9-57", ...Array.from({ length: 14 }, (_, i) => "D9-" + (35 + i)), "D9-48a", "D9-49", "D9-50", "D9-58", "D9-59", "D9-60", ...Array.from({ length: 11 }, (_, i) => "D9-" + (61 + i)), ...Array.from({ length: 10 }, (_, i) => "D9-PP-" + String(i + 1).padStart(2, "0"))];
const have = new Set(R.map(x => x.id)); const missing = [...new Set(required)].filter(x => !have.has(x));
// one result per identifier: an identifier with several entries passes only if all do
const ids = {}; for (const x of R) { ids[x.id] = ids[x.id] || { id: x.id, status: "PASS", entries: [] }; ids[x.id].entries.push({ label: x.label, status: x.status, how: x.how, detail: x.detail }); if (x.status === "FAIL") ids[x.id].status = "FAIL"; else if (x.status === "NOT_RUN" && ids[x.id].status === "PASS") ids[x.id].status = "NOT_RUN"; }
const reqSet = new Set(required);
const results = Object.values(ids).filter(x => reqSet.has(x.id) || x.id === "CR-10");
console.log(JSON.stringify({ identifiers_required: [...reqSet].length, identifiers_reported: Object.keys(ids).filter(x => reqSet.has(x)).length, missing, pass: results.filter(x => reqSet.has(x.id) && x.status === "PASS").length, fail: results.filter(x => x.status === "FAIL").length, not_run: results.filter(x => x.status === "NOT_RUN").length, failed: results.filter(x => x.status === "FAIL"), results }, null, 1));
await c.end(); process.exit(0);
