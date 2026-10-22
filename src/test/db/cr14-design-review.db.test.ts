/** CORR-007 Rev 1.6 rule CR-14: reuse of an administration form across dimensions, and the approved source design review that can lift it. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { asService, connect, meet, mkApprovedSource, mkParticipant, retireFixtureSources, run, type SourceFixture } from "./helpers";

let c: pg.Client;
let reviewer: string, author: string;
let d1s2: SourceFixture, d2s2: SourceFixture, d2s2b: SourceFixture, d2s1a: SourceFixture, d2s1b: SourceFixture;
const FORM = async (stage: string) => (await run(c, `select t3a_administration_form_of('${stage}') f`))[0].f as string;
const exposure = async (p: string, v: string) => (await run(c, `select t3a_prior_exposure('${p}','${v}') r`))[0].r;
const review = (id: string, status: string, form: string, versions: string[], scope: string, expires: string | null, auth: string, approver: string | null) =>
  asService(c, `select t3a_design_review_record('${id}','${status}','${form}','{${versions.join(",")}}','reviewed whether familiarity with the form changes what the source can show','${scope}',${expires ? `'${expires}'` : "null"},'${auth}',${approver ? `'${approver}'` : "null"}) r`);

beforeAll(async () => {
  c = await connect(); await retireFixtureSources(c);
  reviewer = await mkParticipant(c, "cr14-rev"); author = await mkParticipant(c, "cr14-auth");
  d1s2 = await mkApprovedSource(c, { dimension: "D1", stage: "S2", situationClass: "SC-D1-1", reviewer });
  d2s2 = await mkApprovedSource(c, { dimension: "D2", stage: "S2", situationClass: "SC-D2-3", reviewer });
  d2s2b = await mkApprovedSource(c, { dimension: "D2", stage: "S2", situationClass: "SC-D2-5", reviewer });
  d2s1a = await mkApprovedSource(c, { dimension: "D2", stage: "S1", situationClass: "SC-D2-1", reviewer });
  d2s1b = await mkApprovedSource(c, { dimension: "D2", stage: "S1", situationClass: "SC-D2-2", reviewer });
});
afterAll(async () => { await c.end(); });

describe("CR-14: the form exclusion", () => {
  it("T1: a form met under another dimension, no review loaded: excluded", async () => {
    const p = await mkParticipant(c, "cr14-a"); await meet(c, p, d1s2.version);
    const ex = await exposure(p, d2s2.version);
    expect(ex.excluded).toBe(true);
    expect(ex.reasons).toContain("administration_form_met");
    expect(ex.reasons).not.toContain("source_version_met");
  });
  it("a different source of the same Stage in the SAME dimension is not a form reuse (a retake is not excluded)", async () => {
    const p = await mkParticipant(c, "cr14-b"); await meet(c, p, d2s1a.version);
    const ex = await exposure(p, d2s1b.version);
    expect(ex.reasons).not.toContain("administration_form_met");
    expect(ex.excluded).toBe(false);
  });
});

describe("CR-14: the approved source design review", () => {
  it("T2: an approved, unexpired review covering the form, source and participant lifts the exclusion", async () => {
    const p = await mkParticipant(c, "cr14-c"); await meet(c, p, d1s2.version);
    await review(randomUUID(), "approved", await FORM("S2"), [d2s2.version], p, null, author, reviewer);
    const ex = await exposure(p, d2s2.version);
    expect(ex.reasons).not.toContain("administration_form_met");
    expect(ex.excluded).toBe(false);
  });
  it("T3: a review never waives a source or pattern family the participant has already met", async () => {
    const p = await mkParticipant(c, "cr14-d"); await meet(c, p, d1s2.version); await meet(c, p, d2s2.version);
    await review(randomUUID(), "approved", await FORM("S2"), [d2s2.version], "all", null, author, reviewer);
    const ex = await exposure(p, d2s2.version);
    expect(ex.reasons).toContain("source_version_met");
    expect(ex.excluded).toBe(true);
    // the same pattern family through a different source version: still excluded for the family
    const sameFamily = await mkApprovedSource(c, { dimension: "D2", stage: "S2", situationClass: "SC-D2-3", reviewer });
    await review(randomUUID(), "approved", await FORM("S2"), [sameFamily.version], "all", null, author, reviewer);
    const ex2 = await exposure(p, sameFamily.version);
    expect(ex2.reasons).toContain("pattern_family_met");
    expect(ex2.excluded).toBe(true);
  });
  it("T4: a draft, a rejected, a withdrawn and an expired review lift nothing", async () => {
    const f = await FORM("S2");
    for (const [status, expires] of [["draft", null], ["rejected", null], ["withdrawn", null], ["approved", "2020-01-01"]] as const) {
      const p = await mkParticipant(c, "cr14-e" + status.slice(0, 3)); await meet(c, p, d1s2.version);
      const r = await review(randomUUID(), status, f, [d2s2b.version], "all", expires, author, status === "approved" ? reviewer : null);
      expect(r.r.outcome).toBe("recorded");
      expect((await exposure(p, d2s2b.version)).reasons).toContain("administration_form_met");
    }
  });
  it("T4: a review approved by its own author is refused, by the route and by the table", async () => {
    const f = await FORM("S2"); const id = randomUUID();
    const viaRoute = await review(id, "approved", f, [d2s2b.version], "all", null, author, author);
    expect(viaRoute.r.reason).toBe("REVIEW_APPROVER_MUST_DIFFER_FROM_AUTHOR");
    await expect(c.query(`insert into t3a_source_design_review(review_id,status,administration_form_id,source_version_ids,reviewed_statement,author_id,approved_by) values ('${id}','approved','${f}','{${d2s2b.version}}','x','${author}','${author}')`)).rejects.toThrow(/check/i);
  });
  it("a review for another participant, another form or another source lifts nothing; withdrawing an approved review ends the lift", async () => {
    const f = await FORM("S2"); const p = await mkParticipant(c, "cr14-f"); await meet(c, p, d1s2.version);
    await review(randomUUID(), "approved", f, [d2s2b.version], randomUUID(), null, author, reviewer);
    await review(randomUUID(), "approved", await FORM("S1"), [d2s2b.version], "all", null, author, reviewer);
    await review(randomUUID(), "approved", f, [d2s2.version], "all", null, author, reviewer);
    expect((await exposure(p, d2s2b.version)).reasons).toContain("administration_form_met");
    const id = randomUUID();
    await review(id, "approved", f, [d2s2b.version], p, null, author, reviewer);
    expect((await exposure(p, d2s2b.version)).reasons).not.toContain("administration_form_met");
    await review(id, "withdrawn", f, [d2s2b.version], p, null, author, null);
    expect((await exposure(p, d2s2b.version)).reasons).toContain("administration_form_met");
  });
});
