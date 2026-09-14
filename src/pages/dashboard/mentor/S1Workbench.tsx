/**
 * S1 Confirmation Workbench — T3A-D1-EXEC-001 §8.1.1.
 *
 * The AI service never selects a determination, and the confirmer does
 * more than tick a box. This is where an authorized human converts the
 * captured responses into the §5.3 factual determinations.
 *
 * Order, and it is fixed:
 *   AI administration → human determination capture here →
 *   confirmS1Observation → commit → progression.
 * Each is a separate persisted action.
 *
 * What the confirmer sees: the served source instance exactly as the
 * participant saw it, the beat structure, and the participant's captured
 * responses verbatim. NOTHING ELSE — no other observation, no prior
 * record, no rehearsal history, no profile.
 *
 * Prohibited here, and absent rather than disabled: any AI-suggested,
 * preselected, reordered or highlighted answer; any free text; any
 * summary of the response written by anyone.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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

type ServedQuestion = {
  question_code: string;
  served: boolean;
  reason_code: string;
  bound_family: string | null;
};

type CaptureLine = {
  capture_set_code: string;
  line_text: string;
  line_order: number;
};

type CaptureSet = {
  capture_set_code: string;
  title: string;
  applicability_note: string | null;
  display_order: number;
};

type Resolution = {
  question_code: string;
  capture_set_code: string;
  capture_line_order: number;
};

/**
 * §5.5 register 2 — the eight global missing-state reason codes, read
 * from the server rather than listed here.
 *
 * Two of the eight may never be applied at commit — `not_applicable`
 * (inapplicability is expressed by non-service under the branch rules)
 * and `not_yet_observed` (it describes a dimension before observation,
 * not a field within one). The server refuses both, and
 * t3a_d1_missing_states() marks which are applicable, so this screen
 * offers what it is told rather than a copy of the list that could drift
 * from it.
 */
type MissingStateCode = {
  code: string;
  applicable_at_commit: boolean;
  reason: string | null;
};

/** Enum labels carry underscores; a mentor reads words. */
const missingStateLabel = (code: string) => code.replace(/_/g, " ");

