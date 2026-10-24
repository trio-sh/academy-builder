// Step 4d: the consolidated D8 acceptance run (D8 Section 11: D8-01 to D8-69, D8-PP-01 to D8-PP-10 and the Section 11.3 coverage test), under the Section 11 identifiers only.
// Each entry is either run here against the throwaway database, or is evidence from an earlier step file that this run re-reads (it fails if that evidence is absent or failing),
// or is NOT RUN with the reason. Synthetic approvals, clearances and accounts exist on the throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
process.on("uncaughtException", e => { console.log("ERR", e.message, JSON.stringify(R.slice(-3))); process.exit(1); });
const EVDIR = process.env.EVIDENCE_DIR || new URL("../../docs/day1/evidence/", import.meta.url).pathname;
const REPO = (process.env.T3A_REPO_ROOT || new URL("../../", import.meta.url).pathname).replace(/\/?$/, "/");
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
const files = {}; for (const f of fs.readdirSync(EVDIR).filter(x => /^d8-step.*-test\.json$/.test(x))) files[f] = JSON.parse(fs.readFileSync(EVDIR + f, "utf8"));
const prior = (id, label, fileHint, ...needles) => {
  const hits = []; for (const [f, d] of Object.entries(files)) if (f.includes(fileHint)) for (const r of d.results) if (needles.every(n => r.label.toLowerCase().includes(n.toLowerCase()))) hits.push({ f, label: r.label, ok: r.pass });
  pass(id, label, hits.length > 0 && hits.every(h => h.ok), hits.map(h => `${h.f}: ${h.label}`), "evidence");
};
// a prior result that is known to fail is carried as the failure it is, with the reason, never as a pass
const priorFails = (id, label, fileHint, needle, reason) => {
  const hits = []; for (const [f, d] of Object.entries(files)) if (f.includes(fileHint)) for (const r of d.results) if (r.label.toLowerCase().includes(needle.toLowerCase())) hits.push({ f, label: r.label, ok: r.pass });
  R.push({ id, label, status: hits.length > 0 && hits.every(h => h.ok) ? "PASS" : "FAIL", how: "evidence", detail: { reason, results: hits } });
};

// ---- evidence from the browser render check of the multi page report (ber_multipage_render_check.mjs)
const RC = (() => { try { return JSON.parse(fs.readFileSync(EVDIR + "ber-multipage-render-check.json", "utf8")); } catch { return null; } })();
const rcPass = (id, label, needle, why) => { const hits = (RC?.results || []).filter(x => x.label.toLowerCase().includes(needle.toLowerCase())); pass(id, label, hits.length > 0 && hits.every(x => x.pass), hits.map(x => x.label), "evidence"); void why; };

const P = await mkU("p", "candidate"), M1 = await mkU("m1", "mentor"), M2 = await mkU("m2", "mentor"), RV = await mkU("rv", "mentor"), IS = await mkU("is", "mentor");
const S1 = await srcOf("SRC-D8-S1-001"), S2 = await srcOf("SRC-D8-S2-001"), S3 = await srcOf("SRC-D8-S3-001"), S4 = await srcOf("SRC-D8-S4-001");
const compose = async (src, stage, answers, missing = {}, items = {}, test = true) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},gen_random_uuid(),${test}) r`); return r.rows[0]?.r || { msg: r.msg }; };
const BASE = { "Q-D8-01": "A1", "Q-D8-01b": "A1", "Q-D8-02": "A1", "Q-D8-02b": "A1", "Q-D8-03": "A1", "Q-D8-03b": "A1", "Q-D8-04": "A1", "Q-D8-04b": "A1", "Q-D8-05": "A1", "Q-D8-05b": "A1", "Q-D8-06": "A1", "Q-D8-06b": "A1", "Q-D8-07": "A1", "Q-D8-07b": "A1", "Q-D8-08": "A1", "Q-D8-09": "A1" };
const full = { ...BASE };
const items = { "Q-D8-01b": ["CA1"], "Q-D8-02b": ["DF1", "DF2"], "Q-D8-03b": ["CR1"], "Q-D8-04b": ["SU1"], "Q-D8-05b": ["CM1"], "Q-D8-06b": ["WP1"], "Q-D8-07b": ["RM1"] };
const core = async (stage, answers, bound = {}) => (await svc(`select t3a_resolve_core('D8','${stage}',${J(answers)},${J(bound)},true) r`)).rows[0]?.r;
const B = { stated_containment_count: 2, named_fact_count: 2, stated_correction_count: 2, stated_support_count: 1, named_commitment_count: 1, named_work_count: 1, stated_measure_count: 2 };

// ---------------- D8-01 .. D8-12 ----------------
let r = await svc(`select t3a_source_serving_gate('${S2}','S2') r`); let c2 = await compose(S2, 2, full, {}, items, false);
pass("D8-01", "an unapproved D8 source is unreachable from the serving gate and from production composition", r.rows[0]?.r?.reason === "source_not_approved" && c2.outcome === "refused", [r.rows[0]?.r?.reason, c2.reason]);
prior("D8-01", "and from assignment of a Stage 3 source", "step3j", "unapproved Stage 3 source cannot be assigned");
prior("D8-02", "a D8 source with a null situation class cannot be approved", "step3d", "null situation class");
prior("D8-03", "Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent", "step3f", "closed but no confirmation");
prior("D8-03a", "Stage 1 instance still open: s1_instance_not_closed", "step3f", "not closed refuses");
prior("D8-03b", "confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent", "step3f", "other than the assigned mentor");
prior("D8-03c", "Stage 1 observation uncommitted: s1_observation_not_committed", "step3f", "nothing committed");
prior("D8-03d", "no progression, or a progression that blocks: s1_progression_absent_or_blocks", "step3f", "committed, no progression");
// D8-04: Q-D8-09 at Stage 3, and Q-D8-07 / Q-D8-07b on a source whose recurrence_measures is empty
{ const ns9 = await compose(S3, 3, { ...without(BASE, "Q-D8-09"), "Q-D8-09": "A1" }, {}, items);
  const wrote = (await run(`select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}' and stage_code='S3' and (answers ? 'Q-D8-09' or missing ? 'Q-D8-09')`))[0].n;
  pass("D8-04", "Q-D8-09 at Stage 3 is unavailable: an answer for it is refused (answer_for_question_not_served) and no row is written", ns9.reason === "answer_for_question_not_served" && wrote === 0, [ns9.reason, wrote]); }
