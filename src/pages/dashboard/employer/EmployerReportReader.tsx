/**
 * Reading one available report (CORR-007 CR-09 route 1). The database serves only an issued, current report that the participant has made
 * available and consented to share; it records the read for the participant. If the report was amended, the later version is served and this page says so.
 * The page shows the report face and nothing else: no traceability sheet, no other report, no export.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { LedgerLoading } from "@/components/dashboard/primitives";
import TestTag from "@/components/TestTag";

interface FaceBlock {
  block_no: number; block_name: string; renders: boolean; controlled_text: string | null;
  rows: { dimension_id: string; stage_code: string; statement: string }[] | null;
}
interface Read { outcome?: string; superseded_version_requested?: boolean; face?: { rendered?: boolean; refusal_code?: string; blocks?: FaceBlock[] } }

export default function EmployerReportReader() {
  const { berReportId } = useParams<{ berReportId: string }>();
  const [res, setRes] = useState<Read | null | "error">(null);

  useEffect(() => {
    if (!berReportId) return;
    let live = true;
    void supabase.rpc("t3a_ga_read", { p_ber_report_id: berReportId }).then(({ data, error }) => { if (live) setRes(error ? "error" : ((data as Read) ?? {})); });
    return () => { live = false; };
  }, [berReportId]);

  if (res === null) return <LedgerLoading />;
  if (res === "error") return <p role="alert">The report could not be loaded. Please try again.</p>;
  const back = <Link to="/dashboard/employer/reports" className="text-sm underline">Back to Available Reports</Link>;
  if (res.outcome !== "read") {
    return <div className="space-y-3" data-testid="reader-unavailable"><p role="status">This report is not available. The participant may have turned it off, or it may not be issued.</p>{back}</div>;
  }
  if (!res.face?.rendered) {
    return <div className="space-y-3" data-testid="reader-incomplete"><p role="alert">{res.face?.refusal_code ?? "REPORT_FACE_DID_NOT_RENDER"}: this report is incomplete and is not shown. Nothing partial is displayed.</p>{back}</div>;
  }
  return (
    <article className="space-y-8 max-w-3xl" data-testid="reader">
      {back}
      <div><TestTag inline /></div>
      {res.superseded_version_requested ? <p role="status" data-testid="reader-superseded">This report was corrected. You are reading the corrected version.</p> : null}
      {(res.face.blocks ?? []).filter((b) => b.renders).map((b) => (
        <section key={b.block_no}>
          <h2 className="text-sm font-medium mb-2">{b.block_no}. {b.block_name}</h2>
          {b.controlled_text ? <p className="whitespace-pre-line leading-relaxed">{b.controlled_text}</p> : null}
          {b.rows && b.rows.length > 0 ? (
            <table className="w-full text-left mt-3">
              <thead><tr><th className="py-2 pr-4 font-normal">Dimension</th><th className="py-2 pr-4 font-normal">Stage</th><th className="py-2 font-normal">Observed conduct</th></tr></thead>
              <tbody>{b.rows.map((r, i) => (<tr key={i} className="align-top border-t"><td className="py-2 pr-4">{r.dimension_id}</td><td className="py-2 pr-4">{r.stage_code}</td><td className="py-2">{r.statement}</td></tr>))}</tbody>
            </table>
          ) : null}
        </section>
      ))}
    </article>
  );
}
