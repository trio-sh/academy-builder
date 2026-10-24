/**
 * CORR-007 CR-32 / FD-D1-04 interim (decision CR-220): the issue route refused every call by design. A named list now decides who passes the authority check, in the
 * pilot or synthetic environment only; every other gate stands. Throwaway database only; the environment and floor are put back after each test file.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { asRole, asService, connect, mkParticipant, RUN, run } from "./helpers";

let c: pg.Client; let env0 = ""; let floor0: any;
beforeAll(async () => {
  c = await connect();
  env0 = (await run(c, `select env_state::text e from t3a_env_capability`))[0].e;
  floor0 = (await run(c, `select status, minimum_committed_observations a, minimum_distinct_observers b, minimum_distinct_stages d, approved_by, approved_at from t3a_d1_issuance_floor_config`))[0];
});
afterAll(async () => {
  await run(c, `update t3a_env_capability set env_state='${env0}'`);
  await run(c, `update t3a_d1_issuance_floor_config set status='${floor0.status}', approved_by=${floor0.approved_by ? `'${floor0.approved_by}'` : "null"}, approved_at=${floor0.approved_at ? `'${new Date(floor0.approved_at).toISOString()}'` : "null"}`);
  await c.end();
});
const setEnv = (e: string) => run(c, `update t3a_env_capability set env_state='${e}'`);
const approveFloor = () => run(c, `update t3a_d1_issuance_floor_config set status='approved', minimum_committed_observations=null, minimum_distinct_observers=null, minimum_distinct_stages=null`);

/** a report ready to issue, whose participant has completed their own review */
async function readyReport() {
  const p = await mkParticipant(c, `c32-p-${randomUUID().slice(0, 6)}`);
  const id = (await run(c, `insert into t3a_d1_ber_report(participant_id, dimension_id, status, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, represented_dimension_ids, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag)
    values ('${p}','D1','ready_to_issue','1.0','1.0','1.0','M5',array['D1']::text[],'{}'::jsonb,'assembling','ber','current',repeat('a',64),repeat('b',64),'V-' || gen_random_uuid()::text,false) returning ber_report_id i`))[0].i as string;
  await run(c, `insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${id}','${p}',(enum_range(null::t3a_d1_review_action))[1])`);
  return { p, id };
}
const grant = (person: string, action = "grant") => asService(c, `select t3a_d1_review_authority_record('${person}','${action}','CR-220 test ${RUN}') r`);
const canIssue = (who: string, id: string) => asRole(c, "service_role", who, `select t3a_d1_can_issue('${id}')::text r`).then((x) => (x.msg === "ok" ? x.rows[0].r : x.msg));
// the issue route is the service's (the person is the verified actor of the call), as the other service routes are
const issue = (who: string, id: string) => asRole(c, "service_role", who, `select t3a_d1_issue_report('${id}','the rendered text') r`);