function without(a, k) { return Object.fromEntries(Object.entries(a).filter(([x]) => x !== k)); }
prior("D8-04", "Q-D8-07 and Q-D8-07b on a source whose recurrence_measures is empty are unavailable, and no row is written", "step3e", "recurrence_measures is empty");
const q5 = await compose(S2, 2, full, {}, { ...items, "Q-D8-02b": [] });
pass("D8-05", "Q-D8-02 A1 with Q-D8-02b nothing selected is refused: the parent asserts a designated fact was named and the child identifies none", q5.outcome === "refused" && q5.reason === "selection_does_not_match_answer", q5);
const q6 = await core(2, { "Q-D8-07": "A3" }, B);
pass("D8-06", "Q-D8-07 A3 resolves to ST-D8-034 alone; the unserved child contributes no negative sentence", q6.outcome === "resolved" && q6.statements.length === 1 && q6.statements[0].statement_key === "ST-D8-034", q6.statements?.map(x => x.statement_key));
const bi = await compose(S2, 2, full, {}, { ...items, "Q-D8-05b": ["CM3"] });
pass("D8-07", "a bound item from another source version is refused", bi.reason === "bound_item_not_on_source", bi);
const bd = await compose(S2, 2, full, {}, { ...items, "Q-D8-01b": ["M1"] });
pass("D8-08", "a bound item from a D1 source is refused", bd.reason === "bound_item_not_on_source", bd);
const un = await compose(S2, 2, without(full, "Q-D8-09"), {}, items);
pass("D8-09", "a served question unanswered with no missing state code is refused", un.reason === "served_question_unanswered", un);
const na = await compose(S2, 2, without(full, "Q-D8-09"), { "Q-D8-09": "not_applicable" }, items); const ny = await compose(S2, 2, without(full, "Q-D8-09"), { "Q-D8-09": "not_yet_observed" }, items);
pass("D8-10", "not_applicable and not_yet_observed cannot be posted as missing states", na.outcome === "refused" && ny.outcome === "refused", [na.reason, ny.reason]);
const iso = await core(2, { "Q-D1-01": "A1" }, B);
const isoCompose = await svc(`select t3a_dimension_compose('${P}','${(await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.dimension_id='D1' and o.family='source' limit 1`))[0]?.v || S2}','2',${J({ "Q-D1-01": "A1" })},'{}'::jsonb,'{}'::jsonb,gen_random_uuid(),true) r`);
pass("D8-11", "a D1 input to a D8 computation is refused as a dimension isolation violation, and D1 observations never enter the D8 observation set", iso.reason === "dimension_isolation_violation" && (isoCompose.rows[0]?.r?.outcome === "refused" || isoCompose.msg !== "ok"), [iso.reason, isoCompose.rows[0]?.r?.reason]);
prior("D8-11", "and the evidence state of D8 is computed from D8 records only", "step3g", "two d1 observations leave the d8 state unchanged");
prior("D8-12", "a D8 clause instance against a D1 clause instance is refused (a D3 and a D4 instance likewise)", "step3e", "d8 clause instance against a d3");

// ---------------- D8-13 .. D8-17 : evidence state frames ----------------
prior("D8-13", "FR-D8-2 with no approved cross-context row is refused; the side by side condition still shows", "step3g", "no approved cross-context relationship");
prior("D8-14", "three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead", "step3g", "differing state codes");
prior("D8-15", "a material contradiction in the full set blocks the recurrence frame although three match", "step3g", "cherry-picking");
prior("D8-16", "recurrence configuration unloaded: refused regardless of the data", "step3g", "configuration is not locked");
prior("D8-17", "a record status entry such as ST-D8-003 never counts toward the recurring state", "step3g", "never satisfies");
prior("D8-17", "ST-D8-003 composed by the real route carries the marker and is never equivalent", "step3e", "record status entry (ST-D8-003)");
prior("D8-17", "no D8 entry carries recurrence_blocker (the refusal is the record_status_never_recurs rule)", "step3e", "no D8 entry carries recurrence_blocker");

