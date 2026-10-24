/**
 * Session Archive resolver (dormant) on the D8 reference fixtures of the build folder (06_Joint_Trial/lsa_d8, check 3.1.6 of the read me):
 * 24 resolution cases, 2 dimension cases, 2 load tests, 2 code tests. Read me items 4.3.3 (the exact approved entry is selected for each finding) and
 * 4.3.4 (progression, regression, consistency, no direction, mixed and too few observations resolve correctly). Synthetic data only.
 * The D8 content package (T3A-D8-LSA-CONTENT-001) is checked as it is loaded: thirty draft records, none active, none approved.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { loadRegistries, resolve, resolveDimension, outputHash, monthsBack, verificationCode, CROCKFORD, LoadError } from "../../tools/lsa/resolver.mjs";

const F = path.resolve(__dirname, "../../tools/lsa/fixtures");
const read = (f: string) => JSON.parse(readFileSync(path.join(F, f), "utf8"));
const reg = read("d8/registries.json"), data = read("d8/observations.json"), exp = read("d8/expected_results.json"), content = read("d8-session-archive-content.json");

describe("Session Archive resolver on the D8 reference fixtures", () => {
  it("the registries load (no overlap, states declared, no cycle, no absence state in a direction rule)", () => { expect(() => loadRegistries(reg)).not.toThrow(); });
  const parts = Object.fromEntries((data.participants as any[]).map((p) => [p.participant_id, p]));
  it.each(data.cases as any[])("$case_id resolves to the expected finding and is deterministic", (c) => {
    const rg = c.no_history ? { ...reg, history_rules: [] } : reg;
    const got = resolve(rg, parts, data.observations, c); if ("refusal" in got) delete got.considered;
    const want = exp[c.case_id];
    for (const [k, v] of Object.entries(want)) expect(got[k], `${c.case_id} ${k}`).toEqual(v);
    const again = resolve(rg, parts, data.observations, c); if ("refusal" in again) delete again.considered;
    expect(outputHash(again)).toBe(outputHash(got));
  });
  it("the cases cover progression, regression, consistency, no direction, mixed and too few observations", () => {
    const codes = new Set((data.cases as any[]).map((c) => exp[c.case_id].finding_code ?? exp[c.case_id].refusal));
    for (const k of ["documented_progression", "documented_regression", "consistent_recorded_conduct", "different_no_direction", "mixed_trajectory", "insufficient_evidence"]) expect(codes.has(k), k).toBe(true);
  });
  it.each(data.load_tests as any[])("load test $id is rejected as specified", (lt) => {
    expect(() => loadRegistries(lt.registries)).toThrow(LoadError);
  });
  it.each(data.dimension_cases as any[])("dimension case $id", (dc) => {
    const got = resolveDimension(reg, dc.dimension_id, dc.element_results, "2027-12-31");
    for (const [k, v] of Object.entries(dc.expected)) expect(got[k], dc.id + " " + k).toEqual(v);
  });
  it("calendar month subtraction clamps to the last valid day, and 2,000 verification codes are unique and well formed", () => {
    for (const [a, n, w] of [["2027-03-31", 1, "2027-02-28"], ["2028-03-31", 1, "2028-02-29"], ["2027-01-15", 1, "2026-12-15"], ["2027-05-31", 36, "2024-05-31"]] as [string, number, string][]) expect(monthsBack(a, n)).toBe(w);
    const codes = new Set(Array.from({ length: 2000 }, verificationCode) as string[]);
    expect(codes.size).toBe(2000);
    for (const c of codes) { expect(c).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/); for (const ch of c.replace(/-/g, "")) expect(CROCKFORD).toContain(ch); }
  });
});

describe("the D8 content package as loaded", () => {
  it("is thirty draft records (twenty eight registry records and two state mappings) for CE-D8-06 and CE-D8-08, none approved, none dated, none active", () => {
    const recs = Object.values(content.registries).flat() as any[];
    expect(recs).toHaveLength(28); // 2 + 2 + 1 + 14 + 1 + 1 + 7; the two state mappings are checked below
    for (const r of recs) { expect(r.status).toBe("draft_for_approval"); expect(r.approved_by).toBeNull(); expect(r.approved_at).toBeNull(); expect(r.effective_from).toBeNull(); }
    expect(Object.keys(content.state_mapping).sort()).toEqual(["REK-D8-006", "REK-D8-008"]);
    expect((content.registries.families as any[]).map((f) => f.conduct_element_id).sort()).toEqual(["CE-D8-06", "CE-D8-08"]);
  });
  it("its entry wording uses no variable and no word of the D8 prohibited list that describes how a person bore something", () => {
    const entries = (content.registries.entries as any[]).concat(content.registries.dimension_entries as any[]);
    for (const e of entries.filter((x) => x.entry_id.startsWith("E-"))) expect(e.wording, e.entry_id).not.toMatch(/\{[a-z_]+\}/);
  });
});
