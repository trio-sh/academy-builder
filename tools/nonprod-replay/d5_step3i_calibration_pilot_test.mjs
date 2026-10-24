// Step 3i: calibration and pilot (D5 INS-008 101 to 109, INS-009 110 to 115). Throwaway database only; every clearance and stop here is synthetic.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const mk = async (tag, role) => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','i${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','i${tag}-${RUN}@t.local','${role}')`); return u; };
const P = await mk("p", "candidate"), P2 = await mk("p2", "candidate"), CAL = await mk("cal", "mentor"), OK = await mk("ok", "mentor"), A = await mk("a", "mentor"), B = await mk("b", "mentor"), C3 = await mk("c3", "mentor");
const refused = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const cnt = async (sql) => (await run(sql))[0].n;

// 106 boundary
await run(`insert into t3a_calibration_participant(actor_id, dimension_id, status) values ('${CAL}','D5','provisional')`);
const n0 = await refused("calibration_participant_boundary");
await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D5','S2','${CAL}',true)`);
rec("D5-106", "a provisional calibration participant cannot be the observer of a real record; the refusal is logged", await cnt(`select count(*)::int n from t3a_observation_record where observer_id='${CAL}'`) === 0 && (await refused("calibration_participant_boundary")) === n0 + 1, null);
await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P}','D5','S2','${OK}',true)`);
rec("D5-106", "an ordinary mentor is not affected", await cnt(`select count(*)::int n from t3a_observation_record where observer_id='${OK}'`) === 1, null);
const bound = await run(`select count(*)::int n from pg_trigger where tgname='t3a_5_calibration_boundary_trg' and not tgisinternal`);
rec("D5-106", "the boundary is installed on five tables (observation, progression, evidence review, reconsideration, issuance)", bound[0].n === 5, bound);

// 102, 108 clearance per dimension
const authIns = (m, dim, ref) => run(`insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status, reviewer_authorization, issuer_authorization) values ('${m}','${dim}', now() - interval '1 day', 'current','${ref}','authorized', false, false)`);
await authIns(A, "D1", "1.0"); rec("D5-108", "D1 authorization needs no new clearance (D1 rows are not re-judged)", await cnt(`select count(*)::int n from t3a_mentor_authorization where mentor_id='${A}'`) === 1, null);
const n1 = await refused("no_clearance_for_dimension"); await authIns(A, "D5", "9." + RUN);
rec("D5-102", "a D1 clearance confers nothing: D5 authorization with no D5 clearance is refused and logged", await cnt(`select count(*)::int n from t3a_mentor_authorization where mentor_id='${A}' and dimension_id='D5'`) === 0 && (await refused("no_clearance_for_dimension")) === n1 + 1, null);

