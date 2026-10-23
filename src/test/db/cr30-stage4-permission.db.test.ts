/** CORR-007 Rev 1.6 rule CR-30: the Stage 4 participation permission (CR-30-T1, CR-30-T2). Synthetic people and sources; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

/** The text CORR-007 3.30.3a requires, word for word. */
const CR30_TEXT = "In this session you will take part in a live discussion on Google Meet with a mentor and three people who play set roles. Only you are observed. The session is not recorded. The other people will see and hear what you say, and each has agreed to keep the session confidential. You can stop at any time by saying so; stopping is not held against you and records no finding. Do you agree to take part in this group session?";

let c: pg.Client; let reviewer: string; let fac: string; let obs: string; let co: string; let gs: string; let clock = 0;
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
const setCfg = (k: string, v: string) => run(c, `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('${k}', $v$${v}$v$, '9.${++clock}', '${reviewer}')`);
const refusals = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n as number;

async function world() {
  const s = await mkApprovedSource(c, { dimension: "D3", stage: "S2", situationClass: "SC-D3-4", reviewer });
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try {
    const g = (await c.query(`insert into t3a_d1_group_session(source_version_id, facilitator_id, observed_participant_id, accommodation_settled) values ('${s.version}','${fac}','${obs}', true) returning group_session_id i`)).rows[0].i as string;
    await c.query(`insert into t3a_d1_group_session_member(group_session_id, participant_id, member_role) values ('${g}','${obs}','observed'),('${g}','${co}','co_participant')`);
    await c.query("commit"); return g;
  } catch (e) { await c.query("rollback"); throw e; }
}
const grants = (p: string) => run(c, `select consent_type, consent_status, consent_scope_stage_code st, consent_scope_dimension_id d, consent_copy_version v, consent_copy_hash h from t3a_consent_record where account_id='${p}' and consent_type='mentor_observation' and consent_scope_stage_code='S4' and not exists (select 1 from t3a_consent_supersession s where s.consent_id = t3a_consent_record.consent_id)`);
const participation = (p: string) => run(c, `select notice_version, notice_hash from t3a_s4_group_participation where group_session_id='${gs}' and participant_id='${p}'`);

beforeAll(async () => {
  c = await connect(); await retireFixtureSources(c);
  reviewer = await mkParticipant(c, `cr30-rev-${RUN}`); fac = await mkParticipant(c, `cr30-fac-${RUN}`, "mentor"); obs = await mkParticipant(c, `cr30-obs-${RUN}`); co = await mkParticipant(c, `cr30-co-${RUN}`);
  // earlier legacy scripts blank the notice values after their own runs; the loaded text is what production holds
  const text = (await run(c, `select configuration_value v from t3a_configuration_value where configuration_key='s4_group_notice_text' order by configuration_seq desc limit 1`))[0].v as string;
  await setCfg("s4_group_notice_version", "1.0"); await setCfg("s4_group_notice_hash", createHash("sha256").update(text, "utf8").digest("hex"));
  gs = await world();
});
afterAll(async () => { await c.end(); });