const S1Workbench = () => {
  const { runId } = useParams<{ runId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  // The applicable codes are the server's list, fetched once.
  const [missingStateCodes, setMissingStateCodes] = useState<MissingStateCode[]>([]);

  useEffect(() => {
    const loadCodes = async () => {
      const { data } = await supabase.rpc("t3a_d1_missing_states");
      setMissingStateCodes(
        ((data ?? []) as MissingStateCode[]).filter((c) => c.applicable_at_commit)
      );
    };
    void loadCodes();
  }, []);
  const [openRefusal, setOpenRefusal] = useState<{ code: string; missing?: string } | null>(null);
  const [run, setRun] = useState<Record<string, unknown> | null>(null);
  const [sourceSheet, setSourceSheet] = useState<Record<string, unknown>>({});
  const [sourceVerbatim, setSourceVerbatim] = useState<string>("");
  const [served, setServed] = useState<ServedQuestion[]>([]);
  const [sets, setSets] = useState<CaptureSet[]>([]);
  const [lines, setLines] = useState<CaptureLine[]>([]);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [missing, setMissing] = useState<Record<string, string>>({});
  const [confirmRefusal, setConfirmRefusal] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  /** Serving is re-evaluated on every answer, because BR-02a, BR-05,
   *  BR-06 and BR-09 all depend on answers already given. */
  const refreshServing = useCallback(
    async (sheet: Record<string, unknown>, sel: Record<string, number>, miss: Record<string, string>) => {
      const answers: Record<string, unknown> = { missing: miss };
      if (sel["Q-D1-03a"] !== undefined) {
        answers["Q-D1-03a"] =
          ["corresponded", "omission", "unsupported_claim", "both", "no_account"][sel["Q-D1-03a"] - 1];
      }
      if (sel["Q-D1-04b"] !== undefined) {
        answers["Q-D1-04b"] = ["none", "aligned", "not_aligned", "both"][sel["Q-D1-04b"] - 1];
      }
      if (sel["Q-D1-05a"] !== undefined) {
        answers["Q-D1-05a"] = sel["Q-D1-05a"] === 3 ? "none" : "action";
      }
      if (sel["Q-D1-08a"] !== undefined) {
        answers["Q-D1-08a"] = sel["Q-D1-08a"] === 4 ? "not_within_period" : "disclosed";
      }

      const { data } = await supabase.rpc("t3a_d1_served_questions", {
        p_source_sheet: sheet,
        p_answers: answers,
      });
      setServed((data ?? []) as ServedQuestion[]);
    },
    []
  );

  useEffect(() => {
    const load = async () => {
      if (!runId) return;

      // §8.1.1 — the workbench refuses to open where model_ref,
      // prompt_ref or configuration_ref is missing, or the responses are
      // absent. The refusal is server-side; this reads its verdict.
      const { data: gate } = await supabase.rpc("t3a_d1_s1_workbench_may_open", {
        p_ai_administration_run_id: runId,
      });
      const verdict = gate as { may_open?: boolean; refusal_code?: string; missing?: string } | null;
      if (!verdict?.may_open) {
        setOpenRefusal({
          code: verdict?.refusal_code ?? "S1_WORKBENCH_UNAVAILABLE",
          missing: verdict?.missing,
        });
        setIsLoading(false);
        return;
      }

      const { data: runRow } = await supabase
        .from("t3a_d1_ai_administration_run")
        .select("*")
        .eq("ai_administration_run_id", runId)
        .maybeSingle();
      setRun(runRow ?? null);

      const { data: version } = await supabase
        .from("t3a_d1_content_version")
        .select("body")
        .eq("content_version_id", (runRow?.source_version_id as string) ?? "")
        .maybeSingle();
      const body = (version?.body ?? {}) as Record<string, unknown>;
      const sheet = (body.source_sheet ?? {}) as Record<string, unknown>;
      setSourceSheet(sheet);
      setSourceVerbatim((body.verbatim as string) ?? "");

      const [{ data: setRows }, { data: lineRows }, { data: resRows }] = await Promise.all([
        supabase.from("t3a_d1_capture_set").select("*").order("display_order"),
        supabase.from("t3a_d1_capture_line").select("*").order("line_order"),
        supabase.from("t3a_d1_capture_resolution").select("*"),
      ]);
      setSets((setRows ?? []) as CaptureSet[]);
      setLines((lineRows ?? []) as CaptureLine[]);
      setResolutions((resRows ?? []) as Resolution[]);

      await refreshServing(sheet, {}, {});
      setIsLoading(false);
    };
    void load();
  }, [runId, refreshServing]);

  const setFor = useMemo(() => {
    const map = new Map<string, string>();
    resolutions.forEach((r) => map.set(r.question_code, r.capture_set_code));
    return map;
  }, [resolutions]);

  const onSelect = async (questionCode: string, lineOrder: number) => {
    const next = { ...selections, [questionCode]: lineOrder };
    const nextMissing = { ...missing };
    delete nextMissing[questionCode];
    setSelections(next);
    setMissing(nextMissing);
    setConfirmRefusal(null);
    await refreshServing(sourceSheet, next, nextMissing);
  };

  const onMissing = async (questionCode: string, code: string) => {
    const next = { ...missing };
    const nextSel = { ...selections };
    if (code === "") delete next[questionCode];
    else next[questionCode] = code;
    delete nextSel[questionCode];
    setMissing(next);
    setSelections(nextSel);
    setConfirmRefusal(null);
    await refreshServing(sourceSheet, nextSel, next);
  };

  const onConfirm = async () => {
    if (!runId) return;
    setIsConfirming(true);
    const { data } = await supabase.rpc("t3a_d1_s1_may_confirm", {
      p_ai_administration_run_id: runId,
      p_source_sheet: sourceSheet,
      p_selections: selections,
      p_missing: missing,
    });
    setIsConfirming(false);
    const verdict = data as { may_confirm?: boolean; refusal_code?: string; questions?: string } | null;

    if (!verdict?.may_confirm) {
      setConfirmRefusal(
        verdict?.questions
          ? `${verdict.refusal_code}: ${verdict.questions}`
          : verdict?.refusal_code ?? "S1_CONFIRMATION_REFUSED"
      );
      return;
    }

    toast({
      title: "Determinations captured",
      description: "Confirmation is a separate action and is recorded on its own.",
    });
    navigate("/dashboard/mentor/determinations");
  };

  if (isLoading) return <LedgerLoading />;

  if (openRefusal) {
    return (
      <div>
        <DashboardPageHeader
          eyebrow="§ Stage 1 · Confirmation Workbench"
          title="This workbench cannot open"
          meta="Provenance is incomplete, so there is nothing here to confirm against."
        />
        <DashSection eyebrow="§ Refusal" title={openRefusal.code}>
          <p className="text-foreground/80 max-w-2xl leading-relaxed">
            A Stage 1 administration records the model, the prompt and the
            configuration it ran under, together with the participant's
            responses. Where any of those is absent the workbench does not
            open, because a determination captured against an unidentified
            administration cannot be traced back to what the participant
            actually saw.
          </p>
          {openRefusal.missing && (
            <p className="mono-label text-foreground/60 mt-5">
              Absent: {openRefusal.missing}
            </p>
          )}
        </DashSection>
      </div>
    );
  }

  const servedQuestions = served.filter(
    (s) => s.served && s.question_code !== "Q-D1-04b-child"
  );
  const notServed = served.filter(
    (s) => !s.served && s.question_code !== "Q-D1-04b-child"
  );

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Stage 1 · Confirmation Workbench"
        title="Capture what the responses show"
        meta="Select the line that states what happened. Nothing here is a judgment about the participant, and no line is a better answer than another."
        actions={<LedgerBadge variant="outline">Human capture</LedgerBadge>}
      />

      {/* The served source instance exactly as the participant saw it. */}
      <DashSection eyebrow="§ I · What the participant was served" title="The situation and the beats">
        <pre className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-foreground/85 border-l-2 border-foreground pl-6 max-w-4xl font-sans">
          {sourceVerbatim || "The served instance is not available."}
        </pre>
      </DashSection>

      {/* The participant's captured responses, verbatim. Source material,
          never a determination, and never summarized by anyone. */}
      <DashSection eyebrow="§ II · What the participant wrote" title="Responses, verbatim">
        <pre className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed text-foreground/85 border border-foreground/25 p-6 max-w-4xl font-sans">
          {(run?.rendered_body as string) ?? "No responses were captured."}
        </pre>
      </DashSection>

      <DashSection eyebrow="§ III · Determinations" title="One line each">
        {servedQuestions.length === 0 ? (
          <EmptyState title="No question is served for this source." />
        ) : (
          <div className="space-y-10 max-w-4xl">
            {servedQuestions.map((q) => {
              const code = setFor.get(q.question_code);
              const set = sets.find((s) => s.capture_set_code === code);
              const options = lines.filter((l) => l.capture_set_code === code);
              const chosen = selections[q.question_code];
              const missingCode = missing[q.question_code];

              return (
                <div key={q.question_code} className="border-t-2 border-foreground pt-6">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
                    <span className="mono-label text-foreground/55">{q.question_code}</span>
                    <h3 className="display-serif text-xl text-foreground">
                      {set?.title ?? "Capture set not loaded"}
                    </h3>
                    {set?.applicability_note && (
                      <span className="text-foreground/55 text-[0.875rem]">
                        ({set.applicability_note})
                      </span>
                    )}
                  </div>

                  {/* Options render in the register's own order. Nothing is
                      reordered, preselected or highlighted. */}
                  <div className="space-y-2">
                    {options.map((opt) => (
                      <label
                        key={opt.line_order}
                        className={cn(
                          "flex gap-3 items-start p-3 border cursor-pointer transition-colors",
                          chosen === opt.line_order
                            ? "border-foreground bg-foreground/[0.04]"
                            : "border-foreground/20 hover:border-foreground/45"
                        )}
                      >
                        <input
                          type="radio"
                          name={q.question_code}
                          checked={chosen === opt.line_order}
                          onChange={() => void onSelect(q.question_code, opt.line_order)}
                          className="mt-1"
                        />
                        <span className="text-foreground/85 text-[0.9375rem] leading-relaxed">
                          {opt.line_text}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* A missing state is metadata on the field, never a
                      value inside the answer enumeration, so it sits
                      outside the option list. */}
                  <label className="flex items-center gap-3 mt-4">
                    <span className="mono-label text-foreground/55">
                      Or record why no answer was captured
                    </span>
                    <select
                      value={missingCode ?? ""}
                      onChange={(e) => void onMissing(q.question_code, e.target.value)}
                      className="border border-foreground/30 bg-transparent px-3 py-1.5 text-foreground"
                    >
                      <option value="">—</option>
                      {missingStateCodes.map((c) => (
                        <option key={c.code} value={c.code}>
                          {missingStateLabel(c.code)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </DashSection>

      {/* Not-served questions are shown with the rule that excluded them,
          so the confirmer can see that an absence is a rule and not an
          omission. A question not served produces no answer and no
          missing state. */}
      {notServed.length > 0 && (
        <DashSection eyebrow="§ IV · Not served" title="Questions this source does not put">
          <ul className="border-t border-foreground/25 max-w-3xl">
            {notServed.map((q) => (
              <li
                key={q.question_code}
                className="flex justify-between gap-6 py-3 border-b border-foreground/15"
              >
                <span className="mono-label text-foreground/60">{q.question_code}</span>
                <span className="text-foreground/70 text-[0.875rem]">{q.reason_code}</span>
              </li>
            ))}
          </ul>
          <p className="text-foreground/65 text-[0.875rem] mt-5 max-w-2xl leading-relaxed">
            These are absent because they never applied. No answer and no
            missing state is recorded for them, and no composed statement
            refers to them.
          </p>
        </DashSection>
      )}

      <div className="mt-12 border-t-2 border-foreground pt-8 max-w-4xl">
        {confirmRefusal && (
          <p className="mono-label ink-vermilion mb-5">{confirmRefusal}</p>
        )}
        <Button onClick={() => void onConfirm()} disabled={isConfirming}>
          {isConfirming ? "Checking…" : "Capture determinations"}
        </Button>
        <p className="text-foreground/60 text-[0.875rem] mt-4 leading-relaxed">
          Capturing and confirming are separate persisted actions.
          Confirming asserts that these determinations match the responses,
          and from the moment you capture them you are involved in this
          record.
        </p>
      </div>
    </div>
  );
};

export default S1Workbench;
