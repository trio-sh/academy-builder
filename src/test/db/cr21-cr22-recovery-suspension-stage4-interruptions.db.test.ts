/** CORR-007 Rev 1.6 rules CR-21 (recovery, source suspension, shared submissions) and CR-22 (Stage 4 interruptions). Synthetic people and sources; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, meet, mkApprovedSource, mkParticipant, retireFixtureSources, run, type SourceFixture } from "./helpers";

let c: pg.Client; let reviewer: string; let d1a: string; let d1b: string;
const HASH = "e".repeat(64);
let seq = 0;
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
async function source(dim = "D2", stage: "S1" | "S2" = "S1"): Promise<SourceFixture> {
  return mkApprovedSource(c, { dimension: dim, stage, situationClass: `SC-${dim}-${(++seq % 6) + 1}`, reviewer }).catch(async (e) => { await c.query("rollback").catch(() => null); throw e; });
}
const consent = async (p: string, dim: string, status: "granted" | "withdrawn" = "granted") => { for (const t of ["scenario_logging", "mentor_observation"]) { const r = await asService(c, `select t3a_record_consent('${p}','${t}','${status}','${dim}',null,'1.0','${HASH}','checkbox','en-CA','observation','future_only', true) r`); if (r.r?.outcome !== "recorded") throw new Error(JSON.stringify(r)); } };

beforeAll(async () => {
  c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, "cr21-rev");
  const v = await run(c, `select cv.content_version_id v from t3a_d1_content_version cv join t3a_content_object o using (content_object_id) where o.family='source' and o.dimension_id='D1' and cv.retired_at is null and o.identifier !~ '^SRC-D[0-9]-S[0-9]-[0-9a-f]{8}$' order by cv.content_version_id limit 2`);
  d1a = v[0].v; d1b = v[1].v;
});
afterAll(async () => { await c.end(); });

describe("CR-21 a restart creates no duplicate and advances nothing silently", () => {
  async function pending(dim = "D2", stage = "S1") {
    const p = await mkParticipant(c, `cr21-p-${++seq}`);
    const inst = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${p}','${stage}','${dim}',1,'active') returning stage_instance_id i`))[0].i;
    const mk = async () => (await run(c, `insert into t3a_observation_record(participant_id, dimension_id, stage_code) values ('${p}','${dim}','${stage}') returning observation_record_id r`))[0].r;
    return { p, inst, rec: await mk(), mk };
  }
  const commit = (inst: string, key: string, rec: string) => asService(c, `select t3a_cr21_commit_once('${inst}','${key}','${rec}') r`).then((x) => x.r);
  const resume = (u: string, inst: string) => as(u, `select t3a_cr21_resume('${inst}') r`).then((x) => x.r);

  it("T1: a restart in the middle of commit: the same key gives the same answer, a new key after the commit is refused, and there is one commit", async () => {
    const w = await pending();
    const first = await commit(w.inst, `k1-${RUN}`, w.rec); expect(first).toEqual({ outcome: "committed", observation_record_id: w.rec });
    expect(await commit(w.inst, `k1-${RUN}`, w.rec)).toEqual({ outcome: "already_committed", observation_record_id: w.rec });          // the restart
    const again = await commit(w.inst, `k2-${RUN}`, w.rec); expect(again).toMatchObject({ outcome: "refused", reason: "SESSION_ALREADY_COMMITTED", observation_record_id: w.rec });
    const other = await w.mk(); expect((await commit(w.inst, `k3-${RUN}`, other)).reason).toBe("SESSION_ALREADY_COMMITTED");           // a second record cannot be slipped in
    expect((await run(c, `select count(*)::int n from t3a_observation_record where stage_instance_id='${w.inst}' and is_committed`))[0].n).toBe(1);
    expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${other}'`))[0].is_committed).toBe(false);
    await expect(c.query(`update t3a_observation_record set is_committed = true, stage_instance_id='${w.inst}' where observation_record_id='${other}'`)).rejects.toThrow(/unique|duplicate/i);
  });
  it("the record has to be the session's own; nothing is half-written when it is not", async () => {
    const w = await pending(); const x = await pending();
    expect((await commit(w.inst, `k-${RUN}`, x.rec)).reason).toBe("RECORD_NOT_THIS_SESSIONS");
    expect((await commit(randomUUID(), `k-${RUN}`, w.rec)).reason).toBe("STAGE_INSTANCE_NOT_FOUND");
    expect((await commit(w.inst, "", w.rec)).reason).toBe("IDEMPOTENCY_KEY_MISSING");
    expect((await run(c, `select count(*)::int n from t3a_commit_request where stage_instance_id='${w.inst}'`))[0].n).toBe(0);
    expect((await run(c, `select stage_instance_id from t3a_observation_record where observation_record_id='${x.rec}'`))[0].stage_instance_id).toBeNull();
  });
  it("T1: a restart in the middle of capture or commit: resuming reads and writes nothing, however often it is asked, and keeps every correction event", async () => {
    const w = await pending(); const src = await source();
    await fx(`update t3a_observation_record set stage_instance_id='${w.inst}' where observation_record_id='${w.rec}'`);
    const cs1 = randomUUID(); const cs2 = randomUUID();
    await fx(`insert into t3a_dimension_composed_statement(composed_statement_id, dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances) values ('${cs1}','D2','${w.rec}','${w.p}','S1','${src.version}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb)`);
    await fx(`insert into t3a_dimension_composed_statement(composed_statement_id, dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, supersedes_composed_statement_id) values ('${cs2}','D2','${w.rec}','${w.p}','S1','${src.version}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb,'${cs1}')`);
    const snapshot = async () => (await run(c, `select (select count(*)::int from t3a_stage_instance) a, (select count(*)::int from t3a_observation_record) b, (select count(*)::int from t3a_dimension_composed_statement) d, (select count(*)::int from t3a_stage_entry_event) e, (select state::text from t3a_stage_instance where stage_instance_id='${w.inst}') s`))[0];
    const before = await snapshot();
    const r1 = await resume(w.p, w.inst); const r2 = await resume(w.p, w.inst); const r3 = await asService(c, `select t3a_cr21_resume('${w.inst}') r`).then((x) => x.r);
    expect(r1).toEqual(r2); expect(r1).toEqual(r3);
    expect(r1).toMatchObject({ outcome: "resume", committed: false, next_step: "commit", advanced: false, correction_events: 1, observation_record_id: w.rec });
    expect(await snapshot()).toEqual(before);
    await commit(w.inst, `kc-${RUN}`, w.rec);
    expect(await resume(w.p, w.inst)).toMatchObject({ committed: true, next_step: "done", correction_events: 1 });
    expect(await resume(w.p, w.inst)).toMatchObject({ committed: true, next_step: "done" });                                                  // and again: nothing advances
    const fresh = await pending(); expect(await resume(fresh.p, fresh.inst)).toMatchObject({ committed: false, next_step: "capture" });
  });
  it("only the participant, the assigned mentor, administrative standing and the service can ask where a session stands", async () => {
    const w = await pending(); const other = await mkParticipant(c, `cr21-o-${++seq}`);
    expect(await resume(other, w.inst)).toEqual({ outcome: "refused", reason: "SESSION_NOT_AVAILABLE" });
    expect(await resume(other, randomUUID())).toEqual({ outcome: "refused", reason: "SESSION_NOT_AVAILABLE" });
    expect((await asRole(c, "anon", null, `select t3a_cr21_resume('${w.inst}') r`)).msg).toMatch(/permission denied/);
    expect((await as(w.p, `select t3a_cr21_commit_once('${w.inst}','k','${w.rec}') r`)).msg).toMatch(/permission denied/);
  });
});

describe("CR-21 suspending a source opens an impact review", () => {
  it("T2: every served instance, every observation and every report is listed; nothing is cancelled", async () => {
    const src = await source(); const other = await source("D2");
    const world = async () => {
      const p = await mkParticipant(c, `cr21-s-${++seq}`); await meet(c, p, src.version);
      const rec = randomUUID(); const rep = randomUUID();
      await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${rec}','${p}','D2','S1', true, now())`);
      await fx(`insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances) values ('D2','${rec}','${p}','S1','${src.version}','{}'::jsonb,'[]'::jsonb,'[]'::jsonb)`);
      await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${rep}','${p}','D2', array['D2'], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false)`);
      await run(c, `insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, commit_at, attempt_event_class, attempt_rules_version) values ('${p}','D2','S1','completed',true, now(), now(),'completed_observation', '1.0')`);
      return { p, rec, rep };
    };
    const ws = [await world(), await world()];
    const bystander = await mkParticipant(c, `cr21-by-${++seq}`); await meet(c, bystander, other.version);            // served from another source: not on this review
    const snap = async () => (await run(c, `select (select count(*)::int from t3a_attempt where counted) att, (select count(*)::int from t3a_observation_record where is_committed) obs, (select count(*)::int from t3a_dimension_composed_statement) cs,
        (select count(*)::int from t3a_dimension_statement_withdrawal) wd, (select count(*)::int from t3a_d1_ber_report where issued_at is not null or withdrawn_at is not null or amended_at is not null) rep`))[0];
    const before = await snap();
    const out = (await asService(c, `select t3a_cr21_suspend_source('${src.version}','content error found in the pre-brief') r`)).r;
    expect(out).toMatchObject({ outcome: "suspended", served_instances: 2, observations: 2, reports: 2, cancelled_automatically: false });
    expect(await snap()).toEqual(before);                                                                              // nothing cancelled, nothing withdrawn, nothing counted differently
    const review = (await asService(c, `select t3a_cr21_impact_review('${out.review_id}') r`)).r;
    expect(review.source_version_id).toBe(src.version);
    const byKind = (k: string) => review.items.filter((i: any) => i.kind === k).map((i: any) => i.ref).sort();
    expect(byKind("observation")).toEqual(ws.map((w) => w.rec).sort()); expect(byKind("report")).toEqual(ws.map((w) => w.rep).sort());
    expect(byKind("served_instance")).toHaveLength(2);
    expect(review.items.map((i: any) => i.participant_id)).not.toContain(bystander);
    expect((await run(c, `select operational_state::text s from t3a_d1_content_version where content_version_id='${src.version}'`))[0].s).toBe("suspended");
    expect((await run(c, `select operational_state::text s from t3a_d1_content_version where content_version_id='${other.version}'`))[0].s).toBe("active");
  });
  it("a suspension names its reason, happens once, and belongs to the service or a person with standing", async () => {
    const src = await source(); const p = await mkParticipant(c, `cr21-x-${++seq}`);
    expect((await asService(c, `select t3a_cr21_suspend_source('${src.version}','  ') r`)).r.reason).toBe("REASON_REQUIRED");
    expect((await asService(c, `select t3a_cr21_suspend_source('${randomUUID()}','x') r`)).r.reason).toBe("SOURCE_VERSION_NOT_FOUND");
    expect((await as(p, `select t3a_cr21_suspend_source('${src.version}','a participant tries') r`)).r.reason).toBe("APPROVER_LACKS_STANDING");
    expect((await asService(c, `select t3a_cr21_suspend_source('${src.version}','first') r`)).r.outcome).toBe("suspended");
    expect((await asService(c, `select t3a_cr21_suspend_source('${src.version}','second') r`)).r.reason).toBe("SOURCE_ALREADY_SUSPENDED");
    expect((await as(p, `select t3a_cr21_impact_review('${randomUUID()}') r`)).r).toEqual({ outcome: "refused", reason: "NOT_AVAILABLE" });
    await expect(c.query(`update t3a_source_impact_item set item_kind = item_kind`)).rejects.toThrow(/append/i);
  });
});

describe("CR-21 a shared Stage 3 submission and withdrawn permission", () => {
  it("T3: withdrawing permission for one of two dimensions refuses that dimension's record; the other stands", async () => {
    const p = await mkParticipant(c, `cr21-sh-${++seq}`); await consent(p, "D2"); await consent(p, "D3");
    const rec = async (dim: string) => { const id = randomUUID(); await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code) values ('${id}','${p}','${dim}','S3')`); return id; };
    const r2 = await rec("D2"); const r3 = await rec("D3");
    await consent(p, "D3", "withdrawn");                                                          // the permission for D3 goes before the commit
    await run(c, `update t3a_consent_config set enforce_gate = true`);
    try {
      await run(c, `update t3a_observation_record set is_committed = true, committed_at = now() where observation_record_id in ('${r2}','${r3}')`);
    } finally { await run(c, `update t3a_consent_config set enforce_gate = false`); }
    const st = await run(c, `select dimension_id, is_committed from t3a_observation_record where participant_id='${p}' order by dimension_id`);
    expect(st).toEqual([{ dimension_id: "D2", is_committed: true }, { dimension_id: "D3", is_committed: false }]);
    expect((await run(c, `select dimension_id, reason from t3a_cr08_quarantine where participant_id='${p}'`))).toEqual([{ dimension_id: "D3", reason: "consent_revoked_before_commit" }]);
    expect((await asService(c, `select t3a_cr08_act('${p}','D2','S3','review', null) r`)).r.outcome).toBe("allowed");
    expect((await asService(c, `select t3a_cr08_act('${p}','D3','S3','review', null) r`)).r.outcome).toBe("refused");
  });
});

describe("CR-22 Stage 4 interruptions", () => {
  async function groupWorld(src = d1a) {
    const observed = await mkParticipant(c, `cr22-o-${++seq}`); const fac = await mkParticipant(c, `cr22-f-${seq}`, "mentor");
    const co = [await mkParticipant(c, `cr22-c1-${seq}`), await mkParticipant(c, `cr22-c2-${seq}`)];
    const gs = (await run(c, `insert into t3a_d1_group_session(source_version_id, facilitator_id, observed_participant_id, accommodation_settled) values ('${src}','${fac}','${observed}', true) returning group_session_id g`))[0].g;
    await run(c, `insert into t3a_d1_group_session_member(group_session_id, participant_id, member_role) values ('${gs}','${observed}','observed')`);
    for (const m of co) await run(c, `insert into t3a_d1_group_session_member(group_session_id, participant_id, member_role) values ('${gs}','${m}','co_participant')`);
    await asService(c, `select t3a_attempt_begin('${observed}','D1','S4','cr22-${RUN}-${++seq}', now()) r`);
    return { observed, fac, co, gs };
  }
  const interrupt = (w: { gs: string }, kind: string, affected: string | null = null, decision = false, revealed = false) =>
    asService(c, `select t3a_cr22_interrupt('${w.gs}','${kind}', ${affected ? `'${affected}'` : "null"}, ${decision}, ${revealed}) r`).then((x) => x.r);
  const counts = async (ids: string[]) => (await run(c, `select (select count(*)::int from t3a_observation_record where participant_id = any(array[${ids.map((i) => `'${i}'::uuid`).join(",")}])) obs,
      (select count(*)::int from t3a_d1_progression_decision where participant_id = any(array[${ids.map((i) => `'${i}'::uuid`).join(",")}])) prog,
      (select count(*)::int from t3a_d1_composed_statement cs join t3a_observation_record o using (observation_record_id) where o.participant_id = any(array[${ids.map((i) => `'${i}'::uuid`).join(",")}])) stm`))[0];
  const attempt = async (p: string) => (await run(c, `select outcome, counted, attempt_event_class, welfare_flag from t3a_attempt where participant_id='${p}' and dimension_id='D1' and stage_code='S4'`))[0];
  const eligible = async (p: string) => (await asService(c, `select t3a_attempt_eligibility('${p}','D1','S4', now()) r`)).r.permitted as boolean;

  const cases: Array<{ name: string; kind: string; affected: "observed" | "co" | null; decision: boolean; revealed: boolean; ending: string; attempt: object; wait: boolean; excl: boolean; group: boolean; source: boolean }> = [
    { name: "observed participant withdraws (chosen)", kind: "observed_withdraws", affected: "observed", decision: true, revealed: true, ending: "withdrawal_participant_choice", attempt: { outcome: "participant_withdrew", counted: false, attempt_event_class: "withdrawal_after_start_before_commit", welfare_flag: false }, wait: true, excl: false, group: true, source: true },
    { name: "observed participant stops for welfare", kind: "observed_welfare", affected: "observed", decision: true, revealed: true, ending: "welfare_stop_participant", attempt: { outcome: "participant_withdrew", counted: false, attempt_event_class: "welfare_stop", welfare_flag: true }, wait: false, excl: false, group: true, source: true },
    { name: "role player withdraws before the first decision point, content not revealed", kind: "role_player_withdraws", affected: "co", decision: false, revealed: false, ending: "administration_failure", attempt: { outcome: "system_failure", counted: false, attempt_event_class: "administration_failure", welfare_flag: false }, wait: false, excl: false, group: true, source: false },
    { name: "role player disconnects before the first decision point, content revealed", kind: "role_player_disconnects", affected: "co", decision: false, revealed: true, ending: "administration_failure", attempt: { outcome: "system_failure", counted: false, attempt_event_class: "administration_failure", welfare_flag: false }, wait: false, excl: false, group: true, source: true },
    { name: "role player withdraws after the first decision point", kind: "role_player_withdraws", affected: "co", decision: true, revealed: true, ending: "administration_failure", attempt: { outcome: "system_failure", counted: false, attempt_event_class: "administration_failure", welfare_flag: false }, wait: false, excl: true, group: true, source: true },
    { name: "role player substituted mid session (not permitted: treated as that role player's withdrawal)", kind: "role_player_substituted", affected: "co", decision: true, revealed: true, ending: "administration_failure", attempt: { outcome: "system_failure", counted: false, attempt_event_class: "administration_failure", welfare_flag: false }, wait: false, excl: true, group: true, source: true },
    { name: "technical disconnection, only the pre-brief shown", kind: "technical_disconnection", affected: null, decision: false, revealed: false, ending: "technical_failure", attempt: { outcome: "system_failure", counted: false, attempt_event_class: "technical_failure", welfare_flag: false }, wait: false, excl: false, group: false, source: false },
    { name: "technical disconnection after content was revealed", kind: "technical_disconnection", affected: null, decision: true, revealed: true, ending: "technical_failure", attempt: { outcome: "system_failure", counted: false, attempt_event_class: "technical_failure", welfare_flag: false }, wait: false, excl: false, group: false, source: true },
    { name: "welfare termination for a co-participant", kind: "welfare_termination", affected: "co", decision: true, revealed: true, ending: "welfare_stop_co_participant", attempt: { outcome: "system_failure", counted: false, attempt_event_class: "administration_failure", welfare_flag: true }, wait: false, excl: false, group: true, source: true },
    { name: "welfare termination for the observed participant", kind: "welfare_termination", affected: "observed", decision: true, revealed: true, ending: "welfare_stop_participant", attempt: { outcome: "participant_withdrew", counted: false, attempt_event_class: "welfare_stop", welfare_flag: true }, wait: false, excl: false, group: true, source: true },
  ];
  it.each(cases)("T1: $name", async (k) => {
    const w = await groupWorld(); const all = [w.observed, ...w.co, w.fac];
    const before = await counts(all);
    const affected = k.affected === "observed" ? w.observed : k.affected === "co" ? w.co[0] : null;
    const r = await interrupt(w, k.kind, affected, k.decision, k.revealed);
    expect(r).toMatchObject({ outcome: "recorded", attempt_ending: k.ending, attempt_counted: false, excludes_determinations: k.excl, new_group_required: k.group, new_source_required: k.source, finding_recorded: false, substitution_permitted: false });
    expect(await attempt(w.observed)).toEqual(k.attempt);
    expect(await eligible(w.observed)).toBe(!k.wait);                         // the rescheduling wait applies only to the chosen withdrawal
    expect(await counts(all)).toEqual(before);                                // no finding about anyone
    expect((await asService(c, `select t3a_cr22_session_determinations_excluded('${w.gs}') r`)).r).toBe(k.excl);
    expect((await run(c, `select ended_at is not null e from t3a_d1_group_session where group_session_id='${w.gs}'`))[0].e).toBe(true);
  });
  it("a role player interruption must name a role player of this session; the kind is from the controlled set; nothing is recorded otherwise", async () => {
    const w = await groupWorld(); const stranger = await mkParticipant(c, `cr22-s-${++seq}`);
    expect((await interrupt(w, "role_player_withdraws", stranger)).reason).toBe("AFFECTED_IS_NOT_A_ROLE_PLAYER_OF_THIS_SESSION");
    expect((await interrupt(w, "role_player_withdraws", w.observed)).reason).toBe("AFFECTED_IS_NOT_A_ROLE_PLAYER_OF_THIS_SESSION");
    expect((await interrupt(w, "vanished")).reason).toBe("INTERRUPTION_KIND_NOT_IN_CONTROLLED_SET");
    expect((await asService(c, `select t3a_cr22_interrupt('${randomUUID()}','observed_withdraws', null, false, false) r`)).r.reason).toBe("SESSION_NOT_FOUND");
    expect((await run(c, `select count(*)::int n from t3a_s4_interruption where group_session_id='${w.gs}'`))[0].n).toBe(0);
    expect((await attempt(w.observed)).outcome).toBe("initiated");
  });
  it("the route is the service's and the records are append-only; with no running attempt nothing is recorded", async () => {
    const w = await groupWorld();
    expect((await as(w.fac, `select t3a_cr22_interrupt('${w.gs}','observed_withdraws', null, false, false) r`)).msg).toMatch(/permission denied/);
    await interrupt(w, "observed_withdraws", w.observed);
    expect((await interrupt(w, "observed_withdraws", w.observed)).reason).toBe("NO_ACTIVE_ATTEMPT");
    expect((await run(c, `select count(*)::int n from t3a_s4_interruption where group_session_id='${w.gs}'`))[0].n).toBe(1);
    await expect(c.query(`update t3a_s4_interruption set kind = kind`)).rejects.toThrow(/append/i);
    await expect(c.query(`delete from t3a_s4_return_constraint`)).rejects.toThrow(/append/i);
  });
  it("T1: the return after an interruption is on a new group and a new source where the interruption said so; a technical disconnection may come back to the same group", async () => {
    const authFac = async (f: string) => run(c, `insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status, reviewer_authorization, issuer_authorization) values ('${f}','D1', now() - interval '1 day','current','1.0','authorized', true, true)`);
    // a withdrawal: same group and same source are refused, a new group on the same source is refused, a new source with the same group is refused, both new composes
    const w = await groupWorld(d1a); await authFac(w.fac); await interrupt(w, "observed_withdraws", w.observed);
    const compose = (src: string, co: string[]) => asService(c, `select t3a_s4_compose_session('${src}','${w.fac}','${w.observed}', array[${co.map((x) => `'${x}'::uuid`).join(",")}]::uuid[], true) r`).then((x) => x.r);
    expect((await compose(d1a, w.co)).reason).toBe("RETURN_NEEDS_A_NEW_GROUP");
    const fresh = [await mkParticipant(c, `cr22-n1-${++seq}`), await mkParticipant(c, `cr22-n2-${seq}`)];
    expect((await compose(d1a, fresh)).reason).toBe("RETURN_NEEDS_A_NEW_SOURCE");
    expect((await compose(d1b, w.co)).reason).toBe("RETURN_NEEDS_A_NEW_GROUP");
    expect((await compose(d1b, fresh)).outcome).toBe("composed");
    // a technical disconnection with only the pre-brief shown: the same source and the same group may come back
    const t = await groupWorld(d1a); await authFac(t.fac); await interrupt(t, "technical_disconnection", null, false, false);
    const again = await asService(c, `select t3a_s4_compose_session('${d1a}','${t.fac}','${t.observed}', array[${t.co.map((x) => `'${x}'::uuid`).join(",")}]::uuid[], true) r`).then((x) => x.r);
    expect(again.outcome).toBe("composed");
    // a participant with no interruption composes as before
    const clean = await groupWorld(d1a); await authFac(clean.fac);
    expect((await asService(c, `select t3a_s4_compose_session('${d1a}','${clean.fac}','${clean.observed}', array[]::uuid[], true) r`)).r.outcome).toBe("composed");
  });
  it("T2: the original compose route cannot be called around the return rules", async () => {
    const g = (await run(c, `select has_function_privilege('authenticated','public.t3a_s4_compose_session_base(uuid,uuid,uuid,uuid[],boolean)','execute') a, has_function_privilege('anon','public.t3a_s4_compose_session_base(uuid,uuid,uuid,uuid[],boolean)','execute') b, has_function_privilege('authenticated','public.t3a_s4_compose_session(uuid,uuid,uuid,uuid[],boolean)','execute') w`))[0];
    expect(g).toEqual({ a: false, b: false, w: true });
  });
});
