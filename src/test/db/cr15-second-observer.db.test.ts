/** CORR-007 Rev 1.6 rule CR-15: a second independent observer in the pilot. Synthetic people and sessions; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let cohort: string;
const DIM = "D1";
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
const refused = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
let seq = 0;
async function mentor(tag: string) {
  const m = await mkParticipant(c, `cr15-${tag}-${++seq}`, "mentor");
  await run(c, `insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status) values ('${m}','${DIM}', now() - interval '1 day','current','1.0','authorized')`);
  return m;
}
/** A session of a participant; pilot = enrolled and active in an open cohort. */
async function session(pilot: boolean) {
  const p = await mkParticipant(c, `cr15-p-${++seq}`);
  const inst = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${p}','S2','${DIM}',1,'scheduled') returning stage_instance_id i`))[0].i;
  if (pilot) await run(c, `insert into t3a_d1_pilot_enrollment(cohort_id, participant_id, state) values ('${cohort}','${p}','active')`);
  return { p, inst };
}
const consent = (p: string, inst: string, granted = true) => as(p, `select t3a_second_observer_consent_set('${inst}', ${granted}) r`);
const add = (inst: string, a: string, b: string) => asService(c, `select t3a_second_observer_add('${inst}','${a}','${b}') r`);
const save = (u: string, inst: string, payload: object) => as(u, `select t3a_observer_capture_save('${inst}', '${JSON.stringify(payload)}'::jsonb) r`);
const lock = (u: string, inst: string) => as(u, `select t3a_observer_capture_lock('${inst}') r`);
const read = (u: string, inst: string) => as(u, `select t3a_observer_capture_read('${inst}') r`);
async function ready() {
  const s = await session(true); const a = await mentor("a"); const b = await mentor("b");
  await consent(s.p, s.inst); const r = await add(s.inst, a, b);
  if (r.r?.outcome !== "added") throw new Error("fixture: " + JSON.stringify(r));
  return { ...s, a, b };
}

beforeAll(async () => {
  c = await connect();
  cohort = (await run(c, `insert into t3a_d1_pilot_cohort(code, title, cap, state) values ('CR15-${RUN}','CR-15 test cohort', 10, 'open') returning id`))[0].id;
});
afterAll(async () => { await c.end(); });

