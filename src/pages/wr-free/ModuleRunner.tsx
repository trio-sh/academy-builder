import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type {
 ConsequenceBeat,
 DecisionOption,
 DecisionScreen,
 ModuleContent,
 NarrativeScreen,
 Scenario,
 ScenarioScreen,
} from "@/data/wr-free/moduleContent";
import { MODULES, MODULE_ORDER } from "@/data/wr-free/moduleContent";

/**
 * T3A-DEV-INS-WR-FREE-001 · Sections 5.2 and inner module runtime.
 *
 * One route: /wr-free/module/:moduleCode
 *
 * Renders, in order:
 *   1. Module entry screen (Section 5.2) — headline + body + Begin
 *   2. For each scenario:
 *      - Scenario opener
 *      - Each screen (narrative or decision)
 *      - On a decision: the consequence chain plays immediate → one
 *        week → one month, one beat at a time, never all at once, in
 *        that fixed order (Section 3 — the consequence chain is the
 *        engine of the module and stays as built).
 *   3. Module-complete transition
 *
 * Smart Resume (Section 5.5) is held in sessionStorage keyed by
 * (participant_id, module_code). We never render a progress percentage,
 * ring, bar or fraction.
 *
 * Every meaningful step fires a telemetry event to
 * t3a_wr_free_record_event so the founder can see WHERE people stop,
 * not only that they stopped (Section 7).
 */

type BeatIndex = -1 | 0 | 1 | 2; // -1 = decision not made, 0/1/2 = shown so far

type ScreenState = {
 scenarioIndex: number;
 screenIndex: number;
 // for a decision screen: selected option + how many consequence beats revealed
 selectedOption: string | null;
 beatIndex: BeatIndex;
};

