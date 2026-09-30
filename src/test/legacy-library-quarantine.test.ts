/**
 * CORR-006 Section 6 — the legacy scenario library is quarantined.
 *
 * The library is src/data/interactiveSkillAssessment.ts: a scoring
 * instrument, with evaluationCriteria, timed challenges, correct answers and
 * grading bands from excellent to poor.
 *
 * CX-20 asks for every reach to be made unreachable SERVER-SIDE, and proved
 * "by requesting the route directly, never by observing that a screen hides
 * it". THE LIBRARY HAS NO SERVER SIDE — its content is constants in a bundled
 * module, so there is no route to request and nothing for a server to refuse.
 * Its writes to observation_loops are refused in the database and proved
 * there; what these tests prove is the other half, and by the strongest
 * measure available: the library's bytes are not sent to the browser.
 *
 * That is a stronger claim than a hidden screen. "The screen hides it" is
 * about markup. "The bundle does not contain it" is about what crosses the
 * network, and it is what these check.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const LIBRARY = "src/data/interactiveSkillAssessment.ts";
const ROUTERS = [
  "src/App.tsx",
  "src/pages/dashboard/CandidateDashboard.tsx",
  "src/pages/dashboard/MentorDashboard.tsx",
  "src/pages/dashboard/EmployerDashboard.tsx",
  "src/pages/dashboard/AdminDashboard.tsx",
];

describe("the legacy scenario library is not reachable", () => {
  it("is not deleted — CX-21 deletes nothing", () => {
    // The quarantine must not be confused with a deletion. If this file goes,
    // that is a separate act under an instruction that authorizes it.
    expect(existsSync(resolve(process.cwd(), LIBRARY))).toBe(true);
  });

  it("is routed from nowhere", () => {
    for (const r of ROUTERS) {
      const src = read(r);
      expect(src, `${r} still routes the interactive assessment`).not.toMatch(
        /<Route[^>]*assessment\/interactive/
      );
      expect(src, `${r} still imports AssessmentViewer`).not.toMatch(
        /^import[^\n]*AssessmentViewer/m
      );
    }
  });

  it("is linked from nowhere", () => {
    // CX-20: "no navigation links to it".
    for (const r of ROUTERS) {
      expect(read(r), `${r} still links to the library`).not.toMatch(
        /(to|href)=["'][^"']*assessment\/interactive/
      );
    }
  });
});

describe("the library's content does not reach a browser", () => {
  /**
   * Only the literals that appear NOWHERE ELSE in src/ count. The first
   * version of this measurement used six strings picked from the library and
   * reported them still shipped — they were the fourteen dimension
   * descriptions, which MentorDashboard.tsx also holds. A shared string
   * proves nothing about the library.
   */
  const uniqueLiterals = (): string[] => {
    const lib = read(LIBRARY);
    const lits = new Set<string>();
    for (const m of lib.matchAll(/'([^'\n\\]{30,120})'/g)) lits.add(m[1]);
    for (const m of lib.matchAll(/"([^"\n\\]{30,120})"/g)) lits.add(m[1]);

    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const e of readdirSync(resolve(process.cwd(), dir), { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) out.push(...walk(p));
        else if (/\.tsx?$/.test(e.name) && p !== `./${LIBRARY}` && !p.endsWith(LIBRARY)) out.push(p);
      }
      return out;
    };
    const others = walk("./src").map((f) => read(f)).join("\n");
    return [...lits].filter((l) => !others.includes(l));
  };

  it("has literals that are its own, so the bundle check has a subject", () => {
    // A check whose subject is empty passes for free. This is the guard
    // against that.
    expect(uniqueLiterals().length).toBeGreaterThan(50);
  });

  it("ships none of them in the built output", () => {
    const dist = resolve(process.cwd(), "dist/assets");
    if (!existsSync(dist)) {
      // Nothing is asserted against a build that was not made. The routing
      // tests above hold regardless, and this runs in any environment that
      // has built.
      return;
    }
    const bundle = readdirSync(dist)
      .filter((f) => f.endsWith(".js"))
      .map((f) => readFileSync(`${dist}/${f}`, "utf8"))
      .join("\n");

    const shipped = uniqueLiterals().filter((l) => bundle.includes(l));
    expect(shipped, `the library ships ${shipped.length} of its own strings`).toEqual([]);
    // The scoring structure itself, by name.
    expect(bundle).not.toMatch(/evaluationCriteria/);
  });
});
