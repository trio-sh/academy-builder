import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Flag, ShieldAlert, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DashboardPageHeader,
  DashSection,
  LedgerBadge,
  LedgerLoading,
  EmptyState,
} from "@/components/dashboard/primitives";

/**
 * §7.4 pre-issue participant review + §9.5 challenge.
 *
 * A participant sees their draft BER while status is `participant_review`
 * (or `challenge_open` for reports with a live challenge). They read every
 * statement, see the contributing observations, and — if they dispute a
 * statement or an observation it rests on — open a challenge case against
 * that specific artifact with one of the six named grounds.
 *
 * A participant cannot edit statements or observations. They can only
 * challenge — the platform's response is a separate reconsideration flow
 * assigned to an uninvolved reviewer (§9.5).
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

type ChallengeCase = {
  challenge_case_id: string;
  ber_report_id: string;
  disputed_statement_id: string | null;
  disputed_observation_id: string | null;
  challenge_ground: string;
  status: string;
  created_at: string;
  outcome: string | null;
};

type ChallengeGround =
  | "factual_error"
  | "mistaken_identity"
  | "procedural_failure"
  | "observer_conflict"
  | "inaccurate_description"
  | "compromised_conditions";

const GROUND_META: Record<ChallengeGround, { label: string; body: string }> = {
  factual_error: {
    label: "Factual error",
    body: "Something in the statement or its underlying observation is factually incorrect.",
  },
  mistaken_identity: {
    label: "Mistaken identity",
    body: "The observation records someone else's conduct as though it were mine.",
  },
  procedural_failure: {
    label: "Procedural failure",
    body: "The observation was not conducted per the stated method or standard.",
  },
  observer_conflict: {
    label: "Observer conflict",
    body: "The observer had a conflict of interest that was not declared.",
  },
  inaccurate_description: {
    label: "Inaccurate description",
    body: "The statement's wording characterizes the observation in a way the observation does not support.",
  },
  compromised_conditions: {
    label: "Compromised conditions",
    body: "The administration conditions of the observation were compromised in a material way.",
  },
};

const REVIEW_STATUSES: BerStatus[] = ["participant_review", "challenge_open"];

export default function ReportReview() {
  const { user } = useAuth();
  const [reports, setReports] = useState<BerReport[]>([]);
  const [selected, setSelected] = useState<BerReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from("t3a_ber_report")
        .select("*")
        .eq("participant_id", user.id)
        .in("status", REVIEW_STATUSES)
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
  }, [user?.id]);

  if (loading) return <LedgerLoading />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Register · Pre-issue review"
        title={
          <>
            Read the record. <span className="italic display-serif-italic">Challenge</span> what does not stand.
          </>
        }
        meta="You may open a challenge against any statement or observation. Statements are not editable — challenges are the only lever."
      />

      {error && (
        <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4 mb-8">
          <div className="mono-label ink-vermilion mb-1">§ Error</div>
          <p className="text-sm text-foreground">{error}</p>
        </div>
      )}

      {!selected ? (
        <DashSection eyebrow="§ I · Your open reviews" title="Drafts awaiting your read">
          {reports.length === 0 ? (
            <EmptyState
              eyebrow="§ Nothing to review"
              title={
                <>
                  No reports currently in <span className="italic display-serif-italic">your</span> review lane.
                </>
              }
              body="When a draft of your report is assembled, it will appear here for your read before issuance."
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
                      Your Behavioral Evidence Report
                    </h4>
                    <p className="text-foreground/70 text-[0.9375rem] mt-1">
                      Assembled {new Date(r.created_at).toLocaleDateString()}
                      {r.supersedes ? " · amends a prior version" : ""}
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
        <ReviewDetail report={selected} onBack={() => setSelected(null)} />
      )}
    </div>
  );
}

function ReviewDetail({ report, onBack }: { report: BerReport; onBack: () => void }) {
  const [statements, setStatements] = useState<BerStatement[] | null>(null);
  const [composedMap, setComposedMap] = useState<Record<string, ComposedStatement>>({});
  const [observations, setObservations] = useState<Record<string, Observation>>({});
  const [challenges, setChallenges] = useState<ChallengeCase[]>([]);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [challengeTarget, setChallengeTarget] = useState<
    | { kind: "statement"; statement: BerStatement }
    | { kind: "observation"; observation: Observation; statement: BerStatement }
    | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadChallenges = async () => {
    const { data } = await supabase
      .from("t3a_challenge_case")
      .select("*")
      .eq("ber_report_id", report.ber_report_id);
    setChallenges((data ?? []) as ChallengeCase[]);
  };

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

      await loadChallenges();
    })();
    return () => {
      cancelled = true;
    };
  }, [report.ber_report_id]);

  const challengedStatementIds = useMemo(
    () => new Set(challenges.filter((c) => c.disputed_statement_id).map((c) => c.disputed_statement_id as string)),
    [challenges]
  );
  const challengedObservationIds = useMemo(
    () => new Set(challenges.filter((c) => c.disputed_observation_id).map((c) => c.disputed_observation_id as string)),
    [challenges]
  );

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
          <ArrowLeft className="w-4 h-4" /> Back to your reviews
        </button>
        <div className="flex items-center gap-3">
          <LedgerBadge>v{report.version}</LedgerBadge>
          <LedgerBadge>{report.status.replace(/_/g, " ")}</LedgerBadge>
        </div>
      </div>

      {challenges.length > 0 && (
        <div className="border-2 border-vermilion bg-vermilion/[0.06] p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 ink-vermilion mt-0.5" />
            <div>
              <div className="mono-label ink-vermilion mb-1">§ Open challenges on this report</div>
              <p className="text-sm text-foreground">
                {challenges.length} challenge{challenges.length === 1 ? "" : "s"} on record. A challenge does not
                withdraw the report — it opens an independent reconsideration by an uninvolved reviewer.
              </p>
            </div>
          </div>
        </div>
      )}

      <DashSection eyebrow="§ I · Your statements + observations" title="What the register says about you">
        {loadError && (
          <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4 mb-4">
            <div className="mono-label ink-vermilion mb-1">§ Load error</div>
            <p className="text-sm text-foreground">{loadError}</p>
          </div>
        )}

        {statements === null ? (
          <div className="flex items-center gap-3 text-foreground/70">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your report…
          </div>
        ) : statements.length === 0 ? (
          <p className="text-foreground/70 text-sm">No statements attached to this report yet.</p>
        ) : (
          <div className="space-y-4">
            {statements.map((s) => {
              const composed = composedMap[s.composed_statement_id];
              const isOpen = expandedDim === s.dimension_id;
              const stmtChallenged = challengedStatementIds.has(s.ber_statement_id);
              return (
                <div
                  key={s.ber_statement_id}
                  className={`border-2 ${stmtChallenged ? "border-vermilion" : "border-foreground/25"}`}
                >
                  <div className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="mono-label text-foreground/60">§ Dimension {s.dimension_id}</span>
                        {stmtChallenged && <LedgerBadge>challenged</LedgerBadge>}
                      </div>
                      <p className="display-serif text-lg text-foreground leading-snug">
                        {composed?.rendered_body ?? (
                          <span className="text-foreground/50 italic">composed statement not resolved</span>
                        )}
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
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => setExpandedDim(isOpen ? null : s.dimension_id)}
                        className="mono-label text-foreground/60 hover:text-foreground whitespace-nowrap"
                      >
                        {isOpen ? "− observations" : "+ observations"}
                      </button>
                      <button
                        onClick={() => setChallengeTarget({ kind: "statement", statement: s })}
                        disabled={stmtChallenged}
                        className="mono-label ink-vermilion hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                      >
                        <Flag className="w-3 h-3" /> {stmtChallenged ? "already challenged" : "challenge statement"}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-foreground/25 p-4 bg-foreground/[0.02]">
                      <div className="mono-label text-foreground/60 mb-2">§ Contributing observations</div>
                      <div className="space-y-2">
                        {s.contributing_observation_ids.map((oid) => {
                          const o = observations[oid];
                          const obsChallenged = challengedObservationIds.has(oid);
                          return (
                            <div
                              key={oid}
                              className="grid grid-cols-12 gap-3 text-sm text-foreground/80 border-b border-foreground/10 pb-2 items-center"
                            >
                              <div className="col-span-3 font-mono text-xs text-foreground/60 truncate" title={oid}>
                                {oid}
                              </div>
                              <div className="col-span-1 mono-label">{o?.stage_code ?? "—"}</div>
                              <div className="col-span-2">attempt {o?.attempt_no ?? "—"}</div>
                              <div className="col-span-2">{o?.evidence_class ?? "—"}</div>
                              <div className="col-span-2 text-right text-xs text-foreground/70">
                                {o?.occurred_at ? new Date(o.occurred_at).toLocaleDateString() : "—"}
                              </div>
                              <div className="col-span-2 text-right">
                                <button
                                  onClick={() =>
                                    o &&
                                    setChallengeTarget({ kind: "observation", observation: o, statement: s })
                                  }
                                  disabled={!o || obsChallenged}
                                  className="mono-label text-[0.7rem] ink-vermilion hover:underline disabled:opacity-50 disabled:no-underline"
                                >
                                  {obsChallenged ? "challenged" : "challenge"}
                                </button>
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

      {challenges.length > 0 && (
        <DashSection eyebrow="§ II · Your open challenges" title="Where each challenge stands">
          <div className="border-t-2 border-foreground">
            {challenges.map((c) => (
              <div
                key={c.challenge_case_id}
                className="grid grid-cols-12 gap-4 py-4 px-2 border-b border-foreground/20 items-baseline"
              >
                <div className="col-span-4">
                  <div className="mono-label text-foreground/60">
                    {c.disputed_statement_id ? "statement" : c.disputed_observation_id ? "observation" : "report"}
                  </div>
                  <div className="text-foreground text-[0.9375rem]">
                    {(GROUND_META[c.challenge_ground as ChallengeGround] ?? { label: c.challenge_ground }).label}
                  </div>
                </div>
                <div className="col-span-4 text-sm text-foreground/70">
                  Opened {new Date(c.created_at).toLocaleDateString()}
                </div>
                <div className="col-span-2 mono-label text-foreground/60">{c.status.replace(/_/g, " ")}</div>
                <div className="col-span-2 text-right mono-label text-foreground/60">
                  {c.outcome ?? "in reconsideration"}
                </div>
              </div>
            ))}
          </div>
        </DashSection>
      )}

      {challengeTarget && (
        <ChallengeModal
          reportId={report.ber_report_id}
          target={challengeTarget}
          onClose={() => setChallengeTarget(null)}
          onOpened={async () => {
            setChallengeTarget(null);
            await loadChallenges();
          }}
        />
      )}
    </motion.div>
  );
}

function ChallengeModal({
  reportId,
  target,
  onClose,
  onOpened,
}: {
  reportId: string;
  target:
    | { kind: "statement"; statement: BerStatement }
    | { kind: "observation"; observation: Observation; statement: BerStatement };
  onClose: () => void;
  onOpened: () => void;
}) {
  const [ground, setGround] = useState<ChallengeGround | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!ground) return;
    setSaving(true);
    setError(null);
    try {
      const args = {
        p_ber_report_id: reportId,
        p_disputed_statement_id: target.kind === "statement" ? target.statement.ber_statement_id : null,
        p_disputed_observation_id: target.kind === "observation" ? target.observation.observation_id : null,
        p_challenge_ground: ground,
      };
      const { error: rpcErr } = await supabase.rpc("t3a_open_challenge", args);
      if (rpcErr) {
        setError(rpcErr.message);
        setSaving(false);
        return;
      }
      onOpened();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-background border-2 border-foreground w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mono-label text-foreground/60 mb-2">
          § Open a challenge · dimension {target.statement.dimension_id}
        </div>
        <h2 className="display-serif text-2xl text-foreground leading-tight mb-4">
          {target.kind === "statement" ? "Challenge this statement" : "Challenge this observation"}
        </h2>
        <p className="text-sm text-foreground/70 mb-6">
          Pick the ground that best names the objection. A reviewer not involved in the original observation will
          reconsider the specific artifact you challenge — the rest of the report is unaffected while it does.
        </p>

        <div className="space-y-2 mb-6">
          {(Object.keys(GROUND_META) as ChallengeGround[]).map((k) => {
            const meta = GROUND_META[k];
            const selected = ground === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setGround(k)}
                className={`w-full text-left border-2 p-4 transition-colors ${
                  selected ? "border-foreground bg-foreground/[0.05]" : "border-foreground/25 hover:border-foreground/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {selected && <CheckCircle2 className="w-4 h-4 text-foreground" />}
                  <span className="display-serif text-lg text-foreground">{meta.label}</span>
                </div>
                <p className="text-sm text-foreground/70 mt-1">{meta.body}</p>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4 mb-4">
            <div className="mono-label ink-vermilion mb-1">§ Refused</div>
            <p className="text-sm text-foreground whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <p className="marginalia text-[0.75rem] text-foreground/60 mb-4">
          Opening a challenge notifies the reviewer team and stamps a notification timestamp on the case. Per §8 + AC-16,
          an open challenge does not withdraw your discoverability if it was already active.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4">
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            disabled={!ground || saving}
            className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-2 text-sm font-medium tracking-wide"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening…
              </>
            ) : (
              <>
                <Flag className="w-4 h-4 mr-2" /> Open challenge
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