export default function WrFreeModuleRunner() {
 const { user, isLoading: authLoading } = useAuth();
 const { moduleCode } = useParams<{ moduleCode: string }>();
 const [searchParams] = useSearchParams();
 const navigate = useNavigate();
 const campaign = searchParams.get("campaign_source");

 const module = useMemo<ModuleContent | null>(() => {
 if (!moduleCode) return null;
 return MODULES[moduleCode as ModuleContent["moduleCode"]] ?? null;
 }, [moduleCode]);

 const [phase, setPhase] = useState<"entry" | "running" | "complete">("entry");
 const [state, setState] = useState<ScreenState>({
 scenarioIndex: 0,
 screenIndex: 0,
 selectedOption: null,
 beatIndex: -1,
 });
 const [releaseError, setReleaseError] = useState<string | null>(null);
 const firedFirstEntry = useRef(false);

 const resumeKey = useMemo(
 () => (user?.id && moduleCode ? `t3a.wrfree.${moduleCode}.${user.id}` : null),
 [user?.id, moduleCode]
 );

 // Hydrate resume position
 useEffect(() => {
 if (!resumeKey) return;
 try {
 const saved = window.sessionStorage.getItem(resumeKey);
 if (saved) {
 const parsed = JSON.parse(saved);
 if (parsed && typeof parsed === "object" && parsed.phase) {
 setPhase(parsed.phase);
 setState(parsed.state);
 }
 }
 } catch { /* ignore */ }
 }, [resumeKey]);

 // Persist resume position
 useEffect(() => {
 if (!resumeKey) return;
 try {
 window.sessionStorage.setItem(resumeKey, JSON.stringify({ phase, state }));
 } catch { /* ignore */ }
 }, [resumeKey, phase, state]);

 // Auth guard — bounce to the account gate if unauthenticated.
 useEffect(() => {
 if (authLoading) return;
 if (!user?.id) {
 const qs = campaign ? `?campaign_source=${encodeURIComponent(campaign)}` : "";
 navigate(`/wr-free/start${qs}`, { replace: true });
 }
 }, [authLoading, user?.id, campaign, navigate]);

 // Fire the FIRST_ENTRY event and convert period → permanent the
 // moment the participant leaves the entry screen. This is the
 // qualifying-event rule at the data layer (Section 6).
 const fireFirstEntry = async () => {
 if (!moduleCode || firedFirstEntry.current) return;
 firedFirstEntry.current = true;
 try {
 const { error } = await supabase.rpc("t3a_wr_free_record_first_entry", {
 p_module_code: moduleCode,
 p_release_code: "WR-FREE-001",
 });
 if (error) {
 setReleaseError(error.message ?? String(error));
 return;
 }
 await supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "module_entered",
 p_module_code: moduleCode,
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 });
 } catch (e) {
 setReleaseError(e instanceof Error ? e.message : String(e));
 }
 };

 // Auto-fire when we transition to running (whether from entry or resume).
 useEffect(() => {
 if (phase === "running" && !firedFirstEntry.current) {
 void fireFirstEntry();
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [phase]);

 // Prompt C — abandonment telemetry. Section 5 says: if a participant
 // leaves the tab or navigates away mid-module (phase=running, not
 // complete), record a single `module_abandoned` event. Fired at most
 // once per session via a ref guard. No UI prompt is shown — that
 // would violate Section 3's rule against injecting anything after a
 // choice — this is telemetry only.
 const firedAbandonment = useRef(false);
 useEffect(() => {
 if (!moduleCode) return;
 if (phase !== "running") return;

 const fireAbandonment = () => {
 if (firedAbandonment.current) return;
 firedAbandonment.current = true;
 try {
 // Best-effort fire; the tab may be closing so we don't await.
 void supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "module_abandoned",
 p_module_code: moduleCode,
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 });
 } catch { /* ignore */ }
 };

 const onVisibility = () => {
 if (document.visibilityState === "hidden") fireAbandonment();
 };
 const onBeforeUnload = () => {
 fireAbandonment();
 };

 document.addEventListener("visibilitychange", onVisibility);
 window.addEventListener("beforeunload", onBeforeUnload);
 return () => {
 document.removeEventListener("visibilitychange", onVisibility);
 window.removeEventListener("beforeunload", onBeforeUnload);
 };
 }, [phase, moduleCode, campaign]);

 // Once the participant reaches complete, cancel the abandonment guard
 // so an entry to the next module gets its own tracker instance.
 useEffect(() => {
 if (phase === "complete") firedAbandonment.current = true;
 }, [phase]);

 if (authLoading) {
 return (
 <div className="min-h-screen grid place-items-center bg-background">
 <Loader2 className="w-8 h-8 animate-spin text-foreground" />
 </div>
 );
 }

 if (!module) {
 return (
 <PublicLayout>
 <section className="paper-grain min-h-screen pt-32 pb-24">
 <div className="max-w-3xl mx-auto px-6">
 <h1 className="display-serif text-3xl mb-4">Rehearsal not found</h1>
 <Link to="/wr-free" className="mono-label text-foreground underline">Back to the product page</Link>
 </div>
 </section>
 </PublicLayout>
 );
 }

 // ------ Entry screen (Section 5.2) ------
 if (phase === "entry") {
 return (
 <PublicLayout>
 <section className="paper-grain min-h-screen flex items-center pt-24 pb-24">
 <div className="max-w-3xl mx-auto px-6 w-full">
 {releaseError && <ReleaseErrorBanner text={releaseError} />}
 <div className="mono-label text-foreground/60 mb-4">§ Rehearsal</div>
 <h1 className="display-serif text-[2.5rem] md:text-[4rem] text-foreground leading-tight mb-6">
 {module.entryScreen.headline}
 </h1>
 {module.entryScreen.body.split("\n\n").map((para, i) => (
 <p key={i} className="text-lg text-foreground/85 leading-relaxed mb-4 max-w-2xl">{para}</p>
 ))}
 <Button
 onClick={() => setPhase("running")}
 className="mt-8 bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-4 text-base font-medium tracking-wide"
 >
 Begin <span className="ml-3">→</span>
 </Button>
 </div>
 </section>
 </PublicLayout>
 );
 }

 // ------ Complete screen ------
 if (phase === "complete") {
 const isLastModule = MODULE_ORDER[MODULE_ORDER.length - 1] === moduleCode;
 return (
 <PublicLayout>
 <section className="paper-grain min-h-screen flex items-center pt-24 pb-24">
 <div className="max-w-3xl mx-auto px-6 w-full">
 <div className="mono-label text-foreground/60 mb-4">§ Rehearsal complete</div>
 <h1 className="display-serif text-[2.5rem] md:text-[4rem] text-foreground leading-tight mb-6">
 That was one kind of workplace pressure.
 </h1>
 {isLastModule ? (
 <>
 <p className="text-lg text-foreground/80 leading-relaxed mb-8 max-w-2xl">
 You worked through two workplace rehearsal experiences today. In both, your choices carried consequences.
 </p>
 <FeedbackPromptB onContinue={() => navigate("/wr-free/end")} />
 </>
 ) : (
 <>
 <p className="text-lg text-foreground/80 leading-relaxed mb-2 max-w-2xl">
 The next looks completely different. Same question underneath: you noticed something, and now you have to decide what to do about it.
 </p>
 <FeedbackPromptA onContinue={() => navigate("/wr-free/between")} />
 </>
 )}
 </div>
 </section>
 </PublicLayout>
 );
 }

 // ------ Running scenario/screen ------
 const scenario: Scenario | undefined = module.scenarios[state.scenarioIndex];
 if (!scenario) {
 // All scenarios done
 setPhase("complete");
 return null;
 }
 const screen: ScenarioScreen | undefined = scenario.screens[state.screenIndex];
 // Show opener at screenIndex = 0 as a wrapping card above the first screen
 // We just render everything on the same flow.

 const advanceToNext = () => {
 if (!scenario) return;
 // Next screen in this scenario, or next scenario, or complete
 if (state.screenIndex + 1 < scenario.screens.length) {
 setState({
 scenarioIndex: state.scenarioIndex,
 screenIndex: state.screenIndex + 1,
 selectedOption: null,
 beatIndex: -1,
 });
 return;
 }
 if (state.scenarioIndex + 1 < module.scenarios.length) {
 setState({
 scenarioIndex: state.scenarioIndex + 1,
 screenIndex: 0,
 selectedOption: null,
 beatIndex: -1,
 });
 return;
 }
 // Module complete
 supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "module_completed",
 p_module_code: moduleCode!,
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 }).then(() => { /* fire-and-forget */ });
 setPhase("complete");
 };

 return (
 <PublicLayout>
 <section className="paper-grain min-h-screen py-16">
 <div className="max-w-3xl mx-auto px-6">
 {releaseError && <ReleaseErrorBanner text={releaseError} />}
 <div className="mono-label text-foreground/60 mb-2">
 § {module.title} · Scenario {state.scenarioIndex + 1} of {module.scenarios.length}
 </div>
 <h2 className="display-serif text-3xl md:text-4xl text-foreground leading-tight mb-4">
 {scenario.title}
 </h2>
 {state.screenIndex === 0 && (
 <p className="text-foreground/80 text-lg leading-relaxed border-l-2 border-foreground pl-6 mb-8 max-w-2xl">
 {scenario.opener}
 </p>
 )}

 {screen?.kind === "narrative" && (
 <NarrativeCard screen={screen} onContinue={advanceToNext} />
 )}
 {screen?.kind === "decision" && (
 <DecisionCard
 screen={screen}
 selected={state.selectedOption}
 beatIndex={state.beatIndex}
 onSelect={(optionKey) => {
 setState((s) => ({ ...s, selectedOption: optionKey, beatIndex: 0 }));
 supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "decision_made",
 p_module_code: moduleCode!,
 p_screen_code: screen.screenKey,
 p_branch_code: optionKey,
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 }).then(() => { /* fire-and-forget */ });
 }}
 onRevealNextBeat={() => {
 const next = (state.beatIndex + 1) as BeatIndex;
 if (next >= 3) {
 advanceToNext();
 } else {
 setState((s) => ({ ...s, beatIndex: next }));
 }
 }}
 />
 )}
 </div>
 </section>
 </PublicLayout>
 );
}

