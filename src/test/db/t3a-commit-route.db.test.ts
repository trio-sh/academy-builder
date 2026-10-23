/** The commit route's core against the real database function. Throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { handleCommitRequest, type CommitDeps } from "../../server/t3aCommitRoute";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let observer: string; let other: string; let participant: string; let inst: string; let rec: string;
const depsFor = (user: string): CommitDeps => ({
  verifyToken: async (t) => (t === "tok" ? user : null),
  rpc: async (name, a) => {
    try { const v = Object.values(a); return { data: (await asService(c, `select ${name}('${v[0]}','${v[1]}','${v[2]}','${v[3]}') r`)).r, error: null }; }
    catch (e) { return { data: null, error: { message: String(e) } }; }
  },
});
const req = (key: string, r = rec) => ({ method: "POST", authorization: "Bearer tok", body: { stage_instance_id: inst, observation_record_id: r, key } });

beforeAll(async () => {
  c = await connect();
  observer = await mkParticipant(c, `cmt-obs-${RUN}`); other = await mkParticipant(c, `cmt-oth-${RUN}`); participant = await mkParticipant(c, `cmt-p-${RUN}`);
  inst = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${participant}','S1','D2',1,'active') returning stage_instance_id i`))[0].i;
  rec = (await run(c, `insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id) values ('${participant}','D2','S1','${observer}') returning observation_record_id r`))[0].r;
});
afterAll(async () => { await c.end(); });

describe("commit route against the database", () => {
  it("a stranger and the participant are refused with the fixed answer and nothing is committed; the observer commits once; the same key repeats; a new key is refused", async () => {
    for (const u of [other, participant]) expect(await handleCommitRequest(req(`commit-${RUN}-x`), depsFor(u))).toEqual({ status: 200, body: { outcome: "refused", reason: "SESSION_NOT_AVAILABLE" } });
    expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${rec}'`))[0].is_committed).toBe(false);
    const first = await handleCommitRequest(req(`commit-${RUN}-1`), depsFor(observer));
    expect(first).toEqual({ status: 200, body: { outcome: "committed", observation_record_id: rec } });
    expect(await handleCommitRequest(req(`commit-${RUN}-1`), depsFor(observer))).toEqual({ status: 200, body: { outcome: "already_committed", observation_record_id: rec } });
    expect(await handleCommitRequest(req(`commit-${RUN}-2`), depsFor(observer))).toMatchObject({ body: { outcome: "refused", reason: "SESSION_ALREADY_COMMITTED" } });
    expect((await run(c, `select count(*)::int n from t3a_observation_record where stage_instance_id='${inst}' and is_committed`))[0].n).toBe(1);
  });
  it("the database function is not reachable by a signed-in user", async () => {
    expect((await asRole(c, "authenticated", observer, `select t3a_cr21_commit_for('${observer}','${inst}','k-${RUN}-9','${rec}')`)).msg).toMatch(/permission denied/i);
  });
  it("the mentor assigned to the session may commit a record someone else observed; an unassigned account may not; no actor at all is refused", async () => {
    const mentor = await mkParticipant(c, `cmt-men-${RUN}`);
    const i2 = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${participant}','S1','D2',2,'active') returning stage_instance_id i`))[0].i;
    const r2 = (await run(c, `insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id) values ('${participant}','D2','S1','${observer}') returning observation_record_id r`))[0].r;
    await c.query("begin"); await c.query("set local session_replication_role = replica");
    await c.query(`insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) values ('${mentor}','${participant}','${i2}','system_allocated')`); await c.query("commit");
    const call = (u: string, key: string) => handleCommitRequest({ method: "POST", authorization: "Bearer tok", body: { stage_instance_id: i2, observation_record_id: r2, key } }, depsFor(u));
    expect(await call(other, `cmt-m-${RUN}-0`)).toMatchObject({ body: { reason: "SESSION_NOT_AVAILABLE" } });
    expect(await call(mentor, `cmt-m-${RUN}-1`)).toEqual({ status: 200, body: { outcome: "committed", observation_record_id: r2 } });
    const i3 = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${participant}','S1','D2',3,'active') returning stage_instance_id i`))[0].i;
    const r3 = (await run(c, `insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id) values ('${participant}','D2','S1',null) returning observation_record_id r`))[0].r;
    expect((await asService(c, `select t3a_cr21_commit_for(null,'${i3}','cmt-n-${RUN}','${r3}') r`)).r).toEqual({ outcome: "refused", reason: "SESSION_NOT_AVAILABLE" });
  });
});
