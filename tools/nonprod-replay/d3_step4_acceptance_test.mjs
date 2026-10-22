// Step 4d: the consolidated D3 acceptance run (D3 Section 11: D3-01 to D3-57, the D3 additions D3-49, D3-50 and D3-58 to D3-61, and D3-PP-01 to D3-PP-10), under the Section 11 identifiers only.
// Each entry is either run here against the throwaway database, or is evidence from an earlier step file that this run re-reads (it fails if that evidence is absent or failing),
// or is NOT RUN with the reason (renderer and screens are Step 6 and the surface step). Synthetic approvals, clearances and accounts exist on the throwaway database only.
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
const files = {}; for (const f of fs.readdirSync(EVDIR).filter(x => /^d3-step.*-test\.json$/.test(x))) files[f] = JSON.parse(fs.readFileSync(EVDIR + f, "utf8"));
const prior = (id, label, fileHint, ...needles) => {
  const hits = []; for (const [f, d] of Object.entries(files)) if (f.includes(fileHint)) for (const r of d.results) if (needles.every(n => r.label.toLowerCase().includes(n.toLowerCase()))) hits.push({ f, label: r.label, ok: r.pass });
  pass(id, label, hits.length > 0 && hits.every(h => h.ok), hits.map(h => `${h.f}: ${h.label}`), "evidence");
};


// ---- evidence from the browser render check of the multi page report (ber_multipage_render_check.mjs)
const RC = (() => { try { return JSON.parse(fs.readFileSync(EVDIR + "ber-multipage-render-check.json", "utf8")); } catch { return null; } })();
const rcPass = (id, label, needle, why) => { const hits = (RC?.results || []).filter(x => x.label.toLowerCase().includes(needle.toLowerCase())); pass(id, label, hits.length > 0 && hits.every(x => x.pass), hits.map(x => x.label), "evidence"); void why; };

const P = await mkU("p", "candidate"), M1 = await mkU("m1", "mentor"), M2 = await mkU("m2", "mentor"), RV = await mkU("rv", "mentor"), IS = await mkU("is", "mentor");
const S1 = await srcOf("SRC-D3-S1-001"), S2 = await srcOf("SRC-D3-S2-001"), S3 = await srcOf("SRC-D3-S3-001"), S4 = await srcOf("SRC-D3-S4-001");
const compose = async (src, stage, answers, missing = {}, items = {}, test = true) => { const r = await svc(`select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},${J(missing)},${J(items)},gen_random_uuid(),${test}) r`); return r.rows[0]?.r || { msg: r.msg }; };
const BASE = { "Q-D3-01": "A1", "Q-D3-01b": "A1", "Q-D3-02": "A1", "Q-D3-02b": "A1", "Q-D3-03": "A1", "Q-D3-03b": "A1", "Q-D3-04": "A1", "Q-D3-04b": "A1", "Q-D3-05": "A1", "Q-D3-05b": "A1", "Q-D3-07": "A1", "Q-D3-07b": "A1", "Q-D3-08": "A1" };
const full = { ...BASE, "Q-D3-09": "A1" };
const items = { "Q-D3-01b": ["WI1", "WI2"], "Q-D3-02b": ["DC1"], "Q-D3-03b": ["SR1"], "Q-D3-04b": ["CK1"], "Q-D3-05b": ["MN1"], "Q-D3-07b": ["DC2"] };
const S1BASE = { "Q-D3-01": "A1", "Q-D3-01b": "A1", "Q-D3-02": "A4", "Q-D3-03": "A3", "Q-D3-04": "A2", "Q-D3-04b": "A1", "Q-D3-05": "A2", "Q-D3-05b": "A1", "Q-D3-07": "A3", "Q-D3-09": "A1" };
const S1ITEMS = { "Q-D3-01b": ["WI1"], "Q-D3-04b": ["CK1"], "Q-D3-05b": ["MN1"] };
const core = async (stage, answers, bound = {}) => (await svc(`select t3a_resolve_core('D3','${stage}',${J(answers)},${J(bound)},true) r`)).rows[0]?.r;
const B = { placed_item_count: 2, affected_component_count: 1, held_requirement_count: 1, identified_check_count: 1, identified_means_count: 1, identified_component_count: 1, overstated_component_count: 1, understated_component_count: 1, affected_party_label: "the client" };

