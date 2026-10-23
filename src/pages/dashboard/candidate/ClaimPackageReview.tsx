/**
 * CORR-007 CR-28: before a multi page report is issued, the participant sees the entry chosen for each dimension and every other entry that stays in
 * their record. The choice is made by a fixed rule held as a versioned setting; it never looks at whether the conduct appears favourable. Nothing here
 * changes the choice: this page only shows it.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

interface Entry { clause_text?: string; state_code?: string; rec?: boolean; composed_at?: string }
interface DimensionPick { dimension_id: string; rule_version?: string; selected: Entry; other_entries: Entry[] }
interface Review { outcome?: string; reason?: string; rule_version?: string; issued_rule_version?: string | null; dimensions?: DimensionPick[] }

const REFUSAL_COPY: Record<string, string> = {
  REPORT_NOT_AVAILABLE: "This report is not available to you.",
  claim_package_rule_unloaded: "The report cannot be prepared yet because the selection rule is not loaded. Nothing has been issued.",
  claim_package_absent: "There is not yet an entry to show for one of the dimensions in this report.",
};

export default function ClaimPackageReview() {
  const { berReportId } = useParams<{ berReportId: string }>();
  const [res, setRes] = useState<Review | null | "error">(null);

  useEffect(() => {
    if (!berReportId) return;
    let live = true;
    void supabase.rpc("t3a_cr28_review", { p_ber_report_id: berReportId }).then(({ data, error }) => { if (live) setRes(error ? "error" : ((data as Review) ?? {})); });
    return () => { live = false; };
  }, [berReportId]);

  if (res === null) return <p role="status">Loading…</p>;
  if (res === "error") return <p role="alert">The review could not be loaded. Please try again.</p>;
  if (res.outcome !== "review") {
    return <p role="status" data-testid="cp-refused">{REFUSAL_COPY[res.reason ?? ""] ?? "The review is not available."}</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl" data-testid="claim-package-review">
      <h1 className="text-xl font-semibold">What your report will show</h1>
      <p className="text-sm" data-testid="cp-rule">
        For each dimension your report shows one entry, chosen by a fixed rule (version {res.rule_version}). The rule does not look at whether the conduct appears favourable. Every other entry stays in your record.
      </p>
      {(res.dimensions ?? []).map((d) => (
        <section key={d.dimension_id} className="rounded-md border p-4 space-y-3" data-testid="cp-dimension">
          <h2 className="font-medium">Dimension {d.dimension_id}</h2>
          <div data-testid="cp-selected">
            <p className="text-sm font-medium">Shown on your report</p>
            <p className="text-sm">{d.selected.clause_text}</p>
            {d.selected.rec ? <p className="text-xs">Chosen because it recurs across observations.</p> : null}
          </div>
          <div data-testid="cp-others">
            <p className="text-sm font-medium">Also in your record</p>
            {d.other_entries.length === 0 ? <p className="text-sm">No other entries.</p> : (
              <ul className="space-y-1">{d.other_entries.map((o, i) => (<li key={i} className="text-sm">{o.clause_text}</li>))}</ul>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
