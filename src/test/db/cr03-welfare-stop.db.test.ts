/** CORR-007 Rev 1.6 rule CR-03: the welfare stop. Synthetic participants; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let safety: string;
const DIM = "D1";
let seq = 0;
const begin = (p: string, stage: string) => asService(c, `select t3a_attempt_begin('${p}','${DIM}','${stage}','cr03-${RUN}-${++seq}', now()) r`);
const end = (p: string, stage: string, ending: string) => asService(c, `select t3a_attempt_end('${p}','${DIM}','${stage}','${ending}') r`);
const elig = async (p: string, stage: string) => (await asService(c, `select t3a_attempt_eligibility('${p}','${DIM}','${stage}', now()) r`)).r;
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
const counts = async (p: string) => (await run(c, `select
  (select count(*)::int from t3a_attempt where participant_id='${p}') attempts,
  (select count(*)::int from t3a_observation_record where participant_id='${p}') observations,
  (select count(*)::int from t3a_d1_progression_decision where participant_id='${p}') progressions,
  (select count(*)::int from t3a_attempt where participant_id='${p}' and counted) counted`))[0];
async function session(participant: string, stage: string) {
  const gw = (await run(c, `insert into t3a_observation_path_gateway(participant_id, session_identity_method, observation_consent_version, assistance_rules_version, coaching_terminated_at, observation_notification_timestamp) values ('${participant}','account_authentication','1.0','1.0',now(), now()) returning observation_path_gateway_id g`))[0].g;
  const inst = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${participant}','${stage}','${DIM}',1,'scheduled') returning stage_instance_id i`))[0].i;
  const entry = (await run(c, `insert into t3a_stage_entry_event(participant_id, dimension_id, stage_code, observation_path_gateway_id, stage_instance_id, session_identity, assistance_rules_version, administration_conditions, dimensions_in_play, administration_conditions_snapshot, session_id, observation_mode, stage_entry_hold_expires_at, entry_authority_actor_id) values ('${participant}','${DIM}','${stage}','${gw}','${inst}','x','1.0','{}','{${DIM}}','{}', gen_random_uuid(), 's1_deterministic_engine', now() + interval '1 hour', gen_random_uuid()) returning stage_entry_event_id e`))[0].e;
  return { inst, entry };
}

beforeAll(async () => {
  c = await connect(); safety = await mkParticipant(c, "cr03-safety", "admin");
  await run(c, `insert into t3a_safety_contact(designated_person, designated_name, designated_by, issued_under, note) values ('${safety}','Synthetic Safety Contact','test','CR-03 test','synthetic')`);
});
afterAll(async () => { await c.end(); });

describe("CR-03 the welfare stop consumes nothing", () => {
  it("T1: before and after observation begins, by the participant and by the mentor, at each Stage: no counted attempt, no wait, no finding", async () => {
    const cases = [["welfare_stop_participant", "welfare_stop"], ["welfare_stop_mentor", "welfare_stop"], ["welfare_stop_before_observation", "cancelled_before_start"], ["welfare_stop", "welfare_stop"]];
    for (const stage of ["S1", "S2", "S3", "S4"]) for (const [ending, klass] of cases) {
      const p = await mkParticipant(c, `cr03-t1-${stage}-${ending}`);
      expect((await begin(p, stage)).r.outcome).toBe("started");
      const e = await end(p, stage, ending);
      expect(e.r.outcome, `${stage} ${ending}`).toBe("ended"); expect(e.r.counted).toBe(false); expect(e.r.welfare_flag).toBe(true);
      const a = (await run(c, `select counted, welfare_flag, welfare_subject, attempt_event_class, coalesce(cooldown_class,'none') cd from t3a_attempt where participant_id='${p}'`))[0];
      expect(a).toEqual({ counted: false, welfare_flag: true, welfare_subject: "self", attempt_event_class: klass, cd: "none" });
      expect(await counts(p)).toEqual({ attempts: 1, observations: 0, progressions: 0, counted: 0 });
      const el = await elig(p, stage);
      expect(el.permitted, `${stage} ${ending}`).toBe(true); expect(el.counted_in_window).toBe(0);
      expect((await begin(p, stage)).r.outcome, "no wait: a new attempt can start at once").toBe("started");
    }
  });
  it("T1: the older stop route, by the mentor at Stage 2 and by the participant at Stage 1, opens safety handling, withholds the observation and consumes nothing", async () => {
    for (const [stage, who] of [["S2", "mentor"], ["S1", "participant"], ["S4", "mentor"]] as const) {
      const p = await mkParticipant(c, `cr03-leg-${stage}`); const m = await mkParticipant(c, `cr03-legm-${stage}`, "mentor"); const s = await session(p, stage);
      await run(c, `insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) values ('${m}','${p}','${s.inst}','planner')`).catch(async () =>
        run(c, `insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) select '${m}','${p}','${s.inst}', (enum_range(null::t3a_assignment_method))[1]`));
      const actor = who === "mentor" ? m : p;
      const r = await as(actor, `select t3a_d1_stop_for_welfare('${s.entry}','beat-1','${p}', true, false) r`);
      expect(r.r?.recorded, JSON.stringify(r)).toBe(true); expect(r.r.attempt_consumed).toBe(false); expect(r.r.observation_withheld).toBe(true); expect(r.r.safety_event_opened).toBe(true);
      const a = (await run(c, `select counted, welfare_flag, attempt_event_class, coalesce(cooldown_class,'none') cd from t3a_attempt where participant_id='${p}'`))[0];
      expect(a).toEqual({ counted: false, welfare_flag: true, attempt_event_class: "welfare_stop", cd: "none" });
      expect((await run(c, `select stopped_by from t3a_d1_welfare_withdrawal w join t3a_attempt a using (attempt_id) where a.participant_id='${p}'`))[0].stopped_by).toBe(who);
      expect((await run(c, `select count(*)::int n from t3a_d1_welfare_withholding where participant_id='${p}'`))[0].n).toBe(1);
      expect((await run(c, `select count(*)::int n from t3a_safety_event where concerns_person='${p}' and stopped`))[0].n).toBe(1);
      expect(await counts(p)).toEqual({ attempts: 1, observations: 0, progressions: 0, counted: 0 });
      expect((await elig(p, stage)).permitted).toBe(true);
    }
  });
  it("T2: a session stopped for a co-participant's welfare is an administration interruption for the observed participant; no attempt counted", async () => {
    const p = await mkParticipant(c, "cr03-t2"); await begin(p, "S4");
    const e = await end(p, "S4", "welfare_stop_co_participant"); expect(e.r.counted).toBe(false);
    const a = (await run(c, `select outcome, counted, welfare_flag, welfare_subject, attempt_event_class from t3a_attempt where participant_id='${p}'`))[0];
    expect(a).toEqual({ outcome: "system_failure", counted: false, welfare_flag: true, welfare_subject: "other_person", attempt_event_class: "administration_failure" });
    expect((await elig(p, "S4")).permitted).toBe(true);
    expect((await run(c, `select t3a_attempt_event_label('administration_failure', true) l`))[0].l).toBe("Administration interruption");
  });
  it("no new event class: the class set is the CR-12 set, and the welfare cooldown is a row in the attempt rule table, not code", async () => {
    const classes = (await run(c, `select distinct attempt_event_class k from t3a_attempt_ending_map order by 1`)).map((r) => r.k);
    expect(classes).toEqual(["accommodation_interruption", "administration_failure", "cancelled_before_start", "completed_observation", "identity_verification_failure", "participant_no_show", "technical_failure", "welfare_stop", "withdrawal_after_start_before_commit"]);
    expect((await run(c, `select count(*)::int n from t3a_attempt_ending_map where welfare_flag and wait_kind <> 'none'`))[0].n).toBe(0);
    expect((await run(c, `select t3a_attempt_event_label('welfare_stop', true) a, t3a_attempt_event_label('cancelled_before_start', true) b`))[0]).toEqual({ a: "Withdrawal after observation begins, before commit", b: "Session cancelled before observation begins" });
  });
});

describe("CR-03 the eligibility hold", () => {
  it("T3: the safety route sets and lifts a hold: no commit, no progression decision, no cooldown", async () => {
    const p = await mkParticipant(c, "cr03-t3"); await begin(p, "S2"); await end(p, "S2", "welfare_stop_participant");
    const before = await counts(p);
    const set = await as(safety, `select t3a_safety_hold_set('${p}', null) r`);
    expect(set.r).toEqual({ outcome: "hold_set", pause: false, cooldown: false });
    expect(await counts(p)).toEqual(before);
    const b = await begin(p, "S2"); expect(b.r.reason ?? b.r.refusal_code).toBe("ELIGIBILITY_HOLD");
    expect((await elig(p, "S2")).refusal_code).toBe("ELIGIBILITY_HOLD");
    expect((await elig(p, "S2")).earliest_eligible_at).toBeUndefined();
    const lift = await as(safety, `select t3a_safety_hold_lift('${p}') r`);
    expect(lift.r).toEqual({ outcome: "hold_lifted", commit_created: false, progression_created: false, cooldown_created: false });
    expect(await counts(p)).toEqual(before);
    expect((await elig(p, "S2")).permitted).toBe(true);
    expect((await begin(p, "S2")).r.outcome).toBe("started");
  });
  it("a hold is individual: it stops that participant only, on every Stage", async () => {
    const p = await mkParticipant(c, "cr03-ind"); const q = await mkParticipant(c, "cr03-indq");
    await as(safety, `select t3a_safety_hold_set('${p}', null) r`);
    for (const st of ["S1", "S3"]) expect((await elig(p, st)).refusal_code).toBe("ELIGIBILITY_HOLD");
    expect((await elig(q, "S1")).permitted).toBe(true);
    await as(safety, `select t3a_safety_hold_lift('${p}') r`);
  });
  it("only the safety contact sets or lifts a hold; a second hold or a lift with none refuses; the events are append-only", async () => {
    const p = await mkParticipant(c, "cr03-who"); const other = await mkParticipant(c, "cr03-other", "mentor");
    expect((await as(other, `select t3a_safety_hold_set('${p}', null) r`)).r.reason).toBe("SAFETY_CONTACT_ONLY");
    expect((await as(p, `select t3a_safety_hold_set('${p}', null) r`)).r.reason).toBe("SAFETY_CONTACT_ONLY");
    expect((await as(safety, `select t3a_safety_hold_lift('${p}') r`)).r.reason).toBe("NO_HOLD_IN_FORCE");
    await as(safety, `select t3a_safety_hold_set('${p}', null) r`);
    expect((await as(safety, `select t3a_safety_hold_set('${p}', null) r`)).r.reason).toBe("HOLD_ALREADY_SET");
    expect((await as(other, `select t3a_safety_hold_lift('${p}') r`)).r.reason).toBe("SAFETY_CONTACT_ONLY");
    expect((await as(safety, `select t3a_safety_hold_set('${p}', '${randomUUID()}') r`)).r.reason).toBe("HOLD_ALREADY_SET");
    await expect(c.query(`update t3a_eligibility_hold_event set event='lift'`)).rejects.toThrow(/append/i);
    await as(safety, `select t3a_safety_hold_lift('${p}') r`);
    expect((await as(safety, `select t3a_safety_hold_set('${p}', '${randomUUID()}') r`)).r.reason).toBe("SAFETY_EVENT_NOT_FOUND");
  });
  it("a hold is not a cooldown: once lifted it leaves no wait and no attempt behind", async () => {
    const p = await mkParticipant(c, "cr03-nowait");
    await as(safety, `select t3a_safety_hold_set('${p}', null) r`); await as(safety, `select t3a_safety_hold_lift('${p}') r`);
    expect((await elig(p, "S3")).permitted).toBe(true);
    expect((await run(c, `select count(*)::int n from t3a_attempt where participant_id='${p}'`))[0].n).toBe(0);
  });
});
