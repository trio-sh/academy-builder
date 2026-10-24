/**
 * D5 Session Archive content (Section 15) and the family registry (paragraphs 10 and 11): the D5 package loads as 30 inactive draft records, the activation flag stays off, and the family registry takes a
 * second key part, the Stage, later without migrating stored records. Throwaway database only.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { connect, run } from "./helpers";

let c: pg.Client;
beforeAll(async () => { c = await connect(); });
afterAll(async () => { await c.end(); });

describe("D5 Session Archive content, loaded inactive", () => {
  it("30 draft_for_approval records for T3A-D5-LSA-CONTENT-001: 2 families, 2 direction rules, 1 sufficiency rule, 14 entries, 1 history rule, 1 dimension rule, 7 dimension entries, 2 state mappings", async () => {
    const rows = await run(c, `select registry, count(*)::int n, bool_and(status = 'draft_for_approval') drafts from t3a_lsa_registry_record where package_id = 'T3A-D5-LSA-CONTENT-001' group by registry order by registry`);
    expect(Object.fromEntries(rows.map((r) => [r.registry, r.n]))).toEqual({ direction_rules: 2, dimension_entries: 7, dimension_rules: 1, entries: 14, families: 2, history_rules: 1, state_mapping: 2, sufficiency_rules: 1 });
    expect(rows.every((r) => r.drafts)).toBe(true);
  });
  it("no D5 record carries an approval, an effective date or an active status", async () => {
    const n = await run(c, `select count(*)::int n from t3a_lsa_registry_record where dimension_id = 'D5' and (status <> 'draft_for_approval' or body->>'approved_by' is not null or body->>'approved_at' is not null or body->>'effective_from' is not null or body->>'effective_to' is not null)`);
    expect(n[0].n).toBe(0);
  });
  it("the covered elements are CE-D5-07 and CE-D5-08 through REK-D5-007 and REK-D5-008, at Stage 2 sources only", async () => {
    const fam = await run(c, `select record_key, body->>'proposition_id' p, body->>'conduct_element_id' e, body->'administration_profile'->>'observation_mode' m, (select bool_and(x->>'source_version_id' ~ '^SRC-D5-S2-') from jsonb_array_elements(body->'members') x) s2 from t3a_lsa_registry_record where registry = 'families' and dimension_id = 'D5' order by 1`);
    expect(fam).toEqual([{ record_key: "FAM-D5-REK007", p: "REK-D5-007", e: "CE-D5-07", m: "structured_live_session", s2: true }, { record_key: "FAM-D5-REK008", p: "REK-D5-008", e: "CE-D5-08", m: "structured_live_session", s2: true }]);
  });
  it("the state mapping is Table 15.1 of the Execution Edition", async () => {
    const m = await run(c, `select record_key, body from t3a_lsa_registry_record where registry = 'state_mapping' and dimension_id = 'D5' order by 1`);
    expect(m[0].body).toEqual({ "C7 A1": "AG_WITH_RECORDING", "C7 A2": "AG_NO_RECORDING", "C7 A3": "AG_NONE", "C7 A4": "AG_NONE_REACHED" });
    expect(m[1].body).toEqual({ "C8 A1": "CN_STEP_AND_PARTY", "C8 A2": "CN_NO_PARTY", "C8 A3": "CN_TO_AUTHORITY", "C8 A4": "CN_NONE" });
  });
  it("the D4 records are unchanged by the D5 load (30) and an active record is still refused while the activation flag is off", async () => {
    expect((await run(c, `select count(*)::int n from t3a_lsa_registry_record where package_id = 'T3A-D4-LSA-CONTENT-001' and status = 'draft_for_approval'`))[0].n).toBe(30);
    await c.query("begin");
    try {
      const flag = await run(c, `select public.t3a_lsa_flag('lsa_activation') f`);
      if (flag[0].f === true) return; // the flag is on in this database: the refusal below is for the off state
      const r = await c.query(`insert into t3a_lsa_registry_record(registry, record_key, version, dimension_id, status, package_id, body) values ('families','FAM-D5-ZZ',1,'D5','active','T3A-D5-LSA-CONTENT-001','{}'::jsonb) returning 1`);
      expect(r.rowCount).toBe(0);
    } finally { await c.query("rollback"); }
  });
});

describe("the family registry takes the Stage as a second key part later, without migration (Section 15 paragraph 11)", () => {
  it("the registry is keyed by registry, record key and version; it has no Stage column and the family body is a document, so a Stage part adds a field and a key suffix, never a column", async () => {
    const cols = (await run(c, `select column_name from information_schema.columns where table_name = 't3a_lsa_registry_record' order by ordinal_position`)).map((r) => r.column_name);
    expect(cols).toEqual(expect.arrayContaining(["registry", "record_key", "version", "dimension_id", "status", "package_id", "body"]));
    expect(cols.some((x) => /stage/i.test(x))).toBe(false);
    const uq = await run(c, `select pg_get_constraintdef(oid) d from pg_constraint where conrelid = 't3a_lsa_registry_record'::regclass and contype in ('p','u')`);
    expect(uq.some((r) => /registry, record_key, version/.test(r.d))).toBe(true);
  });
  it("a Stage 1 family for the same proposition loads beside the Stage 2 family with no change to the table or to the stored records (rolled back)", async () => {
    const before = (await run(c, `select count(*)::int n, md5(string_agg(body::text, '|' order by registry, record_key, version)) h from t3a_lsa_registry_record where dimension_id = 'D5'`))[0];
    await c.query("begin");
    try {
      const r = await c.query(`insert into t3a_lsa_registry_record(registry, record_key, version, dimension_id, status, package_id, body)
        select registry, record_key || '-S1', version, dimension_id, status, package_id, jsonb_set(body, '{stage}', '"S1"') from t3a_lsa_registry_record where registry = 'families' and record_key = 'FAM-D5-REK007' returning record_key`);
      expect(r.rows.map((x) => x.record_key)).toEqual(["FAM-D5-REK007-S1"]);
      const both = await run(c, `select count(*)::int n from t3a_lsa_registry_record where registry = 'families' and body->>'proposition_id' = 'REK-D5-007'`);
      expect(both[0].n).toBe(2);
    } finally { await c.query("rollback"); }
    const after = (await run(c, `select count(*)::int n, md5(string_agg(body::text, '|' order by registry, record_key, version)) h from t3a_lsa_registry_record where dimension_id = 'D5'`))[0];
    expect(after).toEqual(before);
  });
});
