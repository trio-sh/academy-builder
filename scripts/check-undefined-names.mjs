#!/usr/bin/env node
/**
 * Refuse a build that references a name nothing defines.
 *
 * WHY THIS EXISTS. A nav entry read `icon: Flag` and `Flag` was never
 * imported. It shipped, and the mentor dashboard died at load with
 * "ReferenceError: Flag is not defined". Vite does not resolve free
 * identifiers at build time, so the bundle built cleanly and the crash
 * waited for a browser.
 *
 * `npx tsc --noEmit` would have caught it and did not, because the root
 * tsconfig is `"files": []` with project references — it type-checks
 * NOTHING and exits 0. Every "typecheck clean" run against it was
 * vacuous, which is worse than having no check: it reported a signal
 * that was never measured.
 *
 * So this checks the one class of error that turns into a blank page,
 * across the real project, and fails the build on it. It deliberately
 * does NOT gate on the 64 pre-existing type errors in this repo — those
 * are a separate cleanup, and a check nobody can get green is a check
 * that gets disabled.
 */
import { execFileSync } from "node:child_process";

const PROJECT = "tsconfig.app.json";

// TS2304 Cannot find name · TS2552 did you mean · TS2503 namespace ·
// TS18004 no value exists for shorthand property. Each is a name the
// runtime will not find either.
const CRASHING = new Set(["TS2304", "TS2552", "TS2503", "TS18004"]);

let output = "";
try {
  execFileSync(
    "npx",
    ["tsc", "-p", PROJECT, "--noEmit", "--pretty", "false"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
} catch (e) {
  output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
}

const found = output
  .split("\n")
  .filter((line) => [...CRASHING].some((code) => line.includes(`error ${code}:`)));

if (found.length > 0) {
  console.error(
    `\n✗ ${found.length} undefined name${found.length === 1 ? "" : "s"}. ` +
      `Each one is a ReferenceError at load, not a type nit.\n`
  );
  found.forEach((f) => console.error(`  ${f}`));
  console.error(
    "\nA free identifier bundles without complaint and dies in the browser.\n"
  );
  process.exit(1);
}

console.log("✓ no undefined names — nothing references a name that will not exist at runtime.");
