/**
 * The five D5 sources that the counterpart rule (D5-69, CR-232) refused at the first load, loaded by migration 20270240 with one bound family item of each reworded (CR-310 to CR-315).
 * Proves: each of the five now loads through the unchanged guard, the rewording is the stated words and nothing else, the hashes are new and carry the package digest beside them, the counterpart
 * fields are sequestered, the first refusals are still in the log, the draft Session Archive families still resolve their member, and the rule still refuses the original wording of each item.
 * Throwaway database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import type pg from "pg";
import { connect, run } from "./helpers";

let c: pg.Client;
beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

const Q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
const J = (o: unknown) => Q(JSON.stringify(o)) + "::jsonb";

type Five = { id: string; family: string; item: string; before: string; after: string; cr: string; role: string; packageDigest: string; stage: string };
const FIVE: Five[] = [
  { id: "SRC-D5-S2-009", family: "designated_positions", item: "DP2", before: "the two managers are asked to settle it before the board", after: "the matter is put to the two managers to settle before the board", cr: "CR-310", role: "The two managers.", packageDigest: "04edb873f57f63d0853795aceadb8dcb39ddf472f1a6c76d2b278278cb584c0d", stage: "S2" },
  { id: "SRC-D5-S3-001", family: "available_options", item: "AO4", before: "both leads take the decision to the vice-president jointly", after: "the decision goes jointly from both leads to the vice-president", cr: "CR-311", role: "The customer success lead and the engineering lead.", packageDigest: "a7893d8f3524f9f220c1052bfd225da2cd4e910c596f5d3897f1d544de0e0bc4", stage: "S3" },
  { id: "SRC-D5-S3-007", family: "available_options", item: "AO4", before: "the people function asked to advise on the arrangement", after: "advice on the arrangement asked of the people function", cr: "CR-312", role: "The two team members and the people function.", packageDigest: "816d5256f01e9e8c53cd12b512c9e1a02aa15e86bf9bfa25b399e6adbf9b1f35", stage: "S3" },
  { id: "SRC-D5-S4-004", family: "available_options", item: "AO4", before: "the chair takes the decision", after: "the decision is taken by the chair", cr: "CR-313", role: "The two members and the chair.", packageDigest: "8be864703ebe671540ab5dfc0f9b6a9f1580ba09f788fb080fafcebf2cd5f065", stage: "S4" },
  { id: "SRC-D5-S4-010", family: "available_options", item: "AO4", before: "the lead decides", after: "the decision is taken by the lead", cr: "CR-314", role: "The returning members and the team lead.", packageDigest: "21ce72582695a6c65a9489132424f52cafd0c2e26298e1bddde9bbcfaed9e533", stage: "S4" },
];
const term: Record<string, string> = { "SRC-D5-S2-009": "manager", "SRC-D5-S3-001": "lead", "SRC-D5-S3-007": "people function", "SRC-D5-S4-004": "chair", "SRC-D5-S4-010": "lead" };

const standing = async (id: string) => (await run(c, `select v.content_version_id, v.version_no, v.approval_status::text a, v.operational_state::text s, v.body from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier = ${Q(id)} and o.family = 'source'`));

describe("the five reworded D5 sources are loaded", () => {
  it("all 33 sources of the package have exactly one version, and the 4 fixtures are untouched", async () => {
    const r = await run(c, `select o.identifier, count(v.content_version_id)::int n from t3a_content_object o left join t3a_d1_content_version v using (content_object_id) where o.dimension_id = 'D5' and o.family = 'source' and o.identifier ~ '^SRC-D5-S[1-4]-0' group by 1`);
    expect(r).toHaveLength(33); expect(r.every((x) => x.n === 1)).toBe(true);
    expect((await run(c, `select count(*)::int n from t3a_content_object where identifier ~ '^DEMO-D5-S'`))[0].n).toBe(4);
  });

  it.each(FIVE)("$id loads as a drafting, not_loaded, not servable v2.0 with a load event", async (f) => {
    const v = await standing(f.id);
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ version_no: "v2.0", a: "drafting", s: "not_loaded" });
    expect(v[0].body.serving_eligible).toBe(false);
    expect(v[0].body.stage_code).toBe(f.stage);
    const ev = await run(c, `select governed_status::text g, env_state::text e, notes from t3a_d1_content_load_event where content_version_id = '${v[0].content_version_id}'`);
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ g: "DISABLED_PENDING_DECISION", e: "design_only" });
    expect(ev[0].notes).toContain("CR-310 to CR-315");
  });

  it.each(FIVE)("$id: $item of $family reads the reworded text, in its place, and every other item and field is the package's", async (f) => {
    const [v] = await standing(f.id);
    const items = v.body.source_sheet[f.family] as { id: string; text: string }[];
    const hit = items.find((i) => i.id === f.item)!;
    expect(hit.text).toBe(f.after);
    expect(items.filter((i) => i.text === f.before)).toHaveLength(0);
    expect(items.map((i) => i.id)).toEqual(items.map((_, k) => f.item.slice(0, 2) + (k + 1))); // DP1..DP3 / AO1..AO4: same count, same order
    expect(items.indexOf(hit)).toBe(Number(f.item.slice(2)) - 1);
    expect(v.body.rewording).toMatchObject({ register: f.cr, family: f.family, item: f.item, before: f.before, after: f.after });
  });

  it.each(FIVE)("$id: the hash is new, differs from the package digest, and the package digest is kept beside it", async (f) => {
    const [v] = await standing(f.id);
    expect(v.body.source_version_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(v.body.source_version_hash).toBe(v.body.source_digest);
    expect(v.body.source_version_hash).not.toBe(f.packageDigest);
    expect(v.body.rewording.package_source_digest).toBe(f.packageDigest);
  });

  it.each(FIVE)("$id: the counterpart role is sequestered and not in the readable body", async (f) => {
    const [v] = await standing(f.id);
    const seq = await run(c, `select field, value from t3a_source_sequestered_field where content_version_id = '${v.content_version_id}' and field in ('counterpart_role','counterpart_position') order by 1`);
    expect(seq.map((x) => x.field)).toEqual(["counterpart_position", "counterpart_role"]);
    expect(seq.find((x) => x.field === "counterpart_role")!.value).toBe(f.role);
    expect(JSON.stringify(v.body)).not.toMatch(/counterpart_(role|position)/);
  });

  it("SRC-D5-S3-007 carries the second SENSITIVE_CONTENT flag, beside SRC-D5-S3-004", async () => {
    const r = await run(c, `select o.identifier, v.body->'source_sheet'->>'sensitivity_flag' f from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where v.body->'source_sheet'->>'sensitivity_flag' = 'SENSITIVE_CONTENT' and o.identifier ~ '^SRC-D5-' order by 1`);
    expect(r.map((x) => x.identifier)).toEqual(["SRC-D5-S3-004", "SRC-D5-S3-007"]);
  });

  it("the five pass the bound item integrity check, as the other 28 do", async () => {
    const r = await run(c, `select o.identifier, cardinality(t3a_bound_item_integrity(v.body, 'D5'))::int bad from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D5-S[1-4]-0' and cardinality(t3a_bound_item_integrity(v.body, 'D5')) > 0`);
    expect(r).toEqual([]);
  });

  it("nothing is servable, approved or in a production state", async () => {
    const r = await run(c, `select count(*)::int n from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D5-S[1-4]-0' and (v.approval_status::text <> 'drafting' or v.operational_state::text <> 'not_loaded' or (v.body->>'serving_eligible')::boolean)`);
    expect(r[0].n).toBe(0);
  });

  it("the first load's five refusals are still in the log, one item each, from migration 20270202", async () => {
    const r = await run(c, `select subject_ref, detail from t3a_capture_refusal where reason_code = 'counterpart_as_subject' and route = 'source.load' and subject_ref ~ '^SRC-D5-S[1-4]-0' order by 1`);
    expect(Object.fromEntries(r.map((x) => [x.subject_ref, x.detail]))).toEqual(Object.fromEntries(FIVE.map((f) => [f.id, `${f.family}:${f.item}:${term[f.id]}`])));
  });

  it("the draft Session Archive families still name SRC-D5-S2-009@2.0 and that version now exists", async () => {
    const fam = await run(c, `select record_key, x->>'source_version_id' m from t3a_lsa_registry_record r, jsonb_array_elements(r.body->'members') x where r.registry = 'families' and r.dimension_id = 'D5' and x->>'source_version_id' = 'SRC-D5-S2-009@2.0' order by 1`);
    expect(fam.map((x) => x.record_key)).toEqual(["FAM-D5-REK007", "FAM-D5-REK008"]);
    expect((await standing("SRC-D5-S2-009"))[0].version_no).toBe("v2.0");
    expect((await run(c, `select count(*)::int n from t3a_lsa_registry_record where package_id = 'T3A-D5-LSA-CONTENT-001' and status = 'draft_for_approval'`))[0].n).toBe(30);
  });

  it("the migration is idempotent: running it again changes nothing", async () => {
    const sql = fs.readFileSync(new URL("../../../supabase/migrations/20270240000000_d5_five_sources_reworded.sql", import.meta.url), "utf8");
    const count = async () => (await run(c, `select (select count(*) from t3a_d1_content_version v join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D5-') v, (select count(*) from t3a_d1_content_load_event e join t3a_content_object o using (content_object_id) where o.identifier ~ '^SRC-D5-') e`))[0];
    const before = await count();
    await c.query("begin");
    try { await c.query(sql); expect(await count()).toEqual(before); } finally { await c.query("rollback"); }
  });
});

describe("the counterpart rule is unchanged: the original wording of each of the five is still refused", () => {
  // each fixture is the loaded source's own sheet with its counterpart role put back and the item set back to the package wording
  it.each(FIVE)("$id with '$before' as $item is refused at load and logged counterpart_as_subject", async (f) => {
    const [v] = await standing(f.id);
    const sheet = JSON.parse(JSON.stringify(v.body.source_sheet));
    sheet.counterpart_role = f.role;
    sheet[f.family] = sheet[f.family].map((i: { id: string; text: string }) => (i.id === f.item ? { ...i, text: f.before } : i));
    const id = `SRC-D5-X-${f.id.slice(-6)}-${Math.random().toString(36).slice(2, 8)}`;
    await c.query("begin");
    try {
      const n0 = (await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code = 'counterpart_as_subject'`))[0].n;
      await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values (${Q(id)}, 'source', ${Q(id)}, 'D5', 'not_loaded')`);
      const body = { source_identifier: id, stage_code: f.stage, source_version_hash: "a".repeat(64), source_sheet: sheet, title: id };
      const ins = await run(c, `insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1', 'drafting', 'not_loaded', ${J(body)} from t3a_content_object where identifier = ${Q(id)} returning content_version_id`);
      expect(ins).toHaveLength(0);
      const log = await run(c, `select detail from t3a_capture_refusal where reason_code = 'counterpart_as_subject' and subject_ref = ${Q(id)}`);
      expect(log.map((x) => x.detail)).toEqual([`${f.family}:${f.item}:${term[f.id]}`]);
      expect((await run(c, `select count(*)::int n from t3a_capture_refusal where reason_code = 'counterpart_as_subject'`))[0].n).toBe(n0 + 1);
    } finally { await c.query("rollback"); }
  });

  it("the reworded text of each of the five, put on the same fixture, loads (the guard reads the words, not the identifier)", async () => {
    for (const f of FIVE) {
      const [v] = await standing(f.id);
      const sheet = JSON.parse(JSON.stringify(v.body.source_sheet));
      sheet.counterpart_role = f.role;
      const id = `SRC-D5-Y-${f.id.slice(-6)}-${Math.random().toString(36).slice(2, 8)}`;
      await c.query("begin");
      try {
        await c.query(`insert into t3a_content_object(identifier, family, title, dimension_id, current_operational_state) values (${Q(id)}, 'source', ${Q(id)}, 'D5', 'not_loaded')`);
        const body = { source_identifier: id, stage_code: f.stage, source_version_hash: "a".repeat(64), source_sheet: sheet, title: id };
        const ins = await run(c, `insert into t3a_d1_content_version(content_object_id, version_no, approval_status, operational_state, body) select content_object_id, 'v1', 'drafting', 'not_loaded', ${J(body)} from t3a_content_object where identifier = ${Q(id)} returning content_version_id`);
        expect(ins, f.id).toHaveLength(1);
      } finally { await c.query("rollback"); }
    }
  });

  it("the rule table, the generic terms and the three guard functions are the ones migration 20270201 installed", async () => {
    const r = await run(c, `select generic_terms from t3a_dimension_counterpart_rule where dimension_id = 'D5'`);
    expect(r[0].generic_terms).toEqual(expect.arrayContaining(["manager", "lead", "chair", "function", "team"]));
    expect(r[0].generic_terms).toHaveLength(24);
    const trg = await run(c, `select tgname from pg_trigger where tgrelid = 't3a_d1_content_version'::regclass and tgname = 't3a_1_counterpart_load_guard_trg' and tgenabled = 'O'`);
    expect(trg).toHaveLength(1);
  });
});
