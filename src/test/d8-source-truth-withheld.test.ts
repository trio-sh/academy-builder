/**
 * D8 test D8-68 (code half): who_knows and decision_origin are retained for source truth and are never shown on the Mentor Cockpit, the reference card, any report or any export.
 * No screen, route, API handler or export in the application may name either field. The database half (no stored body, no routine, a service only truth table) is
 * src/test/db/d8-state-boundary.db.test.ts and the D8 acceptance run.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", "dist", ".git"].includes(e.name)) walk(p, out); }
    else if (/\.(tsx?|mjs|json)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(p);
  }
  return out;
}

describe("D8-68 source truth is not on any surface of the application", () => {
  const files = [...walk(path.join(ROOT, "src")), ...walk(path.join(ROOT, "api"))];
  it("scans a real set of application files", () => { expect(files.length).toBeGreaterThan(100); });
  it("no screen, handler or export names who_knows or decision_origin", () => {
    const hits = files.filter((f) => /who_knows|decision_origin/.test(readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f));
    expect(hits).toEqual([]);
  });
  it("the Mentor Cockpit and the reference card pass no D8 source field through by name", () => {
    for (const f of ["src/pages/dashboard/mentor/Cockpit.tsx", "src/pages/dashboard/mentor/ReferenceCard.tsx", "src/pages/dashboard/mentor/S1Workbench.tsx"]) {
      expect(readFileSync(path.join(ROOT, f), "utf8"), f).not.toMatch(/who_knows|decision_origin/);
    }
  });
});