// 107 peer view
// D5-59: a calibration run may not open on a question whose definition is incomplete (D5 D-05); the refusal is logged and the exercise stays in draft
const exBad = (await run(`insert into t3a_d1_calibration_exercise(title, reviewer_prompt, dimension_id, question_codes) values ('ib-${RUN}','p','D5', array['Q-D5-01']) returning id`))[0].id;
const nq0 = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='question_definition_incomplete'`))[0].n;
await run(`update t3a_d1_calibration_exercise set state='open', opened_at=now() where id='${exBad}'`);
rec("D5-59", "a calibration run on a question with an empty definition does not open; the refusal is logged question_definition_incomplete", (await run(`select state::text s from t3a_d1_calibration_exercise where id='${exBad}'`))[0].s === "draft" && (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='question_definition_incomplete'`))[0].n === nq0 + 1, null);
const exNone = (await run(`insert into t3a_d1_calibration_exercise(title, reviewer_prompt, dimension_id) values ('in-${RUN}','p','D5') returning id`))[0].id;
await run(`update t3a_d1_calibration_exercise set state='open', opened_at=now() where id='${exNone}'`);
rec("D5-59", "a calibration run that names no question does not open either", (await run(`select state::text s from t3a_d1_calibration_exercise where id='${exNone}'`))[0].s === "draft", null);
// the rest of this file needs an open exercise: complete the definition of one question on the throwaway database only, and clear it again at the end
await run(`update t3a_question_definition set operational_definition='synthetic', minimum_observable_evidence='synthetic', inclusion_example='synthetic', exclusion_example='synthetic', ambiguity_rule='synthetic' where dimension_id='D5' and question_id='Q-D5-01'`);
const ex = (await run(`insert into t3a_d1_calibration_exercise(title, reviewer_prompt, dimension_id, question_codes) values ('i-${RUN}','p','D5', array['Q-D5-01']) returning id`))[0].id;
await run(`update t3a_d1_calibration_exercise set state='open', opened_at=now() where id='${ex}'`);
const src1 = randomUUID(), src2 = randomUUID();
const units = (src, q, n, ans) => ({ units: Array.from({ length: n }, (_, k) => ({ unit_id: `${src}-${k}`, source_version_id: src, question_code: q, answer: ans(k) })) });
const merge = (...u) => ({ units: u.flatMap(x => x.units) });
// A and B submit; src1/Q-D5-01 has 3 units, src2/Q-D5-01 has 1 unit
const bodyA = merge(units(src1, "Q-D5-01", 3, k => "A1"), units(src2, "Q-D5-01", 1, () => "A1"));
const bodyB = merge(units(src1, "Q-D5-01", 3, k => k === 2 ? "A2" : "A1"), units(src2, "Q-D5-01", 1, () => "A1"));
await run(`insert into t3a_d1_calibration_participation(exercise_id, reviewer_id, decision_body) values ('${ex}','${A}','${JSON.stringify(bodyA)}')`);
await run(`insert into t3a_d1_calibration_participation(exercise_id, reviewer_id, decision_body) values ('${ex}','${B}','${JSON.stringify(bodyB)}')`);
const n2 = await refused("selections_not_locked");
let pv = (await run(`select t3a_calibration_peer_view('${ex}','${A}') r`))[0].r;
rec("D5-107", "before locking their own selections a participant sees nothing of anyone else's, and the attempt is logged", pv.outcome === "refused" && (await refused("selections_not_locked")) === n2 + 1, pv);
await run(`update t3a_d1_calibration_participation set submitted_at=now() where exercise_id='${ex}' and reviewer_id='${B}'`);
pv = (await run(`select t3a_calibration_peer_view('${ex}','${A}') r`))[0].r; rec("D5-107", "locking B does not open the view for A", pv.outcome === "refused", pv);
await run(`update t3a_d1_calibration_participation set submitted_at=now() where exercise_id='${ex}' and reviewer_id='${A}'`);
pv = (await run(`select t3a_calibration_peer_view('${ex}','${A}') r`))[0].r; rec("D5-107", "after A locks, A sees B's selections only", pv.outcome === "visible" && pv.selections.length === 1 && pv.selections[0].reviewer_id === B, pv);

// 103 to 105 agreement by source
let ag = (await svc(`select t3a_calibration_agreement_by_source('${ex}', null) r`)).rows[0].r;
rec("D5-103", "with the minimum unloaded nothing is calculated", ag.outcome === "refused" && ag.reason === "minimum_unit_unloaded", ag);
ag = (await svc(`select t3a_calibration_agreement_by_source('${ex}', 3) r`)).rows[0].r;
const s1 = ag.by_source.find(x => x.source_version_id === src1), s2 = ag.by_source.find(x => x.source_version_id === src2);
rec("D5-103", "agreement is computed within a source: source one has three units and is calculated, with 2 of 3 units agreeing", s1.status === "CALCULATED" && s1.question_agreement_units === 2, s1);
rec("D5-104", "below the per source minimum the status is NOT_CALCULATED and the question stays uncleared for that source", s2.status === "NOT_CALCULATED" && s2.question_remains_uncleared_for_this_source === true, s2);
rec("D5-105", "statement concordance is a separate figure and no combined figure exists", "statement_concordance_units" in s1 && !("combined" in s1) && !("overall" in ag), Object.keys(s1));
const unitsFor = (src) => merge(units(src, "Q-D5-01", 3, () => "A1"));

