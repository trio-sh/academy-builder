import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck, FileText, AlertCircle, ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  DashboardPageHeader,
  DashSection,
  LedgerBadge,
  LedgerLoading,
  EmptyState,
} from "@/components/dashboard/primitives";

/**
 * §7.4 + §10 + §13 issueReport — Evidence Reviewer console.
 *
 * Reviewers see BER report drafts across the pre-issue lifecycle
 * (assembling / reviewer_review / participant_review / challenge_open /
 * ready_to_issue), trace each dimension's statement back to its
 * contributing observations, and, when the socket is enabled, issue
 * the report. Issuance itself is guarded by t3a_issue_report() and
 * currently refuses per §16.3 until Track A's five plugs land — the
 * refusal is surfaced to the reviewer verbatim.
 *
 * Reviewers never edit statements. They read, trace, and issue (or send
 * back — a separate service endpoint not yet built).
 */

type BerStatus =
  | "not_eligible"
  | "assembling"
  | "reviewer_review"
  | "participant_review"
  | "challenge_open"
  | "ready_to_issue"
  | "issued"
  | "amended"
  | "withdrawn"
  | "expired"
  | "evidence_expired";

type BerReport = {
  ber_report_id: string;
  participant_id: string;
  version: number;
  status: BerStatus;
  supersedes: string | null;
  permitted_use_version: string | null;
  current_until: string | null;
  created_at: string;
};

type BerStatement = {
  ber_statement_id: string;
  ber_report_id: string;
  dimension_id: string;
  composed_statement_id: string;
  contributing_observation_ids: string[];
  stages_contributing: string[];
  recurrence_note: string | null;
};

type ComposedStatement = {
  composed_statement_id: string;
  rendered_body: string;
  composed_at: string;
};

type Observation = {
  observation_id: string;
  stage_code: string;
  dimension_id: string;
  attempt_no: number;
  occurred_at: string;
  evidence_class: string;
};

const REVIEWER_STATUSES: BerStatus[] = [
  "assembling",
  "reviewer_review",
  "participant_review",
  "challenge_open",
  "ready_to_issue",
];

const STATUS_TONE: Record<BerStatus, "ok" | "warn" | "muted"> = {
  not_eligible: "muted",
  assembling: "muted",
  reviewer_review: "warn",
  participant_review: "warn",
  challenge_open: "warn",
  ready_to_issue: "ok",
  issued: "ok",
  amended: "warn",
  withdrawn: "muted",
  expired: "muted",
  evidence_expired: "muted",
};

function toneClass(tone: "ok" | "warn" | "muted") {
  if (tone === "ok") return "border-foreground bg-foreground/[0.04]";
  if (tone === "warn") return "border-vermilion bg-vermilion/[0.06]";
  return "border-foreground/40 bg-foreground/[0.02]";
}

