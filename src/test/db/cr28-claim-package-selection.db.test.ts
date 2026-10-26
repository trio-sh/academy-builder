/** CORR-007 Rev 1.6 rule CR-28: one claim package per dimension on a multi page report, chosen by a fixed, versioned rule (CR-28-T1 to T4). Synthetic people and sources; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { RUN, asRole, asService, connect, mkApprovedSource, mkParticipant, retireFixtureSources, run, type SourceFixture } from "./helpers";

let c: pg.Client; let reviewer: string; let seq = 0; let clock = 0;
const as = (u: string, sql: string) => asRole(c, "authenticated", u, sql);
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
const j = (o: unknown) => `'${JSON.stringify(o).replace(/'/g, "''")}'::jsonb`;
const setCfg = (k: string, v: string) => run(c, `insert into t3a_configuration_value(configuration_key, configuration_value, configuration_version, set_by) values ('${k}', $v$${v}$v$, '8.${++clock}', '${reviewer}')`);
const src = (stage: "S1" | "S2" = "S2") => mkApprovedSource(c, { dimension: "D2", stage, situationClass: `SC-D2-${(++seq % 6) + 1}`, reviewer });
const relate = (a: SourceFixture, b: SourceFixture) => { const [x, y] = a.version < b.version ? [a.version, b.version] : [b.version, a.version];
  return run(c, `insert into t3a_cross_context_relationship(dimension_id, source_version_a, source_version_b, approved_by) values ('D2','${x}','${y}','${reviewer}') on conflict do nothing`); };
type Clause = { code: string; text: string; ce: string; key: string };
/** One committed observation with one composed statement carrying the given clauses; composed `ago` seconds ago. */
async function stmt(dim: string, p: string, stage: string, s: SourceFixture, observer: string, clauses: Clause[], ago = 0) {
  const o = (await run(c, `insert into t3a_observation_record(participant_id, dimension_id, stage_code, observer_id, is_committed) values ('${p}','${dim}','${stage}','${observer}', true) returning observation_record_id i`))[0].i;
  return (await run(c, `insert into t3a_dimension_composed_statement(dimension_id, observation_ref, participant_id, stage_code, source_version_id, answers, clauses, clause_instances, conditions, composed_at)
    values ('${dim}','${o}','${p}','${stage}','${s.version}','{}'::jsonb,${j(clauses.map((x) => ({ state_code: x.code, clause_text: x.text, entry_type: "conduct_bearing" })))},${j(clauses.map((x) => ({ conduct_element_id: x.ce, recurrence_equivalence_key_id: x.key, state_code: x.code, recurrence_blocker: false })))},'[]'::jsonb, now() - interval '${ago} seconds') returning composed_statement_id i`))[0].i as string;
}
const select = (p: string, d: string) => asService(c, `select t3a_cr28_select_entry('${p}','${d}',false) r`).then((x) => x.r);
const ber = async (p: string, dims: string[], extra = "") => (await (extra.includes("issued_at") ? run(c, `insert into t3a_d1_ber_report(participant_id, dimension_id, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag ${extra ? "," + extra.split("=")[0] : ""}) values ('${p}','${dims[0]}',array[${dims.map((d) => `'${d}'`).join(",")}]::text[], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false ${extra ? "," + extra.split("=")[1] : ""}) returning ber_report_id b`) : fx(`insert into t3a_d1_ber_report(participant_id, dimension_id, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${p}','${dims[0]}',array[${dims.map((d) => `'${d}'`).join(",")}]::text[], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false) returning ber_report_id b`)))[0].b as string;

beforeAll(async () => { c = await connect(); await retireFixtureSources(c); reviewer = await mkParticipant(c, `cr28-rev-${RUN}`); await setCfg("recurrence_config_locked", "locked"); await setCfg("evidence_currency", "6"); });
afterAll(async () => { await setCfg("evidence_currency", ""); await setCfg("claim_package_rule_version", "1.0"); await setCfg("recurrence_config_locked", "unlocked"); await c.end(); });

