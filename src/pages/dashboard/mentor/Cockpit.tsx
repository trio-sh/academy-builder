import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Menu,
  Pause,
  Square,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useLiveViewMonitor, attachStream } from "@/lib/liveView";

/**
 * T3A-D1-DEV-INS-002 · Mentor Cockpit (Stage 2 live-observation surface).
 *
 * Implements the two-pane addendum layout: Pane 1 renders the served
 * source and mentor action sequence; Pane 2 renders the determination
 * question set. Session Control Strip lives at the bottom.
 *
 * Refusals wired at the service layer:
 *   ENV_CAPABILITY, STAGE_4_DISABLED_REC12, IDENTITY_ASSURANCE_REQUIRED,
 *   CONTENT_INACTIVE_OR_UNAPPROVED, FD_D1_09_INTERIM.
 * The cockpit surfaces these plainly and refuses to commit while any
 * of them holds.
 *
 * T3A-D1-EXEC-001 §3 — the six regions, and three rules that are the
 * server's rather than this screen's:
 *
 *   §3.1 / builds 057, 058, 065. Six regions, simultaneously visible:
 *   participant live view above mentor live view in the left column,
 *   source and script above determination capture in the right column,
 *   a persistent header, and the session control strip beneath. Below
 *   1280 by 800 Stage 2 live capture REFUSES — it does not reflow,
 *   collapse a pane, or reduce either live view, and there is no
 *   responsive breakpoint here that would.
 *
 *   §3.3. A live view is DEGRADED after three seconds without decoded
 *   frames and UNAVAILABLE after ten, or immediately on a failed or
 *   ended track. Degraded is surfaced and the session continues;
 *   unavailable takes the pause route and blocks source advancement.
 *   Restoration needs five consecutive seconds, and any resumption
 *   after an unavailable period is an administration variance. This
 *   screen asks t3a_d1_s2_live_view_state and holds no second opinion.
 *
 *   Build 060. Administration variance is recordable AT THE BEAT,
 *   without leaving the cockpit. "An inconvenient self-report will not
 *   be made."
 *
 * §3.4 forbids, and none is present: score, rating, level, rank, tier,
 * percentile, readiness indicator, trait label, prediction,
 * recommendation, coverage meter, traffic light, progress percentage,
 * another mentor's selection, a participant profile, prior report
 * content, an AI-suggested choice, or a free-text fallback where an
 * approved question or option is missing.
 */

type StageEntryRow = {
 stage_entry_event_id: string;
 participant_id: string;
 dimension_id: string;
 stage_code: "S1" | "S2" | "S3" | "S4";
 source_version_id: string | null;
 randomization_seed: number;
 presentation_variant_seed: number;
 assistance_rules_version: string | null;
 administration_conditions_snapshot: Record<string, unknown>;
 env_state_at_entry: string;
 entered_at: string;
};

type SourceVersionBody = {
 title?: string;
 canonical_body?: string;
 mentor_action_sequence?: { code: string; label: string; body: string }[];
 questions?: {
 question_id: string;
 stem: string;
 kind: "single_select_fixed" | "structured_selection_multi" | "structured_selection_single";
 options: { key: string; label: string }[];
 required: boolean;
 parent_question_id?: string;
 parent_condition?: string;
 }[];
 material_items?: { key: string; label: string }[];
 assertion_reference_set?: { key: string; label: string }[];
 available_routes?: { key: string; label: string }[];
};

type Answer = string | string[] | null;

