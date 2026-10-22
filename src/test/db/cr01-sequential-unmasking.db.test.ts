/** CORR-007 Rev 1.6 rule CR-01: sequential unmasking at Stage 2. Synthetic people and records; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { asRole, asService, connect, meet, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

let c: pg.Client;
const asUser = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
const refusals = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const read = (u: string, p: string, route = "api") => asUser(u, `select t3a_s1_content_read('${p}','D2','${route}') r`);

type World = { participant: string; confirmer: string; stage2Mentor: string; otherMentor: string; admin: string; safety: string };

/** A participant with a closed, confirmed Stage 1 record (one response, one determination, one confirmation, one routing). Stage 2 is not committed. */
async function stage1World(tag: string): Promise<World> {
  const w: World = {
    participant: await mkParticipant(c, `${tag}-p`), confirmer: await mkParticipant(c, `${tag}-c`, "mentor"), stage2Mentor: await mkParticipant(c, `${tag}-m2`, "mentor"),
    otherMentor: await mkParticipant(c, `${tag}-m3`, "mentor"), admin: await mkParticipant(c, `${tag}-ad`, "admin"), safety: await mkParticipant(c, `${tag}-sc`, "mentor"),
  };
  await c.query("begin");
  try {
  await c.query("set local session_replication_role = replica"); // fixture rows only: constraints and triggers of the capture routes are not the subject here
  const si = (await c.query(`insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, completed_at) values ('${w.participant}','S1','D2',1,now()) returning stage_instance_id i`)).rows[0].i;
  await c.query(`insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by, captured_at) values ('${si}','${w.participant}','D2','${w.confirmer}',now())`);
  await c.query(`insert into t3a_d1_s1_determination(stage_instance_id, participant_id, dimension_id, captured_by, question_id, selection, captured_at) values ('${si}','${w.participant}','D2','${w.confirmer}','Q-D2-01','["a"]'::jsonb,now())`);
  await c.query(`insert into t3a_d1_s1_routing(stage_instance_id, participant_id, dimension_id, assigned_mentor_id) values ('${si}','${w.participant}','D2','${w.confirmer}')`);
  const run1 = (await c.query(`insert into t3a_d1_ai_administration_run(stage_entry_event_id, participant_id, dimension_id, source_version_id, model_ref_version_id, prompt_ref_version_id, admin_config_version_id, safety_config_version_id, rendered_body, env_state_at_run) values ('${randomUUID()}','${w.participant}','D2','${randomUUID()}','${randomUUID()}','${randomUUID()}','${randomUUID()}','${randomUUID()}','body',(enum_range(null::t3a_env_state))[1]) returning ai_administration_run_id r`)).rows[0].r;
  await c.query(`insert into t3a_d1_s1_reveal_response(ai_administration_run_id, reveal_ordinal, reveal_label, reveal_verbatim_hash, shown_at, outcome, response_text) values ('${run1}',1,'R1','${"a".repeat(64)}',now(),'submitted','the participant wrote this')`);
  await c.query("commit");
  } catch (e) { await c.query("rollback"); throw e; }
  return w;
}
const commitStage2 = (w: World) => run(c, `insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, version_set, is_committed, committed_at) values ('${w.participant}','D2','S2','${w.stage2Mentor}','{}'::jsonb,true,now())`);

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); });
afterAll(async () => { await c.end(); });