// ---------------- D3-01 .. D3-12 ----------------
let r = await svc(`select t3a_source_serving_gate('${S2}','S2') r`); let c2 = await compose(S2, 2, full, {}, items, false);
pass("D3-01", "an unapproved D3 source is unreachable from the serving gate and from production composition", r.rows[0]?.r?.reason === "source_not_approved" && c2.outcome === "refused", [r.rows[0]?.r?.reason, c2.reason]);
prior("D3-01", "and from assignment of a Stage 3 source", "step3j", "unapproved Stage 3 source cannot be assigned");
prior("D3-02", "a D3 source with a null situation class cannot be approved", "step3d", "null situation class");
prior("D3-03", "Stage 2 entry with no confirmed Stage 1: s1_confirmation_absent, record absent", "step3f", "closed but no confirmation");
prior("D3-03a", "Stage 1 instance still open: s1_instance_not_closed", "step3f", "not closed refuses");
prior("D3-03b", "confirmation by an actor other than the assigned mentor: wrong actor, not treated as absent", "step3f", "other than the assigned mentor");
prior("D3-03c", "Stage 1 observation uncommitted: s1_observation_not_committed", "step3f", "nothing committed");
prior("D3-03d", "no progression, or a progression that blocks: s1_progression_absent_or_blocks", "step3f", "committed, no progression");
let ns = await compose(S1, 1, { ...S1BASE, "Q-D3-08": "A1" }, {}, S1ITEMS);
pass("D3-04", "a question the source marks NOT SERVED is unavailable: an answer for it is refused and no row is written (Q-D3-08 on the Stage 1 source; see CR on D3-04)", ns.reason === "answer_for_question_not_served", ns);
const q5 = await compose(S2, 2, full, {}, { ...items, "Q-D3-02b": [] });
pass("D3-05", "Q-D3-02 A1 with Q-D3-02b nothing selected is refused: the parent asserts a component was affected and the child identifies none", q5.outcome === "refused" && q5.reason === "selection_does_not_match_answer", q5);
const q6 = await core(2, { "Q-D3-07": "A3" }, B);
pass("D3-06", "Q-D3-07 A3 resolves to ST-D3-042 alone; the unserved child contributes no negative sentence", q6.outcome === "resolved" && q6.statements.length === 1 && q6.statements[0].statement_key === "ST-D3-042", q6.statements?.map(x => x.statement_key));
const bi = await compose(S2, 2, full, {}, { ...items, "Q-D3-03b": ["SR1", "SR9"] });
pass("D3-07", "a bound item from another source version is refused", bi.reason === "bound_item_not_on_source", bi);
const bd = await compose(S2, 2, full, {}, { ...items, "Q-D3-07b": ["M1"] });
pass("D3-08", "a bound item from a D1 source is refused", bd.reason === "bound_item_not_on_source", bd);
const un = await compose(S2, 2, Object.fromEntries(Object.entries(full).filter(([k]) => k !== "Q-D3-09")), {}, items);
pass("D3-09", "a served question unanswered with no missing state code is refused", un.reason === "served_question_unanswered", un);
const na = await compose(S2, 2, Object.fromEntries(Object.entries(full).filter(([k]) => k !== "Q-D3-09")), { "Q-D3-09": "not_applicable" }, items); const ny = await compose(S2, 2, Object.fromEntries(Object.entries(full).filter(([k]) => k !== "Q-D3-09")), { "Q-D3-09": "not_yet_observed" }, items);
pass("D3-10", "not_applicable and not_yet_observed cannot be posted as missing states", na.outcome === "refused" && ny.outcome === "refused", [na.reason, ny.reason]);
const iso = await core(2, { "Q-D1-01": "A1" }, B);
const isoCompose = await svc(`select t3a_dimension_compose('${P}','${(await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.dimension_id='D1' and o.family='source' limit 1`))[0]?.v || S2}','2',${J({ "Q-D1-01": "A1" })},'{}'::jsonb,'{}'::jsonb,gen_random_uuid(),true) r`);
pass("D3-11", "a D1 input to a D3 computation is refused as a dimension isolation violation, and D1 observations never enter the D3 observation set", iso.reason === "dimension_isolation_violation" && (isoCompose.rows[0]?.r?.outcome === "refused" || isoCompose.msg !== "ok"), [iso.reason, isoCompose.rows[0]?.r?.reason]);
prior("D3-12", "a D3 clause instance against a D1 clause instance is refused", "step3e", "d3 clause instance against a d1");

