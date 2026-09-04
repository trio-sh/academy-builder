import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * T3A-DEV-INS-WR-FREE-001 · Section 5.1 — Product page.
 *
 * Reached from the storefront card. This is where a stranger decides
 * whether to create an account, so the copy is exactly as written in
 * the spec: the promise, the reassurance, and nothing else.
 *
 * What must NOT appear on this page (Section 5.1):
 *   - Any duration (until the founder-issued trim in Section 3 is done)
 *   - Any dimension name, D-number, M-number, or the words
 *     `Probation Blueprint` or `AI-Ready Behaviors` as the source
 *   - Any list of what the participant will learn, gain, improve or develop
 *   - Testimonials, ratings, participant counts, social-proof
 *   - A second call to action (one button)
 *   - A retelling of the stage-talk scenario
 */
export default function WrFreeProductPage() {
 const { user } = useAuth();
 const navigate = useNavigate();

 useEffect(() => {
 // Section 7 telemetry: `product_page_view` with campaign_source
 // captured from the inbound link. Anonymous visits are recorded
 // through the same RPC — the RPC requires auth, so anon views only
 // fire on return visits once signed in. Unauthed page views are
 // separately counted client-side in Section 5 storefront-card
 // instrumentation (out of scope for this file).
 if (!user?.id) return;
 const campaign = new URLSearchParams(window.location.search).get("campaign_source");
 supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "product_page_view",
 p_module_code: null,
 p_screen_code: "product_page",
 p_branch_code: null,
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 }).then(() => { /* fire-and-forget */ });
 }, [user?.id]);

 return (
 <PublicLayout>
 <section className="paper-grain min-h-screen pt-32 pb-24">
 <div className="max-w-3xl mx-auto px-6">
 <div className="mono-label text-foreground/60 mb-4">FREE</div>
 <h1 className="display-serif text-[3rem] md:text-[5rem] text-foreground leading-[0.95] mb-6">
 The Moment You Notice
 </h1>

 <p className="display-serif text-2xl text-foreground/80 leading-snug mb-6 max-w-2xl">
 Two workplace rehearsal experiences built around one question: you noticed something isn&rsquo;t right — what do you do next?
 </p>

 <p className="text-lg text-foreground/80 leading-relaxed mb-4 max-w-2xl">
 You spot something wrong. Saying so costs you something. Staying quiet costs you something else.
 </p>

 <p className="text-lg text-foreground/80 leading-relaxed mb-4 max-w-2xl">
 You have probably heard a situation like this described before. Hearing it is not the same as standing in it. Here you make the call yourself, and then you live with what follows.
 </p>

 <p className="text-lg text-foreground/80 leading-relaxed mb-12 max-w-2xl">
 Most workplace advice tells you what the right answer is. This does not. You step into the situation, you make the call you would actually make, and then you see how that choice unfolds over the days and weeks that follow.
 </p>

 <div className="mono-label text-foreground/60 mb-3">WHAT IS INSIDE</div>

 <h2 className="display-serif text-3xl text-foreground mb-3">Saying the Hard Thing</h2>
 <p className="text-foreground/80 leading-relaxed mb-8 max-w-2xl">
 Speaking up when the timing, the room or the person makes it expensive. A correction that has to land without becoming a confrontation. A disagreement you cannot avoid. Feedback you did not want to hear. You work the situations through a method for staying steady and saying the thing anyway — notice, center, name, land — and every call you make plays out immediately, a week later, and a month later.
 </p>

 <h2 className="display-serif text-3xl text-foreground mb-3">When the AI Looks Right</h2>
 <p className="text-foreground/80 leading-relaxed mb-12 max-w-2xl">
 What to do when a machine hands you something convincing and one part of it does not hold. The pressure comes from two directions: someone senior has already accepted the output, and you are not certain you are right to doubt it. You work through the habit of going back to where a claim came from before it goes out under your name — and, again, you watch your choice unfold over the weeks that follow.
 </p>

 <div className="mono-label text-foreground/60 mb-3">HOW IT WORKS</div>
 <p className="text-lg text-foreground/80 leading-relaxed mb-3 max-w-2xl">
 You enter the moment. You make the call. You see what happens next.
 </p>
 <p className="text-lg text-foreground/80 leading-relaxed mb-3 max-w-2xl italic display-serif-italic">
 Private. No score. No pass or fail. Nothing here becomes evidence.
 </p>
 <p className="text-lg text-foreground/80 leading-relaxed mb-12 max-w-2xl">
 You can stop and come back. Your place is kept.
 </p>

 {/* Exactly one call to action, per Section 5.1 */}
 <button
 type="button"
 onClick={() => {
 const campaign = new URLSearchParams(window.location.search).get("campaign_source");
 const qs = campaign ? `?campaign_source=${encodeURIComponent(campaign)}` : "";
 navigate(user ? `/wr-free/module/SAYING_THE_HARD_THING${qs}` : `/wr-free/start${qs}`);
 }}
 className="px-8 py-4 bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none text-base font-medium tracking-wide"
 >
 Start free →
 </button>

 <p className="mt-16 text-xs text-foreground/50 max-w-2xl">
 <Link to="/privacy" className="underline hover:ink-vermilion">Privacy notice</Link>{" "}
 · Data retention is stated in the notice before rehearsal responses are collected.
 </p>
 </div>
 </section>
 </PublicLayout>
 );
}