describe("CR-28 the selection rule", () => {
  async function recurrenceWorld() {
    const p = await mkParticipant(c, `cr28-p-${++seq}-${RUN}`); const m1 = await mkParticipant(c, `cr28-m1-${seq}-${RUN}`, "mentor"); const m2 = await mkParticipant(c, `cr28-m2-${seq}-${RUN}`, "mentor");
    const [a, b, d, e, f, g] = [await src(), await src(), await src(), await src(), await src(), await src()];
    for (const [x, y] of [[a, b], [a, d], [b, d]] as const) await relate(x, y);
    const R = (t: string): Clause => ({ code: "ST-D2-001", text: t, ce: "CE-R", key: "REK-REC" });
    const ids = [await stmt("D2", p, "S2", a, m1, [R("recurring clause A")], 60), await stmt("D2", p, "S3", b, m2, [R("recurring clause B")], 50), await stmt("D2", p, "S4", d, m1, [R("recurring clause C")], 40)];
    for (const [i, s] of [e, f, g].entries()) ids.push(await stmt("D2", p, "S2", s, i % 2 ? m1 : m2, [{ code: `ST-D2-10${i}`, text: `single observation clause ${i}`, ce: `CE-${i}`, key: `REK-SINGLE-${i}` }], 10 - i));
    return { p, ids };
  }
  it("T1: a dimension with a recurrence clause and three single observation clauses: the recurrence clause is selected, the others stay in the record, and the rule version is recorded on the issued report", async () => {
    const { p } = await recurrenceWorld();
    const r = await select(p, "D2");
    expect(r).toMatchObject({ outcome: "selected", dimension_id: "D2", rule_version: "1.0", selected: { k: "REK-REC", state_code: "ST-D2-001", rec: true } });
    expect(r.other_entries.length).toBeGreaterThanOrEqual(3);
    expect(r.other_entries.filter((x: any) => x.k.startsWith("REK-SINGLE")).map((x: any) => x.rec)).toEqual([false, false, false]);
    const rep = await ber(p, ["D2"]);
    await run(c, `update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep}'`);
    expect((await run(c, `select claim_package_rule_version v from t3a_d1_ber_report where ber_report_id='${rep}'`))[0].v).toBe("1.0");
    await setCfg("claim_package_rule_version", "1.1");
    const rep2 = await ber(p, ["D2"], "issued_at=now()");
    expect((await run(c, `select ber_report_id, claim_package_rule_version v from t3a_d1_ber_report where ber_report_id in ('${rep}','${rep2}') order by issued_at`)).map((x) => x.v)).toEqual(["1.0", "1.1"]);   // an earlier report keeps the version it was issued under
    await setCfg("claim_package_rule_version", "1.0");
  });
  it("with the rule unloaded nothing is selected and no report is issued", async () => {
    const { p } = await recurrenceWorld(); const rep = await ber(p, ["D2"]);
    await setCfg("claim_package_rule_version", "");
    expect(await select(p, "D2")).toEqual({ outcome: "refused", reason: "claim_package_rule_unloaded" });
    await expect(c.query(`update t3a_d1_ber_report set issued_at = now() where ber_report_id='${rep}'`)).rejects.toThrow(/CLAIM_PACKAGE_RULE_UNLOADED/);
    expect((await run(c, `select issued_at, claim_package_rule_version v from t3a_d1_ber_report where ber_report_id='${rep}'`))[0]).toEqual({ issued_at: null, v: null });
    await setCfg("claim_package_rule_version", "1.0");
  });
  it("T2: no recurrence clause and two composed statements: the earliest conduct bearing clause of the latest statement is selected, whatever the clause says", async () => {
    for (const [first, second] of [["a favourable-sounding clause", "an unfavourable-sounding clause"], ["an unfavourable-sounding clause", "a favourable-sounding clause"]]) {
      const p = await mkParticipant(c, `cr28-p-${++seq}-${RUN}`); const m1 = await mkParticipant(c, `cr28-m1-${seq}-${RUN}`, "mentor"); const m2 = await mkParticipant(c, `cr28-m2-${seq}-${RUN}`, "mentor");
      const [a, b] = [await src(), await src()];
      await stmt("D3", p, "S2", a, m1, [{ code: "ST-D3-001", text: "older statement clause", ce: "CE-1", key: "REK-OLD" }], 100);
      await stmt("D3", p, "S3", b, m2, [{ code: "ST-D3-009", text: second, ce: "CE-B", key: "REK-N2" }, { code: "ST-D3-008", text: first, ce: "CE-A", key: "REK-N1" }], 5);
      const r = await select(p, "D3");
      expect(r.selected).toMatchObject({ ce: "CE-A", state_code: "ST-D3-008", clause_text: first, rec: false });
      expect(r.other_entries.map((x: any) => x.ce)).toEqual(["CE-B", "CE-1"]);
    }
  });
  it("T3: the participant's review before issue shows the entry selected for each dimension and every other entry; no one else sees it", async () => {
    const { p } = await recurrenceWorld(); const m1 = await mkParticipant(c, `cr28-m1-${++seq}-${RUN}`, "mentor"); const x = await src();
    await stmt("D3", p, "S2", x, m1, [{ code: "ST-D3-001", text: "d3 clause", ce: "CE-1", key: "REK-D3" }], 1);
    const rep = await ber(p, ["D2", "D3"]); const other = await mkParticipant(c, `cr28-o-${seq}-${RUN}`);
    const rv = (await as(p, `select t3a_cr28_review('${rep}') r`)).r;
    expect(rv).toMatchObject({ outcome: "review", rule_version: "1.0", issued_rule_version: null });
    // order-free: the case review runs this on other dimensions, where the two sort the other way
    expect(rv.dimensions.map((d: any) => [d.dimension_id, d.selected.k]).sort()).toEqual([["D2", "REK-REC"], ["D3", "REK-D3"]].sort());
    expect(rv.dimensions.find((d: any) => d.selected.k === "REK-REC").other_entries.length).toBeGreaterThanOrEqual(3);
    expect((await as(other, `select t3a_cr28_review('${rep}') r`)).r).toEqual({ outcome: "refused", reason: "REPORT_NOT_AVAILABLE" });
    expect((await as(p, `select t3a_cr28_select_entry('${p}','D2',false)`)).msg).toMatch(/permission denied/i);
  });
  it("the review's selection is the one the multi page claim package uses", async () => {
    const { p } = await recurrenceWorld(); const rep = await ber(p, ["D2"], "issued_at=now()");
    await run(c, `update t3a_d1_ber_report set status = 'issued' where ber_report_id='${rep}'`).catch(() => null);
    const sel = (await asService(c, `select t3a_cr28_review('${rep}') r`)).r.dimensions[0].selected;
    const claims = (await asService(c, `select t3a_ber_multipage_claims('${rep}', false) r`)).r;
    expect(claims).toMatchObject({ outcome: "ok" });
    expect(claims.render_manifest.claim_packages).toHaveLength(1);
    expect(claims.render_manifest.claim_packages[0]).toMatchObject({ dimension_id: "D2", entry_id: sel.state_code, evidence_state: "bounded_recurrence" });
    expect(claims.entries[sel.state_code].composed_text).toBe(sel.clause_text);
  });
});

