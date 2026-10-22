/**
 * CORR-007 Rev 1.6 CR-19: the mentor view of a session shows the minimum observation context and nothing from the participant's intake profile.
 * The database half (the function that returns the context, and the row policy on the intake profile) is proved in src/test/db/cr18-cr19-*.db.test.ts.
 * This is the screen half: no mentor surface reads the intake profile table, and the one read of the participant's account that the Cockpit makes is the single
 * address needed to admit them from the Meet waiting room (CL-43), by column, never the whole row.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "src/pages/dashboard/mentor");
const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"));
const src = (f: string) => readFileSync(resolve(dir, f), "utf8");

describe("CR-19 mentor surfaces and the intake profile", () => {
  it("there are mentor surfaces to check", () => { expect(files.length).toBeGreaterThan(5); });
  it.each(files)("%s does not read the participant intake profile", (f) => {
    const text = src(f);
    expect(text).not.toMatch(/t3a_participant_profile/);
    for (const field of ["legal_name", "display_name", "country_of_residence", "city_of_residence", "subdivision_of_residence", "occupation_interest", "target_industry_code", "recruitment_channel_code"]) {
      expect(text, `${f} mentions ${field}`).not.toContain(field);
    }
  });
  it("the Cockpit's only read of the accounts table is one named column for the Meet admission", () => {
    const text = src("Cockpit.tsx");
    const reads = [...text.matchAll(/\.from\("profiles"\)\s*\.select\("([^"]*)"\)/g)].map((m) => m[1]);
    expect(reads).toEqual(["email"]);
    expect(text).not.toMatch(/\.from\("profiles"\)\s*\.select\("\*"\)/);
  });
});
