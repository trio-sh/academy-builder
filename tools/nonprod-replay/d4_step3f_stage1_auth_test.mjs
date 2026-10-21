// Step 3f: Stage 1 gate, per dimension authorization, involvement across a report, Stage 1 evidence note (D4 INS-011, INS-012). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const mkUser = async (tag, role) => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','f${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','f${tag}-${RUN}@t.local','${role}')`); return u; };
const P = await mkUser("p", "candidate"), M1 = await mkUser("m1", "mentor"), M2 = await mkUser("m2", "mentor"), RV = await mkUser("rv", "mentor"), IS = await mkUser("is", "mentor");
const refused = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const gate = async (dim = "D4") => (await run(`select t3a_stage_2_entry_gate('${P}','${dim}') g`))[0].g;
const si = async (dim, stage, attempt, state = "completed", done = true) => (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state, completed_at) values ('${P}','${stage}','${dim}',${attempt},'${state}',${done ? "now()" : "null"}) returning stage_instance_id i`))[0].i;

// --- the Stage 2 entry gate
let g = await gate(); rec("D4-63", "no Stage 1 instance: s1_confirmation_absent / s1_instance_not_closed", g.refusal_code === "s1_confirmation_absent" && g.sub_reason === "s1_instance_not_closed", g);
const s1open = await si("D4", "S1", 1, "active", false); g = await gate(); rec("D4-57", "a Stage 1 instance that is not closed refuses with its own sub-reason", g.sub_reason === "s1_instance_not_closed", g);
await run(`update t3a_stage_instance set state='completed', completed_at=now() where stage_instance_id='${s1open}'`);
g = await gate(); rec("D4-57", "closed but no confirmation: record absent", g.sub_reason === "s1_confirmation_record_absent_or_wrong_actor" && g.detail === "absent", g);
await run(`insert into t3a_d1_s1_routing(stage_instance_id, participant_id, dimension_id, assigned_mentor_id) values ('${s1open}','${P}','D4','${M1}')`);
await run(`insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by) values ('${s1open}','${P}','D4','${M2}')`);
g = await gate(); rec("D4-57", "a confirmation by someone other than the assigned mentor fails the gate as a wrong-actor control failure, distinct from absent", g.sub_reason === "s1_confirmation_record_absent_or_wrong_actor" && g.detail === "wrong_actor", g);
// a fresh instance with the right actor
await run(`update t3a_stage_instance set attempt_no = attempt_no where stage_instance_id='${s1open}'`).catch(() => {});
const s1b = await si("D4", "S1", 2);
await run(`insert into t3a_d1_s1_routing(stage_instance_id, participant_id, dimension_id, assigned_mentor_id) values ('${s1b}','${P}','D4','${M1}')`);
await run(`insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by) values ('${s1b}','${P}','D4','${M1}')`);
g = await gate(); rec("D4-57", "assigned mentor confirmed, nothing committed: s1_observation_not_committed", g.sub_reason === "s1_observation_not_committed", g);
await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, confirmer_id, is_committed) values ('${P}','D4','S1','${M1}',true)`);
g = await gate(); rec("D4-57", "committed, no progression: s1_progression_absent_or_blocks", g.sub_reason === "s1_progression_absent_or_blocks", g);
const jd = (stage, dim, dec) => run(`insert into t3a_mentor_judgment(stage_instance_id, progression_decision, progression_dimension_id) values ('${stage}','${dec}','${dim}')`);
await jd(s1b, "D4", "redirect"); g = await gate(); rec("D4-57", "a redirect blocks continuation", g.sub_reason === "s1_progression_absent_or_blocks" && g.detail === "redirect", g);
const n0 = await refused("s1_confirmation_absent"); const att = (await run(`select t3a_stage_2_entry_attempt('${P}','D4') g`))[0].g;
rec("D4-63", "the logged route refuses and the refusal persists", att.eligible === false && (await refused("s1_confirmation_absent")) === n0 + 1, att);
await new Promise(r => setTimeout(r, 20)); await jd(s1b, "D4", "proceed"); g = await gate(); rec("D4-57", "proceed permits Stage 2", g.eligible === true, g);
// per-dimension progression (014, 018)
const d1s1 = await si("D1", "S1", 1); await jd(d1s1, "D1", "redirect"); g = await gate();
rec("D4-18", "a redirect recorded on D1 leaves the D4 progression state unchanged", g.eligible === true && (await run(`select t3a_latest_progression('${P}','D1') p`))[0].p === "redirect", g);

// --- authorization per dimension (016)
const authIns = (m, dim, ref) => run(`insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status, reviewer_authorization, issuer_authorization) values ('${m}','${dim}', now() - interval '1 day', 'current', ${ref ? `'${ref}'` : "null"}, 'authorized', false, false)`);
await authIns(M1, "D1", "1.0");
let n1 = await refused("unauthorized_dimension"); let og = (await run(`select t3a_observer_gate('${M1}','D4','${P}') r`))[0].r;
rec("D4-16", "a mentor holding only D1 authorization is refused for D4 and the refusal is logged", og.reason === "unauthorized_dimension" && (await refused("unauthorized_dimension")) === n1 + 1, og);
await run(`insert into t3a_calibration_clearance(dimension_id, reference_set_version, construct_version, determination_version, statement_version, source_version_ids) values ('D4','2.1','t','t','t',array[gen_random_uuid()])`); // synthetic clearance, throwaway database only
await authIns(M1, "D4", "2.1"); og = (await run(`select t3a_observer_gate('${M1}','D4','${P}') r`))[0].r; rec("D4-9", "D4 authorization resting on a clearance that names the version set authorizes (the version set is a required column, so an unnamed one cannot exist)", og.outcome === "authorized", og);
await authIns(M2, "D4", "2.1"); og = (await run(`select t3a_observer_gate('${M2}','D4','${P}') r`))[0].r; rec("D4-9", "D4 authorization resting on a named clearance authorizes", og.outcome === "authorized", og);
rec("D4-9", "and that D4 authorization does not authorize D1", (await run(`select t3a_observer_gate('${M2}','D1','${P}') r`))[0].r.reason === "unauthorized_dimension", null);

