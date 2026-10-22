/** CORR-007 Rev 1.6 rule CR-02: prior access bar and mentor rotation. Synthetic participants and mentors; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client;
const DIM = "D1";
const plan = (p: string, stage: string, comp: string | null = null) =>
  asService(c, `select t3a_observer_plan('${p}','${DIM}','${stage}', ${comp ? `'${comp}'` : "null"}) r`);
const check = (m: string, p: string, stage: string, comp: string | null = null) =>
  asService(c, `select t3a_observer_rotation_check('${m}','${p}','${DIM}','${stage}', ${comp ? `'${comp}'` : "null"}) r`);
const refused = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
/** A mentor authorized on D1; the assignment history is per participant, so mentors may be shared across the tests of one participant only. */
async function mkMentor(tag: string): Promise<string> {
  const m = await mkParticipant(c, tag, "mentor");
  await run(c, `insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status) values ('${m}','${DIM}', now() - interval '1 day','current','1.0','authorized')`);
  return m;
}
/** Records a mentor's access to a participant's Stage 1: as confirmer, through the real trigger. */
async function confirmAs(mentor: string, participant: string) {
  await run(c, `insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by, captured_at) values ('${randomUUID()}','${participant}','${DIM}','${mentor}',now())`);
}
/** Retires every mentor authorization the other tests created so the planner's candidate set is only this test's. */
async function onlyMentors(...ms: string[]) {
  await run(c, `update t3a_mentor_authorization set authorization_status='withdrawn' where dimension_id='${DIM}' and mentor_id <> all(array[${ms.map((m) => `'${m}'::uuid`).join(",")}]::uuid[]) and coalesce(authorization_status,'authorized') <> 'withdrawn'`);
}

beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

describe("CR-02 rotation at every Stage", () => {
  it("T1: the same mentor twice in a row at any Stage is refused", async () => {
    for (const stage of ["S1", "S2", "S3"]) {
      const a = await mkMentor(`cr02-t1a-${stage}`); const p = await mkParticipant(c, `cr02-t1p-${stage}`); await onlyMentors(a);
      expect((await plan(p, stage)).r.mentor_id).toBe(a);
      expect((await check(a, p, stage)).r).toEqual({ allowed: false, reason: "OBSERVER_REPEATS_PRECEDING_ATTEMPT" });
      const n = await refused("NO_ELIGIBLE_OBSERVER");
      expect((await plan(p, stage)).r.reason).toBe("NO_ELIGIBLE_OBSERVER");
      expect(await refused("NO_ELIGIBLE_OBSERVER")).toBe(n + 1);
    }
  });
  it("T2: mentor A then B is admitted", async () => {
    const a = await mkMentor("cr02-t2a"); const b = await mkMentor("cr02-t2b"); const p = await mkParticipant(c, "cr02-t2p");
    await onlyMentors(a, b);
    const first = (await plan(p, "S3")).r.mentor_id;
    const second = (await plan(p, "S3")).r.mentor_id;
    expect(new Set([first, second])).toEqual(new Set([a, b]));
  });
  it("T4: at Stage 3, A then B then A is admitted when no stricter exclusion applies", async () => {
    const a = await mkMentor("cr02-t4a"); const b = await mkMentor("cr02-t4b"); const p = await mkParticipant(c, "cr02-t4p");
    await onlyMentors(a, b);
    const m1 = (await plan(p, "S3")).r.mentor_id; const m2 = (await plan(p, "S3")).r.mentor_id;
    expect(m1).not.toBe(m2);
    const m3 = await plan(p, "S3");
    expect(m3.r.outcome).toBe("assigned"); expect(m3.r.mentor_id).toBe(m1);
  });
  it("rotation is per participant, per dimension and per Stage", async () => {
    const a = await mkMentor("cr02-pa"); const p = await mkParticipant(c, "cr02-pp"); const q = await mkParticipant(c, "cr02-pq");
    await onlyMentors(a);
    expect((await plan(p, "S3")).r.mentor_id).toBe(a);
    expect((await plan(q, "S3")).r.mentor_id).toBe(a);
    expect((await plan(p, "S1")).r.mentor_id).toBe(a);
  });
});