describe("CR-32 the interim evidence review authority", () => {
  it("T1: nobody is on the list to begin with, so every gate before the authority check passes and the authority check refuses", async () => {
    await setEnv("pilot_active"); await approveFloor();
    const { id } = await readyReport(); const person = await mkParticipant(c, `c32-i-${RUN}-1`);
    expect(await canIssue(person, id)).toBe("EVIDENCE_REVIEW_AUTHORITY_UNSET");
    const r = await issue(person, id);
    expect(r.msg).toMatch(/ISSUANCE_REFUSED: EVIDENCE_REVIEW_AUTHORITY_UNSET/);
    expect((await run(c, `select status::text s from t3a_d1_ber_report where ber_report_id='${id}'`))[0].s).toBe("ready_to_issue");
  });

  it("T2: a person on the list issues in the pilot environment; the report becomes issued and the issuance names them", async () => {
    await setEnv("pilot_active"); await approveFloor();
    const { id } = await readyReport(); const person = await mkParticipant(c, `c32-i-${RUN}-2`);
    expect((await grant(person)).r).toMatchObject({ outcome: "recorded" });
    expect(await canIssue(person, id)).toBeNull();
    const r = await issue(person, id); expect(r.msg).toBe("ok");
    expect((await run(c, `select status::text s, issued_at is not null i from t3a_d1_ber_report where ber_report_id='${id}'`))[0]).toEqual({ s: "issued", i: true });
    expect((await run(c, `select issued_by from t3a_d1_report_issuance where ber_report_id='${id}'`))[0].issued_by).toBe(person);
  });

  it("T3: the list is for the person only: someone else still refuses, and a revoked person refuses again", async () => {
    await setEnv("pilot_active"); await approveFloor();
    const { id } = await readyReport(); const a = await mkParticipant(c, `c32-i-${RUN}-3a`); const b = await mkParticipant(c, `c32-i-${RUN}-3b`);
    await grant(a);
    expect(await canIssue(b, id)).toBe("EVIDENCE_REVIEW_AUTHORITY_UNSET");
    expect(await canIssue(a, id)).toBeNull();
    await grant(a, "revoke");
    expect(await canIssue(a, id)).toBe("EVIDENCE_REVIEW_AUTHORITY_UNSET");
  });

  it("T4: production stays refused for a person on the list, and the report stays unissued", async () => {
    await setEnv("production_active"); await approveFloor();
    const { id } = await readyReport(); const person = await mkParticipant(c, `c32-i-${RUN}-4`); await grant(person);
    expect((await issue(person, id)).msg).toMatch(/production is refused/);
    expect((await run(c, `select status::text s from t3a_d1_ber_report where ber_report_id='${id}'`))[0].s).toBe("ready_to_issue");
  });

  it("T5: every other gate still stands for a person on the list: floor not approved, and the participant's own review missing", async () => {
    await setEnv("pilot_active");
    const person = await mkParticipant(c, `c32-i-${RUN}-5`); await grant(person);
    await run(c, `update t3a_d1_issuance_floor_config set status='not_approved'`);
    const r1 = await readyReport(); expect(await canIssue(person, r1.id)).toBe("ISSUANCE_FLOOR_NOT_APPROVED");
    await approveFloor();
    const p2 = await mkParticipant(c, `c32-p5-${RUN}`);
    const noReview = (await run(c, `insert into t3a_d1_ber_report(participant_id, dimension_id, status, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, represented_dimension_ids, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag)
      values ('${p2}','D1','ready_to_issue','1.0','1.0','1.0','M5',array['D1']::text[],'{}'::jsonb,'assembling','ber','current',repeat('a',64),repeat('b',64),'V-' || gen_random_uuid()::text,false) returning ber_report_id i`))[0].i;
    expect(await canIssue(person, noReview)).toBe("NON_RESPONSE_BLOCKS_ISSUANCE");
  });

  it("T6: the list is the service's: a participant cannot add themselves, and the record cannot be changed or deleted", async () => {
    const person = await mkParticipant(c, `c32-i-${RUN}-6`);
    const self = await asRole(c, "authenticated", person, `select t3a_d1_review_authority_record('${person}','grant','self') r`);
    expect(self.msg).toMatch(/permission denied/);
    expect((await asRole(c, "authenticated", person, `insert into t3a_d1_evidence_review_authority_event(person_id, action, decision_ref) values ('${person}','grant','x')`)).msg).toMatch(/permission denied/);
    await grant(person);
    await expect(c.query(`update t3a_d1_evidence_review_authority_event set action='revoke' where person_id='${person}'`)).rejects.toThrow();
    await expect(c.query(`delete from t3a_d1_evidence_review_authority_event where person_id='${person}'`)).rejects.toThrow();
  });

  it("T7: a grant needs a person who exists, a known action and the decision it rests on", async () => {
    expect((await grant(randomUUID())).r).toMatchObject({ outcome: "refused" });
    const person = await mkParticipant(c, `c32-i-${RUN}-7`);
    expect((await asService(c, `select t3a_d1_review_authority_record('${person}','promote','x') r`)).r).toMatchObject({ outcome: "refused" });
    expect((await asService(c, `select t3a_d1_review_authority_record('${person}','grant','   ') r`)).r).toMatchObject({ outcome: "refused" });
  });
});
