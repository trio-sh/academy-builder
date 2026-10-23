/** CORR-007 Rev 1.6 rule CR-31-T1: the sandbox switch log shows the five switches turned on in the stated order, each followed by a full test run, with lsa_activation off throughout. */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

type Step = { step: string; switches_on: string[]; state_after_turning_on: Record<string, string>; database_suite: { total: number } | null; unit_suite: { total: number } | null };
const log = JSON.parse(readFileSync("docs/day1/evidence/switch-rehearsal.json", "utf8")) as { steps: Step[] };
const ORDER = ["canonical_writers", "strict_event_ingest", "enforce_required", "enforce_sequence", "enforce_gate"];

describe("CR-31 the sandbox switch log", () => {
  it("starts with every switch off, then turns the five on in the stated order, one at a time", () => {
    expect(log.steps.map((s) => s.step)).toEqual(["baseline_all_off", ...ORDER]);
    expect(log.steps.map((s) => s.switches_on)).toEqual([0, 1, 2, 3, 4, 5].map((n) => ORDER.slice(0, n)));
    const s0 = log.steps[0].state_after_turning_on;
    expect([s0.canonical_writers, s0.ingest_mode, s0.enforce_required, s0.enforce_sequence, s0.enforce_gate]).toEqual(["off", "legacy_tolerant", "f", "f", "f"]);
    const finalState = log.steps[5].state_after_turning_on;
    expect([finalState.canonical_writers, finalState.ingest_mode, finalState.enforce_required, finalState.enforce_sequence, finalState.enforce_gate]).toEqual(["on", "strict", "t", "t", "t"]);
  });
  it("runs the full database and unit suites after every step", () => {
    for (const s of log.steps) { expect(s.database_suite?.total ?? 0).toBeGreaterThan(300); expect(s.unit_suite?.total ?? 0).toBeGreaterThan(400); }
  });
  it("lsa_activation is off at every step", () => {
    for (const s of log.steps) expect(s.state_after_turning_on.lsa_activation).toBe("f");
  });
});
