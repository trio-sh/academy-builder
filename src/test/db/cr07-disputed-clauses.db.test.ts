/** CORR-007 Rev 1.6 rule CR-07: disputed clauses that cannot be established. Synthetic people, sources and records; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, meet, mkApprovedSource, mkParticipant, retireFixtureSources, run, type SourceFixture } from "./helpers";

let c: pg.Client; let reviewer: string;
const DIM = "D2"; const STAGE = "S1";
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
let seq = 0;
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
const person = (tag: string) => mkParticipant(c, `cr07-${tag}-${++seq}`, "mentor");
const loadPools = (srcs: Record<string, string>) => asService(c, `select t3a_retake_pool_load('MAP-CR07-${RUN}-${++seq}','${DIM}','${sha(JSON.stringify(srcs))}','${JSON.stringify(srcs)}'::jsonb) r`);
async function source(): Promise<SourceFixture> {
  const s = await mkApprovedSource(c, { dimension: DIM, stage: STAGE, situationClass: `SC-D2-${(++seq % 6) + 1}`, reviewer }).catch(async (e) => { await c.query("rollback").catch(() => null); throw e; });
  const r = await loadPools({ [s.key]: "first_attempt" }); if (r.r?.outcome !== "loaded") throw new Error("pool map: " + JSON.stringify(r));
  return s;
}
/** A committed observation with a composed statement of three clauses, on a source the participant met. */
async function observed(src: SourceFixture) {
  const p = await mkParticipant(c, `cr07-p-${++seq}`); const obs = await person("obs");
  await meet(c, p, src.version);
  const rec = randomUUID(); const cs = randomUUID();
  await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code, observer_id, is_committed, committed_at) values ('${rec}','${p}','${DIM}','${STAGE}','${obs}', true, now())`);
  const clauses = ["CE-1", "CE-2", "CE-3"].map((e) => ({ conduct_element: e, question_code: `Q-${e}`, state_code: "ST", entry_type: "x", clause_text: `Clause ${e}` }));
  const ci = ["CE-1", "CE-2", "CE-3"].map((e) => ({ observation_id: rec, conduct_element_id: e, recurrence_equivalence_key_id: `REK-${e}`, state_code: "ST", recurrence_blocker: false }));
  await fx(`insert into t3a_dimension_composed_statement(composed_statement_id, dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances) values ('${cs}','${DIM}','${rec}','${p}','${STAGE}','${src.version}','{}'::jsonb,'${JSON.stringify(clauses)}'::jsonb,'${JSON.stringify(ci)}'::jsonb)`);
  await run(c, `insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, commit_at, attempt_event_class) values ('${p}','${DIM}','${STAGE}','completed',true, now() - interval '3 days', now() - interval '3 days','completed_observation')`);
  return { p, obs, rec, cs };
}
async function retireAuthorizations() { await fx(`update t3a_role_authorization set status='withdrawn', withdrawn_at=now() where status='granted'`).catch(() => null); }
/** A reconsideration of the observation, reserved, decided and (optionally) checked. */
async function reconsideration(w: { p: string; rec: string }, decision: "uphold" | "amend" | "withdraw", final = true) {
  await retireAuthorizations();
  const d = await person("d"); const k = await person("k");
  const cs = (await run(c, `insert into t3a_correction_case(raised_by, participant_id, ground, narrative) values ('${w.p}','${w.p}','disputed_clause','the participant says this did not happen as recorded') returning correction_case_id`))[0].correction_case_id;
  const asg = (await fx(`insert into t3a_reconsideration_assignment(correction_case_id, observation_record_id) values ('${cs}','${w.rec}') returning reconsideration_assignment_id`))[0].reconsideration_assignment_id;
  for (const a of [d, k]) await fx(`insert into t3a_role_authorization(actor_id, authority, dimension_id) values ('${a}','reconsider','${DIM}')`);
  const res = (await asService(c, `select t3a_cr13_reserve('reconsideration','${asg}') r`)).r;
  if (res.outcome !== "reserved") throw new Error("fixture: " + JSON.stringify(res));
  await as(res.decision, `select t3a_cr13_record_decision('${asg}','${decision}','the record does not establish the disputed conduct') r`);
  if (final) await as(res.independent_check, `select t3a_cr13_record_check('${asg}','concur','checked against the bundle') r`);
  return { asg, decider: res.decision, checker: res.independent_check, cs };
}
const restrict = (asg: string, cs: string, el: string, kind = "restricted") => asService(c, `select t3a_cr07_restrict_clause('${asg}','${cs}','${el}','${kind}') r`);
const standing = async (p: string) => (await run(c, `select clause_instances ci from t3a_current_composed('${p}','${DIM}')`));

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, "cr07-rev"); });
afterAll(async () => { await c.end(); });

describe("CR-07 a clause that cannot be established", () => {
  it("T1: the disputed clause is withdrawn from composition; the rest of the observation stands; nothing is added", async () => {
    const w = await observed(await source()); const r = await reconsideration(w, "amend");
    const before = (await run(c, `select (select count(*)::int from t3a_observation_record where participant_id='${w.p}') o, (select count(*)::int from t3a_dimension_composed_statement where participant_id='${w.p}') s`))[0];
    expect((await standing(w.p))[0].ci.map((x: any) => x.conduct_element_id)).toEqual(["CE-1", "CE-2", "CE-3"]);
    const out = (await restrict(r.asg, w.cs, "CE-2", "withdrawn")).r;
    expect(out).toEqual({ outcome: "withdrawn", rest_of_observation_stands: true, recording_introduced: false });
    const rows = await standing(w.p);
    expect(rows).toHaveLength(1);                                                       // the statement itself stands
    expect(rows[0].ci.map((x: any) => x.conduct_element_id)).toEqual(["CE-1", "CE-3"]);
    expect((await run(c, `select (select count(*)::int from t3a_observation_record where participant_id='${w.p}') o, (select count(*)::int from t3a_dimension_composed_statement where participant_id='${w.p}') s`))[0]).toEqual(before);
    expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${w.rec}'`))[0].is_committed).toBe(true);
  });
  it("a clause may be restricted rather than withdrawn, and every clause may go while the observation stays", async () => {
    const w = await observed(await source()); const r = await reconsideration(w, "withdraw");
    expect((await restrict(r.asg, w.cs, "CE-1", "restricted")).r.outcome).toBe("restricted");
    for (const e of ["CE-2", "CE-3"]) await restrict(r.asg, w.cs, e, "withdrawn");
    const rows = await standing(w.p);
    expect(rows).toHaveLength(1); expect(rows[0].ci).toEqual([]);
    expect((await run(c, `select kind from t3a_clause_restriction where composed_statement_id='${w.cs}' order by restriction_seq`)).map((x) => x.kind)).toEqual(["restricted", "withdrawn", "withdrawn"]);
  });
  it("nothing changes unless the reconsideration is final and did not uphold the record", async () => {
    const w = await observed(await source()); const open = await reconsideration(w, "amend", false);
    expect((await restrict(open.asg, w.cs, "CE-1")).r.reason).toBe("RECONSIDERATION_NOT_FINAL");
    const w2 = await observed(await source()); const up = await reconsideration(w2, "uphold");
    expect((await restrict(up.asg, w2.cs, "CE-1")).r.reason).toBe("RECONSIDERATION_UPHELD_THE_RECORD");
    expect((await standing(w2.p))[0].ci).toHaveLength(3);
  });
  it("only a clause of this observation and statement can be restricted, once, in a controlled set; the route is governed", async () => {
    const w = await observed(await source()); const other = await observed(await source()); const r = await reconsideration(w, "amend");
    expect((await restrict(r.asg, other.cs, "CE-1")).r.reason).toBe("CLAUSE_NOT_PART_OF_THIS_OBSERVATION");
    expect((await restrict(r.asg, w.cs, "CE-9")).r.reason).toBe("CLAUSE_NOT_IN_STATEMENT");
    expect((await restrict(r.asg, w.cs, "CE-1", "erased")).r.reason).toBe("KIND_NOT_IN_CONTROLLED_SET");
    expect((await restrict(r.asg, w.cs, "CE-1")).r.outcome).toBe("restricted");
    expect((await restrict(r.asg, w.cs, "CE-1")).r.reason).toBe("CLAUSE_ALREADY_RESTRICTED");
    expect((await as(r.decider, `select t3a_cr07_restrict_clause('${r.asg}','${w.cs}','CE-2','restricted') r`)).msg).toMatch(/permission denied/);
    await expect(c.query(`update t3a_clause_restriction set kind='withdrawn'`)).rejects.toThrow(/append/i);
  });
});

