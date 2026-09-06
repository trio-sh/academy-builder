import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Signature,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

/**
 * D1 Observation Pathway — participant pane.
 *
 * The single pane of glass that ties INS-001..010 together for the
 * person the pathway is about. Reads live and shows:
 *
 *   §1  Where you are — current D1 stage + next-step legibility
 *   §2  Your Behavioral Evidence Reports on D1 (all rows for this
 *       participant across the report lifecycle)
 *   §3  Correction cases you have raised (if any) with their state
 *   §4  Disclosures you have released (if any), with revoke controls
 *   §5  What is holding the pathway — the authority register blockers
 *       (FD-D1-04 UNSET, REC-04 UNSET, etc.). This is presented as
 *       fact, not blame: nothing about the participant is on trial
 *       here.
 *
 * Every action button is wired to the SECURITY DEFINER RPCs shipped
 * with INS-006 / INS-007. Where a downstream refuses (issuance
 * refuses under FD-D1-04 UNSET, for instance), the refusal reason is
 * surfaced verbatim so the participant sees exactly what is
 * blocking.
 *
 * Layout: ledger voice — mono labels, display-serif headings,
 * generous vertical spacing. No score, no meter, no coverage line,
 * no dimension count.
 */

type BerRow = {
  ber_report_id?: string;
  id?: string;
  status: string | null;
  dimension_id?: string | null;
  created_at?: string | null;
  amended_at?: string | null;
  withdrawn_at?: string | null;
  version_set?: unknown;
};

type IssuanceRow = {
  issuance_id: string;
  ber_report_id: string;
  state: "issued" | "superseded" | "withdrawn";
  issued_at: string;
  superseded_at?: string | null;
  withdrawn_at?: string | null;
  dimension_id?: string | null;
};

type DisclosureRow = {
  disclosure_id: string;
  issuance_id: string;
  recipient_email?: string | null;
  state: "released" | "revoked" | "expired";
  released_at?: string | null;
  revoked_at?: string | null;
  expires_at?: string | null;
};

type CorrectionRow = {
  correction_case_id: string;
  ber_report_id: string;
  challenge_status?: string | null;
  terminal_outcome?: string | null;
  created_at?: string | null;
};

type AuthorityRow = {
  key: string;
  category: string;
  state: "UNSET" | "SET" | "DEPRECATED";
  note: string | null;
};

function toneLabel(state: string) {
  const upper = state.toUpperCase();
  if (upper.includes("ISSUED") || upper === "SET") return "ok";
  if (
    upper.includes("REVIEW") ||
    upper.includes("CHALLENGE") ||
    upper.includes("READY")
  )
    return "warn";
  if (
    upper.includes("REVOKED") ||
    upper.includes("WITHDRAWN") ||
    upper === "UNSET"
  )
    return "stop";
  return "muted";
}

function toneClass(tone: string) {
  switch (tone) {
    case "ok":
      return "border-foreground bg-foreground/[0.04]";
    case "warn":
      return "border-vermilion bg-vermilion/[0.06]";
    case "stop":
      return "border-vermilion bg-vermilion/10";
    default:
      return "border-foreground/40 bg-foreground/[0.02]";
  }
}

function toneInk(tone: string) {
  switch (tone) {
    case "ok":
      return "text-foreground";
    case "warn":
      return "ink-vermilion";
    case "stop":
      return "ink-vermilion";
    default:
      return "text-foreground/70";
  }
}

