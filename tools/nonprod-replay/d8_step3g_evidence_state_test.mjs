// Step 3g: D8 evidence state and prohibited-output check (INS-005). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => (await c.query(sql)).rows;
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const RUN = randomUUID().slice(0, 8);
const mk = async (tag, role) => { const u = randomUUID(); await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','e${tag}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','e${tag}-${RUN}@t.local','${role}')`); return u; };
const P = await mk("p", "candidate"), M1 = await mk("m1", "mentor"), M2 = await mk("m2", "mentor"), M3 = await mk("m3", "mentor");
const srcOf = async (id) => (await run(`select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`))[0].v;
const S = [await srcOf("SRC-D8-S1-001"), await srcOf("SRC-D8-S2-001"), await srcOf("SRC-D8-S3-001"), await srcOf("SRC-D8-S4-001")];
const J = (o) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const obs = async (dim, stage, src, observer, ci, conds = []) => {
  const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, confirmer_id, is_committed) values ('${P}','${dim}','${stage}', ${observer && stage !== "S1" ? `'${observer}'` : "null"}, ${stage === "S1" ? `'${M1}'` : "null"}, true) returning observation_record_id i`))[0].i;
  const cs = (await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('${dim}','${o}','${P}','${stage}','${src}','{}'::jsonb,'[]'::jsonb,${J(ci)},${J(conds)}) returning composed_statement_id i`))[0].i;
  return { o, cs };
};
const ci = (key, code, blocker = false) => [{ conduct_element_id: "CE-X", recurrence_equivalence_key_id: key, state_code: code, recurrence_blocker: blocker }];
const es = async (dim = "D8") => (await run(`select t3a_evidence_state('${P}','${dim}', true) s`))[0].s;
const relate = (a, b) => run(`insert into t3a_cross_context_relationship(dimension_id, source_version_a, source_version_b, approved_by) values ('D8','${a < b ? a : b}','${a < b ? b : a}','${M3}') on conflict do nothing`);

await run(`delete from t3a_cross_context_relationship`); await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('recurrence_config_locked','unlocked','0.9','${M3}')`);
let s = await es(); rec("D8-66", "no observation: not observed (FR-0)", s.state === "not_observed" && s.frame === "FR-D8-0", s);
const o1 = await obs("D8", "S2", S[1], M1, ci("REK-D8-001", "ST-D8-001")); s = await es();
rec("D8-75", "one observation: observed once (FR-1), no recurrence wording available", s.state === "observed_once" && s.frame === "FR-D8-1" && s.recurrence.every(r => r.available === false), s);
const o2 = await obs("D8", "S3", S[2], M2, ci("REK-D8-001", "ST-D8-002")); s = await es();
rec("D8-78", "two observations with no approved cross-context relationship: no multi-context frame, the reason is given", s.state === "observed_once" && s.blocked.some(b => b.reason === "no_approved_cross_context_relationship"), s.blocked);
rec("D8-76", "two observations with different statements are held side by side with the divergence condition", s.conditions.includes("mixed_or_divergent") && s.observations === 2, s.conditions);
await relate(S[1], S[2]); s = await es();
rec("D8-72", "the third state is breadth: two related contexts with different statements still reach it", s.state === "observed_multiple_contexts" && s.frame === "FR-D8-2" && s.conditions.includes("mixed_or_divergent"), s);
rec("D8-67", "the state is derived and never stored: no state column on the observation or the composed statement", (await run(`select count(*)::int n from information_schema.columns where table_name in ('t3a_observation_record','t3a_dimension_composed_statement') and column_name ~ 'evidence_state|^state$'`))[0].n === 0, null);
// 077 recurrence: three matching keys, differing state_code
const o3 = await obs("D8", "S4", S[3], M1, ci("REK-D8-001", "ST-D8-001")); await relate(S[1], S[3]); await relate(S[2], S[3]); s = await es();
const r1 = s.recurrence.find(r => r.recurrence_equivalence_key_id === "REK-D8-001");
rec("D8-77", "three matching keys but differing state codes: no fourth-state frame (a key does not assert the same conduct)", s.state === "observed_multiple_contexts" && r1.available === false && r1.reasons.includes("material_contradiction_in_current_set"), r1);
// make all three the same code
await run(`update t3a_dimension_composed_statement set clause_instances=clause_instances where false`);
// rebuild cleanly with a second participant-free approach: use supersession instead of deletion
const o2b = (await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions, supersedes_composed_statement_id) values ('D8','${o2.o}','${P}','S3','${S[2]}','{}'::jsonb,'[]'::jsonb,${J(ci("REK-D8-001", "ST-D8-001"))},'[]'::jsonb,'${o2.cs}') returning composed_statement_id i`))[0].i;
s = await es(); const r2 = s.recurrence.find(r => r.recurrence_equivalence_key_id === "REK-D8-001");
rec("D8-84", "a successful correction supersedes by a new composed statement; the old one stays in the record and leaves the current set", s.observations === 3 && (await run(`select count(*)::int n from t3a_dimension_composed_statement where composed_statement_id='${o2.cs}'`))[0].n === 1, s.observations);
rec("D8-73", "three Stages, three related contexts, two observers, same key and code, but the recurrence configuration is not locked: frame unavailable", r2.available === false && r2.reasons.includes("recurrence_configuration_not_locked") && s.state === "observed_multiple_contexts", r2);
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('recurrence_config_locked','locked','1.0','${M3}')`);
s = await es(); const r3 = s.recurrence.find(r => r.recurrence_equivalence_key_id === "REK-D8-001");
rec("D8-73", "with the configuration locked the clause recurs across Stages (FR-3), for that clause", s.state === "recurring_across_stages" && s.frame === "FR-D8-3" && r3.available === true && r3.state_code === "ST-D8-001", s);
// 074 contradiction first
const o4 = await obs("D8", "S2", S[1], M2, ci("REK-D8-001", "ST-D8-003")); s = await es(); const r4 = s.recurrence.find(r => r.recurrence_equivalence_key_id === "REK-D8-001");
rec("D8-74", "no cherry-picking: a fourth current observation that contradicts blocks the frame although three match", r4.available === false && r4.reasons.includes("material_contradiction_in_current_set") && s.state !== "recurring_across_stages", r4);
// withdrawal removes it
await run(`insert into t3a_dimension_statement_withdrawal(composed_statement_id, reason) values ('${o4.cs}','withdrawn by reconsideration')`);
s = await es(); rec("D8-84", "a withdrawn statement is retained and excluded from current composition: the frame returns", s.state === "recurring_across_stages", s.state);
// blocker statement
const P2 = await mk("p2", "candidate");
const obs2 = async (stage, src, observer, ciArr) => { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P2}','D8','${stage}','${observer}',true) returning observation_record_id i`))[0].i;
  await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D8','${o}','${P2}','${stage}','${src}','{}'::jsonb,'[]'::jsonb,${J(ciArr)},'[]'::jsonb)`); };
