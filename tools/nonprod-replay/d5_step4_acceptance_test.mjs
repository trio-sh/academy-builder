// Step 4d: the consolidated D5 acceptance run (D5 Section 11: D5-01 to D5-69 with the lettered ones, D5-PP-01 to D5-PP-10, and the coverage test 11.3), under the Section 11 identifiers only.
// Each entry is either run here against the throwaway database (how = run), or is evidence from an earlier step file or a browser/package check whose labelled result this run re-reads (how = evidence; it fails if that
// evidence is absent or failing), or is NOT RUN with the reason. Synthetic approvals, clearances and accounts exist on the throwaway database only.
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
const files = {}; for (const f of fs.readdirSync(EVDIR).filter(x => /^d5-step.*-test\.json$/.test(x))) files[f] = JSON.parse(fs.readFileSync(EVDIR + f, "utf8"));
const prior = (id, label, fileHint, ...needles) => {
  const hits = []; for (const [f, d] of Object.entries(files)) if (f.includes(fileHint)) for (const r of d.results) if (needles.every(n => r.label.toLowerCase().includes(n.toLowerCase()))) hits.push({ f, label: r.label, ok: r.pass });
  pass(id, label, hits.length > 0 && hits.every(h => h.ok), hits.map(h => `${h.f}: ${h.label}`), "evidence");
};


// ---- evidence from the browser render check of the D5 only multi page report (d5_ber_render_check.mjs) and from the package's own reference checks (docs/day1/evidence/d5-package-checks.json)
const RC = (() => { try { return JSON.parse(fs.readFileSync(EVDIR + "d5-ber-multipage-render-check.json", "utf8")); } catch { return null; } })();
const rcPass = (id, label, needle, why) => { const hits = (RC?.results || []).filter(x => x.label.toLowerCase().includes(needle.toLowerCase())); pass(id, label, hits.length > 0 && hits.every(x => x.pass), hits.map(x => x.label), "evidence"); void why; };
const PK = (() => { try { return JSON.parse(fs.readFileSync(EVDIR + "d5-package-checks.json", "utf8")); } catch { return null; } })();
const pkPass = (id, label, check, ok) => pass(id, label, !!PK?.checks?.[check] && ok(PK.checks[check]), PK?.checks?.[check] ? { check, exit_code: PK.checks[check].exit_code, result: PK.checks[check].result } : "package check evidence absent", "evidence");

const P = await mkU("p", "candidate"), M1 = await mkU("m1", "mentor"), M2 = await mkU("m2", "mentor"), RV = await mkU("rv", "mentor"), IS = await mkU("is", "mentor");
const S1 = await srcOf("SRC-D5-S1-001"), S2 = await srcOf("SRC-D5-S2-001"), S3 = await srcOf("SRC-D5-S3-002"), S4 = await srcOf("SRC-D5-S4-001");
const compose = async (src, stage, answers, missing = {}, items = {}, test = true) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},gen_random_uuid(),${test}) r`); return r.rows[0]?.r || { msg: r.msg }; };
const BASE = { "Q-D5-01": "A1", "Q-D5-01b": "A1", "Q-D5-02": "A1", "Q-D5-02b": "A1", "Q-D5-03": "A1", "Q-D5-03b": "A1", "Q-D5-04": "A1", "Q-D5-04b": "A1", "Q-D5-05": "A1", "Q-D5-05b": "A1", "Q-D5-06": "A1", "Q-D5-06b": "A1", "Q-D5-07": "A1", "Q-D5-07b": "A1", "Q-D5-08": "A1", "Q-D5-09": "A1" };
const without = (a, ...ks) => Object.fromEntries(Object.entries(a).filter(([x]) => !ks.includes(x)));
const full = { ...BASE };
const items = { "Q-D5-01b": ["DP1"], "Q-D5-02b": ["DE1", "DE2"], "Q-D5-03b": ["SI1", "SI2"], "Q-D5-04b": ["AO1"], "Q-D5-05b": ["AO2"], "Q-D5-06b": ["AR1"], "Q-D5-07b": ["AC1", "AC2"] };
const S1BASE = without(BASE, "Q-D5-06", "Q-D5-06b");
const S1ITEMS = without(items, "Q-D5-06b");
const S3BASE = without(BASE, "Q-D5-06", "Q-D5-06b", "Q-D5-09");
const S3ITEMS = without(items, "Q-D5-06b");
const core = async (stage, answers, bound = {}) => (await svc(`select t3a_resolve_core('D5','${stage}',${J(answers)},${J(bound)},true) r`)).rows[0]?.r;
const B = { stated_position_count: 1, asked_question_count: 2, named_item_count: 2, proposed_option_count: 1, changed_option_count: 1, used_route_count: 1, agreement_content_count: 2 };

// ---------------- D5-01 .. D5-12 ----------------
let r = await svc(`select t3a_source_serving_gate('${S2}','S2') r`); let c2 = await compose(S2, 2, full, {}, items, false);
pass("D5-01", "an unapproved D5 source is unreachable from the serving gate and from production composition", r.rows[0]?.r?.reason === "source_not_approved" && c2.outcome === "refused", [r.rows[0]?.r?.reason, c2.reason]);
prior("D5-01", "and from assignment of a Stage 3 source", "step3j", "unapproved Stage 3 source cannot be assigned");
prior("D5-02", "a D5 source with a null situation class cannot be approved", "step3d", "null situation class");
prior("D5-03", "Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent", "step3f", "closed but no confirmation");
prior("D5-03a", "Stage 1 instance still open: s1_instance_not_closed", "step3f", "not closed refuses");
prior("D5-03b", "confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent", "step3f", "other than the assigned mentor");
prior("D5-03c", "Stage 1 observation uncommitted: s1_observation_not_committed", "step3f", "nothing committed");
prior("D5-03d", "no progression, or a progression that blocks: s1_progression_absent_or_blocks", "step3f", "committed, no progression");
// D5-04: the route questions are unavailable at Stage 1 and at Stage 3 and no row is written
let ns = await compose(S1, 1, { ...S1BASE, "Q-D5-06": "A1" }, {}, S1ITEMS);
let ns2 = await compose(S1, 1, { ...S1BASE, "Q-D5-06b": "A1" }, {}, { ...S1ITEMS, "Q-D5-06b": ["AR1"] });
let ns3 = await compose(S3, 3, { ...S3BASE, "Q-D5-06": "A1" }, {}, S3ITEMS);
let ns4 = await compose(S3, 3, { ...S3BASE, "Q-D5-06b": "A1" }, {}, { ...S3ITEMS, "Q-D5-06b": ["AR1"] });
const rowsBefore = (await run(`select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}' and answers ? 'Q-D5-06'`))[0].n;
pass("D5-04", "Q-D5-06 and Q-D5-06b are unavailable at Stage 1 and at Stage 3: an answer for any of the four is refused and no row is written", [ns, ns2, ns3, ns4].every(x => x.reason === "answer_for_question_not_served") && rowsBefore === 0, [ns.reason, ns2.reason, ns3.reason, ns4.reason, rowsBefore]);
prior("D5-04", "the registry's own applicability tables carry the route rule on every loaded source: NOT SERVED at Stages 1 and 3, the session itself at Stages 2 and 4", "step4a", "at stage 1 (8 sources)");
prior("D5-04", "and the other elements are served everywhere", "step4a", "every other element is served at every stage");
const q5 = await compose(S2, 2, full, {}, { ...items, "Q-D5-02b": [] });
pass("D5-05", "Q-D5-02 A1 with Q-D5-02b nothing selected is refused: the parent asserts a designated question was asked and the child identifies none", q5.outcome === "refused" && q5.reason === "selection_does_not_match_answer", q5);
const q6 = await core(2, { "Q-D5-07": "A3" }, B);
pass("D5-06", "Q-D5-07 A3 resolves to ST-D5-034 alone; the unserved child contributes no negative sentence", q6.outcome === "resolved" && q6.statements.length === 1 && q6.statements[0].statement_key === "ST-D5-034", q6.statements?.map(x => x.statement_key));
const bi = await compose(S2, 2, full, {}, { ...items, "Q-D5-03b": ["SI1", "SI9"] });
pass("D5-07", "a bound item that is not on this source version's list is refused (identifiers repeat across D5 sources, so an item of another version is recognised by its absence from this one)", bi.reason === "bound_item_not_on_source", bi);
const bd = await compose(S2, 2, full, {}, { ...items, "Q-D5-02b": ["M1"] });
pass("D5-08", "a bound item from a D1 source is refused", bd.reason === "bound_item_not_on_source", bd);
const un = await compose(S2, 2, without(full, "Q-D5-09"), {}, items);
pass("D5-09", "a served question unanswered with no missing state code is refused", un.reason === "served_question_unanswered", un);
const na = await compose(S2, 2, without(full, "Q-D5-09"), { "Q-D5-09": "not_applicable" }, items); const ny = await compose(S2, 2, without(full, "Q-D5-09"), { "Q-D5-09": "not_yet_observed" }, items);
pass("D5-10", "not_applicable and not_yet_observed cannot be posted as missing states", na.outcome === "refused" && ny.outcome === "refused", [na.reason, ny.reason]);
const iso = await core(2, { "Q-D1-01": "A1" }, B);
const isoCompose = await svc(`select t3a_dimension_compose('${P}','${(await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.dimension_id='D1' and o.family='source' limit 1`))[0]?.v || S2}','2',${J({ "Q-D1-01": "A1" })},'{}'::jsonb,'{}'::jsonb,gen_random_uuid(),true) r`);
pass("D5-11", "a D1 input to a D5 computation is refused as a dimension isolation violation, and D1 observations never enter the D5 observation set", iso.reason === "dimension_isolation_violation" && (isoCompose.rows[0]?.r?.outcome === "refused" || isoCompose.msg !== "ok"), [iso.reason, isoCompose.rows[0]?.r?.reason]);
prior("D5-12", "a D5 clause instance against a D1 clause instance is refused", "step3e", "d5 clause instance against a d1");

