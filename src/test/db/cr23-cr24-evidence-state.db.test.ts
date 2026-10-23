/** CORR-007 Rev 1.6 rules CR-23 (Stage 1 toward recurrence) and CR-24 (the second evidence state where breadth cannot be established). Synthetic people and sources; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { RUN, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run, type SourceFixture } from "./helpers";

let c: pg.Client; let reviewer: string; let seq = 0;
const STATES = ["not_observed", "observed_once", "observed_multiple_contexts", "recurring_across_stages"];
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
const j = (o: unknown) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const src = (stage: "S1" | "S2") => mkApprovedSource(c, { dimension: "D2", stage, situationClass: `SC-D2-${(++seq % 6) + 1}`, reviewer });
async function world() {
  const p = await mkParticipant(c, `cr23-p-${++seq}-${RUN}`);
  const m1 = await mkParticipant(c, `cr23-m1-${seq}-${RUN}`, "mentor"); const m2 = await mkParticipant(c, `cr23-m2-${seq}-${RUN}`, "mentor");
  return { p, m1, m2 };
}
const obs = async (w: { p: string }, stage: string, s: SourceFixture, observer: string | null, key: string, code: string) => {
  const o = (await run(c, `insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, confirmer_id, is_committed) values ('${w.p}','D2','${stage}', ${stage !== "S1" && observer ? `'${observer}'` : "null"}, ${stage === "S1" ? `'${reviewer}'` : "null"}, true) returning observation_record_id i`))[0].i;
  return (await run(c, `insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions) values ('D2','${o}','${w.p}','${stage}','${s.version}','{}'::jsonb,'[]'::jsonb,${j([{ conduct_element_id: "CE-X", recurrence_equivalence_key_id: key, state_code: code, recurrence_blocker: false }])},'[]'::jsonb) returning composed_statement_id i`))[0].i;
};
const relate = (a: SourceFixture, b: SourceFixture, compatible = false) => {
  const [x, y] = a.version < b.version ? [a.version, b.version] : [b.version, a.version];
  return run(c, `insert into t3a_cross_context_relationship(dimension_id, source_version_a, source_version_b, approved_by, act_types_compatible) values ('D2','${x}','${y}','${reviewer}', ${compatible}) on conflict (dimension_id, source_version_a, source_version_b) do update set act_types_compatible = excluded.act_types_compatible`);
};
const state = async (p: string) => (await run(c, `select t3a_evidence_state('${p}','D2', true) s`))[0].s;
const setLock = (v: "locked" | "unlocked") => run(c, `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('recurrence_config_locked','${v}','1.${++seq}','${reviewer}')`);
const rec = (s: any) => s.recurrence.find((r: any) => r.recurrence_equivalence_key_id === "REK-CR23");

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, `cr23-rev-${RUN}`); await setLock("locked"); });
afterAll(async () => { await setLock("unlocked"); await c.end(); });

describe("CR-23 a Stage 1 observation counts toward recurrence only where the approved row declares the act types compatible", () => {
  async function threeStages(withStage1: boolean) {
    const w = await world();
    const a = await src(withStage1 ? "S1" : "S2"); const b = await src("S2"); const d = await src("S2");
    await obs(w, withStage1 ? "S1" : "S4", a, w.m1, "REK-CR23", "ST-D2-001");
    await obs(w, "S2", b, w.m1, "REK-CR23", "ST-D2-001");
    await obs(w, "S3", d, w.m2, "REK-CR23", "ST-D2-001");
    return { w, a, b, d };
  }
  it("T1: Stage 1 is one of three related contexts and no row declares the act types compatible: the frame is refused for that clause", async () => {
    const { w, a, b, d } = await threeStages(true);
    await relate(a, b); await relate(a, d); await relate(b, d);
    const s = await state(w.p);
    expect(rec(s)).toMatchObject({ available: false }); expect(rec(s).reasons).toEqual(["stage_1_act_types_not_declared_compatible"]);
    expect(s.state).not.toBe("recurring_across_stages");
  });
  it("a Stage 1 context with no row at all is refused the same way", async () => {
    const { w, b, d } = await threeStages(true);
    await relate(b, d);
    expect(rec(await state(w.p)).reasons).toEqual(["stage_1_act_types_not_declared_compatible"]);
  });
  it("the same contexts with the rows declaring the act types compatible recur; declaring only one of the two Stage 1 pairs is not enough", async () => {
    const { w, a, b, d } = await threeStages(true);
    await relate(a, b, true); await relate(a, d, false); await relate(b, d);
    expect(rec(await state(w.p)).reasons).toEqual(["stage_1_act_types_not_declared_compatible"]);
    await relate(a, d, true);
    const s = await state(w.p);
    expect(rec(s)).toMatchObject({ available: true }); expect(s.state).toBe("recurring_across_stages");
  });
  it("contexts that are not Stage 1 are unaffected: related contexts recur without any compatibility declaration, and unrelated ones are refused as before", async () => {
    const { w, a, b, d } = await threeStages(false);
    await relate(a, b); await relate(b, d);
    expect(rec(await state(w.p)).reasons).toEqual(["contexts_not_approved_distinct"]);
    await relate(a, d);
    const s = await state(w.p);
    expect(rec(s)).toMatchObject({ available: true }); expect(s.state).toBe("recurring_across_stages");
  });
});

describe("CR-24 the second evidence state where breadth cannot be established", () => {
  it("T1: two valid Stage 2 observations by different observers with no approved cross context relationship stay in the second state and both are current, each its own statement", async () => {
    const w = await world(); const a = await src("S2"); const b = await src("S2");
    const c1 = await obs(w, "S2", a, w.m1, "REK-CR24-A", "ST-D2-001"); const c2 = await obs(w, "S2", b, w.m2, "REK-CR24-B", "ST-D2-002");
    const s = await state(w.p);
    expect(s).toMatchObject({ state: "observed_once", frame: "FR-D2-1", observations: 2 });
    expect(s.blocked).toEqual([{ frame: "multiple_contexts", reason: "no_approved_cross_context_relationship" }]);
    const current = (await run(c, `select composed_statement_id from t3a_current_composed('${w.p}','D2')`)).map((r) => r.composed_statement_id);
    expect(current.sort()).toEqual([c1, c2].sort());
  });
  it("the same Stage and the same observer also leave the dimension in the second state even with a relationship", async () => {
    const w = await world(); const a = await src("S2"); const b = await src("S2");
    await obs(w, "S2", a, w.m1, "REK-CR24-A", "ST-D2-001"); await obs(w, "S2", b, w.m1, "REK-CR24-B", "ST-D2-001");
    await relate(a, b);
    const s = await state(w.p);
    expect(s).toMatchObject({ state: "observed_once", frame: "FR-D2-1", observations: 2 });
    expect(s.blocked).toEqual([{ frame: "multiple_contexts", reason: "stage_or_observer_diversity_absent" }]);
  });
  it("a related pair with different Stages and observers reaches the third state; no state outside the four is ever produced", async () => {
    const w = await world(); const a = await src("S2"); const b = await src("S2");
    const seen = new Set<string>([(await state(w.p)).state]);
    await obs(w, "S2", a, w.m1, "REK-CR24-A", "ST-D2-001"); seen.add((await state(w.p)).state);
    await obs(w, "S3", b, w.m2, "REK-CR24-B", "ST-D2-002"); seen.add((await state(w.p)).state);
    await relate(a, b);
    const s = await state(w.p); seen.add(s.state);
    expect(s.state).toBe("observed_multiple_contexts");
    expect([...seen].sort()).toEqual(["not_observed", "observed_multiple_contexts", "observed_once"]);
    for (const x of seen) expect(STATES).toContain(x);
  });
});