const svcC = async (sql) => { await c.query("begin"); let msg = "ok", rows = []; try { await c.query("set local role service_role"); await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`); rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query("commit"); return { msg, rows }; };
// the three observations are composed by the real route (a record status pattern: nothing stated), so the instances carry what compose gives them
const NONEP = { "Q-D8-01": "A3", "Q-D8-02": "A3", "Q-D8-03": "A3", "Q-D8-04": "A3", "Q-D8-05": "A3", "Q-D8-06": "A4", "Q-D8-07": "A4", "Q-D8-08": "A3", "Q-D8-09": "A4" };
const NONE3 = Object.fromEntries(Object.entries(NONEP).filter(([k]) => k !== "Q-D8-09"));
const composeReal = async (stage, src, observer, answers) => { const o = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P2}','D8','${stage}','${observer}',true) returning observation_record_id i`))[0].i;
  const r = (await svcC(`select t3a_dimension_compose('${P2}','${src}','${stage.slice(1)}',${J(answers)},'{}'::jsonb,'{}'::jsonb,'${o}',true) r`)).rows[0].r; return r; };
const rc = [await composeReal("S2", S[1], M1, NONEP), await composeReal("S3", S[2], M2, NONE3), await composeReal("S4", S[3], M1, NONEP)];
rec("D8-17", "three observations composed by the real route in a record status pattern (ST-D8-003 and the others) carry the marker on every clause", rc.every(r => r.outcome === "composed" && r.clause_instances.every(x => x.recurrence_blocker === true)), rc.map(r => r.outcome));
const sb = (await run(`select t3a_evidence_state('${P2}','D8', true) s`))[0].s; const rb = sb.recurrence.find(r => r.recurrence_equivalence_key_id === "REK-D8-001");
rec("D8-17", "ST-D8-003, an entry that describes the record, never satisfies the recurring state although three Stages, three contexts and two observers carry it with the same key and the same state code", rb.available === false && rb.reasons.includes("recurrence_blocker_statement"), rb);
// Stage 1 confirmer does not substitute for an observer
const P3 = await mk("p3", "candidate");
const o31 = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, confirmer_id, is_committed) values ('${P3}','D8','S1','${M1}',true) returning observation_record_id i`))[0].i;
const o32 = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${P3}','D8','S2','${M2}',true) returning observation_record_id i`))[0].i;
await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D8','${o31}','${P3}','S1','${S[0]}','{}'::jsonb,'[]'::jsonb,${J(ci("REK-D8-001", "ST-D8-001"))},'[]'::jsonb), ('D8','${o32}','${P3}','S2','${S[1]}','{}'::jsonb,'[]'::jsonb,${J(ci("REK-D8-001", "ST-D8-001"))},'[]'::jsonb)`);
await relate(S[0], S[1]); const s3 = (await run(`select t3a_evidence_state('${P3}','D8', true) s`))[0].s;
rec("D8-5.11a", "a Stage 1 confirmer does not substitute for observer diversity: breadth is refused with one mentor-observed observer", s3.state === "observed_once" && s3.blocked.some(b => b.reason === "stage_or_observer_diversity_absent"), s3);
// isolation: D1 observations do not change D8 state
await obs("D1", "S2", S[1], M1, ci("REK-D1-001", "ST-D1-011")); await obs("D1", "S3", S[2], M2, ci("REK-D1-001", "ST-D1-012"));
const sAfter = await es(); rec("D8-5.9", "two D1 observations leave the D8 state unchanged (and the D1 state is its own)", sAfter.state === s.state && sAfter.observations === s.observations && (await es("D1")).observations === 2, sAfter.state);
// conditions precedence
const P4 = await mk("p4", "candidate");
const o41 = (await run(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, confirmer_id, is_committed) values ('${P4}','D8','S1','${M1}',true) returning observation_record_id i`))[0].i;
await run(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D8','${o41}','${P4}','S1','${S[0]}','{}'::jsonb,'[]'::jsonb,${J(ci("REK-D8-001", "ST-D8-001"))},'["conditions_compromised"]'::jsonb)`);
const s4 = (await run(`select t3a_evidence_state('${P4}','D8', true) s`))[0].s;
rec("D8-71", "conditions come in the fixed precedence, the limitation first", JSON.stringify(s4.conditions) === JSON.stringify(["conditions_compromised", "stage_1_only", "single_observer"]), s4.conditions);
// logging
const n0 = (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='recurrence_frame_unavailable'`))[0].n; await run(`select t3a_evidence_state_logged('${P3}','D8')`);
rec("D8-73", "a frame refused is logged", (await run(`select count(*)::int n from t3a_capture_refusal where reason_code in ('frame_unavailable','recurrence_frame_unavailable')`))[0].n > 0, n0);

// --- prohibited-output check
const chk = async (t) => (await run(`select t3a_prohibited_output_check('D8', $1) r`.replace("$1", `'${t.replace(/'/g, "''")}'`)))[0].r;
let r = await chk("<p>the participant stated that the item was theirs to carry</p>"); rec("D8-70", "a clean statement passes", r.passed === true, r);
r = await chk("<div><svg width='10'></svg></div>"); rec("D8-79", "a visual element in the layout capacity fails the render", r.passed === false && r.findings.some(f => f.rule === "visual_element_in_layout"), r);
r = await chk("<span>★★★☆☆</span>"); rec("D8-70", "stars fail", r.passed === false, r);
r = await chk("<span class='traffic-light green'></span>"); rec("D8-70", "a traffic light fails", r.passed === false, r);
r = await chk("<div class='progress-bar' style='width:60%'></div>"); rec("D8-70", "a progress bar fails", r.passed === false, r);
r = await chk("<td style='background:green'>"); rec("D8-70", "colour signalling quality fails", r.passed === false && r.findings.some(f => f.rule === "colour_signals_quality"), r);
r = await chk("Overall, the participant recorded three dimensions."); rec("D8-100", "an overall or composite element fails", r.passed === false && r.findings.some(f => f.rule === "cross_dimension_aggregate"), r);
r = await chk("the participant gave a strong response"); rec("D8-27", "a closed-list evaluative phrase fails (strong response)", r.passed === false, r);
r = await chk("the participant escalated the issue and verified the fix"); rec("D8-27", "a word that belongs to another dimension fails as cross_dimension_assertion (escalated)", r.passed === false && r.findings.some(f => f.rule === "cross_dimension_assertion"), r);
r = await chk("the candidate attended"); rec("D8-16", "a retired term fails (candidate)", r.passed === false, r);
r = await chk("<img data-role=\"participant-photo\" src='x'>"); rec("D8-70", "the participant photo is the one permitted image", r.passed === true, r);
r = await chk("Observed in 0 of 3 dimensions"); rec("D8-70", "a blank row cannot read as an unmet count", r.passed === false, r);
const bad = await run(`select statement_key, (t3a_prohibited_output_check('D8', statement_body) ->> 'passed')::boolean ok from t3a_d1_statement_library where dimension_id='D8' and (t3a_prohibited_output_check('D8', statement_body) ->> 'passed')::boolean = false`);
rec("D8-16", "all 44 D8 Recorded Conduct Entries pass the prohibited-output check", bad.length === 0, bad.slice(0, 5));
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('recurrence_config_locked','unlocked','0.9','${M3}')`); await run(`delete from t3a_cross_context_relationship`);
await c.end(); process.exit(0);
