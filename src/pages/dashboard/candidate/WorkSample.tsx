/**
 * Stage 3 — work sample — T3A-D1-EXEC-001 §8.2 and §8.4.
 *
 * Required screens: brief and deadline; upload with the three
 * declarations; submission history.
 * Required actions: accept; decline; submit; resubmit.
 *
 * Must not appear, and are absent here:
 *   — the artifact on any report face;
 *   — any grade or quality judgment.
 *
 * The quality of the work is not recorded anywhere, by anyone. A mentor
 * captures conduct from the submitted artifact and the accompanying
 * communication; they do not grade the work, and this surface has no
 * field that could hold a grade.
 *
 * A declaration is never adverse conduct and never composes a clause. It
 * is provenance. None of the three carries a free-text route — each is a
 * required boolean plus, where it applies, one controlled selection.
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

type Submission = {
  submission_id: string;
  state: string;
  assigned_at: string;
  deadline_at: string | null;
  submitted_at: string | null;
  deadline_missed: boolean;
  artifact_ref: string | null;
  authorship_attestation: boolean | null;
  assistance_declaration: boolean | null;
  assistance_detail: string | null;
  tooling_declaration: boolean | null;
  tooling_detail: string | null;
  prior_version_ref: string | null;
};

/**
 * §8.2 — controlled wording, rendered verbatim. The developer does not
 * write these, soften them or shorten them.
 */
const DECLARATIONS = {
  authorship: "The work I am submitting is my own.",
  assistance: "I received help from another person on this work.",
  tooling:
    "I used a software tool, including any artificial-intelligence tool, on this work.",
} as const;

/** The controlled lists. There is no "other, please specify". */
const ASSISTANCE_OPTIONS = [
  "a colleague",
  "a manager",
  "a friend or family member",
  "a tutor or coach",
  "someone else",
] as const;

const TOOLING_OPTIONS = [
  "drafting or writing",
  "calculation or analysis",
  "formatting or layout",
  "checking or review",
  "something else",
] as const;

