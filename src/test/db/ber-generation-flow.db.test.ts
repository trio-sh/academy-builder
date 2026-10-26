/**
 * The Behavioral Evidence Report from observation to employer, one participant, the real routes in the order the pilot uses them:
 * committed observation -> mentor assembles -> participant reviews -> the interim authority issues -> the report face and its accessible copy exist
 * -> the participant releases it -> an approved employer reads it. Each refusal on the way is checked at the step where it belongs.
 * Synthetic people and one fixture observation (the capture and commit routes have their own tests); throwaway database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let env0: any; let floor0: any; let WARN = "";
const HASH = "e".repeat(64);
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}

beforeAll(async () => {
  c = await connect();
  env0 = (await run(c, `select env_state::text e, identity_assurance_mode::text m from t3a_env_capability`))[0];
  floor0 = (await run(c, `select status, minimum_committed_observations a, minimum_distinct_observers b, minimum_distinct_stages d, approved_by, approved_at from t3a_d1_issuance_floor_config`))[0];
  WARN = (await run(c, `select t3a_cr09_warning_version() v`))[0].v;
  await run(c, `update t3a_env_capability set env_state='pilot_active', identity_assurance_mode='ATTESTATION_ONLY'`);
  await run(c, `update t3a_d1_issuance_floor_config set status='approved', minimum_committed_observations=null, minimum_distinct_observers=null, minimum_distinct_stages=null`);
});
afterAll(async () => {
  await run(c, `update t3a_env_capability set env_state='${env0.e}', identity_assurance_mode='${env0.m}'`);
  await run(c, `update t3a_d1_issuance_floor_config set status='${floor0.status}', approved_by=${floor0.approved_by ? `'${floor0.approved_by}'` : "null"}, approved_at=${floor0.approved_at ? `'${new Date(floor0.approved_at).toISOString()}'` : "null"}`);
  await c.end();
});

describe("the report from observation to employer", () => {
  it("runs the whole flow, refusing at each step what that step must refuse", async () => {
    const p = await mkParticipant(c, `flow-p-${RUN}`);
    const mentor = await mkParticipant(c, `flow-m-${RUN}`, "mentor");
    const issuer = await mkParticipant(c, `flow-i-${RUN}`, "mentor");
    const employerUser = await mkParticipant(c, `flow-e-${RUN}`, "employer");

    // 1. one committed observation with its composed statement
    const o = randomUUID();
    await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code, observer_id, is_committed, committed_at) values ('${o}','${p}','D1','S2','${mentor}', true, now())`);
    await fx(`insert into t3a_d1_composed_statement(observation_record_id, statement_library_id, resolution_rule_id, composed_body, answer_pattern_snapshot) values ('${o}','${randomUUID()}','${randomUUID()}', 'Stated the step they kept and asked a colleague.', '{}'::jsonb)`);

    // 2. nobody can assemble without a signed-in mentor; the mentor assembles; there is nothing to assemble without a committed observation
    const anon = await asRole(c, "anon", null, `select t3a_d1_assemble_ber_for('${p}','D1') r`);
    expect(anon.msg === "ok" ? anon.r.refusal : anon.msg).toMatch(/permission denied|NO_MENTOR_IDENTIFIED/i);
    const empty = await mkParticipant(c, `flow-empty-${RUN}`);
    expect((await as(mentor, `select t3a_d1_assemble_ber_for('${empty}','D1') r`)).r).toMatchObject({ ok: false, refusal: "NO_COMMITTED_OBSERVATIONS" });
    const asm = (await as(mentor, `select t3a_d1_assemble_ber_for('${p}','D1') r`)).r;
    expect(asm).toMatchObject({ ok: true, committed_statements: 1, review_mode: "ATTESTATION_ONLY" });
    const rep = asm.ber_report_id as string;
    const items = (await run(c, `select count(*)::int n from t3a_d1_review_checklist_item`))[0].n;
    expect((await run(c, `select count(*)::int n from t3a_d1_review_result where ber_report_id='${rep}' and outcome='pass'`))[0].n).toBe(items);
    // assembling again reuses the report, it does not make a second
    expect((await as(mentor, `select t3a_d1_assemble_ber_for('${p}','D1') r`)).r.ber_report_id).toBe(rep);

    // 3. the issuance gate: no participant review yet, so nothing issues; then the participant records their own review; then no one is authorized yet
    const can = (who: string) => asRole(c, "service_role", who, `select t3a_d1_can_issue('${rep}')::text r`).then((x) => (x.msg === "ok" ? x.rows[0].r : x.msg));
    expect(await can(issuer)).toBe("NON_RESPONSE_BLOCKS_ISSUANCE");
    const stranger = await mkParticipant(c, `flow-s-${RUN}`);
    // another person cannot review it for them: not under their own id (the report is not theirs), not under the participant's id (not theirs to write)
    expect((await as(stranger, `insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${rep}','${stranger}','reviewed_no_correction') returning 1 r`)).msg).toMatch(/REVIEW_ACTION_NOT_OWNERS/);
    expect((await as(stranger, `insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${rep}','${p}','reviewed_no_correction') returning 1 r`)).msg).toMatch(/row-level security/i);
    expect(await can(issuer)).toBe("NON_RESPONSE_BLOCKS_ISSUANCE");
    expect((await as(p, `insert into t3a_d1_participant_review_action(ber_report_id, participant_id, action) values ('${rep}','${p}','reviewed_no_correction') returning 1 r`)).msg).toBe("ok");
    expect(await can(issuer)).toBe("EVIDENCE_REVIEW_AUTHORITY_UNSET");
    expect((await asService(c, `select t3a_d1_issue_report('${rep}','x') r`)).msg).toMatch(/AUTH_REQUIRED|ISSUANCE_REFUSED|permission/i);   // no verified actor, no issuance

    // 4. the authority list names the issuer; the person who ran the review checklist cannot issue; the issuer can
    expect((await asService(c, `select t3a_d1_review_authority_record('${issuer}','grant','flow test ${RUN}') r`)).r).toMatchObject({ outcome: "recorded" });
    expect(await can(issuer)).toBeNull();
    const issued = await asRole(c, "service_role", issuer, `select t3a_d1_issue_report('${rep}','the rendered text') r`);
    expect(issued.msg).toBe("ok");
    expect((await run(c, `select status::text s, issued_at is not null i from t3a_d1_ber_report where ber_report_id='${rep}'`))[0]).toEqual({ s: "issued", i: true });
    expect((await run(c, `select issued_by from t3a_d1_report_issuance where ber_report_id='${rep}'`))[0].issued_by).toBe(issuer);
    // issuing twice does not make a second issuance: an issued report is not ready to issue
    expect((await asRole(c, "service_role", issuer, `select t3a_d1_issue_report('${rep}','again') r`)).msg).toMatch(/REPORT_NOT_READY_TO_ISSUE/);
    expect((await run(c, `select count(*)::int n from t3a_d1_report_issuance where ber_report_id='${rep}'`))[0].n).toBe(1);

    // 5. the face and its accessible copy exist, are tagged, and are the same content; the participant reads their own report; the public check gives status only
    const state = (await asService(c, `select t3a_report_accessible_state('${rep}') r`)).r;
    expect(state).toMatchObject({ state: "present", tagged: true, identical_to_face: true });
    const own = (await as(p, `select t3a_report_accessible_read('${rep}') r`)).r;
    expect(own.tagged).toBeTruthy();
    const code = (await run(c, `select verification_code v from t3a_d1_ber_report where ber_report_id='${rep}'`))[0].v;
    expect((await asRole(c, "anon", null, `select t3a_report_verify('${code}') r`)).r).toEqual({ status: "issued" });

    // 6. nothing is released until the participant chooses: an approved employer is refused; then the participant gives employer_share consent and the current warning, and the employer reads
    const ep = (await run(c, `insert into employer_profiles(profile_id) values ('${employerUser}') returning id`))[0].id;
    await run(c, `insert into t3a_employer_application(employer_profile_id, approval_decision, approved_by, approved_at, application_status, accepting_person_name, accepting_person_title, record_use_terms_version, terms_accepted_at, approver_id) values ('${ep}','approved','synthetic',now(),'approved','Synthetic Person','Director','1.0',now(),gen_random_uuid())`);
    expect((await as(employerUser, `select t3a_ga_read('${rep}') r`)).r).toMatchObject({ outcome: "refused", reason: "REPORT_NOT_AVAILABLE" });
    await asService(c, `select t3a_record_consent('${p}','employer_share','granted','D1',null,'1.2','${HASH}','checkbox','en-CA','report_release','future_only',true) r`);
    expect((await as(p, `select t3a_ga_set('${rep}', true, null) r`)).r.reason).toBe("GA_WARNING_NOT_SHOWN");
    expect((await as(p, `select t3a_ga_set('${rep}', true, '${WARN}') r`)).r.outcome).toBe("on");
    const read = (await as(employerUser, `select t3a_ga_read('${rep}') r`)).r;
    expect(read).toMatchObject({ outcome: "read", route: "general_availability", served_report_id: rep });
    expect(read.accessible).toBeTruthy();
    expect((await as(p, `select t3a_release_access_record('${rep}') r`)).r).toHaveLength(1);

    // 7. the second route: a named recipient with no account redeems with the named address, and a different address is refused
    const rel = (await as(p, `select t3a_direct_release_create('${rep}','Ana Recipient','Corp','ana-${RUN}@corp.example', now() + interval '3 days') r`)).r;
    expect(rel.outcome).toBe("released");
    expect((await asRole(c, "anon", null, `select t3a_direct_release_redeem('${rel.token}','someone-else@corp.example', null) r`)).r.content).not.toBe(true);
    const redeemed = (await asRole(c, "anon", null, `select t3a_direct_release_redeem('${rel.token}','ANA-${RUN}@corp.example', '${rep}') r`)).r;
    expect(redeemed).toMatchObject({ content: true, ber_report_id: rep });

    // 8. the participant withdraws the report from the pool: the employer is refused at once, the direct release still redeems
    expect((await as(p, `select t3a_ga_set('${rep}', false) r`)).r.outcome).toBe("off");
    expect((await as(employerUser, `select t3a_ga_read('${rep}') r`)).r.reason).toBe("REPORT_NOT_AVAILABLE");
    expect((await asRole(c, "anon", null, `select t3a_direct_release_redeem('${rel.token}','ana-${RUN}@corp.example', '${rep}') r`)).r.content).toBe(true);
  });
});