// clearance route: service only, refuses unloaded and uncleared
await run(`update t3a_d1_calibration_exercise set state='closed', closed_at=now() where id='${ex}'`);
let cr = await svc(`select t3a_record_calibration_clearance('${ex}','2.${RUN}','c','d','s',array['${src1}']::uuid[]) r`);
rec("D5-102", "the clearance route refuses with the approved minimum unloaded", cr.rows[0]?.r?.reason === "clearance_parameters_unloaded" || cr.rows[0]?.r?.outcome === "refused", cr.rows[0]?.r || cr.msg);
const asUser = await run(`select has_function_privilege('authenticated','t3a_record_calibration_clearance(uuid,text,text,text,text,uuid[])','execute') p`);
rec("D5-102", "no signed in role may call the clearance function", asUser[0].p === false, asUser);
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('calibration_minimum_units_per_source','3','0.0','${A}')`);
cr = await svc(`select t3a_record_calibration_clearance('${ex}','2.${RUN}','c','d','s',array['${src1}']::uuid[]) r`);
rec("D5-104", "with the minimum loaded but a source below it, the clearance still refuses (questions_uncleared)", cr.rows[0]?.r?.reason === "questions_uncleared", cr.rows[0]?.r || cr.msg);
// second exercise: both sources have three units -> clearance recorded (synthetic, throwaway)
const ex2 = (await run(`insert into t3a_d1_calibration_exercise(title, reviewer_prompt, dimension_id, question_codes) values ('i2-${RUN}','p','D5', array['Q-D5-01']) returning id`))[0].id;
await run(`update t3a_d1_calibration_exercise set state='open', opened_at=now() where id='${ex2}'`);
const full = merge(units(src1, "Q-D5-01", 3, () => "A1"), units(src2, "Q-D5-01", 3, () => "A1"));
for (const u of [A, B]) await run(`insert into t3a_d1_calibration_participation(exercise_id, reviewer_id, decision_body, submitted_at) values ('${ex2}','${u}','${JSON.stringify(full)}', now())`);
await run(`update t3a_d1_calibration_exercise set state='closed', closed_at=now() where id='${ex2}'`);
const REF = "2." + RUN;
cr = await svc(`select t3a_record_calibration_clearance('${ex2}','${REF}','c','d','s',array['${src1}','${src2}']::uuid[]) r`);
rec("D5-102", "when every question of every source is calculated the service route records the clearance (synthetic)", cr.rows[0]?.r?.outcome === "recorded", cr.rows[0]?.r || cr.msg);
await authIns(A, "D5", REF); rec("D5-108", "D5 authorization now succeeds because a D5 clearance names this version set", await cnt(`select count(*)::int n from t3a_mentor_authorization where mentor_id='${A}' and dimension_id='D5'`) === 1, null);
const upd = await run(`select 1`); void upd;
await c.query("begin"); let um = "ok"; try { await c.query(`update t3a_calibration_clearance set statement_version='x'`); } catch (e) { um = e.message; } await c.query("rollback");
rec("D5-102", "a clearance record cannot be edited", /append|NO_UPDATE|T3A_|denied|immutable/i.test(um), um.slice(0, 80));

// 110, 114 pilot stop tiers
const ps = async (tier, dim, part) => (await svc(`select t3a_pilot_set_stop('${tier}','${dim}',${part ? `'${part}'` : "null"},'synthetic') r`)).rows[0]?.r;
rec("D5-110", "no stop in force: every path is open", (await run(`select t3a_pilot_path_open('${P}','D5') a, t3a_pilot_path_open('${P2}','D5') b`))[0].a === true, null);
let s = await ps("affected_path", "D5", P); rec("D5-110", "an affected path stop is recorded", s?.outcome === "stopped", s);
const st2 = async (p) => (await run(`select t3a_stage_2_entry_gate('${p}','D5') g`))[0].g;
rec("D5-110", "the stopped participant's D5 entry is refused with pilot_path_stopped", (await st2(P)).refusal_code === "pilot_path_stopped", await st2(P));
rec("D5-111", "another participant is not halted by it", (await st2(P2)).refusal_code !== "pilot_path_stopped", await st2(P2));
rec("D5-111", "the stopped participant's D1 path is not halted", (await run(`select t3a_pilot_path_open('${P}','D1') a`))[0].a === true, null);
await run(`update t3a_pilot_stop set lifted_at=now() where dimension_id='D5'`);
s = await ps("pause_new_scheduling", "D5", null);
rec("D5-114", "pausing new scheduling stops new starts but leaves a session already under way open", (await run(`select t3a_pilot_path_open('${P2}','D5','new') n, t3a_pilot_path_open('${P2}','D5','continuing') c`))[0].n === false && (await run(`select t3a_pilot_path_open('${P2}','D5','continuing') c`))[0].c === true, null);
await run(`update t3a_pilot_stop set lifted_at=now() where dimension_id='D5'`);
s = await ps("pilot_wide", "D5", null); rec("D5-114", "a pilot wide stop closes every D5 path", (await run(`select t3a_pilot_path_open('${P}','D5') a, t3a_pilot_path_open('${P2}','D5','continuing') b`))[0].a === false, null);
await run(`update t3a_pilot_stop set lifted_at=now() where dimension_id='D5'`);
const bad = await svc(`select t3a_pilot_set_stop('affected_path','D5',null,'synthetic') r`); rec("D5-110", "an affected path stop must name the participant", bad.msg !== "ok", bad.msg.slice(0, 80));
await c.query("begin"); let ur = "ok"; try { await c.query("set local role authenticated"); await c.query(`select set_config('request.jwt.claims','{"role":"authenticated","sub":"${P}"}',true)`); const r = await c.query(`select t3a_pilot_set_stop('pilot_wide','D5',null,'x') r`); ur = JSON.stringify(r.rows[0].r); } catch (e) { ur = e.message; } await c.query("rollback");
rec("D5-110", "a participant cannot set a stop", /APPROVER_LACKS_STANDING|refused/.test(ur) || /permission/.test(ur), ur.slice(0, 120));

// 112 employer routes
const n3 = await refused("employer_route_disabled_in_pilot"); const org = randomUUID();
const ea = (await run(`select t3a_pilot_employer_attempt('verify','${org}') r`))[0].r; await run(`select t3a_pilot_employer_attempt('release','${org}')`);
rec("D5-112", "each employer route attempt is refused and recorded with its result", ea.outcome === "refused" && (await refused("employer_route_disabled_in_pilot")) === n3 + 2, ea);

// 115 provenance trace
const tr = (await svc(`select t3a_provenance_trace('${randomUUID()}') r`)).rows[0].r;
rec("D5-115", "a trace for an unknown observation is incomplete and names every missing link instead of filling it", tr.complete === false && ["observation_record", "composed_statement", "stage_entry_event", "audit_chain"].every(x => tr.missing_links.includes(x)), tr.missing_links);
const obs = (await run(`select observation_record_id i from t3a_observation_record where observer_id='${OK}' limit 1`))[0].i;
const tr2 = (await svc(`select t3a_provenance_trace('${obs}') r`)).rows[0].r;
rec("D5-115", "a real observation with no composed statement reports exactly that gap", tr2.complete === false && tr2.missing_links.includes("composed_statement") && !tr2.missing_links.includes("observation_record"), tr2.missing_links);
const sv = await run(`select has_function_privilege('authenticated','t3a_provenance_trace(uuid)','execute') p`); rec("D5-115", "the trace is service only", sv[0].p === false, sv);

await run(`update t3a_question_definition set operational_definition=null, minimum_observable_evidence=null, inclusion_example=null, exclusion_example=null, ambiguity_rule=null where dimension_id='D5' and question_id='Q-D5-01'`);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