const WorkSample = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [current, setCurrent] = useState<Submission | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const [artifactRef, setArtifactRef] = useState("");
  const [authorship, setAuthorship] = useState(false);
  const [assistance, setAssistance] = useState<boolean | null>(null);
  const [assistanceDetail, setAssistanceDetail] = useState("");
  const [tooling, setTooling] = useState<boolean | null>(null);
  const [toolingDetail, setToolingDetail] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("t3a_d1_work_sample_submission")
      .select("*")
      .eq("participant_id", user.id)
      .order("assigned_at", { ascending: false });

    const rows = (data ?? []) as Submission[];
    setSubmissions(rows);
    setCurrent(
      rows.find((r) => !["CLOSED", "DECLINED", "RESUBMITTED"].includes(r.state)) ?? null
    );
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const setState = async (submissionId: string, state: string, extra: Record<string, unknown> = {}) => {
    setIsWorking(true);
    const { error } = await supabase
      .from("t3a_d1_work_sample_submission")
      .update({ state, ...extra })
      .eq("submission_id", submissionId);
    setIsWorking(false);
    if (error) {
      toast({ title: "That could not be recorded.", variant: "destructive" });
      return false;
    }
    await load();
    return true;
  };

  const onDecline = async (submissionId: string) => {
    // A decline records that the situation did not run. It is never an
    // evidence outcome and never adverse, and no reason is collected.
    const ok = await setState(submissionId, "DECLINED", {
      declined_at: new Date().toISOString(),
    });
    if (ok) {
      toast({
        title: "Declined",
        description:
          "This records that the situation did not run. It is not part of your evidence, and another brief can be offered.",
      });
    }
  };

  const onSubmit = async (submissionId: string) => {
    setIsWorking(true);
    const { error } = await supabase
      .from("t3a_d1_work_sample_submission")
      .update({
        state: "SUBMITTED",
        submitted_at: new Date().toISOString(),
        artifact_ref: artifactRef,
        authorship_attestation: authorship,
        assistance_declaration: assistance,
        assistance_detail: assistance ? assistanceDetail || null : null,
        tooling_declaration: tooling,
        tooling_detail: tooling ? toolingDetail || null : null,
      })
      .eq("submission_id", submissionId);

    if (error) {
      setIsWorking(false);
      toast({ title: "That submission could not be recorded.", variant: "destructive" });
      return;
    }

    // The eleven-field provenance check runs server-side on submit.
    const { data } = await supabase.rpc("t3a_d1_work_sample_provenance_check", {
      p_submission_id: submissionId,
    });
    setIsWorking(false);

    const verdict = data as { passed?: boolean; refusal_code?: string; missing?: string } | null;
    if (!verdict?.passed) {
      toast({
        title: verdict?.refusal_code ?? "The submission did not pass the provenance check.",
        description: verdict?.missing ? `Absent: ${verdict.missing}` : undefined,
        variant: "destructive",
      });
      await load();
      return;
    }

    await setState(submissionId, "PROVENANCE_CHECKED");
    toast({ title: "Submitted" });
  };

  if (isLoading) return <LedgerLoading />;

  // Required to submit: the attestation must be affirmed, and both other
  // declarations must be answered one way or the other.
  const maySubmit =
    artifactRef.trim() !== "" &&
    authorship &&
    assistance !== null &&
    tooling !== null &&
    (assistance === false || assistanceDetail !== "") &&
    (tooling === false || toolingDetail !== "");

  return (
    <div>
      <DashboardPageHeader
        eyebrow="§ Stage 3 · Work sample"
        title="Real work, submitted by you"
        meta="What you submit is read for what it shows about how you worked. It is not graded, and no judgment about its quality is recorded."
        actions={<LedgerBadge variant="outline">Not graded</LedgerBadge>}
      />

      {!current ? (
        <DashSection eyebrow="§ I · Brief" title="Nothing assigned">
          <EmptyState title="You have no work sample brief at the moment." />
        </DashSection>
      ) : (
        <>
          <DashSection eyebrow="§ I · Brief" title="What you have been asked to do">
            <dl className="max-w-3xl space-y-4 border-t-2 border-foreground pt-6">
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-40">Assigned</dt>
                <dd className="text-foreground/85">
                  {new Date(current.assigned_at).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-40">Deadline</dt>
                <dd className="text-foreground/85">
                  {current.deadline_at
                    ? new Date(current.deadline_at).toLocaleDateString()
                    : "Not set"}
                </dd>
              </div>
              <div className="flex flex-wrap gap-3">
                <dt className="mono-label text-foreground/55 w-40">State</dt>
                <dd className="text-foreground/85">{current.state}</dd>
              </div>
            </dl>

            {/* A missed deadline records a lifecycle attribute. It
                composes no statement, is never adverse conduct and does
                not consume an attempt — stated, so it is not read as one. */}
            {current.deadline_missed && (
              <p className="text-foreground/70 text-[0.9375rem] leading-relaxed mt-6 max-w-2xl border-l-2 border-foreground pl-6">
                This deadline passed. That is recorded as a fact about the
                timetable, not about you: it composes no statement, is not
                adverse, and does not use up an attempt.
              </p>
            )}

            {current.state === "ASSIGNED" && (
              <div className="flex gap-4 mt-8">
                <Button
                  disabled={isWorking}
                  onClick={() => void setState(current.submission_id, "ACCEPTED")}
                >
                  Accept
                </Button>
                <Button
                  variant="outline"
                  disabled={isWorking}
                  onClick={() => void onDecline(current.submission_id)}
                >
                  Decline
                </Button>
              </div>
            )}
            {current.state === "ASSIGNED" && (
              <p className="text-foreground/60 text-[0.875rem] mt-4 max-w-2xl leading-relaxed">
                You may decline without giving a reason. Declining records that
                the situation did not run — it is not an outcome, and nothing
                adverse follows from it.
              </p>
            )}
          </DashSection>

          {["ACCEPTED", "IN_PROGRESS", "SUBMITTED"].includes(current.state) && (
            <DashSection eyebrow="§ II · Submit" title="Your work, and three declarations">
              <div className="max-w-2xl space-y-8">
                <label className="block">
                  <span className="mono-label text-foreground/70 block mb-2">
                    Your work
                  </span>
                  <input
                    value={artifactRef}
                    onChange={(e) => setArtifactRef(e.target.value)}
                    placeholder="File reference"
                    className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
                  />
                </label>

                {/* Declaration one — required, must be affirmed to submit. */}
                <div className="border-t border-foreground/25 pt-6">
                  <label className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      checked={authorship}
                      onChange={(e) => setAuthorship(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-foreground/85 leading-relaxed">
                      {DECLARATIONS.authorship}
                    </span>
                  </label>
                </div>

                {/* Declaration two — yes or no, then one controlled choice. */}
                <div className="border-t border-foreground/25 pt-6">
                  <p className="text-foreground/85 leading-relaxed mb-3">
                    {DECLARATIONS.assistance}
                  </p>
                  <div className="flex gap-6 mb-4">
                    {[true, false].map((v) => (
                      <label key={String(v)} className="flex gap-2 items-center">
                        <input
                          type="radio"
                          name="assistance"
                          checked={assistance === v}
                          onChange={() => {
                            setAssistance(v);
                            if (!v) setAssistanceDetail("");
                          }}
                        />
                        <span className="text-foreground/80">{v ? "Yes" : "No"}</span>
                      </label>
                    ))}
                  </div>
                  {assistance === true && (
                    <select
                      value={assistanceDetail}
                      onChange={(e) => setAssistanceDetail(e.target.value)}
                      className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
                    >
                      <option value="">Who helped —</option>
                      {ASSISTANCE_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Declaration three — yes or no, then one controlled choice. */}
                <div className="border-t border-foreground/25 pt-6">
                  <p className="text-foreground/85 leading-relaxed mb-3">
                    {DECLARATIONS.tooling}
                  </p>
                  <div className="flex gap-6 mb-4">
                    {[true, false].map((v) => (
                      <label key={String(v)} className="flex gap-2 items-center">
                        <input
                          type="radio"
                          name="tooling"
                          checked={tooling === v}
                          onChange={() => {
                            setTooling(v);
                            if (!v) setToolingDetail("");
                          }}
                        />
                        <span className="text-foreground/80">{v ? "Yes" : "No"}</span>
                      </label>
                    ))}
                  </div>
                  {tooling === true && (
                    <select
                      value={toolingDetail}
                      onChange={(e) => setToolingDetail(e.target.value)}
                      className="w-full border border-foreground/30 bg-transparent px-3 py-2 text-foreground"
                    >
                      <option value="">What you used it for —</option>
                      {TOOLING_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <p className="text-foreground/60 text-[0.875rem] leading-relaxed">
                  These three are provenance — a record of how the work came
                  about. None of them is adverse, and none composes anything
                  about your conduct.
                </p>

                <Button
                  disabled={isWorking || !maySubmit}
                  onClick={() => void onSubmit(current.submission_id)}
                >
                  {isWorking ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </DashSection>
          )}
        </>
      )}

      <DashSection eyebrow="§ III · History" title="What you have submitted">
        {submissions.length === 0 ? (
          <EmptyState title="You have not submitted a work sample." />
        ) : (
          <div className="border-t-2 border-foreground">
            {submissions.map((s) => (
              <div
                key={s.submission_id}
                className="flex flex-wrap gap-x-8 gap-y-1 py-4 border-b border-foreground/20"
              >
                <span className="mono-label text-foreground/55 w-40">{s.state}</span>
                <span className="text-foreground/75">
                  {s.submitted_at
                    ? `submitted ${new Date(s.submitted_at).toLocaleDateString()}`
                    : `assigned ${new Date(s.assigned_at).toLocaleDateString()}`}
                </span>
                {s.prior_version_ref && (
                  <span className="text-foreground/60">supersedes an earlier submission</span>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-foreground/60 text-[0.875rem] mt-6 max-w-2xl leading-relaxed">
          A resubmission supersedes the one before it. Nothing is overwritten
          and no submission is discarded.
        </p>
      </DashSection>
    </div>
  );
};

export default WorkSample;
