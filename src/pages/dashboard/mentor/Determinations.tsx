import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, ChevronRight, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
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
 * §7.3 + §11 + §13 recordProgressionDecision.
 *
 * Mentors do NOT write statement text. They answer bounded determination
 * questions (per dimension, per approved question set version) and record a
 * progression decision against the (stage_instance, dimension). Statement
 * composition happens server-side out of t3a_statement_library. This screen
 * covers only the mentor-facing half.
 */

type ProgressionDecision = "proceed" | "redirect" | "pause";

type StageInstance = {
  stage_instance_id: string;
  participant_id: string;
  stage_code: "S1" | "S2" | "S3" | "S4";
  dimension_id: string;
  attempt_no: number;
  state: string;
  scheduled_at: string | null;
  activated_at: string | null;
  completed_at: string | null;
};

type MentorAssignmentRow = {
  mentor_assignment_id: string;
  participant_id: string;
  stage_instance_id: string;
  assignment_method: string;
  created_at: string;
  stage_instance: StageInstance;
};

type Question = {
  question_id: string;
  dimension_id: string;
  question_set_version: string;
  order_index: number;
  question_body: string;
  answer_schema: { kind?: string; options?: string[]; [k: string]: unknown };
};

const DECISION_META: Record<ProgressionDecision, { label: string; body: string; tone: "ok" | "warn" | "stop" }> = {
  proceed: {
    label: "Proceed",
    body: "This dimension is observation-ready to advance to the next Stage on this attempt.",
    tone: "ok",
  },
  redirect: {
    label: "Redirect",
    body: "Hold the next Stage on this dimension; redirect the participant into targeted support before further observation.",
    tone: "warn",
  },
  pause: {
    label: "Pause",
    body: "Suspend observation on this dimension. A rationale for pausing is entered against the record.",
    tone: "stop",
  },
};

function toneClass(tone: "ok" | "warn" | "stop", selected: boolean) {
  if (!selected) return "border-foreground/25 hover:border-foreground/50";
  if (tone === "ok") return "border-foreground bg-foreground/[0.06]";
  if (tone === "warn") return "border-vermilion bg-vermilion/[0.06]";
  return "border-vermilion bg-vermilion/10";
}

export default function Determinations() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<MentorAssignmentRow[]>([]);
  const [selected, setSelected] = useState<MentorAssignmentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: qErr } = await supabase
          .from("t3a_mentor_assignment")
          .select(
            "mentor_assignment_id, participant_id, stage_instance_id, assignment_method, created_at, stage_instance:t3a_stage_instance(*)"
          )
          .eq("mentor_id", user.id)
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (qErr) {
          setError(qErr.message);
          setAssignments([]);
        } else {
          const rows = (data ?? []) as unknown as MentorAssignmentRow[];
          setAssignments(
            rows.filter((r) => r.stage_instance && ["eligible", "scheduled", "active"].includes(r.stage_instance.state))
          );
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading) return <LedgerLoading />;

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Register · Determinations"
        title={
          <>
            Answer the <span className="italic display-serif-italic">determination questions.</span>
          </>
        }
        meta="Mentors answer bounded questions; the platform composes the statement. No statement text is authored by hand — §7.3."
      />

      {error && (
        <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4 mb-8">
          <div className="mono-label ink-vermilion mb-1">§ Error</div>
          <p className="text-sm text-foreground">{error}</p>
        </div>
      )}

      {!selected ? (
        <DashSection eyebrow="§ I · Open assignments" title="Awaiting your determination">
          {assignments.length === 0 ? (
            <EmptyState
              eyebrow="§ Empty roster"
              title={
                <>
                  No open <span className="italic display-serif-italic">stage instances</span> assigned to you.
                </>
              }
              body="When a participant enters a Stage on a dimension you are authorized for, the instance surfaces here."
            />
          ) : (
            <div className="border-t-2 border-foreground">
              {assignments.map((row) => (
                <button
                  key={row.mentor_assignment_id}
                  onClick={() => setSelected(row)}
                  className="row-hover w-full grid grid-cols-12 gap-4 py-6 px-2 md:px-4 border-b border-foreground/20 items-baseline text-left group"
                >
                  <div className="col-span-2 md:col-span-1">
                    <span className="ledger-num text-3xl text-foreground leading-none">{row.stage_instance.stage_code}</span>
                  </div>
                  <div className="col-span-7 md:col-span-8">
                    <h4 className="display-serif text-xl md:text-2xl text-foreground leading-tight group-hover:italic transition-all">
                      Dimension {row.stage_instance.dimension_id}
                    </h4>
                    <p className="text-foreground/70 text-[0.9375rem] mt-1">
                      Attempt {row.stage_instance.attempt_no} · state <span className="mono-label">{row.stage_instance.state}</span>
                    </p>
                  </div>
                  <div className="col-span-3 text-right mono-label text-foreground group-hover:ink-vermilion transition-colors">
                    Attend →
                  </div>
                </button>
              ))}
            </div>
          )}
        </DashSection>
      ) : (
        <DeterminationDetail
          assignment={selected}
          onBack={() => setSelected(null)}
          onRecorded={() => {
            setSelected(null);
            setAssignments((prev) => prev.filter((a) => a.mentor_assignment_id !== selected.mentor_assignment_id));
          }}
        />
      )}
    </div>
  );
}

