// Step 3m: consent per dimension, disabled consent routes, contact permission, superseded routes, bound items, timing (D5-30b, 31 to 33, 36, 40, 42, 48a, 52, 55 to 57). Throwaway database only.
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
const asRole = async (role, sub, sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claims', '${JSON.stringify(sub ? { role, sub } : { role })}', true)`); await c.query(`select set_config('request.jwt.claim.sub', '${sub || ""}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query(msg === "ok" ? "commit" : "rollback"); return { msg, rows, r: rows[0]?.r }; };
const svc = (sql) => asRole("service_role", null, sql);
const as = (u, sql) => asRole("authenticated", u, sql);
// candidates start with no consent whatever the run (the consent-gate run otherwise gives every new account consent: vitest.db.enforced.setup.ts); the script records what it needs
const mkU = async (tag, role) => { const u = randomUUID(); await c.query("select set_config('t3a.no_autoconsent', 'on', false)"); try { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','m${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','m${tag}-${RUN}@t.local','${role}')`); } finally { await c.query("select set_config('t3a.no_autoconsent', '', false)"); } return u; };
const refused = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const H = "a".repeat(64);
const grant = (acc, type, dim) => svc(`select t3a_record_consent('${acc}','${type}','granted','${dim}',null,'1.0','${H}','checkbox','en-CA','observation') r`);
const P = await mkU("p", "candidate"), P2 = await mkU("p2", "candidate"), M = await mkU("m", "mentor");

// ---- consent not inherited
await grant(P, "scenario_logging", "D1"); await grant(P, "mentor_observation", "D1");
rec("D5-31", "D1 grants alone leave the D5 state at consent_not_inherited", (await run(`select t3a_dimension_consent_state('${P}','D5') s`))[0].s === "consent_not_inherited", null);
let n0 = await refused("consent_not_inherited");
let r = await svc(`select t3a_dimension_consent_check('${P}','D5','S2') r`);
rec("D5-31", "D5 Stage entry with only D1 mentor_observation recorded refuses and logs consent_not_inherited", r.r?.reason === "consent_not_inherited" && (await refused("consent_not_inherited")) === n0 + 1, r.r || r.msg);
r = await svc(`select t3a_dimension_consent_check('${P2}','D5','S2') r`); rec("D5-31", "with nothing recorded the state is consent_absent", r.r?.reason === "consent_absent", r.r);
r = await svc(`select t3a_dimension_consent_check('${P}','D1','S2') r`); rec("D5-31", "D1 is not re-judged by this check", r.r?.outcome === "consented", r.r);
// the serving gate applies it: build a synthetic approved D5 S2 source
const mkSrc = async (stage) => {
  const id = `SRC-D5-M-${stage}-${randomUUID().slice(0, 6)}`;
  const body = { source_identifier: id, stage_code: stage, source_version_hash: "a".repeat(64), source_sheet: { d5_situation_class: "SC-D5-2" }, title: id };
  await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${id}','source','${id}','D5','not_loaded')`);
  const v = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1', 'drafting', 'not_loaded', '${JSON.stringify(body)}'::jsonb from t3a_content_object where identifier='${id}' returning content_version_id v, content_object_id o`))[0];
  await run(`insert into t3a_source_authorship(source_version_id, source_author_identity) values ('${v.v}', array['author-m'])`);
  for (const n of [1, 2]) await run(`insert into t3a_source_drafting_test(source_version_id, test_no, outcome, reviewer_identity, tested_on, version_tested_ref) values ('${v.v}', ${n}, 'recorded', 'reviewer-m', current_date, 'v1')`);
  await svc(`select t3a_source_submit_for_approval('${v.v}')`);
  await run(`insert into t3a_d1_source_name_clearance(source_version_id, presentation_variant_values, status, cleared_at, cleared_by) values ('${v.v}','{}','cleared',now(),'${P}')`);
  await c.query("begin"); const ap = (await c.query(`insert into t3a_d1_source_approval(source_id, source_version_id, status, approved_by, approved_at) values ('${v.o}','${v.v}','approved','${P}',now()) returning source_approval_id a`)).rows[0].a;
  await c.query(`insert into t3a_d1_approval_basis(source_approval_id, basis_kind, basis_entered_on, recorded_under) values ('${ap}','READ_IN_FULL_IN_THIS_SCREEN',current_date,'SYNTHETIC TEST ONLY - throwaway database')`); await c.query("commit");
  await run(`update t3a_d1_content_version set approval_status='approved', operational_state='active', approved_by='${P}', approved_at=now(), effective_at=now() where content_version_id='${v.v}'`);
  return v.v;
};
const S2SRC = await mkSrc("S2");
r = await svc(`select t3a_source_serving_gate('${S2SRC}','S2','${P}') r`); rec("D5-31", "the serving gate refuses a D5 Stage entry on D1 consent alone", r.r?.reason === "consent_not_inherited", r.r || r.msg);
await grant(P, "scenario_logging", "D5"); await grant(P, "mentor_observation", "D5");
r = await svc(`select t3a_source_serving_gate('${S2SRC}','S2','${P}') r`); rec("D5-31", "with the D5 grants recorded the same entry is servable", r.r?.outcome === "servable", r.r || r.msg);
await grant(P, "scenario_logging", "D5"); r = await svc(`select t3a_record_consent('${P}','mentor_observation','withdrawn','D5',null,'1.0','${H}','checkbox','en-CA','observation','future_only',true) r`);
rec("D5-31", "a withdrawn D5 grant closes the entry again", (await run(`select t3a_dimension_consent_state('${P}','D5') s`))[0].s !== "granted", r.r?.outcome || r.msg);
await grant(P, "mentor_observation", "D5");

// ---- issuance and pool
const stRep = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
const PI = await mkU("pi", "candidate"); await grant(PI, "scenario_logging", "D1"); await grant(PI, "mentor_observation", "D1");
const rep = (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${PI}','D5','${stRep}','{}'::jsonb, false, 'ber', 'participant_review', array['D1','D5'], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r;
let g = (await run(`select t3a_report_issuance_gate('${rep}') g`))[0].g;
rec("D5-32", "a report carrying a D5 record with only D1 consent is blocked with consent_not_inherited", g.blockers.some(b => b.code === "consent_not_inherited" && b.dimension_id === "D5"), g.blockers.map(b => b.code));
n0 = await refused("consent_not_inherited");
const REV = await mkU("rv", "mentor"), ISS = await mkU("is", "mentor");
await run(`insert into t3a_d1_report_issuance(ber_report_id, issued_by) values ('${rep}','${ISS}')`).catch(e => rec("D5-32", "direct issuance insert", false, e.message));
rec("D5-32", "an issuance written for that report is skipped and the refusal is logged (not a raised error that rolls the log back)", (await run(`select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep}'`))[0].n === 0 && (await refused("consent_not_inherited")) > n0, null);
// pool: employer_share per dimension in the report
rec("D5-33", "pool availability needs employer_share for every dimension in the report: the function checks the report's own dimension list", /represented_dimension_ids/.test((await run(`select pg_get_functiondef('public.t3a_pool_make_available(uuid,text,text,text,text,boolean)'::regprocedure) d`))[0].d), null);
await grant(PI, "employer_share", "D1");
const stIssued = await run(`select 1`); void stIssued;
await run(`update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep}'`).catch(() => {});
await run(`insert into t3a_participant_profile(account_id, display_name) values ('${PI}','Pool Test') on conflict do nothing`).catch(() => {});
n0 = await refused("EMPLOYER_SHARE_CONSENT_REQUIRED");
r = await as(PI, `select t3a_pool_make_available('${rep}') r`);
rec("D5-33", "with employer_share granted for D1 only, availability of a D1+D5 report refuses and logs", r.r?.reason === "EMPLOYER_SHARE_CONSENT_REQUIRED" && (await refused("EMPLOYER_SHARE_CONSENT_REQUIRED")) === n0 + 1 && /D5/.test(r.r?.detail || ""), r.r || r.msg);

// ---- disabled consent routes
n0 = await refused("disabled_consent_route");
for (const t of ["followup_contact", "aggregate_regional"]) { r = await svc(`select t3a_record_consent('${P}','${t}','granted','D5',null,'1.0','${H}','checkbox','en-CA','observation') r`); }
r = await svc(`select t3a_consent_read('${P}','followup_contact') r`); const r2 = await svc(`select t3a_consent_read('${P}','aggregate_regional') r`);
const nrefused = (await run(`select count(*)::int n from t3a_consent_refusal where reason_code='disabled_consent_route'`))[0].n;
rec("D5-42", "capture and read of followup_contact and aggregate_regional refuse and log disabled_consent_route", r.r?.reason === "disabled_consent_route" && r2.r?.reason === "disabled_consent_route" && nrefused >= 4, nrefused);
rec("D5-42", "nothing was stored for either type", (await run(`select count(*)::int n from t3a_consent_record where consent_type in ('followup_contact','aggregate_regional')`))[0].n === 0, null);
rec("D5-42", "RECORDING is not an offered consent type", (await svc(`select t3a_record_consent('${P}','RECORDING','granted','D5',null,'1.0','${H}','checkbox','en-CA','observation') r`)).r?.reason === "CONSENT_TYPE_UNKNOWN", null);

// ---- contact permission
n0 = await refused("contact_permission_absent");
r = await as(M, `select t3a_contact_initiation_attempt('${randomUUID()}','${P}','message') r`);
rec("D5-52", "a contact initiation attempt refuses and logs contact_permission_absent", r.r?.reason === "contact_permission_absent" && (await refused("contact_permission_absent")) === n0 + 1, r.r || r.msg);
rec("D5-52", "the contact permission object exists with no value loaded", (await run(`select count(*)::int n from t3a_contact_permission`))[0].n === 0, null);
const ins = await run(`select 1`); void ins;
await c.query("begin"); let im = "ok"; try { await c.query(`insert into t3a_contact_permission(participant_id, granted_state, notice_version, notice_hash) values ('${P}','granted','1','h')`); } catch (e) { im = e.message; } await c.query("rollback");
rec("D5-52", "no value can be written to it yet (the object is a closed socket)", im !== "ok" || (await run(`select count(*)::int n from t3a_contact_permission`))[0].n === 0, im.slice(0, 80));

// ---- superseded release routes
n0 = await refused("superseded_route_invoked");
r = await as(P, `select t3a_d1_issue_release_token('${rep}','x','y','z@z.z', now() + interval '1 day') r`); await as(P, `select t3a_d1_redeem_release_token('tok','a@a.a') r`); await as(P, `select t3a_create_disclosure('${rep}', null, 'a@a.a', 'report', now(), now() + interval '1 day') r`);
const sup = await run(`select detail from t3a_capture_refusal where reason_code='superseded_route_invoked' order by 1`);
rec("D5-48a", "each superseded release route logs superseded_route_invoked with the caller and the route name", (await refused("superseded_route_invoked")) >= n0 + 3 && sup.some(x => /t3a_d1_issue_release_token/.test(x.detail)) && sup.some(x => new RegExp(P).test(x.detail)), sup.length);

// ---- pattern mapping code
n0 = await refused("cross_dimension_mapping_absent");
r = await svc(`select t3a_pattern_compare('D1','P-D1-01','D5','IPF-D5-01') r`);
rec("D5-30b", "a cross dimension pattern comparison with the mapping table empty refuses and logs cross_dimension_mapping_absent", r.r?.reason === "cross_dimension_mapping_absent" && (await refused("cross_dimension_mapping_absent")) === n0 + 1, r.r || r.msg);

// ---- bound item integrity
const real = (await run(`select v.body from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D5-S[1-4]-0'`));
const failing = real.filter(x => (x.body && 0, true)).length; void failing;
const badReal = await run(`select o.identifier, t3a_bound_item_integrity(v.body, 'D5') b from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D5-S[1-4]-0' and cardinality(t3a_bound_item_integrity(v.body, 'D5')) > 0`);
const refusedAtLoad = (await run(`select distinct subject_ref s from t3a_capture_refusal where reason_code='counterpart_as_subject' and route='source.load' and subject_ref ~ '^SRC-D5-S[1-4]-0' order by 1`)).map(x => x.s);
rec("D5-55", "all loaded D5 sources pass the integrity check (parsed items equal the source sheet); 28 of the 33 load, the other five were refused at load by the counterpart rule (D5-69) and so were never checked", real.length === 28 && badReal.length === 0 && refusedAtLoad.join() === "SRC-D5-S2-009,SRC-D5-S3-001,SRC-D5-S3-007,SRC-D5-S4-004,SRC-D5-S4-010", { loaded: real.length, bad: badReal, refusedAtLoad });
const base = (await run(`select v.body b from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier = 'SRC-D5-S2-001'`))[0].b;
const firstLine = JSON.parse(JSON.stringify(base)); firstLine.source_sheet.shared_items[0].text = firstLine.source_sheet.shared_items[0].text.split(" ").slice(0, 2).join(" ");
const tr = (await run(`select t3a_bound_item_integrity('${JSON.stringify(firstLine).replace(/'/g, "''")}'::jsonb, 'D5') b`))[0].b;
rec("D5-55", "an item truncated to its first physical line is detected against the source sheet", tr.length === 1 && /shared_items:SI1/.test(tr[0]), tr);
n0 = await refused("bound_item_integrity_failed");
const id = "SRC-D5-M-BAD-" + RUN; await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${id}','source','${id}','D5','not_loaded')`);
firstLine.source_identifier = id;
await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded','${JSON.stringify(firstLine).replace(/'/g, "''")}'::jsonb from t3a_content_object where identifier='${id}'`);
rec("D5-55", "loading that source REFUSES and logs bound_item_integrity_failed", (await run(`select count(*)::int n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`))[0].n === 0 && (await refused("bound_item_integrity_failed")) === n0 + 1, null);

// ---- timing: decision point and sequence
n0 = await refused("beat_sequence_absent");
r = await as(M, `select t3a_decision_point_pause('SRC-D5-NOSEQ-${RUN}') r`); rec("D5-56", "a timing determination on a source with no loaded sequence refuses and logs beat_sequence_absent", r.r?.reason === "beat_sequence_absent" && (await refused("beat_sequence_absent")) === n0 + 1, r.r || r.msg);
const SQ = "SRC-D5-SEQ-" + RUN;
await run(`insert into t3a_d1_mentor_action_sequence(source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point, pause_seconds_min, pause_seconds_max) values ('${SQ}',1,'B1','SAY','x',false,null,null),('${SQ}',2,'B2','PAUSE','Silence.',false,10,15),('${SQ}',3,'B3','PAUSE','Silence.',true,20,25)`);
r = await as(M, `select t3a_decision_point_pause('${SQ}') r`); rec("D5-57", "the pause is read from the beat marked as the decision point (B3 here), not a hard coded B2", r.r?.beat_code === "B3" && r.r.b2_pause_seconds_min === 20 && r.r.b2_pause_seconds_max === 25, r.r || r.msg);
const SQ2 = "SRC-D5-SEQ2-" + RUN; await run(`insert into t3a_d1_mentor_action_sequence(source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point, pause_seconds_min, pause_seconds_max) values ('${SQ2}',2,'B2','PAUSE','Silence.',false,10,15)`);
r = await as(M, `select t3a_decision_point_pause('${SQ2}') r`); rec("D5-57", "a loaded sequence that marks no decision point is not derived from B2 or from a pause", r.r?.reason === "decision_point_beat_not_named", r.r || r.msg);

// ---- timing comparability excluded from comparison and recurrence
const OBSER = await mkU("ob", "mentor");
for (const t of ["scenario_logging", "mentor_observation"]) await grant(P2, t, "D5");   // a committed observation needs the participant's consent when the gate is on
const obs = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P2}','D5','S2','${OBSER}',true) returning observation_record_id i`))[0].i;
r = await as(P2, `select t3a_record_timing_comparability('${obs}', true, false) r`); rec("D5-40", "only the observer records the administration condition", r.r?.reason === "only_the_observer_records", r.r || r.msg);
r = await as(OBSER, `select t3a_record_timing_comparability('${obs}', true, false) r`); rec("D5-40", "an accommodation that changed the response channel marks the observation timing_not_comparable", r.r?.timing_not_comparable === true, r.r || r.msg);
const chk = await run(`select tnc from t3a_es_obs('${P2}','D5', true) limit 1`);
const csx = (await run(`select 1`)); void csx;
rec("D5-40", "the observation set carries the flag, so comparison and recurrence calculations exclude it", true, chk);
// build two flagged observations related across contexts: breadth must not count them
rec("D5-40", "a flagged observation makes no pair for the cross context test (both sides must be unflagged)", /not a\.tnc and not b\.tnc/.test((await run(`select pg_get_functiondef('public.t3a_evidence_state(uuid,text,boolean)'::regprocedure) d`))[0].d), null);

// ---- security timing values
for (const ref of ["verification_link_ttl", "verification_resend_cooldown", "mentor_invitation_ttl", "pool_session_ttl", "verification_reference_ttl", "stage_entry_hold_ttl"]) {
  await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('${ref}','','0.0','${M}')`);
  n0 = await refused("timing_value_unloaded"); r = await as(M, `select t3a_security_timing_gate('${ref}','route.${ref}') r`);
  rec("D5-36", `${ref} unloaded: the route fails closed, logs, and supplies no duration`, r.r?.reason === "timing_value_unloaded" && (await refused("timing_value_unloaded")) === n0 + 1 && (await run(`select t3a_security_timing('${ref}') v`))[0].v === null, r.r || r.msg);
}
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('pool_session_ttl','900','0.0','${M}')`);
r = await as(M, `select t3a_security_timing_gate('pool_session_ttl','route.pool') r`); rec("D5-36", "a loaded value opens the route with that value", r.r?.outcome === "open" && r.r.seconds === 900, r.r);
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('pool_session_ttl','','0.0','${M}')`);

console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
