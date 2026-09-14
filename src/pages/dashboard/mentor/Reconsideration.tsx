/**
 * Correction and reconsideration — T3A-D1-EXEC-001 §8.4.
 *
 * Required screens: correction intake; the case; the outcome.
 * Required actions: raise; assign to an uninvolved reconsiderer; uphold,
 * amend or withdraw with reasoning.
 *
 * Must not appear, and are absent rather than disabled:
 *   — assignment to anyone who observed, confirmed, progressed or
 *     reviewed the record;
 *   — any in-place edit of a composed statement.
 *
 * The first is refused at the data layer by
 * t3a_d1_reconsideration_independence, and this screen reads that
 * verdict rather than deciding eligibility itself. The second has no
 * control here at all: an outcome supersedes, and the statement body is
 * never editable.
 *
 * A reviewer who disagrees with a mentor's capture line is not
 * correcting it here either — that is what this route is, and it has its
 * own eligibility.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DashboardPageHeader,
  DashSection,
  LedgerBadge,
  LedgerLoading,
  EmptyState,
} from "@/components/dashboard/primitives";

type CorrectionCase = {
  correction_case_id: string;
  participant_id: string;
  ground: string;
  narrative: string | null;
  status: string | null;
  raised_at: string;
  resolved_at: string | null;
  ber_report_id: string | null;
};

type Assignment = {
  reconsideration_assignment_id: string;
  correction_case_id: string;
  reconsiderer_id: string | null;
  status: string;
  outcome: string | null;
};

type Eligibility = {
  eligible: boolean;
  refusal_code?: string;
  involving_actions?: string;
};

/** §8.4 — the three outcomes, each requiring reasoning. No fourth. */
const OUTCOMES = [
  { value: "upheld", label: "Uphold — the record stands as it is" },
  { value: "amended", label: "Amend — supersede the statement" },
  { value: "withdrawn", label: "Withdraw — it does not contribute" },
] as const;