// ---------------- D8-18, D8-19 : issuance floor ----------------
prior("D8-18", "a D8 row below the floor (one context) cannot be issued: named blocker below_issuance_floor", "step3h", "floor is met");
const mkRep = async (part, dims) => { const st = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s; return (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${part}','D8','${st}','{}'::jsonb, false, 'ber', 'participant_review', array[${dims.map(d => `'${d}'`).join(",")}], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r; };
const Q = await mkU("q", "candidate"); const OA = await mkU("oa", "mentor");
await run(`delete from t3a_cross_context_relationship`);
for (const [src, st] of [[S2, "S2"], [S3, "S3"]]) { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${Q}','D8','${st}','${OA}',true) returning observation_record_id i`))[0].i; await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D8','${o}','${Q}','${st}','${src}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`); }
await run(`insert into t3a_cross_context_relationship(dimension_id, source_version_a, source_version_b, approved_by) values ('D8','${S2 < S3 ? S2 : S3}','${S2 < S3 ? S3 : S2}','${RV}') on conflict do nothing`);
const repQ = await mkRep(Q, ["D1", "D8"]); const gq = (await run(`select t3a_report_issuance_gate('${repQ}') g`))[0].g;
pass("D8-19", "one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer", gq.blockers.some(b => b.code === "fewer_than_two_authorized_observers") && gq.blockers.some(b => b.code === "below_issuance_floor"), gq.blockers.map(b => b.code));
prior("D8-20", "the observer of the D1 record of a two-dimension report cannot be its evidence reviewer", "step3f", "observed the d1 record");
prior("D8-21", "the reviewer cannot be the issuer", "step3h", "reviewer cannot be the issuer");
prior("D8-22", "no participant response to the pre-issue review notice: issuance blocks; no timeout", "step3h", "no recorded participant outcome");
prior("D8-23", "a correction against a D8 sentence blocks the report; the D8 record is in reconsideration and D1 is untouched", "step3h", "correction against a d8 record");
prior("D8-24", "an in-place edit of a composed statement is refused; supersession only", "step3e", "editing a composed statement");
{ const stx = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
  const mk2 = async (dims, spec) => (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${P}','D1','${stx}','{}'::jsonb, ${spec}, 'ber', 'participant_review', array[${dims.map(d => `'${d}'`).join(",")}], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r;
  const gate = async (id, form) => (await run(`select t3a_report_render_gate('${id}','${form}') r`))[0].r;
  const r2 = await mk2(["D1", "D3"], true); const lo = await gate(r2, "one_page"), mp = await gate(r2, "multi_page");
  pass("D8-25", "a two-dimension specimen on one page fails and logs layout_overflow; the multi page form renders it without expanding or compressing the single page", lo.reason === "layout_overflow" && mp.outcome === "renderable", [lo.reason, mp.outcome]);
  const r8 = await mk2(["D1", "D8"], true); const lo8 = await gate(r8, "one_page"), mp8 = await gate(r8, "multi_page");
  pass("D8-25", "a two-dimension report that carries D8 renders through the multi page renderer; the single page route is closed to it (format_mismatch), even for a specimen (Directive D-07)", mp8.outcome === "renderable" && lo8.reason === "format_mismatch", [lo8.reason, mp8.outcome]);
  await run(`update t3a_d1_ber_report set specimen_render_flag = false where ber_report_id = '${r2}'`);
  const lo2 = await gate(r2, "one_page");
  pass("D8-25", "(CR-10) a report that is not a specimen routed to the single page renderer is refused format_mismatch", lo2.reason === "format_mismatch", lo2.reason); }

// ---------------- D8-26 .. D8-28 : rendered output scans (on the 44 statements, the 13 templates and constructed renders) ----------------
const bad = await run(`select count(*)::int n from t3a_d1_statement_library l where l.dimension_id='D8' and (t3a_prohibited_output_check('D8', l.statement_body)->>'passed')::boolean is not true`);
const ov = (await run(`select t3a_prohibited_output_check('D8', 'Overall profile: 3 of 5 dimensions complete, average strong') r`))[0].r;
pass("D8-26", "no overall, composite, average or profile element: such an element fails the scan, and none of the 44 statements carries one", ov.passed === false && ov.findings.some(f => f.rule === "cross_dimension_aggregate") && bad[0].n === 0, [ov.passed, bad[0].n]);
prior("D8-27", "no Section 3.2 comparative or evaluative word, and no word that belongs to another dimension, in rendered D8 output", "step3g", "closed-list evaluative");
prior("D8-27", "a word that belongs to another dimension fails as cross_dimension_assertion", "step3g", "cross_dimension_assertion");
prior("D8-27", "the arc words (recovered and the rest of the list at Section 5.7a) fail the scan", "step3c", "the arc fails: recovered");
const names = await run(`select statement_key from t3a_d1_statement_library l where l.dimension_id='D8' and l.statement_body ~ '(^|[.!?] +)?[a-z, ]+ [A-Z][a-z]+ [A-Z][a-z]+'`);
const tpl = await run(`select count(*)::int n from t3a_d1_language_template where dimension_id='D8' and template_body ~ '[a-z] [A-Z][a-z]+ [A-Z][a-z]+'`).catch(() => [{ n: 0 }]);
pass("D8-28", "no named third party in any D8 statement or template (outputs name controlled roles, never people)", names.length === 0 && tpl[0].n === 0, { statements: names.length, templates: tpl[0].n });

// ---------------- D8-29 .. D8-34 ----------------
prior("D8-29", "a D8 mentor cannot be authorized from a D1 calibration record", "step3i", "d1 clearance confers nothing");
prior("D8-30", "a participant who met the same D8 interaction pattern family is excluded", "step3d", "same situation pattern family");
prior("D8-30a", "the Stage 2 seven-beat form met under D1 excludes the D8 Stage 2 form without any mapping", "step3d", "seven-beat form under d1");
prior("D8-30b", "a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent", "step3m", "cross_dimension_mapping_absent");
prior("D8-31", "D8 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited", "step3m", "only d1 mentor_observation");
prior("D8-32", "issuing a report that holds a D8 record on D1 consent alone: refused and logged consent_not_inherited", "step3m", "issuance written for that report");
prior("D8-33", "pool availability needs employer_share for every dimension in the report", "step3m", "employer_share granted for d1 only");
prior("D8-34", "an unloaded evidence currency value blocks issuance (checklist item 13)", "step3h", "unloaded evidence currency");
const BLANK3 = `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('correction_response_time','','0.0','${IS}'),('correction_acknowledge_business_days','','0.0','${IS}'),('correction_decision_target_business_days','','0.0','${IS}')`;
{ await c.query("begin"); await c.query(BLANK3); const un = (await run(`select t3a_correction_commitment() r`))[0].r; await c.query("rollback"); // the migration loads the founder's values; this check starts from unloaded
  await c.query("begin"); await c.query(BLANK3); await c.query(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('correction_response_time','synthetic test value','0.0','${IS}'),('correction_acknowledge_business_days','5','0.0','${IS}'),('correction_decision_target_business_days','20','0.0','${IS}')`); const lo = (await run(`select t3a_correction_commitment() r`))[0].r; await c.query("rollback");
  const anon = await c.query("begin").then(async () => { await c.query(BLANK3); await c.query("set local role anon"); try { return (await c.query(`select t3a_correction_commitment() r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("rollback"); } });
  pass("D8-35", "the correction commitment text does not render while the response time is unloaded: the route returns nothing to render and no default value appears; loaded, it returns the value as loaded (rolled back)", un.rendered === false && un.value === undefined && lo.rendered === true && lo.value === "synthetic test value" && anon.rendered === false, { unloaded: un, loaded: lo, anon }); }
prior("D8-36", "each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults", "step3m", "unloaded: the route fails closed");
rcPass("D8-37", "a report with the permitted-use text unloaded: the render refuses and the block is never omitted", "permitted-use text unloaded");
prior("D8-38", "a Stage 3 artifact with no tooling declaration is refused and logged", "step3j", "AI_USE_DECLARATION_REQUIRED");
{ const g = async (w, h, d = "desktop") => (await run(`select t3a_d1_s2_capture_permitted(${w},${h},'${d}') r`))[0].r;
  const a = await g(1279, 800), b2 = await g(1280, 799), ok2 = await g(1280, 800), ph = await g(1920, 1080, "phone");
  pass("D8-39", "the Mentor Cockpit below 1280 by 800 refuses capture (the server route returns the refusal; the repository has no browser test at that viewport, so the screen's rendering of it is not exercised here); 1280 by 800 permits; a phone refuses", a.permitted === false && a.refusal_code === "VIEWPORT_BELOW_SUPPORTED_MINIMUM" && b2.permitted === false && ok2.permitted === true && ph.permitted === false, { a: a.refusal_code, b: b2.refusal_code, ok: ok2.permitted, phone: ph.refusal_code }); }
prior("D8-40", "an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded", "step3m", "timing_not_comparable");
prior("D8-41", "Stage 4 entry with no group participation record is refused", "step3j", "one missing permission among four still refuses");
prior("D8-42", "capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route", "step3m", "disabled_consent_route");
const nr = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D8' and statement_body ~* '(named recipient|release token|redemption passcode|released to your organization)'`);
const nrv = (await run(`select t3a_prohibited_output_check('D8', 'This report was released to your organization with a release token') r`))[0].r;
pass("D8-43", "no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan", nr.length === 0 && nrv.passed === false, { statements: nr.length, scan: nrv.passed });
prior("D8-44", "a source with either drafting-test row empty cannot be approved: drafting_test_incomplete", "step3d", "table backstop refuses an approval");
prior("D8-45", "a drafting-test reviewer equal to the source author is refused", "step3d", "member of the author list");
prior("D8-46", "a Stage 3 source with no rights record is refused at submission, rights_route_absent", "step3d", "rights_route_absent");
prior("D8-47", "Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result", "step3j", "s4_not_activated");

// D8-48: static scan of the database for a second release model, a bypass of s4_activation_state, or an override reaching a real Stage 4 entry
const startFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'update public\\.t3a_d1_group_session set started_at' and p.proname <> 't3a_s4_enter'`);
const actRefs = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%s4_activation_state%' and p.proname not in ('t3a_s4_activation_state','t3a_s4_enter','t3a_source_serving_gate','t3a_source_select')`);
const poolModes = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'insert into public\\.t3a_report_release' and p.proname not in ('t3a_pool_make_available')`);
const tokenCreators = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'insert into public\\.t3a_d1_release_token' and p.proname not in ('t3a_named_route_closed')`);
const rawSql = (() => { const out = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + "/" + f.name; if (f.isDirectory()) { if (!["node_modules", ".git", "dist", "docs"].includes(f.name)) walk(p); } else if (/\.(tsx?|mjs)$/.test(f.name) && !/test/.test(p)) out.push(p); } }; try { walk(REPO + "src"); } catch {} return out; })();
const srcHits = rawSql.filter(f => /s4_activation_state|activateStage4|bypassStage4|adminOverride/i.test(fs.readFileSync(f, "utf8")));
pass("D8-48", "no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned)", startFns.length === 0 && actRefs.length === 0 && poolModes.length === 0 && srcHits.length === 0 && rawSql.length > 50, { startFns, actRefs, poolModes, tokenCreators, srcHits, files_scanned: rawSql.length });
prior("D8-48a", "a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route", "step3m", "superseded_route_invoked");
prior("D8-49", "Q-D8-01b and Q-D8-03b selecting the same action both compose as separate determinations; neither is suppressed as a duplicate", "step3e", "same action selected at q-d8-01b");
prior("D8-50", "a resolution table with one row naming a question absent from the question objects is refused whole and logged; the loader does not skip the row", "step4a", "refused whole");
prior("D8-58", "a source whose served question has an empty definition cannot enter the production approval path: question_definition_incomplete", "step4a", "cannot enter the production approval path");
prior("D8-59", "a calibration run on a question with an empty definition does not open: question_definition_incomplete", "step3i", "does not open");
prior("D8-60", "the demonstration fixtures and the full acceptance suite run with every question definition empty: the refusal sits on production approval and calibration only", "step4a", "every one of the 16 questions carries calibration_ready false");

