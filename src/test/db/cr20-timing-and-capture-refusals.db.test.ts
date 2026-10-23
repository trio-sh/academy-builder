/** CORR-007 Rev 1.6 rule CR-20: Stage 2 and Stage 4 timing and capture refusals (CR-20-T1 to T3). Synthetic source and people; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { RUN, asRole, asService, connect, meet, mkApprovedSource, mkParticipant, retireFixtureSources, run } from "./helpers";

let c: pg.Client; let reviewer: string; let seq = 0;
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
/** A synthetic D1 source with a beat sequence, a chosen enquiry point, and the capture bindings given. */
async function world(o: { stage?: "S2" | "S4"; enquiry?: string; beats?: string[]; bindings?: Array<[string, string, string | null]> } = {}) {
  const src = await mkApprovedSource(c, { dimension: "D1", stage: "S2", situationClass: "SC-D1-1", reviewer });
  const stage = o.stage ?? "S2";
  await fx(`update t3a_d1_content_version set body = jsonb_set(jsonb_set(body, '{stage_code}', '"${stage}"'), '{source_sheet}', (body->'source_sheet') || jsonb_build_object('enquiry_point', ${o.enquiry === undefined ? "null::text" : `'${o.enquiry}'::text`})) where content_version_id='${src.version}'`);
  for (const [i, b] of (o.beats ?? []).entries()) await fx(`insert into t3a_d1_mentor_action_sequence(source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point) values ('${src.identifier}', ${i + 1}, '${b}', 'SAY', 'beat ${b}', false)`);
  for (const [beat, set, q] of o.bindings ?? []) await fx(`insert into t3a_d1_beat_capture_binding(source_identifier, beat_code, capture_set_code, dimension_id, qualifier_as_written) values ('${src.identifier}', '${beat}', '${set}', 'D1', ${q ? `'${q}'` : "null"})`);
  const p = await mkParticipant(c, `cr20-p-${++seq}-${RUN}`);
  await meet(c, p, src.version);
  await fx(`update t3a_stage_entry_event set env_state_at_entry = 'design_only', stage_code = '${stage}' where participant_id='${p}' and source_version_id='${src.version}'`);
  const entry = (await run(c, `select stage_entry_event_id e from t3a_stage_entry_event where participant_id='${p}' and source_version_id='${src.version}'`))[0].e;
  return { src, p, entry };
}
const timing = (entry: string, q = "Q-D1-02") => run(c, `select t3a_d1_timing_determination_permitted('${entry}','${q}') r`).then((r) => r[0].r);

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, `cr20-rev-${RUN}`); });
afterAll(async () => { await c.end(); });

describe("CR-20-T1 each timing refusal returns its own code", () => {
  it("a reference that is not stated as a beat", async () => {
    const w = await world({ enquiry: "when the mentor asks the third question", beats: ["B1", "B2", "B3"] });
    expect(await timing(w.entry)).toMatchObject({ permitted: false, refusal: "REFERENCE_BEAT_NOT_STATED_AS_BEAT" });
  });
  it("a stated beat with no script loaded", async () => {
    const w = await world({ enquiry: "at B3", beats: [] });
    expect(await timing(w.entry)).toMatchObject({ permitted: false, refusal: "BEAT_SCRIPT_NOT_LOADED", reference_beat: "B3" });
  });
  it("a stated beat that is not in the loaded script", async () => {
    const w = await world({ enquiry: "at B9", beats: ["B1", "B2", "B3"] });
    expect(await timing(w.entry)).toMatchObject({ permitted: false, refusal: "REFERENCE_BEAT_NOT_IN_SEQUENCE" });
  });
  it("a loaded beat with no timestamp, then permitted once the beat is stamped; each code is only its own", async () => {
    const w = await world({ enquiry: "at B3", beats: ["B1", "B2", "B3"] });
    const r = await timing(w.entry);
    expect(r).toMatchObject({ permitted: false, refusal: "BEAT_TIMESTAMP_MISSING", reference_beat: "B3" });
    for (const other of ["BEAT_SCRIPT_NOT_LOADED", "REFERENCE_BEAT_NOT_STATED_AS_BEAT", "REFERENCE_BEAT_NOT_IN_SEQUENCE"]) expect(r.refusal).not.toBe(other);
    await fx(`insert into t3a_d1_beat_timestamp(stage_entry_event_id, beat_code, recorded_at, duration_seconds, recorded_by) values ('${w.entry}','B3', now(), 5, '${w.p}')`);
    expect(await timing(w.entry)).toMatchObject({ permitted: true, reference_beat: "B3" });
  });
  it("a determination that is not timing dependent is not refused", async () => {
    const w = await world({ enquiry: "at B3", beats: [] });
    expect(await timing(w.entry, "Q-D1-01")).toMatchObject({ permitted: true, timing_dependent: false });
  });
});

