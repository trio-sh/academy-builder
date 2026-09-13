/**
 * The report face — T3A-D1-EXEC-001 §6.
 *
 * The eleven blocks on a page, in contract order, with the controlled
 * texts rendered verbatim.
 *
 * Must not appear, and are absent here:
 *   — the traceability sheet, or any part of it (§6.3);
 *   — any mentor name (block 5);
 *   — any score, rank or readiness indicator.
 *
 * None of those is filtered out on arrival. The face is assembled by
 * t3a_d1_report_face, which never reads the traceability register and
 * never selects an observer, confirmer or composer into the payload, so
 * this screen has nothing to strip.
 *
 * §6.2: a controlled text renders verbatim. It is printed as it arrives
 * — there is no template step, no substitution and no place a variable
 * could be interpolated into one.
 *
 * A conditional block that did not fire renders as a named block with
 * its reason rather than vanishing, because a block that is absent from
 * a page and a block that had nothing to say are different facts.
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

type ConductRow = {
  dimension_id: string;
  stage_code: string;
  statement: string;
  composed_at: string;
};

type Block = {
  block_no: number;
  block_name: string;
  render_behaviour: string;
  renders: boolean;
  not_rendering_reason: string | null;
  controlled_text_ref: string | null;
  controlled_text: string | null;
  controlled_text_is_verbatim: boolean | null;
  rows: ConductRow[] | null;
};

type Face = {
  rendered: boolean;
  refusal_code?: string;
  override_available?: boolean;
  items_not_recorded?: number;
  blocking_detail?: { item_no: number; outcome: string; requirement: string }[];
  ber_report_id?: string;
  dimension_id?: string;
  status?: string;
  issued_at?: string | null;
  amended_at?: string | null;
  withdrawn_at?: string | null;
  traceability_sheet?: string;
  blocks?: Block[];
};

type ReportRow = {
  ber_report_id: string;
  dimension_id: string;
  status: string;
  issued_at: string | null;
};

const ReportFace = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [face, setFace] = useState<Face | null>(null);

  const loadReports = useCallback(async () => {
    const { data } = await supabase
      .from("t3a_d1_ber_report")
      .select("ber_report_id, dimension_id, status, issued_at")
      .order("assembled_at", { ascending: false });
    setReports((data ?? []) as ReportRow[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    const assemble = async () => {
      if (!selected) {
        setFace(null);
        return;
      }
      // The face is assembled server-side, whole. This screen lays it
      // out and adds nothing to it.
      const { data } = await supabase.rpc("t3a_d1_report_face", {
        p_ber_report_id: selected,
      });
      setFace((data ?? null) as Face | null);
    };
    void assemble();
  }, [selected]);

  if (isLoading) return <LedgerLoading />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ 6 · Report face"
        title="The eleven blocks, in order"
        meta="The controlled texts render verbatim. The traceability sheet is never part of the face."
        actions={<LedgerBadge variant="outline">No override</LedgerBadge>}
      />

      <DashSection eyebrow="§ I · Report" title="Which report">
        {reports.length === 0 ? (
          <EmptyState title="No report has been assembled." />
        ) : (
          <label className="block max-w-xl">
            <span className="mono-label text-foreground/70 block mb-2">Report</span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
            >
              <option value="">—</option>
              {reports.map((r) => (
                <option key={r.ber_report_id} value={r.ber_report_id}>
                  {r.dimension_id} · {r.status}
                </option>
              ))}
            </select>
          </label>
        )}
      </DashSection>

      {face && !face.rendered && (
        <DashSection eyebrow="§ II · Refused" title="This face does not render">
          <div className="max-w-2xl">
            <p className="mono-label ink-vermilion">{face.refusal_code}</p>
            {face.refusal_code === "REVIEW_BLOCKS_ISSUANCE" && (
              <>
                <p className="text-foreground/80 mt-4 leading-relaxed">
                  {face.items_not_recorded
                    ? `${face.items_not_recorded} of the review items have not been recorded. An item that has not been reached is not a pass.`
                    : "A review item did not pass. An item recorded as not established blocks exactly as a failure does."}
                </p>
                {(face.blocking_detail ?? []).length > 0 && (
                  <ul className="mt-5 border-t-2 border-foreground max-w-2xl">
                    {(face.blocking_detail ?? []).map((b) => (
                      <li
                        key={b.item_no}
                        className="py-3 border-b border-foreground/20 flex gap-4"
                      >
                        <span className="mono-label text-foreground/55 shrink-0">
                          {b.item_no} · {b.outcome}
                        </span>
                        <span className="text-foreground/80 leading-relaxed">
                          {b.requirement}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-foreground/65 text-[0.875rem] mt-6 leading-relaxed">
                  No override exists for any item. A checklist with an override
                  is a checklist that will be overridden.
                </p>
              </>
            )}
          </div>
        </DashSection>
      )}

      {face?.rendered && (
        <>
          <DashSection eyebrow="§ II · State" title="What this report is">
            <dl className="max-w-3xl space-y-3 border-t-2 border-foreground pt-6">
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-40">Status</dt>
                <dd className="text-foreground/85">{face.status}</dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-40">Issued</dt>
                <dd className="text-foreground/85">
                  {face.issued_at
                    ? new Date(face.issued_at).toLocaleDateString()
                    : "Not issued"}
                </dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-40">
                  Traceability sheet
                </dt>
                <dd className="text-foreground/70">{face.traceability_sheet}</dd>
              </div>
            </dl>
          </DashSection>

          {(face.blocks ?? []).map((b) => (
            <DashSection
              key={b.block_no}
              eyebrow={`§ Block ${b.block_no}`}
              title={b.block_name}
            >
              {!b.renders ? (
                <div className="max-w-2xl">
                  <p className="mono-label text-foreground/45">
                    {b.not_rendering_reason}
                  </p>
                  <p className="text-foreground/70 text-[0.875rem] mt-2 leading-relaxed">
                    {b.render_behaviour}
                  </p>
                </div>
              ) : (
                <>
                  {/* §6.2 — printed as it arrives. No substitution step. */}
                  {b.controlled_text && (
                    <p className="text-foreground/85 max-w-3xl leading-relaxed whitespace-pre-line">
                      {b.controlled_text}
                    </p>
                  )}

                  {b.rows !== null && (
                    <div className="overflow-x-auto mt-6">
                      {b.rows.length === 0 ? (
                        <p className="text-foreground/70 max-w-2xl leading-relaxed">
                          No conduct has been recorded for this report yet.
                        </p>
                      ) : (
                        <table className="w-full border-t-2 border-foreground text-left">
                          <thead>
                            <tr className="border-b border-foreground/30">
                              <th className="mono-label text-foreground/55 py-3 pr-6 font-normal">
                                Dimension
                              </th>
                              <th className="mono-label text-foreground/55 py-3 pr-6 font-normal">
                                Stage
                              </th>
                              <th className="mono-label text-foreground/55 py-3 font-normal">
                                Observed conduct
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {b.rows.map((row) => (
                              <tr
                                key={`${row.composed_at}-${row.stage_code}`}
                                className="border-b border-foreground/20 align-top"
                              >
                                <td className="py-4 pr-6 text-foreground/80">
                                  {row.dimension_id}
                                </td>
                                <td className="py-4 pr-6 text-foreground/80">
                                  {row.stage_code}
                                </td>
                                <td className="py-4 text-foreground/85 leading-relaxed">
                                  {row.statement}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {!b.controlled_text && b.rows === null && (
                    <p className="text-foreground/70 max-w-2xl leading-relaxed">
                      {b.render_behaviour}
                    </p>
                  )}
                </>
              )}

              {b.controlled_text_ref && (
                <p className="mono-label text-foreground/40 mt-6">
                  {b.controlled_text_ref}
                  {b.controlled_text_is_verbatim ? " · verbatim" : ""}
                </p>
              )}
            </DashSection>
          ))}
        </>
      )}
    </div>
  );
};

export default ReportFace;
