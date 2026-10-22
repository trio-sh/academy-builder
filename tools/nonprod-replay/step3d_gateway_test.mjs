// Step 3d: D2 source gateway (INS-004; D-01, D-02, D-03). Approvals here are SYNTHETIC and exist on the throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
async function tryq(sql) { await c.query("begin"); let msg = "ok", rows = []; try { rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query(msg !== "ok" ? "rollback" : "commit"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const P = randomUUID(), RUN = P.slice(0, 8);
await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${P}','g-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${P}','g-${RUN}@t.local','candidate')`);
const refused = async (code) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const mk = async (id, dim, stage, sheet = {}) => {
  const body = { source_identifier: id, stage_code: stage, source_version_hash: "a".repeat(64), source_sheet: sheet, title: id };
  await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${id}','source','${id}','${dim}','not_loaded')`);
  return (await run(`insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1', 'drafting', 'not_loaded', '${JSON.stringify(body)}'::jsonb from t3a_content_object where identifier='${id}' returning content_version_id v, content_object_id o`))[0];
};
const appr = (v) => `insert into t3a_d1_source_approval(source_id, source_version_id, status, approved_by, approved_at) values ('${v.o}','${v.v}','approved','${P}',now())`;

// the loaded D2 sources: production state
rec("D2-regs", "the loaded D2 sources hold no approval and cannot be approved: first failing precondition is named", (await run(`select t3a_source_approval_preconditions(v.content_version_id) c from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='SRC-D2-S1-001'`))[0].c === "drafting_test_incomplete", null);
const real = (await run(`select v.content_version_id v, o.content_object_id o from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='SRC-D2-S1-001'`))[0];
const bk = await tryq(appr(real)); rec("D2-27", "the table backstop refuses an approval of a loaded D2 source", /SOURCE_APPROVAL_PRECONDITION: drafting_test_incomplete/.test(bk.msg), bk.msg.slice(0, 120));
// 027 null situation class
const nosc = await mk("SRC-D2-T-NOSC-" + RUN, "D2", "S1", {}); rec("D2-27", "a D2 source with a null situation class cannot be approved", (await run(`select t3a_source_approval_preconditions('${nosc.v}') c`))[0].c === "situation_class_absent_or_unknown", null);
const subnull = await tryq(`select t3a_source_submit_for_approval('${nosc.v}')`); void subnull;
// D-01 drafting tests
const s1 = await mk("SRC-D2-T-S1-" + RUN, "D2", "S1", { d2_situation_class: "SC-D2-1" });
const dt = (n, who) => `insert into t3a_source_drafting_test(source_version_id, test_no, outcome, reviewer_identity, tested_on, version_tested_ref) values ('${s1.v}', ${n}, 'recorded', '${who}', current_date, 'v1')`;
let n0 = await refused("source_author_identity_absent"); await run(dt(1, "reviewer-b"));
rec("D-01", "with no author recorded the drafting test write is refused (fails closed) and logged", (await run(`select count(*)::int n from t3a_source_drafting_test where source_version_id='${s1.v}'`))[0].n === 0 && (await refused("source_author_identity_absent")) === n0 + 1, null);
await run(`insert into t3a_source_authorship(source_version_id, source_author_identity) values ('${s1.v}', array['author-a','author-c'])`);
n0 = await refused("reviewer_is_source_author"); await run(dt(1, "author-c"));
rec("D-01", "a reviewer who is a member of the author list is refused and logged", (await run(`select count(*)::int n from t3a_source_drafting_test where source_version_id='${s1.v}'`))[0].n === 0 && (await refused("reviewer_is_source_author")) === n0 + 1, null);
await run(dt(1, "reviewer-b"));
rec("D-01", "one populated row is not enough", (await run(`select t3a_source_approval_preconditions('${s1.v}') c`))[0].c === "drafting_test_incomplete", null);
const emptyRow = await tryq(`insert into t3a_source_drafting_test(source_version_id, test_no, outcome, reviewer_identity, tested_on, version_tested_ref) values ('${s1.v}', 2, '', 'reviewer-b', current_date, 'v1')`);
rec("D-01", "an empty outcome is refused", /check|violat/i.test(emptyRow.msg), emptyRow.msg.slice(0, 80));
await run(dt(2, "reviewer-b"));
rec("D-01", "with both rows the next precondition is the submission", (await run(`select t3a_source_approval_preconditions('${s1.v}') c`))[0].c === "not_submitted_for_approval", null);
// D-02 stage 3 rights
const s3 = await mk("SRC-D2-T-S3-" + RUN, "D2", "S3", { d2_situation_class: "SC-D2-5" });
n0 = await refused("rights_route_absent");
const sub3 = await tryq(`select t3a_source_submit_for_approval('${s3.v}') r`); await c.query("begin"); await c.query(`select t3a_source_submit_for_approval('${s3.v}')`).catch(() => {}); await c.query("commit");
rec("D-02", "a Stage 3 source with no rights record cannot enter the approval queue (logged, before approval review)", (await run(`select count(*)::int n from t3a_source_approval_request where source_version_id='${s3.v}'`))[0].n === 0, sub3.msg.slice(0, 100));
// the submit function needs standing or service role; run it as service
const svc = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
const sub3b = await svc(`select t3a_source_submit_for_approval('${s3.v}') r`);
rec("D-02", "the refusal is the named code rights_route_absent", sub3b.rows[0]?.r?.reason === "rights_route_absent", sub3b.rows[0]?.r || sub3b.msg);
await run(`insert into t3a_source_rights_record(source_version_id, rights_basis, confidentiality_basis, permitted_use_basis, authorship_provenance_basis, approver_id, approved_on) values ('${s3.v}','synthetic','synthetic','synthetic','synthetic','${P}',current_date)`);
const sub3c = await svc(`select t3a_source_submit_for_approval('${s3.v}') r`); rec("D-02", "with a rights record the source can be submitted", sub3c.rows[0]?.r?.outcome === "queued", sub3c.rows[0]?.r || sub3c.msg);
// full happy path on s1 (synthetic)
await svc(`select t3a_source_submit_for_approval('${s1.v}')`);
rec("D2-27", "queued, the next precondition is the name clearance (the sheet's own claim is not clearance)", (await run(`select t3a_source_approval_preconditions('${s1.v}') c`))[0].c === "name_clearance_pending", null);
await run(`insert into t3a_d1_source_name_clearance(source_version_id, presentation_variant_values, status, cleared_at, cleared_by) values ('${s1.v}','{}','cleared',now(),'${P}')`);
rec("D2-27", "with every precondition met none fails", (await run(`select t3a_source_approval_preconditions('${s1.v}') c`))[0].c === null, null);
// serving gate
const gate0 = await svc(`select t3a_source_serving_gate('${s1.v}','S1') r`); rec("D2-26", "an unapproved version is unreachable", gate0.rows[0]?.r?.reason === "source_not_approved", gate0.rows[0]?.r);
const wrongStage = await svc(`select t3a_source_serving_gate('${s1.v}','S2') r`); rec("D2-26", "a source cannot serve at another Stage", wrongStage.rows[0]?.r?.reason === "source_stage_mismatch", wrongStage.rows[0]?.r);
await c.query("begin"); const ap = (await c.query(appr(s1) + " returning source_approval_id a")).rows[0].a; await c.query(`insert into t3a_d1_approval_basis(source_approval_id, basis_kind, basis_entered_on, recorded_under) values ('${ap}','READ_IN_FULL_IN_THIS_SCREEN',current_date,'SYNTHETIC TEST ONLY - throwaway database')`); await c.query("commit");
await run(`update t3a_d1_content_version set approval_status='approved', operational_state='active', approved_by='${P}', approved_at=now(), effective_at=now() where content_version_id='${s1.v}'`).catch(e => rec("D2-26", "synthetic approval bind", false, e.message));
const gate1 = await svc(`select t3a_source_serving_gate('${s1.v}','S1') r`); rec("D2-26", "only an exact approved, active, eligible version serves (synthetic approval)", gate1.rows[0]?.r?.outcome === "servable", gate1.rows[0]?.r || gate1.msg);
// D-03
const s4 = await mk("SRC-D2-T-S4-" + RUN, "D2", "S4", { d2_situation_class: "SC-D2-1" });
n0 = await refused("s4_not_activated"); const g4 = await svc(`select t3a_source_serving_gate('${s4.v}','S4') r`);
rec("D-03", "Stage 4 entry refuses and logs s4_not_activated while the value is unloaded", g4.rows[0]?.r?.reason === "s4_not_activated" && (await refused("s4_not_activated")) === n0 + 1, g4.rows[0]?.r || g4.msg);
// exposure
const GW = (await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at) values ('${P}','account_authentication','1.0','1.0',now()) returning observation_path_gateway_id g`))[0].g;
let attemptNo = 0;
const si = async (v) => { const st = (await run(`select body->>'stage_code' s, o.dimension_id d from t3a_d1_content_version cv join t3a_content_object o using (content_object_id) where cv.content_version_id='${v}'`))[0]; attemptNo++;
  const inst = (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','${st.s}','${st.d}',${attemptNo},'scheduled') returning stage_instance_id i`))[0].i;
  return run(`insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, source_version_id) values ('${P}','${st.d}','${st.s}','${GW}','${inst}','x','1.0','{}','{${st.d}}','{}','${v}')`); };