function ReleaseErrorBanner({ text }: { text: string }) {
 return (
 <div className="mb-6 p-4 border-2 border-vermilion bg-vermilion/[0.06] flex items-start gap-3">
 <AlertCircle className="w-5 h-5 ink-vermilion flex-shrink-0 mt-0.5" />
 <p className="text-sm text-foreground">{text}</p>
 </div>
 );
}

function NarrativeCard({ screen, onContinue }: { screen: NarrativeScreen; onContinue: () => void }) {
 return (
 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3 }}
 className="border-2 border-foreground p-6 md:p-8 bg-background/50"
 >
 {screen.title && (
 <div className="mono-label text-foreground/60 mb-2">§ {screen.title}</div>
 )}
 <p className="text-foreground text-lg leading-relaxed mb-6">
 {screen.body}
 </p>
 <Button
 onClick={onContinue}
 className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-3 text-sm font-medium"
 >
 Continue <span className="ml-3">→</span>
 </Button>
 </motion.div>
 );
}

function DecisionCard({
 screen,
 selected,
 beatIndex,
 onSelect,
 onRevealNextBeat,
}: {
 screen: DecisionScreen;
 selected: string | null;
 beatIndex: BeatIndex;
 onSelect: (optionKey: string) => void;
 onRevealNextBeat: () => void;
}) {
 const selectedOption: DecisionOption | undefined = selected
 ? screen.options.find((o) => o.optionKey === selected)
 : undefined;

 return (
 <motion.div
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3 }}
 className="border-2 border-foreground p-6 md:p-8 bg-background/50"
 >
 {screen.frameworkMarker && (
 <div className="mono-label text-foreground/60 mb-2 uppercase">§ {screen.frameworkMarker}</div>
 )}
 <h3 className="display-serif text-2xl text-foreground leading-snug mb-3">
 {screen.title}
 </h3>
 <p className="text-foreground/85 leading-relaxed mb-5">{screen.body}</p>
 <p className="display-serif text-xl text-foreground leading-snug mb-4 italic">
 {screen.prompt}
 </p>

 {!selectedOption && (
 <div className="space-y-3">
 {screen.options.map((opt) => (
 <button
 key={opt.optionKey}
 type="button"
 onClick={() => onSelect(opt.optionKey)}
 className="w-full text-left border-2 border-foreground/25 hover:border-foreground bg-background/60 p-4 transition-colors"
 >
 <div className="display-serif text-lg text-foreground">{opt.label}</div>
 {opt.sub && <div className="text-foreground/70 text-sm mt-1">{opt.sub}</div>}
 </button>
 ))}
 </div>
 )}

 {selectedOption && (
 <div className="mt-2">
 <div className="border-l-2 border-foreground pl-4 mb-6">
 <div className="mono-label text-foreground/60 mb-1">§ Your call</div>
 <div className="display-serif text-lg text-foreground">{selectedOption.label}</div>
 </div>

 {selectedOption.consequenceChain.slice(0, Math.max(0, beatIndex + 1)).map((beat, i) => (
 <ConsequenceBeatCard key={i} beat={beat} />
 ))}

 <div className="mt-6">
 {beatIndex < selectedOption.consequenceChain.length - 1 ? (
 <Button
 onClick={onRevealNextBeat}
 className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-3 text-sm font-medium"
 >
 See what happens next <span className="ml-3">→</span>
 </Button>
 ) : (
 <Button
 onClick={onRevealNextBeat}
 className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-3 text-sm font-medium"
 >
 Continue <span className="ml-3">→</span>
 </Button>
 )}
 </div>
 </div>
 )}
 </motion.div>
 );
}