describe("CR-30 the Stage 4 permission", () => {
  it("the loaded text is the CR-30 text word for word, and its fingerprint is its sha256", async () => {
    const t = (await run(c, `select configuration_value v from t3a_configuration_value where configuration_key='s4_group_notice_text' order by configuration_seq desc limit 1`))[0].v as string;
    expect(t.replace(/\s+/g, " ").trim()).toBe(CR30_TEXT);
    const h = (await run(c, `select configuration_value v from t3a_configuration_value where configuration_key='s4_group_notice_hash' order by configuration_seq desc limit 1`))[0].v as string;
    expect(h).toBe(createHash("sha256").update(t, "utf8").digest("hex"));
  });

  it("T1: Stage 4 entry while s4_activation_state is not activated is refused with s4_not_activated, whatever the answer", async () => {
    const n0 = await refusals("s4_not_activated");
    expect((await run(c, `select t3a_s4_activation_state() s`))[0].s).toBeNull();
    const before = (await as(fac, `select t3a_s4_enter('${gs}') r`)).r;
    expect(before).toMatchObject({ outcome: "refused", reason: "s4_not_activated" });
    expect(await refusals("s4_not_activated")).toBe(n0 + 1);
    await as(obs, `select t3a_cr30_answer('${gs}','yes') r`); await as(co, `select t3a_cr30_answer('${gs}','yes') r`);
    expect((await as(fac, `select t3a_s4_enter('${gs}') r`)).r).toMatchObject({ outcome: "refused", reason: "s4_not_activated" });
    expect((await run(c, `select started_at from t3a_d1_group_session where group_session_id='${gs}'`))[0].started_at).toBeNull();
  });

  it("T2: with Stage 4 activated, Yes records the Stage 4 grant with the text version and fingerprint; No records nothing adverse and offers no session", async () => {
    const g2 = await world(); const p2 = await mkParticipant(c, `cr30-no-${RUN}`);
    await c.query("begin"); await c.query("set local session_replication_role = replica");
    await c.query(`insert into t3a_d1_group_session_member(group_session_id, participant_id, member_role) values ('${g2}','${p2}','co_participant')`); await c.query("commit");
    const notice = (await run(c, `select configuration_value v, (select configuration_value from t3a_configuration_value where configuration_key='s4_group_notice_hash' order by configuration_seq desc limit 1) h from t3a_configuration_value where configuration_key='s4_group_notice_version' order by configuration_seq desc limit 1`))[0];
    await setCfg("s4_activation_state", "activated");
    try {
      // Yes by the observed participant
      const yes = (await as(obs, `select t3a_cr30_answer('${g2}','Yes') r`)).r;
      expect(yes).toMatchObject({ outcome: "recorded", stage4_grant: true, notice_version: notice.v });
      const g = await grants(obs);
      expect(g).toHaveLength(1);
      expect(g[0]).toMatchObject({ consent_status: "granted", st: "S4", d: "D3", v: notice.v, h: notice.h });
      const pt = await run(c, `select notice_version v, notice_hash h from t3a_s4_group_participation where group_session_id='${g2}' and participant_id='${obs}'`);
      expect(pt[0]).toEqual({ v: notice.v, h: notice.h });
      // Yes again does not duplicate the permission or the grant
      await as(obs, `select t3a_cr30_answer('${g2}','yes') r`);
      expect((await run(c, `select count(*)::int n from t3a_s4_group_participation where group_session_id='${g2}' and participant_id='${obs}'`))[0].n).toBe(1);
      expect((await run(c, `select count(*)::int n from t3a_consent_record where account_id='${obs}' and consent_type='mentor_observation' and consent_scope_stage_code='S4'`))[0].n).toBe(1);
      // Yes by a co-participant: the session permission only, no observation grant
      expect((await as(co, `select t3a_cr30_answer('${g2}','yes') r`)).r).toMatchObject({ outcome: "recorded", stage4_grant: false });
      expect(await grants(co)).toHaveLength(0);
      // No: nothing recorded, no session offered
      const rowsBefore = (await run(c, `select (select count(*) from t3a_consent_record where account_id='${p2}')::int c, (select count(*) from t3a_s4_group_participation where participant_id='${p2}')::int p, (select count(*) from t3a_capture_refusal)::int r`))[0];
      const no = (await as(p2, `select t3a_cr30_answer('${g2}','no') r`)).r;
      expect(no).toEqual({ outcome: "declined", session_offered: false });
      expect((await run(c, `select (select count(*) from t3a_consent_record where account_id='${p2}')::int c, (select count(*) from t3a_s4_group_participation where participant_id='${p2}')::int p, (select count(*) from t3a_capture_refusal)::int r`))[0]).toEqual(rowsBefore);
      // a person outside the session, and a bad answer, are refused and write nothing
      const out = await as(reviewer, `select t3a_cr30_answer('${g2}','yes') r`);
      expect(out.r.reason).toBe("NOT_A_MEMBER_OF_THIS_SESSION");
      expect((await as(obs, `select t3a_cr30_answer('${g2}','maybe') r`)).r.reason).toBe("answer_invalid");
      // the unloaded text refuses a Yes and writes no grant
      await setCfg("s4_group_notice_hash", "");
      const unl = await as(co, `select t3a_cr30_answer('${g2}','yes') r`);
      expect(unl.r.reason).toBe("group_notice_unloaded");
    } finally {
      await setCfg("s4_activation_state", "");
      await setCfg("s4_group_notice_hash", createHash("sha256").update((await run(c, `select configuration_value v from t3a_configuration_value where configuration_key='s4_group_notice_text' order by configuration_seq desc limit 1`))[0].v, "utf8").digest("hex"));
    }
    expect((await run(c, `select t3a_s4_activation_state() s`))[0].s).toBeNull();
    void participation;
  });
});