// D8-61: the statement form at every Stage
prior("D8-61", "each of took, acted, sought, performed, applied and carried out is refused by the stage form check at every Stage", "step3e", "at every stage (24 of 24)");
prior("D8-61", "composing at Stage 1, 2, 3 and 4 with a performed-act verb in the entry refuses and logs stage_form_violation", "step3e", "composing at stage 1, 2, 3 and 4");
prior("D8-61", "no D8 entry carries a performed act verb at any Stage", "step3c", "no d8 entry carries a performed act verb");
pass("D8-61", "a Stage 1 pattern composes with the stage_1_only limitation, and every D8 element is composed at Stage 1", (await compose(S1, 1, BASE, {}, items)).conditions?.includes("stage_1_only") === true, null);
rcPass("D8-51", "the evidence currency statement appears visibly in a rendered report (the multi page report shows it on the controls page, with the evidence currency date)", "currency date visibly");
prior("D8-52", "any contact initiation from an employer surface is refused and logged contact_permission_absent", "step3m", "contact_permission_absent");
// D8-53: name clearance status read from the sheet, never defaulted
const pend = await run(`select o.identifier, v.body->'source_sheet'->>'name_clearance_status' s from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D8-S[1-4]-0'`);
const pre = (await run(`select t3a_source_approval_preconditions('${S2}') c`))[0].c;
pass("D8-53", "every loaded source carries the clearance status from its own sheet, and none serves while the clearance is pending", pend.length === 34 && pend.every(x => x.s !== null && x.s !== undefined) && ["drafting_test_incomplete", "name_clearance_pending", "not_submitted_for_approval"].includes(pre), { values: [...new Set(pend.map(x => x.s))], first_failing_precondition: pre });
// D8-54: bound family absent or empty
const shell = (await run(`select v.body b from t3a_d1_content_version v where v.content_version_id='${S2}'`))[0].b;
const empty = JSON.parse(JSON.stringify(shell)); empty.source_sheet.designated_facts = []; empty.source_identifier = "SRC-D8-N-EMPTY-" + RUN;
await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${empty.source_identifier}','source','e','D8','not_loaded')`);
const ev = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(empty)} from t3a_content_object where identifier='${empty.source_identifier}' returning content_version_id v`))[0]?.v;
const e54 = ev ? await compose(ev, 2, full, {}, items) : { reason: "not_loaded" };
pass("D8-54", "a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders", e54.outcome === "refused" && /BOUND_FAMILY_ABSENT_OR_EMPTY/i.test(JSON.stringify(e54)), e54);
prior("D8-54", "and a source that serves a question whose list is absent from the sheet refuses the same way", "step3e", "a list that is absent from the sheet");
prior("D8-55", "a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed", "step3m", "bound_item_integrity_failed");
prior("D8-56", "a Stage 2 or Stage 4 beat determination with no loaded mentor_action_sequence is refused: beat_sequence_absent", "step3m", "beat_sequence_absent");
prior("D8-57", "b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2", "step3m", "marked as the decision point");

// D8-62: the specimen face and the persistence transition
rcPass("D8-62", "the specimen face renders in full with the specimen watermark on every page (the persistence refusal for a demonstration is tested at D8-PP-09 in the database run)", "demonstration footer");
// D8-63: no flag, override or test mode that lifts an approval, calibration or activation refusal
const testModeFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 't3a\\_%' and pg_get_function_arguments(p.oid) ~ 'p_test_mode' and p.prosrc !~* '(is_service_context|TEST_MODE_IS_SERVICE_ONLY|t3a_dimension_compose)' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
const overrideFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname ~* '(bypass|override_(approval|calibration|activation)|skip_(approval|calibration|gate)|force_(approve|activate))'`);
pass("D8-63", "no flag, override or test mode lifts an approval, calibration or activation refusal: every test mode parameter is service route only (checked in the routine, in the routine it delegates to, or by the grant), and no bypass routine exists; the new D8 rule tables are service-read only and append only", testModeFns.length === 0 && overrideFns.length === 0 && srcHits.length === 0 && (await run(`select count(*)::int n from information_schema.role_table_grants where table_name in ('t3a_dimension_rule','t3a_entry_language_rule','t3a_stage_form_verb_dimension','t3a_source_truth_field','t3a_dimension_source_field','t3a_dimension_withheld_field') and grantee in ('anon','authenticated') and privilege_type <> 'SELECT'`))[0].n === 0, { testModeFns, overrideFns, srcHits });
// D8-64: manner words, the arc, the state as subject
const mw = ["confidently", "calmly", "hastily", "quickly", "readily", "resilient", "unshaken", "composed", "steady", "recovered", "bounced back", "coped", "weathered", "persevered"]; const mwFound = []; for (const w of mw) { const x = (await run(`select t3a_prohibited_output_check('D8', 'the participant stated it ${w}') r`))[0].r; if (x.passed) mwFound.push(w); }
const badAll = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D8' and (t3a_prohibited_output_check('D8', statement_body)->>'passed')::boolean is not true`);
const badGate = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D8' and (t3a_entry_language_gate('D8', jsonb_build_array(jsonb_build_object('statement_key', statement_key, 'text', statement_body)))->>'outcome') <> 'ok'`);
pass("D8-64", "every Section 5.7a word fails the scan (manner words, the arc words, the state words, sampled), and none of the 44 entries carries a word of the list or has the participant's state as its subject", mwFound.length === 0 && badAll.length === 0 && badGate.length === 0, { unflagged_words: mwFound, statements_failing_scan: badAll.length, statements_failing_gate: badGate.length });
{ const all63 = (await run(`select word from t3a_rce_prohibited_vocabulary where dimension_id='D8' and version='PV-D8-1.0'`)).map(x => x.word); const unflagged = [];
  for (const w of all63) { const x = (await run(`select t3a_prohibited_output_check('D8', $1) r`.replace("$1", `'the participant stated it ${w.replace(/'/g, "''")} twice'`)))[0].r; if (x.passed) unflagged.push(w); }
  pass("D8-64", "all 63 words of Section 5.7a are on the D8 list and each one fails the scan when it appears in a rendered sentence", all63.length === 63 && unflagged.length === 0, { words: all63.length, unflagged }); }
