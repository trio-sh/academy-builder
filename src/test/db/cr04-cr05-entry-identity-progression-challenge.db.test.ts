/** CORR-007 Rev 1.6 rules CR-04 (identity at Stage entry) and CR-05 (progression challenge). Synthetic people; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run, confirmStage1, grantConsent } from "./helpers";

let c: pg.Client;
const DIM = "D1";
let seq = 0;
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
const begin = (p: string, stage: string, key = `cr04-${RUN}-${++seq}`) => asService(c, `select t3a_attempt_begin('${p}','${DIM}','${stage}','${key}', now()) r`);
const end = (p: string, stage: string, ending: string) => asService(c, `select t3a_attempt_end('${p}','${DIM}','${stage}','${ending}') r`);
const elig = async (p: string, stage: string) => (await asService(c, `select t3a_attempt_eligibility('${p}','${DIM}','${stage}', now()) r`)).r;
const entryId = (p: string, stage: string, authenticated: boolean, svcFail = false) => asService(c, `select t3a_cr04_entry_identity('${p}','${DIM}','${stage}', ${authenticated}, ${svcFail}) r`);
const refused = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
async function session(participant: string, stage: string) {
  await grantConsent(c, participant, DIM);
  if (stage === "S2") await confirmStage1(c, participant, DIM);
  const gw = (await run(c, `insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at, observation_notification_timestamp) values ('${participant}','account_authentication','1.0','1.0',now(), now()) returning observation_path_gateway_id g`))[0].g;
  const inst = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${participant}','${stage}','${DIM}',1,'scheduled') returning stage_instance_id i`))[0].i;
  const entry = (await run(c, `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, session_id, observation_mode, stage_entry_hold_expires_at, entry_authority_actor_id) values ('${participant}','${DIM}','${stage}','${gw}','${inst}','x','1.0','{}','{${DIM}}','{}', gen_random_uuid(), 's1_deterministic_engine', now() + interval '1 hour', gen_random_uuid()) returning stage_entry_event_id e`))[0].e;
  return { inst, entry };
}

beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

describe("CR-04 identity at entry rests on the account", () => {
  it("T1: Stage 2 and Stage 4 entry with an authenticated account and no visual confirmation is admitted", async () => {
    for (const stage of ["S1", "S2", "S3", "S4"]) {
      const p = await mkParticipant(c, `cr04-t1-${stage}`); await begin(p, stage);
      const r = (await entryId(p, stage, true)).r;
      expect(r).toEqual({ admitted: true, basis: "account_authentication", visual_confirmation_required: false });
      expect((await run(c, `select count(*)::int n from t3a_attempt where participant_id='${p}' and outcome='initiated'`))[0].n).toBe(1);
    }
    // nothing in the live session record depends on a visual confirmation
    const p = await mkParticipant(c, "cr04-vis"); const s = await session(p, "S2");
    await run(c, `insert into t3a_d1_live_session(stage_entry_event_id) values ('${s.entry}')`);
    expect((await run(c, `select visual_confirmation_recorded_at v from t3a_d1_live_session where stage_entry_event_id='${s.entry}'`))[0].v).toBeNull();
  });
  it("T2: a participant who cannot authenticate: entry refuses, no attempt is consumed, the rescheduling wait applies", async () => {
    const p = await mkParticipant(c, "cr04-t2"); await begin(p, "S2");
    const n = await refused("ACCOUNT_NOT_AUTHENTICATED");
    const r = (await entryId(p, "S2", false)).r;
    expect(r.admitted).toBe(false); expect(r.attempt_consumed).toBe(false);
    expect(await refused("ACCOUNT_NOT_AUTHENTICATED")).toBe(n + 1);
    const a = (await run(c, `select outcome, counted, attempt_event_class from t3a_attempt where participant_id='${p}'`))[0];
    expect(a).toEqual({ outcome: "abandoned", counted: false, attempt_event_class: "identity_verification_failure" });
    const el = await elig(p, "S2");
    expect(el.permitted).toBe(false); expect(el.refusal_code).toBe("SPECIFICATION_COOLDOWN_IN_FORCE"); expect(el.counted_in_window).toBe(0);
  });
  it("T3: the identity service is unavailable: entry refuses, a technical failure, no wait", async () => {
    const p = await mkParticipant(c, "cr04-t3"); await begin(p, "S4");
    const r = (await entryId(p, "S4", false, true)).r;
    expect(r.admitted).toBe(false); expect(r.attempt_consumed).toBe(false);
    const a = (await run(c, `select outcome, counted, attempt_event_class from t3a_attempt where participant_id='${p}'`))[0];
    expect(a).toEqual({ outcome: "system_failure", counted: false, attempt_event_class: "technical_failure" });
    expect((await elig(p, "S4")).permitted).toBe(true);
    expect((await begin(p, "S4")).r.outcome).toBe("started");
  });
  it("the participant is told nothing about why entry refused: the same message for both failures", async () => {
    const a = await mkParticipant(c, "cr04-msg-a"); const b = await mkParticipant(c, "cr04-msg-b"); await begin(a, "S1"); await begin(b, "S1");
    const ra = (await entryId(a, "S1", false)).r; const rb = (await entryId(b, "S1", false, true)).r;
    expect(ra.participant_message).toBe(rb.participant_message);
    expect(ra.participant_message).not.toMatch(/auth|identity|service|fail|security|account/i);
    expect(Object.keys(ra).sort()).toEqual(["admitted", "attempt_consumed", "participant_message", "service_detail"]);
  });
  it("the entry decision is the service's alone", async () => {
    const p = await mkParticipant(c, "cr04-svc");
    expect((await as(p, `select t3a_cr04_entry_identity('${p}','${DIM}','S1', true, false) r`)).msg).toMatch(/permission denied/);
  });
  it("no vendor and no biometric: no column or table of the entry route holds one", async () => {
    const cols = await run(c, `select table_name||'.'||column_name n from information_schema.columns where table_schema='public' and table_name in ('t3a_authorship_declaration','t3a_integrity_concern') and column_name ~* 'biometric|face|photo|vendor|document'`);
    expect(cols).toEqual([]);
  });
});

describe("wrapped attempt routes keep their service-only grants", () => {
  it("a participant, an anonymous caller and another participant cannot call the attempt routes or read an attempt window", async () => {
    const p = await mkParticipant(c, "cr04-grant"); const q = await mkParticipant(c, "cr04-grant-q");
    const calls = [`t3a_attempt_begin('${p}','${DIM}','S1','k-${RUN}', now())`, `t3a_attempt_eligibility('${p}','${DIM}','S1', now())`, `t3a_attempt_end('${p}','${DIM}','S1','completed_observation')`];
    for (const call of calls) {
      expect((await as(q, `select ${call} r`)).msg, call).toMatch(/permission denied/);
      expect((await asRole(c, "anon", null, `select ${call} r`)).msg, call).toMatch(/permission denied/);
    }
  });
});

describe("CR-04 declarations, the join link and a mentor's concern", () => {
  it("authorship and assistance are recorded as declarations by the account, in a controlled set", async () => {
    const p = await mkParticipant(c, "cr04-decl");
    expect((await as(p, `select t3a_authorship_declare('S3','authorship','own_work', null) r`)).r.outcome).toBe("declared");
    expect((await as(p, `select t3a_authorship_declare('S3','assistance','tools_only', null) r`)).r.outcome).toBe("declared");
    const n = await refused("DECLARATION_NOT_IN_CONTROLLED_SET");
    expect((await as(p, `select t3a_authorship_declare('S3','authorship','tools_only', null) r`)).r.reason).toBe("DECLARATION_NOT_IN_CONTROLLED_SET");
    expect((await as(p, `select t3a_authorship_declare('S3','assistance','whatever', null) r`)).r.reason).toBe("DECLARATION_NOT_IN_CONTROLLED_SET");
    expect(await refused("DECLARATION_NOT_IN_CONTROLLED_SET")).toBe(n + 2);
    const rows = await run(c, `select kind, value_code, provenance from t3a_authorship_declaration where participant_id='${p}' order by declared_at`);
    expect(rows).toEqual([{ kind: "authorship", value_code: "own_work", provenance: `account:${p}` }, { kind: "assistance", value_code: "tools_only", provenance: `account:${p}` }]);
    const other = await mkParticipant(c, "cr04-decl-o"); const s = await session(p, "S3");
    expect((await as(other, `select t3a_authorship_declare('S3','authorship','own_work','${s.inst}') r`)).r.reason).toBe("NOT_THE_PARTICIPANTS_SESSION");
    expect((await as(other, `select count(*)::int n from t3a_authorship_declaration`)).rows[0].n).toBe(0);
    await expect(c.query(`update t3a_authorship_declaration set value_code='own_work'`)).rejects.toThrow(/append/i);
  });
  it("the join link is released only to the participant's own account", async () => {
    const p = await mkParticipant(c, "cr04-link"); const other = await mkParticipant(c, "cr04-link-o"); const m = await mkParticipant(c, "cr04-link-m", "mentor"); const s = await session(p, "S2");
    await run(c, `insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) select '${m}','${p}','${s.inst}', (enum_range(null::t3a_assignment_method))[1]`);
    await run(c, `insert into t3a_d1_live_session(stage_entry_event_id, host_account_email, meet_link, link_status) values ('${s.entry}','host@the3rdacademy.com','https://meet.example/abc','issued')`);
    expect((await as(p, `select t3a_cr04_join_link('${s.entry}') r`)).r).toMatchObject({ released: true, meet_link: "https://meet.example/abc" });
    expect((await as(other, `select t3a_cr04_join_link('${s.entry}') r`)).r).toEqual({ released: false });
    expect((await as(other, `select t3a_cr04_join_link('${randomUUID()}') r`)).r).toEqual({ released: false });
    // the table itself no longer hands the link to everyone
    expect((await as(other, `select count(*)::int n from t3a_d1_live_session where stage_entry_event_id='${s.entry}'`)).rows[0].n).toBe(0);
    expect((await as(p, `select count(*)::int n from t3a_d1_live_session where stage_entry_event_id='${s.entry}'`)).rows[0].n).toBe(1);
    expect((await as(m, `select count(*)::int n from t3a_d1_live_session where stage_entry_event_id='${s.entry}'`)).rows[0].n).toBe(1);
    expect((await asRole(c, "anon", null, `select count(*)::int n from t3a_d1_live_session`)).msg).toMatch(/permission denied/);
    expect((await as(p, `update t3a_d1_live_session set meet_link='x'`)).msg).toMatch(/permission denied/);
  });
  it("a mentor's concrete concern ends the session as an administration matter, goes to the integrity route and is never recorded as conduct", async () => {
    const p = await mkParticipant(c, "cr04-con"); const m = await mkParticipant(c, "cr04-con-m", "mentor"); const other = await mkParticipant(c, "cr04-con-o", "mentor");
    await begin(p, "S2"); const s = await session(p, "S2");
    await run(c, `insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) select '${m}','${p}','${s.inst}', (enum_range(null::t3a_assignment_method))[1]`);
    const before = (await run(c, `select (select count(*)::int from t3a_observation_record where participant_id='${p}') o, (select count(*)::int from t3a_d1_composed_statement cs join t3a_observation_record o using (observation_record_id) where o.participant_id='${p}') s, (select count(*)::int from t3a_d1_progression_decision where participant_id='${p}') d`))[0];
    expect((await as(other, `select t3a_identity_concern_raise('${s.entry}','different_person_present') r`)).r.reason).toBe("ONLY_THE_ASSIGNED_MENTOR_RAISES_A_CONCERN");
    expect((await as(m, `select t3a_identity_concern_raise('${s.entry}','a made up reason') r`)).r.reason).toBe("BASIS_NOT_IN_CONTROLLED_SET");
    const r = (await as(m, `select t3a_identity_concern_raise('${s.entry}','different_person_present') r`)).r;
    expect(r).toMatchObject({ outcome: "session_ended", ended_as: "administration_matter", recorded_as_conduct: false });
    const a = (await run(c, `select outcome, counted, attempt_event_class from t3a_attempt where participant_id='${p}'`))[0];
    expect(a).toEqual({ outcome: "system_failure", counted: false, attempt_event_class: "administration_failure" });
    expect((await run(c, `select count(*)::int n from t3a_integrity_concern where participant_id='${p}' and basis_code='different_person_present'`))[0].n).toBe(1);
    expect((await run(c, `select (select count(*)::int from t3a_observation_record where participant_id='${p}') o, (select count(*)::int from t3a_d1_composed_statement cs join t3a_observation_record o using (observation_record_id) where o.participant_id='${p}') s, (select count(*)::int from t3a_d1_progression_decision where participant_id='${p}') d`))[0]).toEqual(before);
    expect((await elig(p, "S2")).permitted).toBe(true);                       // no wait and no finding
    expect((await as(p, `select count(*)::int n from t3a_integrity_concern`)).msg).toMatch(/permission denied/);   // the participant is not shown it
    const s1 = await session(p, "S1");
    await run(c, `insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) select '${m}','${p}','${s1.inst}', (enum_range(null::t3a_assignment_method))[1]`);
    expect((await as(m, `select t3a_identity_concern_raise('${s1.entry}','account_shared') r`)).r.reason).toBe("MENTOR_CONCERN_IS_A_LIVE_STAGE_ROUTE");
  });
});

describe("CR-05 a progression challenge pauses nothing", () => {
  async function decided(daysAgo: number, decision = "redirect") {
    const p = await mkParticipant(c, `cr05-p-${++seq}`); const rec = await mkParticipant(c, `cr05-rec-${seq}`, "mentor");
    // with the sequence switch on, a progression decision needs a committed observation behind it (CR-18): the fixture gives it one
    await c.query("begin"); await c.query("set local session_replication_role = replica");
    await c.query(`insert into t3a_observation_record(participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${p}','${DIM}','S1', true, now())`); await c.query("commit");
    const id = (await run(c, `insert into t3a_d1_progression_decision(participant_id, dimension_id, decision, recorded_by, decided_by, decided_at, created_at, decision_scope) values ('${p}','${DIM}','${decision}','${rec}','${rec}', now() - interval '${daysAgo} days', now() - interval '${daysAgo} days', '{}'::jsonb) returning progression_decision_id i`))[0].i;
    return { p, rec, id };
  }
  const openCh = (p: string, id: string) => as(p, `select t3a_progression_challenge_open('${id}') r`);
  const notice = (p: string) => as(p, `select t3a_progression_challenge_notice('${DIM}') r`);

  it("T1: re-entering while a challenge is open is admitted if otherwise eligible, is counted, and the participant was told before entry", async () => {
    const w = await decided(40); const twin = await decided(40);
    const base = await elig(twin.p, "S1");
    const ch = (await openCh(w.p, w.id)).r;
    expect(ch).toMatchObject({ outcome: "opened", pauses_time: false, holds_reentry: false });
    expect(await elig(w.p, "S1")).toEqual(base);                                  // the open challenge changes nothing about eligibility
    const blocked = (await begin(w.p, "S1")).r;                                    // not told yet
    expect(blocked.reason ?? blocked.refusal_code).toBe("PROGRESSION_CHALLENGE_NOTICE_REQUIRED"); expect(blocked.notice_required).toBe(true);
    expect((await run(c, `select count(*)::int n from t3a_attempt where participant_id='${w.p}'`))[0].n).toBe(0);
    const n = (await notice(w.p)).r;
    expect(n.open).toBe(true); expect(n.notice).toMatch(/recorded and counted/); expect(n.notice).toMatch(/does not pause time or hold your re-entry/);
    const started = (await begin(w.p, "S1")).r; expect(started.outcome).toBe("started");
    const done = (await end(w.p, "S1", "completed_observation")).r;
    expect(done.counted).toBe(true);
    // the twin with no challenge starts without any notice
    expect((await begin(twin.p, "S1")).r.outcome).toBe("started");
    // the notice is recorded once
    await notice(w.p);
    expect((await run(c, `select count(*)::int n from t3a_progression_challenge_event where participant_id='${w.p}' and event='notice_shown'`))[0].n).toBe(1);
  });
  it("an open challenge never holds a cooldown that is already running, and never starts one", async () => {
    const w = await decided(30); await begin(w.p, "S3"); await end(w.p, "S3", "withdrawal_participant_choice");
    const before = await elig(w.p, "S3"); expect(before.permitted).toBe(false);
    await openCh(w.p, w.id);
    expect(await elig(w.p, "S3")).toEqual(before);                                  // same wait, to the instant
    expect((await run(c, `select count(*)::int n from t3a_attempt where participant_id='${w.p}' and cooldown_class is not null and cooldown_class <> 'none'`))[0].n).toBe(0);
  });
  it("T2: when the challenge succeeds the decision is corrected as of its original date, eligibility changes from the correction date, nothing is erased", async () => {
    const w = await decided(30, "redirect"); const ch = (await openCh(w.p, w.id)).r.challenge_id;
    const res = (await asService(c, `select t3a_progression_challenge_resolve('${ch}','corrected','proceed','${w.rec}') r`)).r;
    expect(res.outcome).toBe("corrected");
    const rec = (d: number) => asService(c, `select t3a_progression_record_value('${w.p}','${DIM}', now() - interval '${d} days') r`).then((x) => x.r);
    const eli = (d: number) => asService(c, `select t3a_progression_eligibility_value('${w.p}','${DIM}', now() - interval '${d} days') r`).then((x) => x.r);
    expect(await rec(29)).toBe("proceed");                                          // on the record from the original date
    expect(await rec(31)).toBeNull();
    expect(await eli(10)).toBe("redirect");                                        // eligibility still ran on the original before the correction
    expect(await eli(0)).toBe("proceed");                                          // and runs on the correction from its own date
    const rows = await run(c, `select decision::text, corrected_decision_ref, original_decision_date is not null od, correction_effective_date is not null ce from t3a_d1_progression_decision where participant_id='${w.p}' order by created_at`);
    expect(rows).toHaveLength(2);                                                    // nothing erased
    expect(rows[0].decision).toBe("redirect"); expect(rows[1]).toMatchObject({ decision: "proceed", od: true, ce: true });
    expect((await run(c, `select count(*)::int n from t3a_progression_challenge_event where challenge_id='${ch}' and event='corrected'`))[0].n).toBe(1);
    expect(await asService(c, `select t3a_progression_challenge_open_id('${w.p}','${DIM}') r`).then((x) => x.r)).toBeNull();
  });
  it("a repeat attempt made while the challenge was open stays recorded and counted after the correction", async () => {
    const w = await decided(40, "pause"); const ch = (await openCh(w.p, w.id)).r.challenge_id;
    await notice(w.p); await begin(w.p, "S1"); await end(w.p, "S1", "completed_observation");
    await asService(c, `select t3a_progression_challenge_resolve('${ch}','corrected','proceed','${w.rec}') r`);
    expect((await run(c, `select count(*)::int n from t3a_attempt where participant_id='${w.p}' and counted and outcome='completed'`))[0].n).toBe(1);
  });
  it("upheld and withdrawn outcomes correct nothing; the route is governed and resolves once", async () => {
    const w = await decided(20); const ch = (await openCh(w.p, w.id)).r.challenge_id;
    expect((await as(w.p, `select t3a_progression_challenge_resolve('${ch}','upheld',null,null) r`)).msg).toMatch(/permission denied/);
    expect((await asService(c, `select t3a_progression_challenge_resolve('${ch}','corrected','proceed',null) r`)).r.reason).toBe("CORRECTION_INCOMPLETE");
    expect((await asService(c, `select t3a_progression_challenge_resolve('${ch}','maybe',null,null) r`)).r.reason).toBe("OUTCOME_NOT_IN_CONTROLLED_SET");
    expect((await asService(c, `select t3a_progression_challenge_resolve('${ch}','upheld',null,null) r`)).r.outcome).toBe("upheld");
    expect((await asService(c, `select t3a_progression_challenge_resolve('${ch}','withdrawn',null,null) r`)).r.reason).toBe("CHALLENGE_ALREADY_RESOLVED");
    expect((await run(c, `select count(*)::int n from t3a_d1_progression_decision where participant_id='${w.p}'`))[0].n).toBe(1);
    expect((await begin(w.p, "S1")).r.outcome).toBe("started");                      // resolved: no notice needed any more
  });
  it("a participant challenges only a decision about themselves, one at a time per dimension; challenge records are append-only", async () => {
    const w = await decided(10); const other = await mkParticipant(c, "cr05-other");
    expect((await openCh(other, w.id)).r.reason).toBe("NOT_THE_PARTICIPANTS_DECISION");
    expect((await openCh(w.p, randomUUID())).r.reason).toBe("NOT_THE_PARTICIPANTS_DECISION");
    expect((await openCh(w.p, w.id)).r.outcome).toBe("opened");
    expect((await openCh(w.p, w.id)).r.reason).toBe("CHALLENGE_ALREADY_OPEN");
    await expect(c.query(`update t3a_progression_challenge_event set event='upheld'`)).rejects.toThrow(/append/i);
    expect((await as(other, `select count(*)::int n from t3a_progression_challenge_event`)).rows[0].n).toBe(0);
  });
});