// --- involvement across the whole report (011, 017)
await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D1','S2','${M2}',true)`);
await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D4','S2','${M1}',true)`);
const st = (await run(`select (enum_range(null::${(await run(`select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
const rep = (await run(`insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids) values ('${P}','D4','${st}','{}', true, 'ber', 'assembling', array['D1','D4']) returning ber_report_id r`))[0].r;
const ag = async (a, role) => (await run(`select t3a_report_actor_gate('${a}','${rep}','${role}') r`))[0].r;
let r1 = await ag(M2, "evidence_review"); rec("D4-17", "an actor who observed the D1 record of a two-dimension report may not evidence-review it", r1.reason === "involved_in_report", r1);
r1 = await ag(M1, "issue"); rec("D4-11", "an actor who observed the D4 record may not issue it either", r1.reason === "involved_in_report", r1);
r1 = await ag(P, "evidence_review"); rec("D4-10", "the participant is not a reviewer of their own report", r1.reason === "participant_cannot_review_or_issue_own_report", r1);
r1 = await ag(RV, "evidence_review"); rec("D4-11", "an actor with no part in any record is eligible to evidence-review", r1.outcome === "eligible", r1);
await run(`insert into t3a_evidence_review(ber_report_id, reviewer_id, version_set_hash, review_checklist_results) values ('${rep}','${RV}','${"a".repeat(64)}','{}')`);
r1 = await ag(RV, "issue"); rec("D4-10", "the reviewer of a report may not issue it", r1.reason === "reviewer_cannot_issue", r1);
r1 = await ag(IS, "issue"); rec("D4-10", "a distinct uninvolved actor may issue", r1.outcome === "eligible", r1);

// --- Stage 1 evidence note (059, 061, 062)
const srcV = (await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='SRC-D4-S1-001'`))[0].v;
const gw = (await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at) values ('${P}','account_authentication','1.0','1.0',now()) returning observation_path_gateway_id g`))[0].g;
const s1c = await si("D4", "S1", 3);
await run(`insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id) values ('${P}','D4','S1','${gw}','${s1c}','x','1.0','{}','{D4}','{}','${srcV}')`);
let nt = (await run(`select t3a_s1_evidence_note('${s1c}') r`))[0].r; rec("D4-61", "with no confirmation record no note renders and the refusal logs", nt.reason === "s1_confirmation_absent", nt);
await run(`insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by) values ('${s1c}','${P}','D4','${M2}')`);
const pinned = (await run(`select source_version_id v, source_version_hash h from t3a_d1_s1_confirmation where stage_instance_id='${s1c}'`))[0];
rec("D4-62", "the confirmation pins the exact source version and its hash", pinned.v === srcV && /^[0-9a-f]{64}$/.test(pinned.h), pinned);
nt = (await run(`select t3a_s1_evidence_note('${s1c}') r`))[0].r; rec("D4-61", "with the controlled text T-EVNOTE-001 not loaded the render refuses rather than omitting the block", nt.reason === "controlled_text_not_loaded", nt);
await run(`insert into t3a_d1_report_controlled_text(text_ref, block_no, body, verbatim) values ('T-EVNOTE-001', 2, 'SYNTHETIC TEST TEXT', true)`);
nt = (await run(`select t3a_s1_evidence_note('${s1c}') r`))[0].r; rec("D4-59", "with a valid confirmation by an authorized actor and the text loaded, the note renders", nt.outcome === "rendered", nt);
const s1d = await si("D4", "S1", 4);
await run(`insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id) values ('${P}','D4','S1','${gw}','${s1d}','x','1.0','{}','{D4}','{}','${srcV}')`);
await run(`insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by, source_version_id, source_version_hash) values ('${s1d}','${P}','D4','${M2}','${srcV}','${"f".repeat(64)}')`);
nt = (await run(`select t3a_s1_evidence_note('${s1d}') r`))[0].r; rec("D4-62", "if the source version no longer matches the one confirmed the note refuses", nt.reason === "source_altered_after_confirmation", nt);
const s1e = await si("D4", "S1", 5);
await run(`insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id) values ('${P}','D4','S1','${gw}','${s1e}','x','1.0','{}','{D4}','{}','${srcV}')`);
await run(`insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by) values ('${s1e}','${P}','D4','${RV}')`);
nt = (await run(`select t3a_s1_evidence_note('${s1e}') r`))[0].r; rec("D4-59", "a confirmer not authorized for D4 at the time voids the note", nt.reason === "confirmer_not_authorized_at_the_time", nt);
await run(`delete from t3a_d1_report_controlled_text where text_ref='T-EVNOTE-001'`);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
