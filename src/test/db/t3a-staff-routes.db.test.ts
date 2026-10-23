/** The staff routes' cores against the real database functions: who may record an interruption and who may suspend a source. Throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { handleInterruptRequest, handleSuspendRequest, type StaffDeps } from "../../server/t3aStaffRoutes";
import { RUN, asRole, asService, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

let c: pg.Client; let d1: string; let seq = 0;
const lit = (v: unknown) => (v === null || v === undefined ? "null" : typeof v === "boolean" || typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const depsFor = (user: string): StaffDeps => ({
  verifyToken: async (t) => (t === "tok" ? user : null),
  rpc: async (name, a) => { try { return { data: (await asService(c, `select ${name}(${Object.values(a).map(lit).join(",")}) r`)).r, error: null }; } catch (e) { return { data: null, error: { message: String(e) } }; } },
});
const grant = (u: string, role: string) => run(c, `insert into t3a_role_grant(user_id, spec_role) values ('${u}','${role}') on conflict do nothing`);
async function world() {
  const observed = await mkParticipant(c, `stf-o-${++seq}`); const fac = await mkParticipant(c, `stf-f-${seq}`, "mentor");
  const gs = (await run(c, `insert into t3a_d1_group_session(source_version_id, facilitator_id, observed_participant_id, accommodation_settled) values ('${d1}','${fac}','${observed}', true) returning group_session_id g`))[0].g;
  await run(c, `insert into t3a_d1_group_session_member(group_session_id, participant_id, member_role) values ('${gs}','${observed}','observed')`);
  await asService(c, `select t3a_attempt_begin('${observed}','D1','S4','stf-${RUN}-${++seq}', now()) r`);
  return { observed, fac, gs };
}
const interrupt = (u: string, gs: string) => handleInterruptRequest({ method: "POST", authorization: "Bearer tok", body: { group_session_id: gs, kind: "observed_withdraws" } }, depsFor(u));
const suspend = (u: string, src: string) => handleSuspendRequest({ method: "POST", authorization: "Bearer tok", body: { source_version_id: src, reason: "answer key error found" } }, depsFor(u));
const FIXED = { status: 200, body: { outcome: "refused", reason: "NOT_AVAILABLE" } };

beforeAll(async () => {
  c = await connect(); await retireFixtureSources(c);
  d1 = (await run(c, `select cv.content_version_id v from t3a_d1_content_version cv join t3a_content_object o using (content_object_id) where o.family='source' and o.dimension_id='D1' and cv.retired_at is null and o.identifier !~ '^SRC-D[0-9]-S[0-9]-[0-9a-f]{8}$' order by cv.content_version_id limit 1`))[0].v;
});
afterAll(async () => { await c.end(); });

describe("interruption route against the database", () => {
  it("an unrelated mentor and a participant are refused and nothing is recorded; the facilitator records it; a second report finds no running attempt", async () => {
    const w = await world(); const mentor = await mkParticipant(c, `stf-m-${++seq}`, "mentor");
    for (const u of [mentor, w.observed]) expect(await interrupt(u, w.gs)).toEqual(FIXED);
    const n = async () => (await run(c, `select count(*)::int n from t3a_s4_interruption where group_session_id='${w.gs}'`))[0].n;
    expect(await n()).toBe(0);
    expect(await interrupt(w.fac, w.gs)).toMatchObject({ status: 200, body: { outcome: "recorded", attempt_ending: "withdrawal_participant_choice", attempt_counted: false } });
    expect(await n()).toBe(1);
    expect(await interrupt(w.fac, w.gs)).toEqual(FIXED);
    expect(await n()).toBe(1);
  });
  it("a coordinator who is not the facilitator may record it; a reviewer may not", async () => {
    const coord = await mkParticipant(c, `stf-c-${++seq}`, "mentor"); await grant(coord, "coordinator");
    const rev = await mkParticipant(c, `stf-r-${++seq}`, "mentor"); await grant(rev, "reviewer");
    const a = await world(); expect(await interrupt(rev, a.gs)).toEqual(FIXED);
    expect((await interrupt(coord, a.gs)).body.outcome).toBe("recorded");
  });
  it("a coordinator whose role was revoked is refused", async () => {
    const gone = await mkParticipant(c, `stf-g-${++seq}`, "mentor");
    await run(c, `insert into t3a_role_grant(user_id, spec_role, revoked_at) values ('${gone}','coordinator', now())`);
    const w = await world(); expect(await interrupt(gone, w.gs)).toEqual(FIXED);
  });
  it("the database function is not reachable by a signed-in user", async () => {
    const w = await world();
    expect((await asRole(c, "authenticated", w.fac, `select t3a_cr22_interrupt_for('${w.fac}','${w.gs}','observed_withdraws', null, false, false)`)).msg).toMatch(/permission denied/i);
    expect((await asRole(c, "authenticated", w.fac, `select t3a_actor_is_staff('${w.fac}', array['admin'])`)).msg).toMatch(/permission denied/i);
  });
});

describe("suspension route against the database", () => {
  it("a participant and a facilitator are refused and the source is untouched; a reviewer suspends it and the review opens", async () => {
    const reviewer = await mkParticipant(c, `stf-rv-${++seq}`, "mentor"); await grant(reviewer, "reviewer");
    const src = await mkApprovedSource(c, { dimension: "D2", stage: "S1", situationClass: "SC-D2-1", reviewer });
    const state = async () => (await run(c, `select operational_state s from t3a_d1_content_version where content_version_id='${src.version}'`))[0].s;
    const before = await state();
    const w = await world();
    for (const u of [w.observed, w.fac]) expect(await suspend(u, src.version)).toEqual(FIXED);
    expect(await state()).toBe(before);
    expect(await suspend(reviewer, src.version)).toMatchObject({ status: 200, body: { outcome: "suspended", cancelled_automatically: false } });
    expect(await state()).toBe("suspended");
  });
  it("a coordinator may suspend; the database function is not reachable by a signed-in user", async () => {
    const coord = await mkParticipant(c, `stf-c2-${++seq}`, "mentor"); await grant(coord, "coordinator");
    const src = await mkApprovedSource(c, { dimension: "D2", stage: "S1", situationClass: "SC-D2-2", reviewer: coord });
    expect((await suspend(coord, src.version)).body.outcome).toBe("suspended");
    expect((await asRole(c, "authenticated", coord, `select t3a_cr21_suspend_source_for('${coord}','${src.version}','reason text')`)).msg).toMatch(/permission denied/i);
  });
});
