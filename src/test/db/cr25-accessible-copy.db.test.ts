/** CORR-007 Rev 1.6 rule CR-25: every issued report has an accessible tagged equivalent with identical approved content. Synthetic reports; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { await c.query(sql); await c.query("commit"); } catch (e) { await c.query("rollback"); throw e; }
}
/** A participant with `rows` committed, composed statements (so the conduct table has rows), and an issued report. */
async function issued(rows: string[] = []) {
  const p = await mkParticipant(c, `cr25-p-${randomUUID().slice(0, 6)}`, "candidate", { consent: false });
  for (const [i, text] of rows.entries()) {
    const o = randomUUID();
    await fx(`insert into t3a_observation_record(observation_record_id, participant_id, dimension_id, stage_code, is_committed, committed_at) values ('${o}','${p}','D1','S${(i % 4) + 1}', true, now())`);
    await fx(`insert into t3a_d1_composed_statement(observation_record_id, statement_library_id, resolution_rule_id, composed_body, answer_pattern_snapshot) values ('${o}','${randomUUID()}','${randomUUID()}', '${text.replace(/'/g, "''")}', '{}'::jsonb)`);
  }
  const rep = randomUUID();
  await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, represented_dimension_ids, ber_version, ber_standard_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${rep}','${p}','D1', array['D1'], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false)`);
  await reviewed(rep);
  await run(c, `update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep}'`);
  return { p, rep };
}
/** The review checklist is complete and passed: the face does not assemble for a report whose review is open (the review governs issuance, with no override). */
async function reviewed(rep: string) {
  const reviewer = await mkParticipant(c, `cr25-rv-${randomUUID().slice(0, 6)}`, "mentor");
  await run(c, `insert into t3a_d1_review_result(ber_report_id, item_no, outcome, reviewed_by) select '${rep}', item_no, 'pass', '${reviewer}' from t3a_d1_review_checklist_item`);
}
const text = (tagged: any) => JSON.stringify(tagged);

beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

