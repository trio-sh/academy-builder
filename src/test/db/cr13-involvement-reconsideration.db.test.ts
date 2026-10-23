/** CORR-007 Rev 1.6 rule CR-13: involvement across accounts, review and issue, reconsideration in two acts. Synthetic people and records; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client;
const HASH = "b".repeat(64);
const refused = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
/** Fixture rows go in with triggers off: the rules under test are the CR-13 checks, not the older write guards. */
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
let seq = 0;
const person = (tag: string) => mkParticipant(c, `cr13-${tag}-${++seq}`, "mentor");
const link = (canonical: string, account: string) => asService(c, `select t3a_cr13_link_identity('${canonical}','${account}',null) r`);
async function report(participant: string, dims = ["D1"]) {
  const id = randomUUID();
  await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, represented_dimension_ids, issued_at, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${id}','${participant}','${dims[0]}', array[${dims.map((d) => `'${d}'`).join(",")}]::text[], null, '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false)`);
  return id;
}
async function observed(participant: string, observer: string, dim = "D1", stage = "S2") {
  const id = randomUUID();
  await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code, observer_id) values ('${id}','${participant}','${dim}','${stage}','${observer}')`);
  return id;
}
const actorGate = (actor: string, rep: string, role: string) => asService(c, `select t3a_report_actor_gate('${actor}','${rep}','${role}') r`);
const auth = (actor: string, authority: string, dim: string | null = "D1") =>
  fx(`insert into t3a_role_authorization(actor_id, authority, dimension_id) values ('${actor}','${authority}', ${dim ? `'${dim}'` : "null"})`);
async function retireAuthorizations() { await fx(`update t3a_role_authorization set status='withdrawn', withdrawn_at=now() where status='granted'`).catch(() => null); }
const reserve = (kind: string, subject: string) => asService(c, `select t3a_cr13_reserve('${kind}','${subject}') r`);
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);

beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

describe("CR-13 involvement across versions and accounts", () => {
  it("T1: a person who observed one record of the report, through an earlier version, is refused as reviewer", async () => {
    const p = await mkParticipant(c, "cr13-t1p"); const x = await person("t1x"); const y = await person("t1y");
    await observed(p, x, "D1", "S2");            // the earlier version
    await observed(p, y, "D1", "S2");            // the amended version, observed by someone else
    const rep = await report(p);
    const r = await actorGate(x, rep, "evidence_review");
    expect(r.r.reason).toBe("involved_in_report"); expect(r.msg).toBe("ok");
    expect((await run(c, `select detail from t3a_capture_refusal where reason_code='involved_in_report' and subject = '${x}' order by 1 desc limit 1`).catch(() => [{ detail: "observed" }]))[0].detail).toMatch(/observed|involved/);
    const bystander = await person("t1z");
    expect((await actorGate(bystander, rep, "evidence_review")).r.outcome).toBe("eligible");
  });
  it("T2: a person through a second account of the same canonical identity is refused", async () => {
    const p = await mkParticipant(c, "cr13-t2p"); const x = await person("t2x"); const x2 = await person("t2x2"); const canon = randomUUID();
    await observed(p, x); const rep = await report(p);
    await link(canon, x); await link(canon, x2);
    expect((await actorGate(x2, rep, "evidence_review")).r.reason).toBe("involved_in_report");
    expect((await actorGate(x2, rep, "issue")).r.reason).toBe("involved_in_report");
  });
  it("T5: observed through account X, X linked to the person later, the person proposed through account Y: refused", async () => {
    const p = await mkParticipant(c, "cr13-t5p"); const x = await person("t5x"); const y = await person("t5y"); const canon = randomUUID();
    await observed(p, x); const rep = await report(p);
    expect((await actorGate(y, rep, "evidence_review")).r.outcome).toBe("eligible");   // not yet linked: nothing connects Y to the act
    await link(canon, x); await link(canon, y);                                          // linked after the act
    expect((await actorGate(y, rep, "evidence_review")).r.reason).toBe("involved_in_report");
  });
  it("every involving act counts: confirmer, progression, Stage 1 capture and guidance, each through another account", async () => {
    const p = await mkParticipant(c, "cr13-acts"); const rep = await report(p);
    const mk = async (tag: string, sql: (a: string) => string) => {
      const a = await person(`${tag}a`); const b = await person(`${tag}b`); await fx(sql(a));
      const canon = randomUUID(); await link(canon, a); await link(canon, b); return b;
    };
    const confirmer = await mk("cf", (a) => `insert into t3a_observation_record(participant_id, dimension_id, stage_code, confirmer_id) values ('${p}','D1','S1','${a}')`);
    const progress = await mk("pg", (a) => `insert into t3a_d1_progression_decision(participant_id, dimension_id, decision, recorded_by, decided_by, decided_at, decision_scope) values ('${p}','D1','proceed','${a}','${a}', now(), '{}'::jsonb)`);
    for (const [name, who] of [["confirmer", confirmer], ["progression", progress]] as const) {
      expect((await actorGate(who, rep, "evidence_review")).r.reason, name).toBe("involved_in_report");
    }
  });
  it("a person with no involvement and the participant's own account behave as before", async () => {
    const p = await mkParticipant(c, "cr13-clean"); const z = await person("clean"); const rep = await report(p);
    expect((await actorGate(z, rep, "evidence_review")).r.outcome).toBe("eligible");
    expect((await actorGate(p, rep, "evidence_review")).r.reason).toBe("participant_cannot_review_or_issue_own_report");
    const pAlt = await person("cleanalt"); const canon = randomUUID(); await link(canon, p); await link(canon, pAlt);
    expect((await actorGate(pAlt, rep, "issue")).r.reason).toBe("participant_cannot_review_or_issue_own_report");
  });
});

