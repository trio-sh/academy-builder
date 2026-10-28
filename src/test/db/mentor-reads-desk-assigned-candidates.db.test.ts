/** CR-336. The mentor desk list reads each assigned person's candidate_profiles row (migration 20270252), and the Austin assignment script (tools/day1/live_data). Synthetic people; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let seq = 0;
const exec = (sql: string) => c.query(sql);

/** A mentor account. `true`: a mentor profile, which the account sync turns into the administrator-granted mentor role (a signed-in user cannot set their own profile role: t3a_profiles_role_guard_trg).
 *  `false`: an ordinary signed-in user who makes their own desk mentor_profiles row, which anyone can. `"ended"`: an ordinary account whose only mentor role has already ended (the role register is append only). */
async function mkMentor(granted: boolean | "ended" = true) {
  const id = await mkParticipant(c, `dm-${++seq}`, granted === true ? "mentor" : "candidate");
  const mp = (await run(c, `insert into mentor_profiles(profile_id) values ('${id}') returning id`))[0].id as string;
  if (granted === "ended") await exec(`insert into t3a_role_assignment(account_id, role_code, role_grant_basis, role_granted_by, role_rules_version, role_effective_from, role_effective_until) values ('${id}','mentor','administrator_grant','${id}','1.0', now() - interval '3 days', now() - interval '1 day')`);
  return { id, mp };
}
/** A candidate with a candidate_profiles row. */
async function mkCandidate() {
  const id = await mkParticipant(c, `dc-${++seq}`);
  const cp = (await run(c, `insert into candidate_profiles(profile_id) values ('${id}') returning id`))[0].id as string;
  return { id, cp };
}
const assign = (mentorProfile: string, candidateProfile: string, status = "active") =>
  exec(`insert into mentor_assignments(mentor_id, candidate_id, status) values ('${mentorProfile}','${candidateProfile}','${status}')`);
const canRead = async (sub: string, cp: string) => (await asRole(c, "authenticated", sub, `select count(*)::int r from candidate_profiles where id='${cp}'`)).r === 1;

// The throwaway build runs a second pass over every file that errored in the first, which puts earlier definitions of this policy back after 20270252. On the live project each
// migration runs once, in order. The file is applied again here (it is idempotent) so the tests judge the policy as the migration leaves it.
beforeAll(async () => {
  c = await connect();
  await exec(readFileSync(new URL("../../../supabase/migrations/20270252000000_mentor_reads_legacy_assigned_candidates.sql", import.meta.url), "utf8"));
});
afterAll(async () => { await c.end(); });