function DeterminationDetail({
  assignment,
  onBack,
  onRecorded,
}: {
  assignment: MentorAssignmentRow;
  onBack: () => void;
  onRecorded: () => void;
}) {
  const stage = assignment.stage_instance;
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [decision, setDecision] = useState<ProgressionDecision | "">("");
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: qErr } = await supabase
        .from("t3a_determination_question")
        .select("question_id, dimension_id, question_set_version, order_index, question_body, answer_schema")
        .eq("dimension_id", stage.dimension_id)
        .not("approved_at", "is", null)
        .order("question_set_version", { ascending: false })
        .order("order_index", { ascending: true });

      if (cancelled) return;
      if (qErr) {
        setError(qErr.message);
        setQuestions([]);
        return;
      }

      const rows = (data ?? []) as Question[];
      if (rows.length === 0) {
        setQuestions([]);
        return;
      }
      const latestVersion = rows[0].question_set_version;
      setQuestions(rows.filter((r) => r.question_set_version === latestVersion));
    })();
    return () => {
      cancelled = true;
    };
  }, [stage.dimension_id]);

  const rationaleOk = rationale.trim().length >= 20;
  const allAnswered = useMemo(
    () => (questions ?? []).every((q) => answers[q.question_id] !== undefined && answers[q.question_id] !== ""),
    [questions, answers]
  );

  const handleSubmit = async () => {
    if (!decision) return;
    if (!rationaleOk) {
      setError("Rationale is required and must be at least two sentences (≥20 characters).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: rpcErr } = await supabase.rpc("t3a_record_progression_decision", {
        p_stage_instance_id: stage.stage_instance_id,
        p_dimension_id: stage.dimension_id,
        p_decision: decision,
        p_rationale: rationale.trim(),
      });
      if (rpcErr) {
        setError(rpcErr.message);
        setSaving(false);
        return;
      }
      onRecorded();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

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
          className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4"
        >
          ← Back to open assignments
        </button>
        <div className="flex items-center gap-3">
          <LedgerBadge>Stage {stage.stage_code}</LedgerBadge>
          <LedgerBadge>Dimension {stage.dimension_id}</LedgerBadge>
          <LedgerBadge>Attempt {stage.attempt_no}</LedgerBadge>
        </div>
      </div>

      <DashSection eyebrow="§ I · Determination questions" title="Answer, do not describe">
        {questions === null ? (
          <div className="flex items-center gap-3 text-foreground/70">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading approved question set…
          </div>
        ) : questions.length === 0 ? (
          <div className="border-2 border-vermilion bg-vermilion/[0.06] p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 ink-vermilion mt-0.5" />
              <div>
                <div className="mono-label ink-vermilion mb-1">§ Socket empty — not observable</div>
                <h3 className="display-serif text-xl leading-tight text-foreground">
                  No approved determination question set for dimension {stage.dimension_id}.
                </h3>
                <p className="text-sm text-foreground/70 mt-2">
                  Per §7.3.1, a dimension whose content is absent is not observable. Recording a progression decision
                  will still be accepted by the register — but no composed statement will attach to this attempt until
                  the question set is approved.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q) => (
              <QuestionInput
                key={q.question_id}
                question={q}
                value={answers[q.question_id]}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.question_id]: v }))}
              />
            ))}
            {!allAnswered && questions.length > 0 && (
              <p className="marginalia text-[0.75rem] text-foreground/60">
                Every question in the set must be answered before the decision may be recorded.
              </p>
            )}
          </div>
        )}
      </DashSection>

      <DashSection eyebrow="§ II · Progression decision" title="Proceed · Redirect · Pause">
        <div className="grid md:grid-cols-3 gap-4">
          {(Object.keys(DECISION_META) as ProgressionDecision[]).map((k) => {
            const meta = DECISION_META[k];
            const selected = decision === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setDecision(k)}
                className={`text-left border-2 p-5 transition-colors ${toneClass(meta.tone, selected)}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {selected ? <CheckCircle2 className="w-4 h-4 text-foreground" /> : null}
                  <span className="mono-label text-foreground/60">§ {k}</span>
                </div>
                <h4 className="display-serif text-2xl text-foreground leading-tight">{meta.label}</h4>
                <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{meta.body}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <label className="mono-label text-foreground block mb-2">
            § Rationale — required, minimum two sentences
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={5}
            placeholder="Name the observation and the reasoning. Not a summary of the person — a record of what the answers to the questions above bear on the decision."
            className="w-full bg-background border border-foreground/40 focus:border-foreground outline-none px-3 py-2 text-sm text-foreground rounded-none"
          />
          <div className="flex justify-between mt-2">
            <span className="marginalia text-[0.75rem] text-foreground/60">
              Rationale is written to the register with the decision and cannot be edited afterwards.
            </span>
            <span className={`mono-label text-[0.75rem] ${rationaleOk ? "text-foreground/60" : "ink-vermilion"}`}>
              {rationale.trim().length} / 20 min
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-6 border-2 border-vermilion bg-vermilion/[0.06] p-4">
            <div className="mono-label ink-vermilion mb-1">§ Refused</div>
            <p className="text-sm text-foreground">{error}</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            onClick={onBack}
            className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4"
          >
            Cancel
          </button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !decision || !rationaleOk}
            className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-2 text-sm font-medium tracking-wide"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Recording…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" /> Record decision to register
              </>
            )}
          </Button>
        </div>
        <p className="marginalia text-[0.75rem] mt-4">
          Progression is recorded against the (stage_instance, dimension) — never the person. The decision is
          irrevocable; a superseding decision creates a new record and both are retained.
        </p>
      </DashSection>
    </motion.div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const kind = (question.answer_schema?.kind as string | undefined) ?? "text";
  const options = (question.answer_schema?.options as string[] | undefined) ?? [];

  return (
    <div className="border-l-2 border-foreground/40 pl-4">
      <div className="mono-label text-foreground/60 mb-1">Q{String(question.order_index).padStart(2, "0")}</div>
      <p className="display-serif text-lg text-foreground leading-snug mb-3">{question.question_body}</p>

      {kind === "enum" && options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`border-2 px-3 py-1.5 text-sm rounded-none transition-colors ${
                  selected ? "border-foreground bg-foreground text-background" : "border-foreground/30 text-foreground hover:border-foreground/60"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : kind === "boolean" ? (
        <div className="flex gap-2">
          {["yes", "no"].map((opt) => {
            const selected = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                className={`border-2 px-4 py-1.5 text-sm rounded-none transition-colors ${
                  selected ? "border-foreground bg-foreground text-background" : "border-foreground/30 text-foreground hover:border-foreground/60"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : kind === "scale" ? (
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => {
            const selected = value === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`border-2 w-11 h-11 text-sm rounded-none transition-colors ${
                  selected ? "border-foreground bg-foreground text-background" : "border-foreground/30 text-foreground hover:border-foreground/60"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-background border border-foreground/40 focus:border-foreground outline-none px-3 py-2 text-sm text-foreground rounded-none"
          placeholder="Answer per the approved schema"
        />
      )}
    </div>
  );
}