describe("CR-20-T2 a whole session line before the close beat, and a final beat passed unanswered", () => {
  const sel = (w: { entry: string; p: string }, line: number, beat: string) =>
    c.query(`insert into t3a_d1_capture_selection(stage_entry_event_id, question_code, capture_set_code, beat_code, line_order, selected_by, dimension_id) values ('${w.entry}','Q-D1-02','C2','${beat}',${line},'${w.p}','D1')`);
  const advance = (entry: string, beat: string) => run(c, `select t3a_d1_beat_advance_permitted('${entry}','${beat}') r`).then((r) => r[0].r);
  const count = async (entry: string) => (await run(c, `select count(*)::int n from t3a_d1_capture_selection where stage_entry_event_id='${entry}'`))[0].n;

  it("the whole session line (FC-02) is refused before the close beat and after it, accepted at the close beat", async () => {
    const w = await world({ beats: ["B1", "B2", "B3", "B4", "B5"], bindings: [["B2", "C2", null], ["B4", "C2", "final"]] });
    await expect(sel(w, 4, "B2")).rejects.toThrow(/WHOLE_SESSION_ANSWER_BEFORE_CLOSE/);
    expect(await count(w.entry)).toBe(0);
    await expect(sel(w, 1, "B5")).rejects.toThrow(/DETERMINATION_CLOSED/);
    await sel(w, 4, "B4");
    expect(await count(w.entry)).toBe(1);
  });
  it("a set with no final beat offers its whole session line only at commit", async () => {
    const w = await world({ beats: ["B1", "B2", "B3"], bindings: [["B2", "C2", null]] });
    await expect(sel(w, 4, "B2")).rejects.toThrow(/WHOLE_SESSION_ANSWER_BEFORE_CLOSE/);
    await sel(w, 4, "__COMMIT__");
    expect(await count(w.entry)).toBe(1);
  });
  it("a line that is not a line of the set is refused", async () => {
    const w = await world({ beats: ["B1", "B2"], bindings: [["B2", "C2", null]] });
    await expect(sel(w, 99, "B2")).rejects.toThrow(/CAPTURE_LINE_NOT_IN_SET/);
  });
  it("passing a final beat with its determination unanswered (FC-06) is refused by name, and permitted once answered", async () => {
    const w = await world({ beats: ["B1", "B2", "B3", "B4"], bindings: [["B2", "C2", null], ["B4", "C2", "final"]] });
    expect(await advance(w.entry, "B2")).toMatchObject({ permitted: true });                                  // not the closing beat
    expect(await advance(w.entry, "B4")).toMatchObject({ permitted: false, refusal: "DETERMINATION_UNANSWERED_AT_CLOSING_BEAT", sets: "C2", beat_code: "B4" });
    await sel(w, 4, "B4");
    expect(await advance(w.entry, "B4")).toMatchObject({ permitted: true });
  });
});