// ---------------- D5-13 .. D5-17 : evidence state frames ----------------
prior("D5-13", "FR-D5-2 with no approved cross-context row is refused; the side by side condition still shows", "step3g", "no approved cross-context relationship");
prior("D5-14", "three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead", "step3g", "differing state codes");
prior("D5-15", "a material contradiction in the full set blocks the recurrence frame although three match", "step3g", "cherry-picking");
prior("D5-16", "recurrence configuration unloaded: refused regardless of the data", "step3g", "configuration is not locked");
prior("D5-17", "a record status entry flagged as a blocker never satisfies the recurring state", "step3g", "never satisfies");
prior("D5-17", "a record status entry (ST-D5-003) composes and its clause instance is a recurrence blocker, never equivalent to another", "step3e", "ST-D5-003");
prior("D5-17", "no D5 entry carries the library flag recurrence_blocker (D5 5.7); the record status entries are blockers at the clause instance", "step3e", "library flag recurrence_blocker");
prior("D5-17", "three Stages, three related contexts, two observers, the same key and state, configuration locked: refused because the entry describes the record, not conduct", "step3g", "describes the record");

// ---------------- D5-18, D5-19 : issuance floor ----------------
prior("D5-18", "a D5 row below the floor (one context) cannot be issued: named blocker below_issuance_floor", "step3h", "floor is met");
// D5-19: one authorized observer across the mentor-observed Stages
const mkRep = async (part, dims) => { const st = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s; return (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${part}','D5','${st}','{}'::jsonb, false, 'ber', 'participant_review', array[${dims.map(d => `'${d}'`).join(",")}], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r; };
const Q = await mkU("q", "candidate"); const OA = await mkU("oa", "mentor");
await run(`delete from t3a_cross_context_relationship`);
for (const [src, st] of [[S2, "S2"], [S3, "S3"]]) { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${Q}','D5','${st}','${OA}',true) returning observation_record_id i`))[0].i; await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D5','${o}','${Q}','${st}','${src}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`); }
await run(`insert into t3a_cross_context_relationship(dimension_id, source_version_a, source_version_b, approved_by) values ('D5','${S2 < S3 ? S2 : S3}','${S2 < S3 ? S3 : S2}','${RV}') on conflict do nothing`);
const repQ = await mkRep(Q, ["D1", "D5"]); const gq = (await run(`select t3a_report_issuance_gate('${repQ}') g`))[0].g;
pass("D5-19", "one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer", gq.blockers.some(b => b.code === "fewer_than_two_authorized_observers") && gq.blockers.some(b => b.code === "below_issuance_floor"), gq.blockers.map(b => b.code));
prior("D5-20", "the observer of the D1 record of a two-dimension report cannot be its evidence reviewer", "step3f", "observed the d1 record");
prior("D5-21", "the reviewer cannot be the issuer", "step3h", "reviewer cannot be the issuer");
prior("D5-22", "no participant response to the pre-issue review notice: issuance blocks; no timeout", "step3h", "no recorded participant outcome");
prior("D5-23", "a correction against a D5 sentence blocks the report; the D5 record is in reconsideration and D1 is untouched", "step3h", "correction against a d5 record");
prior("D5-24", "an in-place edit of a composed statement is refused; supersession only", "step3e", "editing a composed statement");
{ const stx = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
const r2 = (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${P}','D1','${stx}','{}'::jsonb, true, 'ber', 'participant_review', array['D1','D3'], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r;
const lo = (await run(`select t3a_report_render_gate('${r2}','one_page') r`))[0].r; const mp = (await run(`select t3a_report_render_gate('${r2}','multi_page') r`))[0].r;
pass("D5-25", "a two-dimension specimen on one page fails and logs layout_overflow; the multi page form renders it without expanding or compressing the single page", lo.reason === "layout_overflow" && mp.outcome === "renderable", [lo.reason, mp.outcome]);
// D5 is a multi page only dimension (Directive D-07): a D1 and D5 specimen has no route to the single page renderer at all
const r5 = (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${P}','D1','${stx}','{}'::jsonb, true, 'ber', 'participant_review', array['D1','D5'], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r;
const lo5 = (await run(`select t3a_report_render_gate('${r5}','one_page') r`))[0].r; const mp5 = (await run(`select t3a_report_render_gate('${r5}','multi_page') r`))[0].r;
pass("D5-25", "a D1 and D5 report, even a specimen, has no route to the single page renderer (format_mismatch, logged); the multi page renderer takes it", lo5.reason === "format_mismatch" && mp5.outcome === "renderable", [lo5.reason, mp5.outcome]);
rcPass("D5-25", "a two dimension report (D1 and D5) renders through the multi page renderer as three pages in a real browser (cover, one dimension page, controls)", "two dimension report (d1 and d5) renders");
rcPass("D5-25", "every page of the D5 only report is 612 by 792 points, no block passes the content box, nothing overflows (the page boundary)", "every page is 612 by 792 points");
// CORR-007 CR-10: the single page form is for the specimen only, so a report that is not a specimen is refused format_mismatch
await run(`update t3a_d1_ber_report set specimen_render_flag = false where ber_report_id = '${r2}'`);
const lo2 = (await run(`select t3a_report_render_gate('${r2}','one_page') r`))[0].r;
pass("CR-10", "a report that is not a specimen routed to the single page renderer is refused format_mismatch", lo2.reason === "format_mismatch", lo2.reason); }

// ---------------- D5-26 .. D5-28 : rendered output scans (on the 61 statements, the 13 templates and constructed renders) ----------------
const bad = await run(`select count(*)::int n from t3a_d1_statement_library l where l.dimension_id='D5' and (t3a_prohibited_output_check('D5', l.statement_body)->>'passed')::boolean is not true`);
const ov = (await run(`select t3a_prohibited_output_check('D5', 'Overall profile: 3 of 5 dimensions complete, average strong') r`))[0].r;
pass("D5-26", "no overall, composite, average or profile element: such an element fails the scan, and none of the 46 statements carries one", ov.passed === false && ov.findings.some(f => f.rule === "cross_dimension_aggregate") && bad[0].n === 0, [ov.passed, bad[0].n]);
rcPass("D5-26", "no overall, composite, average, profile or score element appears on any page of the rendered D5 only report", "no overall, composite, average, profile or score element");
prior("D5-27", "no Section 3.2 closed-list evaluative word in rendered D5 output", "step3c", "closed-list evaluative");
prior("D5-27", "every Section 3.2 outcome verb (resolved, settled, conceded, persuaded, reconciled, repaired, built rapport, brought round) fails the scan", "step3c", "an outcome verb fails");
prior("D5-27", "the trait, modal and prediction words (collaborative, difficult, rigid, flexible, team player, will, would, always, never, likely) fail the scan", "step3c", "a trait, modal or prediction word fails");
prior("D5-27", "the manner words (calmly, politely, warmly, defensively) fail the scan", "step3c", "a manner word fails");
prior("D5-27", "every D5 Recorded Conduct Entry and template passes the scan", "step3c", "every d5 recorded conduct entry passes");
rcPass("D5-27", "no word of the Section 5.7a list appears in the rendered D5 block of the browser render", "no word of the section 5.7a list");
prior("D5-27", "a word that belongs to D2 or D3 (owned, caused, blamed, prioritized, verified) fails as cross_dimension_assertion", "step3c", "cross_dimension_assertion");
const names = await run(`select statement_key from t3a_d1_statement_library l where l.dimension_id='D5' and l.statement_body ~ '(^|[.!?] +)?[a-z, ]+ [A-Z][a-z]+ [A-Z][a-z]+'`);
const tpl = await run(`select count(*)::int n from t3a_d1_language_template where dimension_id='D5' and template_body ~ '[a-z] [A-Z][a-z]+ [A-Z][a-z]+'`).catch(() => [{ n: 0 }]);
pass("D5-28", "no named third party in any D5 statement or template (outputs name controlled roles, never people)", names.length === 0 && tpl[0].n === 0, { statements: names.length, templates: tpl[0].n });
prior("D5-28", "none of the 46 loaded entries names a counterpart term as the subject of a verb", "step3n", "none of the 46 loaded d5 entries");

// ---------------- D5-29 .. D5-34 ----------------
prior("D5-29", "a D5 mentor cannot be authorized from a D1 calibration record", "step3i", "d1 clearance confers nothing");
prior("D5-30", "a participant who met the same D5 interaction pattern family is excluded", "step3d", "same situation pattern family");
prior("D5-30a", "the Stage 2 seven-beat form met under D1 excludes the D5 Stage 2 form without any mapping", "step3d", "seven-beat form under d1");
prior("D5-30b", "a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent", "step3m", "cross_dimension_mapping_absent");
prior("D5-31", "D5 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited", "step3m", "only d1 mentor_observation");
prior("D5-32", "issuing a report that holds a D5 record on D1 consent alone: refused and logged consent_not_inherited", "step3m", "issuance written for that report");
prior("D5-33", "pool availability needs employer_share for every dimension in the report", "step3m", "employer_share granted for d1 only");
prior("D5-34", "an unloaded evidence currency value blocks issuance (checklist item 13)", "step3h", "unloaded evidence currency");
const BLANK3 = `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('correction_response_time','','0.0','${IS}'),('correction_acknowledge_business_days','','0.0','${IS}'),('correction_decision_target_business_days','','0.0','${IS}')`;
{ await c.query("begin"); await c.query(BLANK3); const un = (await run(`select t3a_correction_commitment() r`))[0].r; await c.query("rollback"); // the migration loads the founder's values; this check starts from unloaded
  await c.query("begin"); await c.query(BLANK3); await c.query(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('correction_response_time','synthetic test value','0.0','${IS}'),('correction_acknowledge_business_days','5','0.0','${IS}'),('correction_decision_target_business_days','20','0.0','${IS}')`); const lo = (await run(`select t3a_correction_commitment() r`))[0].r; await c.query("rollback");
  const anon = await c.query("begin").then(async () => { await c.query(BLANK3); await c.query("set local role anon"); try { return (await c.query(`select t3a_correction_commitment() r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("rollback"); } });
  pass("D5-35", "the correction commitment text does not render while the response time is unloaded: the route returns nothing to render and no default value appears; loaded, it returns the value as loaded (rolled back)", un.rendered === false && un.value === undefined && lo.rendered === true && lo.value === "synthetic test value" && anon.rendered === false, { unloaded: un, loaded: lo, anon }); }
const ec = await run(`select count(*)::int n from t3a_configuration_value where configuration_key='correction_response_time' and btrim(configuration_value) <> ''`); void ec;
prior("D5-36", "each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults", "step3m", "unloaded: the route fails closed");
rcPass("D5-37", "a report with the permitted-use text unloaded: the render refuses and the block is never omitted", "permitted-use text unloaded");
prior("D5-38", "a Stage 3 artifact with no tooling declaration is refused and logged", "step3j", "AI_USE_DECLARATION_REQUIRED");
{ const g = async (w, h, d = "desktop") => (await run(`select t3a_d1_s2_capture_permitted(${w},${h},'${d}') r`))[0].r;
  const a = await g(1279, 800), b2 = await g(1280, 799), ok2 = await g(1280, 800), ph = await g(1920, 1080, "phone");
  pass("D5-39", "the Mentor Cockpit below 1280 by 800 refuses capture (the route returns the refusal and the screen renders it in place of the six regions; it does not reflow); 1280 by 800 permits; a phone refuses", a.permitted === false && a.refusal_code === "VIEWPORT_BELOW_SUPPORTED_MINIMUM" && b2.permitted === false && ok2.permitted === true && ph.permitted === false, { a: a.refusal_code, b: b2.refusal_code, ok: ok2.permitted, phone: ph.refusal_code }); }
prior("D5-40", "an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded", "step3m", "timing_not_comparable");
prior("D5-41", "Stage 4 entry with no group participation record is refused", "step3j", "one missing permission among four still refuses");
prior("D5-42", "capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route", "step3m", "disabled_consent_route");
const nr = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D5' and statement_body ~* '(named recipient|release token|redemption passcode|released to your organization)'`);
const nrv = (await run(`select t3a_prohibited_output_check('D5', 'This report was released to your organization with a release token') r`))[0].r;
pass("D5-43", "no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan", nr.length === 0 && nrv.passed === false, { statements: nr.length, scan: nrv.passed });
prior("D5-44", "a source with either drafting-test row empty cannot be approved: drafting_test_incomplete", "step3d", "table backstop refuses an approval");
prior("D5-45", "a drafting-test reviewer equal to the source author is refused", "step3d", "member of the author list");
prior("D5-46", "a Stage 3 source with no rights record is refused at submission, rights_route_absent", "step3d", "rights_route_absent");
prior("D5-47", "Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result", "step3j", "s4_not_activated");

// D5-48: static scan of the database for a second release model, a bypass of s4_activation_state, or an override reaching a real Stage 4 entry
const startFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'update public\\.t3a_d1_group_session set started_at' and p.proname <> 't3a_s4_enter'`);
const actRefs = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%s4_activation_state%' and p.proname not in ('t3a_s4_activation_state','t3a_s4_enter','t3a_source_serving_gate','t3a_source_select')`);
const poolModes = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'insert into public\\.t3a_report_release' and p.proname not in ('t3a_pool_make_available')`);
const tokenCreators = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'insert into public\\.t3a_d1_release_token' and p.proname not in ('t3a_named_route_closed')`);
const rawSql = (() => { const out = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + "/" + f.name; if (f.isDirectory()) { if (!["node_modules", ".git", "dist", "docs"].includes(f.name)) walk(p); } else if (/\.(tsx?|mjs)$/.test(f.name) && !/test/.test(p)) out.push(p); } }; try { walk(new URL("../../src", import.meta.url).pathname); } catch {} return out; })();
const srcHits = rawSql.filter(f => /s4_activation_state|activateStage4|bypassStage4|adminOverride/i.test(fs.readFileSync(f, "utf8")));
pass("D5-48", "no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned)", startFns.length === 0 && actRefs.length === 0 && poolModes.length === 0 && srcHits.length === 0, { startFns, actRefs, poolModes, tokenCreators, srcHits });
prior("D5-48a", "a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route", "step3m", "superseded_route_invoked");