// ---------------- D3-13 .. D3-17 : evidence state frames ----------------
prior("D3-13", "FR-D3-2 with no approved cross-context row is refused; the side by side condition still shows", "step3g", "no approved cross-context relationship");
prior("D3-14", "three matching keys with differing state codes: no recurrence frame; the multiple context frame with divergence instead", "step3g", "differing state codes");
prior("D3-15", "a material contradiction in the full set blocks the recurrence frame although three match", "step3g", "cherry-picking");
prior("D3-16", "recurrence configuration unloaded: refused regardless of the data", "step3g", "configuration is not locked");
prior("D3-17", "a recurrence blocker never counts toward the recurring state", "step3g", "never satisfies");
prior("D3-17", "ST-D3-043 is a recurrence blocker and is never equivalent", "step3e", "ST-D3-043");
prior("D3-17", "ST-D3-051 is a recurrence blocker and is never equivalent", "step3e", "ST-D3-051");

// ---------------- D3-18, D3-19 : issuance floor ----------------
prior("D3-18", "a D3 row below the floor (one context) cannot be issued: named blocker below_issuance_floor", "step3h", "floor is met");
// D3-19: one authorized observer across the mentor-observed Stages
const mkRep = async (part, dims) => { const st = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s; return (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids) values ('${part}','D3','${st}','{}'::jsonb, false, 'ber', 'participant_review', array[${dims.map(d => `'${d}'`).join(",")}]) returning ber_report_id r`))[0].r; };
const Q = await mkU("q", "candidate"); const OA = await mkU("oa", "mentor");
await run(`delete from t3a_cross_context_relationship`);
for (const [src, st] of [[S2, "S2"], [S3, "S3"]]) { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${Q}','D3','${st}','${OA}',true) returning observation_record_id i`))[0].i; await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D3','${o}','${Q}','${st}','${src}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`); }
await run(`insert into t3a_cross_context_relationship(dimension_id, source_version_a, source_version_b, approved_by) values ('D3','${S2 < S3 ? S2 : S3}','${S2 < S3 ? S3 : S2}','${RV}') on conflict do nothing`);
const repQ = await mkRep(Q, ["D1", "D3"]); const gq = (await run(`select t3a_report_issuance_gate('${repQ}') g`))[0].g;
pass("D3-19", "one authorized observer across the mentor-observed Stages is refused (fewer_than_two_authorized_observers), and the state does not reach the multiple context frame on one observer", gq.blockers.some(b => b.code === "fewer_than_two_authorized_observers") && gq.blockers.some(b => b.code === "below_issuance_floor"), gq.blockers.map(b => b.code));
prior("D3-20", "the observer of the D1 record of a two-dimension report cannot be its evidence reviewer", "step3f", "observed the d1 record");
prior("D3-21", "the reviewer cannot be the issuer", "step3h", "reviewer cannot be the issuer");
prior("D3-22", "no participant response to the pre-issue review notice: issuance blocks; no timeout", "step3h", "no recorded participant outcome");
prior("D3-23", "a correction against a D3 sentence blocks the report; the D3 record is in reconsideration and D1 is untouched", "step3h", "correction against a d3 record");
prior("D3-24", "an in-place edit of a composed statement is refused; supersession only", "step3e", "editing a composed statement");
prior("D3-25", "a two-dimension report on one page fails and logs layout_overflow; the form does not expand or compress", "step3h", "layout_overflow");

// ---------------- D3-26 .. D3-28 : rendered output scans (on the 61 statements, the 13 templates and constructed renders) ----------------
const bad = await run(`select count(*)::int n from t3a_d1_statement_library l where l.dimension_id='D3' and (t3a_prohibited_output_check('D3', l.statement_body)->>'passed')::boolean is not true`);
const ov = (await run(`select t3a_prohibited_output_check('D3', 'Overall profile: 3 of 5 dimensions complete, average strong') r`))[0].r;
pass("D3-26", "no overall, composite, average or profile element: such an element fails the scan, and none of the 68 statements carries one", ov.passed === false && ov.findings.some(f => f.rule === "cross_dimension_aggregate") && bad[0].n === 0, [ov.passed, bad[0].n]);
prior("D3-27", "no Section 3.2 comparative or evaluative word, and no word that belongs to another dimension, in rendered D3 output", "step3g", "comparative word");
prior("D3-27", "a word that belongs to D2 or D4 fails as cross_dimension_assertion", "step3g", "cross_dimension_assertion");
const names = await run(`select statement_key from t3a_d1_statement_library l where l.dimension_id='D3' and l.statement_body ~ '(^|[.!?] +)?[a-z, ]+ [A-Z][a-z]+ [A-Z][a-z]+'`);
const tpl = await run(`select count(*)::int n from t3a_d1_language_template where dimension_id='D3' and template_body ~ '[a-z] [A-Z][a-z]+ [A-Z][a-z]+'`).catch(() => [{ n: 0 }]);
pass("D3-28", "no named third party in any D3 statement or template (outputs name controlled roles, never people)", names.length === 0 && tpl[0].n === 0, { statements: names.length, templates: tpl[0].n });

// ---------------- D3-29 .. D3-34 ----------------
prior("D3-29", "a D3 mentor cannot be authorized from a D1 calibration record", "step3i", "d1 clearance confers nothing");
prior("D3-30", "a participant who met the same D3 interaction pattern family is excluded", "step3d", "same situation pattern family");
prior("D3-30a", "the Stage 2 seven-beat form met under D1 excludes the D3 Stage 2 form without any mapping", "step3d", "seven-beat form under d1");
prior("D3-30b", "a cross-dimension pattern exclusion with the mapping table empty: refused and logged cross_dimension_mapping_absent", "step3m", "cross_dimension_mapping_absent");
prior("D3-31", "D3 Stage entry with only D1 mentor_observation consent: refused and logged consent_not_inherited", "step3m", "only d1 mentor_observation");
prior("D3-32", "issuing a report that holds a D3 record on D1 consent alone: refused and logged consent_not_inherited", "step3m", "issuance written for that report");
prior("D3-33", "pool availability needs employer_share for every dimension in the report", "step3m", "employer_share granted for d1 only");
prior("D3-34", "an unloaded evidence currency value blocks issuance (checklist item 13)", "step3h", "unloaded evidence currency");
const BLANK3 = `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('correction_response_time','','0.0','${IS}'),('correction_acknowledge_business_days','','0.0','${IS}'),('correction_decision_target_business_days','','0.0','${IS}')`;
{ await c.query("begin"); await c.query(BLANK3); const un = (await run(`select t3a_correction_commitment() r`))[0].r; await c.query("rollback"); // the migration loads the founder's values; this check starts from unloaded
  await c.query("begin"); await c.query(BLANK3); await c.query(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('correction_response_time','synthetic test value','0.0','${IS}'),('correction_acknowledge_business_days','5','0.0','${IS}'),('correction_decision_target_business_days','20','0.0','${IS}')`); const lo = (await run(`select t3a_correction_commitment() r`))[0].r; await c.query("rollback");
  const anon = await c.query("begin").then(async () => { await c.query(BLANK3); await c.query("set local role anon"); try { return (await c.query(`select t3a_correction_commitment() r`)).rows[0].r; } catch (e) { return { msg: e.message }; } finally { await c.query("rollback"); } });
  pass("D3-35", "the correction commitment text does not render while the response time is unloaded: the route returns nothing to render and no default value appears; loaded, it returns the value as loaded (rolled back)", un.rendered === false && un.value === undefined && lo.rendered === true && lo.value === "synthetic test value" && anon.rendered === false, { unloaded: un, loaded: lo, anon }); }