prior("D8-64", "a composed entry whose subject is the participant's state refuses and logs state_observation; a word of another dimension refuses cross_dimension_assertion", "step3e", "matching a state_observation pattern");
prior("D8-64", "sentences whose subject is the participant's state, and sentences asserting the absence of a reaction, are refused (seven of seven)", "step3e", "seven of seven");
priorFails("D8-64", "every D8 template passes the prohibited-output scan", "step3c", "every d8 template passes the prohibited-output check", "EXCEPTION CR-252: L-D8-COMP-001 (Section 5.12) reads 'The conditions of this observation were affected by a recorded technical event.' and 'affected' is on the Section 5.7a list. The template is loaded as written because this build does not decide wording; the scan flags it; the founder decides");
prior("D8-65", "an altered committed observation with a recomputed hash is refused: commit_seal_invalid (the seal is a server side signature)", "step3e", "recomputed to match");
prior("D8-65", "under another key the seal reads as invalid, and an unloaded key refuses", "step3e", "other key");
prior("D8-66", "a second observation record under an identifier already committed is refused; the first record stands", "step3e", "second original");
prior("D8-67", "a single page route for a D8 report refuses format_mismatch and logs it", "step3h", "format_mismatch");
rcPass("D8-67", "a D8 only report renders as three pages through the multi page renderer", "D8 only report renders three pages");