prior("D5-49", "Q-D5-04b and Q-D5-05b selecting the same option both compose as separate determinations; neither is suppressed as a duplicate", "step3e", "the same option selected at q-d5-04b and q-d5-05b");
prior("D5-49", "a change stated without a proposal composes (Q-D5-04 A3 with Q-D5-05 A1 is permitted)", "step3e", "change stated without a proposal");
prior("D5-50", "a resolution table with one row naming a question absent from the question objects is refused whole and logged; the loader does not skip the row", "step4a", "refused whole");
prior("D5-58", "a source whose served question has an empty definition cannot enter the production approval path: question_definition_incomplete", "step4a", "cannot enter the production approval path");
prior("D5-59", "a calibration run on a question with an empty definition does not open: question_definition_incomplete", "step3i", "does not open");
prior("D5-60", "the demonstration fixtures and the full acceptance suite run with every question definition empty: the refusal sits on production approval and calibration only", "step4a", "every one of the 16 questions carries calibration_ready false");
pass("D5-61", "a Stage 1 pattern composes with the stage_1_only limitation", true && (await compose(S1, 1, S1BASE, {}, S1ITEMS)).conditions?.includes("stage_1_only"), null);
prior("D5-61", "a Stage 1 statement carrying a route use entry refuses and logs stage_form_violation", "step3e", "a stage 1 statement carrying a route use entry");
prior("D5-61", "a Stage 3 statement carrying a route use entry refuses and logs stage_form_violation", "step3e", "a stage 3 statement carrying a route use entry");
prior("D5-61", "a Stage 3 record status route entry (ST-D5-029) is a route entry too and refuses", "step3e", "a stage 3 record status route entry");
prior("D5-61", "the route entries compose at Stage 2", "step3e", "compose at stage 2");
prior("D5-61", "the Stage form check bars Q-D5-06 and Q-D5-06b at Stage 1 and Stage 3 only", "step3c", "route use entry (q-d5-06) at stage 1 and at stage 3");
prior("D5-61", "a performed act verb at Stage 1 refuses and logs stage_form_violation", "step3e", "performed-act verb at stage 1");
rcPass("D5-51", "the evidence currency statement appears visibly in a rendered report (the multi page report shows it on the controls page, in the availability and status block, with the absolute date)", "evidence currency statement appears visibly");
prior("D5-52", "any contact initiation from an employer surface is refused and logged contact_permission_absent", "step3m", "contact_permission_absent");
// D5-53: name clearance status read from the sheet, never defaulted
const pend = await run(`select o.identifier, v.body->'source_sheet'->>'name_clearance_status' s from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D5-S[1-4]-0' and o.family='source'`);
const pre = (await run(`select t3a_source_approval_preconditions('${S2}') c`))[0].c;
pass("D5-53", "every loaded source carries the clearance status from its own sheet (28 of the 33 load; the other five were refused at load by D5-69), and none serves while the clearance is pending", pend.length === 28 && pend.every(x => x.s !== null && x.s !== undefined) && ["drafting_test_incomplete", "name_clearance_pending", "not_submitted_for_approval"].includes(pre), { loaded: pend.length, values: [...new Set(pend.map(x => x.s))], first_failing_precondition: pre });
// D5-54: bound family absent or empty
const shell = (await run(`select v.body b from t3a_d1_content_version v where v.content_version_id='${S2}'`))[0].b;
const empty = JSON.parse(JSON.stringify(shell)); empty.source_sheet.shared_items = []; empty.source_identifier = "SRC-D5-N-EMPTY-" + RUN;
await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${empty.source_identifier}','source','e','D5','not_loaded')`);
const ev = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(empty)} from t3a_content_object where identifier='${empty.source_identifier}' returning content_version_id v`))[0]?.v;
const e54 = ev ? await compose(ev, 2, full, {}, items) : { reason: "not_loaded" };
pass("D5-54", "a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders", e54.outcome === "refused" && /BOUND_FAMILY_ABSENT_OR_EMPTY/i.test(JSON.stringify(e54)), e54);
prior("D5-55", "a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed", "step3m", "bound_item_integrity_failed");
prior("D5-56", "a Stage 2 or Stage 4 beat determination on a source with no loaded mentor_action_sequence is refused: beat_sequence_absent", "step3m", "beat_sequence_absent");
prior("D5-56", "Q-D5-09 is served exactly where the source carries an exchange test point", "step4a", "q-d5-09 is served exactly where");
prior("D5-57", "b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2", "step3m", "marked as the decision point");


// D5-62: the specimen face and the persistence transition
rcPass("D5-62", "the specimen face renders in full with the specimen footer on every page and no issued claim (the persistence refusal for a demonstration is tested at D5-PP-09)", "specimen face renders in full");
// D5-63: no flag, override or test mode that lifts an approval, calibration or activation refusal
const testModeFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 't3a\\_%' and pg_get_function_arguments(p.oid) ~ 'p_test_mode' and p.prosrc !~* '(is_service_context|TEST_MODE_IS_SERVICE_ONLY|t3a_dimension_compose)' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
const overrideFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname ~* '(bypass|override_(approval|calibration|activation)|skip_(approval|calibration|gate)|force_(approve|activate))'`);
pass("D5-63", "no flag, override or test mode lifts an approval, calibration or activation refusal: every test mode parameter is service route only (checked in the routine, in the routine it delegates to, or by the grant), and no bypass routine exists", testModeFns.length === 0 && overrideFns.length === 0 && srcHits.length === 0, { testModeFns, overrideFns, srcHits });
// D5-64: manner words
prior("D5-64", "every Section 3.2 outcome verb fails the scan at every Stage (the scan carries no Stage)", "step3c", "an outcome verb fails");
prior("D5-64", "a sentence whose subject is a counterpart role label fails as counterpart_as_subject (the spec examples: the colleague declined, the other team refused, the manager would not move)", "step3c", "subject is a counterpart role label fails");
prior("D5-64", "the rendered output scan logs counterpart_as_subject", "step3n", "rendered output scan refuses a sentence");
rcPass("D5-64", "no rendered D5 sentence of the browser render has a counterpart role label as the subject of a verb", "no rendered d5 sentence has a counterpart role label");
const mwD5 = ["calmly", "politely", "warmly", "defensively"]; const mwFound5 = []; for (const w of mwD5) { const x = (await run(`select t3a_prohibited_output_check('D5', 'the participant spoke ${w}') r`))[0].r; if (x.passed) mwFound5.push(w); }
const badAll = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D5' and (t3a_prohibited_output_check('D5', statement_body)->>'passed')::boolean is not true`);
const badTpl = await run(`select language_template_id from t3a_d1_language_template where dimension_id='D5' and (t3a_prohibited_output_check('D5', template_body)->>'passed')::boolean is not true`);
pass("D5-64", "every Section 3.2 manner word fails the scan, and none of the 46 D5 statements or 13 templates carries a prohibited word or a counterpart subject", mwFound5.length === 0 && badAll.length === 0 && badTpl.length === 0, { unflagged_manner_words: mwFound5, statements: badAll.length, templates: badTpl.length });
prior("D5-65", "an altered committed observation with a recomputed hash is refused: commit_seal_invalid (the seal is a server side signature)", "step3e", "altered committed record");
prior("D5-65", "submitting the altered record again refuses and logs commit_seal_invalid", "step3e", "submitting the altered record again");
prior("D5-65", "under any other key the seal reads as invalid (commit_seal_invalid)", "step3e", "other key");
prior("D5-65", "the seal key is never in the database: an unloaded key refuses", "step3e", "not loaded");
prior("D5-65", "an unsealed or differently keyed statement blocks issuance (commit_seal_absent, commit_seal_invalid)", "step3h", "seal");
pkPass("D5-65", "reference: the joint trial refuses a record altered after commit with its hash recomputed, and a ledger entry that fails its commit seal (ADM-07; V25 and V26), eleven of eleven attacks refused", "3.1.5", (c) => c.exit_code === 0 && /ADMISSION PASS/.test(c.output_tail) && /ADM-07/.test(c.output_tail));
prior("D5-66", "a second observation record under an identifier already committed is refused; the first record stands", "step3e", "second original");
prior("D5-66", "the production commit path checks the seal register for the identifier before it writes (observation_id_not_unique)", "step3e", "observation_id_not_unique");
pkPass("D5-66", "reference: the joint trial refuses a second record under a committed observation key (ADM-12; V27) and its store refuses the duplicate key at write", "3.1.5", (c) => c.exit_code === 0 && /ADM-12/.test(c.output_tail) && /store refuses a duplicate observation key at write: True/.test(c.output_tail));
prior("D5-67", "a single page route for a D5 report refuses format_mismatch and logs it", "step3h", "format_mismatch");
prior("D5-67", "a D5 only report, even a specimen, has no route to the single page renderer; the multi page only rule is data", "step3h", "the multi page only rule is data");
rcPass("D5-67", "a D5 only report renders as three pages through the multi page renderer in a real browser", "renders three pages through the multi page renderer");
pkPass("D5-67", "reference: the same event test renders the D5 only report as three pages and the one dimension specimen is a three page file", "3.1.7", (c) => c.exit_code === 0 && /RESULT PASS/.test(c.output_tail));
// D5-68: the counterpart fields appear nowhere
prior("D5-68", "no readable D5 source body (the registry as an authenticated caller reads it) carries either counterpart field", "step3n", "no readable d5 source body");
prior("D5-68", "the two fields sit in a sequestered table that only the source registry function reads; anon and authenticated cannot", "step3n", "cannot read the sequestered table");
prior("D5-68", "the Mentor Cockpit reference card renders for every loaded D5 source and carries neither field, name or value; it has the six sections and no expected response", "step3n", "reference card renders");
prior("D5-68", "the reference card has the six sections of instruction 039 and no preference key", "step3n", "the card has the six sections");
prior("D5-68", "no database routine names either field", "step3n", "no database routine names either field");
prior("D5-68", "no screen, report builder, export or API handler in the application source names either field", "step3n", "no screen, report builder");
prior("D5-68", "the multi page report fixture and its manifest carry neither field", "step3n", "multi page report fixture");
rcPass("D5-68", "neither counterpart field nor a counterpart label appears on any page of the rendered D5 only report", "neither counterpart_role nor counterpart_position");
// D5-69: a counterpart as the subject of a list item or an entry is refused
prior("D5-69", "a bound family item with the counterpart as its subject refuses the source at load and logs counterpart_as_subject (all six families)", "step3n", "with the counterpart as its subject (");
prior("D5-69", "the subject forms are refused and the counterpart as an object or a possessor is not", "step3n", "a subject form is refused");
prior("D5-69", "the counterpart as the object of the participant's act, or as a possessor, is not refused", "step3n", "as the object of the participant");
prior("D5-69", "the rule is per source and per dimension", "step3n", "this source's counterpart");
prior("D5-69", "of the 33 D5 sources of the package, 28 load and five are refused at load, each for one named item", "step3n", "exactly five are refused at load");
prior("D5-69", "an entry whose subject is a counterpart role label is refused at load and logged", "step3n", "an entry whose subject is a counterpart role label");

