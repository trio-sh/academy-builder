/**
 * D8 Execution Edition v2.1: the guards D8 adds to the shared machinery (migration 20270211). Throwaway database only; every source and rule row here is synthetic and removed again.
 *   - Sections 3.2, 5.2, 5.5 and test D8-69: a source that crosses the state boundary is refused at load and logs state_observation.
 *   - Test D8-68: who_knows and decision_origin are held for source truth and are in no body that a screen or a response reads.
 *   - Section 5.7 and test D8-61: the statement form holds at every Stage, for D8 only.
 *   - Sections 5.7, 5.14 and test D8-64: an entry whose subject is the participant's state is refused before it is written.
 *   - Section 5.10 and test D8-17: an entry that describes the record never counts toward recurrence, and no D8 entry carries the blocker flag.
 *   - Directive D-07 and test D8-67: the single page route is closed to D8, even for a specimen.
 *   - Section 5.5 and tests D8-04, D8-54: a served question whose list is empty on the source cannot compose.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let P: string;
const J = (o: unknown) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const refused = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n as number;
const version = async (id: string) => (await run(c, `select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`))[0].v as string;
const compose = async (src: string, stage: number, answers: object, items: object = {}) => (await asService(c, `select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},'{}'::jsonb,${J(items)},gen_random_uuid(),true) r`)).r;
const ANS = { "Q-D8-01": "A1", "Q-D8-01b": "A1", "Q-D8-02": "A1", "Q-D8-02b": "A1", "Q-D8-03": "A1", "Q-D8-03b": "A1", "Q-D8-04": "A1", "Q-D8-04b": "A1", "Q-D8-05": "A1", "Q-D8-05b": "A1", "Q-D8-06": "A1", "Q-D8-06b": "A1", "Q-D8-07": "A1", "Q-D8-07b": "A1", "Q-D8-08": "A1", "Q-D8-09": "A1" };
const ITEMS = { "Q-D8-01b": ["CA1"], "Q-D8-02b": ["DF1"], "Q-D8-03b": ["CR1"], "Q-D8-04b": ["SU1"], "Q-D8-05b": ["CM1"], "Q-D8-06b": ["WP1"], "Q-D8-07b": ["RM1"] };
const NONE = { "Q-D8-01": "A3", "Q-D8-02": "A3", "Q-D8-03": "A3", "Q-D8-04": "A3", "Q-D8-05": "A3", "Q-D8-06": "A4", "Q-D8-07": "A4", "Q-D8-08": "A3", "Q-D8-09": "A4" };
const goodSheet = () => ({ d8_situation_class: "SC-D8-1", setback_established: "In the situation: x", available_supports: [{ id: "SU1", text: "the manager who asked for the note" }], containment_actions: [{ id: "CA1", text: "confirm what was published" }], recurrence_measures: [{ id: "RM1", text: "a second check before release" }] });
let n = 0;
/** A D8 source version inserted raw: a refused load leaves no version row. */
async function load(sheet: object) {
  const id = `SRC-D8-T-${++n}-${RUN}`;
  await run(c, `insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${id}','source','${id}','D8','not_loaded')`);
  const body = { source_identifier: id, stage_code: "S2", source_version_hash: "a".repeat(64), source_sheet: sheet, title: id };
  await run(c, `insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(body)} from t3a_content_object where identifier='${id}'`);
  return (await run(c, `select v.content_version_id v, v.body b from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`)) as { v: string; b: any }[];
}

beforeAll(async () => { c = await connect(); P = await mkParticipant(c, "d8bnd-p"); });
afterAll(async () => { await run(c, `delete from t3a_stage_form_verb_dimension where note = 'SYNTHETIC TEST ONLY'`); await run(c, `delete from t3a_entry_language_rule where note = 'SYNTHETIC TEST ONLY'`); await run(c, `delete from t3a_rce_prohibited_vocabulary where version = 'PV-D8-TEST'`); await c.end(); });

