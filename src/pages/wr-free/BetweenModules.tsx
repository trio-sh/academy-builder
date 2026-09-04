import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * T3A-DEV-INS-WR-FREE-001 · Section 5.3 — Between the two modules.
 *
 * "That was one kind of workplace pressure. The next looks completely
 * different. Same question underneath: you noticed something, and now
 * you have to decide what to do about it."
 *
 * Both options are equally weighted. Choosing to come back later ends
 * the session cleanly with the module kept.
 */
export default function WrFreeBetweenModules() {
 const { user, isLoading } = useAuth();
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const campaign = searchParams.get("campaign_source");

 useEffect(() => {
 if (isLoading) return;
 if (!user?.id) {
 navigate("/wr-free/start", { replace: true });
 }
 }, [isLoading, user?.id, navigate]);

 const goToSecond = () => {
 supabase.rpc("t3a_wr_free_record_event", {
 p_kind: "module_entered",
 p_module_code: "WHEN_THE_AI_LOOKS_RIGHT",
 p_campaign_source: campaign,
 p_release_code: "WR-FREE-001",
 }).then(() => { /* fire-and-forget */ });
 navigate("/wr-free/module/WHEN_THE_AI_LOOKS_RIGHT");
 };

 return (
 <PublicLayout>
 <section className="paper-grain min-h-screen flex items-center pt-24 pb-24">
 <div className="max-w-3xl mx-auto px-6 w-full">
 <h1 className="display-serif text-[2.5rem] md:text-[4rem] text-foreground leading-tight mb-6">
 That was one kind of workplace pressure.
 </h1>
 <p className="text-lg text-foreground/80 leading-relaxed mb-10 max-w-2xl">
 The next looks completely different. Same question underneath: you noticed something, and now you have to decide what to do about it.
 </p>
 <div className="flex flex-wrap gap-4">
 <Button
 onClick={goToSecond}
 className="bg-foreground text-background hover:bg-foreground/90 rounded-none shadow-none px-8 py-4 text-base font-medium"
 >
 Continue to the second rehearsal <span className="ml-3">→</span>
 </Button>
 <Button
 variant="outline"
 onClick={() => navigate("/")}
 className="border-2 border-foreground text-foreground rounded-none shadow-none px-8 py-4 text-base font-medium"
 >
 I&rsquo;ll come back to this later
 </Button>
 </div>
 <p className="mt-8 text-sm text-foreground/70">
 It will be here.
 </p>
 </div>
 </section>
 </PublicLayout>
 );
}
