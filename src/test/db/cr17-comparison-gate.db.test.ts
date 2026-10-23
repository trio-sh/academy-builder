/** CORR-007 Rev 1.6 rule CR-17 wiring: the comparison gate refuses an observation whose source came from the family-exposure fallback. Synthetic data; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { asRole, asService, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

let c: pg.Client; let reviewer: string; let seq = 0;
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
const gate = (rec: string) => asService(c, `select t3a_cr17_comparison_gate('${rec}') r`).then((x) => x.r);
async function world(comparison: "by_family" | "not_eligible" | null) {
  const p = await mkParticipant(c, `cr17g-${++seq}`);
  const src = await mkApprovedSource(c, { dimension: "D2", stage: "S1", situationClass: `SC-D2-${(seq % 6) + 1}`, reviewer });
  const inst = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${p}','S1','D2',1,'active') returning stage_instance_id i`))[0].i;
  const rec = (await run(c, `insert into t3a_observation_record(participant_id, dimension_id, stage_code, stage_instance_id) values ('${p}','D2','S1','${inst}') returning observation_record_id r`))[0].r;
  await fx(`insert into t3a_stage_entry_event(observation_path_gateway_id, stage_instance_id, stage_code, dimensions_in_play, session_identity, assistance_rules_version, participant_id, dimension_id, source_version_id, session_id, observation_mode, stage_entry_hold_expires_at, entry_authority_actor_id) values (gen_random_uuid(),'${inst}','S1',array['D2']::t3a_dimension_code[],'s','v1','${p}','D2','${src.version}', gen_random_uuid(), 's1_deterministic_engine', now() + interval '1 hour', gen_random_uuid())`);
  if (comparison) await fx(`insert into t3a_source_selection_log(participant_id, dimension_id, stage_code, attempt_number, selected_source_version_id, policy_receipt, seed, selected_pool, comparison) values ('${p}','D2','S1',2,'${src.version}','r',1,'retake_1','${comparison}')`);
  return { p, rec };
}
beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, "cr17g-rev"); });
afterAll(async () => { await c.end(); });

describe("CR-17 comparison gate", () => {
  it("a fallback-selected observation is refused with one fixed code; a by-family one is comparable; one never selected is comparable and says so", async () => {
    expect(await gate((await world("not_eligible")).rec)).toMatchObject({ outcome: "refused", reason: "COMPARISON_NOT_ELIGIBLE" });
    expect(await gate((await world("by_family")).rec)).toMatchObject({ outcome: "comparable", mode: "by_family" });
    expect(await gate((await world(null)).rec)).toMatchObject({ outcome: "comparable", mode: "unselected" });
    expect(await gate("00000000-0000-4000-8000-000000000000")).toMatchObject({ outcome: "refused", reason: "OBSERVATION_NOT_FOUND" });
  });
  it("it is a service route and writes nothing", async () => {
    const w = await world("not_eligible");
    const count = async () => (await run(c, `select (select count(*) from t3a_source_selection_log)::int a, (select count(*) from t3a_observation_record)::int b`))[0];
    const before = await count();
    expect((await asRole(c, "authenticated", w.p, `select t3a_cr17_comparison_gate('${w.rec}')`)).msg).toMatch(/permission denied|SERVICE_ONLY/i);
    await gate(w.rec);
    expect(await count()).toEqual(before);
  });
  it("only the selection of this observation's own source counts", async () => {
    const w = await world("by_family");
    const other = await mkApprovedSource(c, { dimension: "D2", stage: "S1", situationClass: "SC-D2-6", reviewer });
    await fx(`insert into t3a_source_selection_log(participant_id, dimension_id, stage_code, attempt_number, selected_source_version_id, policy_receipt, seed, selected_pool, comparison) values ('${w.p}','D2','S1',3,'${other.version}','r',1,'retake_2','not_eligible')`);
    expect(await gate(w.rec)).toMatchObject({ outcome: "comparable", mode: "by_family" });
  });
});