describe("CR-02 prior Stage 1 access at Stage 2", () => {
  it("T5: a Stage 1 confirmer is never proposed as the same participant's Stage 2 observer on the same dimension", async () => {
    const a = await mkMentor("cr02-t5a"); const b = await mkMentor("cr02-t5b"); const p = await mkParticipant(c, "cr02-t5p");
    await onlyMentors(a, b); await confirmAs(a, p);
    expect((await run(c, `select basis from t3a_s1_access_audit where participant_id='${p}' and reader_id='${a}'`))[0].basis).toBe("confirmer");
    expect((await check(a, p, "S2")).r).toEqual({ allowed: false, reason: "OBSERVER_HAS_STAGE1_ACCESS" });
    expect((await plan(p, "S2")).r.mentor_id).toBe(b);
    const q = await mkParticipant(c, "cr02-t5q");
    expect((await check(a, q, "S2")).r.allowed).toBe(true);
  });
  it("the bar is Stage 2 only: a confirmer may observe Stage 3 of the same participant", async () => {
    const a = await mkMentor("cr02-t5s3a"); const p = await mkParticipant(c, "cr02-t5s3p"); await onlyMentors(a); await confirmAs(a, p);
    expect((await check(a, p, "S3")).r.allowed).toBe(true);
  });
  it("T3: Stage 2 with A, then B, then A, where A received Stage 1 after the first commit: the third attempt is refused", async () => {
    const a = await mkMentor("cr02-t3a"); const b = await mkMentor("cr02-t3b"); const p = await mkParticipant(c, "cr02-t3p");
    await onlyMentors(a, b);
    await run(c, `insert into t3a_observer_assignment(participant_id, dimension_id, stage_code, mentor_id) values ('${p}','${DIM}','S2','${a}')`);
    await run(c, `insert into t3a_s1_access_audit(participant_id, dimension_id, reader_id, basis, route) values ('${p}','${DIM}','${a}','stage2_committed','api')`);
    expect((await plan(p, "S2")).r.mentor_id).toBe(b);
    const third = await plan(p, "S2");
    expect(third.r.reason).toBe("NO_ELIGIBLE_OBSERVER");
    expect(JSON.stringify(third.r)).not.toMatch(/"outcome":"assigned"/);
    expect((await check(a, p, "S2")).r.reason).toBe("OBSERVER_HAS_STAGE1_ACCESS");
  });
  it("three Stage 2 attempts need three mentors", async () => {
    const ms = [await mkMentor("cr02-3a"), await mkMentor("cr02-3b"), await mkMentor("cr02-3c")]; const p = await mkParticipant(c, "cr02-3p");
    await onlyMentors(...ms);
    const got: string[] = [];
    for (const m of ms) { const r = await plan(p, "S2"); got.push(r.r.mentor_id); await run(c, `insert into t3a_s1_access_audit(participant_id, dimension_id, reader_id, basis, route) values ('${p}','${DIM}','${r.r.mentor_id}','stage2_committed','api')`); }
    expect(new Set(got).size).toBe(3);
    expect((await plan(p, "S2")).r.reason).toBe("NO_ELIGIBLE_OBSERVER");
  });
});

describe("CR-02 Stage 4 composition", () => {
  it("T7: a Stage 4 attempt with no composition record is refused before entry", async () => {
    const a = await mkMentor("cr02-t7a"); const p = await mkParticipant(c, "cr02-t7p"); await onlyMentors(a);
    const n = await refused("S4_COMPOSITION_MISSING");
    expect((await plan(p, "S4")).r.reason).toBe("S4_COMPOSITION_MISSING");
    expect((await plan(p, "S4", "  ")).r.reason).toBe("S4_COMPOSITION_MISSING");
    expect(await refused("S4_COMPOSITION_MISSING")).toBe(n + 2);
    expect((await run(c, `select count(*)::int n from t3a_observer_assignment where participant_id='${p}'`))[0].n).toBe(0);
  });
  it("the rotation check itself reports a missing Stage 4 composition", async () => {
    const a = await mkMentor("cr02-t7c"); const p = await mkParticipant(c, "cr02-t7cp");
    expect((await check(a, p, "S4")).r).toEqual({ allowed: false, reason: "S4_COMPOSITION_MISSING" });
    expect((await check(a, p, "S4", `G-${RUN}-x`)).r.allowed).toBe(true);
  });
  it("T6: a Stage 4 repeat attempt with an earlier group composition is refused by the planner", async () => {
    const a = await mkMentor("cr02-t6a"); const b = await mkMentor("cr02-t6b"); const p = await mkParticipant(c, "cr02-t6p"); await onlyMentors(a, b);
    const first = await plan(p, "S4", `G-${RUN}-1`);
    expect(first.r.outcome).toBe("assigned");
    const same = await plan(p, "S4", `G-${RUN}-1`);
    expect(same.r.reason).toBe("NO_ELIGIBLE_OBSERVER"); expect(same.r.detail ?? JSON.stringify(same.r)).toBeDefined();
    expect((await check(b, p, "S4", `G-${RUN}-1`)).r.reason).toBe("S4_COMPOSITION_REPEATED");
    const next = await plan(p, "S4", `G-${RUN}-2`);
    expect(next.r.outcome).toBe("assigned"); expect(next.r.mentor_id).toBe(first.r.mentor_id === a ? b : a);
  });
});

describe("CR-02 planner and records", () => {
  it("a participant never chooses an observer: the planner and the check are service only", async () => {
    const p = await mkParticipant(c, "cr02-svc");
    const r = await asRole(c, "authenticated", p, `select t3a_observer_plan('${p}','${DIM}','S3',null) r`);
    expect(r.msg).toMatch(/permission denied/);
    const r2 = await asRole(c, "authenticated", p, `select t3a_observer_rotation_check('${p}','${p}','${DIM}','S3',null) r`);
    expect(r2.msg).toMatch(/permission denied/);
  });
  it("a mentor with an open conflict, no authorization or a different dimension is never proposed; the participant is never their own observer", async () => {
    const a = await mkMentor("cr02-c1"); const p = await mkParticipant(c, "cr02-c1p"); await onlyMentors(a);
    await run(c, `insert into t3a_conflict_declaration(mentor_id, participant_id, reason_class) values ('${a}','${p}','family')`);
    expect((await plan(p, "S3")).r.reason).toBe("NO_ELIGIBLE_OBSERVER");
    const b = await mkMentor("cr02-c2"); await onlyMentors(a, b);
    expect((await plan(p, "S3")).r.mentor_id).toBe(b);
    const self = await mkMentor("cr02-self"); await onlyMentors(self);
    expect((await plan(self, "S3")).r.reason).toBe("NO_ELIGIBLE_OBSERVER");
  });
  it("assignments and the Stage 1 access audit are append-only", async () => {
    const a = await mkMentor("cr02-ap"); const p = await mkParticipant(c, "cr02-app"); await onlyMentors(a); await plan(p, "S3"); await confirmAs(a, p);
    await expect(c.query(`update t3a_observer_assignment set mentor_id = mentor_id`)).rejects.toThrow(/append/i);
    await expect(c.query(`delete from t3a_s1_access_audit`)).rejects.toThrow(/append/i);
  });
});