describe("CR-20-T3 live capture with an attestation missing", () => {
  const permitted = (entry: string) => run(c, `select t3a_d1_live_capture_permitted('${entry}') r`).then((r) => r[0].r);
  const attest = (entry: string, code: string, by: string) => fx(`insert into t3a_d1_session_attestation(stage_entry_event_id, attestation_code, attested_by) values ('${entry}','${code}','${by}')`);
  const host = (entry: string, email: string | null) => fx(`insert into t3a_d1_live_session(stage_entry_event_id, host_account_email, channel) values ('${entry}', ${email ? `'${email}'` : "null"}, 'google_meet') on conflict (stage_entry_event_id) do update set host_account_email = excluded.host_account_email`);

  it("Stage 2 needs A1 to A3 and each missing one is named; Stage 4 also needs A4; nothing else is live video", async () => {
    const w = await world({ stage: "S2" });
    expect(await permitted(w.entry)).toMatchObject({ permitted: false, refusal: "SESSION_ATTESTATION_MISSING", missing: ["A1", "A2", "A3"] });
    await attest(w.entry, "A1", w.p); await attest(w.entry, "A2", w.p);
    expect(await permitted(w.entry)).toMatchObject({ permitted: false, refusal: "SESSION_ATTESTATION_MISSING", missing: ["A3"] });
    await attest(w.entry, "A3", w.p);
    expect(await permitted(w.entry)).toMatchObject({ permitted: false, refusal: "MEET_HOST_NOT_RECORDED" });
    await host(w.entry, "mentor@the3rdacademy.com");
    expect(await permitted(w.entry)).toMatchObject({ permitted: true, live_video: true, channel: "google_meet" });
    const s4 = await world({ stage: "S4" });
    for (const a of ["A1", "A2", "A3"]) await attest(s4.entry, a, s4.p);
    await host(s4.entry, "mentor@the3rdacademy.com");
    expect(await permitted(s4.entry)).toMatchObject({ permitted: false, refusal: "SESSION_ATTESTATION_MISSING", missing: ["A4"] });
    await attest(s4.entry, "A4", s4.p);
    expect(await permitted(s4.entry)).toMatchObject({ permitted: true });
  });
  it("a recording indicator ends capture and it does not resume even with every attestation", async () => {
    const w = await world({ stage: "S2" });
    for (const a of ["A1", "A2", "A3"]) await attest(w.entry, a, w.p);
    await host(w.entry, "mentor@the3rdacademy.com");
    expect(await permitted(w.entry)).toMatchObject({ permitted: true });
    await fx(`insert into t3a_d1_live_session_event(stage_entry_event_id, event_kind, reported_by) values ('${w.entry}','recording_indicator_seen','${w.p}')`);
    expect(await permitted(w.entry)).toMatchObject({ permitted: false, refusal: "RECORDING_INDICATOR_SEEN" });
  });
  it("a Stage entry that is not live video is unaffected, and a real entry needs an approved notice that names Google Meet", async () => {
    const w = await world({ stage: "S2" });
    await fx(`update t3a_stage_entry_event set stage_code = 'S1' where stage_entry_event_id = '${w.entry}'`);
    expect(await permitted(w.entry)).toMatchObject({ permitted: true, live_video: false });
    expect(await permitted(randomUUID())).toMatchObject({ permitted: false, refusal: "STAGE_ENTRY_NOT_FOUND" });
  });
  it("a meeting hosted outside the institution's domain is refused at the start, and nothing is recorded", async () => {
    const w = await world({ stage: "S2" }); const mentor = await mkParticipant(c, `cr20-m-${++seq}-${RUN}`, "mentor");
    await fx(`update t3a_stage_entry_event set env_state_at_entry='design_only' where stage_entry_event_id='${w.entry}'`);
    await fx(`insert into t3a_mentor_assignment(mentor_id, participant_id, stage_instance_id, assignment_method) select '${mentor}', participant_id, stage_instance_id, 'system_allocated' from t3a_stage_entry_event where stage_entry_event_id='${w.entry}'`);
    const begin = (email: string) => asRole(c, "authenticated", mentor, `select t3a_d1_live_session_begin('${w.entry}', null, '${email}') r`);
    expect((await begin("someone@gmail.com")).r).toMatchObject({ ok: false, refusal: "MEET_HOST_OUTSIDE_DOMAIN" });
    expect((await begin("")).r).toMatchObject({ ok: false, refusal: "HOST_ACCOUNT_REQUIRED" });
    expect((await run(c, `select count(*)::int n from t3a_d1_live_session where stage_entry_event_id='${w.entry}'`))[0].n).toBe(0);
    expect((await begin("mentor@the3rdacademy.com")).r).toMatchObject({ ok: true });
  });
});
