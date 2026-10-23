/**
 * CORR-007 CR-25: the accessible equivalent of an issued report. It carries the same approved content as the visual report, as a tagged document:
 * a language, a title, a heading for each section, paragraphs, and a data table with a caption and header cells. It is read from the database and drawn
 * with plain semantic elements; nothing is added, shortened or reordered here. If the equivalent is missing, nothing is invented.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import TestTag from "@/components/TestTag";

interface Child { tag: string; text?: string; caption?: string; header?: string[]; rows?: string[][] }
interface Section { tag: string; block_no: number; heading: { tag: string; text: string }; children: Child[] }
interface Tagged { role?: string; lang?: string; title?: string; children?: Section[] }
interface Read { rendered?: boolean; refusal_code?: string; tagged?: Tagged }

const REFUSAL_COPY: Record<string, string> = {
  CALLER_NOT_ENTITLED_TO_THIS_REPORT: "This report is not available to you.",
  NO_CALLER_OR_REPORT: "This report is not available to you.",
  ACCESSIBLE_COPY_MISSING: "The accessible version of this report is not available yet.",
};

export default function AccessibleReport() {
  const { berReportId } = useParams<{ berReportId: string }>();
  const [res, setRes] = useState<Read | null | "error">(null);

  useEffect(() => {
    if (!berReportId) return;
    let live = true;
    void supabase.rpc("t3a_report_accessible_read", { p_report: berReportId }).then(({ data, error }) => { if (live) setRes(error ? "error" : ((data as Read) ?? {})); });
    return () => { live = false; };
  }, [berReportId]);

  if (res === null) return <p role="status">Loading…</p>;
  if (res === "error") return <p role="alert">The report could not be loaded. Please try again.</p>;
  if (!res.rendered || !res.tagged) {
    return <p role="status" data-testid="acc-refused">{REFUSAL_COPY[res.refusal_code ?? ""] ?? "The accessible version is not available."}</p>;
  }
  const t = res.tagged;
  return (
    <article lang={t.lang ?? "en"} data-testid="accessible-report" className="space-y-8 max-w-3xl">
      <div><TestTag inline /></div>
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      {(t.children ?? []).map((s) => (
        <section key={s.block_no} aria-labelledby={`acc-h-${s.block_no}`}>
          <h2 id={`acc-h-${s.block_no}`} className="text-lg font-medium mb-2">{s.heading.text}</h2>
          {s.children.map((c, i) => c.tag === "p" ? (
            <p key={i} className="whitespace-pre-line leading-relaxed mb-3">{c.text}</p>
          ) : c.tag === "table" ? (
            <table key={i} className="w-full text-left mb-3">
              <caption className="text-left text-sm mb-1">{c.caption}</caption>
              <thead><tr>{(c.header ?? []).map((h) => (<th key={h} scope="col" className="py-2 pr-4 font-medium">{h}</th>))}</tr></thead>
              <tbody>{(c.rows ?? []).map((r, ri) => (<tr key={ri} className="align-top border-t">{r.map((cell, ci) => (<td key={ci} className="py-2 pr-4">{cell}</td>))}</tr>))}</tbody>
            </table>
          ) : null)}
        </section>
      ))}
    </article>
  );
}
