// Step 3j: Stage 3 work sample routes and Stage 4 session routes (D8 Sections 8.4, 8.5; D-02, D-03). Throwaway database only; every approval, clearance and configuration value here is synthetic.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect(); process.on('uncaughtException', e => { console.log('ERR', e.message, JSON.stringify(R.slice(-3))); process.exit(1); });
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const asRole = async (role, sub, sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claims', '${JSON.stringify(sub ? { role, sub } : { role })}', true)`); await c.query(`select set_config('request.jwt.claim.sub', '${sub || ""}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query(msg === "ok" ? "commit" : "rollback"); return { msg, rows, r: rows[0]?.r }; };
const svc = (sql) => asRole("service_role", null, sql);
const as = (u, sql) => asRole("authenticated", u, sql);
const mkU = async (tag, role) => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','j${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','j${tag}-${RUN}@t.local','${role}')`); return u; };
const refused = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const P = await mkU("p", "candidate"), P2 = await mkU("p2", "candidate"), MT = await mkU("mt", "mentor"), MU = await mkU("mu", "mentor"), FAC = await mkU("fac", "mentor");
const C1 = await mkU("c1", "candidate"), C2 = await mkU("c2", "candidate"), C3 = await mkU("c3", "candidate"), C4 = await mkU("c4", "candidate"), OBS = await mkU("obs", "candidate");
const H = "a".repeat(64);
for (const u of [P, P2, C1, OBS]) for (const t of ["scenario_logging", "mentor_observation"]) await svc(`select t3a_record_consent('${u}','${t}','granted','D8',null,'1.0','${H}','checkbox','en-CA','observation') r`);
const REF = "3." + RUN;
await run(`insert into t3a_calibration_clearance(dimension_id, reference_set_version, construct_version, determination_version, statement_version, source_version_ids) values ('D8','${REF}','t','t','t',array[gen_random_uuid()])`);
for (const m of [MT, FAC]) await run(`insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status, reviewer_authorization, issuer_authorization) values ('${m}','D8', now() - interval '1 day','current','${REF}','authorized', false, false)`);

// synthetic approved source (throwaway database only)
const mkSrc = async (stage, sheet = {}) => {
  const id = `SRC-D8-J-${stage}-${randomUUID().slice(0, 6)}`;
  const body = { source_identifier: id, stage_code: stage, source_version_hash: "a".repeat(64), source_sheet: { d8_situation_class: "SC-D8-" + (stage === "S3" ? "5" : stage === "S4" ? "4" : "1"), ...sheet }, title: id };
  await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${id}','source','${id}','D8','not_loaded')`);
  const v = (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1', 'drafting', 'not_loaded', '${JSON.stringify(body)}'::jsonb from t3a_content_object where identifier='${id}' returning content_version_id v, content_object_id o`))[0];
  await run(`insert into t3a_source_authorship(source_version_id, source_author_identity) values ('${v.v}', array['author-j'])`);
  for (const n of [1, 2]) await run(`insert into t3a_source_drafting_test(source_version_id, test_no, outcome, reviewer_identity, tested_on, version_tested_ref) values ('${v.v}', ${n}, 'recorded', 'reviewer-j', current_date, 'v1')`);
  if (stage === "S3") await run(`insert into t3a_source_rights_record(source_version_id, rights_basis, confidentiality_basis, permitted_use_basis, authorship_provenance_basis, approver_id, approved_on) values ('${v.v}','synthetic','synthetic','synthetic','synthetic','${P}',current_date)`);
  await svc(`select t3a_source_submit_for_approval('${v.v}')`);
  await run(`insert into t3a_d1_source_name_clearance(source_version_id, presentation_variant_values, status, cleared_at, cleared_by) values ('${v.v}','{}','cleared',now(),'${P}')`);
  await c.query("begin"); const ap = (await c.query(`insert into t3a_d1_source_approval(source_id, source_version_id, status, approved_by, approved_at) values ('${v.o}','${v.v}','approved','${P}',now()) returning source_approval_id a`)).rows[0].a;
  await c.query(`insert into t3a_d1_approval_basis(source_approval_id, basis_kind, basis_entered_on, recorded_under) values ('${ap}','READ_IN_FULL_IN_THIS_SCREEN',current_date,'SYNTHETIC TEST ONLY - throwaway database')`); await c.query("commit");
  await run(`update t3a_d1_content_version set approval_status='approved', operational_state='active', approved_by='${P}', approved_at=now(), effective_at=now() where content_version_id='${v.v}'`);
  return v.v;
};
const unapproved = await (async () => { const id = "SRC-D8-J-UN-" + RUN; await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${id}','source','${id}','D8','not_loaded')`); return (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded','{"stage_code":"S3"}'::jsonb from t3a_content_object where identifier='${id}' returning content_version_id v`))[0].v; })();
const S3SRC = await mkSrc("S3");
const future = "now() + interval '7 days'";

// ---- Stage 3
let r = await svc(`select t3a_s3_assign('${P}','${unapproved}', ${future}) r`); rec("D8-S3-1", "an unapproved Stage 3 source cannot be assigned", r.r?.outcome === "refused", r.r || r.msg);
r = await asRole("authenticated", P, `select t3a_s3_assign('${P}','${S3SRC}', ${future}) r`); rec("D8-S3-1", "a participant cannot assign work to themselves", r.r?.reason === "APPROVER_LACKS_STANDING", r.r || r.msg);
r = await svc(`select t3a_s3_assign('${P}','${S3SRC}', now() - interval '1 day') r`); rec("D8-S3-1", "a deadline in the past is refused", r.r?.reason === "deadline_required_in_future", r.r);
r = await svc(`select t3a_s3_assign('${P}','${S3SRC}', ${future}) r`); const sub = r.r?.submission_id; rec("D8-S3-1", "an approved source with a rights record assigns, carrying its dimension", r.r?.outcome === "assigned" && r.r.dimension_id === "D8", r.r || r.msg);
r = await as(P2, `select t3a_s3_respond('${sub}','accept') r`); rec("D8-S3-2", "only the assigned participant responds", r.r?.reason === "not_your_assignment", r.r);
r = await as(P, `select t3a_s3_submit('${sub}','x://a',true,false,null,false,null) r`); rec("D8-S3-2", "submission before acceptance is refused", r.r?.reason === "invalid_state_for_submission", r.r);
r = await as(P, `select t3a_s3_respond('${sub}','accept') r`); rec("D8-S3-2", "accept", r.r?.outcome === "accepted", r.r || r.msg);
let n0 = await refused("AI_USE_DECLARATION_REQUIRED");
r = await as(P, `select t3a_s3_submit('${sub}','x://a',true,false,null,null,null) r`);
rec("D8-S3-3", "a missing tooling declaration refuses under AI_USE_DECLARATION_REQUIRED and the refusal persists", r.r?.reason === "AI_USE_DECLARATION_REQUIRED" && (await refused("AI_USE_DECLARATION_REQUIRED")) === n0 + 1, r.r || r.msg);
r = await as(P, `select t3a_s3_submit('${sub}','x://a',false,false,null,false,null) r`); rec("D8-S3-3", "the authorship attestation must be affirmed", r.r?.reason === "AUTHORSHIP_ATTESTATION_NOT_AFFIRMED", r.r);
r = await as(P, `select t3a_s3_submit('${sub}','x://a',true,true,null,false,null) r`); rec("D8-S3-3", "assistance yes with no controlled selection is refused", r.r?.reason === "DECLARATION_DETAIL_MISMATCH", r.r);
r = await as(P, `select t3a_s3_submit('${sub}','x://a',true,false,'a colleague',false,null) r`); rec("D8-S3-3", "a detail selected with a no declaration is refused", r.r?.reason === "DECLARATION_DETAIL_MISMATCH", r.r);
r = await as(P, `select t3a_s3_submit('${sub}','x://a',true,false,null,true,'free text here') r`); rec("D8-S3-3", "free text outside the controlled list is rejected", r.msg !== "ok" || r.r?.outcome === "refused", r.r || r.msg.slice(0, 100));
r = await as(P, `select t3a_s3_submit('${sub}','  ',true,false,null,false,null) r`); rec("D8-S3-3", "an empty artifact is refused", r.r?.reason === "PROVENANCE_FIELD_MISSING", r.r);
rec("D8-S3-3", "nothing was written by the refused attempts", (await run(`select state, artifact_ref from t3a_d1_work_sample_submission where submission_id='${sub}'`))[0].state === "ACCEPTED", null);
r = await as(P, `select t3a_s3_submit('${sub}','x://first',true,true,'a colleague',true,'checking or review') r`);
rec("D8-S3-4", "a first submission passes the eleven field check (not twelve) and becomes available for capture", r.r?.outcome === "submitted" && r.r.fields_checked === 11 && r.r.resubmission === false, r.r || r.msg);
rec("D8-S3-4", "the lifecycle ends at AVAILABLE_FOR_CAPTURE", (await run(`select state from t3a_d1_work_sample_submission where submission_id='${sub}'`))[0].state === "AVAILABLE_FOR_CAPTURE", null);
r = await as(P, `select t3a_s3_submit(null,'x://second',true,false,null,false,null,'${sub}') r`);
const sub2 = r.r?.submission_id;
rec("D8-S3-5", "a resubmission is a new row with prior_version_ref, checked on twelve fields", r.r?.outcome === "submitted" && r.r.fields_checked === 12 && r.r.resubmission === true, r.r || r.msg);
const rows = await run(`select submission_id, artifact_ref, superseded_by, prior_version_ref, state from t3a_d1_work_sample_submission where submission_id in ('${sub}','${sub2}')`);
const oldRow = rows.find(x => x.submission_id === sub), newRow = rows.find(x => x.submission_id === sub2);
rec("D8-S3-5", "nothing is overwritten: the prior artifact stays and is marked superseded by the new row", oldRow.artifact_ref === "x://first" && oldRow.superseded_by === sub2 && newRow.prior_version_ref === sub && newRow.state === "AVAILABLE_FOR_CAPTURE", rows);
r = await as(P, `select t3a_s3_submit(null,'x://third',true,false,null,false,null,'${sub}') r`); rec("D8-S3-5", "a superseded submission cannot be resubmitted again", r.r?.reason === "prior_not_resubmittable", r.r);
r = await svc(`select t3a_s3_assign('${P2}','${S3SRC}', ${future}) r`); const sub3 = r.r?.submission_id;
r = await as(P2, `select t3a_s3_respond('${sub3}','decline') r`);
rec("D8-S3-6", "a decline is not an evidence outcome and collects no reason; another source is offered", r.r?.outcome === "declined" && r.r.evidence_outcome === false && r.r.offer_another_source === true, r.r || r.msg);
rec("D8-S3-6", "a decline consumes no attempt", (await run(`select count(*)::int n from t3a_attempt where participant_id='${P2}'`))[0].n === 0, null);
// deadline attribute
r = await svc(`select t3a_s3_assign('${C1}','${S3SRC}', ${future}) r`); const sub4 = r.r?.submission_id;
await run(`update t3a_d1_work_sample_submission set deadline_at = now() - interval '1 hour' where submission_id='${sub4}'`);
r = await as(C1, `select t3a_s3_deadline_sweep() r`); rec("D8-S3-7", "the sweep is a service route only", r.r?.reason === "service_route_only" || /permission/.test(r.msg), r.r || r.msg.slice(0, 80));
r = await svc(`select t3a_s3_deadline_sweep() r`);
const mrow = (await run(`select deadline_missed, state from t3a_d1_work_sample_submission where submission_id='${sub4}'`))[0];
rec("D8-S3-7", "a missed deadline is recorded as an attribute only: no statement, not adverse, no attempt consumed", r.r?.marked >= 1 && mrow.deadline_missed === true && r.r.composes_statement === false && r.r.adverse === false && r.r.attempt_consumed === false && (await run(`select count(*)::int n from t3a_attempt where participant_id='${C1}'`))[0].n === 0, r.r);
// capture gate
r = await as(P, `select t3a_s3_capture_gate('${sub2}','${P}') r`); rec("D8-S3-8", "the participant cannot capture determinations on their own work", r.r?.reason === "participant_cannot_capture_own_work", r.r);
r = await as(MU, `select t3a_s3_capture_gate('${sub2}','${MU}') r`); rec("D8-S3-8", "a mentor with no D8 authorization is refused", r.r?.reason === "unauthorized_dimension", r.r);
r = await as(MT, `select t3a_s3_capture_gate('${sub2}','${MT}') r`); rec("D8-S3-8", "an authorized D8 mentor may capture; the work is not graded and the artifact is not on a report face", r.r?.outcome === "may_capture" && r.r.grades_the_work === false && r.r.artifact_on_report_face === false, r.r || r.msg);
r = await as(MT, `select t3a_s3_capture_gate('${sub}','${MT}') r`); rec("D8-S3-8", "a superseded submission is not available for capture", r.r?.reason === "not_available_for_capture" || r.r?.outcome === "refused", r.r);

// ---- Stage 4
const S4SRC = await mkSrc("S4");
const compose = (extra = {}) => { const a = { src: S4SRC, fac: FAC, obs: OBS, co: [C1, C2, C3], acc: true, ...extra }; return svc(`select t3a_s4_compose_session('${a.src}','${a.fac}','${a.obs}', array[${a.co.map(x => `'${x}'`).join(",")}]::uuid[], ${a.acc}) r`); };
r = await compose({ acc: false }); rec("D8-S4-1", "accommodation not settled before composition is refused", r.r?.reason === "accommodation_not_settled", r.r);
r = await compose({ co: [C1, C2, C3, C4] }); rec("D8-S4-1", "a fourth co-participant is refused", r.r?.reason === "too_many_co_participants", r.r);
r = await compose({ co: [C1, OBS] }); rec("D8-S4-1", "the observed participant cannot also be a co-participant", r.r?.reason === "roles_must_be_distinct", r.r);
r = await compose({ co: [C1, C1] }); rec("D8-S4-1", "a co-participant cannot be listed twice", r.r?.reason === "roles_must_be_distinct", r.r);
r = await compose({ fac: MU }); rec("D8-S4-1", "a facilitator with no D8 authorization is refused", r.r?.reason === "unauthorized_dimension", r.r);
r = await as(OBS, `select t3a_s4_compose_session('${S4SRC}','${FAC}','${OBS}', array['${C1}']::uuid[], true) r`); rec("D8-S4-1", "a participant cannot compose a session", r.r?.reason === "APPROVER_LACKS_STANDING", r.r);
r = await compose(); const GS = r.r?.group_session_id;
rec("D8-S4-2", "composition names one observed participant and three co-participants; one observation record is to be written", r.r?.outcome === "composed" && r.r.observation_records_to_be_written === 1 && (await run(`select count(*) filter (where member_role='observed')::int o, count(*) filter (where member_role='co_participant')::int c from t3a_d1_group_session_member where group_session_id='${GS}'`)).every(x => x.o === 1 && x.c === 3), r.r || r.msg);
r = await svc(`select t3a_d1_group_capture_permitted('${GS}','${C1}') r`); rec("D8-S4-3", "a co-participant generates no observation record", r.r?.refusal_code === "CO_PARTICIPANT_GENERATES_NO_OBSERVATION_RECORD", r.r);
r = await svc(`select t3a_d1_group_capture_permitted('${GS}','${OBS}') r`); rec("D8-S4-3", "the observed participant has exactly one lane", r.r?.permitted === true && r.r.capture_lanes === 1, r.r);
// lane visibility
r = await as(FAC, `select t3a_s4_lane_view('${GS}','${FAC}') r`); rec("D8-S4-4", "the facilitator sees the one lane", r.r?.outcome === "visible" && r.r.lanes === 1, r.r || r.msg);
n0 = await refused("lane_visible_to_facilitator_only");
r = await as(OBS, `select t3a_s4_lane_view('${GS}','${OBS}') r`); const r2 = await as(C1, `select t3a_s4_lane_view('${GS}','${C1}') r`);
rec("D8-S4-4", "neither the observed participant nor a co-participant sees the lane, and both attempts are logged", r.r?.reason === "lane_visible_to_facilitator_only" && r2.r?.reason === "lane_visible_to_facilitator_only" && (await refused("lane_visible_to_facilitator_only")) === n0 + 2, [r.r, r2.r]);
rec("D8-S4-4", "a co-participant cannot read the session or its members directly", (await asRole("authenticated", C1, `select count(*)::int r from t3a_d1_group_session`)).r === 0, null);
// entry
const cfg = (k, v) => run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('${k}','${v}','0.0','${FAC}')`);
await cfg("s4_activation_state", ""); await cfg("s4_group_notice_version", ""); await cfg("s4_group_notice_hash", "");
n0 = await refused("s4_not_activated");
r = await as(FAC, `select t3a_s4_enter('${GS}') r`);
rec("D-03", "entry refuses with s4_not_activated and the attempt is recorded with its result", r.r?.reason === "s4_not_activated" && (await refused("s4_not_activated")) === n0 + 1 && (await run(`select count(*)::int n from t3a_s4_entry_attempt where group_session_id='${GS}' and result='refused' and reason_code='s4_not_activated'`))[0].n === 1, r.r || r.msg);
rec("D-03", "a loaded empty value does not open Stage 4 (fail closed)", (await run(`select t3a_s4_activation_state() v`))[0].v === null, null);
await cfg("s4_activation_state", "yes");
r = await as(FAC, `select t3a_s4_enter('${GS}') r`); rec("D-03", "any value other than 'activated' leaves Stage 4 closed", r.r?.reason === "s4_not_activated", r.r);
r = await as(C1, `select t3a_s4_enter('${GS}') r`); rec("D-03", "only the facilitator enters", r.r?.reason === "facilitator_only", r.r);
r = await as(FAC, `select t3a_s4_enter(gen_random_uuid()) r`); rec("D-03", "an unknown session refuses", r.r?.reason === "session_not_found", r.r);
r = await as(OBS, `select t3a_s4_record_group_participation('${GS}') r`); rec("D8-S4-5", "with no group notice loaded the participation permission refuses and nothing is stored", r.r?.reason === "group_notice_unloaded" && (await run(`select count(*)::int n from t3a_s4_group_participation where group_session_id='${GS}'`))[0].n === 0, r.r);
r = await as(P, `select t3a_s4_record_group_participation('${GS}') r`); rec("D8-S4-5", "a person outside the session cannot give or record a permission for it", r.r?.reason === "NOT_A_MEMBER_OF_THIS_SESSION", r.r);
// synthetic activation and notice (throwaway database only), then reset
await cfg("s4_activation_state", "activated"); await cfg("s4_group_notice_version", "syn-1"); await cfg("s4_group_notice_hash", "h".repeat(64));
r = await as(FAC, `select t3a_s4_enter('${GS}') r`); rec("D8-S4-5", "with activation synthetically loaded, entry still refuses until every person has given the permission", r.r?.reason === "group_participation_missing", r.r);
for (const u of [OBS, C1, C2]) await as(u, `select t3a_s4_record_group_participation('${GS}') r`);
r = await as(FAC, `select t3a_s4_enter('${GS}') r`); rec("D8-S4-5", "one missing permission among four still refuses", r.r?.reason === "group_participation_missing", r.r);
await as(C3, `select t3a_s4_record_group_participation('${GS}') r`);
const pr = await run(`select notice_version, notice_hash from t3a_s4_group_participation where group_session_id='${GS}'`);
rec("D8-S4-5", "each permission is bound to the notice version and hash", pr.length === 4 && pr.every(x => x.notice_version === "syn-1" && x.notice_hash === "h".repeat(64)), pr.length);
const upd = await run(`select 1`); void upd;
await c.query("begin"); let um = "ok"; try { await c.query(`update t3a_s4_group_participation set notice_version='x'`); } catch (e) { um = e.message; } await c.query("rollback"); rec("D8-S4-5", "a permission cannot be edited", /append|T3A_|denied|immutable/i.test(um), um.slice(0, 80));
r = await as(FAC, `select t3a_s4_enter('${GS}') r`); rec("D8-S4-6", "with every permission, an approved source and synthetic activation, entry succeeds and opens one lane", r.r?.outcome === "entered" && r.r.capture_lanes === 1, r.r || r.msg);
await cfg("s4_activation_state", ""); await cfg("s4_group_notice_version", ""); await cfg("s4_group_notice_hash", "");
r = await as(FAC, `select t3a_s4_enter('${GS}') r`); rec("D-03", "resetting the value closes Stage 4 again", r.r?.reason === "s4_not_activated", r.r);
// pilot stop reaches composition
await run(`insert into t3a_pilot_stop(stop_level, dimension_id, participant_id, reason_code) values ('affected_path','D8','${C4}','synthetic')`);
r = await compose({ obs: C4, co: [C1] }); rec("D8-S4-7", "a pilot stop on the observed participant's path refuses composition", r.r?.reason === "pilot_path_stopped", r.r);
await run(`update t3a_pilot_stop set lifted_at=now() where participant_id='${C4}'`);
// no bypass
rec("D-03", "there is no override: no function other than t3a_s4_enter starts a session", (await run(`select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname ~ '^t3a_s4_' and p.proname !~ '^t3a_s4_(activation_state|compose_session|compose_session_base|record_group_participation|enter|lane_view)$'`))[0].n === 0, null);

console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