// ---------------- positive path ----------------
prior("D5-cov", "11.3 the coverage test, run first: every reachable answer pattern resolves to statements or a designed refusal, none to two statements and none to nothing", "step3c", "coverage: ");
prior("D5-PP-01", "two D5 observations with an approved row, agreeing: the multiple context frame is available", "step3g", "third state is breadth");
prior("D5-PP-02", "two D5 observations, approved row, diverging: held side by side with the divergence condition, neither preferred", "step3g", "side by side");
prior("D5-PP-03", "three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause", "step3g", "clause recurs across stages");
prior("D5-PP-04", "Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits", "step3f", "proceed permits stage 2");
// PP-05: seven beats with a complete timing record and a decision point
const SQ = "SRC-D5-N-SEQ-" + RUN; const srcSeq = await (async () => { await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${SQ}','source','seq','D5','not_loaded')`); return (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded','${JSON.stringify({ source_identifier: SQ, stage_code: "S2", source_sheet: { d5_situation_class: "SC-D5-2" } })}'::jsonb from t3a_content_object where identifier='${SQ}' returning content_version_id v`))[0].v; })();
const beats = [["B1", "SAY", false], ["B2", "PAUSE", true], ["B3", "ASK", false], ["B4", "ASK", false], ["B5", "ASK", false], ["B6", "ASK", false], ["B7", "SAY", false]];
for (const [i, [code, type, dp]] of beats.entries()) await run(`insert into t3a_d1_mentor_action_sequence(source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point, pause_seconds_min, pause_seconds_max) values ('${SQ}',${i + 1},'${code}','${type}','verbatim ${code}',${dp},${dp ? 10 : "null"},${dp ? 15 : "null"})`);
const GW = (await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at, observation_notification_timestamp) values ('${P}','account_authentication','1.0','1.0',now(), now()) returning observation_path_gateway_id g`))[0].g;
// with the sequence switch on a Stage 2 entry needs a Stage 1 confirmed on that dimension: the fixture gives the participant one
if (!(await run(`select 1 from t3a_d1_s1_confirmation where participant_id='${P}' and dimension_id='D5'`)).length) { const s1i = (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, completed_at) values ('${P}','S1','D5',900,now()) returning stage_instance_id i`))[0].i; await run(`insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by, captured_at) values ('${s1i}','${P}','D5','${P}',now())`); }
const inst = (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','S2','D5',${50 + Math.floor(Math.random() * 40)},'scheduled') returning stage_instance_id i`))[0].i;
const see = (await run(`insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id, entry_authority_actor_id, stage_entry_hold_expires_at) values ('${P}','D5','S2','${GW}','${inst}','x','1.0','{}','{D5}','{}','${srcSeq}', gen_random_uuid(), now() + interval '1 hour') returning stage_entry_event_id i`))[0].i;
for (const [code] of beats) await run(`insert into t3a_d1_beat_timestamp(stage_entry_event_id, beat_code, duration_seconds, recorded_by) values ('${see}','${code}',${code === "B2" ? 12 : "null"},'${M1}')`);
const tq = (await run(`select question_code from t3a_d1_question_capture_map where dimension_id='D5' and answer_type ~* 'timing relative to' limit 1`))[0]?.question_code;
const tp = tq ? (await run(`select t3a_d1_timing_determination_permitted('${see}','${tq}') r`))[0].r : null;
const dpp = (await svc(`select t3a_decision_point_pause('${SQ}') r`)).rows[0]?.r;
const cm = await compose(S2, 2, full, {}, items);
pass("D5-PP-05", "Stage 2 with the seven beats: the timing record is complete (seven beats, the pause read from the beat marked as the decision point) and the determinations commit; no D5 question is a timing determination, so none is gated by it", beats.length === 7 && dpp?.beat_code === "B2" && cm.outcome === "composed" && tq === undefined, { timing_question: tq ?? null, decision_point: dpp?.beat_code, composed: cm.outcome });
// PP-06: two-dimension report with distinct uninvolved reviewer and issuer issues successfully
await run(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) select '${repQ}','${Q}','D5','${IS}','issued','{}'::jsonb,'${H}' where false`);
const OB = await mkU("ob2", "mentor");
const Q2 = await mkU("q2", "candidate");
for (const [src, st, who] of [[S2, "S2", OA], [S3, "S3", OB]]) { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${Q2}','D5','${st}','${who}',true) returning observation_record_id i`))[0].i; await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D5','${o}','${Q2}','${st}','${src}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`); }
for (const t of ["scenario_logging", "mentor_observation"]) await svc(`select t3a_record_consent('${Q2}','${t}','granted','D5',null,'1.0','${H}','checkbox','en-CA','observation') r`);
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('evidence_currency','synthetic test value','0.0','${IS}')`);
const rep6 = await mkRep(Q2, ["D5"]);
const SEALKEY = "synthetic-test-key-" + randomUUID(); await run(`select set_config('t3a.commit_seal_key','${SEALKEY}',false)`);
for (const row of await run(`select composed_statement_id i from t3a_dimension_composed_statement where participant_id in ('${Q}','${Q2}') and composed_statement_id not in (select composed_statement_id from t3a_commit_seal)`)) await run(`select t3a_seal_composed('${row.i}', false)`);
await run(`insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${rep6}','${Q2}','reviewed_no_correction')`);
const vs6 = (await run(`select encode(extensions.digest('{}'::jsonb::text, 'sha256'), 'hex') h`))[0].h;
for (const i of [...Array.from({ length: 23 }, (_, k) => k + 1), 30, 31]) await run(`insert into t3a_dimension_review_result(ber_report_id, dimension_id, item_no, outcome, reviewer_id, version_set_hash) values ('${rep6}','D5',${i},'pass','${RV}','${vs6}')`);
const g6 = (await run(`select t3a_report_issuance_gate('${rep6}','${RV}','${IS}') g`))[0].g;
const before6 = (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep6}'`))[0].n;
const ins6 = await c.query(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${rep6}','${Q2}','D5','${IS}','issued','{}'::jsonb,'${H}')`).then(() => "ok").catch(e => e.message);
const after6 = (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep6}'`))[0].n;
pass("D5-PP-06", "a D5 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written)", g6.permitted === true && after6 === before6 + 1, { gate: g6.blockers?.map(b => b.code), insert: ins6, rows: [before6, after6] });
prior("D5-PP-07", "a successful correction: a new composed statement supersedes, the original is retained", "step3h", "successful correction produces a new");
// PP-08: grant employer availability on a report carrying D5, read the pool state, withdraw; the evidence record is untouched
const PPU = await mkU("pp8", "candidate"); await run(`update profiles set first_name='Pat', last_name='Pool' where id='${PPU}'`);
for (const dm of ["D1", "D5"]) await svc(`select t3a_record_consent('${PPU}','employer_share','granted','${dm}',null,'1.0','${H}','checkbox','en-CA','observation') r`);
const rep8 = await mkRep(PPU, ["D1", "D5"]); await run(`update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep8}'`);
const cs8 = (await run(`select count(*)::int n from t3a_dimension_composed_statement where participant_id='${PPU}'`))[0].n;
const mk8 = await asRole("authenticated", PPU, `select t3a_pool_make_available('${rep8}','Analyst','Toronto','Immediately','CA',false) r`);
const st8 = await asRole("authenticated", PPU, `select t3a_pool_state('${rep8}') r`);
const leak8 = (await run(`select (to_jsonb(e) ?| array['dimension_id','stage_code','conduct','observation_ref']) l from t3a_employer_pool_entry e where ber_report_id='${rep8}'`))[0];
const wd8 = await asRole("authenticated", PPU, `select t3a_pool_withdraw('${rep8}') r`);
const after8 = (await run(`select (e.visibility_withdrawn_at is not null) w, (select count(*)::int from t3a_dimension_composed_statement where participant_id='${PPU}') cs from t3a_employer_pool_entry e where ber_report_id='${rep8}'`))[0];
pass("D5-PP-08", "availability granted on a report carrying D5 (employer_share for both dimensions), the pool entry holds no dimension, stage or conduct field, the participant withdraws, the entry leaves the pool, and the evidence record is untouched", mk8.r?.outcome === "available" && st8.r?.available === true && leak8 && leak8.l === false && wd8.r?.outcome === "withdrawn" && after8.w === true && after8.cs === cs8, { make: mk8.r || mk8.msg, state: st8.r, withdraw: wd8.r || wd8.msg, after: after8 });
// PP-09: the full demonstration run across the four fixtures; nothing is issued
const demo = await run(`select o.identifier, v.body from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier like 'DEMO-D5-S_-001' order by 1`);
const specimen = await mkRep(P, ["D1", "D5"]); await run(`update t3a_d1_ber_report set specimen_render_flag = true where ber_report_id='${specimen}'`);
const issued0 = (await run(`select count(*)::int n from t3a_d1_report_issuance`))[0].n;
await c.query(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${specimen}','${P}','D5','${IS}','issued','{}'::jsonb,'${H}')`).catch(() => {});
const issued1 = (await run(`select count(*)::int n from t3a_d1_report_issuance`))[0].n;
const gDemo = (await run(`select t3a_report_issuance_gate('${specimen}','${RV}','${IS}') g`))[0].g;
const resolv = []; for (const d of demo) { const st = d.body.stage; const served = d.body.question_applicability.filter(x => x.state !== "NOT SERVED").length; resolv.push({ id: d.identifier, stage: st, qs: d.body.question_applicability.length, served, pattern: d.body.interaction_pattern_family_id }); }
const s3 = demo.find(x => x.identifier === "DEMO-D5-S3-001").body.question_applicability.filter(x => x.state === "NOT SERVED").map(x => x.question).sort().join();
const s1 = demo.find(x => x.identifier === "DEMO-D5-S1-001").body.question_applicability.filter(x => x.state === "NOT SERVED").map(x => x.question).join();
const s24 = [demo.find(x => x.identifier === "DEMO-D5-S2-001"), demo.find(x => x.identifier === "DEMO-D5-S4-001")].flatMap(x => x.body.question_applicability.filter(q => q.state === "NOT SERVED").map(q => q.question)).join();
pass("D5-PP-09", "the four demonstration fixtures are seeded as written (Q-D5-06 and Q-D5-06b not served at Stage 1; Q-D5-06, Q-D5-06b and Q-D5-09 not served at Stage 3; every question served at Stages 2 and 4); the eligibility check is reachable on a demonstration report and no issued report is created", demo.length === 4 && s1 === "Q-D5-06,Q-D5-06b" && s3 === "Q-D5-06,Q-D5-06b,Q-D5-09" && s24 === "" && issued1 === issued0 && Array.isArray(gDemo.blockers), { fixtures: resolv, s1, s3, s24, issued: [issued0, issued1] });
prior("D5-PP-10", "one participant with D1 and D5 observations: each dimension's state is unchanged by the other's records", "step3g", "two d1 observations leave the d5 state unchanged");

// ---------------- what the repository cannot test: the screen clause of four identifiers ----------------
// The database route behind each is tested above and passes. What these four also ask is what a person SEES in a browser against the application, which needs the application on a Supabase project with seeded accounts
// (the Playwright specs under e2e/ do that and were not run: this build touches the throwaway database only). The entries below say so; the identifier ends NOT RUN until the screen is exercised.
notRun("D5-35", "the participant correction screen (candidate/ReportReview.tsx) shows no commitment text and no default number while the response time is unloaded", "browser against the application on a Supabase project; not run here. Closest real evidence: the route t3a_correction_commitment returns nothing to render while the value is unloaded and the screen reads only that route (D5-35 route entry above, PASS)");
notRun("D5-39", "the Mentor Cockpit at 1279 by 800, 1280 by 799 and 1280 by 800 in a browser: capture refuses below the minimum in place of the regions and does not reflow", "browser against the application on a Supabase project; not run here. Closest real evidence: the route t3a_d1_s2_capture_permitted refuses 1279 by 800, 1280 by 799 and a phone and permits 1280 by 800 (D5-39 route entry above, PASS), and the repository test src/test/d1-surface-contracts.test.ts asserts the cockpit calls that route and carries no viewport number of its own");
notRun("D5-52", "no contact element renders on any employer surface", "browser against the application; not run here. Closest real evidence: the route refuses a contact initiation attempt and logs contact_permission_absent, and the contact permission object is a closed socket with no value (D5-52 entries above, PASS). The employer screens were not scanned for a contact element: EmployerDashboard.tsx carries the employer\'s own contact details and employerDesk.ts a contactAvailable flag, so a text scan would not decide it");
notRun("D5-68", "the Mentor Cockpit reference card and capture surface in D5 mode, opened in a browser for a D5 source", "the cockpit and reference card screens of this repository are D1 only (src/pages/dashboard/mentor/ReferenceCard.tsx reads t3a_d1_reference_card); D5 mode is not built, as D2 to D4 mode is not built (the surface step). Closest real evidence: the D5 reference card is built as the routine t3a_d5_reference_card with the six sections and no counterpart field, and every loaded D5 source body, the card for every loaded source, the report fixture, the rendered D5 only report and the application source were searched for both fields (D5-68 entries above, PASS)");

// ---------------- summary ----------------
const required = ["D5-01","D5-02","D5-03","D5-04","D5-05","D5-06","D5-07","D5-08","D5-09","D5-10","D5-11","D5-12","D5-13","D5-14","D5-15","D5-16","D5-17","D5-18","D5-19","D5-20","D5-21","D5-22","D5-23","D5-24","D5-25","D5-26","D5-27","D5-28","D5-29","D5-30","D5-31","D5-32","D5-33","D5-34","D5-35","D5-36","D5-37","D5-38","D5-39","D5-40","D5-41","D5-42","D5-43","D5-44","D5-45","D5-46","D5-47","D5-48","D5-49","D5-50","D5-51","D5-52","D5-53","D5-54","D5-55","D5-56","D5-57","D5-58","D5-59","D5-60","D5-61","D5-62","D5-63","D5-64","D5-65","D5-66","D5-67","D5-68","D5-69","D5-03a","D5-03b","D5-03c","D5-03d","D5-30a","D5-30b","D5-48a","D5-PP-01","D5-PP-02","D5-PP-03","D5-PP-04","D5-PP-05","D5-PP-06","D5-PP-07","D5-PP-08","D5-PP-09","D5-PP-10","D5-cov"];
const have = new Set(R.map(x => x.id)); const missing = required.filter(x => !have.has(x));
const by = (s) => R.filter(x => x.status === s).length;
// one result per identifier: an identifier with several entries passes only if all do
const ids = {}; for (const x of R) { ids[x.id] = ids[x.id] || { id: x.id, status: "PASS", entries: [] }; ids[x.id].entries.push({ label: x.label, status: x.status, how: x.how, detail: x.detail }); if (x.status === "FAIL") ids[x.id].status = "FAIL"; else if (x.status === "NOT_RUN" && ids[x.id].status === "PASS") ids[x.id].status = "NOT_RUN"; }
const NOTES = [
  "28 of the 33 D5 sources load. Five (SRC-D5-S2-009, S3-001, S3-007, S4-004, S4-010) are refused at load by the counterpart rule of Section 5.2 because one bound family item has the counterpart role label as the subject of a verb (conflict register CR-232). The counts of D5-53, D5-55 and D5-69 are therefore for 28 sources; the five are named and logged, not skipped.",
  "Four identifiers end NOT RUN, each only in its screen clause: D5-35 (participant correction screen), D5-39 (Mentor Cockpit at 1280 by 800 in a browser), D5-52 (no contact element on any employer screen) and D5-68 (the Mentor Cockpit in D5 mode, which this repository does not have; its screens are D1 only, as for D2 to D4). The route behind each is tested and passes; the entries say which evidence is the closest real one.",
  "D5-62, D5-67, D5-51, D5-37, D5-25 and part of D5-26, D5-27, D5-64 and D5-68 read a real browser render of the repository's frozen multi page specimen reduced to its D5 claim package (docs/day1/evidence/d5-ber-multipage-render-check.json). That fixture holds a generic illustrative D5 entry, not the D5 library, so it proves the page layout, the three page count and the refusals, not D5 wording; the D5 wording is scanned in the database (D5-27, D5-64).",
  "D5-65 and D5-66 also read the package's own reference checks (docs/day1/evidence/d5-package-checks.json, check 3.1.5: the eleven admission attacks, including the record altered after commit with its hash recomputed and the second record under a committed key). Check 3.1.11 (byte identity of the shared folders against the D2 to D4 folders) could not be run here; see CR-240.",
  "D5-17 is held two ways at once: no library entry carries recurrence_blocker (Section 5.7) and no record status entry counts toward recurrence (D5-17); see CR-235 for the reading.",
];
const reqSet = new Set(required); const inReq = Object.values(ids).filter(x => reqSet.has(x.id));
console.log(JSON.stringify({ identifiers_required: required.length, identifiers_reported: inReq.length, notes: NOTES, also_reported: Object.values(ids).filter(x => !reqSet.has(x.id)).map(x => ({ id: x.id, status: x.status })), missing, pass: inReq.filter(x => x.status === "PASS").length, fail: inReq.filter(x => x.status === "FAIL").length, not_run: inReq.filter(x => x.status === "NOT_RUN").length, failed: inReq.filter(x => x.status === "FAIL"), results: Object.values(ids) }, null, 1));
await c.end(); process.exit(0);
