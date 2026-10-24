/** CORR-007 Rev 1.6 rule CR-26: eligibility before entry and rehearsal exposure. Synthetic people and sources; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, completedAttempts, connect, meet, mkApprovedSource, mkParticipant, retireFixtureSources, run, type SourceFixture } from "./helpers";

let c: pg.Client; let reviewer: string; let A: SourceFixture; let B: SourceFixture;
const DIM = "D2"; const STAGE = "S1"; const HASH = "d".repeat(64);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
let seq = 0;
const loadPools = (srcs: Record<string, string>) => asService(c, `select t3a_retake_pool_load('MAP-CR26-${RUN}-${++seq}','${DIM}','${sha(JSON.stringify(srcs))}','${JSON.stringify(srcs)}'::jsonb) r`);
const request = (p: string, key = `cr26-${RUN}-${++seq}`) => asService(c, `select t3a_cr26_request_entry('${p}','${DIM}','${STAGE}','${key}', 1) r`).then((x) => x.r);
const consent = async (p: string) => { for (const t of ["scenario_logging", "mentor_observation"]) { const r = await asService(c, `select t3a_record_consent('${p}','${t}','granted','${DIM}',null,'1.0','${HASH}','checkbox','en-CA','observation') r`); if (r.r?.outcome !== "recorded") throw new Error(JSON.stringify(r)); } };
const person = async () => { const p = await mkParticipant(c, `cr26-p-${++seq}`); await consent(p); return p; };
const counts = async (p: string) => (await run(c, `select (select count(*)::int from t3a_stage_entry_event where participant_id='${p}') entries, (select count(*)::int from t3a_source_reservation where participant_id='${p}') reservations`))[0];
const internalReasons = async (p: string) => (await run(c, `select detail from t3a_capture_refusal where reason_code='ENTRY_NOT_ELIGIBLE' and subject_ref like '${p}%' order by 1`)).map((r) => r.detail);

beforeAll(async () => {
  c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, "cr26-rev");
  A = await mkApprovedSource(c, { dimension: DIM, stage: STAGE, situationClass: "SC-D2-1", reviewer });
  B = await mkApprovedSource(c, { dimension: DIM, stage: STAGE, situationClass: "SC-D2-2", reviewer });
  const r = await loadPools({ [A.key]: "first_attempt", [B.key]: "first_attempt" }); if (r.r?.outcome !== "loaded") throw new Error(JSON.stringify(r));
});
afterAll(async () => { await c.end(); });

describe("CR-26 a successful eligibility request", () => {
  it("T1: creates exactly one Stage entry event and one reservation, and a repeat of the same request creates nothing more", async () => {
    const p = await person();
    expect(await counts(p)).toEqual({ entries: 0, reservations: 0 });
    const r = await request(p, `k-1-${RUN}`);
    expect(r.outcome).toBe("eligible"); expect(r.stage_entry_event_id).toBeTruthy(); expect(r.reservation_id).toBeTruthy();
    expect(await counts(p)).toEqual({ entries: 1, reservations: 1 });
    const again = await request(p, `k-1-${RUN}`);
    expect(again).toEqual(r);
    expect(await counts(p)).toEqual({ entries: 1, reservations: 1 });
    const e = (await run(c, `select e.source_version_id, e.stage_code::text sc, e.dimension_id, s.source_version_id res_src, s.stage_entry_event_id seid from t3a_stage_entry_event e join t3a_source_reservation s on s.stage_entry_event_id = e.stage_entry_event_id where e.participant_id='${p}'`))[0];
    expect(e.source_version_id).toBe(e.res_src); expect([A.version, B.version]).toContain(e.source_version_id); expect(e).toMatchObject({ sc: STAGE, dimension_id: DIM, seid: r.stage_entry_event_id });
    expect((await run(c, `select count(*)::int n from t3a_stage_instance where participant_id='${p}'`))[0].n).toBe(1);
  });
  it("the participant reads the reserved source through the entry, and only the participant", async () => {
    const p = await person(); const other = await person(); const r = await request(p);
    const got = (await as(p, `select t3a_cr26_source_for_entry('${r.stage_entry_event_id}') r`)).r;
    expect(got).toMatchObject({ outcome: "source", stage_entry_event_id: r.stage_entry_event_id });
    const denied = (await as(other, `select t3a_cr26_source_for_entry('${r.stage_entry_event_id}') r`)).r;
    const missing = (await as(p, `select t3a_cr26_source_for_entry('${randomUUID()}') r`)).r;
    expect(denied).toEqual(missing); expect(denied.outcome).toBe("not_eligible");
  });
  it("an idempotency key belongs to the participant who sent it: another participant's request with the same key is a request of its own", async () => {
    const p = await person(); const q = await person(); const key = `shared-${RUN}`;
    const a = await request(p, key); const b = await request(q, key);
    expect(a.outcome).toBe("eligible"); expect(b.outcome).toBe("eligible"); expect(b.stage_entry_event_id).not.toBe(a.stage_entry_event_id);
    expect(await counts(q)).toEqual({ entries: 1, reservations: 1 });
  });
  it("a second request with a new key meets a different source, since the first is now met", async () => {
    const p = await person(); const r1 = await request(p); const r2 = await request(p);
    expect(r2.outcome).toBe("eligible");
    const srcs = (await run(c, `select source_version_id from t3a_source_reservation where participant_id='${p}'`)).map((x) => x.source_version_id);
    expect(new Set(srcs).size).toBe(2); expect(r2.stage_entry_event_id).not.toBe(r1.stage_entry_event_id);
    const r3 = await request(p);                                  // both sources met: nothing left to reserve
    expect(r3.outcome).toBe("not_eligible"); expect(await counts(p)).toEqual({ entries: 2, reservations: 2 });
  });
});

describe("CR-26 every ineligibility looks the same", () => {
  async function ineligible() {
    const out: Record<string, { response: any; p: string }> = {};
    // the wait after a withdrawal
    { const p = await person(); await asService(c, `select t3a_attempt_begin('${p}','${DIM}','${STAGE}','cr26-b-${RUN}-${++seq}', now()) r`); await asService(c, `select t3a_attempt_end('${p}','${DIM}','${STAGE}','withdrawal_participant_choice') r`); out.cooldown = { p, response: await request(p) }; }
    // the cap
    { const p = await person(); await completedAttempts(c, p, DIM, STAGE, 3); out.cap = { p, response: await request(p) }; }
    // an eligibility hold
    { const p = await person(); const who = await mkParticipant(c, `cr26-h-${++seq}`, "admin"); await run(c, `insert into t3a_eligibility_hold_event(participant_id, event, acted_by) values ('${p}','set','${who}')`); out.hold = { p, response: await request(p) }; }
    // no permission
    { const p = await mkParticipant(c, `cr26-np-${++seq}`, "candidate", { consent: false }); out.permission = { p, response: await request(p) }; }
    // an attempt already running
    { const p = await person(); await asService(c, `select t3a_attempt_begin('${p}','${DIM}','${STAGE}','cr26-r-${RUN}-${++seq}', now()) r`); out.active = { p, response: await request(p) }; }
    // rehearsal exposure: every source already met, however the participant came to meet it
    { const p = await person(); await meet(c, p, A.version); await meet(c, p, B.version); out.rehearsal = { p, response: await request(p) }; }
    return out;
  }
  it("T2: whatever the reason, the answer is one answer: rehearsal exposure cannot be told from the other reasons", async () => {
    const all = await ineligible(); const answers = Object.values(all).map((x) => JSON.stringify(x.response));
    expect(new Set(answers).size).toBe(1);
    expect(JSON.parse(answers[0])).toEqual({ outcome: "not_eligible", message: "We cannot start a session for you right now." });
    for (const x of Object.values(all)) expect(await counts(x.p)).toEqual({ entries: x.p === all.rehearsal.p ? 2 : 0, reservations: 0 });   // the rehearsal one holds its two earlier entries, nothing new
    // the reasons differ only in the internal log
    const reasons = (await Promise.all(Object.values(all).map((x) => internalReasons(x.p)))).flat();
    expect(new Set(reasons).size).toBeGreaterThanOrEqual(5);
  });
  it("T2: a source request outside an allocation event is refused with the same answer", async () => {
    const p = await person(); const all = await ineligible();
    const n = (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='SOURCE_REQUEST_OUTSIDE_ALLOCATION'`))[0].n;
    const r = (await as(p, `select t3a_cr26_source_request('${DIM}','${STAGE}') r`)).r;
    expect(r).toEqual(all.cap.response);
    expect((await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='SOURCE_REQUEST_OUTSIDE_ALLOCATION'`))[0].n).toBe(n + 1);
    // an entry that exists but has no reservation, and a reserved entry of someone else, give the same answer too
    const q = await person(); await meet(c, q, A.version);
    const eid = (await run(c, `select stage_entry_event_id e from t3a_stage_entry_event where participant_id='${q}'`))[0].e;
    expect((await as(q, `select t3a_cr26_source_for_entry('${eid}') r`)).r).toEqual(r);
    expect((await asRole(c, "anon", null, `select t3a_cr26_source_request('${DIM}','${STAGE}') r`)).msg).toMatch(/permission denied/);
  });
  it("the request and its answers are the service's: a participant cannot ask for an entry on their own account", async () => {
    const p = await person();
    expect((await as(p, `select t3a_cr26_request_entry('${p}','${DIM}','${STAGE}','x', 1) r`)).msg).toMatch(/permission denied/);
    expect(await counts(p)).toEqual({ entries: 0, reservations: 0 });
    expect((await asService(c, `select t3a_cr26_request_entry('${p}','${DIM}','${STAGE}','', 1) r`)).r).toEqual({ outcome: "not_eligible", message: "We cannot start a session for you right now." });
  });
  it("records are append-only", async () => {
    const p = await person(); await request(p);
    await expect(c.query(`update t3a_source_reservation set source_version_id = source_version_id`)).rejects.toThrow(/append/i);
    await expect(c.query(`delete from t3a_entry_request`)).rejects.toThrow(/append/i);
  });
});