/** Prose-only stage rendering — never surfaces a number or bar. */
function StageBar({ reports }: { reports: BerRow[] }) {
  const stageLabel = useMemo(() => {
    if (reports.length === 0) {
      return {
        title: "Not yet in the pathway",
        body: "When you enter the D1 Observation Pathway, the first stage will begin and appear here.",
      };
    }
    const active =
      reports.find((r) => r.status === "participant_review") ??
      reports.find((r) => r.status === "challenge_open") ??
      reports.find((r) => r.status === "ready_to_issue") ??
      reports.find((r) => r.status === "issued") ??
      reports[0];
    const s = (active?.status ?? "").toLowerCase();
    switch (s) {
      case "participant_review":
        return {
          title: "A draft is waiting for your review",
          body: "The mentor has recorded a Behavioral Evidence Report. Read it in full before it can go any further — you may accept it as it stands, or raise a correction on anything you feel is wrong.",
        };
      case "challenge_open":
        return {
          title: "A correction is open",
          body: "You have raised a correction on this report. It will not issue until the correction is resolved — whether that resolution is a change to the record or a decision that no change is needed.",
        };
      case "ready_to_issue":
        return {
          title: "Cleared for issuance",
          body: "You have accepted the draft, and it is now waiting on the evidence-review authority to issue. Issuance decides who signs the record. See §5 below for what has to be settled before that can fire.",
        };
      case "issued":
        return {
          title: "Your report has been issued",
          body: "The record is on file and can be shown to a recipient of your choice. Release it, revoke it, or keep it private — the decision is yours.",
        };
      case "amended":
        return {
          title: "The report has been amended",
          body: "The prior issuance has been superseded by a new one. Both remain verifiable; the superseded copy carries a 'superseded' marker.",
        };
      case "withdrawn":
        return {
          title: "The report has been withdrawn",
          body: "The record has been withdrawn from the register. It no longer counts as current evidence.",
        };
      default:
        return {
          title: "In progress",
          body: "The report is being assembled. When it needs your attention, it will appear here.",
        };
    }
  }, [reports]);

  return (
    <div className="border-2 border-foreground p-5 bg-background">
      <div className="mono-label text-foreground/60 mb-2">§ Where you are</div>
      <h2 className="display-serif text-2xl md:text-3xl text-foreground leading-tight">
        {stageLabel.title}
      </h2>
      <p className="text-foreground/80 mt-3 leading-relaxed max-w-2xl">
        {stageLabel.body}
      </p>
    </div>
  );
}

