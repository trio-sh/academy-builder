/**
 * Acceptance tests — T3A-D1-EXEC-001 §11.
 *
 * "Every test is executed and its evidence returned with the build: test
 * identifier, actual result, pass or fail, build version, date, tester.
 * A TEST SPECIFICATION IS NOT A PASSED TEST."
 *
 * So this screen shows two things that are never merged: the thirty
 * tests as issued, and the evidence recorded against them. A test with
 * no evidence reads as without a recorded pass — not as a pass, not as
 * a fail, and not as an empty row that looks like neither.
 *
 * Must not appear, and are absent here:
 *   — any control that marks a test passed without recording evidence;
 *   — any override on the completeness gate;
 *   — any default outcome.
 *
 * §11 forbids resolving a test that cannot pass "by hiding a field,
 * adding free text, introducing a default, combining controls, or
 * reducing either live view". A test blocked by a missing governing
 * input is shown as blocked with its conflict, which is what §11 asks
 * for instead.
 *
 * The gate this screen displays is the one T3A-D1-REL-001 reads as one
 * of its seven activation conditions. It is read here, never computed.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  DashboardPageHeader,
  DashSection,
  LedgerBadge,
  LedgerLoading,
  EmptyState,
} from "@/components/dashboard/primitives";
import { cn } from "@/lib/utils";

type AcceptanceTest = {
  test_id: string;
  section_ref: string;
  section_title: string;
  test_name: string;
  required_result: string;
  display_order: number;
};

type Evidence = {
  evidence_id: string;
  test_id: string;
  outcome: "pass" | "fail" | "not_executed" | "blocked_by_conflict";
  actual_result: string;
  build_version: string;
  tester: string;
  executed_at: string;
  conflict_note: string | null;
};

type Gate = {
  complete: boolean;
  tests_total: number;
  tests_passed: number;
  tests_failed: number;
  tests_blocked_by_conflict: number;
  without_a_pass: string;
  override_available: boolean;
};

/** The four outcomes the register allows. There is no fifth, and no default. */
const OUTCOME_LABEL: Record<Evidence["outcome"], string> = {
  pass: "Pass",
  fail: "Fail",
  not_executed: "Not executed",
  blocked_by_conflict: "Blocked by a conflict",
};

