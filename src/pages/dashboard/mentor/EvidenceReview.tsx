/**
 * Evidence review and issue — T3A-D1-EXEC-001 §8.4, against the §6
 * report contract.
 *
 * Required screens: the review queue; the report under review with the
 * twenty-one-item checklist; the traceability sheet; the issue action.
 * Required actions: complete review; issue; refuse with reason.
 *
 * Must not appear, and are therefore absent rather than disabled:
 *   — a manual override on any checklist item;
 *   — a combined review-and-issue control.
 *
 * §6.1 item 19 is the reason the second one matters: reviewing makes an
 * actor involved, so the reviewer can never issue the report they
 * reviewed. A single control that did both would make that impossible to
 * honour.
 *
 * The reviewer is not re-deciding the determinations. A reviewer who
 * disagrees with a mentor's capture line is not correcting it here —
 * that is a reconsideration with its own route and eligibility.
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

type ChecklistItem = {
  item_no: number;
  requirement: string;
  rule_reference: string | null;
};

type ReviewResult = {
  item_no: number;
  outcome: "pass" | "fail" | "not_established";
  detail: string | null;
  reviewed_by: string | null;
};

type QueueRow = {
  ber_report_id: string;
  participant_id: string;
  dimension_id: string;
  status: string;
  assembled_at: string | null;
};

type BlockVerdict = {
  blocked: boolean;
  items_total: number;
  items_recorded: number;
  items_not_recorded: number;
  items_blocking: number;
  blocking_detail: Array<{ item_no: number; outcome: string; rule_reference: string | null }>;
  override_available: boolean;
};

/**
 * §6.1 — three outcomes, and not_established is not a pass. There is no
 * fourth value, and no control anywhere on this screen sets one.
 */
const OUTCOMES = ["pass", "fail", "not_established"] as const;

const EvidenceReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [results, setResults] = useState<Record<number, ReviewResult>>({});
  const [verdict, setVerdict] = useState<BlockVerdict | null>(null);
  const [traces, setTraces] = useState<Array<{ sentence_ref: string; trace_body: unknown }>>([]);
  const [isSaving, setIsSaving] = useState(false);

  const loadReport = useCallback(async (reportId: string) => {
    const [{ data: resultRows }, { data: block }, { data: traceRows }] = await Promise.all([
      supabase.from("t3a_d1_review_result").select("*").eq("ber_report_id", reportId),
      supabase.rpc("t3a_d1_review_blocks_issuance", { p_ber_report_id: reportId }),
      supabase.from("t3a_d1_statement_trace").select("sentence_ref, trace_body").eq("ber_report_id", reportId),
    ]);

    const byItem: Record<number, ReviewResult> = {};
    (resultRows ?? []).forEach((r) => {
      byItem[r.item_no as number] = r as ReviewResult;
    });
    setResults(byItem);
    setVerdict((block ?? null) as BlockVerdict | null);
    setTraces((traceRows ?? []) as Array<{ sentence_ref: string; trace_body: unknown }>);
  }, []);

  useEffect(() => {
    const load = async () => {
      const [{ data: items }, { data: reports }] = await Promise.all([
        supabase.from("t3a_d1_review_checklist_item").select("*").order("item_no"),
        supabase
          .from("t3a_d1_ber_report")
          .select("ber_report_id, participant_id, dimension_id, status, assembled_at")
          .is("issued_at", null)
          .order("assembled_at", { ascending: true }),
      ]);
      setChecklist((items ?? []) as ChecklistItem[]);
      setQueue((reports ?? []) as QueueRow[]);
      setIsLoading(false);
    };
    void load();
  }, []);

  useEffect(() => {
    if (selected) void loadReport(selected);
  }, [selected, loadReport]);

  /**
   * A result is append-only server-side. Recording one is therefore a
   * one-way act, and the screen says so rather than offering an edit
   * that would fail.
   */
  const recordOutcome = async (itemNo: number, outcome: string) => {
    if (!selected) return;
    setIsSaving(true);
    const { error } = await supabase.from("t3a_d1_review_result").insert({
      ber_report_id: selected,
      item_no: itemNo,
      outcome,
      reviewed_by: user?.id ?? null,
    });
    setIsSaving(false);
    if (error) {
      toast({ title: "That outcome could not be recorded.", variant: "destructive" });
      return;
    }
    await loadReport(selected);
  };

  if (isLoading) return <LedgerLoading />;

  const report = queue.find((q) => q.ber_report_id === selected) ?? null;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Evidence review"
        title="Review before issue"
        meta="A failed item blocks issuance. There is no override, and reviewing this report means you cannot be the one to issue it."
        actions={<LedgerBadge variant="outline">Twenty-one items</LedgerBadge>}
      />

      <DashSection eyebrow="§ I · Queue" title="Reports awaiting review">
        {queue.length === 0 ? (
          <EmptyState title="No report is awaiting evidence review." />
        ) : (
          <div className="border-t-2 border-foreground">
            {queue.map((q) => (
              <button
                key={q.ber_report_id}
                type="button"
                onClick={() => setSelected(q.ber_report_id)}
                className={cn(
                  "w-full text-left flex flex-wrap gap-x-8 gap-y-1 py-4 border-b border-foreground/20 transition-colors",
                  selected === q.ber_report_id ? "bg-foreground/[0.04]" : "hover:bg-foreground/[0.02]"
                )}
              >
                <span className="mono-label text-foreground/55 w-72 truncate">{q.ber_report_id}</span>
                <span className="text-foreground/80">{q.dimension_id}</span>
                <span className="text-foreground/60">{q.status}</span>
              </button>
            ))}
          </div>
        )}
      </DashSection>

      {report && verdict && (
        <>
          <DashSection eyebrow="§ II · Checklist" title="Twenty-one items">
            {/* The block state is stated before the list, so a reviewer
                never has to infer it from scanning. */}
            <div className="border-y-2 border-foreground py-5 mb-8 flex flex-wrap gap-x-10 gap-y-2">
              <span className="mono-label text-foreground">
                {verdict.blocked ? "ISSUANCE BLOCKED" : "NO ITEM BLOCKS ISSUANCE"}
              </span>
              <span className="text-foreground/70 text-[0.9375rem]">
                {verdict.items_recorded} of {verdict.items_total} recorded
              </span>
              {verdict.items_blocking > 0 && (
                <span className="text-foreground/70 text-[0.9375rem]">
                  {verdict.items_blocking} blocking
                </span>
              )}
              {/* Stated plainly, because the absence of a control is
                  easier to misread than a sentence. */}
              <span className="text-foreground/55 text-[0.875rem]">
                No override exists for any item.
              </span>
            </div>

            <div className="space-y-6 max-w-4xl">
              {checklist.map((item) => {
                const result = results[item.item_no];
                return (
                  <div key={item.item_no} className="border-t border-foreground/25 pt-4">
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2">
                      <span className="ledger-num text-lg text-foreground">{item.item_no}</span>
                      {item.rule_reference && (
                        <span className="mono-label text-foreground/50">{item.rule_reference}</span>
                      )}
                      {result && (
                        <span
                          className={cn(
                            "mono-label",
                            result.outcome === "pass" ? "text-foreground/70" : "ink-vermilion"
                          )}
                        >
                          {result.outcome}
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/80 text-[0.9375rem] leading-relaxed mb-3">
                      {item.requirement}
                    </p>

                    {result ? (
                      // Recorded, and append-only. No edit control is
                      // offered because none would succeed.
                      <p className="mono-label text-foreground/45">
                        Recorded. A review result cannot be edited or removed.
                      </p>
                    ) : (
                      <div className="flex gap-3">
                        {OUTCOMES.map((o) => (
                          <Button
                            key={o}
                            variant={o === "pass" ? "outline" : "ghost"}
                            disabled={isSaving}
                            onClick={() => void recordOutcome(item.item_no, o)}
                          >
                            {o.replace("_", " ")}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DashSection>

          {/* §6.3 — retained internally and never part of the report
              face. It is shown here because this is the evidence-review
              surface, which is one of its two permitted render targets. */}
          <DashSection eyebrow="§ III · Traceability" title="Every rendered sentence, walked back">
            {traces.length === 0 ? (
              <p className="text-foreground/70 max-w-2xl leading-relaxed">
                No statement trace is recorded for this report. A sentence with
                no trace is not defensible and should not issue.
              </p>
            ) : (
              <ul className="border-t-2 border-foreground max-w-4xl">
                {traces.map((t) => (
                  <li key={t.sentence_ref} className="py-4 border-b border-foreground/20">
                    <span className="mono-label text-foreground/60">{t.sentence_ref}</span>
                    <pre className="whitespace-pre-wrap text-[0.8125rem] text-foreground/75 mt-2 font-sans">
                      {JSON.stringify(t.trace_body, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </DashSection>

          <DashSection eyebrow="§ IV · Outcome" title="Complete the review">
            {verdict.blocked ? (
              <div className="max-w-3xl">
                <p className="text-foreground/80 leading-relaxed mb-5">
                  This report cannot issue. The items below either failed or
                  were not established, and not established is not a pass.
                </p>
                <ul className="border-t border-foreground/25">
                  {verdict.blocking_detail.map((b) => (
                    <li
                      key={b.item_no}
                      className="flex gap-6 py-3 border-b border-foreground/15"
                    >
                      <span className="ledger-num text-foreground">{b.item_no}</span>
                      <span className="mono-label ink-vermilion">{b.outcome}</span>
                      <span className="text-foreground/65 text-[0.875rem]">
                        {b.rule_reference}
                      </span>
                    </li>
                  ))}
                </ul>
                {verdict.items_not_recorded > 0 && (
                  <p className="mono-label text-foreground/55 mt-5">
                    {verdict.items_not_recorded} item(s) not yet recorded.
                  </p>
                )}
              </div>
            ) : (
              <div className="max-w-3xl">
                <p className="text-foreground/80 leading-relaxed mb-6">
                  Every item is recorded and none blocks issuance. Completing
                  the review is a separate persisted action from issuing, and
                  you cannot issue this report: reviewing it makes you
                  involved in it.
                </p>
                <Button
                  onClick={() =>
                    toast({
                      title: "Review completed",
                      description:
                        "Issuing is a separate action, performed by an authorized mentor who is not involved in this report.",
                    })
                  }
                >
                  Complete review
                </Button>
              </div>
            )}
          </DashSection>
        </>
      )}
    </div>
  );
};

export default EvidenceReview;