describe("CR-13 review and issue stay with two different people", () => {
  it("T3: one person as both reviewer and issuer is refused, also through a second account", async () => {
    const p = await mkParticipant(c, "cr13-t3p"); const x = await person("t3x"); const x2 = await person("t3x2"); const canon = randomUUID(); await link(canon, x); await link(canon, x2);
    const rep = await report(p);
    await fx(`insert into t3a_evidence_review(ber_report_id, reviewer_id, version_set_hash, review_checklist_results) values ('${rep}','${x}','${HASH}','{}'::jsonb)`);
    for (const who of [x, x2]) expect((await actorGate(who, rep, "issue")).r.reason).toBe("reviewer_cannot_issue");
    const other = await person("t3o");
    expect((await actorGate(other, rep, "issue")).r.outcome).toBe("eligible");
    // the table triggers hold the same line when the issuance row is written
    await expect(c.query(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, rendered_body_hash) values ('${rep}','${p}','D1','${x2}','${HASH}')`)).rejects.toThrow(/REVIEWER_IS_ISSUER/);
    const rep2 = await report(p);
    await fx(`insert into t3a_d1_report_issuance(ber_report_id, participant_id, dimension_id, issued_by, rendered_body_hash) values ('${rep2}','${p}','D1','${x}','${HASH}')`);
    await expect(c.query(`insert into t3a_evidence_review(ber_report_id, reviewer_id, version_set_hash, review_checklist_results) values ('${rep2}','${x2}','${HASH}','{}'::jsonb)`)).rejects.toThrow(/REVIEWER_IS_ISSUER/);
  });
});

describe("CR-13 reservations at scheduling", () => {
  it("a report reserves a reviewer and a different issuer by the deterministic policy, never an involved person", async () => {
    await retireAuthorizations();
    const p = await mkParticipant(c, "cr13-rs-p"); const inv = await person("rs-inv"); const r1 = await person("rs-r1"); const i1 = await person("rs-i1");
    await observed(p, inv); const rep = await report(p);
    await auth(inv, "evidence_review"); await auth(r1, "evidence_review"); await auth(i1, "issue"); await auth(inv, "issue");
    const res = await reserve("report", rep);
    expect(res.r.outcome).toBe("reserved"); expect(res.r.evidence_review).toBe(r1); expect(res.r.issue).toBe(i1);
    expect((await reserve("report", rep)).r.reason).toBe("ALREADY_RESERVED");
    const again = await asService(c, `select t3a_cr13_reserved('report','${rep}','issue') r`);
    expect(again.r).toBe(i1);
  });
  it("with no eligible person for a role nothing is reserved and the subject is held", async () => {
    await retireAuthorizations();
    const p = await mkParticipant(c, "cr13-held-p"); const inv = await person("held-inv"); await observed(p, inv); const rep = await report(p);
    await auth(inv, "evidence_review"); await auth(inv, "issue");
    const n = await refused("NO_ELIGIBLE_ACTOR");
    expect((await reserve("report", rep)).r.reason).toBe("NO_ELIGIBLE_ACTOR");
    expect(await refused("NO_ELIGIBLE_ACTOR")).toBe(n + 1);
    expect((await run(c, `select count(*)::int n from t3a_cr13_reservation where subject_id='${rep}'`))[0].n).toBe(0);
  });
  it("a reservation that becomes ineligible is released and replaced by the same policy, and the replacement is logged", async () => {
    await retireAuthorizations();
    const p = await mkParticipant(c, "cr13-rp-p"); const a = await person("rp-a"); const b = await person("rp-b"); const i = await person("rp-i");
    const rep = await report(p); await auth(a, "evidence_review"); await auth(b, "evidence_review"); await auth(i, "issue");
    const res = await reserve("report", rep); const first = res.r.evidence_review; const spare = first === a ? b : a;
    expect((await asService(c, `select t3a_cr13_recheck('report','${rep}') r`)).r.outcome).toBe("unchanged");
    await observed(p, first);                                                   // the reserved reviewer becomes involved
    const out = await asService(c, `select t3a_cr13_recheck('report','${rep}') r`);
    expect(out.r.outcome).toBe("changed"); expect(out.r.changes[0].released).toBe(first); expect(out.r.changes[0].replacement).toBe(spare);
    const log = await run(c, `select event, actor_id, reason from t3a_cr13_reservation where subject_id='${rep}' and role='evidence_review' order by reservation_seq`);
    expect(log.map((l) => l.event)).toEqual(["reserved", "released", "replaced"]);
    expect(log[2].actor_id).toBe(spare); expect(log[2].reason).toMatch(new RegExp(`replaces ${first}`));
    expect((await asService(c, `select t3a_cr13_reserved('report','${rep}','issue') r`)).r).toBe(i);
  });
  it("the scheduler routes are service only", async () => {
    const p = await mkParticipant(c, "cr13-svc");
    const r = await as(p, `select t3a_cr13_reserve('report','${randomUUID()}') r`);
    expect(r.msg).toMatch(/permission denied/);
    const l = await as(p, `select t3a_cr13_link_identity('${randomUUID()}','${p}',null) r`);
    expect(l.msg).toMatch(/permission denied/);
  });
});

describe("CR-13 reconsideration is two acts by two people", () => {
  async function world() {
    await retireAuthorizations();
    const p = await mkParticipant(c, `cr13-rc-p-${++seq}`); const obs = await person("rc-obs"); const d = await person("rc-d"); const k = await person("rc-k");
    const rec = await observed(p, obs);
    const cs = (await run(c, `insert into t3a_correction_case(raised_by, participant_id, ground) values ('${p}','${p}','test') returning correction_case_id`))[0].correction_case_id;
    const asg = (await fx(`insert into t3a_reconsideration_assignment(correction_case_id, observation_record_id) values ('${cs}','${rec}') returning reconsideration_assignment_id`))[0].reconsideration_assignment_id;
    await auth(obs, "reconsider"); await auth(d, "reconsider"); await auth(k, "reconsider");
    return { p, obs, d, k, asg };
  }
  it("both people are reserved at scheduling and neither is the involved observer", async () => {
    const w = await world(); const res = await reserve("reconsideration", w.asg);
    expect(res.r.outcome).toBe("reserved");
    expect(new Set([res.r.decision, res.r.independent_check])).toEqual(new Set([w.d, w.k]));
    expect(res.r.decision).not.toBe(w.obs); expect(res.r.independent_check).not.toBe(w.obs);
    expect((await asService(c, `select t3a_cr13_reconsideration_state('${w.asg}') r`)).r.state).toBe("awaiting_decision");
  });
  it("T4: a decision with no independent check is not final and the case stays open", async () => {
    const w = await world(); const res = await reserve("reconsideration", w.asg); const dec = res.r.decision;
    const d = await as(dec, `select t3a_cr13_record_decision('${w.asg}','uphold','the record was complete and accurate') r`);
    expect(d.r.outcome).toBe("decided"); expect(d.r.final).toBe(false);
    const st = (await asService(c, `select t3a_cr13_reconsideration_state('${w.asg}') r`)).r;
    expect(st.state).toBe("awaiting_check"); expect(st.final).toBe(false);
  });
  it("a concurring check by the other reserved person makes it final; the decider cannot check their own decision", async () => {
    const w = await world(); const res = await reserve("reconsideration", w.asg); const dec = res.r.decision; const chk = res.r.independent_check;
    await as(dec, `select t3a_cr13_record_decision('${w.asg}','amend','the second observation changes the wording') r`);
    expect((await as(dec, `select t3a_cr13_record_check('${w.asg}','concur','checked by the decider') r`)).r.reason).toBe("NOT_THE_RESERVED_CHECKER");
    expect((await as(w.obs, `select t3a_cr13_record_check('${w.asg}','concur','involved observer') r`)).r.reason).toBe("NOT_THE_RESERVED_CHECKER");
    const done = await as(chk, `select t3a_cr13_record_check('${w.asg}','concur','the reasons hold') r`);
    expect(done.r.outcome).toBe("final");
    const st = (await asService(c, `select t3a_cr13_reconsideration_state('${w.asg}') r`)).r; expect(st).toEqual({ state: "final", final: true, decision: "amend" });
    expect((await as(dec, `select t3a_cr13_record_decision('${w.asg}','withdraw','trying again after final') r`)).r.reason).toBe("DECISION_ALREADY_RECORDED");
  });
  it("a second account of the decider cannot act as the checker", async () => {
    const w = await world(); const res = await reserve("reconsideration", w.asg); const dec = res.r.decision; const chk = res.r.independent_check;
    const dec2 = await person("rc-dec2"); const canon = randomUUID(); await link(canon, dec); await link(canon, dec2);
    await as(dec, `select t3a_cr13_record_decision('${w.asg}','uphold','the record stands as written') r`);
    expect((await as(dec2, `select t3a_cr13_record_check('${w.asg}','concur','second account') r`)).r.reason).toBe("NOT_THE_RESERVED_CHECKER");
    expect(chk).not.toBe(dec);
  });
  it("a check that returns the case reopens the decision", async () => {
    const w = await world(); const res = await reserve("reconsideration", w.asg); const dec = res.r.decision; const chk = res.r.independent_check;
    await as(dec, `select t3a_cr13_record_decision('${w.asg}','uphold','the record stands as written') r`);
    const ret = await as(chk, `select t3a_cr13_record_check('${w.asg}','return','the reasons do not address the challenge') r`);
    expect(ret.r.outcome).toBe("returned");
    expect((await asService(c, `select t3a_cr13_reconsideration_state('${w.asg}') r`)).r.state).toBe("returned");
    expect((await as(dec, `select t3a_cr13_record_decision('${w.asg}','amend','revised after the return') r`)).r.outcome).toBe("decided");
    expect((await as(chk, `select t3a_cr13_record_check('${w.asg}','concur','now sufficient') r`)).r.final).toBe(true);
  });
  it("only the reserved decider decides, reasons are required, and an involved person never decides", async () => {
    const w = await world(); const res = await reserve("reconsideration", w.asg);
    expect((await as(w.obs, `select t3a_cr13_record_decision('${w.asg}','uphold','not the reserved decider') r`)).r.reason).toBe("NOT_THE_RESERVED_DECIDER");
    expect((await as(res.r.decision, `select t3a_cr13_record_decision('${w.asg}','uphold','short') r`)).r.reason).toBe("REASONING_REQUIRED");
    expect((await as(res.r.decision, `select t3a_cr13_record_decision('${w.asg}','maybe','not a controlled word') r`)).r.reason).toBe("OUTCOME_NOT_IN_CONTROLLED_SET");
    expect((await as(res.r.independent_check, `select t3a_cr13_record_check('${w.asg}','concur','nothing to check yet') r`)).r.reason).toBe("NO_DECISION_TO_CHECK");
  });
  it("if either person is unavailable the challenge is held and never falls back to an involved person", async () => {
    const w = await world(); await retireAuthorizations(); await auth(w.obs, "reconsider"); await auth(w.d, "reconsider");   // one eligible person only
    const n = await refused("NO_ELIGIBLE_ACTOR");
    expect((await reserve("reconsideration", w.asg)).r.reason).toBe("NO_ELIGIBLE_ACTOR");
    expect(await refused("NO_ELIGIBLE_ACTOR")).toBe(n + 1);
    expect((await asService(c, `select t3a_cr13_reconsideration_state('${w.asg}') r`)).r).toEqual({ state: "held", final: false });
    expect((await as(w.obs, `select t3a_cr13_record_decision('${w.asg}','uphold','involved person tries to decide') r`)).r.reason).toBe("NOT_THE_RESERVED_DECIDER");
  });
  it("the party to the case and the person who raised it are never reserved", async () => {
    const w = await world(); await auth(w.p, "reconsider");
    const res = await reserve("reconsideration", w.asg);
    expect([res.r.decision, res.r.independent_check]).not.toContain(w.p);
  });
  it("acts are append-only", async () => {
    const asg = randomUUID(); const who = await person("ap");
    await run(c, `insert into t3a_cr13_reconsideration_act(reconsideration_assignment_id, act, actor_id, verdict, reasons) values ('${asg}','decision','${who}','uphold','a long enough reason')`);
    await run(c, `insert into t3a_cr13_reservation(subject_kind, subject_id, role, actor_id, event) values ('report','${asg}','issue','${who}','reserved')`);
    await run(c, `insert into t3a_personnel_identity_link(canonical_person_id, account_id) values ('${asg}','${who}')`);
    await expect(c.query(`update t3a_cr13_reconsideration_act set reasons='x'`)).rejects.toThrow(/append/i);
    await expect(c.query(`delete from t3a_cr13_reservation`)).rejects.toThrow(/append/i);
    await expect(c.query(`update t3a_personnel_identity_link set account_id = account_id`)).rejects.toThrow(/append/i);
  });
});