const AcceptanceTests = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [tests, setTests] = useState<AcceptanceTest[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [gate, setGate] = useState<Gate | null>(null);

  const load = useCallback(async () => {
    const [{ data: testRows }, { data: evidenceRows }, { data: gateRow }] =
      await Promise.all([
        supabase
          .from("t3a_d1_acceptance_test")
          .select("*")
          .order("display_order"),
        supabase
          .from("t3a_d1_acceptance_evidence")
          .select("*")
          .order("executed_at", { ascending: false }),
        supabase.rpc("t3a_d1_acceptance_evidence_complete", {
          p_build_version: null,
        }),
      ]);
    setTests((testRows ?? []) as AcceptanceTest[]);
    setEvidence((evidenceRows ?? []) as Evidence[]);
    setGate((gateRow ?? null) as Gate | null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) return <LedgerLoading />;

  // The latest evidence per test. An earlier run is not overwritten — the
  // table is append-only — so the history stays readable underneath.
  const latest = new Map<string, Evidence>();
  for (const e of evidence) if (!latest.has(e.test_id)) latest.set(e.test_id, e);

  const sections = [...new Set(tests.map((t) => t.section_ref))];

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ 11 · Acceptance tests"
        title="A test specification is not a passed test"
        meta="Thirty tests as issued, and the evidence recorded against them. The two are never merged."
        actions={
          <LedgerBadge variant="outline">
            {gate ? `${gate.tests_passed} of ${gate.tests_total} passed` : "—"}
          </LedgerBadge>
        }
      />

      {gate && (
        <DashSection eyebrow="§ I · The gate" title="Whether the evidence is complete">
          <div className="max-w-3xl">
            <p
              className={cn(
                "mono-label",
                gate.complete ? "text-foreground/70" : "ink-vermilion"
              )}
            >
              {gate.complete
                ? "ACCEPTANCE_EVIDENCE_COMPLETE"
                : "ACCEPTANCE_EVIDENCE_NOT_COMPLETE"}
            </p>

            <dl className="mt-6 space-y-3 border-t-2 border-foreground pt-6">
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-52">Passed</dt>
                <dd className="text-foreground/85">
                  {gate.tests_passed} of {gate.tests_total}
                </dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-52">Failed</dt>
                <dd className="text-foreground/85">{gate.tests_failed}</dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-52">
                  Blocked by a conflict
                </dt>
                <dd className="text-foreground/85">
                  {gate.tests_blocked_by_conflict}
                </dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-52">
                  Without a recorded pass
                </dt>
                <dd className="text-foreground/80 flex-1 min-w-[16rem] leading-relaxed">
                  {gate.without_a_pass || "None"}
                </dd>
              </div>
            </dl>

            <p className="text-foreground/65 text-[0.875rem] mt-8 leading-relaxed">
              This gate is one of the seven T3A-D1-REL-001 checks. A test with
              no evidence is not a pass, and no override exists for any of them.
            </p>
          </div>
        </DashSection>
      )}

      {tests.length === 0 ? (
        <DashSection eyebrow="§ II · Register" title="The tests">
          <EmptyState title="The acceptance register is not loaded." />
        </DashSection>
      ) : (
        sections.map((ref) => (
          <DashSection
            key={ref}
            eyebrow={`§ ${ref}`}
            title={
              tests.find((t) => t.section_ref === ref)?.section_title ?? ref
            }
          >
            <div className="border-t-2 border-foreground">
              {tests
                .filter((t) => t.section_ref === ref)
                .map((t) => {
                  const e = latest.get(t.test_id);
                  return (
                    <article
                      key={t.test_id}
                      className="py-6 border-b border-foreground/20"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
                        <span className="mono-label text-foreground/55">
                          {t.test_id}
                        </span>
                        <h3 className="display-serif text-lg text-foreground">
                          {t.test_name}
                        </h3>
                        <span
                          className={cn(
                            "mono-label",
                            e?.outcome === "pass"
                              ? "text-foreground/70"
                              : "ink-vermilion"
                          )}
                        >
                          {e ? OUTCOME_LABEL[e.outcome] : "No evidence recorded"}
                        </span>
                      </div>

                      <p className="text-foreground/80 mt-3 max-w-3xl leading-relaxed">
                        {t.required_result}
                      </p>

                      {e && (
                        <dl className="mt-4 max-w-3xl space-y-1.5 text-[0.9375rem]">
                          <div className="flex flex-wrap gap-3">
                            <dt className="mono-label text-foreground/55 w-32">
                              Actual
                            </dt>
                            <dd className="text-foreground/85 flex-1 min-w-[14rem] leading-relaxed">
                              {e.actual_result}
                            </dd>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <dt className="mono-label text-foreground/55 w-32">
                              Build
                            </dt>
                            <dd className="text-foreground/80">
                              {e.build_version} · {e.tester} ·{" "}
                              {new Date(e.executed_at).toLocaleDateString()}
                            </dd>
                          </div>
                          {e.conflict_note && (
                            <div className="flex flex-wrap gap-3">
                              <dt className="mono-label text-foreground/55 w-32">
                                Conflict
                              </dt>
                              <dd className="text-foreground/80 flex-1 min-w-[14rem] leading-relaxed">
                                {e.conflict_note}
                              </dd>
                            </div>
                          )}
                        </dl>
                      )}
                    </article>
                  );
                })}
            </div>
          </DashSection>
        ))
      )}

      <DashSection
        eyebrow="§ III · How a test is settled"
        title="And how it is not"
      >
        <div className="border-l-2 border-foreground pl-8 max-w-3xl space-y-5">
          <p className="text-foreground/85 leading-relaxed">
            A test passes when it has been executed and its result recorded
            with the build it ran against. Nothing on this screen marks a test
            passed, because a result that could be set from a screen would not
            be evidence of anything.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Where a test cannot pass because a governing input is missing, it
            is recorded as a conflict. It is not resolved by hiding a field,
            adding free text, introducing a default, combining controls, or
            reducing either live view.
          </p>
          <p className="text-foreground/80 leading-relaxed">
            Evidence is append-only. A later run is a new record and the
            earlier one stays, so a test that once failed does not become a
            test that always passed.
          </p>
        </div>
      </DashSection>
    </div>
  );
};

export default AcceptanceTests;