export default function EvidenceReview() {
  const [reports, setReports] = useState<BerReport[]>([]);
  const [selected, setSelected] = useState<BerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from("t3a_ber_report")
        .select("*")
        .in("status", REVIEWER_STATUSES)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setReports([]);
      } else {
        setReports((data ?? []) as BerReport[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <LedgerLoading />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Register · Evidence Review"
        title={
          <>
            Review the <span className="italic display-serif-italic">record</span>. Issue what stands.
          </>
        }
        meta="Trace every statement back to its observations. Issuance is a deliberate human action — §10, AC-11."
      />

      {error && (
        <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4 mb-8">
          <div className="mono-label ink-vermilion mb-1">§ Error</div>
          <p className="text-sm text-foreground">{error}</p>
        </div>
      )}

      {!selected ? (
        <DashSection eyebrow="§ I · Pre-issue queue" title="Reports awaiting reviewer attention">
          {reports.length === 0 ? (
            <EmptyState
              eyebrow="§ Empty queue"
              title={
                <>
                  No reports currently in a <span className="italic display-serif-italic">reviewer lane.</span>
                </>
              }
              body="Reports surface here when a participant's evidence set has assembled into a draft."
            />
          ) : (
            <div className="border-t-2 border-foreground">
              {reports.map((r) => (
                <button
                  key={r.ber_report_id}
                  onClick={() => setSelected(r)}
                  className="row-hover w-full grid grid-cols-12 gap-4 py-6 px-2 md:px-4 border-b border-foreground/20 items-baseline text-left group"
                >
                  <div className="col-span-2 md:col-span-1">
                    <span className="ledger-num text-3xl text-foreground leading-none">v{r.version}</span>
                  </div>
                  <div className="col-span-7 md:col-span-8">
                    <h4 className="display-serif text-xl md:text-2xl text-foreground leading-tight group-hover:italic transition-all">
                      Participant <span className="font-mono text-base">{r.participant_id.slice(0, 8)}…</span>
                    </h4>
                    <p className="text-foreground/70 text-[0.9375rem] mt-1">
                      Created {new Date(r.created_at).toLocaleDateString()}
                      {r.supersedes ? ` · supersedes v${r.version - 1}` : ""}
                    </p>
                  </div>
                  <div className="col-span-3 text-right">
                    <LedgerBadge>{r.status.replace(/_/g, " ")}</LedgerBadge>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DashSection>
      ) : (
        <ReportDetail
          report={selected}
          onBack={() => setSelected(null)}
          onIssued={() => {
            setSelected(null);
            setReports((prev) => prev.filter((r) => r.ber_report_id !== selected.ber_report_id));
          }}
        />
      )}
    </div>
  );
}

function ReportDetail({
  report,
  onBack,
  onIssued,
}: {
  report: BerReport;
  onBack: () => void;
  onIssued: () => void;
}) {
  const [statements, setStatements] = useState<BerStatement[] | null>(null);
  const [composedMap, setComposedMap] = useState<Record<string, ComposedStatement>>({});
  const [observations, setObservations] = useState<Record<string, Observation>>({});
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadError(null);
      const { data: sData, error: sErr } = await supabase
        .from("t3a_ber_statement")
        .select("*")
        .eq("ber_report_id", report.ber_report_id)
        .order("dimension_id", { ascending: true });
      if (cancelled) return;
      if (sErr) {
        setLoadError(sErr.message);
        setStatements([]);
        return;
      }
      const rows = (sData ?? []) as BerStatement[];
      setStatements(rows);

      const composedIds = Array.from(new Set(rows.map((r) => r.composed_statement_id)));
      const obsIds = Array.from(new Set(rows.flatMap((r) => r.contributing_observation_ids)));

      const [{ data: cData }, { data: oData }] = await Promise.all([
        composedIds.length
          ? supabase.from("t3a_composed_statement").select("*").in("composed_statement_id", composedIds)
          : Promise.resolve({ data: [] as ComposedStatement[] }),
        obsIds.length
          ? supabase
              .from("t3a_observation")
              .select("observation_id, stage_code, dimension_id, attempt_no, occurred_at, evidence_class")
              .in("observation_id", obsIds)
          : Promise.resolve({ data: [] as Observation[] }),
      ]);

      if (cancelled) return;
      const cm: Record<string, ComposedStatement> = {};
      for (const c of (cData ?? []) as ComposedStatement[]) cm[c.composed_statement_id] = c;
      setComposedMap(cm);

      const om: Record<string, Observation> = {};
      for (const o of (oData ?? []) as Observation[]) om[o.observation_id] = o;
      setObservations(om);
    })();
    return () => {
      cancelled = true;
    };
  }, [report.ber_report_id]);

  const totalObservations = useMemo(
    () => (statements ?? []).reduce((n, s) => n + s.contributing_observation_ids.length, 0),
    [statements]
  );

  const handleIssue = async () => {
    setIssuing(true);
    setIssueError(null);
    try {
      const { error: rpcErr } = await supabase.rpc("t3a_issue_report", { p_ber_report_id: report.ber_report_id });
      if (rpcErr) {
        setIssueError(rpcErr.message);
        setIssuing(false);
        return;
      }
      onIssued();
    } catch (e) {
      setIssueError(e instanceof Error ? e.message : String(e));
      setIssuing(false);
    }
  };

  const tone = STATUS_TONE[report.status] ?? "muted";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-10"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to queue
        </button>
        <div className="flex items-center gap-3">
          <LedgerBadge>v{report.version}</LedgerBadge>
          <LedgerBadge>{report.status.replace(/_/g, " ")}</LedgerBadge>
        </div>
      </div>

      <div className={`border-2 p-5 ${toneClass(tone)}`}>
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-foreground/70 mt-0.5" />
          <div className="flex-1">
            <div className="mono-label text-foreground/60 mb-1">§ Report</div>
            <h3 className="display-serif text-2xl text-foreground leading-tight">
              Participant <span className="font-mono text-lg">{report.participant_id.slice(0, 8)}…</span>
            </h3>
            <div className="grid sm:grid-cols-3 gap-4 mt-4 text-sm">
              <div>
                <div className="mono-label text-foreground/50">Statements</div>
                <div className="text-foreground text-[0.9375rem] mt-1">{statements?.length ?? "…"}</div>
              </div>
              <div>
                <div className="mono-label text-foreground/50">Contributing observations</div>
                <div className="text-foreground text-[0.9375rem] mt-1">{statements ? totalObservations : "…"}</div>
              </div>
              <div>
                <div className="mono-label text-foreground/50">Current until</div>
                <div className="text-foreground text-[0.9375rem] mt-1">
                  {report.current_until
                    ? new Date(report.current_until).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DashSection eyebrow="§ I · Statements + traceability" title="Every arrow named">
        {loadError && (
          <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4 mb-4">
            <div className="mono-label ink-vermilion mb-1">§ Load error</div>
            <p className="text-sm text-foreground">{loadError}</p>
          </div>
        )}

        {statements === null ? (
          <div className="flex items-center gap-3 text-foreground/70">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading statements…
          </div>
        ) : statements.length === 0 ? (
          <p className="text-foreground/70 text-sm">No statements attached to this report yet.</p>
        ) : (
          <div className="space-y-4">
            {statements.map((s) => {
              const composed = composedMap[s.composed_statement_id];
              const isOpen = expandedDim === s.dimension_id;
              return (
                <div key={s.ber_statement_id} className="border-2 border-foreground/25">
                  <button
                    onClick={() => setExpandedDim(isOpen ? null : s.dimension_id)}
                    className="w-full p-4 text-left flex items-start justify-between gap-4 hover:bg-foreground/[0.02] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="mono-label text-foreground/60 mb-1">§ Dimension {s.dimension_id}</div>
                      <p className="display-serif text-lg text-foreground leading-snug">
                        {composed?.rendered_body ?? <span className="text-foreground/50 italic">composed statement not resolved</span>}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {s.stages_contributing.map((st) => (
                          <span key={st} className="mono-label border border-foreground/25 px-2 py-0.5">
                            {st}
                          </span>
                        ))}
                        <span className="mono-label text-foreground/50">
                          {s.contributing_observation_ids.length} observation
                          {s.contributing_observation_ids.length === 1 ? "" : "s"}
                        </span>
                        {s.recurrence_note && (
                          <span className="mono-label text-foreground/50">· {s.recurrence_note}</span>
                        )}
                      </div>
                    </div>
                    <span className="mono-label text-foreground/60 whitespace-nowrap">
                      {isOpen ? "− trace" : "+ trace"}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-foreground/25 p-4 bg-foreground/[0.02]">
                      <div className="mono-label text-foreground/60 mb-2">§ Contributing observations</div>
                      <div className="space-y-2">
                        {s.contributing_observation_ids.map((oid) => {
                          const o = observations[oid];
                          return (
                            <div
                              key={oid}
                              className="grid grid-cols-12 gap-3 text-sm text-foreground/80 border-b border-foreground/10 pb-2"
                            >
                              <div className="col-span-4 font-mono text-xs text-foreground/60 truncate" title={oid}>
                                {oid}
                              </div>
                              <div className="col-span-2 mono-label">{o?.stage_code ?? "—"}</div>
                              <div className="col-span-2">
                                attempt {o?.attempt_no ?? "—"}
                              </div>
                              <div className="col-span-2">{o?.evidence_class ?? "—"}</div>
                              <div className="col-span-2 text-right">
                                {o?.occurred_at ? new Date(o.occurred_at).toLocaleDateString() : "—"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DashSection>

      <DashSection eyebrow="§ II · Issue" title="Sign the record into the register">
        <p className="text-foreground/70 text-sm mb-4">
          Issuance is guarded by <span className="font-mono">t3a_issue_report</span>. It is an explicit human action
          per §10 / AC-11 — nothing else can perform it, and the socket refuses until Track A's five governance plugs
          are approved (permitted-use statement, evidence-currency period, retention periods, agreement threshold,
          named security standard). The refusal is surfaced below verbatim.
        </p>

        {issueError && (
          <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 ink-vermilion mt-0.5" />
              <div>
                <div className="mono-label ink-vermilion mb-1">§ Refused</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{issueError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onBack}
            className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4"
          >
            Cancel
          </button>
          <Button
            onClick={handleIssue}
            disabled={issuing}
            className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-2 text-sm font-medium tracking-wide"
          >
            {issuing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Issuing…
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 mr-2" /> Issue report
              </>
            )}
          </Button>
        </div>

        <div className="mt-8 border-t border-foreground/20 pt-4 flex items-center gap-2 text-foreground/60">
          <Lock className="w-4 h-4" />
          <span className="marginalia text-[0.75rem]">
            Once issued a report becomes public-verifiable via <span className="font-mono">/verify</span>. Amendments
            create a superseding version — nothing is deleted.
          </span>
        </div>
      </DashSection>
    </motion.div>
  );
}