const Reconsideration = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [cases, setCases] = useState<CorrectionCase[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [outcome, setOutcome] = useState<string>("");
  const [reasoning, setReasoning] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const load = useCallback(async () => {
    const [{ data: caseRows }, { data: assignRows }] = await Promise.all([
      supabase
        .from("t3a_correction_case")
        .select("*")
        .is("resolved_at", null)
        .order("raised_at", { ascending: true }),
      supabase.from("t3a_reconsideration_assignment").select("*"),
    ]);
    setCases((caseRows ?? []) as CorrectionCase[]);
    setAssignments((assignRows ?? []) as Assignment[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Eligibility is the server's answer, not this screen's. Asking before
  // offering the control is the whole point: an involved actor never
  // sees an action they would be refused.
  useEffect(() => {
    const check = async () => {
      if (!selected || !user?.id) {
        setEligibility(null);
        return;
      }
      const { data } = await supabase.rpc("t3a_d1_reconsiderer_eligible", {
        p_actor: user.id,
        p_correction_case_id: selected,
      });
      setEligibility((data ?? null) as Eligibility | null);
    };
    void check();
  }, [selected, user?.id]);

  const onRecordOutcome = async () => {
    const assignment = assignments.find((a) => a.correction_case_id === selected);
    if (!assignment) return;

    setIsWorking(true);
    const { data } = await supabase.rpc("t3a_d1_record_reconsideration_outcome", {
      p_reconsideration_assignment_id: assignment.reconsideration_assignment_id,
      p_outcome: outcome,
      p_reasoning: reasoning,
    });
    setIsWorking(false);

    const verdict = data as { recorded?: boolean; refusal_code?: string } | null;
    if (!verdict?.recorded) {
      toast({
        title: verdict?.refusal_code ?? "That outcome could not be recorded.",
        variant: "destructive",
      });
      return;
    }

    setOutcome("");
    setReasoning("");
    toast({
      title: "Outcome recorded",
      description:
        "An amendment supersedes the statement. The earlier version stays in the audit history.",
    });
    await load();
  };

  if (isLoading) return <LedgerLoading />;

  const theCase = cases.find((c) => c.correction_case_id === selected) ?? null;
  const assignment = assignments.find((a) => a.correction_case_id === selected) ?? null;
  const mineToDecide =
    assignment?.reconsiderer_id === user?.id && assignment?.outcome === null;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Correction and reconsideration"
        title="Cases raised about a record"
        meta="A reconsideration goes to someone who had no part in the record. Nothing here edits a statement in place."
        actions={<LedgerBadge variant="outline">Independence required</LedgerBadge>}
      />

      <DashSection eyebrow="§ I · Intake" title="Open cases">
        {cases.length === 0 ? (
          <EmptyState title="No correction case is open." />
        ) : (
          <div className="border-t-2 border-foreground">
            {cases.map((c) => {
              const a = assignments.find((x) => x.correction_case_id === c.correction_case_id);
              return (
                <button
                  key={c.correction_case_id}
                  type="button"
                  onClick={() => setSelected(c.correction_case_id)}
                  className={cn(
                    "w-full text-left flex flex-wrap gap-x-8 gap-y-1 py-4 border-b border-foreground/20 transition-colors",
                    selected === c.correction_case_id
                      ? "bg-foreground/[0.04]"
                      : "hover:bg-foreground/[0.02]"
                  )}
                >
                  <span className="mono-label text-foreground/55 w-52">
                    {c.ground.replace(/_/g, " ")}
                  </span>
                  <span className="text-foreground/70">
                    raised {new Date(c.raised_at).toLocaleDateString()}
                  </span>
                  <span className="text-foreground/60">
                    {a?.reconsiderer_id ? "assigned" : "not yet assigned"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </DashSection>

      {theCase && (
        <>
          <DashSection eyebrow="§ II · The case" title="What was raised">
            <dl className="max-w-3xl space-y-4 border-t-2 border-foreground pt-6">
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-40">Ground</dt>
                <dd className="text-foreground/85">{theCase.ground.replace(/_/g, " ")}</dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-40">What was said</dt>
                <dd className="text-foreground/85 flex-1 min-w-[16rem] leading-relaxed">
                  {theCase.narrative ?? "Not recorded"}
                </dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-40">Raised</dt>
                <dd className="text-foreground/85">
                  {new Date(theCase.raised_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </DashSection>

          <DashSection eyebrow="§ III · Independence" title="Whether this is yours to decide">
            {eligibility?.eligible ? (
              <p className="text-foreground/80 max-w-2xl leading-relaxed">
                You had no part in this record, so you may reconsider it. Doing
                so makes you involved in it from now on, and a later case about
                the same record will not come back to you.
              </p>
            ) : (
              <div className="max-w-2xl">
                <p className="mono-label ink-vermilion mb-3">
                  {eligibility?.refusal_code ?? "Checking…"}
                </p>
                <p className="text-foreground/80 leading-relaxed">
                  {eligibility?.refusal_code === "RECONSIDERER_IS_INVOLVED"
                    ? `You already had a part in this record — ${eligibility.involving_actions}. A reconsideration goes to someone who did not.`
                    : eligibility?.refusal_code === "RECONSIDERER_IS_A_PARTY_TO_THE_CASE"
                      ? "You are a party to this case, so it is not yours to decide."
                      : "This case is not yours to decide."}
                </p>
              </div>
            )}
          </DashSection>

          {/* The outcome control exists only where the server said this
              actor may decide. An involved actor is never shown an action
              they would be refused. */}
          {mineToDecide && eligibility?.eligible && (
            <DashSection eyebrow="§ IV · The outcome" title="Uphold, amend or withdraw">
              <div className="max-w-2xl space-y-6">
                <div className="space-y-2">
                  {OUTCOMES.map((o) => (
                    <label
                      key={o.value}
                      className={cn(
                        "flex gap-3 items-start p-3 border cursor-pointer transition-colors",
                        outcome === o.value
                          ? "border-foreground bg-foreground/[0.04]"
                          : "border-foreground/20 hover:border-foreground/45"
                      )}
                    >
                      <input
                        type="radio"
                        name="outcome"
                        checked={outcome === o.value}
                        onChange={() => setOutcome(o.value)}
                        className="mt-1"
                      />
                      <span className="text-foreground/85 text-[0.9375rem]">{o.label}</span>
                    </label>
                  ))}
                </div>

                <label className="block">
                  <span className="mono-label text-foreground/70 block mb-2">
                    Your reasoning
                  </span>
                  <span className="block text-foreground/60 text-[0.875rem] mb-3 leading-relaxed">
                    An outcome without reasoning is not an outcome. This is the
                    record of why, and it is kept.
                  </span>
                  <textarea
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    rows={6}
                    className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
                  />
                </label>

                <Button
                  disabled={isWorking || outcome === "" || reasoning.trim().length < 8}
                  onClick={() => void onRecordOutcome()}
                >
                  {isWorking ? "Recording…" : "Record the outcome"}
                </Button>

                <p className="text-foreground/60 text-[0.875rem] leading-relaxed">
                  An amendment supersedes the statement and the earlier version
                  stays in the audit history. Nothing here rewrites what was
                  composed.
                </p>
              </div>
            </DashSection>
          )}
        </>
      )}
    </div>
  );
};

export default Reconsideration;