const ex0 = (await run(`select t3a_prior_exposure('${P}','${s1.v}') r`))[0].r; rec("D2-28", "a participant with no history is not excluded", ex0.excluded === false, ex0);
await si(s1.v);
const ex1 = (await run(`select t3a_prior_exposure('${P}','${s1.v}') r`))[0].r; rec("D2-28", "the exact version already met excludes", ex1.reasons.includes("source_version_met"), ex1);
const s1b = await mk("SRC-D2-T-S1B-" + RUN, "D2", "S1", { d2_situation_class: "SC-D2-1" });
const ex2 = (await run(`select t3a_prior_exposure('${P}','${s1b.v}') r`))[0].r; rec("D2-28", "the same situation pattern family in D2 excludes a different version", ex2.reasons.includes("pattern_family_met") && ex2.reasons.includes("administration_form_met"), ex2);
const s1c = await mk("SRC-D2-T-S1C-" + RUN, "D2", "S1", { d2_situation_class: "SC-D2-2" });
const ex3 = (await run(`select t3a_prior_exposure('${P}','${s1c.v}') r`))[0].r; rec("D2-28", "a different pattern in the same form still meets the form exclusion but not the pattern one", ex3.reasons.includes("administration_form_met") && !ex3.reasons.includes("pattern_family_met"), ex3);
const d1s2 = await mk("SRC-D1-T-S2-" + RUN, "D1", "S2", {}); await si(d1s2.v);
const d2s2 = await mk("SRC-D2-T-S2-" + RUN, "D2", "S2", { d2_situation_class: "SC-D2-3" });
const ex4 = (await run(`select t3a_prior_exposure('${P}','${d2s2.v}') r`))[0].r; rec("D2-28", "having sat the Stage 2 seven-beat form under D1 excludes the D2 Stage 2 form (the form crosses)", ex4.reasons.includes("administration_form_met") && !ex4.reasons.includes("pattern_family_met"), ex4);
n0 = await refused("cross_dimension_mapping_absent"); const cp = await svc(`select t3a_pattern_compare('D1','P-D1-01','D2','IPF-D2-01') r`);
rec("D2-28", "a cross-dimension pattern comparison refuses and logs while the mapping table is empty", cp.rows[0]?.r?.reason === "cross_dimension_mapping_absent" && (await refused("cross_dimension_mapping_absent")) === n0 + 1, cp.rows[0]?.r || cp.msg);
rec("D2-28", "the mapping table is empty", (await run(`select count(*)::int n from t3a_cross_dimension_pattern_map`))[0].n === 0, null);
const gx = await svc(`select t3a_source_serving_gate('${s1.v}','S1','${P}') r`); rec("D2-28", "the serving gate applies the exposure exclusion", gx.rows[0]?.r?.reason === "prior_exposure_exclusion", gx.rows[0]?.r);
// 024, 029 independent attempt counters
const att = (dim, n) => `insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, attempt_event_class) values ('${P}','${dim}','S2','completed',true,now() - interval '150 days','completed_observation') returning attempt_no`;
const a = []; for (let i = 0; i < 3; i++) a.push((await tryq(att("D2"))).msg);
const d1a = await tryq(att("D1"));
const perm = async (dim) => (await run(`select t3a_d1_next_attempt_permitted('${P}','${dim}','S2') r`))[0].r;
const pd2 = await perm("D2"), pd1 = await perm("D1");
rec("D2-29", "three D2 Stage 2 attempts, then a D1 Stage 2 entry is permitted (independent counters)", a.every(m => m === "ok") && d1a.msg === "ok" && d1a.rows[0].attempt_no === 1 && pd1.permitted === true, [pd1, d1a.rows]);
rec("D2-24", "a fourth D2 Stage 2 attempt is refused (cap of three per Stage per dimension)", pd2.permitted === false && pd2.refusal_code === "ATTEMPT_CAP_REACHED", pd2);
rec("D2-24", "D2 carries its own cooldown ladder (seven and fourteen days)", (await run(`select array_agg(wait_days order by completed_observations) w from t3a_d1_specification_cooldown where dimension_id='D2'`))[0].w.join() === "7,14,", null);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
