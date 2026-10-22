/** CORR-007 Rev 1.6 rule CR-17: retake pools and source selection at a retake. Synthetic sources and participants; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, completedAttempts, connect, meet, mkApprovedSource, mkParticipant, retireFixtureSources, run, type SourceFixture } from "./helpers";

let c: pg.Client; let reviewer: string;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const select = (p: string, d: string, s: string, seed = 1) => asService(c, `select t3a_source_select('${p}','${d}','${s}',${seed}) r`);
const loadPools = (dim: string, srcs: Record<string, string>) => asService(c, `select t3a_retake_pool_load('MAP-${dim}-${Date.now()}-${Math.random()}','${dim}','${sha(JSON.stringify(srcs))}','${JSON.stringify(srcs)}'::jsonb) r`);
const refused = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const src = (d: string, st: "S1" | "S2", sc: string) => mkApprovedSource(c, { dimension: d, stage: st, situationClass: sc, reviewer });

// World 1: D2 Stage 1, six families across the four pools
let A: SourceFixture, B: SourceFixture, C: SourceFixture, D: SourceFixture, E: SourceFixture, F: SourceFixture;

beforeAll(async () => {
  c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, "cr17-rev");
  A = await src("D2", "S1", "SC-D2-1"); B = await src("D2", "S1", "SC-D2-2"); C = await src("D2", "S1", "SC-D2-3");
  D = await src("D2", "S1", "SC-D2-4"); E = await src("D2", "S1", "SC-D2-5"); F = await src("D2", "S1", "SC-D2-6");
  const r = await loadPools("D2", { [A.key]: "first_attempt", [B.key]: "first_attempt", [C.key]: "retake_1", [D.key]: "retake_1", [E.key]: "retake_2", [F.key]: "retake_3" });
  if (r.r?.outcome !== "loaded") throw new Error("pool map did not load: " + JSON.stringify(r));
});
afterAll(async () => { await c.end(); });

describe("CR-17 pool maps", () => {
  it("T9: a value outside the four pools refuses and nothing is loaded", async () => {
    const before = (await run(c, `select count(*)::int n from t3a_retake_pool_map`))[0].n;
    const n0 = await refused("RETAKE_POOL_MISSING_OR_INVALID");
    const r = await loadPools("D2", { "SRC-X-1@1": "first_attempt", "SRC-X-2@1": "retake_9" });
    expect(r.r.reason).toBe("RETAKE_POOL_MISSING_OR_INVALID");
    expect((await run(c, `select count(*)::int n from t3a_retake_pool_map`))[0].n).toBe(before);
    expect(await refused("RETAKE_POOL_MISSING_OR_INVALID")).toBe(n0 + 1);
  });
  it("T9: a source missing from the loaded map does not load", async () => {
    const ok = await asService(c, `select t3a_source_load_check(array['${A.key}','${B.key}']) r`);
    expect(ok.r.outcome).toBe("ok");
    const miss = await asService(c, `select t3a_source_load_check(array['${A.key}','SRC-D2-S1-999@2.1']) r`);
    expect(miss.r.reason).toBe("RETAKE_POOL_MISSING_OR_INVALID");
  });
  it("a pool changes only by a later, recorded row; the pool map rows are append-only", async () => {
    const KEY = `SRC-MOVE-${RUN}@1`;
    await loadPools("D2", { [KEY]: "retake_1" }); await loadPools("D2", { [KEY]: "retake_2" });
    expect((await run(c, `select t3a_retake_pool_of('${KEY}') p`))[0].p).toBe("retake_2");
    expect((await run(c, `select count(*)::int n from t3a_retake_pool_map where source_key='${KEY}'`))[0].n).toBe(2);
    await expect(c.query(`update t3a_retake_pool_map set retake_pool='first_attempt'`)).rejects.toThrow(/append/i);
  });
  it("the routes are not callable by a participant", async () => {
    const p = await mkParticipant(c, "cr17-x");
    const r = await asRole(c, "authenticated", p, `select t3a_source_select('${p}','D2','S1',1) r`);
    expect(r.msg).toMatch(/permission denied|SERVICE_ONLY/);
  });
});

describe("CR-17 selection", () => {
  it("T1: a first attempt is served from first_attempt", async () => {
    const p = await mkParticipant(c, "cr17-a");
    const r = await select(p, "D2", "S1");
    expect(r.r.outcome).toBe("selected");
    expect(r.r.pool).toBe("first_attempt");
    expect(r.r.reason).toBeNull();
    expect([A.version, B.version]).toContain(r.r.source_version_id);
    expect(r.r.attempt_number).toBe(1);
  });
  it("T2: a second attempt is served from retake_1, from an unmet family", async () => {
    const p = await mkParticipant(c, "cr17-b"); await completedAttempts(c, p, "D2", "S1", 1); await meet(c, p, A.version);
    const r = await select(p, "D2", "S1");
    expect(r.r.pool).toBe("retake_1");
    expect([C.version, D.version]).toContain(r.r.source_version_id);
    expect(r.r.attempt_number).toBe(2);
  });
  it("T3: a second attempt with retake_1 exhausted is served from retake_2", async () => {
    const p = await mkParticipant(c, "cr17-c"); await completedAttempts(c, p, "D2", "S1", 1);
    for (const s of [A, C, D]) await meet(c, p, s.version);
    const r = await select(p, "D2", "S1");
    expect(r.r.pool).toBe("retake_2");
    expect(r.r.source_version_id).toBe(E.version);
    expect(r.r.reason).toBe("matching_pool_exhausted");
  });
  it("the third attempt starts at retake_2 and the fourth at retake_3", async () => {
    const p3 = await mkParticipant(c, "cr17-d"); await completedAttempts(c, p3, "D2", "S1", 2); await meet(c, p3, A.version);
    expect((await select(p3, "D2", "S1")).r.pool).toBe("retake_2");
    const p4 = await mkParticipant(c, "cr17-e"); await completedAttempts(c, p4, "D2", "S1", 3); await meet(c, p4, A.version);
    expect((await select(p4, "D2", "S1")).r.pool).toBe("retake_3");
  });
  it("the same seed gives the same source; different seeds reach both sources of the pool", async () => {
    const p = await mkParticipant(c, "cr17-f");
    const first = (await select(p, "D2", "S1", 7)).r.source_version_id;
    expect((await select(p, "D2", "S1", 7)).r.source_version_id).toBe(first);
    const seen = new Set<string>();
    for (let s = 0; s < 40; s++) seen.add((await select(p, "D2", "S1", s)).r.source_version_id);
    expect(seen).toEqual(new Set([A.version, B.version]));
  });
  it("T5: the selection log keeps only the selected source, the policy receipt and the seed", async () => {
    const p = await mkParticipant(c, "cr17-g"); await completedAttempts(c, p, "D2", "S1", 1); await meet(c, p, A.version); await meet(c, p, C.version);
    const r = await select(p, "D2", "S1", 99);
    const rows = await run(c, `select to_jsonb(l) j from t3a_source_selection_log l where participant_id='${p}'`);
    expect(rows).toHaveLength(1);
    const j = JSON.stringify(rows[0].j);
    expect(j).toContain(r.r.source_version_id);
    expect(rows[0].j.policy_receipt).toBe("CR-17 v1.2");
    expect(Number(rows[0].j.seed)).toBe(99);
    for (const excluded of [A.version, C.version]) expect(j).not.toContain(excluded);
    expect(Object.keys(rows[0].j).sort()).toEqual(["attempt_number", "comparison", "dimension_id", "participant_id", "policy_receipt", "seed", "selected_at", "selected_pool", "selected_source_version_id", "selection_id", "selection_reason", "stage_code"]);
    await expect(c.query(`update t3a_source_selection_log set seed = 1`)).rejects.toThrow(/append/i);
  });
});

describe("CR-17 borrowing, the family fallback and unavailable", () => {
  it("T8: a first attempt whose pool holds no unmet source borrows from the retake pools; the source's own pool is recorded", async () => {
    const w1 = await src("D3", "S2", "SC-D3-1"); const w2 = await src("D3", "S2", "SC-D3-2");
    await loadPools("D3", { [w1.key]: "first_attempt", [w2.key]: "retake_2" });
    const p = await mkParticipant(c, "cr17-h"); await meet(c, p, w1.version);
    const r = await select(p, "D3", "S2");
    expect(r.r.source_version_id).toBe(w2.version);
    expect(r.r.pool).toBe("retake_2");
    expect(r.r.reason).toBe("first_attempt_pool_exhausted");
    expect(r.r.comparison).toBe("by_family");
  });
  it("T4: no source is both unmet and of an unmet family: an unmet source of a met family is served, not comparable", async () => {
    const x1 = await src("D3", "S1", "SC-D3-1"); const x2 = await src("D3", "S1", "SC-D3-1");
    await loadPools("D3", { [x1.key]: "first_attempt", [x2.key]: "retake_1" });
    const p = await mkParticipant(c, "cr17-i"); await completedAttempts(c, p, "D3", "S1", 1); await meet(c, p, x1.version);
    const r = await select(p, "D3", "S1");
    expect(r.r.outcome).toBe("selected");
    expect(r.r.source_version_id).toBe(x2.version);
    expect(r.r.reason).toBe("family_exposure_fallback");
    expect(r.r.comparison).toBe("not_eligible");
  });
  it("T6: an unmet source of an unmet family in a pool earlier than the matching one is served; the fallback is not used", async () => {
    const y1 = await src("D4", "S1", "SC-D4-1"); const y2 = await src("D4", "S1", "SC-D4-2");
    await loadPools("D4", { [y1.key]: "first_attempt", [y2.key]: "first_attempt" });
    const p = await mkParticipant(c, "cr17-j"); await completedAttempts(c, p, "D4", "S1", 1); await meet(c, p, y1.version);
    const r = await select(p, "D4", "S1");
    expect(r.r.source_version_id).toBe(y2.version);
    expect(r.r.pool).toBe("first_attempt");
    expect(r.r.reason).toBe("matching_pool_exhausted");
    expect(r.r.comparison).toBe("by_family");
  });
  it("T7: every approved source has been met: refused and logged; a met source is never served again", async () => {
    const z1 = await src("D2", "S2", "SC-D2-7"); await loadPools("D2", { [z1.key]: "first_attempt" });
    const p = await mkParticipant(c, "cr17-k"); await meet(c, p, z1.version);
    const n0 = await refused("FIRST_ATTEMPT_SOURCE_UNAVAILABLE");
    expect((await select(p, "D2", "S2")).r.reason).toBe("FIRST_ATTEMPT_SOURCE_UNAVAILABLE");
    expect(await refused("FIRST_ATTEMPT_SOURCE_UNAVAILABLE")).toBe(n0 + 1);
    const q = await mkParticipant(c, "cr17-l"); await completedAttempts(c, q, "D2", "S2", 1); await meet(c, q, z1.version);
    const m0 = await refused("RETAKE_SOURCE_UNAVAILABLE");
    expect((await select(q, "D2", "S2")).r.reason).toBe("RETAKE_SOURCE_UNAVAILABLE");
    expect(await refused("RETAKE_SOURCE_UNAVAILABLE")).toBe(m0 + 1);
  });
  it("a source with no pool in the map is never selected, even when it is the only approved source", async () => {
    await src("D4", "S2", "SC-D4-3"); // approved, but in no loaded pool map
    const p = await mkParticipant(c, "cr17-m");
    const n0 = await refused("FIRST_ATTEMPT_SOURCE_UNAVAILABLE");
    expect((await select(p, "D4", "S2")).r.reason).toBe("FIRST_ATTEMPT_SOURCE_UNAVAILABLE");
    expect(await refused("FIRST_ATTEMPT_SOURCE_UNAVAILABLE")).toBe(n0 + 1);
  });
  it("Stage 4 selection refuses while Stage 4 is not activated", async () => {
    const p = await mkParticipant(c, "cr17-n");
    expect((await select(p, "D2", "S4")).r.reason).toBe("s4_not_activated");
  });
});
