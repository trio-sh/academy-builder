import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.db.config";

// The CORR-007 case review runs the rule tests once per dimension (tools/day1/case_review/run_matrix.py).
// With T3A_CASE_DIM=Dn each test file has its own primary dimension (the one it names most) swapped with Dn, everywhere in the file,
// so the same assertions run on fixtures of Dn. The swap is textual, and a test that is tied to one dimension's own content simply fails on the others:
// a case counts as run on Dn only where its test passed. T3A_CASE_DIM unset leaves every file unchanged.
const target = process.env.T3A_CASE_DIM;
const PRIMARY_CANDIDATES = ["D1", "D2", "D3", "D4"];

export function swapDimension(code: string, target: string): string {
  const count = (d: string) => (code.match(new RegExp(`\\b${d}\\b`, "g")) ?? []).length;
  // the dimension a file declares as its own (const DIM = "Dn") is its primary; otherwise the one it names most
  const declared = code.match(/const DIM\w* *= *"(D\d+)"/)?.[1];
  const primary = declared ?? [...PRIMARY_CANDIDATES].sort((a, b) => count(b) - count(a))[0];
  if (!target || primary === target || count(primary) === 0) return code;
  const lo = (d: string) => d.toLowerCase();
  const hold = "\u0000SWAPHOLD\u0000";
  return code
    .replace(new RegExp(`\\b${primary}\\b`, "g"), hold)
    .replace(new RegExp(`\\b${target}\\b`, "g"), primary)
    .replace(new RegExp(hold, "g"), target)
    .replace(new RegExp(`\\b${lo(primary)}\\b`, "g"), hold)
    .replace(new RegExp(`\\b${lo(target)}\\b`, "g"), lo(primary))
    .replace(new RegExp(hold, "g"), lo(target));
}

export default mergeConfig(base, defineConfig({
  test: { setupFiles: target ? ["./vitest.db.dim.each.ts"] : [] },
  plugins: target ? [{
    name: "t3a-case-dimension",
    enforce: "pre" as const,
    transform(code: string, id: string) {
      if (!/src\/test\/db\/cr\d+[^/]*\.db\.test\.ts$/.test(id) && !/src\/test\/db\/t3a-[^/]*\.db\.test\.ts$/.test(id)) return null;
      const out = swapDimension(code, target);
      return { code: out === code ? code : `globalThis.__T3A_SWAPPED__ = true;\n${out}`, map: null };
    },
  }] : [],
}));
