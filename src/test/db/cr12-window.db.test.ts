/**
 * CORR-007 Rev 1.6 rule CR-12, part 1: the trailing six month window, commit instants and expiry, the 7/14/21 day waits,
 * rescheduling waits, no wait after a welfare stop or technical failure, and rule values that cannot change.
 * Synthetic participants; throwaway database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { asService, connect, iso, mkParticipant, run } from "./helpers";

let c: pg.Client;
beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

const done = (u: string, d: string, at: string, stage = "S2") =>
  run(c, `insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, attempt_event_class) values ('${u}','${d}','${stage}','completed',true,'${at}','completed_observation')`);
const ending = (u: string, cls: string, at: string, outcome = "participant_withdrew", d = "D2", stage = "S2") =>
  run(c, `insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, attempt_event_class) values ('${u}','${d}','${stage}','${outcome}',false,'${at}','${cls}')`);
const elig = async (u: string, at: string, d = "D2", stage = "S2") =>
  (await run(c, `select t3a_attempt_eligibility('${u}','${d}','${stage}','${at}') r`))[0].r;

describe("CR-12 T1: the cap and the earliest eligible instant", () => {
  it("four commits then a start on 18 July is refused ATTEMPT_CAP_REACHED, earliest eligible 1 November", async () => {
    const u = await mkParticipant(c, "w-a");
    for (const d of ["2027-01-11T12:00:00Z", "2027-05-01T12:00:00Z", "2027-06-01T12:00:00Z", "2027-07-11T12:00:00Z"]) await done(u, "D2", d);
    const r = await elig(u, "2027-07-18T12:00:00Z");
    expect(r.refusal_code).toBe("ATTEMPT_CAP_REACHED");
    expect(iso(r.earliest_eligible_at)).toBe("2027-11-01T12:00:00.000Z");
    expect(r.counted_in_window).toBe(3);
  });
});

describe("CR-12 T2: the wait by position in the window", () => {
  it("5 August is refused by the 21 day wait; 26 August is admitted; after another commit the cap refuses", async () => {
    const u = await mkParticipant(c, "w-b");
    for (const d of ["2027-01-11T12:00:00Z", "2027-02-01T12:00:00Z", "2027-03-15T12:00:00Z", "2027-07-19T12:00:00Z"]) await done(u, "D2", d);
    const early = await elig(u, "2027-08-05T12:00:00Z");
    expect(early.refusal_code).toBe("SPECIFICATION_COOLDOWN_IN_FORCE");
    expect(iso(early.earliest_eligible_at)).toBe("2027-08-09T12:00:00.000Z");
    const later = await elig(u, "2027-08-26T12:00:00Z");
    expect(later.permitted).toBe(true);
    expect(later.counted_in_window).toBe(2);
    await done(u, "D2", "2027-08-26T13:00:00Z");
    const capped = await elig(u, "2027-08-26T13:30:00Z");
    expect(capped.refusal_code).toBe("ATTEMPT_CAP_REACHED");
    expect(capped.counted_in_window).toBe(3);
  });
});

describe("CR-12 T3: month end rule, stored expiry, display zone", () => {
  it("31 August 14:00 plus six calendar months is 28 February 14:00, stored; refused at 13:59, admitted at 14:00", async () => {
    const u = await mkParticipant(c, "w-c");
    await done(u, "D2", "2026-08-31T14:00:00Z"); await done(u, "D2", "2026-10-01T09:00:00Z"); await done(u, "D2", "2026-11-02T09:00:00Z");
    const exp = async () => (await run(c, `select exclusion_expiry_at e from t3a_attempt where participant_id='${u}' order by commit_at limit 1`))[0].e;
    expect(iso(await exp())).toBe("2027-02-28T14:00:00.000Z");
    expect((await elig(u, "2027-02-28T13:59:00Z")).refusal_code).toBe("ATTEMPT_CAP_REACHED");
    expect((await elig(u, "2027-02-28T14:00:00Z")).permitted).toBe(true);
    await c.query("set time zone 'Pacific/Auckland'");
    try {
      expect((await elig(u, "2027-02-28T13:59:00Z")).refusal_code).toBe("ATTEMPT_CAP_REACHED");
      expect(iso(await exp())).toBe("2027-02-28T14:00:00.000Z");
    } finally { await c.query("set time zone 'UTC'"); }
  });
});

describe("CR-12 T8: rule values cannot change at runtime", () => {
  it("a change of the cap is refused and logged", async () => {
    const before = (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='ATTEMPT_RULE_CHANGE_REFUSED'`))[0].n;
    const res = await asService(c, `select t3a_attempt_rule_change('cap','4') r`);
    expect(res.r.reason).toBe("ATTEMPT_RULE_CHANGE_REFUSED");
    const after = (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='ATTEMPT_RULE_CHANGE_REFUSED'`))[0].n;
    expect(after).toBe(before + 1);
  });
  it.each([["update t3a_attempt_rule set rule_value='4' where rule_key='cap'"], ["delete from t3a_attempt_rule"]])("the rule rows cannot be edited or deleted: %s", async (sql) => {
    await c.query("begin");
    let err = "";
    try { await c.query(sql); } catch (e: any) { err = e.message; }
    await c.query("rollback");
    expect(err).toMatch(/append|T3A_/i);
  });
});

describe("CR-12 T11: offsets are converted, never truncated", () => {
  it("the same instant, and the expiry follows", async () => {
    const same = (await run(c, `select ('2027-01-01T10:00:00-06:00'::timestamptz = '2027-01-01T16:00:00Z'::timestamptz) a, ('2027-03-14T03:30:00-06:00'::timestamptz = '2027-03-14T09:30:00Z'::timestamptz) b`))[0];
    expect(same.a && same.b).toBe(true);
    const u = await mkParticipant(c, "w-d");
    await done(u, "D2", "2027-03-14T03:30:00-06:00");
    const cm = (await run(c, `select commit_at, exclusion_expiry_at from t3a_attempt where participant_id='${u}'`))[0];
    expect(iso(cm.commit_at)).toBe("2027-03-14T09:30:00.000Z");
    expect(iso(cm.exclusion_expiry_at)).toBe("2027-09-14T09:30:00.000Z");
  });
});

describe("CR-12: waits after counted attempts, per Stage and dimension", () => {
  it("7 days after the first, 14 after the second", async () => {
    const u = await mkParticipant(c, "w-e");
    await done(u, "D2", "2027-03-01T12:00:00Z");
    const d6 = await elig(u, "2027-03-07T12:00:00Z");
    expect(d6.refusal_code).toBe("SPECIFICATION_COOLDOWN_IN_FORCE");
    expect(iso(d6.earliest_eligible_at)).toBe("2027-03-08T12:00:00.000Z");
    expect((await elig(u, "2027-03-08T12:00:00Z")).permitted).toBe(true);
    await done(u, "D2", "2027-03-20T12:00:00Z");
    const d13 = await elig(u, "2027-04-02T12:00:00Z");
    expect(d13.refusal_code).toBe("SPECIFICATION_COOLDOWN_IN_FORCE");
    expect(iso(d13.earliest_eligible_at)).toBe("2027-04-03T12:00:00.000Z");
    expect((await elig(u, "2027-03-21T12:00:00Z", "D2", "S1")).permitted).toBe(true);
    expect((await elig(u, "2027-03-21T12:00:00Z", "D3", "S2")).permitted).toBe(true);
  });
});

describe("CR-12: rescheduling waits", () => {
  it("a no show with no counted attempt waits 7 days", async () => {
    const u = await mkParticipant(c, "w-f");
    await ending(u, "participant_no_show", "2027-05-01T12:00:00Z");
    expect((await elig(u, "2027-05-07T12:00:00Z")).refusal_code).toBe("SPECIFICATION_COOLDOWN_IN_FORCE");
    expect((await elig(u, "2027-05-08T12:00:00Z")).permitted).toBe(true);
  });
  it("an identity failure with two counted attempts in the window waits 14 days", async () => {
    const u = await mkParticipant(c, "w-g");
    await done(u, "D2", "2027-01-05T12:00:00Z"); await done(u, "D2", "2027-02-10T12:00:00Z");
    await ending(u, "identity_verification_failure", "2027-04-01T12:00:00Z", "abandoned");
    const r = await elig(u, "2027-04-14T12:00:00Z");
    expect(r.refusal_code).toBe("SPECIFICATION_COOLDOWN_IN_FORCE");
    expect(iso(r.earliest_eligible_at)).toBe("2027-04-15T12:00:00.000Z");
    expect((await elig(u, "2027-04-15T12:00:00Z")).permitted).toBe(true);
  });
  it.each([
    ["welfare_stop", "participant_withdrew"], ["technical_failure", "system_failure"], ["accommodation_interruption", "abandoned"],
    ["administration_failure", "system_failure"], ["cancelled_before_start", "abandoned"],
  ])("%s counts nothing and sets no wait", async (cls, outcome) => {
    const u = await mkParticipant(c, "w-n" + cls.slice(0, 3));
    await ending(u, cls, "2027-06-01T12:00:00Z", outcome);
    const r = await elig(u, "2027-06-01T12:00:01Z");
    expect(r.permitted).toBe(true);
    expect(r.counted_in_window).toBe(0);
  });
});

describe("CR-12: the older questions read the same rule", () => {
  it("the three argument route and the cooldown status text", async () => {
    const u = await mkParticipant(c, "w-h");
    await done(u, "D2", new Date(Date.now() - 2 * 86400e3).toISOString());
    const old = (await run(c, `select t3a_d1_next_attempt_permitted('${u}','D2','S2') r`))[0].r;
    expect(old.refusal_code).toBe("SPECIFICATION_COOLDOWN_IN_FORCE");
    expect(old.earliest_eligible_at).toBeTruthy();
    const st = async (x: string) => (await run(c, `select t3a_cooldown_status('${x}','D2','S2') s`))[0].s;
    expect(await st(await mkParticipant(c, "w-i"))).toBe("AVAILABLE");
    expect(await st(u)).toMatch(/^ON_COOLDOWN\(until=\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\)$/);
    const w3 = await mkParticipant(c, "w-j");
    for (const d of [150, 120, 90]) await done(w3, "D2", new Date(Date.now() - d * 86400e3).toISOString());
    expect(await st(w3)).toBe("ATTEMPTS_EXCEEDED");
    const wi = await mkParticipant(c, "w-k");
    await run(c, `insert into t3a_attempt(participant_id, dimension_id, stage_code) values ('${wi}','D2','S2')`);
    expect(await st(wi)).toBe("AVAILABLE");
  });
});