describe("CR-01 before the Stage 2 commit: the mask", () => {
  it("T1: the Stage 2 mentor is refused and the refusal is logged", async () => {
    const w = await stage1World("a"); const n0 = await refusals("S1_MASKED_UNTIL_STAGE2_COMMIT");
    const r = await read(w.stage2Mentor, w.participant);
    expect(r.r.reason).toBe("S1_MASKED_UNTIL_STAGE2_COMMIT");
    expect(r.r.responses).toBeUndefined();
    expect(await refusals("S1_MASKED_UNTIL_STAGE2_COMMIT")).toBe(n0 + 1);
  });
  it("T4: another mentor, an administrator, the API and an export are each refused and logged, with the route named", async () => {
    const w = await stage1World("b"); const n0 = await refusals("S1_MASKED_UNTIL_STAGE2_COMMIT");
    for (const [who, route] of [[w.otherMentor, "api"], [w.admin, "api"], [w.admin, "export"], [w.admin, "admin_tool"]] as const) {
      const r = await read(who, w.participant, route);
      expect(r.r.reason, `${route}`).toBe("S1_MASKED_UNTIL_STAGE2_COMMIT");
    }
    expect(await refusals("S1_MASKED_UNTIL_STAGE2_COMMIT")).toBe(n0 + 4);
    const logged = await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='S1_MASKED_UNTIL_STAGE2_COMMIT' and (detail like '%export%' or subject_ref like '%export%')`);
    expect(logged[0].n).toBeGreaterThanOrEqual(1);
  });
  it("T4: an administrator reading the tables directly gets no Stage 1 rows; the confirmer and the participant do", async () => {
    const w = await stage1World("c");
    for (const t of ["t3a_d1_s1_confirmation", "t3a_d1_s1_determination", "t3a_d1_s1_routing"]) {
      const asAdmin = await asUser(w.admin, `select count(*)::int r from ${t} where participant_id='${w.participant}'`);
      expect(asAdmin.r, t).toBe(0);
      const asConfirmer = await asUser(w.confirmer, `select count(*)::int r from ${t} where participant_id='${w.participant}'`);
      expect(asConfirmer.r, t + " confirmer").toBe(1);
    }
    const resp = await asUser(w.admin, `select count(*)::int r from t3a_d1_s1_reveal_response x join t3a_d1_ai_administration_run a using (ai_administration_run_id) where a.participant_id='${w.participant}'`);
    expect(resp.r).toBe(0);
  });
  it("the Stage 1 confirmer and the participant may read it before the Stage 2 commit", async () => {
    const w = await stage1World("d");
    expect((await read(w.confirmer, w.participant)).r.outcome).toBe("read");
    expect((await read(w.participant, w.participant)).r.outcome).toBe("read");
  });
  it("the Safety Contact may read it only when a welfare event concerns the participant", async () => {
    const w = await stage1World("e");
    await run(c, `insert into t3a_safety_contact(designated_person, designated_name, designated_by, awaiting_designation, issued_under, note) values ('${w.safety}','Synthetic Contact','${w.admin}',false,'SYNTHETIC TEST ONLY','fixture')`);
    expect((await read(w.safety, w.participant)).r.reason).toBe("S1_MASKED_UNTIL_STAGE2_COMMIT");
    await run(c, `insert into t3a_safety_event(occurred_at, stage_code, acted_by, acted_as, stopped, signposted, escalated_to_safety_contact, emergency_services_contacted, escalated_at, concerns_person) values (now(),'S1','${w.confirmer}','mentor',true,false,true,false,now(),'${w.participant}')`);
    const r = await read(w.safety, w.participant);
    expect(r.r.outcome).toBe("read");
    expect(r.r.basis).toBe("safety_contact_on_welfare_event");
  });
});

describe("CR-01 the Stage 2 commit and after", () => {
  it("committing a Stage 2 observation writes one lock event; a repeat changes nothing", async () => {
    const w = await stage1World("f"); await commitStage2(w);
    expect((await run(c, `select count(*)::int n from t3a_s2_determination_lock where participant_id='${w.participant}'`))[0].n).toBe(1);
    await expect(c.query(`update t3a_s2_determination_lock set locked_at = now()`)).rejects.toThrow(/append/i);
  });
  it("T2: after the commit the Stage 2 mentor reads the responses, determinations and confirmation in full, read only", async () => {
    const w = await stage1World("g"); await commitStage2(w);
    const r = await read(w.stage2Mentor, w.participant);
    expect(r.r.outcome).toBe("read");
    expect(r.r.basis).toBe("stage2_committed");
    expect(r.r.responses).toHaveLength(1);
    expect(r.r.responses[0].response_text).toBe("the participant wrote this");
    expect(r.r.determinations).toHaveLength(1);
    expect(r.r.confirmation).toHaveLength(1);
    for (const sql of [`update t3a_d1_s1_determination set selection='["z"]'::jsonb where participant_id='${w.participant}'`, `delete from t3a_d1_s1_confirmation where participant_id='${w.participant}'`, `insert into t3a_d1_s1_routing(stage_instance_id, participant_id, dimension_id, assigned_mentor_id) values ('${randomUUID()}','${w.participant}','D2','${w.stage2Mentor}')`]) {
      const attempt = await asUser(w.stage2Mentor, sql);
      expect(attempt.msg === "ok" ? attempt.rows.length : 0, sql).toBe(0); // refused outright, or no row touched
    }
    expect((await run(c, `select selection from t3a_d1_s1_determination where participant_id='${w.participant}'`))[0].selection).toEqual(["a"]);
  });
  it("after the commit, a mentor who did not observe Stage 2 is still refused, and it is logged", async () => {
    const w = await stage1World("h"); await commitStage2(w); const n0 = await refusals("S1_READ_NOT_AUTHORIZED");
    expect((await read(w.otherMentor, w.participant)).r.reason).toBe("S1_READ_NOT_AUTHORIZED");
    expect(await refusals("S1_READ_NOT_AUTHORIZED")).toBe(n0 + 1);
  });
  it("T3, T5: a committed Stage 2 record cannot be edited or committed again; the original stands", async () => {
    const w = await stage1World("i"); await commitStage2(w);
    const rec = (await run(c, `select observation_record_id from t3a_observation_record where participant_id='${w.participant}' and stage_code='S2'`))[0];
    await expect(c.query(`update t3a_observation_record set is_committed=false where observation_record_id='${rec.observation_record_id}'`)).rejects.toThrow();
    await expect(c.query(`update t3a_observation_record set observer_id='${w.otherMentor}' where observation_record_id='${rec.observation_record_id}'`)).rejects.toThrow();
    expect((await run(c, `select count(*)::int n from t3a_s2_determination_lock where participant_id='${w.participant}'`))[0].n).toBe(1);
    expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${rec.observation_record_id}'`))[0].is_committed).toBe(true);
  });
  it("T3: Stage 2 determinations are append-only", async () => {
    // a row of its own: with an empty table an update touches nothing and cannot be refused, so the test would pass or fail on what ran before it
    await c.query("begin");
    await c.query("set local session_replication_role = replica");
    const obs = randomUUID();
    await c.query(`insert into t3a_determination(observation_id, question_id, determined_by, clause_instance_id, conduct_element_id, recurrence_equivalence_key_id, state_code) values ('${obs}','${randomUUID()}','${randomUUID()}','${randomUUID()}','${randomUUID()}','${randomUUID()}','X')`);
    await c.query("commit");
    await expect(c.query(`update t3a_determination set determined_by = determined_by where observation_id='${obs}'`)).rejects.toThrow(/append|T3A_/i);
    await expect(c.query(`delete from t3a_determination where observation_id='${obs}'`)).rejects.toThrow(/append|T3A_/i);
    expect((await run(c, `select count(*)::int n from t3a_determination where observation_id='${obs}'`))[0].n).toBe(1);
  });
  it("the older opener answers from the lock event", async () => {
    const w = await stage1World("j");
    const si = (await run(c, `select stage_instance_id i from t3a_stage_instance where participant_id='${w.participant}'`))[0].i;
    expect((await asService(c, `select t3a_open_s1_output('${si}') r`)).r.reason).toBe("S2_DETERMINATIONS_NOT_LOCKED");
    await commitStage2(w);
    expect((await asService(c, `select t3a_open_s1_output('${si}') r`)).r.outcome).toBe("opened");
  });
});

