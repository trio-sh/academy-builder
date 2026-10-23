/** CORR-007 Rev 1.6 rule CR-11: the evidence review checklist is two lists (platform items and the dimension's own items); issuance needs every item of both, per dimension (CR-11-T1). Synthetic people; throwaway database only. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { RUN, connect, mkParticipant, run } from "./helpers";

let c: pg.Client; let reviewer: string; let seq = 0;
const HASH = "c".repeat(64);
async function fx(sql: string) {
  await c.query("begin"); await c.query("set local session_replication_role = replica");
  try { const r = await c.query(sql); await c.query("commit"); return r.rows; } catch (e) { await c.query("rollback"); throw e; }
}
const items = async (d: string) => (await run(c, `select t3a_review_items_for('${d}') a`))[0].a as number[];
const gate = async (ber: string) => (await run(c, `select t3a_report_issuance_gate('${ber}') r`))[0].r;
const checklist = (g: any) => (g.blockers as any[]).filter((b) => b.code === "checklist_incomplete_or_failed");
let clock = 0;
const record = (ber: string, d: string, item: number, outcome: string) =>
  fx(`insert into t3a_dimension_review_result(ber_report_id, dimension_id, item_no, outcome, reviewer_id, version_set_hash, recorded_at) values ('${ber}','${d}',${item},'${outcome}','${reviewer}','${HASH}', now() + interval '${++clock} seconds')`);
const passAll = async (ber: string, d: string) => { for (const i of await items(d)) await record(ber, d, i, "pass"); };
async function report(dims: string[]) {
  const p = await mkParticipant(c, `cr11-p-${++seq}-${RUN}`);
  const ber = (await fx(`insert into t3a_d1_ber_report(participant_id, dimension_id, represented_dimension_ids, ber_standard_version, ber_version, permitted_use_version, observer_multiplicity_statement_code, source_link, ber_status, report_type, preview_state, report_preview_digest, report_content_digest, verification_code, specimen_render_flag) values ('${p}','${dims[0]}',array[${dims.map((d) => `'${d}'`).join(",")}]::text[], '1.0', '1.0', '1.0', 'M5', '{}'::jsonb, 'assembling', 'ber', 'current', repeat('a',64), repeat('b',64), 'V-' || gen_random_uuid()::text, false) returning ber_report_id b`))[0].b;
  return ber as string;
}

beforeAll(async () => { c = await connect(); reviewer = await mkParticipant(c, `cr11-rev-${RUN}`); });
afterAll(async () => { await c.end(); });

describe("CR-11 two lists with stable identifiers", () => {
  it("the platform list is held apart from each dimension's own items, and a dimension's list is the platform items plus its own", async () => {
    const platform = (await run(c, `select item_no from t3a_dimension_review_item where dimension_id is null order by item_no`)).map((r) => r.item_no);
    const own = async (d: string) => (await run(c, `select item_no from t3a_dimension_review_item where dimension_id='${d}' order by item_no`)).map((r) => r.item_no);
    expect(platform.length).toBeGreaterThanOrEqual(21);
    for (const d of ["D2", "D3", "D4"]) {
      expect((await own(d)).length).toBeGreaterThan(0);
      expect(await items(d)).toEqual([...platform, ...(await own(d))].sort((a, b) => a - b));
      for (const i of await own(d)) expect(platform).not.toContain(i);
    }
    expect(await items("D3")).not.toEqual(await items("D2"));                     // a dimension's own items are not another's
    expect(await items("D1")).toEqual(platform);                                  // a dimension with none has the platform list
  });
});

describe("CR-11-T1 fail one dimension item of a two dimension report", () => {
  it("issuance blocks for that dimension only, with no override; the other dimension's pass does not carry it", async () => {
    const ber = await report(["D2", "D3"]);
    await passAll(ber, "D2"); await passAll(ber, "D3");
    expect(checklist(await gate(ber))).toEqual([]);                               // every item of both lists passed
    const ownD3 = (await run(c, `select item_no from t3a_dimension_review_item where dimension_id='D3' order by item_no limit 1`))[0].item_no;
    await record(ber, "D3", ownD3, "fail");
    const g = await gate(ber);
    expect(g.permitted).toBe(false); expect(g.override_available).toBe(false);
    expect(checklist(g)).toEqual([{ code: "checklist_incomplete_or_failed", dimension_id: "D3", items_required: (await items("D3")).length, items_passed: (await items("D3")).length - 1 }]);
    await record(ber, "D3", ownD3, "pass");                                       // a later pass of that item clears it
    expect(checklist(await gate(ber))).toEqual([]);
  });
  it("a platform item failed on one dimension blocks that dimension; not_established is not a pass; a missing item blocks", async () => {
    const ber = await report(["D2", "D3"]);
    await passAll(ber, "D2");
    await passAll(ber, "D3");
    await record(ber, "D2", 5, "not_established");
    expect(checklist(await gate(ber)).map((b) => b.dimension_id)).toEqual(["D2"]);
    const ber2 = await report(["D2", "D3"]);
    await passAll(ber2, "D2");                                                    // D3 has nothing recorded
    expect(checklist(await gate(ber2)).map((b) => [b.dimension_id, b.items_passed])).toEqual([["D3", 0]]);
  });
  it("a single dimension report needs every item of its two lists; one missing item blocks", async () => {
    const ber = await report(["D4"]);
    const all = await items("D4");
    for (const i of all.slice(0, -1)) await record(ber, "D4", i, "pass");
    expect(checklist(await gate(ber))).toEqual([{ code: "checklist_incomplete_or_failed", dimension_id: "D4", items_required: all.length, items_passed: all.length - 1 }]);
    await record(ber, "D4", all[all.length - 1], "pass");
    expect(checklist(await gate(ber))).toEqual([]);
  });
});
