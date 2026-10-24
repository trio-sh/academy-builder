/**
 * CORR-007 CR-31, enforce_required: the routes that open a Stage entry, an attempt, a challenge, an application, a rehearsal and the involvement and
 * progression records insert before they fill every required field, so the required-fields switch would have stopped them. The completion triggers
 * (migration 20270131) fill what the route does not, only while the switch is on and only a field that is still empty. Throwaway database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { confirmStage1, connect, grantConsent, mkParticipant, RUN, run } from "./helpers";

let c: pg.Client; let before = false; let ttl: number | null = null;
beforeAll(async () => {
  c = await connect();
  before = (await run(c, `select enforce_required e from t3a_capture_config`))[0].e;
  ttl = (await run(c, `select stage_entry_hold_ttl t from t3a_deployment_config where singleton`))[0].t;
});
afterAll(async () => {
  await run(c, `update t3a_capture_config set enforce_required = ${before}`);
  await run(c, `update t3a_deployment_config set stage_entry_hold_ttl = ${ttl ?? "null"} where singleton`);
  await c.end();
});
const on = async (hold: number | null = 1800) => { await run(c, `update t3a_capture_config set enforce_required = true`); await run(c, `update t3a_deployment_config set stage_entry_hold_ttl = ${hold ?? "null"} where singleton`); };
const off = () => run(c, `update t3a_capture_config set enforce_required = false`);
const refuses = async (sql: string) => { try { await c.query(sql); return ""; } catch (e: any) { return e.message as string; } };
// each statement is its own transaction scope, so a refusal leaves nothing behind
const gateway = (p: string) => run(c, `insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at) values ('${p}','account_authentication','1.0','1.0',now()) returning observation_path_gateway_id g, observation_notification_timestamp n`).then((r) => r[0]);
const instance = async (p: string, stage: string, d = "D1") => (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${p}','${stage}','${d}',1,'scheduled') returning stage_instance_id i`))[0].i as string;
const entry = (p: string, gw: string, inst: string, stage: string, extra = "") => `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot ${extra ? "," + extra.split("=")[0] : ""}) values ('${p}','D1','${stage}','${gw}','${inst}','x','1.0','{}','{D1}','{}' ${extra ? "," + extra.split("=")[1] : ""}) returning session_id, observation_mode, stage_entry_hold_expires_at, entry_authority_actor_id`;

describe("CR-31 the entry routes' inserts are completed", () => {
  it("T1: the gateway opens with the notification time, and a Stage 1 entry gets a session, its mode and a hold time", async () => {
    await on(); const p = await mkParticipant(c, `c31-a-${RUN}`);
    const g = await gateway(p); expect(g.n).not.toBeNull(); await grantConsent(c, p, "D1");
    const e = (await run(c, entry(p, g.g, await instance(p, "S1"), "S1")))[0];
    expect(e.session_id).not.toBeNull(); expect(e.observation_mode).toBe("s1_deterministic_engine"); expect(e.stage_entry_hold_expires_at).not.toBeNull();
    expect(e.entry_authority_actor_id).toBeNull();
  });
  it("T2: with no hold time configured nothing is invented: the entry refuses by name", async () => {
    await on(null); const p = await mkParticipant(c, `c31-b-${RUN}`); const g = await gateway(p); await grantConsent(c, p, "D1");
    expect(await refuses(entry(p, g.g, await instance(p, "S1"), "S1"))).toMatch(/T3A_REQUIRED_FIELD_MISSING: stage_entry_hold_expires_at/);
  });
  it("T3: a Stage 2 entry still needs an authority actor; a caller who is not a mentor gets none", async () => {
    await on(); const p = await mkParticipant(c, `c31-c-${RUN}`); const g = await gateway(p); await grantConsent(c, p, "D1"); await confirmStage1(c, p, "D1"); const inst = await instance(p, "S2");
    expect(await refuses(entry(p, g.g, inst, "S2"))).toMatch(/entry_authority_actor_id is required to enter S2/);
    const m = await mkParticipant(c, `c31-cm-${RUN}`, "mentor");
    expect((await run(c, entry(p, g.g, inst, "S2", `entry_authority_actor_id=${"'" + m + "'"}`)))[0].entry_authority_actor_id).toBe(m);
  });
  it("T4: with the switch off none of it happens", async () => {
    await off(); const p = await mkParticipant(c, `c31-d-${RUN}`);
    expect((await gateway(p)).n).toBeNull();
    const g = await gateway(await mkParticipant(c, `c31-d2-${RUN}`));
    expect(g.n).toBeNull();
  });
});

describe("CR-31 the attempt, involvement and progression records are completed", () => {
  it("T5: an attempt opened by the route gets the rules version; it has no ending class yet and is not refused for it", async () => {
    await on(); const p = await mkParticipant(c, `c31-e-${RUN}`);
    const a = (await run(c, `insert into t3a_attempt(participant_id, dimension_id, stage_code) values ('${p}','D1','S1') returning attempt_rules_version v, attempt_event_class k, attempt_no n`))[0];
    expect(a.v).toMatch(/^[0-9]+\.[0-9]+/); expect(a.k).toBeNull(); expect(a.n).toBe(1);
  });
  it("T6: involvement gets its cycle, function and exposure from the act", async () => {
    await on(); const p = await mkParticipant(c, `c31-f-${RUN}`); const m = await mkParticipant(c, `c31-fm-${RUN}`, "mentor"); const rec = randomUUID();
    const ins = (action: string) => run(c, `insert into t3a_d1_involvement(actor_id, participant_id, dimension_id, involving_action, contributing_record_kind, contributing_record_id) values ('${m}','${p}','D1','${action}','probe','${rec}') returning evidence_cycle_id e, cycle_function f, s1_exposure_flag x`).then((r) => r[0]);
    expect(await ins("observed")).toEqual({ e: rec, f: "observer", x: false });
    expect(await ins("s1_determination_capture")).toEqual({ e: rec, f: "observer", x: true });
    expect(await ins("reconsidered")).toEqual({ e: rec, f: "evidence_reviewer", x: false });
  });
  it("T7: a corrected progression decision carries the dimension it applies to", async () => {
    await on(); const p = await mkParticipant(c, `c31-g-${RUN}`); const m = await mkParticipant(c, `c31-gm-${RUN}`, "mentor");
    // with the sequence switch on a progression decision needs a committed observation behind it (CR-18)
    await c.query("begin"); await c.query("set local session_replication_role = replica");
    await c.query(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${p}','D1','S1', true, now())`); await c.query("commit");
    const d = (await run(c, `insert into t3a_d1_progression_decision(participant_id, dimension_id, decision, recorded_by, decided_by, decided_at) values ('${p}','D1','proceed','${m}','${m}', now()) returning decision_scope s`))[0];
    expect(d.s).toEqual({ dimension: "D1" });
  });
});

describe("CR-31 records that are opened before they are decided", () => {
  it("T8: an application is pending until decided; an approval needs the approver; a free provider is declined by the system with none", async () => {
    await on();
    const ep = async () => { const u = await mkParticipant(c, `c31-h-${randomUUID().slice(0, 6)}`, "employer"); return { u, ep: (await run(c, `insert into employer_profiles(profile_id) values ('${u}') returning id`))[0].id as string }; };
    const app = (e: string, mail: string, extra = "", vals = "") => `insert into t3a_employer_application(employer_profile_id, work_email, creation_route, accepting_person_name, accepting_person_title, record_use_terms_version, terms_accepted_at ${extra}) values ('${e}','${mail}','application','A Person','Director','1.0',now() ${vals}) returning application_status s`;
    expect((await run(c, app((await ep()).ep, `hr@probe-${RUN}.ca`)))[0].s).toBe("pending");
    const b = await ep();
    expect(await refuses(app(b.ep, `hr@probe2-${RUN}.ca`, ", approval_decision, approved_by, approved_at", ", 'approved', 'someone', now()"))).toMatch(/approver_id is required on t3a_employer_application once it is approved/);
    expect((await run(c, app(b.ep, `hr@probe2-${RUN}.ca`, ", approval_decision, approved_by, approved_at, approver_id", `, 'approved', 'someone', now(), '${b.u}'`)))[0].s).toBe("pending");
    expect((await run(c, app((await ep()).ep, `x-${RUN}@gmail.com`)))[0].s).toBe("declined");
  });
  it("T10: a challenge is opened with who opened it, what it challenges and the hold; one that arrives resolved must carry its outcome", async () => {
    await on(); const p = await mkParticipant(c, `c31-j-${RUN}`);
    await run(c, `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('response_time_committed_version','1.0','1.0','${p}')`);
    const st = (await run(c, `select udt_name u from information_schema.columns where table_name='t3a_ber_report' and column_name='status'`))[0].u;
    const lrep = (await run(c, `insert into t3a_ber_report(participant_id, version, status) values ('${p}',1,(enum_range(null::${st}))[1]) returning ber_report_id i`))[0].i;
    const open = (status: string, extra = "", vals = "") => `insert into t3a_challenge_case(ber_report_id, participant_id, challenge_ground, status ${extra}) values ('${lrep}','${p}',(enum_range(null::t3a_challenge_ground))[1],'${status}' ${vals}) returning opened_by o, challenge_target_ref t, issuance_hold h, response_time_committed_version v`;
    expect((await run(c, open("open")))[0]).toEqual({ o: p, t: lrep, h: true, v: "1.0" });
    expect(await refuses(open("upheld"))).toMatch(/second_check_actor_id is required on t3a_challenge_case once it is resolved/);
  });
  it("T9: a rehearsal practice is recorded with its module version and moment", async () => {
    await on(); const p = await mkParticipant(c, `c31-i-${RUN}`);
    const mod = randomUUID(); await run(c, `insert into t3a_rehearsal_module(module_id, module_slug) values ('${mod}','probe-${RUN}')`);
    const s = (await run(c, `insert into t3a_rehearsal_session(participant_id, scenario_class, module_id, rehearsal_completion_state) values ('${p}','private_rehearsal','${mod}','complete') returning module_version v, workplace_moment_id w`))[0];
    expect(s).toEqual({ v: "1.0", w: mod });
  });
});