describe("D8-69 the state boundary at load", () => {
  it("a clean source loads", async () => { expect(await load(goodSheet())).toHaveLength(1); });
  it.each([["participant_reaction", "none"], ["participant_state", "calm"], ["bearing_notes", "steady"], ["emotional_response", "x"]])("a sheet field for the participant's response, state or bearing (%s) refuses the source and logs state_observation", async (field, value) => {
    const before = await refused("state_observation");
    expect(await load({ ...goodSheet(), [field]: value })).toHaveLength(0);
    expect(await refused("state_observation")).toBe(before + 1);
  });
  it("a field that is not declared and is not about the participant's state refuses as source_field_not_declared", async () => {
    const before = await refused("source_field_not_declared");
    expect(await load({ ...goodSheet(), owner_note: "x" })).toHaveLength(0);
    expect(await refused("source_field_not_declared")).toBe(before + 1);
  });
  it.each([["available_supports", "reassurance from the manager"], ["available_supports", "a day off to rest"], ["containment_actions", "feel calmer before replying"], ["recurrence_measures", "encouragement from the team"], ["available_supports", "someone to talk to about how you are doing"]])("a %s item that names a state, a feeling or a personal need (%s) refuses the source", async (family, text) => {
    const before = await refused("state_observation");
    expect(await load({ ...goodSheet(), [family]: [{ id: "X1", text }] })).toHaveLength(0);
    expect(await refused("state_observation")).toBe(before + 1);
  });
  it("work recovery is not a state: a recovery site and recovered units load", async () => {
    expect(await load({ ...goodSheet(), recurrence_measures: [{ id: "RM1", text: "the recovery site checked annually" }, { id: "RM2", text: "trace and recover the shipped units" }] })).toHaveLength(1);
  });
  it("all 34 loaded D8 sources were accepted by the guard", async () => {
    expect((await run(c, `select count(*)::int n from t3a_content_object where identifier ~ '^SRC-D8-S[1-4]-0'`))[0].n).toBe(34);
    expect((await run(c, `select count(*)::int n from t3a_capture_refusal where route='source.load' and subject_ref ~ '^SRC-D8-S[1-4]-0'`))[0].n).toBe(0);
  });
  it("another dimension is not held to the D8 list of fields", async () => {
    const id = `SRC-D4-T-${RUN}`;
    await run(c, `insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${id}','source','${id}','D4','not_loaded')`);
    await run(c, `insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J({ source_identifier: id, stage_code: "S2", source_sheet: { d4_situation_class: "SC-D4-1", participant_reaction: "x" } })} from t3a_content_object where identifier='${id}'`);
    expect((await run(c, `select count(*)::int n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`))[0].n).toBe(1);
  });
});

describe("D8-68 source truth is withheld from every body", () => {
  it("who_knows and decision_origin leave the stored body and are kept in the truth table, which only the service role reads", async () => {
    const [v] = await load({ ...goodSheet(), who_knows: "The overnight monitor and the manager.", decision_origin: "The selection committee." });
    expect(JSON.stringify(v.b)).not.toMatch(/who_knows|decision_origin|overnight monitor|selection committee/);
    expect((await asService(c, `select t3a_source_truth('${v.v}') r`)).r).toEqual({ who_knows: "The overnight monitor and the manager.", decision_origin: "The selection committee." });
    expect((await asRole(c, "authenticated", P, `select count(*) r from t3a_source_truth_field`)).msg).toMatch(/permission denied/);
    expect((await asRole(c, "authenticated", P, `select t3a_source_truth('${v.v}') r`)).msg).toMatch(/permission denied/);
  });
  it("no D8 source body and no database routine carries either field, and the 34 sources keep both for source truth", async () => {
    expect((await run(c, `select count(*)::int n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.family::text='source' and o.dimension_id='D8' and v.body::text ~ 'who_knows|decision_origin'`))[0].n).toBe(0);
    expect((await run(c, `select count(*)::int n from pg_proc where pronamespace='public'::regnamespace and prosrc ~ 'who_knows|decision_origin'`))[0].n).toBe(0);
    expect((await run(c, `select count(distinct source_version_id)::int n from t3a_source_truth_field t join t3a_d1_content_version v on v.content_version_id=t.source_version_id join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D8-S[1-4]-0'`))[0].n).toBe(34);
  });
  it("the truth table is append only", async () => {
    expect((await asService(c, `update t3a_source_truth_field set field_value = '"x"'::jsonb`)).msg).toMatch(/NO_UPDATE|append|T3A_|permission/i);
  });
});

