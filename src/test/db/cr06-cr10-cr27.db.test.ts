/** CORR-007 Rev 1.6 rules CR-06 (participant review of every committed observation), CR-10 (one page rendering) and CR-27 (the Stage 1 evidence note, version 2). Synthetic people; throwaway database only. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { RUN, asRole, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

let c: pg.Client; let reviewer: string; let seq = 0; let clock = 0;
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
const setCfg = (k: string, v: string) => run(c, `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('${k}', $v$${v}$v$, '9.${++clock}', '${reviewer}')`);
const COMMIT = "We will acknowledge your correction within 5 business days and aim to give you the decision within 20 business days. If a case needs longer, we will tell you why and when to expect it.";
const obs = async (p: string, dim = "D2", committed = true) => (await run(c, `insert into t3a_observation_record(participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${p}','${dim}','S2',${committed}, ${committed ? "now()" : "null"}) returning observation_record_id i`))[0].i as string;

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, `cr06-rev-${RUN}`); });
afterAll(async () => {
  await setCfg("correction_acknowledge_business_days", "5"); await setCfg("correction_decision_target_business_days", "20"); await setCfg("correction_response_time", COMMIT);
  await c.end();
});

describe("CR-06 a participant reads and challenges any committed observation", () => {
  it("T1: an observation that no report contains is readable by its participant and the challenge route is available; no one else, and nothing uncommitted, opens", async () => {
    const p = await mkParticipant(c, `cr06-p-${++seq}-${RUN}`); const other = await mkParticipant(c, `cr06-o-${seq}-${RUN}`);
    const rec = await obs(p); const open = await obs(p, "D2", false);
    const r = (await as(p, `select t3a_cr06_observation_review('${rec}') r`)).r;
    expect(r).toMatchObject({ outcome: "open", observation_record_id: rec, dimension_id: "D2", in_a_report: false, challenge_available: true, open_corrections: 0 });
    expect(r.correction_commitment).toMatchObject({ rendered: true, value: COMMIT, acknowledge_business_days: 5, decision_target_business_days: 20 });
    for (const [u, id] of [[other, rec], [p, open], [p, randomUUID()]] as const) expect((await as(u, `select t3a_cr06_observation_review('${id}') r`)).r).toEqual({ outcome: "refused", reason: "OBSERVATION_NOT_AVAILABLE" });
  });
  it("T2: raising a correction renders the commitment word for word with 5 and 20; with the values unloaded nothing is raised and the render refuses", async () => {
    const p = await mkParticipant(c, `cr06-p-${++seq}-${RUN}`); const rec = await obs(p);
    const raise = (g = "the date is wrong") => as(p, `select t3a_cr06_raise_correction('${rec}', '${g}', 'detail') r`).then((x) => x.r);
    const ok = await raise();
    expect(ok).toMatchObject({ outcome: "raised", correction_commitment: { rendered: true, value: COMMIT, acknowledge_business_days: 5, decision_target_business_days: 20 } });
    expect((await run(c, `select observation_record_id, participant_id, challenge_status::text s from t3a_correction_case where correction_case_id='${ok.correction_case_id}'`))[0]).toEqual({ observation_record_id: rec, participant_id: p, s: "open" });
    expect((await as(p, `select t3a_cr06_observation_review('${rec}') r`)).r.open_corrections).toBe(1);
    const before = (await run(c, `select count(*)::int n from t3a_correction_case where participant_id='${p}'`))[0].n;
    for (const k of ["correction_response_time", "correction_acknowledge_business_days", "correction_decision_target_business_days"]) {
      const saved = (await run(c, `select configuration_value v from t3a_configuration_value where configuration_key='${k}' order by configuration_seq desc limit 1`))[0].v;
      await setCfg(k, "");
      expect((await as(p, `select t3a_cr06_observation_review('${rec}') r`)).r.correction_commitment).toEqual({ rendered: false, reason: "correction_response_time_unloaded" });
      expect(await raise("another ground")).toEqual({ outcome: "refused", reason: "correction_response_time_unloaded" });
      await setCfg(k, saved);
    }
    expect((await run(c, `select count(*)::int n from t3a_correction_case where participant_id='${p}'`))[0].n).toBe(before);
    expect((await raise("restored")).outcome).toBe("raised");
  });
  it("a ground is required, and only the participant's own committed observation takes a correction", async () => {
    const p = await mkParticipant(c, `cr06-p-${++seq}-${RUN}`); const other = await mkParticipant(c, `cr06-o-${seq}-${RUN}`); const rec = await obs(p);
    expect((await as(p, `select t3a_cr06_raise_correction('${rec}', '  ', null) r`)).r).toEqual({ outcome: "refused", reason: "GROUND_REQUIRED" });
    expect((await as(other, `select t3a_cr06_raise_correction('${rec}', 'not mine', null) r`)).r.reason).toBe("OBSERVATION_NOT_AVAILABLE");
    expect((await as(p, `select t3a_cr06_raise_correction('${await obs(p, "D2", false)}', 'not committed', null) r`)).r.reason).toBe("OBSERVATION_NOT_AVAILABLE");
    expect((await run(c, `select count(*)::int n from t3a_correction_case where participant_id='${p}'`))[0].n).toBe(0);
  });
  it("a correction open on an observation of a dimension in a report blocks that report; it does not touch a report of another dimension", async () => {
    const p = await mkParticipant(c, `cr06-p-${++seq}-${RUN}`);
    const d2 = await obs(p, "D2");
    const ber = async (d: string) => (await fx(`insert into t3a_d1_ber_report(participant_id, dimension_id, represented_dimension_ids) values ('${p}','${d}',array['${d}']::text[]) returning ber_report_id b`))[0].b as string;
    const rD2 = await ber("D2"); const rD3 = await ber("D3");
    const state = async (r: string) => (await run(c, `select t3a_report_correction_state('${r}') s`))[0].s;
    expect((await state(rD2)).open).toBe(false);
    await as(p, `select t3a_cr06_raise_correction('${d2}', 'wrong', null)`);
    expect(await state(rD2)).toMatchObject({ open: true, cases: [{ kind: "correction_on_observation" }] });
    expect((await state(rD3)).open).toBe(false);
    const gate = (await run(c, `select t3a_report_issuance_gate('${rD2}') g`))[0].g;
    expect(gate.blockers.map((b: any) => b.code)).toContain("correction_open");
  });
});

describe("CR-10 every issued report renders through the multi page renderer", () => {
  const gate = (r: string, form: string) => run(c, `select t3a_report_render_gate('${r}','${form}') g`).then((x) => x[0].g);
  const report = async (dims: string[], specimen: boolean) => { const p = await mkParticipant(c, `cr10-p-${++seq}-${RUN}`);
    return (await fx(`insert into t3a_d1_ber_report(participant_id, dimension_id, represented_dimension_ids, specimen_render_flag) values ('${p}','${dims[0]}',array[${dims.map((d) => `'${d}'`).join(",")}]::text[], ${specimen}) returning ber_report_id b`))[0].b as string; };
  it("T1: routing a report to the single page renderer is refused with format_mismatch, for one dimension or several; the multi page form is renderable", async () => {
    for (const dims of [["D1"], ["D2"], ["D2", "D3"], ["D4"]]) {
      const r = await report(dims, false);
      expect(await gate(r, "one_page"), dims.join()).toMatchObject({ outcome: "refused", reason: "format_mismatch" });
      expect(await gate(r, "multi_page"), dims.join()).toMatchObject({ outcome: "renderable", form: "multi_page", dimension_blocks: dims.length });
    }
  });
  it("the single page form stays for the specimen only: one dimension renders, several overflow, D4 is still closed, and an unknown form is invalid", async () => {
    expect(await gate(await report(["D2"], true), "one_page")).toMatchObject({ outcome: "renderable", form: "one_page" });
    expect(await gate(await report(["D2", "D3"], true), "one_page")).toMatchObject({ reason: "layout_overflow" });
    expect(await gate(await report(["D4"], true), "one_page")).toMatchObject({ reason: "format_mismatch" });
    expect(await gate(await report(["D2"], true), "poster")).toMatchObject({ reason: "render_input_invalid" });
    expect(await gate(randomUUID(), "multi_page")).toMatchObject({ reason: "BER_REPORT_NOT_FOUND" });
  });
});

describe("CR-27 the Stage 1 evidence note, version 2", () => {
  const V1 = "Stage 1 written situations are administered through an AI system. A Stage 1 observation enters the evidence record only after authorized human confirmation. Source linked statements remain subject to participant review, correction, amendment and evidence currency controls.";
  const V2 = "Stage 1 written situations are presented through a fixed automated process that shows each situation exactly as written and generates nothing. A Stage 1 observation enters the evidence record only after authorized human confirmation. Source linked statements remain subject to participant review, correction, amendment and evidence currency controls.";
  async function s1World() {
    const mentor = await mkParticipant(c, `cr27-m-${++seq}-${RUN}`, "mentor"); const p = await mkParticipant(c, `cr27-p-${seq}-${RUN}`);
    const src = await mkApprovedSource(c, { dimension: "D2", stage: "S1", situationClass: "SC-D2-1", reviewer });
    await run(c, `insert into t3a_mentor_authorization(mentor_id, dimension_id, authorized_from, calibration_status, reference_set_version, authorization_status) values ('${mentor}','D2', now() - interval '1 day','current','1.0','authorized')`);
    const inst = (await run(c, `insert into t3a_stage_instance(participant_id, stage_code, dimension_id, attempt_no, state) values ('${p}','S1','D2',1,'active') returning stage_instance_id i`))[0].i as string;
    const h = (await run(c, `select body_hash h from t3a_d1_content_version where content_version_id='${src.version}'`))[0].h;
    await fx(`insert into t3a_d1_s1_confirmation(stage_instance_id, participant_id, dimension_id, confirmed_by, source_version_id, source_version_hash) values ('${inst}','${p}','D2','${mentor}','${src.version}','${h}')`);
    return inst;
  }
  it("T1: the evidence note on a Stage 1 observation is version 2 word for word, and the phrase 'an AI system' appears nowhere in it", async () => {
    const note = (await run(c, `select t3a_s1_evidence_note('${await s1World()}') n`))[0].n;
    expect(note).toMatchObject({ outcome: "rendered", text_ref: "T-EVNOTE-001", text_version: 2, text: V2 });
    expect(JSON.stringify(note)).not.toMatch(/an AI system/i);
  });
  it("version 1 stays in the register as superseded with its exact text; version 2 is the one current version; the report's text row matches the current version; nothing is deleted", async () => {
    const v = await run(c, `select version, status, body from t3a_controlled_text_version where text_ref='T-EVNOTE-001' order by version`);
    expect(v).toEqual([{ version: 1, status: "superseded", body: V1 }, { version: 2, status: "current", body: V2 }]);
    expect((await run(c, `select body from t3a_d1_report_controlled_text where text_ref='T-EVNOTE-001'`))[0].body).toBe(V2);
    expect((await run(c, `select t3a_controlled_text_current('T-EVNOTE-001') t`))[0].t).toEqual({ text_ref: "T-EVNOTE-001", version: 2, text: V2 });
    expect((await run(c, `select t3a_controlled_text_current('T-NOPE') t`))[0].t).toEqual({ text_ref: "T-NOPE", refusal: "controlled_text_not_loaded" });
    await expect(c.query(`delete from t3a_controlled_text_version where text_ref='T-EVNOTE-001' and version=1`)).rejects.toThrow(/append/i);
    await expect(c.query(`insert into t3a_controlled_text_version(text_ref, version, body, status) values ('T-EVNOTE-001', 3, 'x', 'current')`)).rejects.toThrow(/unique|duplicate/i);
  });
});