describe("CR-25 the accessible equivalent", () => {
  it("T1: an issued report has a tagged accessible equivalent with identical content", async () => {
    const w = await issued(["Chose to pause the session and ask a question.", "Named the risk aloud before proceeding."]);
    const st = (await asService(c, `select t3a_report_accessible_state('${w.rep}') r`)).r;
    expect(st).toMatchObject({ state: "present", tagged: true, identical_to_face: true });
    const copy = (await as(w.p, `select t3a_report_accessible_read('${w.rep}') r`)).r;
    expect(copy.rendered).toBe(true);
    const t = copy.tagged;
    expect(t).toMatchObject({ role: "document", lang: "en" });
    // every block that renders is a headed section; the conduct table carries a caption, header cells and one row per statement
    const face = (await run(c, `select t3a_d1_report_face_assemble('${w.rep}') f`))[0].f;
    const rendering = face.blocks.filter((b: any) => b.renders);
    expect(t.children.map((s: any) => s.heading.text)).toEqual(rendering.map((b: any) => b.block_name));
    for (const s of t.children) { expect(s.tag).toBe("section"); expect(s.heading.tag).toBe("h2"); }
    for (const b of rendering) if (b.controlled_text) expect(text(t)).toContain(JSON.stringify(b.controlled_text).slice(1, -1));
    const table = t.children.flatMap((s: any) => s.children).find((x: any) => x.tag === "table");
    expect(table.header).toEqual(["Dimension", "Stage", "Statement"]); expect(table.caption).toBe("Observed conduct table");
    expect(table.rows.map((r: any) => r[2]).sort()).toEqual(["Chose to pause the session and ask a question.", "Named the risk aloud before proceeding."]);
    // the digests agree and are over the same text
    const row = (await run(c, `select face_text_digest f, copy_text_digest c from t3a_report_accessible_copy where ber_report_id='${w.rep}'`))[0];
    expect(row.f).toBe(row.c); expect(row.f).toMatch(/^[0-9a-f]{64}$/);
  });
  it("the text of the equivalent is exactly the text of the face, block by block and row by row", async () => {
    const w = await issued(["Asked for the instructions to be repeated."]);
    const face = (await run(c, `select t3a_d1_report_face_assemble('${w.rep}') f`))[0].f;
    const faceText = (await run(c, `select t3a_report_face_text('${JSON.stringify(face).replace(/'/g, "''")}'::jsonb) t`))[0].t as string;
    const copy = (await as(w.p, `select t3a_report_accessible_read('${w.rep}') r`)).r.tagged;
    const copyText = (await run(c, `select t3a_tagged_text('${JSON.stringify(copy).replace(/'/g, "''")}'::jsonb) t`))[0].t as string;
    expect(copyText).toBe(faceText);
    expect(faceText).toContain("R|D1|S1|Asked for the instructions to be repeated.");
    expect(sha(copyText)).toBe((await run(c, `select copy_text_digest d from t3a_report_accessible_copy where ber_report_id='${w.rep}'`))[0].d);
  });
  it("a block that does not render is absent from both, not left as an empty section", async () => {
    const w = await issued();
    const copy = (await as(w.p, `select t3a_report_accessible_read('${w.rep}') r`)).r.tagged;
    const names = copy.children.map((s: any) => s.heading.text);
    expect(names).not.toContain("Divergence callout"); expect(names).not.toContain("Job family");
    // a rendering block that carries no approved text and no rows in the face (the Header, an empty conduct table) is its heading alone: nothing is added to it
    const face = (await run(c, `select t3a_d1_report_face_assemble('${w.rep}') f`))[0].f;
    for (const s of copy.children) {
      const b = face.blocks.find((x: any) => x.block_no === s.block_no);
      const hasContent = Boolean(b.controlled_text) || (Array.isArray(b.rows) && b.rows.length > 0);
      expect(s.children.length > 0, `block ${s.block_no}`).toBe(hasContent);
    }
  });
  it("a report issued by a later update gets its equivalent too, and an amended report has its own", async () => {
    const p = await mkParticipant(c, `cr25-upd-${RUN}`); const rep = randomUUID();
    await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${rep}','${p}','D1', array['D1'], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false)`);
    expect((await asService(c, `select t3a_report_accessible_state('${rep}') r`)).r.state).toBe("not_issued");
    await reviewed(rep);
    await run(c, `update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep}'`);
    expect((await asService(c, `select t3a_report_accessible_state('${rep}') r`)).r.state).toBe("present");
    const rep2 = randomUUID();
    await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, represented_dimension_ids, supersedes, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${rep2}','${p}','D1', array['D1'], '${rep}', '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false)`);
    await reviewed(rep2);
    await run(c, `update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep2}'`);
    await run(c, `update t3a_d1_ber_report set amended_at = now() where ber_report_id='${rep}'`);
    expect((await asService(c, `select t3a_report_accessible_state('${rep2}') r`)).r.state).toBe("present");
    expect((await asService(c, `select t3a_report_accessible_state('${rep}') r`)).r.state).toBe("present");   // the earlier version keeps its own
  });
  it("a report that is not issued has no equivalent, and an unknown report is not found", async () => {
    const p = await mkParticipant(c, `cr25-no-${RUN}`); const rep = randomUUID();
    await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, represented_dimension_ids, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${rep}','${p}','D1', '1.0', '1.0', '1.0', 'M5', array['D1']::text[], '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false)`);
    expect((await run(c, `select count(*)::int n from t3a_report_accessible_copy where ber_report_id='${rep}'`))[0].n).toBe(0);
    expect((await as(p, `select t3a_report_accessible_read('${rep}') r`)).r.refusal_code).toBe("ACCESSIBLE_COPY_MISSING");
    expect((await asService(c, `select t3a_report_accessible_state('${randomUUID()}') r`)).r.state).toBe("report_not_found");
  });
});

describe("CR-25 when the face cannot assemble, nothing is invented", () => {
  it("an issued report whose review is open has no face and so no equivalent; the refusal is logged", async () => {
    const p = await mkParticipant(c, `cr25-open-${RUN}`); const rep = randomUUID();
    const n = (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='ACCESSIBLE_COPY_NOT_BUILT'`))[0].n;
    await run(c, `insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, represented_dimension_ids, issued_at, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${rep}','${p}','D1', array['D1'], now(), '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false)`);
    expect((await asService(c, `select t3a_report_accessible_state('${rep}') r`)).r.state).toBe("missing");
    expect((await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='ACCESSIBLE_COPY_NOT_BUILT'`))[0].n).toBe(n + 1);
  });
  it("with a mandatory controlled text missing the issuance logs the refusal and builds no copy", async () => {
    const w0 = await issued();                                     // a good one first, so the DB has a baseline
    const saved = (await run(c, `select text_ref, block_no, body, verbatim from t3a_d1_report_controlled_text where text_ref='6.2.1'`))[0];
    await c.query("begin");
    try {
      await c.query(`delete from t3a_d1_report_controlled_text where text_ref='6.2.1'`);
      const p = await mkParticipant(c, `cr25-miss-${RUN}`); const rep = randomUUID();
      const n = (await c.query(`select count(*)::int n from t3a_capture_refusal where reason_code='ACCESSIBLE_COPY_NOT_BUILT'`)).rows[0].n;
      await c.query(`insert into t3a_d1_ber_report(ber_report_id, participant_id, dimension_id, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${rep}','${p}','D1', array['D1'], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false)`);
      await c.query(`insert into t3a_d1_review_result(ber_report_id, item_no, outcome, reviewed_by) select '${rep}', item_no, 'pass', '${p}' from t3a_d1_review_checklist_item`);
      await c.query(`update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep}'`);
      expect((await c.query(`select count(*)::int n from t3a_report_accessible_copy where ber_report_id='${rep}'`)).rows[0].n).toBe(0);
      expect((await c.query(`select count(*)::int n from t3a_capture_refusal where reason_code='ACCESSIBLE_COPY_NOT_BUILT'`)).rows[0].n).toBe(n + 1);
      expect((await c.query(`select t3a_report_accessible_state('${rep}') r`)).rows[0].r.state).toBe("missing");
    } finally { await c.query("rollback"); }
    expect(saved.text_ref).toBe("6.2.1"); expect((await asService(c, `select t3a_report_accessible_state('${w0.rep}') r`)).r.state).toBe("present");
  });
});

