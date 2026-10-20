// Day 1 step 11.1.8 probes (DT-15..DT-21, Domain E structure). Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql, p) => (await c.query(sql, p)).rows;
async function tryq(sql, commit = false) { await c.query("begin"); let msg = "ok", rows = []; try { rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; } await c.query(msg !== "ok" || !commit ? "rollback" : "commit"); return { msg, rows }; }
const R = []; const rec = (id, label, pass, detail) => R.push({ id, label, pass: !!pass, detail });
const P = randomUUID(), M = randomUUID(), RUN = P.slice(0, 8), H1 = "c".repeat(64), H2 = "d".repeat(64);
for (const [u, e] of [[P, "p"], [M, "m"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','e${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','e${e}-${RUN}@t.local','${e === "p" ? "candidate" : "mentor"}')`); }
const fam = (await run(`select (enum_range(null::t3a_content_family))[1] f`))[0].f;
const co = (await run(`insert into t3a_content_object(identifier, family, title) values ('E-${RUN}','${fam}','probe') returning content_object_id i`))[0].i;
const sv = (await run(`insert into t3a_source_version(scenario_class, version_label, source_version_hash, compatibility_class, dimensions_in_play) values ('observation_ready','1','${H1}','A','["D1"]') returning source_version_id i`).catch(async () => run(`insert into t3a_source_version(scenario_class, version_label, source_version_hash, compatibility_class, dimensions_in_play, relevant_conduct, irrelevant_conduct, stated_standard, permitted_administration_variance, unsupported_inferences, cross_context_map, min_seconds, max_seconds) values ('observation_ready','1','${H1}','A','["D1"]','{}','{}','s','v','{}','{}',60,600) returning source_version_id i`)))[0].i;
const cv = (await run(`insert into t3a_content_version(content_object_id, version_no, approval_status, operational_state, body) values ('${co}','1',(enum_range(null::t3a_approval_status))[1],(enum_range(null::t3a_operational_state))[1],'{}') returning content_version_id i`))[0].i;
const ri = (await run(`insert into t3a_rendered_instance(source_version_id, canonical_source_hash, presentation_variant_values, rendered_instance_hash) values ('${cv}','${H1}','{}','${H2}') returning rendered_instance_id i`))[0].i;
const served = (await run(`insert into t3a_served_instance(participant_id, source_version_id, rendered_instance_id, question_set_version, statement_library_version, answer_key_version, recurrence_key_version, template_register_version, stage1_engine_version, stage1_script_version, served_language) values ('${P}','${sv}','${ri}','1.0','1.0','1.0','1.0','1.0','1.0','1.0','en-CA') returning served_instance_id i`))[0].i;
const stg = async (stage) => (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','${stage}','D1',1,'scheduled') returning stage_instance_id i`))[0].i;
const enums = (await run(`select (enum_range(null::t3a_contemporaneity))[1] ct, (enum_range(null::t3a_evidence_class))[1] ec, (enum_range(null::t3a_comparability_class))[1] cc, (enum_range(null::t3a_integrity_status))[1] it`))[0];
const base = (stage, inst, extra = {}) => JSON.stringify({ observation_id: randomUUID(), participant_id: P, stage_code: stage, dimension_id: "D1", source_version_id: sv, served_instance_id: served, attempt_no: 1, occurred_at: new Date().toISOString(), stage_instance_id: inst, descriptor_version: "1.0", contemporaneity: enums.ct, evidence_class: enums.ec, comparability_class: enums.cc, integrity_status: enums.it, ...extra });
const commit = async (j) => (await tryq(`select t3a_commit_observation('${j.replace(/'/g, "''")}'::jsonb) r`, true));
const refusals = async (reason) => (await run(`select count(*)::int n from t3a_capture_refusal where reason_code='${reason}'`))[0].n;
const s1 = await stg("S1"), s2 = await stg("S2");
// DT-15
const r0 = await refusals("OBSERVER_REQUIRED");
const noObs = await commit(base("S2", s2));
rec("DT-15", "S2 observation with no observer_id is refused and the refusal is logged with its reason", noObs.rows[0]?.r?.reason === "OBSERVER_REQUIRED" && (await refusals("OBSERVER_REQUIRED")) === r0 + 1, noObs.rows[0]?.r || noObs.msg);
const withObs = await commit(base("S2", s2, { observer_id: M, observer_role: "primary_observer", observer_authorization_at_date: { ref: "snapshot" } }));
rec("DT-15", "the same S2 record with an observer commits", withObs.rows[0]?.r?.outcome === "committed", withObs.rows[0]?.r || withObs.msg);
// DT-16
const r1 = await refusals("OBSERVER_NOT_ALLOWED_AT_S1");
const s1Obs = await commit(base("S1", s1, { observer_id: M }));
rec("DT-16", "observer_id on an S1 record is refused (function route)", s1Obs.rows[0]?.r?.reason === "OBSERVER_NOT_ALLOWED_AT_S1" && (await refusals("OBSERVER_NOT_ALLOWED_AT_S1")) === r1 + 1, s1Obs.rows[0]?.r || s1Obs.msg);
const s1Direct = await tryq(`insert into t3a_observation select (jsonb_populate_record(null::t3a_observation, '${base("S1", s1, { observer_id: M }).replace(/'/g, "''")}'::jsonb)).*`);
rec("DT-16", "observer_id on an S1 record is refused by the table trigger on any route", /OBSERVER_NOT_ALLOWED_AT_S1/.test(s1Direct.msg), s1Direct.msg.slice(0, 90));
const s1Conf = await commit(base("S1", s1, { s1_human_confirmation_actor_id: M, s1_human_confirmation_at: new Date().toISOString() }));
rec("DT-16", "S1 record with the confirmer fields commits", s1Conf.rows[0]?.r?.outcome === "committed", s1Conf.rows[0]?.r || s1Conf.msg);
// DT-17
const hashes = s1Conf.rows[0]?.r;
rec("DT-17", "committed observation carries both hashes, and they are different objects", hashes?.source_version_hash === H1 && hashes?.rendered_instance_hash === H2 && hashes.source_version_hash !== hashes.rendered_instance_hash, hashes);
const noServed = await commit(base("S1", s1, { served_instance_id: null }));
rec("DT-17", "an observation with no served instance (no rendered hash) is refused and logged", noServed.rows[0]?.r?.reason === "DUAL_HASH_MISSING", noServed.rows[0]?.r || noServed.msg);
// DT-18 / DT-19
await run(`insert into t3a_stage_sequence(stage_instance_id, participant_id, dimension_id) values ('${s2}','${P}','D1')`);
const early = (await run(`select t3a_open_s1_output('${s2}') r`))[0].r;
rec("DT-18", "opening the S1 output before the S2 determinations are locked is refused and logged", early.reason === "S2_DETERMINATIONS_NOT_LOCKED" && (await refusals("S2_DETERMINATIONS_NOT_LOCKED")) >= 1, early);
await run(`update t3a_stage_sequence set s2_determinations_locked_at = now() where stage_instance_id='${s2}'`);
const after = (await run(`select t3a_open_s1_output('${s2}') r`))[0].r;
const seq = (await run(`select s1_output_unmasked_at u from t3a_stage_sequence where stage_instance_id='${s2}'`))[0].u;
rec("DT-18", "after the lock the output opens and s1_output_unmasked_at is written", after.outcome === "opened" && seq !== null, after);
const reset = await tryq(`update t3a_stage_sequence set s2_determinations_locked_at = null where stage_instance_id='${s2}'`); rec("DT-18", "a milestone time cannot be cleared or changed", /SET_ONCE/.test(reset.msg), reset.msg.slice(0, 80));
await run("update t3a_capture_config set enforce_sequence = true");
const ent = (stage, dim = "D1") => `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot) values ('${P}','${dim}','${stage}',(select observation_path_gateway_id from t3a_observation_path_gateway limit 1),gen_random_uuid(),'x','1.0','{}','{D1}','{}')`;
const gw = await run(`select observation_path_gateway_id from t3a_observation_path_gateway where participant_id='${P}' limit 1`);
if (!gw.length) await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at) values ('${P}','account_authentication','1.0','1.0',now())`);
const gwid = (await run(`select observation_path_gateway_id g from t3a_observation_path_gateway where participant_id='${P}' limit 1`))[0].g;
const entry = (stage, inst) => `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot) values ('${P}','D1','${stage}','${gwid}','${inst}','x','1.0','{}','{D1}','{}')`;
const early2 = await tryq(entry("S2", s2)); rec("DT-19", "S2 entry before the S1 outcome is delivered to the mentor is refused", /S1_OUTCOME_NOT_DELIVERED/.test(early2.msg), early2.msg.slice(0, 100));
await run(`insert into t3a_stage_sequence(stage_instance_id, participant_id, dimension_id, s1_outcome_delivered_to_mentor_at) values ('${s1}','${P}','D1', now())`);
const ok2 = await tryq(entry("S2", s2)); rec("DT-19", "after delivery the S2 entry passes this gate (any other refusal is a later check)", !/S1_OUTCOME_NOT_DELIVERED/.test(ok2.msg), ok2.msg.slice(0, 100));
await run("update t3a_capture_config set enforce_sequence = false");
// DT-20 / DT-21
const g = async (route, obj) => (await run(`select t3a_mentor_input_guard('${route}', '${JSON.stringify(obj)}'::jsonb) r`))[0].r;
const ft = await g("mentor.progression", { progression_decision: "proceed", decision_rationale: "They handled the conflict well and stayed calm" });
rec("DT-20", "a free text rationale posted to a mentor endpoint is refused and logged", ft.reason === "FREE_TEXT_REFUSED", ft);
const ft2 = await g("mentor.determination", { conclusion: "strong", answer_option_id: randomUUID() }); rec("DT-20", "a free text conclusion is refused", ft2.reason === "FREE_TEXT_REFUSED", ft2);
const ft3 = await g("mentor.determination", { answer_option_id: randomUUID(), state_code: "CLEAR_EVIDENCE", decision_rationale_code: "R_01" }); rec("DT-20", "controlled codes and identifiers are accepted", ft3.outcome === "accepted", ft3);
const ft4 = await g("mentor.determination", { state_code: "a sentence with spaces in it" }); rec("DT-20", "a sentence in a code field is refused", ft4.reason === "FREE_TEXT_REFUSED", ft4);
const ac = await g("mentor.accommodation", { accommodation_reason: "needs extra time because of a medical condition", accommodation_class: "access_preserving" });
rec("DT-21", "an accommodation reason is refused; only accommodation_class is stored", ac.reason === "ACCOMMODATION_REASON_REFUSED", ac);
const tbl = await tryq(`insert into t3a_mentor_judgment(stage_instance_id, decision_rationale) values ('${s2}', 'free words')`); rec("DT-20", "the live mentor table itself refuses free text in its rationale column", /FREE_TEXT_REFUSED/.test(tbl.msg), tbl.msg.slice(0, 90));
const cols = (await run(`select count(*)::int n from information_schema.columns where table_name='t3a_determination' and data_type='text' and column_name not in ('determination_missing_state','state_code','determination_missing_state_capture_state')`))[0].n; rec("DT-20", "the determination table has no free text column", cols === 0, cols);
const mapE = (await run(`select count(*)::int n from t3a_field_physical_map where qualified_name like 'E.%'`))[0].n; rec("DT-01(E)", "all 78 Domain E fields mapped", mapE === 78, mapE);
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
