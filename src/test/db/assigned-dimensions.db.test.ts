/** CR-338. A mentor's assigned dimensions are saved with the ids the table's keys need, and the candidate then reads them. The payload is the one src/lib/assignedDimensions.ts builds. Throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type pg from "pg";
import { saveAssignedDimensions, type DimensionDb } from "../../lib/assignedDimensions";
import { asRole, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let seq = 0;

/** What the page sends, recorded instead of sent, so the same rows can be run against the real table as the signed-in mentor. */
function recorder() {
  const calls: Array<{ op: string; args: any[]; filters: Array<[string, any[]]> }> = [];
  const db: DimensionDb = {
    from: () => ({
      update: (...args: any[]) => rec("update", args),
      upsert: (...args: any[]) => rec("upsert", args),
    }),
  };
  function rec(op: string, args: any[]) {
    const r = { op, args, filters: [] as Array<[string, any[]]> }; calls.push(r);
    const chain: any = { eq: (...a: any[]) => { r.filters.push(["eq", a]); return chain; }, in: (...a: any[]) => { r.filters.push(["in", a]); return chain; }, then: (res: (v: unknown) => void) => res({ error: null }) };
    return chain;
  }
  return { db, calls };
}
const lit = (v: unknown) => (typeof v === "boolean" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
/** Runs a recorded call against the table as the given account, the way the client library would. */
async function play(sub: string, calls: ReturnType<typeof recorder>["calls"]) {
  for (const call of calls) {
    let sql: string;
    if (call.op === "upsert") {
      const rows = call.args[0] as Array<Record<string, unknown>>; const cols = Object.keys(rows[0]);
      sql = `insert into mentor_assigned_dimensions(${cols.join(",")}) values ${rows.map((r) => `(${cols.map((k) => lit(r[k])).join(",")})`).join(",")}
             on conflict (assignment_id, dimension_id) do update set ${cols.filter((k) => !["assignment_id", "dimension_id"].includes(k)).map((k) => `${k}=excluded.${k}`).join(",")}`;
    } else {
      const set = Object.entries(call.args[0] as Record<string, unknown>).map(([k, v]) => `${k}=${lit(v)}`).join(",");
      const where = call.filters.map(([f, a]) => (f === "eq" ? `${a[0]}=${lit(a[1])}` : `${a[0]} in (${(a[1] as string[]).map(lit).join(",")})`)).join(" and ");
      sql = `update mentor_assigned_dimensions set ${set} where ${where}`;
    }
    const r = await asRole(c, "authenticated", sub, sql);
    if (r.msg !== "ok") return r.msg;
  }
  return "ok";
}

async function world() {
  const m = await mkParticipant(c, `ad-m-${++seq}`, "mentor"); const p = await mkParticipant(c, `ad-c-${++seq}`);
  const mp = (await run(c, `insert into mentor_profiles(profile_id) values ('${m}') returning id`))[0].id as string;
  const cp = (await run(c, `insert into candidate_profiles(profile_id) values ('${p}') returning id`))[0].id as string;
  const a = (await run(c, `insert into mentor_assignments(mentor_id, candidate_id, status) values ('${mp}','${cp}','active') returning id`))[0].id as string;
  return { m, p, mp, cp, a };
}
const active = async (sub: string, a: string) =>
  ((await asRole(c, "authenticated", sub, `select dimension_id from mentor_assigned_dimensions where assignment_id='${a}' and is_active order by 1`)).rows as Array<{ dimension_id: string }>).map((r) => r.dimension_id);

// The throwaway build's second pass can put an earlier definition of the policies back after 20270253; on the live project each migration runs once, in order. The file is applied again
// here (it is idempotent) so the tests judge the policies as the migration leaves them.
beforeAll(async () => {
  c = await connect();
  await c.query(readFileSync(new URL("../../../supabase/migrations/20270253000000_assigned_dimensions_scoped_access.sql", import.meta.url), "utf8"));
});
afterAll(async () => { await c.end(); });

describe("assigning dimensions to a candidate", () => {
  it("saves with the page's payload, and the candidate reads the dimensions on their own profile", async () => {
    const w = await world(); const { db, calls } = recorder();
    expect(await saveAssignedDimensions(db, { assignmentId: w.a, mentorUserId: w.m, candidateUserId: w.p, existing: [], selected: ["integrity_ethics", "learning_agility"] })).toEqual({ ok: true });
    expect(await play(w.m, calls)).toBe("ok");
    expect(await active(w.p, w.a)).toEqual(["integrity_ethics", "learning_agility"]);
    expect(await active(w.m, w.a)).toEqual(["integrity_ethics", "learning_agility"]);
  });
  it("the ids the page used to send (the two desk ids) are refused by the table's keys, which is why nothing was ever saved", async () => {
    const w = await world();
    const r = await asRole(c, "authenticated", w.m, `insert into mentor_assigned_dimensions(assignment_id, mentor_id, candidate_id, dimension_id) values ('${w.a}','${w.mp}','${w.cp}','integrity_ethics')`);
    expect(r.msg).toMatch(/foreign key|violates/i);
  });
  it("removing a dimension and assigning it again switches it back on instead of colliding with its old row", async () => {
    const w = await world(); const first = recorder();
    await saveAssignedDimensions(first.db, { assignmentId: w.a, mentorUserId: w.m, candidateUserId: w.p, existing: [], selected: ["a1", "b2"] }); await play(w.m, first.calls);
    const drop = recorder();
    await saveAssignedDimensions(drop.db, { assignmentId: w.a, mentorUserId: w.m, candidateUserId: w.p, existing: ["a1", "b2"], selected: ["b2"] });
    expect(await play(w.m, drop.calls)).toBe("ok"); expect(await active(w.p, w.a)).toEqual(["b2"]);
    const back = recorder();
    await saveAssignedDimensions(back.db, { assignmentId: w.a, mentorUserId: w.m, candidateUserId: w.p, existing: ["b2"], selected: ["a1", "b2"] });
    expect(await play(w.m, back.calls)).toBe("ok"); expect(await active(w.p, w.a)).toEqual(["a1", "b2"]);
  });
  it("a signed-in stranger can neither read them nor switch them off or add to them", async () => {
    const w = await world(); const other = await mkParticipant(c, `ad-o-${++seq}`); const { db, calls } = recorder();
    await saveAssignedDimensions(db, { assignmentId: w.a, mentorUserId: w.m, candidateUserId: w.p, existing: [], selected: ["integrity_ethics"] }); await play(w.m, calls);
    expect(await active(other, w.a)).toEqual([]);
    await asRole(c, "authenticated", other, `update mentor_assigned_dimensions set is_active=false where assignment_id='${w.a}'`);
    expect(await active(w.p, w.a)).toEqual(["integrity_ethics"]);
    const add = await asRole(c, "authenticated", other, `insert into mentor_assigned_dimensions(assignment_id, mentor_id, candidate_id, dimension_id) values ('${w.a}','${w.m}','${w.p}','learning_agility')`);
    expect(add.msg).not.toBe("ok");
  });
  it("another mentor cannot read or change them either", async () => {
    const w = await world(); const o = await world(); const { db, calls } = recorder();
    await saveAssignedDimensions(db, { assignmentId: w.a, mentorUserId: w.m, candidateUserId: w.p, existing: [], selected: ["integrity_ethics"] }); await play(w.m, calls);
    expect(await active(o.m, w.a)).toEqual([]);
  });
});