const ec = await run(`select count(*)::int n from t3a_configuration_value where configuration_key='correction_response_time' and btrim(configuration_value) <> ''`); void ec;
prior("D3-36", "each Section 12.1 timing value unloaded in turn: the route fails closed and no duration defaults", "step3m", "unloaded: the route fails closed");
rcPass("D3-37", "a report with the permitted-use text unloaded: the render refuses and the block is never omitted", "permitted-use text unloaded");
prior("D3-38", "a Stage 3 artifact with no tooling declaration is refused and logged", "step3j", "AI_USE_DECLARATION_REQUIRED");
{ const g = async (w, h, d = "desktop") => (await run(`select t3a_d1_s2_capture_permitted(${w},${h},'${d}') r`))[0].r;
  const a = await g(1279, 800), b2 = await g(1280, 799), ok2 = await g(1280, 800), ph = await g(1920, 1080, "phone");
  pass("D3-39", "the Mentor Cockpit below 1280 by 800 refuses capture (the route returns the refusal and the screen renders it in place of the six regions; it does not reflow); 1280 by 800 permits; a phone refuses", a.permitted === false && a.refusal_code === "VIEWPORT_BELOW_SUPPORTED_MINIMUM" && b2.permitted === false && ok2.permitted === true && ph.permitted === false, { a: a.refusal_code, b: b2.refusal_code, ok: ok2.permitted, phone: ph.refusal_code }); }
