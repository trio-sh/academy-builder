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
import { useLiveSession } from "@/lib/liveSession";

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
 // The register stores the approved text under `verbatim`. Nothing loads
 // a `canonical_body`: scripts/extract-d1-content.mjs writes verbatim and
 // source_sheet, and the forty approved versions carry exactly
 // source_identifier, title, stage_code, source_sheet, verbatim,
 // source_version_hash, rec07_approval_ref and name_clearance_status.
 // Reading canonical_body returned undefined, so Pane 1 rendered an empty
 // script while the source it names is ten thousand characters long.
 verbatim?: string;
 canonical_body?: string;
 mentor_action_sequence?: { code: string; label: string; body: string }[];
 // The source sheet the branch rules read. Service is decided from this
 // and from the answers so far, by t3a_d1_serve_capture — never from a
 // question list baked into the body, which no loaded source carries.
 source_sheet?: Record<string, unknown>;
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

/**
 * What t3a_d1_serve_capture returns for one served question.
 *
 * CS-I-01: the question-to-capture mapping is read from the register at
 * serve time and is never compiled in here. This type describes what
 * arrives; it does not decide anything.
 */
type ServedCapture = {
 question_code: string;
 refused: boolean;
 refusal?: string;
 capture_set_code?: string;
 conduct_element?: string;
 answer_type?: string;
 control_ordinal?: number | null;
 reason_code?: string;
 source_bound_family?: string | null;
 lines?: { line_order: number; line_text: string }[];
 bound_options?: { key: string; label: string }[];
};