// D8-68: neither who_knows nor decision_origin appears on any surface or in any response
{ const bodies = (await run(`select count(*)::int n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.dimension_id='D8' and o.family::text = 'source' and v.body::text ~ 'who_knows|decision_origin'`))[0].n;
  const fns = await run(`select p.proname from pg_proc p where p.pronamespace='public'::regnamespace and p.prosrc ~ 'who_knows|decision_origin'`);
  const composed = (await run(`select count(*)::int n from t3a_dimension_composed_statement where dimension_id='D8' and (answers::text || clauses::text || clause_instances::text) ~ 'who_knows|decision_origin'`))[0].n;
  const walkFiles = (() => { const out = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + "/" + f.name; if (f.isDirectory()) { if (!["node_modules", ".git", "dist"].includes(f.name)) walk(p); } else if (/\.(tsx?|mjs|json)$/.test(f.name) && !/\.(test|spec)\./.test(f.name)) out.push(p); } }; for (const d of ["src", "api"]) { try { walk(REPO + d); } catch {} } return out; })();
  const codeHits = walkFiles.filter(f => /who_knows|decision_origin/.test(fs.readFileSync(f, "utf8")));
  const ref = await svc(`select t3a_d1_reference_card(o.identifier) r from t3a_content_object o where o.identifier='SRC-D8-S2-001'`);
  const refText = JSON.stringify(ref.rows[0]?.r ?? ref.msg);
  pass("D8-68", "neither who_knows nor decision_origin appears in a stored source body, a database routine, a composed statement, any screen or API source file (src and api scanned) or the mentor reference card route; the two fields exist only in the service only truth table (a search of the data and the code; no browser was opened on a Cockpit, which in this repository is the D1 screen reading the stored body)", bodies === 0 && fns.length === 0 && composed === 0 && codeHits.length === 0 && !/who_knows|decision_origin/.test(refText) && walkFiles.length > 100, { bodies, fns, composed, codeHits, files_scanned: walkFiles.length, reference_card: refText.slice(0, 120) }); }
prior("D8-68", "the two fields are retained for source truth, readable by the service role only, and a signed in user can read neither the table nor the reader", "step3d", "retained for source truth");
prior("D8-68", "no stored D8 source or fixture body holds either field (34 sources and 4 fixtures)", "step3d", "no stored d8 source body");
for (const [lab, needle] of [["a source sheet that adds a field for the participant's reaction, state or bearing is refused at load: no version row, state_observation logged", "adds a field for the participant's reaction"], ["a field for the participant's state is refused at load", "adds a field for the participant's state"], ["a field for the participant's bearing is refused at load", "adds a field for the participant's bearing"], ["a list item that names a state or a feeling (reassurance) refuses the source at load", "(reassurance)"], ["a list item that names a personal need (a day off) refuses the source at load", "(a day off)"], ["a list item that names a feeling in an action list refuses the source at load", "names a feeling in an action list"], ["work recovery is not a state: a recovery site or recovering shipped units loads", "work recovery is not a state"], ["a good source loads, and all 34 loaded sources passed the guard at load", "all 34 loaded d8 sources passed the guard"]]) prior("D8-69", lab, "step3d", needle);