function ConsequenceBeatCard({ beat }: { beat: ConsequenceBeat }) {
 const label =
 beat.beat === "immediate" ? "Immediate" :
 beat.beat === "one_week" ? "One week later" :
 "One month later";
 return (
 <motion.div
 initial={{ opacity: 0, y: 6 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.3 }}
 className="mb-5 border border-foreground/25 p-4"
 >
 <div className="mono-label text-foreground/60 mb-1">§ {label}</div>
 <p className="text-foreground leading-relaxed">{beat.body}</p>
 </motion.div>
 );
}

// --------------------------------------------------------------------------
// Feedback prompts A and B — inline forms shown at module-complete moments.
// Prompt C lives on the exit path (BeforeUnload wrapper), out of scope here.
// --------------------------------------------------------------------------

function FeedbackPromptA({ onContinue }: { onContinue: () => void }) {
 return (
 <FeedbackForm
 promptCode="A"
 questions={[
 { key: "unrealistic", label: "Did any moment feel unrealistic to you?", kind: "text" },
 { key: "missing_choice", label: "Was there a choice you wanted to make that we did not offer?", kind: "text" },
 {
 key: "close_to_actual",
 label: "Be honest: were the choices you made here close to what you would actually do at work?",
 kind: "single",
 options: ["Yes", "No", "Not sure"],
 },
 { key: "would_do_differently", label: "What would you do differently?", kind: "text", optional: true },
 ]}
 onDone={onContinue}
 />
 );
}