function ReportRow({ report }: { report: BerRow }) {
  const status = (report.status ?? "unknown").toLowerCase();
  const tone = toneLabel(status);
  return (
    <div
      className={`border-2 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${toneClass(
        tone
      )}`}
    >
      <div className="min-w-0">
        <div className="mono-label text-foreground/60 mb-1">
          § D1 · {(report.dimension_id ?? "D1").toString()}
        </div>
        <div className={`display-serif text-lg ${toneInk(tone)}`}>
          {status.replace(/_/g, " ")}
        </div>
        {report.created_at && (
          <div className="text-xs text-foreground/60 mt-1">
            Opened {new Date(report.created_at).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
}

function CorrectionRowView({ c }: { c: CorrectionRow }) {
  const state = (c.challenge_status ?? c.terminal_outcome ?? "open").toLowerCase();
  const tone = toneLabel(state);
  return (
    <div className={`border-2 p-4 ${toneClass(tone)}`}>
      <div className="mono-label text-foreground/60 mb-1">§ Correction case</div>
      <div className={`display-serif text-lg ${toneInk(tone)}`}>
        {state.replace(/_/g, " ")}
      </div>
      {c.terminal_outcome && (
        <div className="text-xs text-foreground/60 mt-1">
          Terminal outcome: {c.terminal_outcome}
        </div>
      )}
    </div>
  );
}

function DisclosureRowView({
  d,
  onRevoke,
  revoking,
}: {
  d: DisclosureRow;
  onRevoke: (id: string) => void;
  revoking: string | null;
}) {
  const tone = toneLabel(d.state);
  return (
    <div
      className={`border-2 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${toneClass(
        tone
      )}`}
    >
      <div className="min-w-0">
        <div className="mono-label text-foreground/60 mb-1">§ Disclosure</div>
        <div className={`display-serif text-lg ${toneInk(tone)}`}>
          {d.state}
        </div>
        {d.recipient_email && (
          <div className="text-xs text-foreground/70 mt-1">
            Released to {d.recipient_email}
          </div>
        )}
        {d.released_at && (
          <div className="text-xs text-foreground/60">
            {new Date(d.released_at).toLocaleDateString()}
          </div>
        )}
      </div>
      {d.state === "released" && (
        <Button
          variant="outline"
          className="rounded-none border-2 border-vermilion ink-vermilion hover:bg-vermilion/[0.05]"
          disabled={revoking === d.disclosure_id}
          onClick={() => onRevoke(d.disclosure_id)}
        >
          {revoking === d.disclosure_id ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Revoking…
            </>
          ) : (
            "Revoke access"
          )}
        </Button>
      )}
    </div>
  );
}

export default function D1PathwayPane() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reports, setReports] = useState<BerRow[]>([]);
  const [issuances, setIssuances] = useState<IssuanceRow[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRow[]>([]);
  const [disclosures, setDisclosures] = useState<DisclosureRow[]>([]);
  const [authority, setAuthority] = useState<AuthorityRow[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setErr(null);

    const errs: string[] = [];

    // BER reports for this participant
    try {
      const { data, error } = await supabase
        .from("t3a_d1_ber_report")
        .select("*")
        .eq("participant_id", user.id);
      if (error) errs.push(`ber_report: ${error.message}`);
      setReports((data ?? []) as BerRow[]);
    } catch (e) {
      errs.push(`ber_report: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Issuances for this participant
    try {
      const { data, error } = await supabase
        .from("t3a_d1_report_issuance")
        .select("*")
        .eq("participant_id", user.id);
      if (error) errs.push(`issuance: ${error.message}`);
      setIssuances((data ?? []) as IssuanceRow[]);
    } catch (e) {
      errs.push(`issuance: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Correction cases (INS-006 extended t3a_correction_case)
    try {
      const { data, error } = await supabase
        .from("t3a_correction_case")
        .select(
          "correction_case_id, ber_report_id, challenge_status, terminal_outcome, created_at"
        )
        .eq("participant_id", user.id);
      if (error) errs.push(`corrections: ${error.message}`);
      setCorrections((data ?? []) as CorrectionRow[]);
    } catch (e) {
      errs.push(`corrections: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Disclosures — the participant controls these directly
    try {
      const { data, error } = await supabase
        .from("t3a_d1_report_disclosure")
        .select("*")
        .eq("released_by", user.id);
      if (error) errs.push(`disclosures: ${error.message}`);
      setDisclosures((data ?? []) as DisclosureRow[]);
    } catch (e) {
      errs.push(`disclosures: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Authority register — publicly readable
    try {
      const { data, error } = await supabase
        .from("t3a_d1_authority_register")
        .select("key, category, state, note")
        .order("category")
        .order("key");
      if (error) errs.push(`authority: ${error.message}`);
      setAuthority((data ?? []) as AuthorityRow[]);
    } catch (e) {
      errs.push(`authority: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (errs.length > 0) setErr(errs.join(" · "));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const revokeDisclosure = useCallback(
    async (disclosureId: string) => {
      setRevoking(disclosureId);
      try {
        const { data, error } = await supabase.rpc(
          "t3a_d1_revoke_disclosure",
          { p_disclosure_id: disclosureId }
        );
        if (error) throw error;
        if (
          data &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          (data as { ok?: boolean }).ok === false
        ) {
          alert(
            `Could not revoke: ${(data as { reason?: string }).reason ?? "unknown"}`
          );
        }
      } catch (e) {
        alert(
          `Could not revoke: ${e instanceof Error ? e.message : String(e)}`
        );
      } finally {
        setRevoking(null);
        await load();
      }
    },
    [load]
  );

  const unsetAuthority = authority.filter((a) => a.state !== "SET");
  const setAuthorityCount = authority.length - unsetAuthority.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* Section header */}
      <div>
        <div className="mono-label text-foreground/60 mb-3">
          § D1 · Integrity and Ethics
        </div>
        <h1 className="display-serif text-3xl md:text-4xl text-foreground leading-tight">
          The Observation Pathway
        </h1>
        <p className="text-foreground/70 mt-3 max-w-2xl leading-relaxed">
          A record of your work through the D1 pathway — where you are, what
          you own, and what is holding the register between you and an issued
          report. Nothing about you is on trial here. This page states facts
          about the process, not judgments about the person.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-foreground/70">
          <Loader2 className="w-4 h-4 animate-spin" /> Reading the register…
        </div>
      ) : (
        <>
          {err && (
            <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4">
              <div className="mono-label ink-vermilion mb-1">
                § Some rows could not be read
              </div>
              <p className="text-sm text-foreground/85 break-words">{err}</p>
              <p className="text-xs text-foreground/60 mt-2">
                This usually means the corresponding surface is not enabled
                for your account yet, or is fail-closed under an authority
                that has not been set (see §5).
              </p>
            </div>
          )}

          {/* §1 · Where you are */}
          <StageBar reports={reports} />

          {/* §2 · Your reports */}
          <div>
            <div className="mono-label text-foreground/60 mb-3">
              § Your Behavioral Evidence Reports
            </div>
            {reports.length === 0 ? (
              <div className="border border-dashed border-foreground/30 p-6 text-foreground/70 text-sm">
                <FileText className="w-5 h-5 inline mr-2" />
                No reports on file yet. When your mentor completes an
                observation, the resulting draft will appear here for you to
                review before anything goes further.
              </div>
            ) : (
              <ul className="space-y-3">
                {reports.map((r) => (
                  <li key={r.ber_report_id ?? r.id}>
                    <ReportRow report={r} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* §3 · Correction cases */}
          {corrections.length > 0 && (
            <div>
              <div className="mono-label text-foreground/60 mb-3">
                § Corrections you have raised
              </div>
              <ul className="space-y-3">
                {corrections.map((c) => (
                  <li key={c.correction_case_id}>
                    <CorrectionRowView c={c} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* §4 · Disclosures */}
          {issuances.length > 0 && (
            <div>
              <div className="mono-label text-foreground/60 mb-3">
                § Disclosures you have released
              </div>
              {disclosures.length === 0 ? (
                <div className="border border-dashed border-foreground/30 p-6 text-foreground/70 text-sm">
                  <Signature className="w-5 h-5 inline mr-2" />
                  Your report is issued. Nothing has been released to any
                  recipient — the record stays private until you release it.
                </div>
              ) : (
                <ul className="space-y-3">
                  {disclosures.map((d) => (
                    <li key={d.disclosure_id}>
                      <DisclosureRowView
                        d={d}
                        onRevoke={revokeDisclosure}
                        revoking={revoking}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* §5 · What is holding this — authority register */}
          <div>
            <div className="mono-label text-foreground/60 mb-3">
              § What is holding the register
            </div>
            {authority.length === 0 ? (
              <p className="text-foreground/60 text-sm">
                The register is empty — the pathway has not been activated yet.
              </p>
            ) : unsetAuthority.length === 0 ? (
              <div className="border-2 border-foreground bg-foreground/[0.04] p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-6 h-6 text-foreground mt-1" />
                  <div>
                    <div className="display-serif text-xl text-foreground">
                      Every locked decision is set.
                    </div>
                    <p className="text-sm text-foreground/75 mt-2 max-w-xl">
                      Nothing above the participant level is blocking your
                      report from moving through the pathway.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-vermilion bg-vermilion/[0.06] p-5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 ink-vermilion mt-1" />
                  <div className="flex-1 min-w-0">
                    <div className="display-serif text-xl ink-vermilion">
                      {unsetAuthority.length} author-locked{" "}
                      {unsetAuthority.length === 1 ? "decision" : "decisions"}{" "}
                      still pending
                    </div>
                    <p className="text-sm text-foreground/85 mt-2 max-w-xl">
                      Some steps in the pathway wait on a founder-level
                      decision. Until every row below is set, issuance and
                      certain reader surfaces remain refused — by design, so
                      no one exercises an authority that does not yet exist.
                    </p>
                    <p className="mono-label text-xs text-foreground/60 mt-3">
                      {setAuthorityCount} set · {unsetAuthority.length} unset
                    </p>
                    <ul className="mt-4 space-y-2">
                      {unsetAuthority.map((a) => (
                        <li
                          key={a.key}
                          className="text-sm flex items-start gap-3"
                        >
                          <span className="mono-label text-foreground/70 shrink-0 min-w-[64px]">
                            {a.key}
                          </span>
                          <span className="text-foreground/85">
                            {a.note ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* §6 · Reference — small footer strip */}
          <div className="border-t border-foreground/20 pt-6 grid md:grid-cols-3 gap-4 text-xs text-foreground/70">
            <div>
              <div className="mono-label text-foreground/60 mb-1">§ Privacy</div>
              Nothing about you reaches an employer unless you release it —
              mentor assignment, observation and messaging do not release
              your report.
            </div>
            <div>
              <div className="mono-label text-foreground/60 mb-1">§ Record</div>
              Every change to the record is itself recorded. The register
              never edits history in place; amendments issue a new version
              and mark the prior one superseded.
            </div>
            <div>
              <div className="mono-label text-foreground/60 mb-1">§ Voice</div>
              This page describes the process, not the person. No score, no
              rank, no coverage figure, no pass or fail.
            </div>
          </div>

          {/* Tiny meta strip */}
          <div className="flex items-center gap-4 text-xs text-foreground/50">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> D1 Observation Pathway
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Live · read from the register
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> INS-001 through INS-010
              live
            </span>
          </div>
        </>
      )}
    </motion.section>
  );
}
