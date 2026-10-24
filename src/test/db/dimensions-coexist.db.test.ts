/**
 * D5, D8 and D9 on the shared functions (migration 20270230000000_shared_functions_d5_d8_d9.sql, CR-290 to CR-299).
 * The three dimensions were built side by side and each changed t3a_stage_form_check, t3a_dimension_compose, t3a_report_render_gate and t3a_prohibited_output_check.
 * These tests hold, on one database, that every one of those functions still carries every dimension's behaviour, and that one dimension's rule does not leak into another.
 * Throwaway database only; the rows added here are synthetic and removed again.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { asService, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let P: string;
const J = (o: unknown) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const Q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const version = async (id: string) => (await run(c, `select v.content_version_id v from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier='${id}'`))[0].v as string;
const compose = async (src: string, stage: number, answers: object, items: object = {}) => (await asService(c, `select t3a_dimension_compose('${P}','${src}','${stage}',${J(answers)},'{}'::jsonb,${J(items)},gen_random_uuid(),true) r`)).r;
const refusals = async (code: string) => (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code='${code}'`))[0].n as number;
const form = async (stage: string, dim: string, text: string, question_code = "Q-X") => (await run(c, `select t3a_stage_form_check('${stage}', ${J([{ statement_key: "ST-T", question_code, text }])}, '${dim}') r`))[0].r;
const out = async (dim: string, text: string) => (await run(c, `select t3a_prohibited_output_check('${dim}', ${Q(text)}) r`))[0].r as { passed: boolean; findings: { rule: string }[] };
const rules = (r: { findings: { rule: string }[] }) => r.findings.map((f) => f.rule);

const D5_NONE = { "Q-D5-01": "A3", "Q-D5-02": "A3", "Q-D5-03": "A3", "Q-D5-04": "A3", "Q-D5-05": "A4", "Q-D5-06": "A3", "Q-D5-07": "A3", "Q-D5-08": "A4", "Q-D5-09": "A4" };
const D5_BASE = { "Q-D5-01": "A1", "Q-D5-01b": "A1", "Q-D5-02": "A1", "Q-D5-02b": "A1", "Q-D5-03": "A1", "Q-D5-03b": "A1", "Q-D5-04": "A1", "Q-D5-04b": "A1", "Q-D5-05": "A1", "Q-D5-05b": "A1", "Q-D5-06": "A1", "Q-D5-06b": "A1", "Q-D5-07": "A1", "Q-D5-07b": "A1", "Q-D5-08": "A1", "Q-D5-09": "A1" };
const D5_ITEMS = { "Q-D5-01b": ["DP1"], "Q-D5-02b": ["DE1", "DE2"], "Q-D5-03b": ["SI1", "SI2"], "Q-D5-04b": ["AO1"], "Q-D5-05b": ["AO2"], "Q-D5-06b": ["AR1"], "Q-D5-07b": ["AC1", "AC2"] };
const D8_NONE = { "Q-D8-01": "A3", "Q-D8-02": "A3", "Q-D8-03": "A3", "Q-D8-04": "A3", "Q-D8-05": "A3", "Q-D8-06": "A4", "Q-D8-07": "A4", "Q-D8-08": "A3", "Q-D8-09": "A4" };
const D8_BASE = { "Q-D8-01": "A1", "Q-D8-01b": "A1", "Q-D8-02": "A1", "Q-D8-02b": "A1", "Q-D8-03": "A1", "Q-D8-03b": "A1", "Q-D8-04": "A1", "Q-D8-04b": "A1", "Q-D8-05": "A1", "Q-D8-05b": "A1", "Q-D8-06": "A1", "Q-D8-06b": "A1", "Q-D8-07": "A1", "Q-D8-07b": "A1", "Q-D8-08": "A1", "Q-D8-09": "A1" };
const D8_ITEMS = { "Q-D8-01b": ["CA1"], "Q-D8-02b": ["DF1"], "Q-D8-03b": ["CR1"], "Q-D8-04b": ["SU1"], "Q-D8-05b": ["CM1"], "Q-D8-06b": ["WP1"], "Q-D8-07b": ["RM1"] };
const D9_BASE = { "Q-D9-01": "A1", "Q-D9-01b": "A1", "Q-D9-02": "A1", "Q-D9-02b": "A1", "Q-D9-03": "A1", "Q-D9-03b": "A1", "Q-D9-04": "A1", "Q-D9-04b": "A1", "Q-D9-05": "A1", "Q-D9-05b": "A1", "Q-D9-06": "A1", "Q-D9-06b": "A1", "Q-D9-07": "A1", "Q-D9-07b": "A1", "Q-D9-08": "A1", "Q-D9-09": "A1" };
const D9_ITEMS = { "Q-D9-01b": ["IN1"], "Q-D9-02b": ["AC1"], "Q-D9-03b": ["RG1"], "Q-D9-04b": ["KS1", "KS2"], "Q-D9-05b": ["OP1"], "Q-D9-06b": ["TS1"], "Q-D9-07b": ["NW1"] };
const { "Q-D9-03b": _x, ...D9_ITEMS_NO03 } = D9_ITEMS;
const D9_RECORD = { ...Object.fromEntries(Object.entries(D9_BASE).filter(([k]) => k !== "Q-D9-03b")), "Q-D9-03": "A4" };

beforeAll(async () => { c = await connect(); P = await mkParticipant(c, "coexist-p"); });
afterAll(async () => {
  await run(c, `delete from t3a_entry_language_rule where note = 'SYNTHETIC TEST ONLY'`);
  await c.end();
});

describe("the four shared functions exist once, and carry each dimension's branch", () => {
  it("the stage form check reads the question bar of D4 and D5 and the verb lists of D8 and D9", async () => {
    const src = (await run(c, `select pg_get_functiondef('t3a_stage_form_check(text,jsonb,text)'::regprocedure) d`))[0].d as string;
    for (const needle of ["t3a_stage_form_question", "stage_codes", "t3a_stage_form_verb ", "t3a_stage_form_verb_dimension", "t3a_stage_form_dimension_verb"]) expect(src, needle).toContain(needle);
  });
  it("the composition carries the D5 Stage naming, the D8 gate and list rule, the D9 subject check and the canonical recurrence register", async () => {
    const src = (await run(c, `select pg_get_functiondef('t3a_dimension_compose(uuid,uuid,text,jsonb,jsonb,jsonb,uuid,boolean)'::regprocedure) d`))[0].d as string;
    for (const needle of ["at Stage ' || p_stage", "t3a_entry_language_gate", "served_question_needs_list", "t3a_entry_subject_check", "t3a_prohibited_output_check", "t3a_recurrence_excluded_entry_type"]) expect(src, needle).toContain(needle);
  });
  it("the render gate reads the one multi page register; the prohibited output check carries the D5 counterpart rule and the D8 state rule", async () => {
    const g = (await run(c, `select pg_get_functiondef('t3a_report_render_gate(uuid,text)'::regprocedure) d`))[0].d as string;
    expect(g).toContain("t3a_multipage_only_dimension");
    const p = (await run(c, `select pg_get_functiondef('t3a_prohibited_output_check(text,text)'::regprocedure) d`))[0].d as string;
    for (const needle of ["t3a_dimension_counterpart_rule", "t3a_counterpart_subject_hit", "t3a_entry_language_rule", "state_observation"]) expect(p, needle).toContain(needle);
  });
  it("the overlapping tables are one: the multi page register has a directive column, and the D5 record status table and the D8 rule codes are gone", async () => {
    const cols = (await run(c, `select column_name from information_schema.columns where table_name='t3a_multipage_only_dimension' order by 1`)).map((r) => r.column_name);
    expect(cols).toEqual(["dimension_id", "directive"]);
    expect((await run(c, `select to_regclass('public.t3a_record_status_no_recurrence') t`))[0].t).toBeNull();
    expect((await run(c, `select count(*)::int n from t3a_dimension_rule where rule_code in ('single_page_route_closed','record_status_never_recurs')`))[0].n).toBe(0);
  });
});

describe("D5 on the shared functions: the counterpart is never the subject", () => {
  it.each(["the colleague declined the proposal", "The other team refused", "the manager would not move", "the participant stated a position and the lead decides"])(
    "the prohibited output check refuses %s as counterpart_as_subject, and the scan logs it", async (text) => {
      const r = await out("D5", text);
      expect(r.passed).toBe(false); expect(rules(r)).toContain("counterpart_as_subject");
      const before = await refusals("counterpart_as_subject");
      await asService(c, `select t3a_rendered_output_scan('D5', ${Q(text)}, 'coexist-${text.length}') r`);
      expect(await refusals("counterpart_as_subject")).toBe(before + 1);
    });
  it("a sentence in which the participant is the subject passes the counterpart rule, and another dimension is not held to it", async () => {
    expect(rules(await out("D5", "the participant stated a position on the manager's proposal"))).not.toContain("counterpart_as_subject");
    expect(rules(await out("D4", "the colleague declined the proposal"))).not.toContain("counterpart_as_subject");
    expect(rules(await out("D8", "the colleague declined the proposal"))).not.toContain("counterpart_as_subject");
    expect(rules(await out("D9", "the colleague declined the proposal"))).not.toContain("counterpart_as_subject");
  });
  it("the route questions are barred at Stage 1 and Stage 3, and only there; a D4 question is barred at Stage 1 only", async () => {
    for (const st of ["1", "3"]) expect(await form(st, "D5", "the participant stated it", "Q-D5-06b"), st).toMatchObject({ outcome: "violation" });
    expect(await form("2", "D5", "the participant stated it", "Q-D5-06b")).toEqual({ outcome: "ok" });
    expect(await form("1", "D4", "the participant stated it", "Q-D4-07")).toMatchObject({ outcome: "violation" });
    expect(await form("3", "D4", "the participant stated it", "Q-D4-07")).toEqual({ outcome: "ok" });
  });
  it("composing at Stage 2 works and a record status pattern is a recurrence blocker at the clause instance; a conduct pattern is not", async () => {
    const s2 = await version("SRC-D5-S2-001");
    const rec = await compose(s2, 2, D5_NONE); const conduct = await compose(s2, 2, D5_BASE, D5_ITEMS);
    expect(rec.outcome).toBe("composed"); expect(conduct.outcome).toBe("composed");
    expect(rec.clause_instances.every((x: any) => x.recurrence_blocker === true)).toBe(true);
    expect(conduct.clause_instances.every((x: any) => x.recurrence_blocker === false)).toBe(true);
  });
});

describe("D8 on the shared functions: the participant's state is never the subject", () => {
  it("the prohibited output check names a state sentence as state_observation for D8 only", async () => {
    const r = await out("D8", "the participant seemed untroubled");
    expect(r.passed).toBe(false); expect(rules(r)).toContain("state_observation");
    for (const d of ["D4", "D5", "D9"]) expect(rules(await out(d, "the participant seemed untroubled")), d).not.toContain("state_observation");
  });
  it("the D8 verbs refuse at every Stage; D4 and D5 are not held to them at Stage 3", async () => {
    for (const st of ["1", "2", "3", "4"]) expect(await form(st, "D8", "the participant began it"), st).toMatchObject({ outcome: "violation", verb: "began" });
    expect(await form("3", "D4", "the participant began it")).toEqual({ outcome: "ok" });
    expect(await form("3", "D5", "the participant began it")).toEqual({ outcome: "ok" });
  });
  it("composing a D8 entry that matches a state pattern refuses state_observation and writes nothing; without the pattern it composes", async () => {
    const s2 = await version("SRC-D8-S2-001");
    await run(c, `insert into t3a_entry_language_rule(dimension_id, rule_code, pattern, note) values ('D8','state_observation','the situation made available','SYNTHETIC TEST ONLY')`);
    const before = await refusals("state_observation"); const rows0 = (await run(c, `select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}'`))[0].n;
    try { expect(await compose(s2, 2, D8_BASE, D8_ITEMS)).toMatchObject({ outcome: "refused", reason: "state_observation" }); }
    finally { await run(c, `delete from t3a_entry_language_rule where note='SYNTHETIC TEST ONLY'`); }
    expect(await refusals("state_observation")).toBe(before + 1);
    expect((await run(c, `select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}'`))[0].n).toBe(rows0);
    expect(await compose(s2, 2, D8_BASE, D8_ITEMS)).toMatchObject({ outcome: "composed" });
  });
  it("a record status pattern is a recurrence blocker for D8 at every clause", async () => {
    const rec = await compose(await version("SRC-D8-S2-001"), 2, D8_NONE);
    expect(rec.outcome).toBe("composed");
    expect(rec.clause_instances.map((x: any) => x.recurrence_blocker)).toEqual(new Array(9).fill(true));
  });
});

describe("D9 on the shared functions: the entry is a statement of the participant", () => {
  it("the subject check accepts a statement of the participant and refuses another subject, for D9 only", async () => {
    const chk = async (d: string, t: string) => (await run(c, `select t3a_entry_subject_check('${d}', ${Q(t)}) r`))[0].r;
    expect(await chk("D9", "the participant stated a source of knowledge")).toEqual({ outcome: "ok" });
    expect(await chk("D9", "the manager stated a source of knowledge")).toEqual({ outcome: "violation", rule: "capacity_observation" });
    expect(await chk("D8", "the manager stated a source of knowledge")).toEqual({ outcome: "ok" });
  });
  it("the D9 verbs refuse at every Stage; a D9 only verb is not a D8 verb, and a D8 only verb is not a D9 verb", async () => {
    for (const st of ["1", "2", "3", "4"]) expect(await form(st, "D9", "the participant tried it"), st).toMatchObject({ outcome: "violation", verb: "tried" });
    expect(await form("3", "D8", "the participant tried it")).toEqual({ outcome: "ok" });
    expect(await form("3", "D9", "the participant began it")).toEqual({ outcome: "ok" });
    expect(await form("3", "D4", "the participant tried it")).toEqual({ outcome: "ok" });
  });
  it("composing a D9 pattern works; with the first subject lead withdrawn every entry refuses capacity_observation and nothing is written; then it is restored", async () => {
    const s2 = await version("SRC-D9-S2-001");
    expect(await compose(s2, 2, D9_BASE, D9_ITEMS)).toMatchObject({ outcome: "composed" });
    const lead = "^the participant (stated|named) ";
    await c.query(`alter table t3a_entry_subject_lead disable trigger t3a_append_only`);
    await c.query(`delete from t3a_entry_subject_lead where dimension_id='D9' and lead_pattern = ${Q(lead)}`);
    const before = await refusals("capacity_observation"); const rows0 = (await run(c, `select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}'`))[0].n;
    try { expect(await compose(s2, 2, D9_BASE, D9_ITEMS)).toMatchObject({ outcome: "refused", reason: "capacity_observation" }); }
    finally {
      await c.query(`insert into t3a_entry_subject_lead(dimension_id, lead_pattern) values ('D9', ${Q(lead)}) on conflict do nothing`);
      await c.query(`alter table t3a_entry_subject_lead enable trigger t3a_append_only`);
    }
    expect(await refusals("capacity_observation")).toBe(before + 1);
    expect((await run(c, `select count(*)::int n from t3a_dimension_composed_statement where participant_id='${P}'`))[0].n).toBe(rows0);
    expect(await compose(s2, 2, D9_BASE, D9_ITEMS)).toMatchObject({ outcome: "composed" });
  });
  it("a D9 record status entry (ST-D9-014) is a recurrence blocker and the conduct entries beside it are not", async () => {
    const r = await compose(await version("SRC-D9-S2-001"), 2, D9_RECORD, D9_ITEMS_NO03);
    expect(r.outcome).toBe("composed");
    const by = Object.fromEntries(r.clause_instances.map((x: any) => [x.state_code, x.recurrence_blocker]));
    expect(by["ST-D9-014"]).toBe(true);
    expect(Object.entries(by).filter(([k]) => k !== "ST-D9-014").every(([, v]) => v === false)).toBe(true);
  });
});

describe("the single page route is closed for D4, D5, D8 and D9 through the one register", () => {
  let st: string;
  const mk = async (dims: string[], spec: boolean) => (await run(c, `insert into t3a_d1_ber_report(participant_id, dimension_id, status, version_set, specimen_render_flag, report_type, ber_status, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, preview_state, report_preview_digest, report_content_digest, verification_code) values ('${P}','D1','${st}','{}'::jsonb, ${spec}, 'ber', 'participant_review', array[${dims.map((d) => `'${d}'`).join(",")}], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text) returning ber_report_id r`))[0].r as string;
  const gate = async (id: string, f: string) => (await run(c, `select t3a_report_render_gate('${id}','${f}') r`))[0].r;
  beforeAll(async () => {
    st = (await run(c, `select (enum_range(null::${(await run(c, `select udt_name u from information_schema.columns where table_name='t3a_d1_ber_report' and column_name='status'`))[0].u}))[1] s`))[0].s;
  });
  it("the register lists exactly D4, D5, D8 and D9", async () => {
    expect((await run(c, `select dimension_id from t3a_multipage_only_dimension order by 1`)).map((r) => r.dimension_id)).toEqual(["D4", "D5", "D8", "D9"]);
  });
  it.each(["D4", "D5", "D8", "D9"])("a %s only report, even a specimen, refuses the single page route naming the dimension; the multi page route takes it", async (d) => {
    const id = await mk([d], true); const before = await refusals("format_mismatch");
    const r = await gate(id, "one_page");
    expect(r).toMatchObject({ reason: "format_mismatch" }); expect(r.detail).toContain(`a ${d} report`);
    expect(await refusals("format_mismatch")).toBe(before + 1);
    expect(await gate(id, "multi_page")).toMatchObject({ outcome: "renderable" });
  });
  it("a report that carries one of them beside D1 refuses too, and a D1 only specimen still renders on one page", async () => {
    for (const d of ["D4", "D5", "D8", "D9"]) expect(await gate(await mk(["D1", d], true), "one_page"), d).toMatchObject({ reason: "format_mismatch" });
    expect(await gate(await mk(["D1"], true), "one_page")).toMatchObject({ outcome: "renderable" });
    expect(await gate(await mk(["D1"], false), "one_page")).toMatchObject({ reason: "format_mismatch" });
    expect(await gate(await mk(["D1", "D2"], true), "one_page")).toMatchObject({ reason: "layout_overflow" });
  });
});

describe("one canonical register of entry types that carry no conduct toward recurrence", () => {
  it("D5, D8 and D9 each have their record status row, and no other dimension has one", async () => {
    const rows = await run(c, `select dimension_id, entry_type from t3a_recurrence_excluded_entry_type order by 1, 2`);
    expect(rows).toEqual([{ dimension_id: "D5", entry_type: "record_status" }, { dimension_id: "D8", entry_type: "record_status" }, { dimension_id: "D9", entry_type: "record_status" }]);
  });
  it("the register is append only", async () => {
    expect((await asService(c, `delete from t3a_recurrence_excluded_entry_type where dimension_id='D5'`)).msg).toMatch(/NO_UPDATE|append|T3A_|permission/i);
  });
  it("D4 is untouched: only the two library blockers are blockers", async () => {
    expect((await run(c, `select statement_key from t3a_d1_statement_library where dimension_id='D4' and recurrence_blocker order by 1`)).map((r) => r.statement_key)).toEqual(["ST-D4-010", "ST-D4-015"]);
  });
});
