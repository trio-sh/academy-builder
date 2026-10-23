/** The entry route's core against the real database function: a consenting participant gets an entry and a reservation, an unknown or not-eligible one gets the fixed answer. Throwaway database only. */
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { handleEntryRequest, type EntryDeps } from "../../server/t3aEntryRoute";
import { RUN, asService, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

let c: pg.Client; let reviewer: string;
const q = (v: unknown) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const depsFor = (user: string | null): EntryDeps => ({
  verifyToken: async (t) => (t === "tok" ? user : null),
  newSeed: () => 7,
  rpc: async (name, a) => {
    try {
      const args = Object.values(a).map((v, i) => (i === 2 ? `${q(v)}::t3a_stage_code` : i === 4 ? `${q(v)}::bigint` : i === 0 ? `${q(v)}::uuid` : q(v))).join(",");
      return { data: (await asService(c, `select ${name}(${args}) r`)).r, error: null };
    } catch (e) { return { data: null, error: { message: String(e) } }; }
  },
});
const HASH = "d".repeat(64);
const consent = async (p: string) => { for (const t of ["scenario_logging", "mentor_observation"]) await asService(c, `select t3a_record_consent('${p}','${t}','granted','D2',null,'1.0','${HASH}','checkbox','en-CA','observation') r`); };
const req = (key: string) => ({ method: "POST", authorization: "Bearer tok", body: { dimension: "D2", stage: "S1", key } });

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, "ent-rev"); const A = await mkApprovedSource(c, { dimension: "D2", stage: "S1", situationClass: "SC-D2-1", reviewer });
  const m = JSON.stringify({ [A.key]: "first_attempt" });
  const r = await asService(c, `select t3a_retake_pool_load('MAP-ENT-${RUN}','D2','${createHash("sha256").update(m).digest("hex")}','${m}'::jsonb) r`);
  if (r.r?.outcome !== "loaded") throw new Error(JSON.stringify(r));
});
afterAll(async () => { await c.end(); });

describe("entry route against the database", () => {
  it("a participant who has met the conditions gets an entry; the same key gives the same answer; a stranger gets the fixed refusal", async () => {
    const p = await mkParticipant(c, `ent-p-${RUN}`); await consent(p);
    const first = await handleEntryRequest(req(`entry-${RUN}-1`), depsFor(p));
    expect(first).toMatchObject({ status: 200, body: { outcome: "eligible" } });
    expect(await handleEntryRequest(req(`entry-${RUN}-1`), depsFor(p))).toEqual(first);
    expect((await run(c, `select count(*)::int n from t3a_stage_entry_event where participant_id='${p}' and dimension_id='D2'`))[0].n).toBe(1);
    const stranger = await handleEntryRequest(req(`entry-${RUN}-2`), depsFor("00000000-0000-4000-8000-0000000000aa"));
    expect(stranger).toEqual({ status: 200, body: { outcome: "not_eligible" } });
  });
});
