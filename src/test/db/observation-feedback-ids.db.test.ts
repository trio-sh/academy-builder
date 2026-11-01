/**
 * The S2 feedback a mentor's observation writes (observation_feedback): its mentor_id and candidate_id are profile ids. The page used to send the desk row ids, which the foreign keys refuse.
 * Synthetic people; throwaway database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type pg from "pg";
import { asRole, connect, mkParticipant, run } from "./helpers";

let c: pg.Client;
let M: string, K: string, S: string, mp: string, cp: string, ma: string;
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);

beforeAll(async () => {
  c = await connect();
  for (const f of ["20270252000000_mentor_reads_legacy_assigned_candidates", "20270253000000_assigned_dimensions_scoped_access", "20270254000000_observation_tables_scoped_and_no_self_mentoring", "20270255000000_close_open_write_policies", "20270256000000_mentor_assignment_pending_and_declined"])
    await c.query(readFileSync(new URL(`../../../supabase/migrations/${f}.sql`, import.meta.url), "utf8"));
  M = await mkParticipant(c, "of-m", "mentor"); K = await mkParticipant(c, "of-k"); S = await mkParticipant(c, "of-s");
  mp = (await run(c, `insert into mentor_profiles(profile_id) values ('${M}') returning id`))[0].id;
  cp = (await run(c, `insert into candidate_profiles(profile_id) values ('${K}') returning id`))[0].id;
  ma = (await run(c, `insert into mentor_assignments(mentor_id, candidate_id, status) values ('${mp}','${cp}','active') returning id`))[0].id;
});
afterAll(async () => { await c.end(); });

const row = (mentor: string, cand: string) => `insert into observation_feedback(assignment_id, candidate_id, mentor_id, dimension_id, feedback_level, bars_score, status, mentor_approved)
  values ('${ma}','${cand}','${mentor}','integrity_ethics',2,3,'approved',true)`;

describe("observation_feedback ids", () => {
  it("the mentor's feedback with profile ids is accepted", async () => {
    expect((await as(M, row(M, K))).msg).toBe("ok");
  });
  it("the desk row ids, which the page used to send, are refused", async () => {
    expect((await as(M, row(mp, cp))).msg).toMatch(/row-level security|foreign key/);
  });
  it("a stranger cannot write or read a mentor's feedback", async () => {
    expect((await as(S, row(M, K))).msg).toMatch(/row-level security/);
    expect((await as(S, `select count(*)::int r from observation_feedback`)).r).toBe(0);
  });
});