describe("CR-25 the equivalent travels with the face", () => {
  it("both release routes return the same tagged equivalent as the participant's own read", async () => {
    const w = await issued(["Declined to guess and asked a colleague."]);
    const own = (await as(w.p, `select t3a_report_accessible_read('${w.rep}') r`)).r.tagged;
    const employer = await mkParticipant(c, `cr25-emp-${RUN}`, "employer");
    const ep = (await run(c, `insert into employer_profiles(profile_id) values ('${employer}') returning id`))[0].id;
    await run(c, `insert into t3a_employer_application(employer_profile_id, approval_decision, approved_by, approved_at, application_status, accepting_person_name, accepting_person_title, record_use_terms_version, terms_accepted_at, approver_id) values ('${ep}','approved','synthetic',now(),'approved', 'Synthetic Person', 'Director', '1.0', now(), gen_random_uuid())`);
    await asService(c, `select t3a_record_consent('${w.p}','employer_share','granted','D1',null,'1.2','${"a".repeat(64)}','checkbox','en-CA','report_release','future_only',true) r`);
    const warn = (await run(c, `select t3a_cr09_warning_version() v`))[0].v;
    expect((await as(w.p, `select t3a_ga_set('${w.rep}', true, '${warn}') r`)).r.outcome).toBe("on");
    const viaPool = (await as(employer, `select t3a_ga_read('${w.rep}') r`)).r;
    expect(viaPool.outcome).toBe("read"); expect(viaPool.accessible).toEqual(own);
    const rel = (await as(w.p, `select t3a_direct_release_create('${w.rep}','Ana','Corp','ana-${RUN}@corp.example', now() + interval '3 days') r`)).r;
    const viaToken = (await asRole(c, "anon", null, `select t3a_direct_release_redeem('${rel.token}','ana-${RUN}@corp.example', null) r`)).r;
    expect(viaToken.content).toBe(true); expect(viaToken.accessible).toEqual(own);
  });
  it("only the participant or someone with standing reads the equivalent; the copy is append-only and not directly readable", async () => {
    const w = await issued(); const other = await mkParticipant(c, `cr25-oth-${RUN}`);
    expect((await as(other, `select t3a_report_accessible_read('${w.rep}') r`)).r.refusal_code).toBe("CALLER_NOT_ENTITLED_TO_THIS_REPORT");
    expect((await asRole(c, "anon", null, `select t3a_report_accessible_read('${w.rep}') r`)).msg).toMatch(/permission denied/);
    expect((await as(w.p, `select count(*)::int n from t3a_report_accessible_copy`)).msg).toMatch(/permission denied/);
    await expect(c.query(`update t3a_report_accessible_copy set tagged='{}'::jsonb`)).rejects.toThrow(/append/i);
    await expect(c.query(`delete from t3a_report_accessible_copy`)).rejects.toThrow(/append/i);
    await expect(c.query(`update t3a_report_accessible_copy set copy_text_digest = '${"0".repeat(64)}'`)).rejects.toThrow();
  });
});
