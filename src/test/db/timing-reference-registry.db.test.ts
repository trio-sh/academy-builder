/** The timing registry (t3a_timing_reference_field, migration 20270250) and the per dimension capture sets that the capture line refusals read. Synthetic source and people; throwaway database only.
 *  Not swapped by the case review: it names the dimensions itself. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { asRole, connect, meet, mkApprovedSource, mkParticipant, retireFixtureSources, run, RUN } from "./helpers";

let c: pg.Client; let reviewer: string; let seq = 0;
const DIMS = ["D1", "D2", "D3", "D4", "D5", "D8", "D9"];
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
async function world(dim: string, o: { enquiry?: string; beats?: string[]; bindings?: Array<[string, string, string | null]> } = {}) {
  const src = await mkApprovedSource(c, { dimension: dim, stage: "S2", situationClass: `SC-${dim}-1`, reviewer });
  if (o.enquiry !== undefined) await fx(`update t3a_d1_content_version set body = jsonb_set(body, '{source_sheet}', (body->'source_sheet') || jsonb_build_object('enquiry_point', '${o.enquiry}'::text)) where content_version_id='${src.version}'`);
  for (const [i, b] of (o.beats ?? []).entries()) await fx(`insert into t3a_d1_mentor_action_sequence(source_identifier, beat_ordinal, beat_code, action_type, content_verbatim, is_decision_point) values ('${src.identifier}', ${i + 1}, '${b}', 'SAY', 'beat ${b}', false)`);
  for (const [beat, set, q] of o.bindings ?? []) await fx(`insert into t3a_d1_beat_capture_binding(source_identifier, beat_code, capture_set_code, dimension_id, qualifier_as_written) values ('${src.identifier}', '${beat}', '${set}', '${dim}', ${q ? `'${q}'` : "null"})`);
  const p = await mkParticipant(c, `reg-p-${++seq}-${RUN}`);
  await meet(c, p, src.version);
  await fx(`update t3a_stage_entry_event set env_state_at_entry = 'design_only', stage_code = 'S2' where participant_id='${p}' and source_version_id='${src.version}'`);
  const entry = (await run(c, `select stage_entry_event_id e from t3a_stage_entry_event where participant_id='${p}' and source_version_id='${src.version}'`))[0].e;
  return { src, p, entry };
}
const timing = (entry: string, q: string) => run(c, `select t3a_d1_timing_determination_permitted('${entry}','${q}') r`).then((r) => r[0].r);
const field = (q: string) => run(c, `select t3a_d1_reference_field('${q}') f`).then((r) => r[0].f as string | null);
const register = (q: string, dim: string, f = "enquiry_point") => fx(`insert into t3a_timing_reference_field(question_code, dimension_id, source_sheet_field, note) values ('${q}','${dim}','${f}','registry test')`);
const deregister = (q: string) => fx(`delete from t3a_timing_reference_field where question_code='${q}'`);

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, `reg-rev-${RUN}`); });
afterAll(async () => { await fx(`delete from t3a_timing_reference_field where note = 'registry test'`); await c.end(); });

describe("the timing registry", () => {
  it("holds the three D1 timing dependent questions, each with the field it was hard coded to", async () => {
    const rows = await run(c, `select question_code, dimension_id, source_sheet_field from t3a_timing_reference_field where dimension_id = 'D1' order by question_code`);
    expect(rows).toEqual([
      { question_code: "Q-D1-02", dimension_id: "D1", source_sheet_field: "enquiry_point" },
      { question_code: "Q-D1-07", dimension_id: "D1", source_sheet_field: "account_test_point" },
      { question_code: "Q-D1-08a", dimension_id: "D1", source_sheet_field: "bearing_interest" },
    ]);
    expect(await field("Q-D1-02")).toBe("enquiry_point");
    expect(await field("Q-D1-07")).toBe("account_test_point");
    expect(await field("Q-D1-08a")).toBe("bearing_interest");
  });
  it("every dimension has its own authored timing dependent question registered, and it refuses by its own code against the field it names", async () => {
    const real: Record<string, [string, string]> = { D1: ["Q-D1-02", "enquiry_point"], D2: ["Q-D2-09", "knowledge_test_point"], D3: ["Q-D3-09", "delivery_test_point"], D4: ["Q-D4-09", "statement_test_point"], D5: ["Q-D5-09", "exchange_test_point"], D8: ["Q-D8-09", "account_test_point"], D9: ["Q-D9-09", "account_test_point"] };
    for (const d of DIMS) {
      const [q, f] = real[d];
      expect(await field(q), `${d} ${q}`).toBe(f);
      expect((await run(c, `select count(*)::int n from t3a_d1_question_object where question_code='${q}' and dimension_id='${d}'`))[0].n, `${q} is an authored question`).toBe(1);
      const setField = (v: string, ver: string) => fx(`update t3a_d1_content_version set body = jsonb_set(body, '{source_sheet}', (body->'source_sheet') || jsonb_build_object('${f}', '${v}'::text)) where content_version_id='${ver}'`);
      const words = await world(d, { beats: ["B1", "B2"] }); await setField("when the mentor asks", words.src.version);
      expect(await timing(words.entry, q)).toMatchObject({ permitted: false, timing_dependent: true, refusal: "REFERENCE_BEAT_NOT_STATED_AS_BEAT" });
      const none = await world(d, { beats: [] }); await setField("at B3", none.src.version);
      expect(await timing(none.entry, q)).toMatchObject({ permitted: false, refusal: "BEAT_SCRIPT_NOT_LOADED", reference_beat: "B3" });
      const ok = await world(d, { beats: ["B1", "B2", "B3"] }); await setField("at B2", ok.src.version);
      expect(await timing(ok.entry, q)).toMatchObject({ permitted: false, refusal: "BEAT_TIMESTAMP_MISSING" });
      await fx(`insert into t3a_d1_beat_timestamp(stage_entry_event_id, beat_code, recorded_at, duration_seconds, recorded_by) values ('${ok.entry}','B2', now(), 5, '${ok.p}')`);
      expect(await timing(ok.entry, q)).toMatchObject({ permitted: true, timing_dependent: true, reference_beat: "B2" });
    }
  });
  it("no loaded source is made unservable by the registration: every non blank value of a registered field in a loaded source states a beat", async () => {
    for (const [q, f] of [["Q-D2-09", "knowledge_test_point"], ["Q-D3-09", "delivery_test_point"], ["Q-D4-09", "statement_test_point"], ["Q-D5-09", "exchange_test_point"], ["Q-D8-09", "account_test_point"], ["Q-D9-09", "account_test_point"]]) {
      const d = q.split("-")[1];
      const bad = await run(c, `select cv.body->>'source_identifier' id from t3a_d1_content_version cv where cv.retired_at is null and cv.body->>'source_identifier' ~ '^SRC-${d}-S[0-9]-[0-9]{3}$' and coalesce(cv.body #>> '{source_sheet,${f}}','') <> '' and cv.body #>> '{source_sheet,${f}}' !~ '[BR][0-9]+'`);
      expect(bad, `${q} on ${f}`).toEqual([]);
    }
  });
  it("a question that is not in the registry is not timing dependent, on any dimension", async () => {
    expect(await field("Q-D2-77")).toBeNull();
    for (const d of DIMS) {
      const w = await world(d, { enquiry: "at B3", beats: [] });
      expect(await timing(w.entry, `Q-${d}-77`)).toMatchObject({ permitted: true, timing_dependent: false });
    }
  });
  it("a registered question is timing dependent and refuses by its own code; taking it out of the registry makes it not timing dependent again", async () => {
    for (const d of DIMS.filter((x) => x !== "D1")) {
      const q = `Q-${d}-77`; await register(q, d);
      try {
        expect(await field(q)).toBe("enquiry_point");
        const none = await world(d, { enquiry: "at B3", beats: [] });
        expect(await timing(none.entry, q)).toMatchObject({ permitted: false, timing_dependent: true, refusal: "BEAT_SCRIPT_NOT_LOADED", reference_beat: "B3" });
        const words = await world(d, { enquiry: "when the mentor asks", beats: ["B1", "B2"] });
        expect(await timing(words.entry, q)).toMatchObject({ permitted: false, refusal: "REFERENCE_BEAT_NOT_STATED_AS_BEAT" });
        const stamped = await world(d, { enquiry: "at B2", beats: ["B1", "B2"] });
        expect(await timing(stamped.entry, q)).toMatchObject({ permitted: false, refusal: "BEAT_TIMESTAMP_MISSING" });
        await fx(`insert into t3a_d1_beat_timestamp(stage_entry_event_id, beat_code, recorded_at, duration_seconds, recorded_by) values ('${stamped.entry}','B2', now(), 5, '${stamped.p}')`);
        expect(await timing(stamped.entry, q)).toMatchObject({ permitted: true, timing_dependent: true, reference_beat: "B2" });
      } finally { await deregister(q); }
      expect(await field(q)).toBeNull();
    }
  });
  it("the governing field is the one registered for the question, not a fixed one", async () => {
    await register("Q-D2-76", "D2", "account_test_point");
    try {
      const w = await world("D2", { enquiry: "at B1", beats: [] });
      await fx(`update t3a_d1_content_version set body = jsonb_set(body, '{source_sheet}', (body->'source_sheet') || '{"account_test_point":"at B2"}'::jsonb) where content_version_id='${w.src.version}'`);
      expect(await timing(w.entry, "Q-D2-76")).toMatchObject({ permitted: false, refusal: "BEAT_SCRIPT_NOT_LOADED", reference_beat: "B2" });
    } finally { await deregister("Q-D2-76"); }
  });
  it("a question must belong to the dimension it is registered for, and name a field", async () => {
    await expect(register("Q-D1-76", "D2")).rejects.toThrow(/question_of_dimension/);
    await expect(register("Q-D2-75", "D2", "  ")).rejects.toThrow(/field_named/);
    await expect(register("Q-D2-75", "X2")).rejects.toThrow(/dimension_shape/);
  });
  it("only the service context writes the registry; anyone signed in reads it", async () => {
    const p = await mkParticipant(c, `reg-w-${RUN}`);
    const w = await asRole(c, "authenticated", p, `insert into t3a_timing_reference_field(question_code, dimension_id, source_sheet_field, note) values ('Q-D2-74','D2','enquiry_point','registry test')`);
    expect(w.msg).not.toBe("ok");
    expect((await asRole(c, "authenticated", p, `select count(*)::int r from t3a_timing_reference_field`)).r).toBeGreaterThanOrEqual(3);
    expect((await asRole(c, "service_role", null, `insert into t3a_timing_reference_field(question_code, dimension_id, source_sheet_field, note) values ('Q-D2-74','D2','enquiry_point','registry test') returning 1 r`)).msg).toBe("ok");
    await deregister("Q-D2-74");
  });
});

describe("the capture line refusals read the dimension's own capture sets", () => {
  const sel = (w: { entry: string; p: string }, dim: string, line: number, beat: string) =>
    c.query(`insert into t3a_d1_capture_selection(stage_entry_event_id, question_code, capture_set_code, beat_code, line_order, selected_by, dimension_id) values ('${w.entry}','Q-${dim}-02','C2','${beat}',${line},'${w.p}','${dim}')`);
  const lines = async (dim: string) => (await run(c, `select line_order::int n, is_whole_session_answer ws from t3a_d1_capture_line where dimension_id='${dim}' and capture_set_code='C2' order by line_order`)) as Array<{ n: number; ws: boolean }>;

  it("on every dimension a line is refused as a whole session line before the close beat exactly where that dimension's own set says it is one", async () => {
    const seen: Record<string, number[]> = {};
    for (const d of DIMS) {
      const ls = await lines(d);
      expect(ls.some((l) => l.ws), `${d} C2 has a whole session line`).toBe(true);
      seen[d] = ls.filter((l) => l.ws).map((l) => l.n);
      for (const l of ls) {
        const w = await world(d, { beats: ["B1", "B2", "B3", "B4"], bindings: [["B2", "C2", null], ["B4", "C2", "final"]] });
        if (l.ws) await expect(sel(w, d, l.n, "B2")).rejects.toThrow(/WHOLE_SESSION_ANSWER_BEFORE_CLOSE/);
        else await sel(w, d, l.n, "B2");
      }
      const w = await world(d, { beats: ["B1", "B2"], bindings: [["B2", "C2", null]] });
      await expect(sel(w, d, ls.length + 1, "B2")).rejects.toThrow(/CAPTURE_LINE_NOT_IN_SET/);
    }
    // the dimensions really differ, so a check that read D1's sets for everyone would be seen failing above
    expect(new Set(Object.values(seen).map((v) => v.join(","))).size).toBeGreaterThan(1);
  });
  it("on every dimension a final beat passed with its determination unanswered is refused by name, and permitted once its own whole session line is answered", async () => {
    for (const d of DIMS) {
      const ws = (await lines(d)).find((l) => l.ws)!.n;
      const w = await world(d, { beats: ["B1", "B2", "B3", "B4"], bindings: [["B2", "C2", null], ["B4", "C2", "final"]] });
      const adv = () => run(c, `select t3a_d1_beat_advance_permitted('${w.entry}','B4') r`).then((r) => r[0].r);
      expect(await adv()).toMatchObject({ permitted: false, refusal: "DETERMINATION_UNANSWERED_AT_CLOSING_BEAT", sets: "C2", beat_code: "B4" });
      await sel(w, d, ws, "B4");
      expect(await adv()).toMatchObject({ permitted: true });
    }
  });
});