describe("CR-07 what the reconsiderer reviews", () => {
  it("the reserved people read the served source, delivery events, capture history with corrections, the participant's material and a second observer's record; the observer does not", async () => {
    const src = await source(); const w = await observed(src); const r = await reconsideration(w, "amend", false);
    const si = (await run(c, `select stage_instance_id i from t3a_stage_entry_event where participant_id='${w.p}' order by created_at desc limit 1`))[0].i;
    await fx(`insert into t3a_d1_s2_session_event(stage_instance_id, event_kind, beat_code, reason, recorded_by) values ('${si}','paused','beat-2','participant asked for a moment','${w.obs}')`);
    const o1 = await person("so1"); const o2 = await person("so2");
    for (const [role, who] of [["first", o1], ["second", o2]] as const) {
      await fx(`insert into t3a_session_observer(stage_instance_id, observer_id, role) values ('${si}','${who}','${role}')`);
      await fx(`insert into t3a_observer_capture(stage_instance_id, observer_id, payload, locked_at) values ('${si}','${who}','{"beat2":"${role} observer saw a pause"}'::jsonb, now())`);
    }
    for (const who of [r.decider, r.checker]) {
      const b = (await as(who, `select t3a_cr07_review_bundle('${r.asg}') r`)).r;
      expect(b.outcome).toBe("bundle");
      expect(b.served_source.source_version_id).toBe(src.version); expect(b.served_source.stage_instance_id).toBe(si);
      expect(b.delivery_events.map((e: any) => e.event_kind)).toEqual(["paused"]); expect(b.delivery_events[0].recorded_at).toBeTruthy();
      expect(b.capture_history).toHaveLength(1); expect(b.capture_history[0].clauses).toHaveLength(3);
      expect(b.participant_correction_material).toEqual({ ground: "disputed_clause", narrative: "the participant says this did not happen as recorded" });
      expect(b.independent_evidence.second_observer_captures.map((x: any) => x.payload.beat2).sort()).toEqual(["first observer saw a pause", "second observer saw a pause"]);
    }
    // the observer of the record, the participant and an outsider read nothing
    for (const who of [w.obs, w.p, await person("out")]) expect((await as(who, `select t3a_cr07_review_bundle('${r.asg}') r`)).r).toEqual({ outcome: "refused", reason: "NOT_A_RESERVED_RECONSIDERER" });
    // the bundle shows the clause restrictions once made
    const done = await reconsideration(w, "amend");
    await restrict(done.asg, w.cs, "CE-3");
    expect((await asService(c, `select t3a_cr07_review_bundle('${done.asg}') r`)).r.capture_history[0].restricted_clauses).toEqual(["CE-3"]);
  });
  it("a second observer's capture is withheld from the bundle until both are locked", async () => {
    const w = await observed(await source()); const r = await reconsideration(w, "amend", false);
    const si = (await run(c, `select stage_instance_id i from t3a_stage_entry_event where participant_id='${w.p}' order by created_at desc limit 1`))[0].i;
    const o1 = await person("sa"); const o2 = await person("sb");
    await fx(`insert into t3a_session_observer(stage_instance_id, observer_id, role) values ('${si}','${o1}','first'), ('${si}','${o2}','second')`);
    await fx(`insert into t3a_observer_capture(stage_instance_id, observer_id, payload, locked_at) values ('${si}','${o1}','{"x":1}'::jsonb, now())`);
    await fx(`insert into t3a_observer_capture(stage_instance_id, observer_id, payload) values ('${si}','${o2}','{"x":2}'::jsonb)`);
    expect((await as(r.decider, `select t3a_cr07_review_bundle('${r.asg}') r`)).r.independent_evidence.second_observer_captures).toEqual([]);
  });
});

