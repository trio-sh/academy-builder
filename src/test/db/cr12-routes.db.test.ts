/**
 * CORR-007 Rev 1.6 rule CR-12, part 2: one active attempt, idempotency, callbacks counted once, refusals with no active attempt,
 * fail-closed unclassified endings, reclassification that keeps the number. Synthetic participants; throwaway database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { asRole, asService, connect, mkParticipant, RUN, run } from "./helpers";

let c: pg.Client, cA: pg.Client, cB: pg.Client;
beforeAll(async () => { c = await connect(); cA = await connect(); cB = await connect(); });
afterAll(async () => { await Promise.all([c.end(), cA.end(), cB.end()]); });

const begin = (u: string, key: string, at = "2027-04-01T09:00:00Z", d = "D2", s = "S2") => `select t3a_attempt_begin('${u}','${d}','${s}','${key}','${at}') r`;
const end = (u: string, ending: string, cb: string | null, at = "2027-04-01T10:00:00Z", d = "D2", s = "S2") =>
  `select t3a_attempt_end('${u}','${d}','${s}','${ending}',${cb ? `'${cb}'` : "null"},'${at}') r`;
const refusals = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const counted = async (u: string) => (await run(c, `select count(*)::int n from t3a_attempt_live where participant_id='${u}' and outcome='completed' and counted`))[0].n;

describe("CR-12 T4: one active attempt, idempotent start", () => {
  it("two starts at once: exactly one starts, the other is refused ATTEMPT_ACTIVE", async () => {
    const u = await mkParticipant(c, "r-a");
    const before = await refusals("ATTEMPT_ACTIVE");
    const [s1, s2] = await Promise.all([asService(cA, begin(u, "K1" + RUN)), asService(cB, begin(u, "K2" + RUN))]);
    const results = [s1.r, s2.r];
    expect(results.filter((x) => x.outcome === "started")).toHaveLength(1);
    expect(results.filter((x) => x.reason === "ATTEMPT_ACTIVE")).toHaveLength(1);
    expect((await run(c, `select count(*)::int n from t3a_attempt where participant_id='${u}' and outcome='initiated'`))[0].n).toBe(1);
    expect(await refusals("ATTEMPT_ACTIVE")).toBe(before + 1);
    const winner = results.find((x) => x.outcome === "started");
    const winKey = (s1.r.outcome === "started" ? "K1" : "K2") + RUN;
    const again = await asService(c, begin(u, winKey, "2027-04-01T09:00:05Z"));
    expect(again.r.outcome).toBe("existing");
    expect(again.r.attempt_id).toBe(winner.attempt_id);
  });
  it("a start with no idempotency key is refused", async () => {
    const u = await mkParticipant(c, "r-b");
    const r = await asService(c, `select t3a_attempt_begin('${u}','D2','S2','', now()) r`);
    expect(r.r.reason).toBe("IDEMPOTENCY_KEY_MISSING");
  });
  it("the database itself refuses a second active attempt from any route", async () => {
    const u = await mkParticipant(c, "r-c");
    await run(c, `insert into t3a_attempt(participant_id, dimension_id, stage_code, attempt_rules_version, attempt_event_class) values ('${u}','D2','S2', '1.0', 'completed_observation')`);
    await expect(c.query(`insert into t3a_attempt(participant_id, dimension_id, stage_code, attempt_rules_version, attempt_event_class) values ('${u}','D2','S2', '1.0', 'completed_observation')`)).rejects.toThrow(/t3a_attempt_one_active|duplicate key/);
  });
});

describe("CR-12 T5: a completion callback counts once", () => {
  it("delivered twice", async () => {
    const u = await mkParticipant(c, "r-d");
    await asService(c, begin(u, "T5" + RUN));
    const e1 = await asService(c, end(u, "completed_observation", "cb-" + RUN));
    const e2 = await asService(c, end(u, "completed_observation", "cb-" + RUN));
    expect(e1.r.outcome).toBe("ended");
    expect(e2.r.outcome).toBe("already_recorded");
    expect(await counted(u)).toBe(1);
  });
  it("two racing", async () => {
    const u = await mkParticipant(c, "r-e");
    await asService(c, begin(u, "R" + RUN, "2027-05-01T09:00:00Z"));
    const [r1, r2] = await Promise.all([
      asService(cA, end(u, "completed_observation", "race-" + RUN, "2027-05-01T10:00:00Z")),
      asService(cB, end(u, "completed_observation", "race-" + RUN, "2027-05-01T10:00:00Z")),
    ]);
    expect([r1.r, r2.r].filter((x) => x.outcome === "ended")).toHaveLength(1);
    expect(await counted(u)).toBe(1);
  });
});

describe("CR-12 T9, T10: an ending with no active attempt", () => {
  it("is refused and logged, creating no attempt and no count", async () => {
    const u = await mkParticipant(c, "r-f");
    const before = await refusals("NO_ACTIVE_ATTEMPT");
    const r = await asService(c, end(u, "completed_observation", null));
    expect(r.r.reason).toBe("NO_ACTIVE_ATTEMPT");
    expect(await refusals("NO_ACTIVE_ATTEMPT")).toBe(before + 1);
    expect((await run(c, `select count(*)::int n from t3a_attempt where participant_id='${u}'`))[0].n).toBe(0);
  });
  it("a refused early callback does not reserve its identifier: the same identifier counts once later", async () => {
    const u = await mkParticipant(c, "r-g");
    const early = await asService(c, end(u, "completed_observation", "late-" + RUN));
    expect(early.r.reason).toBe("NO_ACTIVE_ATTEMPT");
    await asService(c, begin(u, "S9" + RUN, "2027-06-01T09:00:00Z"));
    const later = await asService(c, end(u, "completed_observation", "late-" + RUN, "2027-06-01T10:00:00Z"));
    expect(later.r.outcome).toBe("ended");
    expect(await counted(u)).toBe(1);
  });
});

describe("CR-12 T6: an ending that matches no defined event", () => {
  it("fails closed, is logged by name, blocks a new attempt until classified", async () => {
    const u = await mkParticipant(c, "r-h");
    await asService(c, begin(u, "U" + RUN, "2027-04-01T09:00:00Z"));
    const before = await refusals("ENDING_UNCLASSIFIED");
    const my = await asService(c, end(u, "mystery_ending", null, "2027-04-01T09:10:00Z"));
    expect(my.r.outcome).toBe("unclassified");
    expect(my.r.counted).toBe(false);
    expect(await counted(u)).toBe(0);
    expect(await refusals("ENDING_UNCLASSIFIED")).toBe(before + 1);
    expect((await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='ENDING_UNCLASSIFIED' and subject_ref='mystery_ending'`))[0].n).toBeGreaterThanOrEqual(1);
    expect((await asService(c, begin(u, "U2" + RUN, "2027-05-01T09:00:00Z"))).r.reason).toBe("ENDING_UNCLASSIFIED");
    const cl = await asService(c, `select t3a_attempt_reclassify('${my.r.attempt_id}','technical_failure') r`);
    expect(cl.r.outcome).toBe("reclassified");
    expect((await asService(c, begin(u, "U3" + RUN, "2027-05-01T09:00:00Z"))).r.outcome).toBe("started");
  });
});

describe("CR-12 T7: reclassifying a counted completion", () => {
  it("keeps the original, supersedes it, keeps the number, recalculates the count, leaves a visible gap", async () => {
    const u = await mkParticipant(c, "r-i");
    for (const [k, at, e] of [["A", "2027-01-11T12:00:00Z", "2027-01-11T12:30:00Z"], ["B", "2027-02-11T12:00:00Z", "2027-02-11T12:30:00Z"]] as const) {
      await asService(c, begin(u, k + RUN, at));
      await asService(c, end(u, "completed_observation", null, e));
    }
    const second = (await run(c, `select attempt_id from t3a_attempt where participant_id='${u}' and attempt_no=2`))[0];
    const rc = await asService(c, `select t3a_attempt_reclassify('${second.attempt_id}','administration_failure') r`);
    expect(rc.r.outcome).toBe("reclassified");
    const rows = await run(c, `select attempt_id, attempt_no, outcome, counted, superseded_by, supersedes from t3a_attempt where participant_id='${u}'`);
    const orig = rows.find((x) => x.attempt_id === second.attempt_id);
    const repl = rows.find((x) => x.supersedes === second.attempt_id);
    expect(orig.superseded_by).toBe(repl.attempt_id);
    expect(orig.outcome).toBe("completed");
    expect(repl.attempt_no).toBe(2);
    expect(repl.counted).toBe(false);
    expect(await counted(u)).toBe(1);
    const el = (await run(c, `select t3a_attempt_eligibility('${u}','D2','S2','2027-03-01T00:00:00Z') r`))[0].r;
    expect(el.permitted).toBe(true);
    expect(el.counted_in_window).toBe(1);
    await asService(c, begin(u, "C" + RUN, "2027-03-01T12:00:00Z"));
    await asService(c, end(u, "completed_observation", null, "2027-03-01T12:30:00Z"));
    const nos = (await run(c, `select attempt_no from t3a_attempt where participant_id='${u}' and outcome='completed' and counted and superseded_by is null order by attempt_no`)).map((x) => x.attempt_no);
    expect(nos).toEqual([1, 3]);
  });
});

describe("CR-12: who may call the routes", () => {
  it("a participant cannot", async () => {
    const u = await mkParticipant(c, "r-j");
    const r = await asRole(c, "authenticated", u, begin(u, "x" + RUN, new Date().toISOString()));
    expect(r.msg).toMatch(/permission denied|SERVICE_ONLY/);
  });
});