describe("CR-01 how the two Stages relate", () => {
  it("the Stage 2 mentor records the relation per conduct element from the list, after the commit; nothing else may", async () => {
    const w = await stage1World("k");
    const early = await asUser(w.stage2Mentor, `select t3a_record_stage_relation('${w.participant}','D2','CE-1','consistent') r`);
    expect(early.r.reason).toBe("S2_NOT_COMMITTED_BY_CALLER");
    await commitStage2(w);
    const before = (await run(c, `select count(*)::int n from t3a_determination`))[0].n;
    for (const rel of ["consistent", "different", "stated_at_s1_not_enacted_at_s2"]) {
      expect((await asUser(w.stage2Mentor, `select t3a_record_stage_relation('${w.participant}','D2','CE-${rel.length}','${rel}') r`)).r.outcome).toBe("recorded");
    }
    expect((await asUser(w.stage2Mentor, `select t3a_record_stage_relation('${w.participant}','D2','CE-9','better') r`)).r.reason).toBe("RELATION_NOT_IN_LIST");
    expect((await asUser(w.otherMentor, `select t3a_record_stage_relation('${w.participant}','D2','CE-1','consistent') r`)).r.reason).toBe("S2_NOT_COMMITTED_BY_CALLER");
    expect((await run(c, `select count(*)::int n from t3a_stage_relation_record where participant_id='${w.participant}'`))[0].n).toBe(3);
    expect((await run(c, `select count(*)::int n from t3a_determination`))[0].n).toBe(before);
    await expect(c.query(`update t3a_stage_relation_record set relation='different'`)).rejects.toThrow(/append/i);
  });
});

describe("CR-01 Stage 2 entry needs Stage 1 confirmed, not delivered", () => {
  it("with the sequence switch on, entry without a confirmation is refused S1_NOT_CONFIRMED; with one it is admitted", async () => {
    const reviewer = await mkParticipant(c, "cr01-rev");
    const s2 = await mkApprovedSource(c, { dimension: "D2", stage: "S2", situationClass: "SC-D2-3", reviewer });
    const withConfirmation = await stage1World("l"); const without = await mkParticipant(c, "cr01-noconf");
    await run(c, `update t3a_capture_config set enforce_sequence = true`);
    try {
      await expect(meet(c, without, s2.version)).rejects.toThrow(/S1_NOT_CONFIRMED/);
      await expect(meet(c, withConfirmation.participant, s2.version)).resolves.toBeUndefined();
    } finally { await run(c, `update t3a_capture_config set enforce_sequence = false`); }
  });
});
