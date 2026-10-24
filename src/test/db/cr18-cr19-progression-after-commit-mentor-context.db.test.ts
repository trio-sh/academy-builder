/** CORR-007 Rev 1.6 rules CR-18 (progression only after commit) and CR-19 (minimum observation context for the mentor). Synthetic people; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run, confirmStage1, grantConsent } from "./helpers";

let c: pg.Client;
let seq = 0;
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
async function mentor(tag: string) {
  const m = await mkParticipant(c, `cr18-${tag}-${++seq}`, "mentor");
  await run(c, `insert into t3a_role_grant(user_id, spec_role) values ('${m}','mentor') on conflict do nothing`);
  return m;
}
async function session(participant: string, stage: string, dim = "D1") {
  await grantConsent(c, participant, dim);
  if (stage === "S2") await confirmStage1(c, participant, dim);
  const gw = (await run(c, `insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at, observation_notification_timestamp) values ('${participant}','account_authentication','1.0','1.0',now(), now()) returning observation_path_gateway_id g`))[0].g;
  const inst = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${participant}','${stage}','${dim}',1,'scheduled') returning stage_instance_id i`))[0].i;
  const entry = (await run(c, `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, session_id, observation_mode, stage_entry_hold_expires_at, entry_authority_actor_id) values ('${participant}','${dim}','${stage}','${gw}','${inst}','x','1.0','{}','{${dim}}','{"room":"quiet","interruptions":0}'::jsonb, gen_random_uuid(), 's1_deterministic_engine', now() + interval '1 hour', gen_random_uuid()) returning stage_entry_event_id e`))[0].e;
  return { inst, entry };
}
const decide = (m: string, inst: string, d = "proceed") => as(m, `select t3a_record_progression_decision('${inst}','D1','${d}') r`);
const commitObs = (p: string, stage: string) => fx(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${p}','D1','${stage}', true, now())`);

beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

describe("CR-18 a progression decision follows the commit", () => {
  it("T1: a progression decision before commit is refused and logged; after the commit it is recorded", async () => {
    const m = await mentor("t1"); const p = await mkParticipant(c, `cr18-p-${++seq}`); const s = await session(p, "S2");
    const refused = await decide(m, s.inst);
    expect(refused.msg).toMatch(/CR-18.*not committed/);
    expect((await run(c, `select count(*)::int n from t3a_mentor_judgment where stage_instance_id='${s.inst}' and progression_decision is not null`))[0].n).toBe(0);
    await commitObs(p, "S2");
    const ok = await decide(m, s.inst);
    expect(ok.msg).toBe("ok"); expect(ok.r).toBeTruthy();
    expect((await run(c, `select count(*)::int n from t3a_mentor_judgment where stage_instance_id='${s.inst}' and progression_decision is not null`))[0].n).toBe(1);
  });
  it("the commit has to be this participant's, on this dimension and this Stage", async () => {
    const m = await mentor("t1b"); const p = await mkParticipant(c, `cr18-p-${++seq}`); const other = await mkParticipant(c, `cr18-o-${++seq}`); const s = await session(p, "S3");
    await commitObs(other, "S3"); await commitObs(p, "S2");
    expect((await decide(m, s.inst)).msg).toMatch(/CR-18/);
    await commitObs(p, "S3");
    expect((await decide(m, s.inst, "redirect")).msg).toBe("ok");
  });
  it("T2: a combined commit and progression request is refused before anything is written", async () => {
    const p = await mkParticipant(c, `cr18-c-${++seq}`);
    for (const key of ["progression_decision", "progression_dimension_id", "progression", "decision"]) {
      const n = (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='COMMIT_AND_PROGRESSION_COMBINED'`))[0].n;
      const payload = JSON.stringify({ participant_id: p, stage_code: "S2", observer_id: randomUUID(), [key]: "proceed" });
      const r = (await asService(c, `select t3a_commit_observation('${payload}'::jsonb) r`)).r;
      expect(r).toMatchObject({ outcome: "refused", reason: "COMMIT_AND_PROGRESSION_COMBINED" });
      expect((await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='COMMIT_AND_PROGRESSION_COMBINED'`))[0].n).toBe(n + 1);
    }
    expect((await run(c, `select count(*)::int n from t3a_observation where participant_id='${p}'`))[0].n).toBe(0);
  });
  it("a commit without a progression is passed to the commit as before; the wrapper keeps the original's rights", async () => {
    const p = await mkParticipant(c, `cr18-d-${++seq}`);
    const r = (await asService(c, `select t3a_commit_observation('${JSON.stringify({ participant_id: p, stage_code: "S2" })}'::jsonb) r`)).r;
    expect(r.reason).toBe("OBSERVER_REQUIRED");                    // the original's own refusal: it was reached
    expect((await as(p, `select t3a_commit_observation('{}'::jsonb) r`)).msg).toMatch(/permission denied/);
  });
  it("the older progression table follows the sequence switch: off by default, and when on a decision with no commit behind it is not stored", async () => {
    const p = await mkParticipant(c, `cr18-t-${++seq}`); const rec = await mkParticipant(c, `cr18-r-${seq}`, "mentor");
    const insert = () => run(c, `insert into t3a_d1_progression_decision(participant_id, dimension_id, decision, recorded_by, decided_by, decided_at, decision_scope) values ('${p}','D1','proceed','${rec}','${rec}', now(), '{}'::jsonb)`);
    const prevSeq = (await run(c, `select enforce_sequence s from t3a_capture_config`))[0].s;
    await run(c, `update t3a_capture_config set enforce_sequence = false`);   // the case is the switch off, then on; whatever the run set is put back
    await insert(); expect((await run(c, `select count(*)::int n from t3a_d1_progression_decision where participant_id='${p}'`))[0].n).toBe(1);
    await run(c, `update t3a_capture_config set enforce_sequence = true`);
    try {
      const q = await mkParticipant(c, `cr18-q-${++seq}`);
      const ins = (who: string) => run(c, `insert into t3a_d1_progression_decision(participant_id, dimension_id, decision, recorded_by, decided_by, decided_at, decision_scope) values ('${who}','D1','proceed','${rec}','${rec}', now(), '{}'::jsonb)`);
      await ins(q); expect((await run(c, `select count(*)::int n from t3a_d1_progression_decision where participant_id='${q}'`))[0].n).toBe(0);
      await commitObs(q, "S2"); await ins(q); expect((await run(c, `select count(*)::int n from t3a_d1_progression_decision where participant_id='${q}'`))[0].n).toBe(1);
      // a decision that names its observation: refused while that record is uncommitted, stored once it is committed (even when the participant has another committed record)
      const r = await mkParticipant(c, `cr18-r2-${++seq}`); const pending = randomUUID(); const done = randomUUID();
      await commitObs(r, "S1");
      await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code) values ('${pending}','${r}','D1','S2')`);
      await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${done}','${r}','D1','S3', true, now())`);
      const named = (rec: string) => run(c, `insert into t3a_d1_progression_decision(participant_id, dimension_id, decision, recorded_by, decided_by, observation_record_id, decided_at, decision_scope) values ('${r}','D1','proceed','${rec2}','${rec2}','${rec}', now(), '{}'::jsonb)`);
      const rec2 = await mkParticipant(c, `cr18-rr-${seq}`, "mentor");
      await named(pending); expect((await run(c, `select count(*)::int n from t3a_d1_progression_decision where participant_id='${r}'`))[0].n).toBe(0);
      await named(done); expect((await run(c, `select count(*)::int n from t3a_d1_progression_decision where participant_id='${r}'`))[0].n).toBe(1);
    } finally { await run(c, `update t3a_capture_config set enforce_sequence = ${prevSeq}`); }
  });
});

describe("CR-19 the mentor sees the minimum observation context", () => {
  const PROFILE = { legal: "Zanzibar Quill", display: "Zan", country: "CA", city: "Nowhereville", occupation: "tidewater cartographer" };
  async function world() {
    const p = await mkParticipant(c, `cr19-p-${++seq}`); const m = await mentor("cr19m");
    await run(c, `insert into t3a_participant_profile(account_id, legal_name, legal_name_capture_state, display_name, display_name_capture_state, country_of_residence, country_of_residence_capture_state, city_of_residence, city_of_residence_capture_state, occupation_interest, occupation_interest_capture_state)
      values ('${p}','${PROFILE.legal}','captured','${PROFILE.display}','captured','${PROFILE.country}','captured','${PROFILE.city}','captured', array['${PROFILE.occupation}'],'captured') on conflict (account_id) do nothing`);
    await run(c, `update profiles set first_name='Zanzibar', last_name='Quill' where id='${p}'`);
    const s = await session(p, "S2");
    await run(c, `insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) select '${m}','${p}','${s.inst}', (enum_range(null::t3a_assignment_method))[1]`);
    return { p, m, ...s };
  }
  it("T1: the mentor view carries the minimum observation context and no intake profile field", async () => {
    const w = await world(); const r = (await as(w.m, `select t3a_mentor_session_context('${w.inst}') r`)).r;
    expect(r.outcome).toBe("context");
    expect(Object.keys(r).sort()).toEqual(["activated_at", "attempt_no", "dimension_id", "outcome", "participant_label", "scheduled_at", "session", "source", "stage_code", "stage_instance_id", "state"]);
    expect(Object.keys(r.session).sort()).toEqual(["administration_conditions", "entered_at", "observation_mode", "stage_entry_event_id"]);
    expect(r.session.administration_conditions).toEqual({ room: "quiet", interruptions: 0 });
    const text = JSON.stringify(r).toLowerCase();
    for (const v of [PROFILE.legal, PROFILE.display, PROFILE.city, PROFILE.occupation, "zanzibar", "quill", `cr19-p-`, "@t.local", w.p]) expect(text).not.toContain(v.toLowerCase());
    expect(r.participant_label).toMatch(/^P-[0-9A-F]{8}$/);
    // the label means nothing outside the session: a second session of the same participant gets a different one
    const s2 = await session(w.p, "S3"); await run(c, `insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) select '${w.m}','${w.p}','${s2.inst}', (enum_range(null::t3a_assignment_method))[1]`);
    expect((await as(w.m, `select t3a_mentor_session_context('${s2.inst}') r`)).r.participant_label).not.toBe(r.participant_label);
  });
  it("only the assigned mentor opens it, and a session that does not exist and one that is not theirs look the same", async () => {
    const w = await world(); const other = await mentor("cr19o"); const part = w.p;
    const a = (await as(other, `select t3a_mentor_session_context('${w.inst}') r`)).r;
    const b = (await as(other, `select t3a_mentor_session_context('${randomUUID()}') r`)).r;
    expect(a).toEqual({ outcome: "refused", reason: "SESSION_NOT_AVAILABLE" }); expect(b).toEqual(a);
    expect((await as(part, `select t3a_mentor_session_context('${w.inst}') r`)).r).toEqual(a);
    expect((await asRole(c, "anon", null, `select t3a_mentor_session_context('${w.inst}') r`)).msg).toMatch(/permission denied/);
  });
  it("the intake profile itself is not readable by the mentor", async () => {
    const w = await world();
    expect((await as(w.m, `select count(*)::int n from t3a_participant_profile where account_id='${w.p}'`)).rows[0].n).toBe(0);
    expect((await as(w.p, `select count(*)::int n from t3a_participant_profile where account_id='${w.p}'`)).rows[0].n).toBe(1);
  });
});
