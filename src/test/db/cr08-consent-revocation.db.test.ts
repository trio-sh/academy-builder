/** CORR-007 Rev 1.6 rule CR-08: consent revocation against the commit point. Synthetic people and records; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, meet, mkApprovedSource, mkParticipant, retireFixtureSources, run, type SourceFixture } from "./helpers";

let c: pg.Client; let reviewer: string;
const DIM = "D2"; const STAGE = "S1"; const HASH = "c".repeat(64);
const TYPES = ["scenario_logging", "mentor_observation"];
let seq = 0;
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
const consent = async (p: string, status: "granted" | "withdrawn") => { for (const t of TYPES) { const r = await asService(c, `select t3a_record_consent('${p}','${t}','${status}','${DIM}',null,'1.0','${HASH}','checkbox','en-CA','observation','future_only', true) r`); if (r.r?.outcome !== "recorded") throw new Error(JSON.stringify(r)); } };
const act = (p: string, a: string, subject: string | null = null) => asService(c, `select t3a_cr08_act('${p}','${DIM}','${STAGE}','${a}', ${subject ? `'${subject}'` : "null"}) r`).then((x) => x.r);
const refusedCount = async () => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='PERMISSION_NOT_IN_EFFECT'`))[0].n;
async function source(): Promise<SourceFixture> {
  return mkApprovedSource(c, { dimension: DIM, stage: STAGE, situationClass: `SC-D2-${(++seq % 6) + 1}`, reviewer }).catch(async (e) => { await c.query("rollback").catch(() => null); throw e; });
}
/** A participant with consent, an active attempt, and a committed observation with a composed statement (so its output can be excluded). */
async function world(opts: { committed?: boolean } = {}) {
  const p = await mkParticipant(c, `cr08-p-${++seq}`); await consent(p, "granted");
  const rec = randomUUID(); const cs = randomUUID(); const src = await source(); await meet(c, p, src.version);
  await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${rec}','${p}','${DIM}','${STAGE}', ${opts.committed ?? true}, ${opts.committed === false ? "null" : "now()"})`);
  await fx(`insert into t3a_dimension_composed_statement(composed_statement_id, dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances) values ('${cs}','${DIM}','${rec}','${p}','${STAGE}','${src.version}','{}'::jsonb,'[]'::jsonb,'[{"conduct_element_id":"CE-1"}]'::jsonb)`);
  return { p, rec, cs };
}
const standing = async (p: string) => (await run(c, `select composed_statement_id from t3a_current_composed('${p}','${DIM}')`)).length;
const live = async (p: string) => (await run(c, `select outcome, counted, attempt_event_class from t3a_attempt_live where participant_id='${p}'`));
const startAttempt = (p: string) => asService(c, `select t3a_attempt_begin('${p}','${DIM}','${STAGE}','cr08-${RUN}-${++seq}', now()) r`);

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, "cr08-rev"); });
afterAll(async () => { await c.end(); });