describe("D8-61 the statement form holds at every Stage, for D8 only", () => {
  const check = async (stage: string, text: string, dim = "D8") => (await run(c, `select t3a_stage_form_check('${stage}', ${J([{ statement_key: "ST-T", text }])}, '${dim}') r`))[0].r;
  it.each(["1", "2", "3", "4"])("took, acted, sought, performed, applied and carried out refuse at Stage %s", async (stage) => {
    for (const v of ["took", "acted", "sought", "performed", "applied", "carried out"]) expect(await check(stage, `the participant ${v} it`), v).toMatchObject({ outcome: "violation", verb: v });
    expect(await check(stage, "the participant stated a containment action")).toEqual({ outcome: "ok" });
  });
  it("D4 keeps the Stage 1 rule and is not held to the D8 rule at Stage 3", async () => {
    expect(await check("3", "the participant took it", "D4")).toEqual({ outcome: "ok" });
    expect(await check("1", "the participant took it", "D4")).toMatchObject({ outcome: "violation" });
  });
  it("composing at every Stage with a verb present refuses and logs stage_form_violation (a verb of a real entry is added for the test)", async () => {
    await run(c, `insert into t3a_stage_form_verb_dimension(dimension_id, verb, note) values ('D8','stated','SYNTHETIC TEST ONLY')`);
    try {
      let before = await refused("stage_form_violation");
      for (const [id, st] of [["SRC-D8-S1-001", 1], ["SRC-D8-S2-001", 2], ["SRC-D8-S3-001", 3], ["SRC-D8-S4-001", 4]] as const) {
        const r = await compose(await version(id), st, st === 3 ? (({ "Q-D8-09": _x, ...rest }) => rest)(ANS) : ANS, ITEMS);
        expect(r, id).toMatchObject({ outcome: "refused", reason: "stage_form_violation" });
        expect((await run(c, `select detail from t3a_capture_refusal where reason_code='stage_form_violation' order by 1 desc limit 1`)).length).toBe(1);
        expect((await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='stage_form_violation' and detail like '%at Stage ${st}'`))[0].n).toBeGreaterThan(0);
        before += 1; expect(await refused("stage_form_violation")).toBe(before);
      }
    } finally { await run(c, `delete from t3a_stage_form_verb_dimension where note='SYNTHETIC TEST ONLY'`); }
    expect(await compose(await version("SRC-D8-S2-001"), 2, ANS, ITEMS)).toMatchObject({ outcome: "composed" });
  });
});

describe("D8-64 an entry whose subject is the participant's state refuses before it is written", () => {
  const gate = async (dim: string, text: string) => (await run(c, `select t3a_entry_language_gate('${dim}', ${J([{ statement_key: "ST-T", text }])}) g`))[0].g;
  it.each([
    "the participant was calm", "the participant seemed untroubled", "the participant showed no sign of being affected", "the participant remained composed throughout", "the participant appeared to take it in stride",
    "without apparent difficulty the participant named a fact", "the participant was unaffected",
  ])("%s is refused as state_observation", async (text) => { expect(await gate("D8", text)).toMatchObject({ outcome: "violation" }); });
  const CROSS = ["owned", "caused", "blamed", "prioritized", "verified", "proposed", "agreed", "learned", "realized"];
  const ACTS = ["took", "acted", "sought", "performed", "applied", "carried out"]; const ABSOLUTES = ["will", "would", "tends to", "always", "never", "likely"];
  it("Section 5.7a is sorted by what each word claims: nine words of other dimensions are cross_dimension_assertion, the performed acts and absolutes are not state claims, and the other 42 are state_observation", async () => {
    const words: { word: string; reason: string | null }[] = await run(c, `select word, reason from t3a_rce_prohibited_vocabulary where dimension_id='D8' and version='PV-D8-1.0'`);
    expect(words).toHaveLength(63);
    for (const w of words) {
      const g = await gate("D8", `the participant stated it ${w.word} twice`);
      if (CROSS.includes(w.word)) expect(g, w.word).toMatchObject({ outcome: "violation", reason: "cross_dimension_assertion" });
      else if (ACTS.includes(w.word) || ABSOLUTES.includes(w.word)) expect(g, w.word).toEqual({ outcome: "ok" });
      else expect(g, w.word).toMatchObject({ outcome: "violation", reason: "state_observation" });
    }
    expect(words.filter((w) => w.reason === "state_observation")).toHaveLength(42);
  });
  it("an entry of the library, which records what was stated or named, passes; D4 is not held to the gate", async () => {
    expect(await gate("D8", "the participant stated a containment action from those the situation made available")).toEqual({ outcome: "ok" });
    expect(await gate("D4", "the participant was unaffected")).toEqual({ outcome: "ok" });
  });
  it("every one of the 44 library entries passes the gate and the scan", async () => {
    const bad = await run(c, `select statement_key from t3a_d1_statement_library where dimension_id='D8' and ((t3a_entry_language_gate('D8', jsonb_build_array(jsonb_build_object('statement_key', statement_key, 'text', statement_body))) ->> 'outcome') <> 'ok' or (t3a_prohibited_output_check('D8', statement_body) ->> 'passed')::boolean is not true)`);
    expect(bad).toEqual([]);
  });
  it("a composition whose entry matches a state pattern refuses with state_observation and writes nothing", async () => {
    await run(c, `insert into t3a_entry_language_rule(dimension_id, rule_code, pattern, note) values ('D8','state_observation','the situation made available','SYNTHETIC TEST ONLY')`);
    const before = await refused("state_observation"); const rows0 = (await run(c, `select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}'`))[0].n;
    try { expect(await compose(await version("SRC-D8-S2-001"), 2, ANS, ITEMS)).toMatchObject({ outcome: "refused", reason: "state_observation" }); }
    finally { await run(c, `delete from t3a_entry_language_rule where note='SYNTHETIC TEST ONLY'`); }
    expect(await refused("state_observation")).toBe(before + 1);
    expect((await run(c, `select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}'`))[0].n).toBe(rows0);
  });
  it("a composition with a word of another dimension refuses with cross_dimension_assertion", async () => {
    await run(c, `insert into t3a_rce_prohibited_vocabulary(dimension_id, word, version, reason) values ('D8','situation','PV-D8-TEST','cross_dimension_assertion')`);
    try { expect(await compose(await version("SRC-D8-S2-001"), 2, ANS, ITEMS)).toMatchObject({ outcome: "refused", reason: "cross_dimension_assertion" }); }
    finally { await run(c, `delete from t3a_rce_prohibited_vocabulary where version='PV-D8-TEST'`); }
  });
});

describe("D8-17 an entry that describes the record carries no conduct toward recurrence", () => {
  it("no D8 entry carries recurrence_blocker, yet every clause of a record status pattern is marked and none of a conduct pattern is", async () => {
    expect((await run(c, `select count(*)::int n from t3a_d1_statement_library where dimension_id='D8' and recurrence_blocker`))[0].n).toBe(0);
    const s2 = await version("SRC-D8-S2-001");
    const rec = await compose(s2, 2, NONE); const conduct = await compose(s2, 2, ANS, ITEMS);
    expect(rec.outcome).toBe("composed"); expect(conduct.outcome).toBe("composed");
    expect(rec.clause_instances.map((x: any) => x.recurrence_blocker)).toEqual(new Array(9).fill(true));
    expect(conduct.clause_instances.every((x: any) => x.recurrence_blocker === false)).toBe(true);
  });
  it("other dimensions are untouched: a D4 record status entry is marked only where its library says so", async () => {
    expect((await run(c, `select count(*)::int n from t3a_dimension_rule where rule_code='record_status_never_recurs' and dimension_id <> 'D8'`))[0].n).toBe(0);
  });
});

describe("D8-67 the single page route is closed to D8", () => {
  it("a report that carries D8 refuses the single page, even as a specimen; D1 and D3 alone still fail for their size", async () => {
    const st = (await run(c, `select (enum_range(null::${(await run(c, `select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
    const mk = async (dims: string[], spec: boolean) => (await run(c, `insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${P}','D1','${st}','{}'::jsonb, ${spec}, 'ber', 'participant_review', array[${dims.map((d) => `'${d}'`).join(",")}], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r as string;
    const gate = async (id: string, form: string) => (await run(c, `select t3a_report_render_gate('${id}','${form}') r`))[0].r;
    const d8 = await mk(["D8"], true); const d13 = await mk(["D1", "D3"], true);
    expect(await gate(d8, "one_page")).toMatchObject({ reason: "format_mismatch" });
    expect(await gate(d8, "multi_page")).toMatchObject({ outcome: "renderable" });
    expect(await gate(d13, "one_page")).toMatchObject({ reason: "layout_overflow" });
  });
});

describe("D8-04 and D8-54 a served question needs its list", () => {
  async function variant(mutate: (b: any) => void) {
    const base = (await run(c, `select v.body b from t3a_d1_content_version v where v.content_version_id='${await version("SRC-D8-S2-001")}'`))[0].b; const b = JSON.parse(JSON.stringify(base));
    b.source_identifier = `SRC-D8-V-${++n}-${RUN}`; mutate(b);
    await run(c, `insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values ('${b.source_identifier}','source','v','D8','not_loaded')`);
    return (await run(c, `insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1','drafting','not_loaded',${J(b)} from t3a_content_object where identifier='${b.source_identifier}' returning content_version_id v`))[0].v as string;
  }
  it("a source that serves Q-D8-07 while recurrence_measures is empty refuses BOUND_FAMILY_ABSENT_OR_EMPTY, whatever the answers, even when the answer would never reach the child", async () => {
    const v = await variant((b) => { b.source_sheet.recurrence_measures = []; });
    const before = await refused("BOUND_FAMILY_ABSENT_OR_EMPTY");
    const { ["Q-D8-07b"]: _c, ...items } = ITEMS as any; const { ["Q-D8-07b"]: _d, ...ans } = ANS as any;
    expect(await compose(v, 2, { ...ans, "Q-D8-07": "A3" }, items)).toMatchObject({ outcome: "refused", reason: "BOUND_FAMILY_ABSENT_OR_EMPTY" });
    expect(await compose(v, 2, ANS, ITEMS)).toMatchObject({ outcome: "refused", reason: "BOUND_FAMILY_ABSENT_OR_EMPTY" });
    expect(await refused("BOUND_FAMILY_ABSENT_OR_EMPTY")).toBe(before + 2);
  });
  it("the same source with the list present composes, so the refusal is the empty list and nothing else", async () => {
    const v = await variant((b) => { b.source_sheet.recurrence_measures = [{ id: "RM1", text: "a second check before release" }]; });
    expect(await compose(v, 2, ANS, ITEMS)).toMatchObject({ outcome: "composed" });
  });
  it("a source that marks Q-D8-07 and Q-D8-07b NOT SERVED because its list is empty composes the rest and writes no recurrence row; an answer for them refuses", async () => {
    const v = await variant((b) => { b.source_sheet.recurrence_measures = []; b.question_applicability = b.question_applicability.map((x: any) => (/Q-D8-07/.test(x.question) ? { ...x, state: "NOT SERVED" } : x)); });
    const { ["Q-D8-07"]: _a, ["Q-D8-07b"]: _b, ...rest } = ANS as any; const { ["Q-D8-07b"]: _c, ...items } = ITEMS as any;
    const ok = await compose(v, 2, rest, items);
    expect(ok.outcome).toBe("composed"); expect(ok.clauses.some((x: any) => /Q-D8-07/.test(x.question_code))).toBe(false);
    expect(await compose(v, 2, ANS, ITEMS)).toMatchObject({ outcome: "refused", reason: "answer_for_question_not_served" });
  });
  it("Q-D8-09 is not served at Stage 3 on any real Stage 3 source: an answer refuses and no row is written", async () => {
    const rows = await run(c, `select o.identifier, v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D8-S3-0'`);
    expect(rows).toHaveLength(8);
    for (const r of rows) expect(await compose(r.v, 3, ANS, ITEMS), r.identifier).toMatchObject({ reason: "answer_for_question_not_served" });
  });
});
