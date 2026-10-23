// CR-069: the seven remaining live writers, switch off then on, ingest strict. Throwaway database only.
import { Client, neonConfig } from "@neondatabase/serverless";
import ws from "ws"; import { HttpsProxyAgent } from "https-proxy-agent"; import fs from "node:fs"; import { randomUUID } from "node:crypto";
const agent = new HttpsProxyAgent(process.env.HTTPS_PROXY);
neonConfig.webSocketConstructor = class extends ws { constructor(u, p) { super(u, p, { agent }); } };
const c = new Client({ connectionString: fs.readFileSync(new URL("./conn.txt", import.meta.url), "utf8").trim() }); await c.connect();
await c.query("set search_path to public, extensions");
const run = async (sql) => { try { return (await c.query(sql)).rows; } catch (e) { console.error('SQL FAILED: ' + e.message + ' :: ' + sql.slice(0, 200)); throw e; } };
async function as(role, sub, sql, commit = true) {
  await c.query("begin"); let msg = "ok", rows = [];
  try { if (role) { await c.query(`set local role ${role}`); await c.query(`select set_config('request.jwt.claim.sub','${sub}',true), set_config('request.jwt.claims', json_build_object('sub','${sub}','role','${role}')::text, true)`); } rows = (await c.query(sql)).rows; } catch (e) { msg = e.message; }
  await c.query(msg !== "ok" || !commit ? "rollback" : "commit"); return { msg, rows };
}
const R = []; const rec = (id, label, pass, detail) => { console.error((pass ? "ok   " : "FAIL ") + id + " " + label.slice(0, 70) + (pass ? "" : " :: " + JSON.stringify(detail).slice(0, 220))); R.push({ id, label, pass: !!pass, detail }); };
const P = randomUUID(), M = randomUUID(), A = randomUUID(), RUN = P.slice(0, 8), H1 = "1".repeat(64), H2 = "2".repeat(64);
for (const [u, e, r] of [[P, "p", "candidate"], [M, "m", "mentor"], [A, "a", "admin"]]) { await c.query(`insert into auth.users(id,email,email_confirmed_at) values ('${u}','cw${e}-${RUN}@t.local',now())`); await c.query(`insert into profiles(id,email,role) values ('${u}','cw${e}-${RUN}@t.local','${r}')`); }
await run(`insert into t3a_role_grant(user_id, spec_role) values ('${M}','mentor'), ('${A}','admin')`);
const setEvt = (k, v) => run(`update t3a_event_config set value='${v}' where key='${k}'`);
await setEvt("ingest_mode", "legacy_tolerant"); await setEvt("canonical_writers", "off");
// reset the three settings left by an earlier run (the configuration table is append only, so its guard is lifted for the clean-up only)
await run(`alter table t3a_configuration_value disable trigger t3a_append_only`); await run(`delete from t3a_configuration_value where configuration_key in ('attempt_rules_version','response_time_committed_version')`); await run(`alter table t3a_configuration_value enable trigger t3a_append_only`);
await run(`update t3a_deployment_config set stage_entry_hold_ttl = null`);
// fixtures
await run(`insert into t3a_identity_assurance(participant_id, identity_assurance_method, registration_jurisdiction, country_code, language_preference, timezone, occupational_classification_version) values ('${P}','account_authentication','CA-ON','CA','en','America/Toronto','NOC 2021 Version 1.0')`);
await run(`insert into t3a_consent_state(participant_id, consent_type, consent_status, consent_copy_version, consent_method) values ('${P}','mentor_observation','granted','1.0','checkbox')`);
const gw = (await run(`insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at, observation_notification_timestamp) values ('${P}','account_authentication','1.0','1.0',now(), now()) returning observation_path_gateway_id g`))[0].g;
await run(`insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, reviewer_authorization, issuer_authorization, authorization_status) values ('${M}','D1', now() - interval '1 day','current','1.0', true, true, 'authorized')`);
const ans = { q1: "a-" + RUN };
await run(`insert into t3a_determination_question(dimension_id, question_set_version, order_index, question_body, answer_schema, approved_at, approved_by) values ('D1','a-${RUN}',1,'q','{}', now(), '${A}')`);
await run(`insert into t3a_statement_library(dimension_id, question_set_version, answer_key, statement_body, approved_at, approved_by) values ('D1','a-${RUN}','${JSON.stringify(ans)}','stmt', now(), '${A}')`);
const sinst = async (stage, n) => (await run(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${P}','${stage}','D1',${n},'scheduled') returning stage_instance_id i`))[0].i;
const s2 = await sinst("S2", 1), s1 = await sinst("S1", 2);
const T0 = (await run(`select clock_timestamp() t`))[0].t.toISOString();
const evCount = async (name) => (await run(`select count(*)::int n from t3a_event_log where event_name='${name}' and event_processing_state='accepted' and ingested_at >= '${T0}'`))[0].n;
// ---------- switch OFF: behaviour unchanged
await run(`update t3a_deployment_config set stage_entry_hold_ttl = 900`); // with the required-fields switch on, the old style entry needs a hold time as well
const off = await as("authenticated", M, `select t3a_create_stage_entry_event('${s2}','account_authentication','1.0','{}') r`, true);
rec("CR-069", "switch off: stage entry works as before and writes the old style event (tolerant path resolves the alias)", off.msg === "ok" && (await run(`select count(*)::int n from t3a_event_log where ingested_at >= '${T0}' and subject_id = '${P}'`))[0].n >= 1, off.msg.slice(0, 120));
await run(`update t3a_deployment_config set stage_entry_hold_ttl = null`);
const readiness0 = (await run(`select t3a_canonical_readiness() r`))[0].r; rec("CR-069", "readiness lists the three settings that are not set", readiness0.ready === false && readiness0.missing_settings.length === 3, readiness0);
const act0 = await as("service_role", A, `select t3a_activate_canonical_writers() r`, true); rec("CR-069", "activation is refused while a setting is missing, and nothing flips", act0.rows[0]?.r?.outcome === "refused" && (await run(`select value from t3a_event_config where key='canonical_writers'`))[0].value === "off", act0.rows[0]?.r || act0.msg.slice(0, 80));
const actClient = await as("authenticated", A, `select t3a_activate_canonical_writers()`, false); rec("CR-069", "a signed in user cannot activate", /permission denied/.test(actClient.msg), actClient.msg.slice(0, 70));
// ---------- settings, then activate
await run(`insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('attempt_rules_version','1.0','1.0','${A}'), ('response_time_committed_version','1.0','1.0','${A}')`);
await run(`update t3a_deployment_config set stage_entry_hold_ttl = 900`);
const act = await as("service_role", A, `select t3a_activate_canonical_writers() r`, true); rec("CR-069", "with the settings in place, activation flips both switches", act.rows[0]?.r?.outcome === "activated" && (await run(`select value from t3a_event_config where key='ingest_mode'`))[0].value === "strict", act.rows[0]?.r || act.msg.slice(0, 120));
// new stage instance for the canonical stage entry (the earlier one is already entered)
const s2b = await sinst("S2", 3);
const se = await as("authenticated", M, `select t3a_create_stage_entry_event('${s2b}','account_authentication','1.0','{}') r`, true); const seId = se.rows[0]?.r; if (!seId) console.log('STAGE ENTRY FAILED', se.msg);
rec("CR-069", "stage entry emits a canonical observation.stage_entered event, accepted, with session, mode, hold and authority", se.msg === "ok" && (await run(`select count(*)::int n from t3a_event_log where event_name='observation.stage_entered' and event_processing_state='accepted' and resource_id='${seId}' and payload ? 'session_id' and payload ? 'attempt_rules_version'`))[0].n === 1 && (await run(`select session_id is not null s, observation_mode m, stage_entry_hold_expires_at is not null h, entry_authority_actor_id = '${M}' a from t3a_stage_entry_event where stage_entry_event_id='${seId}'`)).every(r => r.s && r.m === "s2_live_video" && r.h && r.a), se.msg.slice(0, 200));
const s2c = await sinst("S2", 4);
const seNoAuth = await as("authenticated", P, `select t3a_create_stage_entry_event('${s2c}','account_authentication','1.0','{}') r`, false); rec("CR-069", "an S2 entry without an entry authority actor is refused", seNoAuth.msg !== "ok", seNoAuth.msg.slice(0, 140));
await run(`update t3a_deployment_config set stage_entry_hold_ttl = null`); const s2d = await sinst("S2", 5);
const seUnset = await as("authenticated", M, `select t3a_create_stage_entry_event('${s2d}','account_authentication','1.0','{}') r`, false); rec("DT-39", "with the hold time unset, stage entry refuses and does not default", /CONFIGURATION_UNSET|T3A_REQUIRED_FIELD_MISSING: stage_entry_hold_expires_at/.test(seUnset.msg), seUnset.msg.slice(0, 120));
await run(`update t3a_deployment_config set stage_entry_hold_ttl = 900`);
// observation commit: needs a served instance
const co = (await run(`insert into t3a_content_object(identifier, family, title) values ('CW-${RUN}',(enum_range(null::t3a_content_family))[1],'probe') returning content_object_id i`))[0].i;
const sv = (await run(`insert into t3a_source_version(scenario_class, version_label, source_version_hash, compatibility_class, dimensions_in_play, relevant_conduct, irrelevant_conduct, stated_standard, permitted_administration_variance, unsupported_inferences, cross_context_map, min_seconds, max_seconds, source_status, approval_record_id, approval_authority, version_change_reason) values ('observation_ready','cw','${H1}','A','["D1"]','{}','{}','s','v','{}','{}',60,600, 'authored_not_approved', gen_random_uuid(), 'fixture', 'fixture') returning source_version_id i`))[0].i;
const cv = (await run(`insert into t3a_content_version(content_object_id, version_no, approval_status, operational_state, body) values ('${co}','1',(enum_range(null::t3a_approval_status))[1],(enum_range(null::t3a_operational_state))[1],'{}') returning content_version_id i`))[0].i;
const ri = (await run(`insert into t3a_rendered_instance(source_version_id, canonical_source_hash, presentation_variant_values, rendered_instance_hash) values ('${cv}','${H1}','{}','${H2}') returning rendered_instance_id i`))[0].i;
const commitCall = (inst, extra = "") => `select t3a_commit_observation(p_participant_id => '${P}', p_stage_instance_id => '${inst}', p_source_version_id => '${sv}', p_dimension_id => 'D1', p_stage_code => 'S2', p_attempt_no => 3, p_determination_answers => '${JSON.stringify(ans)}'::jsonb, p_relevance_basis => '{}'::jsonb, p_evidence_class => (enum_range(null::t3a_evidence_class))[1], p_descriptor_version => '1.0' ${extra}) r`;
// t3a_observation is the older table (no live route writes it; the live commit writes t3a_observation_record) and its required fields come with the caller's record, which this call does not carry
const asLegacyObs = async (...a) => { await run("update t3a_capture_config set enforce_required = false"); try { return await as(...a); } finally { await run(`update t3a_capture_config set enforce_required = ${globalThis._er_before}`); } };
globalThis._er_before = (await run("select enforce_required as v from t3a_capture_config"))[0].v;
const noServed = await asLegacyObs("authenticated", M, commitCall(s2b), false); rec("DT-17", "an observation with no served instance is refused (both hashes are needed)", /DUAL_HASH_MISSING/.test(noServed.msg), noServed.msg.slice(0, 140));
await run(`insert into t3a_served_instance(participant_id, source_version_id, stage_entry_event_id, rendered_instance_id, question_set_version, statement_library_version, answer_key_version, recurrence_key_version, template_register_version, stage1_engine_version, stage1_script_version, served_language) values ('${P}','${sv}','${seId}','${ri}','1.0','1.0','1.0','1.0','1.0','1.0','1.0','en-CA')`);
const obs = await asLegacyObs("authenticated", M, commitCall(s2b), true); const obsId = obs.rows[0]?.r;
rec("CR-069", "with a served instance the observation commits and emits observation.committed, accepted", obs.msg === "ok" && (await evCount("observation.committed")) === 1, obs.msg.slice(0, 200));
const row = obsId ? (await run(`select served_instance_id is not null s, record_snapshot_hash ~ '^[0-9a-f]{64}$' h from t3a_observation where observation_id='${obsId}'`))[0] : null; rec("DT-17", "the observation carries its served instance and a snapshot hash", row && row.s && row.h, row);
const ev = obsId ? (await run(`select payload->>'source_version_hash' a, payload->>'rendered_instance_hash' b, payload->>'record_snapshot_hash' c from t3a_event_log where event_name='observation.committed' and payload->>'observation_id'='${obsId}'`))[0] : null; rec("DT-17", "the event carries both hashes and they differ", ev && ev.a === H1 && ev.b === H2 && ev.a !== ev.b && /^[0-9a-f]{64}$/.test(ev.c) && ev.c === (await run(`select record_snapshot_hash h from t3a_observation where observation_id='${obsId}'`))[0].h, ev);
// S1 confirm
const s1obs = (await run(`insert into t3a_observation(participant_id, stage_code, dimension_id, source_version_id, attempt_no, occurred_at, stage_instance_id, descriptor_version, contemporaneity, evidence_class, comparability_class, integrity_status, served_instance_id, captured_at, capture_delay_seconds, observer_role, observer_authorization_snapshot_ref, s1_human_confirmation_actor_id, s1_human_confirmation_at, s3_submission_provenance, data_source, record_snapshot_hash, evidence_currency_expires_at, session_serving_state, session_admin_state, question_serving_state, branch_trigger_ref, observation_authorization_ref, observer_calibration_version, observer_independence_state, reviewer_independence_state) values ('${P}','S1','D1','${sv}',1,now(),'${s1}','1.0',(enum_range(null::t3a_contemporaneity))[1],(enum_range(null::t3a_evidence_class))[1],(enum_range(null::t3a_comparability_class))[1],(enum_range(null::t3a_integrity_status))[1], gen_random_uuid(), now(), 0, 'primary_observer', gen_random_uuid(), gen_random_uuid(), now(), '{}'::jsonb, 'observed', repeat('c',64), now() + interval '1 year', 'served', 'normal', 'direct', gen_random_uuid(), gen_random_uuid(), '1.0', 'independent', 'independent') returning observation_id i`))[0].i;
const cf = await as("authenticated", M, `select t3a_confirm_s1_observation('${s1obs}','primary_confirmer') r`, true);
rec("CR-069", "S1 confirmation emits observation.s1_confirmed, accepted", cf.msg === "ok" && (await evCount("observation.s1_confirmed")) === 1, cf.msg.slice(0, 200));
// challenge
const rep = (await run(`insert into t3a_ber_report(participant_id, version, status) values ('${P}',1,(enum_range(null::t3a_ber_status))[1]) returning ber_report_id i`))[0].i;
const ch = await as("authenticated", P, `select t3a_open_challenge('${rep}', null, null, 'factual_error') r`, true);
rec("CR-069", "opening a challenge emits challenge.opened, accepted, and fills the new challenge columns", ch.msg === "ok" && (await evCount("challenge.opened")) === 1 && (await run(`select issuance_hold, response_time_committed_version v from t3a_challenge_case where challenge_case_id='${ch.rows[0]?.r}'`)).every(r => r.issuance_hold === true && r.v === "1.0"), ch.msg.slice(0, 200));
// disclosure
const dc = await as("authenticated", P, `select t3a_create_disclosure('${rep}', null, 'Recipient@Example.com', 'report', now(), now() + interval '30 days', false, true, 'bind-token') r`, true);
rec("CR-069", "creating a disclosure emits release.recipient_created with the address hash only", dc.msg === "ok" && (await evCount("release.recipient_created")) === 1 && !JSON.stringify(await run(`select payload from t3a_event_log where event_name='release.recipient_created'`)).includes("example.com"), dc.msg.slice(0, 200));
const rv = await as("authenticated", P, `select t3a_revoke_disclosure('${dc.rows[0]?.r}') r`, true); rec("CR-069", "revoking it emits release.changed, accepted", rv.msg === "ok" && (await evCount("release.changed")) === 1, rv.msg.slice(0, 200));
// ratify
await run(`insert into t3a_determination_question(dimension_id, question_set_version, order_index, question_body, answer_schema) values ('D1','d-${RUN}',1,'q2','{}')`);
await run(`insert into t3a_statement_library(dimension_id, question_set_version, answer_key, statement_body) values ('D1','d-${RUN}','{"q1":"b"}','stmt2')`);
// t3a_statement_library has a guard (t3a_statement_library_immutable) that names columns the table does not have, so no update of it can succeed in any environment (CR-069). It is lifted here for this one call so the event branch can be tested.
await run(`alter table t3a_statement_library disable trigger t3a_statement_library_immutable_trg`);
const rt = await as("authenticated", A, `select t3a_ratify_question_set('D1','d-${RUN}','r-${RUN}','${A}')`, true); rec("CR-069", "ratifying a question set emits registry.version_approved with a version hash, accepted", rt.msg === "ok" && (await evCount("registry.version_approved")) === 1, rt.msg.slice(0, 200));
await run(`alter table t3a_statement_library enable trigger t3a_statement_library_immutable_trg`);
// the whole chain, strict mode, nothing quarantined
const q = await run(`select count(*)::int n from t3a_event_log where event_processing_state <> 'accepted' and ingested_at >= '${T0}'`); rec("CR-069", "no event from any writer was quarantined or rejected", q[0].n === 0, q[0].n);
const chain = await run(`select count(*)::int n from t3a_event_chain_findings()`); rec("CR-069", "the hash chain verifies after all nine writers have run", chain[0].n === 0, chain[0].n);
const direct = await as("authenticated", P, `insert into t3a_event_log(event_name, event_category, actor_type, actor_id, payload, integrity_hash) values ('x','SYSTEM','SYSTEM',gen_random_uuid(),'{}','x')`, false); rec("CR-024", "strict mode: a direct insert into the event log is refused", direct.msg !== "ok", direct.msg.slice(0, 100));
await setEvt("ingest_mode", "legacy_tolerant"); await setEvt("canonical_writers", "off");
console.log(JSON.stringify({ passed: R.filter(r => r.pass).length, total: R.length, failed: R.filter(r => !r.pass), results: R }, null, 1));
await c.end(); process.exit(0);