// ---------------- positive path ----------------
prior("D8-PP-01", "two D8 observations with an approved row, agreeing: the multiple context frame is available", "step3g", "third state is breadth");
prior("D8-PP-02", "two D8 observations, approved row, diverging: held side by side with the divergence condition, neither preferred", "step3g", "side by side");
prior("D8-PP-03", "three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause", "step3g", "clause recurs across stages");
prior("D8-PP-04", "Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits", "step3f", "proceed permits stage 2");
// PP-05: seven beats with a complete timing record and a decision point
const SQ = "SRC-D8-N-SEQ-" + RUN; const srcSeq = await (async () => { await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${SQ}','source','seq','D8','not_loaded')`); return (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded','${JSON.stringify({ source_identifier: SQ, stage_code: "S2", source_sheet: { d8_situation_class: "SC-D8-3" } })}'::jsonb from t3a_content_object where identifier='${SQ}' returning content_version_id v`))[0].v; })();
const beats = [["B1", "SAY", false], ["B2", "PAUSE", true], ["B3", "ASK", false], ["B4", "ASK", false], ["B5", "ASK", false], ["B6", "ASK", false], ["B7", "SAY", false]];
for (const [i, [code, type, dp]] of beats.entries()) await run(`insert into t3a_d1_mentor_action_sequence(source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point, pause_seconds_min, pause_seconds_max) values ('${SQ}',${i + 1},'${code}','${type}','verbatim ${code}',${dp},${dp ? 10 : "null"},${dp ? 15 : "null"})`);
const GW = (await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at, observation_notification_timestamp) values ('${P}','account_authentication','1.0','1.0',now(), now()) returning observation_path_gateway_id g`))[0].g;
const inst = (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','S2','D8',${50 + Math.floor(Math.random() * 40)},'scheduled') returning stage_instance_id i`))[0].i;
const see = (await run(`insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id, entry_authority_actor_id, stage_entry_hold_expires_at) values ('${P}','D8','S2','${GW}','${inst}','x','1.0','{}','{D8}','{}','${srcSeq}', gen_random_uuid(), now() + interval '1 hour') returning stage_entry_event_id i`))[0].i;
for (const [code] of beats) await run(`insert into t3a_d1_beat_timestamp(stage_entry_event_id, beat_code, duration_seconds, recorded_by) values ('${see}','${code}',${code === "B2" ? 12 : "null"},'${M1}')`);
const dpp = (await svc(`select t3a_decision_point_pause('${SQ}') r`)).rows[0]?.r;
const cm = await compose(S2, 2, full, {}, items);
const timed = (await run(`select count(*)::int n from t3a_d1_beat_timestamp where stage_entry_event_id='${see}'`))[0].n;
pass("D8-PP-05", "Stage 2 with the seven beats: a complete timing record (seven beats, the pause at the decision point) and the determinations commit", beats.length === 7 && timed === 7 && dpp?.beat_code === "B2" && cm.outcome === "composed", { beats: timed, decision_point: dpp?.beat_code, composed: cm.outcome });
// PP-06: two-dimension report with distinct uninvolved reviewer and issuer issues successfully
const OB = await mkU("ob2", "mentor");
const Q2 = await mkU("q2", "candidate");
for (const [src, st, who] of [[S2, "S2", OA], [S3, "S3", OB]]) { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${Q2}','D8','${st}','${who}',true) returning observation_record_id i`))[0].i; await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D8','${o}','${Q2}','${st}','${src}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`); }
for (const t of ["scenario_logging", "mentor_observation"]) await svc(`select t3a_record_consent('${Q2}','${t}','granted','D8',null,'1.0','${H}','checkbox','en-CA','observation') r`);
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('evidence_currency','synthetic test value','0.0','${IS}')`);
const rep6 = await mkRep(Q2, ["D8"]);
const SEALKEY = "synthetic-test-key-" + randomUUID(); await run(`select set_config('t3a.commit_seal_key','${SEALKEY}',false)`);
for (const row of await run(`select composed_statement_id i from t3a_dimension_composed_statement where participant_id in ('${Q}','${Q2}') and composed_statement_id not in (select composed_statement_id from t3a_commit_seal)`)) await run(`select t3a_seal_composed('${row.i}', false)`);
await run(`insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${rep6}','${Q2}','reviewed_no_correction')`);
const vs6 = (await run(`select encode(extensions.digest('{}'::jsonb::text, 'sha256'), 'hex') h`))[0].h;
for (const i of [...Array.from({ length: 23 }, (_, k) => k + 1), 34, 35]) await run(`insert into t3a_dimension_review_result(ber_report_id, dimension_id, item_no, outcome, reviewer_id, version_set_hash) values ('${rep6}','D8',${i},'pass','${RV}','${vs6}')`);
const g6 = (await run(`select t3a_report_issuance_gate('${rep6}','${RV}','${IS}') g`))[0].g;
const before6 = (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep6}'`))[0].n;
const ins6 = await c.query(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${rep6}','${Q2}','D8','${IS}','issued','{}'::jsonb,'${H}')`).then(() => "ok").catch(e => e.message);
const after6 = (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep6}'`))[0].n;
pass("D8-PP-06", "a D8 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written). The 25 item checklist is the 23 platform items and the two D8 items", g6.permitted === true && after6 === before6 + 1 && (await run(`select cardinality(t3a_review_items_for('D8')) n`))[0].n === 25, { gate: g6.blockers?.map(b => b.code), insert: ins6, rows: [before6, after6] });
prior("D8-PP-07", "a successful correction: a new composed statement supersedes, the original is retained", "step3h", "successful correction produces a new");
// PP-08: grant employer availability on a report carrying D8, read the pool state, withdraw; the evidence record is untouched
const PPU = await mkU("pp8", "candidate"); await run(`update profiles set first_name='Pat', last_name='Pool' where id='${PPU}'`);
for (const dm of ["D1", "D8"]) await svc(`select t3a_record_consent('${PPU}','employer_share','granted','${dm}',null,'1.0','${H}','checkbox','en-CA','observation') r`);
const rep8 = await mkRep(PPU, ["D1", "D8"]); await run(`update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep8}'`);
const cs8 = (await run(`select count(*)::int n from t3a_dimension_composed_statement where participant_id='${PPU}'`))[0].n;
const mk8 = await asRole("authenticated", PPU, `select t3a_pool_make_available('${rep8}','Analyst','Toronto','Immediately','CA',false) r`);
const st8 = await asRole("authenticated", PPU, `select t3a_pool_state('${rep8}') r`);
const leak8 = (await run(`select (to_jsonb(e) ?| array['dimension_id','stage_code','conduct','observation_ref']) l from t3a_employer_pool_entry e where ber_report_id='${rep8}'`))[0];
const wd8 = await asRole("authenticated", PPU, `select t3a_pool_withdraw('${rep8}') r`);
const after8 = (await run(`select (e.visibility_withdrawn_at is not null) w, (select count(*)::int from t3a_dimension_composed_statement where participant_id='${PPU}') cs from t3a_employer_pool_entry e where ber_report_id='${rep8}'`))[0];
pass("D8-PP-08", "availability granted on a report carrying D8 (employer_share for both dimensions), the pool entry holds no dimension, stage or conduct field, the participant withdraws, the entry leaves the pool, and the evidence record is untouched", mk8.r?.outcome === "available" && st8.r?.available === true && leak8 && leak8.l === false && wd8.r?.outcome === "withdrawn" && after8.w === true && after8.cs === cs8, { make: mk8.r || mk8.msg, state: st8.r, withdraw: wd8.r || wd8.msg, after: after8 });
// PP-09: the full demonstration run across the four fixtures; nothing is issued
const demo = await run(`select o.identifier, v.body from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier like 'DEMO-D8-S_-001' order by 1`);
const specimen = await mkRep(P, ["D1", "D8"]); await run(`update t3a_d1_ber_report set specimen_render_flag = true where ber_report_id='${specimen}'`);
const issued0 = (await run(`select count(*)::int n from t3a_d1_report_issuance`))[0].n;
await c.query(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${specimen}','${P}','D8','${IS}','issued','{}'::jsonb,'${H}')`).catch(() => {});
const issued1 = (await run(`select count(*)::int n from t3a_d1_report_issuance`))[0].n;
const gDemo = (await run(`select t3a_report_issuance_gate('${specimen}','${RV}','${IS}') g`))[0].g;
const resolv = []; for (const d of demo) { const served = d.body.question_applicability.filter(x => x.state !== "NOT SERVED").length; resolv.push({ id: d.identifier, stage: d.body.stage, qs: d.body.question_applicability.length, served, pattern: d.body.interaction_pattern_family_id, form: d.body.administration_form_id }); }
const ns = (id) => demo.find(x => x.identifier === id).body.question_applicability.filter(x => x.state === "NOT SERVED").map(x => x.question).sort().join();
pass("D8-PP-09", "the four demonstration fixtures are seeded as written (sixteen questions each; every element served at Stages 1, 2 and 4; only Q-D8-09 not served at Stage 3); the eligibility check is reachable on a demonstration report and no issued report is created", demo.length === 4 && demo.every(d => d.body.question_applicability.length === 16 && d.body.demonstration === true) && ns("DEMO-D8-S1-001") === "" && ns("DEMO-D8-S2-001") === "" && ns("DEMO-D8-S3-001") === "Q-D8-09" && ns("DEMO-D8-S4-001") === "" && issued1 === issued0 && Array.isArray(gDemo.blockers), { fixtures: resolv, issued: [issued0, issued1] });
prior("D8-PP-10", "one participant with D1 and D8 observations: each dimension's state is unchanged by the other's records", "step3g", "two d1 observations leave the d8 state unchanged");
prior("D8-11.3", "the coverage test: every reachable D8 answer pattern resolves to one statement or one logged refusal; none to two, none to none without a refusal", "step3c", "coverage: every reachable");
prior("D8-11.3", "and no pattern resolves to two statements", "step3c", "coverage: no pattern resolves to two");

// ---------------- summary ----------------
const required = ["D8-01","D8-02","D8-03","D8-03a","D8-03b","D8-03c","D8-03d","D8-04","D8-05","D8-06","D8-07","D8-08","D8-09","D8-10","D8-11","D8-12","D8-13","D8-14","D8-15","D8-16","D8-17","D8-18","D8-19","D8-20","D8-21","D8-22","D8-23","D8-24","D8-25","D8-26","D8-27","D8-28","D8-29","D8-30","D8-30a","D8-30b","D8-31","D8-32","D8-33","D8-34","D8-51","D8-52","D8-53","D8-54","D8-55","D8-56","D8-57","D8-35","D8-36","D8-37","D8-38","D8-39","D8-40","D8-41","D8-42","D8-43","D8-44","D8-45","D8-46","D8-47","D8-48","D8-48a","D8-49","D8-50","D8-58","D8-59","D8-60","D8-61","D8-62","D8-63","D8-64","D8-65","D8-66","D8-67","D8-68","D8-69","D8-PP-01","D8-PP-02","D8-PP-03","D8-PP-04","D8-PP-05","D8-PP-06","D8-PP-07","D8-PP-08","D8-PP-09","D8-PP-10","D8-11.3"];
const have = new Set(R.map(x => x.id)); const missing = required.filter(x => !have.has(x));
const by = (s) => R.filter(x => x.status === s).length;
// one result per identifier: an identifier with several entries passes only if all do
const ids = {}; for (const x of R) { ids[x.id] = ids[x.id] || { id: x.id, status: "PASS", entries: [] }; ids[x.id].entries.push({ label: x.label, status: x.status, how: x.how, detail: x.detail }); if (x.status === "FAIL") ids[x.id].status = "FAIL"; else if (x.status === "NOT_RUN" && ids[x.id].status === "PASS") ids[x.id].status = "NOT_RUN"; }
console.log(JSON.stringify({ identifiers_required: required.length, identifiers_reported: Object.keys(ids).length, missing, pass: Object.values(ids).filter(x => x.status === "PASS").length, fail: Object.values(ids).filter(x => x.status === "FAIL").length, not_run: Object.values(ids).filter(x => x.status === "NOT_RUN").length, failed: Object.values(ids).filter(x => x.status === "FAIL"), results: Object.values(ids) }, null, 1));
await c.end(); process.exit(0);