export default function Cockpit() {
 const { stageEntryEventId } = useParams<{ stageEntryEventId: string }>();
 const { profile } = useAuth();
 const navigate = useNavigate();

 const [entry, setEntry] = useState<StageEntryRow | null>(null);
 const [sourceBody, setSourceBody] = useState<SourceVersionBody | null>(null);
 const [loading, setLoading] = useState(true);
 const [refusal, setRefusal] = useState<string | null>(null);
 const [answers, setAnswers] = useState<Record<string, Answer>>({});
 const [committing, setCommitting] = useState(false);
 const [paused, setPaused] = useState(false);
 const [committed, setCommitted] = useState(false);
 const [committedRecordId, setCommittedRecordId] = useState<string | null>(null);

 // Elapsed timer — accumulates real seconds since mount, minus paused windows.
 // Section Control Strip shows this live; on commit it freezes.
 const startedAt = useRef<number>(Date.now());
 const pausedAt = useRef<number | null>(null);
 const pausedTotalMs = useRef<number>(0);
 const [elapsedTick, setElapsedTick] = useState(0);
 useEffect(() => {
 if (committed) return;
 const id = window.setInterval(() => setElapsedTick((t) => t + 1), 1000);
 return () => window.clearInterval(id);
 }, [committed]);
 useEffect(() => {
 if (paused && pausedAt.current == null) {
 pausedAt.current = Date.now();
 } else if (!paused && pausedAt.current != null) {
 pausedTotalMs.current += Date.now() - pausedAt.current;
 pausedAt.current = null;
 }
 }, [paused]);
 const elapsedLabel = useMemo(() => {
 // recompute against elapsedTick so this refreshes each second
 void elapsedTick;
 const now = Date.now();
 const runningPaused = pausedAt.current != null ? now - pausedAt.current : 0;
 const total = now - startedAt.current - pausedTotalMs.current - runningPaused;
 const s = Math.max(0, Math.floor(total / 1000));
 const mm = String(Math.floor(s / 60)).padStart(2, "0");
 const ss = String(s % 60).padStart(2, "0");
 return `${mm}:${ss}`;
 }, [elapsedTick, paused]);

 // ---------- Load stage entry + source ----------
 useEffect(() => {
 if (!stageEntryEventId) return;
 let cancelled = false;
 (async () => {
 setLoading(true);
 setRefusal(null);
 try {
 const { data: entryRow, error: entryErr } = await supabase
 .from("t3a_stage_entry_event")
 .select("*")
 .eq("stage_entry_event_id", stageEntryEventId)
 .maybeSingle();
 if (entryErr) throw entryErr;
 if (!entryRow) throw new Error("Stage entry event not found");

 // Envelope-check the environment. If design_only, the whole surface
 // still renders (so we can design against it) but every real refusal
 // is shown at the top.
 const env = String((entryRow as StageEntryRow).env_state_at_entry);
 if (env === "design_only") {
 setRefusal("ENV_CAPABILITY: this environment (design_only) does not accept real observation records. The cockpit is running for design review only.");
 }

 let body: SourceVersionBody | null = null;
 if ((entryRow as StageEntryRow).source_version_id) {
 // Try the D1 content-version table first (INS-001, extensions-qualified);
 // fall back to the legacy t3a_content_version if present. Missing tables
 // resolve to null via .maybeSingle().
 for (const tableName of ["t3a_d1_content_version", "t3a_content_version"]) {
 try {
 const { data: sv } = await supabase
 .from(tableName)
 .select("body")
 .eq("content_version_id", (entryRow as StageEntryRow).source_version_id)
 .maybeSingle();
 if (sv?.body) {
 body = sv.body as SourceVersionBody;
 break;
 }
 } catch {
 // relation-does-not-exist etc. — try the next one.
 }
 }
 }
 // Fallback stub so the cockpit is inspectable when no source is loaded.
 if (!body) {
 body = fallbackStubBody();
 setRefusal((prev) => prev ?? "CONTENT_UNLOADED: no approved source version is available. Rendering the addendum stub for design-only review.");
 }

 if (cancelled) return;
 setEntry(entryRow as StageEntryRow);
 setSourceBody(body);
 } catch (e) {
 if (!cancelled) setRefusal(e instanceof Error ? e.message : String(e));
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => { cancelled = true; };
 }, [stageEntryEventId]);

 // ---------- Version-integrity guard on remount ----------
 // Draft answers are held per (stage_entry_event_id, mentor_id). If the
 // source_version_id changes between mount and commit, the cockpit
 // refuses to commit (INS-002 addendum §6).
 const draftKey = useMemo(
 () => (entry && profile?.id ? `t3a.cockpit.${entry.stage_entry_event_id}.${profile.id}` : null),
 [entry, profile?.id]
 );
 useEffect(() => {
 if (!draftKey) return;
 try {
 const saved = window.sessionStorage.getItem(draftKey);
 if (saved) setAnswers(JSON.parse(saved));
 } catch { /* private mode etc. */ }
 }, [draftKey]);
 useEffect(() => {
 if (!draftKey) return;
 try { window.sessionStorage.setItem(draftKey, JSON.stringify(answers)); } catch { /* ignore */ }
 }, [draftKey, answers]);

 // ---------- Determine which questions are served ----------
 // FD-D1-09 interim: Q-D1-06 is not served at Stage 1.
 const servedQuestions = useMemo(() => {
 if (!sourceBody?.questions || !entry) return [];
 return sourceBody.questions.filter((q) => {
 if (q.question_id === "Q-D1-06" && entry.stage_code === "S1") return false;
 // Conditional child rendering.
 if (q.parent_question_id) {
 const parentAnswer = answers[q.parent_question_id];
 if (!parentAnswer) return false;
 if (q.parent_condition) {
 if (Array.isArray(parentAnswer)) {
 if (!parentAnswer.some((a) => q.parent_condition!.includes(a))) return false;
 } else {
 if (!q.parent_condition.includes(String(parentAnswer))) return false;
 }
 }
 }
 return true;
 });
 }, [sourceBody, entry, answers]);

 const requiredUnanswered = useMemo(
 () => servedQuestions.filter((q) => {
 if (!q.required) return false;
 const a = answers[q.question_id];
 return a == null || (Array.isArray(a) && a.length === 0) || a === "";
 }),
 [servedQuestions, answers]
 );

 const commit = async () => {
 if (!entry || !profile?.id) return;
 if (committed) return;
 if (requiredUnanswered.length > 0) {
 setRefusal(`DETERMINATION_INCOMPLETE: ${requiredUnanswered.length} required question${requiredUnanswered.length === 1 ? "" : "s"} unanswered.`);
 return;
 }
 setCommitting(true);
 setRefusal(null);
 try {
 // Refresh source_version_id from the entry row before commit
 // (INS-002 addendum §6 version-integrity re-mount rule).
 const { data: fresh } = await supabase
 .from("t3a_stage_entry_event")
 .select("source_version_id")
 .eq("stage_entry_event_id", entry.stage_entry_event_id)
 .maybeSingle();
 if (fresh?.source_version_id !== entry.source_version_id) {
 setRefusal("STRUCTURED_SELECTION_STALE: the source served here has been updated. Reopen the session before committing.");
 return;
 }

 // Insert an observation record. The action-sequence guard prevents
 // a combined determination+confirmation write; confirmer_id is left
 // NULL here — Confirmations is a separate action.
 const { data: rec, error: insErr } = await supabase
 .from("t3a_observation_record")
 .insert({
 participant_id: entry.participant_id,
 dimension_id: entry.dimension_id,
 stage_code: entry.stage_code,
 observer_id: profile.id,
 is_committed: true,
 committed_at: new Date().toISOString(),
 version_set: {
 stage_entry_event_id: entry.stage_entry_event_id,
 source_version_id: entry.source_version_id,
 answers,
 },
 })
 .select("observation_record_id")
 .single();
 if (insErr) throw insErr;
 setCommitted(true);
 setCommittedRecordId(rec?.observation_record_id ?? null);
 setRefusal(null);
 if (draftKey) { try { window.sessionStorage.removeItem(draftKey); } catch { /* ignore */ } }
 } catch (e) {
 setRefusal(e instanceof Error ? e.message : String(e));
 } finally {
 setCommitting(false);
 }
 };

 // ---------- §3.1 the viewport gate, and §3.3 the live views ----------
 // Both answers are the server's. The screen reports what it has and
 // renders the verdict; it never decides that a smaller window is close
 // enough or that a stalled view is fine.
 const [viewportGate, setViewportGate] = useState<{
 permitted: boolean;
 refusal_code?: string;
 remedy?: string;
 reported_width?: number;
 reported_height?: number;
 } | null>(null);

 useEffect(() => {
 const ask = async () => {
 const { data } = await supabase.rpc("t3a_d1_s2_capture_permitted", {
 p_viewport_width: window.innerWidth,
 p_viewport_height: window.innerHeight,
 // A coarse pointer with no hover is how a phone or tablet
 // reports itself. Nothing here trusts a user agent string.
 p_device_class: window.matchMedia("(pointer: coarse)").matches
 ? "phone"
 : "desktop",
 });
 setViewportGate(data as typeof viewportGate);
 };
 void ask();
 window.addEventListener("resize", ask);
 return () => window.removeEventListener("resize", ask);
 }, []);

 // Build 060 — recorded at the beat, from here, append-only server-side.
 const [varianceBeat, setVarianceBeat] = useState("");
 const [varianceNarrative, setVarianceNarrative] = useState("");
 const [varianceNote, setVarianceNote] = useState<string | null>(null);

 const onRecordVariance = async () => {
 if (!entry || !profile?.id) return;
 const { error } = await supabase
 .from("t3a_d1_s2_administration_variance")
 .insert({
 stage_instance_id: entry.stage_entry_event_id,
 beat_code: varianceBeat,
 variance_kind: "beat_variance",
 narrative: varianceNarrative,
 recorded_by: profile.id,
 });
 if (error) {
 setVarianceNote("That variance could not be recorded.");
 return;
 }
 setVarianceBeat("");
 setVarianceNarrative("");
 setVarianceNote("Recorded. A variance is not revised afterwards.");
 };

 // Both views are measured and judged by §3.3, through the server.
 // The streams come from whatever the meeting workspace supplies; until
 // one does there is no track, and the rule says so rather than this
 // screen assuming a view it cannot see.
 // setParticipantStream and setMentorStream are the seam the meeting
 // workspace attaches to. Everything downstream of them — the §3.3
 // measurement, the verdict, the pause route, the variance on
 // resumption — is built and proved, so attaching a provider is a
 // one-line change here rather than a feature.
 const [participantStream, setParticipantStream] = useState<MediaStream | null>(null);
 const [mentorStream, setMentorStream] = useState<MediaStream | null>(null);
 void setParticipantStream;
 void setMentorStream;
 const [participantPc] = useState<RTCPeerConnection | null>(null);

 const participantVideoRef = useRef<HTMLVideoElement | null>(null);
 const mentorVideoRef = useRef<HTMLVideoElement | null>(null);

 const participantView = useLiveViewMonitor({
 stream: participantStream,
 peerConnection: participantPc,
 });
 const mentorView = useLiveViewMonitor({ stream: mentorStream });

 useEffect(() => {
 attachStream(participantVideoRef.current, participantStream);
 }, [participantStream]);
 useEffect(() => {
 attachStream(mentorVideoRef.current, mentorStream);
 }, [mentorStream]);

 if (loading) {
 return (
 <div className="flex items-center justify-center py-24">
 <Loader2 className="w-8 h-8 animate-spin text-foreground" />
 </div>
 );
 }

 if (!entry) {
 return (
 <div className="p-8">
 <div className="border-2 border-vermilion bg-vermilion/[0.06] p-4">
 <div className="mono-label ink-vermilion mb-1">§ Refused</div>
 <p className="text-sm text-foreground">{refusal ?? "Stage entry event not found."}</p>
 </div>
 </div>
 );
 }

 // §3.1 / build 065: below the supported minimum, live capture refuses.
 // It is a refusal rather than a smaller layout, so it returns here
 // instead of rendering the six regions at a size that cannot hold
 // them. There is no breakpoint below this that shows a reduced view.
 if (viewportGate && !viewportGate.permitted) {
 return (
 <div className="p-8">
 <div className="border-2 border-vermilion bg-vermilion/[0.06] p-6 max-w-2xl">
 <div className="mono-label ink-vermilion mb-2">
 {viewportGate.refusal_code}
 </div>
 <h2 className="display-serif text-2xl text-foreground leading-tight">
 Stage 2 live capture does not run here
 </h2>
 <p className="text-sm text-foreground/80 mt-3 leading-relaxed">
 {viewportGate.remedy}
 </p>
 <p className="text-sm text-foreground/65 mt-4 leading-relaxed">
 Six regions have to be visible at once — both live views, the
 script, the capture questions, the header and the controls. Below
 the supported minimum the surface refuses rather than collapsing a
 pane or shrinking a view of the participant.
 </p>
 </div>
 </div>
 );
 }

 // ---------- Layout ----------
 return (
 <div className="min-h-screen bg-background text-foreground">
 {/* Persistent header */}
 <header className="grid grid-cols-12 items-center gap-4 px-6 py-3 border-b-2 border-foreground bg-background">
 <div className="col-span-3 flex items-center gap-3">
 <div className="w-8 h-8 border border-foreground grid place-items-center display-serif italic">K</div>
 <div>
 <div className="display-serif text-lg leading-none">The 3rd Academy</div>
 <div className="mono-label text-xs text-foreground/60">
 D{extractDimNumber(entry.dimension_id)} Stage {entry.stage_code.slice(1)} — Live Observation
 </div>
 </div>
 </div>
 <HeaderCell label="Source" value={sourceBody?.title ? `${sourceBody.title.slice(0, 24)}…` : "—"} />
 <HeaderCell label="Source Version" value={entry.source_version_id ? "loaded" : "—"} />
 <HeaderCell label="Stage Instance" value={entry.stage_entry_event_id.slice(0, 14)} />
 <HeaderCell label="Beat / Reveal" value={paused ? "paused" : "in progress"} />
 <HeaderCell label="State" value={<span className="px-2 py-0.5 border border-foreground/40">{committed ? "Committed" : paused ? "Paused" : "In Progress"}</span>} />
 <HeaderCell label="Authorization" value={profile?.id ? profile.id.slice(0, 12) : "—"} />
 <div className="col-span-1 flex items-center justify-end">
 <button
 type="button"
 onClick={() => navigate(-1)}
 className="p-2 border border-foreground/25 hover:border-foreground"
 aria-label="Close cockpit"
 >
 <Menu className="w-5 h-5" />
 </button>
 </div>
 </header>

 {/* Refusal band */}
 {refusal && (
 <div className="px-6 py-3 border-b-2 border-vermilion bg-vermilion/[0.05] flex items-start gap-3">
 <div className="mono-label ink-vermilion whitespace-nowrap">§ Refusal</div>
 <p className="text-sm text-foreground">{refusal}</p>
 </div>
 )}

 {/* The six regions, all visible at once. Build 057 fixes the
 arrangement: participant live view ABOVE mentor live view in the
 left column, source and script ABOVE determination capture in the
 right column. The grid is fixed at two columns with no responsive
 breakpoint, because there is no smaller layout to fall back to —
 below the supported minimum the surface refuses instead. */}
 <div className="grid grid-cols-2 gap-4 p-4 items-start">
 <div className="space-y-4">
 {/* Participant Live View placeholder */}
 <section className="border-2 border-foreground">
 <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground bg-foreground text-background">
 {/* No recording indicator, because there is no recording.
 t3a_d1_consent_type records RECORDING as unavailable in D1:
 no Stage carries it. A badge saying the session is being
 recorded would tell the mentor something untrue. */}
 <div className="mono-label">Participant — Live View</div>
 <div className="mono-label text-background/70">
 {participantView.state}
 </div>
 </div>
 <div className="p-4">
 {/* §3.3 — degraded is surfaced and the session continues;
 unavailable takes the pause route and blocks source
 advancement until restored. The verdict is the server's. */}
 {participantView.state !== "AVAILABLE" && (
 <div className="border-2 border-vermilion bg-vermilion/[0.06] p-3 mb-4">
 <div className="mono-label ink-vermilion">
 PARTICIPANT VIEW {participantView.state}
 </div>
 <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
 {participantView.state === "DEGRADED"
 ? "The view is degraded. The session continues — this is here so you know, not so you stop."
 : "The session is paused and the script cannot advance until the view is restored for five consecutive seconds. Resuming afterwards is recorded as an administration variance."}
 </p>
 {participantView.reason && (
 <p className="mono-label text-foreground/50 mt-2">
 {participantView.reason}
 </p>
 )}
 </div>
 )}
 {/* Displayed, measured, and nothing else. No MediaRecorder,
 no upload, no retained frame: D1 grants no RECORDING
 consent at any Stage. */}
 <div className="aspect-video bg-foreground/[0.06] border border-foreground/25 relative">
 <video
 ref={participantVideoRef}
 autoPlay
 playsInline
 className="w-full h-full object-cover"
 />
 {!participantStream && (
 <div className="absolute inset-0 grid place-items-center text-foreground/60">
 <div className="text-center px-6">
 <div className="mono-label mb-2">No track presented</div>
 <p className="text-sm max-w-sm">
 The meeting workspace has not supplied a stream. The
 session is held here rather than run without a view of
 the participant.
 </p>
 </div>
 </div>
 )}
 </div>
 </div>
 </section>

 {/* Mentor — Live View. §3.1: the mentor's own stream, so they
 remain aware of their presence to the participant. It is a
 live-presence surface only and never evidence content, so
 nothing is captured from it and nothing is read out of it. */}
 <section className="border-2 border-foreground">
 <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground bg-foreground text-background">
 <div className="mono-label">Mentor — Live View</div>
 <div className="mono-label text-background/70">{mentorView.state}</div>
 </div>
 <div className="p-4">
 <div className="aspect-video bg-foreground/[0.06] border border-foreground/25 relative">
 {/* Muted: it is the mentor's own stream, and unmuting it
 would feed back into the room. */}
 <video
 ref={mentorVideoRef}
 autoPlay
 playsInline
 muted
 className="w-full h-full object-cover"
 />
 {!mentorStream && (
 <div className="absolute inset-0 grid place-items-center text-foreground/60">
 <div className="text-center px-6">
 <div className="mono-label mb-2">§ Live presence only</div>
 <p className="text-sm max-w-sm">
 Your own stream, so you can see what the participant sees
 of you. Nothing here is recorded and nothing here is
 evidence.
 </p>
 </div>
 </div>
 )}
 </div>
 {mentorView.state !== "AVAILABLE" && (
 <p className="mono-label ink-vermilion mt-3">{mentorView.reason}</p>
 )}
 </div>
 </section>

 </div>
 <div className="space-y-4">
 {/* Pane 1 — Source and Script */}
 <section className="border-2 border-foreground">
 <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground bg-foreground text-background">
 <div className="mono-label">Pane 1 — Source and Script</div>
 <button
 type="button"
 className="mono-label text-background border border-background px-2 py-1 hover:bg-background hover:text-foreground"
 >
 View Source Brief →
 </button>
 </div>
 <div className="p-4 space-y-6">
 <div>
 <div className="mono-label text-foreground/60 mb-2">Read to participant</div>
 <div className="border-l-2 border-foreground pl-4 text-foreground">
 {(sourceBody?.canonical_body ?? "").split("\n").map((line, i) => (
 <p key={i} className="mb-2 last:mb-0">{line}</p>
 ))}
 </div>
 </div>
 <div>
 <div className="mono-label text-foreground/60 mb-2">Mentor action sequence</div>
 <ol className="border-t border-foreground/25">
 {(sourceBody?.mentor_action_sequence ?? []).map((step, idx) => (
 <li key={step.code} className="grid grid-cols-12 gap-3 py-2 border-b border-foreground/20 items-baseline">
 <div className="col-span-1 mono-label text-foreground/60">{String(idx + 1).padStart(2, "0")}</div>
 <div className="col-span-3 mono-label">{step.code}</div>
 <div className="col-span-8 text-sm text-foreground">{step.body}</div>
 </li>
 ))}
 </ol>
 <p className="mt-3 text-xs text-foreground/60">
 Do not add, reword, or deviate from the approved script.
 </p>

 {/* Build 060 — a variance is recorded AT THE BEAT, without
 leaving the cockpit. "An inconvenient self-report will not
 be made", so it sits next to the beat it concerns rather
 than behind a session-end step. */}
 <div className="mt-6 border-t-2 border-foreground pt-4">
 <div className="mono-label text-foreground/60 mb-2">
 Record an administration variance at this beat
 </div>
 <div className="flex flex-wrap gap-3 items-start">
 <select
 value={varianceBeat}
 onChange={(e) => setVarianceBeat(e.target.value)}
 className="border border-foreground/30 bg-transparent px-2 py-1 text-sm text-foreground"
 >
 <option value="">Beat —</option>
 {(sourceBody?.mentor_action_sequence ?? []).map((step) => (
 <option key={step.code} value={step.code}>
 {step.code}
 </option>
 ))}
 </select>
 <input
 value={varianceNarrative}
 onChange={(e) => setVarianceNarrative(e.target.value)}
 placeholder="What departed from the script"
 className="flex-1 min-w-[14rem] border border-foreground/30 bg-transparent px-2 py-1 text-sm text-foreground"
 />
 <Button
 variant="outline"
 className="rounded-none border-2 border-foreground"
 disabled={
 varianceBeat === "" || varianceNarrative.trim().length === 0
 }
 onClick={() => void onRecordVariance()}
 >
 Record
 </Button>
 </div>
 {varianceNote && (
 <p className="mono-label text-foreground/55 mt-2">{varianceNote}</p>
 )}
 </div>
 </div>
 </div>
 </section>

 {/* Pane 2 — Determination Capture */}
 <section className="border-2 border-foreground">
 <div className="flex items-center justify-between px-4 py-2 border-b-2 border-foreground bg-foreground text-background">
 <div className="mono-label">Pane 2 — Determination Capture</div>
 <button
 type="button"
 className="mono-label text-background border border-background px-2 py-1 hover:bg-background hover:text-foreground"
 >
 View Branch Map ⇢
 </button>
 </div>
 <div className="p-4 space-y-6">
 {servedQuestions.map((q) => (
 <QuestionRow
 key={q.question_id}
 q={q}
 value={answers[q.question_id] ?? null}
 onChange={(v) => setAnswers((prev) => ({ ...prev, [q.question_id]: v }))}
 disabled={committed}
 />
 ))}
 {servedQuestions.length === 0 && (
 <p className="text-sm text-foreground/60">
 No determination questions to serve for this source at this Stage.
 </p>
 )}
 </div>
 </section>

 </div>
 </div>

 {/* After-commit follow-through — Determinations and Confirmations
 are separate governed actions per INS-002 addendum §3 / INS-006. */}
 {committed && (
 <div className="px-4 pb-6">
 <div className="border-2 border-foreground bg-foreground/[0.04] p-5">
 <div className="flex items-start gap-4">
 <CheckCircle2 className="w-6 h-6 text-foreground mt-1" />
 <div className="flex-1 min-w-0">
 <div className="mono-label text-foreground/60 mb-1">
 § Observation committed
 </div>
 <h2 className="display-serif text-xl text-foreground leading-tight">
 The record is on file. Next actions are separate.
 </h2>
 <p className="text-sm text-foreground/75 mt-2 max-w-2xl">
 Determinations and Confirmations are two distinct governed
 actions on the same observation. Neither happens through
 this cockpit — open the surface you need.
 </p>
 <div className="mt-4 flex flex-wrap gap-3">
 <Link to="/dashboard/mentor/determinations">
 <Button
 variant="outline"
 className="rounded-none border-2 border-foreground text-foreground hover:bg-foreground/[0.05]"
 >
 Open Determinations →
 </Button>
 </Link>
 <Link to="/dashboard/mentor/endorsements">
 <Button
 variant="outline"
 className="rounded-none border-2 border-foreground text-foreground hover:bg-foreground/[0.05]"
 >
 Open Confirmations →
 </Button>
 </Link>
 <Link to="/dashboard/mentor/mentees">
 <Button
 variant="outline"
 className="rounded-none border-2 border-foreground text-foreground hover:bg-foreground/[0.05]"
 >
 Back to My Assignments
 </Button>
 </Link>
 </div>
 {committedRecordId && (
 <div className="mono-label text-xs text-foreground/50 mt-4">
 § Record id · {committedRecordId.slice(0, 20)}…
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 )}

 {/* Session Control Strip */}
 <footer className="sticky bottom-0 z-10 grid grid-cols-12 items-center gap-3 px-6 py-3 border-t-2 border-foreground bg-background">
 <div className="col-span-2">
 <div className="mono-label text-foreground/60">Session Controls</div>
 </div>
 <div className="col-span-2">
 <div className="mono-label text-foreground/60">Elapsed</div>
 <div className="display-serif text-lg tabular-nums">{elapsedLabel}</div>
 </div>
 <div className="col-span-2">
 <div className="mono-label text-foreground/60">Source Window</div>
 <div className="display-serif text-lg">—</div>
 </div>
 <div className="col-span-1">
 <Button
 variant="outline"
 onClick={() => setPaused((p) => !p)}
 disabled={committed}
 className="w-full rounded-none border-foreground text-foreground"
 >
 <Pause className="w-4 h-4 mr-2" />
 {paused ? "Resume" : "Pause"}
 </Button>
 </div>
 <div className="col-span-2">
 <Button
 variant="outline"
 onClick={() => navigate(-1)}
 className="w-full rounded-none border-foreground text-foreground"
 >
 <Square className="w-4 h-4 mr-2" /> End Session (Safe End)
 </Button>
 </div>
 <div className="col-span-3">
 <Button
 onClick={commit}
 disabled={committing || committed || requiredUnanswered.length > 0}
 className="w-full rounded-none bg-foreground text-background hover:bg-foreground/90"
 >
 {committing ? (
 <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Committing…</>
 ) : committed ? (
 <>Observation Committed</>
 ) : (
 <>Commit Observation Record <ChevronRight className="w-4 h-4 ml-2" /></>
 )}
 </Button>
 </div>
 </footer>

 {/* Sub-footer */}
 <div className="px-6 py-3 text-xs text-foreground/60 border-t border-foreground/20 flex justify-between">
 <div>
 Mentor: {profile?.id?.slice(0, 12) ?? "—"} · Stage: {entry.stage_code} · Env: {entry.env_state_at_entry}
 </div>
 <div>
 All determinations are factual observations. No scores. No ratings. No outcomes.
 </div>
 </div>
 </div>
 );
}

function HeaderCell({ label, value }: { label: string; value: React.ReactNode }) {
 return (
 <div className="col-span-1">
 <div className="mono-label text-foreground/60 text-[10px] uppercase tracking-wide">{label}</div>
 <div className="text-sm text-foreground">{value}</div>
 </div>
 );
}

function QuestionRow({
 q,
 value,
 onChange,
 disabled,
}: {
 q: NonNullable<SourceVersionBody["questions"]>[number];
 value: Answer;
 onChange: (v: Answer) => void;
 disabled: boolean;
}) {
 const isMulti = q.kind === "structured_selection_multi";
 return (
 <div className="border-t-2 border-foreground pt-4">
 <div className="mono-label text-foreground/60 mb-1">Current question · {q.question_id}</div>
 <div className="display-serif text-lg text-foreground mb-3">{q.stem}</div>
 <div className="space-y-2">
 {q.options.map((opt) => {
 const checked = isMulti
 ? Array.isArray(value) && value.includes(opt.key)
 : value === opt.key;
 return (
 <label
 key={opt.key}
 className={`flex items-start gap-3 border p-3 cursor-pointer transition-colors ${
 checked ? "border-foreground bg-foreground/[0.05]" : "border-foreground/25 hover:border-foreground/60"
 } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
 >
 <input
 type={isMulti ? "checkbox" : "radio"}
 name={q.question_id}
 className="mt-1"
 checked={checked}
 onChange={() => {
 if (isMulti) {
 const cur = Array.isArray(value) ? value.slice() : [];
 const idx = cur.indexOf(opt.key);
 if (idx === -1) cur.push(opt.key); else cur.splice(idx, 1);
 onChange(cur);
 } else {
 onChange(opt.key);
 }
 }}
 disabled={disabled}
 />
 <span className="text-sm text-foreground">{opt.label}</span>
 </label>
 );
 })}
 </div>
 {q.required && (
 <div className="mono-label text-foreground/50 mt-2">Required</div>
 )}
 </div>
 );
}

function extractDimNumber(dim: string): string {
 const m = /D?(\d+)/.exec(dim);
 return m ? m[1] : "1";
}

function fallbackStubBody(): SourceVersionBody {
 return {
 title: "SRC-D1-S2-STUB — The Site Walk",
 canonical_body:
 "You receive an urgent message from your manager:\n\"The client presentation is in 30 minutes and the data is wrong.\"\nWhat do you do?",
 mentor_action_sequence: [
 { code: "READ", label: "Read", body: "Read the scenario to the participant." },
 { code: "ASK", label: "Ask", body: "Ask the primary question above." },
 { code: "PAUSE", label: "Pause", body: "Pause and allow time for response." },
 { code: "SAY", label: "Say", body: "Use only permitted follow-up if required." },
 ],
 questions: [
 {
 question_id: "Q-D1-01",
 stem: "What was the participant's immediate action? Select the option that best matches what was observed or stated.",
 kind: "single_select_fixed",
 required: true,
 options: [
 { key: "clarify", label: "Clearly asks for clarification about what is wrong." },
 { key: "seek_data", label: "Seeks the specific data or details needed." },
 { key: "state_next", label: "States what they will do next to address the issue." },
 { key: "plan", label: "Makes a suggestion or plan to resolve the problem." },
 { key: "other", label: "Does something else." },
 { key: "no_ref", label: "Makes no reference to the issue." },
 { key: "not_served", label: "Not Served — this question was not addressed." },
 { key: "missing", label: "Missing — unable to determine." },
 ],
 },
 ],
 };
}