describe("CR-15 adding a second observer", () => {
  it("T2: a second observer without the participant's consent is refused", async () => {
    const s = await session(true); const a = await mentor("a"); const b = await mentor("b");
    const n = await refused("SECOND_OBSERVER_CONSENT_REQUIRED");
    expect((await add(s.inst, a, b)).r.reason).toBe("SECOND_OBSERVER_CONSENT_REQUIRED");
    expect(await refused("SECOND_OBSERVER_CONSENT_REQUIRED")).toBe(n + 1);
    await consent(s.p, s.inst, true); await consent(s.p, s.inst, false);
    expect((await add(s.inst, a, b)).r.reason).toBe("SECOND_OBSERVER_CONSENT_REQUIRED");
    expect((await run(c, `select count(*)::int n from t3a_session_observer where stage_instance_id='${s.inst}'`))[0].n).toBe(0);
  });
  it("only a pilot session may carry a second observer", async () => {
    const s = await session(false); const a = await mentor("a"); const b = await mentor("b"); await consent(s.p, s.inst);
    expect((await add(s.inst, a, b)).r.reason).toBe("SECOND_OBSERVER_PILOT_ONLY");
    const closed = await session(true); await run(c, `update t3a_d1_pilot_enrollment set state='withdrawn', withdrawn_at=now() where participant_id='${closed.p}'`).catch(() => null);
  });
  it("the participant consents for their own session only", async () => {
    const s = await session(true); const other = await mkParticipant(c, "cr15-other");
    expect((await consent(other, s.inst)).r.reason).toBe("NOT_THE_PARTICIPANTS_SESSION");
    expect((await consent(s.p, randomUUID())).r.reason).toBe("NOT_THE_PARTICIPANTS_SESSION");
  });
  it("the two observers are different people, authorized for the dimension, and neither is the participant", async () => {
    const s = await session(true); const a = await mentor("a"); const b = await mentor("b"); await consent(s.p, s.inst);
    expect((await add(s.inst, a, a)).r.reason).toBe("SECOND_OBSERVER_NOT_INDEPENDENT");
    expect((await add(s.inst, a, s.p)).r.reason).toBe("SECOND_OBSERVER_NOT_INDEPENDENT");
    const unauth = await mkParticipant(c, "cr15-unauth", "mentor");
    expect((await add(s.inst, a, unauth)).r.reason).toBe("SECOND_OBSERVER_NOT_AUTHORIZED");
    const a2 = await mkParticipant(c, "cr15-a2", "mentor"); const canon = randomUUID();
    await asService(c, `select t3a_cr13_link_identity('${canon}','${a}',null) r`); await asService(c, `select t3a_cr13_link_identity('${canon}','${a2}',null) r`);
    expect((await add(s.inst, a, a2)).r.reason).toBe("SECOND_OBSERVER_NOT_INDEPENDENT");
    expect((await add(s.inst, a, b)).r.outcome).toBe("added");
    expect((await add(s.inst, a, await mentor("c"))).r.reason).toBe("SECOND_OBSERVER_ALREADY_ADDED");
  });
  it("the second observer is involved for the involvement test", async () => {
    const w = await ready();
    expect(await asService(c, `select t3a_cr13_involvement('${w.b}','${w.p}', array['${DIM}'], false) r`).then((r) => r.r)).toBe("involved_observed");
    const rep = randomUUID();
    await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, represented_dimension_ids) values ('${rep}','${w.p}','${DIM}', array['${DIM}'])`);
    expect((await asService(c, `select t3a_report_actor_gate('${w.b}','${rep}','evidence_review') r`)).r.reason).toBe("involved_in_report");
  });
  it("adding an observer is a service route", async () => {
    const s = await session(true); const a = await mentor("a"); const b = await mentor("b");
    expect((await as(a, `select t3a_second_observer_add('${s.inst}','${a}','${b}') r`)).msg).toMatch(/permission denied/);
  });
});

describe("CR-15 independent captures", () => {
  it("T1: two independent capture sets; neither is visible to the other before both lock", async () => {
    const w = await ready();
    expect((await save(w.a, w.inst, { beat1: "A saw hesitation" })).r.outcome).toBe("saved");
    expect((await save(w.b, w.inst, { beat1: "B saw a pause", extra: "B only" })).r.outcome).toBe("saved");
    const ra = (await read(w.a, w.inst)).r; const rb = (await read(w.b, w.inst)).r;
    expect(ra.own.payload).toEqual({ beat1: "A saw hesitation" }); expect(ra.other).toBeNull(); expect(ra.both_locked).toBe(false);
    expect(rb.own.payload).toEqual({ beat1: "B saw a pause", extra: "B only" }); expect(rb.other).toBeNull();
    expect(JSON.stringify(ra)).not.toMatch(/B saw|B only/); expect(JSON.stringify(rb)).not.toMatch(/A saw/);
    // the table itself hides it too: a row level read sees only the observer's own capture
    { const q = await as(w.a, `select count(*)::int n from t3a_observer_capture where stage_instance_id='${w.inst}'`); expect(q.msg).toBe("ok"); expect(q.rows[0].n).toBe(1); }
    expect((await lock(w.a, w.inst)).r.both_locked).toBe(false);
    expect((await read(w.b, w.inst)).r.other).toBeNull();               // one locked is not both
    expect((await as(w.b, `select count(*)::int n from t3a_observer_capture where stage_instance_id='${w.inst}'`)).rows[0].n).toBe(1);
    expect((await lock(w.b, w.inst)).r.both_locked).toBe(true);
    const after = (await read(w.a, w.inst)).r;
    expect(after.both_locked).toBe(true); expect(after.other.payload).toEqual({ beat1: "B saw a pause", extra: "B only" });
    expect((await as(w.a, `select count(*)::int n from t3a_observer_capture where stage_instance_id='${w.inst}'`)).rows[0].n).toBe(2);
  });
  it("a locked capture never changes, an unlocked one can be revised, and a lock needs a capture", async () => {
    const w = await ready();
    expect((await lock(w.a, w.inst)).r.reason).toBe("NO_CAPTURE_TO_LOCK");
    await save(w.a, w.inst, { v: 1 }); await save(w.a, w.inst, { v: 2 });
    expect((await read(w.a, w.inst)).r.own.payload).toEqual({ v: 2 });
    await lock(w.a, w.inst);
    expect((await save(w.a, w.inst, { v: 3 })).r.reason).toBe("CAPTURE_LOCKED");
    expect((await lock(w.a, w.inst)).r.reason).toBe("CAPTURE_LOCKED");
    await expect(c.query(`update t3a_observer_capture set payload='{}'::jsonb where observer_id='${w.a}'`)).rejects.toThrow(/LOCKED/);
    await expect(c.query(`delete from t3a_observer_capture where observer_id='${w.a}'`)).rejects.toThrow(/APPEND_ONLY|never deleted/i);
  });
  it("only an observer of the session captures or reads; the participant and outsiders read nothing", async () => {
    const w = await ready(); const outsider = await mentor("o");
    await save(w.a, w.inst, { x: 1 }); await save(w.b, w.inst, { x: 2 }); await lock(w.a, w.inst); await lock(w.b, w.inst);
    for (const who of [outsider, w.p]) {
      expect((await save(who, w.inst, { x: 9 })).r.reason).toBe("NOT_AN_OBSERVER_OF_THIS_SESSION");
      expect((await read(who, w.inst)).r.reason).toBe("NOT_AN_OBSERVER_OF_THIS_SESSION");
      expect((await as(who, `select count(*)::int n from t3a_observer_capture where stage_instance_id='${w.inst}'`)).rows[0].n).toBe(0);
    }
  });
  it("agreement is computed only when both are locked, key by key", async () => {
    const w = await ready();
    await save(w.a, w.inst, { beat1: "same", beat2: "A" }); await save(w.b, w.inst, { beat1: "same", beat2: "B" });
    expect((await asService(c, `select t3a_observer_agreement('${w.inst}') r`)).r.outcome).toBe("not_ready");
    await lock(w.a, w.inst); await lock(w.b, w.inst);
    const ag = (await asService(c, `select t3a_observer_agreement('${w.inst}') r`)).r;
    expect(ag).toEqual({ outcome: "computed", agree: false, differing_keys: ["beat2"] });
    const w2 = await ready(); await save(w2.a, w2.inst, { k: 1 }); await save(w2.b, w2.inst, { k: 1 }); await lock(w2.a, w2.inst); await lock(w2.b, w2.inst);
    expect((await asService(c, `select t3a_observer_agreement('${w2.inst}') r`)).r).toEqual({ outcome: "computed", agree: true, differing_keys: [] });
    expect((await as(w.a, `select t3a_observer_agreement('${w.inst}') r`)).msg).toMatch(/permission denied/);
  });
  it("the consent and observer records are append-only", async () => {
    await expect(c.query(`update t3a_second_observer_consent_event set event='withdrawn'`)).rejects.toThrow(/append/i);
    await expect(c.query(`delete from t3a_session_observer`)).rejects.toThrow(/append/i);
  });
});
