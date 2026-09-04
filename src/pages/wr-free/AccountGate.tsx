import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

/**
 * T3A-DEV-INS-WR-FREE-001 · Section 6 — Account gate.
 *
 * Governing rules from the spec:
 *   - One screen. Email and password. Nothing else.
 *   - No name, no demographics, no employment status, no profile
 *     questions, no optional fields at sign-up.
 *   - Straight into the rehearsal on completion of sign-up. No welcome
 *     tour, no dashboard detour, no confirmation screen to dismiss.
 *   - Email verification, if required, must not block entry.
 *   - Sign-in and sign-up are the same button — a returning
 *     participant should not have to work out which one they are.
 *   - A period entitlement is issued at account creation; converts to
 *     permanent on first entry.
 */
export default function WrFreeAccountGate() {
 const { user, signIn, signUp } = useAuth();
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [isLoading, setIsLoading] = useState(false);
 const [error, setError] = useState("");

 const campaign = searchParams.get("campaign_source");
 const qs = campaign ? `?campaign_source=${encodeURIComponent(campaign)}` : "";
 const nextUrl = `/wr-free/module/SAYING_THE_HARD_THING${qs}`;

 // Already signed in — grant a period entitlement and forward straight
 // in. Never sit on this screen unnecessarily.
 useEffect(() => {
 if (!user?.id) return;
 (async () => {
 // Fire telemetry: gate reached (already-authed path).
 await supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "gate_reached",
 p_screen_code: "account_gate",
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 });
 // Grant period entitlement (idempotent). Refuses if release is not LIVE;
 // the module route will surface that refusal cleanly.
 await supabase.rpc("t3a_wr_free_grant_period", { p_release_code: "WR-FREE-001" });
 await supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "gate_completed",
 p_screen_code: "account_gate",
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 });
 navigate(nextUrl, { replace: true });
 })();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [user?.id]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setIsLoading(true);
 try {
 // Fire telemetry: gate reached.
 await supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "gate_reached",
 p_screen_code: "account_gate",
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 });

 // Sign-in and sign-up are the SAME button (Section 6). Try sign-in
 // first; if the account does not exist, fall through to sign-up.
 // Wrong-password is surfaced as-is — that's a genuine block.
 let error;
 const trySignIn = await signIn(email, password);
 error = trySignIn.error;
 if (error) {
 const msg = String(error?.message || "").toLowerCase();
 const isNoAccount = msg.includes("invalid") && msg.includes("credentials");
 if (isNoAccount || msg.includes("user not found") || msg.includes("no user")) {
 // Section 6: only email and a password are asked for. Backend
 // still needs name and role fields to satisfy the current
 // signup contract — we pass empty strings for the name fields
 // and the platform-default candidate role. A profile-completion
 // step is deferred to the participant desk, and never blocks
 // entry to the rehearsal.
 const trySignUp = await signUp(email, password, {
 firstName: "",
 lastName: "",
 role: "candidate",
 });
 error = trySignUp.error;
 }
 }
 if (error) {
 setError(error.message || "Could not sign in or create an account. Please try again.");
 // Telemetry: gate abandoned (with reason omitted for privacy).
 await supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "gate_abandoned",
 p_screen_code: "account_gate",
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 });
 return;
 }
 // Signed-in effect will fire the entitlement grant + navigate.
 } catch (err) {
 setError(err instanceof Error ? err.message : "Unexpected error");
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <PublicLayout>
 <section className="paper-grain min-h-screen flex items-center pt-32 pb-16">
 <div className="max-w-3xl mx-auto px-6 w-full">
 <div className="mono-label text-foreground/60 mb-4">§ The Moment You Notice · Free rehearsal</div>
 <h1 className="display-serif text-[2.5rem] md:text-[3.5rem] text-foreground leading-tight mb-4">
 Create an account so your rehearsal is saved.
 </h1>
 <p className="text-lg text-foreground/80 leading-relaxed mb-10 max-w-xl">
 You can leave and come back, and this stays yours.
 </p>

 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.4 }}
 className="border-2 border-foreground p-8 md:p-10 bg-background/40 max-w-xl"
 >
 {error && (
 <div className="mb-5 p-4 border-l-2 border-foreground bg-foreground/[0.04] flex items-start gap-3">
 <AlertCircle className="w-5 h-5 text-foreground flex-shrink-0 mt-0.5" />
 <p className="text-sm text-foreground">{error}</p>
 </div>
 )}
 <form onSubmit={handleSubmit} className="space-y-6">
 <div>
 <label htmlFor="email" className="mono-label text-foreground/60 block mb-2">Email</label>
 <Input
 id="email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 autoComplete="email"
 disabled={isLoading}
 className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif"
 />
 </div>
 <div>
 <label htmlFor="password" className="mono-label text-foreground/60 block mb-2">Password</label>
 <PasswordInput
 id="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 autoComplete="current-password"
 disabled={isLoading}
 className="rounded-none border-foreground/40 border-x-0 border-t-0 border-b-2 focus-visible:border-foreground focus-visible:ring-0 bg-transparent px-0 text-lg display-serif"
 />
 </div>
 <Button
 type="submit"
 disabled={isLoading || !email || !password}
 className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none py-6 text-base font-medium"
 >
 {isLoading ? (
 <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening…</>
 ) : (
 <>Start free <span className="ml-3">→</span></>
 )}
 </Button>
 </form>
 <p className="mt-6 text-xs text-foreground/60">
 The same button signs you in if you already have an account. Email verification, where required, does not block entry — you can start now and verify from your inbox at any time.
 </p>
 </motion.div>

 <p className="mt-10 text-xs text-foreground/60 max-w-xl">
 Private. No score. No pass or fail. Nothing here becomes evidence.{" "}
 <Link to="/privacy" className="underline hover:ink-vermilion">Privacy notice</Link>.
 </p>
 </div>
 </section>
 </PublicLayout>
 );
}
