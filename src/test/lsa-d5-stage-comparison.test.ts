/**
 * D5 Section 15 paragraphs 10 and 11 (read me Table 4.1.9): every Stage is comparable, each only with itself. Two Stage 2 families load now; a retake at another Stage whose comparison
 * record reads not_authored is captured in full and held, and is never compared with a Stage 2 observation. Synthetic data from the D5 reference fixtures (06_Joint_Trial/lsa_d5).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { loadRegistries, resolve } from "../../tools/lsa/resolver.mjs";

const F = path.resolve(__dirname, "../../tools/lsa/fixtures/d5");
const reg = JSON.parse(fs.readFileSync(path.join(F, "registries.json"), "utf8"));
const data = JSON.parse(fs.readFileSync(path.join(F, "observations.json"), "utf8"));
loadRegistries(reg);

const S2 = (id: string, date: string, state: string, statement: string, source = "SRC-D5-S2-001@2.0") => ({
  observation_id: id, participant_id: "VX", proposition_id: "REK-D5-008", conduct_element_id: "CE-D5-08", dimension_id: "D5", state_code: state, statement_id: statement, source_version_id: source,
  served_instance_hash: "a".repeat(64), observed_at: date, committed_at: `${date}T10:00`, in_currency: true, administration: { observation_mode: "structured_live_session", assistance_declaration: "none" },
  longitudinal_use_status: "eligible", interaction_pattern_family_id: "IPF-D5-0" + id.slice(-1), observer_ids: ["M1"], cooldown_completed_at: date, attempt_reason: "first",
});
// a retake at Stage 1: a written response to a Stage 1 source, which no family lists as a member; its comparison record reads not_authored, so the longitudinal use is not eligible
const S1 = (id: string, date: string, state: string, statement: string) => ({
  ...S2(id, date, state, statement, "SRC-D5-S1-001@2.0"), administration: { observation_mode: "written_response", assistance_declaration: "none" }, longitudinal_use_status: "not_eligible", interaction_pattern_family_id: "IPF-D5-01",
});
const kase = { case_id: "TX", participant_id: "VX", proposition_id: "REK-D5-008", dimension_id: "D5", period_start: "2027-01-01", period_end: "2027-12-31", snapshot_date: "2027-12-31" };
const parts = { VX: { participant_id: "VX", lsa_consent_state: "granted" } };

describe("D5 comparison by Stage (Section 15 paragraphs 10 and 11)", () => {
  it("the shipped D5 families are Stage 2 families only: every member is a Stage 2 source and the administration profile records the observation mode", () => {
    for (const fam of reg.families) {
      expect(fam.members.every((m: { source_version_id: string }) => /^SRC-D5-S2-/.test(m.source_version_id)), fam.family_id).toBe(true);
      expect(fam.administration_profile.observation_mode).toBe("structured_live_session");
    }
  });

  it("a Stage 1 retake is captured and held but never compared with the Stage 2 observations: it is excluded (EX01) and does not change the finding", () => {
    const base = [S2("OXA1", "2027-02-01", "CN_NO_PARTY", "ST-D5-040"), S2("OXA2", "2027-05-01", "CN_STEP_AND_PARTY", "ST-D5-039", "SRC-D5-S2-004@2.0")];
    const without = resolve(reg, parts, base, kase);
    const withS1 = resolve(reg, parts, [...base, S1("OXB3", "2027-08-01", "CN_NONE", "ST-D5-042")], kase);
    expect(without.finding_code).toBe("documented_progression");
    expect(withS1.finding_code).toBe(without.finding_code);
    expect(withS1.sequence).toEqual(without.sequence);
    expect(withS1.exclusions).toEqual([{ date: "2027-08-01", code: "EX01" }]);
    expect(withS1.considered).toBe(without.considered! + 1); // held: the observation is read, counted as considered, and kept out of the comparison
  });

  it("Stage 1 observations alone are not compared at all: comparison is not established, not a trend", () => {
    const only = [S1("OXB1", "2027-02-01", "CN_NO_PARTY", "ST-D5-040"), S1("OXB2", "2027-06-01", "CN_STEP_AND_PARTY", "ST-D5-039")];
    const r = resolve(reg, parts, only, kase);
    expect(r.finding_code).toBe("comparison_not_established");
    expect(r.included).toBe(0);
    expect(r.exclusions.map((x: { code: string }) => x.code)).toEqual(["EX01", "EX01"]);
  });

  it("a Stage 3 and a Stage 4 observation are held the same way", () => {
    const base = [S2("OXA1", "2027-02-01", "CN_NO_PARTY", "ST-D5-040"), S2("OXA2", "2027-05-01", "CN_STEP_AND_PARTY", "ST-D5-039", "SRC-D5-S2-004@2.0")];
    const s3 = { ...S2("OXC3", "2027-07-01", "CN_NONE", "ST-D5-042", "SRC-D5-S3-001@2.0"), administration: { observation_mode: "work_sample", assistance_declaration: "declared" }, longitudinal_use_status: "not_eligible" };
    const s4 = { ...S2("OXD4", "2027-09-01", "CN_NONE", "ST-D5-042", "SRC-D5-S4-001@2.0"), administration: { observation_mode: "group_session", assistance_declaration: "none" }, longitudinal_use_status: "not_eligible" };
    const r = resolve(reg, parts, [...base, s3, s4], kase);
    expect(r.finding_code).toBe("documented_progression");
    expect(r.exclusions.map((x: { code: string }) => x.code)).toEqual(["EX01", "EX01"]);
    expect(r.sequence.length).toBe(2);
  });

  it("the family key stays the proposition alone today: two Stage 2 families for one proposition would be refused as a duplicate (LSA-R09), which is why the Stage part is added later by a shared correction", () => {
    const dup = { ...reg, families: [...reg.families, { ...reg.families[0], family_id: reg.families[0].family_id + "-S1" }] };
    const base = [S2("OXA1", "2027-02-01", "CN_NO_PARTY", "ST-D5-040"), S2("OXA2", "2027-05-01", "CN_STEP_AND_PARTY", "ST-D5-039", "SRC-D5-S2-004@2.0")];
    const prop = reg.families.find((f: { proposition_id: string }) => f.proposition_id === "REK-D5-008");
    const dup8 = { ...reg, families: [...reg.families, { ...prop, family_id: prop.family_id + "-S1" }] };
    void dup;
    expect(resolve(dup8, parts, base, kase).refusal).toBe("LSA-R09");
  });
});