describe("CR-28-T4 a demonstration face of a real participant is never produced", () => {
  it("the claim package route refuses a report that is not issued, a specimen, test mode outside the service, and anyone but the participant", async () => {
    const p = await mkParticipant(c, `cr28-p-${++seq}-${RUN}`); const other = await mkParticipant(c, `cr28-o-${seq}-${RUN}`);
    const open = await ber(p, ["D2"]); const spec = await ber(p, ["D2"], "issued_at=now()"); await fx(`update t3a_d1_ber_report set specimen_render_flag = true where ber_report_id='${spec}'`);
    const issued = await ber(p, ["D2"], "issued_at=now()");
    const claims = (u: string, id: string, test = false) => as(u, `select t3a_ber_multipage_claims('${id}', ${test}) r`).then((x) => x.r);
    expect(await claims(p, open)).toMatchObject({ outcome: "refused", reason: "report_not_issued" });
    expect(await claims(p, spec)).toMatchObject({ outcome: "refused", reason: "report_not_issued" });
    expect(await claims(p, issued, true)).toMatchObject({ outcome: "refused", reason: "TEST_MODE_IS_SERVICE_ONLY" });
    expect(await claims(other, issued)).toMatchObject({ outcome: "refused", reason: "not_the_participant" });
  });
});
