/** CORR-007 Rev 1.6 rule CR-09: two release routes for the Behavioral Evidence Report. Synthetic participants, employers and reports; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let WARN: string;
const HASH = "a".repeat(64);

async function mkEmployer(tag: string, decision: "approved" | "withdrawn" | null = "approved"): Promise<string> {
  const u = await mkParticipant(c, tag, "employer");
  const ep = (await run(c, `insert into employer_profiles(profile_id) values ('${u}') returning id`))[0].id;
  await run(c, `insert into t3a_employer_application(employer_profile_id, approval_decision, approved_by, approved_at) values ('${ep}', ${decision ? `'${decision}'` : "null"}, 'synthetic approver', now())`);
  return u;
}
async function mkReport(participant: string, supersedes: string | null = null): Promise<string> {
  const id = randomUUID();
  await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, issued_at, ber_version, verification_code, supersedes) values ('${id}','${participant}','D1',now(),'1.0','V-${RUN}-${id.slice(0, 6)}', ${supersedes ? `'${supersedes}'` : "null"})`);
  return id;
}
const consent = (p: string) => asService(c, `select t3a_record_consent('${p}','employer_share','granted','D1',null,'1.2','${HASH}','checkbox','en-CA','report_release','future_only',true) r`);
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
const gaOn = (u: string, rep: string, v: string | null = WARN) => as(u, `select t3a_ga_set('${rep}', true, ${v ? `'${v}'` : "null"}) r`);
const gaOff = (u: string, rep: string) => as(u, `select t3a_ga_set('${rep}', false) r`);
const gaRead = (e: string, rep: string) => as(e, `select t3a_ga_read('${rep}') r`);
const release = (u: string, rep: string, addr = `Ana-${RUN}@Corp.example`, expires = "now() + interval '7 days'") =>
  as(u, `select t3a_direct_release_create('${rep}', 'Ana Recipient', 'Corp', '${addr}', ${expires}) r`);
const redeem = (tok: string, addr: string, rep: string | null = null) => asRole(c, "anon", null, `select t3a_direct_release_redeem('${tok}', '${addr}', ${rep ? `'${rep}'` : "null"}) r`);
const refused = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n;
const addr = `ana-${RUN}@corp.example`;

beforeAll(async () => { c = await connect(); WARN = (await run(c, `select t3a_cr09_warning_version() v`))[0].v; });
afterAll(async () => { await c.end(); });

describe("CR-09 route 1: general availability", () => {
  it("T1: issuing a report and touching neither control lets nobody read it", async () => {
    const p = await mkParticipant(c, "cr09-p1"); const e = await mkEmployer("cr09-e1"); const rep = await mkReport(p);
    const r = await gaRead(e, rep);
    expect(r.r.outcome).toBe("refused"); expect(r.r.reason).toBe("REPORT_NOT_AVAILABLE");
    expect((await redeem("nope", addr)).r.reason).toBe("RELEASE_TOKEN_UNKNOWN");
  });
  it("T2: with general availability on, an approved employer reads the full current report and the read is in the access record", async () => {
    const p = await mkParticipant(c, "cr09-p2"); const e = await mkEmployer("cr09-e2"); const rep = await mkReport(p);
    await consent(p);
    const on = await gaOn(p, rep); expect(on.r.outcome).toBe("on");
    const r = await gaRead(e, rep);
    expect(r.r.outcome).toBe("read"); expect(r.r.route).toBe("general_availability"); expect(r.r.served_report_id).toBe(rep);
    expect(r.r).toHaveProperty("face");
    const rec = (await as(p, `select t3a_release_access_record('${rep}') r`)).r;
    expect(rec).toHaveLength(1); expect(rec[0].route).toBe("general_availability"); expect(rec[0].report_version).toBe("1.0");
  });
  it("T3: an employer who is not approved, or whose approval is withdrawn, is refused", async () => {
    const p = await mkParticipant(c, "cr09-p3"); const rep = await mkReport(p); await consent(p); await gaOn(p, rep);
    for (const [tag, d] of [["cr09-pend", null], ["cr09-wd", "withdrawn"]] as const) {
      const e = await mkEmployer(tag, d);
      expect((await gaRead(e, rep)).r.reason).toBe("EMPLOYER_NOT_APPROVED");
    }
    const noProfile = await mkParticipant(c, "cr09-none", "employer");
    expect((await gaRead(noProfile, rep)).r.reason).toBe("EMPLOYER_NOT_APPROVED");
    expect((await as(p, `select t3a_release_access_record('${rep}') r`)).r).toHaveLength(0);
  });
  it("T4: turning it off ends employer access at once", async () => {
    const p = await mkParticipant(c, "cr09-p4"); const e = await mkEmployer("cr09-e4"); const rep = await mkReport(p); await consent(p); await gaOn(p, rep);
    expect((await gaRead(e, rep)).r.outcome).toBe("read");
    expect((await gaOff(p, rep)).r.outcome).toBe("off");
    expect((await gaRead(e, rep)).r.reason).toBe("REPORT_NOT_AVAILABLE");
  });
  it("T17: it will not turn on unless the current employer warning was shown, and the version is recorded", async () => {
    const p = await mkParticipant(c, "cr09-p17"); const rep = await mkReport(p); await consent(p);
    const n = await refused("GA_WARNING_NOT_SHOWN");
    expect((await gaOn(p, rep, null)).r.reason).toBe("GA_WARNING_NOT_SHOWN");
    expect((await gaOn(p, rep, "0.9")).r.reason).toBe("GA_WARNING_NOT_SHOWN");
    expect(await refused("GA_WARNING_NOT_SHOWN")).toBe(n + 2);
    expect((await as(p, `select t3a_release_state('${rep}') r`)).r.general_availability_on).toBe(false);
    expect((await gaOn(p, rep)).r.outcome).toBe("on");
    expect((await run(c, `select warning_version w from t3a_cr09_ga_event where ber_report_id='${rep}' and event='on'`))[0].w).toBe(WARN);
  });
  it("it needs the participant's own employer_share consent and is the participant's alone", async () => {
    const p = await mkParticipant(c, "cr09-pc"); const other = await mkParticipant(c, "cr09-po"); const rep = await mkReport(p);
    expect((await gaOn(p, rep)).r.reason).toBe("EMPLOYER_SHARE_CONSENT_REQUIRED");
    await consent(p);
    expect((await gaOn(other, rep)).r.reason).toBe("ONLY_THE_PARTICIPANT_RELEASES_THEIR_REPORT");
    const unissued = randomUUID();
    await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id) values ('${unissued}','${p}','D1')`);
    expect((await gaOn(p, unissued)).r.reason).toBe("REPORT_NOT_ISSUED");
    expect((await gaOn(p, rep)).r.outcome).toBe("on");
    expect((await gaOn(p, rep)).r.reason).toBe("GA_ALREADY_ON");
  });
  it("an employer cannot turn it on, and an anonymous caller reads nothing", async () => {
    const p = await mkParticipant(c, "cr09-pa"); const e = await mkEmployer("cr09-ea"); const rep = await mkReport(p); await consent(p);
    expect((await gaOn(e, rep)).r.reason).toBe("ONLY_THE_PARTICIPANT_RELEASES_THEIR_REPORT");
    await gaOn(p, rep);
    expect((await asRole(c, "anon", null, `select t3a_ga_read('${rep}') r`)).msg).toMatch(/permission denied/);
  });
});

describe("CR-09 route 2: direct release", () => {
  it("T5: a named recipient with no account redeems with the named address; the face renders at the released version; no account is created", async () => {
    const p = await mkParticipant(c, "cr09-d5"); const rep = await mkReport(p);
    const before = (await run(c, `select count(*)::int n from auth.users`))[0].n;
    const rel = await release(p, rep); expect(rel.r.outcome).toBe("released");
    const r = await redeem(rel.r.token, addr.toUpperCase(), rep);
    expect(r.r.content).toBe(true); expect(r.r.ber_report_id).toBe(rep); expect(r.r).toHaveProperty("face");
    expect((await run(c, `select count(*)::int n from auth.users`))[0].n).toBe(before);
    const rec = (await as(p, `select t3a_release_access_record('${rep}') r`)).r;
    expect(rec).toHaveLength(1); expect(rec[0].route).toBe("direct_release"); expect(rec[0].reader).toBe("Ana Recipient");
  });
  it("T6: a different address, or a second report, is refused", async () => {
    const p = await mkParticipant(c, "cr09-d6"); const rep = await mkReport(p); const rep2 = await mkReport(p);
    const rel = await release(p, rep);
    expect((await redeem(rel.r.token, "other@corp.example")).r.reason).toBe("RELEASE_ADDRESS_NOT_THE_NAMED_ADDRESS");
    expect((await redeem(rel.r.token, addr, rep2)).r.reason).toBe("RELEASE_TOKEN_NOT_FOR_THIS_REPORT");
    expect((await redeem(rel.r.token + "x", addr)).r.reason).toBe("RELEASE_TOKEN_UNKNOWN");
    expect((await as(p, `select t3a_release_access_record('${rep}') r`)).r).toHaveLength(0);
  });
  it("T7: after revocation the redemption returns the revoked state and no content", async () => {
    const p = await mkParticipant(c, "cr09-d7"); const rep = await mkReport(p); const rel = await release(p, rep);
    expect((await as(p, `select t3a_direct_release_revoke('${rel.r.direct_release_id}') r`)).r.outcome).toBe("revoked");
    const r = await redeem(rel.r.token, addr);
    expect(r.r).toEqual({ content: false, state: "revoked" });
    expect((await as(p, `select t3a_direct_release_revoke('${rel.r.direct_release_id}') r`)).r.reason).toBe("ALREADY_REVOKED");
  });
  it("T8: after expiry the redemption returns the expired state and no content", async () => {
    const p = await mkParticipant(c, "cr09-d8"); const rep = await mkReport(p); const rel = await release(p, rep);
    await run(c, `begin`); await run(c, `set local session_replication_role = replica`);
    await run(c, `delete from t3a_cr09_direct_release_event where false`);
    await run(c, `alter table t3a_cr09_direct_release disable trigger t3a_deny_mutation_trg`);
    await run(c, `update t3a_cr09_direct_release set expires_at = now() - interval '1 minute' where direct_release_id='${rel.r.direct_release_id}'`);
    await run(c, `alter table t3a_cr09_direct_release enable trigger t3a_deny_mutation_trg`); await run(c, `commit`);
    expect((await redeem(rel.r.token, addr)).r).toEqual({ content: false, state: "expired" });
  });
  it("a release must name a person, an address and a future expiry, and is the participant's alone", async () => {
    const p = await mkParticipant(c, "cr09-dv"); const o = await mkParticipant(c, "cr09-dvo"); const rep = await mkReport(p);
    expect((await as(p, `select t3a_direct_release_create('${rep}', '', null, 'a@b.example', now() + interval '1 day') r`)).r.reason).toBe("RECIPIENT_MUST_BE_NAMED_AND_ADDRESSED");
    expect((await as(p, `select t3a_direct_release_create('${rep}', 'N', null, 'no-at-sign', now() + interval '1 day') r`)).r.reason).toBe("RECIPIENT_MUST_BE_NAMED_AND_ADDRESSED");
    expect((await release(p, rep, "a@b.example", "now() - interval '1 day'")).r.reason).toBe("RELEASE_MUST_EXPIRE_IN_THE_FUTURE");
    expect((await release(o, rep)).r.reason).toBe("ONLY_THE_PARTICIPANT_RELEASES_THEIR_REPORT");
    const rel = await release(p, rep);
    expect((await as(o, `select t3a_direct_release_revoke('${rel.r.direct_release_id}') r`)).r.reason).toBe("ONLY_THE_PARTICIPANT_REVOKES_THEIR_RELEASE");
    expect((await run(c, `select count(*)::int n from t3a_cr09_direct_release where token_hash = '${rel.r.token}'`))[0].n).toBe(0);
  });
});

describe("CR-09 the routes are independent", () => {
  it("T10: turning general availability off while a direct release is active leaves the direct release redeemable", async () => {
    const p = await mkParticipant(c, "cr09-i10"); const rep = await mkReport(p); await consent(p); await gaOn(p, rep);
    const rel = await release(p, rep);
    const off = await gaOff(p, rep); expect(off.r.direct_releases_unaffected).toBe(true);
    expect((await redeem(rel.r.token, addr)).r.content).toBe(true);
  });
  it("T11: revoking a direct release while general availability is on leaves the pool read intact, and the interface states this before either control is used", async () => {
    const p = await mkParticipant(c, "cr09-i11"); const e = await mkEmployer("cr09-i11e"); const rep = await mkReport(p); await consent(p);
    const before = (await as(p, `select t3a_release_state('${rep}') r`)).r;
    expect(before.independence_statement).toMatch(/approved employers can still read your report after a direct release/);
    await gaOn(p, rep); const rel = await release(p, rep);
    const rv = await as(p, `select t3a_direct_release_revoke('${rel.r.direct_release_id}') r`);
    expect(rv.r.general_availability_on).toBe(true);
    expect((await gaRead(e, rep)).r.outcome).toBe("read");
    const st = (await as(p, `select t3a_release_state('${rep}') r`)).r;
    expect(st.general_availability_on).toBe(true); expect(st.direct_releases[0].revoked).toBe(true);
  });
});

describe("CR-09 amendment", () => {
  it("T9 + T16: an amended report shows the new version in the pool, notifies the participant, and returns the superseded state to a direct release", async () => {
    const p = await mkParticipant(c, "cr09-a9"); const e = await mkEmployer("cr09-a9e"); const rep = await mkReport(p); await consent(p); await gaOn(p, rep);
    const rel = await release(p, rep);
    const rep2 = await mkReport(p, rep);
    await run(c, `update t3a_d1_ber_report set amended_at = now() where ber_report_id='${rep}'`);
    const r = await gaRead(e, rep);
    expect(r.r.outcome).toBe("read"); expect(r.r.served_report_id).toBe(rep2); expect(r.r.superseded_version_requested).toBe(true);
    expect((await gaRead(e, rep2)).r.served_report_id).toBe(rep2);
    expect((await redeem(rel.r.token, addr)).r).toEqual({ content: false, state: "superseded" });
    const n = await run(c, `select count(*)::int n from notifications where user_id='${p}' and type='report_amended_general_availability'`);
    expect(n[0].n).toBe(1);
    const rel2 = await release(p, rep2);
    expect((await redeem(rel2.r.token, addr)).r.content).toBe(true);
  });
  it("an amendment with general availability off sends no notice and shows nothing", async () => {
    const p = await mkParticipant(c, "cr09-a0"); const e = await mkEmployer("cr09-a0e"); const rep = await mkReport(p);
    const rep2 = await mkReport(p, rep); await run(c, `update t3a_d1_ber_report set amended_at = now() where ber_report_id='${rep}'`);
    expect((await run(c, `select count(*)::int n from notifications where user_id='${p}'`))[0].n).toBe(0);
    expect((await gaRead(e, rep2)).r.reason).toBe("REPORT_NOT_AVAILABLE");
  });
  it("a participant who turned it off before the amendment stays off", async () => {
    const p = await mkParticipant(c, "cr09-a1"); const e = await mkEmployer("cr09-a1e"); const rep = await mkReport(p); await consent(p); await gaOn(p, rep); await gaOff(p, rep);
    const rep2 = await mkReport(p, rep);
    expect((await gaRead(e, rep2)).r.reason).toBe("REPORT_NOT_AVAILABLE");
    expect((await run(c, `select count(*)::int n from notifications where user_id='${p}'`))[0].n).toBe(0);
  });
});

describe("CR-09 what neither route gives", () => {
  it("T12: neither route renders a contact element or confers contact permission", async () => {
    const p = await mkParticipant(c, "cr09-c12"); const e = await mkEmployer("cr09-c12e"); const rep = await mkReport(p); await consent(p); await gaOn(p, rep);
    const rel = await release(p, rep);
    for (const out of [(await gaRead(e, rep)).r, (await redeem(rel.r.token, addr)).r]) {
      expect(JSON.stringify(out).toLowerCase()).not.toMatch(/contact|email|phone/);
    }
    expect((await run(c, `select count(*)::int n from t3a_contact_permission where participant_id='${p}'`))[0].n).toBe(0);
  });
  it("T13: verifying by the verification identifier gives status only", async () => {
    const p = await mkParticipant(c, "cr09-v13"); const rep = await mkReport(p);
    const code = (await run(c, `select verification_code v from t3a_d1_ber_report where ber_report_id='${rep}'`))[0].v;
    const r = await asRole(c, "anon", null, `select t3a_report_verify('${code}') r`);
    expect(r.r).toEqual({ status: "issued" });
    expect((await asRole(c, "anon", null, `select t3a_report_verify('nope') r`)).r).toEqual({ status: "not_found" });
    await run(c, `update t3a_d1_ber_report set amended_at = now() where ber_report_id='${rep}'`);
    expect((await asRole(c, "anon", null, `select t3a_report_verify('${code}') r`)).r).toEqual({ status: "superseded" });
  });
  it("T14: the Available Reports surface has no search, sort or filter, and the API refuses the parameter", async () => {
    const p = await mkParticipant(c, "cr09-l14"); const e = await mkEmployer("cr09-l14e"); const rep = await mkReport(p); await consent(p); await gaOn(p, rep);
    for (const k of ["dimension", "stage", "evidence_state", "observed_conduct", "sort", "filter", "q"]) {
      const n = await refused("AVAILABLE_REPORTS_PARAMETER_NOT_ALLOWED");
      const r = await as(e, `select t3a_available_reports_list('{"${k}":"x"}'::jsonb) r`);
      expect(r.r.reason).toBe("AVAILABLE_REPORTS_PARAMETER_NOT_ALLOWED");
      expect(await refused("AVAILABLE_REPORTS_PARAMETER_NOT_ALLOWED")).toBe(n + 1);
    }
    const ok = (await as(e, `select t3a_available_reports_list('{"page":1,"page_size":100}'::jsonb) r`)).r;
    expect(ok.outcome).toBe("listed");
    const mine = ok.items.find((i: any) => i.ber_report_id === rep);
    expect(Object.keys(mine).sort()).toEqual(["ber_report_id", "stated_name"]);
    expect((await as(p, `select t3a_available_reports_list() r`)).r.reason).toBe("EMPLOYER_NOT_APPROVED");
  });
  it("T14: a report appears once at its latest version, and only while on", async () => {
    const p = await mkParticipant(c, "cr09-l15"); const e = await mkEmployer("cr09-l15e"); const rep = await mkReport(p); await consent(p); await gaOn(p, rep);
    const rep2 = await mkReport(p, rep); await run(c, `update t3a_d1_ber_report set amended_at = now() where ber_report_id='${rep}'`);
    const ids = (await as(e, `select t3a_available_reports_list('{"page_size":100}'::jsonb) r`)).r.items.map((i: any) => i.ber_report_id);
    expect(ids.filter((i: string) => i === rep2)).toHaveLength(1); expect(ids).not.toContain(rep);
    await gaOff(p, rep2);
    const after = (await as(e, `select t3a_available_reports_list('{"page_size":100}'::jsonb) r`)).r.items.map((i: any) => i.ber_report_id);
    expect(after).not.toContain(rep2);
  });
  it("T15: no output or function carries \"released to your organization\"", async () => {
    const defs = await run(c, `select string_agg(pg_get_functiondef(p.oid), ' ') s from pg_proc p where p.proname ~ '^t3a_(ga_|direct_release_|release_state|release_access|report_verify|available_reports|cr09_)'`);
    expect(defs[0].s.toLowerCase()).not.toContain("released to your organization");
    const st = (await run(c, `select count(*)::int n from pg_proc p where p.proname ~ '^t3a_(ga_|direct_release_|available_reports|cr09_)'`))[0].n;
    expect(st).toBeGreaterThanOrEqual(8);
  });
});

describe("CR-09 records", () => {
  it("the grant and access records are append-only and the token is never stored", async () => {
    const p = await mkParticipant(c, "cr09-r"); const rep = await mkReport(p); await consent(p); await gaOn(p, rep);
    const rel = await release(p, rep); await redeem(rel.r.token, addr);
    await expect(c.query(`update t3a_cr09_ga_event set event='off'`)).rejects.toThrow(/append/i);
    await expect(c.query(`delete from t3a_cr09_access_record`)).rejects.toThrow(/append/i);
    await expect(c.query(`update t3a_cr09_direct_release set expires_at = now()`)).rejects.toThrow(/append/i);
    const stored = await run(c, `select token_hash from t3a_cr09_direct_release where direct_release_id='${rel.r.direct_release_id}'`);
    expect(stored[0].token_hash).not.toBe(rel.r.token); expect(stored[0].token_hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("a participant sees only their own access record, and cannot read the token hash", async () => {
    const p = await mkParticipant(c, "cr09-s1"); const o = await mkParticipant(c, "cr09-s2"); const rep = await mkReport(p);
    const rel = await release(p, rep); await redeem(rel.r.token, addr);
    expect((await as(o, `select t3a_release_access_record('${rep}') r`)).r).toHaveLength(0);
    expect((await as(o, `select count(*)::int n from t3a_cr09_access_record`)).rows[0].n).toBe(0);
    expect((await as(p, `select token_hash from t3a_cr09_direct_release`)).msg).toMatch(/permission denied/);
    expect((await as(p, `select count(*)::int n from t3a_cr09_access_record`)).rows[0].n).toBe(1);
  });
});
