import { describe, expect, it } from "vitest";
import { saveAssignedDimensions, type DimensionDb } from "@/lib/assignedDimensions";

/** A recording stand-in for the supabase client: every call is kept, and `fail` makes the named operation return an error. */
function fake(fail?: "update" | "upsert") {
  const calls: Array<{ op: string; table: string; args: unknown[]; filters: Array<[string, unknown[]]> }> = [];
  const db: DimensionDb = {
    from(table: string) {
      const start = (op: string, ...args: unknown[]) => {
        const rec = { op, table, args, filters: [] as Array<[string, unknown[]]> };
        calls.push(rec);
        interface Chain { eq: (...a: unknown[]) => Chain; in: (...a: unknown[]) => Chain; then: (res: (v: unknown) => void) => void }
        const chain: Chain = {
          eq: (...a) => { rec.filters.push(["eq", a]); return chain; },
          in: (...a) => { rec.filters.push(["in", a]); return chain; },
          then: (res) => res({ error: fail === op ? { message: `${op} refused` } : null }),
        };
        return chain;
      };
      return { update: (...a: unknown[]) => start("update", ...a), upsert: (...a: unknown[]) => start("upsert", ...a) };
    },
  };
  return { db, calls };
}
const base = { assignmentId: "A1", mentorUserId: "M-user", candidateUserId: "C-user" };

describe("saveAssignedDimensions", () => {
  it("writes the mentor's and the candidate's profile ids, not their desk ids", async () => {
    const { db, calls } = fake();
    const r = await saveAssignedDimensions(db, { ...base, existing: [], selected: ["integrity_ethics", "learning_agility"] });
    expect(r).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0].op).toBe("upsert");
    const rows = calls[0].args[0] as Array<Record<string, unknown>>;
    expect(rows.map((x) => x.dimension_id)).toEqual(["integrity_ethics", "learning_agility"]);
    for (const row of rows) expect(row).toMatchObject({ assignment_id: "A1", mentor_id: "M-user", candidate_id: "C-user", is_active: true });
    expect(calls[0].args[1]).toEqual({ onConflict: "assignment_id,dimension_id" });
  });
  it("switches a removed dimension off with one update, and only writes what changed", async () => {
    const { db, calls } = fake();
    await saveAssignedDimensions(db, { ...base, existing: ["a", "b"], selected: ["b", "c"] });
    expect(calls.map((c) => c.op)).toEqual(["update", "upsert"]);
    expect(calls[0].args[0]).toMatchObject({ is_active: false });
    expect(calls[0].filters).toEqual([["eq", ["assignment_id", "A1"]], ["in", ["dimension_id", ["a"]]]]);
    expect((calls[1].args[0] as Array<{ dimension_id: string }>).map((x) => x.dimension_id)).toEqual(["c"]);
  });
  it("writes nothing when nothing changed", async () => {
    const { db, calls } = fake();
    expect(await saveAssignedDimensions(db, { ...base, existing: ["a"], selected: ["a"] })).toEqual({ ok: true });
    expect(calls).toHaveLength(0);
  });
  it("reports a refused insert instead of looking successful", async () => {
    const { db } = fake("upsert");
    expect(await saveAssignedDimensions(db, { ...base, existing: [], selected: ["a"] })).toEqual({ ok: false, message: "upsert refused" });
  });
  it("reports a refused update and stops before inserting", async () => {
    const { db, calls } = fake("update");
    expect(await saveAssignedDimensions(db, { ...base, existing: ["a"], selected: ["b"] })).toEqual({ ok: false, message: "update refused" });
    expect(calls.map((c) => c.op)).toEqual(["update"]);
  });
});