function FeedbackPromptB({ onContinue }: { onContinue: () => void }) {
 return (
 <FeedbackForm
 promptCode="B"
 questions={[
 { key: "most_realistic", label: "Across the two rehearsals, what felt most realistic?", kind: "text" },
 { key: "anything_change", label: "Anything you would change?", kind: "text" },
 {
 key: "want_more",
 label: "Would you want to rehearse other workplace moments like these?",
 kind: "single",
 options: ["Yes", "No", "Not sure"],
 },
 ]}
 onDone={onContinue}
 />
 );
}

type FeedbackQuestion =
 | { key: string; label: string; kind: "text"; optional?: boolean }
 | { key: string; label: string; kind: "single"; options: string[]; optional?: boolean };

function FeedbackForm({
 promptCode,
 questions,
 onDone,
}: {
 promptCode: "A" | "B";
 questions: FeedbackQuestion[];
 onDone: () => void;
}) {
 const [answers, setAnswers] = useState<Record<string, string>>({});
 const [submitting, setSubmitting] = useState(false);
 const [dismissed, setDismissed] = useState(false);

 if (dismissed) {
 return (
 <div className="mt-8 border-2 border-foreground p-6 max-w-2xl">
 <p className="text-foreground">Thank you.</p>
 <Button onClick={onDone} className="mt-4 bg-foreground text-background rounded-none shadow-none px-6 py-3 text-sm">
 Continue <span className="ml-3">→</span>
 </Button>
 </div>
 );
 }

 const submit = async () => {
 setSubmitting(true);
 try {
 // Look up the participant's entitlement to attach the response to.
 const { data: ents } = await supabase
 .from("t3a_wr_free_entitlement")
 .select("entitlement_id")
 .order("granted_at", { ascending: false })
 .limit(1);
 const entitlementId = ents?.[0]?.entitlement_id;
 if (entitlementId) {
 await supabase.from("t3a_wr_free_feedback_response").insert({
 entitlement_id: entitlementId,
 prompt_code: promptCode,
 answers,
 });
 }
 setDismissed(true);
 } finally {
 setSubmitting(false);
 }
 };

 return (
 <div className="mt-8 border-2 border-foreground p-6 max-w-2xl">
 <div className="mono-label text-foreground/60 mb-2">§ A few quick questions — every field is optional</div>
 <div className="space-y-4">
 {questions.map((q) => (
 <div key={q.key}>
 <label className="text-foreground text-base block mb-2">{q.label}</label>
 {q.kind === "text" ? (
 <textarea
 value={answers[q.key] ?? ""}
 onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
 rows={3}
 className="w-full rounded-none border border-foreground/40 focus:border-foreground focus:outline-none bg-background/40 px-3 py-2 text-foreground display-serif text-base resize-y"
 />
 ) : (
 <div className="flex flex-wrap gap-2">
 {q.options.map((opt) => (
 <button
 key={opt}
 type="button"
 onClick={() => setAnswers((a) => ({ ...a, [q.key]: opt }))}
 className={`px-4 py-2 border-2 ${answers[q.key] === opt ? "border-foreground bg-foreground/[0.05]" : "border-foreground/25 hover:border-foreground/60"}`}
 >
 {opt}
 </button>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 <div className="mt-6 flex items-center gap-3">
 <Button
 onClick={submit}
 disabled={submitting}
 className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-6 py-3 text-sm font-medium"
 >
 {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : "Submit"}
 </Button>
 <button
 type="button"
 onClick={() => { setDismissed(true); onDone(); }}
 className="mono-label text-foreground/70 hover:text-foreground underline underline-offset-4"
 >
 Skip
 </button>
 </div>
 </div>
 );
}