describe("CR-08 each consequential act checks the permission", () => {
  for (const a of ["start", "serve", "submit", "capture", "confirm"]) {
    it(`T1: ${a}: revocation first refuses and nothing counts; the act first goes through`, async () => {
      const w = await world({ committed: false }); const w2 = await world({ committed: false });
      expect((await act(w.p, a)).outcome).toBe("allowed");               // act, then revoke: the act stood
      await consent(w.p, "withdrawn");
      await consent(w2.p, "withdrawn");
      const n = await refusedCount();
      const r = await act(w2.p, a, "x");                                   // revoke, then act
      expect(r).toMatchObject({ outcome: "refused", reason: "PERMISSION_NOT_IN_EFFECT", counts: false, quarantined: false });
      expect(await refusedCount()).toBe(n + 1);
      expect((await act(w.p, a)).outcome).toBe("refused");                 // the revocation also stops every later act
    });
  }
  it("T1: commit, revocation first: the act refuses, the work ends quarantined and nothing counts", async () => {
    const w = await world({ committed: false }); await startAttempt(w.p);
    await consent(w.p, "withdrawn");
    const r = await act(w.p, "commit", w.rec);
    expect(r).toMatchObject({ outcome: "refused", quarantined: true, counts: false });
    expect((await run(c, `select reason, subject_ref from t3a_cr08_quarantine where participant_id='${w.p}'`))).toEqual([{ reason: "consent_revoked_before_commit", subject_ref: w.rec }]);
    expect(await live(w.p)).toEqual([{ outcome: "abandoned", counted: false, attempt_event_class: "administration_failure" }]);
    expect((await run(c, `select count(*)::int n from t3a_attempt where participant_id='${w.p}' and counted`))[0].n).toBe(0);
  });
  it("T1: commit first, then revocation: the commit stands and counts, and its output is excluded from composition", async () => {
    const w = await world({ committed: true });
    await run(c, `insert into t3a_attempt(participant_id, dimension_id, stage_code, outcome, counted, ended_at, commit_at, attempt_event_class, attempt_rules_version) values ('${w.p}','${DIM}','${STAGE}','completed',true, now(), now(),'completed_observation', '1.0')`);
    expect((await act(w.p, "commit", w.rec)).outcome).toBe("allowed");
    expect(await standing(w.p)).toBe(1);
    await consent(w.p, "withdrawn");
    expect(await standing(w.p)).toBe(0);                                  // excluded
    expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${w.rec}'`))[0].is_committed).toBe(true);   // the commit stands
    expect(await live(w.p)).toEqual([{ outcome: "completed", counted: true, attempt_event_class: "completed_observation" }]);               // and counts
    expect((await run(c, `select reason from t3a_dimension_statement_withdrawal where composed_statement_id='${w.cs}'`))[0].reason).toMatch(/^consent revoked after commit \(CR-08\)/);
  });
  for (const a of ["review", "release"]) {
    it(`T1: ${a} after the commit: a revocation excludes the output and the act then refuses`, async () => {
      const w = await world({ committed: true });
      expect((await act(w.p, a)).outcome).toBe("allowed");
      await consent(w.p, "withdrawn");
      expect(await standing(w.p)).toBe(0);
      expect((await act(w.p, a)).reason).toBe("PERMISSION_NOT_IN_EFFECT");
    });
  }
  it("the permission is the participant's own and the dimension's own: another dimension's consent or another person's revocation changes nothing", async () => {
    const w = await world({ committed: false }); const other = await world({ committed: false });
    await consent(other.p, "withdrawn");
    expect((await act(w.p, "serve")).outcome).toBe("allowed");
    expect((await act(w.p, "serve")).outcome).toBe("allowed");
    const noConsent = await mkParticipant(c, `cr08-none-${RUN}`, "candidate", { consent: false });
    expect((await act(noConsent, "serve")).reason).toBe("PERMISSION_NOT_IN_EFFECT");
    expect((await asService(c, `select t3a_cr08_act('${w.p}','${DIM}','${STAGE}','teleport', null) r`)).r.reason).toBe("ACT_NOT_IN_CONTROLLED_SET");
  });
});