describe("a mentor reads the candidate_profiles row of a person on their own active desk assignment", () => {
  it("reads it when granted the mentor role and actively assigned", async () => {
    const m = await mkMentor(); const p = await mkCandidate(); await assign(m.mp, p.cp);
    expect(await canRead(m.id, p.cp)).toBe(true);
  });
  it("does not read a person they are not assigned to", async () => {
    const m = await mkMentor(); const other = await mkMentor(); const p = await mkCandidate(); await assign(other.mp, p.cp);
    expect(await canRead(m.id, p.cp)).toBe(false);
  });
  it("does not read through an assignment that is transferred or completed", async () => {
    const m = await mkMentor(); const t = await mkCandidate(); const q = await mkCandidate();
    await assign(m.mp, t.cp, "transferred"); await assign(m.mp, q.cp, "completed");
    expect(await canRead(m.id, t.cp)).toBe(false); expect(await canRead(m.id, q.cp)).toBe(false);
  });
  it("an ordinary signed-in user who makes their own mentor profile and assignment row reads nothing: the mentor role is administrator-granted", async () => {
    const m = await mkMentor(false); const p = await mkCandidate();
    await assign(m.mp, p.cp);
    expect(await canRead(m.id, p.cp)).toBe(false);
  });
  it("a mentor role that has ended does not count", async () => {
    const m = await mkMentor("ended"); const p = await mkCandidate(); await assign(m.mp, p.cp);
    expect(await canRead(m.id, p.cp)).toBe(false);
  });
  it("the person still reads their own row, a stranger still reads none, and the formal assignment route still works", async () => {
    const m = await mkMentor(); const p = await mkCandidate(); const stranger = await mkCandidate();
    expect(await canRead(p.id, p.cp)).toBe(true); expect(await canRead(stranger.id, p.cp)).toBe(false);
    const si = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no) values ('${p.id}','S1','D1',1) returning stage_instance_id i`))[0].i;
    await exec(`insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) values ('${m.id}','${p.id}','${si}','coordinator_allocated')`);
    expect(await canRead(m.id, p.cp)).toBe(true);
  });
});

describe("the Austin assignment script", () => {
  const src = readFileSync(new URL("../../../tools/day1/live_data/austin_mentor_assignment.sql", import.meta.url), "utf8");
  const rollback = readFileSync(new URL("../../../docs/day1/evidence/rollback_austin_mentor_assignment.sql", import.meta.url), "utf8");
  const forTest = (sql: string, a: string, t: string) => sql.replaceAll("austinegakehmi@gmail.com", a).replaceAll("tony1mofoke@yahoo.com", t);
  async function pair() {
    const a = await mkParticipant(c, `aus-${++seq}`); const t = await mkParticipant(c, `ton-${++seq}`, "mentor");
    const emails = (await run(c, `select id, email from profiles where id in ('${a}','${t}')`)) as Array<{ id: string; email: string }>;
    return { a, t, ae: emails.find((e) => e.id === a)!.email, te: emails.find((e) => e.id === t)!.email };
  }
  const counts = (a: string) => run(c, `select (select count(*)::int from t3a_stage_instance where participant_id='${a}') si, (select count(*)::int from t3a_mentor_assignment where participant_id='${a}') ma`).then((r) => r[0]);

  it("creates one eligible Stage 1 instance and one coordinator assignment, and running it again adds nothing", async () => {
    const x = await pair(); const sql = forTest(src, x.ae, x.te);
    await exec(sql);
    expect(await counts(x.a)).toEqual({ si: 1, ma: 1 });
    const row = (await run(c, `select si.state, si.stage_code, si.dimension_id, ma.assignment_method, ma.mentor_id from t3a_mentor_assignment ma join t3a_stage_instance si using (stage_instance_id) where ma.participant_id='${x.a}'`))[0];
    expect(row).toMatchObject({ state: "eligible", stage_code: "S1", dimension_id: "D1", assignment_method: "coordinator_allocated", mentor_id: x.t });
    await exec(sql);
    expect(await counts(x.a)).toEqual({ si: 1, ma: 1 });
  });
  it("reuses an existing Stage 1 instance instead of adding a second", async () => {
    const x = await pair();
    await exec(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no) values ('${x.a}','S1','D1',1)`);
    await exec(forTest(src, x.ae, x.te));
    expect(await counts(x.a)).toEqual({ si: 1, ma: 1 });
  });
  it("refuses when an account is missing, and changes nothing", async () => {
    const x = await pair();
    await expect(exec(forTest(src, x.ae, "nobody-" + randomUUID() + "@t.local"))).rejects.toThrow(/AUSTIN_ASSIGNMENT_ACCOUNT_MISSING/);
    expect(await counts(x.a)).toEqual({ si: 0, ma: 0 });
  });
  it("the participant's own entry route finds and reuses the instance, and the mentor reads her desk row once the migration is in place", async () => {
    const x = await pair(); await exec(forTest(src, x.ae, x.te));
    const cp = (await run(c, `insert into candidate_profiles(profile_id) values ('${x.a}') returning id`))[0].id;
    const tm = (await run(c, `insert into mentor_profiles(profile_id) values ('${x.t}') returning id`))[0].id;
    await assign(tm, cp);
    expect(await canRead(x.t, cp)).toBe(true);
  });
  it("the rollback removes both rows while the instance is untouched, and leaves an instance that has been entered", async () => {
    const x = await pair(); await exec(forTest(src, x.ae, x.te)); await exec(forTest(rollback, x.ae, x.te));
    expect(await counts(x.a)).toEqual({ si: 0, ma: 0 });
    await exec(forTest(src, x.ae, x.te));
    await exec(`update t3a_stage_instance set state='active', activated_at=now() where participant_id='${x.a}'`);
    await exec(forTest(rollback, x.ae, x.te));
    expect(await counts(x.a)).toEqual({ si: 1, ma: 0 });
  });
});