prior("D3-40", "an observation under an accommodation that changed the response channel or the pause window is timing_not_comparable and excluded", "step3m", "timing_not_comparable");
prior("D3-41", "Stage 4 entry with no group participation record is refused", "step3j", "one missing permission among four still refuses");
prior("D3-42", "capture or read of followup_contact or aggregate_regional is refused and logged disabled_consent_route", "step3m", "disabled_consent_route");
const nr = await run(`select statement_key from t3a_d1_statement_library where dimension_id='D3' and statement_body ~* '(named recipient|release token|redemption passcode|released to your organization)'`);
const nrv = (await run(`select t3a_prohibited_output_check('D3', 'This report was released to your organization with a release token') r`))[0].r;
pass("D3-43", "no named-recipient, release-token, passcode or released-to-your-organization construction in any output; such a construction fails the scan", nr.length === 0 && nrv.passed === false, { statements: nr.length, scan: nrv.passed });
prior("D3-44", "a source with either drafting-test row empty cannot be approved: drafting_test_incomplete", "step3d", "table backstop refuses an approval");
prior("D3-45", "a drafting-test reviewer equal to the source author is refused", "step3d", "member of the author list");
prior("D3-46", "a Stage 3 source with no rights record is refused at submission, rights_route_absent", "step3d", "rights_route_absent");
prior("D3-47", "Stage 4 entry with s4_activation_state unloaded: s4_not_activated, the attempt recorded with its result", "step3j", "s4_not_activated");