describe("CR-08 the transaction sequence decides, not the clock", () => {
  async function sameTransaction(first: "revoke" | "commit") {
    const w = await world({ committed: true }); const outcomes: any[] = [];
    await c.query("begin"); await c.query("set local role service_role");
    await c.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`);
    try {
      const revoke = async () => { for (const t of TYPES) await c.query(`select t3a_record_consent('${w.p}','${t}','withdrawn','${DIM}',null,'1.0','${HASH}','checkbox','en-CA','observation','future_only', true)`); };
      const commit = async () => outcomes.push((await c.query(`select t3a_cr08_act('${w.p}','${DIM}','${STAGE}','commit','${w.rec}') r`)).rows[0].r);
      if (first === "revoke") { await revoke(); await commit(); } else { await commit(); await revoke(); }
      await c.query("commit");
    } catch (e) { await c.query("rollback"); throw e; }
    return { w, outcomes };
  }
  it("T2: a revocation and a commit with identical clock times: the sequence orders them, revocation first refuses", async () => {
    const { w, outcomes } = await sameTransaction("revoke");
    expect(outcomes[0].outcome).toBe("refused");
    const rows = await run(c, `select act, outcome, act_seq, recorded_at from t3a_act_sequence where participant_id='${w.p}' order by act_seq`);
    expect(rows.map((r) => `${r.act}:${r.outcome}`)).toEqual(["consent_revocation:recorded", "consent_revocation:recorded", "commit:refused"]);
    expect(new Set(rows.map((r) => String(r.recorded_at))).size).toBe(1);        // the clock cannot tell them apart; the sequence can
    expect(Number(rows[2].act_seq)).toBeGreaterThan(Number(rows[1].act_seq));
  });
  it("T2: commit first in the same instant: the commit stands and the output is excluded; exactly one outcome each time", async () => {
    const { w, outcomes } = await sameTransaction("commit");
    expect(outcomes[0].outcome).toBe("allowed");
    const rows = await run(c, `select act, outcome, recorded_at from t3a_act_sequence where participant_id='${w.p}' order by act_seq`);
    expect(rows.map((r) => `${r.act}:${r.outcome}`)).toEqual(["commit:allowed", "consent_revocation:recorded", "consent_revocation:recorded"]);
    expect(new Set(rows.map((r) => String(r.recorded_at))).size).toBe(1);
    expect(await standing(w.p)).toBe(0);
    expect((await run(c, `select count(*)::int n from t3a_cr08_quarantine where participant_id='${w.p}'`))[0].n).toBe(0);   // never both, never neither
  });
  it("two connections racing a revocation and a commit end in exactly one of the two outcomes", async () => {
    for (let i = 0; i < 4; i++) {
      const w = await world({ committed: true });
      const c2 = await connect();
      try {
        const [a, b] = await Promise.all([
          act(w.p, "commit", w.rec),
          (async () => { await c2.query("begin"); await c2.query("set local role service_role"); await c2.query(`select set_config('request.jwt.claims','{"role":"service_role"}', true)`);
            for (const t of TYPES) await c2.query(`select t3a_record_consent('${w.p}','${t}','withdrawn','${DIM}',null,'1.0','${HASH}','checkbox','en-CA','observation','future_only', true)`); await c2.query("commit"); })(),
        ]);
        const q = (await run(c, `select count(*)::int n from t3a_cr08_quarantine where participant_id='${w.p}'`))[0].n;
        const excluded = (await standing(w.p)) === 0;
        const rows = await run(c, `select act, outcome from t3a_act_sequence where participant_id='${w.p}' and act='commit'`);
        expect(rows).toHaveLength(1);
        if (rows[0].outcome === "allowed") { expect(q).toBe(0); expect(excluded).toBe(true); expect(a.outcome).toBe("allowed"); }
        else { expect(q).toBe(1); expect(a.outcome).toBe("refused"); }
        expect(b).toBeUndefined();
      } finally { await c2.end(); }
    }
  });
  it("an act that arrives while a revocation is in progress waits for it and then refuses; the order is the lock's, not a race", async () => {
    const w = await world({ committed: false }); await startAttempt(w.p);
    const a = await connect();
    try {
      await a.query("begin"); await a.query("set local role service_role"); await a.query(`select set_config('request.jwt.claims','{"role":"service_role"}', true)`);
      for (const t of TYPES) await a.query(`select t3a_record_consent('${w.p}','${t}','withdrawn','${DIM}',null,'1.0','${HASH}','checkbox','en-CA','observation','future_only', true)`);   // revocation taken, not yet committed
      let settled = false;
      const commit = act(w.p, "commit", w.rec).then((r) => { settled = true; return r; });
      await new Promise((r) => setTimeout(r, 400));
      expect(settled).toBe(false);                                   // it is waiting on the participant's lock, not reading the old permission
      await a.query("commit");
      const r = await commit;
      expect(r.outcome).toBe("refused"); expect(r.quarantined).toBe(true);
      const rows = await run(c, `select act, outcome from t3a_act_sequence where participant_id='${w.p}' order by act_seq`);
      expect(rows.map((x) => `${x.act}:${x.outcome}`)).toEqual(["consent_revocation:recorded", "consent_revocation:recorded", "commit:refused"]);
    } finally { await a.end(); }
  });
});


describe("CR-08 queued work and the immutable record", () => {
  it("a revocation cancels work already queued; queued work that runs is checked again", async () => {
    const w = await world({ committed: false }); const w2 = await world({ committed: false });
    const q1 = (await asService(c, `select t3a_cr08_queue('${w.p}','${DIM}','${STAGE}','submit','job-1') r`)).r.queued_act_id;
    const q2 = (await asService(c, `select t3a_cr08_queue('${w2.p}','${DIM}','${STAGE}','submit','job-2') r`)).r.queued_act_id;
    await consent(w.p, "withdrawn");
    expect((await run(c, `select event from t3a_queued_act_event where queued_act_id='${q1}'`)).map((r) => r.event)).toEqual(["cancelled"]);
    const r1 = (await asService(c, `select t3a_cr08_run_queued('${q1}') r`)).r; expect(r1.reason).toBe("QUEUED_ACT_ALREADY_SETTLED"); expect(r1.detail ?? "cancelled").toBeTruthy();
    expect((await asService(c, `select t3a_cr08_run_queued('${q2}') r`)).r.outcome).toBe("allowed");
    expect((await asService(c, `select t3a_cr08_run_queued('${q2}') r`)).r.reason).toBe("QUEUED_ACT_ALREADY_SETTLED");
    const q3 = (await asService(c, `select t3a_cr08_queue('${w2.p}','${DIM}','${STAGE}','serve',null) r`)).r.queued_act_id;
    await consent(w2.p, "withdrawn");
    expect((await run(c, `select event from t3a_queued_act_event where queued_act_id='${q3}'`))[0].event).toBe("cancelled");
  });
  it("the historical consent record stays immutable: a revocation adds a row and changes no earlier one", async () => {
    const w = await world({ committed: false });
    const before = await run(c, `select consent_id, consent_status from t3a_consent_record where account_id='${w.p}' order by recorded_seq`);
    await consent(w.p, "withdrawn");
    const after = await run(c, `select consent_id, consent_status from t3a_consent_record where account_id='${w.p}' order by recorded_seq`);
    expect(after.slice(0, before.length)).toEqual(before); expect(after.length).toBe(before.length + 2);
    expect(before.every((r) => r.consent_status === "granted")).toBe(true);
    await expect(c.query(`update t3a_consent_record set consent_status='granted' where account_id='${w.p}'`)).rejects.toThrow();
    await expect(c.query(`update t3a_act_sequence set outcome='allowed'`)).rejects.toThrow(/append/i);
    await expect(c.query(`delete from t3a_cr08_quarantine`)).rejects.toThrow(/append/i);
  });
  it("the routes are the service's alone", async () => {
    const p = await mkParticipant(c, `cr08-svc-${RUN}`);
    for (const call of [`t3a_cr08_act('${p}','${DIM}','${STAGE}','start',null)`, `t3a_cr08_queue('${p}','${DIM}','${STAGE}','start',null)`, `t3a_cr08_run_queued('${randomUUID()}')`]) {
      expect((await asRole(c, "authenticated", p, `select ${call} r`)).msg, call).toMatch(/permission denied/);
    }
  });
});

describe("CR-08 the real commit, behind the consent switch (off)", () => {
  const setGate = (on: boolean) => run(c, `update t3a_consent_config set enforce_gate = ${on}`);
  let gatePrev = false;
  beforeAll(async () => { gatePrev = (await run(c, `select enforce_gate g from t3a_consent_config`))[0].g; });
  afterAll(async () => { await setGate(gatePrev); });   // whatever the run set is put back
  async function pending() {
    const p = await mkParticipant(c, `cr08-g-${++seq}`); await consent(p, "granted"); const rec = randomUUID();
    await run(c, `insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code) values ('${rec}','${p}','${DIM}','${STAGE}')`);
    return { p, rec };
  }
  it("with the switch off nothing is gated (the default)", async () => {
    await setGate(false);
    const w = await pending(); await consent(w.p, "withdrawn");
    await run(c, `update t3a_observation_record set is_committed = true, committed_at = now() where observation_record_id='${w.rec}'`);
    expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${w.rec}'`))[0].is_committed).toBe(true);
  });
  it("with the switch on, a commit after a revocation does not happen and is quarantined; a commit with the permission in effect is recorded in the sequence", async () => {
    await setGate(true);
    try {
      const ok = await pending(); const bad = await pending(); await consent(bad.p, "withdrawn");
      await run(c, `update t3a_observation_record set is_committed = true, committed_at = now() where observation_record_id='${ok.rec}'`);
      expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${ok.rec}'`))[0].is_committed).toBe(true);
      expect((await run(c, `select act, outcome from t3a_act_sequence where participant_id='${ok.p}'`))).toEqual([{ act: "commit", outcome: "allowed" }]);
      await run(c, `update t3a_observation_record set is_committed = true, committed_at = now() where observation_record_id='${bad.rec}'`);
      expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${bad.rec}'`))[0].is_committed).toBe(false);
      expect((await run(c, `select count(*)::int n from t3a_cr08_quarantine where participant_id='${bad.p}'`))[0].n).toBe(1);
      expect((await run(c, `select act, outcome from t3a_act_sequence where participant_id='${bad.p}' and act='commit'`))).toEqual([{ act: "commit", outcome: "refused" }]);
      // a revocation that comes after the commit leaves it committed and excludes the output
      await consent(ok.p, "withdrawn");
      expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${ok.rec}'`))[0].is_committed).toBe(true);
    } finally { await setGate(gatePrev); }
  });
  it("D1 is left to its own consent tables", async () => {
    await setGate(true);
    try {
      const p = await mkParticipant(c, `cr08-d1-${RUN}`); const rec = randomUUID();
      await run(c, `insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code) values ('${rec}','${p}','D1','S1')`);
      await run(c, `update t3a_observation_record set is_committed = true, committed_at = now() where observation_record_id='${rec}'`);
      expect((await run(c, `select is_committed from t3a_observation_record where observation_record_id='${rec}'`))[0].is_committed).toBe(true);
    } finally { await setGate(false); }
  });
});