export default function Cockpit() {
 const { stageEntryEventId } = useParams<{ stageEntryEventId: string }>();
 const { profile } = useAuth();
 const navigate = useNavigate();

 const [entry, setEntry] = useState<StageEntryRow | null>(null);
 const [sourceBody, setSourceBody] = useState<SourceVersionBody | null>(null);
 const [loading, setLoading] = useState(true);
 const [refusal, setRefusal] = useState<string | null>(null);
 const [answers, setAnswers] = useState<Record<string, Answer>>({});
 // What the register serves, and what the mentor has selected from it.
 // lineChoice keys a question to a capture LINE, never to a branch code:
 // two lines may drive the same branch while remaining different
 // findings, and a record that stored the branch would say they were the
 // same. boundChoice holds the items picked from a source-bound family.
 const [served, setServed] = useState<ServedCapture[]>([]);
 // The Stage entry id, read by the serving effect without making the
 // effect depend on the whole entry row.
 const entryIdRef = useRef<string | undefined>(stageEntryEventId);
 const [lineChoice, setLineChoice] = useState<Record<string, number>>({});
 const [boundChoice, setBoundChoice] = useState<Record<string, string[]>>({});
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
 //
 // CS-I-13: service comes from the source's own applicability table, by
 // way of t3a_d1_serve_for_selection. It is never inferred from the
 // Stage and never read off the capture register, which says which set a
 // question uses and never whether it is served.
 //
 // This re-runs whenever a line is selected, because the branch rules
 // read the answers so far: choosing C3 line 4 serves two children that
 // did not exist a moment earlier. CS-I-14 means an unserved child has
 // no row at all here — not a disabled control, not a null.
 useEffect(() => {
 let cancelled = false;
 const sheet = sourceBody?.source_sheet;
 if (!sheet) { setServed([]); return; }

 (async () => {
 const { data, error } = await supabase.rpc("t3a_d1_serve_for_selection", {
 p_source_sheet: sheet,
 p_selected: lineChoice,
 });
 if (cancelled) return;
 if (error) {
 // Fail closed: a serving error offers nothing rather than
 // offering a stale or partial set.
 setServed([]);
 setRefusal(`CAPTURE_SERVING_UNAVAILABLE: ${error.message}`);
 return;
 }
 const rows = ((data as { served?: ServedCapture[] })?.served ?? []);

 // AC-13. A timing determination is relative to a beat. Where that
 // beat carries no timestamp there is nothing to be relative to, so
 // the control is refused rather than offered with an answer set the
 // mentor would be guessing against. The server decides, not this
 // screen: it is the same refusal the commit route would return.
 const gated = await Promise.all(
 rows.map(async (r) => {
 if (r.refused || !/timing relative to/i.test(r.answer_type ?? "")) {
 return r;
 }
 const { data: verdict } = await supabase.rpc(
 "t3a_d1_timing_determination_permitted",
 {
 p_stage_entry_event_id: entryIdRef.current,
 p_question_code: r.question_code,
 }
 );
 const v = (verdict ?? {}) as { permitted?: boolean; refusal?: string };
 if (v.permitted === true) return r;
 return { ...r, refused: true, refusal: v.refusal ?? "TIMING_UNAVAILABLE" };
 })
 );
 if (cancelled) return;
 setServed(gated);
 })();

 return () => { cancelled = true; };
 }, [sourceBody, lineChoice]);

 // A question is answered when a capture line is selected, and — where
 // the control is source-bound and its line calls for a selection — when
 // the bound items are chosen too.
 // A secondary control in a group answers with its bound selection, not
 // with a line of its own — the line it would have selected is the one
 // its parent already selected.
 const requiredUnanswered = useMemo(
 () =>
 served.filter((s) => {
 if (s.refused) return false;
 if ((s.control_ordinal ?? 1) > 1) {
 return (boundChoice[s.question_code] ?? []).length === 0;
 }
 return lineChoice[s.question_code] == null;
 }),
 [served, lineChoice, boundChoice]
 );

 // What is committed. Each determination carries the capture line the
 // mentor selected — set and order, with the text for the record — and
 // not the branch code, because two lines can drive the same branch
 // while being different findings.
 //
 // CS-I-11: where Q-D1-04b returns both aligned and non-aligned, the
 // record carries BOTH the aligned identifiers and the flag that
 // non-aligned attribution was present. One without the other is an
 // incomplete record, so the flag is derived here from the selected
 // line rather than left to the mentor to remember.
 const determinations = useMemo(() => {
 const out: Record<string, unknown> = {};
 for (const s of served) {
 if (s.refused) continue;
 const secondary = (s.control_ordinal ?? 1) > 1;
 const items = boundChoice[s.question_code] ?? [];
 const order = lineChoice[s.question_code];

 // A secondary control persists as its own determination (CS-I-03:
 // three records, never one) carrying the items it selected.
 if (secondary) {
 if (items.length === 0) continue;
 out[s.question_code] = {
 capture_set_code: s.capture_set_code,
 control_ordinal: s.control_ordinal,
 source_bound_family: s.source_bound_family,
 bound_items: items,
 };
 continue;
 }

 if (order == null) continue;
 const chosen = (s.lines ?? []).find((l) => l.line_order === order);
 const row: Record<string, unknown> = {
 capture_set_code: s.capture_set_code,
 line_order: order,
 line_text: chosen?.line_text ?? null,
 };
 if (s.source_bound_family) {
 row.source_bound_family = s.source_bound_family;
 row.bound_items = items;
 }
 if (s.question_code === "Q-D1-04b") {
 row.non_aligned_present = chosen
 ? /both aligned and non-aligned/i.test(chosen.line_text)
 : false;
 }
 out[s.question_code] = row;
 }
 return out;
 }, [served, lineChoice, boundChoice]);

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

 // Committed through the route, not inserted from here.
 //
 // This screen used to insert t3a_observation_record directly, and
 // left authority_snapshot_id null — so a committed action traced to
 // no authorization at all, which is the exact property AC-18 tests
 // for. It could not have been fixed by sending one more field: the
 // authorization in force is a fact about the server at the moment of
 // the write, and a client asked to supply it could supply any
 // authorization it liked.
 //
 // The route takes the snapshot itself, pins the source, question,
 // answer-catalogue and applicability versions AC-19 names, and
 // refuses a mentor who holds no current observe authority. It also
 // reads the participant, dimension and source from the Stage entry
 // rather than from here, so this screen can no longer name the wrong
 // one.
 const { data: res, error: commitErr } = await supabase.rpc(
 "t3a_d1_s2_commit_observation",
 {
 p_stage_entry_event_id: entry.stage_entry_event_id,
 p_answers: determinations,
 }
 );
 if (commitErr) throw commitErr;

 const verdict = (res ?? {}) as Record<string, unknown>;
 if (verdict.committed !== true) {
 // The server's own code, not a sentence invented here.
 setRefusal(
 [verdict.refusal_code, verdict.remedy].filter(Boolean).join(" — ") ||
 "COMMIT_REFUSED"
 );
 return;
 }

 setCommitted(true);
 setCommittedRecordId((verdict.observation_record_id as string) ?? null);
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
 //
 // The streams now come from a direct peer connection between this
 // browser and the participant's, signalled through a relay whose RLS
 // requires a standing OBSERVATION consent. So a live view cannot open
 // on someone who has not agreed to be observed, and the refusal holds
 // at the data layer rather than depending on this screen asking.
 //
 // Nothing is recorded. There is no MediaRecorder and no media store;
 // RECORDING consent is unavailable at every D1 Stage.
 const liveSession = useLiveSession({
 stageInstanceId: entry?.stage_entry_event_id ?? null,
 selfId: profile?.id ?? null,
 counterpartId: entry?.participant_id ?? null,
 role: "mentor",
 enabled: Boolean(entry && profile?.id),
 });

 // The participant's view is what arrives over the connection; the
 // mentor's own view is the local camera. Naming them from the one
 // source keeps the §3.3 verdicts about the right tracks.
 const participantStream = liveSession.remoteStream;
 const mentorStream = liveSession.localStream;

 const participantVideoRef = useRef<HTMLVideoElement | null>(null);
 const mentorVideoRef = useRef<HTMLVideoElement | null>(null);

 const participantView = useLiveViewMonitor({
 stream: participantStream,
 peerConnection: liveSession.peerConnection,
 });
 const mentorView = useLiveViewMonitor({ stream: mentorStream });

 // A verdict that only paints a banner is not a rule. Each change is
 // reported, and an unavailable required view writes a pause event that
 // outlives this component, a refresh, and the tab being closed. The
 // commit is refused server-side while that pause stands.
 useEffect(() => {
 if (!entry || !profile?.id) return;
 void supabase.rpc("t3a_d1_s2_report_live_view", {
 p_stage_instance_id: entry.stage_entry_event_id,
 p_view: "participant",
 p_state: participantView.state,
 p_reason: participantView.reason ?? "",
 p_recorded_by: profile.id,
 });
 }, [participantView.state, participantView.reason, entry, profile?.id]);

 useEffect(() => {
 if (!entry || !profile?.id) return;
 void supabase.rpc("t3a_d1_s2_report_live_view", {
 p_stage_instance_id: entry.stage_entry_event_id,
 p_view: "mentor",
 p_state: mentorView.state,
 p_reason: mentorView.reason ?? "",
 p_recorded_by: profile.id,
 });
 }, [mentorView.state, mentorView.reason, entry, profile?.id]);

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
 {/* Why there is no track, rather than only that there
 is none. A refusal carries the server's own code:
 a live view withheld for want of consent is a
 different situation from one still connecting, and
 a mentor who cannot tell them apart will wait for
 the wrong thing. */}
 {liveSession.status === "REFUSED" ? (
 <>
 <div className="mono-label ink-vermilion mb-2">
 {liveSession.refusalCode ?? "LIVE VIEW REFUSED"}
 </div>
 <p className="text-sm max-w-sm">
 {liveSession.refusalCode ===
 "OBSERVATION_CONSENT_NOT_ON_RECORD"
 ? "No observation consent is on record for this participant, so no view may be opened on them. This is the control, not a fault."
 : liveSession.refusalCode ===
 "OBSERVATION_CONSENT_WITHDRAWN"
 ? "The participant has withdrawn observation consent. The view stays closed and the session cannot proceed on it."
 : liveSession.refusalCode ===
 "DEVICE_ACCESS_NOT_GRANTED"
 ? "This browser did not grant camera and microphone access. The session is held rather than run without a view."
 : "The live view was refused. The session is held rather than run without a view of the participant."}
 </p>
 {liveSession.refusalRemedy && (
 <p className="mono-label text-foreground/50 mt-2">
 {liveSession.refusalRemedy}
 </p>
 )}
 </>
 ) : (
 <>
 <div className="mono-label mb-2">
 {liveSession.status === "CHECKING_CONSENT"
 ? "Checking consent"
 : liveSession.status === "REQUESTING_DEVICES"
 ? "Requesting camera and microphone"
 : liveSession.status === "CONNECTING"
 ? "Connecting to the participant"
 : "No track presented"}
 </div>
 <p className="text-sm max-w-sm">
 The session is held here rather than run without a
 view of the participant.
 </p>
 </>
 )}
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
 {(sourceBody?.verbatim ?? sourceBody?.canonical_body ?? "").split("\n").map((line, i) => (
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
 {served.map((s) => (
 <CaptureRow
 key={s.question_code}
 s={s}
 line={lineChoice[s.question_code] ?? null}
 bound={boundChoice[s.question_code] ?? []}
 onLine={(order) =>
 setLineChoice((prev) => ({ ...prev, [s.question_code]: order }))
 }
 onBound={(keys) =>
 setBoundChoice((prev) => ({ ...prev, [s.question_code]: keys }))
 }
 disabled={committed}
 />
 ))}
 {served.length === 0 && (
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
 disabled={
 committing ||
 committed ||
 requiredUnanswered.length > 0 ||
 // §3.3 — advancement is blocked while a required live view is
 // unavailable. The server refuses the commit regardless; this
 // stops the mentor being invited to try.
 participantView.source_advancement_blocked === true
 }
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

function CaptureRow({
 s,
 line,
 bound,
 onLine,
 onBound,
 disabled,
}: {
 s: ServedCapture;
 line: number | null;
 bound: string[];
 onLine: (order: number) => void;
 onBound: (keys: string[]) => void;
 disabled: boolean;
}) {
 // CS-I-04 and CS-I-07. A control that cannot be served correctly says
 // so and offers nothing. It does not render a partial set, borrow a
 // neighbouring one, or degrade a bound slot into a fixed-option list.
 if (s.refused) {
 return (
 <div className="border-t-2 border-foreground pt-4" data-question={s.question_code} data-refused="true">
 <div className="mono-label text-foreground/60 mb-1">
 Current question · {s.question_code}
 </div>
 <div className="border border-foreground/40 p-3 text-sm text-foreground/80">
 <span className="mono-label">Refused · {s.refusal}</span>
 <p className="mt-1">
 This control is not served. No answer is offered and none is recorded.
 </p>
 </div>
 </div>
 );
 }

 const lines = s.lines ?? [];

 // CS-I-03: C3 is ONE visual group holding three separately persisted
 // controls. The set's five lines belong to the first control — they are
 // what Q-D1-03a asks — and lines 2, 3 and 4 say "select which" in their
 // own words. Those selections ARE Q-D1-03b1 and Q-D1-03b2.
 //
 // So a control that is not first in its group renders its bound
 // selection and NOT another copy of the lines. Rendering the lines three
 // times would put the same five choices on screen three times and ask
 // the mentor to answer one question as if it were three.
 const isSecondaryInGroup = (s.control_ordinal ?? 1) > 1;

 if (isSecondaryInGroup) {
 return (
 <div
 className="border-l-2 border-foreground/40 pl-3 pt-2"
 data-question={s.question_code}
 data-refused="false"
 >
 <div className="mono-label text-foreground/60 mb-1">
 Current question · {s.question_code}
 {s.capture_set_code ? ` · ${s.capture_set_code}` : ""}
 {s.control_ordinal ? ` · control ${s.control_ordinal}` : ""}
 </div>
 <div className="mono-label text-foreground/60 mb-2">
 From this source · {s.source_bound_family}
 </div>
 <div className="space-y-2">
 {(s.bound_options ?? []).map((opt) => {
 const on = bound.includes(opt.key);
 return (
 <label
 key={opt.key}
 className={`flex items-start gap-3 border p-2 cursor-pointer ${
 on ? "border-foreground bg-foreground/[0.05]" : "border-foreground/25"
 } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
 >
 <input
 type="checkbox"
 className="mt-1"
 checked={on}
 onChange={() => {
 const next = bound.slice();
 const i = next.indexOf(opt.key);
 if (i === -1) next.push(opt.key); else next.splice(i, 1);
 onBound(next);
 }}
 disabled={disabled}
 />
 <span className="text-sm text-foreground">
 <span className="mono-label mr-2">{opt.key}</span>
 {s.source_bound_family === "attribution_support_set" ? (
 <span className="text-foreground/60">
 (item withheld — select against the source)
 </span>
 ) : (
 opt.label
 )}
 </span>
 </label>
 );
 })}
 </div>
 </div>
 );
 }
 // The line the mentor picked, if it calls for a bound selection. The
 // capture line says so in its own words — "select which" — which is
 // why the instruction is not duplicated anywhere else.
 const chosen = lines.find((l) => l.line_order === line);
 const callsForItems =
 !!chosen && !!s.bound_options && /select (which|the|both)/i.test(chosen.line_text);

 return (
 <div className="border-t-2 border-foreground pt-4" data-question={s.question_code} data-refused="false">
 <div className="mono-label text-foreground/60 mb-1">
 Current question · {s.question_code}
 {s.capture_set_code ? ` · ${s.capture_set_code}` : ""}
 {s.control_ordinal ? ` · control ${s.control_ordinal}` : ""}
 </div>
 <div className="space-y-2">
 {lines.map((l) => {
 const checked = line === l.line_order;
 return (
 <label
 key={l.line_order}
 className={`flex items-start gap-3 border p-3 cursor-pointer transition-colors ${
 checked ? "border-foreground bg-foreground/[0.05]" : "border-foreground/25 hover:border-foreground/60"
 } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
 >
 <input
 type="radio"
 name={s.question_code}
 className="mt-1"
 checked={checked}
 onChange={() => onLine(l.line_order)}
 disabled={disabled}
 />
 <span className="text-sm text-foreground">{l.line_text}</span>
 </label>
 );
 })}
 </div>

 {/* CS-I-05: the options come from the served source version. */}
 {callsForItems && (
 <div className="mt-3 border-l-2 border-foreground/40 pl-3 space-y-2">
 <div className="mono-label text-foreground/60">
 From this source · {s.source_bound_family}
 </div>
 {(s.bound_options ?? []).map((opt) => {
 const on = bound.includes(opt.key);
 return (
 <label
 key={opt.key}
 className={`flex items-start gap-3 border p-2 cursor-pointer ${
 on ? "border-foreground bg-foreground/[0.05]" : "border-foreground/25"
 } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
 >
 <input
 type="checkbox"
 className="mt-1"
 checked={on}
 onChange={() => {
 const next = bound.slice();
 const i = next.indexOf(opt.key);
 if (i === -1) next.push(opt.key); else next.splice(i, 1);
 onBound(next);
 }}
 disabled={disabled}
 />
 {/*
 CS-I-12: the support-set item identifier is retained and
 NOT rendered, because naming the item names the person.
 The mentor selects by identifier against the approved
 source, which Pane 1 shows in full. Every other bound
 family names material, not people, so it renders.
 */}
 <span className="text-sm text-foreground">
 <span className="mono-label mr-2">{opt.key}</span>
 {s.source_bound_family === "attribution_support_set" ? (
 <span className="text-foreground/60">
 (item withheld — select against the source)
 </span>
 ) : (
 opt.label
 )}
 </span>
 </label>
 );
 })}
 </div>
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