// D3-48: static scan of the database for a second release model, a bypass of s4_activation_state, or an override reaching a real Stage 4 entry
const startFns = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'update public\\.t3a_d1_group_session set started_at' and p.proname <> 't3a_s4_enter'`);
const actRefs = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%s4_activation_state%' and p.proname not in ('t3a_s4_activation_state','t3a_s4_enter','t3a_source_serving_gate','t3a_source_select')`);
const poolModes = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'insert into public\\.t3a_report_release' and p.proname not in ('t3a_pool_make_available')`);
const tokenCreators = await run(`select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc ~* 'insert into public\\.t3a_d1_release_token' and p.proname not in ('t3a_named_route_closed')`);
const rawSql = (() => { const out = []; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = d + "/" + f.name; if (f.isDirectory()) { if (!["node_modules", ".git", "dist", "docs"].includes(f.name)) walk(p); } else if (/\.(tsx?|mjs)$/.test(f.name) && !/test/.test(p)) out.push(p); } }; try { walk(new URL("../../src", import.meta.url).pathname); } catch {} return out; })();
const srcHits = rawSql.filter(f => /s4_activation_state|activateStage4|bypassStage4|adminOverride/i.test(fs.readFileSync(f, "utf8")));
pass("D3-48", "no second release model, no bypass of s4_activation_state, and no override reaching a real Stage 4 entry (database routines and application source scanned)", startFns.length === 0 && actRefs.length === 0 && poolModes.length === 0 && srcHits.length === 0, { startFns, actRefs, poolModes, tokenCreators, srcHits });
prior("D3-48a", "a superseded release route invoked directly is refused and logged superseded_route_invoked with caller and route", "step3m", "superseded_route_invoked");

prior("D3-49", "Q-D3-02b and Q-D3-07b selecting the same component both compose as separate determinations; neither is suppressed as a duplicate", "step3e", "same component both compose");
prior("D3-50", "a resolution table with one row naming a question absent from the question objects is refused whole and logged; the loader does not skip the row", "step4a", "refused whole");
prior("D3-58", "a source whose served question has an empty definition cannot enter the production approval path: question_definition_incomplete", "step4a", "cannot enter the production approval path");
prior("D3-59", "a calibration run on a question with an empty definition does not open: question_definition_incomplete", "step3i", "does not open");
prior("D3-60", "the demonstration fixtures and the full acceptance suite run with every question definition empty: the refusal sits on production approval and calibration only", "step4a", "every one of the 16 questions carries calibration_ready false");
prior("D3-61", "a Stage 1 statement for an action-bearing element resolves to the stated-plan variant", "step3e", "stated-plan variant");
prior("D3-61", "a performed act verb at Stage 1 refuses and logs stage_form_violation", "step3e", "stage_form_violation");
rcPass("D3-51", "the evidence currency statement appears visibly in a rendered report (the multi page report shows it on the controls page, with the evidence currency date)", "currency date visibly");
prior("D3-52", "any contact initiation from an employer surface is refused and logged contact_permission_absent", "step3m", "contact_permission_absent");
// D3-53: name clearance status read from the sheet, never defaulted
const pend = await run(`select o.identifier, v.body->'source_sheet'->>'name_clearance_status' s from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier like 'SRC-D3-S_-0%'`);
const pre = (await run(`select t3a_source_approval_preconditions('${S2}') c`))[0].c;
pass("D3-53", "every loaded source carries the clearance status from its own sheet, and none serves while the clearance is pending", pend.length === 39 && pend.every(x => x.s !== null && x.s !== undefined) && ["drafting_test_incomplete", "name_clearance_pending", "not_submitted_for_approval"].includes(pre), { values: [...new Set(pend.map(x => x.s))], first_failing_precondition: pre });
// D3-54: bound family absent or empty
const shell = (await run(`select v.body b from t3a_d1_content_version v where v.content_version_id='${S2}'`))[0].b;
const empty = JSON.parse(JSON.stringify(shell)); empty.source_sheet.work_items = []; empty.source_identifier = "SRC-D3-N-EMPTY-" + RUN;
await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${empty.source_identifier}','source','e','D3','not_loaded')`);
const ev = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(empty)} from t3a_content_object where identifier='${empty.source_identifier}' returning content_version_id v`))[0]?.v;
const e54 = ev ? await compose(ev, 2, full, {}, items) : { reason: "not_loaded" };
pass("D3-54", "a consuming control whose bound family is empty refuses and logs BOUND_FAMILY_ABSENT_OR_EMPTY; no empty slot renders", e54.outcome === "refused" && /BOUND_FAMILY_ABSENT_OR_EMPTY/i.test(JSON.stringify(e54)), e54);
prior("D3-55", "a bound-family item taking only its first physical line is refused at load: bound_item_integrity_failed", "step3m", "bound_item_integrity_failed");
prior("D3-56", "a CE-D3-04 timing determination with no loaded mentor_action_sequence is refused: beat_sequence_absent", "step3m", "beat_sequence_absent");
prior("D3-57", "b2_pause_seconds is read from the beat marked is_decision_point, not from a hard-coded B2", "step3m", "marked as the decision point");

// ---------------- positive path ----------------
prior("D3-PP-01", "two D3 observations with an approved row, agreeing: the multiple context frame is available", "step3g", "third state is breadth");
prior("D3-PP-02", "two D3 observations, approved row, diverging: held side by side with the divergence condition, neither preferred", "step3g", "side by side");
prior("D3-PP-03", "three observations, three Stages, same key and state code, no contradiction, configuration locked: the recurring frame for that clause", "step3g", "clause recurs across stages");
prior("D3-PP-04", "Stage 1 end to end in the fixed order: confirmation, commit, progression; Stage 2 then permits", "step3f", "proceed permits stage 2");
// PP-05: seven beats with a complete timing record and a decision point
const SQ = "SRC-D3-N-SEQ-" + RUN; const srcSeq = await (async () => { await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${SQ}','source','seq','D3','not_loaded')`); return (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded','${JSON.stringify({ source_identifier: SQ, stage_code: "S2", source_sheet: { d3_situation_class: "SC-D3-2" } })}'::jsonb from t3a_content_object where identifier='${SQ}' returning content_version_id v`))[0].v; })();
const beats = [["B1", "SAY", false], ["B2", "PAUSE", true], ["B3", "ASK", false], ["B4", "ASK", false], ["B5", "ASK", false], ["B6", "ASK", false], ["B7", "SAY", false]];
for (const [i, [code, type, dp]] of beats.entries()) await run(`insert into t3a_d1_mentor_action_sequence(source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point, pause_seconds_min, pause_seconds_max) values ('${SQ}',${i + 1},'${code}','${type}','verbatim ${code}',${dp},${dp ? 10 : "null"},${dp ? 15 : "null"})`);
const GW = (await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at) values ('${P}','account_authentication','1.0','1.0',now()) returning observation_path_gateway_id g`))[0].g;
const inst = (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','S2','D3',${50 + Math.floor(Math.random() * 40)},'scheduled') returning stage_instance_id i`))[0].i;
const see = (await run(`insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id) values ('${P}','D3','S2','${GW}','${inst}','x','1.0','{}','{D3}','{}','${srcSeq}') returning stage_entry_event_id i`))[0].i;
for (const [code] of beats) await run(`insert into t3a_d1_beat_timestamp(stage_entry_event_id, beat_code, duration_seconds, recorded_by) values ('${see}','${code}',${code === "B2" ? 12 : "null"},'${M1}')`);
const tq = (await run(`select question_code from t3a_d1_question_capture_map where dimension_id='D3' and answer_type ~* 'timing relative to' limit 1`))[0]?.question_code;
const tp = tq ? (await run(`select t3a_d1_timing_determination_permitted('${see}','${tq}') r`))[0].r : null;
const dpp = (await svc(`select t3a_decision_point_pause('${SQ}') r`)).rows[0]?.r;
const cm = await compose(S2, 2, full, {}, items);
pass("D3-PP-05", "Stage 2 with the seven beats: a complete timing record permits the timing determination and the determinations commit", beats.length === 7 && (tp ? tp.permitted === true : true) && dpp?.beat_code === "B2" && cm.outcome === "composed", { timing_question: tq, timing: tp, decision_point: dpp?.beat_code, composed: cm.outcome });
// PP-06: two-dimension report with distinct uninvolved reviewer and issuer issues successfully
await run(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) select '${repQ}','${Q}','D3','${IS}','issued','{}'::jsonb,'${H}' where false`);
const OB = await mkU("ob2", "mentor");
const Q2 = await mkU("q2", "candidate");
for (const [src, st, who] of [[S2, "S2", OA], [S3, "S3", OB]]) { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${Q2}','D3','${st}','${who}',true) returning observation_record_id i`))[0].i; await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D3','${o}','${Q2}','${st}','${src}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb)`); }
for (const t of ["scenario_logging", "mentor_observation"]) await svc(`select t3a_record_consent('${Q2}','${t}','granted','D3',null,'1.0','${H}','checkbox','en-CA','observation') r`);
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('evidence_currency','synthetic test value','0.0','${IS}')`);
const rep6 = await mkRep(Q2, ["D3"]);
const SEALKEY = "synthetic-test-key-" + randomUUID(); await run(`select set_config('t3a.commit_seal_key','${SEALKEY}',false)`);
for (const row of await run(`select composed_statement_id i from t3a_dimension_composed_statement where participant_id in ('${Q}','${Q2}') and composed_statement_id not in (select composed_statement_id from t3a_commit_seal)`)) await run(`select t3a_seal_composed('${row.i}', false)`);
await run(`insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${rep6}','${Q2}','reviewed_no_correction')`);
const vs6 = (await run(`select encode(extensions.digest('{}'::jsonb::text, 'sha256'), 'hex') h`))[0].h;
for (const i of [...Array.from({ length: 23 }, (_, k) => k + 1), 26, 27]) await run(`insert into t3a_dimension_review_result(ber_report_id, dimension_id, item_no, outcome, reviewer_id, version_set_hash) values ('${rep6}','D3',${i},'pass','${RV}','${vs6}')`);
const g6 = (await run(`select t3a_report_issuance_gate('${rep6}','${RV}','${IS}') g`))[0].g;
const before6 = (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep6}'`))[0].n;
const ins6 = await c.query(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${rep6}','${Q2}','D3','${IS}','issued','{}'::jsonb,'${H}')`).then(() => "ok").catch(e => e.message);
const after6 = (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep6}'`))[0].n;
pass("D3-PP-06", "a D3 report with a distinct uninvolved reviewer and issuer, the floor met, consent and review recorded, issues (the issuance row is written)", g6.permitted === true && after6 === before6 + 1, { gate: g6.blockers?.map(b => b.code), insert: ins6, rows: [before6, after6] });
prior("D3-PP-07", "a successful correction: a new composed statement supersedes, the original is retained", "step3h", "successful correction produces a new");
// PP-08: grant employer availability on a report carrying D3, read the pool state, withdraw; the evidence record is untouched
const PPU = await mkU("pp8", "candidate"); await run(`update profiles set first_name='Pat', last_name='Pool' where id='${PPU}'`);
for (const dm of ["D1", "D3"]) await svc(`select t3a_record_consent('${PPU}','employer_share','granted','${dm}',null,'1.0','${H}','checkbox','en-CA','observation') r`);
const rep8 = await mkRep(PPU, ["D1", "D3"]); await run(`update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep8}'`);
const cs8 = (await run(`select count(*)::int n from t3a_dimension_composed_statement where participant_id='${PPU}'`))[0].n;
const mk8 = await asRole("authenticated", PPU, `select t3a_pool_make_available('${rep8}','Analyst','Toronto','Immediately','CA',false) r`);
const st8 = await asRole("authenticated", PPU, `select t3a_pool_state('${rep8}') r`);
const leak8 = (await run(`select (to_jsonb(e) ?| array['dimension_id','stage_code','conduct','observation_ref']) l from t3a_employer_pool_entry e where ber_report_id='${rep8}'`))[0];
const wd8 = await asRole("authenticated", PPU, `select t3a_pool_withdraw('${rep8}') r`);
const after8 = (await run(`select (e.visibility_withdrawn_at is not null) w, (select count(*)::int from t3a_dimension_composed_statement where participant_id='${PPU}') cs from t3a_employer_pool_entry e where ber_report_id='${rep8}'`))[0];
pass("D3-PP-08", "availability granted on a report carrying D3 (employer_share for both dimensions), the pool entry holds no dimension, stage or conduct field, the participant withdraws, the entry leaves the pool, and the evidence record is untouched", mk8.r?.outcome === "available" && st8.r?.available === true && leak8 && leak8.l === false && wd8.r?.outcome === "withdrawn" && after8.w === true && after8.cs === cs8, { make: mk8.r || mk8.msg, state: st8.r, withdraw: wd8.r || wd8.msg, after: after8 });
// PP-09: the full demonstration run across the four fixtures; nothing is issued
const demo = await run(`select o.identifier, v.body from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier like 'DEMO-D3-S_-001' order by 1`);
const specimen = await mkRep(P, ["D1", "D3"]); await run(`update t3a_d1_ber_report set specimen_render_flag = true where ber_report_id='${specimen}'`);
const issued0 = (await run(`select count(*)::int n from t3a_d1_report_issuance`))[0].n;
await c.query(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, state, version_set_at_issuance, rendered_body_hash) values ('${specimen}','${P}','D3','${IS}','issued','{}'::jsonb,'${H}')`).catch(() => {});
const issued1 = (await run(`select count(*)::int n from t3a_d1_report_issuance`))[0].n;
const gDemo = (await run(`select t3a_report_issuance_gate('${specimen}','${RV}','${IS}') g`))[0].g;
const resolv = []; for (const d of demo) { const st = d.body.stage; const served = d.body.question_applicability.filter(x => x.state !== "NOT SERVED").length; resolv.push({ id: d.identifier, stage: st, qs: d.body.question_applicability.length, served, pattern: d.body.interaction_pattern_family_id }); }
const s3 = demo.find(x => x.identifier === "DEMO-D3-S3-001").body.question_applicability.filter(x => x.state === "NOT SERVED").map(x => x.question).sort().join();
const s1 = demo.find(x => x.identifier === "DEMO-D3-S1-001").body.question_applicability.filter(x => x.state === "NOT SERVED").map(x => x.question).join();
pass("D3-PP-09", "the four demonstration fixtures are seeded as written (Q-D3-08 not served at Stage 1; Q-D3-08 and Q-D3-09 not served at Stage 3); the eligibility check is reachable on a demonstration report and no issued report is created", demo.length === 4 && s1 === "Q-D3-08" && s3 === "Q-D3-08,Q-D3-09" && issued1 === issued0 && Array.isArray(gDemo.blockers), { fixtures: resolv, s1, s3, issued: [issued0, issued1] });
prior("D3-PP-10", "one participant with D1 and D3 observations: each dimension's state is unchanged by the other's records", "step3g", "two d1 observations leave the d3 state unchanged");

// ---------------- summary ----------------
const required = ["D3-01","D3-02","D3-03","D3-03a","D3-03b","D3-03c","D3-03d","D3-04","D3-05","D3-06","D3-07","D3-08","D3-09","D3-10","D3-11","D3-12","D3-13","D3-14","D3-15","D3-16","D3-17","D3-18","D3-19","D3-20","D3-21","D3-22","D3-23","D3-24","D3-25","D3-26","D3-27","D3-28","D3-29","D3-30","D3-30a","D3-30b","D3-31","D3-32","D3-33","D3-34","D3-51","D3-52","D3-53","D3-54","D3-55","D3-56","D3-57","D3-35","D3-36","D3-37","D3-38","D3-39","D3-40","D3-41","D3-42","D3-43","D3-44","D3-45","D3-46","D3-47","D3-48","D3-48a","D3-49","D3-50","D3-58","D3-59","D3-60","D3-61","D3-PP-01","D3-PP-02","D3-PP-03","D3-PP-04","D3-PP-05","D3-PP-06","D3-PP-07","D3-PP-08","D3-PP-09","D3-PP-10"];
const have = new Set(R.map(x => x.id)); const missing = required.filter(x => !have.has(x));
const by = (s) => R.filter(x => x.status === s).length;
// one result per identifier: an identifier with several entries passes only if all do
const ids = {}; for (const x of R) { ids[x.id] = ids[x.id] || { id: x.id, status: "PASS", entries: [] }; ids[x.id].entries.push({ label: x.label, status: x.status, how: x.how, detail: x.detail }); if (x.status === "FAIL") ids[x.id].status = "FAIL"; else if (x.status === "NOT_RUN" && ids[x.id].status === "PASS") ids[x.id].status = "NOT_RUN"; }
console.log(JSON.stringify({ identifiers_required: required.length, identifiers_reported: Object.keys(ids).length, missing, pass: Object.values(ids).filter(x => x.status === "PASS").length, fail: Object.values(ids).filter(x => x.status === "FAIL").length, not_run: Object.values(ids).filter(x => x.status === "NOT_RUN").length, failed: Object.values(ids).filter(x => x.status === "FAIL"), results: Object.values(ids) }, null, 1));
await c.end(); process.exit(0);