describe("CR-07 the session was not validly administered", () => {
  it("T2: upheld: the observation is withdrawn, the attempt becomes an administration failure counting nothing, and a new source is offered", async () => {
    const first = await source(); const second = await source();
    const w = await observed(first); const r = await reconsideration(w, "withdraw");
    const before = (await run(c, `select attempt_id, counted from t3a_attempt_live where participant_id='${w.p}' and outcome='completed'`))[0]; expect(before.counted).toBe(true);
    const out = (await asService(c, `select t3a_cr07_withdraw_observation('${r.asg}', 7) r`)).r;
    expect(out.outcome).toBe("withdrawn");
    expect(out.attempt_reclassified.outcome).toBe("reclassified");
    const live = await run(c, `select outcome, counted, attempt_event_class from t3a_attempt_live where participant_id='${w.p}'`);
    expect(live).toEqual([{ outcome: "system_failure", counted: false, attempt_event_class: "administration_failure" }]);
    expect((await run(c, `select count(*)::int n from t3a_attempt where participant_id='${w.p}'`))[0].n).toBe(2);       // the original is superseded, not erased
    expect(out.new_source_offer.outcome).toBe("selected");
    expect(out.new_source_offer.source_version_id).not.toBe(first.version);
    // the observation and its statements are withdrawn; the standing composition shows nothing of it
    expect((await run(c, `select reason_code from t3a_observation_withdrawal where observation_record_id='${w.rec}'`))[0].reason_code).toBe("administration_dispute_upheld");
    expect(await standing(w.p)).toEqual([]);
    expect((await run(c, `select count(*)::int n from t3a_dimension_statement_withdrawal where composed_statement_id='${w.cs}'`))[0].n).toBe(1);
    // the withdrawn attempt counts nothing and starts no wait
    expect((await asService(c, `select t3a_attempt_eligibility('${w.p}','${DIM}','${STAGE}', now()) r`)).r).toMatchObject({ permitted: true, counted_in_window: 0 });
    expect(second.version).toBeTruthy();
  });
  it("withdrawal needs a final reconsideration that withdrew; it happens once; the route is governed", async () => {
    const w = await observed(await source()); const open = await reconsideration(w, "withdraw", false);
    expect((await asService(c, `select t3a_cr07_withdraw_observation('${open.asg}', 1) r`)).r.reason).toBe("RECONSIDERATION_NOT_FINAL");
    const w2 = await observed(await source()); const amend = await reconsideration(w2, "amend");
    expect((await asService(c, `select t3a_cr07_withdraw_observation('${amend.asg}', 1) r`)).r.reason).toBe("RECONSIDERATION_DID_NOT_WITHDRAW");
    const w3 = await observed(await source()); await source(); const done = await reconsideration(w3, "withdraw");
    expect((await as(done.decider, `select t3a_cr07_withdraw_observation('${done.asg}', 1) r`)).msg).toMatch(/permission denied/);
    expect((await asService(c, `select t3a_cr07_withdraw_observation('${done.asg}', 1) r`)).r.outcome).toBe("withdrawn");
    expect((await asService(c, `select t3a_cr07_withdraw_observation('${done.asg}', 1) r`)).r.reason).toBe("OBSERVATION_ALREADY_WITHDRAWN");
    await expect(c.query(`update t3a_observation_withdrawal set reason_code = reason_code`)).rejects.toThrow(/append/i);
  });
});
